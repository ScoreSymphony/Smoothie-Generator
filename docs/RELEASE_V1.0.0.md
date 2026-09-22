# Smoothie Generator v1.0.0

Erster vollständiger mobiler Release des Smoothie Generators für die private Android-Installation.

## Enthalten

- native React-Native-/Expo-App für Android und iOS
- 119 kuratierte Zutaten
- 80 gespeicherte Smoothie-Rezepte
- Pantry-Auswahl mit Suche, Kategorien, Freitext und Aliasauflösung
- gespeichertes Rezept-Matching inklusive fehlender Zutaten und Substitutionen
- regelbasierte On-Device-Generierung neuer Smoothies
- deterministisches Scoring und Recommendation-Ranking
- Vegan-, Allergen-, Milchfrei- und Ausschlussregeln
- Mengen und Skalierung für mehrere Portionen
- lokale Nährwerte für Kalorien, Protein, Kohlenhydrate, Zucker, Fett und Ballaststoffe
- Favoriten, Verlauf, Vorlieben und Feedback-Lernen
- vollständige Offline-Kernfunktion ohne Backend oder bezahlte API

## Android

Release-Datei:

`Smoothie-Generator-v1.0.0.apk`

Die APK kann direkt auf ein Android-Gerät übertragen und installiert werden. Android kann beim ersten manuellen Installieren die Freigabe für Apps aus dieser Quelle verlangen.

## Release-Validierung

Vor Veröffentlichung werden automatisch ausgeführt:

- Expo-Abhängigkeitsprüfung
- ESLint
- TypeScript-Typecheck
- vollständige Jest-Test-Suite
- Mobile-Release-Audit
- nativer Android-Build mit Gradle
- Prüfung, dass die APK tatsächlich erzeugt wurde

Dieser Release beansprucht keine physische Geräte- oder Geschmackstest-Abnahme.
