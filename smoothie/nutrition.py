"""Offline nutrition data and aggregation for smoothie quantities."""
from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path

from .ingredient_catalog import IngredientCatalog, load_ingredient_catalog
from .quantities import QuantifiedIngredient, QuantityUnit

DEFAULT_NUTRITION_PATH = Path(__file__).resolve().parents[1] / "data" / "nutrition.json"


@dataclass(frozen=True)
class NutritionFacts:
    calories: float = 0.0
    protein_g: float = 0.0
    carbohydrates_g: float = 0.0
    sugar_g: float = 0.0
    fat_g: float = 0.0
    fiber_g: float = 0.0

    def scaled(self, factor: float) -> "NutritionFacts":
        return NutritionFacts(
            calories=self.calories * factor,
            protein_g=self.protein_g * factor,
            carbohydrates_g=self.carbohydrates_g * factor,
            sugar_g=self.sugar_g * factor,
            fat_g=self.fat_g * factor,
            fiber_g=self.fiber_g * factor,
        )

    def __add__(self, other: "NutritionFacts") -> "NutritionFacts":
        return NutritionFacts(
            calories=self.calories + other.calories,
            protein_g=self.protein_g + other.protein_g,
            carbohydrates_g=self.carbohydrates_g + other.carbohydrates_g,
            sugar_g=self.sugar_g + other.sugar_g,
            fat_g=self.fat_g + other.fat_g,
            fiber_g=self.fiber_g + other.fiber_g,
        )

    def rounded(self, digits: int = 1) -> "NutritionFacts":
        return NutritionFacts(
            calories=round(self.calories, digits),
            protein_g=round(self.protein_g, digits),
            carbohydrates_g=round(self.carbohydrates_g, digits),
            sugar_g=round(self.sugar_g, digits),
            fat_g=round(self.fat_g, digits),
            fiber_g=round(self.fiber_g, digits),
        )

    @classmethod
    def from_dict(cls, data: dict[str, object]) -> "NutritionFacts":
        required = (
            "calories",
            "protein_g",
            "carbohydrates_g",
            "sugar_g",
            "fat_g",
            "fiber_g",
        )
        values: dict[str, float] = {}
        for key in required:
            value = data.get(key)
            if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
                raise ValueError(f"Invalid nutrition value for {key}: {value!r}")
            values[key] = float(value)
        return cls(**values)


class NutritionCatalog:
    def __init__(self, entries: dict[str, NutritionFacts]) -> None:
        self._entries = dict(entries)

    def require(self, ingredient_id: str) -> NutritionFacts:
        try:
            return self._entries[ingredient_id]
        except KeyError as exc:
            raise KeyError(f"Missing nutrition data for ingredient: {ingredient_id}") from exc

    def __len__(self) -> int:
        return len(self._entries)


def load_nutrition_catalog(
    path: Path | str = DEFAULT_NUTRITION_PATH,
    ingredient_catalog: IngredientCatalog | None = None,
) -> NutritionCatalog:
    ingredient_catalog = ingredient_catalog or load_ingredient_catalog()
    try:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Could not load nutrition data from {path}: {exc}") from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("ingredients"), dict):
        raise ValueError("Nutrition data must contain an 'ingredients' object")

    raw_entries = payload["ingredients"]
    entries = {ingredient_id: NutritionFacts.from_dict(data) for ingredient_id, data in raw_entries.items()}
    known = {ingredient.id for ingredient in ingredient_catalog.all()}
    unknown = set(entries) - known
    missing = known - set(entries)
    if unknown:
        raise ValueError(f"Nutrition data contains unknown ingredient ids: {sorted(unknown)}")
    if missing:
        raise ValueError(f"Nutrition data missing ingredient ids: {sorted(missing)}")
    return NutritionCatalog(entries)


class NutritionCalculator:
    """Aggregate approximate nutrition without requiring network access."""

    def __init__(self, ingredient_catalog: IngredientCatalog, nutrition_catalog: NutritionCatalog) -> None:
        self.ingredient_catalog = ingredient_catalog
        self.nutrition_catalog = nutrition_catalog

    def calculate(self, items: tuple[QuantifiedIngredient, ...] | list[QuantifiedIngredient]) -> NutritionFacts:
        total = NutritionFacts()
        for item in items:
            grams = self._to_grams(item)
            per_100g = self.nutrition_catalog.require(item.ingredient_id)
            total = total + per_100g.scaled(grams / 100.0)
        return total.rounded()

    def _to_grams(self, item: QuantifiedIngredient) -> float:
        amount = item.quantity.amount
        unit = item.quantity.unit
        ingredient = self.ingredient_catalog.require(item.ingredient_id)
        if unit == QuantityUnit.G:
            return amount
        if unit == QuantityUnit.ML:
            return amount  # Generic density approximation: 1 ml ≈ 1 g.
        if unit == QuantityUnit.PIECE:
            typical = ingredient.typical_amount
            if typical.unit.casefold() == "g":
                return amount * ((typical.minimum + typical.maximum) / 2)
            return amount * 100.0
        if unit == QuantityUnit.TSP:
            return amount * 5.0
        if unit == QuantityUnit.TBSP:
            return amount * 15.0
        if unit == QuantityUnit.LEAF:
            return amount * 1.0
        if unit == QuantityUnit.CUBE:
            return amount * 30.0
        raise ValueError(f"Unsupported nutrition conversion unit: {unit}")
