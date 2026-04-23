from diffgate.models import AnalysisResult, FileDiff, PRPayload


def test_file_diff_high_risk():
    assert FileDiff(filename="config/settings.py", status="modified").is_high_risk_path is True
    assert FileDiff(filename="src/main.py", status="modified").is_high_risk_path is False


def test_pr_payload_properties():
    payload = PRPayload(
        action="opened",
        pull_request={"number": 42, "title": "fix", "body": "x"},
        repository={"full_name": "a/b"},
        sender={},
    )
    assert payload.pr_number == 42
    assert payload.repo_full_name == "a/b"


def test_analysis_result_defaults():
    result = AnalysisResult(minimal_edit_score=75)
    assert result.over_edit_flags == []
    assert result.risk_summary == ""
