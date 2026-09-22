"""Tests for human-readable recipe-card presentation helpers."""

from components.recipe_cards import generated_recipe_tags, generated_recipe_title
from smoothie import GeneratedSmoothie, load_ingredient_catalog


def test_generated_recipe_title_uses_main_fruits() -> None:
    catalog = load_ingredient_catalog()
    by_id = {item.id: item for item in catalog.all()}
    candidate = GeneratedSmoothie(
        ingredient_ids=("banana", "strawberry", "oat_milk"),
        roles=(
            ("banana", "main_fruit"),
            ("strawberry", "main_fruit"),
            ("oat_milk", "liquid"),
        ),
    )

    assert generated_recipe_title(candidate, by_id) == "Banane-Erdbeere-Smoothie"


def test_generated_recipe_tags_are_user_facing_and_deterministic() -> None:
    catalog = load_ingredient_catalog()
    by_id = {item.id: item for item in catalog.all()}
    candidate = GeneratedSmoothie(
        ingredient_ids=("banana", "oat_milk"),
        roles=(("banana", "main_fruit"), ("oat_milk", "liquid")),
    )

    first = generated_recipe_tags(candidate, by_id)
    second = generated_recipe_tags(candidate, by_id)

    assert first == second
    assert "Vegan" in first
    assert all("_" not in tag for tag in first)
