"""Streamlit pantry selection UI."""

from __future__ import annotations
import streamlit as st
from smoothie import IngredientCatalog, Pantry

CATEGORY_LABELS = {
    "fruit":"Obst","berries":"Beeren","liquid":"Flüssigkeiten","creamy_base":"Cremige Basis",
    "greens":"Grünes","protein":"Protein","sweetener":"Süßungsmittel","nuts":"Nüsse",
    "seeds":"Samen","spices":"Gewürze","boosters":"Extras","ice":"Eis",
}

def _pantry() -> Pantry:
    if "pantry" not in st.session_state:
        st.session_state.pantry = Pantry()
    return st.session_state.pantry

def render_pantry_selector(catalog: IngredientCatalog) -> Pantry:
    pantry=_pantry()
    st.subheader("Was hast du da?")
    st.caption("Wähle Zutaten aus oder gib eigene Begriffe ein.")

    options={item.name_de:item.id for item in catalog.all()}
    selected_names=[item.name_de for item in pantry.selected(catalog)]
    chosen=st.multiselect(
        "Zutaten suchen und auswählen",
        options=list(options),
        default=selected_names,
        placeholder="z. B. Banane, Haferdrink, Spinat …",
    )
    pantry.ingredient_ids={options[name] for name in chosen}

    with st.expander("Nach Kategorien stöbern"):
        categories=sorted({item.category.value for item in catalog.all()})
        category=st.selectbox("Kategorie", categories, format_func=lambda x:CATEGORY_LABELS.get(x,x))
        items=[item for item in catalog.all() if item.category.value == category]
        cols=st.columns(2)
        for index,item in enumerate(items):
            checked=item.id in pantry.ingredient_ids
            value=cols[index % 2].checkbox(item.name_de,value=checked,key=f"ingredient_{item.id}")
            if value: pantry.ingredient_ids.add(item.id)
            else: pantry.ingredient_ids.discard(item.id)

    free_text=st.text_input("Weitere Zutaten",placeholder="z. B. Hafermilch, Banane")
    if st.button("Eingabe hinzufügen",use_container_width=True) and free_text.strip():
        unknown=[]
        for term in (part.strip() for part in free_text.replace(";",",").split(",")):
            if term and pantry.add(term,catalog) is None: unknown.append(term)
        if unknown:
            st.warning("Nicht erkannt: " + ", ".join(unknown))
        else:
            st.success("Zutat(en) hinzugefügt.")

    st.markdown("**Grundausstattung**")
    basics=st.columns(2)
    for col,ingredient_id in zip(basics,("water","ice")):
        item=catalog.require(ingredient_id)
        available=col.checkbox(f"{item.name_de} immer verfügbar",value=item.id in pantry.ingredient_ids,key=f"basic_{item.id}")
        if available: pantry.ingredient_ids.add(item.id)
        else: pantry.ingredient_ids.discard(item.id)

    pantry.set_servings(st.number_input("Portionen",min_value=1,max_value=8,value=pantry.servings,step=1))

    selected=pantry.selected(catalog)
    if selected:
        st.markdown("**Ausgewählt:** " + ", ".join(item.name_de for item in selected))
    else:
        st.info("Noch keine Zutaten ausgewählt.")
    return pantry
