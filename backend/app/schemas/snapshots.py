from enum import Enum
from typing import Any, Dict

from pydantic import BaseModel, Field


class CalculatorType(str, Enum):
    fire = "fire"
    rent_buy = "rent_buy"
    house_affordability = "house_affordability"
    offer = "offer"


class SnapshotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    calculator_type: CalculatorType
    inputs: Dict[str, Any]
    summary: Dict[str, Any]
