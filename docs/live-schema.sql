-- Live-Schema der D1-Datenbank `fassung` (WEUR)
-- Gezogen am 17.09.2026 aus der laufenden Datenbank:
--   SELECT type, name, tbl_name, sql FROM sqlite_master;
--
-- GEGENGEPRÜFT am 17.09.2026, VOLLSTÄNDIG: `PRAGMA table_info` für ALLE NEUN Tabellen
-- gegen die laufende D1 gelesen — `person`, `anmeldeversuch`, `vorgang`, `ereignis`,
-- `fassungsliste`, `fassungszeile`, `mapping`, `stamm` (und `_cf_KV`). Spaltennamen,
-- Typen, NOT-NULL-Marken und `zaehlnr DEFAULT 0` stimmen durchweg mit dieser Datei
-- überein. Damit sind beide Vorbehalte erledigt: der des software-engineers ("ob diese
-- Datei die Datenbank richtig wiedergibt") und der des qa-guardian ("für person,
-- ereignis, mapping, stamm steht die Gegenprobe noch aus").
--
-- DIES IST DIE WAHRHEIT nach Regel 3, nicht `schema.sql` im Wurzelverzeichnis.
-- Die Datei wird NICHT ausgeführt, sie dokumentiert. Lokale Test-DBs werden
-- hieraus aufgebaut.
--
-- Abweichungen gegenüber der bisherigen Dokumentation, bei der Ziehung
-- festgestellt:
--   * `idem` und `zbericht` EXISTIEREN NICHT. Regel 14 schützt zwei Tabellen,
--     die es nicht gibt. Die drei Spalten `schluessel`, `zaehlnr`, `geraet`
--     auf `vorgang` gibt es dagegen sehr wohl.
--   * Die zwei in der Projektanleitung §4 geplanten `ereignis`-Indizes sind
--     BEREITS ANGELEGT, aber breiter als dort beschrieben:
--     (artikel, ort, ts) statt (artikel, ts) und (tag, art) statt (tag).
--     Die "erste geplante Migration" ist damit gegenstandslos.
--   * `ereignis.quelle` hat KEINE CHECK-Bedingung. Der in Runde 2 eingeführte
--     Wert 'vorgang-korrektur' ist zulässig.
--   * `ereignis.art` hat eine CHECK-Bedingung: zaehlung|entnahme|eingang|korrektur.
--   * Zusätzlich vorhanden: `sqlite_sequence` (von SQLite verwaltet).

-- ═══════════════ Tabellen ═══════════════

CREATE TABLE person (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rolle TEXT NOT NULL CHECK (rolle IN ('service','wirtschaft','leitung')),
  code_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  aktiv INTEGER NOT NULL DEFAULT 1,
  angelegt INTEGER NOT NULL
);

CREATE TABLE anmeldeversuch (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE vorgang (
  id            TEXT PRIMARY KEY,
  modus         TEXT NOT NULL,
  branch        TEXT,
  tag           TEXT NOT NULL,
  wer           TEXT NOT NULL,
  begonnen      INTEGER NOT NULL,
  geaendert     INTEGER NOT NULL,
  abgeschlossen INTEGER,
  status        TEXT NOT NULL CHECK (status IN ('offen','abgeschlossen','freigegeben')),
  daten         TEXT NOT NULL,
  schluessel    TEXT,
  zaehlnr       INTEGER DEFAULT 0,
  geraet        TEXT
);

CREATE TABLE ereignis (
  id      TEXT PRIMARY KEY,
  ts      INTEGER NOT NULL,
  tag     TEXT NOT NULL,
  art     TEXT NOT NULL CHECK (art IN ('zaehlung','entnahme','eingang','korrektur')),
  quelle  TEXT NOT NULL,
  vorgang TEXT NOT NULL,
  artikel TEXT NOT NULL,
  ort     TEXT NOT NULL,
  menge   INTEGER NOT NULL,
  wer     TEXT NOT NULL,
  notiz   TEXT
);

CREATE TABLE fassungsliste (
  id           TEXT PRIMARY KEY,
  tag          TEXT NOT NULL,
  z            TEXT,
  kostenstelle TEXT,
  von_ts       INTEGER,
  bis_ts       INTEGER,
  importiert   INTEGER NOT NULL,
  wer          TEXT NOT NULL,
  roh          TEXT NOT NULL
);

CREATE TABLE fassungszeile (
  liste       TEXT NOT NULL,
  rohbez      TEXT NOT NULL,
  kern        TEXT NOT NULL,
  anzahl      REAL NOT NULL,
  betrag      REAL,
  ausschankMl INTEGER,
  artikel     TEXT,
  PRIMARY KEY (liste, rohbez)
);

-- `ausschank_ml` kommt aus migrations/002_mapping_ausschank.sql und ist
-- VOR dem Merge von Runde 23 einzuspielen. Der Worker fragt zur Laufzeit
-- nach (`kannAusschank`) und kommt ohne die Spalte aus.
CREATE TABLE mapping (
  fremd      TEXT PRIMARY KEY,
  status     TEXT NOT NULL CHECK (status IN ('zugeordnet','ignoriert')),
  artikel    TEXT,
  gebinde_ml INTEGER,
  wer        TEXT NOT NULL,
  angelegt   INTEGER NOT NULL,
  ausschank_ml INTEGER
);

CREATE TABLE stamm (
  schluessel TEXT PRIMARY KEY,
  wert       TEXT NOT NULL,
  geaendert  INTEGER NOT NULL,
  wer        TEXT
);

-- Von Cloudflare bzw. SQLite verwaltet, nicht selbst anlegen:
-- CREATE TABLE _cf_KV (key TEXT PRIMARY KEY, value BLOB) WITHOUT ROWID;
-- CREATE TABLE sqlite_sequence(name,seq);

-- ═══════════════ Indizes ═══════════════

CREATE INDEX i_ereignis_artikel ON ereignis(artikel, ort, ts);
CREATE INDEX i_ereignis_tag     ON ereignis(tag, art);
CREATE INDEX i_liste_tag        ON fassungsliste(tag);
CREATE INDEX i_vorgang_offen    ON vorgang(status, geaendert);
CREATE INDEX i_vorgang_tag      ON vorgang(tag, modus);
CREATE UNIQUE INDEX vorgang_schluessel ON vorgang(schluessel);
CREATE INDEX vorgang_tag        ON vorgang(tag);
