from typing import Any, Dict
from pydantic import BaseModel


class SnapshotCreate(BaseModel):
    name: str
    calculator_type: str  # 'fire' | 'rent_buy' | 'house_affordability' | 'offer'
    inputs: Dict[str, Any]
    summary: Dict[str, Any]
