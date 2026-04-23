# DiffGate — GitHub PR 风险审查 Webhook 服务

**版本：** v4 实现版
**日期：** 2026-04-23

---

## 1. 产品定位

**一句话：** 一个 GitHub PR Webhook 服务，用 LLM 分析 diff + 任务描述，输出改动风险评分和建议，自动回帖 PR 评论。

**核心价值链：**
```
PR 打开 → Webhook 触发 → DiffGate 分析 → 回帖风险摘要 → 开发者决策参考
```

**MVP 边界：**
- 语言：只服务 Python 仓库
- 触发：只做 PR review 评论
- LLM：火山引擎 API（OpenAI-compatible 接口）
- 部署：Docker 容器
- 回放：CLI 脚本离线验证
- 无 SQLite、无历史均值统计，评分用规则阈值

---

## 2. 系统架构

```
GitHub Webhook (PR opened/synchronize)
         │
         ▼ POST /webhook/pr   HTTP 202
┌─────────────────────────────────────┐
│          FastAPI Server             │
│  1. 验签（HMAC-SHA256）            │
│  2. 解析 PR payload                │
│  3. asyncio.create_task 后台执行    │
│     - 取 diff（Accept: vnd.github.diff）│
│     - diff 解析（unified diff）     │
│     - LLM 分析（火山引擎 API）       │
│     - 回帖（幂等：<!-- diffgate:N -->）
└─────────────────────────────────────┘
         │
         ▼ HTTP 200
GitHub PR 评论：风险摘要 + 建议操作
```

### 模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| `webhook` | `diffgate/webhook.py` | HMAC 验签、事件路由、后台任务调度 |
| `diff_parser` | `diffgate/diff_parser.py` | 解析 unified diff，只统计 +/- 行 |
| `llm_analyzer` | `diffgate/analyzer.py` | 火山引擎 LLM 调用，每调用独立 httpx client |
| `commenter` | `diffgate/commenter.py` | GitHub API 回帖，幂等更新 |
| `models` | `diffgate/models.py` | Pydantic 数据模型 |
| `cli` | `diffgate/cli.py` | 离线回放 + 报告生成 |

---

## 3. 输出结构（评分引擎）

```json
{
  "minimal_edit_score": 73,
  "over_edit_flags": [
    {"flag": "file_count_anomaly", "detail": "改动 12 个文件，其中 7 个与 issue 无关"},
    {"flag": "irrelevant_module", "detail": "utils/logger.py 疑似级联改动"},
    {"flag": "line_bloat", "detail": "单文件改动 487 行，超阈值 200 行"}
  ],
  "suggested_scope": {
    "keep": ["src/api/handlers.py", "tests/test_handler.py"],
    "revert": ["utils/logger.py", "config/db.yaml"]
  },
  "risk_summary": "本次改动 scope 偏大，建议拆分或提供充分理由",
  "suggested_action": "建议将 utils/logger.py 和 config/db.yaml 回退至单独 PR"
}
```

### 评分维度（规则阈值，无历史均值）

| 维度 | 检测方式 | 权重 |
|------|----------|------|
| 文件数异常 | 改动文件数 > 10 个 | 25% |
| 无关模块改动 | LLM 判定文件是否与 issue 相关 | 30% |
| 行数膨胀 | 单文件 > 200 行，或总 diff > 1000 行 | 25% |
| 路径风险 | 改动涉及 config/、.github/、scripts/ 等高风险目录 | 20% |

---

## 4. HTTP 契约

| 端点 | 方法 | status_code | 说明 |
|------|------|-------------|------|
| `/webhook/pr` | POST | 202 | PR accepted，后台处理中 |
| `/webhook/pr` | POST | 200 | 事件被忽略（non-PR 或非 opened/synchronize） |
| `/webhook/pr` | POST | 401 | 签名无效 |
| `/webhook/pr` | POST | 503 | webhook secret 未配置 |
| `/health` | GET | 200 | 健康检查 |

---

## 5. PR 评论格式

```markdown
<!-- diffgate:123 -->

## DiffGate 风险摘要

| 指标 | 值 |
|------|----|
| 最小改动评分 | **73/100** |
| 风险等级 | 🟡 中等 |

**风险标志：**
- ⚠️ **file_count_anomaly**: 改动 12 个文件，其中 7 个与 issue 关联度低
- ⚠️ **line_bloat**: 单文件最大改动 487 行（建议 ≤ 200 行）

**建议操作：**
- 🔴 建议回退：`utils/logger.py`、`config/db.yaml`
- 🟢 建议保留：`src/api/handlers.py`、`tests/test_handler.py`
```

幂等标记：`<!-- diffgate:{pr_number} -->` 存在于 PR 评论中时，更新而非创建。

---

## 6. 技术选型

| 层 | 技术选型 | 理由 |
|----|----------|------|
| 后端框架 | FastAPI | 异步、高性能、自动 OpenAPI |
| 部署 | Docker | 多仓库兼容性好 |
| LLM | Volcano Engine（OpenAI-compatible） | 用户指定 |
| CLI | Typer + Rich | 美观输出 |
| GitHub API | httpx（直接调用） | 轻量，无额外依赖 |
| 配置 | Pydantic Settings | 环境变量优先 |

---

## 7. 目录结构

```
diffgate/
├── __init__.py
├── main.py           # FastAPI 入口
├── config.py         # Pydantic Settings
├── models.py         # 数据模型
├── diff_parser.py    # Diff 解析器
├── prompts.py        # LLM 提示词
├── analyzer.py       # LLM 分析引擎
├── commenter.py      # GitHub 评论器
├── webhook.py        # Webhook 处理器
└── cli.py           # CLI 回放工具
tests/
.env.example
pyproject.toml
Dockerfile
docker-compose.yml
README.md
```

---

## 8. 环境变量

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

---

## 9. 验证计划

### 离线回放（3 个公开仓库）
- `psf/requests` — Python HTTP 库
- `pallets/flask` — Python Web 框架
- `numpy/numpy` — 大型科学计算库

### 指标
- score 分布：高风险（<50）/ 中等（50-79）/ 低风险（≥80）
- 高风险 PR 占比
- per-PR LLM 成本估算

### 对比报告格式

```
========== DiffGate Replay Report ==========
Repo:        psf/requests
Total:       30 PRs
Flagged:     9 (30.0%)
Avg score:   71.3
Avg cost/PR: $0.012
==========================================
```
