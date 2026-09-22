"""Stored smoothie recipe domain model."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class RecipeIngredient:
    ingredient_id: str
    amount: float
    unit: str
    def __post_init__(self) -> None:
        if not self.ingredient_id or self.amount <= 0 or not self.unit.strip():
            raise ValueError("Recipe ingredient requires id, positive amount and unit")

@dataclass(frozen=True)
class SubstitutionGroup:
    target_id: str
    alternatives: tuple[str, ...]
    def __post_init__(self) -> None:
        if not self.target_id or not self.alternatives:
            raise ValueError("Substitution group requires target and alternatives")

@dataclass(frozen=True)
class Recipe:
    id: str
    name_de: str
    required: tuple[RecipeIngredient, ...]
    optional: tuple[RecipeIngredient, ...] = ()
    substitutions: tuple[SubstitutionGroup, ...] = ()
    instructions_de: tuple[str, ...] = ()
    tags: tuple[str, ...] = ()
    def __post_init__(self) -> None:
        if not self.id or not self.name_de.strip() or not self.required:
            raise ValueError("Recipe requires id, German name and required ingredients")
        ids=[x.ingredient_id for x in (*self.required,*self.optional)]
        if len(ids) != len(set(ids)):
            raise ValueError(f"{self.id}: duplicate recipe ingredient")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Recipe":
        item=lambda x: RecipeIngredient(x["ingredient_id"], x["amount"], x["unit"])
        return cls(id=data["id"],name_de=data["name_de"],required=tuple(item(x) for x in data["required"]),
                   optional=tuple(item(x) for x in data.get("optional",[])),
                   substitutions=tuple(SubstitutionGroup(x["target_id"],tuple(x["alternatives"])) for x in data.get("substitutions",[])),
                   instructions_de=tuple(data.get("instructions_de",[])),tags=tuple(data.get("tags",[])))
