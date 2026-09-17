/* Code gegen Schema (harte Regeln 3, 4 und 14).

   Wahrheit über die laufende Datenbank ist allein `docs/live-schema.sql`.
   Die Datei liegt nicht im Repo. `schema.sql` ist laut Regel 3 veraltet
   und ausdrücklich KEINE gültige Quelle — es wird hier nicht ersatzweise
   herangezogen. Solange `docs/live-schema.sql` fehlt, meldet sich der
   Abgleich als übersprungen; das ist der ehrliche Zustand, nicht ein
   bestandener Test.

   Was auch ohne Schema prüfbar ist, steht im ersten Teil. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { lies, gibt } from "./hilfe/dateien.mjs";

const WORKER = lies("src", "index.js");

/* Alle SQL-Zeichenketten aus dem Worker. */
const SQL = [...WORKER.matchAll(/`([^`]*)`/g)].map(m => m[1])
  .filter(s => /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE)\b/i.test(s.trim()))
  .map(s => s.replace(/\s+/g, " ").trim());

/* `ON CONFLICT(...) DO UPDATE SET` sieht aus wie eine Tabelle namens
   „set" — Schlüsselwörter fliegen deshalb heraus. */
const KEINE_TABELLE = new Set(["set", "select", "values", "where", "from"]);
const tabellenAus = s => [...s.matchAll(/\b(?:FROM|INTO|UPDATE|JOIN)\s+([a-z_][a-z0-9_]*)/gi)]
  .map(m => m[1].toLowerCase()).filter(t => !KEINE_TABELLE.has(t));

describe("SQL im Worker", () => {
  test("es gibt überhaupt SQL zu prüfen", () => {
    assert.ok(SQL.length >= 15, "unerwartet wenige Abfragen gefunden: " + SQL.length);
  });

  test("Regel 14: die ungenutzten Tabellen bleiben ungenutzt", () => {
    for (const s of SQL)
      for (const t of tabellenAus(s))
        assert.equal(["idem", "zbericht"].includes(t), false,
          "Regel 14 verbietet die Tabelle " + t + ": " + s);
  });

  test("Regel 14: keine Spalte schluessel/zaehlnr/geraet auf vorgang", () => {
    for (const s of SQL) {
      if (!tabellenAus(s).includes("vorgang")) continue;
      for (const sp of ["schluessel", "zaehlnr", "geraet"])
        assert.equal(new RegExp("\\b" + sp + "\\b", "i").test(s), false,
          `Regel 14: Spalte ${sp} auf vorgang wird angefasst: ${s}`);
    }
  });

  test("kein DROP, kein ALTER, kein CREATE im laufenden Worker", () => {
    for (const s of SQL)
      assert.equal(/^\s*(DROP|ALTER|CREATE)\b/i.test(s), false,
        "Schemaeingriff im Worker: " + s);
  });

  test("das Ereignisjournal wird nur beschrieben, nie geändert oder geleert", () => {
    for (const s of SQL) {
      if (!tabellenAus(s).includes("ereignis")) continue;
      assert.equal(/^\s*(UPDATE|DELETE)\b/i.test(s), false,
        "Regel 6: das Journal ist append-only — " + s);
    }
  });

  test("jede Abfrage bindet ihre Werte, keine zusammengesetzten Zeichenketten", () => {
    const roh = [...WORKER.matchAll(/`[^`]*\$\{[^}]*\}[^`]*`/g)].map(m => m[0])
      .filter(s => /(SELECT|INSERT|UPDATE|DELETE)\s/i.test(s));
    assert.deepEqual(roh, [], "SQL mit eingesetzter Zeichenkette");
  });
});

/* ── Abgleich mit dem Live-Schema ─────────────────────────────────────── */
const DA = gibt("docs", "live-schema.sql");

describe("Abgleich mit docs/live-schema.sql", { skip: DA ? false :
  "docs/live-schema.sql fehlt im Repo — ohne die Datei ist harte Regel 3 "
  + "nicht erfüllbar. schema.sql ist ausdrücklich keine Ersatzquelle. "
  + "Erzeugen: SELECT name, sql FROM sqlite_master WHERE type='table'; "
  + "(D1-Konsole) und als Datei einchecken." }, () => {

  const schema = DA ? lies("docs", "live-schema.sql") : "";
  const tabellen = {};
  for (const m of schema.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`\[]?([a-z_][a-z0-9_]*)["'`\]]?\s*\(([\s\S]*?)\);/gi)) {
    const spalten = m[2].split(/,(?![^(]*\))/)
      .map(z => z.trim())
      .filter(z => !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(z))
      .map(z => (z.match(/^["'`\[]?([a-z_][a-z0-9_]*)/i) || [])[1])
      .filter(Boolean).map(s => s.toLowerCase());
    tabellen[m[1].toLowerCase()] = spalten;
  }

  test("jede Tabelle, die der Worker anfasst, gibt es wirklich", () => {
    const fehlen = new Set();
    for (const s of SQL)
      for (const t of tabellenAus(s))
        if (!tabellen[t]) fehlen.add(t);
    assert.deepEqual([...fehlen], [], "im Live-Schema nicht vorhanden");
  });

  /* Heuristik mit klarer Grenze: geprüft werden nur Abfragen auf genau
     einer Tabelle ohne Verbund und ohne Funktionen in der Spaltenliste.
     Alles andere wird bewusst übergangen, statt falsch zu urteilen. */
  test("jede benannte Spalte gibt es in ihrer Tabelle", () => {
    const klagen = [];
    for (const s of SQL) {
      const t = [...new Set(tabellenAus(s))];
      if (t.length !== 1 || !tabellen[t[0]]) continue;
      const spalten = tabellen[t[0]];
      let genannt = [];

      const sel = /^SELECT\s+(.+?)\s+FROM\s/i.exec(s);
      const ins = /^INSERT\s+INTO\s+\w+\s*\(([^)]*)\)/i.exec(s);
      const upd = /^UPDATE\s+\w+\s+SET\s+(.+?)(?:\s+WHERE\b|$)/i.exec(s);

      if (ins) genannt = ins[1].split(",");
      else if (upd) genannt = upd[1].split(",").map(x => x.split("=")[0]);
      else if (sel && !/[()*]/.test(sel[1])) genannt = sel[1].split(",");
      else continue;

      genannt.map(x => x.trim().toLowerCase())
        .filter(x => /^[a-z_][a-z0-9_]*$/.test(x))
        .forEach(x => { if (!spalten.includes(x)) klagen.push(`${t[0]}.${x} — ${s}`); });
    }
    assert.deepEqual(klagen, [], "Spalten, die es im Live-Schema nicht gibt");
  });

  test("die Rollen im Schema und im Code sind dieselben drei", () => {
    /* Steht im Schema eine CHECK-Bedingung auf person.rolle, muss sie zu
       service/wirtschaft/leitung passen. */
    const c = /CHECK\s*\(\s*rolle\s+IN\s*\(([^)]*)\)/i.exec(schema);
    if (!c) return;
    const r = c[1].split(",").map(x => x.trim().replace(/^['"]|['"]$/g, "")).sort();
    assert.deepEqual(r, ["leitung", "service", "wirtschaft"]);
  });
});
