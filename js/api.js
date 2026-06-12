/* ============================================================================
   KICKBACK – api.js  (zentrale API-Schicht)
   ----------------------------------------------------------------------------
   Die EINZIGE Datei, die weiss, wo die Datenbank-API liegt und wie sie
   angesprochen wird. Alle anderen Skripte (shop.js, home.js, promotion.js)
   holen sich ihre Daten ausschliesslich über `window.KickbackAPI`.

   Hintergrund: Die Daten stammen aus der M290-Datenbank (MariaDB). Davor
   sitzt php-crud-api, das aus jeder Tabelle automatisch REST-Endpunkte macht:
     GET  /records/produkt?join=verein   → Produkte inkl. Vereins-Objekt
     GET  /records/verein                → alle Vereine
     GET  /records/verlosung?filter=…    → Teilnehmer suchen (Dublettenprüfung)
     POST /records/verlosung             → neuen Teilnehmer speichern

   Die API-Adresse hängt davon ab, WO die Seite läuft:
     - lokal (Docker):  php-crud-api Container auf Port 8081
     - online (Plesk):  die Datei api.php im selben Webspace
   Das erkennen wir automatisch am Hostname.
   ============================================================================ */

window.KickbackAPI = (() => {
  'use strict';

  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  // relativ ('api.php') statt absolut, damit es auch in einem Unterordner
  // (z. B. GitHub Pages / Plesk-Subfolder) funktioniert.
  const BASE = isLocal
    ? `${location.protocol}//${location.hostname}:8081`
    : 'api.php';

  /* getJSON(): GET-Request + Fehlerprüfung + JSON-Parsing an einer Stelle.
     Wirft bei HTTP-Fehlern eine Exception → der Aufrufer entscheidet über
     den Fallback (Demo-Daten, Fehlermeldung, …). */
  const getJSON = async (path) => {
    const res = await fetch(BASE + path, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  };

  /* ---- Lese-Endpunkte --------------------------------------------------- */

  // Alle Produkte inkl. verknüpftem Verein (JOIN über Fremdschlüssel).
  // `size=200` hebt das Standard-Limit an, damit wirklich alles kommt.
  const getProdukte = async () => {
    const data = await getJSON('/records/produkt?join=verein&size=200');
    return data.records ?? [];   // php-crud-api verpackt alles in `records`
  };

  // Alle Vereine (fürs Lieblingsverein-Dropdown im Formular).
  const getVereine = async () => {
    const data = await getJSON('/records/verein?size=200');
    return data.records ?? [];
  };

  // Dublettenprüfung: existiert diese E-Mail schon in der Verlosung?
  const verlosungEmailExists = async (email) => {
    const data = await getJSON(
      `/records/verlosung?filter=email,eq,${encodeURIComponent(email)}&size=1`
    );
    return (data.records?.length || 0) > 0;
  };

  /* ---- Schreib-Endpunkt -------------------------------------------------- */

  // Neuen Verlosungs-Teilnehmer speichern. php-crud-api antwortet bei POST
  // mit der neuen ID (Primärschlüssel) → geben wir als "Los-Nummer" zurück.
  const saveVerlosung = async (payload) => {
    const res = await fetch(BASE + '/records/verlosung', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  };

  /* ---- Daten-Helfer (Format der API-Antworten) --------------------------- */

  // Bei `join=verein` liefert php-crud-api den Verein als verschachteltes
  // Objekt unter `vereins_id`. Dieser Helfer holt es sicher heraus.
  const vereinOf = (p) =>
    (p && typeof p.vereins_id === 'object' && p.vereins_id) ? p.vereins_id : null;

  // Bild-URL aus der DB normalisieren: führenden '/' entfernen, damit der
  // Pfad relativ zur Seite aufgelöst wird (funktioniert im Webroot UND in
  // einem Unterordner). Ohne Bild → Platzhalter.
  const PLACEHOLDER = 'https://placehold.co/600x600/ECE7DD/0A0A0A?text=KICKBACK';
  const bildUrl = (p) => {
    const raw = (p?.bild_url ?? '').trim();
    return raw ? raw.replace(/^\//, '') : PLACEHOLDER;
  };

  return { BASE, getProdukte, getVereine, verlosungEmailExists, saveVerlosung, vereinOf, bildUrl, PLACEHOLDER };
})();
