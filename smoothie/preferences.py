"""Local user preferences, restrictions, favorites and recipe feedback."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
import json
import os
from pathlib import Path
from typing import Any

from .generator import GeneratedSmoothie
from .ingredient_catalog import IngredientCatalog
from .matcher import RecipeMatch
from .recipes import Recipe
from .scoring import ScoringContext

_PROJECT_DATA_DIR = Path(__file__).resolve().parents[1] / "data"
_STATE_DIR = Path(os.environ.get("SMOOTHIE_STATE_DIR", _PROJECT_DATA_DIR))
DEFAULT_PREFERENCES_PATH = _STATE_DIR / "user_preferences.local.json"


class FeedbackValue(StrEnum):
    LIKED = "liked"
    NEUTRAL = "neutral"
    DO_NOT_SUGGEST = "do_not_suggest"


@dataclass
class UserPreferences:
    favorite_ingredients: set[str] = field(default_factory=set)
    favorite_recipes: set[str] = field(default_factory=set)
    excluded_ingredients: set[str] = field(default_factory=set)
    allergies: set[str] = field(default_factory=set)
    vegan: bool = False
    vegetarian: bool = False
    dairy_free: bool = False
    desired_sweetness: int | None = None
    desired_creaminess: int | None = None
    refreshing: bool = False
    filling: bool = False
    protein_rich: bool = False
    lower_calorie: bool = False
    breakfast: bool = False
    post_workout: bool = False
    feedback: dict[str, FeedbackValue] = field(default_factory=dict)

    def __post_init__(self) -> None:
        for name in ("desired_sweetness", "desired_creaminess"):
            value = getattr(self, name)
            if value is not None and (
                not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 5
            ):
                raise ValueError(f"{name} must be None or an integer from 0 to 5")
        self.feedback = {
            key: value if isinstance(value, FeedbackValue) else FeedbackValue(value)
            for key, value in self.feedback.items()
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "UserPreferences":
        return cls(
            favorite_ingredients=set(data.get("favorite_ingredients", [])),
            favorite_recipes=set(data.get("favorite_recipes", [])),
            excluded_ingredients=set(data.get("excluded_ingredients", [])),
            allergies=set(data.get("allergies", [])),
            vegan=bool(data.get("vegan", False)),
            vegetarian=bool(data.get("vegetarian", False)),
            dairy_free=bool(data.get("dairy_free", False)),
            desired_sweetness=data.get("desired_sweetness"),
            desired_creaminess=data.get("desired_creaminess"),
            refreshing=bool(data.get("refreshing", False)),
            filling=bool(data.get("filling", False)),
            protein_rich=bool(data.get("protein_rich", False)),
            lower_calorie=bool(data.get("lower_calorie", False)),
            breakfast=bool(data.get("breakfast", False)),
            post_workout=bool(data.get("post_workout", False)),
            feedback=dict(data.get("feedback", {})),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "favorite_ingredients": sorted(self.favorite_ingredients),
            "favorite_recipes": sorted(self.favorite_recipes),
            "excluded_ingredients": sorted(self.excluded_ingredients),
            "allergies": sorted(self.allergies),
            "vegan": self.vegan,
            "vegetarian": self.vegetarian,
            "dairy_free": self.dairy_free,
            "desired_sweetness": self.desired_sweetness,
            "desired_creaminess": self.desired_creaminess,
            "refreshing": self.refreshing,
            "filling": self.filling,
            "protein_rich": self.protein_rich,
            "lower_calorie": self.lower_calorie,
            "breakfast": self.breakfast,
            "post_workout": self.post_workout,
            "feedback": {key: value.value for key, value in sorted(self.feedback.items())},
        }


class PreferenceStore:
    """Persist a single private profile as local JSON."""

    def __init__(self, path: Path | str = DEFAULT_PREFERENCES_PATH) -> None:
        self.path = Path(path)

    def load(self) -> UserPreferences:
        if not self.path.exists():
            return UserPreferences()
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError(f"Could not load preferences from {self.path}: {exc}") from exc
        if not isinstance(payload, dict):
            raise ValueError("Preference data root must be a JSON object")
        return UserPreferences.from_dict(payload)

    def save(self, preferences: UserPreferences) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(self.path.suffix + ".tmp")
        temporary.write_text(
            json.dumps(preferences.to_dict(), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(self.path)

    def reset(self) -> None:
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass


def generated_feedback_key(candidate: GeneratedSmoothie) -> str:
    return "generated:" + ",".join(sorted(candidate.ingredient_ids))


def stored_feedback_key(recipe: Recipe | str) -> str:
    recipe_id = recipe if isinstance(recipe, str) else recipe.id
    return f"stored:{recipe_id}"


def ingredient_allowed(
    ingredient_id: str,
    preferences: UserPreferences,
    catalog: IngredientCatalog,
) -> bool:
    ingredient = catalog.require(ingredient_id)
    if ingredient_id in preferences.excluded_ingredients:
        return False
    if preferences.vegan and not ingredient.vegan:
        return False
    if preferences.dairy_free and "milk" in ingredient.allergens:
        return False
    if preferences.allergies.intersection(ingredient.allergens):
        return False
    return True


def filter_pantry(
    pantry_ids: list[str] | tuple[str, ...] | set[str] | frozenset[str],
    preferences: UserPreferences,
    catalog: IngredientCatalog,
) -> list[str]:
    return [
        ingredient_id
        for ingredient_id in dict.fromkeys(pantry_ids)
        if catalog.resolve(ingredient_id) is not None
        and ingredient_allowed(ingredient_id, preferences, catalog)
    ]


def recipe_allowed(
    recipe: Recipe,
    preferences: UserPreferences,
    catalog: IngredientCatalog,
) -> bool:
    if preferences.feedback.get(stored_feedback_key(recipe)) == FeedbackValue.DO_NOT_SUGGEST:
        return False
    return all(
        ingredient_allowed(item.ingredient_id, preferences, catalog)
        for item in recipe.required
    )


def candidate_allowed(candidate: GeneratedSmoothie, preferences: UserPreferences) -> bool:
    return (
        preferences.feedback.get(generated_feedback_key(candidate))
        != FeedbackValue.DO_NOT_SUGGEST
    )


def scoring_context_from_preferences(
    preferences: UserPreferences,
    pantry_ids: list[str] | tuple[str, ...] | set[str] | frozenset[str],
) -> ScoringContext:
    goals = {
        name
        for name in (
            "refreshing",
            "filling",
            "protein_rich",
            "lower_calorie",
            "breakfast",
            "post_workout",
        )
        if getattr(preferences, name)
    }
    liked = {
        key
        for key, value in preferences.feedback.items()
        if value == FeedbackValue.LIKED and key.startswith("generated:")
    }
    liked.update(
        key for key in preferences.favorite_recipes if key.startswith("generated:")
    )
    return ScoringContext(
        pantry_ids=frozenset(pantry_ids),
        preferred_ids=frozenset(preferences.favorite_ingredients),
        desired_sweetness=preferences.desired_sweetness,
        desired_creaminess=preferences.desired_creaminess,
        goals=frozenset(goals),
        liked_candidate_keys=frozenset(liked),
    )


def set_feedback(
    preferences: UserPreferences,
    recipe_key: str,
    value: FeedbackValue,
) -> None:
    if not recipe_key:
        raise ValueError("recipe_key must not be empty")
    preferences.feedback[recipe_key] = value


def clear_feedback(preferences: UserPreferences) -> None:
    preferences.feedback.clear()


def rank_stored_matches_with_preferences(
    matches: list[RecipeMatch],
    preferences: UserPreferences,
) -> list[RecipeMatch]:
    """Apply small, transparent soft boosts without overriding pantry availability."""

    def bonus(match: RecipeMatch) -> float:
        key = stored_feedback_key(match.recipe)
        value = 0.0
        if key in preferences.favorite_recipes:
            value += 0.08
        if preferences.feedback.get(key) == FeedbackValue.LIKED:
            value += 0.08
        required = {item.ingredient_id for item in match.recipe.required}
        if preferences.favorite_ingredients and required:
            value += (
                len(required & preferences.favorite_ingredients) / len(required)
            ) * 0.05
        goal_tags = {
            "breakfast": "frühstück",
            "protein_rich": "protein",
            "refreshing": "frisch",
            "filling": "sättigend",
        }
        for goal, tag in goal_tags.items():
            if getattr(preferences, goal) and tag in match.recipe.tags:
                value += 0.03
        return min(value, 0.20)

    return sorted(
        matches,
        key=lambda match: (
            not match.exact,
            -(match.score + bonus(match)),
            len(match.missing_required),
            match.recipe.id,
        ),
    )
