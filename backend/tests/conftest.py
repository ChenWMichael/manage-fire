import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user

FAKE_USER = {"id": "test-user-id", "email": "test@example.com"}


@pytest.fixture
def client():
    """TestClient with auth dependency bypassed."""
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def unauthed_client():
    """TestClient with no auth override — protected routes will reject."""
    app.dependency_overrides.clear()
    with TestClient(app) as c:
        yield c
