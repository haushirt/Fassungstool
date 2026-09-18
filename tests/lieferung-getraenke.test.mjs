/* Gelieferte Getränke: Eingang, nicht Entnahme — Worker UND Backoffice.

   Der Anlass (Fund A-3 der Jagd): `normVorgang` in `public/leitung.html`
   schob `gent` bis v26 unabhängig vom Modus nach `o.getr` („Getränke
   zusätzlich entnommen"). Im Wareneingang heisst `gent` aber GELIEFERT —
   genau der Vorzeichenfehler, den der Worker in v22 abgestellt hat
   (`src/index.js`, `if (d.mode === "ware") … zu("eingang", …)`).

   Auf dem Schirm sah das so aus: 24 gelieferte Cola standen in
   „Verkauf ↔ Fassung" mit Verkauf 0, Entnahme 24, Differenz +24 und der
   Deutung „mehr geholt als verkauft — Vorrat aufgebaut oder Schwund", und
   in der Vorgangsliste unter „Getränke Fl.".

   Geprüft wird DERSELBE Vorgang auf beiden Wegen: einmal echt durch den
   Worker (SQLite aus `docs/live-schema.sql`, Journal gelesen), einmal
   durch `normVorgang` aus dem ausgelieferten `leitung.html`.            */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";
import { ausschnitt } from "./hilfe/dateien.mjs";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");
function backoffice() {
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + "\nglobalThis.__b = { normVorgang };",
    s, { filename: "leitung.html#lieferung" });
  return s.__b;
}

const TAG = "2026-09-16";
const CODE = "518204";                 /* nur in dieser Prüfung */
let worker, B;
before(async () => { worker = await ladeWorker(); B = backoffice(); });

async function haus() {
  const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Asad", rolle: "wirtschaft", code: CODE } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env);
  return { env, keks: keksAus(a) };
}

const senden = (env, keks, daten, sch) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(sch),
    { method: "PUT", keks, body: daten }), env);

/* Was das Journal je Artikel sagt, getrennt nach Eingang und Entnahme. */
const journal = env => {
  const t = { eingang: {}, entnahme: {} };
  env.DB.tabellen.ereignis.forEach(r => {
    if (!t[r.art]) return;
    t[r.art][r.artikel] = (t[r.art][r.artikel] || 0) + (+r.menge || 0);
  });
  return t;
};

const LIEFERUNG = {
  mode: "ware", tag: TAG, name: "Asad", geraet: "ipad-1", zaehlnr: 1,
  zeit: TAG + "T12:00:00.000Z", archiviert: TAG + "T12:00:00.000Z", finished: true,
  pos: [{ id: "w003", kisten: 2, kistengr: 12 }], jok: {}, jneu: {}, ein: {},
  gent: { cola: 24, hell: 12 }
};

describe("Wareneingang: `gent` ist geliefert, nicht entnommen", () => {
  test("Worker und Backoffice buchen dieselben 36 Flaschen als EINGANG", async () => {
    const { env, keks } = await haus();
    const a = await senden(env, keks, LIEFERUNG, "ware_" + TAG);
    assert.equal(a.status, 200);
    const j = journal(env), o = B.normVorgang(LIEFERUNG);

    assert.equal(j.eingang.cola, 24, "Worker: Cola als Eingang");
    assert.equal(j.eingang.hell, 12, "Worker: Hefeweizen als Eingang");
    assert.equal(j.entnahme.cola, undefined, "Worker: keine Entnahme");

    assert.equal(o.eingang.cola, 24, "Backoffice: Cola als Eingang");
    assert.equal(o.eingang.hell, 12, "Backoffice: Hefeweizen als Eingang");
    assert.equal(o.getr.cola, undefined, "Backoffice: keine Entnahme");
    assert.equal(o.flGetr, 0, "die Spalte „Getränke Fl.“ zählt keine Lieferung");
  });

  test("die Lieferung erscheint nicht als Abweichung im Abgleich", async () => {
    /* Der eigentliche Schaden: `abgleich()` summiert `v.getr` in `ent`.
       Vor der Berichtigung standen hier Cola +24 und Hefeweizen +12 mit
       der Deutung „Vorrat aufgebaut oder Schwund". */
    const o = B.normVorgang(LIEFERUNG);
    assert.deepEqual(Object.keys(o.getr), [], "nichts auf der Entnahmeseite");
  });

  test("in jedem anderen Modus bleibt `gent` eine Entnahme", async () => {
    const { env, keks } = await haus();
    const nach = { mode: "nach", tag: TAG, name: "Asad", geraet: "ipad-1", zaehlnr: 1,
      zeit: TAG + "T18:00:00.000Z", archiviert: TAG + "T18:00:00.000Z", finished: true,
      ent: {}, gent: { cola: 6 }, gzusatz: {} };
    await senden(env, keks, nach, "nach_" + TAG);
    const j = journal(env), o = B.normVorgang(nach);
    assert.equal(j.entnahme.cola, 6, "Worker");
    assert.equal(o.getr.cola, 6, "Backoffice");
    assert.equal(o.eingang.cola, undefined);
  });

  test("`gzusatz` ist auch im Wareneingang eine Entnahme — in beiden Fassungen", async () => {
    /* Im Worker steht `gzusatz` ausserhalb des `ware`-Zweigs. Wer `gent`
       verschiebt, darf `gzusatz` nicht mitnehmen. */
    const { env, keks } = await haus();
    const d = Object.assign({}, LIEFERUNG, { gzusatz: { cola: 2 } });
    await senden(env, keks, d, "ware_" + TAG);
    const j = journal(env), o = B.normVorgang(d);
    assert.equal(j.entnahme.cola, 2, "Worker");
    assert.equal(j.eingang.cola, 24, "Worker: die Lieferung bleibt Eingang");
    assert.equal(o.getr.cola, 2, "Backoffice");
    assert.equal(o.eingang.cola, 24, "Backoffice: die Lieferung bleibt Eingang");
  });
});
