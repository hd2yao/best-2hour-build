import httpx

from diffgate.models import AnalysisResult

DIFFGATE_MARKER = "<!-- diffgate:{pr_number} -->"


def build_comment_body(result: AnalysisResult, pr_number: int) -> str:
    score = result.minimal_edit_score
    risk_level = "🟢 低风险" if score >= 80 else ("🟡 中等风险" if score >= 50 else "🔴 高风险")

    if result.over_edit_flags:
        flags_markdown = "\n".join(
            f"- ⚠️ **{item.flag}**: {item.detail}" for item in result.over_edit_flags
        )
    else:
        flags_markdown = "- ✅ 无明显风险标志"

    keep_markdown = (
        ", ".join(f"`{item}`" for item in result.suggested_scope.keep)
        if result.suggested_scope.keep
        else "—"
    )
    revert_markdown = (
        ", ".join(f"`{item}`" for item in result.suggested_scope.revert)
        if result.suggested_scope.revert
        else "—"
    )

    return (
        f"{DIFFGATE_MARKER.format(pr_number=pr_number)}\n\n"
        "## DiffGate 风险摘要\n\n"
        "| 指标 | 值 |\n"
        "|------|----|\n"
        f"| 最小改动评分 | **{score}/100** |\n"
        f"| 风险等级 | {risk_level} |\n\n"
        f"**风险标志：**\n{flags_markdown}\n\n"
        f"**建议操作：**\n- 🔴 建议回退：{revert_markdown}\n- 🟢 建议保留：{keep_markdown}\n"
    )


class GitHubCommenter:
    def __init__(self, token: str):
        self.token = token

    async def _get_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url="https://api.github.com",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=30.0,
        )

    async def get_pr_diff(self, repo: str, pr_number: int) -> str:
        async with await self._get_client() as client:
            response = await client.get(
                f"/repos/{repo}/pulls/{pr_number}",
                headers={"Accept": "application/vnd.github.diff"},
            )
            return response.text if response.status_code == 200 else ""

    async def get_existing_comment(self, repo: str, pr_number: int, marker: str) -> str | None:
        async with await self._get_client() as client:
            response = await client.get(f"/repos/{repo}/issues/{pr_number}/comments")
            if response.status_code == 200:
                for comment in response.json():
                    if marker in comment.get("body", ""):
                        return comment["url"]
        return None

    async def post_comment(self, repo: str, pr_number: int, body: str) -> bool:
        async with await self._get_client() as client:
            response = await client.post(
                f"/repos/{repo}/issues/{pr_number}/comments",
                json={"body": body},
            )
            return response.status_code in (200, 201)

    async def update_comment(self, comment_url: str, body: str) -> bool:
        async with await self._get_client() as client:
            response = await client.patch(comment_url, json={"body": body})
            return response.status_code == 200

    async def close(self) -> None:
        """No-op since we use per-call clients."""
        pass
