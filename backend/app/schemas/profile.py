from typing import Optional
from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    fire_type: Optional[str] = None


class ScenarioCreate(BaseModel):
    name: str = "My FIRE Plan"
    current_age: Optional[int] = None
    retirement_age: Optional[int] = None
    current_savings: Optional[float] = None
    monthly_contribution: Optional[float] = None
    annual_expenses: Optional[float] = None
    expected_return: Optional[float] = 7.0
    withdrawal_rate: Optional[float] = 4.0
    fire_type: Optional[str] = "regular"
