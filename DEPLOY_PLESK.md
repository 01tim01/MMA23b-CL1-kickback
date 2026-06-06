# Kickback – Deployment auf Plesk

Anleitung, um die Website **mit echter Datenbank** auf dem Schul-Plesk-Server
zu veröffentlichen. Ergebnis: ein Link, unter dem der Shop echte Produkte
zeigt und das Verlosungs-Formular wirklich in die DB speichert.

> Der Code erkennt automatisch, ob er lokal (Docker) oder online (Plesk) läuft.
> Online ruft er die Datei `api.php` im selben Ordner auf – ihr müsst im Code
> **nichts** ändern.

---

## 1. Datenbank anlegen
1. In **Plesk** → **Datenbanken** → **Datenbank hinzufügen**.
2. Name z. B. `kickback`, dazu einen **Datenbank-Benutzer** + **Passwort** anlegen.
3. Werte notieren: **DB-Name**, **Benutzer**, **Passwort** (Host ist meist `localhost`).

## 2. Tabellen + Daten importieren
1. Plesk → **Datenbanken** → bei eurer DB auf **phpMyAdmin**.
2. Reiter **Importieren** → Datei **`db/init.sql`** auswählen → **OK**.
3. Danach existieren die Tabellen (produkt, verein, verlosung …) mit Beispieldaten.

## 3. Dateien hochladen
Plesk → **Dateien** (Dateimanager) → in den Webordner **`httpdocs`** hochladen:

```
index.html  shop.html  promotion.html
css/   js/   img/
api.php
```
(optional: `wireframes/`. Nicht nötig online: `docker-compose.yml`, `db/`,
`Dokumentation/`, `DEPLOY_PLESK.md`, `README.md`.)

## 4. api.php mit euren DB-Daten konfigurieren
1. Im Dateimanager **`api.php`** öffnen (Bearbeiten).
2. Ganz die Stelle mit `new Config([` suchen und die **vier Platzhalter** ersetzen:
   ```php
   'address'  => 'localhost',
   'username' => 'PLESK_DB_USER',      // <-- euer DB-Benutzer
   'password' => 'PLESK_DB_PASSWORT',  // <-- euer DB-Passwort
   'database' => 'PLESK_DB_NAME',      // <-- euer DB-Name
   ```
3. Speichern.

> ⚠️ **Sicherheit:** Die echten Zugangsdaten nur hier auf dem Server eintragen.
> **Nicht** mit Passwort ins öffentliche GitHub pushen (im Repo bleiben die
> Platzhalter stehen).

## 5. Testen
1. `https://EURE-DOMAIN/api.php/records/produkt` → es kommt **JSON** mit Produkten.
2. `https://EURE-DOMAIN/` → Startseite lädt.
3. **Sortiment**: zeigt echte Produkte aus der DB.
4. **Promotion → Formular** ausfüllen & absenden → Erfolgsmeldung „Drin! Los-Nr. …".
5. In phpMyAdmin prüfen: in Tabelle **`verlosung`** ist der neue Eintrag da.

## 6. In Teams abgeben
Im Gruppen-Channel posten:
- **Website-Link** (Plesk-URL)
- **GitHub-Link**: https://github.com/01tim01/MMA23b-CL1-kickback
- **Abgabedokument** (Dokumentation_M291_Kickback.docx / als PDF)
- **Video**

---

### Falls `…/api.php/records/produkt` einen Fehler 404 gibt
Dann ist auf dem Server PATH_INFO deaktiviert. Lösung: eine Datei **`.htaccess`**
neben `api.php` mit diesem Inhalt anlegen …
```
<IfModule mod_rewrite.c>
    RewriteEngine on
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ api.php/$1 [QSA,L]
</IfModule>
```
… und im Code (`js/shop.js` & `js/promotion.js`) bei `API_BASE` das `'api.php'`
durch `'.'` ersetzen. (Meist nicht nötig – zuerst ohne probieren.)
