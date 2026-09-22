"""Tests for local preferences, hard restrictions and transparent feedback learning."""
from pathlib import Path

from smoothie import (
    CandidateScorer,
    FeedbackValue,
    GeneratedSmoothie,
    PreferenceStore,
    Recipe,
    RecipeIngredient,
    RecipeMatch,
    ScoringWeights,
    SmoothieGenerator,
    UserPreferences,
    candidate_allowed,
    clear_feedback,
    filter_pantry,
    generated_feedback_key,
    load_ingredient_catalog,
    load_nutrition_catalog,
    rank_generated_candidates,
    rank_stored_matches_with_preferences,
    recipe_allowed,
    scoring_context_from_preferences,
    set_feedback,
    stored_feedback_key,
)


def candidate(*pairs: tuple[str, str]) -> GeneratedSmoothie:
    return GeneratedSmoothie(
        ingredient_ids=tuple(item_id for item_id, _ in pairs),
        roles=tuple(pairs),
    )


def test_preferences_round_trip_survives_new_store_instance(tmp_path: Path) -> None:
    path = tmp_path / "preferences.json"
    preferences = UserPreferences(
        favorite_ingredients={"mango"},
        favorite_recipes={"stored:tropical"},
        excluded_ingredients={"honey"},
        allergies={"nuts"},
        vegan=True,
        vegetarian=True,
        dairy_free=True,
        desired_sweetness=3,
        desired_creaminess=2,
        refreshing=True,
        post_workout=True,
        feedback={"stored:tropical": FeedbackValue.LIKED},
    )

    PreferenceStore(path).save(preferences)
    loaded = PreferenceStore(path).load()

    assert loaded.to_dict() == preferences.to_dict()


def test_reset_and_feedback_reset_are_persistent(tmp_path: Path) -> None:
    path = tmp_path / "preferences.json"
    store = PreferenceStore(path)
    preferences = UserPreferences()
    set_feedback(preferences, "stored:test", FeedbackValue.DO_NOT_SUGGEST)
    store.save(preferences)

    clear_feedback(preferences)
    store.save(preferences)
    assert PreferenceStore(path).load().feedback == {}

    store.reset()
    assert not path.exists()
    assert store.load().to_dict() == UserPreferences().to_dict()


def test_hard_restrictions_filter_excluded_allergen_dairy_and_nonvegan() -> None:
    catalog = load_ingredient_catalog()
    preferences = UserPreferences(
        excluded_ingredients={"banana"},
        allergies={"nuts"},
        vegan=True,
        dairy_free=True,
    )
    pantry = ["banana", "almond_milk", "yogurt", "honey", "strawberry", "oat_milk"]

    filtered = filter_pantry(pantry, preferences, catalog)

    assert filtered == ["strawberry", "oat_milk"]


def test_restricted_ingredients_never_reach_generated_candidates() -> None:
    catalog = load_ingredient_catalog()
    preferences = UserPreferences(vegan=True, excluded_ingredients={"honey"})
    pantry = filter_pantry(
        ["banana", "strawberry", "oat_milk", "yogurt", "honey"],
        preferences,
        catalog,
    )

    generated = SmoothieGenerator(catalog).generate(pantry, count=20, seed=5)

    assert generated
    assert all("yogurt" not in item.ingredient_ids for item in generated)
    assert all("honey" not in item.ingredient_ids for item in generated)


def test_do_not_suggest_hides_generated_and_stored_recipes() -> None:
    catalog = load_ingredient_catalog()
    generated = candidate(("banana", "main_fruit"), ("water", "liquid"))
    recipe = Recipe(
        id="simple",
        name_de="Einfach",
        required=(
            RecipeIngredient("banana", 100, "g"),
            RecipeIngredient("water", 200, "ml"),
        ),
    )
    preferences = UserPreferences(
        feedback={
            generated_feedback_key(generated): FeedbackValue.DO_NOT_SUGGEST,
            stored_feedback_key(recipe): FeedbackValue.DO_NOT_SUGGEST,
        }
    )

    assert not candidate_allowed(generated, preferences)
    assert not recipe_allowed(recipe, preferences, catalog)


def test_favorite_ingredient_changes_generated_ranking() -> None:
    catalog = load_ingredient_catalog()
    nutrition = load_nutrition_catalog(ingredient_catalog=catalog)
    weights = ScoringWeights(
        pantry_availability=0,
        flavor_balance=0,
        compatibility=0,
        texture_balance=0,
        liquid_ratio=0,
        intensity=0,
        nutrition_fit=0,
        preference_fit=1,
        penalty_scale=0,
    )
    scorer = CandidateScorer(catalog, weights, nutrition_catalog=nutrition)
    banana = candidate(("banana", "main_fruit"), ("water", "liquid"))
    mango = candidate(("mango", "main_fruit"), ("water", "liquid"))
    preferences = UserPreferences(favorite_ingredients={"mango"})
    context = scoring_context_from_preferences(
        preferences,
        {"banana", "mango", "water"},
    )

    ranked = rank_generated_candidates([banana, mango], scorer, context)

    assert ranked[0].candidate == mango
    assert ranked[0].total > ranked[1].total


def test_liked_feedback_changes_later_generated_ranking() -> None:
    catalog = load_ingredient_catalog()
    weights = ScoringWeights(
        pantry_availability=0,
        flavor_balance=0,
        compatibility=0,
        texture_balance=0,
        liquid_ratio=0,
        intensity=0,
        nutrition_fit=0,
        preference_fit=1,
        penalty_scale=0,
    )
    scorer = CandidateScorer(catalog, weights)
    banana = candidate(("banana", "main_fruit"), ("water", "liquid"))
    mango = candidate(("mango", "main_fruit"), ("water", "liquid"))
    preferences = UserPreferences(
        feedback={generated_feedback_key(banana): FeedbackValue.LIKED}
    )

    ranked = rank_generated_candidates(
        [mango, banana],
        scorer,
        scoring_context_from_preferences(preferences, {"banana", "mango", "water"}),
    )

    assert ranked[0].candidate == banana


def test_stored_favorite_is_bounded_soft_boost() -> None:
    first = Recipe(
        id="first",
        name_de="Erstes",
        required=(RecipeIngredient("banana", 100, "g"),),
    )
    second = Recipe(
        id="second",
        name_de="Zweites",
        required=(RecipeIngredient("mango", 100, "g"),),
    )
    matches = [
        RecipeMatch(first, 0.8, ("banana",), ()),
        RecipeMatch(second, 0.8, ("mango",), ()),
    ]
    preferences = UserPreferences(favorite_recipes={stored_feedback_key(second)})

    ranked = rank_stored_matches_with_preferences(matches, preferences)

    assert ranked[0].recipe.id == "second"


def test_personalization_never_pushes_partial_match_above_exact_match() -> None:
    exact_recipe = Recipe(
        id="exact",
        name_de="Exakt",
        required=(RecipeIngredient("banana", 100, "g"),),
    )
    partial_recipe = Recipe(
        id="partial",
        name_de="Teiltreffer",
        required=(RecipeIngredient("mango", 100, "g"),),
    )
    matches = [
        RecipeMatch(exact_recipe, 1.0, (), ()),
        RecipeMatch(partial_recipe, 0.9, ("mango",), ()),
    ]
    preferences = UserPreferences(
        favorite_recipes={stored_feedback_key(partial_recipe)},
        feedback={stored_feedback_key(partial_recipe): FeedbackValue.LIKED},
    )

    ranked = rank_stored_matches_with_preferences(matches, preferences)

    assert ranked[0].recipe.id == "exact"
