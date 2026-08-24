-- ═══════════════════════════════════════════════════════════════════
--  Fassungstool · D1-Schema
--  In der Cloudflare-Konsole (D1 → fassung → Console) einmal ausführen.
--  Alle Zeitstempel sind Millisekunden (Date.now()). Niemals mit |0
--  behandeln — der Wert ist grösser als 2^31.
-- ═══════════════════════════════════════════════════════════════════

-- ── Personen und Rollen ────────────────────────────────────────────
-- Codes stehen nirgends im Klartext, weder hier noch in der HTML.
CREATE TABLE IF NOT EXISTS person (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  rolle      TEXT NOT NULL CHECK (rolle IN ('fassen','leitung')),
  code_hash  TEXT NOT NULL,
  salt       TEXT NOT NULL,
  aktiv      INTEGER NOT NULL DEFAULT 1,
  angelegt   INTEGER NOT NULL
);

-- Fehlversuche für die Sperre. Wird beim Anmelden aufgeräumt.
CREATE TABLE IF NOT EXISTS anmeldeversuch (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ip     TEXT NOT NULL,
  ts     INTEGER NOT NULL,
  erfolg INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS i_versuch ON anmeldeversuch(ip, ts);

-- ── Vorgänge ───────────────────────────────────────────────────────
-- daten enthält den bestehenden Blob aus der App, unverändert.
-- Nichts daran umbenennen; die Erfassungs-UI liest ihn genau so.
CREATE TABLE IF NOT EXISTS vorgang (
  id            TEXT PRIMARY KEY,
  modus         TEXT NOT NULL,
  branch        TEXT,
  tag           TEXT NOT NULL,
  wer           TEXT NOT NULL,
  begonnen      INTEGER NOT NULL,
  geaendert     INTEGER NOT NULL,
  abgeschlossen INTEGER,
  status        TEXT NOT NULL CHECK (status IN ('offen','abgeschlossen','freigegeben')),
  daten         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS i_vorgang_tag   ON vorgang(tag, modus);
CREATE INDEX IF NOT EXISTS i_vorgang_offen ON vorgang(status, geaendert);

-- ── Ereignisjournal ────────────────────────────────────────────────
-- Append-only. Wird nie überschrieben, nur ergänzt. Korrekturen sind
-- eigene Zeilen mit art='korrektur', keine Änderung am Bestehenden.
--
-- Bestand(artikel, ort) = Menge der jüngsten 'zaehlung'
--                       + Summe aller Ereignisse mit ts > deren ts
CREATE TABLE IF NOT EXISTS ereignis (
  id      TEXT PRIMARY KEY,           -- UUID vom Client → idempotent
  ts      INTEGER NOT NULL,
  tag     TEXT NOT NULL,
  art     TEXT NOT NULL CHECK (art IN ('zaehlung','entnahme','eingang','korrektur')),
  quelle  TEXT NOT NULL,              -- tag | fuellen | keller | nach | ware | abgleich
  vorgang TEXT NOT NULL,
  artikel TEXT NOT NULL,              -- w001 … oder getr:cola
  ort     TEXT NOT NULL,              -- keller | bar | restaurant | backup | getrlager
  menge   INTEGER NOT NULL,           -- Entnahme negativ, Eingang positiv
  wer     TEXT NOT NULL,
  notiz   TEXT
);
CREATE INDEX IF NOT EXISTS i_ereignis_artikel ON ereignis(artikel, ort, ts);
CREATE INDEX IF NOT EXISTS i_ereignis_tag     ON ereignis(tag, art);

-- ── Fassungsliste (gastronovi Z-Bericht) ───────────────────────────
CREATE TABLE IF NOT EXISTS fassungsliste (
  id           TEXT PRIMARY KEY,
  tag          TEXT NOT NULL,
  z            TEXT,
  kostenstelle TEXT,
  von_ts       INTEGER,
  bis_ts       INTEGER,
  importiert   INTEGER NOT NULL,
  wer          TEXT NOT NULL,
  roh          TEXT NOT NULL          -- Originaldatei, unverändert
);
CREATE INDEX IF NOT EXISTS i_liste_tag ON fassungsliste(tag);

CREATE TABLE IF NOT EXISTS fassungszeile (
  liste       TEXT NOT NULL,
  rohbez      TEXT NOT NULL,          -- Positionsname genau wie im Bericht
  kern        TEXT NOT NULL,          -- ohne Mengenangabe
  anzahl      REAL NOT NULL,
  betrag      REAL,
  ausschankMl INTEGER,                -- 125 bei 1/8, 750 bei 0,75 l …
  artikel     TEXT,                   -- gefüllt nach Zuordnung
  PRIMARY KEY (liste, rohbez)
);

-- Zuordnung Kassenname → Artikel. Einmal entschieden, gilt für immer.
-- 'ignoriert' ist ein vollwertiger Zustand: Fassbier, Speisen, Kaffee.
CREATE TABLE IF NOT EXISTS mapping (
  fremd      TEXT PRIMARY KEY,
  status     TEXT NOT NULL CHECK (status IN ('zugeordnet','ignoriert')),
  artikel    TEXT,
  gebinde_ml INTEGER,                 -- Wein 750, Getränk seine Grösse
  wer        TEXT NOT NULL,
  angelegt   INTEGER NOT NULL
);

-- ── Stammdaten ─────────────────────────────────────────────────────
-- WINES, PLAN, GETR-Namen und Ladenbelegung. Aus dem Quelltext heraus,
-- damit ein neuer Wein keine Codeänderung mehr braucht.
CREATE TABLE IF NOT EXISTS stamm (
  schluessel TEXT PRIMARY KEY,        -- 'wines' | 'plan' | 'getr' | 'cfg'
  wert       TEXT NOT NULL,
  geaendert  INTEGER NOT NULL,
  wer        TEXT
);

-- ═══════════════════════════════════════════════════════════════════
--  Erste Person anlegen — SONST SPERRST DU DICH AUS.
--
--  1. Worker deployen
--  2. /api/hash?code=5800  aufrufen (nur solange ANLAGE_OFFEN gesetzt)
--  3. hash und salt aus der Antwort hier einsetzen und ausführen
--  4. Secret ANLAGE_OFFEN im Dashboard löschen
-- ═══════════════════════════════════════════════════════════════════
-- INSERT INTO person (id,name,rolle,code_hash,salt,aktiv,angelegt)
-- VALUES ('p1','Casimir','leitung','<hash>','<salt>',1,unixepoch()*1000);
