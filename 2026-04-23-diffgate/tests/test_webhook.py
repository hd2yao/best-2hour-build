"""
R4-B-001 fix: patch diffgate.main.settings directly.
R5-I-001 fix: dependency overrides set inside fixture (yield before) and cleared after yield.
"""

import hashlib
import hmac
import json

import pytest

from diffgate.main import app, get_analyzer, get_commenter
from diffgate.models import AnalysisResult


class FakeAnalyzer:
    async def analyze(self, title, body, files, stats):
        return AnalysisResult(minimal_edit_score=75)


class FakeCommenter:
    async def get_pr_diff(self, repo, pr_number):
        return ""

    async def get_existing_comment(self, repo, pr_number, marker):
        return None

    async def post_comment(self, repo, pr_number, body):
        return True

    async def update_comment(self, url, body):
        return True

    async def close(self):
        pass


def make_sig(payload: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


@pytest.fixture(autouse=True)
def setup_test_env():
    import diffgate.main

    diffgate.main.settings.github_webhook_secret = "testsecret"
    app.dependency_overrides[get_analyzer] = lambda: FakeAnalyzer()
    app.dependency_overrides[get_commenter] = lambda: FakeCommenter()

    yield

    diffgate.main.settings.github_webhook_secret = ""
    app.dependency_overrides.clear()


def test_webhook_returns_202_for_valid_pr():
    from fastapi.testclient import TestClient

    payload_dict = {
        "action": "opened",
        "pull_request": {"number": 1, "title": "test", "body": "", "diff_url": ""},
        "repository": {"full_name": "a/b"},
        "sender": {},
    }
    payload = json.dumps(payload_dict).encode()
    sig = make_sig(payload, "testsecret")
    with TestClient(app) as client:
        response = client.post(
            "/webhook/pr",
            content=payload,
            headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "pull_request"},
        )
        assert response.status_code == 202, f"Expected 202, got {response.status_code}"
        assert response.json()["status"] == "accepted"


def test_webhook_rejects_invalid_signature():
    from fastapi.testclient import TestClient

    payload = json.dumps(
        {
            "action": "opened",
            "pull_request": {"number": 1, "title": "", "body": "", "diff_url": ""},
            "repository": {"full_name": "a/b"},
            "sender": {},
        }
    ).encode()
    with TestClient(app) as client:
        response = client.post(
            "/webhook/pr",
            content=payload,
            headers={"X-Hub-Signature-256": "sha256=wrong", "X-GitHub-Event": "pull_request"},
        )
        assert response.status_code == 401


def test_webhook_ignores_non_pr_event():
    from fastapi.testclient import TestClient

    payload = json.dumps({"action": "push"}).encode()
    sig = make_sig(payload, "testsecret")
    with TestClient(app) as client:
        response = client.post(
            "/webhook/pr",
            content=payload,
            headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "push"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ignored"


def test_webhook_ignores_closed_action():
    from fastapi.testclient import TestClient

    payload_dict = {
        "action": "closed",
        "pull_request": {"number": 1, "title": "", "body": "", "diff_url": ""},
        "repository": {"full_name": "a/b"},
        "sender": {},
    }
    payload = json.dumps(payload_dict).encode()
    sig = make_sig(payload, "testsecret")
    with TestClient(app) as client:
        response = client.post(
            "/webhook/pr",
            content=payload,
            headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "pull_request"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ignored"


def test_verify_signature():
    from diffgate.webhook import verify_github_signature

    payload = b'{"test": 1}'
    sig = make_sig(payload, "secret")
    assert verify_github_signature(payload, sig, "secret") is True
    assert verify_github_signature(payload, "sha256=wrong", "secret") is False


def test_webhook_rejects_placeholder_secret():
    from fastapi.testclient import TestClient
    import diffgate.main

    diffgate.main.settings.github_webhook_secret = "your_webhook_secret_here"
    app.dependency_overrides[get_analyzer] = lambda: FakeAnalyzer()
    app.dependency_overrides[get_commenter] = lambda: FakeCommenter()

    payload = json.dumps(
        {
            "action": "opened",
            "pull_request": {"number": 1, "title": "", "body": "", "diff_url": ""},
            "repository": {"full_name": "a/b"},
            "sender": {},
        }
    ).encode()
    sig = make_sig(payload, "your_webhook_secret_here")

    try:
        with TestClient(app) as client:
            response = client.post(
                "/webhook/pr",
                content=payload,
                headers={"X-Hub-Signature-256": sig, "X-GitHub-Event": "pull_request"},
            )
            assert response.status_code == 503
    finally:
        diffgate.main.settings.github_webhook_secret = ""
        app.dependency_overrides.clear()
