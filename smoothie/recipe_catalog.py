"""Loader and validation for curated stored recipes."""
from __future__ import annotations
import json
from pathlib import Path
from .ingredient_catalog import IngredientCatalog, load_ingredient_catalog
from .recipes import Recipe

DEFAULT_RECIPES_PATH=Path(__file__).resolve().parents[1]/"data"/"recipes.json"

def load_recipe_catalog(path: Path|str=DEFAULT_RECIPES_PATH, ingredient_catalog: IngredientCatalog|None=None) -> tuple[Recipe,...]:
    ingredient_catalog=ingredient_catalog or load_ingredient_catalog()
    try: payload=json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError,json.JSONDecodeError) as exc: raise ValueError(f"Could not load recipe data: {exc}") from exc
    if not isinstance(payload,list): raise ValueError("Recipe data root must be a JSON array")
    recipes=tuple(Recipe.from_dict(x) for x in payload)
    ids=set()
    known={x.id for x in ingredient_catalog.all()}
    for recipe in recipes:
        if recipe.id in ids: raise ValueError(f"Duplicate recipe id: {recipe.id}")
        ids.add(recipe.id)
        referenced={x.ingredient_id for x in (*recipe.required,*recipe.optional)}
        for group in recipe.substitutions: referenced.add(group.target_id); referenced.update(group.alternatives)
        unknown=referenced-known
        if unknown: raise ValueError(f"{recipe.id}: unknown ingredient ids: {sorted(unknown)}")
    return recipes
