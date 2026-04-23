from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class FireType(str, Enum):
    LEAN = "lean"
    REGULAR = "regular"
    COAST = "coast"
    FAT = "fat"


class FireCalculationInput(BaseModel):
    current_age: int = Field(ge=18, le=80)
    retirement_age: int = Field(ge=18, le=100)
    current_savings: float = Field(ge=0)
    monthly_contribution: float = Field(ge=0)
    annual_expenses: float = Field(ge=0)
    expected_annual_return: float = Field(ge=0, le=50, default=7.0)
    withdrawal_rate: float = Field(ge=1, le=10, default=4.0)
    fire_type: FireType = FireType.REGULAR


class YearlyProjection(BaseModel):
    year: int
    age: int
    portfolio_value: float
    fi_number: float


class FireCalculationResult(BaseModel):
    fi_number: float
    years_to_fire: Optional[int] = None
    fire_age: Optional[int] = None
    coast_fire_number: float
    monthly_needed_for_target: Optional[float] = None
    projections: List[YearlyProjection]
    is_already_fi: bool
    progress_percentage: float
