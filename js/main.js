/* ============================================================================
   KICKBACK – main.js
   ----------------------------------------------------------------------------
   Wird auf ALLEN Seiten geladen (gemeinsame Funktionen). Jeder Block prüft
   zuerst, ob seine HTML-Elemente überhaupt existieren – so läuft dieselbe
   Datei fehlerfrei auf Home, Shop und Promotion, obwohl nicht jede Seite
   jeden Teil hat (z. B. gibt es den Slider nur auf der Home).

   Inhalt:
     1) Mobile Navigation (Burger-Menü)
     2) Hero-Slider (nur Home)
     3) Scroll-Reveal-Animationen
     4) Jahreszahl im Footer automatisch setzen
   ============================================================================ */

(() => {
  'use strict';

  /* -------- 1) Mobile Navigation ----------------------------------------- *
   * Der Burger-Button blendet das Vollbild-Menü (.mobile-nav) ein/aus.
   * `classList.toggle` gibt true/false zurück (ist die Klasse jetzt gesetzt?),
   * das nutzen wir gleich für Button-Status und aria-expanded.             */
  const burger = document.querySelector('.burger');
  const drawer = document.querySelector('.mobile-nav');

  if (burger && drawer) {                 // nur ausführen, wenn beide Elemente da sind
    burger.addEventListener('click', () => {
      const open = drawer.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);          // Burger → "X" animieren
      burger.setAttribute('aria-expanded', String(open)); // Barrierefreiheit
      document.body.style.overflow = open ? 'hidden' : ''; // Hintergrund-Scroll sperren
    });

    // Menü schliessen, sobald ein Link angeklickt wird
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        drawer.classList.remove('is-open');
        burger.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });

    // Menü mit der ESC-Taste schliessen
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        burger.click();                   // löst denselben Toggle-Code wie oben aus
      }
    });
  }

  /* -------- 2) Hero-Slider (nur Home) ------------------------------------ *
   * Der Slider ist eine horizontal scrollbare Leiste (CSS: scroll-snap).
   * JS ergänzt: Pfeil-Buttons, eine Fortschrittsanzeige und Auto-Weiterlauf. */
  const slider = document.querySelector('[data-slider]');
  if (slider) {
    const track    = slider.querySelector('.slider-track');
    const slides   = [...track.children];   // NodeList → echtes Array
    const prevBtn  = slider.querySelector('[data-slider-prev]');
    const nextBtn  = slider.querySelector('[data-slider-next]');
    const progress = slider.querySelector('.slider-progress');

    // update(): rechnet aus, wie weit (in %) bereits gescrollt wurde, und
    // gibt den Wert per CSS-Variable --p an die Fortschrittsanzeige weiter.
    //   scrollWidth - clientWidth = maximal scrollbare Strecke
    //   scrollLeft / max          = aktueller Anteil (0…1)
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const pct = max > 0 ? (track.scrollLeft / max) * 100 : 100;
      if (progress) progress.style.setProperty('--p', pct + '%');
    };

    // stepBy(): um genau eine Slide-Breite (+14px Lücke) nach links/rechts
    // scrollen. `dir` ist -1 (zurück) oder +1 (vor).
    const stepBy = (dir) => {
      const slideW = slides[0].getBoundingClientRect().width + 14;
      track.scrollBy({ left: dir * slideW, behavior: 'smooth' });
    };

    prevBtn?.addEventListener('click', () => stepBy(-1));
    nextBtn?.addEventListener('click', () => stepBy(+1));
    track.addEventListener('scroll', update, { passive: true }); // auch bei Maus/Wisch aktualisieren
    window.addEventListener('resize', update);
    update();

    // Automatisch alle 6s weiter; bei Maus-Hover pausieren (nicht stören).
    let timer = setInterval(() => stepBy(+1), 6000);
    slider.addEventListener('mouseenter', () => clearInterval(timer));
    slider.addEventListener('mouseleave', () => timer = setInterval(() => stepBy(+1), 6000));
  }

  /* -------- 3) Scroll-Reveal-Animation ----------------------------------- *
   * Elemente mit der Klasse .reveal starten unsichtbar (CSS) und sollen
   * sanft einblenden, sobald sie in den sichtbaren Bereich scrollen.
   * Der IntersectionObserver meldet genau das – effizienter als ein
   * scroll-Event, weil der Browser die Sichtbarkeit selbst überwacht.      */
  const targets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && targets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {            // Element ist sichtbar geworden
          e.target.classList.add('is-in'); // CSS blendet es ein
          io.unobserve(e.target);          // einmal reicht → nicht mehr beobachten
        }
      });
      // WICHTIG (Mobile-Bug): NICHT auf eine Sichtbarkeits-Quote (z. B. 12%)
      // prüfen. Sehr hohe Elemente – etwa das einspaltige Produkt-Grid auf dem
      // Handy (mehrere tausend Pixel) – passen nie zu 12% in den Viewport und
      // würden sonst dauerhaft unsichtbar (opacity:0) bleiben. threshold:0 löst
      // aus, sobald das Element überhaupt in den Viewport ragt; rootMargin
      // zieht die untere Kante etwas hoch, damit es kurz NACH dem Eintreten
      // sanft einblendet.
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    targets.forEach(t => io.observe(t));
  } else {
    // Fallback für sehr alte Browser: sofort alles anzeigen
    targets.forEach(t => t.classList.add('is-in'));
  }

  /* -------- 4) Jahreszahl im Footer -------------------------------------- *
   * Setzt automatisch das aktuelle Jahr (z. B. © 2026), damit es nie veraltet. */
  const y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
