import re

from diffgate.models import FileDiff


def parse_unified_diff(diff_text: str) -> list[FileDiff]:
    files: list[FileDiff] = []
    current: dict = {}
    lines = diff_text.splitlines()
    i = 0

    while i < len(lines):
        line = lines[i]
        match = re.match(r"diff --git a/(.+?) b/(.+?)(?:\s+.*)?$", line)
        if match:
            if current:
                _finalize(current, files)
            current = {
                "filename": match.group(2),
                "status": "modified",
                "additions": 0,
                "deletions": 0,
                "patch": "",
                "changed_lines": 0,
            }
            i += 1
            continue

        if line.startswith("new file mode"):
            current["status"] = "added"
        elif line.startswith("deleted file mode"):
            current["status"] = "removed"
        elif "rename from" in line or "rename to" in line:
            current["status"] = "renamed"
        elif re.match(r"@@ [-+]\d+(?:,\d+)? [-+]\d+(?:,\d+)? @@", line):
            # hunk header: do not count in additions/deletions
            current["patch"] = (current.get("patch") or "") + line + "\n"
        else:
            if current:
                current["patch"] = (current.get("patch") or "") + line + "\n"
                if line.startswith("+") and not line.startswith("+++"):
                    current["additions"] += 1
                elif line.startswith("-") and not line.startswith("---"):
                    current["deletions"] += 1
        i += 1

    if current:
        _finalize(current, files)
    return files


def _finalize(current: dict, files: list[FileDiff]) -> None:
    current["changed_lines"] = current["additions"] + current["deletions"]
    files.append(FileDiff(**current))


class DiffParser:
    def __init__(self, max_file_patch_chars: int = 5000):
        self.max_file_patch_chars = max_file_patch_chars

    def parse(self, diff_text: str) -> list[FileDiff]:
        return parse_unified_diff(diff_text)

    def build_llm_context(self, files: list[FileDiff]) -> str:
        lines: list[str] = []
        for file_diff in files:
            lines.append(
                f"## {file_diff.filename} [{file_diff.status}] "
                f"(+{file_diff.additions} -{file_diff.deletions})"
            )
            if file_diff.patch:
                truncated = file_diff.patch[: self.max_file_patch_chars]
                if len(file_diff.patch) > self.max_file_patch_chars:
                    truncated += f"\n... (truncated, total {len(file_diff.patch)} chars)"
                lines.append(truncated)
            lines.append("")
        return "\n".join(lines)

    def compute_stats(self, files: list[FileDiff]) -> dict:
        return {
            "total_files": len(files),
            "total_additions": sum(file_diff.additions for file_diff in files),
            "total_deletions": sum(file_diff.deletions for file_diff in files),
            "total_changed_lines": sum(file_diff.changed_lines for file_diff in files),
            "max_file_changed_lines": max(
                (file_diff.changed_lines for file_diff in files),
                default=0,
            ),
            "high_risk_files": [
                file_diff.filename for file_diff in files if file_diff.is_high_risk_path
            ],
            "file_count_anomaly": len(files) > 10,
            "line_bloat": (
                sum(file_diff.changed_lines for file_diff in files) > 1000
                or max((file_diff.changed_lines for file_diff in files), default=0) > 200
            ),
        }
