"""Tests for stored recipe loading and deterministic pantry matching."""
from smoothie import load_recipe_catalog, match_recipe, rank_recipes

def test_recipe_catalog_loads_curated_set() -> None:
    recipes=load_recipe_catalog(); assert len(recipes)>=10

def test_exact_match_scores_one_and_optional_does_not_lower_score() -> None:
    recipe=next(r for r in load_recipe_catalog() if r.id=="strawberry_banana")
    match=match_recipe(recipe,{"banana","strawberry","oat_milk"})
    assert match.exact and match.score==1.0 and match.missing_required==()

def test_partial_match_reports_missing_required() -> None:
    recipe=next(r for r in load_recipe_catalog() if r.id=="peanut_banana")
    match=match_recipe(recipe,{"banana","oat_milk"})
    assert match.score==2/3 and match.missing_required==("peanut_butter",)

def test_known_substitution_counts_as_available() -> None:
    recipe=next(r for r in load_recipe_catalog() if r.id=="strawberry_banana")
    match=match_recipe(recipe,{"banana","strawberry","almond_milk"})
    assert match.exact and match.score==1.0
    assert match.substitutions_used==(("oat_milk","almond_milk"),)

def test_ranking_is_deterministic_and_exact_first() -> None:
    recipes=load_recipe_catalog(); pantry={"banana","strawberry","oat_milk"}
    first=rank_recipes(recipes,pantry); second=rank_recipes(recipes,pantry)
    assert [m.recipe.id for m in first]==[m.recipe.id for m in second]
    assert first[0].recipe.id=="strawberry_banana" and first[0].exact
