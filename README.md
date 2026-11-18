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
- **Formulare:** Sind vollständig angebunden. Das PHP-Skript `api/send-mail.php` verarbeitet
  Anfragen von Unternehmen, Studierenden-Registrierungen (inkl. PDF-Lebenslauf als Anhang)
  und allgemeine Kontaktnachrichten. Alle Pflichtfelder werden serverseitig validiert,
  ein Honeypot schützt vor Spam, und die strukturierte E-Mail wird direkt an `info@semesterwerk.de`
  gesendet (mit Absender-E-Mail als `Reply-To`). Funktioniert direkt auf IONOS Webhosting via PHP `mail()`.
- **Rechtstexte:** Impressum, Datenschutzerklärung und AGB sind inhaltlich vollständig
  (Stand November 2026, Hoster IONOS, USt-IdNr. eingetragen). Vor dem Livegang sollten
  sie dennoch anwaltlich geprüft werden, insbesondere die AGB.
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
