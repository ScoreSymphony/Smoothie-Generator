"""Streamlit entry point for the Smoothie Generator."""

import streamlit as st


def main() -> None:
    """Render the initial application shell."""

    st.set_page_config(
        page_title="Smoothie Generator",
        page_icon="🥤",
        layout="centered",
    )

    st.title("Smoothie Generator")
    st.write(
        "Wähle später deine vorhandenen Zutaten aus und erhalte passende "
        "oder neu generierte Smoothie-Vorschläge."
    )
    st.info(
        "Die technische Grundlage steht. Zutatenmodell, Matching und "
        "Generator werden in den nächsten Arbeitspaketen ergänzt."
    )


if __name__ == "__main__":
    main()
