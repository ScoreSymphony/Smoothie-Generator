"""Polished recipe cards and the local favorites/history library."""
from __future__ import annotations

from datetime import datetime
from typing import Mapping

import streamlit as st

from smoothie import (
    CandidateScore,
    NutritionFacts,
    QuantifiedRecipe,
    QuantifiedSmoothie,
    RecipeHistoryStore,
    RecipeMatch,
    UserPreferences,
    generated_feedback_key,
    stored_feedback_key,
)
from smoothie.ingredients import Ingredient

from .preferences_panel import render_recipe_feedback


def generated_recipe_title(candidate, by_id: Mapping[str, Ingredient]) -> str:
    main_ids = [
        ingredient_id
        for ingredient_id, role in candidate.roles
        if role == "main_fruit"
    ]
    names = [by_id[item_id].name_de for item_id in main_ids if item_id in by_id]
    if names:
        return "-".join(names) + "-Smoothie"
    return "Dein Smoothie"


def generated_recipe_tags(candidate, by_id: Mapping[str, Ingredient]) -> tuple[str, ...]:
    ingredients = [by_id[item_id] for item_id in candidate.ingredient_ids]
    roles = {role for _, role in candidate.roles}
    tags: list[str] = []
    if all(item.vegan for item in ingredients):
        tags.append("Vegan")
    if "protein" in roles or any("protein" in item.roles for item in ingredients):
        tags.append("Proteinreich")
    if sum(item.creaminess for item in ingredients) / len(ingredients) >= 2.5:
        tags.append("Cremig")
    if sum(item.water_contribution for item in ingredients) / len(ingredients) >= 3.5:
        tags.append("Erfrischend")
    if not tags:
        tags.append("Fruchtig")
    return tuple(tags)


def _quantity_lines(items, by_id: Mapping[str, Ingredient]) -> list[str]:
    return [
        f"- **{by_id[item.ingredient_id].name_de}:** "
        f"{item.quantity.amount:g} {item.quantity.label_de}"
        for item in items
    ]


def _nutrition_line(facts: NutritionFacts) -> str:
    facts = facts.rounded()
    return (
        f"ca. **{facts.calories:g} kcal** · {facts.protein_g:g} g Protein · "
        f"{facts.carbohydrates_g:g} g Kohlenhydrate · {facts.sugar_g:g} g Zucker · "
        f"{facts.fat_g:g} g Fett · {facts.fiber_g:g} g Ballaststoffe"
    )


def _toggle_details(
    recipe_key: str,
    *,
    title: str,
    source: str,
    ingredient_ids: tuple[str, ...],
    history_store: RecipeHistoryStore,
) -> bool:
    selected = st.session_state.get("selected_recipe_key") == recipe_key
    label = "Details ausblenden" if selected else "Rezept ansehen"
    if st.button(label, key=f"view:{recipe_key}", use_container_width=True):
        if selected:
            st.session_state["selected_recipe_key"] = None
        else:
            st.session_state["selected_recipe_key"] = recipe_key
            history_store.add(
                recipe_key=recipe_key,
                title=title,
                source=source,
                ingredient_ids=ingredient_ids,
            )
        st.rerun()
    return selected


def render_generated_recipe_card(
    scored: CandidateScore,
    quantified: QuantifiedSmoothie,
    facts: NutritionFacts,
    *,
    by_id: Mapping[str, Ingredient],
    preferences: UserPreferences,
    preference_store,
    history_store: RecipeHistoryStore,
) -> None:
    candidate = scored.candidate
    recipe_key = generated_feedback_key(candidate)
    title = generated_recipe_title(candidate, by_id)
    tags = generated_recipe_tags(candidate, by_id)

    with st.container(border=True):
        st.markdown(f"### {title}")
        st.caption(" · ".join(tags))
        st.success("Alle verwendeten Zutaten sind vorhanden.")

        st.markdown("**Zutaten**")
        st.markdown("\n".join(_quantity_lines(quantified.ingredients, by_id)))
        st.caption(_nutrition_line(facts))

        details = _toggle_details(
            recipe_key,
            title=title,
            source="generated",
            ingredient_ids=candidate.ingredient_ids,
            history_store=history_store,
        )
        if details:
            st.markdown("**Zubereitung**")
            st.markdown(
                "1. Alle Zutaten in den Mixer geben.\n"
                "2. 30–60 Sekunden cremig mixen.\n"
                "3. Konsistenz prüfen und bei Bedarf etwas Flüssigkeit ergänzen.\n"
                "4. Direkt servieren."
            )
            st.caption(
                "Die Mengen sind Richtwerte und bereits auf die gewählte Portionszahl skaliert."
            )

        render_recipe_feedback(recipe_key, preferences, preference_store)


def render_stored_recipe_card(
    match: RecipeMatch,
    quantified: QuantifiedRecipe,
    facts: NutritionFacts,
    *,
    by_id: Mapping[str, Ingredient],
    preferences: UserPreferences,
    preference_store,
    history_store: RecipeHistoryStore,
) -> None:
    recipe = match.recipe
    recipe_key = stored_feedback_key(recipe)
    percent = round(match.score * 100)
    tags = tuple(tag.capitalize() for tag in recipe.tags) or ("Rezept",)

    with st.container(border=True):
        st.markdown(f"### {recipe.name_de}")
        st.caption(" · ".join(tags))
        if match.exact:
            st.success("Alle benötigten Zutaten sind vorhanden.")
        else:
            st.info(f"{percent}% der benötigten Zutaten sind vorhanden.")

        st.markdown("**Zutaten**")
        st.markdown("\n".join(_quantity_lines(quantified.required, by_id)))
        if quantified.optional:
            with st.expander("Optionale Zutaten"):
                st.markdown("\n".join(_quantity_lines(quantified.optional, by_id)))

        if match.missing_required:
            missing = ", ".join(by_id[item_id].name_de for item_id in match.missing_required)
            st.warning("Fehlt noch: " + missing)
        if match.substitutions_used:
            substitutions = ", ".join(
                f"{by_id[target].name_de} → {by_id[replacement].name_de}"
                for target, replacement in match.substitutions_used
            )
            st.info("Mögliche Ersetzung: " + substitutions)

        st.caption(_nutrition_line(facts))

        ingredient_ids = tuple(item.ingredient_id for item in quantified.required)
        details = _toggle_details(
            recipe_key,
            title=recipe.name_de,
            source="stored",
            ingredient_ids=ingredient_ids,
            history_store=history_store,
        )
        if details:
            st.markdown("**Zubereitung**")
            instructions = recipe.instructions_de or (
                "Alle Zutaten in den Mixer geben.",
                "Cremig mixen und direkt servieren.",
            )
            st.markdown(
                "\n".join(
                    f"{index}. {instruction}"
                    for index, instruction in enumerate(instructions, 1)
                )
            )

        render_recipe_feedback(recipe_key, preferences, preference_store)


def _favorite_title(
    recipe_key: str,
    *,
    stored_titles: Mapping[str, str],
    by_id: Mapping[str, Ingredient],
) -> str:
    if recipe_key.startswith("stored:"):
        recipe_id = recipe_key.removeprefix("stored:")
        return stored_titles.get(recipe_id, recipe_id)
    if recipe_key.startswith("generated:"):
        ingredient_ids = [
            item for item in recipe_key.removeprefix("generated:").split(",") if item
        ]
        names = [by_id[item].name_de for item in ingredient_ids if item in by_id]
        return " · ".join(names) if names else "Generierter Smoothie"
    return recipe_key


def render_library(
    preferences: UserPreferences,
    preference_store,
    history_store: RecipeHistoryStore,
    *,
    stored_titles: Mapping[str, str],
    by_id: Mapping[str, Ingredient],
) -> None:
    st.subheader("Favoriten & Verlauf")
    favorites_tab, history_tab = st.tabs(["Favoriten", "Verlauf"])

    with favorites_tab:
        favorite_keys = sorted(preferences.favorite_recipes)
        if not favorite_keys:
            st.info("Noch keine Favoriten gespeichert.")
        for recipe_key in favorite_keys:
            title = _favorite_title(
                recipe_key,
                stored_titles=stored_titles,
                by_id=by_id,
            )
            with st.container(border=True):
                st.write(f"**{title}**")
                if st.button(
                    "Aus Favoriten entfernen",
                    key=f"library-remove:{recipe_key}",
                    use_container_width=True,
                ):
                    preferences.favorite_recipes.discard(recipe_key)
                    preference_store.save(preferences)
                    st.rerun()

    with history_tab:
        try:
            entries = history_store.load()
        except ValueError:
            st.error(
                "Der lokale Verlauf konnte nicht gelesen werden. "
                "Du kannst ihn löschen und neu beginnen."
            )
            entries = []

        if not entries:
            st.info("Noch kein Rezept angesehen.")
        for entry in entries[:10]:
            try:
                timestamp = datetime.fromisoformat(
                    entry.viewed_at.replace("Z", "+00:00")
                ).strftime("%d.%m.%Y, %H:%M")
            except ValueError:
                timestamp = entry.viewed_at
            source = "Generierter Vorschlag" if entry.source == "generated" else "Gespeichertes Rezept"
            with st.container(border=True):
                st.write(f"**{entry.title}**")
                st.caption(f"{source} · {timestamp}")

        if entries and st.button(
            "Verlauf löschen",
            key="clear-history",
            use_container_width=True,
        ):
            history_store.clear()
            st.rerun()
