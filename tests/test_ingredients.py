"""Tests for the ingredient domain and local catalog."""

import json
from pathlib import Path
import pytest
from smoothie import IngredientCategory, load_ingredient_catalog

DATA=Path(__file__).resolve().parents[1] / "data" / "ingredients.json"

def write_data(tmp_path: Path, records: list[dict]) -> Path:
    path=tmp_path / "ingredients.json"
    path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    return path

def raw() -> list[dict]:
    return json.loads(DATA.read_text(encoding="utf-8"))

def test_initial_catalog_is_complete_and_resolvable() -> None:
    catalog=load_ingredient_catalog()
    assert 40 <= len(catalog) <= 60
    assert catalog.require("Banane").id == "banana"
    assert catalog.require("banana").name_de == "Banane"
    assert catalog.require("Haferdrink").id == "oat_milk"
    categories={item.category for item in catalog.all()}
    assert {IngredientCategory.FRUIT,IngredientCategory.BERRIES,IngredientCategory.GREENS,
            IngredientCategory.PROTEIN,IngredientCategory.CREAMY_BASE} <= categories

def test_duplicate_ids_fail(tmp_path: Path) -> None:
    records=raw()[:1] * 2
    with pytest.raises(ValueError, match="Duplicate ingredient id"):
        load_ingredient_catalog(write_data(tmp_path, records))

def test_duplicate_aliases_fail(tmp_path: Path) -> None:
    records=raw()[:2]
    records[1]["aliases"].append(records[0]["aliases"][0])
    with pytest.raises(ValueError, match="Duplicate alias/name"):
        load_ingredient_catalog(write_data(tmp_path, records))

def test_invalid_category_fails(tmp_path: Path) -> None:
    records=raw()[:1]; records[0]["category"]="vegetable"
    with pytest.raises(ValueError, match="Invalid ingredient category"):
        load_ingredient_catalog(write_data(tmp_path, records))

@pytest.mark.parametrize("field,value", [("sweetness",6),("acidity",-1),("creaminess",2.5)])
def test_invalid_sensory_ranges_fail(tmp_path: Path, field: str, value: object) -> None:
    records=raw()[:1]; records[0][field]=value
    with pytest.raises(ValueError, match=field):
        load_ingredient_catalog(write_data(tmp_path, records))

def test_invalid_amount_range_fails(tmp_path: Path) -> None:
    records=raw()[:1]; records[0]["typical_amount"]={"min":200,"max":100,"unit":"g"}
    with pytest.raises(ValueError, match="typical_amount"):
        load_ingredient_catalog(write_data(tmp_path, records))
