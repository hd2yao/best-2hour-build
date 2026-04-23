# DiffGate PR Webhook 服务 — 实现计划（最终版 v5）

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 用 FastAPI + Volcano Engine LLM 构建 GitHub PR 风险审查 Webhook 服务，快速返回 202 + 后台异步分析，自动回帖风险摘要。

**Architecture:** FastAPI 接收 Webhook → 202 Accepted + asyncio.create_task 后台执行 → diff 解析 → 火山引擎 LLM 分析 → GitHub PR 回帖；CLI 离线回放 3 仓库生成验证报告。

**Tech Stack:** Python 3.12 / FastAPI / Pydantic / httpx / Typer + Rich / Docker

**包结构：** `diffgate/` 作为根包

---

## 修订说明（v5 vs v4）

| ID | Severity | 问题 | 修复 |
|----|----------|------|------|
| R4-B-001 | Blocking | `monkeypatch.setenv` 在 import 后执行，对已创建的 `settings` 对象无效 | 改为 `setattr(diffgate.main.settings, "github_webhook_secret", "testsecret")` 直接 patch；teardown 清空 `app.dependency_overrides` |
| R4-I-001 | Important | 设计文档仍是旧版 | 已直接更新设计文档为 v4 准确描述 |
| R5-B-001 | Blocking | Dockerfile 复制 `.env.example` → `.env`，占位符 `your_webhook_secret_here` 是有效非空字符串 | 不在镜像中复制 `.env.example`；启动时拒绝占位符值 |
| R5-I-001 | Important | overrides 在文件顶部设置，teardown 清空后后续测试无 fake | overrides 放入 autouse fixture：yield 前设置，yield 后清空 |
| R6-B-001 | Blocking | v5 删 `pip install` 时漏加了回去，镜像无 uvicorn 等依赖 | 恢复 `RUN pip install --no-cache-dir -e .`，保留不复制 `.env.example` |
| R6-I-001 | Important | v1-v4 plan 文件仍在目录，容易被误用 | 在 v1-v4 四个文件顶部加 `> ⚠️ SUPERSEDED by v5` 标记 |

**v3 已确认修复（无变化）：** R2-B-001（per-call httpx client）✓ / R2-B-003（console 参数）✓ / R2-I-003（删 healthcheck）✓ / R2-M-001（diffgate/）✓

---

## 目录结构

```
diffgate/
├── __init__.py
├── main.py              # R3-B-001 HTTPException import，R3-B-003 200/202 分离，Depends 注入
├── config.py
├── models.py
├── diff_parser.py       # 只统计 +/- 行
├── prompts.py
├── analyzer.py          # per-call httpx client + async close()
├── commenter.py         # Accept header + 幂等 + async close()
├── webhook.py           # asyncio.create_task 后台
└── cli.py              # console 参数 + finally close()
tests/
├── test_config.py
├── test_models.py
├── test_diff_parser.py
├── test_analyzer.py     # 含 test_analyzer_has_close
├── test_commenter.py   # 含 test_commenter_has_close
├── test_webhook.py     # R4-B-001 修复：setattr settings 对象，teardown 清 overrides
├── test_main.py
└── test_cli.py        # StringIO Console
.env.example
pyproject.toml          # Hatchling packages=["diffgate"]
Dockerfile
docker-compose.yml      # 无 healthcheck
README.md
docs/plans/2026-04-23-diffgate-pr-webhook-design.md  # 已更新为 v4 描述
```

---

## Task 1: 项目骨架

**Files:**
- Create: `pyproject.toml`
- Create: `diffgate/__init__.py`
- Create: `.env.example`

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
dev = ["pytest>=8.3.0", "pytest-asyncio>=0.24.0", "pytest-httpserver>=1.0.0"]
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
[tool.hatch.build.targets.wheel]
packages = ["diffgate"]
```

```python
"""DiffGate — GitHub PR Risk Analysis Webhook Service."""
__version__ = "0.1.0"
```

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

**Commit:** `git add pyproject.toml diffgate/__init__.py .env.example && git commit -m "feat: project skeleton"`

---

## Task 2: 配置 + 数据模型

**Files:**
- Create: `diffgate/config.py`
- Create: `diffgate/models.py`
- Create: `tests/test_config.py`
- Create: `tests/test_models.py`

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

```python
# tests/test_config.py
from diffgate.config import Settings

def test_settings_defaults():
    s = Settings()
    assert s.app_port == 8000

def test_settings_env_override(monkeypatch):
    monkeypatch.setenv("APP_PORT", "9000")
    assert Settings().app_port == 9000
```

```python
# tests/test_models.py
from diffgate.models import FileDiff, AnalysisResult, PRPayload

def test_file_diff_high_risk():
    assert FileDiff(filename="config/settings.py", status="modified").is_high_risk_path is True
    assert FileDiff(filename="src/main.py", status="modified").is_high_risk_path is False

def test_pr_payload_properties():
    p = PRPayload(action="opened", pull_request={"number": 42, "title": "fix", "body": "x"},
                  repository={"full_name": "a/b"}, sender={})
    assert p.pr_number == 42
    assert p.repo_full_name == "a/b"

def test_analysis_result_defaults():
    r = AnalysisResult(minimal_edit_score=75)
    assert r.over_edit_flags == []
    assert r.risk_summary == ""
```

**Commit:** `git add diffgate/config.py diffgate/models.py tests/test_config.py tests/test_models.py && git commit -m "feat: config and data models"`

---

## Task 3: Diff 解析器

**Files:**
- Create: `diffgate/diff_parser.py`
- Create: `tests/test_diff_parser.py`

```python
# diffgate/diff_parser.py
import re
from diffgate.models import FileDiff

def parse_unified_diff(diff_text: str) -> list[FileDiff]:
    files: list[FileDiff] = []
    current: dict = {}
    lines = diff_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"diff --git a/(.+?) b/(.+?)(?:\s+.*)?$", line)
        if m:
            if current:
                _finalize(current, files)
            current = {"filename": m.group(2), "status": "modified", "additions": 0,
                       "deletions": 0, "patch": "", "changed_lines": 0}
            i += 1
            continue
        if line.startswith("new file mode"):
            current["status"] = "added"
        elif line.startswith("deleted file mode"):
            current["status"] = "removed"
        elif "rename from" in line or "rename to" in line:
            current["status"] = "renamed"
        elif re.match(r"@@ [-+]\d+(?:,\d+)? [-+]\d+(?:,\d+)? @@", line):
            # hunk header: not counted, just accumulate
            current["patch"] = (current.get("patch") or "") + line + "\n"
        else:
            if current:
                current["patch"] = (current.get("patch") or "") + line + "\n"
                if line.startswith("+") and not line.startswith("+++"):
                    current["additions"] += 1
                elif line.startswith("-") and not line.startswith("---"):
                    current["deletions"] += 1
        i += 1
    if current:
        _finalize(current, files)
    return files

def _finalize(current: dict, files: list[FileDiff]):
    current["changed_lines"] = current["additions"] + current["deletions"]
    files.append(FileDiff(**current))

class DiffParser:
    def __init__(self, max_file_patch_chars: int = 5000):
        self.max_file_patch_chars = max_file_patch_chars
    def parse(self, diff_text: str) -> list[FileDiff]:
        return parse_unified_diff(diff_text)
    def build_llm_context(self, files: list[FileDiff]) -> str:
        lines = []
        for f in files:
            lines.append(f"## {f.filename} [{f.status}] (+{f.additions} -{f.deletions})")
            if f.patch:
                truncated = f.patch[:self.max_file_patch_chars]
                if len(f.patch) > self.max_file_patch_chars:
                    truncated += f"\n... (truncated, total {len(f.patch)} chars)"
                lines.append(truncated)
            lines.append("")
        return "\n".join(lines)
    def compute_stats(self, files: list[FileDiff]) -> dict:
        return {
            "total_files": len(files),
            "total_additions": sum(f.additions for f in files),
            "total_deletions": sum(f.deletions for f in files),
            "total_changed_lines": sum(f.changed_lines for f in files),
            "max_file_changed_lines": max((f.changed_lines for f in files), default=0),
            "high_risk_files": [f.filename for f in files if f.is_high_risk_path],
            "file_count_anomaly": len(files) > 10,
            "line_bloat": (sum(f.changed_lines for f in files) > 1000 or
                           max((f.changed_lines for f in files), default=0) > 200),
        }
```

```python
# tests/test_diff_parser.py
import pytest
from diffgate.diff_parser import parse_unified_diff, DiffParser

def test_hunk_header_not_counted():
    diff = ("diff --git a/foo.py b/foo.py\n--- a/foo.py\n+++ b/foo.py\n"
            "@@ -1,3 +1,4 @@\n line1\n-old\n+new\n+extra\n")
    files = parse_unified_diff(diff)
    assert files[0].additions == 2
    assert files[0].deletions == 1

def test_multifile_and_status():
    diff = ("diff --git a/added.py b/added.py\nnew file mode 100644\n--- /dev/null\n"
            "+++ b/added.py\n@@ -0,0 +1,2 @@\n+l1\n+l2\n"
            "diff --git a/mod.py b/mod.py\n--- a/mod.py\n+++ b/mod.py\n@@ -1 +1 @@\n-old\n+new\n")
    files = parse_unified_diff(diff)
    assert files[0].status == "added"
    assert files[0].additions == 2
    assert files[1].status == "modified"
    assert files[1].additions == 1 and files[1].deletions == 1

def test_compute_stats():
    diff = ("diff --git a/a.py b/a.py\n--- a/a.py\n+++ b/a.py\n"
            "@@ -1 +1,3 @@\n-x\n+y\n+z\n+w\n"
            "diff --git a/b.py b/b.py\n--- a/b.py\n+++ b/b.py\n"
            "@@ -1,5 +1,5 @@\n-a\n-b\n-c\n-d\n-e\n+a\n+b\n+c\n+d\n+e\n+f\n")
    files = DiffParser().parse(diff)
    stats = DiffParser().compute_stats(files)
    assert stats["total_files"] == 2
    assert stats["total_additions"] == 9
    assert stats["total_deletions"] == 6
    assert stats["file_count_anomaly"] is False
    assert stats["line_bloat"] is False
    assert stats["high_risk_files"] == []
```

**Commit:** `git add diffgate/diff_parser.py tests/test_diff_parser.py && git commit -m "feat: diff parser — only +/- patch lines counted"`

---

## Task 4: 提示词 + LLM 分析引擎

**Files:**
- Create: `diffgate/prompts.py`
- Create: `diffgate/analyzer.py`
- Create: `tests/test_analyzer.py`

```python
# diffgate/prompts.py
from string import Template

SYSTEM_PROMPT = """你是一个代码改动评审助手，擅长评估 PR 改动的"最小化程度"和风险。

评分标准（minimal_edit_score，0-100）：
- 90-100：严格最小改动，只改核心文件，与 issue 完全对应
- 70-89：合理改动，有少量辅助改动但整体聚焦
- 50-69：scope 偏大，存在一定范围蔓延
- 20-49：scope 过大，大量无关改动或级联修改
- 0-19：极度膨胀，几乎无法接受

风险标志（over_edit_flags）：
- file_count_anomaly：文件数异常（> 10 个文件）
- irrelevant_module：存在与 issue 无关的模块改动
- line_bloat：单文件改动 > 200 行，或总 diff > 1000 行
- path_risk：涉及高风险路径（config/、.github/、scripts/、Dockerfile 等）

你必须输出严格的 JSON，不要输出任何其他内容。"""

USER_PROMPT_TEMPLATE = Template("""## Issue 信息
**标题:** ${title}
**描述:** ${body}

## 改动统计
${stats}

## Diff 内容
${diff_context}

请分析以上内容，输出 JSON：
{
  "minimal_edit_score": <int 0-100>,
  "over_edit_flags": [
    {"flag": "<flag_id>", "detail": "<中文说明>"}
  ],
  "suggested_scope": {
    "keep": ["<推荐保留的文件>"],
    "revert": ["<建议回退的文件>"]
  },
  "risk_summary": "<一句话中文风险总结>",
  "suggested_action": "<具体操作建议，中文>"
}
""")

FEW_SHOT_EXAMPLES = """
示例1（高分）：score: 95, flags: [], keep: ["auth.py"] revert: []
示例2（中分）：score: 75, flags: [], keep: ["models.py", "api.py"] revert: []
示例3（低分）：score: 25, flags: ["file_count_anomaly", "irrelevant_module"], keep: ["README.md"] revert: ["utils/logger.py", "config/db.yaml"]
"""
```

```python
# diffgate/analyzer.py
import json
import httpx
from diffgate.models import FileDiff, AnalysisResult
from diffgate.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, FEW_SHOT_EXAMPLES
from diffgate.diff_parser import DiffParser

def build_stats_text(stats: dict) -> str:
    hr = stats.get("high_risk_files", [])
    return (f"- 总文件数: {stats['total_files']}\n"
            f"- 总改动行数: {stats['total_changed_lines']} (+{stats['total_additions']} -{stats['total_deletions']})\n"
            f"- 单文件最大改动: {stats['max_file_changed_lines']} 行\n"
            f"- 高风险路径文件: {', '.join(hr) if hr else '无'}\n"
            f"- 文件数异常: {'是' if stats.get('file_count_anomaly') else '否'}\n"
            f"- 行数膨胀: {'是' if stats.get('line_bloat') else '否'}")

def build_llm_messages(title: str, body: str, files: list[FileDiff], stats: dict) -> list[dict]:
    parser = DiffParser()
    ctx = parser.build_llm_context(files)
    user = (USER_PROMPT_TEMPLATE.substitute(title=title, body=body or "（无描述）",
                                            stats=build_stats_text(stats), diff_context=ctx)
            + "\n\n" + FEW_SHOT_EXAMPLES)
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]

class LLMAnalyzer:
    """Each analyze() call creates its own local httpx.AsyncClient (no shared state)."""
    def __init__(self, base_url: str, api_key: str, model: str, timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    async def analyze(self, title: str, body: str, files: list[FileDiff], stats: dict) -> AnalysisResult:
        messages = build_llm_messages(title, body, files, stats)
        payload = {"model": self.model, "messages": messages, "temperature": 0.1, "max_tokens": 2048}
        async with httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            timeout=self.timeout,
        ) as client:
            response = await client.post("/chat/completions", json=payload)
            if response.status_code != 200:
                raise RuntimeError(f"LLM API error: {response.status_code} {response.text}")
            data = response.json()
            content = data["choices"][0]["message"]["content"]
        try:
            p = json.loads(content)
            return AnalysisResult(
                minimal_edit_score=p.get("minimal_edit_score", 50),
                over_edit_flags=p.get("over_edit_flags", []),
                suggested_scope=p.get("suggested_scope", {}),
                risk_summary=p.get("risk_summary", ""),
                suggested_action=p.get("suggested_action", ""),
            )
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            return AnalysisResult(
                minimal_edit_score=50,
                over_edit_flags=[{"flag": "parse_error", "detail": f"LLM 输出解析失败: {e}"}],
                risk_summary="LLM 返回格式异常，请人工复核",
                suggested_action="请人工审查本次 PR 改动范围",
            )

    async def close(self) -> None:
        """No-op since we use per-call clients."""
        pass
```

```python
# tests/test_analyzer.py
import pytest
from diffgate.analyzer import build_llm_messages, LLMAnalyzer
from diffgate.diff_parser import DiffParser
from diffgate.models import FileDiff

def test_build_llm_messages():
    files = [FileDiff(filename="src/api.py", status="modified", additions=5, deletions=2, patch="+a\n+b")]
    stats = DiffParser().compute_stats(files)
    msgs = build_llm_messages("fix login", "users can't login", files, stats)
    assert len(msgs) == 2
    assert msgs[0]["role"] == "system"
    assert "fix login" in msgs[1]["content"]

def test_analyzer_has_close():
    import inspect
    a = LLMAnalyzer("http://x", "k", "m")
    assert inspect.iscoroutinefunction(a.close)
```

**Commit:** `git add diffgate/prompts.py diffgate/analyzer.py tests/test_analyzer.py && git commit -m "feat: LLM analyzer with per-call client and close()"`

---

## Task 5: GitHub 评论器

**Files:**
- Create: `diffgate/commenter.py`
- Create: `tests/test_commenter.py`

```python
# diffgate/commenter.py
import httpx
from diffgate.models import AnalysisResult

DIFFGATE_MARKER = "<!-- diffgate:{pr_number} -->"

def build_comment_body(result: AnalysisResult, pr_number: int) -> str:
    score = result.minimal_edit_score
    level = "🟢 低风险" if score >= 80 else ("🟡 中等风险" if score >= 50 else "🔴 高风险")
    flags_md = "\n".join(f"- ⚠️ **{f.flag}**: {f.detail}" for f in result.over_edit_flags) \
               if result.over_edit_flags else "- ✅ 无明显风险标志"
    keep_md = ", ".join(f"`{f}`" for f in result.suggested_scope.keep) if result.suggested_scope.keep else "—"
    revert_md = ", ".join(f"`{f}`" for f in result.suggested_scope.revert) if result.suggested_scope.revert else "—"
    return (f"{DIFFGATE_MARKER.format(pr_number=pr_number)}\n\n"
            f"## DiffGate 风险摘要\n\n| 指标 | 值 |\n|------|----|\n"
            f"| 最小改动评分 | **{score}/100** |\n| 风险等级 | {level} |\n\n"
            f"**风险标志：**\n{flags_md}\n\n"
            f"**建议操作：**\n- 🔴 建议回退：{revert_md}\n- 🟢 建议保留：{keep_md}\n")

class GitHubCommenter:
    def __init__(self, token: str):
        self.token = token

    async def _get_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url="https://api.github.com",
            headers={"Authorization": f"Bearer {self.token}", "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28"},
            timeout=30.0,
        )

    async def get_pr_diff(self, repo: str, pr_number: int) -> str:
        async with await self._get_client() as client:
            r = await client.get(f"/repos/{repo}/pulls/{pr_number}",
                                  headers={"Accept": "application/vnd.github.diff"})
            return r.text if r.status_code == 200 else ""

    async def get_existing_comment(self, repo: str, pr_number: int, marker: str) -> str | None:
        async with await self._get_client() as client:
            r = await client.get(f"/repos/{repo}/issues/{pr_number}/comments")
            if r.status_code == 200:
                for c in r.json():
                    if marker in c.get("body", ""):
                        return c["url"]
        return None

    async def post_comment(self, repo: str, pr_number: int, body: str) -> bool:
        async with await self._get_client() as client:
            r = await client.post(f"/repos/{repo}/issues/{pr_number}/comments", json={"body": body})
            return r.status_code in (200, 201)

    async def update_comment(self, comment_url: str, body: str) -> bool:
        async with await self._get_client() as client:
            r = await client.patch(comment_url, json={"body": body})
            return r.status_code == 200

    async def close(self) -> None:
        """No-op since we use per-call clients."""
        pass
```

```python
# tests/test_commenter.py
import pytest
from diffgate.commenter import build_comment_body, DIFFGATE_MARKER
from diffgate.models import AnalysisResult
import inspect
from diffgate.commenter import GitHubCommenter

def test_comment_has_idempotency_marker():
    body = build_comment_body(AnalysisResult(minimal_edit_score=75), 42)
    assert "<!-- diffgate:42 -->" in body

def test_comment_no_external_links():
    assert "diffgate.dev" not in build_comment_body(AnalysisResult(minimal_edit_score=75), 1)

def test_comment_risk_levels():
    assert "🟢" in build_comment_body(AnalysisResult(minimal_edit_score=90), 1)
    assert "🟡" in build_comment_body(AnalysisResult(minimal_edit_score=55), 1)
    assert "🔴" in build_comment_body(AnalysisResult(minimal_edit_score=30), 1)

def test_commenter_has_close():
    assert inspect.iscoroutinefunction(GitHubCommenter("x").close)
```

**Commit:** `git add diffgate/commenter.py tests/test_commenter.py && git commit -m "feat: GitHub commenter with Accept header, idempotency, and close()"`

---

## Task 6: Webhook 处理器

**Files:**
- Create: `diffgate/webhook.py`

```python
# diffgate/webhook.py
import hmac
import hashlib
import json
import logging
import asyncio
from fastapi import HTTPException, Request
from diffgate.models import PRPayload
from diffgate.diff_parser import DiffParser
from diffgate.analyzer import LLMAnalyzer
from diffgate.commenter import GitHubCommenter, build_comment_body, DIFFGATE_MARKER

logger = logging.getLogger(__name__)

def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    if not signature.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature[len("sha256="):])

async def handle_pr_webhook(
    request: Request, analyzer: LLMAnalyzer, commenter: GitHubCommenter, webhook_secret: str,
) -> dict:
    body = await request.body()
    event = request.headers.get("X-GitHub-Event", "")
    delivery_id = request.headers.get("X-GitHub-Delivery", "")
    logger.info(f"Webhook received: event={event} delivery={delivery_id}")

    sig = request.headers.get("X-Hub-Signature-256", "")
    if webhook_secret:
        # R5-B-001 fix: reject known placeholder secrets that would be unsafe in production
        PLACEHOLDER_SECRETS = {"your_webhook_secret_here", "ghp_xxxxx", "your_volcano_api_key",
                                "your_model_id", ""}
        if webhook_secret in PLACEHOLDER_SECRETS:
            raise HTTPException(status_code=503, detail="Webhook secret is a placeholder value")
        if not sig or not verify_github_signature(body, sig, webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid signature")
    else:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")

    if event != "pull_request":
        return {"status": "ignored", "reason": f"event={event}"}

    payload = PRPayload(**json.loads(body))
    if payload.action not in ("opened", "synchronize"):
        return {"status": "ignored", "reason": f"action={payload.action}"}

    asyncio.create_task(_process_pr_background(payload, analyzer, commenter, delivery_id))
    return {"status": "accepted", "delivery_id": delivery_id}

async def _process_pr_background(payload: PRPayload, analyzer: LLMAnalyzer,
                                  commenter: GitHubCommenter, delivery_id: str):
    try:
        diff_text = await commenter.get_pr_diff(payload.repo_full_name, payload.pr_number)
        if not diff_text:
            logger.error(f"Failed to fetch diff for {payload.repo_full_name}#{payload.pr_number}")
            return
        parser = DiffParser()
        files = parser.parse(diff_text)
        stats = parser.compute_stats(files)
        if not files:
            return
        result = await analyzer.analyze(payload.title, payload.body, files, stats)
        marker = DIFFGATE_MARKER.format(pr_number=payload.pr_number)
        existing_url = await commenter.get_existing_comment(payload.repo_full_name, payload.pr_number, marker)
        comment_body = build_comment_body(result, payload.pr_number)
        if existing_url:
            success = await commenter.update_comment(existing_url, comment_body)
        else:
            success = await commenter.post_comment(payload.repo_full_name, payload.pr_number, comment_body)
        logger.info(f"PR {payload.repo_full_name}#{payload.pr_number} analyzed: score={result.minimal_edit_score} posted={success}")
    except Exception as e:
        logger.exception(f"Background task failed for delivery {delivery_id}: {e}")
```

**Commit:** `git add diffgate/webhook.py && git commit -m "feat: webhook handler with async background processing"`

---

## Task 7: FastAPI 主入口 + 测试

**Files:**
- Create: `diffgate/main.py`
- Create: `tests/test_webhook.py`
- Create: `tests/test_main.py`

```python
# diffgate/main.py
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, HTTPException  # R3-B-001 fix: import HTTPException
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
    return LLMAnalyzer(base_url=settings.volcano_base_url, api_key=settings.volcano_api_key,
                       model=settings.volcano_model)

def get_commenter() -> GitHubCommenter:
    return GitHubCommenter(token=settings.github_token)

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.volcano_api_key:
        logger.warning("VOLCANO_API_KEY is not set")
    if not settings.github_token:
        logger.warning("GITHUB_TOKEN is not set")
    yield

app = FastAPI(title="DiffGate", version="0.1.0", lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

@app.post("/webhook/pr", status_code=202)  # R3-B-003: 202 for accepted
async def webhook_pr(
    request: Request,
    analyzer: LLMAnalyzer = Depends(get_analyzer),    # R3-B-002: Depends injection
    commenter: GitHubCommenter = Depends(get_commenter),
):
    result = await handle_pr_webhook(request, analyzer, commenter, settings.github_webhook_secret)
    if result.get("status") == "ignored":
        return JSONResponse(result, status_code=200)  # R3-B-003: 200 for ignored
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("diffgate.main:app", host=settings.app_host, port=settings.app_port, reload=True)
```

```python
# tests/test_webhook.py
"""
R4-B-001 fix: patch diffgate.main.settings directly.
R5-I-001 fix: dependency overrides set inside fixture (yield before) and cleared after yield.
"""
import pytest
import hmac
import hashlib
import json
from diffgate.main import app, get_analyzer, get_commenter
from diffgate.models import AnalysisResult

class FakeAnalyzer:
    async def analyze(self, title, body, files, stats):
        return AnalysisResult(minimal_edit_score=75)

class FakeCommenter:
    async def get_pr_diff(self, repo, pr_number): return ""
    async def get_existing_comment(self, repo, pr_number, marker): return None
    async def post_comment(self, repo, pr_number, body): return True
    async def update_comment(self, url, body): return True
    async def close(self): pass

def make_sig(payload: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

@pytest.fixture(autouse=True)
def setup_test_env():
    """R4-B-001 fix: patch settings object directly (not env vars).
    R5-I-001 fix: overrides set BEFORE yield (so all tests get fakes),
    cleared AFTER yield."""
    import diffgate.main

    # Set secret and install fakes BEFORE any request
    diffgate.main.settings.github_webhook_secret = "testsecret"
    app.dependency_overrides[get_analyzer] = lambda: FakeAnalyzer()
    app.dependency_overrides[get_commenter] = lambda: FakeCommenter()

    yield

    # Clean up AFTER test (R4-B-001 + R5-I-001 fix)
    diffgate.main.settings.github_webhook_secret = ""
    app.dependency_overrides.clear()

def test_webhook_returns_202_for_valid_pr():
    from fastapi.testclient import TestClient
    payload_dict = {
        "action": "opened",
        "pull_request": {"number": 1, "title": "test", "body": "", "diff_url": ""},
        "repository": {"full_name": "a/b"},
        "sender": {},
    }
    payload = json.dumps(payload_dict).encode()
    sig = make_sig(payload, "testsecret")
    with TestClient(app) as client:
        r = client.post("/webhook/pr", content=payload,
                         headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "pull_request"})
        assert r.status_code == 202, f"Expected 202, got {r.status_code}"
        assert r.json()["status"] == "accepted"

def test_webhook_rejects_invalid_signature():
    from fastapi.testclient import TestClient
    payload = json.dumps({"action": "opened", "pull_request": {"number": 1, "title": "", "body": "", "diff_url": ""},
                           "repository": {"full_name": "a/b"}, "sender": {}}).encode()
    with TestClient(app) as client:
        r = client.post("/webhook/pr", content=payload,
                         headers={"X-Hub-Signature-256": "sha256=wrong", "X-GitHub-Event": "pull_request"})
        assert r.status_code == 401

def test_webhook_ignores_non_pr_event():
    """R3-B-003 fix: non-PR events return 200 (ignored)."""
    from fastapi.testclient import TestClient
    payload = json.dumps({"action": "push"}).encode()
    sig = make_sig(payload, "testsecret")
    with TestClient(app) as client:
        r = client.post("/webhook/pr", content=payload,
                         headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "push"})
        assert r.status_code == 200
        assert r.json()["status"] == "ignored"

def test_webhook_ignores_closed_action():
    from fastapi.testclient import TestClient
    payload_dict = {
        "action": "closed",
        "pull_request": {"number": 1, "title": "", "body": "", "diff_url": ""},
        "repository": {"full_name": "a/b"},
        "sender": {},
    }
    payload = json.dumps(payload_dict).encode()
    sig = make_sig(payload, "testsecret")
    with TestClient(app) as client:
        r = client.post("/webhook/pr", content=payload,
                         headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "pull_request"})
        assert r.status_code == 200
        assert r.json()["status"] == "ignored"

def test_verify_signature():
    from diffgate.webhook import verify_github_signature
    payload = b'{"test": 1}'
    sig = make_sig(payload, "secret")
    assert verify_github_signature(payload, sig, "secret") is True
    assert verify_github_signature(payload, "sha256=wrong", "secret") is False

def test_webhook_rejects_placeholder_secret():
    """R5-B-001 fix: placeholder secrets like 'your_webhook_secret_here' are rejected."""
    from fastapi.testclient import TestClient
    import diffgate.main

    # Temporarily set a placeholder secret value
    diffgate.main.settings.github_webhook_secret = "your_webhook_secret_here"
    app.dependency_overrides[get_analyzer] = lambda: FakeAnalyzer()
    app.dependency_overrides[get_commenter] = lambda: FakeCommenter()

    payload = json.dumps({
        "action": "opened",
        "pull_request": {"number": 1, "title": "", "body": "", "diff_url": ""},
        "repository": {"full_name": "a/b"},
        "sender": {},
    }).encode()
    sig = make_sig(payload, "your_webhook_secret_here")

    try:
        with TestClient(app) as client:
            r = client.post("/webhook/pr", content=payload,
                            headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "pull_request"})
            assert r.status_code == 503, f"Expected 503 for placeholder secret, got {r.status_code}"
    finally:
        diffgate.main.settings.github_webhook_secret = ""
        app.dependency_overrides.clear()
```

```python
# tests/test_main.py
from fastapi.testclient import TestClient
from diffgate.main import app

def test_health_endpoint():
    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
```

**Commit:** `git add diffgate/main.py tests/test_webhook.py tests/test_main.py && git commit -m "feat: FastAPI main with HTTPException import, 202/200 separation, dependency injection"`

---

## Task 8: CLI

**Files:**
- Modify: `diffgate/cli.py`
- Modify: `tests/test_cli.py`

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

cli = typer.Typer(name="diffgate")
_console = Console()

@cli.command()
def replay(repo: str = typer.Option(..., "--repo"), token: Optional[str] = typer.Option(None, "--token"),
           n: int = typer.Option(30, "--n"), output: Optional[str] = typer.Option(None, "--output"),
           min_score: int = typer.Option(50, "--min-score")):
    github_token = token or settings.github_token
    if not github_token:
        _console.print("[red]Error: GITHUB_TOKEN not set[/red]")
        raise typer.Exit(1)
    results = asyncio.run(_replay_async(repo, n, github_token, min_score))
    print_replay_report(results, repo, n)
    if output:
        Path(output).write_text(json.dumps(results, ensure_ascii=False, indent=2))

async def _replay_async(repo: str, n: int, token: str, min_score: int) -> list[dict]:
    commenter = GitHubCommenter(token=token)
    analyzer = LLMAnalyzer(base_url=settings.volcano_base_url, api_key=settings.volcano_api_key,
                           model=settings.volcano_model)
    results = []
    try:
        client = await commenter._get_client()
        try:
            r = await client.get(f"/repos/{repo}/pulls",
                                  params={"state": "closed", "sort": "updated", "direction": "desc", "per_page": min(n, 100)})
            prs = r.json()[:n]
        except Exception as e:
            _console.print(f"[red]Failed to fetch PRs: {e}[/red]")
            return []
        finally:
            await client.aclose()
        for pr in prs:
            diff_text = await commenter.get_pr_diff(repo, pr["number"])
            files = DiffParser().parse(diff_text)
            stats = DiffParser().compute_stats(files)
            if not files:
                _console.print(f"  PR #{pr['number']}: [dim]empty diff[/dim]")
                continue
            result = await analyzer.analyze(pr.get("title", ""), pr.get("body", "") or "", files, stats)
            flagged = result.minimal_edit_score < min_score
            results.append({
                "pr_number": pr["number"], "title": pr.get("title", ""), "url": pr.get("html_url", ""),
                "score": result.minimal_edit_score, "flagged": flagged,
                "flag_count": len(result.over_edit_flags),
                "flags": [{"flag": f.flag, "detail": f.detail} for f in result.over_edit_flags],
                "keep": result.suggested_scope.keep, "revert": result.suggested_scope.revert,
                "files_changed": len(files), "total_lines": stats["total_changed_lines"],
            })
            flag_str = f"[red]FLAGGED[/red]" if flagged else "[green]OK[/green]"
            _console.print(f"  PR #{pr['number']}: score={result.minimal_edit_score} {flag_str}")
    finally:
        await commenter.close()  # R3-B-004 fix
        await analyzer.close()   # R3-B-004 fix
    return results

def print_replay_report(results: list[dict], repo: str, n: int, console: Console | None = None):
    out = console or _console
    if not results:
        out.print("[yellow]No results to display.[/yellow]")
        return
    total = len(results)
    flagged = sum(1 for r in results if r["flagged"])
    avg = sum(r["score"] for r in results) / total
    out.print(Panel(
        f"[bold]Repo:[/bold] {repo}\n[bold]Total:[/bold] {total} PRs\n"
        f"[bold]Flagged (score<50):[/bold] {flagged} ({100*flagged/total:.1f}%)\n[bold]Avg score:[/bold] {avg:.1f}",
        title="Summary"))
    table = Table(title="PR Analysis")
    table.add_column("PR", style="cyan"); table.add_column("Score", style="magenta")
    table.add_column("Flags", style="yellow"); table.add_column("Files", style="green")
    for r in results[:20]:
        flag_str = ", ".join(f["flag"] for f in r["flags"]) if r["flags"] else "—"
        table.add_row(f"#{r['pr_number']}", str(r["score"]), flag_str, str(r["files_changed"]))
    out.print(table)
    if total > 20:
        out.print(f"[dim]... and {total - 20} more PRs[/dim]")

@cli.command()
def serve(host: str = typer.Option("0.0.0.0"), port: int = typer.Option(8000)):
    import uvicorn
    uvicorn.run("diffgate.main:app", host=host, port=port, reload=False)

if __name__ == "__main__":
    cli()
```

```python
# tests/test_cli.py
from io import StringIO
from rich.console import Console
from diffgate.cli import print_replay_report

def test_empty_results():
    console = Console(file=StringIO(), force_terminal=True)
    print_replay_report([], "owner/repo", 0, console=console)
    assert "No results" in console.file.getvalue()

def test_shows_stats():
    results = [
        {"pr_number": 100, "score": 90, "flagged": False, "flags": [], "files_changed": 2},
        {"pr_number": 99, "score": 40, "flagged": True,
         "flags": [{"flag": "file_count_anomaly", "detail": "12 files"}], "files_changed": 15},
    ]
    console = Console(file=StringIO(), force_terminal=True)
    print_replay_report(results, "test/repo", 2, console=console)
    out = console.file.getvalue()
    assert "test/repo" in out
    assert "90" in out
    assert "40" in out
```

**Commit:** `git add diffgate/cli.py tests/test_cli.py && git commit -m "feat: CLI with console parameter and close() cleanup"`

---

## Task 9: Docker 部署

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `README.md`

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY diffgate/ ./diffgate/
COPY pyproject.toml .
# R5-B-001 fix: do NOT copy .env.example to .env — require runtime env vars
# R6-B-001 fix: must install dependencies so uvicorn/fastapi/httpx are available at runtime
RUN pip install --no-cache-dir -e .
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "diffgate.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
services:
  diffgate:
    build: .
    ports: ["8000:8000"]
    env_file: [".env"]
    volumes: ["./data:/app/data"]
    restart: unless-stopped
```

```markdown
# DiffGate

GitHub PR 风险审查 Webhook 服务。

## 快速启动

```bash
cp .env.example .env && pip install -e ".[dev]"
python -m uvicorn diffgate.main:app --reload
# 或 docker compose up -d
```

## 注册 Webhook

GitHub 仓库 Settings > Webhooks > Add webhook：Payload URL、Content type、Secret、Events 选择 Pull requests。

本地调试：`ngrok http 8000`，将 ngrok URL 填入 GitHub Webhook 配置。

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

**Commit:** `git add Dockerfile docker-compose.yml README.md && git commit -m "feat: Docker deployment"`

---

## Task 10: 完整验证

```bash
pip install -e ".[dev]"
pytest tests/ -v
python -m uvicorn diffgate.main:app --port 8000 &
sleep 2
curl http://localhost:8000/health
python -m diffgate.cli replay --repo psf/requests --n 5
```

---

## 任务总览（v5）

| # | 交付物 | 关键修复 |
|---|--------|----------|
| 1 | pyproject.toml + diffgate/__init__.py | — |
| 2 | config.py + models.py + tests | — |
| 3 | diff_parser.py + tests | B-004（只统计 +/- 行）|
| 4 | prompts.py + analyzer.py + tests | R3-B-004（close() no-op）|
| 5 | commenter.py + tests | R3-B-004（close() no-op）|
| 6 | webhook.py | R5-B-001（拒绝占位符 secret）|
| 7 | main.py + test_webhook.py + test_main.py | HTTPException import / Depends 注入 / 200+202 分离 / R4-B-001 setattr settings / R5-I-001 overrides 放入 fixture |
| 8 | cli.py + tests | R3-B-004（finally close()）|
| 9 | Dockerfile + docker-compose.yml + README | R5-B-001（不复制 .env.example）+ R6-B-001（保留 pip install）|
| 10 | 完整验证 | — |

**所有 Blocking = 0，所有 Important = 0，Minor = 0**

---

## R4-B-001 修复详解

```python
# 错误做法（v4）：monkeypatch.setenv 在 import 后执行，对已创建的 settings 对象无效
def test_webhook_returns_202(setup_secret):  # fixture 在 import 后才运行
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", "testsecret")  # ← settings.github_webhook_secret 仍为 ""！

# 正确做法（v5）：直接 patch settings 对象
@pytest.fixture(autouse=True)
def setup_secret():
    import diffgate.main
    diffgate.main.settings.github_webhook_secret = "testsecret"  # ← 直接修改对象属性
    yield
    diffgate.main.settings.github_webhook_secret = ""
    app.dependency_overrides.clear()  # ← teardown 清空避免跨测试污染
```
