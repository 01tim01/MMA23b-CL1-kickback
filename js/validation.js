/* ============================================================================
   KICKBACK – validation.js  (Formular-Validierung, reine JS-Lösung)
   ----------------------------------------------------------------------------
   Die HTML5-Validierung ist bewusst AUS (im <form> steht `novalidate`, die
   Felder haben kein `required` und kein `type="email"`). Stattdessen prüft
   dieses Modul die Eingaben per JavaScript – so sehen die Fehlermeldungen
   auf jedem Browser gleich aus und folgen unserem Design.

   Funktionsweise: Jedes Eingabefeld steckt in einem `.field`-Container mit
   `data-field="…"`. Anhand dieses Namens wird die passende Regel gewählt.
   Bei einem Fehler bekommt der Container die Klasse `.invalid` – das CSS
   färbt dann den Rahmen rot und blendet den `.error`-Text ein.
   ============================================================================ */

window.KickbackValidation = (() => {
  'use strict';

  // E-Mail-Regex: etwas@etwas.tld – keine Leerzeichen, genau ein @,
  // nach dem Punkt mindestens 2 Zeichen (TLD).
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  // Regeln pro Feldname: bekommt den getrimmten Wert, gibt true/false zurück.
  const RULES = {
    name:  (v) => v.length >= 2,   // Name: mindestens 2 Zeichen
    email: (v) => isEmail(v),      // E-Mail: Regex oben
    // alle übrigen Felder (Dropdowns): einfach nicht leer
  };
  const defaultRule = (v) => v !== '';

  /* validateField(): EIN .field-Element prüfen und markieren. */
  const validateField = (fieldEl) => {
    const input = fieldEl.querySelector('input, select');
    if (!input) return true;
    const value = (input.value || '').trim();
    const rule  = RULES[fieldEl.dataset.field] || defaultRule;
    const valid = rule(value);
    fieldEl.classList.toggle('invalid', !valid);
    return valid;
  };

  /* validateForm(): alle .field-Container eines Formulars prüfen.
     Gibt true zurück, wenn ALLE Felder gültig sind. */
  const validateForm = (form) => {
    let ok = true;
    form.querySelectorAll('.field').forEach(f => {
      if (!validateField(f)) ok = false;
    });
    return ok;
  };

  /* attachLiveValidation(): beim Verlassen eines Feldes (blur) prüfen,
     beim Tippen einen bestehenden Fehler sofort wieder auflösen. So nervt
     die Validierung nicht während des Schreibens. */
  const attachLiveValidation = (form) => {
    form.querySelectorAll('.field input, .field select').forEach(el => {
      el.addEventListener('blur',  () => validateField(el.closest('.field')));
      el.addEventListener('input', () => {
        const f = el.closest('.field');
        if (f?.classList.contains('invalid')) validateField(f);
      });
      el.addEventListener('change', () => validateField(el.closest('.field')));
    });
  };

  return { isEmail, validateField, validateForm, attachLiveValidation };
})();
