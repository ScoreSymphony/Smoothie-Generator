# Smoothie Generator

Private **mobile-only** Smoothie Generator for Android and iOS.

Die App lässt Zutaten aus dem vorhandenen Vorrat auswählen und empfiehlt daraus
gespeicherte Rezepte sowie neu generierte Smoothie-Kombinationen. Matching,
Generierung, Ranking, Mengen, Nährwerte und persönliche Daten funktionieren
lokal auf dem Handy.

## Produktumfang

Der Smoothie Generator ist:

- eine Phone-App mit React Native, Expo und TypeScript;
- eine gemeinsame Codebasis für Android und iOS;
- offline-first;
- mit 119 kuratierten Zutaten, 80 gespeicherten Rezepten und lokaler
  Nährwertdatenbank;
- lokal persistent über Expo SQLite;
- ohne verpflichtenden Backend-Server, Browser oder bezahlte API nutzbar.

Der frühere Python-/Streamlit-Prototyp existiert nur noch in der Git-Historie
und gehört nicht zum aktiven Produkt.

## Aktuelle Funktionen

- native Pantry-Auswahl mit Suche, Kategorien, Freitext und Aliasauflösung;
- Portionswahl und konfigurierbare immer-verfügbare Basics;
- gespeicherte Rezept-Matches mit fehlenden Zutaten und Substitutionen;
- regelbasierte On-Device-Generierung neuer Smoothies;
- deterministisches Scoring und Ranking;
- Vegan-/Allergen-/Milchfrei-/Exclude-Regeln;
- Mengen und Serving-Skalierung;
- Offline-Nährwerte für Kalorien, Protein, Kohlenhydrate, Zucker, Fett und
  Ballaststoffe;
- Vorlieben, Favoriten und Feedback-Lernen;
- native Empfehlungen und Rezeptdetails;
- Favoriten- und Verlaufsansichten;
- lokale Persistenz ohne Benutzerkonto;
- deutsche, phone-first Benutzeroberfläche.

## Technischer Stack

- Expo SDK 57
- React Native 0.86
- TypeScript
- Expo Router
- Expo SQLite
- Jest + React Native Testing Library
- GitHub Actions für Expo-Kompatibilität, Lint, Typecheck, Tests,
  Mobile-only-Audit, Android-Export und installierbaren Android-APK-Build

Android und iOS sind die einzigen konfigurierten Expo-Plattformen.
`supportsTablet` ist für iOS deaktiviert.

## Anforderungen für die Entwicklung

- Node.js 22.13 oder neuer
- npm
- für native Android-Builds: JDK 17 und Android SDK
- für native iOS-Builds: macOS und Xcode

Abhängigkeiten installieren:

```bash
npm install
```

Expo-Kompatibilität prüfen:

```bash
npx expo install --check
```

Entwicklungsmodus starten:

```bash
npm start
```

Android-Entwicklung:

```bash
npm run android
```

iOS-Entwicklung:

```bash
npm run ios
```

Der Expo-Development-Server ist ausschließlich Entwicklungswerkzeug. Die
Endnutzer-App selbst ist eine installierte native Handy-App.

## Qualität und Release-Audit

Vollständigen Software-Check ausführen:

```bash
npm run check
```

Das umfasst:

```bash
npm run lint
npm run typecheck
npm test
npm run audit:release
```

Der Release-Audit prüft unter anderem Mobile-only-Konfiguration, lokale
Datensätze, Persistenzmodule, Kernrouten, direkte Netzwerkabhängigkeiten im
App-Code und das Fehlen alter Python-/Streamlit-/Docker-Release-Artefakte.

Die GitHub-CI baut zusätzlich ein echtes installierbares Android-APK über Expo
Prebuild + Gradle. Damit wird nicht nur ein JavaScript-Bundle validiert.

Details: [M9 Software-Release-Audit](docs/RELEASE_AUDIT_DE.md).

## Private Installation

Für Android kann lokal ein privates, debug-signiertes APK erzeugt werden:

```bash
npm run build:android:private
```

Ausgabe:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Das APK kann anschließend direkt privat auf ein Android-Handy übertragen und
installiert werden. Es wird nicht automatisch als öffentliches Release
hochgeladen.

Für iOS ist der lokale Xcode-/Signing-Pfad dokumentiert. Die Laufzeit der App
benötigt weder Expo/EAS noch einen Server.

Vollständige Anleitung:
[Private Installation auf Android und iOS](docs/PRIVATE_INSTALLATION_DE.md).

## Offline-Verhalten und lokale Daten

Die App bündelt Zutaten, Rezepte und Nährwerte im Installationspaket. Der
normale Kernbetrieb verwendet keine Netzwerk-API.

Pantry, Vorlieben, Favoriten, Feedback und Verlauf werden lokal gespeichert.
Ein eigener Datenexport/Backup-Dialog ist derzeit nicht implementiert und wird
daher nicht als Release-Funktion behauptet.

## Projektstruktur

```text
Smoothie-Generator/
├── .github/
│   └── workflows/
├── __tests__/            # TypeScript-/React-Native-Tests
├── assets/               # native App-Assets
├── data/                 # kuratierte lokale Daten
├── docs/                 # Mobile-/Release-Dokumentation
├── scripts/              # Release-Audit und private Build-Hilfen
├── src/
│   ├── app/              # Expo-Router-Screens
│   ├── components/       # wiederverwendbare native UI
│   ├── data/             # TypeScript-Datenloader
│   ├── domain/           # UI-unabhängige Domainlogik
│   ├── storage/          # On-Device-Persistenz
│   └── theme/            # Design Tokens
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

## Architekturregeln

- Das Produkt ist mobile-only.
- Android und iOS sind die einzigen Zielplattformen.
- Runtime und Domainlogik verwenden TypeScript/React Native.
- Domainlogik bleibt von UI-Komponenten getrennt.
- Matching, Generierung, Scoring, Mengen und Nährwerte funktionieren offline.
- Anwendungsdaten werden lokal gebündelt.
- Persönliche Daten bleiben standardmäßig auf dem Gerät.
- Externe Dienste sind keine Voraussetzung für den Kernbetrieb.
- Keine bezahlte KI/API ist notwendig.
- Deutsch ist die Standardoberfläche.
- Die UI ist für Phone-Screens, Touch, Safe Areas und Accessibility ausgelegt.

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

Siehe [Issue #11](https://github.com/ScoreSymphony/Smoothie-Generator/issues/11)
für die verbindliche Roadmap.

## Testgrenze

Der technische Release beansprucht keine reale Verkostung und keine manuelle
Prüfung auf einem konkreten physischen Gerät. Solche Aktivitäten sind optional
und kein Bestandteil des Software-Release-Gates.

## Third-party references

Open-Source-Projekte aus der Planungsphase sind in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) dokumentiert. Code wird nur
unter Beachtung der jeweiligen Lizenzbedingungen übernommen.
