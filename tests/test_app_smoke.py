"""Smoke tests for the Streamlit application."""

from pathlib import Path

from streamlit.testing.v1 import AppTest


def test_streamlit_app_starts_without_exceptions() -> None:
    """The app should execute successfully in Streamlit's test harness."""

    app_path = Path(__file__).resolve().parents[1] / "app.py"
    app = AppTest.from_file(str(app_path)).run(timeout=10)

    assert not app.exception
    assert app.title[0].value == "Smoothie Generator"
