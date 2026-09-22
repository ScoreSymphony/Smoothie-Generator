# Optionale reale Smoothie-Validierung

Dieser Schritt ist bewusst manuell und **nicht Bestandteil des Software-Release-Gates**.
Die technische Mobile-Version kann ohne physische Verkostung abgeschlossen werden. Dieses
Dokument dient als optionales Werkzeug für spätere empirische Feinabstimmung.

Automatisierte Tests können prüfen, ob Mengen innerhalb definierter Grenzen liegen, aber
nicht, ob ein Smoothie tatsächlich angenehm schmeckt oder die Textur stimmt.

## Mobile-only Grundsatz

Die Referenzrezepte für diese Validierung müssen aus demselben TypeScript-Domainpfad
stammen, den auch die installierte Handy-App verwendet. Ein separater Python-, Web- oder
Server-Runner ist nicht Teil des Projekts.

Für M9 soll der mobile Generator für die unten definierten Fälle einen reproduzierbaren
Testmodus bzw. eine TypeScript-Testhilfe bereitstellen. Bis dieser Pfad in M4–M6
implementiert ist, bleibt dieses Dokument ein Validierungsprotokoll und behauptet keine
bereits verfügbare Referenzgenerierung.

## Vorgehen

Für jeden Test:

1. Genannte Zutaten in der App auswählen. **Wasser und Eis nur aktivieren, wenn sie im Testfall ausdrücklich genannt sind.**
2. Eine Portion einstellen.
3. Den reproduzierbaren Referenzvorschlag über den bis M9 implementierten mobilen
   TypeScript-Testpfad erzeugen. Dafür gelten Seed 0, Standardpräferenzen und derselbe
   Generator-/Scoring-/Mengenpfad wie in der App.
4. Der Referenzfall soll den bestbewerteten gültigen Kandidaten verwenden, der **alle im
   jeweiligen Testfall genannten Zutaten enthält**. So können charakteristische Zutaten
   wie Spinat, Erdnussmus, Chiasamen oder Ingwer nicht durch das Ranking aus dem
   eigentlichen Test verschwinden.
5. Genau dieses Referenzrezept mit den ausgegebenen Mengen zubereiten.
6. Nichts spontan korrigieren, bevor die erste Bewertung notiert wurde.
7. Erst danach eine sinnvolle Korrektur ausprobieren und dokumentieren.

## Testset

| Test | Vorrat | Ziel |
| --- | --- | --- |
| R1 | Banane, Erdbeere, Haferdrink | klassischer cremiger Basisfall |
| R2 | Mango, Ananas, Kokoswasser | tropisch/fruchtig |
| R3 | Mango, Banane, Spinat, Wasser | grüner Smoothie |
| R4 | Banane, Erdnussmus, Haferdrink | protein-/fettreicher Fall |
| R5 | Blaubeere, Banane, Chiasamen, Mandeldrink | Samen/Textur |
| R6 | Orange, Mango, Orangensaft, Ingwer | säure-/intensitätsreicher Grenzfall |

Die Vorratslisten sind **exakt** zu verstehen: keine stillschweigend zusätzlich
aktivierten Grundzutaten. Für die Referenzvalidierung sind zugleich alle genannten Zutaten
Pflichtbestandteile des Testrezepts. R1–R4 bilden bei freiwilliger manueller Validierung
die Kernfälle. R5–R6 dienen zusätzlich dazu, Textur- und Intensitätsgrenzen zu prüfen.
Keiner dieser Fälle ist Voraussetzung für den technischen Release.

## Bewertungsbogen

Je Kriterium 1 bis 5 bewerten:

- **Textur:** zu dünn ↔ passend ↔ zu dick
- **Süße:** zu wenig ↔ passend ↔ zu viel
- **Säure:** zu wenig ↔ passend ↔ zu viel
- **Geschmacksintensität:** zu schwach ↔ passend ↔ dominant
- **Portionsgröße:** zu klein ↔ passend ↔ zu groß
- **Gesamteindruck:** 1 = nicht wiederholen, 5 = sehr gut

Zusätzlich notieren:

- Welche Zutat oder Menge war problematisch?
- Welche Änderung hat den Smoothie verbessert?
- Ist die Änderung allgemein oder nur für diesen konkreten Smoothie sinnvoll?

## Ergebnisse

| Test | Datum | Textur | Süße | Säure | Intensität | Portion | Gesamt | Beobachtung / nötige Änderung |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| R1 | offen | – | – | – | – | – | – | noch nicht physisch getestet |
| R2 | offen | – | – | – | – | – | – | noch nicht physisch getestet |
| R3 | offen | – | – | – | – | – | – | noch nicht physisch getestet |
| R4 | offen | – | – | – | – | – | – | noch nicht physisch getestet |
| R5 | offen | – | – | – | – | – | – | noch nicht physisch getestet |
| R6 | offen | – | – | – | – | – | – | noch nicht physisch getestet |

## Tuning-Regel

Änderungen an Mengenregeln oder Scoring-Gewichten sollten erst vorgenommen werden, wenn
ein Problem reproduzierbar ist. Ein einzelner persönlicher Geschmackswunsch sollte
bevorzugt über die vorhandenen Präferenzen abgebildet werden, nicht über eine globale
Regeländerung.
