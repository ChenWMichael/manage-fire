"""
API integration tests for snapshots and profile routes.

Auth rejection for these routes is already covered in test_api.py::TestAuthRejection.
These tests focus on:
  - Happy-path responses (Supabase mocked via unittest.mock.patch)
  - Validation errors (422) from Pydantic schemas

Run from the backend/ directory:
    pytest tests/test_snapshots_profile.py -v
"""
from unittest.mock import MagicMock, patch


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_sb(data):
    """
    Returns a mock Supabase client whose chained table calls resolve to
    a result object with .data = data.
    """
    result = MagicMock()
    result.data = data

    table = MagicMock()
    for method in ("select", "insert", "update", "delete", "eq", "in_", "order", "single"):
        getattr(table, method).return_value = table
    table.execute.return_value = result

    sb = MagicMock()
    sb.table.return_value = table
    return sb


VALID_SNAPSHOT = {
    "name": "My FIRE Snapshot",
    "calculator_type": "fire",
    "inputs": {"current_age": 30},
    "summary": {"fi_number": 1_500_000},
}


# ─── Snapshots — happy path ───────────────────────────────────────────────────

class TestSnapshotsHappyPath:
    def test_get_snapshots_returns_empty_list(self, client):
        with patch("app.routes.snapshots.get_supabase", return_value=make_sb([])):
            r = client.get("/api/snapshots")
        assert r.status_code == 200
        assert r.json() == []

    def test_get_snapshots_returns_stored_records(self, client):
        records = [
            {"id": "s1", "name": "Snap A", "calculator_type": "fire"},
            {"id": "s2", "name": "Snap B", "calculator_type": "rent_buy"},
        ]
        with patch("app.routes.snapshots.get_supabase", return_value=make_sb(records)):
            r = client.get("/api/snapshots")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_create_snapshot_returns_created_record(self, client):
        record = {**VALID_SNAPSHOT, "id": "snap-1", "user_id": "test-user-id"}
        with patch("app.routes.snapshots.get_supabase", return_value=make_sb([record])):
            r = client.post("/api/snapshots", json=VALID_SNAPSHOT)
        assert r.status_code == 200
        assert r.json()["name"] == "My FIRE Snapshot"

    def test_create_snapshot_all_calculator_types_accepted(self, client):
        for calc_type in ("fire", "rent_buy", "house_affordability", "offer"):
            record = {**VALID_SNAPSHOT, "calculator_type": calc_type, "id": "snap-1"}
            with patch("app.routes.snapshots.get_supabase", return_value=make_sb([record])):
                r = client.post("/api/snapshots", json={**VALID_SNAPSHOT, "calculator_type": calc_type})
            assert r.status_code == 200, f"Expected 200 for calculator_type={calc_type}"

    def test_get_snapshot_by_id_returns_record(self, client):
        record = {**VALID_SNAPSHOT, "id": "snap-1", "user_id": "test-user-id"}
        with patch("app.routes.snapshots.get_supabase", return_value=make_sb(record)):
            r = client.get("/api/snapshots/snap-1")
        assert r.status_code == 200
        assert r.json()["name"] == "My FIRE Snapshot"

    def test_patch_snapshot_updates_name(self, client):
        updated = {**VALID_SNAPSHOT, "id": "snap-1", "name": "Updated Name"}
        with patch("app.routes.snapshots.get_supabase", return_value=make_sb([updated])):
            r = client.patch("/api/snapshots/snap-1", json={"name": "Updated Name"})
        assert r.status_code == 200
        assert r.json()["name"] == "Updated Name"

    def test_patch_snapshot_empty_body_returns_200(self, client):
        with patch("app.routes.snapshots.get_supabase", return_value=make_sb([])):
            r = client.patch("/api/snapshots/snap-1", json={})
        assert r.status_code == 200
        assert r.json() == {}

    def test_delete_snapshot_returns_message(self, client):
        with patch("app.routes.snapshots.get_supabase", return_value=make_sb([])):
            r = client.delete("/api/snapshots/snap-123")
        assert r.status_code == 200
        assert r.json()["message"] == "Deleted"

    def test_bulk_delete_snapshots_returns_deleted_count(self, client):
        with patch("app.routes.snapshots.get_supabase", return_value=make_sb([])):
            r = client.request("DELETE", "/api/snapshots", json={"ids": ["snap-1", "snap-2"]})
        assert r.status_code == 200
        assert r.json()["deleted"] == 2

    def test_bulk_delete_empty_ids_returns_422(self, client):
        r = client.request("DELETE", "/api/snapshots", json={"ids": []})
        assert r.status_code == 422

    def test_bulk_delete_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.request("DELETE", "/api/snapshots", json={"ids": ["snap-1"]}).status_code == 403

    def test_create_snapshot_at_limit_returns_400(self, client):
        existing = [{"id": f"snap-{i}"} for i in range(20)]
        with patch("app.routes.snapshots.get_supabase", return_value=make_sb(existing)):
            r = client.post("/api/snapshots", json=VALID_SNAPSHOT)
        assert r.status_code == 400
        assert "limit" in r.json()["detail"].lower()


# ─── Snapshots — validation ───────────────────────────────────────────────────

class TestSnapshotsValidation:
    def test_rejects_empty_name(self, client):
        r = client.post("/api/snapshots", json={**VALID_SNAPSHOT, "name": ""})
        assert r.status_code == 422

    def test_rejects_name_exceeding_200_chars(self, client):
        r = client.post("/api/snapshots", json={**VALID_SNAPSHOT, "name": "x" * 201})
        assert r.status_code == 422

    def test_rejects_invalid_calculator_type(self, client):
        r = client.post("/api/snapshots", json={**VALID_SNAPSHOT, "calculator_type": "unknown"})
        assert r.status_code == 422

    def test_rejects_missing_inputs(self, client):
        payload = {k: v for k, v in VALID_SNAPSHOT.items() if k != "inputs"}
        r = client.post("/api/snapshots", json=payload)
        assert r.status_code == 422

    def test_rejects_missing_summary(self, client):
        payload = {k: v for k, v in VALID_SNAPSHOT.items() if k != "summary"}
        r = client.post("/api/snapshots", json=payload)
        assert r.status_code == 422


# ─── Profile — happy path ─────────────────────────────────────────────────────

class TestProfileHappyPath:
    def test_get_profile_returns_200(self, client):
        profile = {"id": "test-user-id", "full_name": "Test User", "fire_type": "regular"}
        with patch("app.routes.profile.get_supabase", return_value=make_sb(profile)):
            r = client.get("/api/profile/me")
        assert r.status_code == 200

    def test_patch_profile_updates_display_name(self, client):
        updated = {"id": "test-user-id", "full_name": "New Name"}
        with patch("app.routes.profile.get_supabase", return_value=make_sb([updated])):
            r = client.patch("/api/profile/me", json={"full_name": "New Name"})
        assert r.status_code == 200

    def test_patch_profile_all_valid_fire_types(self, client):
        for fire_type in ("lean", "regular", "coast", "fat"):
            updated = {"id": "test-user-id", "fire_type": fire_type}
            with patch("app.routes.profile.get_supabase", return_value=make_sb([updated])):
                r = client.patch("/api/profile/me", json={"fire_type": fire_type})
            assert r.status_code == 200, f"Expected 200 for fire_type={fire_type}"

    def test_get_scenarios_returns_empty_list(self, client):
        with patch("app.routes.profile.get_supabase", return_value=make_sb([])):
            r = client.get("/api/profile/scenarios")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_scenario_returns_record(self, client):
        record = {"id": "sc-1", "name": "Plan A", "user_id": "test-user-id"}
        with patch("app.routes.profile.get_supabase", return_value=make_sb([record])):
            r = client.post("/api/profile/scenarios", json={"name": "Plan A"})
        assert r.status_code == 200

    def test_delete_scenario_returns_message(self, client):
        with patch("app.routes.profile.get_supabase", return_value=make_sb([])):
            r = client.delete("/api/profile/scenarios/sc-123")
        assert r.status_code == 200
        assert r.json()["message"] == "Deleted"

    def test_create_scenario_with_all_optional_fields(self, client):
        payload = {
            "name": "Full Plan",
            "current_age": 30,
            "retirement_age": 55,
            "current_savings": 100_000.0,
            "monthly_contribution": 2_000.0,
            "annual_expenses": 60_000.0,
            "expected_return": 7.0,
            "withdrawal_rate": 4.0,
            "fire_type": "regular",
        }
        record = {**payload, "id": "sc-1", "user_id": "test-user-id"}
        with patch("app.routes.profile.get_supabase", return_value=make_sb([record])):
            r = client.post("/api/profile/scenarios", json=payload)
        assert r.status_code == 200


# ─── Profile — validation ─────────────────────────────────────────────────────

class TestProfileValidation:
    def test_rejects_invalid_fire_type(self, client):
        r = client.patch("/api/profile/me", json={"fire_type": "ultra"})
        assert r.status_code == 422

    def test_rejects_full_name_exceeding_200_chars(self, client):
        r = client.patch("/api/profile/me", json={"full_name": "x" * 201})
        assert r.status_code == 422

    def test_empty_patch_body_is_accepted(self, client):
        with patch("app.routes.profile.get_supabase", return_value=make_sb([])):
            r = client.patch("/api/profile/me", json={})
        assert r.status_code == 200


# ─── Additional auth coverage for new endpoints ───────────────────────────────

class TestNewEndpointsAuthRejection:
    """
    Belt-and-suspenders: confirm every new endpoint rejects unauthenticated
    requests. Primary auth tests live in test_api.py::TestAuthRejection.
    """
    def test_post_snapshot_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.post("/api/snapshots", json=VALID_SNAPSHOT).status_code == 403

    def test_get_snapshot_by_id_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.get("/api/snapshots/snap-1").status_code == 403

    def test_patch_snapshot_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.patch("/api/snapshots/snap-1", json={"name": "x"}).status_code == 403

    def test_delete_snapshot_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.delete("/api/snapshots/snap-1").status_code == 403

    def test_patch_profile_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.patch("/api/profile/me", json={}).status_code == 403

    def test_post_scenario_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.post("/api/profile/scenarios", json={}).status_code == 403

    def test_delete_scenario_no_token_returns_403(self, unauthed_client):
        assert unauthed_client.delete("/api/profile/scenarios/sc-1").status_code == 403
