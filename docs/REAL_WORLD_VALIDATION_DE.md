# Reale Smoothie-Validierung

Dieser Schritt ist bewusst manuell. Automatisierte Tests können prüfen, ob
Mengen innerhalb definierter Grenzen liegen, aber nicht, ob ein Smoothie
tatsächlich angenehm schmeckt oder die Textur stimmt.

## Vorgehen

Für jeden Test:

1. Genannte Zutaten in der App auswählen. **Wasser und Eis nur aktivieren, wenn sie im Testfall ausdrücklich genannt sind.**
2. Eine Portion einstellen.
3. Den reproduzierbaren Referenzvorschlag mit `python -m scripts.prepare_real_world_validation R1` (entsprechend R2–R6) erzeugen. **Dieser Runner ist für den M9-Test die maßgebliche Referenz.** Er verwendet Seed 0, Standardpräferenzen und denselben Generator-/Scoring-/Mengenpfad wie die App.
4. Der Runner wählt den bestbewerteten gültigen Kandidaten, der **alle im jeweiligen Testfall genannten Zutaten enthält**. So können charakteristische Zutaten wie Spinat, Erdnussmus, Chiasamen oder Ingwer nicht durch das Ranking aus dem eigentlichen Test verschwinden.
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

Die Vorratslisten sind **exakt** zu verstehen: keine stillschweigend zusätzlich aktivierten Grundzutaten. Für die Referenzvalidierung sind zugleich alle genannten Zutaten Pflichtbestandteile des Testrezepts. Mindestens R1–R4 sollten vor dem finalen Release physisch getestet werden.
R5–R6 dienen besonders dazu, Textur- und Intensitätsgrenzen zu prüfen.

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

Änderungen an Mengenregeln oder Scoring-Gewichten sollten erst vorgenommen
werden, wenn ein Problem reproduzierbar ist. Ein einzelner persönlicher
Geschmackswunsch sollte bevorzugt über die vorhandenen Präferenzen abgebildet
werden, nicht über eine globale Regeländerung.


## Reproduzierbare Referenzrezepte

Alle aktuellen Referenzrezepte können direkt aus dem Repository erzeugt werden:

```bash
python -m scripts.prepare_real_world_validation
```

Nur einzelne Fälle:

```bash
python -m scripts.prepare_real_world_validation R1 R2 R3 R4
```

Maschinenlesbare Ausgabe:

```bash
python -m scripts.prepare_real_world_validation --json
```

Damit werden keine Geschmacksergebnisse vorweggenommen; das Skript friert nur die technischen Eingaben für den physischen Test reproduzierbar ein und stellt sicher, dass der jeweilige Testzweck tatsächlich im Rezept enthalten ist.
