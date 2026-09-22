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
    "R1": ("banana", "strawberry", "oat_milk"),
    "R2": ("mango", "pineapple", "coconut_water"),
    "R3": ("mango", "banana", "spinach", "water"),
    "R4": ("banana", "peanut_butter", "oat_milk"),
    "R5": ("blueberry", "banana", "chia_seeds", "almond_milk"),
    "R6": ("orange", "mango", "orange_juice", "ginger"),
}


def build_case(case_id: str) -> dict:
    catalog = load_ingredient_catalog()
    nutrition = load_nutrition_catalog(ingredient_catalog=catalog)
    pantry = VALIDATION_CASES[case_id]
    preferences = UserPreferences()

    pool = SmoothieGenerator(catalog).generate(pantry, count=300, seed=0)
    ranked = rank_generated_candidates(
        pool,
        CandidateScorer(
            catalog,
            ScoringWeights(preference_fit=2.0),
            nutrition_catalog=nutrition,
        ),
        scoring_context_from_preferences(preferences, pantry),
        limit=1,
    )
    if not ranked:
        raise RuntimeError(f"{case_id}: no generated candidate")

    candidate = ranked[0].candidate
    quantified = QuantityCalculator(catalog).for_generated(candidate, servings=1)
    return {
        "case": case_id,
        "pantry": list(pantry),
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
