# Optionale reale Smoothie-Validierung

Dieses Dokument ist **kein Bestandteil des Software-Release-Gates** und wird
im aktuellen Projektumfang nicht durchgeführt. Es bleibt ausschließlich als
optionale Vorlage für eine mögliche spätere empirische Geschmacks- und
Texturprüfung erhalten.

Automatisierte Tests können Mengen, Datenkonsistenz, Restriktionen,
Nährwertaggregation und Rankingregeln prüfen, aber nicht, ob ein real
zubereiteter Smoothie subjektiv gut schmeckt.

## Optionale spätere Testfälle

| Test | Vorrat | Beobachtungsschwerpunkt |
| --- | --- | --- |
| R1 | Banane, Erdbeere, Haferdrink | cremiger Basisfall |
| R2 | Mango, Ananas, Kokoswasser | tropisch/fruchtig |
| R3 | Mango, Banane, Spinat, Wasser | grüner Smoothie |
| R4 | Banane, Erdnussmus, Haferdrink | protein-/fettreicher Fall |
| R5 | Blaubeere, Banane, Chiasamen, Mandeldrink | Samen/Textur |
| R6 | Orange, Mango, Orangensaft, Ingwer | Säure-/Intensitätsgrenze |

## Falls später freiwillig getestet wird

Eine spätere manuelle Prüfung sollte reproduzierbar dokumentieren:

- verwendete App-Version;
- exakt ausgewählte Zutaten;
- Portionenzahl;
- vom mobilen TypeScript-Pfad ausgegebene Mengen;
- Textur, Süße, Säure, Intensität und Gesamteindruck;
- erst anschließend ausprobierte Korrekturen.

Solche Ergebnisse dürfen nicht nachträglich als bereits erfolgte
Softwarevalidierung dargestellt werden.

## Aktueller Status

Alle realen Testfälle sind **nicht durchgeführt**. Das ist für M9 beabsichtigt:
Der vereinbarte Release-Scope umfasst Programmierung, automatisierte Tests,
Builds und Dokumentation, nicht physische Geräte- oder Geschmackstests.
