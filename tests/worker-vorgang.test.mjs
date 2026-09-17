/* Vorgänge schreiben: Idempotenz, zwei Geräte, Ereignisjournal,
   kaputte Körper. Der Vorgang ist ein vollständiger Zustand mit dem
   Schlüssel <modus>_<tag>; doppeltes Senden darf nichts verdoppeln. */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Attrappe } from "./hilfe/d1-attrappe.mjs";

const CODE = "551907";               /* nur in dieser Prüfung */
let worker;
before(async () => { worker = await ladeWorker(); });

async function haus() {
  const env = { DB: d1Attrappe(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
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

  /* ── Zweite bekannte Lücke: Korrektur nach dem Abschluss ───────────
     ereignisseAbleiten steigt aus, sobald der Vorgang schon Ereignisse
     hat. Ein korrigierter, erneut abgeschlossener Vorgang ändert dann
     die Anzeige, aber nicht den Bestand. Das Journal ist append-only —
     die Korrektur müsste als neue Zeile dazukommen, nicht entfallen. */
  test("Korrektur nach dem Abschluss erreicht den Bestand nicht (bekannt)", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, { finished: true, barrot: { w001: 2 } }));
    const vorher = env.DB.tabellen.ereignis.map(e => [e.artikel, e.menge]);
    await put(env, keks, fassung(2, { finished: true, barrot: { w001: 20 } }));
    const nachher = env.DB.tabellen.ereignis.map(e => [e.artikel, e.menge]);
    assert.deepEqual(nachher, vorher, "Journal unverändert");
    assert.equal(JSON.parse(env.DB.tabellen.vorgang[0].daten).barrot.w001, 20,
      "der Vorgang zeigt aber die neue Zahl");
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
    const e = env.DB.tabellen.ereignis;
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
    const e = env.DB.tabellen.ereignis;
    assert.equal(e.find(x => x.artikel === "w001").menge, 12);
    assert.equal(e.find(x => x.artikel === "w003").menge, 12);
    assert.equal(e.find(x => x.artikel === "__neu"), undefined, "Platzhalter zählt nicht");
    assert.equal(e.find(x => x.artikel === "w004"), undefined, "null Kisten zählen nicht");
    assert.ok(e.every(x => x.art === "eingang"));
  });
});
