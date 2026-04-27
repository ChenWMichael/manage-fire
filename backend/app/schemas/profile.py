from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class FireType(str, Enum):
    lean = "lean"
    regular = "regular"
    coast = "coast"
    fat = "fat"


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=200)
    fire_type: Optional[FireType] = None


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
