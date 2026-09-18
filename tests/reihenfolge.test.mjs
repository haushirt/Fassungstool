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

   Entschieden (review/ENTSCHIEDEN-NACHTS.md, Punkt 8; er korrigiert
   Punkt 5): Bei gleichem Betriebstag gilt die KELLERZÄHLUNG immer als
   Erstes — sie ist der Anfangsbestand des Tages. Alles andere desselben
   Tages zählt danach, untereinander in beliebiger Reihenfolge. Die
   Ankunftszeit entscheidet innerhalb eines Tages nichts mehr.

   Der Grund (Fund A/8-3): `ts` ist der Zeitpunkt, zu dem das Paket beim
   Server ankommt. Im Keller ist kein Netz — das iPad zählt vormittags und
   bleibt unten, die Tagesfassung geht abends vom iPhone hinaus, das iPad
   kommt am nächsten Morgen herauf. Nach Ankunft gerechnet war die Zählung
   dann jünger als die Entnahme desselben Tages: 10 Flaschen statt 4.

   Die Falle bleibt: `tag > Zähltag` ALLEIN ist falsch — was am Abend des
   Zähltags gefasst wird, fiele sonst unter den Tisch.

   Nachtrag v30 (er verengt Punkt 8 an einer Stelle): Für den WARENEINGANG
   desselben Betriebstages gilt „zählt danach" NICHT. Ob die Zählung die
   Lieferung schon gesehen hat, ist nicht feststellbar — `ts` ist die
   Ankunftszeit beim Server, und die Zählung trägt keinen erfassten
   Zeitpunkt. Seit v30 wird eine Lieferung des Zähltages deshalb nicht
   addiert (sonst zählte sie doppelt: 34 statt 10), sondern als `unklar`
   ausgewiesen; das Backoffice sagt es an der Zahl. Entnahmen desselben
   Tages zählen unverändert nach der Zählung.

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
   `ts`. Für die Bestandsrechnung ist das seit v29 gleichgültig — sie ordnet
   nach Betriebstag und Rang —, für die feste Reihenfolge ZWEIER Zählungen
   desselben Tages aber nicht. Die Pause hält die Prüfung von der Uhr
   unabhängig. */
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
  return { worker: j, backoffice: B.rechne(liste) };
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

describe("Betriebstag, dann Kellerzählung: eine Reihenfolge für beide Fassungen", () => {
  test("vormittags gezählt, mittags geliefert → 10 und eine Angabe", async () => {
    /* Bis v29 stand hier 34 — die Lieferung wurde auf die Zählung
       addiert. Sie kann aber längst im Keller gestanden haben, als
       gezählt wurde: `ts` ist die Ankunftszeit beim Server, nicht der
       Zeitpunkt im Keller. Seit v30 zählt die Zählung, die Lieferung des
       Zähltages wird ausgewiesen statt addiert (`unklar`). */
    const e = await spiele([zaehlung(TAG, 1, 4), lieferung(TAG, 2, 12)]);
    assert.equal(e.worker.bestand.w003, 10, "Worker");
    assert.equal(e.backoffice.B.b.w003, 10, "Backoffice");
    assert.equal(e.worker.unklar.w003, 24, "Worker weist die Lieferung aus");
    assert.equal(e.backoffice.B.unklar.w003, 24, "Backoffice weist sie ebenso aus");
    assert.equal(e.backoffice.B.seit.ein.w003, undefined,
      "sie darf nicht als „seither eingegangen“ gelten — sie ist nicht gerechnet");
  });

  test("die Falle: am Morgen gezählt, am Abend desselben Tages gefasst", async () => {
    /* `tag > Zähltag` allein würde diese Entnahme verschlucken. */
    const e = await spiele([zaehlung(TAG, 2, 0), tagesfassung(TAG, 3)]);
    assert.equal(e.worker.bestand.w003, 9, "Worker: 12 − 3");
    assert.equal(e.backoffice.B.b.w003, 9, "Backoffice: 12 − 3");
    assert.equal(e.backoffice.B.seit.raus.w003, 3);
  });

  test("was VOR der Zählung liegt, zählt in beiden Fassungen nicht", async () => {
    const e = await spiele([lieferung(VORTAG, 2, 12), zaehlung(TAG, 1, 4)]);
    assert.equal(e.worker.bestand.w003, 10, "Worker: die Zählung ist die Wahrheit");
    assert.equal(e.backoffice.B.b.w003, 10, "Backoffice");
    assert.equal(e.backoffice.B.seit.ein.w003, undefined);
  });

  test("ganzer Tagesablauf: zählen, liefern, fassen, nachfüllen", async () => {
    const e = await spiele([
      zaehlung(TAG, 1, 4),          /* 10 */
      lieferung(TAG, 2, 12),        /* am Zähltag: nicht gerechnet, ausgewiesen */
      tagesfassung(TAG, 6),         /* −6  → 4 */
      { mode: "nach", tag: TAG, name: "Asad", geraet: "ipad-1", zaehlnr: 1,
        finished: true, ent: { w003: 2 }, gent: {}, gzusatz: {} }   /* −2 → 2 */
    ]);
    assert.equal(e.worker.bestand.w003, 2, "Worker");
    assert.equal(e.backoffice.B.b.w003, 2, "Backoffice");
    assert.equal(e.worker.unklar.w003, 24, "die Lieferung des Zähltages steht daneben");
    assert.equal(e.backoffice.B.unklar.w003, 24, "Backoffice");
  });

  test("Fall 2 · die Zählung kommt erst am nächsten Morgen herauf", async () => {
    /* Der Alltagsfall aus Fund A/8-3, und der Grund für Punkt 8: Die
       Reihenfolge in `spiele()` IST die Ankunftsreihenfolge — hier kommt
       die Tagesfassung zuerst an, die Zählung desselben Betriebstages
       danach. Bis v28 rechneten beide Fassungen 10 (die Entnahme fiel
       ganz weg) und der Banner sagte „Seither 0 Flaschen entnommen". */
    const e = await spiele([tagesfassung(TAG, 6), zaehlung(TAG, 1, 4)]);
    assert.equal(e.worker.bestand.w003, 4, "Worker: 10 − 6");
    assert.equal(e.backoffice.B.b.w003, 4, "Backoffice: 10 − 6");
    assert.equal(e.backoffice.B.seit.raus.w003, 6);
  });

  test("Fall 3 und 4 · gleicher und fehlender Zeitstempel", () => {
    /* Nur im Backoffice prüfbar: den `ts` der Journalzeilen setzt der
       Worker selbst aus der Uhr, zwei gleiche gibt es dort nicht auf
       Bestellung. Fall 3: zwei Pakete mit demselben Stempel. Fall 4: ein
       Altarchiv oder eine Dateieinlesung ganz ohne Stempel. Beide ergaben
       bis v28 10 statt 4. */
    const gleich = B.rechne([
      Object.assign(tagesfassung(TAG, 6), { archiviert: TAG + "T09:00:00.000Z" }),
      Object.assign(zaehlung(TAG, 1, 4), { archiviert: TAG + "T09:00:00.000Z" })
    ]);
    assert.deepEqual(Array.from(gleich.reihe), ["keller", "tag"]);
    assert.equal(gleich.B.b.w003, 4, "gleicher Zeitstempel");

    const ohne = B.rechne([tagesfassung(TAG, 6), zaehlung(TAG, 1, 4)]);
    assert.equal(ohne.B.b.w003, 4, "gar kein Zeitstempel");
  });

  test("Fall 6 · eine Zählung von gestern kommt nach der Fassung von heute", async () => {
    /* Betriebstag 16. gezählt, aber erst nach der Tagesfassung des 17.
       hochgekommen. Der Worker rechnete das bis v28 anders als das
       Backoffice (10 gegen 4) — genau die zwei Wahrheiten, die Punkt 8
       schließen soll. */
    const e = await spiele([tagesfassung(VORTAG, 0), tagesfassung(TAG, 6),
                            zaehlung(VORTAG, 1, 4)]);
    assert.equal(e.worker.bestand.w003, 4, "Worker: die Zählung vom 15. ist die Basis");
    assert.equal(e.backoffice.B.b.w003, 4, "Backoffice");
  });

  test("Fall 7 · die Lieferung des Zähltages wird ausgewiesen, nicht addiert", async () => {
    /* Der eine Fall, den keine Reihenfolge entscheiden kann: Stand die
       Lieferung schon im Keller, als gezählt wurde, oder kam sie danach?
       Die Ankunftszeit beim Server sagt es nicht (genau deshalb rechnet
       seit v29 niemand mehr mit ihr) — und die Zählung selbst trägt
       keinen erfassten Zeitpunkt.

       Bis v29 wurde addiert: 10 gezählte + 24 gelieferte = 34, obwohl die
       24 in den 10 schon enthalten sein können. Seit v30 gilt die Zählung
       als die härtere Tatsache (sie hat die Flaschen gesehen), die
       Lieferung des Zähltages steht daneben als Angabe. Die Zahl ist damit
       im Zweifel zu niedrig statt zu hoch: jemand geht nachsehen, statt
       dass eine Bestellung ausbleibt.

       Beide Ankunftsreihenfolgen ergeben dieselbe Zahl — das ist der
       Sinn der Regel. */
    const nachher = await spiele([zaehlung(TAG, 1, 4), lieferung(TAG, 2, 12)]);
    assert.equal(nachher.worker.bestand.w003, 10);
    assert.equal(nachher.backoffice.B.b.w003, 10);

    const vorher = await spiele([lieferung(TAG, 2, 12), zaehlung(TAG, 1, 4)]);
    assert.equal(vorher.worker.bestand.w003, 10, "Worker");
    assert.equal(vorher.backoffice.B.b.w003, 10, "Backoffice — dieselbe Zahl");
    assert.equal(vorher.worker.unklar.w003, 24, "Worker weist die Menge aus");
    assert.equal(vorher.backoffice.B.unklar.w003, 24, "Backoffice ebenso");
    assert.deepEqual(Array.from(vorher.backoffice.reihe), ["keller", "ware"],
      "die Kellerzählung steht als Erstes ihres Betriebstages");
  });

  test("eine Lieferung NACH dem Zähltag zählt weiterhin ganz normal", async () => {
    /* Die Gegenprobe zur neuen Regel: nur der Zähltag SELBST ist unklar.
       Am Tag danach hat die Zählung die Flaschen sicher nicht gesehen. */
    const e = await spiele([zaehlung(VORTAG, 1, 4), lieferung(TAG, 2, 12)]);
    assert.equal(e.worker.bestand.w003, 34, "Worker: 10 + 24");
    assert.equal(e.backoffice.B.b.w003, 34, "Backoffice: 10 + 24");
    assert.equal(e.backoffice.B.seit.ein.w003, 24, "und der Banner nennt sie");
    assert.equal(e.worker.unklar.w003, undefined, "nichts auszuweisen");
    assert.equal(e.backoffice.B.unklar.w003, undefined);
  });

  test("ein laufender Stand ohne Zeitstempel zählt nach der Zählung seines Tages", () => {
    /* Der lokale Weg (`ladeDaten()` Stufe 2) reicht den gerade offenen
       Vorgang ohne `archiviert` herein. Er darf nicht vor die Zählung
       desselben Tages rutschen — das trägt seit v29 der Rang, nicht mehr
       der fehlende Zeitstempel. */
    const e = B.rechne([
      Object.assign(zaehlung(TAG, 1, 4), { archiviert: TAG + "T09:00:00.000Z" }),
      tagesfassung(TAG, 2)                                   /* ohne archiviert */
    ]);
    assert.deepEqual(Array.from(e.reihe), ["keller", "tag"]);
    assert.equal(e.B.b.w003, 8);
  });
});
