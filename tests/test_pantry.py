"""Tests for pantry normalization and selection state."""

import pytest
from smoothie import Pantry, load_ingredient_catalog

@pytest.fixture
def catalog():
    return load_ingredient_catalog()

def test_aliases_resolve_to_single_canonical_selection(catalog) -> None:
    pantry=Pantry()
    pantry.add("Haferdrink",catalog)
    pantry.add("Hafermilch",catalog)
    pantry.add("oat milk",catalog)
    assert pantry.ingredient_ids == {"oat_milk"}

def test_unknown_free_text_is_graceful(catalog) -> None:
    pantry=Pantry()
    assert pantry.add("Drachenfruchtpulver",catalog) is None
    assert pantry.ingredient_ids == set()
    assert pantry.unknown_inputs == ["Drachenfruchtpulver"]

def test_unknown_input_is_not_duplicated(catalog) -> None:
    pantry=Pantry()
    pantry.add("Unbekannt",catalog); pantry.add("Unbekannt",catalog)
    assert pantry.unknown_inputs == ["Unbekannt"]

def test_remove_and_selected_objects(catalog) -> None:
    pantry=Pantry()
    pantry.add("Banane",catalog); pantry.add("Spinat",catalog)
    pantry.remove("banana")
    assert [item.id for item in pantry.selected(catalog)] == ["spinach"]

def test_servings_validation() -> None:
    pantry=Pantry()
    pantry.set_servings(4)
    assert pantry.servings == 4
    with pytest.raises(ValueError,match="between 1 and 8"):
        pantry.set_servings(0)
