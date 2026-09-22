# Private Installation auf dem Handy

Der Smoothie Generator ist eine **mobile-only** React-Native-/Expo-App. Für die
Endnutzung ist weder ein Browser noch ein lokaler Webserver, Backend oder eine
kostenpflichtige API erforderlich.

## Android: eigenständiges Release-APK

### Voraussetzungen für einen lokalen Build

- Node.js 22.13 oder neuer
- npm
- JDK 17
- Android SDK / Android Studio mit funktionierender Android-Toolchain

Abhängigkeiten installieren und den vollständigen Software-Check ausführen:

```bash
npm install
npm run check
```

Danach das eigenständige APK erzeugen:

```bash
npm run build:android:private
```

Der Befehl erzeugt über Expo Prebuild ein natives Android-Projekt und baut
anschließend mit Gradle **`assembleRelease`**. Die Datei liegt danach unter:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Der Release-Build enthält das React-Native-JavaScript-Bundle direkt in der APK.
Für den Start der installierten App ist deshalb **kein Metro-Entwicklungsserver**
erforderlich.

Das Verzeichnis `android/` bleibt absichtlich aus Git ausgeschlossen. Es ist
ein generiertes Build-Artefakt und nicht die Quelle der Anwendung.

### Automatische Prüfungen

GitHub Actions prüft für das erzeugte APK zusätzlich:

1. `assets/index.android.bundle` ist im APK enthalten;
2. das APK besitzt eine gültige Android-Signatur;
3. Lint, TypeScript, Tests und Mobile-Release-Audit sind erfolgreich.

Damit würde ein erneuter Debug-/Metro-Build das Release-Gate nicht bestehen.

### APK privat installieren

1. Die APK aus dem GitHub Release auf das Android-Handy laden oder privat
   übertragen.
2. Auf dem Handy die Installation aus der verwendeten Dateiquelle erlauben,
   falls Android danach fragt.
3. `Smoothie-Generator-v<Version>.apk` öffnen und installieren.

Die APK ist für private Direktinstallation gedacht, nicht als Play-Store-
Publishing-Paket. Ein Play-Store-Release würde einen separat verwalteten
Produktionsschlüssel und einen eigenen Store-Workflow benötigen.

## App-Icon

Das native Android-/iOS-App-Icon wird aus

```text
assets/branding/smoothie-generator-icon.png
```

erzeugt und ist in der Expo-Konfiguration explizit hinterlegt.

## iPhone / iOS

Der iOS-Pfad bleibt ebenfalls lokal und benötigt keinen Webserver.

Voraussetzungen:

- macOS
- Xcode
- Node.js / npm
- Apple-Signing/Provisioning für die Installation auf einem physischen iPhone

Vorbereitung:

```bash
npm install
npm run check
npx expo prebuild --platform ios --clean
```

Danach kann das generierte Xcode-Projekt geöffnet oder direkt über Expo/Xcode
auf ein verbundenes Gerät gebaut werden:

```bash
npx expo run:ios --device
```

In Xcode muss für `com.scoresymphony.smoothiegenerator` ein zulässiges Signing
Team gewählt werden.

## Offline-Verhalten

Nach der Installation liegen Zutaten, Rezepte und Nährwertdaten gebündelt in
der App. Matching, Generierung, Ranking, Mengen, Nährwerte, Favoriten,
Präferenzen und Verlauf benötigen im normalen Betrieb keine Netzwerkverbindung.

Die Entwicklungstools können beim erstmaligen Installieren von npm-/Expo-
Abhängigkeiten Internetzugang benötigen. Das ist vom Endnutzer-Laufzeitmodell
getrennt.

## Lokale Daten und Backup

Pantry, Vorlieben, Favoriten und Verlauf werden in Expo SQLite auf dem Gerät
gespeichert.

Ein eigener Export-/Backup-Dialog ist derzeit **nicht implementiert**. Beim
Löschen der App können lokale Daten verloren gehen; Betriebssystem-Backups sind
davon unabhängig.
