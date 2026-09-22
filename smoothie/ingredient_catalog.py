"""Canonical loader and alias resolver for local ingredient data."""

from __future__ import annotations
import json
from pathlib import Path
from .ingredients import Ingredient

DEFAULT_INGREDIENTS_PATH = Path(__file__).resolve().parents[1] / "data" / "ingredients.json"

class IngredientCatalog:
    def __init__(self, ingredients: list[Ingredient]) -> None:
        self._by_id: dict[str, Ingredient] = {}
        self._lookup: dict[str, Ingredient] = {}
        for ingredient in ingredients:
            if ingredient.id in self._by_id:
                raise ValueError(f"Duplicate ingredient id: {ingredient.id}")
            self._by_id[ingredient.id] = ingredient
            for term in (ingredient.id, ingredient.name_de, *ingredient.aliases):
                key=self.normalize(term)
                existing=self._lookup.get(key)
                if existing and existing.id != ingredient.id:
                    raise ValueError(f"Duplicate alias/name {term!r}: {existing.id} vs {ingredient.id}")
                self._lookup[key]=ingredient

    @staticmethod
    def normalize(value: str) -> str:
        return " ".join(value.strip().casefold().split())

    def resolve(self, value: str) -> Ingredient | None:
        return self._lookup.get(self.normalize(value))

    def require(self, value: str) -> Ingredient:
        ingredient=self.resolve(value)
        if ingredient is None:
            raise KeyError(f"Unknown ingredient: {value}")
        return ingredient

    def all(self) -> tuple[Ingredient, ...]:
        return tuple(self._by_id.values())

    def __len__(self) -> int:
        return len(self._by_id)

def load_ingredient_catalog(path: Path | str = DEFAULT_INGREDIENTS_PATH) -> IngredientCatalog:
    path=Path(path)
    try:
        payload=json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Could not load ingredient data from {path}: {exc}") from exc
    if not isinstance(payload, list):
        raise ValueError("Ingredient data root must be a JSON array")
    try:
        ingredients=[Ingredient.from_dict(item) for item in payload]
    except (KeyError, TypeError) as exc:
        raise ValueError(f"Malformed ingredient record: {exc}") from exc
    return IngredientCatalog(ingredients)
