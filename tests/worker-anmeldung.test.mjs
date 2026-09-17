/* Anmeldung, Sperre, Sitzung und Rechte des Workers.
   Was hier geprüft wird, ist der Ablauf — nicht das Schema (Regel 3,
   siehe tests/hilfe/d1-attrappe.mjs). */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Attrappe } from "./hilfe/d1-attrappe.mjs";

const CODE_LEITUNG = "824613";      /* nur in dieser Prüfung, nie im Haus */
const CODE_SERVICE = "137902";

let worker;
before(async () => { worker = await ladeWorker(); });

/* Personen werden über den echten Weg angelegt (POST /api/anlage mit
   ANLAGE_OFFEN), damit die Prüfsummen mit denen der Anmeldung
   zusammenpassen und nirgends ein Code im Klartext gespeichert wird. */
async function haus() {
  const DB = d1Attrappe();
  const env = { DB, TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  for (const [name, rolle, code] of [["Casimir", "leitung", CODE_LEITUNG],
                                     ["Asad", "service", CODE_SERVICE]]) {
    const a = await worker.fetch(
      anfrage("/api/anlage", { method: "POST", body: { name, rolle, code } }), env);
    assert.equal(a.status, 200, "Person anlegen");
  }
  return env;
}

const anmelden = (env, code, ip = "10.0.0.1") =>
  worker.fetch(anfrage("/api/anmelden", { method: "POST", body: { code }, ip }), env);

describe("Anmeldung", () => {
  test("richtiger Code: Sitzungskeks und Rolle", async () => {
    const env = await haus();
    const a = await anmelden(env, CODE_LEITUNG);
    assert.equal(a.status, 200);
    const j = await a.json();
    assert.equal(j.name, "Casimir");
    assert.equal(j.rolle, "leitung");
    assert.match(a.headers.get("set-cookie") || "", /^hh_sitz=/);
  });

  test("falscher Code: 401 mit Restversuchen, ohne Auskunft über den Code", async () => {
    const env = await haus();
    const a = await anmelden(env, "000000");
    assert.equal(a.status, 401);
    const j = await a.json();
    assert.equal(j.uebrig, 9, "zehn Versuche, einer verbraucht");
    assert.equal(j.name, undefined);
    assert.equal(/existiert|unbekannter Name/.test(JSON.stringify(j)), false);
  });

  test("uebrig zählt 9 bis 0 herunter, dann sperrt es mit Uhrzeit", async () => {
    const env = await haus();
    const gesehen = [];
    for (let i = 0; i < 10; i++) {
      const a = await anmelden(env, "000000");
      assert.equal(a.status, 401, "Versuch " + (i + 1));
      gesehen.push((await a.json()).uebrig);
    }
    assert.deepEqual(gesehen, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);

    const zu = await anmelden(env, "000000");
    assert.equal(zu.status, 429);
    const j = await zu.json();
    assert.ok(j.wartenBis > Date.now(), "wartenBis liegt in der Zukunft");
    assert.ok(j.wartenBis <= Date.now() + 15 * 60 * 1000 + 1000,
      "wartenBis liegt höchstens ein Fenster voraus");
  });

  test("die Sperre trifft auch den richtigen Code — und nur diese IP", async () => {
    const env = await haus();
    for (let i = 0; i < 10; i++) await anmelden(env, "000000");
    assert.equal((await anmelden(env, CODE_LEITUNG)).status, 429);
    assert.equal((await anmelden(env, CODE_LEITUNG, "10.0.0.2")).status, 200,
      "ein zweites Haus, eine zweite IP, bleibt offen");
  });

  test("geglückte Anmeldung räumt die Fehlversuche ihrer IP weg", async () => {
    const env = await haus();
    for (let i = 0; i < 9; i++) await anmelden(env, "000000");
    assert.equal((await anmelden(env, CODE_LEITUNG)).status, 200);
    assert.equal(env.DB.tabellen.anmeldeversuch.filter(v => !v.ok).length, 0);
    /* und der nächste Vertipper fängt wieder bei neun an.
       Hier stand eine Bedingung (`(await anmelden(…)).json ? …`), die
       immer wahr war und dabei einen zusätzlichen Fehlversuch abgesetzt
       hat — geprüft wurde deshalb die 8 des ZWEITEN Versuchs, während
       der Kommentar von der 9 sprach. Ein Versuch, eine Zahl. */
    assert.equal((await (await anmelden(env, "000000")).json()).uebrig, 9);
  });

  test("leerer oder kaputter Körper sperrt niemanden aus, gibt aber 401", async () => {
    const env = await haus();
    const a = await worker.fetch(anfrage("/api/anmelden",
      { method: "POST", body: "{kaputt" }), env);
    assert.equal(a.status, 401);
  });
});

describe("Sitzung und Rechte", () => {
  test("ohne Keks: 401 auf allem hinter der Anmeldung", async () => {
    const env = await haus();
    for (const p of ["/api/ich", "/api/vorgaenge", "/api/stamm"]) {
      const a = await worker.fetch(anfrage(p), env);
      assert.equal(a.status, 401, p);
    }
  });

  test("gefälschter Keks: 401", async () => {
    const env = await haus();
    const a = await worker.fetch(anfrage("/api/ich",
      { keks: "hh_sitz=eyJpZCI6IngifQ.gefaelscht" }), env);
    assert.equal(a.status, 401);
  });

  test("Keks mit fremdem Geheimnis zählt nicht", async () => {
    const env = await haus();
    const keks = keksAus(await anmelden(env, CODE_LEITUNG));
    const fremd = { ...env, TOKEN_SECRET: "anderes-geheimnis" };
    assert.equal((await worker.fetch(anfrage("/api/ich", { keks }), fremd)).status, 401);
  });

  test("Rolle service darf keine Zuordnung schreiben (403), leitung schon", async () => {
    const env = await haus();
    const sKeks = keksAus(await anmelden(env, CODE_SERVICE, "10.0.0.3"));
    const lKeks = keksAus(await anmelden(env, CODE_LEITUNG, "10.0.0.4"));

    const s = await worker.fetch(anfrage("/api/mapping",
      { method: "POST", keks: sKeks, body: { kassenname: "Test", artikel: "w001" } }), env);
    assert.equal(s.status, 403);

    const l = await worker.fetch(anfrage("/api/mapping",
      { method: "POST", keks: lKeks, body: { kassenname: "Test", artikel: "w001" } }), env);
    assert.notEqual(l.status, 403);
  });

  test("abgemeldete Person (aktiv = 0) kommt mit altem Keks nicht mehr hinein", async () => {
    const env = await haus();
    const keks = keksAus(await anmelden(env, CODE_SERVICE));
    env.DB.tabellen.person.find(p => p.name === "Asad").aktiv = 0;
    assert.equal((await worker.fetch(anfrage("/api/ich", { keks }), env)).status, 401);
  });

  test("unbekannter Endpunkt: 404, kein 500", async () => {
    const env = await haus();
    const keks = keksAus(await anmelden(env, CODE_LEITUNG));
    const a = await worker.fetch(anfrage("/api/gibtsnicht", { keks }), env);
    assert.equal(a.status, 404);
  });
});
