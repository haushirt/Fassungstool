/* Reihenfolge am selben Betriebstag — eine Zahl, nicht zwei.

   Der Anlass (Fund A-4 der Jagd): `nachZeit()` im Backoffice sortierte
   innerhalb eines Betriebstages nach einer gedachten Tagesordnung
   (`MODUSRANG = {ware:0, keller:1, tag:2, …}`). Der Wareneingang lag damit
   IMMER vor der Kellerzählung desselben Tages — der übliche Ablauf ist
   aber umgekehrt: vormittags zählen, mittags die Lieferung erfassen.

       Kellerzählung 16.09., w003 = 1 Reihe + 4  → 10 Flaschen
       Wareneingang  16.09., 2 Kisten à 12       → 24 Flaschen

       Backoffice bis v26: 10   („Seither 0 Flaschen eingegangen")
       Worker:             34

   Die Bestellliste rechnet auf derselben Zahl.

   Entschieden (review/ENTSCHIEDEN-NACHTS.md, Punkt 5 zu Offener
   Entscheidung Nr. 15): der Betriebstag entscheidet, der Zeitstempel nur
   bei Gleichstand innerhalb desselben Tages. Die Falle dabei: `tag >
   Zähltag` ALLEIN ist falsch — was am Abend des Zähltags gefasst wird,
   fiele sonst unter den Tisch.

   Geprüft wird derselbe Datensatz auf beiden Wegen: einmal echt durch den
   Worker (`/api/bestand`, SQLite aus `docs/live-schema.sql`), einmal durch
   `bestand()` aus dem ausgelieferten `leitung.html`.                     */

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
  vm.runInContext(QUELLE + `
    globalThis.__b = { nachZeit, normVorgang,
      /* Der Weg, den ladeDaten() geht: normieren, sortieren, rechnen. */
      rechne: liste => { VORGAENGE = liste.map(normVorgang).filter(Boolean).sort(nachZeit);
                         return { B: bestand(), reihe: VORGAENGE.map(v => v.mode) }; } };`,
    s, { filename: "leitung.html#reihenfolge" });
  return s.__b;
}

const TAG = "2026-09-16";
const VORTAG = "2026-09-15";
const CODE = "660941";                 /* nur in dieser Prüfung */
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

/* Zwei Vorgänge im selben Millisekundenschlag bekämen im Worker denselben
   `ts`; er zählt Gleichstand nicht als „danach" (`r.ts <= basis`). Diese
   Pause hält die Prüfung von der Uhr unabhängig. */
const kurzWarten = () => new Promise(r => setTimeout(r, 3));

/* Ein Vorgang schickt sich zum Worker und steht gleichzeitig in der Liste
   fürs Backoffice — mit `archiviert` als Zeitstempel, genau wie ihn
   `vorgaengeLesen` aus `vorgang.geaendert` herausgibt. */
async function spiele(schritte) {
  const { env, keks } = await haus();
  const liste = [];
  for (const d of schritte) {
    const a = await worker.fetch(anfrage(
      "/api/vorgang/" + encodeURIComponent(d.mode + "_" + d.tag),
      { method: "PUT", keks, body: d }), env);
    assert.equal(a.status, 200, "Worker nahm " + d.mode + " nicht an");
    /* Der Worker schreibt `geaendert` selbst; für das Backoffice zählt
       dieselbe Reihenfolge, deshalb der Stempel aus der Antwort der Uhr. */
    liste.push(Object.assign({}, d, { archiviert: new Date(Date.now()).toISOString() }));
    await kurzWarten();
  }
  const r = await worker.fetch(anfrage("/api/bestand", { keks }), env);
  const j = await r.json();
  return { worker: j.bestand, backoffice: B.rechne(liste) };
}

const zaehlung = (tag, reihen, einzel) => ({
  mode: "keller", tag, name: "Asad", geraet: "ipad-1", zaehlnr: 1, finished: true,
  zdone: { w003: 1 }, reihen: { w003: reihen }, einzel: { w003: einzel }, getr: {}
});
const lieferung = (tag, kisten, gr) => ({
  mode: "ware", tag, name: "Asad", geraet: "ipad-1", zaehlnr: 1, finished: true,
  pos: [{ id: "w003", kisten, kistengr: gr }], jok: {}, jneu: {}, ein: {}, gent: {}
});
const tagesfassung = (tag, n) => ({
  mode: "tag", tag, name: "Asad", geraet: "ipad-1", zaehlnr: 1, finished: true,
  rest: { w003: n }, bar: {}, barrot: {}, backup: {}, zusatz: {}, seen: {},
  getr: {}, gent: {}
});

describe("Betriebstag vor Zeitstempel: eine Reihenfolge für beide Fassungen", () => {
  test("vormittags gezählt, mittags geliefert → 34 in beiden", async () => {
    const e = await spiele([zaehlung(TAG, 1, 4), lieferung(TAG, 2, 12)]);
    assert.equal(e.worker.w003, 34, "Worker");
    assert.equal(e.backoffice.B.b.w003, 34, "Backoffice");
    assert.equal(e.backoffice.B.seit.ein.w003, 24,
      "der Banner darf nicht „Seither 0 Flaschen eingegangen“ sagen");
  });

  test("die Falle: am Morgen gezählt, am Abend desselben Tages gefasst", async () => {
    /* `tag > Zähltag` allein würde diese Entnahme verschlucken. */
    const e = await spiele([zaehlung(TAG, 2, 0), tagesfassung(TAG, 3)]);
    assert.equal(e.worker.w003, 9, "Worker: 12 − 3");
    assert.equal(e.backoffice.B.b.w003, 9, "Backoffice: 12 − 3");
    assert.equal(e.backoffice.B.seit.raus.w003, 3);
  });

  test("was VOR der Zählung liegt, zählt in beiden Fassungen nicht", async () => {
    const e = await spiele([lieferung(VORTAG, 2, 12), zaehlung(TAG, 1, 4)]);
    assert.equal(e.worker.w003, 10, "Worker: die Zählung ist die Wahrheit");
    assert.equal(e.backoffice.B.b.w003, 10, "Backoffice");
    assert.equal(e.backoffice.B.seit.ein.w003, undefined);
  });

  test("ganzer Tagesablauf: zählen, liefern, fassen, nachfüllen", async () => {
    const e = await spiele([
      zaehlung(TAG, 1, 4),          /* 10 */
      lieferung(TAG, 2, 12),        /* +24 → 34 */
      tagesfassung(TAG, 6),         /* −6  → 28 */
      { mode: "nach", tag: TAG, name: "Asad", geraet: "ipad-1", zaehlnr: 1,
        finished: true, ent: { w003: 2 }, gent: {}, gzusatz: {} }   /* −2 → 26 */
    ]);
    assert.equal(e.worker.w003, 26, "Worker");
    assert.equal(e.backoffice.B.b.w003, 26, "Backoffice");
  });

  test("sortiert wird nach Tag und Zeitstempel, nicht nach Modus", () => {
    /* Bis v26 kam `ware` durch `MODUSRANG` immer zuerst — auch wenn die
       Lieferung Stunden nach der Zählung erfasst wurde. */
    const reihe = B.rechne([
      Object.assign(zaehlung(TAG, 1, 4), { archiviert: TAG + "T09:00:00.000Z" }),
      Object.assign(lieferung(TAG, 2, 12), { archiviert: TAG + "T12:00:00.000Z" })
    ]).reihe;
    assert.deepEqual(Array.from(reihe), ["keller", "ware"]);

    const umgekehrt = B.rechne([
      Object.assign(lieferung(TAG, 2, 12), { archiviert: TAG + "T08:00:00.000Z" }),
      Object.assign(zaehlung(TAG, 1, 4), { archiviert: TAG + "T10:00:00.000Z" })
    ]);
    assert.deepEqual(Array.from(umgekehrt.reihe), ["ware", "keller"]);
    assert.equal(umgekehrt.B.b.w003, 10,
      "wird nach der Lieferung gezählt, gilt die Zählung");
  });

  test("ein laufender Stand ohne Zeitstempel ist das Jüngste seines Tages", () => {
    /* Der lokale Weg (`ladeDaten()` Stufe 2) reicht den gerade offenen
       Vorgang ohne `archiviert` herein. Er darf nicht vor die Zählung
       desselben Tages rutschen. */
    const e = B.rechne([
      Object.assign(zaehlung(TAG, 1, 4), { archiviert: TAG + "T09:00:00.000Z" }),
      tagesfassung(TAG, 2)                                   /* ohne archiviert */
    ]);
    assert.deepEqual(Array.from(e.reihe), ["keller", "tag"]);
    assert.equal(e.B.b.w003, 8);
  });
});
