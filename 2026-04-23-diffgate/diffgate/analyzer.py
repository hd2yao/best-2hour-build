import json

import httpx

from diffgate.diff_parser import DiffParser
from diffgate.models import AnalysisResult, FileDiff
from diffgate.prompts import FEW_SHOT_EXAMPLES, SYSTEM_PROMPT, USER_PROMPT_TEMPLATE


def build_stats_text(stats: dict) -> str:
    high_risk_files = stats.get("high_risk_files", [])
    return (
        f"- 总文件数: {stats['total_files']}\n"
        f"- 总改动行数: {stats['total_changed_lines']} "
        f"(+{stats['total_additions']} -{stats['total_deletions']})\n"
        f"- 单文件最大改动: {stats['max_file_changed_lines']} 行\n"
        f"- 高风险路径文件: {', '.join(high_risk_files) if high_risk_files else '无'}\n"
        f"- 文件数异常: {'是' if stats.get('file_count_anomaly') else '否'}\n"
        f"- 行数膨胀: {'是' if stats.get('line_bloat') else '否'}"
    )


def build_llm_messages(
    title: str,
    body: str,
    files: list[FileDiff],
    stats: dict,
) -> list[dict]:
    parser = DiffParser()
    diff_context = parser.build_llm_context(files)
    user_prompt = USER_PROMPT_TEMPLATE.substitute(
        title=title,
        body=body or "（无描述）",
        stats=build_stats_text(stats),
        diff_context=diff_context,
    )
    user_prompt += "\n\n" + FEW_SHOT_EXAMPLES
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


class LLMAnalyzer:
    """Each analyze() call creates its own local httpx.AsyncClient (no shared state)."""

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

    async def analyze(
        self,
        title: str,
        body: str,
        files: list[FileDiff],
        stats: dict,
    ) -> AnalysisResult:
        messages = build_llm_messages(title, body, files, stats)
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
            "max_tokens": 2048,
        }

        async with httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=self.timeout,
        ) as client:
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
        except (json.JSONDecodeError, KeyError, IndexError) as error:
            return AnalysisResult(
                minimal_edit_score=50,
                over_edit_flags=[{"flag": "parse_error", "detail": f"LLM 输出解析失败: {error}"}],
                risk_summary="LLM 返回格式异常，请人工复核",
                suggested_action="请人工审查本次 PR 改动范围",
            )

    async def close(self) -> None:
        """No-op since we use per-call clients."""
        pass
