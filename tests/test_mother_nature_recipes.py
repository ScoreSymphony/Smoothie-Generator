"""Regression tests for the 20 smoothies imported from the supplied recipe graphic."""

from smoothie import (
    NutritionCalculator,
    QuantityCalculator,
    load_ingredient_catalog,
    load_nutrition_catalog,
    load_recipe_catalog,
)

EXPECTED_REQUIRED = {
    "mn_green_power": {"spinach","banana","cucumber","apple","lemon","ginger","water"},
    "mn_berry_boost": {"strawberry","blueberry","banana","oats","chia_seeds","almond_milk","cinnamon"},
    "mn_tropical_glow": {"mango","pineapple","banana","coconut_water","lime","chia_seeds"},
    "mn_waldkraft": {"blueberry","blackberry","banana","flax_seeds","oats","water"},
    "mn_detox_green": {"kale","cucumber","celery","apple","lemon","parsley","ginger"},
    "mn_sunshine": {"orange","carrot","mango","ginger","lemon","turmeric","water"},
    "mn_pink_paradise": {"raspberry","banana","beetroot","oats","almond_milk","cinnamon"},
    "mn_garden_fresh": {"spinach","avocado","cucumber","apple","mint","lemon","water"},
    "mn_exotik_energie": {"pineapple","mango","banana","passion_fruit","coconut_water","lime"},
    "mn_knoblauch_power": {"spinach","cucumber","parsley","apple","garlic","lemon","ginger"},
    "mn_schoko_banane": {"banana","cocoa","oats","almond_butter","almond_milk","cinnamon"},
    "mn_rote_kraft": {"beetroot","carrot","apple","ginger","lemon","water"},
    "mn_summer_fresh": {"watermelon","strawberry","mint","lime","chia_seeds"},
    "mn_protein_green": {"spinach","banana","skyr","flax_seeds","cucumber","lemon"},
    "mn_apfel_zimt": {"apple","banana","oats","almond_milk","cinnamon","flax_seeds"},
    "mn_herbst_mix": {"pumpkin","apple","carrot","ginger","cinnamon","oats","water"},
    "mn_fruchtiger_fruehling": {"kiwi","banana","spinach","apple","lemon","mint"},
    "mn_beeren_gruen": {"blueberry","spinach","banana","chia_seeds","almond_milk","lemon"},
    "mn_creamy_avocado": {"avocado","banana","spinach","lime","almond_milk","chia_seeds"},
    "mn_wild_nature": {"kale","spinach","cucumber","apple","ginger","lemon"},
}


def test_all_twenty_graphic_recipes_are_present_with_declared_ingredients() -> None:
    recipes = {recipe.id: recipe for recipe in load_recipe_catalog()}

    assert set(EXPECTED_REQUIRED) <= set(recipes)
    for recipe_id, required_ids in EXPECTED_REQUIRED.items():
        recipe = recipes[recipe_id]
        assert {item.ingredient_id for item in recipe.required} == required_ids


def test_graphic_specific_optional_and_substitution_details_are_preserved() -> None:
    recipes = {recipe.id: recipe for recipe in load_recipe_catalog()}

    wild = recipes["mn_wild_nature"]
    assert {item.ingredient_id for item in wild.optional} == {"nettle"}

    protein = recipes["mn_protein_green"]
    assert any(
        group.target_id == "skyr" and "yogurt" in group.alternatives
        for group in protein.substitutions
    )


def test_new_ingredients_and_nutrition_are_available_offline() -> None:
    ingredients = load_ingredient_catalog()
    nutrition = load_nutrition_catalog(ingredient_catalog=ingredients)

    for ingredient_id in ("garlic", "pumpkin", "nettle"):
        assert ingredients.require(ingredient_id)
        assert nutrition.require(ingredient_id).calories >= 0


def test_all_twenty_recipes_scale_and_calculate_nutrition() -> None:
    ingredients = load_ingredient_catalog()
    recipes = {recipe.id: recipe for recipe in load_recipe_catalog()}
    quantities = QuantityCalculator(ingredients)
    nutrition = NutritionCalculator(
        ingredients,
        load_nutrition_catalog(ingredient_catalog=ingredients),
    )

    for recipe_id in EXPECTED_REQUIRED:
        quantified = quantities.for_stored(recipes[recipe_id], servings=2)
        facts = nutrition.calculate(quantified.required)
        assert quantified.servings == 2
        assert quantified.required
        assert facts.calories >= 0
