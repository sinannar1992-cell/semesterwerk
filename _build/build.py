#!/usr/bin/env python3
"""Baut die statischen semesterwerk-Seiten aus Fragmenten (pages/*.html)."""
import os, re, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
BASE = 'https://semesterwerk.de/'

ICONS = {
 'check': '<path d="M20 6 9 17l-5-5"/>',
 'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
 'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
 'phone': '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
 'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
 'shield': '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.9 7.5 9 4.3-1.1 7.5-4.4 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
 'euro': '<path d="M17.5 6.5a7 7 0 1 0 0 11"/><path d="M4 10h9M4 14h9"/>',
 'inbox': '<path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M5.5 5h13L21 13v6H3v-6l2.5-8Z"/>',
 'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 'cap': '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.2V16c3.3 2.3 8.7 2.3 12 0v-4.8M22 9v6"/>',
 'x': '<path d="M18 6 6 18M6 6l12 12"/>',
 'minus': '<path d="M5 12h14"/>',
 'plus': '<path d="M12 5v14M5 12h14"/>',
 'lock': '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 'file': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
 'briefcase': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
 'code': '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/>',
 'chart': '<path d="M4 20h16"/><path d="M7 16v-4M12 16V7M17 16v-7"/>',
 'megaphone': '<path d="M3 10v4l11 5V5L3 10Z"/><path d="M18 8.5a4 4 0 0 1 0 7M7 15.5V20"/>',
 'cog': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
 'pen': '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
 'scale': '<path d="M12 3v18M7 21h10M5 7h14M12 3l-1 4h2l-1-4Z"/><path d="m5 7-3 7a3 3 0 0 0 6 0L5 7ZM19 7l-3 7a3 3 0 0 0 6 0l-3-7Z"/>',
 'pin': '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
 'calendar': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 'eye-off': '<path d="m3 3 18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16.6 16.6 0 0 1-3.2 3.8M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6c1.6 0 3-.4 4.3-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
 'target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 'message': '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z"/>',
 'handshake': '<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2"/><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a2 2 0 0 0-2.8 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a3.4 3.4 0 0 1 4-.6l.5.3a2 2 0 0 0 1.3.3H21"/><path d="m21 15-1 1M3 4h8M3 15l6.5 6.5a1.4 1.4 0 0 0 2-2"/><path d="M3 4v11"/>',
 'star': '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
 'filter': '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
}

def icon(name):
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
            + ICONS[name] + '</svg>')

NAV = [
    ('fuer-unternehmen.html', 'Für Unternehmen'),
    ('talent-pool.html', 'Beispielprofile'),
    ('ueber-uns.html', 'Über uns'),
    ('faq.html', 'FAQ'),
    ('kontakt.html', 'Kontakt'),
]

def header(current):
    def cur(f): return ' aria-current="page"' if f == current else ''
    nav = '\n'.join(f'          <a href="{f}" class="nav-link"{cur(f)}>{t}</a>' for f, t in NAV)
    mnav = '\n'.join(f'          <a href="{f}" class="mobile-nav-link"{cur(f)}>{t}</a>'
                     for f, t in [('index.html', 'Startseite')] + NAV + [('fuer-studierende.html', 'Für Studierende')])
    return f"""  <a class="skip-link" href="#main">Zum Inhalt springen</a>

  <header class="site-header">
    <div class="container header-inner">
      <a href="index.html" class="logo-link" aria-label="semesterwerk – zur Startseite">
        <img src="assets/img/svg/semesterwerk-logo.svg" alt="semesterwerk" class="logo-img" width="535" height="86">
      </a>

      <nav class="main-nav" aria-label="Hauptnavigation">
{nav}
      </nav>

      <div class="header-actions">
        <a href="fuer-studierende.html" class="student-link"{cur('fuer-studierende.html')}>{icon('cap')}Für Studierende</a>
        <a href="tel:+493042099429" class="header-phone">{icon('phone')}030 420 994 29</a>
        <a href="fuer-unternehmen.html#anfrage" class="btn btn-primary">Profile anfragen</a>
      </div>

      <button class="mobile-toggle" id="mobileToggle" type="button" aria-label="Menü öffnen" aria-expanded="false" aria-controls="mobileNav">
        <span class="mobile-toggle-bars" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>
    </div>

    <div class="mobile-nav" id="mobileNav">
      <div class="container">
        <nav class="mobile-nav-list" aria-label="Mobile Navigation">
{mnav}
        </nav>
        <div class="mobile-nav-actions">
          <a href="fuer-unternehmen.html#anfrage" class="btn btn-primary btn-block">Profile kostenlos anfragen</a>
          <a href="tel:+493042099429" class="btn btn-ghost-light btn-block">{icon('phone')}030 420 994 29</a>
        </div>
      </div>
    </div>
  </header>
"""

def footer():
    return f'''  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" aria-label="semesterwerk – zur Startseite">
            <img src="assets/img/svg/semesterwerk-logo-weiss.svg" alt="semesterwerk" width="535" height="86" loading="lazy">
          </a>
          <p>Personalvermittlung für Praktika und Werkstudentenstellen. Für Unternehmen rein erfolgsbasiert, für Studierende kostenlos.</p>
        </div>

        <div>
          <h2 class="footer-heading">Für Unternehmen</h2>
          <ul class="footer-links">
            <li><a href="fuer-unternehmen.html#ablauf">So funktioniert’s</a></li>
            <li><a href="fuer-unternehmen.html#kosten">Kosten &amp; Konditionen</a></li>
            <li><a href="talent-pool.html">Beispielprofile</a></li>
            <li><a href="fuer-unternehmen.html#ratgeber">Praktikum oder Werkstudent?</a></li>
            <li><a href="fuer-unternehmen.html#anfrage">Profile anfragen</a></li>
          </ul>
        </div>

        <div>
          <h2 class="footer-heading">Für Studierende</h2>
          <ul class="footer-links">
            <li><a href="fuer-studierende.html">Deine Vorteile</a></li>
            <li><a href="fuer-studierende.html#anmeldung">Kostenlos registrieren</a></li>
            <li><a href="faq.html#studierende">Fragen von Studierenden</a></li>
          </ul>
        </div>

        <div>
          <h2 class="footer-heading">Kontakt</h2>
          <address class="footer-address">
            semesterwerk<br>
            Inhaber: Sinan Nar<br>
            Eisenhutweg 64A<br>
            12487 Berlin
          </address>
          <ul class="footer-links">
            <li><a href="tel:+493042099429">030 420 994 29</a></li>
            <li><a href="mailto:info@semesterwerk.de">info@semesterwerk.de</a></li>
            <li><a href="ueber-uns.html">Über uns</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <div>© <span id="currentYear">2026</span> semesterwerk · Sinan Nar</div>
        <div class="footer-bottom-links">
          <a href="impressum.html">Impressum</a>
          <a href="datenschutz.html">Datenschutz</a>
          <a href="agb.html">AGB</a>
        </div>
      </div>
    </div>
  </footer>
'''

STICKY = {
    'company': f'''  <div class="sticky-cta" aria-label="Schnellkontakt">
    <a href="fuer-unternehmen.html#anfrage" class="btn btn-primary">Profile kostenlos anfragen</a>
    <a href="tel:+493042099429" class="btn btn-ghost" aria-label="Anrufen: 030 420 994 29">{icon('phone')}</a>
  </div>
''',
    'student': '''  <div class="sticky-cta" aria-label="Schnellzugriff">
    <a href="#anmeldung" class="btn btn-primary">Kostenlos eintragen</a>
  </div>
''',
}

ORG_JSONLD = {
    "@context": "https://schema.org",
    "@type": "EmploymentAgency",
    "name": "semesterwerk",
    "url": BASE,
    "logo": BASE + "assets/img/png/semesterwerk-icon-512.png",
    "image": BASE + "assets/img/png/semesterwerk-icon-1024.png",
    "telephone": "+49 30 42099429",
    "email": "info@semesterwerk.de",
    "founder": {"@type": "Person", "name": "Sinan Nar"},
    "address": {"@type": "PostalAddress", "streetAddress": "Eisenhutweg 64A",
                "addressLocality": "Berlin", "postalCode": "12487", "addressCountry": "DE"},
    "openingHours": "Mo-Fr 09:00-18:00",
    "areaServed": ["DE", "AT", "CH"],
    "description": "Erfolgsbasierte Personalvermittlung von Studierenden für Praktika und Werkstudentenstellen.",
}

def page(fname, title, desc, body, sticky=None, jsonld=None, og_title=None):
    font = os.path.exists(os.path.join(OUT, 'assets/fonts/Sora-Variable.woff2'))
    canonical = BASE if fname == 'index.html' else BASE + fname
    ld = ''
    for block in (jsonld or []):
        ld += '  <script type="application/ld+json">\n' + json.dumps(block, ensure_ascii=False, indent=2) + '\n  </script>\n'
    preload = ('  <link rel="preload" href="assets/fonts/Sora-Variable.woff2" as="font" type="font/woff2" crossorigin>\n' if font else '')
    body = re.sub(r'\{\{i:([a-z-]+)\}\}', lambda m: icon(m.group(1)), body)
    body = re.sub(r'\{\{dots:(\d+):(\d+):(\d+)(:hit)?\}\}', lambda m: dots(int(m.group(1)), int(m.group(2)), int(m.group(3)), bool(m.group(4))), body)
    body = body.replace('{{stamp}}', STAMP)
    html = f'''<!DOCTYPE html>
<html lang="de" class="no-js">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{canonical}">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="semesterwerk">
  <meta property="og:url" content="{canonical}">
  <meta property="og:title" content="{og_title or title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="{BASE}assets/img/png/semesterwerk-icon-1024.png">
  <meta name="theme-color" content="#111827">

  <link rel="icon" href="favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="192x192" href="assets/img/png/semesterwerk-icon-192.png">
  <link rel="apple-touch-icon" sizes="180x180" href="assets/img/png/semesterwerk-icon-180.png">
{preload}  <link rel="stylesheet" href="assets/css/style.css?v=20261118">
  <script src="assets/js/main.js?v=20261118-2" defer></script>
{ld}</head>
<body>

{header(fname)}
  <main id="main">
{body.rstrip()}
  </main>

{footer()}{STICKY.get(sticky, '')}</body>
</html>
'''
    with open(os.path.join(OUT, fname), 'w', encoding='utf-8') as f:
        f.write(html)
    print('geschrieben:', fname)


def dots(n, stage=0, cols=8, hit=False):
    cls = 'dots hit' if hit else 'dots'
    inner = ''.join(f'<i style="--i:{k}"></i>' for k in range(n))
    return f'<div class="{cls}" style="--c:{cols};--s:{stage}" aria-hidden="true">{inner}</div>'

STAMP = """<div class="stamp" aria-hidden="true">
              <svg viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="69" fill="#F2784B"/>
                <g class="ring">
                  <path id="stampPath" d="M70 70m-52 0a52 52 0 1 1 104 0a52 52 0 1 1-104 0" fill="none"/>
                  <text font-family="Sora, sans-serif" font-size="9.5" font-weight="700" fill="#111827"><textPath href="#stampPath" textLength="322" lengthAdjust="spacing">BIS ZUR EINSTELLUNG · KEINE VORABKOSTEN · </textPath></text>
                </g>
                <text x="70" y="82" text-anchor="middle" font-family="Sora, sans-serif" font-size="34" font-weight="700" letter-spacing="-1.5" fill="#111827">0 €</text>
              </svg>
            </div>"""

def frag(name):
    with open(os.path.join(HERE, 'pages', name), encoding='utf-8') as f:
        return f.read()

def faq_jsonld(html):
    qs = re.findall(r'<span class="q">(.*?)</span>.*?<div class="faq-answer">(.*?)</div>', html, re.S)
    strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).strip()
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": strip(q),
                            "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in qs]}

PAGES = [
    ('index.html', 'semesterwerk – Praktikant:innen & Werkstudierende finden | Zahlung nur bei Einstellung',
     'Vorausgewählte Studierende für Praktika und Werkstudentenstellen. Keine Vorabkosten, kein Abo – eine einmalige Vermittlungsprovision nur bei erfolgreicher Einstellung.',
     'index.html', 'company', [ORG_JSONLD]),
    ('fuer-unternehmen.html', 'Für Unternehmen: Praktikant:innen & Werkstudierende ohne Vorabkosten | semesterwerk',
     'So funktioniert die erfolgsbasierte Vermittlung von Praktikant:innen und Werkstudierenden: Profile kostenlos sichten, Provision nur bei Einstellung.',
     'fuer-unternehmen.html', 'company', None),
    ('fuer-studierende.html', 'Für Studierende: Praktikum & Werkstudentenjob – kostenlos vermittelt | semesterwerk',
     'Einmal registrieren, passende Praktika und Werkstudentenjobs vorgeschlagen bekommen. Kostenlos, anonym und nur mit deiner Zustimmung.',
     'fuer-studierende.html', 'student', None),
    ('talent-pool.html', 'Beispielprofile: So stellen wir Kandidat:innen vor | semesterwerk',
     'Beispiele für anonymisierte Profilvorschläge von Praktikant:innen und Werkstudierenden – übersichtlich, geprüft und auf das Wesentliche reduziert.',
     'talent-pool.html', 'company', None),
    ('ueber-uns.html', 'Über uns – persönliche Personalvermittlung aus Berlin | semesterwerk',
     'semesterwerk vermittelt Studierende an Unternehmen – persönlich, transparent und erfolgsbasiert. Lernen Sie Gründer Sinan Nar kennen.',
     'ueber-uns.html', 'company', None),
    ('faq.html', 'FAQ – Fragen zu Kosten, Ablauf & Datenschutz | semesterwerk',
     'Antworten für Unternehmen und Studierende: Wann Kosten entstehen, wie schnell Profile kommen und wie Ihre Daten geschützt sind.',
     'faq.html', 'company', 'faq'),
    ('kontakt.html', 'Kontakt – persönlich erreichbar | semesterwerk',
     'Rufen Sie an oder schreiben Sie uns: Wir beraten Sie persönlich zur Besetzung von Praktikums- und Werkstudentenstellen.',
     'kontakt.html', 'company', None),
    ('impressum.html', 'Impressum | semesterwerk', 'Impressum und Anbieterkennzeichnung von semesterwerk gemäß § 5 DDG.', 'impressum.html', None, None),
    ('datenschutz.html', 'Datenschutzerklärung | semesterwerk', 'Informationen zur Verarbeitung personenbezogener Daten bei semesterwerk gemäß DSGVO.', 'datenschutz.html', None, None),
    ('agb.html', 'AGB für Unternehmen | semesterwerk', 'Allgemeine Geschäfts- und Vermittlungsbedingungen von semesterwerk für Unternehmen.', 'agb.html', None, None),
]

only = set(sys.argv[2:])
for fname, title, desc, src, sticky, ld in PAGES:
    if only and fname not in only:
        continue
    body = frag(src)
    if ld == 'faq':
        ld = [faq_jsonld(body)]
    page(fname, title, desc, body, sticky, ld)
