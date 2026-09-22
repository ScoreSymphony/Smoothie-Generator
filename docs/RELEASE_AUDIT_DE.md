# M9 Software-Release-Audit

Dieses Dokument beschreibt den finalen **Software- und Build-Audit** der
mobile-only Anwendung. Reale Geräte-, Geschmacks- oder Texturtests gehören
nicht zum technischen Release-Gate.

## Automatisches Release-Gate

`npm run check` umfasst:

1. Expo/React-Native-Linting
2. strikten TypeScript-Typecheck
3. die vollständige Jest-Test-Suite
4. `npm run audit:release`

Der Release-Audit prüft zusätzlich:

- Expo-Plattformen sind ausschließlich Android und iOS;
- iOS bleibt phone-only (`supportsTablet: false`);
- Android-Package und iOS-Bundle-Identifier sind gesetzt;
- alle Kernrouten der Handy-App existieren;
- der aktive Quellbaum enthält keine Python-, Streamlit- oder Docker-
  Release-Artefakte;
- der TypeScript-App-Code enthält keine direkten HTTP-/WebSocket-Clientaufrufe;
- Zutaten-, Rezept- und Nährwertdaten sind lokal gebündelt;
- die Nährwertabdeckung entspricht dem Zutatenkorpus;
- Pantry-, Präferenz- und Verlaufspersistenz sind vorhanden;
- keine offensichtliche Web-/Server-Framework-Abhängigkeit gehört zum aktiven
  npm-Paket.

## Bestehende automatisierte Testabdeckung

Die Suite deckt unter anderem ab:

- 119 Zutaten inklusive Validierung und Aliasauflösung;
- 80 kuratierte Rezepte und Substitutionen;
- Pantry-Eingabe und SQLite-Persistenz;
- Stored-Recipe-Matching;
- regelbasierte Generierung und 42 Pantry-Qualitätsszenarien;
- Scoring und deterministisches Ranking;
- Mengen-/Serving-Skalierung;
- lokale Nährwertaggregation für 119/119 Zutaten;
- Vegan-/Allergen-/Dairy-/Exclude-Regeln;
- Favoriten, Feedback und Preferences-Migration;
- History-Persistenz;
- Recommendation Cards;
- Pantry → Vorlieben/Empfehlungen;
- Empfehlungen → Rezeptdetail;
- Rezeptdetail → Verlauf/Favorit/Feedback.

## Build-Gate

Die GitHub-CI prüft zusätzlich:

1. `npx expo install --check`
2. Android-Bundle-Export
3. Expo Prebuild für Android
4. Gradle `assembleDebug`
5. Existenz eines installierbaren `app-debug.apk`

Damit wird ein echtes Android-APK gebaut, nicht nur ein JavaScript-Bundle.

Der iOS-Build wird in dieser Linux-CI nicht vorgetäuscht. Der lokale
macOS-/Xcode-Pfad ist in `docs/PRIVATE_INSTALLATION_DE.md` dokumentiert.

## Offline- und Serverfreiheit

Der Release-Audit scannt den aktiven `src/`-Code auf direkte Netzwerkclients.
Die Kernanwendung arbeitet mit gebündelten JSON-Daten und lokalem SQLite.
Es gibt keinen benötigten App-Server und keine Pflicht-Cloud.

## Persistenz

Automatisierte Tests decken Laden/Speichern/Zurücksetzen für Pantry,
Preferences/Favoriten/Feedback und Verlauf ab. Das entspricht einem
softwareseitigen Restart-/Reload-Test des Persistenzvertrags.

## Nicht behauptet

Dieser Audit behauptet ausdrücklich **nicht**:

- dass die App auf einem konkreten physischen Android-/iOS-Gerät manuell
  durchgeklickt wurde;
- dass reale Smoothies verkostet wurden;
- dass ein App-Store-Release oder eine öffentliche Distribution erfolgt ist;
- dass ein eigener Backup-/Export-Mechanismus vorhanden ist.

Diese Punkte sind für den hier vereinbarten Programmier-/Software-Scope kein
Release-Gate.
