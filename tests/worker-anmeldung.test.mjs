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
const wuerfel = (n = 4) => String(randomInt(10 ** (n - 1), 10 ** n));
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

  /* Runde 15 · Die Sperre staffelt. Seit der Code vier Stellen hat, ist sie
     der einzige Schutz — zehntausend Möglichkeiten sind sonst an einem
     Abend durch. Die ersten zehn Fehlversuche kosten eine Viertelstunde,
     die nächsten zehn eine halbe, danach eine ganze. */
  test("die zweite Sperre dauert doppelt so lang wie die erste", async () => {
    const env = await haus();
    for (let i = 0; i < 10; i++) await anmelden(env, CODE_FALSCH);
    const erste = await (await anmelden(env, CODE_FALSCH)).json();
    const dauerErste = erste.wartenBis - Date.now();
    assert.ok(dauerErste > 14 * 60 * 1000 && dauerErste <= 15 * 60 * 1000 + 2000,
      "die erste Sperre ist keine Viertelstunde: " + Math.round(dauerErste / 1000) + " s");

    /* Zehn weitere Fehlversuche — die Sperre selbst zählt nicht mit, sie
       antwortet ja mit 429, bevor irgendetwas gerechnet wird. Also direkt
       in die Tabelle, so wie die Zeilen dort stünden. */
    for (let i = 0; i < 10; i++)
      env.DB.sql("INSERT INTO anmeldeversuch (ip, ts, ok) VALUES (?, ?, 0)",
                 "10.0.0.1", Date.now());
    const zweite = await (await anmelden(env, CODE_FALSCH)).json();
    const dauerZweite = zweite.wartenBis - Date.now();
    assert.ok(dauerZweite > 29 * 60 * 1000,
      "die zweite Sperre ist keine halbe Stunde: " + Math.round(dauerZweite / 1000) + " s");
  });

  test("die dritte Stufe ist die letzte — eine Stunde, nicht mehr", async () => {
    const env = await haus();
    for (let i = 0; i < 100; i++)
      env.DB.sql("INSERT INTO anmeldeversuch (ip, ts, ok) VALUES (?, ?, 0)",
                 "10.0.0.1", Date.now());
    const j = await (await anmelden(env, CODE_FALSCH)).json();
    const dauer = j.wartenBis - Date.now();
    assert.ok(dauer > 59 * 60 * 1000 && dauer <= 60 * 60 * 1000 + 2000,
      "bei hundert Fehlversuchen ist die Sperre nicht eine Stunde: "
      + Math.round(dauer / 1000) + " s");
  });

  test("alte Fehlversuche zählen nicht ewig mit", async () => {
    const env = await haus();
    /* Zwölf Fehlversuche, aber drei Stunden alt — ausserhalb des
       Gedächtnisses. Wer heute davorsteht, kommt hinein. */
    for (let i = 0; i < 12; i++)
      env.DB.sql("INSERT INTO anmeldeversuch (ip, ts, ok) VALUES (?, ?, 0)",
                 "10.0.0.1", Date.now() - 3 * 60 * 60 * 1000);
    assert.equal((await anmelden(env, CODE_LEITUNG)).status, 200);
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

  test("drei oder fünf Ziffern: 422 mit einem lesbaren Satz", async () => {
    const env = await haus();
    for (const falsch of [wuerfel(3), wuerfel(5)]) {
      const a = await anlegen(env, falsch);
      assert.equal(a.status, 422, falsch);
      assert.match((await a.json()).fehler, /genau 4 Ziffern/);
    }
    assert.equal(env.DB.zeilen("person").length, 2, "keine Zeile dazugekommen");
  });

  test("Buchstaben oder Leerzeichen: 422, nicht 500", async () => {
    const env = await haus();
    for (const falsch of ["abcd", "1 23", wuerfel(9), ""]) {
      const a = await anlegen(env, falsch);
      assert.equal(a.status, 422, JSON.stringify(falsch));
    }
  });

  test("vier Ziffern gehen — und melden sich danach an", async () => {
    const env = await haus();
    const code = wuerfel();
    assert.equal((await anlegen(env, code, "Vier")).status, 200);
    const an = await anmelden(env, code, "10.0.0.44");
    assert.equal(an.status, 200, "kommt hinein");
    assert.equal((await an.json()).name, "Vier");
  });

  /* Runde 15 · Der Weg zurück von sechs auf vier Stellen.
     Die Länge wird nur beim VERGEBEN geprüft. Wessen Prüfsumme zu einem
     längeren Code gehört, kommt weiter hinein — sonst wäre die Umstellung
     eine geschlossene Tür für genau die Person, die neue Codes vergeben
     soll. Die Zeile wird deshalb an `personSchreiben` vorbei gesetzt,
     genau so, wie sie heute in der Live-D1 steht. */
  test("ein längerer Code von früher kommt weiter hinein", async () => {
    const alt = wuerfel(6);
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
    assert.equal(a.status, 200, "der längere Code wird nicht mehr angenommen");
    assert.equal((await a.json()).rolle, "leitung");
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Runde 15 · PIN zurücksetzen

   Der neue Code wird vom Server gewürfelt, GENAU EINMAL zurückgegeben und
   nur als Prüfsumme gespeichert. Diese Prüfungen halten den Wert nirgends
   fest, sie prüfen die Form und die Wirkung (harte Regel 9).           */

describe("PIN zurücksetzen", () => {
  const zuruecksetzen = (env, id, keks) => worker.fetch(
    anfrage("/api/person/pin", { method: "POST", body: { id }, keks }), env);

  const alsLeitung = async env => keksAus(await anmelden(env, CODE_LEITUNG));

  test("nur die Leitung darf", async () => {
    const env = await haus();
    const p = env.DB.zeilen("person").find(x => x.name === "Asad");
    assert.equal((await zuruecksetzen(env, p.id)).status, 401, "ohne Anmeldung");
    const service = keksAus(await anmelden(env, CODE_SERVICE, "10.0.0.9"));
    assert.equal((await zuruecksetzen(env, p.id, service)).status, 403, "als Service");
  });

  test("gibt einen Code der richtigen Länge zurück, genau einmal", async () => {
    const env = await haus();
    const keks = await alsLeitung(env);
    const p = env.DB.zeilen("person").find(x => x.name === "Asad");
    const a = await zuruecksetzen(env, p.id, keks);
    assert.equal(a.status, 200);
    const j = await a.json();
    assert.match(String(j.pin), /^\d{4}$/, "der neue Code hat nicht vier Ziffern");
    assert.equal(j.name, "Asad");
  });

  test("gespeichert wird nur die Prüfsumme, und sie ist eine neue", async () => {
    const env = await haus();
    const keks = await alsLeitung(env);
    const vorher = env.DB.zeilen("person").find(x => x.name === "Asad");
    const j = await (await zuruecksetzen(env, vorher.id, keks)).json();
    const nachher = env.DB.zeilen("person").find(x => x.name === "Asad");

    assert.notEqual(nachher.code_hash, vorher.code_hash, "die Prüfsumme ist dieselbe");
    assert.notEqual(nachher.salt, vorher.salt, "das Salz ist dasselbe");
    /* Nirgends in der Zeile steht der Code im Klartext. */
    assert.equal(JSON.stringify(nachher).includes(j.pin), false,
      "der neue Code steht im Klartext in der Datenbank");
  });

  test("der neue Code kommt hinein, der alte nicht mehr", async () => {
    const env = await haus();
    const keks = await alsLeitung(env);
    const p = env.DB.zeilen("person").find(x => x.name === "Asad");
    const j = await (await zuruecksetzen(env, p.id, keks)).json();

    const alt = await anmelden(env, CODE_SERVICE, "10.0.0.7");
    assert.equal(alt.status, 401, "der alte Code kommt noch hinein");
    const neu = await anmelden(env, j.pin, "10.0.0.8");
    assert.equal(neu.status, 200, "der neue Code kommt nicht hinein");
    assert.equal((await neu.json()).name, "Asad");
  });

  test("der gewürfelte Code kollidiert nicht mit einem anderen", async () => {
    /* Beim Anmelden wird jeder Code gegen JEDE Person gerechnet. Zwei
       Personen mit demselben Code hiessen: die erste gewinnt, und im
       Protokoll steht der falsche Name. Bei vier Ziffern ist das kein
       Gedankenspiel — geprüft wird, dass der Worker neu würfelt. */
    const env = await haus();
    const keks = await alsLeitung(env);
    const p = env.DB.zeilen("person").find(x => x.name === "Asad");
    const j = await (await zuruecksetzen(env, p.id, keks)).json();
    assert.notEqual(j.pin, CODE_LEITUNG, "derselbe Code wie die Leitung");
  });

  test("eine unbekannte Person ist ein 404, kein 500", async () => {
    const env = await haus();
    const keks = await alsLeitung(env);
    assert.equal((await zuruecksetzen(env, "gibtsnicht", keks)).status, 404);
    assert.equal((await zuruecksetzen(env, "", keks)).status, 422);
  });
});
