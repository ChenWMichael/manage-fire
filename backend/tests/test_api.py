"""
API integration tests for the ManageFIRE backend.

Auth is handled by overriding get_current_user in the `client` fixture (see conftest.py).
The `unauthed_client` fixture has no override, so it exercises real auth rejection.

Run from the backend/ directory:
    pytest tests/test_api.py -v
"""

# ─── Shared payload ───────────────────────────────────────────────────────────

VALID_FIRE_PAYLOAD = {
    "current_age": 30,
    "retirement_age": 65,
    "current_savings": 50_000,
    "monthly_contribution": 2_000,
    "annual_expenses": 60_000,
    "expected_annual_return": 7.0,
    "withdrawal_rate": 4.0,
    "fire_type": "regular",
}


# ─── Health check ─────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_200(self, unauthed_client):
        response = unauthed_client.get("/api/health")
        assert response.status_code == 200

    def test_health_response_body(self, unauthed_client):
        data = unauthed_client.get("/api/health").json()
        assert data["status"] == "ok"
        assert "version" in data


# ─── POST /api/fire/calculate — happy path ────────────────────────────────────

class TestFireCalculateSuccess:
    def test_returns_200_with_valid_payload(self, client):
        response = client.post("/api/fire/calculate", json=VALID_FIRE_PAYLOAD)
        assert response.status_code == 200

    def test_response_contains_required_fields(self, client):
        data = client.post("/api/fire/calculate", json=VALID_FIRE_PAYLOAD).json()
        for field in ("fi_number", "projections", "is_already_fi", "progress_percentage", "coast_fire_number"):
            assert field in data, f"Missing field: {field}"

    def test_fi_number_matches_formula(self, client):
        # 60000 * (100/4) = 1,500,000
        data = client.post("/api/fire/calculate", json=VALID_FIRE_PAYLOAD).json()
        assert data["fi_number"] == 1_500_000.0

    def test_projections_is_a_list(self, client):
        data = client.post("/api/fire/calculate", json=VALID_FIRE_PAYLOAD).json()
        assert isinstance(data["projections"], list)
        assert len(data["projections"]) > 0

    def test_already_fi_false_for_low_savings(self, client):
        data = client.post("/api/fire/calculate", json=VALID_FIRE_PAYLOAD).json()
        assert data["is_already_fi"] is False

    def test_already_fi_true_for_high_savings(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "current_savings": 2_000_000}
        data = client.post("/api/fire/calculate", json=payload).json()
        assert data["is_already_fi"] is True

    def test_accepts_lean_fire_type(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "fire_type": "lean"}
        response = client.post("/api/fire/calculate", json=payload)
        assert response.status_code == 200

    def test_accepts_coast_fire_type(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "fire_type": "coast"}
        response = client.post("/api/fire/calculate", json=payload)
        assert response.status_code == 200


# ─── POST /api/fire/calculate — validation errors ─────────────────────────────

class TestFireCalculateValidation:
    def test_rejects_age_below_minimum(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "current_age": 17}
        assert client.post("/api/fire/calculate", json=payload).status_code == 422

    def test_rejects_age_above_maximum(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "current_age": 81}
        assert client.post("/api/fire/calculate", json=payload).status_code == 422

    def test_rejects_withdrawal_rate_below_minimum(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "withdrawal_rate": 0.5}
        assert client.post("/api/fire/calculate", json=payload).status_code == 422

    def test_rejects_withdrawal_rate_above_maximum(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "withdrawal_rate": 11.0}
        assert client.post("/api/fire/calculate", json=payload).status_code == 422

    def test_rejects_negative_current_savings(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "current_savings": -1}
        assert client.post("/api/fire/calculate", json=payload).status_code == 422

    def test_rejects_missing_annual_expenses(self, client):
        payload = {k: v for k, v in VALID_FIRE_PAYLOAD.items() if k != "annual_expenses"}
        assert client.post("/api/fire/calculate", json=payload).status_code == 422

    def test_rejects_invalid_fire_type(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "fire_type": "ultra"}
        assert client.post("/api/fire/calculate", json=payload).status_code == 422

    def test_rejects_return_rate_above_maximum(self, client):
        payload = {**VALID_FIRE_PAYLOAD, "expected_annual_return": 51.0}
        assert client.post("/api/fire/calculate", json=payload).status_code == 422


# ─── Security: auth rejection ─────────────────────────────────────────────────

class TestAuthRejection:
    """
    HTTPBearer returns 403 when no Authorization header is provided.
    The JWT decode step returns 401 when a token is present but invalid.
    """

    def test_fire_calculate_no_token_returns_403(self, unauthed_client):
        response = unauthed_client.post("/api/fire/calculate", json=VALID_FIRE_PAYLOAD)
        assert response.status_code == 403

    def test_fire_calculate_invalid_jwt_returns_401(self, unauthed_client):
        response = unauthed_client.post(
            "/api/fire/calculate",
            json=VALID_FIRE_PAYLOAD,
            headers={"Authorization": "Bearer not.a.valid.jwt"},
        )
        assert response.status_code == 401

    def test_profile_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.get("/api/profile/me").status_code == 403

    def test_profile_invalid_jwt_returns_401(self, unauthed_client):
        response = unauthed_client.get(
            "/api/profile/me",
            headers={"Authorization": "Bearer not.a.valid.jwt"},
        )
        assert response.status_code == 401

    def test_snapshots_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.get("/api/snapshots").status_code == 403

    def test_scenarios_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.get("/api/profile/scenarios").status_code == 403
