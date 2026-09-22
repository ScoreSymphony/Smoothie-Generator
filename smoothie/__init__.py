"""Core Smoothie Generator domain package."""
from .generator import GeneratedSmoothie, SmoothieGenerator
from .ingredient_catalog import IngredientCatalog, load_ingredient_catalog
from .ingredients import AmountRange, Ingredient, IngredientCategory
from .matcher import RecipeMatch, match_recipe, rank_recipes
from .nutrition import (
    NutritionCalculator,
    NutritionCatalog,
    NutritionFacts,
    load_nutrition_catalog,
)
from .pantry import PantryState, parse_free_text
from .preferences import (
    FeedbackValue,
    PreferenceStore,
    UserPreferences,
    candidate_allowed,
    clear_feedback,
    filter_pantry,
    generated_feedback_key,
    ingredient_allowed,
    recipe_allowed,
    rank_stored_matches_with_preferences,
    scoring_context_from_preferences,
    set_feedback,
    stored_feedback_key,
)
from .quantities import (
    QuantifiedIngredient,
    QuantifiedRecipe,
    QuantifiedSmoothie,
    Quantity,
    QuantityCalculator,
    QuantityUnit,
)
from .recipe_catalog import load_recipe_catalog
from .recipes import Recipe, RecipeIngredient, SubstitutionGroup
from .scoring import (
    CandidateScore,
    CandidateScorer,
    ScoringContext,
    ScoringWeights,
    rank_generated_candidates,
)

__all__ = [
    "AmountRange",
    "CandidateScore",
    "CandidateScorer",
    "FeedbackValue",
    "GeneratedSmoothie",
    "Ingredient",
    "IngredientCatalog",
    "IngredientCategory",
    "NutritionCalculator",
    "NutritionCatalog",
    "NutritionFacts",
    "PantryState",
    "PreferenceStore",
    "QuantifiedIngredient",
    "QuantifiedRecipe",
    "QuantifiedSmoothie",
    "Quantity",
    "QuantityCalculator",
    "QuantityUnit",
    "Recipe",
    "RecipeIngredient",
    "RecipeMatch",
    "ScoringContext",
    "ScoringWeights",
    "SmoothieGenerator",
    "SubstitutionGroup",
    "UserPreferences",
    "candidate_allowed",
    "clear_feedback",
    "filter_pantry",
    "generated_feedback_key",
    "ingredient_allowed",
    "recipe_allowed",
    "rank_stored_matches_with_preferences",
    "scoring_context_from_preferences",
    "set_feedback",
    "stored_feedback_key",
    "load_ingredient_catalog",
    "load_nutrition_catalog",
    "load_recipe_catalog",
    "match_recipe",
    "parse_free_text",
    "rank_generated_candidates",
    "rank_recipes",
]
