# Smoothie Generator

A private Streamlit application that will suggest and generate smoothies from
ingredients that are already available.

The project starts deliberately small and local-first. Core recipe matching,
generation, scoring, quantities, nutrition, and personalization will be built
as deterministic Python domain logic rather than being coupled to the UI or a
paid AI service.

## Current status

The application now implements the functional roadmap through **M8**:

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

No external API is required for the core user flow.

## Requirements

- Python 3.12 recommended
- pip

No Gemini, Unsplash, paid AI API, or other external service is required to
start the application.

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

## Third-party references

Open-source projects reviewed during planning are documented in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Code must only be reused when its license permits it, and required notices must
be retained.

## License

See [LICENSE](LICENSE).
