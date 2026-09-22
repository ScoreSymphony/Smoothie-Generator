"""Quantity calculation and serving scaling for generated and stored recipes."""
from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .generator import GeneratedSmoothie
from .ingredient_catalog import IngredientCatalog
from .ingredients import IngredientCategory
from .recipes import Recipe


class QuantityUnit(StrEnum):
    G = "g"
    ML = "ml"
    PIECE = "piece"
    TSP = "tsp"
    TBSP = "tbsp"
    LEAF = "leaf"
    CUBE = "cube"


_UNIT_ALIASES = {
    "g": QuantityUnit.G,
    "gram": QuantityUnit.G,
    "gramm": QuantityUnit.G,
    "ml": QuantityUnit.ML,
    "milliliter": QuantityUnit.ML,
    "piece": QuantityUnit.PIECE,
    "pieces": QuantityUnit.PIECE,
    "stück": QuantityUnit.PIECE,
    "stueck": QuantityUnit.PIECE,
    "tsp": QuantityUnit.TSP,
    "tl": QuantityUnit.TSP,
    "teelöffel": QuantityUnit.TSP,
    "teeloeffel": QuantityUnit.TSP,
    "tbsp": QuantityUnit.TBSP,
    "el": QuantityUnit.TBSP,
    "esslöffel": QuantityUnit.TBSP,
    "essloeffel": QuantityUnit.TBSP,
    "leaf": QuantityUnit.LEAF,
    "leaves": QuantityUnit.LEAF,
    "blatt": QuantityUnit.LEAF,
    "blätter": QuantityUnit.LEAF,
    "blaetter": QuantityUnit.LEAF,
    "cube": QuantityUnit.CUBE,
    "cubes": QuantityUnit.CUBE,
    "würfel": QuantityUnit.CUBE,
    "wuerfel": QuantityUnit.CUBE,
}

_UNIT_LABELS_DE = {
    QuantityUnit.G: "g",
    QuantityUnit.ML: "ml",
    QuantityUnit.PIECE: "Stück",
    QuantityUnit.TSP: "TL",
    QuantityUnit.TBSP: "EL",
    QuantityUnit.LEAF: "Blatt",
    QuantityUnit.CUBE: "Würfel",
}


@dataclass(frozen=True)
class Quantity:
    amount: float
    unit: QuantityUnit

    def __post_init__(self) -> None:
        if self.amount <= 0:
            raise ValueError("Quantity amount must be positive")

    @classmethod
    def from_raw(cls, amount: float, unit: str | QuantityUnit) -> "Quantity":
        if isinstance(unit, QuantityUnit):
            return cls(amount, unit)
        normalized = " ".join(unit.strip().casefold().split())
        try:
            canonical = _UNIT_ALIASES[normalized]
        except KeyError as exc:
            raise ValueError(f"Unsupported quantity unit: {unit!r}") from exc
        return cls(amount, canonical)

    @property
    def label_de(self) -> str:
        return _UNIT_LABELS_DE[self.unit]


@dataclass(frozen=True)
class QuantifiedIngredient:
    ingredient_id: str
    quantity: Quantity


@dataclass(frozen=True)
class QuantifiedSmoothie:
    servings: int
    ingredients: tuple[QuantifiedIngredient, ...]


@dataclass(frozen=True)
class QuantifiedRecipe:
    recipe_id: str
    name_de: str
    servings: int
    required: tuple[QuantifiedIngredient, ...]
    optional: tuple[QuantifiedIngredient, ...]


class QuantityCalculator:
    """Convert recipe structures into practical, serving-scaled quantities."""

    def __init__(self, catalog: IngredientCatalog) -> None:
        self.catalog = catalog

    def for_generated(self, candidate: GeneratedSmoothie, servings: int = 1) -> QuantifiedSmoothie:
        self._validate_servings(servings)
        roles = dict(candidate.roles)
        measured: list[QuantifiedIngredient] = []
        for ingredient_id in candidate.ingredient_ids:
            ingredient = self.catalog.require(ingredient_id)
            role = roles[ingredient_id]
            one_serving = self._one_serving_amount(ingredient_id, role)
            quantity = Quantity.from_raw(
                self._round_amount(one_serving * servings),
                ingredient.typical_amount.unit,
            )
            measured.append(QuantifiedIngredient(ingredient_id, quantity))
        return QuantifiedSmoothie(servings, tuple(measured))

    def for_stored(self, recipe: Recipe, servings: int = 1) -> QuantifiedRecipe:
        self._validate_servings(servings)

        def scale(item) -> QuantifiedIngredient:
            return QuantifiedIngredient(
                item.ingredient_id,
                Quantity.from_raw(self._round_amount(item.amount * servings), item.unit),
            )

        return QuantifiedRecipe(
            recipe_id=recipe.id,
            name_de=recipe.name_de,
            servings=servings,
            required=tuple(scale(item) for item in recipe.required),
            optional=tuple(scale(item) for item in recipe.optional),
        )

    def _one_serving_amount(self, ingredient_id: str, role: str) -> float:
        ingredient = self.catalog.require(ingredient_id)
        amount = ingredient.typical_amount
        fraction = {
            "main_fruit": 0.50,
            "liquid": 0.65,
            "creamy_base": 0.50,
            "protein": 0.45,
            "sweetener": 0.20,
        }.get(role)
        if fraction is None:
            if ingredient.category == IngredientCategory.SPICES:
                fraction = 0.10
            elif ingredient.category == IngredientCategory.GREENS:
                fraction = 0.45
            elif ingredient.category == IngredientCategory.SEEDS:
                fraction = 0.30
            else:
                fraction = 0.30
        value = amount.minimum + (amount.maximum - amount.minimum) * fraction
        return min(amount.maximum, max(amount.minimum, value))

    @staticmethod
    def _round_amount(value: float) -> float:
        if value >= 20:
            return float(round(value))
        if value >= 5:
            return round(value, 1)
        return round(value, 2)

    @staticmethod
    def _validate_servings(servings: int) -> None:
        if not isinstance(servings, int) or isinstance(servings, bool) or servings < 1:
            raise ValueError("servings must be a positive integer")
