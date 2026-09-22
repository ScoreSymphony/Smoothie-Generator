# Smoothie Generator

Private **mobile-only** Smoothie Generator for Android and iOS.

The app lets the user select ingredients that are already available and then
find or generate suitable smoothie recipes. The core product is designed to
work offline and to keep personal state on the device.

## Product scope

The Smoothie Generator is:

- a phone app built with React Native, Expo and TypeScript;
- one shared codebase for Android and iOS;
- offline-first;
- based on bundled curated ingredient, recipe and nutrition data;
- locally persistent on the device;
- usable without a mandatory backend or paid API.

It is **not** a Streamlit app, website, browser product, Docker-hosted service
or localhost application.

## Current migration status

The previous implementation was a Python/Streamlit web application. That
runtime is being replaced by the native mobile architecture tracked in
[issue #11](https://github.com/ScoreSymphony/Smoothie-Generator/issues/11).

The curated data and proven rule-based domain behavior remain valuable
migration inputs, but the shipped application will use TypeScript/mobile
implementations.

Current mobile foundation:

- Expo SDK 57
- React Native + TypeScript
- Expo Router navigation
- Android/iOS-only Expo configuration
- shared theme tokens and reusable components
- SQLite persistence foundation
- Jest + React Native Testing Library
- GitHub Actions checks for dependency compatibility, linting, type checking,
  tests and Android bundle export

## Requirements

- Node.js 22.13 or newer
- npm
- Expo-compatible Android/iOS development environment when using an emulator
  or native local build
- Expo Go or a development build when running on a physical phone, depending
  on the feature set being tested

No Python, Streamlit, Docker, browser server, Gemini, Unsplash or paid AI API
is required for the mobile application.

## Setup

Clone the repository:

```bash
git clone https://github.com/ScoreSymphony/Smoothie-Generator.git
cd Smoothie-Generator
```

Install dependencies:

```bash
npm install
```

Check that the installed Expo package versions match the SDK:

```bash
npx expo install --check
```

Start the mobile development server:

```bash
npm start
```

Android:

```bash
npm run android
```

iOS:

```bash
npm run ios
```

The development server is tooling for loading the native app during
development; the end-user product itself is not a browser/web application.

## Quality checks

Run the complete local check:

```bash
npm run check
```

Or separately:

```bash
npm run lint
npm run typecheck
npm test
```

## Target project structure

```text
Smoothie-Generator/
├── .github/
│   └── workflows/
├── __tests__/
├── data/                 # curated migration source data
├── docs/
├── src/
│   ├── app/              # Expo Router routes/screens
│   ├── components/       # reusable native UI
│   ├── data/             # mobile data loaders/adapters
│   ├── domain/           # UI-independent TypeScript domain logic
│   ├── navigation/       # navigation helpers where needed
│   ├── storage/          # on-device persistence
│   ├── theme/            # design tokens/theme
│   └── utils/
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

During the migration, the old Python domain modules may remain temporarily as
a reference for porting tested behavior. They are not part of the target
runtime and must be removed once their TypeScript replacements are complete.

## Architecture rules

- The shipped product is mobile-only.
- No Streamlit or Python runtime is used by the shipped app.
- Domain logic is plain TypeScript and independent of React Native components.
- Core matching, generation, scoring and nutrition work offline.
- Curated application data is bundled locally.
- Personal preferences, favorites and history stay on-device by default.
- External services are optional adapters only.
- No paid AI/API is required for normal operation.
- German is the default user-facing language.
- Native UI is designed for phone-sized screens, touch input, safe areas and
  accessibility.

## Roadmap

1. M0 — Native mobile foundation
2. M1 — TypeScript ingredient model and bundled database
3. M2 — Native pantry input
4. M3 — On-device stored-recipe matcher
5. M4 — On-device rule-based generator
6. M5 — On-device scoring and ranking
7. M6 — Quantities, servings and offline nutrition
8. M7 — On-device preferences, restrictions and feedback
9. M8 — Complete native mobile UX
10. M9 — Mobile quality audit, installable builds and private distribution

See [issue #11](https://github.com/ScoreSymphony/Smoothie-Generator/issues/11)
for the binding roadmap.

## Third-party references

Open-source projects reviewed during planning are documented in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Code is reused only when its
license permits it and required notices are preserved.

## License

See [LICENSE](LICENSE).
