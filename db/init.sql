-- ============================================================================
-- Kickback Database Initialisation (M290 + M291 Erweiterung)
-- ============================================================================

-- TABELLE: Kunden (Basis aus M290)
CREATE TABLE IF NOT EXISTS kunden
(
    id    INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE
);

-- TABELLE: Verein
CREATE TABLE IF NOT EXISTS verein
(
    vereins_id INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    land       VARCHAR(50),
    liga       VARCHAR(100)
);

-- TABELLE: Produkt
CREATE TABLE IF NOT EXISTS produkt
(
    produkt_id     INT AUTO_INCREMENT PRIMARY KEY,
    titel          VARCHAR(150)   NOT NULL,
    saison         VARCHAR(10),
    trikot_typ     VARCHAR(20),
    beschreibung   TEXT,
    farbe          VARCHAR(30),
    preis          DECIMAL(10, 2) NOT NULL,
    bestand        INT NOT NULL DEFAULT 0,
    groesse        VARCHAR(10),
    kategorie      VARCHAR(100),
    unterkategorie VARCHAR(100),
    marke          VARCHAR(50),
    bild_url       VARCHAR(255),
    vereins_id     INT,
    FOREIGN KEY (vereins_id) REFERENCES verein (vereins_id)
);

-- TABELLE: Bestellung
CREATE TABLE IF NOT EXISTS bestellung
(
    bestell_id   INT AUTO_INCREMENT PRIMARY KEY,
    kunden_id    INT  NOT NULL,
    bestelldatum DATE NOT NULL,
    gesamtpreis  DECIMAL(10, 2),
    FOREIGN KEY (kunden_id) REFERENCES kunden (id)
);

-- TABELLE: Bestellung-Positionen
CREATE TABLE IF NOT EXISTS bestellung_position
(
    position_id INT AUTO_INCREMENT PRIMARY KEY,
    bestell_id  INT NOT NULL,
    produkt_id  INT NOT NULL,
    menge       INT NOT NULL,
    einzelpreis DECIMAL(10, 2),
    FOREIGN KEY (bestell_id) REFERENCES bestellung (bestell_id),
    FOREIGN KEY (produkt_id) REFERENCES produkt (produkt_id)
);

-- TABELLE: Spenden
CREATE TABLE IF NOT EXISTS spende
(
    spenden_id INT AUTO_INCREMENT PRIMARY KEY,
    bestell_id INT            NOT NULL,
    vereins_id INT            NOT NULL,
    betrag     DECIMAL(10, 2) NOT NULL,
    titel      VARCHAR(150),
    FOREIGN KEY (bestell_id) REFERENCES bestellung (bestell_id),
    FOREIGN KEY (vereins_id) REFERENCES verein (vereins_id)
);

-- ============================================================================
-- M291 ERWEITERUNG: Promotion / Trikot-Verlosung
-- Speichert Teilnehmer:innen unserer Promotion-Aktion
-- ============================================================================
CREATE TABLE IF NOT EXISTS verlosung
(
    verlosung_id      INT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    email             VARCHAR(150) NOT NULL,
    lieblingsverein   INT,
    groesse           VARCHAR(10),
    newsletter        TINYINT(1) DEFAULT 0,
    spielstand        INT DEFAULT 0,
    teilnahme_datum   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lieblingsverein) REFERENCES verein (vereins_id)
);

-- ============================================================================
-- SEED DATEN
-- ============================================================================
INSERT INTO kunden (name, email)
VALUES ('Luca Meier', 'luca.meier@example.com'),
       ('Sara Keller', 'sara.keller@example.com'),
       ('Tim Bucher', 'tim.bucher@example.com'),
       ('Nico Frei', 'nico.frei@example.com'),
       ('Lea Schmid', 'lea.schmid@example.com');

INSERT INTO verein (name, land, liga)
VALUES ('FC Barcelona', 'Spanien', 'La Liga'),
       ('Real Madrid', 'Spanien', 'La Liga'),
       ('FC Liverpool', 'England', 'Premier League'),
       ('Manchester City', 'England', 'Premier League'),
       ('FC Bayern München', 'Deutschland', 'Bundesliga'),
       ('Borussia Dortmund', 'Deutschland', 'Bundesliga'),
       ('Juventus Turin', 'Italien', 'Serie A'),
       ('AC Mailand', 'Italien', 'Serie A'),
       ('Paris Saint-Germain', 'Frankreich', 'Ligue 1'),
       ('Ajax Amsterdam', 'Niederlande', 'Eredivisie'),
       ('FC Basel', 'Schweiz', 'Super League'),
       ('BSC Young Boys', 'Schweiz', 'Super League'),
       ('Inter Mailand', 'Italien', 'Serie A'),
       ('Arsenal FC', 'England', 'Premier League'),
       ('Newcastle United', 'England', 'Premier League');

-- Aktuelle Trikots
INSERT INTO produkt (titel, saison, trikot_typ, beschreibung, farbe, preis, bestand, groesse, kategorie, unterkategorie, marke, bild_url, vereins_id) VALUES
('FC Barcelona Heimtrikot 24/25 - S','24/25','Heim','Heimtrikot des FC Barcelona','Blau/Rot',119.90,50,'S','Aktuelle Trikots','Top-Ligen','Nike','img/barca.jpeg',1),
('FC Barcelona Heimtrikot 24/25 - M','24/25','Heim','Heimtrikot des FC Barcelona','Blau/Rot',119.90,50,'M','Aktuelle Trikots','Top-Ligen','Nike','img/barca.jpeg',1),
('FC Barcelona Heimtrikot 24/25 - L','24/25','Heim','Heimtrikot des FC Barcelona','Blau/Rot',119.90,50,'L','Aktuelle Trikots','Top-Ligen','Nike','img/barca.jpeg',1),
('Real Madrid Heimtrikot 24/25 - S','24/25','Heim','Heimtrikot von Real Madrid','Weiss',119.90,60,'S','Aktuelle Trikots','Top-Ligen','Adidas','img/real.jpeg',2),
('Real Madrid Heimtrikot 24/25 - M','24/25','Heim','Heimtrikot von Real Madrid','Weiss',119.90,60,'M','Aktuelle Trikots','Top-Ligen','Adidas','img/real.jpeg',2),
('Real Madrid Heimtrikot 24/25 - L','24/25','Heim','Heimtrikot von Real Madrid','Weiss',119.90,60,'L','Aktuelle Trikots','Top-Ligen','Adidas','img/real.jpeg',2),
('Liverpool Heimtrikot 24/25 - S','24/25','Heim','Heimtrikot des FC Liverpool','Rot',114.90,45,'S','Aktuelle Trikots','Top-Ligen','Nike','img/liverpool.jpeg',3),
('Liverpool Heimtrikot 24/25 - M','24/25','Heim','Heimtrikot des FC Liverpool','Rot',114.90,45,'M','Aktuelle Trikots','Top-Ligen','Nike','img/liverpool.jpeg',3),
('Manchester City Heimtrikot 24/25 - M','24/25','Heim','Trikot von Manchester City','Hellblau',119.90,40,'M','Aktuelle Trikots','Top-Ligen','Puma','img/mancity.jpeg',4),
('Manchester City Heimtrikot 24/25 - L','24/25','Heim','Trikot von Manchester City','Hellblau',119.90,40,'L','Aktuelle Trikots','Top-Ligen','Puma','img/mancity.jpeg',4),
('Bayern München Heimtrikot 24/25 - S','24/25','Heim','Heimtrikot des FC Bayern','Rot/Weiss',119.90,55,'S','Aktuelle Trikots','Top-Ligen','Adidas','img/bayern.jpeg',5),
('Bayern München Heimtrikot 24/25 - M','24/25','Heim','Heimtrikot des FC Bayern','Rot/Weiss',119.90,55,'M','Aktuelle Trikots','Top-Ligen','Adidas','img/bayern.jpeg',5),
('Bayern München Heimtrikot 24/25 - L','24/25','Heim','Heimtrikot des FC Bayern','Rot/Weiss',119.90,55,'L','Aktuelle Trikots','Top-Ligen','Adidas','img/bayern.jpeg',5),
('Borussia Dortmund Heimtrikot 24/25 - M','24/25','Heim','Heimtrikot des BVB','Gelb/Schwarz',114.90,42,'M','Aktuelle Trikots','Top-Ligen','Puma','img/dortmund.jpeg',6),
('Borussia Dortmund Heimtrikot 24/25 - L','24/25','Heim','Heimtrikot des BVB','Gelb/Schwarz',114.90,42,'L','Aktuelle Trikots','Top-Ligen','Puma','img/dortmund.jpeg',6),
('Juventus Heimtrikot 24/25 - M','24/25','Heim','Heimtrikot Juventus','Schwarz/Weiss',114.90,38,'M','Aktuelle Trikots','Top-Ligen','Adidas','img/juventus.jpeg',7),
('AC Mailand Heimtrikot 24/25 - L','24/25','Heim','Heimtrikot AC Mailand','Rot/Schwarz',114.90,40,'L','Aktuelle Trikots','Top-Ligen','Puma','img/acmilan.jpeg',8),
('PSG Heimtrikot 24/25 - M','24/25','Heim','Heimtrikot Paris Saint-Germain','Dunkelblau',124.90,35,'M','Aktuelle Trikots','Top-Ligen','Nike','img/psg.jpeg',9),
('Ajax Heimtrikot 24/25 - M','24/25','Heim','Heimtrikot Ajax Amsterdam','Weiss/Rot',104.90,30,'M','Aktuelle Trikots','Top-Ligen','Adidas','img/ajax.jpeg',10);

-- Retro Trikots
INSERT INTO produkt (titel, saison, trikot_typ, beschreibung, farbe, preis, bestand, groesse, kategorie, unterkategorie, marke, bild_url, vereins_id) VALUES
('FC Barcelona Retrotrikot 1999 - M','1999','Heim','Legendäres Retrotrikot der 90er','Blau/Rot',149.90,20,'M','Retro Trikots','90er Klassiker','Nike','img/barca.jpeg',1),
('FC Barcelona Retrotrikot 1999 - L','1999','Heim','Legendäres Retrotrikot der 90er','Blau/Rot',149.90,20,'L','Retro Trikots','90er Klassiker','Nike','img/barca.jpeg',1),
('Real Madrid Retrotrikot 2002 - M','2002','Heim','CL-Sieger Retro Klassiker','Weiss',139.90,30,'M','Retro Trikots','2000er Klassiker','Adidas','img/real.jpeg',2),
('Real Madrid Retrotrikot 2002 - L','2002','Heim','CL-Sieger Retro Klassiker','Weiss',139.90,30,'L','Retro Trikots','2000er Klassiker','Adidas','img/real.jpeg',2),
('Liverpool Retrotrikot 2005 - M','2005','Heim','Istanbul Finale Retro Edition','Rot',129.90,25,'M','Retro Trikots','2000er Klassiker','Reebok','img/liverpool.jpeg',3),
('Bayern München Retrotrikot 1997 - L','1997','Heim','Retro Klassiker 1997','Rot/Blau',129.90,18,'L','Retro Trikots','90er Klassiker','Adidas','img/bayern.jpeg',5),
('Borussia Dortmund Retrotrikot 1996 - M','1996','Heim','Meisterschaft 1996 Retro','Gelb/Schwarz',119.90,22,'M','Retro Trikots','90er Klassiker','Nike','img/dortmund.jpeg',6);
