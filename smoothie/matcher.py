"""Deterministic set-based pantry matcher for stored recipes."""
from __future__ import annotations
from dataclasses import dataclass
from .recipes import Recipe

@dataclass(frozen=True)
class RecipeMatch:
    recipe: Recipe
    score: float
    missing_required: tuple[str,...]
    substitutions_used: tuple[tuple[str,str],...]
    @property
    def exact(self) -> bool: return not self.missing_required


def match_recipe(recipe: Recipe, pantry_ids: set[str]|frozenset[str]) -> RecipeMatch:
    pantry=set(pantry_ids); missing=[]; used=[]
    substitutions={g.target_id:g.alternatives for g in recipe.substitutions}
    for item in recipe.required:
        if item.ingredient_id in pantry: continue
        replacement=next((x for x in substitutions.get(item.ingredient_id,()) if x in pantry),None)
        if replacement: used.append((item.ingredient_id,replacement))
        else: missing.append(item.ingredient_id)
    total=len(recipe.required)
    score=(total-len(missing))/total if total else 1.0
    return RecipeMatch(recipe,score,tuple(missing),tuple(used))


def rank_recipes(recipes: tuple[Recipe,...]|list[Recipe], pantry_ids: set[str]|frozenset[str]) -> list[RecipeMatch]:
    matches=[match_recipe(r,pantry_ids) for r in recipes]
    return sorted(matches,key=lambda m:(-m.score,len(m.missing_required),m.recipe.id))
