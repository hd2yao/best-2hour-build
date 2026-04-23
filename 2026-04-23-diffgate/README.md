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
