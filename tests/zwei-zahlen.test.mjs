/* Zwei Zahlen je Artikel — und jede geht dorthin, wo sie hingehört.

   Es gibt zwei verschiedene Grössen, und das Tool hat bis Runde 20 nur
   eine behalten:

     A · „oben gefehlt"  = Soll − Ist an Bar, Restaurant, Backup, Lade.
                           Das ist der VERBRAUCH. Dagegen rechnet der
                           Z-Bericht.
     B · „aus dem Keller geholt" = was wirklich herausgetragen wurde.
                           Das geht vom BESTAND ab.

   Sie gehen genau dann auseinander, wenn im Lager weniger lag als
   gebraucht wurde. Die App nennt das „Abweichung" und fragt nach der
   „Tatsächlichen Menge" (`holtN`/`gholtN`); der Kommentar dort sagt:
   „Nur wenn im Lager etwas aus ist, klappt hier ein Feld auf."

   Dass A die Bezugsgrösse für die Kasse ist, stand von Anfang an in
   `review/OFFENE-ENTSCHEIDUNGEN.md` — der Code folgte dem Glossar in
   `UEBERGABE-TECHNISCH.md`, das beide gleichsetzt.

   Geprüft wird auf allen drei Wegen zugleich: echter Worker gegen
   SQLite aus `docs/live-schema.sql` (Journal und Bestand), und das
   ausgelieferte `leitung.html` im Sandkasten (Verbrauch und Abgleich).
   Die Gegenprobe ohne Abweichung steht mit drin: am Normalfall darf
   sich nichts ändern.                                                 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";
import { ausschnitt, lies } from "./hilfe/dateien.mjs";
import { parseZ } from "../src/gnparse.js";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");
const BERICHT = parseZ(lies("tests", "fixtures", "zbericht-37-extended.csv"));
const TAG = BERICHT.tag;
const CODE = "6620";                 /* nur in dieser Prüfung */

function backoffice() {
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout, Intl,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.zeichne = () => {};
    globalThis.__b = { normVorgang, abgleich, bestand, verbrauch, GSOLL,
      setzte: (map, geb, zber, roh) => { MAP = map || {}; GEB_BEST = geb || {};
        ZBER = zber || {}; REZ = {};
        VORGAENGE = (roh || []).map(normVorgang).filter(Boolean); },
      liste: () => VORGAENGE };`, s, { filename: "leitung.html#zwei-zahlen" });
  return s.__b;
}

let worker, B;
before(async () => { worker = await ladeWorker(); B = backoffice(); });

async function haus() {
  const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Lena", rolle: "leitung", code: CODE } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env);
  return { env, keks: keksAus(a) };
}
const senden = (env, keks, d, sch) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(sch),
    { method: "PUT", keks, body: d }), env);
const journalMenge = (env, id) => env.DB.tabellen.ereignis
  .filter(r => r.artikel === id && r.art === "entnahme")
  .reduce((a, r) => a + (+r.menge || 0), 0);

/* Eine Tagesfassung: oben fehlten sechs Flaschen w001 — drei im
   Restaurant, drei an der Bar. */
const fassung = (zusatz = {}) => Object.assign({
  mode: "tag", tag: TAG, name: "Lena", geraet: "ipad-1", zaehlnr: 1,
  zeit: TAG + "T11:00:00.000Z", archiviert: TAG + "T11:00:00.000Z", finished: true,
  barrot: {}, bar: { w001: 3 }, backup: {}, rest: { w001: 3 },
  zusatz: {}, getr: {}, gent: {}, gzusatz: {}
}, zusatz);

describe("Wein: oben gefehlt gegen aus dem Keller geholt", () => {
  test("ohne Abweichung sind beide Zahlen gleich — der Normalfall ändert sich nicht", async () => {
    const { env, keks } = await haus();
    const d = fassung();
    await senden(env, keks, d, "tag_" + TAG);
    const o = B.normVorgang(d);
    assert.equal(o.verbraucht.w001, 6, "oben gefehlt");
    assert.equal(o.wein.w001, 6, "aus dem Keller");
    assert.equal(journalMenge(env, "w001"), 6, "Journal");
  });

  test("im Keller lagen nur vier: verbraucht bleiben sechs, geholt sind vier", async () => {
    const { env, keks } = await haus();
    const d = fassung({ holtN: { w001: 4 } });
    await senden(env, keks, d, "tag_" + TAG);
    const o = B.normVorgang(d);
    assert.equal(o.verbraucht.w001, 6,
      "die Gäste haben sechs getrunken — daran ändert der leere Keller nichts");
    assert.equal(o.wein.w001, 4, "herausgetragen wurden vier");
    assert.equal(journalMenge(env, "w001"), 4, "das Journal bucht die vier");
  });

  test("der Abgleich rechnet mit dem Verbrauch, der Bestand mit der Entnahme", () => {
    /* Der Kern. Verkauft laut Kasse: sechs. Oben gefehlt: sechs → die
       Rechnung geht auf. Aus dem Keller: vier → der Bestand sinkt um
       vier. Vor Runde 20 stand hier „−2 · mehr verkauft als geholt". */
    const name = "GV Leindl Langenlois 0,75 l";
    const zber = { [TAG]: { tag: TAG, nr: "Z 1", umsatz: 54,
      positionen: [{ name, anzahl: 6, umsatz: 54, ml: 750 }] } };
    const zaehlung = { mode: "keller", tag: "2026-09-01", name: "Lena", finished: true,
      zdone: { w001: 1 }, reihen: { w001: 5 }, einzel: { w001: 0 } };

    B.setzte({ [name]: "w001" }, { [name]: 750 }, zber,
             [zaehlung, fassung({ holtN: { w001: 4 } })]);
    const a = B.abgleich(TAG, 1);
    const r = a.zeilen.find(x => x.id === "w001");
    assert.equal(r.verkauf, 6, "sechs verkauft");
    assert.equal(r.entnahme, 6, "sechs verbraucht");
    assert.equal(r.diff, 0, "die Rechnung geht auf");
    assert.equal(B.bestand().b.w001, 30 - 4, "der Bestand sinkt um die vier geholten");
  });

  test("ohne den Fix stünde dort eine Differenz — Gegenprobe an derselben Lage", () => {
    /* Dieselben Daten, aber gegen die ENTNAHME gerechnet: so sah es bis
       Runde 20 aus. Die Prüfung hält den Unterschied fest, damit
       niemand zurückbaut, ohne es zu merken. */
    const d = B.normVorgang(fassung({ holtN: { w001: 4 } }));
    assert.notEqual(d.wein.w001, d.verbraucht.w001,
      "die beiden Zahlen müssen hier auseinandergehen, sonst prüft dieser Test nichts");
    assert.equal(6 - d.wein.w001, 2, "die alte Rechnung hätte −2 gemeldet");
  });
});

describe("Getränke: derselbe Schnitt", () => {
  /* Cola Zero: Soll 7 in der Lade, 1 noch da → oben fehlten 6.
     Geholt wurden nur 4, weil im Lager nicht mehr lag. */
  const getrFassung = (gent) => Object.assign(fassung(), {
    bar: {}, rest: {}, getr: { colaz: 1 }, gholt: { colaz: 1 }, gent: { colaz: gent } });

  test("der Verbrauch kommt aus Soll minus Ist, die Entnahme aus `gent`", async () => {
    const { env, keks } = await haus();
    assert.equal(B.GSOLL.colaz, 7, "die Ladengeometrie hat sich geändert — Prüfung anpassen");
    const d = getrFassung(4);
    await senden(env, keks, d, "tag_" + TAG);
    const o = B.normVorgang(d);
    assert.equal(o.verbraucht.colaz, 6, "sieben minus eins");
    assert.equal(o.getr.colaz, 4, "geholt wurden vier");
    assert.equal(journalMenge(env, "colaz"), 4, "Journal");
  });

  test("ohne Abweichung gleich — und die Doppelzählung aus Runde 19 bleibt weg", async () => {
    const { env, keks } = await haus();
    const d = getrFassung(6);
    await senden(env, keks, d, "tag_" + TAG);
    const o = B.normVorgang(d);
    assert.equal(o.verbraucht.colaz, 6);
    assert.equal(o.getr.colaz, 6, "sechs, nicht zwölf");
    assert.equal(journalMenge(env, "colaz"), 6);
  });

  test("Lücke gesehen, aber nicht abgehakt: verbraucht ja, geholt nein", () => {
    /* Der Fall, den `holtN` nicht abdeckt und der im Alltag am ehesten
       vorkommt: Die Lade ist gezählt, die Lücke steht fest — geholt hat
       sie aber niemand, also schreibt `geholteGetraenke` kein `gent`.
       Verbraucht sind die Flaschen trotzdem. */
    const o = B.normVorgang(Object.assign(fassung(), {
      bar: {}, rest: {}, getr: { colaz: 1 }, gholt: {}, gent: {} }));
    assert.equal(o.verbraucht.colaz, 6, "sieben minus eins");
    assert.equal(o.getr.colaz, undefined, "aus dem Keller kam nichts");
  });

  test("geholt, aber die Lade nicht gezählt: es gilt die geholte Menge", () => {
    /* BERICHTIGT während Runde 20: Diese Prüfung verlangte zuerst, dass
       der Verbrauch in dieser Lage LEER bleibt. Das ist falsch, und
       `tests/runde16.test.mjs` hat es gezeigt: Ein leerer Verbrauch
       heisst für den Abgleich „nichts verbraucht", und der Verkauf
       stünde als volle Fehlmenge da — aus einer fehlenden Angabe würde
       ein Befund. Im Zweifel gilt die geholte Menge.
       Im echten Ablauf kann der Fall gar nicht entstehen: `gent`
       entsteht aus `gFehlt()`, und das braucht `getr`. Ein alter oder
       halber Stand darf aber keine erfundene Differenz erzeugen. */
    const o = B.normVorgang(fassung({ gent: { cola: 3 } }));
    assert.equal(o.getr.cola, 3, "geholt");
    assert.equal(o.verbraucht.cola, 3, "und im Zweifel auch verbraucht");
  });

  test("ist die Lade gezählt, gewinnt die Lücke — nicht die geholte Menge", () => {
    /* Die Gegenprobe zum Rückfall darüber: Sobald `getr` da ist, zählt
       Soll minus Ist, auch wenn `gent` eine andere Zahl trägt. */
    const o = B.normVorgang(Object.assign(fassung(), {
      getr: { colaz: 1 }, gholt: { colaz: 1 }, gent: { colaz: 4 } }));
    assert.equal(o.verbraucht.colaz, 6, "sieben minus eins");
    assert.equal(o.getr.colaz, 4, "geholt wurden vier");
  });
});

describe("Zusätzlich Entnommenes zählt zweimal und steht trotzdem eigens da", () => {
  test("`zusatz` geht in beide Zahlen und in den eigenen Topf", async () => {
    const { env, keks } = await haus();
    const d = fassung({ zusatz: { w005: 2 } });
    await senden(env, keks, d, "tag_" + TAG);
    const o = B.normVorgang(d);
    assert.equal(o.wein.w005, 2, "aus dem Keller");
    assert.equal(o.verbraucht.w005, 2, "und verbraucht");
    assert.equal(o.extra.w005, 2, "getrennt ausgewiesen");
    assert.equal(journalMenge(env, "w005"), 2, "Journal");
  });

  test("`gzusatz` ebenso", () => {
    const o = B.normVorgang(fassung({ gzusatz: { cola: 3 } }));
    assert.equal(o.getr.cola, 3);
    assert.equal(o.verbraucht.cola, 3);
    assert.equal(o.extra.cola, 3);
  });

  test("es wird nicht mit der Fassungsmenge vermischt", () => {
    /* Die App sagt dazu: „Eigener Topf, eigene Rubrik im Protokoll —
       nie mit den Nachfuellmengen vermischt." */
    const o = B.normVorgang(fassung({ zusatz: { w001: 2 } }));
    assert.equal(o.wein.w001, 8, "sechs gefasst plus zwei zusätzlich");
    assert.equal(o.extra.w001, 2, "davon zwei zusätzlich");
  });
});

describe("Die anderen Modi", () => {
  test("Sonderentnahme: beide Zahlen gleich — sie ist im Kassensystem verbucht", () => {
    /* Entschieden von Casimir, 20.09.2026: Bruch, Küche, Personal und
       Verkostung stehen im Z-Bericht als eigene Positionen („… - Inner
       Haus", 0,00 €). Zählte man sie nur als Entnahme, sähe jeder
       Bruch wie fehlender Verkauf aus. */
    const o = B.normVorgang({ mode: "nach", tag: TAG, name: "Lena", finished: true,
      ent: { w001: 2 }, gent: { cola: 1 }, gzusatz: {}, grund: "bruch" });
    assert.equal(o.wein.w001, 2);
    assert.equal(o.verbraucht.w001, 2);
    assert.equal(o.getr.cola, 1);
    assert.equal(o.verbraucht.cola, 1);
    assert.equal(o.grund, "bruch", "der Grund reist jetzt mit");
  });

  test("eine Kellerzählung, bei der jemand etwas mitnimmt, verliert die Entnahme nicht", () => {
    /* Sonst fiele sie beim Umstellen von `abgleich()` STILL aus dem
       Vergleich — eine Entscheidung, die niemand getroffen hat. */
    const o = B.normVorgang({ mode: "keller", tag: TAG, name: "Lena", finished: true,
      zdone: { w001: 1 }, reihen: { w001: 2 }, einzel: { w001: 0 },
      gent: { cola: 4 } });
    assert.equal(o.getr.cola, 4, "geholt");
    assert.equal(o.verbraucht.cola, 4, "und zählt weiter gegen die Kasse");
  });

  test("Kellerzählung und Wareneingang haben keinen Verbrauch", () => {
    const z = B.normVorgang({ mode: "keller", tag: TAG, name: "Lena", finished: true,
      zdone: { w001: 1 }, reihen: { w001: 2 }, einzel: { w001: 0 } });
    assert.deepEqual(Object.keys(z.verbraucht), [], "eine Zählung verbraucht nichts");
    const w = B.normVorgang({ mode: "ware", tag: TAG, name: "Lena", finished: true,
      pos: [{ id: "w001", kisten: 2, kistengr: 6 }], gent: { cola: 12 } });
    assert.deepEqual(Object.keys(w.verbraucht), [], "eine Lieferung auch nicht");
    assert.equal(w.eingang.w001, 12, "sie ist ein Eingang");
    assert.equal(w.eingang.cola, 12, "auch die Getränke");
  });
});

describe("Was der Vorgang sonst noch mitbringt", () => {
  test("die Uhrzeit vom Gerät, nicht die Ankunft beim Server", () => {
    /* `ts` ist die Ankunft. Bei einem Gerät, das ohne Netz gearbeitet
       hat, liegen Stunden dazwischen — in den Live-Daten bis zu 26. */
    const o = B.normVorgang(Object.assign(fassung(),
      { zeit: TAG + "T11:00:00.000Z", archiviert: TAG + "T23:30:00.000Z" }));
    assert.equal(o.zeit, TAG + "T11:00:00.000Z");
    assert.equal(o.ts, TAG + "T23:30:00.000Z");
    assert.notEqual(o.zeit, o.ts, "sie dürfen nicht dieselbe Angabe sein");
  });

  test("die Freigabe mit Code reist mit", () => {
    /* Die App verspricht wörtlich „die Leitung sieht sie morgen früh".
       Bis Runde 20 hat das Backoffice das Feld nicht einmal gelesen. */
    const u = { von: "Asad", zeit: TAG + "T10:03:21.823Z",
                offen: ["Nicht alle Positionen gezählt"] };
    const o = B.normVorgang(Object.assign(fassung(), { uebersteuert: u }));
    assert.equal(o.uebersteuert.von, "Asad");
    assert.deepEqual(o.uebersteuert.offen, ["Nicht alle Positionen gezählt"]);
    assert.equal(B.normVorgang(fassung()).uebersteuert, null, "sonst nichts");
  });
});
