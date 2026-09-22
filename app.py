"""Streamlit entry point for the Smoothie Generator."""

import streamlit as st

from smoothie import (
    CandidateScorer,
    IngredientCategory,
    NutritionCalculator,
    QuantityCalculator,
    ScoringContext,
    SmoothieGenerator,
    load_ingredient_catalog,
    load_nutrition_catalog,
    load_recipe_catalog,
    parse_free_text,
    rank_generated_candidates,
    rank_recipes,
)

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
    quantity_calculator = QuantityCalculator(catalog)
    nutrition_calculator = NutritionCalculator(
        catalog,
        load_nutrition_catalog(ingredient_catalog=catalog),
    )

    st.title("Smoothie Generator")
    st.write("Was hast du gerade zu Hause? Wähle deine Zutaten aus.")

    query = st.text_input("Zutaten suchen", placeholder="z. B. Banane, Haferdrink oder Spinat")
    normalized_query = catalog.normalize(query)
    visible = [
        item
        for item in ingredients
        if not normalized_query
        or normalized_query in catalog.normalize(item.name_de)
        or any(normalized_query in catalog.normalize(alias) for alias in item.aliases)
    ]

    category_options = [
        category for category in IngredientCategory if any(i.category == category for i in visible)
    ]
    selected_category = st.selectbox(
        "Kategorie",
        options=[None, *category_options],
        format_func=lambda value: "Alle Kategorien" if value is None else CATEGORY_LABELS[value],
    )
    if selected_category is not None:
        visible = [item for item in visible if item.category == selected_category]

    labels = {item.id: item.name_de for item in ingredients}
    visible_ids = {item.id for item in visible}
    chosen = st.multiselect(
        "Vorhandene Zutaten",
        options=[item.id for item in visible],
        default=[item_id for item_id in st.session_state.pantry_ids if item_id in visible_ids],
        format_func=lambda item_id: labels[item_id],
        placeholder="Zutaten auswählen",
    )
    retained = [item_id for item_id in st.session_state.pantry_ids if item_id not in visible_ids]
    st.session_state.pantry_ids = list(dict.fromkeys([*retained, *chosen]))

    with st.expander("Weitere Zutaten als Text eingeben"):
        free_text = st.text_area("Freie Eingabe", placeholder="z. B. Banane, Haferdrink, Mango")
        if st.button("Eingabe hinzufügen", use_container_width=True):
            resolved, unknown = parse_free_text(free_text, catalog)
            st.session_state.pantry_ids = list(
                dict.fromkeys([*st.session_state.pantry_ids, *resolved])
            )
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
    st.subheader("Neu aus deinen Zutaten generiert")
    candidate_pool = SmoothieGenerator(catalog).generate(selected_ids, count=100, seed=0)
    generated = rank_generated_candidates(
        candidate_pool,
        CandidateScorer(catalog),
        ScoringContext(pantry_ids=frozenset(selected_ids)),
        limit=3,
    )
    if generated:
        for index, scored in enumerate(generated, 1):
            candidate = scored.candidate
            with st.container(border=True):
                st.markdown(f"**Vorschlag {index} · {scored.total:.0f}/100**")
                quantified = quantity_calculator.for_generated(
                    candidate,
                    servings=st.session_state.servings,
                )
                quantities = ", ".join(
                    f"{by_id[item.ingredient_id].name_de} "
                    f"({item.quantity.amount:g} {item.quantity.label_de})"
                    for item in quantified.ingredients
                )
                st.write(quantities)
                role_text = ", ".join(
                    f"{by_id[item_id].name_de}: {role.replace('_', ' ')}"
                    for item_id, role in candidate.roles
                )
                st.caption(role_text)
                facts = nutrition_calculator.calculate(quantified.ingredients)
                st.caption(
                    f"ca. {facts.calories:g} kcal · {facts.protein_g:g} g Protein · "
                    f"{facts.carbohydrates_g:g} g Kohlenhydrate · {facts.sugar_g:g} g Zucker · "
                    f"{facts.fat_g:g} g Fett · {facts.fiber_g:g} g Ballaststoffe"
                )
                st.caption(" · ".join(scored.explanations))
    else:
        st.caption(
            "Für eine Generierung brauchst du mindestens Obst oder Beeren und eine passende Flüssigkeit."
        )

    st.subheader("Passende gespeicherte Rezepte")
    matches = rank_recipes(
        load_recipe_catalog(ingredient_catalog=catalog), set(selected_ids)
    )
    for match in matches[:5]:
        percent = round(match.score * 100)
        with st.container(border=True):
            st.markdown(f"**{match.recipe.name_de} · {percent}% verfügbar**")
            quantified_recipe = quantity_calculator.for_stored(
                match.recipe,
                servings=st.session_state.servings,
            )
            required = ", ".join(
                f"{by_id[item.ingredient_id].name_de} "
                f"({item.quantity.amount:g} {item.quantity.label_de})"
                for item in quantified_recipe.required
            )
            st.write("Benötigt: " + required)
            facts = nutrition_calculator.calculate(quantified_recipe.required)
            st.caption(
                f"ca. {facts.calories:g} kcal · {facts.protein_g:g} g Protein · "
                f"{facts.carbohydrates_g:g} g Kohlenhydrate · {facts.sugar_g:g} g Zucker · "
                f"{facts.fat_g:g} g Fett · {facts.fiber_g:g} g Ballaststoffe"
            )
            if match.missing_required:
                missing = ", ".join(by_id[item_id].name_de for item_id in match.missing_required)
                st.caption("Fehlt: " + missing)
            if match.substitutions_used:
                substitutions = ", ".join(
                    f"{by_id[target].name_de} → {by_id[replacement].name_de}"
                    for target, replacement in match.substitutions_used
                )
                st.caption("Mögliche Ersetzung: " + substitutions)


if __name__ == "__main__":
    main()
