/* Was passiert, wenn die Datenbank nein sagt?

   Der Router fängt Fehler ab, schreibt Methode, Pfad und Stack in die
   Logs und antwortet mit 500 und Klartext — das war der Sinn von Falle 10
   („Error 1101 ist nicht automatisch ein CPU-Limit: erst Logs, dann
   Hypothese"). Damit das trägt, muss der `try` den Fehler auch sehen: Wer
   `return handler(env)` schreibt statt `return await handler(env)`, gibt
   ein Versprechen aus der Hand, das erst NACH dem `try` platzt. Der
   `catch` läuft dann nie, es gibt keine Logzeile und keine 500 — die
   Laufzeit meldet dem Gerät ein nacktes 1101.

   Diese Prüfungen halten genau das fest. Sie sind rot, sobald irgendwo im
   Router wieder ein `await` fehlt. */

import { test, describe, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Attrappe } from "./hilfe/d1-attrappe.mjs";

let worker;
before(async () => { worker = await ladeWorker(); });

/* Eine Datenbank, die bei einer bestimmten Abfrage zusammenbricht — so
   wie D1 es tut, wenn eine Spalte fehlt oder die Bindung nicht passt. */
function bruch(muster, meldung = "D1_ERROR: no such column: menge") {
  const db = d1Attrappe();
  const echt = db.prepare.bind(db);
  db.prepare = sql => {
    if (!muster.test(sql.replace(/\s+/g, " "))) return echt(sql);
    const platzt = async () => { throw new Error(meldung); };
    const st = { bind: () => st, all: platzt, first: platzt, run: platzt };
    return st;
  };
  return db;
}

async function haus(db) {
  const env = { DB: db, TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Asad", rolle: "leitung", code: "400071" } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: "400071" } }), env);
  return { env, keks: keksAus(a) };
}

/* console.error gehört dem Prüflauf nicht — sie wird geliehen und
   zurückgegeben, sonst verschluckt eine fehlgeschlagene Prüfung die
   Ausgabe aller folgenden. */
let logs, alt;
beforeEach(() => { logs = []; alt = console.error;
  console.error = (...a) => logs.push(a.join(" ")); });
afterEach(() => { console.error = alt; });

describe("Datenbankfehler im Router", () => {
  test("/api/bestand: 500 mit Klartext statt geplatzter Antwort", async () => {
    const { env, keks } = await haus(bruch(/FROM ereignis WHERE artikel IS NOT NULL/));
    const r = await worker.fetch(anfrage("/api/bestand", { keks }), env);
    assert.equal(r.status, 500);
    assert.match((await r.json()).fehler, /no such column/);
  });

  test("und die Zeile steht in den Logs: Methode, Pfad, Meldung", async () => {
    const { env, keks } = await haus(bruch(/FROM ereignis WHERE artikel IS NOT NULL/));
    await worker.fetch(anfrage("/api/bestand", { keks }), env);
    const z = logs.join("\n");
    assert.match(z, /api-fehler/);
    assert.match(z, /GET/);
    assert.match(z, /\/api\/bestand/);
    assert.match(z, /no such column/);
  });

  test("PUT /api/vorgang: dasselbe beim Schreiben", async () => {
    const { env, keks } = await haus(bruch(/INSERT INTO vorgang/));
    const r = await worker.fetch(anfrage("/api/vorgang/tag_2026-09-16",
      { method: "PUT", keks, body: { mode: "tag", tag: "2026-09-16", zaehlnr: 1 } }), env);
    assert.equal(r.status, 500);
    assert.match(logs.join("\n"), /PUT \/api\/vorgang\/tag_2026-09-16/);
  });

  test("/api/vorgaenge: beim Lesen ebenso", async () => {
    const { env, keks } = await haus(bruch(/FROM vorgang WHERE tag BETWEEN/));
    const r = await worker.fetch(anfrage("/api/vorgaenge", { keks }), env);
    assert.equal(r.status, 500);
    assert.match(logs.join("\n"), /\/api\/vorgaenge/);
  });

  test("/api/anmelden: ein Fehler sperrt niemanden aus, er wird gemeldet", async () => {
    const env = { DB: bruch(/FROM anmeldeversuch/), TOKEN_SECRET: "x", ANLAGE_OFFEN: "1" };
    const r = await worker.fetch(anfrage("/api/anmelden",
      { method: "POST", body: { code: "000000" } }), env);
    assert.equal(r.status, 500);
    assert.match(logs.join("\n"), /\/api\/anmelden/);
  });
});

/* Damit die Prüfung oben nicht bloss zufällig grün ist: Der Code, der
   sie tragen soll, muss auch dastehen. Jede Übergabe an einen Handler
   innerhalb des `try` wird abgewartet. */
describe("Router: keine unbeaufsichtigten Versprechen", () => {
  test("jeder Handler-Aufruf im try steht hinter await", async () => {
    const { lies } = await import("./hilfe/dateien.mjs");
    const q = lies("src", "index.js");
    const a = q.indexOf("async fetch(request, env)");
    const e = q.indexOf("async email(message, env, ctx)");
    const router = q.slice(a, e);
    const handler = ["anmelden", "bestand", "vorgaengeLesen", "vorgangSchreiben",
                     "personSchreiben", "mappingSchreiben", "fassungsliste",
                     "fassungslistenLesen"];
    for (const h of handler) {
      const treffer = [...router.matchAll(new RegExp("return\\s+(await\\s+)?" + h + "\\(", "g"))];
      const ternaer = [...router.matchAll(new RegExp("\\?\\s*(await\\s+)?" + h + "\\(", "g"))];
      for (const t of [...treffer, ...ternaer])
        assert.ok(t[1], "ohne await: " + t[0] + " — der catch sieht den Fehler nie");
    }
  });
});
