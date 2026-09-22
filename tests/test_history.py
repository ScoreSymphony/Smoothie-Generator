"""Tests for private recipe history persistence."""
from pathlib import Path

from smoothie import RecipeHistoryStore


def test_history_persists_most_recent_first_and_deduplicates(tmp_path: Path) -> None:
    path = tmp_path / "history.json"
    store = RecipeHistoryStore(path, maximum_entries=3)

    store.add(
        recipe_key="stored:first",
        title="Erstes Rezept",
        source="stored",
        ingredient_ids=("banana", "water"),
        viewed_at="2026-09-22T10:00:00+00:00",
    )
    store.add(
        recipe_key="generated:banana,water",
        title="Banane & Wasser",
        source="generated",
        ingredient_ids=("banana", "water"),
        viewed_at="2026-09-22T11:00:00+00:00",
    )
    store.add(
        recipe_key="stored:first",
        title="Erstes Rezept",
        source="stored",
        ingredient_ids=("banana", "water"),
        viewed_at="2026-09-22T12:00:00+00:00",
    )

    loaded = RecipeHistoryStore(path).load()

    assert [entry.recipe_key for entry in loaded] == [
        "stored:first",
        "generated:banana,water",
    ]
    assert loaded[0].viewed_at == "2026-09-22T12:00:00+00:00"


def test_history_is_bounded_and_can_be_cleared(tmp_path: Path) -> None:
    path = tmp_path / "history.json"
    store = RecipeHistoryStore(path, maximum_entries=2)

    for index in range(3):
        store.add(
            recipe_key=f"stored:{index}",
            title=f"Rezept {index}",
            source="stored",
            ingredient_ids=("banana",),
            viewed_at=f"2026-09-22T1{index}:00:00+00:00",
        )

    assert [entry.recipe_key for entry in store.load()] == ["stored:2", "stored:1"]

    store.clear()
    assert store.load() == []
    assert not path.exists()
