"""Streamlit controls for local personalization and recipe feedback."""
from __future__ import annotations

import streamlit as st

from smoothie import FeedbackValue, PreferenceStore, UserPreferences, clear_feedback, set_feedback


GOAL_LABELS = {
    "refreshing": "Erfrischend",
    "filling": "Sättigend",
    "protein_rich": "Proteinreich",
    "lower_calorie": "Kalorienärmer",
    "breakfast": "Frühstück",
    "post_workout": "Nach dem Training",
}


def render_preference_panel(preferences, store, ingredients):
    """Render editable private preferences and return the current profile."""
    labels = {item.id: item.name_de for item in ingredients}
    ingredient_ids = [item.id for item in ingredients]
    allergens = sorted({allergen for item in ingredients for allergen in item.allergens})

    with st.expander("Persönliche Einstellungen"):
        with st.form("preferences_form"):
            favorites = st.multiselect(
                "Lieblingszutaten",
                options=ingredient_ids,
                default=[item for item in preferences.favorite_ingredients if item in labels],
                format_func=lambda item_id: labels[item_id],
            )
            excluded = st.multiselect(
                "Nicht verwenden",
                options=ingredient_ids,
                default=[item for item in preferences.excluded_ingredients if item in labels],
                format_func=lambda item_id: labels[item_id],
            )
            allergy_values = st.multiselect(
                "Allergene ausschließen",
                options=allergens,
                default=[item for item in preferences.allergies if item in allergens],
            )

            col1, col2, col3 = st.columns(3)
            with col1:
                vegan = st.checkbox("Vegan", value=preferences.vegan)
            with col2:
                vegetarian = st.checkbox("Vegetarisch", value=preferences.vegetarian)
            with col3:
                dairy_free = st.checkbox("Milchfrei", value=preferences.dairy_free)

            customize_sweetness = st.checkbox(
                "Gewünschte Süße festlegen",
                value=preferences.desired_sweetness is not None,
            )
            sweetness = st.slider(
                "Süße",
                0,
                5,
                value=preferences.desired_sweetness if preferences.desired_sweetness is not None else 3,
                disabled=not customize_sweetness,
            )
            customize_creaminess = st.checkbox(
                "Gewünschte Cremigkeit festlegen",
                value=preferences.desired_creaminess is not None,
            )
            creaminess = st.slider(
                "Cremigkeit",
                0,
                5,
                value=preferences.desired_creaminess if preferences.desired_creaminess is not None else 3,
                disabled=not customize_creaminess,
            )
            active_goals = [
                key for key in GOAL_LABELS if getattr(preferences, key)
            ]
            goals = st.multiselect(
                "Was soll der Smoothie sein?",
                options=list(GOAL_LABELS),
                default=active_goals,
                format_func=lambda key: GOAL_LABELS[key],
            )

            submitted = st.form_submit_button(
                "Einstellungen speichern",
                use_container_width=True,
            )

        if submitted:
            updated = UserPreferences(
                favorite_ingredients=set(favorites),
                favorite_recipes=set(preferences.favorite_recipes),
                excluded_ingredients=set(excluded),
                allergies=set(allergy_values),
                vegan=vegan,
                vegetarian=vegetarian,
                dairy_free=dairy_free,
                desired_sweetness=sweetness if customize_sweetness else None,
                desired_creaminess=creaminess if customize_creaminess else None,
                refreshing="refreshing" in goals,
                filling="filling" in goals,
                protein_rich="protein_rich" in goals,
                lower_calorie="lower_calorie" in goals,
                breakfast="breakfast" in goals,
                post_workout="post_workout" in goals,
                feedback=dict(preferences.feedback),
            )
            store.save(updated)
            st.session_state["preferences"] = updated
            st.rerun()

        reset_feedback_col, reset_all_col = st.columns(2)
        with reset_feedback_col:
            if st.button("Feedback zurücksetzen", use_container_width=True):
                clear_feedback(preferences)
                store.save(preferences)
                st.rerun()
        with reset_all_col:
            if st.button("Alle Einstellungen zurücksetzen", use_container_width=True):
                store.reset()
                st.session_state["preferences"] = UserPreferences()
                st.rerun()

    return preferences


def render_recipe_feedback(recipe_key, preferences, store):
    """Render persistent favorite/feedback actions with mobile-friendly controls."""
    current = preferences.feedback.get(recipe_key)
    is_favorite = recipe_key in preferences.favorite_recipes

    first_left, first_right = st.columns(2)
    with first_left:
        if st.button(
            "Favorit entfernen" if is_favorite else "Als Favorit speichern",
            key=f"favorite:{recipe_key}",
            use_container_width=True,
        ):
            if is_favorite:
                preferences.favorite_recipes.discard(recipe_key)
            else:
                preferences.favorite_recipes.add(recipe_key)
            store.save(preferences)
            st.rerun()
    with first_right:
        if st.button(
            "Gefällt mir",
            key=f"like:{recipe_key}",
            type="primary" if current == FeedbackValue.LIKED else "secondary",
            use_container_width=True,
        ):
            set_feedback(preferences, recipe_key, FeedbackValue.LIKED)
            store.save(preferences)
            st.rerun()

    second_left, second_right = st.columns(2)
    with second_left:
        if st.button(
            "Neutral",
            key=f"neutral:{recipe_key}",
            use_container_width=True,
        ):
            set_feedback(preferences, recipe_key, FeedbackValue.NEUTRAL)
            store.save(preferences)
            st.rerun()
    with second_right:
        if st.button(
            "Nicht mehr vorschlagen",
            key=f"hide:{recipe_key}",
            use_container_width=True,
        ):
            set_feedback(preferences, recipe_key, FeedbackValue.DO_NOT_SUGGEST)
            store.save(preferences)
            st.rerun()
