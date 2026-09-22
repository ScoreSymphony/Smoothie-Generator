# Private Bereitstellung

Die empfohlene Bereitstellung ist Docker Compose auf dem Rechner, auf dem die
App benutzt wird. Die Standardkonfiguration veröffentlicht Streamlit
ausschließlich auf `127.0.0.1:8501`.

## Voraussetzungen

- Git
- Docker Desktop oder Docker Engine mit Docker Compose

## Erster Start

```bash
git clone https://github.com/ScoreSymphony/Smoothie-Generator.git
cd Smoothie-Generator
docker compose up -d --build
```

Danach im Browser öffnen:

```text
http://127.0.0.1:8501
```

Die App ist mit der mitgelieferten Compose-Datei nicht über eine öffentliche
Netzwerkschnittstelle erreichbar.

## Beenden und erneut starten

Beenden:

```bash
docker compose down
```

Erneut starten:

```bash
docker compose up -d
```

## Private Daten

Persönliche Einstellungen, Favoriten, Feedback und Verlauf liegen im lokalen
Ordner:

```text
private-data/
```

Dieser Ordner wird nicht in Git eingecheckt. Die statischen Zutaten-, Rezept-
und Nährwertdaten bleiben getrennt davon im Repository.

## Backup

Vor einem Update die App beenden:

```bash
docker compose down
```

Anschließend den kompletten Ordner `private-data/` kopieren.

### Windows PowerShell

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item -Recurse private-data "private-data-backup-$stamp"
```

### Linux / macOS

```bash
cp -a private-data "private-data-backup-$(date +%Y%m%d-%H%M%S)"
```

## Restore

1. App mit `docker compose down` beenden.
2. Den aktuellen `private-data/`-Ordner sichern oder entfernen.
3. Den gewünschten Backup-Ordner wieder als `private-data/` ablegen.
4. `docker compose up -d` ausführen.

## Update

```bash
docker compose down
git pull --ff-only
docker compose up -d --build
```

Vor dem Update sollte ein Backup von `private-data/` erstellt werden.

## Technischer Zustandscheck

```bash
docker compose ps
```

Der Container sollte als laufend/healthy erscheinen. Der Streamlit-
Health-Endpunkt ist lokal erreichbar unter:

```text
http://127.0.0.1:8501/_stcore/health
```

## Netzwerkgrenze

Die Zeile

```yaml
- "127.0.0.1:8501:8501"
```

ist absichtlich auf localhost beschränkt. Sie sollte nicht auf
`0.0.0.0:8501:8501` geändert und nicht über einen Router ins Internet
weitergeleitet werden, solange keine separate Zugangskontrolle vorgeschaltet
ist.
