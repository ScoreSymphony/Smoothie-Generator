"""Smoke tests for the Streamlit application."""

from pathlib import Path

from streamlit.testing.v1 import AppTest


def test_streamlit_app_starts_and_exposes_complete_user_flow() -> None:
    """The app should start cleanly and expose the non-technical three-step flow."""

    app_path = Path(__file__).resolve().parents[1] / "app.py"
    app = AppTest.from_file(str(app_path)).run(timeout=10)

    assert not app.exception
    assert app.title[0].value == "Smoothie Generator"
    subheaders = [item.value for item in app.subheader]
    assert "1. Zutaten auswählen" in subheaders
    assert "2. Vorlieben & Einschränkungen" in subheaders
    assert "3. Deine Vorschläge" in subheaders
    assert "Favoriten & Verlauf" in subheaders


def test_normal_mode_does_not_render_internal_scoring_debug_text() -> None:
    app_path = Path(__file__).resolve().parents[1] / "app.py"
    app = AppTest.from_file(str(app_path)).run(timeout=10)

    visible_text = " ".join(
        item.value
        for group in (app.caption, app.markdown, app.info, app.warning)
        for item in group
        if isinstance(item.value, str)
    )

    assert "Kompatibilität 0." not in visible_text
    assert "Flüssigkeitsbalance 0." not in visible_text



def test_end_to_end_pantry_to_recommendations_smoke() -> None:
    app_path = Path(__file__).resolve().parents[1] / "app.py"
    app = AppTest.from_file(str(app_path))
    app.session_state["pantry_ids"] = ["banana", "strawberry", "oat_milk"]
    app.session_state["servings"] = 2
    app = app.run(timeout=10)

    assert not app.exception
    markdown = [
        item.value for item in app.markdown if isinstance(item.value, str)
    ]
    assert any("Für dich generiert" in value for value in markdown)
    assert any("Passende gespeicherte Rezepte" in value for value in markdown)
    assert app.success
