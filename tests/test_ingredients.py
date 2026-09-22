"""Tests for the ingredient domain and expanded local catalog."""

import json
from collections import Counter
from pathlib import Path

import pytest

from smoothie import IngredientCategory, load_ingredient_catalog

DATA = Path(__file__).resolve().parents[1] / "data" / "ingredients.json"


def write_data(tmp_path: Path, records: list[dict]) -> Path:
    path = tmp_path / "ingredients.json"
    path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    return path


def raw() -> list[dict]:
    return json.loads(DATA.read_text(encoding="utf-8"))


def test_expanded_catalog_is_complete_and_resolvable() -> None:
    catalog = load_ingredient_catalog()

    assert 100 <= len(catalog) <= 150
    assert catalog.require("Banane").id == "banana"
    assert catalog.require("banana").name_de == "Banane"
    assert catalog.require("Haferdrink").id == "oat_milk"
    assert catalog.require("Sojadrink").id == "soy_milk"
    assert catalog.require("Rote Bete").id == "beetroot"


def test_major_categories_have_meaningful_coverage() -> None:
    catalog = load_ingredient_catalog()
    counts = Counter(item.category for item in catalog.all())

    minimums = {
        IngredientCategory.FRUIT: 20,
        IngredientCategory.BERRIES: 8,
        IngredientCategory.LIQUID: 12,
        IngredientCategory.CREAMY_BASE: 8,
        IngredientCategory.GREENS: 8,
        IngredientCategory.PROTEIN: 5,
        IngredientCategory.SWEETENER: 5,
        IngredientCategory.NUTS: 5,
        IngredientCategory.SEEDS: 5,
        IngredientCategory.SPICES: 5,
        IngredientCategory.BOOSTERS: 5,
        IngredientCategory.ICE: 1,
    }
    for category, minimum in minimums.items():
        assert counts[category] >= minimum, (
            f"{category.value} is underrepresented: "
            f"{counts[category]} < {minimum}"
        )


def test_required_subcategory_coverage_for_broader_pantry_model() -> None:
    catalog = load_ingredient_catalog()
    counts = Counter(item.subcategory for item in catalog.all())

    assert counts["vegetable"] >= 5
    assert counts["grain"] >= 3
    assert counts["dairy"] >= 4
    assert counts["plant_based"] >= 8
    assert counts["juice"] >= 3
    assert counts["leafy_green"] >= 4


def test_all_records_have_stable_ids_roles_and_amounts() -> None:
    catalog = load_ingredient_catalog()
    for item in catalog.all():
        assert item.id == item.id.strip().lower()
        assert " " not in item.id
        assert item.roles
        assert item.typical_amount.minimum >= 0
        assert item.typical_amount.maximum >= item.typical_amount.minimum
        assert item.typical_amount.maximum > 0
        assert item.typical_amount.unit.strip()


def test_duplicate_ids_fail(tmp_path: Path) -> None:
    records = raw()[:1] * 2
    with pytest.raises(ValueError, match="Duplicate ingredient id"):
        load_ingredient_catalog(write_data(tmp_path, records))


def test_duplicate_aliases_fail(tmp_path: Path) -> None:
    records = raw()[:2]
    records[1]["aliases"].append(records[0]["aliases"][0])
    with pytest.raises(ValueError, match="Duplicate alias/name"):
        load_ingredient_catalog(write_data(tmp_path, records))


def test_invalid_category_fails(tmp_path: Path) -> None:
    records = raw()[:1]
    records[0]["category"] = "vegetable"
    with pytest.raises(ValueError, match="Invalid ingredient category"):
        load_ingredient_catalog(write_data(tmp_path, records))


@pytest.mark.parametrize(
    "field,value",
    [("sweetness", 6), ("acidity", -1), ("creaminess", 2.5)],
)
def test_invalid_sensory_ranges_fail(
    tmp_path: Path,
    field: str,
    value: object,
) -> None:
    records = raw()[:1]
    records[0][field] = value
    with pytest.raises(ValueError, match=field):
        load_ingredient_catalog(write_data(tmp_path, records))


def test_invalid_amount_range_fails(tmp_path: Path) -> None:
    records = raw()[:1]
    records[0]["typical_amount"] = {"min": 200, "max": 100, "unit": "g"}
    with pytest.raises(ValueError, match="typical_amount"):
        load_ingredient_catalog(write_data(tmp_path, records))
