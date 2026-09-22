"""Session-friendly pantry selection state and free-text parsing."""

from __future__ import annotations

from dataclasses import dataclass, field
import re

from .ingredient_catalog import IngredientCatalog

_SPLIT_RE = re.compile(r"[,;\n]+")


@dataclass
class PantryState:
    """Canonical pantry state independent from Streamlit."""

    selected_ids: list[str] = field(default_factory=list)
    always_available_ids: list[str] = field(default_factory=list)
    servings: int = 2

    def add(self, ingredient_id: str) -> None:
        if ingredient_id not in self.selected_ids:
            self.selected_ids.append(ingredient_id)

    def remove(self, ingredient_id: str) -> None:
        if ingredient_id in self.selected_ids:
            self.selected_ids.remove(ingredient_id)

    def available_ids(self) -> tuple[str, ...]:
        return tuple(dict.fromkeys((*self.selected_ids, *self.always_available_ids)))


def parse_free_text(value: str, catalog: IngredientCatalog) -> tuple[list[str], list[str]]:
    """Resolve comma/semicolon/newline separated input without failing on unknown terms."""
    resolved: list[str] = []
    unknown: list[str] = []
    for raw_term in _SPLIT_RE.split(value):
        term = raw_term.strip()
        if not term:
            continue
        ingredient = catalog.resolve(term)
        if ingredient is None:
            if term not in unknown:
                unknown.append(term)
        elif ingredient.id not in resolved:
            resolved.append(ingredient.id)
    return resolved, unknown
