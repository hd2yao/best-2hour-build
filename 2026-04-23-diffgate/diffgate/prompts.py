from string import Template

SYSTEM_PROMPT = """你是一个代码改动评审助手，擅长评估 PR 改动的"最小化程度"和风险。

评分标准（minimal_edit_score，0-100）：
- 90-100：严格最小改动，只改核心文件，与 issue 完全对应
- 70-89：合理改动，有少量辅助改动但整体聚焦
- 50-69：scope 偏大，存在一定范围蔓延
- 20-49：scope 过大，大量无关改动或级联修改
- 0-19：极度膨胀，几乎无法接受

风险标志（over_edit_flags）：
- file_count_anomaly：文件数异常（> 10 个文件）
- irrelevant_module：存在与 issue 无关的模块改动
- line_bloat：单文件改动 > 200 行，或总 diff > 1000 行
- path_risk：涉及高风险路径（config/、.github/、scripts/、Dockerfile 等）

你必须输出严格的 JSON，不要输出任何其他内容。"""

USER_PROMPT_TEMPLATE = Template(
    """## Issue 信息
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
"""
)

FEW_SHOT_EXAMPLES = """
示例1（高分）：score: 95, flags: [], keep: ["auth.py"] revert: []
示例2（中分）：score: 75, flags: [], keep: ["models.py", "api.py"] revert: []
示例3（低分）：score: 25, flags: ["file_count_anomaly", "irrelevant_module"], keep: ["README.md"] revert: ["utils/logger.py", "config/db.yaml"]
"""
