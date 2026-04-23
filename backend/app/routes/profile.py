from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from app.config import settings
from app.dependencies import get_current_user
from app.schemas.profile import ProfileUpdate, ScenarioCreate

router = APIRouter(prefix="/profile", tags=["profile"])


def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_key)


@router.get("/me")
async def get_profile(current_user: dict = Depends(get_current_user)) -> Any:
    sb = get_supabase()
    result = sb.table("profiles").select("*").eq("id", current_user["id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data


@router.patch("/me")
async def update_profile(
    update: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
) -> Any:
    sb = get_supabase()
    result = (
        sb.table("profiles")
        .update(update.model_dump(exclude_none=True))
        .eq("id", current_user["id"])
        .execute()
    )
    return result.data[0] if result.data else {}


@router.get("/scenarios")
async def get_scenarios(current_user: dict = Depends(get_current_user)) -> List[Any]:
    sb = get_supabase()
    result = (
        sb.table("fire_scenarios")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/scenarios")
async def create_scenario(
    scenario: ScenarioCreate,
    current_user: dict = Depends(get_current_user),
) -> Any:
    sb = get_supabase()
    data = {**scenario.model_dump(), "user_id": current_user["id"]}
    result = sb.table("fire_scenarios").insert(data).execute()
    return result.data[0] if result.data else {}


@router.delete("/scenarios/{scenario_id}")
async def delete_scenario(
    scenario_id: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    sb = get_supabase()
    sb.table("fire_scenarios").delete().eq("id", scenario_id).eq("user_id", current_user["id"]).execute()
    return {"message": "Deleted"}
