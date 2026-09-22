# Smoothie Generator v1.0.3

Korrektur-Release für das native App-/Launcher-Icon.

## Behoben

- Das ausgewählte **Fruit-Fusion-Icon** wurde als standardkonformes,
  nicht-interlaced 8-Bit-RGBA-PNG mit transparentem Hintergrund neu encodiert.
- Der Expo-/Android-Prebuild kann das Icon jetzt zuverlässig über Jimp verarbeiten.
- Der Release-Audit validiert künftig PNG-Signatur, Abmessungen, RGBA-Encoding,
  IDAT-Daten und alle PNG-Scanline-Filter, bevor ein Release gebaut wird.
- Damit wird die konkrete v1.0.2-Regression
  `Unrecognised filter type - 115` künftig bereits im PR-/Release-Audit blockiert.

## Android

Release-Datei:

`Smoothie-Generator-v1.0.3.apk`

Für eine zuverlässige Aktualisierung des Launcher-Icons sollte die bisherige App
deinstalliert und anschließend v1.0.3 neu installiert werden, falls der Android-
Launcher weiterhin ein älteres Icon aus seinem Cache anzeigt.

## Funktionsumfang

Der Funktionsumfang bleibt gegenüber v1.0.2 unverändert. Dieser Patch betrifft
nur das Launcher-Icon, Release-Metadaten und den dazugehörigen Regression-Guard.
