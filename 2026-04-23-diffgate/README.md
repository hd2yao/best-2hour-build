# DiffGate

GitHub PR 风险审查 Webhook 服务。目标是接收 GitHub PR Webhook，异步分析 diff 与任务范围，调用 LLM 输出风险摘要，并自动回帖到 PR。

## 当前状态
- 状态：计划与 review 整理完成，尚未开始代码实现。
- 最终实现计划：[PLAN.md](PLAN.md)
- Review 入口：[REVIEW.md](REVIEW.md)
- 详细设计：[docs/plans/2026-04-23-diffgate-pr-webhook-design.md](docs/plans/2026-04-23-diffgate-pr-webhook-design.md)

## MVP 范围
- FastAPI Webhook 服务，收到 PR 事件后快速返回 `202 Accepted`。
- 后台任务拉取 PR diff，解析改动范围，并调用 Volcano Engine OpenAI-compatible API 分析风险。
- 使用 GitHub API 幂等创建或更新 PR 评论。
- 提供 CLI 离线回放能力，用于本地验证 diff 分析与报告输出。

## 非目标
- 不做 SQLite 或历史均值统计。
- 不接入额外 analytics、telemetry 或无关网络调用。
- 不在父目录安装依赖或生成构建产物。

## 运行方式
代码尚未实现，因此暂无可运行命令。实现开始后，应在本子目录内补充安装、测试、Docker 和本地回放命令。

## 最近整理
- 将原父目录 `docs/plans` 下的 DiffGate 计划与 review 文档迁移到本项目目录。
- 补齐项目入口文件 `README.md`、`PLAN.md`、`REVIEW.md`。
