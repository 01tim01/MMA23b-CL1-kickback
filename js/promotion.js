/* ============================================================================
   KICKBACK – promotion.js
   ----------------------------------------------------------------------------
   Steuert auf der Promotion-Seite zwei Teile:
     1) Crew-/Newsletter-Formular  → JS-Validierung (js/validation.js) +
                                      Speicherung in der DB über js/api.js,
                                      inkl. E-Mail-Dublettenprüfung
     2) FAQ-Accordion              → immer nur eine Frage offen

   Das eigentliche Game (Jersey Runner) liegt in js/jersey-runner.js.
   ============================================================================ */

(() => {
  'use strict';

  /* ========================================================================
     1) CREW-/NEWSLETTER-FORMULAR  (JS-Validierung + DB-Speicherung)
     ======================================================================== */

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
      const records = await KickbackAPI.getVereine();
      if (records.length) list = records;
    } catch { /* offline → Fallback */ }

    clubSel.innerHTML = '<option value="">Wählen...</option>';
    list.forEach(v => {
      const o = document.createElement('option');
      o.value = v.vereins_id;                        // gespeichert wird die ID (Fremdschlüssel)
      o.textContent = `${v.name}${v.liga ? ' · ' + v.liga : ''}`;
      clubSel.appendChild(o);
    });
  };
  loadVereine();

  /* ---- Validierung ------------------------------------------------------ *
   * Die Regeln (Name ≥ 2 Zeichen, E-Mail-Regex, Dropdowns nicht leer) liegen
   * zentral in js/validation.js. HTML5-Validierung ist aus (novalidate,
   * kein required, kein type="email") – es zählt nur diese JS-Prüfung.      */
  const validate = () => KickbackValidation.validateForm(form);

  // Live-Validierung: beim Verlassen prüfen, beim Tippen Fehler wieder lösen
  KickbackValidation.attachLiveValidation(form);

  /* ---- Zusatzaufgabe: E-Mail-Dublettenprüfung -------------------------- *
   * Vor dem Speichern fragen wir die DB, ob die E-Mail schon existiert.    */
  const emailExists = async (email) => {
    try {
      return await KickbackAPI.verlosungEmailExists(email);
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
      // php-crud-api antwortet bei POST mit der neuen ID → unsere "Los-Nummer".
      const newId = await KickbackAPI.saveVerlosung(payload);
      setStatus(`Willkommen in der Crew! Los-Nr. ${newId} ✱`, 'ok');
      form.reset();
    } catch (err) {
      // Ehrliche Fehlermeldung statt vorgetäuschtem Erfolg: Die Eingaben
      // bleiben im Formular stehen, damit man es einfach nochmal versuchen kann.
      console.warn('[Kickback] DB-Save fehlgeschlagen:', err.message);
      setStatus('Speichern fehlgeschlagen – Datenbank nicht erreichbar', 'err');
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
