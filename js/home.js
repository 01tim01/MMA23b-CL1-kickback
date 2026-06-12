/* ============================================================================
   KICKBACK – home.js  (Startseite: Hero-Slider aus der Datenbank)
   ----------------------------------------------------------------------------
   Früher standen die Trikot-Slides fest im HTML. Jetzt kommen sie – wie die
   Produktkarten im Shop – dynamisch aus der M290-Datenbank: ein Slide pro
   Verein aus der Kategorie "Aktuelle Trikots". Ändert sich die DB, ändert
   sich auch der Slider.

   Ablauf:
     1) Produkte über KickbackAPI laden (Fallback: eingebettete Demo-Slides)
     2) Pro Verein genau einen Slide bauen (max. 6)
     3) Erst DANACH die Slider-Steuerung initialisieren (Pfeile, Progress,
        Auto-Advance) – vorher gibt es ja noch keine Slides.
   ============================================================================ */

(() => {
  'use strict';

  const slider = document.querySelector('[data-slider]');
  if (!slider) return;                       // läuft nur auf der Startseite
  const track = slider.querySelector('.slider-track');

  /* ---- Demo-Fallback (falls die API nicht erreichbar ist) ---------------- */
  const DEMO_SLIDES = [
    { name: 'FC Barcelona',       liga: 'La Liga',        saison: '24/25', img: 'img/barca.jpeg' },
    { name: 'FC Liverpool',       liga: 'Premier League', saison: '24/25', img: 'img/liverpool.jpeg' },
    { name: 'FC Bayern München',  liga: 'Bundesliga',     saison: '24/25', img: 'img/bayern.jpeg' },
    { name: 'Real Madrid',        liga: 'La Liga',        saison: '24/25', img: 'img/real.jpeg' },
    { name: 'Paris Saint-Germain',liga: 'Ligue 1',        saison: '24/25', img: 'img/psg.jpeg' },
    { name: 'Borussia Dortmund',  liga: 'Bundesliga',     saison: '24/25', img: 'img/dortmund.jpeg' }
  ];

  /* ---- Slides bauen ------------------------------------------------------ */

  // Aus den Produkt-Datensätzen pro Verein EINEN Slide ableiten
  // (nur aktuelle Trikots; die Grössen-Varianten interessieren hier nicht).
  const toSlides = (produkte) => {
    const seen = new Set();
    const slides = [];
    for (const p of produkte) {
      if ((p.kategorie ?? '') !== 'Aktuelle Trikots') continue;
      const v = KickbackAPI.vereinOf(p);
      if (!v || seen.has(v.vereins_id)) continue;
      seen.add(v.vereins_id);
      slides.push({ name: v.name, liga: v.liga ?? '', saison: p.saison ?? '', img: KickbackAPI.bildUrl(p) });
      if (slides.length >= 6) break;
    }
    return slides;
  };

  const render = (slides) => {
    track.innerHTML = slides.map(s => `
      <article class="slide" aria-roledescription="slide" aria-label="${s.name} ${s.saison}">
        <img src="${s.img}" alt="${s.name} Trikot" loading="lazy"
             onerror="this.src='${KickbackAPI.PLACEHOLDER}'" />
        <div class="slide-caption">
          <h3>${s.name}</h3>
          <span class="slide-tag">${s.liga || 'Saison ' + s.saison}</span>
        </div>
      </article>`).join('');
  };

  /* ---- Slider-Steuerung (Pfeile, Fortschritt, Auto-Advance) -------------- */
  const initControls = () => {
    const slides   = [...track.children];
    const prevBtn  = slider.querySelector('[data-slider-prev]');
    const nextBtn  = slider.querySelector('[data-slider-next]');
    const progress = slider.querySelector('.slider-progress');

    // Fortschritt: gescrollter Anteil (0…100%) → CSS-Variable --p
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const pct = max > 0 ? (track.scrollLeft / max) * 100 : 100;
      if (progress) progress.style.setProperty('--p', pct + '%');
    };

    // Um genau eine Slide-Breite (+14px Lücke) weiterscrollen
    const stepBy = (dir) => {
      if (!slides.length) return;
      const slideW = slides[0].getBoundingClientRect().width + 14;
      track.scrollBy({ left: dir * slideW, behavior: 'smooth' });
    };

    prevBtn?.addEventListener('click', () => stepBy(-1));
    nextBtn?.addEventListener('click', () => stepBy(+1));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Automatisch alle 6s weiter; bei Maus-Hover pausieren
    let timer = setInterval(() => stepBy(+1), 6000);
    slider.addEventListener('mouseenter', () => clearInterval(timer));
    slider.addEventListener('mouseleave', () => timer = setInterval(() => stepBy(+1), 6000));
  };

  /* ---- Initialisierung ---------------------------------------------------- */
  (async () => {
    let slides = DEMO_SLIDES;
    try {
      const fromDb = toSlides(await KickbackAPI.getProdukte());
      if (fromDb.length) slides = fromDb;
    } catch (err) {
      console.warn('[Kickback] API nicht erreichbar – Slider nutzt Demo-Daten:', err.message);
    }
    render(slides);
    initControls();
  })();
})();
