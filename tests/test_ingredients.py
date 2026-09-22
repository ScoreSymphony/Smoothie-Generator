"""Tests for the ingredient domain and local catalog."""

from collections import Counter
import json
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


def test_curated_catalog_is_broad_complete_and_resolvable() -> None:
    catalog = load_ingredient_catalog()
    assert 100 <= len(catalog) <= 150

    # Existing canonical lookups must remain stable.
    assert catalog.require("Banane").id == "banana"
    assert catalog.require("banana").name_de == "Banane"
    assert catalog.require("Haferdrink").id == "oat_milk"

    # Common German aliases/spelling variants added by the expanded data set.
    assert catalog.require("Marille").id == "apricot"
    assert catalog.require("Möhre").id == "carrot"
    assert catalog.require("Rote Beete").id == "beetroot"
    assert catalog.require("Sojamilch").id == "soy_milk"
    assert catalog.require("Magerquark").id == "lowfat_quark"

    counts = Counter(item.category for item in catalog.all())
    minimums = {
        IngredientCategory.FRUIT: 20,
        IngredientCategory.BERRIES: 10,
        IngredientCategory.LIQUID: 12,
        IngredientCategory.CREAMY_BASE: 8,
        IngredientCategory.GREENS: 10,
        IngredientCategory.PROTEIN: 6,
        IngredientCategory.NUTS: 6,
        IngredientCategory.SEEDS: 5,
        IngredientCategory.SWEETENER: 5,
        IngredientCategory.SPICES: 5,
        IngredientCategory.BOOSTERS: 5,
        IngredientCategory.ICE: 1,
    }
    for category, minimum in minimums.items():
        assert counts[category] >= minimum, (category, counts[category])

    subcategories = Counter(item.subcategory for item in catalog.all() if item.subcategory)
    assert subcategories["vegetable"] >= 5
    assert subcategories["dairy"] >= 4
    assert subcategories["plant_based"] >= 6
    assert subcategories["grain"] >= 3
    assert subcategories["water"] >= 2


def test_every_record_has_a_stable_canonical_id_and_complete_core_metadata() -> None:
    records = raw()
    ids = [record["id"] for record in records]
    assert len(ids) == len(set(ids))
    for record in records:
        assert record["id"] == record["id"].strip().lower()
        assert " " not in record["id"]
        assert record["roles"]
        assert record["typical_amount"]["min"] <= record["typical_amount"]["max"]
        assert record["typical_amount"]["max"] > 0
        assert 0 <= record["sweetness"] <= 5
        assert 0 <= record["acidity"] <= 5
        assert 0 <= record["bitterness"] <= 5
        assert 0 <= record["creaminess"] <= 5
        assert 0 <= record["intensity"] <= 5
        assert 0 <= record["water_contribution"] <= 5


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


@pytest.mark.parametrize("field,value", [("sweetness", 6), ("acidity", -1), ("creaminess", 2.5)])
def test_invalid_sensory_ranges_fail(tmp_path: Path, field: str, value: object) -> None:
    records = raw()[:1]
    records[0][field] = value
    with pytest.raises(ValueError, match=field):
        load_ingredient_catalog(write_data(tmp_path, records))


def test_invalid_amount_range_fails(tmp_path: Path) -> None:
    records = raw()[:1]
    records[0]["typical_amount"] = {"min": 200, "max": 100, "unit": "g"}
    with pytest.raises(ValueError, match="typical_amount"):
        load_ingredient_catalog(write_data(tmp_path, records))
