from diffgate.config import Settings


def test_settings_defaults():
    settings = Settings()
    assert settings.app_port == 8000


def test_settings_env_override(monkeypatch):
    monkeypatch.setenv("APP_PORT", "9000")
    assert Settings().app_port == 9000
