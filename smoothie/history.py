"""Local recipe viewing history for the private app."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

DEFAULT_HISTORY_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "recipe_history.local.json"
)


@dataclass(frozen=True)
class HistoryEntry:
    recipe_key: str
    title: str
    source: str
    ingredient_ids: tuple[str, ...]
    viewed_at: str

    def __post_init__(self) -> None:
        if not self.recipe_key.strip():
            raise ValueError("recipe_key must not be empty")
        if not self.title.strip():
            raise ValueError("title must not be empty")
        if self.source not in {"generated", "stored"}:
            raise ValueError("source must be 'generated' or 'stored'")
        if not self.ingredient_ids:
            raise ValueError("history entry requires at least one ingredient")
        try:
            datetime.fromisoformat(self.viewed_at.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError("viewed_at must be an ISO timestamp") from exc

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "HistoryEntry":
        return cls(
            recipe_key=str(data["recipe_key"]),
            title=str(data["title"]),
            source=str(data["source"]),
            ingredient_ids=tuple(str(item) for item in data["ingredient_ids"]),
            viewed_at=str(data["viewed_at"]),
        )

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["ingredient_ids"] = list(self.ingredient_ids)
        return payload


class RecipeHistoryStore:
    """Persist a bounded, most-recent-first recipe history locally."""

    def __init__(
        self,
        path: Path | str = DEFAULT_HISTORY_PATH,
        *,
        maximum_entries: int = 50,
    ) -> None:
        if maximum_entries < 1:
            raise ValueError("maximum_entries must be positive")
        self.path = Path(path)
        self.maximum_entries = maximum_entries

    def load(self) -> list[HistoryEntry]:
        if not self.path.exists():
            return []
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError(f"Could not load recipe history from {self.path}: {exc}") from exc
        if not isinstance(payload, list):
            raise ValueError("Recipe history root must be a JSON array")
        return [HistoryEntry.from_dict(item) for item in payload]

    def add(
        self,
        *,
        recipe_key: str,
        title: str,
        source: str,
        ingredient_ids: tuple[str, ...] | list[str],
        viewed_at: str | None = None,
    ) -> HistoryEntry:
        timestamp = viewed_at or datetime.now(timezone.utc).isoformat()
        entry = HistoryEntry(
            recipe_key=recipe_key,
            title=title,
            source=source,
            ingredient_ids=tuple(ingredient_ids),
            viewed_at=timestamp,
        )
        entries = [item for item in self.load() if item.recipe_key != recipe_key]
        entries.insert(0, entry)
        self._save(entries[: self.maximum_entries])
        return entry

    def clear(self) -> None:
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass

    def _save(self, entries: list[HistoryEntry]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(self.path.suffix + ".tmp")
        temporary.write_text(
            json.dumps(
                [entry.to_dict() for entry in entries],
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        temporary.replace(self.path)
