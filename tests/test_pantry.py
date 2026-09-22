"""Tests for pantry normalization and selection state."""

from smoothie import PantryState, load_ingredient_catalog, parse_free_text


def test_free_text_resolves_aliases_and_deduplicates() -> None:
    catalog = load_ingredient_catalog()
    resolved, unknown = parse_free_text("Banane, Haferdrink; banana\nSpinat", catalog)
    assert resolved == ["banana", "oat_milk", "spinach"]
    assert unknown == []


def test_free_text_keeps_unknown_terms_without_crashing() -> None:
    catalog = load_ingredient_catalog()
    resolved, unknown = parse_free_text("Mango, Drachenstaub, Unbekannt", catalog)
    assert resolved == ["mango"]
    assert unknown == ["Drachenstaub", "Unbekannt"]


def test_pantry_state_deduplicates_and_combines_basics() -> None:
    pantry = PantryState(always_available_ids=["water", "ice"])
    pantry.add("banana")
    pantry.add("banana")
    pantry.add("water")
    assert pantry.selected_ids == ["banana", "water"]
    assert pantry.available_ids() == ("banana", "water", "ice")
    pantry.remove("banana")
    assert pantry.available_ids() == ("water", "ice")
