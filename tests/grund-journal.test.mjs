/* ═══════════════════════════════════════════════════════════════════════
   Der Grund der Sonderentnahme im Journal — gegen das echte Schema

   Runde 14 schreibt den Grund einer Sonderentnahme als `grund=<key>` in
   `ereignis.notiz` (src/index.js, `grundNotiz`). Beide Einfüge-Abfragen
   haben dafür einen zehnten Parameter bekommen. Geprüft wurde das bisher
   nur als Text: `tests/oberflaeche-f.test.mjs` sucht die Zeile im
   Quelltext. Ob die Anweisung mit zehn Parametern gegen die LIVE-Spalten
   überhaupt läuft, stand nirgends — und genau daran ist das Tool in
   Runde 3 schon einmal gescheitert.

   Hier läuft deshalb der ganze Worker gegen SQLite aus
   `docs/live-schema.sql`. Vier Lagen:
     · Sonderentnahme MIT Grund → `notiz` trägt `grund=bruch`
     · Sonderentnahme OHNE Grund (Paket von VOR dem Deploy) → leer, kein
       Fehler, die Mengen kommen an
     · Korrektur danach (zweite Abfrage, `vorgang-korrektur`) → auch dort
       reist der Grund mit
     · ein erfundener Grund wird nicht übernommen
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt, SCHEMA_DA } from "./hilfe/d1-echt.mjs";

const CODE = "418823";
let worker;
before(async () => { worker = await ladeWorker(); });

async function haus() {
  const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Asad", rolle: "service", code: CODE } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env);
  assert.equal(a.status, 200, "Anmeldung");
  return { env, keks: keksAus(a) };
}

const SCH = "nach_2026-09-18";
const entnahme = (mehr = {}) => ({
  mode: "nach", tag: "2026-09-18", name: "Asad", geraet: "iphone-1", zaehlnr: 1,
  ent: { w026: 2 }, gent: {}, gzusatz: {}, finished: true,
  zeit: "2026-09-18T22:40:00.000Z", ...mehr
});
const put = (env, keks, daten) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(SCH),
    { method: "PUT", keks, body: daten }), env);

describe("Der Grund der Sonderentnahme im Journal", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt — ohne die Datei gibt es nichts zu prüfen" }, () => {

  test("mit Grund: `notiz` trägt grund=bruch, zehn Parameter halten", async () => {
    const { env, keks } = await haus();
    const a = await put(env, keks, entnahme({ grund: "bruch" }));
    assert.equal(a.status, 200, JSON.stringify(await a.clone().json()));
    const e = env.DB.zeilen("ereignis").filter(z => z.artikel !== "");
    assert.equal(e.length, 1);
    assert.equal(e[0].art, "entnahme");
    assert.equal(e[0].menge, 2);
    assert.equal(e[0].quelle, "vorgang");
    assert.equal(e[0].notiz, "grund=bruch");
  });

  /* Der Fall, der beim Livegang zählt: ein Vorgang, der VOR dem Deploy
     offline angefangen wurde, kennt das Feld gar nicht. */
  test("ohne Grund (Paket von vor dem Deploy): leer, aber kein Fehler", async () => {
    const { env, keks } = await haus();
    const a = await put(env, keks, entnahme());
    assert.equal(a.status, 200, JSON.stringify(await a.clone().json()));
    const e = env.DB.zeilen("ereignis").filter(z => z.artikel !== "");
    assert.equal(e.length, 1, "die Entnahme kommt trotzdem an");
    assert.equal(e[0].menge, 2);
    assert.equal(e[0].notiz, "", "leer, nicht NULL — die Spalte lässt beides zu");
  });

  test("die Korrektur danach trägt den Grund ebenfalls", async () => {
    const { env, keks } = await haus();
    await put(env, keks, entnahme({ grund: "kueche" }));
    await put(env, keks, entnahme({ grund: "kueche", ent: { w026: 5 }, zaehlnr: 2 }));
    const e = env.DB.zeilen("ereignis").filter(z => z.artikel !== "");
    const korr = e.filter(z => z.quelle === "vorgang-korrektur");
    assert.equal(korr.length, 1, "die Differenz kommt als NEUE Zeile (Regel 6)");
    assert.equal(korr[0].menge, 3, "5 − 2");
    assert.equal(korr[0].notiz, "grund=kueche");
  });

  test("ein erfundener Grund wird nicht übernommen", async () => {
    const { env, keks } = await haus();
    await put(env, keks, entnahme({ grund: "was anderes" }));
    const e = env.DB.zeilen("ereignis").filter(z => z.artikel !== "");
    assert.equal(e[0].notiz, "");
  });

  /* Nur die Sonderentnahme trägt einen Grund. Stünde er auch an der
     Tagesfassung, wäre `notiz` dort belegt, bevor jemand sie für etwas
     anderes verwenden kann. */
  test("andere Modi bleiben ohne Notiz", async () => {
    const { env, keks } = await haus();
    await worker.fetch(anfrage("/api/vorgang/tag_2026-09-18",
      { method: "PUT", keks, body: { mode: "tag", tag: "2026-09-18", name: "Asad",
        grund: "bruch", barrot: { w001: 2 }, bar: {}, backup: {}, rest: {},
        finished: true } }), env);
    const e = env.DB.zeilen("ereignis").filter(z => z.artikel !== "");
    assert.equal(e.length, 1);
    assert.equal(e[0].notiz, "");
  });
});
