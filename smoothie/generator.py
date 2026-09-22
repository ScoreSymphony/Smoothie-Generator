"""Rule-based smoothie generation independent of the UI."""
from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations, product
from math import prod
import random

from .ingredient_catalog import IngredientCatalog
from .ingredients import Ingredient, IngredientCategory

EXHAUSTIVE_COMBINATION_LIMIT = 50_000
MAX_COMBINATION_EVALUATIONS = 50_000


@dataclass(frozen=True)
class GeneratedSmoothie:
    ingredient_ids: tuple[str, ...]
    roles: tuple[tuple[str, str], ...]


class SmoothieGenerator:
    def __init__(self, catalog: IngredientCatalog) -> None:
        self.catalog = catalog

    def generate(
        self,
        pantry_ids,
        *,
        count: int = 5,
        seed: int | None = None,
        vegan: bool = False,
        excluded_allergens=frozenset(),
    ) -> list[GeneratedSmoothie]:
        if count <= 0:
            return []

        allowed: list[Ingredient] = []
        allergens = set(excluded_allergens)
        for item_id in sorted(set(pantry_ids)):
            ingredient = self.catalog.resolve(item_id)
            if ingredient is None:
                continue
            if vegan and not ingredient.vegan:
                continue
            if allergens.intersection(ingredient.allergens):
                continue
            allowed.append(ingredient)

        fruits = [
            item
            for item in allowed
            if item.category in {IngredientCategory.FRUIT, IngredientCategory.BERRIES}
        ]
        liquids = [
            item for item in allowed if item.category == IngredientCategory.LIQUID
        ]
        if not fruits or not liquids:
            return []

        fruit_groups = [(item,) for item in fruits] + list(combinations(fruits, 2))
        creamy = [None] + [
            item
            for item in allowed
            if item.category == IngredientCategory.CREAMY_BASE
        ]
        proteins = [None] + [
            item for item in allowed if item.category == IngredientCategory.PROTEIN
        ]
        sweeteners = [None] + [
            item
            for item in allowed
            if item.category == IngredientCategory.SWEETENER
        ]
        extras = [None] + [
            item
            for item in allowed
            if item.category
            in {
                IngredientCategory.BOOSTERS,
                IngredientCategory.SPICES,
                IngredientCategory.SEEDS,
                IngredientCategory.GREENS,
                IngredientCategory.NUTS,
            }
        ]

        pools = (
            fruit_groups,
            liquids,
            creamy,
            proteins,
            sweeteners,
            extras,
        )
        total_combinations = prod(len(pool) for pool in pools)
        rng = random.Random(seed)

        if total_combinations <= EXHAUSTIVE_COMBINATION_LIMIT:
            candidates = {
                candidate
                for choices in product(*pools)
                if (candidate := self._candidate_from_choices(choices)) is not None
            }
            ordered = sorted(candidates, key=lambda item: item.ingredient_ids)
            rng.shuffle(ordered)
            return ordered[:count]

        # Large pantries can create hundreds of millions of Cartesian-product
        # combinations. Sample unique combination indices instead of materializing
        # the full product. The fixed seed keeps this path reproducible.
        evaluation_budget = min(
            total_combinations,
            MAX_COMBINATION_EVALUATIONS,
            max(2_000, count * 40),
        )
        candidates: list[GeneratedSmoothie] = []
        seen: set[GeneratedSmoothie] = set()

        for index in rng.sample(range(total_combinations), evaluation_budget):
            choices = self._decode_combination_index(index, pools)
            candidate = self._candidate_from_choices(choices)
            if candidate is None or candidate in seen:
                continue
            seen.add(candidate)
            candidates.append(candidate)
            if len(candidates) >= count:
                break

        return candidates

    @staticmethod
    def _decode_combination_index(index: int, pools: tuple[list, ...]) -> tuple:
        """Decode one Cartesian-product index without building the full product."""
        choices: list[object] = [None] * len(pools)
        remainder = index
        for position in range(len(pools) - 1, -1, -1):
            pool = pools[position]
            remainder, offset = divmod(remainder, len(pool))
            choices[position] = pool[offset]
        return tuple(choices)

    def _candidate_from_choices(self, choices: tuple) -> GeneratedSmoothie | None:
        fruit_group, liquid, cream, protein, sweetener, extra = choices
        chosen = [
            *fruit_group,
            liquid,
            *[
                item
                for item in (cream, protein, sweetener, extra)
                if item is not None
            ],
        ]
        if not self._valid(chosen, liquid):
            return None

        roles: list[tuple[str, str]] = [
            (item.id, "main_fruit") for item in fruit_group
        ]
        roles.append((liquid.id, "liquid"))
        for item, role in (
            (cream, "creamy_base"),
            (protein, "protein"),
            (sweetener, "sweetener"),
            (extra, "extra"),
        ):
            if item is not None:
                roles.append((item.id, role))

        return GeneratedSmoothie(
            tuple(item.id for item in chosen),
            tuple(roles),
        )

    @staticmethod
    def _valid(chosen: list[Ingredient], liquid: Ingredient) -> bool:
        # A liquid must materially contribute fluid; very dry/high-intensity
        # combinations are rejected.
        if liquid.water_contribution < 3:
            return False
        if sum(item.intensity >= 5 for item in chosen) > 1:
            return False

        ids = {item.id for item in chosen}
        for item in chosen:
            blocked = {
                tag.split(":", 1)[1]
                for tag in item.compatibility_tags
                if tag.startswith("avoid:")
            }
            if blocked & ids:
                return False
        return True
