from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from supabase import create_client

from app.config import settings
from app.dependencies import get_current_user
from app.schemas.snapshots import SnapshotCreate, SnapshotUpdate

router = APIRouter(prefix="/snapshots", tags=["snapshots"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_key)


@router.get("")
async def get_snapshots(current_user: dict = Depends(get_current_user)) -> List[Any]:
    sb = get_supabase()
    result = (
        sb.table("calculator_snapshots")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


SNAPSHOT_LIMIT = 20


@router.post("")
async def create_snapshot(
    snapshot: SnapshotCreate,
    current_user: dict = Depends(get_current_user),
) -> Any:
    sb = get_supabase()
    count_result = (
        sb.table("calculator_snapshots")
        .select("id")
        .eq("user_id", current_user["id"])
        .execute()
    )
    if len(count_result.data) >= SNAPSHOT_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Snapshot limit reached ({SNAPSHOT_LIMIT} max). Delete some snapshots to save new ones.",
        )
    data = {**snapshot.model_dump(), "user_id": current_user["id"]}
    result = sb.table("calculator_snapshots").insert(data).execute()
    return result.data[0] if result.data else {}


class BulkDeleteRequest(BaseModel):
    ids: List[str] = Field(min_length=1)


@router.delete("")
async def delete_snapshots_bulk(
    payload: BulkDeleteRequest,
    current_user: dict = Depends(get_current_user),
) -> Any:
    sb = get_supabase()
    (
        sb.table("calculator_snapshots")
        .delete()
        .in_("id", payload.ids)
        .eq("user_id", current_user["id"])
        .execute()
    )
    return {"deleted": len(payload.ids)}


@router.get("/{snapshot_id}")
async def get_snapshot(
    snapshot_id: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    sb = get_supabase()
    result = (
        sb.table("calculator_snapshots")
        .select("*")
        .eq("id", snapshot_id)
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )
    return result.data


@router.patch("/{snapshot_id}")
async def update_snapshot(
    snapshot_id: str,
    snapshot: SnapshotUpdate,
    current_user: dict = Depends(get_current_user),
) -> Any:
    sb = get_supabase()
    data = snapshot.model_dump(exclude_none=True)
    if not data:
        return {}
    result = (
        sb.table("calculator_snapshots")
        .update(data)
        .eq("id", snapshot_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    return result.data[0] if result.data else {}


@router.delete("/{snapshot_id}")
async def delete_snapshot(
    snapshot_id: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    sb = get_supabase()
    (
        sb.table("calculator_snapshots")
        .delete()
        .eq("id", snapshot_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    return {"message": "Deleted"}
