"""Tests for alternative recommendation paging."""

import pytest

from app import _select_generated_page


def test_alternative_pages_cycle_through_distinct_ranked_results() -> None:
    ranked = list(range(8))

    assert _select_generated_page(ranked, 0) == [0, 1, 2]
    assert _select_generated_page(ranked, 1) == [3, 4, 5]
    assert _select_generated_page(ranked, 2) == [6, 7]
    assert _select_generated_page(ranked, 3) == [0, 1, 2]


def test_alternative_page_handles_empty_input_and_rejects_invalid_size() -> None:
    assert _select_generated_page([], 10) == []
    with pytest.raises(ValueError):
        _select_generated_page([1], 0, page_size=0)
