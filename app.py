"""Streamlit entry point for the Smoothie Generator."""

import streamlit as st
from components.pantry_selector import render_pantry_selector
from smoothie import load_ingredient_catalog

def main() -> None:
    st.set_page_config(page_title="Smoothie Generator",page_icon="🥤",layout="centered")
    st.title("Smoothie Generator")
    st.write("Sag mir, was du zu Hause hast – daraus entstehen anschließend passende Smoothie-Vorschläge.")
    catalog=load_ingredient_catalog()
    pantry=render_pantry_selector(catalog)
    st.caption(f"{len(pantry.ingredient_ids)} Zutaten · {pantry.servings} Portion(en)")

if __name__ == "__main__":
    main()
