# Private Installation auf dem Handy

Der Smoothie Generator ist eine **mobile-only** React-Native-/Expo-App. Für die
Endnutzung ist weder ein Browser noch ein lokaler Webserver, Backend oder eine
kostenpflichtige API erforderlich.

## Android: privates installierbares APK

### Voraussetzungen für den Build

- Node.js 22.13 oder neuer
- npm
- JDK 17
- Android SDK / Android Studio mit funktionierender Android-Toolchain

Abhängigkeiten installieren und den vollständigen Software-Check ausführen:

```bash
npm install
npm run check
```

Danach das private APK erzeugen:

```bash
npm run build:android:private
```

Der Befehl erzeugt über Expo Prebuild ein natives Android-Projekt und baut
anschließend mit Gradle ein installierbares, debug-signiertes APK. Die Datei
liegt danach unter:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Das Verzeichnis `android/` bleibt absichtlich aus Git ausgeschlossen. Es ist
ein generiertes Build-Artefakt und nicht die Quelle der Anwendung.

### APK privat installieren

1. Das APK direkt auf das Android-Handy übertragen, z. B. per USB oder einer
   privaten Dateiübertragung.
2. Auf dem Handy die Installation aus der verwendeten Dateiquelle erlauben,
   falls Android danach fragt.
3. `app-debug.apk` öffnen und installieren.

Dieses APK ist für **private Installation und Tests**, nicht als Play-Store-
Releasepaket gedacht. Es wird vom Projekt nicht automatisch öffentlich
veröffentlicht oder hochgeladen.

Die GitHub-CI führt denselben Buildpfad aus und prüft damit, dass ein
installierbares APK technisch erzeugt werden kann. Der CI-Workflow veröffentlicht
das APK bewusst nicht als öffentliches Release.

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
Team gewählt werden. Welche Apple-Account-/Provisioning-Option für eine konkrete
private iPhone-Installation verfügbar ist, wird von Apple/Xcode vorgegeben.
Diese Signierung ist ein Installationsschritt und keine Laufzeitabhängigkeit der
Smoothie-App.

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

Ein eigener Export-/Backup-Dialog ist derzeit **nicht implementiert**. Deshalb
wird kein anwendungsinterner Backup-PASS behauptet. Beim Löschen der App können
lokale Daten verloren gehen; Betriebssystem-Backups sind davon unabhängig.

## Keine reale Gerätevalidierung als Release-Gate

Die technische Freigabe stützt sich auf TypeScript-, Lint-, Unit-, Domain-,
Persistenz-, Komponenten-/Navigations-, Offline-Audit- und Android-Buildtests.
Eine physische Geräteprüfung oder Verkostung wird nicht als durchgeführt oder
erforderlich behauptet.
