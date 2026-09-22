"""Tests for transparent candidate scoring and deterministic ranking."""

from smoothie import (
    CandidateScorer,
    GeneratedSmoothie,
    ScoringContext,
    ScoringWeights,
    load_ingredient_catalog,
    rank_generated_candidates,
)


def candidate(*pairs: tuple[str, str]) -> GeneratedSmoothie:
    return GeneratedSmoothie(
        ingredient_ids=tuple(item_id for item_id, _ in pairs),
        roles=tuple(pairs),
    )


def test_balanced_candidate_outranks_overly_acidic_intense_candidate() -> None:
    scorer = CandidateScorer(load_ingredient_catalog())
    balanced = candidate(
        ("banana", "main_fruit"),
        ("strawberry", "main_fruit"),
        ("oat_milk", "liquid"),
    )
    harsh = candidate(
        ("orange", "main_fruit"),
        ("pineapple", "main_fruit"),
        ("orange_juice", "liquid"),
        ("lemon_juice", "extra"),
    )

    ranked = rank_generated_candidates([harsh, balanced], scorer)

    assert ranked[0].candidate == balanced
    assert ranked[0].total > ranked[1].total
    assert ranked[1].penalties["excess_acidity"] > 0


def test_score_exposes_all_requested_components() -> None:
    scorer = CandidateScorer(load_ingredient_catalog())
    item = candidate(("banana", "main_fruit"), ("oat_milk", "liquid"))
    score = scorer.score(
        item,
        ScoringContext(
            pantry_ids=frozenset({"banana", "oat_milk"}),
            preferred_ids=frozenset({"banana"}),
        ),
    )

    assert set(score.components) == {
        "pantry_availability",
        "flavor_balance",
        "compatibility",
        "texture_balance",
        "liquid_ratio",
        "intensity",
        "nutrition_fit",
        "preference_fit",
    }
    assert score.components["pantry_availability"] == 1.0
    assert score.components["preference_fit"] == 1.0
    assert score.explanations


def test_custom_weights_change_ranking_toward_preferred_ingredients() -> None:
    catalog = load_ingredient_catalog()
    default = CandidateScorer(catalog)
    preference_heavy = CandidateScorer(
        catalog,
        ScoringWeights(
            pantry_availability=0,
            flavor_balance=0,
            compatibility=0,
            texture_balance=0,
            liquid_ratio=0,
            intensity=0,
            nutrition_fit=0,
            preference_fit=1,
            penalty_scale=0,
        ),
    )
    banana = candidate(("banana", "main_fruit"), ("water", "liquid"))
    mango = candidate(("mango", "main_fruit"), ("water", "liquid"))
    context = ScoringContext(preferred_ids=frozenset({"mango"}))

    assert preference_heavy.score(mango, context).total > preference_heavy.score(banana, context).total
    assert default.score(mango, context).components["preference_fit"] == 1.0


def test_near_identical_variants_are_deduplicated_by_core_roles() -> None:
    scorer = CandidateScorer(load_ingredient_catalog())
    base = candidate(("banana", "main_fruit"), ("oat_milk", "liquid"))
    with_extra = candidate(
        ("banana", "main_fruit"),
        ("oat_milk", "liquid"),
        ("cinnamon", "extra"),
    )

    ranked = rank_generated_candidates([with_extra, base], scorer)

    assert len(ranked) == 1
    assert set(ranked[0].candidate.ingredient_ids) >= {"banana", "oat_milk"}


def test_ranking_is_deterministic_independent_of_input_order() -> None:
    scorer = CandidateScorer(load_ingredient_catalog())
    candidates = [
        candidate(("banana", "main_fruit"), ("water", "liquid")),
        candidate(("mango", "main_fruit"), ("water", "liquid")),
        candidate(("strawberry", "main_fruit"), ("oat_milk", "liquid")),
    ]

    first = rank_generated_candidates(candidates, scorer)
    second = rank_generated_candidates(list(reversed(candidates)), scorer)

    assert [item.candidate.ingredient_ids for item in first] == [
        item.candidate.ingredient_ids for item in second
    ]
