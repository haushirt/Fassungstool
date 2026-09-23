/* ═══════════════════════════════════════════════════════════════════════
   Bier vom Fass · gerechnet, aber ohne Gegenseite

   Casimir, 21.09.2026: „und bier auch nicht also vom fass um zu
   kontrolieren wie viel fässer gebraucht werden."

   Gemessen in der laufenden Datenbank: „Raschhofer Pils 0,2l/0,3l/0,5l"
   (10 Stück) und „Radler 0,3l/0,5l" (3) haben keinen Artikel — Fassbier
   kommt in den Stammdaten nicht vor. Die Rechnung selbst kann Fässer
   längst: anzahl × Ausschank ÷ Gebinde, mit 50 000 ml als Gebinde.

   Der Haken ist die andere Seite. Ein Fass wird nicht gezählt und nicht
   gefasst (Casimirs Entscheidung: „nur ausrechnen"), es steht also nie
   in `ent`. Liefe es durch `verk`, baute `abgleich()` daraus eine Zeile
   „verkauft 0,03 · geholt 0 · −0,03" — eine Differenz, die keine ist,
   und zwar an jedem einzelnen Tag.

   Und beim Radler wird es scharf: „Radler 0,5l" sagt im Namen 500,
   verbraucht werden 250 Pils. Die Zahl ist nicht leer, sondern falsch
   und sieht richtig aus.
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt, lies } from "./hilfe/dateien.mjs";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");
const nah = (a, b, satz) => assert.ok(Math.abs(a - b) < 0.0005, satz + " — ist " + a);

function backoffice() {
  const speicher = new Map();
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout,
    localStorage: {
      getItem: k => (speicher.has(k) ? speicher.get(k) : null),
      setItem: (k, v) => speicher.set(k, String(v)),
      removeItem: k => speicher.delete(k) },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.zeichne = () => {};
    globalThis.__f = { abgleich, flaschen, istNurVerkauf, NUR_VERKAUF, artName,
      gebindeGroesse, vorgabe,
      setzte: (map, geb, zber, vorg, aus, gro) => {
        MAP = map || {}; GEB_BEST = geb || {}; ZBER = zber || {};
        VORGAENGE = vorg || []; REZ = {}; AUS_BEST = aus || {};
        GROESSEN = gro || {}; KANN_AUS = true; } };`,
    s, { filename: "leitung.html#fassbier" });
  return s.__f;
}

const TAG = "2026-09-16";
/* Die fünf Fass-Kassennamen, wie sie in der laufenden Datenbank stehen. */
const BERICHT = { [TAG]: { tag: TAG, umsatz: 100, positionen: [
  { name: "Raschhofer Pils 0,5l 0,5l", anzahl: 6, umsatz: 33.6 },
  { name: "Raschhofer Pils 0,3l 0,3l", anzahl: 3, umsatz: 13.8 },
  { name: "Raschhofer Pils 0,2l 0,2l", anzahl: 1, umsatz: 3.6 },
  { name: "Radler 0,5l 0,5l",          anzahl: 2, umsatz: 11.2 },
  { name: "Radler 0,3l 0,3l",          anzahl: 1, umsatz: 4.6 }
] } };
const MAP_FASS = {
  "Raschhofer Pils 0,5l 0,5l": "fasspils", "Raschhofer Pils 0,3l 0,3l": "fasspils",
  "Raschhofer Pils 0,2l 0,2l": "fasspils", "Radler 0,5l 0,5l": "fasspils",
  "Radler 0,3l 0,3l": "fasspils" };
/* Was Casimir nach der Einrichtungsliste eingetragen hätte. */
const HAND = { "Radler 0,5l 0,5l": 250, "Radler 0,3l 0,3l": 150 };
const GRO  = { fasspils: { g: 50000 } };
/* Eine Fassung ohne jede Fassentnahme — es gibt sie im Keller nicht. */
const vorgang = () => ({ mode: "tag", tag: TAG, name: "Asad", finished: true,
  barrot: {}, bar: {}, backup: {}, rest: { w001: 2 },
  zusatz: {}, gzusatz: {}, getr: {}, gent: {} });

describe("Das Fass wird gerechnet", () => {
  test("die Liter gehen auf, und daraus werden Fässer", () => {
    const f = backoffice();
    f.setzte(MAP_FASS, {}, BERICHT, [vorgang()], HAND, GRO);
    const a = f.abgleich(TAG, 1);
    const t = a.fass.fasspils;
    assert.ok(t, "der Topf fehlt");
    /* 6×500 + 3×300 + 1×200 + 2×250 + 1×150 = 4750 ml */
    nah(t.ml / 1000, 4.75, "Liter");
    nah(t.fl, 4750 / 50000, "Fässer");
    assert.equal(t.stk, 13);
  });

  test("und es steht in KEINER Differenzzeile", () => {
    /* Der Kern. `ent` kennt das Fass nie — eine Zeile daraus wäre jeden
       Tag eine Abweichung, die es nicht gibt. */
    const f = backoffice();
    f.setzte(MAP_FASS, {}, BERICHT, [vorgang()], HAND, GRO);
    const a = f.abgleich(TAG, 1);
    assert.equal(a.zeilen.some(r => r.id === "fasspils"), false);
    assert.equal(a.verk.fasspils, undefined, "auch nicht im Verkaufstopf");
    assert.equal((a.vorbehalt || {}).fasspils, undefined,
      "und keinen Vorbehalt zu einem Artikel ohne Zeile");
  });

  test("der Radler: von Hand 250, obwohl der Name 500 sagt", () => {
    const f = backoffice();
    f.setzte(MAP_FASS, {}, BERICHT, [vorgang()], HAND, GRO);
    const z = f.abgleich(TAG, 1).fass.fasspils.zeilen
      .find(x => x.name === "Radler 0,5l 0,5l");
    assert.equal(z.aus, 250);
    assert.equal(z.woher, "hand", "die Anzeige muss die Herkunft nennen können");
    nah(z.ml / 1000, 0.5, "2 × 250 ml");
  });

  test("ohne den Eintrag wäre es das Doppelte — die Gegenprobe", () => {
    const f = backoffice();
    f.setzte(MAP_FASS, {}, BERICHT, [vorgang()], {}, GRO);
    const t = f.abgleich(TAG, 1).fass.fasspils;
    /* Ohne die Handzahlen gelten die Namen: 2×500 statt 2×250 und
       1×300 statt 1×150, also 650 ml mehr. BERICHTIGT — hier stand
       zuerst 5,75; die Zahl war falsch gerechnet, nicht der Code. */
    nah(t.ml / 1000, 5.4, "650 ml mehr, plausibel und falsch");
    assert.equal(t.zeilen.find(x => x.name === "Radler 0,5l 0,5l").woher, "name");
  });

  test("ohne hinterlegte Fassgröße rechnet nichts — und es wird gemeldet", () => {
    /* Die Entscheidung aus Runde 6 gilt auch hier: lieber eine Zeile
       weniger gerechnet als eine falsch. */
    const f = backoffice();
    f.setzte(MAP_FASS, {}, BERICHT, [vorgang()], HAND, {});
    const a = f.abgleich(TAG, 1);
    assert.equal(a.fass.fasspils, undefined);
    assert.ok(a.ohneGroesse.some(o => o.id === "fasspils"),
      "es muss in der Liste ‚Nicht gerechnet’ stehen, nicht verschwinden");
  });

  test("der Artikel heißt beim Namen, nicht bei seiner Kennung", () => {
    const f = backoffice();
    assert.equal(f.artName("fasspils"), "Raschhofer Pils vom Fass");
    assert.equal(f.istNurVerkauf("fasspils"), true);
    assert.equal(f.istNurVerkauf("w001"), false);
  });

  test("50 l steht in der Artikelliste, nicht in der Artikelliste-Liste", () => {
    /* Eine Zahl, ein Ort: `NUR_VERKAUF` sagt nur, WELCHE Artikel es
       gibt; wie gross das Fass ist, steht bei den Größen. */
    const f = backoffice();
    assert.equal("ml" in f.NUR_VERKAUF[0], false);
    assert.equal("g" in f.vorgabe("fasspils") && f.vorgabe("fasspils").g, 50000);
  });
});

describe("Dieselbe Ausnahme im Keller", () => {
  const APP = lies("public", "index.html");
  const schnitt = name => {
    const a = APP.indexOf("function " + name + "(");
    assert.ok(a > 0, name + " fehlt");
    let tiefe = 0;
    for (let j = APP.indexOf("{", a); j < APP.length; j++) {
      if (APP[j] === "{") tiefe++;
      else if (APP[j] === "}") { tiefe--; if (!tiefe) return APP.slice(a, j + 1); }
    }
    assert.fail(name + ": keine schliessende Klammer");
  };
  const rechne = new Function(
    "const GSOLL={};\n" + "const NV={fasspils:{id:'fasspils'}};\n"
    + schnitt("gefassteMengen") + "\n" + schnitt("verbrauchteMengen") + "\n"
    + schnitt("verkaufteFlaschen") + "\n" + schnitt("abgleichZeilen")
    + "\nreturn {abgleichZeilen};")();

  test("`abgleichZeilen` überspringt das Fass ganz", () => {
    const d = { mode: "tag", tag: TAG, rest: { w001: 2 }, bar: {}, barrot: {},
                backup: {}, zusatz: {}, gzusatz: {}, gent: {} };
    const z = { tag: TAG, positionen: [
      { rohbez: "Raschhofer Pils 0,5l 0,5l", artikel: "fasspils", anzahl: 6, ausschankMl: 500 },
      { rohbez: "GV Leindl Langenlois 1/8 l", artikel: "w001", anzahl: 12, ausschankMl: 125 }
    ] };
    const r = rechne.abgleichZeilen(d, z, { "GV Leindl Langenlois 1/8 l": 750 });
    assert.equal(r.zeilen.some(x => x.id === "fasspils"), false);
    assert.equal(r.ohneZuordnung, 0);
    assert.equal(r.ohneMenge, 0, "es darf auch nicht als fehlende Angabe zählen");
    assert.equal(r.ohneGebinde, 0);
  });
});

describe("Eine Liste, zwei Dateien", () => {
  test("`NUR_VERKAUF` steht in beiden Dateien gleich", () => {
    /* Nach dem Muster von `tests/soll-gleich.test.mjs`, das den
       Gasteiner-Fund von selbst gemeldet hätte. */
    const hol = datei => {
      const q = lies("public", datei);
      const a = q.indexOf("const NUR_VERKAUF=");
      assert.ok(a > 0, datei + ": NUR_VERKAUF fehlt");
      const roh = q.slice(a, q.indexOf(";", a) + 1);
      return new Function(roh + "return NUR_VERKAUF;")();
    };
    assert.equal(JSON.stringify(hol("leitung.html")),
                 JSON.stringify(hol("index.html")));
  });
});
