"""Pantry selection state independent from the Streamlit UI."""

from __future__ import annotations
from dataclasses import dataclass, field
from .ingredient_catalog import IngredientCatalog
from .ingredients import Ingredient

@dataclass
class Pantry:
    ingredient_ids: set[str] = field(default_factory=set)
    unknown_inputs: list[str] = field(default_factory=list)
    servings: int = 2

    def add(self, value: str, catalog: IngredientCatalog) -> Ingredient | None:
        ingredient = catalog.resolve(value)
        if ingredient is None:
            cleaned = value.strip()
            if cleaned and cleaned not in self.unknown_inputs:
                self.unknown_inputs.append(cleaned)
            return None
        self.ingredient_ids.add(ingredient.id)
        return ingredient

    def add_id(self, ingredient_id: str, catalog: IngredientCatalog) -> Ingredient:
        ingredient = catalog.require(ingredient_id)
        self.ingredient_ids.add(ingredient.id)
        return ingredient

    def remove(self, ingredient_id: str) -> None:
        self.ingredient_ids.discard(ingredient_id)

    def selected(self, catalog: IngredientCatalog) -> tuple[Ingredient, ...]:
        return tuple(item for item in catalog.all() if item.id in self.ingredient_ids)

    def set_servings(self, servings: int) -> None:
        if not 1 <= servings <= 8:
            raise ValueError("servings must be between 1 and 8")
        self.servings = servings
