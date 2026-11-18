# OpenCV Vision Pipeline

Eine browserbasierte, visuelle Verarbeitungskette für Webcam-Einzelbilder, Livestreams und Videodateien. Die Bildverarbeitung läuft lokal im Browser mit OpenCV.js.

## Voraussetzungen auf einer sauberen Windows-Installation

Empfohlen wird Windows 11 24H2 oder neuer in der 64-Bit-Ausgabe. Die App benötigt nur wenige Komponenten:

| Komponente | Benötigte Version | Hinweise |
| --- | --- | --- |
| Windows PowerShell | 5.1 oder neuer | In Windows 10 und 11 bereits enthalten |
| App-Installer / `winget` | 1.8 oder neuer | Für die automatische Installation von Node.js; unter Windows 11 normalerweise vorhanden |
| Node.js | mindestens 18, empfohlen 22 LTS | Getestet mit Node.js 22.23.4 |
| npm | passend zu Node.js | Wird zusammen mit Node.js installiert; getestet mit npm 10.9.9 |
| Webbrowser | aktuelle Version | Microsoft Edge wird empfohlen; aktuelles Firefox oder Chrome funktioniert ebenfalls |
| OpenCV.js | 4.12.0 | Ist bereits als `opencv.js` enthalten und muss nicht installiert werden |

Python, Visual Studio, CMake, Git und eine native OpenCV-Installation werden nicht benötigt. Für eine übliche USB-Webcam installiert Windows automatisch einen UVC-Treiber. Nur wenn die Kamera im Windows-Geräte-Manager nicht erscheint, ist gegebenenfalls ein Herstellertreiber nötig.

## Chronologische Erstinstallation unter Windows

### 1. Windows aktualisieren und Webcam anschließen

1. **Einstellungen → Windows Update** öffnen und alle verfügbaren Updates installieren.
2. Die USB-Webcam anschließen und warten, bis Windows die Geräteeinrichtung beendet hat.
3. Unter **Einstellungen → Datenschutz und Sicherheit → Kamera** den Kamerazugriff sowie den Zugriff für Desktop-Apps aktivieren.

### 2. App-Installer und `winget` prüfen

PowerShell öffnen und folgenden Befehl ausführen:

```powershell
winget --version
```

Wird eine Versionsnummer angezeigt, ist keine weitere Installation nötig. Wird `winget` nicht gefunden, im Microsoft Store die Microsoft-Anwendung **App-Installer** installieren beziehungsweise aktualisieren. Danach PowerShell schließen und neu öffnen.

### 3. Projektordner auf den Computer kopieren

Den vollständigen Ordner `opencv_webApp` kopieren oder entpacken. Die Datei `opencv.js` muss im selben Ordner wie `index.html` liegen. Für die folgenden Beispiele wird dieser Pfad verwendet:

```text
C:\Users\marc-\Documents\opencv_webApp
```

### 4. Automatische Installation ausführen (empfohlen)

PowerShell öffnen und ausführen:

```powershell
cd "C:\Users\marc-\Documents\opencv_webApp"
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

Das Skript:

- prüft PowerShell und Node.js,
- installiert bei Bedarf die aktuelle Node.js-LTS-Version über `winget`,
- prüft npm und alle benötigten Projektdateien,
- kontrolliert, ob `opencv.js` vollständig vorhanden ist,
- führt eine Syntaxprüfung der App aus.

Windows kann während der Node.js-Installation eine Bestätigung der Benutzerkontensteuerung anzeigen. Diese muss bestätigt werden. Das Skript lädt kein OpenCV herunter, da OpenCV.js bereits im Projekt enthalten ist.

Die Installation kann die App auf Wunsch direkt starten:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Start
```

### 5. Alternative manuelle Node.js-Installation

Soll das Installationsskript nicht verwendet werden, Node.js LTS mit folgendem Befehl installieren:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact --source winget --accept-source-agreements --accept-package-agreements
```

Danach PowerShell schließen, neu öffnen und die Installation prüfen:

```powershell
node --version
npm --version
```

`node --version` muss mindestens `v18` anzeigen. Empfohlen ist Node.js 22 LTS oder neuer.

## App starten

Voraussetzung ist Node.js 18 oder neuer. OpenCV.js 4.12.0 ist lokal enthalten; eine Internetverbindung ist nicht erforderlich.

1. PowerShell öffnen und in den Projektordner wechseln:

   ```powershell
   cd "C:\Users\marc-\Documents\opencv_webApp"
   ```

2. Den lokalen Webserver starten:

   ```powershell
   npm start
   ```

3. Im Browser [http://localhost:5173](http://localhost:5173) öffnen.

4. Für die Webcam auf **Kamera starten** klicken und die Browser-Berechtigung erlauben.

Der Server läuft, solange das PowerShell-Fenster geöffnet bleibt. Mit `Strg+C` wird er beendet.

### Warum nicht direkt `index.html` öffnen?

Die App muss über `localhost` gestartet werden. Beim direkten Öffnen der `index.html` verwendet der Browser eine `file://`-Adresse. Insbesondere Firefox blockiert dabei das JavaScript-Modul der App; dann bleibt im Seitenkopf „OpenCV wird geladen …“ stehen und die Webcam-Steuerung funktioniert nicht.

`localhost` bedeutet dabei nicht, dass Daten ins Internet übertragen werden. Der Webserver und die gesamte Bildverarbeitung laufen ausschließlich auf diesem Computer.

## Enthaltene Bausteine

- Farbbild zu Grauwertbild, wahlweise auch einzelne Farbkanäle
- Binarisierung mit mehreren OpenCV-Schwellwertverfahren
- Canny-Kantendetektion
- Kreisfit über eine algebraische Least-Squares-Anpassung
- Robuster Kreisfit mit RANSAC-Ausreißererkennung

Bausteine lassen sich anklicken oder per Drag-and-drop hinzufügen, umsortieren, deaktivieren und entfernen. Jede Unit zeigt ihr Zwischenergebnis und erklärt ihre Parameter beim Überfahren der Beschriftung.

## Prüfung

```powershell
npm run check
```

OpenCV.js 4.12.0 wird aus der lokalen Datei `opencv.js` geladen. Das darin eingebettete WebAssembly-Modul läuft vollständig im Browser. Es werden keine Bilder oder Videos an einen Server übertragen.
