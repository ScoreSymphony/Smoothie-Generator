# M9 Release Audit

## Technische Qualitätsgates

| Bereich | Abdeckung | Release-Status |
| --- | --- | --- |
| Zutatenvalidierung | `tests/test_ingredients.py` | automatisiert |
| Pantry/Matcher | `tests/test_pantry.py`, `tests/test_recipes.py` | automatisiert |
| Generator | `tests/test_generator.py` | automatisiert |
| Scoring/Ranking | `tests/test_scoring.py` | automatisiert |
| Mengen/Nährwerte | `tests/test_quantities_nutrition.py` | automatisiert |
| Restriktionen/Allergene | `tests/test_preferences.py` + Qualitätsszenarien | automatisiert |
| Persistenz | Präferenzen + Verlauf | automatisiert |
| Streamlit End-to-End | `tests/test_app_smoke.py` | automatisiert |
| 42 Pantry-Szenarien | `data/quality_scenarios.json` | automatisiert |
| Fresh private deployment | Docker-Compose-CI-Smoke | automatisiert |
| Physische Geschmacks-/Texturprüfung | `docs/REAL_WORLD_VALIDATION_DE.md` | **offen** |

## Releaseentscheidung

Der technische Release-Gate kann nach erfolgreicher CI als bestanden gelten.
Der vollständige M9-Abschluss bleibt dennoch offen, bis die reale
Smoothie-Validierung durchgeführt und dokumentiert wurde.

## Private Deployment

Standard: Docker Compose, gebunden an `127.0.0.1:8501`.

Persistente private Daten werden über `SMOOTHIE_STATE_DIR` getrennt von den
statischen Anwendungsdaten gespeichert. Die Compose-Konfiguration verwendet
`./private-data`.

## Noch offener manueller Gate

Mindestens die vier Kernfälle R1–R4 aus
`docs/REAL_WORLD_VALIDATION_DE.md` physisch zubereiten und bewerten. Falls
dabei systematische Mengen-/Geschmacksprobleme auftreten, müssen diese vor dem
Schließen von Issue #10 korrigiert und erneut getestet werden.
