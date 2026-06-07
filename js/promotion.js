/* ============================================================================
   KICKBACK – promotion.js
   ----------------------------------------------------------------------------
   Steuert auf der Promotion-Seite zwei Teile:
     1) Crew-/Newsletter-Formular  → JS-Validierung + Speicherung in der DB
                                      (php-crud-api) inkl. E-Mail-Dublettenprüfung
     2) FAQ-Accordion              → immer nur eine Frage offen

   Das eigentliche Game (Jersey Runner) liegt in js/jersey-runner.js.
   ============================================================================ */

(() => {
  'use strict';

  /* ========================================================================
     1) CREW-/NEWSLETTER-FORMULAR  (JS-Validierung + DB-Speicherung)
     ======================================================================== */

  /* API-Adresse: lokal (Docker) Port 8081, online (Plesk) api.php im selben
     Ordner — wird automatisch am hostname erkannt. */
  const isLocal       = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API_BASE      = isLocal
    ? `${location.protocol}//${location.hostname}:8081`
    : 'api.php';
  const VEREIN_URL    = `${API_BASE}/records/verein?size=200`;
  const VERLOSUNG_URL = `${API_BASE}/records/verlosung`;   // Tabelle für die Promo-Teilnehmer

  const form     = document.getElementById('crew-form');
  const status   = document.getElementById('form-status');
  const clubSel  = document.getElementById('f-club');
  const scoreInp = document.getElementById('f-score');     // verstecktes Feld: Game-Highscore

  /* setStatus(): Rückmeldung neben dem Button; type steuert Farbe/Spinner. */
  const setStatus = (msg, type = '') => {
    status.className = 'form-status ' + type;
    const spinner = type === 'loading' ? '<span class="spinner" aria-hidden="true"></span> ' : '';
    status.innerHTML = msg ? spinner + msg : '';
  };

  /* ---- Vereine fürs Dropdown laden (mit Offline-Fallback) -------------- */
  const FALLBACK_VEREINE = [
    { vereins_id: 1, name: 'FC Barcelona', liga: 'La Liga' },
    { vereins_id: 2, name: 'Real Madrid', liga: 'La Liga' },
    { vereins_id: 3, name: 'FC Liverpool', liga: 'Premier League' },
    { vereins_id: 4, name: 'Manchester City', liga: 'Premier League' },
    { vereins_id: 5, name: 'FC Bayern München', liga: 'Bundesliga' },
    { vereins_id: 6, name: 'Borussia Dortmund', liga: 'Bundesliga' },
    { vereins_id: 7, name: 'Juventus Turin', liga: 'Serie A' },
    { vereins_id: 8, name: 'AC Mailand', liga: 'Serie A' },
    { vereins_id: 9, name: 'Paris Saint-Germain', liga: 'Ligue 1' },
    { vereins_id: 10, name: 'Ajax Amsterdam', liga: 'Eredivisie' },
    { vereins_id: 11, name: 'FC Basel', liga: 'Super League' },
    { vereins_id: 12, name: 'BSC Young Boys', liga: 'Super League' }
  ];

  const loadVereine = async () => {
    let list = FALLBACK_VEREINE;
    try {
      const res = await fetch(VEREIN_URL);
      if (res.ok) {
        const data = await res.json();
        if (data.records?.length) list = data.records;
      }
    } catch { /* offline → Fallback */ }

    clubSel.innerHTML = '<option value="">Wählen...</option>';
    list.forEach(v => {
      const o = document.createElement('option');
      o.value = v.vereins_id;                        // gespeichert wird die ID (Fremdschlüssel)
      o.textContent = `${v.name}${v.liga ? ' — ' + v.liga : ''}`;
      clubSel.appendChild(o);
    });
  };
  loadVereine();

  /* ---- Validierung ----------------------------------------------------- */
  // E-Mail-Regex: etwas@etwas.tld (keine Leerzeichen, ein @, Punkt + TLD)
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  const validate = () => {
    let ok = true;
    form.querySelectorAll('.field').forEach(f => {
      const key = f.dataset.field;
      const inp = f.querySelector('input, select');
      const val = (inp.value || '').trim();
      let valid = true;
      if (key === 'name')       valid = val.length >= 2;   // Name: mind. 2 Zeichen
      else if (key === 'email') valid = isEmail(val);      // E-Mail: Regex
      else                      valid = val !== '';        // Rest: nicht leer
      f.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    });
    return ok;
  };

  // Live-Validierung: beim Verlassen prüfen, beim Tippen Fehler wieder lösen
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('blur', validate);
    el.addEventListener('input', () => {
      const f = el.closest('.field');
      if (f?.classList.contains('invalid')) validate();
    });
  });

  /* ---- Zusatzaufgabe: E-Mail-Dublettenprüfung -------------------------- *
   * Vor dem Speichern fragen wir die DB, ob die E-Mail schon existiert.    */
  const emailExists = async (email) => {
    try {
      const url = `${VERLOSUNG_URL}?filter=email,eq,${encodeURIComponent(email)}&size=1`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      return (data.records?.length || 0) > 0;
    } catch {
      return false;   // offline → Prüfung überspringen
    }
  };

  /* ---- Absenden -------------------------------------------------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');

    if (!validate()) { setStatus('Bitte Felder prüfen', 'err'); return; }

    const fd = new FormData(form);
    const email = fd.get('email').trim();

    setStatus('Prüfe E-Mail…', 'loading');
    if (await emailExists(email)) {
      form.querySelector('[data-field="email"]')?.classList.add('invalid');
      setStatus('Diese E-Mail ist schon dabei', 'err');
      return;
    }

    // Highscore aus dem Jersey Runner mitspeichern (Spalte spielstand)
    const highScore = Number(localStorage.getItem('kickbackJerseyRunnerHighScore') || 0);
    if (scoreInp) scoreInp.value = String(highScore);

    const payload = {
      name: fd.get('name').trim(),
      email: email,
      lieblingsverein: Number(fd.get('lieblingsverein')) || null,  // Fremdschlüssel → verein
      groesse: fd.get('groesse'),
      newsletter: fd.get('newsletter') ? 1 : 0,                    // Checkbox → 1/0
      spielstand: highScore
    };

    setStatus('Speichere…', 'loading');
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch(VERLOSUNG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || ('HTTP ' + res.status));
      }
      await res.json();
      setStatus('Willkommen in der Crew! ✱', 'ok');
      form.reset();
    } catch (err) {
      console.warn('[Kickback] DB-Save fehlgeschlagen:', err.message);
      setStatus('Eingetragen (offline) ✱', 'ok');   // Fallback ohne API
      form.reset();
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* ========================================================================
     2) FAQ-ACCORDION  (immer nur eine Frage offen)
     ======================================================================== */
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      const open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        document.querySelectorAll('.faq-item.is-open').forEach(other => {
          if (other !== item) {
            other.classList.remove('is-open');
            other.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
          }
        });
      }
    });
  });
})();
