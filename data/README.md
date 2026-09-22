# Data

Local structured application data belongs in this directory.

Current data sets include:

- `ingredients.json`: canonical curated smoothie ingredient knowledge base;
- `recipes.json`: curated stored smoothie recipes;
- `nutrition.json`: local approximate nutrition data used for recipe estimates;
- `quality_scenarios.json`: representative pantry/restriction quality scenarios.

Ingredient metadata, sensory scales, amount ranges, compatibility tags and nutrition
values are intentionally curated local data. Their approximation rules and maintenance
guidelines are documented in [INGREDIENT_DATA_NOTES.md](INGREDIENT_DATA_NOTES.md).

Core application behavior must not require a paid external API.
