/**
 * semesterwerk – Formularversand (Vercel Serverless Function, Route /api/send-mail)
 *
 * Nimmt die drei Website-Formulare (Unternehmen, Studierende, Kontakt) als
 * multipart/form-data entgegen und verschickt sie per SMTP über das IONOS-Postfach
 * info@semesterwerk.de. Der Lebenslauf der Studierenden wird als PDF angehängt.
 *
 * Umgebungsvariablen (Vercel → Project → Settings → Environment Variables):
 *   SMTP_PASSWORD   Passwort des Postfachs info@semesterwerk.de (Pflicht)
 *   SMTP_USER       optional, Standard: info@semesterwerk.de
 *   SMTP_HOST       optional, Standard: smtp.ionos.de
 *   SMTP_PORT       optional, Standard: 465 (SSL)
 */
const nodemailer = require('nodemailer');
const Busboy = require('busboy');

const RECIPIENT = 'info@semesterwerk.de';

// Vercel nimmt pro Anfrage höchstens 4,5 MB an. 4 MB für die Datei lassen Platz
// für die übrigen Formularfelder. Das Formular nennt dieselbe Grenze.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const GENERIC_ERROR = 'Das hat leider nicht geklappt. Bitte schreiben Sie uns direkt an '
  + 'info@semesterwerk.de oder rufen Sie an: 030 420 994 29.';

/** Fehler, deren Meldung dem Besucher angezeigt werden darf. */
class UserError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    let busboy;
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 40, fieldSize: 20 * 1024 },
      });
    } catch (err) {
      reject(new UserError(400, 'Die Anfrage konnte nicht gelesen werden.'));
      return;
    }

    const fields = {};
    const files = [];

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, stream, info) => {
      const chunks = [];
      let tooLarge = false;
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('limit', () => { tooLarge = true; });
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // Ein leeres Dateifeld schickt der Browser ohne Inhalt mit – das ist kein Upload.
        if (buffer.length > 0 || tooLarge) {
          files.push({ fieldName: name, filename: info.filename || '', buffer, tooLarge });
        }
      });
    });

    busboy.on('finish', () => resolve({ fields, files }));
    busboy.on('error', () => reject(new UserError(400, 'Die Anfrage konnte nicht gelesen werden.')));
    req.pipe(busboy);
  });
}

/** Einzeilige Angabe: Zeilenumbrüche entfernen, Länge begrenzen. */
function line(fields, name, max = 200) {
  return String(fields[name] || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Mehrzeiliger Freitext. */
function block(fields, name, max = 5000) {
  return String(fields[name] || '').replace(/\r\n?/g, '\n').trim().slice(0, max);
}

function isPdf(buffer) {
  // Die PDF-Kennung muss laut Spezifikation in den ersten 1024 Bytes stehen.
  return buffer.subarray(0, 1024).includes('%PDF-');
}

function fileSlug(text) {
  const map = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' };
  return text
    .replace(/[äöüÄÖÜß]/g, (c) => map[c])
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'Bewerbung';
}

function requireFields(fields, names, du) {
  const missing = names.filter((n) => !line(fields, n));
  if (missing.length) {
    throw new UserError(400, du
      ? 'Bitte fülle alle Pflichtfelder (*) aus.'
      : 'Bitte füllen Sie alle Pflichtfelder (*) aus.');
  }
}

function detectFormType(fields, files) {
  const declared = line(fields, 'form_type', 20);
  if (['unternehmen', 'studierende', 'kontakt'].includes(declared)) return declared;
  if (fields.vorname || fields.hochschule || files.length) return 'studierende';
  if (fields.unternehmen || fields.anforderungen) return 'unternehmen';
  return 'kontakt';
}

/** Baut Betreff, Text und Anhang je Formular. Wirft UserError bei ungültigen Angaben. */
function buildMail(formType, fields, files, timestamp) {
  const email = line(fields, 'email', 254);

  if (formType === 'unternehmen') {
    requireFields(fields, ['unternehmen', 'name', 'position'], false);
    const company = line(fields, 'unternehmen');
    const name = line(fields, 'name');
    const posMap = {
      werkstudent: 'Werkstudent:in (Teilzeit, bis 20 Std./Woche)',
      pflichtpraktikum: 'Pflichtpraktikum (meist Vollzeit, 3–6 Monate)',
      praktikum: 'Freiwilliges Praktikum (flexibel, z. B. Semesterferien)',
      offen: 'Noch offen (Beratung gewünscht)',
    };
    const position = posMap[line(fields, 'position', 40)] || line(fields, 'position') || 'Nicht angegeben';

    return {
      subject: `Personalanfrage: ${company} – ${position}`,
      replyTo: { name, address: email },
      text: [
        'NEUE PERSONALANFRAGE ÜBER SEMESTERWERK.DE',
        '==================================================',
        '',
        'UNTERNEHMEN:',
        `  Firma:            ${company}`,
        `  Ansprechperson:   ${name}`,
        `  E-Mail:           ${email}`,
        `  Telefon:          ${line(fields, 'telefon') || 'Nicht angegeben'}`,
        '',
        'GESUCHTE STELLE:',
        `  Art der Stelle:   ${position}`,
        `  Fachrichtung:     ${line(fields, 'fachrichtung') || 'Nicht angegeben'}`,
        `  Start & Ort:      ${line(fields, 'start_ort') || 'Nicht angegeben'}`,
        '',
        'AUFGABEN & ANFORDERUNGEN:',
        block(fields, 'anforderungen') || 'Keine Angaben',
        '',
        '==================================================',
        `Eingegangen am ${timestamp} Uhr`,
      ].join('\n'),
      attachments: [],
    };
  }

  if (formType === 'studierende') {
    requireFields(fields, ['vorname', 'nachname', 'hochschule', 'studiengang', 'semester',
      'position', 'verfuegbar_ab', 'ort'], true);
    if (!fields.einwilligung) {
      throw new UserError(400, 'Bitte bestätige die Einwilligung zur Verarbeitung deiner Daten.');
    }

    const cv = files[0];
    if (!cv) {
      throw new UserError(400, 'Bitte lade deinen Lebenslauf als PDF hoch.');
    }
    if (cv.tooLarge) {
      throw new UserError(413, 'Dein Lebenslauf ist größer als 4 MB. Bitte lade eine kleinere PDF-Datei hoch.');
    }
    if (!isPdf(cv.buffer)) {
      throw new UserError(400, 'Bitte lade deinen Lebenslauf als PDF-Datei hoch.');
    }

    const fullName = `${line(fields, 'vorname')} ${line(fields, 'nachname')}`.trim();
    const studiengang = line(fields, 'studiengang');
    const posMap = {
      werkstudent: 'Werkstudentenjob (neben dem Studium)',
      pflichtpraktikum: 'Pflichtpraktikum (laut Studienordnung)',
      praktikum: 'Freiwilliges Praktikum (z. B. in den Semesterferien)',
      offen: 'Offen für beides',
    };
    const position = posMap[line(fields, 'position', 40)] || line(fields, 'position');
    const attachmentName = `Lebenslauf_${fileSlug(fullName)}.pdf`;
    const originalName = String(cv.filename).replace(/\s+/g, ' ').trim().slice(0, 120) || 'ohne Namen';
    const sizeKb = Math.max(1, Math.round(cv.buffer.length / 1024));

    return {
      subject: `Netzwerk-Registrierung: ${fullName} (${studiengang})`,
      replyTo: { name: fullName, address: email },
      text: [
        'NEUE REGISTRIERUNG IM SEMESTERWERK-NETZWERK',
        '==================================================',
        '',
        'PERSON:',
        `  Name:             ${fullName}`,
        `  E-Mail:           ${email}`,
        `  Telefon:          ${line(fields, 'telefon') || 'Nicht angegeben'}`,
        '',
        'STUDIUM & WUNSCH:',
        `  Hochschule:       ${line(fields, 'hochschule')}`,
        `  Studiengang:      ${studiengang}`,
        `  Fachsemester:     ${line(fields, 'semester')}`,
        `  Gesucht:          ${position}`,
        `  Verfügbar ab:     ${line(fields, 'verfuegbar_ab')}`,
        `  Arbeitsort:       ${line(fields, 'ort')}`,
        '',
        'SCHWERPUNKTE & SKILLS:',
        block(fields, 'skills') || 'Keine Angaben',
        '',
        'LEBENSLAUF:',
        `  Im Anhang: ${attachmentName} (${sizeKb} KB, hochgeladen als „${originalName}“)`,
        '',
        'EINWILLIGUNG:',
        `  Datenschutz-Einwilligung im Formular erteilt am ${timestamp} Uhr.`,
        '',
        '==================================================',
        `Eingegangen am ${timestamp} Uhr`,
      ].join('\n'),
      attachments: [{
        filename: attachmentName,
        content: cv.buffer,
        contentType: 'application/pdf',
      }],
    };
  }

  requireFields(fields, ['name', 'nachricht'], false);
  const name = line(fields, 'name');
  const absenderMap = { unternehmen: 'Unternehmen', studierende: 'Student:in', sonstiges: 'Sonstiges' };
  const absender = absenderMap[line(fields, 'absender', 40)] || 'Nicht angegeben';

  return {
    subject: `Kontaktanfrage: ${name} (${absender})`,
    replyTo: { name, address: email },
    text: [
      'NEUE KONTAKTANFRAGE ÜBER SEMESTERWERK.DE',
      '==================================================',
      '',
      'ABSENDER:',
      `  Schreibt als:     ${absender}`,
      `  Name:             ${name}`,
      `  E-Mail:           ${email}`,
      `  Telefon:          ${line(fields, 'telefon') || 'Nicht angegeben'}`,
      '',
      'NACHRICHT:',
      block(fields, 'nachricht'),
      '',
      '==================================================',
      `Eingegangen am ${timestamp} Uhr`,
    ].join('\n'),
    attachments: [],
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, message: 'Nur POST-Anfragen erlaubt.' });
  }

  try {
    const { fields, files } = await parseMultipart(req);

    // Honeypot: Bots füllen das versteckte Feld aus. Still bestätigen, nichts senden.
    if (fields.website_hp) {
      return res.status(200).json({ ok: true });
    }

    const formType = detectFormType(fields, files);
    const email = line(fields, 'email', 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new UserError(400, formType === 'studierende'
        ? 'Bitte gib eine gültige E-Mail-Adresse an.'
        : 'Bitte geben Sie eine gültige E-Mail-Adresse an.');
    }

    const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    const mail = buildMail(formType, fields, files, timestamp);

    // IONOS_PASSWORD hat eine frühere Version dieser Funktion gelesen und bleibt als Alternative gültig.
    const password = process.env.SMTP_PASSWORD || process.env.IONOS_PASSWORD;
    if (!password) {
      console.error('Formularversand: Umgebungsvariable SMTP_PASSWORD ist in dieser Vercel-Version nicht gesetzt.');
      return res.status(500).json({ ok: false, error: 'smtp_not_configured', message: GENERIC_ERROR });
    }

    const user = process.env.SMTP_USER || RECIPIENT;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ionos.de',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: (process.env.SMTP_PORT || '465') === '465',
      auth: { user, pass: password },
    });

    await transporter.sendMail({
      from: { name: 'semesterwerk Website', address: user },
      to: RECIPIENT,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
      attachments: mail.attachments,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err instanceof UserError) {
      return res.status(err.status).json({ ok: false, message: err.message });
    }
    // Keine Formularinhalte protokollieren, nur die technische Ursache. Der Code in der
    // Antwort hilft bei der Fehlersuche; Besucher sehen nur die allgemeine Meldung.
    const code = err && err.code;
    console.error('Formularversand fehlgeschlagen:', code || (err && err.message));
    const error = code === 'EAUTH' ? 'smtp_auth_failed'
      : ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(code) ? 'smtp_connection_failed'
      : 'send_failed';
    return res.status(500).json({ ok: false, error, message: GENERIC_ERROR });
  }
};
