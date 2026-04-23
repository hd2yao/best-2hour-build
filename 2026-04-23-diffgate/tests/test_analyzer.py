import inspect

from diffgate.analyzer import LLMAnalyzer, build_llm_messages
from diffgate.diff_parser import DiffParser
from diffgate.models import FileDiff


def test_build_llm_messages():
    files = [FileDiff(filename="src/api.py", status="modified", additions=5, deletions=2, patch="+a\n+b")]
    stats = DiffParser().compute_stats(files)
    messages = build_llm_messages("fix login", "users can't login", files, stats)
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "fix login" in messages[1]["content"]


def test_analyzer_has_close():
    analyzer = LLMAnalyzer("http://x", "k", "m")
    assert inspect.iscoroutinefunction(analyzer.close)
