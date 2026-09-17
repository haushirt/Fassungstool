/* ═══════════════════════════════════════════════════════════════════════
   Prüfgerüst · D1-Attrappe

   ACHTUNG, Grenze dieser Attrappe:
   Sie ist KEIN Schema und beweist NICHTS über die laufende Datenbank.
   Sie kennt genau die Abfragen, die `src/index.js` heute stellt, und
   antwortet darauf aus einer Liste im Arbeitsspeicher. Ob Tabellen und
   Spalten in der Live-D1 wirklich so heissen, sagt allein
   `docs/live-schema.sql` (harte Regel 3) — die Datei fehlt im Repo.
   Solange sie fehlt, prüft dieses Gerüst den Ablauf des Workers
   (Rechte, Sperre, Idempotenz, Fehlerantworten), nicht das Schema.

   Kommt eine Abfrage an, die hier nicht steht, wirft die Attrappe. Das
   ist Absicht: Eine neue SQL-Stelle im Worker soll auffallen.
   ═══════════════════════════════════════════════════════════════════════ */

const norm = s => s.replace(/\s+/g, " ").trim();

export function d1Attrappe(start = {}) {
  const t = {
    person: [], anmeldeversuch: [], vorgang: [], ereignis: [],
    stamm: [], mapping: [], fassungsliste: [], fassungszeile: [],
    ...start
  };

  const fuehre = (sql, b) => {
    const s = norm(sql);

    /* ── person ───────────────────────────────────────────────────── */
    if (/^SELECT id, name, rolle FROM person WHERE id = \?1 AND aktiv = 1$/.test(s))
      return { rows: t.person.filter(p => p.id === b[0] && p.aktiv === 1)
        .map(p => ({ id: p.id, name: p.name, rolle: p.rolle })) };

    if (/^SELECT id, name, rolle, code_hash, salt FROM person WHERE aktiv = 1$/.test(s))
      return { rows: t.person.filter(p => p.aktiv === 1) };

    if (/^SELECT COUNT\(\*\) AS n FROM person$/.test(s))
      return { rows: [{ n: t.person.length }] };

    if (/^SELECT id, name, rolle, aktiv FROM person ORDER BY name$/.test(s))
      return { rows: t.person.slice().sort((x, y) => x.name.localeCompare(y.name)) };

    if (/^INSERT INTO person /.test(s)) {
      const [id, name, rolle, code_hash, salt, aktiv, angelegt] = b;
      const alt = t.person.find(p => p.id === id);
      if (alt) Object.assign(alt, { name, rolle, code_hash, salt, aktiv });
      else t.person.push({ id, name, rolle, code_hash, salt, aktiv, angelegt });
      return { rows: [] };
    }
    if (/^UPDATE person SET /.test(s)) {
      const p = t.person.find(x => x.id === b[0]);
      if (p) Object.assign(p, { name: b[1], rolle: b[2], aktiv: b[3] });
      return { rows: [] };
    }

    /* ── anmeldeversuch ───────────────────────────────────────────── */
    if (/^SELECT ok, ts FROM anmeldeversuch WHERE ip = \?1 AND ts > \?2$/.test(s))
      return { rows: t.anmeldeversuch.filter(v => v.ip === b[0] && v.ts > b[1])
        .map(v => ({ ok: v.ok, ts: v.ts })) };

    if (/^INSERT INTO anmeldeversuch /.test(s)) {
      t.anmeldeversuch.push({ ip: b[0], ts: b[1], ok: b[2] });
      return { rows: [] };
    }
    if (/^DELETE FROM anmeldeversuch WHERE ip = \?1 AND ok = 0$/.test(s)) {
      t.anmeldeversuch = t.anmeldeversuch.filter(v => !(v.ip === b[0] && !v.ok));
      return { rows: [] };
    }

    /* ── vorgang ──────────────────────────────────────────────────── */
    if (/^SELECT daten FROM vorgang WHERE id = \?1$/.test(s)) {
      const v = t.vorgang.find(x => x.id === b[0]);
      return { rows: v ? [{ daten: v.daten }] : [] };
    }
    if (/^INSERT INTO vorgang /.test(s)) {
      const [id, tag, art, wer, person, daten, abgeschlossen, ts] = b;
      const alt = t.vorgang.find(x => x.id === id);
      if (alt) Object.assign(alt, { daten, abgeschlossen, wer, geaendert: ts });
      else t.vorgang.push({ id, tag, art, wer, person, daten, abgeschlossen, ts, geaendert: ts });
      return { rows: [] };
    }
    if (/^SELECT id, tag, art, wer, daten, abgeschlossen, ts FROM vorgang/.test(s))
      return { rows: t.vorgang.filter(v => v.tag >= b[0] && v.tag <= b[1])
        .sort((x, y) => (x.tag + x.ts).localeCompare(y.tag + y.ts)) };

    /* ── ereignis (append-only) ───────────────────────────────────── */
    if (/^SELECT COUNT\(\*\) AS n FROM ereignis WHERE vorgang = \?1$/.test(s))
      return { rows: [{ n: t.ereignis.filter(e => e.vorgang === b[0]).length }] };

    /* Zwei Einfügungen, zwei Spaltenlisten — `quelle` steht als Literal
       im SQL, nicht als Platzhalter. Wer das übersieht, prüft an der
       falschen Spalte. */
    if (/^INSERT INTO ereignis \(id, ts, tag, art, quelle, vorgang, artikel, ort, menge, wer\)/.test(s)) {
      t.ereignis.push({ id: b[0], ts: b[1], tag: b[2], art: b[3], quelle: "vorgang",
                        vorgang: b[4], artikel: b[5], ort: b[6], menge: b[7], wer: b[8] });
      return { rows: [] };
    }
    if (/^INSERT INTO ereignis \(id, ts, tag, art, quelle, notiz\)/.test(s)) {
      t.ereignis.push({ id: b[0], ts: b[1], tag: b[2], art: "korrektur",
                        quelle: b[3], notiz: b[4] });
      return { rows: [] };
    }
    if (/^INSERT INTO ereignis /.test(s))
      throw new Error("Neue Spaltenliste in ereignis — Attrappe nachziehen: " + s);

    /* ── stamm / mapping ──────────────────────────────────────────── */
    if (/^SELECT schluessel, daten FROM stamm$/.test(s)) return { rows: t.stamm };
    if (/^SELECT kassenname, artikel, ignoriert(, rezept)? FROM mapping$/.test(s))
      return { rows: t.mapping };

    if (/^INSERT INTO mapping /.test(s)) {
      const [kassenname, artikel, ignoriert, rezept, wer, ts] = b;
      const alt = t.mapping.find(m => m.kassenname === kassenname);
      if (alt) Object.assign(alt, { artikel, ignoriert, rezept, wer, ts });
      else t.mapping.push({ kassenname, artikel, ignoriert, rezept, wer, ts });
      return { rows: [] };
    }
    if (/^UPDATE fassungszeile SET artikel = \?1 WHERE kassenname = \?2$/.test(s)) {
      t.fassungszeile.filter(z => z.kassenname === b[1]).forEach(z => (z.artikel = b[0]));
      return { rows: [] };
    }

    throw new Error("D1-Attrappe kennt diese Abfrage nicht: " + s);
  };

  const prepare = sql => {
    const mach = b => ({
      bind: (...n) => mach(n),
      all: async () => ({ results: fuehre(sql, b) .rows, success: true }),
      first: async () => fuehre(sql, b).rows[0] || null,
      run: async () => (fuehre(sql, b), { success: true }),
      _sql: sql, _bind: b
    });
    return mach([]);
  };

  return {
    tabellen: t,
    prepare,
    batch: async stmts => Promise.all(stmts.map(s => s.run()))
  };
}
