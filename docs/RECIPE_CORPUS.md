# Kuratierter Rezeptkorpus

Issue #24 erweitert den gespeicherten Rezeptbestand auf **60 kuratierte Smoothies**. Die Rezepte verwenden ausschließlich kanonische Ingredient-IDs aus `data/ingredients.json` und bleiben vollständig lokal verfügbar.

## Abdeckung nach Ingredient-Kategorie

- `berries`: 19 Rezepte
- `boosters`: 31 Rezepte
- `creamy_base`: 11 Rezepte
- `fruit`: 49 Rezepte
- `greens`: 10 Rezepte
- `ice`: 8 Rezepte
- `liquid`: 59 Rezepte
- `nuts`: 5 Rezepte
- `protein`: 11 Rezepte
- `seeds`: 13 Rezepte
- `spices`: 23 Rezepte
- `sweetener`: 13 Rezepte

## Abdeckung nach Rezept-Tags

- `beeren`: 14 Rezepte
- `cremig`: 22 Rezepte
- `erfrischend`: 7 Rezepte
- `frisch`: 16 Rezepte
- `fruchtig`: 16 Rezepte
- `frühstück`: 8 Rezepte
- `grün`: 6 Rezepte
- `mild`: 3 Rezepte
- `protein`: 11 Rezepte
- `samen`: 3 Rezepte
- `schokolade`: 4 Rezepte
- `sättigend`: 11 Rezepte
- `tropisch`: 12 Rezepte
- `vegan`: 44 Rezepte

## Repräsentativer M9-Geschmackstest-Subset

Der folgende feste Subset ist für die spätere physische Verhältnis- und Geschmackskontrolle in #10 / M9 vorgesehen:

- `strawberry_banana` — klassischer cremiger Frucht-Smoothie und Basisverhältnis
- `tropical` — tropische Frucht-Säure- und Flüssigkeitsbalance
- `green_mango` — grüner Smoothie mit Frucht-Gemüse-Balance
- `berry_breakfast` — Frühstück, Hafer und Sättigung
- `peanut_banana` — proteinreich, nussig und cremig
- `watermelon_mint` — leichte erfrischende Konsistenz
- `silken_tofu_mango` — vegane Proteinbasis mit Seidentofu
- `apple_cucumber_fresh` — wenig cremige, frische Frucht-Gemüse-Kombination

Die maschinellen Corpus-Checks liegen in `tests/test_recipe_corpus.py` und prüfen Umfang, IDs, Ingredient-Referenzen, Mengenstrukturen, Substitutionen, Dubletten, Kategorie-/Stilabdeckung, Pantry-Matches und diesen Validierungs-Subset.
