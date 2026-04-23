import inspect

from diffgate.commenter import DIFFGATE_MARKER, GitHubCommenter, build_comment_body
from diffgate.models import AnalysisResult


def test_comment_has_idempotency_marker():
    body = build_comment_body(AnalysisResult(minimal_edit_score=75), 42)
    assert DIFFGATE_MARKER.format(pr_number=42) in body


def test_comment_no_external_links():
    assert "diffgate.dev" not in build_comment_body(AnalysisResult(minimal_edit_score=75), 1)


def test_comment_risk_levels():
    assert "🟢" in build_comment_body(AnalysisResult(minimal_edit_score=90), 1)
    assert "🟡" in build_comment_body(AnalysisResult(minimal_edit_score=55), 1)
    assert "🔴" in build_comment_body(AnalysisResult(minimal_edit_score=30), 1)


def test_commenter_has_close():
    assert inspect.iscoroutinefunction(GitHubCommenter("x").close)
