# Smoothie Generator

A private Streamlit application that will suggest and generate smoothies from
ingredients that are already available.

The project starts deliberately small and local-first. Core recipe matching,
generation, scoring, quantities, nutrition, and personalization will be built
as deterministic Python domain logic rather than being coupled to the UI or a
paid AI service.

## Current status

The application now implements the complete technical roadmap through **M9**:

- searchable pantry input with aliases and category filtering
- curated stored recipes plus deterministic pantry matching
- rule-based generation from available ingredients
- transparent scoring and recommendation ranking
- serving-scaled quantities and fully offline approximate nutrition
- private local preferences, restrictions, favorites, and feedback
- polished German recipe cards with preparation instructions
- alternative recommendation pages
- private local recipe history
- mobile-friendly actions, empty/error/loading states, and a lightweight theme
- pytest and GitHub Actions CI
- 42 representative strict-pantry quality scenarios
- reproducible Docker Compose deployment bound to localhost only
- automated fresh-deployment health check in CI
- documented private backup/update procedure

No external API is required for the core user flow.

The technical release is complete. Optional physical taste/texture experiments are documented in [docs/REAL_WORLD_VALIDATION_DE.md](docs/REAL_WORLD_VALIDATION_DE.md), but they are not required for the software release.

## Requirements

- Python 3.12 recommended
- pip

No Gemini, Unsplash, paid AI API, or other external service is required to
start the application.

## Empfohlener privater Start mit Docker

Für die alltägliche Nutzung ist Docker Compose der empfohlene Weg:

```bash
docker compose up -d --build
```

Danach im Browser öffnen:

```text
http://127.0.0.1:8501
```

Die mitgelieferte Konfiguration bindet den Port ausschließlich an localhost.
Persönliche Einstellungen, Favoriten und Verlauf werden im gitignorierten
Ordner `private-data/` gespeichert.

Update, Backup und Restore sind ausführlich dokumentiert in
[docs/PRIVATE_DEPLOYMENT_DE.md](docs/PRIVATE_DEPLOYMENT_DE.md).

## Local setup

Clone the repository and enter it:

```bash
git clone https://github.com/ScoreSymphony/Smoothie-Generator.git
cd Smoothie-Generator
```

Create and activate a virtual environment.

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Run the app:

```bash
streamlit run app.py
```

Streamlit will print the local URL, usually `http://localhost:8501`.

## Tests

Run the test suite with:

```bash
python -m pytest -q
```

The test suite covers the domain logic, persistence, ranking, quantities,
nutrition, personalization, recommendation alternatives, and the Streamlit
user flow through `streamlit.testing.v1.AppTest`.

## Project structure

```text
Smoothie-Generator/
├── .github/
│   └── workflows/
│       └── ci.yml
├── components/
│   └── __init__.py
├── data/
│   └── README.md
├── smoothie/
│   └── __init__.py
├── tests/
│   └── test_app_smoke.py
├── utils/
│   └── __init__.py
├── .gitignore
├── app.py
├── LICENSE
├── README.md
├── requirements.txt
└── THIRD_PARTY_NOTICES.md
```

## Architecture rules

The codebase follows these boundaries from the start:

- `app.py` and `components/` contain presentation/UI concerns.
- `smoothie/` contains domain logic and must remain independent of Streamlit.
- `data/` contains local structured data required by the application.
- `utils/` contains infrastructure helpers and optional external adapters.
- External APIs must be optional and must not be required for the core app to
  start or generate recipes.
- Core functionality should remain testable without network access.

## Planned development

The project roadmap is tracked in GitHub issues:

1. M0 — Project foundation
2. M1 — Ingredient domain model and database
3. M2 — Pantry input UX
4. M3 — Stored recipe matcher
5. M4 — Rule-based generator
6. M5 — Candidate scoring and flavor balance
7. M6 — Quantities, servings and nutrition
8. M7 — Preferences, restrictions and feedback
9. M8 — Complete user experience
10. M9 — Final validation and private deployment

See issue #11 for the complete roadmap and dependency graph.

## Release validation

The technical release audit is documented in
[docs/RELEASE_AUDIT_M9.md](docs/RELEASE_AUDIT_M9.md). The automated gates
include domain tests, the 42-scenario pantry quality set, Streamlit end-to-end
smoke coverage, and a Docker Compose deployment health check.

Physical recipe validation is available as an optional manual follow-up in [docs/REAL_WORLD_VALIDATION_DE.md](docs/REAL_WORLD_VALIDATION_DE.md). It is intentionally outside the software release gate; no taste or texture result is claimed by the automated release.

## Third-party references

Open-source projects reviewed during planning are documented in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Code must only be reused when its license permits it, and required notices must
be retained.

## License

See [LICENSE](LICENSE).
