/* Anmeldung, Sperre, Sitzung und Rechte des Workers.
   Was hier geprüft wird, ist der Ablauf — nicht das Schema (Regel 3,
   siehe tests/hilfe/d1-echt.mjs). */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";
import { randomInt } from "node:crypto";

/* Bei jedem Lauf gewürfelt statt im Quelltext festgeschrieben: So kann
   keine erfundene Ziffernfolge je zufällig mit einem Code aus dem Haus
   zusammenfallen und für immer in der Geschichte stehen (Regel 9).
   `tests/durchstich.cjs` macht es seit Runde 3 so. */
const wuerfel = (n = 6) => String(randomInt(10 ** (n - 1), 10 ** n));
const CODE_LEITUNG = wuerfel();
let CODE_SERVICE = wuerfel(); while (CODE_SERVICE === CODE_LEITUNG) CODE_SERVICE = wuerfel();
/* Ein Code, den es nicht gibt — für die Fehlversuche. Sieben Ziffern
   kollidieren mit keinem der beiden sechsstelligen oben. */
const CODE_FALSCH = wuerfel(7);

let worker;
before(async () => { worker = await ladeWorker(); });

/* Personen werden über den echten Weg angelegt (POST /api/anlage mit
   ANLAGE_OFFEN), damit die Prüfsummen mit denen der Anmeldung
   zusammenpassen und nirgends ein Code im Klartext gespeichert wird. */
async function haus() {
  const DB = d1Echt();
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
    const a = await anmelden(env, CODE_FALSCH);
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
      const a = await anmelden(env, CODE_FALSCH);
      assert.equal(a.status, 401, "Versuch " + (i + 1));
      gesehen.push((await a.json()).uebrig);
    }
    assert.deepEqual(gesehen, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);

    const zu = await anmelden(env, CODE_FALSCH);
    assert.equal(zu.status, 429);
    const j = await zu.json();
    assert.ok(j.wartenBis > Date.now(), "wartenBis liegt in der Zukunft");
    assert.ok(j.wartenBis <= Date.now() + 15 * 60 * 1000 + 1000,
      "wartenBis liegt höchstens ein Fenster voraus");
  });

  test("die Sperre trifft auch den richtigen Code — und nur diese IP", async () => {
    const env = await haus();
    for (let i = 0; i < 10; i++) await anmelden(env, CODE_FALSCH);
    assert.equal((await anmelden(env, CODE_LEITUNG)).status, 429);
    assert.equal((await anmelden(env, CODE_LEITUNG, "10.0.0.2")).status, 200,
      "ein zweites Haus, eine zweite IP, bleibt offen");
  });

  test("geglückte Anmeldung räumt die Fehlversuche ihrer IP weg", async () => {
    const env = await haus();
    for (let i = 0; i < 9; i++) await anmelden(env, CODE_FALSCH);
    assert.equal((await anmelden(env, CODE_LEITUNG)).status, 200);
    assert.equal(env.DB.tabellen.anmeldeversuch.filter(v => !v.ok).length, 0);
    /* und der nächste Vertipper fängt wieder bei neun an.
       Hier stand eine Bedingung (`(await anmelden(…)).json ? …`), die
       immer wahr war und dabei einen zusätzlichen Fehlversuch abgesetzt
       hat — geprüft wurde deshalb die 8 des ZWEITEN Versuchs, während
       der Kommentar von der 9 sprach. Ein Versuch, eine Zahl. */
    assert.equal((await (await anmelden(env, CODE_FALSCH)).json()).uebrig, 9);
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
    env.DB.sql("UPDATE person SET aktiv = 0 WHERE name = ?", "Asad");
    assert.equal((await worker.fetch(anfrage("/api/ich", { keks }), env)).status, 401);
  });

  test("unbekannter Endpunkt: 404, kein 500", async () => {
    const env = await haus();
    const keks = keksAus(await anmelden(env, CODE_LEITUNG));
    const a = await worker.fetch(anfrage("/api/gibtsnicht", { keks }), env);
    assert.equal(a.status, 404);
  });
});

/* ── Codevergabe ──────────────────────────────────────────────────────
   Auflage 2 vor dem Livegang: Die vier ersten Codes des Hauses standen im
   Klartext in der Geschichte des Anhangs und werden ersetzt — nicht wieder
   vierstellig. Was hier geprüft wird, ist die zweite Hälfte dieser
   Auflage: dass der Worker das Kurze nicht mehr vergibt, und dass die
   Umstellung niemanden aussperrt, solange sie läuft. */
describe("Codevergabe", () => {
  const anlegen = (env, code, name = "Neu") => worker.fetch(
    anfrage("/api/anlage", { method: "POST", body: { name, rolle: "service", code } }), env);

  test("vier oder fünf Ziffern: 422 mit einem lesbaren Satz", async () => {
    const env = await haus();
    for (const kurz of [wuerfel(4), wuerfel(5)]) {
      const a = await anlegen(env, kurz);
      assert.equal(a.status, 422, kurz);
      assert.match((await a.json()).fehler, /sechs bis acht Ziffern/);
    }
    assert.equal(env.DB.zeilen("person").length, 2, "keine Zeile dazugekommen");
  });

  test("Buchstaben oder Leerzeichen: 422, nicht 500", async () => {
    const env = await haus();
    for (const falsch of ["abcdef", "12 34 56", wuerfel(9), ""]) {
      const a = await anlegen(env, falsch);
      assert.equal(a.status, 422, JSON.stringify(falsch));
    }
  });

  test("sechs und acht Ziffern gehen — und melden sich danach an", async () => {
    const env = await haus();
    for (const [name, code] of [["Sechs", wuerfel(6)], ["Acht", wuerfel(8)]]) {
      assert.equal((await anlegen(env, code, name)).status, 200, name);
      const an = await anmelden(env, code, "10.0.0." + code.length);
      assert.equal(an.status, 200, name + " kommt hinein");
      assert.equal((await an.json()).name, name);
    }
  });

  test("ein Code aus der Zeit davor kommt weiter hinein, bis er ersetzt ist",
    async () => {
      /* Sonst wäre die Umstellung eine geschlossene Tür: Wer die neuen
         Codes vergeben will, muss sich vorher mit dem alten anmelden
         können. Die Zeile wird deshalb an `personSchreiben` vorbei
         gesetzt — genau so steht sie heute in der Live-D1. */
      const alt = wuerfel(4);
      const salt = Buffer.from("altes salz 16 B.").toString("base64");
      const k = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(alt), "PBKDF2", false, ["deriveBits"]);
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: Buffer.from(salt, "base64"),
          iterations: 1000 }, k, 256);
      const DB = d1Echt({ person: [{ id: "alt", name: "Vorher", rolle: "leitung",
        code_hash: Buffer.from(bits).toString("base64"), salt, aktiv: 1,
        angelegt: Date.now() }] });
      const env = { DB, TOKEN_SECRET: "pruefgeheimnis" };
      const a = await anmelden(env, alt);
      assert.equal(a.status, 200, "der alte Code wird nicht mehr angenommen");
      assert.equal((await a.json()).rolle, "leitung");
    });
});
