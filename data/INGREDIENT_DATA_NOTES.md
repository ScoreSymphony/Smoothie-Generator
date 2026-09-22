# Ingredient data curation notes

The expanded local catalog is intended as a practical smoothie knowledge base,
not as a food-composition authority.

## Curation principles

- One stable canonical ID represents one ingredient concept.
- German display names are primary; common German/English aliases support pantry input.
- Semantic duplicates are avoided rather than stored as separate ingredients.
- Sensory values use the existing 0–5 application scale and are intentionally heuristic.
- Typical amount ranges are plausible smoothie-use ranges, not serving recommendations.
- Positive compatibility tags express affinities only; they are not hard whitelists.
- Hard incompatibilities, when needed, use explicit `avoid:<ingredient_id>` tags.
- Vegan/allergen metadata is conservative where a generic ingredient clearly implies it.
- Brand-dependent products use generic nutrition approximations and may differ in practice.

## Category design

The generator keeps a compact set of top-level categories. Finer distinctions
are represented as subcategories so existing generation/scoring behavior does
not need a second parallel category system.

Examples:

- `greens / vegetable`: carrot, beetroot, celery, zucchini, fennel;
- `boosters / grain`: oats, quinoa flakes, millet flakes;
- `liquid / plant_based`: oat, almond, soy, rice, cashew, pea, coconut drinks;
- `creamy_base / dairy`: yogurt, Greek yogurt, skyr, quark, kefir;
- `creamy_base / plant_based`: coconut, soy, and oat yogurt.

## Nutrition

`nutrition.json` contains a matching entry for every canonical ingredient.
Values are approximate per 100 g and exist so the app can remain fully offline.
They should be treated as estimates, especially for processed drinks, yogurts,
protein powders, and other brand-dependent foods.
