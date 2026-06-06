# Kickback — M291 Projektaufgabe 2

Online-Shop für Fussballtrikots. Drei responsive Web-Pages mit fünf
interaktiven Elementen, angebunden an die M290-Datenbank.

## Struktur

```
abgabe/
├── index.html          Page 1 — Home / Start
├── shop.html           Page 2 — Sortiment (DB-Anbindung)
├── promotion.html      Page 3 — Promotion (Form + Game + FAQ)
├── css/styles.css      Globales Design-System
├── js/
│   ├── main.js         Header-Drawer · Hero-Slider · Reveal-Animationen
│   ├── shop.js         Filter, Suche, Produkt-Grid (php-crud-api + Fallback)
│   └── promotion.js    Verlosungs-Form, Striker-Run-Canvas-Game, FAQ-Accordion
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

Wenn die API nicht läuft, fallen Shop und Form auf eingebettete Demo-Daten
zurück — die Seiten bleiben jederzeit funktionsfähig.

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
