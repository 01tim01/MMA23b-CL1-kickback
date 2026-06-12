/* ============================================================================
   KICKBACK – cart.js  (Warenkorb)
   ----------------------------------------------------------------------------
   Läuft auf allen Seiten. Der Warenkorb wird im localStorage des Browsers
   gespeichert, bleibt also beim Seitenwechsel erhalten.
   - "+" auf einer Produktkarte legt das Produkt in den Warenkorb
   - Header-Icon öffnet den Drawer (Anzahl als Badge)
   - Rabattcode "KICKBACK5" (aus dem Promo-Game) zieht 5% ab
   - "Zur Kasse" ist ein Demo-Checkout (keine echte Bezahlung)
   ============================================================================ */
(() => {
  'use strict';

  const KEY        = 'kickback-cart';       // localStorage-Schlüssel für die Artikel
  const DISC_KEY   = 'kickback-discount';   // gespeicherter, eingelöster Code
  const VALID_CODE = 'KICKBACK5';           // gültiger Rabattcode aus dem Game
  const RATE       = 0.05;                   // 5% Rabatt

  let justOrdered = false;                   // true direkt nach dem Demo-Checkout

  /* -------- Speicher-Helfer --------------------------------------------- */
  const read  = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const write = (items) => { localStorage.setItem(KEY, JSON.stringify(items)); renderAll(); };
  const fmt   = (v) => Number(v).toLocaleString('de-CH', { style: 'currency', currency: 'CHF' });

  /* -------- Berechnungen ------------------------------------------------ */
  const count        = () => read().reduce((s, i) => s + i.qty, 0);
  const subtotal     = () => read().reduce((s, i) => s + i.price * i.qty, 0);
  const hasDiscount  = () => localStorage.getItem(DISC_KEY) === VALID_CODE && read().length > 0;

  /* -------- Warenkorb verändern ----------------------------------------- */
  function add(item) {
    const items = read();
    const found = items.find(i => i.title === item.title);   // schon drin? → Menge erhöhen
    if (found) found.qty += 1;
    else items.push({ title: item.title, price: item.price, img: item.img, qty: 1 });
    justOrdered = false;
    write(items);
    open();   // Drawer öffnen, damit man die Aktion sieht
  }
  function changeQty(title, delta) {
    let items = read();
    const f = items.find(i => i.title === title);
    if (!f) return;
    f.qty += delta;
    if (f.qty <= 0) items = items.filter(i => i.title !== title);  // auf 0 → entfernen
    write(items);
  }
  function removeItem(title) { write(read().filter(i => i.title !== title)); }

  /* -------- Rabattcode -------------------------------------------------- */
  function applyCode() {
    const input = document.querySelector('[data-cart-code]');
    const msg   = document.querySelector('[data-cart-msg]');
    const code  = (input?.value || '').trim().toUpperCase();
    if (code === VALID_CODE) {
      localStorage.setItem(DISC_KEY, VALID_CODE);
      setMsg('Code aktiv, 5% Rabatt', 'ok');
    } else {
      localStorage.removeItem(DISC_KEY);
      setMsg('Ungültiger Code', 'err');
    }
    renderDrawer();
  }
  const setMsg = (text, type = '') => {
    const msg = document.querySelector('[data-cart-msg]');
    if (msg) { msg.textContent = text; msg.className = 'cart-msg ' + type; }
  };

  /* -------- Demo-Checkout ----------------------------------------------- */
  function checkout() {
    if (read().length === 0) { setMsg('Warenkorb ist leer', 'err'); return; }
    justOrdered = true;
    localStorage.removeItem(KEY);       // Bestellung "abgeschickt" → Korb leeren
    localStorage.removeItem(DISC_KEY);
    renderAll();
  }

  /* -------- Öffnen / Schliessen ---------------------------------------- */
  const drawer   = () => document.querySelector('[data-cart-drawer]');
  const backdrop = () => document.querySelector('[data-cart-backdrop]');
  function open()  {
    drawer()?.classList.add('is-open');
    backdrop()?.classList.add('is-open');
    drawer()?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderDrawer();
  }
  function close() {
    drawer()?.classList.remove('is-open');
    backdrop()?.classList.remove('is-open');
    drawer()?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    justOrdered = false;
  }

  /* -------- Anzeige ----------------------------------------------------- */
  // Badge mit Artikelanzahl (im Header, auf jeder Seite)
  function renderCount() {
    const c = count();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = c;
      el.classList.toggle('has-items', c > 0);
    });
  }

  // Inhalt des Drawers (Artikelliste + Summen)
  function renderDrawer() {
    const list = document.querySelector('[data-cart-items]');
    const foot = document.querySelector('[data-cart-foot]');
    if (!list) return;

    // Erfolgsmeldung direkt nach dem Checkout
    if (justOrdered) {
      list.innerHTML = `
        <div class="cart-done">
          <span class="star" aria-hidden="true">✱</span>
          <h3>Bestellung erfasst</h3>
          <p class="muted">Das ist eine Demo – es wird nichts verschickt und nichts belastet.</p>
        </div>`;
      if (foot) foot.hidden = true;
      return;
    }
    if (foot) foot.hidden = false;

    const items = read();
    if (!items.length) {
      list.innerHTML = `<p class="cart-empty">Dein Warenkorb ist leer.<br>Stöbere im Sortiment.</p>`;
    } else {
      list.innerHTML = items.map(i => `
        <div class="cart-item">
          <img src="${i.img || ''}" alt="" loading="lazy"
               onerror="this.src='https://placehold.co/120x120/ECE7DD/0A0A0A?text=KB'">
          <div>
            <div class="ci-title">${i.title}</div>
            <div class="ci-price">${fmt(i.price)}</div>
            <div class="ci-controls">
              <button data-ci-dec="${i.title}" aria-label="Weniger">−</button>
              <span class="ci-qty">${i.qty}</span>
              <button data-ci-inc="${i.title}" aria-label="Mehr">+</button>
            </div>
            <button class="ci-remove" data-ci-remove="${i.title}">entfernen</button>
          </div>
          <strong>${fmt(i.price * i.qty)}</strong>
        </div>`).join('');
    }

    // Summen
    const sub  = subtotal();
    const disc = hasDiscount() ? sub * RATE : 0;
    const set  = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    set('[data-cart-subtotal]', fmt(sub));
    set('[data-cart-total]', fmt(sub - disc));
    const discLine = document.querySelector('[data-cart-discount-line]');
    if (discLine) discLine.hidden = disc === 0;
    set('[data-cart-discount]', '– ' + fmt(disc));
  }

  function renderAll() { renderCount(); renderDrawer(); }

  /* -------- Events (zentral per Delegation) ----------------------------- */
  document.addEventListener('click', (e) => {
    // "+" auf einer Produktkarte (Shop) – Produktdaten stehen in data-Attributen
    const addBtn = e.target.closest('.add[data-title]');
    if (addBtn) {
      add({ title: addBtn.dataset.title, price: parseFloat(addBtn.dataset.price), img: addBtn.dataset.img });
      return;
    }
    if (e.target.closest('[data-cart-open]'))     { open();  return; }
    if (e.target.closest('[data-cart-close]') ||
        e.target.closest('[data-cart-backdrop]')) { close(); return; }

    const inc = e.target.closest('[data-ci-inc]');     if (inc) { changeQty(inc.dataset.ciInc, +1); return; }
    const dec = e.target.closest('[data-ci-dec]');     if (dec) { changeQty(dec.dataset.ciDec, -1); return; }
    const rm  = e.target.closest('[data-ci-remove]');  if (rm)  { removeItem(rm.dataset.ciRemove);  return; }
    if (e.target.closest('[data-cart-apply]'))    { applyCode(); return; }
    if (e.target.closest('[data-cart-checkout]')) { checkout();  return; }
  });

  // ESC schliesst den Drawer
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  renderAll();   // beim Laden: Badge (und Drawer, falls offen) aufbauen
})();
