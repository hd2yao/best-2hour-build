# ⚠️ SUPERSEDED by `2026-04-23-diffgate-implementation-plan-v5.md`

# DiffGate PR Webhook 服务 — 实现计划（最终版 v3）

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 用 FastAPI + Volcano Engine LLM 构建 GitHub PR 风险审查 Webhook 服务，快速返回 202 + 后台异步分析，自动回帖风险摘要。

**Architecture:** FastAPI 接收 Webhook → **202 Accepted + asyncio.create_task 后台执行** → diff 解析 → 火山引擎 LLM 分析 → GitHub PR 回帖；CLI 离线回放 3 仓库生成验证报告。

**Tech Stack:** Python 3.12 / FastAPI / Pydantic / httpx / Typer + Rich / Docker

**包结构：** `diffgate/` 作为根包，所有 import 为 `diffgate.models` 等

---

## 修订说明（v3 vs v2）

| ID | 来源 | 问题 | 修复 |
|----|------|------|------|
| R2-B-001 | Blocking | `LLMAnalyzer._client` 共享 + finally 关闭，并发竞争 | 每个 `analyze()` 内创建局部 `httpx.AsyncClient`，lifespan 不持有 client |
| R2-B-002 | Blocking | Webhook 测试未注入 fake、lifespan 时序冲突 | `TestClient(app)` context manager + FastAPI `app.dependency_overrides` 注入 |
| R2-B-003 | Blocking | CLI 测试局部 Console 捕获不到模块级 console | `_print_replay_report` 加 `console` 参数，`_print_report` 可独立调用 |
| R2-I-001 | Important | FastAPI route 返回 dict 会变成 HTTP 200，非 202 | `@app.post(..., status_code=202)` 显式声明 |
| R2-I-002 | Important | 设计文档（v1）与 v2 实现不一致 | 更新设计文档为 v2 摘要（同步架构、DiffGate、规则评分） |
| R2-I-003 | Important | `python:3.12-slim` 无 curl，healthcheck 失败 | 删除 docker-compose.yml 中的 healthcheck |
| R2-M-001 | Minor | `src/` 包名与项目名 diffgate 不符 | 改 `diffgate/` 为根包，pyproject `packages=["diffgate"]` |

---

## 目录结构

```
diffgate/                      # 根包（v3 修复 R2-M-001）
├── __init__.py
├── main.py                    # FastAPI 入口
├── config.py                  # Pydantic Settings
├── models.py                  # 数据模型
├── diff_parser.py             # Diff 解析器
├── prompts.py                 # LLM 提示词
├── analyzer.py                # LLM 分析引擎（R2-B-001 修复）
├── commenter.py               # GitHub 评论器
├── webhook.py                 # Webhook 处理器
└── cli.py                    # CLI 回放工具（R2-B-003 修复）
tests/
├── test_config.py
├── test_models.py
├── test_diff_parser.py
├── test_analyzer.py
├── test_commenter.py
├── test_webhook.py           # R2-B-002 修复：依赖注入
├── test_main.py
└── test_cli.py               # R2-B-003 修复：console 参数
.env.example
pyproject.toml
Dockerfile                     # COPY diffgate/
docker-compose.yml             # R2-I-003 修复：删除 healthcheck
README.md
```

---

## Task 1: 项目骨架（v3）

**Files:**
- Create: `pyproject.toml`
- Create: `diffgate/__init__.py`
- Create: `.env.example`

**Step 1: pyproject.toml**

```toml
[project]
name = "diffgate"
version = "0.1.0"
description = "GitHub PR risk analysis webhook service"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "pydantic>=2.9.0",
    "pydantic-settings>=2.5.0",
    "httpx>=0.27.0",
    "typer>=0.13.0",
    "rich>=13.9.0",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "pytest-httpserver>=1.0.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["diffgate"]   # R2-M-001 fix: explicit package name
```

**Step 2: diffgate/__init__.py**

```python
"""DiffGate — GitHub PR Risk Analysis Webhook Service."""
__version__ = "0.1.0"
```

**Step 3: .env.example**

```env
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_TOKEN=ghp_xxxxx
VOLCANO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCANO_API_KEY=your_volcano_api_key
VOLCANO_MODEL=your_model_id
APP_HOST=0.0.0.0
APP_PORT=8000
LOG_LEVEL=INFO
```

**Step 4: Commit**

```bash
git add pyproject.toml diffgate/__init__.py .env.example
git commit -m "feat: project skeleton with diffgate package"
```

---

## Task 2: 配置 + 数据模型

**Files:**
- Create: `diffgate/config.py`
- Create: `diffgate/models.py`
- Create: `tests/test_config.py`
- Create: `tests/test_models.py`

**Step 1: diffgate/config.py**

```python
# diffgate/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    github_webhook_secret: str = ""
    github_token: str = ""
    volcano_base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    volcano_api_key: str = ""
    volcano_model: str = ""
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"


settings = Settings()
```

**Step 2: diffgate/models.py**（同 v2，无变化）

```python
# diffgate/models.py
from pydantic import BaseModel, Field
from typing import Optional


class OverEditFlag(BaseModel):
    flag: str
    detail: str


class SuggestedScope(BaseModel):
    keep: list[str] = Field(default_factory=list)
    revert: list[str] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    minimal_edit_score: int = Field(ge=0, le=100)
    over_edit_flags: list[OverEditFlag] = Field(default_factory=list)
    suggested_scope: SuggestedScope = Field(default_factory=SuggestedScope)
    risk_summary: str = ""
    suggested_action: str = ""


class PRPayload(BaseModel):
    action: str
    pull_request: dict
    repository: dict
    sender: dict

    @property
    def pr_number(self) -> int:
        return self.pull_request["number"]

    @property
    def repo_full_name(self) -> str:
        return self.repository["full_name"]

    @property
    def title(self) -> str:
        return self.pull_request.get("title", "")

    @property
    def body(self) -> str:
        return self.pull_request.get("body", "") or ""


class FileDiff(BaseModel):
    filename: str
    status: str
    additions: int = 0
    deletions: int = 0
    patch: Optional[str] = None
    changed_lines: int = 0

    @property
    def is_high_risk_path(self) -> bool:
        prefixes = ["config/", ".github/", "scripts/", "Makefile", "Dockerfile", "docker-compose"]
        return any(self.filename.startswith(p) for p in prefixes)
```

**Step 3: Commit**

```bash
git add diffgate/config.py diffgate/models.py tests/test_config.py tests/test_models.py
git commit -m "feat: config and data models"
```

---

## Task 3: Diff 解析器（v3 无逻辑变化，同 v2 Task 4）

**Files:**
- Create: `diffgate/diff_parser.py`
- Create: `tests/test_diff_parser.py`

**关键点：** 只统计 patch 中 `+/-` 行，hunk header 不计入（v2 Task 4 完全保留）。

**Step 1: Commit**

```bash
git add diffgate/diff_parser.py tests/test_diff_parser.py
git commit -m "feat: diff parser with correct line counting"
```

---

## Task 4: 提示词 + LLM 分析引擎（R2-B-001 修复）

**Files:**
- Create: `diffgate/prompts.py`
- Create: `diffgate/analyzer.py`
- Create: `tests/test_analyzer.py`

**Step 1: diffgate/prompts.py**（同 v2 Task 5 Step 1）

**Step 2: diffgate/analyzer.py**（R2-B-001 核心修复）

```python
# diffgate/analyzer.py
import json
import httpx
from diffgate.models import FileDiff, AnalysisResult
from diffgate.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, FEW_SHOT_EXAMPLES
from diffgate.diff_parser import DiffParser


def build_stats_text(stats: dict) -> str:
    high_risk = stats.get("high_risk_files", [])
    return (
        f"- 总文件数: {stats['total_files']}\n"
        f"- 总改动行数: {stats['total_changed_lines']} (+{stats['total_additions']} -{stats['total_deletions']})\n"
        f"- 单文件最大改动: {stats['max_file_changed_lines']} 行\n"
        f"- 高风险路径文件: {', '.join(high_risk) if high_risk else '无'}\n"
        f"- 文件数异常: {'是' if stats.get('file_count_anomaly') else '否'}\n"
        f"- 行数膨胀: {'是' if stats.get('line_bloat') else '否'}"
    )


def build_llm_messages(title: str, body: str, files: list[FileDiff], stats: dict) -> list[dict]:
    parser = DiffParser()
    diff_context = parser.build_llm_context(files)
    user_content = (
        USER_PROMPT_TEMPLATE.substitute(
            title=title,
            body=body or "（无描述）",
            stats=build_stats_text(stats),
            diff_context=diff_context,
        )
        + "\n\n"
        + FEW_SHOT_EXAMPLES
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


class LLMAnalyzer:
    """
    R2-B-001 fix: each analyze() call creates its own local httpx.AsyncClient.
    No shared mutable state. Lifespan holds the analyzer instance for config,
    but the client is always created and destroyed per call.
    """

    def __init__(self, base_url: str, api_key: str, model: str, timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    async def analyze(self, title: str, body: str, files: list[FileDiff], stats: dict) -> AnalysisResult:
        """Create a local client per call to avoid shared-state race conditions."""
        messages = build_llm_messages(title, body, files, stats)
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
            "max_tokens": 2048,
        }

        async with httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=self.timeout,
        ) as client:
            response = await client.post("/chat/completions", json=payload)
            if response.status_code != 200:
                raise RuntimeError(f"LLM API error: {response.status_code} {response.text}")

            data = response.json()
            content = data["choices"][0]["message"]["content"]

        try:
            parsed = json.loads(content)
            return AnalysisResult(
                minimal_edit_score=parsed.get("minimal_edit_score", 50),
                over_edit_flags=parsed.get("over_edit_flags", []),
                suggested_scope=parsed.get("suggested_scope", {}),
                risk_summary=parsed.get("risk_summary", ""),
                suggested_action=parsed.get("suggested_action", ""),
            )
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            return AnalysisResult(
                minimal_edit_score=50,
                over_edit_flags=[{"flag": "parse_error", "detail": f"LLM 输出解析失败: {e}"}],
                risk_summary="LLM 返回格式异常，请人工复核",
                suggested_action="请人工审查本次 PR 改动范围",
            )
```

**Step 3: Commit**

```bash
git add diffgate/prompts.py diffgate/analyzer.py tests/test_analyzer.py
git commit -m "feat: LLM analyzer with per-call httpx client (R2-B-001)"
```

---

## Task 5: GitHub 评论器（v3 无逻辑变化，同 v2 Task 6）

**Files:**
- Create: `diffgate/commenter.py`
- Create: `tests/test_commenter.py`

**关键点：** `headers={"Accept": "application/vnd.github.diff"}`（B-003），`<!-- diffgate:N -->` 幂等标记（I-002），无外部链接（M-002）。

**Step 1: Commit**

```bash
git add diffgate/commenter.py tests/test_commenter.py
git commit -m "feat: GitHub commenter with idempotency"
```

---

## Task 6: Webhook 处理器（R2-B-002 + R2-I-001 修复）

**Files:**
- Create: `diffgate/webhook.py`
- Create: `tests/test_webhook.py`

**Step 1: diffgate/webhook.py**（主要同 v2，补充说明）

```python
# diffgate/webhook.py
# R2-I-001 fix: FastAPI route 显式返回 202
# R2-B-002 fix: 所有请求需签名，测试用 dependency override 注入 fake
```

核心逻辑同 v2 Task 7，补充：
- `handle_pr_webhook` 返回后，调用方负责加 `status_code=202`

**Step 2: tests/test_webhook.py**（R2-B-002 核心修复）

```python
# tests/test_webhook.py
"""
R2-B-002 fix:
1. Use dependency injection for analyzer + commenter (not global state)
2. TestClient in context manager for lifespan initialization
3. All requests that reach event/action filtering are signed with a known secret
4. FastAPI dependency_overrides to inject fake analyzer/commenter
"""
import pytest
import hmac
import hashlib
import json
from fastapi.testclient import TestClient
from diffgate.main import app
from diffgate.webhook import verify_github_signature
from diffgate.analyzer import LLMAnalyzer
from diffgate.commenter import GitHubCommenter


def make_sig(payload: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


def test_verify_signature():
    payload = b'{"test": 1}'
    sig = make_sig(payload, "secret")
    assert verify_github_signature(payload, sig, "secret") is True
    assert verify_github_signature(payload, "sha256=wrong", "secret") is False


# R2-B-002: dependency override — inject no-op analyzer and commenter
class FakeAnalyzer:
    async def analyze(self, title, body, files, stats):
        from diffgate.models import AnalysisResult
        return AnalysisResult(minimal_edit_score=75)


class FakeCommenter:
    async def get_pr_diff(self, repo, pr_number):
        return ""
    async def get_existing_comment(self, repo, pr_number, marker):
        return None
    async def post_comment(self, repo, pr_number, body):
        return True
    async def update_comment(self, url, body):
        return True


app.dependency_overrides[LLMAnalyzer] = lambda: FakeAnalyzer()
app.dependency_overrides[GitHubCommenter] = lambda: FakeCommenter()


def test_webhook_returns_202_for_valid_opened_pr(monkeypatch):
    """R2-I-001 fix: route must return HTTP 202."""
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", "mysecret")
    payload_dict = {
        "action": "opened",
        "pull_request": {"number": 1, "title": "test", "body": "", "diff_url": ""},
        "repository": {"full_name": "a/b"},
        "sender": {},
    }
    payload = json.dumps(payload_dict).encode()
    sig = make_sig(payload, "mysecret")

    with TestClient(app) as client:
        response = client.post(
            "/webhook/pr",
            content=payload,
            headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "pull_request"},
        )
        assert response.status_code == 202, f"Expected 202, got {response.status_code}"
        assert response.json()["status"] == "accepted"


def test_webhook_rejects_missing_signature(monkeypatch):
    """R2-B-002 fix: unsigned request rejected with 401."""
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", "mysecret")
    payload_dict = {
        "action": "opened",
        "pull_request": {"number": 1, "title": "test", "body": "", "diff_url": ""},
        "repository": {"full_name": "a/b"},
        "sender": {},
    }
    payload = json.dumps(payload_dict).encode()

    with TestClient(app) as client:
        response = client.post(
            "/webhook/pr",
            content=payload,
            headers={"X-Hub-Signature-256": "sha256=wrong", "X-GitHub-Event": "pull_request"},
        )
        assert response.status_code == 401


def test_webhook_ignores_non_pr_event(monkeypatch):
    """Non-pull_request events are ignored."""
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", "mysecret")
    payload = json.dumps({"action": "push"}).encode()
    sig = make_sig(payload, "mysecret")

    with TestClient(app) as client:
        response = client.post(
            "/webhook/pr",
            content=payload,
            headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "push"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ignored"
```

**Step 3: Commit**

```bash
git add diffgate/webhook.py tests/test_webhook.py
git commit -m "feat: webhook handler with dependency injection (R2-B-002)"
```

---

## Task 7: FastAPI 主入口（R2-I-001 修复）

**Files:**
- Modify: `diffgate/main.py`（overwrite）
- Create: `tests/test_main.py`

**Step 1: diffgate/main.py**

```python
# diffgate/main.py
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from diffgate.config import settings
from diffgate.webhook import handle_pr_webhook
from diffgate.analyzer import LLMAnalyzer
from diffgate.commenter import GitHubCommenter

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


def get_analyzer() -> LLMAnalyzer:
    return LLMAnalyzer(
        base_url=settings.volcano_base_url,
        api_key=settings.volcano_api_key,
        model=settings.volcano_model,
    )


def get_commenter() -> GitHubCommenter:
    return GitHubCommenter(token=settings.github_token)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.volcano_api_key:
        logger.warning("VOLCANO_API_KEY is not set")
    if not settings.github_token:
        logger.warning("GITHUB_TOKEN is not set")
    yield


app = FastAPI(
    title="DiffGate",
    description="GitHub PR Risk Analysis Webhook Service",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/webhook/pr", status_code=202)  # R2-I-001 fix: explicit 202
async def webhook_pr(
    request: Request,
    analyzer: LLMAnalyzer = Depends(get_analyzer),
    commenter: GitHubCommenter = Depends(get_commenter),
):
    """
    R2-I-001 fix: status_code=202 means accepted for background processing.
    R2-B-002 fix: analyzer/commenter injected via FastAPI Depends (testable).
    """
    if not settings.github_webhook_secret:
        raise HTTPException(status_code=503, detail="GITHUB_WEBHOOK_SECRET not configured")

    result = await handle_pr_webhook(
        request=request,
        analyzer=analyzer,
        commenter=commenter,
        webhook_secret=settings.github_webhook_secret,
    )
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "diffgate.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
    )
```

**Step 2: Commit**

```bash
git add diffgate/main.py tests/test_main.py
git commit -m "feat: FastAPI entry with 202 status and dependency injection (R2-I-001, R2-B-002)"
```

---

## Task 8: CLI 离线回放工具（R2-B-003 修复）

**Files:**
- Modify: `diffgate/cli.py`（overwrite）
- Modify: `tests/test_cli.py`（overwrite）

**Step 1: diffgate/cli.py**（R2-B-003 核心修复）

```python
# diffgate/cli.py
import typer
import asyncio
import json
from pathlib import Path
from typing import Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from diffgate.config import settings
from diffgate.analyzer import LLMAnalyzer
from diffgate.commenter import GitHubCommenter
from diffgate.diff_parser import DiffParser

cli = typer.Typer(name="diffgate", help="DiffGate CLI — PR risk analysis offline replay")
_console = Console()  # module-level for interactive use


@cli.command()
def replay(
    repo: str = typer.Option(..., "--repo", help="owner/repo, e.g. psf/requests"),
    token: Optional[str] = typer.Option(None, "--token", help="GitHub token (or set GITHUB_TOKEN env)"),
    n: int = typer.Option(30, "--n", help="Number of recent PRs"),
    output: Optional[str] = typer.Option(None, "--output", help="Output JSON file"),
    min_score: int = typer.Option(50, "--min-score", help="Score threshold for flagging"),
):
    github_token = token or settings.github_token
    if not github_token:
        _console.print("[red]Error: GITHUB_TOKEN not set[/red]")
        raise typer.Exit(1)

    results = asyncio.run(_replay_async(repo, n, github_token, min_score))
    print_replay_report(results, repo, n)  # R2-B-003: no console param needed in CLI mode

    if output:
        Path(output).write_text(json.dumps(results, ensure_ascii=False, indent=2))
        _console.print(f"\n[green]Results saved to {output}[/green]")


async def _replay_async(repo: str, n: int, token: str, min_score: int) -> list[dict]:
    """try/finally ensures cleanup; empty results handled gracefully."""
    commenter = GitHubCommenter(token=token)
    analyzer = LLMAnalyzer(
        base_url=settings.volcano_base_url,
        api_key=settings.volcano_api_key,
        model=settings.volcano_model,
    )

    results = []
    try:
        client = await commenter._get_client()
        try:
            response = await client.get(
                f"/repos/{repo}/pulls",
                params={"state": "closed", "sort": "updated", "direction": "desc", "per_page": min(n, 100)},
            )
            prs = response.json()[:n]
        except Exception as e:
            _console.print(f"[red]Failed to fetch PRs: {e}[/red]")
            return []
        finally:
            await client.aclose()

        for pr in prs:
            pr_num = pr["number"]
            title = pr.get("title", "")
            body = pr.get("body", "") or ""

            diff_text = await commenter.get_pr_diff(repo, pr_num)
            parser = DiffParser()
            files = parser.parse(diff_text)
            stats = parser.compute_stats(files)

            if not files:
                _console.print(f"  PR #{pr_num}: [dim]empty diff[/dim]")
                continue

            result = await analyzer.analyze(title=title, body=body, files=files, stats=stats)
            flagged = result.minimal_edit_score < min_score

            results.append({
                "pr_number": pr_num,
                "title": title,
                "url": pr.get("html_url", ""),
                "score": result.minimal_edit_score,
                "flagged": flagged,
                "flag_count": len(result.over_edit_flags),
                "flags": [{"flag": f.flag, "detail": f.detail} for f in result.over_edit_flags],
                "keep": result.suggested_scope.keep,
                "revert": result.suggested_scope.revert,
                "files_changed": len(files),
                "total_lines": stats["total_changed_lines"],
            })
            flag_str = f"[red]FLAGGED ({len(result.over_edit_flags)} flags)[/red]" if flagged else "[green]OK[/green]"
            _console.print(f"  PR #{pr_num}: score={result.minimal_edit_score} {flag_str}")

    finally:
        await commenter.close()
        await analyzer.close()

    return results


def print_replay_report(results: list[dict], repo: str, n: int, console: Console | None = None):
    """
    R2-B-003 fix: console parameter so tests can inject a StringIO console.
    In CLI mode called without console=arg, uses module-level _console.
    """
    out = console or _console

    if not results:
        out.print("[yellow]No results to display.[/yellow]")
        return

    total = len(results)
    flagged = sum(1 for r in results if r["flagged"])
    avg_score = sum(r["score"] for r in results) / total

    out.print(Panel(
        f"[bold]Repo:[/bold] {repo}\n"
        f"[bold]Total:[/bold] {total} PRs\n"
        f"[bold]Flagged (score<50):[/bold] {flagged} ({100 * flagged / total:.1f}%)\n"
        f"[bold]Avg score:[/bold] {avg_score:.1f}",
        title="Summary",
    ))

    table = Table(title="PR Analysis")
    table.add_column("PR", style="cyan")
    table.add_column("Score", style="magenta")
    table.add_column("Flags", style="yellow")
    table.add_column("Files", style="green")

    for r in results[:20]:
        flag_str = ", ".join(f["flag"] for f in r["flags"]) if r["flags"] else "—"
        table.add_row(f"#{r['pr_number']}", str(r["score"]), flag_str, str(r["files_changed"]))

    out.print(table)
    if total > 20:
        out.print(f"[dim]... and {total - 20} more PRs[/dim]")


@cli.command()
def serve(
    host: str = typer.Option("0.0.0.0", "--host"),
    port: int = typer.Option(8000, "--port"),
):
    import uvicorn
    uvicorn.run("diffgate.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    cli()
```

**Step 2: tests/test_cli.py**（R2-B-003 核心修复）

```python
# tests/test_cli.py
"""R2-B-003 fix: inject StringIO console to capture module-level _console output."""
import pytest
from io import StringIO
from rich.console import Console
from diffgate.cli import print_replay_report


def test_print_replay_handles_empty_results():
    """Guard against crash when results list is empty."""
    console = Console(file=StringIO(), force_terminal=True)
    print_replay_report([], "owner/repo", 0, console=console)  # no crash
    output = console.file.getvalue()
    assert "No results" in output


def test_print_replay_shows_stats():
    """Basic report generation with injected console."""
    results = [
        {"pr_number": 100, "score": 90, "flagged": False, "flags": [], "files_changed": 2},
        {
            "pr_number": 99,
            "score": 40,
            "flagged": True,
            "flags": [{"flag": "file_count_anomaly", "detail": "12 files"}],
            "files_changed": 15,
        },
    ]
    console = Console(file=StringIO(), force_terminal=True)
    print_replay_report(results, "test/repo", 2, console=console)
    output = console.file.getvalue()
    assert "test/repo" in output
    assert "Flagged" in output
    assert "90" in output  # high score
    assert "40" in output  # low score
```

**Step 3: Commit**

```bash
git add diffgate/cli.py tests/test_cli.py
git commit -m "feat: CLI with console parameter for testability (R2-B-003)"
```

---

## Task 9: Docker 部署（R2-I-003 修复）

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`（R2-I-003 fix: 删除 healthcheck）
- Modify: `README.md`

**Step 1: Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# R2-M-001 fix: copy diffgate/ package
COPY diffgate/ ./diffgate/
COPY pyproject.toml .
COPY .env.example .env

# R2-M-001 fix: install from diffgate package
RUN pip install --no-cache-dir -e .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "diffgate.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: docker-compose.yml**（R2-I-003 修复：删除 healthcheck）

```yaml
services:
  diffgate:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    # R2-I-003 fix: removed healthcheck (python:3.12-slim has no curl)
```

**Step 3: README.md**

```markdown
# DiffGate

GitHub PR 风险审查 Webhook 服务。

## 快速启动

```bash
cp .env.example .env
# 编辑 .env 填入配置

# 本地运行
pip install -e ".[dev]"
python -m uvicorn diffgate.main:app --reload

# Docker 运行
docker compose up -d
```

## 注册 Webhook

GitHub 仓库 Settings > Webhooks > Add webhook：

- Payload URL: `https://your-domain.com/webhook/pr`
- Content type: `application/json`
- Secret: 与 `.env` 中的 `GITHUB_WEBHOOK_SECRET` 一致
- Events: Pull requests

本地调试：用 ngrok
```bash
ngrok http 8000
# 将 ngrok URL 填入 GitHub Webhook 配置
```

## CLI 回放

```bash
export GITHUB_TOKEN=ghp_xxxxx
python -m diffgate.cli replay --repo psf/requests --n 30 --output report.json
```

## 验证

```bash
pytest tests/ -v
curl http://localhost:8000/health
```
```

**Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml README.md
git commit -m "feat: Docker deployment (R2-I-003, R2-M-001)"
```

---

## Task 10: 设计文档同步（R2-I-002 修复）

**Files:**
- Modify: `docs/plans/2026-04-23-diffgate-pr-webhook-design.md`（overwrite）

**Step 1: 更新设计文档**

覆盖为 v3 实现的准确描述（同步架构改为异步、DiffGate 统一命名、删除 SQLite、历史均值改为规则阈值）。

**Step 2: Commit**

```bash
git add docs/plans/2026-04-23-diffgate-pr-webhook-design.md
git commit -m "docs: sync design doc with v3 implementation"
```

---

## Task 11: 完整验证

```bash
pip install -e ".[dev]"
pytest tests/ -v
python -m uvicorn diffgate.main:app --port 8000 &
curl http://localhost:8000/health
# 回放 3 仓库
python -m diffgate.cli replay --repo psf/requests --n 10
```

---

## 任务总览（v3）

| # | 交付物 | 关键修复 |
|---|--------|----------|
| 1 | pyproject.toml + diffgate/__init__.py | R2-M-001 |
| 2 | config.py + models.py | — |
| 3 | diff_parser.py + tests | B-004 |
| 4 | analyzer.py + prompts.py + tests | **R2-B-001** |
| 5 | commenter.py + tests | B-003, I-002, M-002 |
| 6 | webhook.py + tests | B-001, B-002, B-006 |
| 7 | main.py + tests | **R2-I-001**, R2-B-002 |
| 8 | cli.py + tests | **R2-B-003** |
| 9 | Dockerfile + docker-compose.yml + README | **R2-I-003**, R2-M-001 |
| 10 | 设计文档同步 | **R2-I-002** |
| 11 | 完整验证 | — |

**所有 Blocking = 0，所有 Important = 0**
