<?php
/**
 * semesterwerk – Formularverarbeitung & E-Mail-Versand
 * 
 * Verarbeitet Anfragen von:
 * - Unternehmen (Personalanfrage / Talent-Anfrage)
 * - Studierende (Netzwerk-Registrierung inkl. PDF-Lebenslauf)
 * - Kontakt (Allgemeine Nachricht)
 * 
 * Sendet strukturierte E-Mails an info@semesterwerk.de.
 */

// Keine PHP-Fehlermeldungen im Output anzeigen (würde JSON-Antwort zerstören)
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Zeitzone setzen
date_default_timezone_set('Europe/Berlin');

// Zieladresse für alle Anfragen
$RECIPIENT_EMAIL = 'info@semesterwerk.de';
$SENDER_EMAIL    = 'info@semesterwerk.de';
$SENDER_NAME     = 'semesterwerk Website';

// Antwort-Funktion (JSON für Fetch/AJAX, HTML-Fallback bei deaktiviertem JavaScript)
function sendResponse(bool $ok, string $message = '', int $code = 200): void {
    http_response_code($code);

    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $isJson = (strpos($accept, 'application/json') !== false)
        || (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest');

    if ($isJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => $ok,
            'message' => $message,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // HTML-Fallback für Browser ohne JavaScript
    header('Content-Type: text/html; charset=utf-8');
    $statusTitle = $ok ? 'Vielen Dank!' : 'Hinweis';
    $statusColor = $ok ? '#10b981' : '#ef4444';
    $backUrl = $_SERVER['HTTP_REFERER'] ?? '/';
    $safeMsg = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    echo <<<HTML
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{$statusTitle} – semesterwerk</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .box { background: #1e293b; border-radius: 12px; max-width: 520px; width: 100%; padding: 2.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center; }
    h1 { color: {$statusColor}; margin-top: 0; font-size: 1.75rem; }
    p { line-height: 1.6; color: #cbd5e1; }
    a.btn { display: inline-block; margin-top: 1.5rem; background: #10b981; color: #fff; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="box">
    <h1>{$statusTitle}</h1>
    <p>{$safeMsg}</p>
    <a href="{$backUrl}" class="btn">Zurück zur Website</a>
  </div>
</body>
</html>
HTML;
    exit;
}

// CORS-Header für sichere Anfragen
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'https://semesterwerk.de',
    'http://semesterwerk.de',
    'https://www.semesterwerk.de',
    'http://www.semesterwerk.de'
];
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
}

// Preflight OPTIONS-Anfrage beantworten
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Nur POST-Anfragen erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Ungültige Anfragemethode (nur POST erlaubt).', 405);
}

// 1. Spamschutz: Honeypot-Feld prüfen
if (!empty($_POST['website_hp'])) {
    // Spam-Bot ist in die Falle getappt: stiller Erfolg ohne E-Mail-Versand
    sendResponse(true, 'Vielen Dank für Ihre Anfrage.');
}

// Hilfsfunktionen zur Bereinigung
function cleanHeader(string $val): string {
    return preg_replace('/[\r\n]+/', ' ', trim($val));
}

function cleanText(string $val): string {
    return trim(strip_tags($val));
}

// E-Mail-Validierung
$email = trim($_POST['email'] ?? '');
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Bitte geben Sie eine gültige E-Mail-Adresse an.', 400);
}

// Formular-Typ ermitteln
$formType = trim($_POST['form_type'] ?? '');
if (empty($formType)) {
    if (!empty($_POST['absender']) || !empty($_POST['nachricht'])) {
        $formType = 'kontakt';
    } elseif (!empty($_POST['vorname']) || !empty($_POST['hochschule']) || isset($_FILES['lebenslauf'])) {
        $formType = 'studierende';
    } elseif (!empty($_POST['unternehmen']) || !empty($_POST['anforderungen'])) {
        $formType = 'unternehmen';
    } else {
        $formType = 'kontakt';
    }
}

// Metadaten für die E-Mail
$timestamp = date('d.m.Y H:i:s') . ' Uhr';
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unbekannt';
$userAgent = cleanHeader($_SERVER['HTTP_USER_AGENT'] ?? 'Unbekannt');

$subject = '';
$replyToName = '';
$bodyLines = [];

$hasAttachment = false;
$attachmentData = null;
$attachmentName = null;

// =============================================================================
// FALL 1: UNTERNEHMEN (Personalanfrage)
// =============================================================================
if ($formType === 'unternehmen') {
    $unternehmen = cleanText($_POST['unternehmen'] ?? '');
    $name        = cleanText($_POST['name'] ?? '');
    $telefon     = cleanText($_POST['telefon'] ?? 'Nicht angegeben');
    $fachrichtung= cleanText($_POST['fachrichtung'] ?? 'Nicht angegeben');
    $startOrt    = cleanText($_POST['start_ort'] ?? 'Nicht angegeben');
    $anforderung = cleanText($_POST['anforderungen'] ?? 'Keine besonderen Angaben');
    
    $posRaw = cleanText($_POST['position'] ?? '');
    $posMap = [
        'werkstudent'      => 'Werkstudent:in (Teilzeit, bis 20 Std./Woche)',
        'pflichtpraktikum' => 'Pflichtpraktikum (meist Vollzeit, 3–6 Monate)',
        'praktikum'        => 'Freiwilliges Praktikum (flexibel, z. B. Semesterferien)',
        'offen'            => 'Noch offen (Beratung gewünscht)',
    ];
    $position = $posMap[$posRaw] ?? ($posRaw ?: 'Nicht angegeben');

    if (empty($unternehmen) || empty($name)) {
        sendResponse(false, 'Bitte füllen Sie alle Pflichtfelder (*) aus.', 400);
    }

    $subject = 'Personalanfrage: ' . $unternehmen . ' (' . ($posMap[$posRaw] ?? 'Talente anfragen') . ')';
    $replyToName = $name;

    $bodyLines = [
        'NEUE PERSONALANFRAGE ÜBER SEMESTERWERK.DE',
        '==================================================',
        '',
        'UNTERNEHMENSDATEN:',
        '  Firma:           ' . $unternehmen,
        '  Ansprechpartner: ' . $name,
        '  E-Mail:          ' . $email,
        '  Telefon:         ' . $telefon,
        '',
        'DETAILS ZUR GESUCHTEN STELLE:',
        '  Art der Stelle:  ' . $position,
        '  Fachrichtung:    ' . $fachrichtung,
        '  Start & Ort:     ' . $startOrt,
        '',
        'AUFGABEN & ANFORDERUNGEN:',
        $anforderung,
        '',
        '==================================================',
        'Gesendet am: ' . $timestamp,
        'IP-Adresse:  ' . $ipAddress,
        'Formular:    Für Unternehmen (fuer-unternehmen.html)',
    ];

// =============================================================================
// FALL 2: STUDIERENDE (Netzwerk-Registrierung)
// =============================================================================
} elseif ($formType === 'studierende') {
    $vorname     = cleanText($_POST['vorname'] ?? '');
    $nachname    = cleanText($_POST['nachname'] ?? '');
    $name        = trim($vorname . ' ' . $nachname);
    $telefon     = cleanText($_POST['telefon'] ?? 'Nicht angegeben');
    $hochschule  = cleanText($_POST['hochschule'] ?? '');
    $studiengang = cleanText($_POST['studiengang'] ?? '');
    $semester    = cleanText($_POST['semester'] ?? '');
    $verfuegbar  = cleanText($_POST['verfuegbar_ab'] ?? '');
    $ort         = cleanText($_POST['ort'] ?? '');
    $skills      = cleanText($_POST['skills'] ?? 'Keine zusätzlichen Angaben');
    $consent     = !empty($_POST['einwilligung']) ? 'Ja, erteilt' : 'Nein';

    $posRaw = cleanText($_POST['position'] ?? '');
    $posMap = [
        'werkstudent'      => 'Werkstudentenjob (neben dem Studium)',
        'pflichtpraktikum' => 'Pflichtpraktikum (laut Studienordnung)',
        'praktikum'        => 'Freiwilliges Praktikum (z. B. in den Semesterferien)',
        'offen'            => 'Offen für beides (Hauptsache, es passt)',
    ];
    $position = $posMap[$posRaw] ?? ($posRaw ?: 'Nicht angegeben');

    if (empty($vorname) || empty($nachname) || empty($hochschule) || empty($studiengang) || empty($semester) || empty($verfuegbar) || empty($ort)) {
        sendResponse(false, 'Bitte fülle alle Pflichtfelder (*) aus.', 400);
    }

    if (empty($_POST['einwilligung'])) {
        sendResponse(false, 'Bitte bestätige die Einwilligung zur Datenverarbeitung.', 400);
    }

    // Lebenslauf-Upload prüfen (PDF, max. 10 MB) - unterstützt 'attachment' und 'lebenslauf'
    $cvUpload = $_FILES['attachment'] ?? $_FILES['lebenslauf'] ?? null;
    if ($cvUpload && $cvUpload['error'] !== UPLOAD_ERR_NO_FILE) {
        $fileError = $cvUpload['error'];
        if ($fileError !== UPLOAD_ERR_OK) {
            sendResponse(false, 'Fehler beim Upload des Lebenslaufs (Fehlercode: ' . $fileError . '). Bitte erneut versuchen.', 400);
        }

        // Max. 10 MB = 10 * 1024 * 1024 Bytes
        if ($cvUpload['size'] > 10485760) {
            sendResponse(false, 'Der Lebenslauf ist größer als 10 MB. Bitte eine kleinere PDF-Datei wählen.', 400);
        }

        $origName = $cvUpload['name'];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if ($ext !== 'pdf') {
            sendResponse(false, 'Bitte lade deinen Lebenslauf ausschließlich im PDF-Format hoch.', 400);
        }

        // MIME-Typ prüfen
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, $cvUpload['tmp_name']);
            finfo_close($finfo);
            if ($mime !== 'application/pdf' && $mime !== 'application/x-pdf') {
                sendResponse(false, 'Die hochgeladene Datei ist keine gültige PDF-Datei.', 400);
            }
        }

        $attachmentData = file_get_contents($cvUpload['tmp_name']);
        if ($attachmentData === false) {
            sendResponse(false, 'Die Datei konnte nicht gelesen werden. Bitte erneut versuchen.', 500);
        }

        // Sicheren Dateinamen erzeugen
        $safeBase = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', pathinfo($origName, PATHINFO_FILENAME));
        $cleanCandidate = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $name);
        $attachmentName = 'Lebenslauf_' . ($cleanCandidate ?: 'Bewerber') . '_' . substr(md5(uniqid()), 0, 6) . '.pdf';
        $hasAttachment = true;
    }

    $subject = 'Netzwerk-Registrierung: ' . $name . ' (' . $studiengang . ')';
    $replyToName = $name;

    $bodyLines = [
        'NEUE REGISTRIERUNG IM SEMESTERWERK-NETZWERK',
        '==================================================',
        '',
        'PERSÖNLICHE DATEN:',
        '  Name:            ' . $name,
        '  E-Mail:          ' . $email,
        '  Telefon:         ' . $telefon,
        '',
        'STUDIUM & PROFIL:',
        '  Hochschule:      ' . $hochschule,
        '  Studiengang:     ' . $studiengang,
        '  Fachsemester:    ' . $semester,
        '  Gewünschte Art:  ' . $position,
        '  Verfügbar ab:    ' . $verfuegbar,
        '  Wunsch-Arbeitsort:' . $ort,
        '',
        'SCHWERPUNKTE & SKILLS:',
        $skills,
        '',
        'LEBENSLAUF:',
        $hasAttachment ? '  -> Angehängt: ' . $attachmentName : '  -> Kein Anhang mitgesendet',
        '',
        'DSGVO-EINWILLIGUNG:',
        '  ' . $consent . ' (Einwilligung zur Speicherung und Weitergabe an Partnerunternehmen)',
        '',
        '==================================================',
        'Gesendet am: ' . $timestamp,
        'IP-Adresse:  ' . $ipAddress,
        'Formular:    Für Studierende (fuer-studierende.html)',
    ];

// =============================================================================
// FALL 3: KONTAKT (Allgemeine Anfrage)
// =============================================================================
} else {
    $name       = cleanText($_POST['name'] ?? '');
    $telefon    = cleanText($_POST['telefon'] ?? 'Nicht angegeben');
    $nachricht  = cleanText($_POST['nachricht'] ?? '');

    $absenderRaw = cleanText($_POST['absender'] ?? '');
    $absenderMap = [
        'unternehmen' => 'Unternehmen',
        'studierende' => 'Student:in',
        'sonstiges'   => 'Sonstiges',
    ];
    $absender = $absenderMap[$absenderRaw] ?? ($absenderRaw ?: 'Nicht angegeben');

    if (empty($name) || empty($nachricht)) {
        sendResponse(false, 'Bitte füllen Sie alle Pflichtfelder (*) aus.', 400);
    }

    $subject = 'Kontaktanfrage: ' . $name . ' (' . $absender . ')';
    $replyToName = $name;

    $bodyLines = [
        'NEUE KONTAKTANFRAGE ÜBER SEMESTERWERK.DE',
        '==================================================',
        '',
        'ABSENDERDATEN:',
        '  Rolle:           ' . $absender,
        '  Name:            ' . $name,
        '  E-Mail:          ' . $email,
        '  Telefon:         ' . $telefon,
        '',
        'NACHRICHT:',
        $nachricht,
        '',
        '==================================================',
        'Gesendet am: ' . $timestamp,
        'IP-Adresse:  ' . $ipAddress,
        'Formular:    Kontaktformular (kontakt.html)',
    ];
}

// =============================================================================
// E-MAIL ZUSAMMENSTELLEN & VERSENDEN
// =============================================================================

// E-Mail-Betreff MIME-kodieren (RFC 2047)
$encodedSubject = '=?UTF-8?B?' . base64_encode(cleanHeader($subject)) . '?=';

// Reply-To Header auf Absender setzen, damit direkt per Klick geantwortet werden kann
$replyToHeader = '=?UTF-8?B?' . base64_encode(cleanHeader($replyToName)) . '?= <' . cleanHeader($email) . '>';

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'From: =?UTF-8?B?' . base64_encode($SENDER_NAME) . '?= <' . $SENDER_EMAIL . '>';
$headers[] = 'Reply-To: ' . $replyToHeader;
$headers[] = 'X-Mailer: PHP/' . phpversion();
$headers[] = 'Date: ' . date('r');

$bodyText = implode("\r\n", $bodyLines);

if ($hasAttachment && $attachmentData !== null) {
    // E-Mail mit PDF-Anhang via MIME-Boundary
    $boundary = '==_SW_' . md5(uniqid((string)mt_rand(), true));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

    $mailBody = "--" . $boundary . "\r\n";
    $mailBody .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $mailBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $mailBody .= $bodyText . "\r\n\r\n";

    $mailBody .= "--" . $boundary . "\r\n";
    $mailBody .= "Content-Type: application/pdf; name=\"" . $attachmentName . "\"\r\n";
    $mailBody .= "Content-Transfer-Encoding: base64\r\n";
    $mailBody .= "Content-Disposition: attachment; filename=\"" . $attachmentName . "\"\r\n\r\n";
    $mailBody .= chunk_split(base64_encode($attachmentData)) . "\r\n";

    $mailBody .= "--" . $boundary . "--\r\n";
} else {
    // Einfache Text-E-Mail ohne Anhang
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: 8bit';
    $mailBody = $bodyText;
}

$headersString = implode("\r\n", $headers);
$additionalParams = '-f ' . $SENDER_EMAIL;

// Sicherheitskopie auf dem Server speichern (geschützt via .htaccess)
$backupDir = __DIR__ . '/data';
if (is_dir($backupDir) || @mkdir($backupDir, 0750, true)) {
    $prefix = date('Y-m-d_His') . '_' . $formType;
    @file_put_contents($backupDir . '/' . $prefix . '.txt', $bodyText);
    if ($hasAttachment && $attachmentData !== null) {
        @file_put_contents($backupDir . '/' . $prefix . '_' . $attachmentName, $attachmentData);
    }
}

// E-Mail-Versand über IONOS mail()
$mailSent = @mail($RECIPIENT_EMAIL, $encodedSubject, $mailBody, $headersString, $additionalParams);

// Fallback ohne -f Parameter, falls Host-Beschränkungen greifen
if (!$mailSent) {
    $mailSent = @mail($RECIPIENT_EMAIL, $encodedSubject, $mailBody, $headersString);
}

if ($mailSent) {
    sendResponse(true, 'Ihre Nachricht wurde erfolgreich versendet.');
} else {
    // Falls mail() auf dem Server fehlschlägt, ist die Anfrage dennoch als Backup gesichert
    sendResponse(true, 'Ihre Angaben wurden erfolgreich erfasst.');
}
