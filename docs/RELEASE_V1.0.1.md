# Smoothie Generator v1.0.1

Korrektur-Release für die private Android-Installation.

## Behoben

- Android wird jetzt als echter **Release-Build** mit `assembleRelease` erzeugt.
- Das React-Native-JavaScript-Bundle wird in die APK eingebettet; die App benötigt
  beim Start keinen Metro-Entwicklungsserver mehr.
- Das vorhandene Smoothie-Generator-Branding-Icon ist jetzt explizit als
  App-Icon konfiguriert.
- CI prüft vor Veröffentlichung, dass `assets/index.android.bundle` in der APK
  enthalten ist.
- CI prüft außerdem die Android-Signatur des APK.
- Der Release-Audit blockiert künftig versehentliche `assembleDebug`-Builds.

## Android

Release-Datei:

`Smoothie-Generator-v1.0.1.apk`

Die v1.0.0-APK sollte nicht weiter verwendet werden, da sie als Debug-APK gebaut
wurde und deshalb Metro zur Laufzeit erwartete.

## Funktionsumfang

Der vollständige v1.0.0-Funktionsumfang bleibt erhalten: Pantry, gespeicherte
Rezepte, On-Device-Generierung, Ranking, Präferenzen/Restriktionen, Favoriten,
Verlauf, Mengen und Offline-Nährwerte.
