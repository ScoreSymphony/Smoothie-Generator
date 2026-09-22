"""Streamlit entry point for the Smoothie Generator."""

import streamlit as st

from smoothie import IngredientCategory, SmoothieGenerator, load_ingredient_catalog, load_recipe_catalog, parse_free_text, rank_recipes

CATEGORY_LABELS = {
    IngredientCategory.FRUIT: "Obst",
    IngredientCategory.BERRIES: "Beeren",
    IngredientCategory.LIQUID: "Flüssigkeiten",
    IngredientCategory.CREAMY_BASE: "Cremige Basis",
    IngredientCategory.GREENS: "Grünes & Gemüse",
    IngredientCategory.PROTEIN: "Protein",
    IngredientCategory.SWEETENER: "Süße",
    IngredientCategory.NUTS: "Nüsse",
    IngredientCategory.SEEDS: "Samen",
    IngredientCategory.SPICES: "Gewürze",
    IngredientCategory.BOOSTERS: "Extras",
    IngredientCategory.ICE: "Eis",
}


def _init_session() -> None:
    st.session_state.setdefault("pantry_ids", [])
    st.session_state.setdefault("servings", 2)
    st.session_state.setdefault("always_water", True)
    st.session_state.setdefault("always_ice", False)


def main() -> None:
    st.set_page_config(page_title="Smoothie Generator", page_icon="🥤", layout="centered")
    _init_session()
    catalog = load_ingredient_catalog()
    ingredients = catalog.all()
    by_id = {item.id: item for item in ingredients}

    st.title("Smoothie Generator")
    st.write("Was hast du gerade zu Hause? Wähle deine Zutaten aus.")

    query = st.text_input("Zutaten suchen", placeholder="z. B. Banane, Haferdrink oder Spinat")
    normalized_query = catalog.normalize(query)
    visible = [
        item for item in ingredients
        if not normalized_query
        or normalized_query in catalog.normalize(item.name_de)
        or any(normalized_query in catalog.normalize(alias) for alias in item.aliases)
    ]

    category_options = [category for category in IngredientCategory if any(i.category == category for i in visible)]
    selected_category = st.selectbox(
        "Kategorie",
        options=[None, *category_options],
        format_func=lambda value: "Alle Kategorien" if value is None else CATEGORY_LABELS[value],
    )
    if selected_category is not None:
        visible = [item for item in visible if item.category == selected_category]

    labels = {item.id: item.name_de for item in ingredients}
    chosen = st.multiselect(
        "Vorhandene Zutaten",
        options=[item.id for item in visible],
        default=[item_id for item_id in st.session_state.pantry_ids if item_id in {i.id for i in visible}],
        format_func=lambda item_id: labels[item_id],
        placeholder="Zutaten auswählen",
    )
    # Keep selections made in other filtered views and update only currently visible options.
    visible_ids = {item.id for item in visible}
    retained = [item_id for item_id in st.session_state.pantry_ids if item_id not in visible_ids]
    st.session_state.pantry_ids = list(dict.fromkeys([*retained, *chosen]))

    with st.expander("Weitere Zutaten als Text eingeben"):
        free_text = st.text_area("Freie Eingabe", placeholder="z. B. Banane, Haferdrink, Mango")
        if st.button("Eingabe hinzufügen", use_container_width=True):
            resolved, unknown = parse_free_text(free_text, catalog)
            st.session_state.pantry_ids = list(dict.fromkeys([*st.session_state.pantry_ids, *resolved]))
            if resolved:
                st.success(f"{len(resolved)} Zutat(en) hinzugefügt.")
            if unknown:
                st.warning("Nicht erkannt: " + ", ".join(unknown))

    st.subheader("Grundausstattung")
    col1, col2 = st.columns(2)
    with col1:
        st.checkbox("Wasser immer vorhanden", key="always_water")
    with col2:
        st.checkbox("Eis immer vorhanden", key="always_ice")

    st.number_input("Portionen", min_value=1, max_value=12, step=1, key="servings")

    selected_ids = list(st.session_state.pantry_ids)
    if st.session_state.always_water and "water" not in selected_ids:
        selected_ids.append("water")
    if st.session_state.always_ice and "ice" not in selected_ids:
        selected_ids.append("ice")

    st.subheader("Deine Auswahl")
    if selected_ids:
        st.write(", ".join(by_id[item_id].name_de for item_id in selected_ids))
        st.caption(f"{len(selected_ids)} Zutaten · {st.session_state.servings} Portion(en)")
    else:
        st.info("Wähle mindestens eine Zutat aus.")

    if st.button("Auswahl zurücksetzen", use_container_width=True):
        st.session_state.pantry_ids = []
        st.rerun()

    st.divider()
    st.caption("Als Nächstes werden daraus passende gespeicherte Smoothie-Rezepte ermittelt.")


if __name__ == "__main__":
    main()
