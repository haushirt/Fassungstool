/* ═══════════════════════════════════════════════════════════════════════
   Prüfgerüst · echte Datenbank aus `docs/live-schema.sql`

   Bis Runde 2 stand hier `d1-attrappe.mjs`: eine Nachbildung, die genau
   die Abfragen kannte, die der Worker stellte, und darauf aus Listen im
   Arbeitsspeicher antwortete. Ob die Spalten in der laufenden D1 wirklich
   so heissen, konnte sie nie sagen — sie hat die falschen Namen
   mitgelernt. Genau daran ist das Tool live gescheitert: `vorgang.art`,
   `vorgang.person`, `vorgang.ts` gibt es dort nicht, und keine einzige
   Fassung ist je angekommen, bei 123 grünen Prüfungen.

   Hier läuft stattdessen SQLite (`node:sqlite`, Bordmittel von Node 22 —
   keine neue Abhängigkeit, Regel 8), aufgebaut aus `docs/live-schema.sql`
   Zeile für Zeile. Damit prüfen sich von selbst:
     · jeder Tabellen- und Spaltenname („no such column: art")
     · jede NOT-NULL-Spalte, die der Worker nicht mitschreibt
     · jede CHECK-Bedingung (`vorgang.status`, `ereignis.art`, `person.rolle`)
     · jeder PRIMARY KEY und jeder UNIQUE-Index
     · jedes `ON CONFLICT(...)`, das keinen passenden Index findet

   Regel 2 bleibt unberührt: die Datenbank liegt im Arbeitsspeicher, es
   gibt kein `--remote`, kein Deploy, keine Verbindung nach aussen.

   Wo sich SQLite hier anders verhält als D1:
     · D1 liefert `meta` mit (Zeilenzahl, Dauer). Wird vom Worker nicht
       gelesen und deshalb nicht nachgebildet.
     · `batch` läuft hier in einer echten Transaktion (BEGIN/COMMIT), wie
       bei D1. Scheitert eine Anweisung, steht keine davon.
   ═══════════════════════════════════════════════════════════════════════ */

import { DatabaseSync } from "node:sqlite";
import { lies, gibt } from "./dateien.mjs";

export const SCHEMA_DA = gibt("docs", "live-schema.sql");

/* Ein Wert, wie ihn SQLite annimmt. Der Worker bindet gelegentlich
   `true`/`false` oder `undefined`; D1 wandelt still um, node:sqlite wirft.
   Umgewandelt wird hier NUR, was D1 auch umwandelt — ein Objekt bleibt
   ein Fehler, denn das wäre live auch einer. */
function wert(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  return v;
}

/* Der reine SQL-Inhalt einer Migrationsdatei, ohne Kommentarzeilen.
   Damit steht die Datei selbst unter Prüfung: wer sie ändert, ändert das,
   was hier läuft. */
export function migrationSql(datei) {
  return lies("migrations", datei)
    .split("\n").filter(z => !/^\s*--/.test(z)).join("\n").trim();
}

/* Die Datenbank, wie sie VOR einer Migration aussah.

   `docs/live-schema.sql` beschreibt die laufende Datenbank NACH allen
   eingespielten Migrationen. Um zu prüfen, dass ein neues Modul ohne
   seine Migration unsichtbar bleibt (Projektregel), braucht es den Stand
   davor. Statt ein zweites Schema von Hand zu pflegen — das altert und
   lügt — wird hier aus der Migrationsdatei gelesen, welche Spalte sie
   anlegt, und genau die aus dem Schema genommen.

   Kann heute nur `ALTER TABLE … ADD COLUMN`; alles andere ist ein Fehler
   statt einer stillen Nichtbeachtung. */
export function d1Vor(datei, start = {}) {
  const m = /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i.exec(migrationSql(datei));
  if (!m) throw new Error(datei + ": kein ADD COLUMN gefunden");
  const [, tabelle, spalte] = m;
  let schema = lies("docs", "live-schema.sql");
  const vorher = schema;
  /* Nur innerhalb DIESER Tabelle schneiden — ein gleichnamiger Spaltenname
     anderswo bleibt unberührt. */
  schema = schema.replace(
    new RegExp("(CREATE\\s+TABLE\\s+" + tabelle + "\\s*\\([\\s\\S]*?\\);)", "i"),
    blockSchnitt => blockSchnitt.replace(
      new RegExp(",\\s*\\n?\\s*" + spalte + "\\b[^,\\n]*", "i"), ""));
  if (schema === vorher)
    throw new Error(`${tabelle}.${spalte} steht nicht in docs/live-schema.sql — `
      + "Migration eingespielt und Schema nachgezogen?");
  return bau(schema, start);
}

export function d1Echt(start = {}) {
  return bau(lies("docs", "live-schema.sql"), start);
}

function bau(schema, start) {
  if (!SCHEMA_DA) throw new Error("docs/live-schema.sql fehlt");
  const db = new DatabaseSync(":memory:");
  db.exec(schema);

  /* Vorbelegung: `{ person: [{…}, …] }`. Die Spalten werden aus dem
     Objekt gelesen, nicht geraten — wer eine Spalte erfindet, die es
     nicht gibt, bekommt sofort „no such column". */
  for (const [tab, zeilen] of Object.entries(start))
    for (const z of zeilen) {
      const sp = Object.keys(z);
      db.prepare(`INSERT INTO ${tab} (${sp.join(",")}) VALUES (${sp.map(() => "?").join(",")})`)
        .run(...sp.map(k => wert(z[k])));
    }

  const lauf = (sql, b) => {
    const st = db.prepare(sql);
    const werte = b.map(wert);
    /* `all()` auf einer Einfügung wirft in node:sqlite nicht, gibt aber
       auch nichts zurück — deshalb entscheidet die Anweisung, nicht der
       Aufrufer. */
    return /^\s*(SELECT|PRAGMA)\b/i.test(sql) ? st.all(...werte) : (st.run(...werte), []);
  };

  /* Bequemer Blick in eine Tabelle: `DB.tabellen.ereignis` liest bei jedem
     Zugriff frisch aus SQLite.
     ACHTUNG: Was herauskommt, ist eine KOPIE. Eine Zeile hier zu ändern
     ändert nichts in der Datenbank — dafür gibt es `DB.sql(...)`. Genau
     das war in der alten Attrappe möglich und hat verborgen, dass die
     Spaltennamen nicht stimmten. */
  const tabellen = new Proxy({}, {
    get: (_, tab) => db.prepare(`SELECT * FROM ${String(tab)}`).all(),
    has: (_, tab) => !!db.prepare(
      `SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`).get(String(tab))
  });

  const prepare = sql => {
    const mach = b => ({
      bind: (...n) => mach(n),
      all: async () => ({ results: lauf(sql, b), success: true }),
      first: async () => lauf(sql, b)[0] || null,
      run: async () => (lauf(sql, b), { success: true }),
      /* Für `batch`: ohne await, damit die Transaktion zusammenhält. */
      _lauf: () => lauf(sql, b),
      _sql: sql, _bind: b
    });
    return mach([]);
  };

  return {
    prepare,
    /* D1 nimmt ein `batch` als Ganzes zurück, wenn eine Anweisung
       scheitert. Genau das leistet hier die Transaktion. */
    batch: async stmts => {
      db.exec("BEGIN");
      try {
        const r = stmts.map(s => ({ results: s._lauf(), success: true }));
        db.exec("COMMIT");
        return r;
      } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
    /* Zum Nachsehen und Nachstellen in den Prüfungen — echtes SQL. */
    tabellen,
    zeilen: tab => db.prepare(`SELECT * FROM ${tab}`).all(),
    sql: (s, ...b) => lauf(s, b),
    schliesse: () => db.close()
  };
}
