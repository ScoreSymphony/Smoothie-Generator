"""Print reproducible physical-validation recipes from the current engine."""
from __future__ import annotations

import argparse
import json

from smoothie import (
    CandidateScorer,
    QuantityCalculator,
    ScoringWeights,
    SmoothieGenerator,
    UserPreferences,
    load_ingredient_catalog,
    load_nutrition_catalog,
    rank_generated_candidates,
    scoring_context_from_preferences,
)

VALIDATION_CASES = {
    "R1": {
        "pantry": ("banana", "strawberry", "oat_milk"),
        "required": ("banana", "strawberry", "oat_milk"),
    },
    "R2": {
        "pantry": ("mango", "pineapple", "coconut_water"),
        "required": ("mango", "pineapple", "coconut_water"),
    },
    "R3": {
        "pantry": ("mango", "banana", "spinach", "water"),
        "required": ("mango", "banana", "spinach", "water"),
    },
    "R4": {
        "pantry": ("banana", "peanut_butter", "oat_milk"),
        "required": ("banana", "peanut_butter", "oat_milk"),
    },
    "R5": {
        "pantry": ("blueberry", "banana", "chia_seeds", "almond_milk"),
        "required": ("blueberry", "banana", "chia_seeds", "almond_milk"),
    },
    "R6": {
        "pantry": ("orange", "mango", "orange_juice", "ginger"),
        "required": ("orange", "mango", "orange_juice", "ginger"),
    },
}


def build_case(case_id: str) -> dict:
    catalog = load_ingredient_catalog()
    nutrition = load_nutrition_catalog(ingredient_catalog=catalog)
    case = VALIDATION_CASES[case_id]
    pantry = case["pantry"]
    required = frozenset(case["required"])
    preferences = UserPreferences()

    pool = SmoothieGenerator(catalog).generate(pantry, count=300, seed=0)
    focused_pool = [
        candidate
        for candidate in pool
        if required <= set(candidate.ingredient_ids)
    ]
    ranked = rank_generated_candidates(
        focused_pool,
        CandidateScorer(
            catalog,
            ScoringWeights(preference_fit=2.0),
            nutrition_catalog=nutrition,
        ),
        scoring_context_from_preferences(preferences, pantry),
        limit=1,
    )
    if not ranked:
        raise RuntimeError(
            f"{case_id}: no generated candidate contains required ingredients "
            f"{sorted(required)}"
        )

    candidate = ranked[0].candidate
    quantified = QuantityCalculator(catalog).for_generated(candidate, servings=1)
    return {
        "case": case_id,
        "pantry": list(pantry),
        "required_ingredient_ids": sorted(required),
        "ingredient_ids": list(candidate.ingredient_ids),
        "score": ranked[0].total,
        "quantities": [
            {
                "ingredient_id": item.ingredient_id,
                "name_de": catalog.require(item.ingredient_id).name_de,
                "amount": item.quantity.amount,
                "unit": item.quantity.label_de,
            }
            for item in quantified.ingredients
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("cases", nargs="*", choices=sorted(VALIDATION_CASES))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    case_ids = args.cases or list(VALIDATION_CASES)
    results = [build_case(case_id) for case_id in case_ids]

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    for result in results:
        print(f"{result['case']}:")
        for item in result["quantities"]:
            print(f"  - {item['name_de']}: {item['amount']:g} {item['unit']}")
        print()


if __name__ == "__main__":
    main()
