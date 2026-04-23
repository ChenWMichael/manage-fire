from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.schemas.fire import FireCalculationInput, FireCalculationResult
from app.services.fire_calculations import calculate_fire

router = APIRouter(prefix="/fire", tags=["fire"])


@router.post("/calculate", response_model=FireCalculationResult)
async def calculate_fire_endpoint(
    data: FireCalculationInput,
    current_user: dict = Depends(get_current_user),
):
    return calculate_fire(data)
