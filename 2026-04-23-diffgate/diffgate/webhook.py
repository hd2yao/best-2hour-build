import asyncio
import hashlib
import hmac
import json
import logging

from fastapi import HTTPException, Request

from diffgate.analyzer import LLMAnalyzer
from diffgate.commenter import DIFFGATE_MARKER, GitHubCommenter, build_comment_body
from diffgate.diff_parser import DiffParser
from diffgate.models import PRPayload

logger = logging.getLogger(__name__)


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    if not signature.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature[len("sha256=") :])


async def handle_pr_webhook(
    request: Request,
    analyzer: LLMAnalyzer,
    commenter: GitHubCommenter,
    webhook_secret: str,
) -> dict:
    body = await request.body()
    event = request.headers.get("X-GitHub-Event", "")
    delivery_id = request.headers.get("X-GitHub-Delivery", "")
    logger.info("Webhook received: event=%s delivery=%s", event, delivery_id)

    signature = request.headers.get("X-Hub-Signature-256", "")
    if webhook_secret:
        # Reject known placeholders that should never be used as real production secrets.
        placeholder_secrets = {
            "your_webhook_secret_here",
            "ghp_xxxxx",
            "your_volcano_api_key",
            "your_model_id",
            "",
        }
        if webhook_secret in placeholder_secrets:
            raise HTTPException(status_code=503, detail="Webhook secret is a placeholder value")
        if not signature or not verify_github_signature(body, signature, webhook_secret):
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


async def _process_pr_background(
    payload: PRPayload,
    analyzer: LLMAnalyzer,
    commenter: GitHubCommenter,
    delivery_id: str,
) -> None:
    try:
        diff_text = await commenter.get_pr_diff(payload.repo_full_name, payload.pr_number)
        if not diff_text:
            logger.error(
                "Failed to fetch diff for %s#%s",
                payload.repo_full_name,
                payload.pr_number,
            )
            return

        parser = DiffParser()
        files = parser.parse(diff_text)
        stats = parser.compute_stats(files)
        if not files:
            return

        result = await analyzer.analyze(payload.title, payload.body, files, stats)
        marker = DIFFGATE_MARKER.format(pr_number=payload.pr_number)
        existing_url = await commenter.get_existing_comment(
            payload.repo_full_name,
            payload.pr_number,
            marker,
        )
        comment_body = build_comment_body(result, payload.pr_number)

        if existing_url:
            success = await commenter.update_comment(existing_url, comment_body)
        else:
            success = await commenter.post_comment(
                payload.repo_full_name,
                payload.pr_number,
                comment_body,
            )
        logger.info(
            "PR %s#%s analyzed: score=%s posted=%s",
            payload.repo_full_name,
            payload.pr_number,
            result.minimal_edit_score,
            success,
        )
    except Exception as error:
        logger.exception("Background task failed for delivery %s: %s", delivery_id, error)
