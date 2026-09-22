"""Tests for the reproducible M9 physical-validation runner."""

from scripts.prepare_real_world_validation import VALIDATION_CASES, build_case


def test_all_physical_validation_cases_produce_one_serving_recipe() -> None:
    for case_id, case in VALIDATION_CASES.items():
        result = build_case(case_id)
        pantry = set(case["pantry"])
        required = set(case["required"])

        assert result["case"] == case_id
        assert result["quantities"]
        assert set(result["ingredient_ids"]) <= pantry
        assert required <= set(result["ingredient_ids"])
        assert set(result["required_ingredient_ids"]) == required
        assert all(item["amount"] > 0 for item in result["quantities"])


def test_validation_cases_are_reproducible() -> None:
    for case_id in VALIDATION_CASES:
        assert build_case(case_id) == build_case(case_id)


def test_each_validation_case_requires_its_declared_pantry() -> None:
    for case in VALIDATION_CASES.values():
        assert set(case["required"]) == set(case["pantry"])
