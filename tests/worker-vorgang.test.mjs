/* Vorgänge schreiben: Idempotenz, zwei Geräte, Ereignisjournal,
   kaputte Körper. Der Vorgang ist ein vollständiger Zustand mit dem
   Schlüssel <modus>_<tag>; doppeltes Senden darf nichts verdoppeln. */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";

const CODE = "5519";               /* nur in dieser Prüfung */
let worker;
before(async () => { worker = await ladeWorker(); });

async function haus() {
  const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Asad", rolle: "service", code: CODE } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env);
  return { env, keks: keksAus(a) };
}

const SCHLUESSEL = "tag_2026-09-16";
const fassung = (zaehlnr, mehr = {}) => ({
  mode: "tag", tag: "2026-09-16", name: "Asad", geraet: "iphone-1", zaehlnr,
  barrot: { w001: 2 }, bar: {}, backup: {}, rest: { w002: 1 },
  zeit: "2026-09-16T23:10:00.000Z", ...mehr
});

const put = (env, keks, daten, sch = SCHLUESSEL) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(sch),
    { method: "PUT", keks, body: daten }), env);

describe("Vorgang schreiben", () => {
  test("ohne Sitzung: 401, und nichts steht in der Datenbank", async () => {
    const { env } = await haus();
    const a = await put(env, null, fassung(1));
    assert.equal(a.status, 401);
    assert.equal(env.DB.tabellen.vorgang.length, 0);
  });

  test("dasselbe Paket zweimal: eine Zeile, ein Satz Ereignisse", async () => {
    const { env, keks } = await haus();
    const d = fassung(1, { finished: true });
    const a = await put(env, keks, d);
    const b = await put(env, keks, d);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(env.DB.tabellen.vorgang.length, 1, "ein Vorgang je Schlüssel");
    const e1 = env.DB.tabellen.ereignis.length;
    await put(env, keks, d);
    assert.equal(env.DB.tabellen.ereignis.length, e1, "keine doppelten Ereignisse");
    assert.ok(e1 > 0, "der abgeschlossene Vorgang hat Ereignisse erzeugt");
  });

  test("laufender Vorgang bewegt den Bestand nicht", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1));                 /* finished fehlt */
    assert.equal(env.DB.tabellen.ereignis.length, 0);
    await put(env, keks, fassung(2, { finished: true }));
    assert.ok(env.DB.tabellen.ereignis.length > 0);
  });

  test("älterer Stand von einem zweiten Gerät: 409, Serverstand bleibt", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(5, { barrot: { w001: 9 } }));
    const alt = await put(env, keks, fassung(3, { barrot: { w001: 1 }, geraet: "ipad-2" }));
    assert.equal(alt.status, 409);
    const j = await alt.json();
    assert.equal(j.konflikt, true);
    assert.equal(j.server.zaehlnr, 5, "der Server nennt seinen Stand");
    assert.equal(JSON.parse(env.DB.tabellen.vorgang[0].daten).barrot.w001, 9);
  });

  test("gleiche Zählnummer gewinnt die spätere Ankunft (kein 409)", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(2, { barrot: { w001: 4 } }));
    const b = await put(env, keks, fassung(2, { barrot: { w001: 7 } }));
    assert.equal(b.status, 200);
    assert.equal(JSON.parse(env.DB.tabellen.vorgang[0].daten).barrot.w001, 7);
  });

  test("unvollständiger Vorgang: 422", async () => {
    const { env, keks } = await haus();
    assert.equal((await put(env, keks, { zaehlnr: 1 })).status, 422);
  });

  test("kaputter Körper: 400 mit Klartext, kein 500", async () => {
    const { env, keks } = await haus();
    const a = await worker.fetch(anfrage("/api/vorgang/" + SCHLUESSEL,
      { method: "PUT", keks, body: "{kaputt" }), env);
    assert.equal(a.status, 400);
    assert.match((await a.json()).fehler, /JSON/);
  });

  test("leerer Körper: 400, nicht 422 und nicht 500", async () => {
    const { env, keks } = await haus();
    const a = await worker.fetch(anfrage("/api/vorgang/" + SCHLUESSEL,
      { method: "PUT", keks, body: "" }), env);
    assert.equal(a.status, 400);
  });

  /* ── Bekannte Lücke, absichtlich festgehalten ──────────────────────
     Der Pfadschlüssel wird nicht gegen mode/tag im Körper geprüft. Wer
     das behebt (Backlog, mittel), bringt diese Prüfung zum Fallen — und
     soll sie dann auf 422 umschreiben, nicht löschen. */
  test("Schlüssel und Inhalt dürfen heute auseinanderlaufen (bekannt)", async () => {
    const { env, keks } = await haus();
    const a = await put(env, keks, fassung(1), "tag_2026-01-01");
    assert.equal(a.status, 200, "heute angenommen");
    assert.equal(env.DB.tabellen.vorgang[0].id, "tag_2026-01-01");
    assert.equal(env.DB.tabellen.vorgang[0].tag, "2026-09-16",
      "Kennung und Spalte tag zeigen auf verschiedene Tage");
  });

  /* War bis Runde 2 eine bekannte Lücke: `ereignisseAbleiten` stieg aus,
     sobald es zum Vorgang schon Ereignisse gab — die Korrektur erreichte
     den Bestand nie. Seit Runde 2 wird die Differenz gebucht; der Fall
     steht ausführlich unten in „Korrektur nach dem Abschluss". */
  test("eine Korrektur ändert den Vorgang UND das Journal", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, { finished: true, barrot: { w001: 2 } }));
    const vorher = env.DB.tabellen.ereignis.length;
    await put(env, keks, fassung(2, { finished: true, barrot: { w001: 20 } }));
    assert.ok(env.DB.tabellen.ereignis.length > vorher, "das Journal wächst mit");
    assert.equal(JSON.parse(env.DB.tabellen.vorgang[0].daten).barrot.w001, 20,
      "und der Vorgang zeigt die neue Zahl");
  });
});

/* ── Korrektur nach dem Abschluss ─────────────────────────────────────
   Die schwierige Stelle: Doppeltes Senden darf nichts verdoppeln, eine
   Korrektur muss aber ankommen. Unterschieden wird am INHALT, nicht an
   der Zählnummer — deshalb prüft der zweite Fall ausdrücklich, dass eine
   höhere Zählnummer bei gleichem Inhalt nichts bucht. Gerechnet wird
   gegen `/api/bestand`, nicht gegen die Journalzeilen allein: dort läuft
   der Schaden auf, um den es geht. */
async function bestandVon(env, keks, id) {
  const r = await worker.fetch(anfrage("/api/bestand", { keks }), env);
  assert.equal(r.status, 200, "Bestand abfragen");
  return (await r.json()).bestand[id];
}

describe("Korrektur nach dem Abschluss", () => {
  /* Ohne Zählung kein Bestand (so rechnet `bestand()`), und alles vor der
     jüngsten Zählung zählt nicht mit. Die Zählung wird deshalb um eine
     Minute zurückdatiert, statt auf die Uhr zu hoffen. */
  async function gezaehlt(env, keks, reihen = 2) {
    await worker.fetch(anfrage("/api/vorgang/keller_2026-09-16", { method: "PUT", keks,
      body: { mode: "keller", tag: "2026-09-16", zaehlnr: 1, finished: true,
              zdone: { w001: 1 }, reihen: { w001: reihen }, einzel: { w001: 0 } } }), env);
    env.DB.sql("UPDATE ereignis SET ts = ts - 60000");
  }

  test("die Gegenbuchung kommt als neue Zeile, der Bestand zieht nach", async () => {
    const { env, keks } = await haus();
    await gezaehlt(env, keks);                       /* 2 Reihen = 12 Flaschen */

    await put(env, keks, fassung(1, { finished: true, barrot: { w001: 2 }, rest: {} }));
    assert.equal(await bestandVon(env, keks, "w001"), 10, "12 minus 2");

    await put(env, keks, fassung(2, { finished: true, barrot: { w001: 5 }, rest: {} }));
    assert.equal(await bestandVon(env, keks, "w001"), 7, "es waren doch fünf");

    const z = env.DB.tabellen.ereignis.filter(e => e.vorgang === SCHLUESSEL);
    assert.deepEqual(z.map(e => e.menge), [2, 3],
      "die erste Zeile bleibt stehen, die Differenz kommt dazu");
    assert.deepEqual(z.map(e => e.quelle), ["vorgang", "vorgang-korrektur"],
      "die Herkunft ist im Journal ablesbar");
  });

  test("derselbe Inhalt nochmal — auch mit neuer Zählnummer — bucht nichts", async () => {
    const { env, keks } = await haus();
    const d = fassung(3, { finished: true, barrot: { w001: 2 } });
    await put(env, keks, d);
    const n = env.DB.tabellen.ereignis.length;
    assert.ok(n > 0, "der erste Abschluss hat gebucht");
    await put(env, keks, d);
    await put(env, keks, { ...d, zaehlnr: 4 });
    await put(env, keks, { ...d, zaehlnr: 5, zeit: "2026-09-17T01:00:00.000Z" });
    assert.equal(env.DB.tabellen.ereignis.length, n,
      "Zählnummer und Uhrzeit allein sind keine Korrektur");
  });

  test("ein Wein, der aus der Fassung verschwindet, wird zurückgebucht", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, { finished: true, barrot: { w001: 2 }, rest: { w002: 1 } }));
    await put(env, keks, fassung(2, { finished: true, barrot: { w001: 2 }, rest: {} }));
    const w2 = env.DB.tabellen.ereignis.filter(e => e.artikel === "w002");
    assert.deepEqual(w2.map(e => e.menge), [1, -1], "Buchung und Gegenbuchung");
    assert.equal(w2.reduce((a, x) => a + x.menge, 0), 0, "unterm Strich nicht entnommen");
    assert.equal(env.DB.tabellen.ereignis.filter(e => e.artikel === "w001").length, 1,
      "was gleich blieb, wird nicht noch einmal gebucht");
  });

  test("eine berichtigte Zählung ist ein neuer Stand, keine Differenz", async () => {
    const { env, keks } = await haus();
    const zaehl = (nr, reihen) => worker.fetch(anfrage("/api/vorgang/keller_2026-09-16",
      { method: "PUT", keks, body: { mode: "keller", tag: "2026-09-16", zaehlnr: nr,
        finished: true, zdone: { w001: 1 }, reihen: { w001: reihen }, einzel: { w001: 0 } } }), env);

    await zaehl(1, 2);                                /* 12 */
    await zaehl(2, 3);                                /* doch 18 */
    /* Ohne Vermerkzeile: siehe „Kellerzählung: Reihen mal sechs". */
    const e = env.DB.tabellen.ereignis.filter(x => x.artikel !== "");
    assert.deepEqual(e.map(x => x.menge), [12, 18],
      "die 12 bleibt stehen, die 18 kommt dazu — nicht 6 als Differenz");
    assert.ok(e[1].ts > e[0].ts,
      "die jüngere Zählung trägt auch den jüngeren Zeitstempel, sonst entscheidet der Zufall");
    assert.equal(await bestandVon(env, keks, "w001"), 18);
  });

  test("das Journal wird nie gekürzt: jede Zeile von vorher steht noch da", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, { finished: true, barrot: { w001: 2 } }));
    const vorher = env.DB.tabellen.ereignis.map(e => e.id);
    await put(env, keks, fassung(2, { finished: true, barrot: { w001: 9 }, rest: {} }));
    const nachher = env.DB.tabellen.ereignis.map(e => e.id);
    assert.deepEqual(nachher.slice(0, vorher.length), vorher, "append-only (Regel 6)");
  });
});

describe("Ereignisse aus der Tagesfassung", () => {
  test("Bar, Restaurant und Zusatz werden je Artikel zusammengezählt", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, {
      finished: true,
      barrot: { w001: 2 }, bar: { w001: 1 }, backup: {}, rest: { w001: 3, w002: 1 },
      zusatz: { w005: 2 }
    }));
    const e = env.DB.tabellen.ereignis;
    const menge = id => e.filter(x => x.artikel === id).reduce((a, x) => a + x.menge, 0);
    assert.equal(menge("w001"), 6, "2 + 1 + 3");
    assert.equal(menge("w002"), 1);
    assert.equal(menge("w005"), 2, "Zusatzentnahme zählt mit");
    assert.ok(e.every(x => x.art === "entnahme" && x.ort === "keller"));
    assert.ok(e.every(x => x.vorgang === SCHLUESSEL));
  });

  test("holtN übersteuert die Summe: gezählt wird, was wirklich geholt wurde", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, {
      finished: true, barrot: { w001: 5 }, bar: {}, backup: {}, rest: {},
      holtN: { w001: 2 }
    }));
    const e = env.DB.tabellen.ereignis.filter(x => x.artikel === "w001");
    assert.equal(e.reduce((a, x) => a + x.menge, 0), 2);
  });

  test("Menge 0 erzeugt keine Zeile", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, {
      finished: true, barrot: { w001: 0 }, bar: {}, backup: {}, rest: {}
    }));
    assert.equal(env.DB.tabellen.ereignis.length, 0);
  });

  test("Kellerzählung: Reihen mal sechs plus Einzelflaschen", async () => {
    const { env, keks } = await haus();
    const d = { mode: "keller", tag: "2026-09-16", zaehlnr: 1, finished: true,
      zdone: { w001: 1, w002: 1 }, reihen: { w001: 3, w002: 0 },
      einzel: { w001: 2, w002: 5 } };
    await worker.fetch(anfrage("/api/vorgang/keller_2026-09-16",
      { method: "PUT", keks, body: d }), env);
    /* `artikel <> ''` seit Runde 19: Dieser Prüfstand meldet sich als
       `service` an und schreibt eine Kellerzählung — dafür wäre
       `wirtschaft` nötig. Der Worker lässt das durch (Entscheidung
       Casimir: melden, nicht sperren) und legt einen Vermerk ins
       Journal. Ein Vermerk ist keine Buchung; der Worker selbst trennt
       beide genauso (`bestand()`, `artikel <> ''`). */
    const e = env.DB.tabellen.ereignis.filter(x => x.artikel !== "");
    assert.equal(e.find(x => x.artikel === "w001").menge, 20);
    assert.equal(e.find(x => x.artikel === "w002").menge, 5);
    assert.ok(e.every(x => x.art === "zaehlung"));
  });

  test("Wareneingang: Kisten mal Kistengrösse, Standard sechs", async () => {
    const { env, keks } = await haus();
    const d = { mode: "ware", tag: "2026-09-16", zaehlnr: 1, finished: true,
      pos: [{ id: "w001", kisten: 2 }, { id: "w003", kisten: 1, kg: 12 },
            { id: "__neu", kisten: 5 }, { id: "w004", kisten: 0 }] };
    await worker.fetch(anfrage("/api/vorgang/ware_2026-09-16",
      { method: "PUT", keks, body: d }), env);
    /* Ohne Vermerkzeile: siehe „Kellerzählung: Reihen mal sechs". */
    const e = env.DB.tabellen.ereignis.filter(x => x.artikel !== "");
    assert.equal(e.find(x => x.artikel === "w001").menge, 12);
    assert.equal(e.find(x => x.artikel === "w003").menge, 12);
    assert.equal(e.find(x => x.artikel === "__neu"), undefined, "Platzhalter zählt nicht");
    assert.equal(e.find(x => x.artikel === "w004"), undefined, "null Kisten zählen nicht");
    assert.ok(e.every(x => x.art === "eingang"));
  });
});
