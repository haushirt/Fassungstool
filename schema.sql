-- ═══════════════════════════════════════════════════════════════════
-- Fassungstool · Haus Hirt · D1-Schema
-- Datenbank: fassung
-- Mehrfach ausführbar: alles IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════

-- Personen. Der Code steht nie hier, nur seine Prüfsumme.
CREATE TABLE IF NOT EXISTS person (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  rolle     TEXT NOT NULL DEFAULT 'service',   -- service | wirtschaft | leitung
  code_hash TEXT NOT NULL,
  salt      TEXT NOT NULL,
  aktiv     INTEGER NOT NULL DEFAULT 1,
  angelegt  INTEGER NOT NULL
);

-- Fünf Fehlversuche je IP in fünfzehn Minuten, dann zu.
CREATE TABLE IF NOT EXISTS anmeldeversuch (
  ip  TEXT NOT NULL,
  ts  INTEGER NOT NULL,
  ok  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_av_ip ON anmeldeversuch(ip, ts);

-- Eine Fassung. daten hält den v11-Blob unverändert — kein Feld umbenennen.
CREATE TABLE IF NOT EXISTS vorgang (
  id            TEXT PRIMARY KEY,
  tag           TEXT NOT NULL,
  art           TEXT NOT NULL,                 -- tag | fuellen | keller | nach | ware
  wer           TEXT,
  person        TEXT,
  daten         TEXT NOT NULL,
  abgeschlossen INTEGER NOT NULL DEFAULT 0,
  ts            INTEGER NOT NULL,
  geaendert     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_vg_tag ON vorgang(tag, art);

-- Das Ereignisjournal. Append-only. Korrekturen sind neue Zeilen.
CREATE TABLE IF NOT EXISTS ereignis (
  id      TEXT PRIMARY KEY,
  ts      INTEGER NOT NULL,
  tag     TEXT NOT NULL,
  art     TEXT NOT NULL,                       -- zaehlung | entnahme | eingang | korrektur
  quelle  TEXT,
  vorgang TEXT,
  artikel TEXT,
  ort     TEXT,
  menge   REAL,
  wer     TEXT,
  notiz   TEXT
);
CREATE INDEX IF NOT EXISTS ix_er_tag ON ereignis(tag, art);
CREATE INDEX IF NOT EXISTS ix_er_art ON ereignis(artikel, ts);

-- Der importierte Z-Bericht. roh bleibt liegen: wer später merkt, dass der
-- Parser eine Regel falsch hatte, rechnet neu statt neu zu ziehen.
CREATE TABLE IF NOT EXISTS fassungsliste (
  id     TEXT PRIMARY KEY,
  tag    TEXT UNIQUE NOT NULL,
  nr     TEXT,
  quelle TEXT,
  roh    TEXT NOT NULL,
  ts     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fassungszeile (
  tag        TEXT NOT NULL,
  kassenname TEXT NOT NULL,
  anzahl     REAL NOT NULL,
  umsatz     REAL,
  artikel    TEXT,
  ml         REAL
);
CREATE INDEX IF NOT EXISTS ix_fz_tag ON fassungszeile(tag);

-- Kassenname → Artikel, oder ignoriert. Einmal bestätigt, für immer festgelegt.
CREATE TABLE IF NOT EXISTS mapping (
  kassenname TEXT PRIMARY KEY,
  artikel    TEXT,                             -- NULL zusammen mit ignoriert=1
  ignoriert  INTEGER NOT NULL DEFAULT 0,
  rezept     TEXT,                             -- JSON [{id,ml}] für Mischgetränke
  wer        TEXT,
  ts         INTEGER NOT NULL
);

-- WINES, PLAN, GETR — raus aus dem Quelltext.
CREATE TABLE IF NOT EXISTS stamm (
  schluessel TEXT PRIMARY KEY,                 -- wines | plan | getr
  daten      TEXT NOT NULL,
  ts         INTEGER NOT NULL
);
