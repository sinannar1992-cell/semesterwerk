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
api/send-mail.php                      PHP-Endpunkt für automatischen Formularversand an info@semesterwerk.de
api/kontakt.php                        Alias / Weiterleitung auf send-mail.php
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
- **Hosting:** Die Website läuft auf Vercel. Gewerbliche Nutzung ist laut Vercels
  Nutzungsbedingungen nur in einem bezahlten Tarif zulässig, und nur dort gilt Vercels
  Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO). Die Datenschutzerklärung setzt
  diesen Vertrag voraus.
- **Rechtstexte:** Impressum, Datenschutzerklärung und AGB sind inhaltlich vollständig
  (Stand November 2026, Hosting Vercel, E-Mail IONOS, USt-IdNr. eingetragen). Vor dem
  Livegang sollten sie dennoch anwaltlich geprüft werden, insbesondere die AGB.

## Formularversand

Alle drei Formulare schicken ihre Daten per `fetch()` an die Serverfunktion
`api/send-mail.js` (Vercel, Region Frankfurt laut `vercel.json`). Sie prüft die Angaben
und verschickt eine E-Mail an `info@semesterwerk.de` über den SMTP-Server von IONOS.
Der Lebenslauf der Studierenden kommt als PDF-Anhang mit (höchstens 4 MB; mehr nimmt
Vercel pro Anfrage nicht an). Gespeichert wird unterwegs nichts.

Dafür muss in Vercel unter *Project → Settings → Environment Variables* die Variable
`SMTP_PASSWORD` mit dem Passwort des Postfachs `info@semesterwerk.de` hinterlegt sein.
Optional lassen sich `SMTP_USER`, `SMTP_HOST` und `SMTP_PORT` überschreiben.
- **Datenschutzbeauftragter:** Nach derzeitiger Einschätzung nicht erforderlich. Die
  20-Personen-Schwelle des § 38 Abs. 1 Satz 1 BDSG wird nicht erreicht, eine
  Datenschutz-Folgenabschätzung ist nicht veranlasst, und die „geschäftsmäßige
  Übermittlung“ nach Satz 2 zielt laut Aufsichtsbehörden auf Stellen, die Daten
  „erheben und verkaufen oder vermieten“ (Adresshändler, Auskunfteien,
  Meinungsforschung). Eine Bestätigung durch die Berliner Aufsichtsbehörde oder eine
  anwaltliche Prüfung steht aus. Der Inhaber selbst kann die Rolle nicht übernehmen
  (Interessenkonflikt, Art. 38 Abs. 6 DSGVO).

## Lokal ansehen

```bash
python3 -m http.server 8000
```

Danach `http://localhost:8000` im Browser öffnen.
