# Kuratierter Rezeptkorpus

Der gespeicherte Rezeptbestand umfasst aktuell **80 kuratierte Smoothies**. Die Rezepte
verwenden ausschließlich kanonische Ingredient-IDs aus `data/ingredients.json` und
bleiben vollständig lokal verfügbar.

## Abdeckung nach Ingredient-Kategorie

Die folgenden Werte geben an, in wie vielen der 80 Rezepte mindestens eine Zutat der
jeweiligen Kategorie vorkommt:

- `berries`: 24 Rezepte
- `boosters`: 40 Rezepte
- `creamy_base`: 14 Rezepte
- `fruit`: 69 Rezepte
- `greens`: 23 Rezepte
- `ice`: 8 Rezepte
- `liquid`: 73 Rezepte
- `nuts`: 6 Rezepte
- `protein`: 11 Rezepte
- `seeds`: 21 Rezepte
- `spices`: 34 Rezepte
- `sweetener`: 13 Rezepte

## Abdeckung nach Rezept-Tags

- `beeren`: 18 Rezepte
- `cremig`: 26 Rezepte
- `erfrischend`: 7 Rezepte
- `erdig`: 1 Rezept
- `frisch`: 21 Rezepte
- `fruchtig`: 21 Rezepte
- `frühstück`: 10 Rezepte
- `grün`: 15 Rezepte
- `herb`: 3 Rezepte
- `herbst`: 1 Rezept
- `mild`: 3 Rezepte
- `protein`: 12 Rezepte
- `samen`: 3 Rezepte
- `schokolade`: 4 Rezepte
- `schokoladig`: 1 Rezept
- `sommer`: 1 Rezept
- `sättigend`: 19 Rezepte
- `tropisch`: 14 Rezepte
- `vegan`: 63 Rezepte
- `würzig`: 3 Rezepte

## Repräsentativer M9-Geschmackstest-Subset

Der folgende feste Subset ist für die spätere physische Verhältnis- und
Geschmackskontrolle in #10 / M9 vorgesehen:

- `strawberry_banana` — klassischer cremiger Frucht-Smoothie und Basisverhältnis
- `tropical` — tropische Frucht-Säure- und Flüssigkeitsbalance
- `green_mango` — grüner Smoothie mit Frucht-Gemüse-Balance
- `berry_breakfast` — Frühstück, Hafer und Sättigung
- `peanut_banana` — proteinreich, nussig und cremig
- `watermelon_mint` — leichte erfrischende Konsistenz
- `silken_tofu_mango` — vegane Proteinbasis mit Seidentofu
- `apple_cucumber_fresh` — wenig cremige, frische Frucht-Gemüse-Kombination

Die verbindlichen automatisierten Corpus-Checks werden in der TypeScript-Mobile-Codebasis
unter M1/M3 aufgebaut. Sie sollen Umfang, IDs, Ingredient-Referenzen, Mengenstrukturen,
Substitutionen, Dubletten, Kategorie-/Stilabdeckung, Pantry-Matches und diesen
Validierungs-Subset prüfen.
