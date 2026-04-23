from typing import Optional

from pydantic import BaseModel, Field


class OverEditFlag(BaseModel):
    flag: str
    detail: str


class SuggestedScope(BaseModel):
    keep: list[str] = Field(default_factory=list)
    revert: list[str] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    minimal_edit_score: int = Field(ge=0, le=100)
    over_edit_flags: list[OverEditFlag] = Field(default_factory=list)
    suggested_scope: SuggestedScope = Field(default_factory=SuggestedScope)
    risk_summary: str = ""
    suggested_action: str = ""


class PRPayload(BaseModel):
    action: str
    pull_request: dict
    repository: dict
    sender: dict

    @property
    def pr_number(self) -> int:
        return self.pull_request["number"]

    @property
    def repo_full_name(self) -> str:
        return self.repository["full_name"]

    @property
    def title(self) -> str:
        return self.pull_request.get("title", "")

    @property
    def body(self) -> str:
        return self.pull_request.get("body", "") or ""


class FileDiff(BaseModel):
    filename: str
    status: str
    additions: int = 0
    deletions: int = 0
    patch: Optional[str] = None
    changed_lines: int = 0

    @property
    def is_high_risk_path(self) -> bool:
        prefixes = [
            "config/",
            ".github/",
            "scripts/",
            "Makefile",
            "Dockerfile",
            "docker-compose",
        ]
        return any(self.filename.startswith(prefix) for prefix in prefixes)
