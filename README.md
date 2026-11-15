# semesterwerk – Website

Statische Website für semesterwerk, die Personalvermittlung von Studierenden an
Unternehmen für Praktika und Werkstudentenstellen.

Keine Build-Werkzeuge, keine Abhängigkeiten, keine externen Dienste: reines HTML,
CSS und JavaScript. Dadurch lädt die Seite ohne Cookie-Banner und ohne
Datenübertragung an Dritte.

## Aufbau

```
index.html, fuer-unternehmen.html, …   fertige Seiten (werden erzeugt, nicht von Hand ändern)
assets/css/style.css                   Stylesheet
assets/js/main.js                      JavaScript
assets/img/, assets/fonts/             Bilder und Schriften
semesterwerk-logo/                     Logo-Paket (Original, mit Farb- und Schriftangaben)
_build/                                Generator für die Seiten
```

## Seiten ändern

Kopfbereich, Navigation und Fußzeile stehen an einer Stelle: in `_build/build.py`.
Die Inhalte der einzelnen Seiten liegen in `_build/pages/`. Nach einer Änderung
werden die Seiten im Projektordner neu erzeugt:

```bash
cd _build && python3 build.py ..
```

Die HTML-Dateien im Hauptordner werden dabei überschrieben. Änderungen also immer
in `_build/` vornehmen, nicht an den erzeugten Dateien.

Werden `style.css` oder `main.js` geändert, in `build.py` die Versionsnummer
(`?v=…`) erhöhen, damit Browser die neue Fassung laden.

## Offene Punkte

- **Schriftart:** `assets/fonts/Sora-Variable.woff2` fehlt noch. Solange die Datei
  nicht vorhanden ist, zeigt die Seite eine Systemschrift.
- **Formulare:** Ohne Server-Endpunkt öffnen sie das E-Mail-Programm mit den
  ausgefüllten Angaben. Sobald ein Endpunkt vorhanden ist, wird er am Formular in
  `data-endpoint=""` eingetragen; dann funktioniert auch der Lebenslauf-Upload.
- **Impressum:** Umsatzsteuer-Identifikationsnummer ergänzen (im Text markiert).
- **Datenschutz:** Hoster und Speicherdauer der Server-Protokolle ergänzen.
- **AGB:** Mustertext, vor dem Livegang anwaltlich prüfen lassen.

## Lokal ansehen

```bash
python3 -m http.server 8000
```

Danach `http://localhost:8000` im Browser öffnen.
