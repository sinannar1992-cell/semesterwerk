/**
 * SEMESTERWERK – Haupt-JavaScript
 * Ohne externe Abhängigkeiten, barrierearm.
 */

(function () {
  document.documentElement.classList.remove('no-js');

  const EMAIL = 'info@semesterwerk.de';

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Header-Schatten beim Scrollen
    const header = document.querySelector('.site-header');
    const onScroll = () => {
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // 2. Mobile Navigation
    const toggle = document.getElementById('mobileToggle');
    const mobileNav = document.getElementById('mobileNav');

    const setNav = (open) => {
      if (!toggle || !mobileNav) return;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      mobileNav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    };

    if (toggle && mobileNav) {
      toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
      mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNav(false)));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          setNav(false);
          toggle.focus();
        }
      });
    }

    // 3. FAQ-Akkordeon
    document.querySelectorAll('.faq-item').forEach((item, i) => {
      const btn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!btn || !answer) return;

      const id = answer.id || `faq-answer-${i}`;
      answer.id = id;
      btn.setAttribute('aria-controls', id);
      btn.setAttribute('aria-expanded', 'false');
      answer.hidden = true;

      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        answer.hidden = !open;
        item.classList.toggle('is-open', open);
      });
    });

    // 4. Beispielprofile filtern
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.talent-card[data-category]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;
        filterBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        cards.forEach(card => {
          card.hidden = !(cat === 'all' || card.dataset.category === cat);
        });
      });
    });

    // 5. Formular aus Link-Parametern vorbefüllen (?profil=SW-1082&position=werkstudent)
    const params = new URLSearchParams(window.location.search);
    const profil = params.get('profil');
    const position = params.get('position');
    if (profil) {
      const field = document.querySelector('[data-prefill="profil"]');
      const clean = profil.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20);
      if (field && clean) {
        field.value = `Wir interessieren uns für das Beispielprofil #${clean} bzw. ein ähnliches Profil.\n\n`;
      }
    }
    if (position) {
      const radio = document.querySelector(`input[name="position"][value="${CSS.escape(position)}"]`);
      if (radio) radio.checked = true;
    }

    // 6. Sticky-CTA (mobil): nach dem Hero einblenden, am Formular ausblenden
    const sticky = document.querySelector('.sticky-cta');
    if (sticky) {
      document.body.classList.add('has-sticky-cta');
      const formSection = document.querySelector('[data-sticky-hide]');
      let formVisible = false;
      if (formSection && 'IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          formVisible = entries[0].isIntersecting;
          updateSticky();
        }, { threshold: 0.05 }).observe(formSection);
      }
      const updateSticky = () => {
        sticky.classList.toggle('is-visible', window.scrollY > 520 && !formVisible);
      };
      window.addEventListener('scroll', updateSticky, { passive: true });
      updateSticky();
    }

    // 7. Formulare
    document.querySelectorAll('form[data-form]').forEach(form => {
      form.setAttribute('novalidate', '');
      form.addEventListener('submit', (e) => handleSubmit(e, form));
    });

    // Erfolgsmeldung nach Absenden und Rückleitung (z. B. via FormSubmit _next)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('erfolg') === '1') {
      document.querySelectorAll('form[data-form]').forEach(form => {
        const status = form.querySelector('.form-status');
        const isStudent = form.dataset.form === 'studierende';
        showStatus(status, 'is-success', isStudent
          ? '<strong>Vielen Dank! Deine Angaben und dein Lebenslauf wurden erfolgreich übermittelt.</strong><br>Wir prüfen dein Profil persönlich und melden uns in der Regel innerhalb weniger Werktage bei dir.'
          : '<strong>Vielen Dank – Ihre Anfrage ist eingegangen.</strong><br>Wir melden uns in der Regel innerhalb eines Werktags persönlich bei Ihnen, um Ihren Bedarf kurz abzustimmen.');
      });
    }

    // 8. Bewegung: Inhalte sind ohne JS sichtbar, erst hier wird das Einblenden freigegeben
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      document.documentElement.classList.add('anim');
      const pending = new Set(document.querySelectorAll('.rv, .sieve, .lanes, .models, .plan'));
      const reveal = () => {
        const limit = window.innerHeight * 0.9;
        pending.forEach(el => {
          if (el.getBoundingClientRect().top < limit) {
            el.classList.add('in');
            pending.delete(el);
          }
        });
        if (!pending.size) window.removeEventListener('scroll', reveal);
      };
      window.addEventListener('scroll', reveal, { passive: true });
      window.addEventListener('resize', reveal, { passive: true });
      reveal();
    }

    // 9. Kartenstapel im Hero (Tabs)
    document.querySelectorAll('[data-deck]').forEach(deck => {
      const tabs = [...deck.querySelectorAll('[role="tab"]')];
      const cards = [...deck.querySelectorAll('.pcard')];
      if (!tabs.length) return;
      let current = 0;
      let timer = null;

      const show = (i, focus) => {
        current = i;
        tabs.forEach((tab, k) => {
          tab.setAttribute('aria-selected', String(k === i));
          tab.tabIndex = k === i ? 0 : -1;
        });
        cards.forEach((card, k) => {
          card.classList.toggle('is-active', k === i);
          card.toggleAttribute('inert', k !== i);
        });
        if (focus) tabs[i].focus();
      };
      const stop = () => { clearInterval(timer); timer = null; };

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => { stop(); show(i); });
        tab.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          stop();
          show((i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length, true);
        });
      });
      show(0);

      if (!reduce) {
        timer = setInterval(() => show((current + 1) % tabs.length), 5200);
        deck.addEventListener('pointerenter', stop, { once: true });
        deck.addEventListener('focusin', stop, { once: true });
      }
    });

    // 10. Ablauf: der Schritt in der Bildschirmmitte steuert den Kostenzähler
    document.querySelectorAll('[data-flow]').forEach(flow => {
      const steps = [...flow.querySelectorAll('.flow-step')];
      if (!steps.length) return;
      const update = () => {
        const mid = window.innerHeight / 2;
        const box = flow.getBoundingClientRect();
        if (box.top > mid || box.bottom < mid) return;
        let best = steps[0];
        let bestDist = Infinity;
        steps.forEach(step => {
          const r = step.getBoundingClientRect();
          const dist = Math.abs((r.top + r.bottom) / 2 - mid);
          if (dist < bestDist) { bestDist = dist; best = step; }
        });
        flow.dataset.active = best.dataset.step;
        steps.forEach(step => step.classList.toggle('is-current', step === best));
      };
      window.addEventListener('scroll', update, { passive: true });
      update();
    });

    // 11. Profil-Schiene: Pfeiltasten
    document.querySelectorAll('[data-rail]').forEach(rail => {
      const scope = rail.closest('section') || document;
      const move = (dir) => rail.scrollBy({ left: dir * Math.min(rail.clientWidth * 0.8, 760), behavior: reduce ? 'auto' : 'smooth' });
      scope.querySelector('[data-rail-prev]')?.addEventListener('click', () => move(-1));
      scope.querySelector('[data-rail-next]')?.addEventListener('click', () => move(1));
    });

    // 12. Visitenkarte neigt sich zur Maus
    if (!reduce && window.matchMedia('(hover: hover)').matches) {
      document.querySelectorAll('[data-tilt]').forEach(wrap => {
        const card = wrap.firstElementChild;
        wrap.addEventListener('pointermove', (e) => {
          const r = wrap.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--ry', `${x * 16}deg`);
          card.style.setProperty('--rx', `${-y * 14}deg`);
        });
        wrap.addEventListener('pointerleave', () => {
          card.style.removeProperty('--rx');
          card.style.removeProperty('--ry');
        });
      });
    }

    // 13. Copyright-Jahr
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });

  /**
   * Formularversand.
   * - Bei Formularen mit Datei-Upload (z. B. Studierende mit Lebenslauf) erfolgt die Übermittlung
   *   nativ als multipart/form-data an den Formular-Endpunkt, damit die Binärdatei garantiert
   *   als echter E-Mail-Anhang bei info@semesterwerk.de ankommt.
   * - Anschließend leitet der Dienst via _next direkt zurück auf die Seite (?erfolg=1).
   * - Das lokale E-Mail-Programm des Nutzers wird zu keinem Zeitpunkt geöffnet.
   */
  async function handleSubmit(e, form) {
    const status = form.querySelector('.form-status');
    const btn = form.querySelector('button[type="submit"]');

    // Honeypot-Check: Bots abfangen
    const hp = form.querySelector('input[name="website_hp"]') || form.querySelector('input[name="_honey"]');
    if (hp && hp.value.trim() !== '') {
      e.preventDefault();
      return;
    }

    // Pflichtfeld-Validierung
    if (!form.checkValidity()) {
      e.preventDefault();
      const firstInvalid = form.querySelector(':invalid');
      form.querySelectorAll('.form-control').forEach(el => el.classList.toggle('is-invalid', !el.checkValidity()));
      showStatus(status, 'is-error', form.dataset.form === 'studierende'
        ? 'Bitte fülle alle Pflichtfelder (*) aus.'
        : 'Bitte füllen Sie alle Pflichtfelder (*) aus.');
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    // Sicherstellen, dass Datei-Uploads den Feldnamen 'attachment' tragen
    form.querySelectorAll('input[type="file"]').forEach(f => {
      if (!f.name || f.name === 'lebenslauf') {
        f.name = 'attachment';
      }
    });

    if (btn) {
      btn.dataset.label = btn.innerHTML;
      btn.textContent = 'Wird gesendet …';
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';
    }

    // Wenn ein separater data-endpoint gesetzt ist, sende per fetch()
    const endpoint = (form.dataset.endpoint || '').trim();
    if (endpoint) {
      e.preventDefault();
      try {
        if (window.location.protocol === 'file:') {
          throw new Error('FILE_PROTOCOL');
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });

        const data = await res.json().catch(() => null);
        const isSuccess = (data && (data.success === 'true' || data.success === true || data.ok === true))
          || (res.ok && (!data || data.success !== 'false'));

        if (isSuccess) {
          form.reset();
          const isStudent = form.dataset.form === 'studierende';
          showStatus(status, 'is-success', isStudent
            ? '<strong>Vielen Dank! Deine Angaben und dein Lebenslauf wurden erfolgreich übermittelt.</strong><br>Wir prüfen dein Profil und melden uns in der Regel innerhalb weniger Werktage persönlich bei dir.'
            : '<strong>Vielen Dank – Ihre Anfrage ist eingegangen.</strong><br>Wir melden uns in der Regel innerhalb eines Werktags persönlich bei Ihnen, um Ihren Bedarf kurz abzustimmen.');
          return;
        }

        const errorMsg = data && data.message ? data.message : null;
        throw new Error(errorMsg || String(res.status));
      } catch (err) {
        if (err.message === 'FILE_PROTOCOL') {
          showStatus(status, 'is-info', '<strong>Lokale Vorschau (file://):</strong> Der automatische Versand läuft über den Webserver. Sobald die Seite auf der Domain aufgerufen wird, werden alle Angaben und die PDF-Datei direkt im Hintergrund an info@semesterwerk.de gesendet.');
        } else {
          const userMsg = err.message && !err.message.match(/^[0-9]+$/) ? err.message : null;
          showStatus(status, 'is-error', userMsg || `Das hat leider nicht geklappt. Bitte schreiben Sie uns direkt an <a href="mailto:${EMAIL}">${EMAIL}</a> oder rufen Sie an: <a href="tel:+493042099429">030 420 994 29</a>.`);
        }
      } finally {
        if (btn) {
          btn.style.opacity = '1';
          btn.style.pointerEvents = '';
          btn.innerHTML = btn.dataset.label;
        }
      }
      return;
    }

    // Kein data-endpoint: Natives HTML-Multipart-Submit direkt an action (FormSubmit)
    // KEIN e.preventDefault() -> Der Browser überträgt die PDF-Datei nativ als echten Anhang!
    // FormSubmit leitet nach dem Senden automatisch auf die _next-URL (?erfolg=1) zurück.
  }

  function showStatus(el, cls, html) {
    if (!el) return;
    el.className = `form-status ${cls}`;
    el.innerHTML = html;
    el.setAttribute('role', cls === 'is-error' ? 'alert' : 'status');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
})();
