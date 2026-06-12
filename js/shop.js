/* ============================================================================
   KICKBACK – shop.js
   ----------------------------------------------------------------------------
   Steuert die Sortiment-Seite (shop.html). Ebenfalls ein "Code Highlight"
   fürs Fachgespräch, darum ausführlich kommentiert.

   Was die Datei macht:
     - Produkte über die zentrale API-Schicht laden (js/api.js → KickbackAPI;
       Tabelle 'produkt' mit JOIN auf 'verein', damit Vereinsname & Liga
       gleich mitkommen)
     - Live-Suche über ein Textfeld
     - Filter nach Liga / Saison / Kategorie (Dropdowns)
     - Deep-Linking: Filter lassen sich per URL vorbelegen (z. B. aus der Home)
     - Fallback auf eingebettete Demo-Daten + sichtbarer Hinweis, falls die
       API nicht läuft
   ============================================================================ */

(() => {
  'use strict';

  /* -------- DOM-Referenzen ---------------------------------------------- */
  const grid          = document.getElementById('product-grid');
  const search        = document.getElementById('search');
  const filterLiga    = document.getElementById('filterLiga');
  const filterSaison  = document.getElementById('filterSaison');
  const filterKat     = document.getElementById('filterKategorie');
  const resetBtn      = document.getElementById('reset');
  const countEl       = document.getElementById('count');
  const activeEl      = document.getElementById('active-filters');
  const eyebrowEl     = document.getElementById('shop-eyebrow');
  const noticeEl      = document.getElementById('api-notice');

  /* -------- State -------------------------------------------------------- *
   * `all`  = alle geladenen Produkte (Originaldaten, werden nie verändert)
   * `view` = aktuell sichtbare Produkte (nach Filter/Suche)                 */
  let all = [];
  let view = [];

  /* -------- Hilfsfunktionen ---------------------------------------------- */

  // Preis als Schweizer Franken formatieren (z. B. 119.9 → "CHF 119.90")
  const fmtCHF = (val) => {
    const n = Number(val);
    if (Number.isNaN(n)) return val ?? '';
    return n.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' });
  };

  // Verein aus dem Produkt-Datensatz holen (Format-Wissen liegt in api.js).
  const getVerein = KickbackAPI.vereinOf;

  // Aus einer Werteliste eine alphabetisch sortierte Liste OHNE Duplikate
  // und ohne Leerwerte bauen – für die Dropdown-Optionen.
  const uniqueSorted = (arr) =>
    [...new Set(arr.map(v => (v ?? '').toString().trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'de'));   // 'de' = korrekte Umlaut-Sortierung

  // Ein <select> mit Optionen füllen, dabei die aktuelle Auswahl behalten.
  const fillSelect = (el, values, label) => {
    const current = el.value;
    el.innerHTML = `<option value="">${label}</option>`;
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      el.appendChild(opt);
    });
    el.value = current;
  };

  // Doppelte Trikot-Varianten ausblenden: In der DB liegt pro Grösse (S/M/L…)
  // ein eigener Datensatz. Im Shop zeigen wir aber nur EINE Kachel pro
  // Verein+Saison+Typ+Kategorie (die Grössenwahl käme erst auf einer Detailseite).
  const stripDup = (arr) => {
    const seen = new Set();
    return arr.filter(p => {
      const v = getVerein(p);
      const key = [v?.vereins_id, p.saison, p.trikot_typ, p.kategorie].join('|');
      if (seen.has(key)) return false;   // Schlüssel schon gesehen → überspringen
      seen.add(key);
      return true;
    });
  };

  /* -------- Filtern & Anzeigen ------------------------------------------ */

  // applyFilters(): wendet Suchtext + alle Dropdowns auf `all` an → `view`.
  const applyFilters = () => {
    const q      = search.value.trim().toLowerCase();
    const liga   = filterLiga.value;
    const saison = filterSaison.value;
    const kat    = filterKat.value;

    view = all.filter(p => {
      const v = getVerein(p);
      const lig = (v?.liga ?? '').toString();

      // "Heuhaufen" aus allen durchsuchbaren Feldern bauen → Volltextsuche
      const hay = [
        p.titel, p.beschreibung, p.saison, p.groesse, p.kategorie,
        p.unterkategorie, p.marke, p.trikot_typ, v?.name, lig
      ].map(x => (x ?? '').toString()).join(' ').toLowerCase();

      // Jede gesetzte Bedingung muss zutreffen, sonst fällt das Produkt raus:
      if (q && !hay.includes(q))                       return false; // Suchtext
      if (liga   && lig !== liga)                      return false; // Liga
      if (saison && (p.saison ?? '').toString() !== saison) return false; // Saison
      if (kat    && (p.kategorie ?? '').toString() !== kat) return false; // Kategorie
      return true;
    });

    view = stripDup(view);   // Grössen-Duplikate entfernen
    render();
    updateMeta();
  };

  // render(): baut aus `view` das HTML der Produktkacheln (Template-Strings).
  const render = () => {
    // Sonderfall: keine Treffer → freundliche Leer-Ansicht
    if (!view.length) {
      grid.innerHTML = `
        <div class="product-empty">
          <div class="head-row">
            <span class="star">✱</span>
            <span class="eyebrow">Keine Treffer</span>
          </div>
          <h3 class="h-l" style="margin-bottom:.5rem">Versuch's nochmal.</h3>
          <p class="muted">Reduziere die Filter oder klicke auf Reset.</p>
        </div>`;
      return;
    }

    // Für jedes Produkt eine <article>-Kachel erzeugen und zusammenfügen
    grid.innerHTML = view.map(p => {
      const v = getVerein(p);
      const isRetro = (p.kategorie ?? '').includes('Retro');
      // Bild aus der DB (normalisiert), sonst Platzhalter
      const img = KickbackAPI.bildUrl(p);
      return `
        <article class="product reveal">
          <div class="img-wrap">
            <span class="badge ${isRetro ? 'retro' : ''}">${isRetro ? 'Retro' : 'Saison ' + (p.saison ?? '')}</span>
            <img src="${img}" alt="${(v?.name ?? p.titel ?? 'Trikot')}" loading="lazy"
                 onerror="this.src='${KickbackAPI.PLACEHOLDER}'">
          </div>
          <div class="product-body">
            <div class="meta">
              ${v?.liga ? `<span>${v.liga}</span>` : ''}
              ${p.marke ? `<span>· ${p.marke}</span>` : ''}
            </div>
            <h3>${v?.name ?? p.titel ?? 'Trikot'}</h3>
            <div class="meta">
              <span>${p.trikot_typ ?? '—'}</span>
              <span>· ${p.saison ?? '—'}</span>
              <span>· ${p.farbe ?? '—'}</span>
            </div>
            <div class="footer-row">
              <span class="price">${fmtCHF(p.preis)}</span>
              <button class="add"
                      data-title="${(v?.name ?? p.titel ?? 'Trikot')}${isRetro ? ' · Retro' : ' · Saison ' + (p.saison ?? '')}"
                      data-price="${p.preis}"
                      data-img="${img}"
                      aria-label="In den Warenkorb" title="In den Warenkorb">+</button>
            </div>
          </div>
        </article>`;
    }).join('');

    // Neu erzeugte Kacheln sofort sichtbar machen (Reveal-Animation überspringen)
    document.querySelectorAll('.product.reveal').forEach(el => el.classList.add('is-in'));
  };

  // updateMeta(): Trefferzahl + Liste der aktiven Filter über dem Grid anzeigen
  const updateMeta = () => {
    countEl.textContent = `${view.length} Treffer`;
    const parts = [];
    if (filterLiga.value)   parts.push(filterLiga.value);
    if (filterSaison.value) parts.push('Saison ' + filterSaison.value);
    if (filterKat.value)    parts.push(filterKat.value);
    if (search.value)       parts.push(`„${search.value}"`);
    activeEl.textContent = parts.length ? '· ' + parts.join(' / ') : '';
  };

  /* -------- URL-Parameter (Deep-Linking von der Startseite) ------------- *
   * Links wie shop.html?kat=Retro%20Trikots öffnen den Shop direkt gefiltert.
   * Wir lesen die Parameter aus und setzen die passenden Felder vor.       */
  const applyUrlParams = () => {
    const params = new URLSearchParams(location.search);
    if (params.has('liga'))   filterLiga.value   = params.get('liga');
    if (params.has('saison')) filterSaison.value = params.get('saison');
    if (params.has('kat'))    filterKat.value    = params.get('kat');
    if (params.has('q'))      search.value       = params.get('q');
  };

  /* -------- Demo-Fallback (falls API offline) --------------------------- *
   * Damit der Shop auch ohne laufenden Docker-Container etwas anzeigt,
   * halten wir hier eine kleine Produktliste im gleichen Format wie die API
   * bereit (Verein als verschachteltes Objekt unter `vereins_id`).         */
  const DEMO = [
    { titel:'FC Barcelona Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Blau/Rot', preis:119.90, kategorie:'Aktuelle Trikots', marke:'Nike', bild_url:'img/barca.jpeg', vereins_id:{ vereins_id:1, name:'FC Barcelona', liga:'La Liga' } },
    { titel:'Real Madrid Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Weiss', preis:119.90, kategorie:'Aktuelle Trikots', marke:'Adidas', bild_url:'img/real.jpeg', vereins_id:{ vereins_id:2, name:'Real Madrid', liga:'La Liga' } },
    { titel:'Liverpool Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Rot', preis:114.90, kategorie:'Aktuelle Trikots', marke:'Nike', bild_url:'img/liverpool.jpeg', vereins_id:{ vereins_id:3, name:'FC Liverpool', liga:'Premier League' } },
    { titel:'Manchester City Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Hellblau', preis:119.90, kategorie:'Aktuelle Trikots', marke:'Puma', bild_url:'img/mancity.jpeg', vereins_id:{ vereins_id:4, name:'Manchester City', liga:'Premier League' } },
    { titel:'Bayern München Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Rot/Weiss', preis:119.90, kategorie:'Aktuelle Trikots', marke:'Adidas', bild_url:'img/bayern.jpeg', vereins_id:{ vereins_id:5, name:'FC Bayern München', liga:'Bundesliga' } },
    { titel:'Borussia Dortmund Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Gelb/Schwarz', preis:114.90, kategorie:'Aktuelle Trikots', marke:'Puma', bild_url:'img/dortmund.jpeg', vereins_id:{ vereins_id:6, name:'Borussia Dortmund', liga:'Bundesliga' } },
    { titel:'Juventus Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Schwarz/Weiss', preis:114.90, kategorie:'Aktuelle Trikots', marke:'Adidas', bild_url:'img/juventus.jpeg', vereins_id:{ vereins_id:7, name:'Juventus Turin', liga:'Serie A' } },
    { titel:'AC Mailand Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Rot/Schwarz', preis:114.90, kategorie:'Aktuelle Trikots', marke:'Puma', bild_url:'img/acmilan.jpeg', vereins_id:{ vereins_id:8, name:'AC Mailand', liga:'Serie A' } },
    { titel:'PSG Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Dunkelblau', preis:124.90, kategorie:'Aktuelle Trikots', marke:'Nike', bild_url:'img/psg.jpeg', vereins_id:{ vereins_id:9, name:'Paris Saint-Germain', liga:'Ligue 1' } },
    { titel:'Ajax Heimtrikot 24/25', saison:'24/25', trikot_typ:'Heim', farbe:'Weiss/Rot', preis:104.90, kategorie:'Aktuelle Trikots', marke:'Adidas', bild_url:'img/ajax.jpeg', vereins_id:{ vereins_id:10, name:'Ajax Amsterdam', liga:'Eredivisie' } },
    { titel:'FC Barcelona Retrotrikot 1999', saison:'1999', trikot_typ:'Heim', farbe:'Blau/Rot', preis:149.90, kategorie:'Retro Trikots', marke:'Nike', bild_url:'img/barca.jpeg', vereins_id:{ vereins_id:1, name:'FC Barcelona', liga:'La Liga' } },
    { titel:'Real Madrid Retrotrikot 2002', saison:'2002', trikot_typ:'Heim', farbe:'Weiss', preis:139.90, kategorie:'Retro Trikots', marke:'Adidas', bild_url:'img/real.jpeg', vereins_id:{ vereins_id:2, name:'Real Madrid', liga:'La Liga' } },
    { titel:'Liverpool Retrotrikot 2005', saison:'2005', trikot_typ:'Heim', farbe:'Rot', preis:129.90, kategorie:'Retro Trikots', marke:'Reebok', bild_url:'img/liverpool.jpeg', vereins_id:{ vereins_id:3, name:'FC Liverpool', liga:'Premier League' } },
    { titel:'Bayern München Retrotrikot 1997', saison:'1997', trikot_typ:'Heim', farbe:'Rot/Blau', preis:129.90, kategorie:'Retro Trikots', marke:'Adidas', bild_url:'img/bayern.jpeg', vereins_id:{ vereins_id:5, name:'FC Bayern München', liga:'Bundesliga' } },
    { titel:'BVB Retrotrikot 1996', saison:'1996', trikot_typ:'Heim', farbe:'Gelb/Schwarz', preis:119.90, kategorie:'Retro Trikots', marke:'Nike', bild_url:'img/dortmund.jpeg', vereins_id:{ vereins_id:6, name:'Borussia Dortmund', liga:'Bundesliga' } }
  ];

  /* -------- Initialisierung --------------------------------------------- *
   * Beim Laden der Seite: Produkte holen (oder Fallback), Dropdowns aus den
   * tatsächlich vorhandenen Werten befüllen, URL-Filter anwenden, anzeigen.  */
  const init = async () => {
    try {
      all = await KickbackAPI.getProdukte();
      if (!all.length) throw new Error('keine Datensätze');
    } catch (err) {
      // Kein Absturz, sondern sauberer Rückfall auf Demo-Daten – plus ein
      // sichtbarer Hinweis, damit klar ist, dass die DB gerade nicht antwortet.
      console.warn('[Kickback] API nicht erreichbar – nutze Demo-Daten:', err.message);
      all = DEMO;
      if (noticeEl) {
        noticeEl.hidden = false;
        noticeEl.textContent = '⚠ Datenbank nicht erreichbar – es werden Demo-Daten angezeigt.';
      }
    }

    // Im Seitentitel die echte Anzahl Trikot-Modelle anzeigen (statt einer
    // fix ins HTML geschriebenen Zahl): pro Verein+Saison+Typ ein Modell.
    if (eyebrowEl) eyebrowEl.textContent = `Sortiment · ${stripDup(all).length} Trikots`;

    // Dropdowns dynamisch aus den geladenen Daten befüllen
    fillSelect(filterLiga,   uniqueSorted(all.map(p => getVerein(p)?.liga)), 'Alle Ligen');
    fillSelect(filterSaison, uniqueSorted(all.map(p => p.saison)),           'Alle Saisons');
    fillSelect(filterKat,    uniqueSorted(all.map(p => p.kategorie)),        'Alle Kategorien');

    applyUrlParams();   // ggf. Filter aus der URL übernehmen
    applyFilters();     // erste Anzeige aufbauen
  };

  /* -------- Event-Listener ---------------------------------------------- *
   * Jede Eingabe/Änderung löst sofort eine Neufilterung aus → Live-Filter.  */
  search.addEventListener('input',        applyFilters);
  filterLiga.addEventListener('change',   applyFilters);
  filterSaison.addEventListener('change', applyFilters);
  filterKat.addEventListener('change',    applyFilters);

  // Reset: alle Felder leeren, URL säubern, neu anzeigen
  resetBtn.addEventListener('click', () => {
    search.value = '';
    filterLiga.value = '';
    filterSaison.value = '';
    filterKat.value = '';
    history.replaceState({}, '', location.pathname);  // ?-Parameter aus der URL entfernen
    applyFilters();
  });

  init();
})();
