# DiffGate Plan

## 当前有效计划
最终实现计划是：

- [docs/plans/2026-04-23-diffgate-implementation-plan-v5.md](docs/plans/2026-04-23-diffgate-implementation-plan-v5.md)

该版本已吸收前几轮 review 的阻塞项修复，作为后续实现入口。

## 关联设计
- [docs/plans/2026-04-23-diffgate-pr-webhook-design.md](docs/plans/2026-04-23-diffgate-pr-webhook-design.md)

## 历史版本
以下文件已归档，仅用于追踪计划演进，不应作为实现入口：

- [docs/plans/archive/2026-04-23-diffgate-implementation-plan.md](docs/plans/archive/2026-04-23-diffgate-implementation-plan.md)
- [docs/plans/archive/2026-04-23-diffgate-implementation-plan-v2.md](docs/plans/archive/2026-04-23-diffgate-implementation-plan-v2.md)
- [docs/plans/archive/2026-04-23-diffgate-implementation-plan-v3.md](docs/plans/archive/2026-04-23-diffgate-implementation-plan-v3.md)
- [docs/plans/archive/2026-04-23-diffgate-implementation-plan-v4.md](docs/plans/archive/2026-04-23-diffgate-implementation-plan-v4.md)

## 执行边界
- 所有代码、依赖、测试、Docker 配置和后续文档都应保留在本目录内。
- 不要在父目录安装依赖、创建 lockfile 或生成构建产物。
- 实现前应重新读取 v5 计划，确认任务顺序、验证命令和 secrets 处理方式。
