/* Flaschen je Kiste — dieselbe Lieferung durch den Worker UND durch das
   Backoffice.

   Der Anlass: `kistenGr()` in `public/leitung.html` las bis v25 das Feld
   `p.kg`. Die App hat es nie geschrieben; sie legt die Kistengröße als
   `kistengr` ab (`public/index.html`, `const kg=p=>+(p&&p.kistengr)||KISTE_STD`).
   Der Worker liest seit Runde 5 beide Namen. Eine Lieferung mit 2 Kisten
   à 20 Flaschen stand deshalb im Journal mit 40 und im Backoffice mit 12
   (Zwölfer-Standard aus `PLAN.kiste` für w003) — zwei Zahlen für dieselbe
   Lieferung, und keine Prüfung, die es gemerkt hätte.

   Diese Prüfung rechnet beide Wege aus DEMSELBEN Vorgang: einmal echt
   durch den Worker (SQLite aus `docs/live-schema.sql`, Journal gelesen),
   einmal durch `normVorgang` aus dem ausgelieferten `leitung.html`. Sie
   wird rot, sobald die beiden Fassungen wieder auseinanderlaufen.       */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";
import { ausschnitt } from "./hilfe/dateien.mjs";

/* ── Das Backoffice, so wie es ausgeliefert wird ────────────────────── */
const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");
function backoffice() {
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + "\nglobalThis.__b = { normVorgang, kistenGr };",
    s, { filename: "leitung.html#kisten" });
  return s.__b;
}

const TAG = "2026-09-16";
const CODE = "704318";                 /* nur in dieser Prüfung */
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

const lieferung = (pos, mehr = {}) => ({
  mode: "ware", tag: TAG, name: "Asad", geraet: "ipad-1", zaehlnr: 1,
  zeit: TAG + "T09:00:00.000Z", finished: true,
  pos, jok: {}, jneu: {}, ein: {}, gent: {}, ...mehr
});

const senden = (env, keks, daten, sch = "ware_" + TAG) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(sch),
    { method: "PUT", keks, body: daten }), env);

/* Was im Journal an Eingängen steht, je Artikel. */
const imJournal = env => {
  const t = {};
  env.DB.tabellen.ereignis.filter(r => r.art === "eingang")
    .forEach(r => { t[r.artikel] = (t[r.artikel] || 0) + (+r.menge || 0); });
  return t;
};

describe("Kistengröße: Worker und Backoffice rechnen dieselbe Zahl", () => {
  /* w003 ist der einzige Wein mit einem Eintrag in `PLAN.kiste` (12) —
     genau der Fall, an dem die beiden Fassungen auseinanderliefen. */
  const FAELLE = [
    ["2 Kisten à 20, wie die App sie schreibt", { id: "w003", kisten: 2, kistengr: 20 }, 40],
    ["altes Paket aus der Offline-Reihe mit `kg`", { id: "w003", kisten: 2, kg: 20 }, 40],
    ["ohne jede Angabe gilt der Standard 6", { id: "w003", kisten: 2 }, 12],
    ["ein Zwölfer, ausdrücklich angegeben", { id: "w001", kisten: 1, kistengr: 12 }, 12]
  ];

  for (const [satz, p, erwartet] of FAELLE)
    test(satz, async () => {
      const { env, keks } = await haus();
      const d = lieferung([p]);
      const a = await senden(env, keks, d);
      assert.equal(a.status, 200);
      const journal = imJournal(env)[p.id];
      const schirm = B.normVorgang(d).eingang[p.id];
      assert.equal(journal, erwartet, "Worker: " + journal);
      assert.equal(schirm, erwartet, "Backoffice: " + schirm);
      assert.equal(journal, schirm, "Journal und Schirm müssen dieselbe Zahl sagen");
    });

  test("`kistengr` geht vor `kg` — in beiden Fassungen gleich", () => {
    /* Die Rangfolge steht in `src/index.js` (`+x.kistengr || +x.kg || 6`).
       Ein Paket mit beiden Feldern ist unwahrscheinlich, aber die
       Reihenfolge darf nicht zufällig sein. */
    assert.equal(B.kistenGr({ id: "w003", kistengr: 20, kg: 6 }), 20);
    assert.equal(B.kistenGr({ id: "w003", kg: 20 }), 20);
    assert.equal(B.kistenGr({ id: "w003" }), 6, "kein stiller Zwölfer aus PLAN.kiste");
    assert.equal(B.kistenGr(null), 6);
  });

  test("eine ganze Lieferung: Summe im Journal = Summe auf dem Schirm", async () => {
    const { env, keks } = await haus();
    const d = lieferung([
      { id: "w003", kisten: 2, kistengr: 20 },
      { id: "w001", kisten: 3, kistengr: 6 },
      { id: "w018", kisten: 1, kistengr: 12 },
      { id: "__neu", kisten: 4, kistengr: 6 },      /* unbekannter Wein: zählt nirgends */
      { id: "w020", kisten: 0, kistengr: 6 }        /* nichts geliefert */
    ]);
    await senden(env, keks, d);
    const j = imJournal(env), sch = B.normVorgang(d).eingang;
    const summe = o => Object.values(o).reduce((a, b) => a + b, 0);
    assert.equal(summe(j), 40 + 18 + 12, "Worker");
    assert.equal(summe(sch), 40 + 18 + 12, "Backoffice");
    assert.deepEqual(Object.fromEntries(Object.entries(sch)), j);
  });
});
