"""Streamlit entry point for the Smoothie Generator."""

import streamlit as st

from components.preferences_panel import render_preference_panel
from components.recipe_cards import (
    render_generated_recipe_card,
    render_library,
    render_stored_recipe_card,
)
from smoothie import (
    CandidateScorer,
    IngredientCategory,
    NutritionCalculator,
    PreferenceStore,
    QuantityCalculator,
    RecipeHistoryStore,
    ScoringWeights,
    SmoothieGenerator,
    UserPreferences,
    candidate_allowed,
    filter_pantry,
    load_ingredient_catalog,
    load_nutrition_catalog,
    load_recipe_catalog,
    parse_free_text,
    rank_generated_candidates,
    rank_recipes,
    rank_stored_matches_with_preferences,
    recipe_allowed,
    scoring_context_from_preferences,
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
    st.session_state.setdefault("generation_seed", 0)
    st.session_state.setdefault("selected_recipe_key", None)


def _load_preferences(store: PreferenceStore) -> UserPreferences:
    if "preferences" in st.session_state:
        return st.session_state["preferences"]
    try:
        preferences = store.load()
    except ValueError:
        st.warning(
            "Die lokalen persönlichen Einstellungen konnten nicht gelesen werden. "
            "Für diese Sitzung werden Standardwerte verwendet."
        )
        preferences = UserPreferences()
    st.session_state["preferences"] = preferences
    return preferences


def main() -> None:
    st.set_page_config(
        page_title="Smoothie Generator",
        page_icon="🥤",
        layout="centered",
        initial_sidebar_state="collapsed",
    )
    _init_session()

    try:
        catalog = load_ingredient_catalog()
        ingredients = catalog.all()
        recipes = load_recipe_catalog(ingredient_catalog=catalog)
        nutrition_catalog = load_nutrition_catalog(ingredient_catalog=catalog)
    except ValueError:
        st.error(
            "Die lokalen Rezeptdaten konnten nicht geladen werden. "
            "Bitte prüfe die Installation der App."
        )
        st.stop()

    by_id = {item.id: item for item in ingredients}
    quantity_calculator = QuantityCalculator(catalog)
    nutrition_calculator = NutritionCalculator(catalog, nutrition_catalog)
    preference_store = PreferenceStore()
    history_store = RecipeHistoryStore()
    preferences = _load_preferences(preference_store)

    st.title("Smoothie Generator")
    st.write(
        "Aus deinen vorhandenen Zutaten werden passende Smoothies zusammengestellt – "
        "ohne zusätzliche Einkäufe und ohne externe Dienste."
    )

    st.subheader("1. Zutaten auswählen")
    st.caption("Wähle aus, was gerade zu Hause ist. Wasser kann als Grundzutat mitgerechnet werden.")

    query = st.text_input(
        "Zutaten suchen",
        placeholder="z. B. Banane, Haferdrink oder Spinat",
    )
    normalized_query = catalog.normalize(query)
    visible = [
        item
        for item in ingredients
        if not normalized_query
        or normalized_query in catalog.normalize(item.name_de)
        or any(normalized_query in catalog.normalize(alias) for alias in item.aliases)
    ]

    category_options = [
        category
        for category in IngredientCategory
        if any(item.category == category for item in visible)
    ]
    selected_category = st.selectbox(
        "Kategorie filtern",
        options=[None, *category_options],
        format_func=lambda value: (
            "Alle Kategorien" if value is None else CATEGORY_LABELS[value]
        ),
    )
    if selected_category is not None:
        visible = [item for item in visible if item.category == selected_category]

    labels = {item.id: item.name_de for item in ingredients}
    visible_ids = {item.id for item in visible}
    chosen = st.multiselect(
        "Vorhandene Zutaten",
        options=[item.id for item in visible],
        default=[
            item_id
            for item_id in st.session_state.pantry_ids
            if item_id in visible_ids
        ],
        format_func=lambda item_id: labels[item_id],
        placeholder="Zutaten auswählen",
    )
    retained = [
        item_id
        for item_id in st.session_state.pantry_ids
        if item_id not in visible_ids
    ]
    st.session_state.pantry_ids = list(dict.fromkeys([*retained, *chosen]))

    with st.expander("Weitere Zutaten als Text eingeben"):
        free_text = st.text_area(
            "Freie Eingabe",
            placeholder="z. B. Banane, Haferdrink, Mango",
        )
        if st.button("Eingabe hinzufügen", use_container_width=True):
            resolved, unknown = parse_free_text(free_text, catalog)
            st.session_state.pantry_ids = list(
                dict.fromkeys([*st.session_state.pantry_ids, *resolved])
            )
            if resolved:
                st.success(f"{len(resolved)} Zutat(en) hinzugefügt.")
            if unknown:
                st.warning("Nicht erkannt: " + ", ".join(unknown))

    basics_left, basics_right = st.columns(2)
    with basics_left:
        st.checkbox("Wasser ist vorhanden", key="always_water")
    with basics_right:
        st.checkbox("Eiswürfel sind vorhanden", key="always_ice")

    st.number_input(
        "Für wie viele Portionen?",
        min_value=1,
        max_value=12,
        step=1,
        key="servings",
    )

    selected_ids = list(st.session_state.pantry_ids)
    if st.session_state.always_water and "water" not in selected_ids:
        selected_ids.append("water")
    if st.session_state.always_ice and "ice" not in selected_ids:
        selected_ids.append("ice")

    if st.session_state.pantry_ids:
        with st.expander("Aktuelle Auswahl", expanded=False):
            st.write(", ".join(by_id[item_id].name_de for item_id in selected_ids))
            st.caption(
                f"{len(selected_ids)} berücksichtigte Zutaten · "
                f"{st.session_state.servings} Portion(en)"
            )

    if st.button("Zutatenauswahl zurücksetzen", use_container_width=True):
        st.session_state.pantry_ids = []
        st.session_state["selected_recipe_key"] = None
        st.rerun()

    st.subheader("2. Vorlieben & Einschränkungen")
    st.caption(
        "Optional: Favoriten, Allergien oder gewünschte Eigenschaften beeinflussen "
        "die Vorschläge und bleiben nur lokal gespeichert."
    )
    preferences = render_preference_panel(
        preferences,
        preference_store,
        ingredients,
    )

    usable_ids = filter_pantry(selected_ids, preferences, catalog)
    blocked_ids = [item_id for item_id in selected_ids if item_id not in usable_ids]
    if blocked_ids:
        st.info(
            "Nicht verwendet wegen deiner Einstellungen: "
            + ", ".join(by_id[item_id].name_de for item_id in blocked_ids)
        )

    if not st.session_state.pantry_ids:
        st.subheader("3. Deine Vorschläge")
        st.info(
            "Wähle zuerst mindestens eine Hauptzutat aus. Danach erscheinen hier "
            "passende Smoothies."
        )
        render_library(
            preferences,
            preference_store,
            history_store,
            stored_titles={recipe.id: recipe.name_de for recipe in recipes},
            by_id=by_id,
        )
        return

    st.subheader("3. Deine Vorschläge")
    st.caption(
        "Die Mengen werden automatisch auf deine gewählte Portionszahl angepasst. "
        "Nährwerte sind Näherungswerte."
    )

    if st.button(
        "Andere Vorschläge generieren",
        key="generate-alternatives",
        use_container_width=True,
    ):
        st.session_state["generation_seed"] += 1
        st.session_state["selected_recipe_key"] = None
        st.rerun()

    with st.spinner("Passende Smoothies werden zusammengestellt …"):
        candidate_pool = SmoothieGenerator(catalog).generate(
            usable_ids,
            count=100,
            seed=st.session_state["generation_seed"],
            vegan=preferences.vegan,
            excluded_allergens=frozenset(
                preferences.allergies
                | ({"milk"} if preferences.dairy_free else set())
            ),
        )
        candidate_pool = [
            candidate
            for candidate in candidate_pool
            if candidate_allowed(candidate, preferences)
        ]
        generated = rank_generated_candidates(
            candidate_pool,
            CandidateScorer(
                catalog,
                ScoringWeights(preference_fit=2.0),
                nutrition_catalog=nutrition_catalog,
            ),
            scoring_context_from_preferences(preferences, usable_ids),
            limit=3,
        )

        allowed_recipes = [
            recipe
            for recipe in recipes
            if recipe_allowed(recipe, preferences, catalog)
        ]
        stored_matches = rank_stored_matches_with_preferences(
            rank_recipes(allowed_recipes, set(usable_ids)),
            preferences,
        )

    st.markdown("#### Für dich generiert")
    if generated:
        for scored in generated:
            quantified = quantity_calculator.for_generated(
                scored.candidate,
                servings=st.session_state.servings,
            )
            facts = nutrition_calculator.calculate(quantified.ingredients)
            render_generated_recipe_card(
                scored,
                quantified,
                facts,
                by_id=by_id,
                preferences=preferences,
                preference_store=preference_store,
                history_store=history_store,
            )
    else:
        st.warning(
            "Mit der aktuellen Auswahl und deinen Einschränkungen konnte kein "
            "passender neuer Smoothie zusammengestellt werden. Ergänze z. B. Obst "
            "oder Beeren und eine Flüssigkeit."
        )

    st.markdown("#### Passende gespeicherte Rezepte")
    if stored_matches:
        for match in stored_matches[:4]:
            quantified_recipe = quantity_calculator.for_stored(
                match.recipe,
                servings=st.session_state.servings,
            )
            facts = nutrition_calculator.calculate(quantified_recipe.required)
            render_stored_recipe_card(
                match,
                quantified_recipe,
                facts,
                by_id=by_id,
                preferences=preferences,
                preference_store=preference_store,
                history_store=history_store,
            )
    else:
        st.info(
            "Kein gespeichertes Rezept passt zu den aktuellen Einschränkungen."
        )

    render_library(
        preferences,
        preference_store,
        history_store,
        stored_titles={recipe.id: recipe.name_de for recipe in recipes},
        by_id=by_id,
    )


if __name__ == "__main__":
    main()
