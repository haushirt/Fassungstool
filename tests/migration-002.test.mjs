/* ═══════════════════════════════════════════════════════════════════════
   Migration 002 · die Ausschankmenge, mit und ohne Spalte

   Projektregel: Ein neues Modul steht hinter einem Feature-Flag — ohne
   eingespielte Migration bleibt es unsichtbar, und der Rest des Tools
   läuft unverändert. Casimir spielt Migrationen selbst ein; zwischen dem
   Merge und seinem Klick in der D1-Konsole liegt eine Zeitspanne, in der
   der neue Worker auf der ALTEN Datenbank läuft. Genau diese Spanne wird
   hier nachgestellt.

   Warum es nicht reicht, das „einfach zu wissen": Die Prüfungen bauen
   ihre Datenbank aus `docs/live-schema.sql`, und dort steht die Spalte,
   sobald die Migration eingeplant ist. Jede gewöhnliche Prüfung sieht
   deshalb NUR den Zustand „Spalte da" — der gefährliche Zustand ist der
   andere. `d1Vor()` nimmt die Spalte wieder heraus, und zwar anhand der
   Migrationsdatei selbst, damit die Datei mitgeprüft wird.

   Was ohne die Spalte NIE passieren darf:
     · ein 500 (die App wertet 500 als „Server antwortet nicht" und hält
       die Offline-Reihe an — der Fund aus Runde 19)
     · ein stilles Wegwerfen der Zahl
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt, d1Vor, migrationSql, SCHEMA_DA } from "./hilfe/d1-echt.mjs";

const DATEI = "002_mapping_ausschank.sql";
const CODE = "7314";                       /* nur in dieser Prüfung */
let worker;
before(async () => { worker = await ladeWorker(); });

async function haus(DB) {
  const env = { DB, TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Casimir", rolle: "leitung", code: CODE } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env);
  assert.equal(a.status, 200, "Anmeldung");
  return { env, keks: keksAus(a) };
}
const schreibe = (env, keks, body) => worker.fetch(
  anfrage("/api/mapping", { method: "POST", keks, body }), env);
const lies = async (env, keks) =>
  (await worker.fetch(anfrage("/api/mapping", { keks }), env)).json();

describe("Ohne eingespielte Migration bleibt alles beim Alten", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt", }, () => {

  test("die Prüf-Datenbank hat die Spalte wirklich nicht", () => {
    /* Die Gegenprobe zur Gegenprobe: Wäre sie doch da, prüften die drei
       Punkte darunter nichts. */
    const DB = d1Vor(DATEI);
    assert.equal(DB.sql("PRAGMA table_info(mapping)")
      .some(r => r.name === "ausschank_ml"), false);
  });

  test("der Schalter sagt Nein, und die Antwort trägt keine Spalte", async () => {
    const { env, keks } = await haus(d1Vor(DATEI));
    await schreibe(env, keks, { kassenname: "Weißer Spritzer", artikel: "spritzer" });
    const j = await lies(env, keks);
    assert.equal(j.kann.ausschank, false);
    assert.equal("ausschank_ml" in j.mapping[0], false,
      "ohne Spalte darf das Feld auch nicht erfunden werden");
    assert.equal(j.mapping[0].kassenname, "Weißer Spritzer");
  });

  test("ein Schreibversuch gibt 422 mit Klartext, nie 500", async () => {
    const { env, keks } = await haus(d1Vor(DATEI));
    const a = await schreibe(env, keks,
      { kassenname: "Weißer Spritzer", artikel: "spritzer", ausschank_ml: 200 });
    assert.equal(a.status, 422, "500 hielte die Offline-Reihe an");
    assert.match((await a.json()).fehler, /Migration 002/);
  });

  test("und er legt auch sonst nichts an — ganz oder gar nicht", async () => {
    const { env, keks } = await haus(d1Vor(DATEI));
    await schreibe(env, keks,
      { kassenname: "Weißer Spritzer", artikel: "spritzer", ausschank_ml: 200 });
    assert.deepEqual(env.DB.zeilen("mapping"), [],
      "abgewiesen heißt abgewiesen, nicht halb geschrieben");
  });

  test("eine gewöhnliche Zuordnung geht weiter durch", async () => {
    const { env, keks } = await haus(d1Vor(DATEI));
    const a = await schreibe(env, keks,
      { kassenname: "GV Leindl Langenlois 1/8 l", artikel: "w001", gebinde_ml: 750 });
    assert.equal(a.status, 200);
    assert.equal(env.DB.zeilen("mapping")[0].gebinde_ml, 750);
  });
});

describe("Mit eingespielter Migration", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt" }, () => {

  test("die Datei tut genau das, was sie verspricht", () => {
    /* Die Migrationsdatei selbst läuft hier — nicht eine Abschrift. */
    const DB = d1Vor(DATEI);
    DB.sql(migrationSql(DATEI));
    const sp = DB.sql("PRAGMA table_info(mapping)").find(r => r.name === "ausschank_ml");
    assert.ok(sp, "die Spalte fehlt nach der Migration");
    assert.equal(sp.type, "INTEGER");
    assert.equal(sp.notnull, 0, "nullable — sonst stünden die 21 alten Zeilen quer");
  });

  test("auf der frisch migrierten Datenbank wird geschrieben und gelesen", async () => {
    const DB = d1Vor(DATEI);
    DB.sql(migrationSql(DATEI));
    const { env, keks } = await haus(DB);
    const a = await schreibe(env, keks,
      { kassenname: "Weißer Spritzer", artikel: "spritzer",
        gebinde_ml: 1000, ausschank_ml: 200 });
    assert.equal(a.status, 200, JSON.stringify(await a.clone().json()));
    const j = await lies(env, keks);
    assert.equal(j.kann.ausschank, true);
    assert.deepEqual(j.mapping, [{ kassenname: "Weißer Spritzer", artikel: "spritzer",
      ignoriert: 0, gebinde_ml: 1000, ausschank_ml: 200 }]);
  });

  test("der Radler bekommt seine 250, obwohl der Name 500 sagt", async () => {
    const { env, keks } = await haus(d1Echt());
    await schreibe(env, keks,
      { kassenname: "Radler 0,5l 0,5l", artikel: "fasspils", ausschank_ml: 250 });
    assert.equal(env.DB.zeilen("mapping")[0].ausschank_ml, 250);
  });
});

/* ═════ Die Falle, in die `gebinde_ml` schon einmal getappt ist ═══════
   `POST /api/mapping` schreibt die Zeile als GANZES (`ON CONFLICT … DO
   UPDATE SET …`). Wer beim Artikelwechsel das Gebinde nicht mitschickt,
   löscht es. Die neue Spalte darf das nicht erben: sie steht nicht in der
   SET-Liste, sondern in einer eigenen Anweisung, die nur läuft, wenn der
   Körper das Feld ausdrücklich nennt. */
describe("Drei Zustände: fehlt · null · Zahl", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt" }, () => {

  const setUp = async () => {
    const h = await haus(d1Echt());
    await schreibe(h.env, h.keks,
      { kassenname: "Radler 0,5l 0,5l", artikel: "fasspils", ausschank_ml: 250 });
    return h;
  };

  test("Feld fehlt → der Wert bleibt stehen", async () => {
    const { env, keks } = await setUp();
    await schreibe(env, keks, { kassenname: "Radler 0,5l 0,5l",
      artikel: "fasspils", gebinde_ml: 50000 });
    const [m] = env.DB.zeilen("mapping");
    assert.equal(m.ausschank_ml, 250, "eine Gebindeänderung darf sie nicht mitnehmen");
    assert.equal(m.gebinde_ml, 50000);
  });

  test("Feld null → der Wert wird gelöscht", async () => {
    const { env, keks } = await setUp();
    await schreibe(env, keks, { kassenname: "Radler 0,5l 0,5l",
      artikel: "hell", ausschank_ml: null });
    assert.equal(env.DB.zeilen("mapping")[0].ausschank_ml, null);
  });

  test("Feld Zahl → der Wert wird gesetzt", async () => {
    const { env, keks } = await setUp();
    await schreibe(env, keks, { kassenname: "Radler 0,5l 0,5l",
      artikel: "fasspils", ausschank_ml: 150 });
    assert.equal(env.DB.zeilen("mapping")[0].ausschank_ml, 150);
  });

  test("0 und Unsinn werden zu nichts, nicht zu einer 0", async () => {
    /* Eine 0 hieße „nichts kommt ins Glas" — das ist keine Angabe,
       sondern eine fehlende. `flaschen()` rechnet mit 0 nicht. */
    const { env, keks } = await setUp();
    await schreibe(env, keks, { kassenname: "Radler 0,5l 0,5l",
      artikel: "fasspils", ausschank_ml: 0 });
    assert.equal(env.DB.zeilen("mapping")[0].ausschank_ml, null);
  });
});

/* ═════ Der Schreibweg für die Artikelgrössen (Runde 23) ═══════════════
   `stamm` steht seit je live und war leer: `GET /api/stamm` las sie, ein
   Schreibweg fehlte ganz. Keine Migration nötig — die Tabelle ist da. */
describe("POST /api/stamm", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt" }, () => {

  const GRO = { w001: { g: 750, a: 125 }, fasspils: { g: 50000 } };
  const schreibStamm = (env, keks, body) => worker.fetch(
    anfrage("/api/stamm", { method: "POST", keks, body }), env);

  test("die Leitung schreibt, und es kommt zurück", async () => {
    const { env, keks } = await haus(d1Echt());
    const a = await schreibStamm(env, keks, { schluessel: "groessen", wert: GRO });
    assert.equal(a.status, 200, JSON.stringify(await a.clone().json()));
    const j = await (await worker.fetch(anfrage("/api/stamm", { keks }), env)).json();
    assert.deepEqual(j.groessen, GRO);
    const [z] = env.DB.zeilen("stamm");
    assert.equal(z.schluessel, "groessen");
    assert.equal(z.wer, "Casimir", "wer es war, steht dabei");
    assert.ok(z.geaendert > 0);
  });

  test("ein zweites Mal überschreibt, es bleibt EINE Zeile", async () => {
    const { env, keks } = await haus(d1Echt());
    await schreibStamm(env, keks, { schluessel: "groessen", wert: GRO });
    await schreibStamm(env, keks, { schluessel: "groessen", wert: { w001: { g: 1500 } } });
    assert.equal(env.DB.zeilen("stamm").length, 1);
    const j = await (await worker.fetch(anfrage("/api/stamm", { keks }), env)).json();
    assert.deepEqual(j.groessen, { w001: { g: 1500 } });
  });

  test("der Service darf nicht", async () => {
    const DB = d1Echt();
    const env = { DB, TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
    await worker.fetch(anfrage("/api/anlage", { method: "POST",
      body: { name: "Asad", rolle: "service", code: "8261" } }), env);
    const an = await worker.fetch(anfrage("/api/anmelden",
      { method: "POST", body: { code: "8261" } }), env);
    const a = await worker.fetch(anfrage("/api/stamm", { method: "POST",
      keks: keksAus(an), body: { schluessel: "groessen", wert: GRO } }), env);
    assert.equal(a.status, 403);
    assert.deepEqual(env.DB.zeilen("stamm"), []);
  });

  test("ohne Schlüssel oder Wert: 422, nicht 500", async () => {
    const { env, keks } = await haus(d1Echt());
    assert.equal((await schreibStamm(env, keks, { wert: GRO })).status, 422);
    assert.equal((await schreibStamm(env, keks, { schluessel: "groessen" })).status, 422);
    assert.deepEqual(env.DB.zeilen("stamm"), []);
  });

  test("eine beschädigte Zeile lässt den ganzen Abruf nicht scheitern", async () => {
    /* Vorher warf `JSON.parse` und der GET gab 500 — eine kaputte Zeile
       hätte damit die Artikelgrössen aller Geräte mitgerissen. */
    const { env, keks } = await haus(d1Echt());
    env.DB.sql("INSERT INTO stamm (schluessel,wert,geaendert,wer) VALUES (?,?,?,?)",
      "kaputt", "{kein json", Date.now(), "Prüfung");
    await schreibStamm(env, keks, { schluessel: "groessen", wert: GRO });
    const r = await worker.fetch(anfrage("/api/stamm", { keks }), env);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.deepEqual(j.groessen, GRO, "das Gute kommt trotzdem durch");
    assert.equal(j.kaputt, null, "und das Kaputte sagt ehrlich nichts");
  });
});
