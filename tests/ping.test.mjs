/* `/api/ping` — die eine Zeile, an der Casimir sieht, ob der Worker steht.

   Sie ist das Erste, was nach einem Livegang aufgerufen wird, und ihre
   Form steht in keiner Doku: `{ok, personen, anlage, zeit}`. Wer ein Feld
   umbenennt oder die Antwort um die Zählung erleichtert, merkt es sonst
   erst, wenn jemand um sieben Uhr früh eine leere Seite ansieht.

   Die Prüfung hält deshalb nicht „irgendetwas kommt zurück" fest, sondern
   genau diese vier Felder, ihren Typ und den Fall ohne Datenbank (500 mit
   Klartext statt nacktem 1101 — Falle 10). */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";

let worker;
before(async () => { worker = await ladeWorker(); });

describe("/api/ping", () => {
  test("antwortet mit ok, personen, anlage und zeit", async () => {
    const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis" };
    const a = await worker.fetch(anfrage("/api/ping"), env);
    assert.equal(a.status, 200);
    const j = await a.json();

    assert.deepEqual(Object.keys(j).sort(), ["anlage", "ok", "personen", "zeit"],
      "die Antwortform von /api/ping hat sich geändert");
    assert.equal(j.ok, true);
    assert.equal(typeof j.personen, "number");
    assert.equal(j.anlage, false, "ohne ANLAGE_OFFEN ist die Selbstanlage zu");
    assert.equal(typeof j.zeit, "number");
  });

  test("zählt die angelegten Personen mit", async () => {
    const DB = d1Echt();
    const env = { DB, TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
    const vorher = await (await worker.fetch(anfrage("/api/ping"), env)).json();
    assert.equal(vorher.personen, 0);
    assert.equal(vorher.anlage, true, "mit ANLAGE_OFFEN meldet ping es auch");

    await worker.fetch(anfrage("/api/anlage", { method: "POST",
      body: { name: "Ilse", rolle: "leitung", code: "4007" } }), env);

    const nachher = await (await worker.fetch(anfrage("/api/ping"), env)).json();
    assert.equal(nachher.personen, 1);
  });

  test("ohne D1-Bindung 500 mit Klartext, nicht 1101", async () => {
    const a = await worker.fetch(anfrage("/api/ping"), { TOKEN_SECRET: "x" });
    assert.equal(a.status, 500);
    const j = await a.json();
    assert.equal(j.ok, false);
    assert.match(j.fehler, /D1/);
  });

  test("braucht keine Anmeldung — sonst taugt sie nicht zur Prüfung", async () => {
    const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis" };
    const a = await worker.fetch(anfrage("/api/ping"), env);
    assert.notEqual(a.status, 401);
  });
});
