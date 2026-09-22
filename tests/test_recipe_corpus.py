"""Dataset-level validation for the curated stored smoothie corpus."""
from __future__ import annotations

import json
from pathlib import Path

from smoothie.ingredient_catalog import load_ingredient_catalog
from smoothie.recipe_catalog import load_recipe_catalog
from smoothie.matcher import rank_recipes

ROOT = Path(__file__).resolve().parents[1]
SUBSET_PATH = ROOT / "data" / "recipe_validation_subset.json"

MAJOR_CATEGORIES = {
    "fruit",
    "berries",
    "liquid",
    "creamy_base",
    "greens",
    "protein",
    "nuts",
    "seeds",
    "spices",
    "boosters",
}
MAJOR_STYLES = {
    "fruchtig",
    "beeren",
    "tropisch",
    "grün",
    "cremig",
    "frühstück",
    "protein",
    "frisch",
    "sättigend",
    "vegan",
}
UNIT_MAX = {
    "g": 500,
    "ml": 500,
    "Stück": 5,
    "TL": 6,
    "EL": 6,
    "Blätter": 20,
    "Würfel": 12,
}


def test_recipe_corpus_has_target_size_and_unique_ids() -> None:
    recipes = load_recipe_catalog()
    ids = [recipe.id for recipe in recipes]

    assert 50 <= len(recipes) <= 100
    assert len(ids) == len(set(ids))


def test_recipe_corpus_references_only_known_ingredients() -> None:
    recipes = load_recipe_catalog()
    known = {ingredient.id for ingredient in load_ingredient_catalog().all()}

    for recipe in recipes:
        referenced = {
            item.ingredient_id
            for item in (*recipe.required, *recipe.optional)
        }
        for group in recipe.substitutions:
            referenced.add(group.target_id)
            referenced.update(group.alternatives)

        assert referenced <= known, recipe.id


def test_recipe_structures_and_quantities_are_plausible() -> None:
    recipes = load_recipe_catalog()

    for recipe in recipes:
        assert recipe.name_de.strip()
        assert recipe.required
        assert recipe.instructions_de
        assert recipe.tags

        ingredient_ids = [
            item.ingredient_id
            for item in (*recipe.required, *recipe.optional)
        ]
        assert len(ingredient_ids) == len(set(ingredient_ids)), recipe.id

        for item in (*recipe.required, *recipe.optional):
            assert item.amount > 0, recipe.id
            assert item.unit in UNIT_MAX, (recipe.id, item.unit)
            assert item.amount <= UNIT_MAX[item.unit], (recipe.id, item)


def test_substitution_groups_are_valid() -> None:
    recipes = load_recipe_catalog()

    for recipe in recipes:
        required_ids = {item.ingredient_id for item in recipe.required}
        seen_targets: set[str] = set()

        for group in recipe.substitutions:
            assert group.target_id in required_ids, recipe.id
            assert group.target_id not in seen_targets, recipe.id
            assert group.alternatives
            assert len(group.alternatives) == len(set(group.alternatives)), recipe.id
            assert group.target_id not in group.alternatives, recipe.id
            seen_targets.add(group.target_id)


def test_recipes_do_not_repeat_the_same_required_ingredient_set() -> None:
    recipes = load_recipe_catalog()
    signatures: dict[frozenset[str], str] = {}

    for recipe in recipes:
        signature = frozenset(item.ingredient_id for item in recipe.required)
        assert signature not in signatures, (
            recipe.id,
            signatures.get(signature),
        )
        signatures[signature] = recipe.id


def test_major_ingredient_categories_and_recipe_styles_are_covered() -> None:
    recipes = load_recipe_catalog()
    ingredient_by_id = {item.id: item for item in load_ingredient_catalog().all()}

    covered_categories = {
        ingredient_by_id[item.ingredient_id].category
        for recipe in recipes
        for item in (*recipe.required, *recipe.optional)
    }
    covered_styles = {
        tag
        for recipe in recipes
        for tag in recipe.tags
    }

    assert MAJOR_CATEGORIES <= covered_categories
    assert MAJOR_STYLES <= covered_styles


def test_common_pantries_have_exact_stored_options() -> None:
    recipes = load_recipe_catalog()
    pantries = [
        {"banana", "strawberry", "oat_milk"},
        {"mango", "pineapple", "coconut_water"},
        {"watermelon", "coconut_water", "mint"},
        {"apple", "cucumber", "water", "lemon_juice"},
    ]

    for pantry in pantries:
        matches = rank_recipes(recipes, pantry)
        assert any(match.exact for match in matches), pantry


def test_real_world_validation_subset_is_representative_and_valid() -> None:
    recipes = {recipe.id: recipe for recipe in load_recipe_catalog()}
    subset = json.loads(SUBSET_PATH.read_text(encoding="utf-8"))
    subset_ids = [entry["recipe_id"] for entry in subset]

    assert len(subset_ids) == 8
    assert len(subset_ids) == len(set(subset_ids))
    assert set(subset_ids) <= recipes.keys()

    subset_tags = {
        tag
        for recipe_id in subset_ids
        for tag in recipes[recipe_id].tags
    }
    assert {"tropisch", "grün", "frühstück", "protein", "frisch"} <= subset_tags
