from diffgate.diff_parser import DiffParser, parse_unified_diff


def test_hunk_header_not_counted():
    diff = (
        "diff --git a/foo.py b/foo.py\n"
        "--- a/foo.py\n"
        "+++ b/foo.py\n"
        "@@ -1,3 +1,4 @@\n"
        " line1\n"
        "-old\n"
        "+new\n"
        "+extra\n"
    )
    files = parse_unified_diff(diff)
    assert files[0].additions == 2
    assert files[0].deletions == 1


def test_multifile_and_status():
    diff = (
        "diff --git a/added.py b/added.py\n"
        "new file mode 100644\n"
        "--- /dev/null\n"
        "+++ b/added.py\n"
        "@@ -0,0 +1,2 @@\n"
        "+l1\n"
        "+l2\n"
        "diff --git a/mod.py b/mod.py\n"
        "--- a/mod.py\n"
        "+++ b/mod.py\n"
        "@@ -1 +1 @@\n"
        "-old\n"
        "+new\n"
    )
    files = parse_unified_diff(diff)
    assert files[0].status == "added"
    assert files[0].additions == 2
    assert files[1].status == "modified"
    assert files[1].additions == 1
    assert files[1].deletions == 1


def test_compute_stats():
    diff = (
        "diff --git a/a.py b/a.py\n"
        "--- a/a.py\n"
        "+++ b/a.py\n"
        "@@ -1 +1,3 @@\n"
        "-x\n"
        "+y\n"
        "+z\n"
        "+w\n"
        "diff --git a/b.py b/b.py\n"
        "--- a/b.py\n"
        "+++ b/b.py\n"
        "@@ -1,5 +1,5 @@\n"
        "-a\n"
        "-b\n"
        "-c\n"
        "-d\n"
        "-e\n"
        "+a\n"
        "+b\n"
        "+c\n"
        "+d\n"
        "+e\n"
        "+f\n"
    )
    files = DiffParser().parse(diff)
    stats = DiffParser().compute_stats(files)
    assert stats["total_files"] == 2
    assert stats["total_additions"] == 9
    assert stats["total_deletions"] == 6
    assert stats["file_count_anomaly"] is False
    assert stats["line_bloat"] is False
    assert stats["high_risk_files"] == []
