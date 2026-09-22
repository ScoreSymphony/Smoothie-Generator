"""Tests for serving quantities and offline nutrition aggregation."""

import pytest

from smoothie import (
    GeneratedSmoothie,
    NutritionCalculator,
    QuantifiedIngredient,
    Quantity,
    QuantityCalculator,
    QuantityUnit,
    load_ingredient_catalog,
    load_nutrition_catalog,
    load_recipe_catalog,
)


def generated_candidate() -> GeneratedSmoothie:
    return GeneratedSmoothie(
        ingredient_ids=("banana", "strawberry", "oat_milk"),
        roles=(
            ("banana", "main_fruit"),
            ("strawberry", "main_fruit"),
            ("oat_milk", "liquid"),
        ),
    )


def test_generated_one_serving_amounts_stay_within_ingredient_bounds() -> None:
    catalog = load_ingredient_catalog()
    quantified = QuantityCalculator(catalog).for_generated(generated_candidate(), servings=1)

    for item in quantified.ingredients:
        ingredient = catalog.require(item.ingredient_id)
        assert item.quantity.unit.value == ingredient.typical_amount.unit
        assert ingredient.typical_amount.minimum <= item.quantity.amount <= ingredient.typical_amount.maximum


def test_generated_quantities_scale_consistently_with_servings() -> None:
    calculator = QuantityCalculator(load_ingredient_catalog())
    one = calculator.for_generated(generated_candidate(), servings=1)
    two = calculator.for_generated(generated_candidate(), servings=2)

    assert [item.ingredient_id for item in one.ingredients] == [item.ingredient_id for item in two.ingredients]
    for first, second in zip(one.ingredients, two.ingredients, strict=True):
        assert second.quantity.amount == first.quantity.amount * 2
        assert second.quantity.unit == first.quantity.unit


def test_stored_recipe_scaling_normalizes_common_units() -> None:
    catalog = load_ingredient_catalog()
    recipe = next(item for item in load_recipe_catalog() if item.id == "strawberry_banana")
    scaled = QuantityCalculator(catalog).for_stored(recipe, servings=2)

    banana = next(item for item in scaled.required if item.ingredient_id == "banana")
    milk = next(item for item in scaled.required if item.ingredient_id == "oat_milk")
    assert banana.quantity == Quantity(2, QuantityUnit.PIECE)
    assert milk.quantity == Quantity(400, QuantityUnit.ML)


def test_nutrition_catalog_covers_every_ingredient() -> None:
    ingredients = load_ingredient_catalog()
    nutrition = load_nutrition_catalog(ingredient_catalog=ingredients)
    assert len(nutrition) == len(ingredients)


def test_nutrition_aggregation_uses_local_per_100g_values() -> None:
    ingredients = load_ingredient_catalog()
    nutrition = load_nutrition_catalog(ingredient_catalog=ingredients)
    calculator = NutritionCalculator(ingredients, nutrition)
    facts = calculator.calculate(
        [QuantifiedIngredient("banana", Quantity(100, QuantityUnit.G))]
    )

    assert facts.calories == 89.0
    assert facts.protein_g == 1.1
    assert facts.fiber_g == 2.6


def test_doubling_servings_doubles_aggregated_nutrition() -> None:
    ingredients = load_ingredient_catalog()
    quantities = QuantityCalculator(ingredients)
    nutrition = NutritionCalculator(
        ingredients,
        load_nutrition_catalog(ingredient_catalog=ingredients),
    )
    one = quantities.for_generated(generated_candidate(), servings=1)
    two = quantities.for_generated(generated_candidate(), servings=2)
    one_facts = nutrition.calculate(one.ingredients)
    two_facts = nutrition.calculate(two.ingredients)

    assert two_facts.calories == pytest.approx(one_facts.calories * 2)
    assert two_facts.protein_g == pytest.approx(one_facts.protein_g * 2)
    assert two_facts.carbohydrates_g == pytest.approx(one_facts.carbohydrates_g * 2)
