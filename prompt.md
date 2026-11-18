Erstelle mir eine web Applikation mit Opencv in JavaScript.
Die Applikation soll folgende Funktionen haben:
- Einzelbild einer Kamera (Webcam) aufnehmen, den Livestream der Webcam aufnehmen oder ein Video verarbeiten 
- das Einzelbild oder die Bildfolge soll mit OpenCV-Funktionen verarbeitet werden
- dabei soll mir immer das Originalbild und das Endbild angezeigt werden
- die Funktionen sollen wie Bausteine angeordnet werden.
- dabei ist oben die Aufnahme-Einheit der Kamera (Stream oder Einzelbild)
- darunter folgen dann Funktions-Units in der das Originalbild Stück für Stück verarbeitet wird. Dabei ist verwendet jede Unit das verarbeitete Bild der Vorgänger-Unit
- erste Funktions-Units sollen sein: Konvertierung Farbbild zu Grauwertbild, Binarisierung, Kantendetektion, Kreisfit mit und ohne Außreißerdetektion
- die Funktions-Units sollen per drag and drop hinzugefügt werden können. Ausgangspunkt ist natürlich immer eine Aufnahme-Unit
- die Parameter jeder Funktions-Unit sollen in einem sichtbarem Parameter-Fenster daneben angezeigt und einstellbar sein. Die default-Einstellungen der Parameter kommen jeweils aus der OpenCV Funktionsbeschreibung. Es sollen geeignete Tools zum verstellen der Parameter gewählt werden wie slider oder Eingabefenster. Zusätzlich soll jeder Einstell-Parameter mit einem Hover-Effekt ausgestattet sein, der eine Erklärung zum jeweiligen Parameter liefert, damit der Nutzer weiß welchen Effekt der Parameter auf das Bild hat.