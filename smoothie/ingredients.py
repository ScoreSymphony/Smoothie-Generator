"""Ingredient domain model and validation."""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

class IngredientCategory(StrEnum):
    FRUIT="fruit"; BERRIES="berries"; LIQUID="liquid"; CREAMY_BASE="creamy_base"
    GREENS="greens"; PROTEIN="protein"; SWEETENER="sweetener"; NUTS="nuts"
    SEEDS="seeds"; SPICES="spices"; BOOSTERS="boosters"; ICE="ice"

@dataclass(frozen=True)
class AmountRange:
    minimum: float
    maximum: float
    unit: str
    def __post_init__(self) -> None:
        if self.minimum < 0 or self.maximum <= 0 or self.minimum > self.maximum:
            raise ValueError("typical_amount must satisfy 0 <= minimum <= maximum and maximum > 0")
        if not self.unit.strip():
            raise ValueError("typical_amount.unit must not be empty")

@dataclass(frozen=True)
class Ingredient:
    id: str
    name_de: str
    aliases: tuple[str, ...]
    category: IngredientCategory
    subcategory: str | None
    sweetness: int
    acidity: int
    bitterness: int
    creaminess: int
    intensity: int
    water_contribution: int
    roles: tuple[str, ...]
    vegan: bool
    allergens: tuple[str, ...]
    typical_amount: AmountRange
    compatibility_tags: tuple[str, ...] = ()
    nutrition_per_100g: dict[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.id or self.id != self.id.strip().lower() or " " in self.id:
            raise ValueError(f"Invalid canonical ingredient id: {self.id!r}")
        if not self.name_de.strip():
            raise ValueError(f"{self.id}: name_de must not be empty")
        for field_name in ("sweetness","acidity","bitterness","creaminess","intensity","water_contribution"):
            value=getattr(self, field_name)
            if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 5:
                raise ValueError(f"{self.id}: {field_name} must be an integer from 0 to 5")
        if not self.roles:
            raise ValueError(f"{self.id}: at least one role is required")
        if any(not alias.strip() for alias in self.aliases):
            raise ValueError(f"{self.id}: aliases must not be empty")
        if any(value < 0 for value in self.nutrition_per_100g.values()):
            raise ValueError(f"{self.id}: nutrition values must be non-negative")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Ingredient":
        try:
            category=IngredientCategory(data["category"])
        except (KeyError, ValueError) as exc:
            raise ValueError(f"Invalid ingredient category: {data.get('category')!r}") from exc
        amount=data["typical_amount"]
        return cls(
            id=data["id"], name_de=data["name_de"], aliases=tuple(data.get("aliases", [])),
            category=category, subcategory=data.get("subcategory"),
            sweetness=data["sweetness"], acidity=data["acidity"], bitterness=data["bitterness"],
            creaminess=data["creaminess"], intensity=data["intensity"],
            water_contribution=data["water_contribution"], roles=tuple(data["roles"]),
            vegan=data["vegan"], allergens=tuple(data.get("allergens", [])),
            typical_amount=AmountRange(amount["min"], amount["max"], amount["unit"]),
            compatibility_tags=tuple(data.get("compatibility_tags", [])),
            nutrition_per_100g=dict(data.get("nutrition_per_100g", {})),
        )
