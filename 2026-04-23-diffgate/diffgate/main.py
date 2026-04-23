import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from diffgate.analyzer import LLMAnalyzer
from diffgate.commenter import GitHubCommenter
from diffgate.config import settings
from diffgate.webhook import handle_pr_webhook

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


app = FastAPI(title="DiffGate", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/webhook/pr", status_code=202)
async def webhook_pr(
    request: Request,
    analyzer: LLMAnalyzer = Depends(get_analyzer),
    commenter: GitHubCommenter = Depends(get_commenter),
):
    try:
        result = await handle_pr_webhook(request, analyzer, commenter, settings.github_webhook_secret)
    except HTTPException:
        raise

    if result.get("status") == "ignored":
        return JSONResponse(result, status_code=200)
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("diffgate.main:app", host=settings.app_host, port=settings.app_port, reload=True)
