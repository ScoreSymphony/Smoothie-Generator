"""Release-gate tests over representative strict-pantry scenarios."""
import json
from pathlib import Path

from smoothie import SmoothieGenerator, load_ingredient_catalog

SCENARIO_PATH = Path(__file__).resolve().parents[1] / "data" / "quality_scenarios.json"


def load_scenarios() -> list[dict]:
    return json.loads(SCENARIO_PATH.read_text(encoding="utf-8"))


def test_quality_set_has_required_breadth() -> None:
    scenarios = load_scenarios()
    kinds = {scenario["kind"] for scenario in scenarios}

    assert 30 <= len(scenarios) <= 50
    assert {"sparse", "standard", "large", "restriction", "difficult"} <= kinds
    assert sum(scenario["kind"] == "sparse" for scenario in scenarios) >= 8
    assert sum(scenario["kind"] == "large" for scenario in scenarios) >= 5
    assert sum(scenario["kind"] == "restriction" for scenario in scenarios) >= 8
    assert sum(scenario["kind"] == "difficult" for scenario in scenarios) >= 8


def test_strict_pantry_scenarios_never_leak_unavailable_or_restricted_ingredients() -> None:
    catalog = load_ingredient_catalog()
    generator = SmoothieGenerator(catalog)

    for scenario in load_scenarios():
        pantry = set(scenario["pantry"])
        excluded_allergens = set(scenario["excluded_allergens"])

        for ingredient_id in pantry:
            catalog.require(ingredient_id)

        results = generator.generate(
            pantry,
            count=50,
            seed=17,
            vegan=scenario["vegan"],
            excluded_allergens=excluded_allergens,
        )

        assert len(results) >= scenario["min_candidates"], scenario["id"]
        for candidate in results:
            assert set(candidate.ingredient_ids) <= pantry, scenario["id"]
            assert len(candidate.ingredient_ids) == len(set(candidate.ingredient_ids))
            assert "main_fruit" in dict(candidate.roles).values()
            assert "liquid" in dict(candidate.roles).values()

            for ingredient_id in candidate.ingredient_ids:
                ingredient = catalog.require(ingredient_id)
                if scenario["vegan"]:
                    assert ingredient.vegan, scenario["id"]
                assert not excluded_allergens.intersection(
                    ingredient.allergens
                ), scenario["id"]


def test_quality_scenarios_are_deterministic_for_fixed_seed() -> None:
    catalog = load_ingredient_catalog()
    generator = SmoothieGenerator(catalog)

    for scenario in load_scenarios():
        kwargs = {
            "count": 20,
            "seed": 23,
            "vegan": scenario["vegan"],
            "excluded_allergens": set(scenario["excluded_allergens"]),
        }
        first = generator.generate(set(scenario["pantry"]), **kwargs)
        second = generator.generate(set(reversed(scenario["pantry"])), **kwargs)

        assert first == second, scenario["id"]
