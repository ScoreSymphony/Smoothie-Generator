# Smoothie Generator

Private **mobile-only** Smoothie Generator for Android and iOS.

The product is a React Native app built with Expo and TypeScript. It is not a
Streamlit application, website, Docker service, or browser-first product.

## Product direction

The finished app will let the intended user:

1. select ingredients that are currently available;
2. set restrictions and preferences;
3. receive several stored or generated smoothie recommendations;
4. view quantities, substitutions and approximate nutrition;
5. save favorites and revisit history;
6. use the core product offline without a mandatory backend or paid API.

The existing curated ingredient, recipe, nutrition and quality data remains in
the repository and is bundled locally with the app.

## Mobile stack

- React Native
- Expo SDK 57
- TypeScript
- React Navigation
- on-device persistence
- Android and iOS from one codebase
- offline-first domain/data architecture

Expo SDK 57 targets React Native 0.86 and React 19.2.3.

## Requirements

- Node.js 22.13 or newer
- npm
- Android Studio / Android Emulator for Android development, or a physical Android device
- Xcode / iOS Simulator for local iOS development on macOS, or a physical iPhone where supported

No Python runtime, Streamlit server, Docker container, browser, paid AI API, or
mandatory backend is required for the app.

## Local development

Clone the repository:

```bash
git clone https://github.com/ScoreSymphony/Smoothie-Generator.git
cd Smoothie-Generator
```

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm start
```

Then open the app on an Android/iOS device or emulator. The product scope does
not include a web build.

Convenience commands:

```bash
npm run android
npm run ios
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
```

GitHub Actions runs linting, TypeScript checks, tests, Expo dependency
compatibility validation, and an Android JavaScript bundle export.

## Project structure

```text
Smoothie-Generator/
├── .github/workflows/ci.yml
├── assets/
├── data/
│   ├── ingredients.json
│   ├── nutrition.json
│   ├── quality_scenarios.json
│   └── recipes.json
├── docs/
├── src/
│   ├── components/
│   ├── data/
│   ├── domain/
│   ├── navigation/
│   ├── screens/
│   ├── storage/
│   ├── theme/
│   └── utils/
├── tests/
├── App.tsx
├── app.json
├── package.json
└── tsconfig.json
```

## Architecture rules

- The shipped product is exclusively a phone app.
- Domain logic is pure TypeScript and independent from UI components.
- Curated application data is local and available offline.
- Personal state stays on-device by default.
- External services are optional adapters only.
- No Python/Streamlit runtime is part of the mobile baseline.
- No localhost or server workflow is required for normal use.
- German is the default user-facing language.

## Roadmap

The mobile roadmap is tracked in GitHub issues #1 through #10, with #11 as the
central mobile-only roadmap.

The immediate implementation sequence is:

- #1 / M0 — native mobile foundation
- #2 / M1 — TypeScript ingredient domain and mobile data catalog
- #3 / M2 — native pantry selection UX
- #4 / M3 — on-device stored-recipe matcher
- #5 / M4 — on-device rule-based generator
- #6 / M5 — scoring and recommendation ranking
- #7 / M6 — quantities and offline nutrition
- #8 / M7 — preferences, restrictions and feedback
- #9 / M8 — complete native UX
- #10 / M9 — final mobile audit and private distribution

## Third-party references

Open-source projects reviewed during planning remain documented in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Code is reused only where
licensing permits it and required notices are retained.
