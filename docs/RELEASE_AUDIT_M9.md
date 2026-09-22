# M9 Release Audit

## Technische Qualitätsgates

| Bereich | Abdeckung | Release-Status |
| --- | --- | --- |
| Zutatenvalidierung | `tests/test_ingredients.py` | bestanden |
| Pantry/Matcher | `tests/test_pantry.py`, `tests/test_recipes.py` | bestanden |
| Generator | `tests/test_generator.py` | bestanden |
| Scoring/Ranking | `tests/test_scoring.py` | bestanden |
| Mengen/Nährwerte | `tests/test_quantities_nutrition.py` | bestanden |
| Restriktionen/Allergene | `tests/test_preferences.py` + Qualitätsszenarien | bestanden |
| Persistenz | Präferenzen + Verlauf | bestanden |
| Streamlit End-to-End | `tests/test_app_smoke.py` | bestanden |
| 42 Pantry-Szenarien | `data/quality_scenarios.json` | bestanden |
| Fresh private deployment | Docker-Compose-CI-Smoke | bestanden |
| Private Daten/Backups | Git-ignore-Gate in CI | bestanden |
| Physische Geschmacks-/Texturprüfung | `docs/REAL_WORLD_VALIDATION_DE.md` | optional, kein Release-Gate |

## Releaseentscheidung

M9 gilt auf technischer Ebene als abgeschlossen, sobald die vollständige CI auf dem aktuellen Release-Stand erfolgreich ist. Die Software behauptet dabei **keine** physische Geschmacks- oder Texturvalidierung.

Der Release-Gate umfasst ausschließlich automatisierbare und reproduzierbare Softwarekriterien:

- Domain- und Persistenztests;
- Pantry-/Generator-/Scoring-Qualitätsszenarien;
- Streamlit-End-to-End-Smoke;
- reproduzierbares privates Docker-Deployment;
- localhost-only Binding;
- Schutz privater Zustands- und Backup-Dateien.

## Private Deployment

Standard: Docker Compose, gebunden an `127.0.0.1:8501`.

Persistente private Daten werden über `SMOOTHIE_STATE_DIR` getrennt von den statischen Anwendungsdaten gespeichert. Die Compose-Konfiguration verwendet `./private-data`.

## Optionale manuelle Validierung

`docs/REAL_WORLD_VALIDATION_DE.md` und `python -m scripts.prepare_real_world_validation` bleiben als freiwillige Werkzeuge erhalten. Sie können später genutzt werden, um Mengen- oder Geschmacksregeln empirisch nachzujustieren, sind aber weder Voraussetzung für M9 noch für das Schließen von Issue #10.
