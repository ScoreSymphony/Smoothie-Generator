# Data

Local structured application data belongs in this directory.

Current data sets include:

- `ingredients.json`: curated canonical smoothie ingredient knowledge base;
- `recipes.json`: curated stored smoothie recipes;
- `nutrition.json`: fully local approximate nutrition data;
- `quality_scenarios.json`: representative pantry validation scenarios.

## Ingredient data model

The ingredient database is intentionally curated and deterministic. It does not
use runtime AI-generated metadata.

The top-level categories remain deliberately compact for generator behavior.
More specific families are represented through `subcategory`, for example:

- vegetables are represented inside `greens` with `subcategory: vegetable`;
- grains are represented inside `boosters` with `subcategory: grain`;
- dairy and plant-based bases are distinguished through `dairy` and
  `plant_based` subcategories;
- liquids distinguish water, juice, plant-based drinks, tea, and coffee.

Flavor, texture, compatibility, and typical-amount fields are heuristic
smoothie-oriented values rather than laboratory measurements. Nutrition values
are generic approximations per 100 g and can vary by brand, cultivar, and
preparation method.

Core application behavior must not require a paid external API.
