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

## Repräsentativer M9-Software-Regressions-Subset

Für das finale technische Release-Gate wird ein fester Satz gespeicherter
Rezepte automatisiert geladen, auf eine Portion quantifiziert und mit der
lokalen Nährwertdatenbank aggregiert:

- `strawberry_banana`
- `tropical`
- `green_mango`
- `berry_breakfast`
- `peanut_banana`
- `watermelon_mint`
- `silken_tofu_mango`
- `apple_cucumber_fresh`

Der Test prüft ausschließlich Softwareverträge: lokale Verfügbarkeit, gültige
Mengen und endliche/nichtnegative Nährwerte. Eine reale Verkostung oder
physische Verhältnisprüfung ist kein Bestandteil von M9.
