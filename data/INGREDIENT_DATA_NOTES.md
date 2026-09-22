# Ingredient data notes

The ingredient catalog is a curated local knowledge base for smoothie generation. It is
not intended to be a food-science or medical database.

## Canonical identity and aliases

Each semantic ingredient has one stable lowercase canonical ID. German display names,
common German spelling variants and useful English aliases resolve to that ID. Separate
records should only exist where the ingredients are meaningfully different for smoothie
generation (for example coconut water, coconut drink and coconut milk).

## Category and subcategory model

The stable top-level categories are deliberately broad because generator and scoring
logic already depend on them. More specific groups are represented through
`subcategory`, including:

- `vegetable` and `leafy_green` under `greens`;
- `dairy` and `plant_based` under liquid or creamy bases;
- `grain` under boosters;
- `juice`, `tea`, `coffee` and `water` under liquids.

This preserves backward compatibility while allowing coverage checks for the richer
ingredient taxonomy.

## Sensory and generation metadata

Sweetness, acidity, bitterness, creaminess, intensity and water contribution use an
integer 0–5 heuristic scale. These values describe typical smoothie behavior rather than
laboratory measurements. Typical amount ranges are practical one-serving ingredient
bounds used by the quantity calculator. Compatibility tags are soft descriptive signals;
only explicit `avoid:<ingredient_id>` tags represent hard pair exclusions.

## Nutrition

`nutrition.json` contains approximate generic values per 100 g so nutrition estimates
remain fully offline. Natural ingredients vary by cultivar and ripeness, while processed
products vary substantially by brand and recipe. Values therefore serve recipe comparison
and rough estimation only and should be updated conservatively when the ingredient catalog
changes.

Every canonical ingredient must have exactly one nutrition entry because the existing M6
nutrition loader intentionally rejects missing or unknown ingredient IDs.
