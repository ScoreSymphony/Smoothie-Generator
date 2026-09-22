"""Transparent heuristic scoring and deterministic ranking for generated smoothies."""
from __future__ import annotations

from dataclasses import dataclass, field
from itertools import combinations
from typing import Mapping

from .generator import GeneratedSmoothie
from .ingredient_catalog import IngredientCatalog
from .ingredients import Ingredient, IngredientCategory


def _range_score(value: float, low: float, high: float, minimum: float = 0.0, maximum: float = 5.0) -> float:
    if low <= value <= high:
        return 1.0
    if value < low:
        span = max(low - minimum, 1e-9)
        return max(0.0, 1.0 - (low - value) / span)
    span = max(maximum - high, 1e-9)
    return max(0.0, 1.0 - (value - high) / span)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


@dataclass(frozen=True)
class ScoringWeights:
    pantry_availability: float = 1.5
    flavor_balance: float = 2.0
    compatibility: float = 1.25
    texture_balance: float = 1.0
    liquid_ratio: float = 1.5
    intensity: float = 1.0
    nutrition_fit: float = 0.5
    preference_fit: float = 0.75
    penalty_scale: float = 25.0

    def __post_init__(self) -> None:
        values = (
            self.pantry_availability,
            self.flavor_balance,
            self.compatibility,
            self.texture_balance,
            self.liquid_ratio,
            self.intensity,
            self.nutrition_fit,
            self.preference_fit,
            self.penalty_scale,
        )
        if any(value < 0 for value in values):
            raise ValueError("Scoring weights must be non-negative")
        if sum(values[:-1]) <= 0:
            raise ValueError("At least one score-component weight must be positive")


@dataclass(frozen=True)
class ScoringContext:
    pantry_ids: frozenset[str] = frozenset()
    preferred_ids: frozenset[str] = frozenset()
    nutrition_minimums: Mapping[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class CandidateScore:
    candidate: GeneratedSmoothie
    total: float
    components: Mapping[str, float]
    penalties: Mapping[str, float]
    explanations: tuple[str, ...]


class CandidateScorer:
    """Score valid candidates using inspectable domain heuristics."""

    def __init__(self, catalog: IngredientCatalog, weights: ScoringWeights | None = None) -> None:
        self.catalog = catalog
        self.weights = weights or ScoringWeights()

    def score(self, candidate: GeneratedSmoothie, context: ScoringContext | None = None) -> CandidateScore:
        context = context or ScoringContext()
        ingredients = tuple(self.catalog.require(item_id) for item_id in candidate.ingredient_ids)
        if not ingredients:
            raise ValueError("Cannot score an empty smoothie candidate")

        averages = {
            "sweetness": sum(item.sweetness for item in ingredients) / len(ingredients),
            "acidity": sum(item.acidity for item in ingredients) / len(ingredients),
            "bitterness": sum(item.bitterness for item in ingredients) / len(ingredients),
            "creaminess": sum(item.creaminess for item in ingredients) / len(ingredients),
            "intensity": sum(item.intensity for item in ingredients) / len(ingredients),
        }
        liquid_ratio = self._liquid_ratio(ingredients)
        explicit_incompatibilities = self._explicit_incompatibilities(ingredients)

        flavor = (
            _range_score(averages["sweetness"], 2.0, 4.0)
            + _range_score(averages["acidity"], 0.75, 3.25)
            + _range_score(averages["bitterness"], 0.0, 1.75)
        ) / 3
        compatibility = self._compatibility_score(ingredients, explicit_incompatibilities)
        texture = _range_score(averages["creaminess"], 1.25, 3.75)
        liquid = _range_score(liquid_ratio, 0.35, 0.65, minimum=0.0, maximum=1.0)
        intensity = _range_score(averages["intensity"], 1.0, 3.5)
        availability = self._availability_score(candidate, context)
        nutrition = self._nutrition_score(ingredients, context)
        preference = self._preference_score(candidate, context)

        components = {
            "pantry_availability": availability,
            "flavor_balance": flavor,
            "compatibility": compatibility,
            "texture_balance": texture,
            "liquid_ratio": liquid,
            "intensity": intensity,
            "nutrition_fit": nutrition,
            "preference_fit": preference,
        }
        penalties = {
            "excess_acidity": _clamp01((averages["acidity"] - 3.5) / 1.5),
            "excess_sweetness": _clamp01((averages["sweetness"] - 4.25) / 0.75),
            "dominant_flavors": _clamp01((sum(item.intensity >= 5 for item in ingredients) - 1) / 2),
            "poor_liquid_balance": _clamp01(max(0.25 - liquid_ratio, liquid_ratio - 0.75) / 0.25),
            "incompatible_combination": 1.0 if explicit_incompatibilities else 0.0,
        }

        weighted = (
            components["pantry_availability"] * self.weights.pantry_availability
            + components["flavor_balance"] * self.weights.flavor_balance
            + components["compatibility"] * self.weights.compatibility
            + components["texture_balance"] * self.weights.texture_balance
            + components["liquid_ratio"] * self.weights.liquid_ratio
            + components["intensity"] * self.weights.intensity
            + components["nutrition_fit"] * self.weights.nutrition_fit
            + components["preference_fit"] * self.weights.preference_fit
        )
        weight_total = (
            self.weights.pantry_availability
            + self.weights.flavor_balance
            + self.weights.compatibility
            + self.weights.texture_balance
            + self.weights.liquid_ratio
            + self.weights.intensity
            + self.weights.nutrition_fit
            + self.weights.preference_fit
        )
        penalty_total = sum(penalties.values())
        total = max(0.0, min(100.0, weighted / weight_total * 100.0 - penalty_total * self.weights.penalty_scale))

        explanations = (
            f"Geschmack {flavor:.2f}",
            f"Kompatibilität {compatibility:.2f}",
            f"Textur {texture:.2f}",
            f"Flüssigkeitsbalance {liquid:.2f}",
            f"Intensität {intensity:.2f}",
        )
        return CandidateScore(candidate, round(total, 2), components, penalties, explanations)

    def _availability_score(self, candidate: GeneratedSmoothie, context: ScoringContext) -> float:
        if not context.pantry_ids:
            return 1.0
        return sum(item_id in context.pantry_ids for item_id in candidate.ingredient_ids) / len(candidate.ingredient_ids)

    def _preference_score(self, candidate: GeneratedSmoothie, context: ScoringContext) -> float:
        if not context.preferred_ids:
            return 0.5
        return len(set(candidate.ingredient_ids) & context.preferred_ids) / len(context.preferred_ids)

    def _nutrition_score(self, ingredients: tuple[Ingredient, ...], context: ScoringContext) -> float:
        if not context.nutrition_minimums:
            return 0.5
        scores: list[float] = []
        for nutrient, target in context.nutrition_minimums.items():
            if target <= 0:
                continue
            values = [item.nutrition_per_100g[nutrient] for item in ingredients if nutrient in item.nutrition_per_100g]
            if values:
                scores.append(min(1.0, (sum(values) / len(values)) / target))
        return sum(scores) / len(scores) if scores else 0.5

    @staticmethod
    def _liquid_ratio(ingredients: tuple[Ingredient, ...]) -> float:
        total = sum((item.typical_amount.minimum + item.typical_amount.maximum) / 2 for item in ingredients)
        if total <= 0:
            return 0.0
        liquid = sum(
            (item.typical_amount.minimum + item.typical_amount.maximum) / 2
            for item in ingredients
            if item.category == IngredientCategory.LIQUID
        )
        return liquid / total

    @staticmethod
    def _explicit_incompatibilities(ingredients: tuple[Ingredient, ...]) -> tuple[tuple[str, str], ...]:
        ids = {item.id for item in ingredients}
        pairs: set[tuple[str, str]] = set()
        for item in ingredients:
            for tag in item.compatibility_tags:
                if tag.startswith("avoid:"):
                    other = tag.split(":", 1)[1]
                    if other in ids:
                        pairs.add(tuple(sorted((item.id, other))))
        return tuple(sorted(pairs))

    @staticmethod
    def _compatibility_score(
        ingredients: tuple[Ingredient, ...],
        explicit_incompatibilities: tuple[tuple[str, str], ...],
    ) -> float:
        if explicit_incompatibilities:
            return 0.0
        tagged = [
            {tag for tag in item.compatibility_tags if not tag.startswith("avoid:")}
            for item in ingredients
            if any(not tag.startswith("avoid:") for tag in item.compatibility_tags)
        ]
        if len(tagged) < 2:
            return 0.75
        pair_scores = [1.0 if left & right else 0.0 for left, right in combinations(tagged, 2)]
        affinity = sum(pair_scores) / len(pair_scores) if pair_scores else 0.0
        return 0.65 + 0.35 * affinity


def _core_signature(candidate: GeneratedSmoothie) -> tuple[str, ...]:
    trivial_roles = {"sweetener", "extra"}
    return tuple(sorted(item_id for item_id, role in candidate.roles if role not in trivial_roles))


def rank_generated_candidates(
    candidates: list[GeneratedSmoothie] | tuple[GeneratedSmoothie, ...],
    scorer: CandidateScorer,
    context: ScoringContext | None = None,
    *,
    limit: int | None = None,
) -> list[CandidateScore]:
    """Rank deterministically and suppress variants that only differ by trivial extras."""
    scored = [scorer.score(candidate, context) for candidate in candidates]
    scored.sort(key=lambda item: (-item.total, item.candidate.ingredient_ids))

    deduplicated: list[CandidateScore] = []
    seen_signatures: set[tuple[str, ...]] = set()
    for item in scored:
        signature = _core_signature(item.candidate)
        if signature in seen_signatures:
            continue
        seen_signatures.add(signature)
        deduplicated.append(item)
        if limit is not None and len(deduplicated) >= max(0, limit):
            break
    return deduplicated
