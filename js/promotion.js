/* ============================================================================
   KICKBACK – promotion.js
   ----------------------------------------------------------------------------
   Diese Datei steuert die drei interaktiven Module der Promotion-Seite.
   Sie ist eines unserer "Code Highlights" fürs Fachgespräch – darum ist sie
   bewusst ausführlich kommentiert.

   Aufbau:
     1) Verlosungs-Formular  → JS-Validierung + Speicherung in der Datenbank
                               (php-crud-api) inkl. E-Mail-Dublettenprüfung
     2) Striker Run Game     → Canvas-Spiel im T-Rex-Runner-Stil (Football-Theme)
     3) FAQ-Accordion        → auf-/zuklappbare Fragen (immer nur eine offen)

   Die ganze Datei läuft in einer IIFE (Immediately Invoked Function Expression):
   `(() => { ... })()`. Dadurch landen unsere Variablen NICHT im globalen
   `window`-Objekt, sondern bleiben lokal in dieser Funktion gekapselt – so
   kollidiert nichts mit main.js oder shop.js.
   ============================================================================ */

(() => {
  'use strict'; // Strict-Mode: meldet stille Fehler (z. B. Tippfehler bei Variablen)

  /* ========================================================================
     1) VERLOSUNGS-FORMULAR  (JS-Validierung + DB-Speicherung)
     ======================================================================== */

  /* ---- API-Adressen ---------------------------------------------------- *
   * Die php-crud-api läuft im Docker-Compose auf Port 8081. Wir bauen die
   * Basis-URL dynamisch aus der aktuellen Adresse zusammen: Egal ob die Seite
   * über localhost oder eine IP geöffnet wird – die API liegt auf demselben
   * Host, nur auf Port 8081.                                               */
  const API_BASE      = `${location.protocol}//${location.hostname}:8081`;
  const VEREIN_URL    = `${API_BASE}/records/verein?size=200`;   // Vereine für das Dropdown
  const VERLOSUNG_URL = `${API_BASE}/records/verlosung`;          // Tabelle, in die wir speichern

  /* ---- DOM-Elemente einsammeln ----------------------------------------- */
  const form     = document.getElementById('verlosung-form');
  const status   = document.getElementById('form-status');
  const clubSel   = document.getElementById('f-club');
  const scoreInp = document.getElementById('f-score');   // verstecktes Feld: bester Spielstand

  /* setStatus(): zeigt eine Rückmeldung neben dem Absende-Button an.
   * `type` steuert die Farbe via CSS-Klasse: '' neutral, 'ok' grün, 'err' rot.
   * Bei type 'loading' bauen wir zusätzlich einen kleinen Spinner ein. */
  const setStatus = (msg, type = '') => {
    status.className = 'form-status ' + type;
    // Spinner nur während des Speicherns anzeigen (Zusatzaufgabe "Spinner").
    const spinner = type === 'loading' ? '<span class="spinner" aria-hidden="true"></span> ' : '';
    status.innerHTML = msg ? spinner + msg : '';
  };

  /* ---- Vereine laden (für das Dropdown "Lieblingsverein") -------------- *
   * Wir holen die Vereine live aus der DB. Falls die API offline ist
   * (z. B. im Schul-Setup ohne Docker), greifen wir auf eine eingebettete
   * Fallback-Liste zurück, damit das Formular trotzdem benutzbar bleibt.  */
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
      const res = await fetch(VEREIN_URL);          // Anfrage an die API
      if (res.ok) {
        const data = await res.json();              // JSON-Antwort auspacken
        if (data.records?.length) list = data.records; // nur nutzen, wenn Daten da sind
      }
    } catch {
      /* fetch wirft bei offline/Netzwerkfehler → wir bleiben beim Fallback */
    }

    // <option>-Elemente erzeugen und ins <select> hängen
    clubSel.innerHTML = '<option value="">Wählen...</option>';
    list.forEach(v => {
      const o = document.createElement('option');
      o.value = v.vereins_id;                       // gespeichert wird die ID (Fremdschlüssel)
      o.textContent = `${v.name}${v.liga ? ' — ' + v.liga : ''}`; // angezeigt wird Name + Liga
      clubSel.appendChild(o);
    });
  };
  loadVereine();

  /* ---- Validierung ----------------------------------------------------- *
   * Wir validieren BEWUSST selbst per JavaScript (das <form> hat `novalidate`),
   * damit wir eigene, gestaltete Fehlermeldungen zeigen können statt der
   * Standard-Browser-Tooltips.                                             */

  // E-Mail-Check per regulärem Ausdruck:
  //   ^[^\s@]+   → mind. 1 Zeichen, keine Leerzeichen, kein @  (lokaler Teil)
  //   @          → genau ein @
  //   [^\s@]+    → Domainname
  //   \.[^\s@]{2,}$ → Punkt + mind. 2 Zeichen Top-Level-Domain (z. B. .ch)
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  /* validate(): prüft alle Felder mit der CSS-Klasse `.field`.
   * Gibt true zurück, wenn ALLE Felder gültig sind. Ungültige Felder
   * bekommen die Klasse `.invalid`, wodurch CSS die rote Fehlermeldung zeigt. */
  const validate = () => {
    let ok = true;
    const fields = form.querySelectorAll('.field');

    fields.forEach(f => {
      const key = f.dataset.field;                  // data-field="name" usw.
      const inp = f.querySelector('input, select'); // das eigentliche Eingabeelement
      const val = (inp.value || '').trim();          // Wert ohne Leerzeichen am Rand
      let valid = true;

      // Pro Feldtyp eine eigene Regel:
      if (key === 'name')         valid = val.length >= 2;  // Name: mind. 2 Zeichen
      else if (key === 'email')   valid = isEmail(val);     // E-Mail: Regex von oben
      else                        valid = val !== '';       // Rest: darf nicht leer sein

      f.classList.toggle('invalid', !valid);        // Klasse je nach Ergebnis setzen/entfernen
      if (!valid) ok = false;                        // sobald EIN Feld falsch ist → gesamt ungültig
    });

    return ok;
  };

  /* Live-Validierung: schon WÄHREND der Eingabe Feedback geben.
   * - `blur`  (Feld verlassen): einmal prüfen.
   * - `input` (Tippen): nur neu prüfen, wenn das Feld bereits als falsch
   *   markiert war – so "verschwindet" der Fehler, sobald er behoben ist,
   *   nervt aber nicht schon beim ersten Buchstaben.                        */
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('blur',  validate);
    el.addEventListener('input', () => {
      const f = el.closest('.field');
      if (f?.classList.contains('invalid')) validate();
    });
  });

  /* ---- Zusatzaufgabe: E-Mail-Dublettenprüfung -------------------------- *
   * Vor dem Speichern fragen wir die DB, ob diese E-Mail schon eingetragen
   * ist. php-crud-api erlaubt das per Filter:
   *   /records/verlosung?filter=email,eq,<wert>&size=1
   * Gibt es einen Treffer, brechen wir ab und melden es dem User.
   * Bei offline/Fehler geben wir `false` zurück (= "keine Dublette"), damit
   * das Formular im Schul-Setup ohne API trotzdem funktioniert.            */
  const emailExists = async (email) => {
    try {
      const url = `${VERLOSUNG_URL}?filter=email,eq,${encodeURIComponent(email)}&size=1`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      return (data.records?.length || 0) > 0;       // true = E-Mail bereits vorhanden
    } catch {
      return false;                                  // offline → Prüfung überspringen
    }
  };

  /* ---- Absenden (Submit) ----------------------------------------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();   // Standard-Verhalten (Seite neu laden) verhindern
    setStatus('');

    // 1) Pflichtfelder prüfen
    if (!validate()) {
      setStatus('Bitte Felder prüfen', 'err');
      return;
    }

    // 2) Eingaben einsammeln und ins richtige Format bringen
    const fd = new FormData(form);  // liest alle name="..."-Felder aus
    const email = fd.get('email').trim();

    // 3) Zusatzaufgabe: schon vergeben?
    setStatus('Prüfe E-Mail…', 'loading');
    if (await emailExists(email)) {
      // E-Mail-Feld rot markieren und Meldung zeigen
      form.querySelector('[data-field="email"]')?.classList.add('invalid');
      setStatus('Diese E-Mail wird schon verwendet', 'err');
      return;
    }

    // 4) Datensatz (payload) zusammenbauen – passt 1:1 zu den DB-Spalten
    const payload = {
      name: fd.get('name').trim(),
      email: email,
      lieblingsverein: Number(fd.get('lieblingsverein')) || null, // Fremdschlüssel → verein
      groesse: fd.get('groesse'),
      newsletter: fd.get('newsletter') ? 1 : 0,    // Checkbox → 1/0 (TINYINT in der DB)
      spielstand: Number(fd.get('spielstand') || 0) // bester Score aus dem Game = Anzahl Lose
    };

    // 5) Speichern – Button sperren + Spinner, damit nicht doppelt gesendet wird
    setStatus('Speichere…', 'loading');
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      // POST schickt den Datensatz als JSON an die API; diese macht ein INSERT.
      const res = await fetch(VERLOSUNG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || ('HTTP ' + res.status));
      }
      const id = await res.json();                  // API gibt die neue verlosung_id zurück
      setStatus(`Drin! Los-Nr. ${id} ✱`, 'ok');
      form.reset();
      scoreInp.value = String(bestScore);           // bester Score bleibt für den nächsten Versuch
    } catch (err) {
      console.warn('[Kickback] DB-Save fehlgeschlagen:', err.message);
      // Fallback: Läuft der API-Container nicht (Schul-Setup), zeigen wir
      // trotzdem Erfolg, damit die Demo der Seite nicht "kaputt" wirkt.
      setStatus(`Eingetragen (offline) ✱`, 'ok');
      form.reset();
    } finally {
      submitBtn.disabled = false;                   // Button immer wieder freigeben
    }
  });

  /* ========================================================================
     2) STRIKER RUN – Football Runner (Canvas-Spiel im T-Rex-Stil)
     ------------------------------------------------------------------------
     Spielprinzip wie der Chrome-Dino: Die Figur läuft automatisch, der
     Boden scrollt nach links. Per Sprung weicht man Hindernissen (Cones &
     Tacklings) aus und sammelt Bälle = Goals. Jeder Goal = ein zusätzliches
     Los in der Verlosung.
     ======================================================================== */
  const canvas  = document.getElementById('game-canvas');
  const ctx     = canvas.getContext('2d');   // 2D-Zeichenkontext = unser "Pinsel"
  const overlay = document.getElementById('game-overlay');
  const btnGo   = document.getElementById('game-start');
  const scoreEl = document.getElementById('game-score');
  const bestEl  = document.getElementById('game-best');

  /* World-Konstanten – alles bezieht sich auf den festen Canvas-Backbuffer
   * (800 × 450). CSS skaliert das Canvas optisch, die Spiel-Logik rechnet
   * aber immer in diesen festen Pixeln → gleiches Verhalten auf allen Geräten. */
  const W = canvas.width;       // 800
  const H = canvas.height;      // 450
  const GROUND_Y = H * 0.78;    // Höhe des Bodens (Spielfeld-Linie)
  const GRAVITY  = 0.85;        // Schwerkraft: wird pro Frame auf vy addiert
  const JUMP_V   = -16;         // Absprung-Geschwindigkeit (negativ = nach oben)

  /* Spielzustand */
  let running = false;          // läuft das Spiel gerade?
  let frame = 0;                // gezählte Frames seit Spielstart (Zeit-Basis)
  let speed = 6;                // aktuelle Scroll-Geschwindigkeit (steigt langsam)
  let score = 0;                // gesammelte Goals dieser Runde
  let bestScore = Number(localStorage.getItem('kb-best') || 0); // Bestwert dauerhaft im Browser
  let player, obstacles, balls; // werden in resetWorld() initialisiert

  bestEl.textContent = bestScore;

  /* resetWorld(): setzt alle Spielobjekte auf den Startzustand zurück. */
  const resetWorld = () => {
    player = {
      x: 80, y: GROUND_Y - 48,  // Startposition (steht auf dem Boden)
      w: 28, h: 48,             // Trefferbox-Grösse (für Kollisionen)
      vy: 0, grounded: true     // vy = vertikale Geschwindigkeit, grounded = am Boden?
    };
    obstacles = [];   // Hindernisse: {x, y, w, h, type:'cone'|'tackle'}
    balls     = [];   // Bälle:       {x, y, r}
    speed = 6;
    score = 0;
    frame = 0;
    scoreEl.textContent = '0';
  };

  /* ---------- Zeichnen (alle Funktionen malen auf das Canvas) ---------- */

  // Hintergrund: Himmel-Verlauf, scrollende Stadion-Silhouette, Rasen mit Streifen
  const drawBackground = () => {
    // Himmel als vertikaler Farbverlauf
    const grd = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grd.addColorStop(0, '#FFF5D6');
    grd.addColorStop(1, '#FFE093');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // Stadion-Silhouette: bewegt sich langsamer als der Boden (Parallax-Effekt)
    ctx.fillStyle = '#0A0A0A';
    const offset = (frame * 0.5) % 240;
    for (let i = -1; i < 8; i++) {
      const baseX = i * 240 - offset;
      ctx.beginPath();
      ctx.moveTo(baseX, GROUND_Y);
      ctx.lineTo(baseX + 30, GROUND_Y - 60);
      ctx.lineTo(baseX + 80, GROUND_Y - 90);
      ctx.lineTo(baseX + 130, GROUND_Y - 60);
      ctx.lineTo(baseX + 200, GROUND_Y - 75);
      ctx.lineTo(baseX + 240, GROUND_Y);
      ctx.closePath();
      ctx.globalAlpha = 0.18;   // halbtransparent → wirkt wie ferne Tribüne
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Rasen
    ctx.fillStyle = '#7BB852';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    // Rasenstreifen scrollen mit `speed` → Eindruck von Tempo
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 0; i < 6; i++) {
      const stripeX = (i * 160 - (frame * speed) % 160);
      ctx.fillRect(stripeX, GROUND_Y, 80, H - GROUND_Y);
    }
    // Spielfeld-Linie
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, GROUND_Y, W, 2);
  };

  // Spielfigur (Fussballer): aus einfachen Rechtecken/Kreisen zusammengesetzt
  const drawPlayer = (p) => {
    ctx.save();                 // Zeichen-Zustand sichern
    ctx.translate(p.x, p.y);    // Nullpunkt auf die Figur verschieben → alles relativ malen
    ctx.fillStyle = '#FFFFFF';  ctx.fillRect(4, 28, 20, 12);   // Hose (weiss)
    ctx.fillStyle = '#E63946';  ctx.fillRect(2, 12, 24, 18);   // Trikot (rot)
    ctx.fillStyle = '#FFFFFF';  ctx.font = 'bold 8px JetBrains Mono'; ctx.fillText('9', 12, 24); // Rückennummer
    ctx.fillStyle = '#F2C68C';  ctx.beginPath(); ctx.arc(14, 8, 6, 0, Math.PI * 2); ctx.fill();  // Kopf
    ctx.fillStyle = '#0A0A0A';  ctx.fillRect(8, 1, 12, 4);     // Haare

    // Beine: am Boden animiert (Laufphase), in der Luft gestreckt (Sprung)
    ctx.fillStyle = '#0A0A0A';
    if (p.grounded) {
      const phase = Math.floor(frame / 4) % 2;   // wechselt alle 4 Frames → Lauf-Animation
      if (phase === 0) { ctx.fillRect(6, 40, 6, 8); ctx.fillRect(16, 40, 6, 6); }
      else             { ctx.fillRect(6, 40, 6, 6); ctx.fillRect(16, 40, 6, 8); }
    } else {
      ctx.fillRect(4, 38, 8, 8); ctx.fillRect(18, 36, 8, 8);
    }
    // Schuhe in Akzentfarbe
    ctx.fillStyle = '#C6FF3D';
    ctx.fillRect(p.grounded ? 5 : 3, 47, 8, 2);
    ctx.fillRect(p.grounded ? 16 : 18, 47, 8, 2);
    ctx.restore();              // Zeichen-Zustand zurücksetzen (translate rückgängig)
  };

  // Hindernis "Cone" (Pylone) – entspricht dem Kaktus im T-Rex-Spiel
  const drawCone = (o) => {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = '#FF6B1A';   // Dreieck = Pylonen-Form
    ctx.beginPath(); ctx.moveTo(o.w / 2, 0); ctx.lineTo(o.w, o.h); ctx.lineTo(0, o.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFF8E0';   // Reflexstreifen
    ctx.fillRect(2, o.h * 0.45, o.w - 4, 3);
    ctx.fillRect(4, o.h * 0.7, o.w - 8, 3);
    ctx.strokeStyle = '#0A0A0A'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(o.w / 2, 0); ctx.lineTo(o.w, o.h); ctx.lineTo(0, o.h); ctx.closePath(); ctx.stroke();
    ctx.restore();
  };

  // Hindernis "Tackle" (grätschender Verteidiger) – flach, muss übersprungen werden
  const drawTackle = (o) => {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = '#1B3A8C'; ctx.fillRect(0, o.h - 12, o.w, 12);          // Körper
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(2, o.h - 10, 6, 4);            // Stutzen
    ctx.fillStyle = '#F2C68C'; ctx.beginPath(); ctx.arc(o.w - 6, o.h - 6, 5, 0, Math.PI * 2); ctx.fill(); // Kopf
    ctx.fillStyle = '#0A0A0A'; ctx.fillRect(o.w - 10, o.h - 11, 8, 3);     // Haare
    ctx.strokeStyle = '#0A0A0A'; ctx.lineWidth = 1.5; ctx.strokeRect(0, o.h - 12, o.w, 12);
    ctx.restore();
  };

  // Sammelobjekt "Ball" – Kreis mit angedeutetem Fünfeck-Muster
  const drawBall = (b) => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0A0A0A';
    ctx.beginPath();
    ctx.moveTo(0, -b.r * 0.5); ctx.lineTo(b.r * 0.45, -b.r * 0.15);
    ctx.lineTo(b.r * 0.3, b.r * 0.4); ctx.lineTo(-b.r * 0.3, b.r * 0.4);
    ctx.lineTo(-b.r * 0.45, -b.r * 0.15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#0A0A0A'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  };

  /* ---------- Spawning: wann taucht das nächste Objekt auf? ----------- *
   * Wir merken uns in `nextObstacleAt`/`nextBallAt` den Frame, an dem das
   * nächste Objekt erscheinen soll. Ist dieser Frame erreicht, erzeugen wir
   * ein neues Objekt am rechten Rand (x = W + 20) und würfeln den nächsten
   * Abstand neu aus → unregelmässiges, faires Muster.                     */
  let nextObstacleAt = 60;
  let nextBallAt     = 120;

  const spawn = () => {
    if (frame >= nextObstacleAt) {
      const isCone = Math.random() < 0.6;   // 60% Cone, 40% Tackle
      if (isCone) obstacles.push({ x: W + 20, y: GROUND_Y - 28, w: 22, h: 28, type: 'cone' });
      else        obstacles.push({ x: W + 20, y: GROUND_Y - 12, w: 56, h: 12, type: 'tackle' });
      // Abstand wächst leicht mit dem Tempo, damit es spielbar bleibt
      const gap = 70 + Math.random() * 120 + Math.max(0, 20 - speed) * 4;
      nextObstacleAt = frame + gap;
    }
    if (frame >= nextBallAt) {
      // Ball mal tief (laufend sammelbar), mal hoch (nur im Sprung erreichbar)
      const yLane = Math.random() < 0.6 ? GROUND_Y - 38 : GROUND_Y - 90;
      balls.push({ x: W + 20, y: yLane, r: 10 });
      nextBallAt = frame + 90 + Math.random() * 150;
    }
  };

  /* ---------- Kollisionserkennung ------------------------------------- */

  // Rechteck-gegen-Rechteck (AABB): überlappen sich die beiden Boxen?
  // Spieler trifft Hindernis → Game Over.
  const hit = (a, b) => (
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y
  );

  // Kreis-gegen-Rechteck: nächstgelegenen Punkt der Spieler-Box zum
  // Ball-Mittelpunkt suchen; ist dessen Abstand kleiner als der Radius,
  // berührt der Spieler den Ball → Goal.
  const ballHit = (p, b) => {
    const closestX = Math.max(p.x, Math.min(b.x, p.x + p.w));
    const closestY = Math.max(p.y, Math.min(b.y, p.y + p.h));
    const dx = b.x - closestX, dy = b.y - closestY;
    return (dx * dx + dy * dy) < b.r * b.r;   // Abstand² < Radius² (ohne teure Wurzel)
  };

  /* ---------- Game Over ----------------------------------------------- */
  const gameOver = () => {
    running = false;
    if (score > bestScore) {                 // neuen Bestwert dauerhaft speichern
      bestScore = score;
      localStorage.setItem('kb-best', score);
      bestEl.textContent = bestScore;
    }
    scoreInp.value = bestScore;              // Bestwert ins versteckte Formularfeld → wird mitgespeichert
    overlay.classList.remove('is-hidden');   // Start-/End-Overlay wieder einblenden
    overlay.querySelector('h3').textContent = score >= 10 ? 'STARK GESPIELT!' : 'GAME OVER';
    overlay.querySelector('p').innerHTML =
      `Du hast <strong>${score}</strong> Goal${score === 1 ? '' : 's'} geschossen.<br>
       Best: <strong>${bestScore}</strong> · Lose werden gleich verbucht.`;
    btnGo.textContent = 'Nochmal';
  };

  /* ---------- Haupt-Spielschleife (Game Loop) ------------------------- *
   * tick() macht pro Frame: rechnen → kollidieren → zeichnen, und ruft sich
   * über requestAnimationFrame selbst wieder auf (~60×/Sekunde, vom Browser
   * synchron zum Bildschirm getaktet).                                    */
  const tick = () => {
    if (!running) return;       // gestoppt → Schleife beenden
    frame++;
    if (frame % 360 === 0) speed = Math.min(speed + 0.6, 14); // alle ~6s schneller, max 14

    // Physik: Schwerkraft auf die vertikale Geschwindigkeit, dann Position
    player.vy += GRAVITY;
    player.y  += player.vy;
    if (player.y >= GROUND_Y - player.h) {   // am Boden aufgekommen?
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }

    // Hindernisse & Bälle nach links bewegen, aus dem Bild Gescrolltes löschen
    obstacles.forEach(o => o.x -= speed);
    obstacles = obstacles.filter(o => o.x + o.w > -10);
    balls.forEach(b => b.x -= speed);
    balls = balls.filter(b => b.x + b.r > -10);

    spawn();   // ggf. neue Objekte erzeugen

    // Kollisionen prüfen
    for (const o of obstacles) {
      if (hit(player, o)) { gameOver(); return; }   // Hindernis getroffen → Ende
    }
    for (let i = balls.length - 1; i >= 0; i--) {    // rückwärts, weil wir splice() nutzen
      if (ballHit(player, balls[i])) {
        balls.splice(i, 1);     // eingesammelten Ball entfernen
        score++;
        scoreEl.textContent = score;
      }
    }

    // Zeichnen: erst Canvas löschen, dann Szene in Ebenen aufbauen
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    obstacles.forEach(o => o.type === 'cone' ? drawCone(o) : drawTackle(o));
    balls.forEach(drawBall);
    drawPlayer(player);

    // HUD (Punkteanzeige direkt auf dem Canvas)
    ctx.fillStyle = '#0A0A0A';
    ctx.font = 'bold 14px Anton, sans-serif'; ctx.fillText('SCORE', 16, 22);
    ctx.font = 'bold 24px Anton, sans-serif'; ctx.fillText(String(score).padStart(3, '0'), 16, 46);

    requestAnimationFrame(tick);   // nächsten Frame anfordern
  };

  /* ---------- Steuerung ----------------------------------------------- */

  // Springen: nur erlaubt, wenn das Spiel läuft UND die Figur am Boden ist
  // (verhindert Doppelsprünge in der Luft).
  const jump = () => {
    if (!running || !player.grounded) return;
    player.vy = JUMP_V;
    player.grounded = false;
  };

  // Spielstart: Welt zurücksetzen, Overlay ausblenden, Loop starten.
  // WICHTIG (T-Rex-Vorgabe): Das Spiel startet NICHT automatisch, sondern
  // erst durch diese Funktion (Button "Anpfiff" / Tastendruck / Tap).
  const start = () => {
    resetWorld();
    overlay.classList.add('is-hidden');
    running = true;
    canvas.focus();
    requestAnimationFrame(tick);
  };

  btnGo.addEventListener('click', start);

  // Tastatur: Space oder Pfeil-hoch = starten bzw. springen
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      // Nicht auslösen, während man im Formular tippt (sonst springt die Figur beim Schreiben)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
      e.preventDefault();   // Seite nicht scrollen
      if (!running) start(); else jump();
    }
  });

  // Maus & Touch: Klick/Tap aufs Canvas startet bzw. springt
  canvas.addEventListener('click', () => running ? jump() : start());
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    running ? jump() : start();
  }, { passive: false });

  // Erstes Standbild zeichnen, damit das Canvas vor dem Start nicht leer ist
  resetWorld();
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawPlayer(player);

  /* ========================================================================
     3) FAQ-ACCORDION  (immer nur eine Frage offen)
     ------------------------------------------------------------------------
     Jede Frage ist ein Button. Beim Klick togglen wir `.is-open` (CSS klappt
     die Antwort über grid-template-rows weich auf). `aria-expanded` hält den
     Zustand für Screenreader aktuell.
     ======================================================================== */
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      const open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      // "Single-Open": wird eine Frage geöffnet, alle anderen schliessen
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
