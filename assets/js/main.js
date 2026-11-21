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

  // Vercel nimmt pro Anfrage höchstens 4,5 MB an; die Serverfunktion prüft dieselbe Grenze.
  const MAX_FILE_BYTES = 4 * 1024 * 1024;

  /**
   * Formularversand an die Serverfunktion /api/send-mail (Vercel).
   * Sie verschickt die Angaben an info@semesterwerk.de, den Lebenslauf als PDF-Anhang.
   */
  async function handleSubmit(e, form) {
    e.preventDefault();

    const status = form.querySelector('.form-status');
    const btn = form.querySelector('button[type="submit"]');
    const du = form.dataset.form === 'studierende';
    const fallback = `Das hat leider nicht geklappt. Bitte schreiben Sie uns direkt an <a href="mailto:${EMAIL}">${EMAIL}</a> oder rufen Sie an: <a href="tel:+493042099429">030 420 994 29</a>.`;

    const hp = form.querySelector('input[name="website_hp"]');
    if (hp && hp.value.trim() !== '') return;

    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector(':invalid');
      form.querySelectorAll('.form-control').forEach(el => el.classList.toggle('is-invalid', !el.checkValidity()));
      showStatus(status, 'is-error', du
        ? 'Bitte fülle alle Pflichtfelder (*) aus.'
        : 'Bitte füllen Sie alle Pflichtfelder (*) aus.');
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    // Lebenslauf vor dem Hochladen prüfen, damit niemand umsonst wartet
    const fileInput = form.querySelector('input[type="file"]');
    const file = fileInput && fileInput.files[0];
    if (file) {
      const looksPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!looksPdf || file.size > MAX_FILE_BYTES) {
        fileInput.classList.add('is-invalid');
        showStatus(status, 'is-error', !looksPdf
          ? 'Bitte lade deinen Lebenslauf als PDF-Datei hoch.'
          : 'Dein Lebenslauf ist größer als 4 MB. Bitte lade eine kleinere PDF-Datei hoch.');
        fileInput.focus();
        return;
      }
    }

    if (window.location.protocol === 'file:') {
      showStatus(status, 'is-info', '<strong>Lokale Vorschau:</strong> Der Versand funktioniert nur, wenn die Seite über die Domain aufgerufen wird.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.dataset.label = btn.innerHTML;
      btn.textContent = 'Wird gesendet …';
    }

    try {
      const res = await fetch(form.dataset.endpoint || '/api/send-mail', {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (res.status === 413) {
        showStatus(status, 'is-error', 'Der Lebenslauf ist zu groß. Bitte lade eine PDF-Datei mit höchstens 4 MB hoch.');
        return;
      }

      const data = await res.json().catch(() => null);

      if (res.ok && data && data.ok) {
        form.reset();
        showStatus(status, 'is-success', du
          ? '<strong>Danke, deine Angaben und dein Lebenslauf sind angekommen!</strong><br>Wir sehen uns dein Profil persönlich an und melden uns in der Regel innerhalb weniger Werktage bei dir.'
          : '<strong>Vielen Dank – Ihre Anfrage ist eingegangen.</strong><br>Wir melden uns in der Regel innerhalb eines Werktags persönlich bei Ihnen, um Ihren Bedarf kurz abzustimmen.');
        return;
      }

      // Meldungen der Serverfunktion sind für Besucher formuliert; als Text einsetzen
      showStatus(status, 'is-error', data && data.message ? escapeHtml(data.message) : fallback);
    } catch (err) {
      showStatus(status, 'is-error', fallback);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.label;
      }
    }
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function showStatus(el, cls, html) {
    if (!el) return;
    el.className = `form-status ${cls}`;
    el.innerHTML = html;
    el.setAttribute('role', cls === 'is-error' ? 'alert' : 'status');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
})();
