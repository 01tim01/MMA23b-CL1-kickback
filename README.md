# Kickback — M291 Projektaufgabe 2

Online-Shop für Fussballtrikots. Drei responsive Web-Pages mit fünf
interaktiven Elementen, angebunden an die M290-Datenbank.

## Struktur

```
abgabe/
├── index.html          Page 1 — Home / Start
├── shop.html           Page 2 — Sortiment (DB-Anbindung)
├── promotion.html      Page 3 — Promotion (Form + Game + FAQ)
├── css/styles.css      Globales Design-System (inkl. dunkle Section-Varianten)
├── js/                 logisch aufgeteilt: API · Products · Forms · Validation · UI
│   ├── api.js          API-Schicht: einzige Stelle mit DB-/Endpunkt-Wissen
│   ├── home.js         Products: Hero-Slider der Startseite aus der DB
│   ├── shop.js         Products: Filter, Suche, Produkt-Grid (DB + Fallback)
│   ├── promotion.js    Forms: Verlosungs-Formular (speichert in DB), FAQ
│   ├── validation.js   Validation: JS-Formularvalidierung (novalidate)
│   ├── main.js         UI: Header-Drawer · Reveal-Animationen · Footer-Jahr
│   ├── cart.js         UI: Warenkorb (localStorage)
│   └── jersey-runner.js  Promo-Game
├── img/                Logo + Vereins-Trikots
├── db/init.sql         Datenbank-Schema + Seeds (M290 + verlosung)
├── wireframes/
│   ├── index.html      Alle 6 Low-Fidelity Wireframes (3 × Mobile/Desktop)
│   ├── notation.html   Notations-Legende
│   └── wireframes.css
├── Dokumentation/
│   └── Dokumentation_M291_Kickback.docx   Abgabedokument (Projektaufgabe 7)
└── docker-compose.yml  MariaDB + php-crud-api + Nginx
```

## Starten

```bash
cd abgabe
docker-compose up -d            # DB (3307) · API (8081) · Web (8080)
open http://localhost:8080      # Webseite
open http://localhost:8081/records/produkt   # API-Check
```

Die Datenbank ist die M290-Datenbank: `db/init.sql` enthält das komplette
M290-Schema (verein, produkt, kunden, bestellung, spende …) plus die
M291-Tabelle `verlosung` und wird beim ersten Start automatisch eingespielt.
Daten ändern → `docker exec -it kickback-db mariadb -ukickback -pkickback kickback`
(oder Port 3307 mit einem DB-Tool) — Änderungen sind sofort auf der Website
sichtbar, da alles per fetch() aus der API kommt.

Ohne Docker (z. B. zum schnellen Testen): `node ../test-server/mock-api.mjs`
startet Web (8080) + eine php-crud-api-kompatible Mock-API (8081) mit den
Daten aus `db/init.sql`.

Wenn gar keine API läuft, fallen Shop, Slider und Formular-Dropdown auf
eingebettete Demo-Daten zurück (mit sichtbarem Hinweis im Shop) — die Seiten
bleiben jederzeit funktionsfähig. Das Formular meldet dann ehrlich einen
Fehler statt eines vorgetäuschten Erfolgs.

## 5 Interaktive Elemente

| # | Element             | Wo                          | Technik                         |
|---|---------------------|-----------------------------|--------------------------------|
| 1 | Navigation          | Header (alle Pages)         | Burger-Drawer, Hover-Underline |
| 2 | Hero-Slider         | Home                        | Scroll-Snap + Auto-Advance     |
| 3 | Filter & Suche      | Shop                        | Live-Filter mit URL-Params     |
| 4 | Verlosungs-Formular | Promotion (DB-Anbindung)    | JS-Validierung + POST          |
| 5 | Striker-Run-Game    | Promotion                   | Canvas, T-Rex-artiger Runner   |

Bonus: FAQ-Accordion (Single-Open), Marquee-Ticker, Scroll-Reveal-Animationen.

**Formular-Zusatzaufgaben:** interaktive Fehlermeldungen (Live-Validierung),
Lade-Spinner während des Speicherns, E-Mail-Dublettenprüfung gegen die DB.

**Hinweis API:** Es wird das Image `mevdschee/php-crud-api` verwendet
(Konfiguration über `PHP_CRUD_API_*`-Umgebungsvariablen in der
docker-compose.yml). Lokal getestet: Produkte laden, Formular speichert in die
Tabelle `verlosung`, Dublettenprüfung und CORS funktionieren.

## Design-System

- **Display-Schrift**: Anton (bold, condensed, sportlich)
- **Body-Schrift**: DM Sans
- **Farben**: Off-white `#F4F1EB` · Near-black `#0A0A0A` · Electric-Green `#C6FF3D`
- **Layout**: Mobile-First, Breakpoints 500 / 760 / 880 / 1100 / 1200 px
- **Inspiration**: Editorial Sport-Magazine (siehe Mockups ZONIXX/Fury Flow)
