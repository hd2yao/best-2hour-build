from io import StringIO

from rich.console import Console

from diffgate.cli import print_replay_report


def test_empty_results():
    console = Console(file=StringIO(), force_terminal=True)
    print_replay_report([], "owner/repo", 0, console=console)
    assert "No results" in console.file.getvalue()


def test_shows_stats():
    results = [
        {"pr_number": 100, "score": 90, "flagged": False, "flags": [], "files_changed": 2},
        {
            "pr_number": 99,
            "score": 40,
            "flagged": True,
            "flags": [{"flag": "file_count_anomaly", "detail": "12 files"}],
            "files_changed": 15,
        },
    ]
    console = Console(file=StringIO(), force_terminal=True)
    print_replay_report(results, "test/repo", 2, console=console)
    output = console.file.getvalue()
    assert "test/repo" in output
    assert "90" in output
    assert "40" in output
