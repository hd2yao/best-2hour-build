# DiffGate Review

## Review 入口
完整 review 记录保存在：

- [docs/plans/reviews/simple-review.codex.md](docs/plans/reviews/simple-review.codex.md)

## 当前结论
- 早期计划经过多轮 review，曾包含 webhook 同步阻塞、签名校验、diff header、测试注入、Docker 打包等阻塞问题。
- 最终入口应使用 v5 实现计划：[docs/plans/2026-04-23-diffgate-implementation-plan-v5.md](docs/plans/2026-04-23-diffgate-implementation-plan-v5.md)
- v1-v4 已移入 [docs/plans/archive/](docs/plans/archive/)；它们仅用于追踪历史，不作为实现依据。

## 后续 review 要求
- 每个独立代码变更后运行最快相关验证命令。
- 对实现 diff 做 focused code review。
- 若本项目初始化为 git 仓库，按父级 `AGENTS.md` 要求提交、推送并走 PR/merge 流程。
