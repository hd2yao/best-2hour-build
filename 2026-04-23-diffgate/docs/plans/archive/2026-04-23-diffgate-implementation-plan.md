# ⚠️ SUPERSEDED by `2026-04-23-diffgate-implementation-plan-v5.md`

# DiffFence PR Webhook 服务 — 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**目标：** 用 FastAPI + Volcano Engine LLM 构建一个 GitHub PR Webhook 服务，对 Python 仓库 PR 的 diff + 任务描述做风险评分，自动回帖风险摘要。

**架构：** FastAPI 接收 GitHub Webhook 事件 → 解析 unified diff + Python AST diff → 调用火山引擎 LLM 结构化分析 → 回帖 PR 评论；CLI 工具支持离线回放公开仓库 PR 历史并生成验证报告。

**技术栈：** Python 3.12 / FastAPI / Pydantic / PyGithub / Typer + Rich / Docker

---

## 阶段一：项目骨架 + 核心数据模型

### Task 1: 初始化项目结构

**Files:**
- Create: `pyproject.toml`
- Create: `README.md`
- Create: `src/__init__.py`
- Create: `src/models.py`
- Create: `.env.example`

**Step 1: 创建 pyproject.toml**

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
    "PyGithub>=2.4.0",
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
    "httpx>=0.27.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**Step 2: 创建 .env.example**

```env
# GitHub
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_TOKEN=ghp_xxxxx

# Volcano Engine LLM (OpenAI-compatible)
VOLCANO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCANO_API_KEY=your_volcano_api_key
VOLCANO_MODEL=your_model_id

# App
APP_HOST=0.0.0.0
APP_PORT=8000
LOG_LEVEL=INFO

# Storage
DB_PATH=./data/diffgate.db
```

**Step 3: 创建 Pydantic 数据模型**

```python
# src/models.py
from pydantic import BaseModel, Field
from typing import Optional


class OverEditFlag(BaseModel):
    flag: str = Field(description="flag ID: file_count_anomaly | irrelevant_module | line_bloat | path_risk")
    detail: str = Field(description="human-readable explanation in Chinese")


class SuggestedScope(BaseModel):
    keep: list[str] = Field(default_factory=list, description="files recommended to keep")
    revert: list[str] = Field(default_factory=list, description="files recommended to revert")


class AnalysisResult(BaseModel):
    minimal_edit_score: int = Field(0, ge=0, le=100, description="0-100 score, higher = more minimal")
    over_edit_flags: list[OverEditFlag] = Field(default_factory=list)
    suggested_scope: SuggestedScope = Field(default_factory=SuggestedScope)
    risk_summary: str = Field(default="", description="Chinese risk summary")
    suggested_action: str = Field(default="", description="Chinese suggested action")


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

    @property
    def diff_url(self) -> str:
        return self.pull_request.get("diff_url", "")


class FileDiff(BaseModel):
    filename: str
    status: str  # added, modified, removed, renamed
    additions: int
    deletions: int
    patch: Optional[str] = None
    changed_lines: int = 0

    @property
    def is_high_risk_path(self) -> bool:
        high_risk_prefixes = ["config/", ".github/", "scripts/", "Makefile", "Dockerfile", "docker-compose"]
        return any(self.filename.startswith(p) for p in high_risk_prefixes)
```

**Step 4: 创建 src/__init__.py**

```python
"""DiffGate — GitHub PR Risk Analysis Webhook Service."""
__version__ = "0.1.0"
```

---

### Task 2: Diff 解析器

**Files:**
- Create: `src/diff_parser.py`
- Create: `tests/test_diff_parser.py`

**Step 1: 写测试**

```python
# tests/test_diff_parser.py
import pytest
from src.diff_parser import DiffParser, parse_unified_diff


def test_parse_unified_diff_basic():
    diff_text = """diff --git a/src/api/handlers.py b/src/api/handlers.py
index abc1234..def5678 100644
--- a/src/api/handlers.py
+++ b/src/api/handlers.py
@@ -10,6 +10,7 @@ def handler():
     old_line()
+    new_feature()
     end()
"""
    files = parse_unified_diff(diff_text)
    assert len(files) == 1
    assert files[0].filename == "src/api/handlers.py"
    assert files[0].additions == 1
    assert files[0].deletions == 1
    assert files[0].status == "modified"


def test_parse_multifile_diff():
    diff_text = """diff --git a/foo.py b/foo.py
new file mode 100644
--- /dev/null
+++ b/foo.py
@@ -0,0 +1,3 @@
+print("hello")
diff --git a/bar.py b/bar.py
deleted file mode 100644
--- a/bar.py
+++ /dev/null
@@ -1,3 +0,0 @@
-print("bye")
"""
    files = parse_unified_diff(diff_text)
    assert len(files) == 2
    assert files[0].filename == "foo.py"
    assert files[0].status == "added"
    assert files[1].filename == "bar.py"
    assert files[1].status == "removed"


def test_high_risk_path_detection():
    diff_text = """diff --git a/config/settings.py b/config/settings.py
--- a/config/settings.py
+++ b/config/settings.py
@@ -1 +1 @@
-old
+new
"""
    files = parse_unified_diff(diff_text)
    assert files[0].is_high_risk_path is True


def test_line_count_calculation():
    diff_text = """diff --git a/big.py b/big.py
--- a/big.py
+++ b/big.py
@@ -1,100 +1,100 @@
""" + "\n".join([f"-line{i}" for i in range(100)]) + """
""" + "\n".join([f"+newline{i}" for i in range(100)]) + """
"""
    files = parse_unified_diff(diff_text)
    assert files[0].changed_lines == 200
```

**Step 2: 写实现**

```python
# src/diff_parser.py
import re
import difflib
from typing import Iterator
from src.models import FileDiff


def parse_unified_diff(diff_text: str) -> list[FileDiff]:
    """Parse unified diff text into structured FileDiff objects."""
    files: list[FileDiff] = []
    current: dict = {}

    lines = diff_text.splitlines(keepends=True)
    i = 0
    while i < len(lines):
        line = lines[i]

        # Match file header: diff --git a/path b/path
        m = re.match(r"diff --git a/(.+?) b/(.+?)(?:\s+.*)?$", line)
        if m:
            if current:
                files.append(FileDiff(**current))
            filename = m.group(2)
            current = {
                "filename": filename,
                "status": "modified",
                "additions": 0,
                "deletions": 0,
                "patch": "",
                "changed_lines": 0,
            }
            i += 1
            continue

        # Match new file
        if line.startswith("new file mode"):
            current["status"] = "added"
            i += 1
            continue

        # Match deleted file
        if line.startswith("deleted file mode"):
            current["status"] = "removed"
            i += 1
            continue

        # Match renamed
        if "rename from" in line or "rename to" in line:
            current["status"] = "renamed"
            i += 1
            continue

        # Count additions/deletions in hunk header
        m = re.match(r"@@ .*\+(\d+)(?:,(\d+))? @@", line)
        if m:
            additions = int(m.group(2) or 1)
            current["additions"] += additions
            current["deletions"] += int(m.group(2) or 1)  # will correct below
            i += 1
            continue

        # Accumulate patch lines and count +/-
        if current:
            current["patch"] = (current.get("patch") or "") + line
            if line.startswith("+") and not line.startswith("+++"):
                current["additions"] += 1
            elif line.startswith("-") and not line.startswith("---"):
                current["deletions"] += 1

        i += 1

    if current:
        files.append(FileDiff(**current))

    # Compute changed_lines
    for f in files:
        f.changed_lines = f.additions + f.deletions

    return files


class DiffParser:
    """Main diff parser with AST analysis for Python files."""

    def __init__(self, max_file_patch_chars: int = 5000):
        self.max_file_patch_chars = max_file_patch_chars

    def parse(self, diff_text: str) -> list[FileDiff]:
        return parse_unified_diff(diff_text)

    def build_llm_context(self, files: list[FileDiff]) -> str:
        """Build LLM-friendly diff context string."""
        lines = []
        for f in files:
            lines.append(f"## {f.filename} [{f.status}] (+{f.additions} -{f.deletions})")
            if f.patch:
                truncated = f.patch[: self.max_file_patch_chars]
                if len(f.patch) > self.max_file_patch_chars:
                    truncated += f"\n... (truncated, total {len(f.patch)} chars)"
                lines.append(truncated)
            lines.append("")
        return "\n".join(lines)

    def compute_stats(self, files: list[FileDiff]) -> dict:
        """Compute aggregate diff statistics."""
        total_files = len(files)
        total_additions = sum(f.additions for f in files)
        total_deletions = sum(f.deletions for f in files)
        total_changed_lines = sum(f.changed_lines for f in files)
        max_file_lines = max((f.changed_lines for f in files), default=0)
        high_risk_files = [f.filename for f in files if f.is_high_risk_path]

        return {
            "total_files": total_files,
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "total_changed_lines": total_changed_lines,
            "max_file_changed_lines": max_file_lines,
            "high_risk_files": high_risk_files,
            "file_count_anomaly": total_files > 10,
            "line_bloat": total_changed_lines > 1000 or max_file_lines > 200,
        }
```

---

### Task 3: LLM 分析引擎

**Files:**
- Create: `src/analyzer.py`
- Create: `tests/test_analyzer.py`
- Create: `src/prompts.py`

**Step 1: 写提示词模板**

```python
# src/prompts.py
from string import Template

SYSTEM_PROMPT = """你是一个代码改动评审助手，擅长评估 PR 改动的"最小化程度"和风险。
你的任务是根据 issue 描述和代码 diff，判断改动是否聚焦、合理。

评分标准（minimal_edit_score，0-100）：
- 90-100：严格最小改动，只改核心文件，与 issue 完全对应
- 70-89：合理改动，有少量辅助改动但整体聚焦
- 50-69：scope 偏大，存在一定范围蔓延
- 20-49：scope 过大，大量无关改动或级联修改
- 0-19：极度膨胀，几乎无法接受

风险标志（over_edit_flags）：
- file_count_anomaly：文件数异常（> 10 个文件，或远超历史均值）
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
参考示例：

示例1（高分）：
- Issue: "修复 login() 函数在空密码时抛出未捕获异常"
- 改动：仅 auth.py 的一个 if 判断
- score: 95
- flags: []
- keep: ["auth.py"] revert: []

示例2（中分）：
- Issue: "添加用户头像上传功能"
- 改动：models.py, api.py, tests/ 各改一点
- score: 75
- flags: []
- keep: ["models.py", "api.py", "tests/"] revert: []

示例3（低分）：
- Issue: "更新 README"
- 改动：README + 7个无关文件（logger、config、ci等）
- score: 25
- flags: ["file_count_anomaly", "irrelevant_module"]
- keep: ["README.md"] revert: ["utils/logger.py", "config/db.yaml"]
"""
```

**Step 2: 写测试（mock LLM）**

```python
# tests/test_analyzer.py
import pytest
from unittest.mock import patch, AsyncMock
from src.analyzer import LLAnalyzer, build_llm_payload
from src.models import FileDiff

def test_build_llm_payload():
    files = [
        FileDiff(filename="src/api.py", status="modified", additions=5, deletions=2, patch="+line\n+line2"),
        FileDiff(filename="config/settings.py", status="modified", additions=10, deletions=0, patch="+config"),
    ]
    stats = {"total_files": 2, "total_changed_lines": 17, "max_file_changed_lines": 10, "high_risk_files": ["config/settings.py"]}
    payload = build_llm_payload("修复登录问题", "用户无法登录", files, stats)
    assert "修复登录问题" in payload
    assert "src/api.py" in payload
    assert "config/settings.py" in payload


def test_stats_format():
    files = [
        FileDiff(filename="a.py", status="modified", additions=5, deletions=5, changed_lines=10),
        FileDiff(filename="b.py", status="added", additions=3, deletions=0, changed_lines=3),
    ]
    stats = {"total_files": 2, "total_changed_lines": 13, "max_file_changed_lines": 10, "high_risk_files": []}
    assert stats["total_files"] == 2
    assert stats["file_count_anomaly"] is False
```

**Step 3: 写实现**

```python
# src/analyzer.py
import json
import httpx
from src.models import FileDiff, AnalysisResult
from src.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, FEW_SHOT_EXAMPLES
from src.diff_parser import DiffParser


def build_stats_text(stats: dict) -> str:
    return (
        f"- 总文件数: {stats['total_files']}\n"
        f"- 总改动行数: {stats['total_changed_lines']} (+{stats['total_additions']} -{stats['total_deletions']})\n"
        f"- 单文件最大改动: {stats['max_file_changed_lines']} 行\n"
        f"- 高风险路径文件: {', '.join(stats['high_risk_files']) or '无'}\n"
        f"- 文件数异常: {'是' if stats.get('file_count_anomaly') else '否'}\n"
        f"- 行数膨胀: {'是' if stats.get('line_bloat') else '否'}"
    )


def build_llm_payload(title: str, body: str, files: list[FileDiff], stats: dict) -> dict:
    """Build messages for OpenAI-compatible API."""
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

    return {
        "model": "your_model_id",  # overridden at call time
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.1,
        "max_tokens": 2048,
        "response_format": {"type": "json_object"},
    }


class LLMAnalyzer:
    """LLM-based PR risk analyzer using Volcano Engine (OpenAI-compatible)."""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        timeout: float = 60.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=self.timeout,
            )
        return self._client

    async def analyze(self, title: str, body: str, files: list[FileDiff], stats: dict) -> AnalysisResult:
        """Call LLM and parse structured response."""
        payload = build_llm_payload(title, body, files, stats)
        payload["model"] = self.model

        client = await self._get_client()
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
        except (json.JSONDecodeError, KeyError) as e:
            # Fallback on parse error
            return AnalysisResult(
                minimal_edit_score=50,
                over_edit_flags=[{"flag": "parse_error", "detail": f"LLM 输出解析失败: {e}"}],
                risk_summary="LLM 返回格式异常，请人工复核",
                suggested_action="请人工审查本次 PR 改动范围",
            )

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
```

---

### Task 4: Webhook 处理器 + 评论回帖

**Files:**
- Create: `src/webhook.py`
- Create: `src/commenter.py`
- Create: `tests/test_webhook.py`

**Step 1: 写测试**

```python
# tests/test_webhook.py
import pytest
import hmac
import hashlib
import json
from fastapi.testclient import TestClient
from src.main import app

def make_signature(payload: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


def test_webhook_rejects_invalid_signature():
    client = TestClient(app)
    payload = json.dumps({"action": "opened", "pull_request": {"number": 1, "title": "test", "body": ""}, "repository": {"full_name": "a/b"}, "sender": {}}).encode()
    response = client.post("/webhook/pr", content=payload, headers={"X-Hub-Signature-256": "sha256=invalid", "X-GitHub-Event": "pull_request", "Content-Type": "application/json"})
    assert response.status_code == 401


def test_webhook_accepts_valid_signature():
    secret = "test_secret"
    payload_dict = {"action": "opened", "pull_request": {"number": 1, "title": "test", "body": "", "diff_url": ""}, "repository": {"full_name": "a/b"}, "sender": {}}
    payload = json.dumps(payload_dict).encode()
    sig = make_signature(payload, secret)

    with TestClient(app) as client:
        # This will fail at GitHub API call level but passes signature check
        response = client.post("/webhook/pr", content=payload, headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "pull_request", "Content-Type": "application/json"})
        # We expect 200 (accepted) even if downstream fails
        assert response.status_code in (200, 500)
```

**Step 2: 写 GitHub 评论器**

```python
# src/commenter.py
import httpx
from src.models import AnalysisResult


def build_comment_body(result: AnalysisResult) -> str:
    score = result.minimal_edit_score
    if score >= 80:
        level = "🟢 低风险"
    elif score >= 50:
        level = "🟡 中等风险"
    else:
        level = "🔴 高风险"

    flags_md = ""
    if result.over_edit_flags:
        flags_md = "\n".join(f"- ⚠️ **{f.flag}**: {f.detail}" for f in result.over_edit_flags)
    else:
        flags_md = "- ✅ 无明显风险标志"

    keep_md = ", ".join(f"`{f}`" for f in result.suggested_scope.keep) if result.suggested_scope.keep else "—"
    revert_md = ", ".join(f"`{f}`" for f in result.suggested_scope.revert) if result.suggested_scope.revert else "—"

    return f"""## DiffFence 风险摘要

| 指标 | 值 |
|------|----|
| 最小改动评分 | **{score}/100** |
| 风险等级 | {level} |

**风险标志：**
{flags_md}

**建议操作：**
- 🔴 建议回退：{revert_md}
- 🟢 建议保留：{keep_md}

---
*DiffFence v0.1 | 由 AI 自动生成 · [反馈](https://diffgate.dev/feedback)*"""


class GitHubCommenter:
    """Post comments to GitHub PRs via API."""

    def __init__(self, token: str):
        self.token = token
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url="https://api.github.com",
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                timeout=30.0,
            )
        return self._client

    async def post_comment(self, repo: str, pr_number: int, body: str) -> bool:
        """Post a comment to a GitHub PR. Returns True on success."""
        client = await self._get_client()
        try:
            response = await client.post(
                f"/repos/{repo}/issues/{pr_number}/comments",
                json={"body": body},
            )
            return response.status_code in (200, 201)
        except Exception:
            return False

    async def get_pr_files(self, repo: str, pr_number: int) -> list[dict]:
        """Fetch the list of changed files for a PR."""
        client = await self._get_client()
        try:
            response = await client.get(f"/repos/{repo}/pulls/{pr_number}/files", params={"per_page": 100})
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
        return []

    async def get_pr_diff(self, repo: str, pr_number: int) -> str:
        """Fetch the full diff of a PR."""
        client = await self._get_client()
        try:
            response = await client.get(f"/repos/{repo}/pulls/{pr_number}", params={"Accept": "application/vnd.github.v3.diff"})
            if response.status_code == 200:
                return response.text
        except Exception:
            pass
        return ""

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
```

**Step 3: 写 Webhook 处理器**

```python
# src/webhook.py
import hmac
import hashlib
import logging
from fastapi import HTTPException, Request, Response
from src.models import PRPayload
from src.diff_parser import DiffParser
from src.analyzer import LLMAnalyzer
from src.commenter import GitHubCommenter, build_comment_body

logger = logging.getLogger(__name__)


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature."""
    if not signature.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


async def handle_pr_webhook(
    request: Request,
    analyzer: LLMAnalyzer,
    commenter: GitHubCommenter,
    webhook_secret: str,
) -> dict:
    """Main webhook handler for pull_request events."""
    body = await request.body()
    event = request.headers.get("X-GitHub-Event", "")
    delivery_id = request.headers.get("X-GitHub-Delivery", "")

    logger.info(f"Webhook received: event={event} delivery={delivery_id}")

    # Verify signature
    sig = request.headers.get("X-Hub-Signature-256", "")
    if webhook_secret and not verify_github_signature(body, sig, webhook_secret):
        logger.warning(f"Invalid signature for delivery {delivery_id}")
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Only process pull_request events
    if event != "pull_request":
        return {"status": "ignored", "reason": f"event={event}"}

    payload = PRPayload(**request.json())

    # Only process opened and synchronize events
    if payload.action not in ("opened", "synchronize"):
        return {"status": "ignored", "reason": f"action={payload.action}"}

    try:
        # Fetch diff
        diff_text = await commenter.get_pr_diff(payload.repo_full_name, payload.pr_number)
        if not diff_text:
            logger.error(f"Failed to fetch diff for {payload.repo_full_name}#{payload.pr_number}")
            return {"status": "error", "reason": "Failed to fetch diff"}

        # Parse diff
        parser = DiffParser()
        files = parser.parse(diff_text)
        stats = parser.compute_stats(files)

        if not files:
            return {"status": "ignored", "reason": "empty diff"}

        # Analyze with LLM
        result = await analyzer.analyze(
            title=payload.title,
            body=payload.body,
            files=files,
            stats=stats,
        )

        # Post comment
        comment_body = build_comment_body(result)
        success = await commenter.post_comment(payload.repo_full_name, payload.pr_number, comment_body)

        logger.info(
            f"PR {payload.repo_full_name}#{payload.pr_number} analyzed: "
            f"score={result.minimal_edit_score} flags={len(result.over_edit_flags)} "
            f"comment_posted={success}"
        )

        return {
            "status": "ok",
            "score": result.minimal_edit_score,
            "flags": len(result.over_edit_flags),
            "comment_posted": success,
        }

    except Exception as e:
        logger.exception(f"Error processing webhook {delivery_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

### Task 5: FastAPI 主入口

**Files:**
- Create: `src/main.py`
- Create: `src/config.py`

**Step 1: 写配置加载**

```python
# src/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # GitHub
    github_webhook_secret: str = ""
    github_token: str = ""

    # Volcano Engine LLM
    volcano_base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    volcano_api_key: str = ""
    volcano_model: str = ""

    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"

    # Storage
    db_path: str = "./data/diffgate.db"


settings = Settings()
```

**Step 2: 写 FastAPI 主入口**

```python
# src/main.py
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from src.config import settings
from src.webhook import handle_pr_webhook
from src.analyzer import LLMAnalyzer
from src.commenter import GitHubCommenter

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

# Global clients (initialized on startup)
_analyzer: LLMAnalyzer | None = None
_commenter: GitHubCommenter | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _analyzer, _commenter
    _analyzer = LLMAnalyzer(
        base_url=settings.volcano_base_url,
        api_key=settings.volcano_api_key,
        model=settings.volcano_model,
    )
    _commenter = GitHubCommenter(token=settings.github_token)
    logger.info("DiffGate started")
    yield
    await (_analyzer.close() if _analyzer else None)
    await (_commenter.close() if _commenter else None)
    logger.info("DiffGate stopped")


app = FastAPI(
    title="DiffGate",
    description="GitHub PR Risk Analysis Webhook Service",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/webhook/pr")
async def webhook_pr(request: Request):
    global _analyzer, _commenter
    if _analyzer is None or _commenter is None:
        return JSONResponse({"status": "error", "reason": "not initialized"}, status_code=503)

    result = await handle_pr_webhook(
        request=request,
        analyzer=_analyzer,
        commenter=_commenter,
        webhook_secret=settings.github_webhook_secret,
    )
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host=settings.app_host, port=settings.app_port, reload=True)
```

---

### Task 6: CLI 离线回放工具

**Files:**
- Create: `src/cli.py`
- Create: `tests/test_cli.py`

**Step 1: 写 CLI**

```python
# src/cli.py
import typer
import asyncio
import json
import csv
from pathlib import Path
from typing import Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
from src.config import settings
from src.analyzer import LLMAnalyzer
from src.commenter import GitHubCommenter
from src.diff_parser import DiffParser
from src.models import FileDiff, AnalysisResult

cli = typer.Typer(name="diffgate", help="DiffGate CLI — PR risk analysis offline replay")
console = Console()


@cli.command()
def replay(
    repo: str = typer.Option(..., "--repo", help="owner/repo format, e.g. psf/requests"),
    token: Optional[str] = typer.Option(None, "--token", help="GitHub token (or set GITHUB_TOKEN env)"),
    n: int = typer.Option(30, "--n", help="Number of recent PRs to replay"),
    output: Optional[str] = typer.Option(None, "--output", help="Output JSON file"),
    min_score: int = typer.Option(50, "--min-score", help="Score threshold for flagging"),
):
    """Replay recent PRs from a public repository and report risk analysis."""
    github_token = token or settings.github_token
    if not github_token:
        console.print("[red]Error: GITHUB_TOKEN not set[/red]")
        raise typer.Exit(1)

    results = asyncio.run(_replay_async(repo, n, github_token, min_score))
    _print_replay_report(results, repo, n)

    if output:
        Path(output).write_text(json.dumps(results, ensure_ascii=False, indent=2))
        console.print(f"\n[green]Results saved to {output}[/green]")


async def _replay_async(repo: str, n: int, token: str, min_score: int) -> list[dict]:
    commenter = GitHubCommenter(token=token)
    analyzer = LLMAnalyzer(
        base_url=settings.volcano_base_url,
        api_key=settings.volcano_api_key,
        model=settings.volcano_model,
    )

    try:
        client = await commenter._get_client()
        response = await client.get(
            f"/repos/{repo}/pulls",
            params={"state": "closed", "sort": "updated", "direction": "desc", "per_page": min(n, 100)},
        )
        prs = response.json()[:n]
    finally:
        await commenter.close()
        await analyzer.close()

    results = []
    for pr in prs:
        pr_num = pr["number"]
        title = pr.get("title", "")
        body = pr.get("body", "") or ""

        diff_text = await commenter.get_pr_diff(repo, pr_num)
        parser = DiffParser()
        files = parser.parse(diff_text)
        stats = parser.compute_stats(files)

        if not files:
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
        console.print(f"  PR #{pr_num}: score={result.minimal_edit_score} {'[red]FLAGGED[/red]' if flagged else '[green]OK[/green]'}")

    return results


def _print_replay_report(results: list[dict], repo: str, n: int):
    total = len(results)
    flagged = sum(1 for r in results if r["flagged"])
    avg_score = sum(r["score"] for r in results) / total if total else 0

    table = Table(title=f"DiffGate Replay — {repo}")
    table.add_column("PR", style="cyan")
    table.add_column("Score", style="magenta")
    table.add_column("Flags", style="yellow")
    table.add_column("Files", style="green")

    for r in results[:20]:
        flag_str = ", ".join(f["flag"] for f in r["flags"]) if r["flags"] else "—"
        table.add_row(f"#{r['pr_number']}", str(r["score"]), flag_str, str(r["files_changed"]))

    console.print(Panel(f"[bold]Repo:[/bold] {repo}\n[bold]PR range:[/bold] #{results[0]['pr_number']} ~ #{results[-1]['pr_number']}\n[bold]Total:[/bold] {total} PRs\n[bold]Flagged (score<50):[/bold] {flagged} ({100*flagged/total:.1f}%)\n[bold]Avg score:[/bold] {avg_score:.1f}", title="Summary"))
    console.print(table)

    if total > 20:
        console.print(f"[dim]... and {total - 20} more PRs[/dim]")


@cli.command()
def serve(
    host: str = typer.Option("0.0.0.0", "--host"),
    port: int = typer.Option(8000, "--port"),
):
    """Start the DiffGate FastAPI server."""
    import uvicorn
    uvicorn.run("src.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    cli()
```

---

### Task 7: Docker 部署文件

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

**Step 1: Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml ./
RUN pip install --no-cache-dir -e .

RUN mkdir -p /app/data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: docker-compose.yml**

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
```

---

### Task 8: 单元测试 + 验证

**Files:**
- All test files already created above

**Step 1: 运行测试**

```bash
cd /Users/dysania/program/best\ 2-hour\ build
pip install -e ".[dev]"
pytest tests/ -v
```

**Step 2: 验证 Webhook 端点**

```bash
# 启动服务
python -m src.cli serve &

# 测试 health 端点
curl http://localhost:8000/health

# 测试 Webhook（需设置 .env）
curl -X POST http://localhost:8000/webhook/pr \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=test" \
  -H "X-GitHub-Event: pull_request" \
  -d '{"action":"opened","pull_request":{"number":1,"title":"test","body":"","diff_url":""},"repository":{"full_name":"a/b"},"sender":{}}'
```

---

## 阶段二：GitHub Webhook 注册 + 离线回放验证

### Task 9: GitHub Webhook 注册脚本

**Files:**
- Create: `scripts/register_webhook.py`

注册 Webhook 需要手动在 GitHub 仓库 Settings > Webhooks 页面配置，或用 API 创建。

URL 格式：`https://your-domain.com/webhook/pr`

---

## 阶段三：3 个公开仓库离线回放

### Task 10: 运行回放并生成报告

**Command:**

```bash
# 设置 GITHUB_TOKEN 后运行
export GITHUB_TOKEN=ghp_xxxxx
python -m src.cli replay --repo psf/requests --n 30 --output examples/replay_requests.json
python -m src.cli replay --repo pallets/flask --n 30 --output examples/replay_flask.json
python -m src.cli replay --repo numpy/numpy --n 30 --output examples/replay_numpy.json
```

**验证指标：**
- 命中率 = TP / (TP + FN)
- 误报率 = FP / (FP + TN)
- per-PR LLM 成本（根据火山云计费）

---

## 执行顺序总结

```
阶段一（骨架）  Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
阶段二（注册）  Task 9
阶段三（验证）  Task 10
```

每个 Task 独立可测试，建议顺序执行，每完成一个 Task 跑对应测试。
