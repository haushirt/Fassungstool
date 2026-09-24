/* ═══════════════════════════════════════════════════════════════════════
   Größen gehören an den Artikel — und eine Regel rechnet erst, wenn sie
   einmal bestätigt ist.

   Casimir, 22.09.2026: „Aber Wert darauf legen das pro Artikel im
   Hintergrund einmal anzulegen. Es hat keinen Mehrwert das immer
   irgendwo stehen zu haben. Das Ziel ist die richtige Ausrechnung. Fühl
   vor aus. Alle Weinflasche 0,75L, ein Glas Wein 125ml, Sekt/Champ.
   100ml. Ein Fass Bier 50L."

   Der heikle Punkt: In Runde 6 wurde ausdrücklich entschieden, dass NUR
   bestätigte Zahlen rechnen — weil „alles Übrige: eine Einheit = eine
   Flasche" aus „Amaro Averna Siciliano 2 cl" × 3 ganze DREI FLASCHEN
   machte (review/LOG.md, Runde 6). Diese Datei hält beides zugleich
   fest: die Vorgaben sind da und füllen vor, aber gerechnet wird erst
   nach dem einen Blick auf die Liste. Wer keine Klasse hat, bekommt
   weiter nichts.
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt } from "./hilfe/dateien.mjs";

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
    globalThis.__f = { vorgabe, gebindeGroesse, flaschen, ausschankMenge, byId, glasVorschlag,
      setzte: (map, geb, aus, gro) => { MAP = map || {}; GEB_BEST = geb || {};
        AUS_BEST = aus || {}; GROESSEN = gro || {}; REZ = {}; KANN_AUS = true; } };`,
    s, { filename: "leitung.html#groessen" });
  return s.__f;
}

describe("Die Vorgaben, die Casimir genannt hat", () => {
  const f = backoffice();

  test("jede Weinflasche 750, ein Glas Wein 125", () => {
    const v = f.vorgabe("w001");          /* Leindl · Langenlois, WEISS */
    assert.equal(v.g, 750);
    assert.equal(v.a, 125);
  });

  test("Sekt und Champagner: Glas 100", () => {
    /* `f:"BUBBLES"` ist das einzige Feld, an dem diese Klasse hängt. */
    ["w055", "w056", "w057", "serena"].forEach(id => {
      assert.equal(f.byId(id).f, "BUBBLES", id);
      assert.equal(f.vorgabe(id).a, 100, id);
      assert.equal(f.vorgabe(id).g, 750, id);
    });
  });

  test("ein Fass 50 000", () => {
    assert.equal(f.vorgabe("fasspils").g, 50000);
  });

  test("Getränke haben keine Klasse — nur was im Namen steht", () => {
    /* In Lade 6 liegen 0,33er und 0,5er nebeneinander; die Lade sagt
       nichts über die Grösse. Zwei von 37 tragen sie im Namen. */
    assert.equal(f.vorgabe("gasteiner").g, 1000, "Gasteiner 1 l");
    assert.equal(f.vorgabe("gastklein").g, 250, "Gasteiner 0,25 l");
    assert.equal(f.vorgabe("cola").g, null, "Cola sagt nichts");
    assert.equal(f.vorgabe("almd").g, null, "Almdudler auch nicht");
    /* Die Falle: ein Mensch liest 0,33 l, der Parser liest nichts, weil
       die Einheit fehlt. Wer die Erkennung lockert, bekommt 0,0. */
    assert.equal(f.vorgabe("st03").g, null, "Stiegl 0,0 % · 0,33");
  });
});

describe("Eine Vorgabe rechnet NICHT von selbst", () => {
  const pos = { name: "GV Leindl Langenlois 1/8 l", anzahl: 12 };

  test("vorher: die Zeile bleibt aus der Rechnung", () => {
    const f = backoffice();
    f.setzte({ [pos.name]: "w001" }, {}, {}, {});
    const r = f.flaschen(pos, "w001");
    assert.equal(r.ok, false);
    assert.equal(r.fehlt, "gebinde");
    assert.equal(f.gebindeGroesse("w001", pos.name).quelle, "vorschlag",
      "750 ist da — aber als Vorschlag, und der rechnet nicht");
  });

  test("nachher: dieselbe Zeile rechnet", () => {
    const f = backoffice();
    f.setzte({ [pos.name]: "w001" }, {}, {}, { w001: { g: 750, a: 125 } });
    const r = f.flaschen(pos, "w001");
    assert.equal(r.ok, true);
    nah(r.fl, 2, "12 Achtel sind zwei Flaschen");
    assert.equal(f.gebindeGroesse("w001", pos.name).quelle, "bestaetigt");
  });

  test("„Amaro Averna 2 cl‘ bleibt draußen — der alte Fehler kommt nicht wieder", () => {
    /* Der Fund aus Runde 6, wörtlich: × 3 wurde zu 3 FLASCHEN statt
       0,086. Ein Artikel ohne Klasse bekommt keine Vorgabe, also auch
       nach „Alle Vorgaben übernehmen" keine Zahl. */
    const f = backoffice();
    const amaro = { name: "Amaro Averna Siciliano 2 cl", anzahl: 3 };
    assert.equal(f.vorgabe("almd").g, null, "stellvertretend: kein Standard");
    f.setzte({ [amaro.name]: "almd" }, {}, {}, {});
    const r = f.flaschen(amaro, "almd");
    assert.equal(r.ok, false);
    assert.equal(r.fehlt, "gebinde");
    assert.equal(r.aus, 20, "die Menge liest er sehr wohl — die Flasche nicht");
  });
});

describe("Der Kassenname schlägt die Artikelregel", () => {
  test("„Prosecco, Serena 0,75l‘ ist eine Flasche, nicht 0,13", () => {
    /* Die Reihenfolge ist der ganze Punkt. Griffe die Sekt-Regel
       (100 ml) vor dem Namen, stünde hier 0,13 statt 1. */
    const f = backoffice();
    const p = { name: "Prosecco, Serena 0,75l", anzahl: 1 };
    f.setzte({ [p.name]: "serena" }, {}, {}, { serena: { g: 750, a: 100 } });
    const r = f.flaschen(p, "serena");
    assert.equal(r.aus, 750);
    assert.equal(r.woher, "name");
    nah(r.fl, 1, "eine ganze Flasche");
  });

  test("wo der Name schweigt, rechnet NICHTS — die Regel gilt nicht von selbst", () => {
    /* BERICHTIGT nach der Jagd (Runde 23 · B2). Hier stand zuerst die
       Zusicherung, die Artikelregel trage dort, wo der Name schweigt.
       Nachgerechnet war das ein Faktor 1/6: „Flasche Leindl Langenlois"
       × 3 wurde zu 0,5 Flaschen statt 3, lautlos. An einem Kassennamen
       ohne Zahl ist nicht zu erkennen, ob er ein Glas oder eine Flasche
       meint — also wird er nicht gerechnet, wie vor Runde 23 auch. */
    const f = backoffice();
    const p = { name: "Flasche Leindl Langenlois", anzahl: 3 };
    f.setzte({ [p.name]: "w001" }, {}, {}, { w001: { g: 750, a: 125 } });
    const r = f.flaschen(p, "w001");
    assert.equal(r.ok, false);
    assert.equal(r.fehlt, "ausschank");
    assert.equal(r.woher, "keine");
  });

  test("die Glasmenge bleibt als Angebot da", () => {
    /* Sie verschwindet nicht — sie wird nur nicht mehr still angewandt.
       Im Abschnitt „Nicht gerechnet" steht sie als Knopf, ein Klick
       schreibt sie für DIESEN Kassennamen fest, und danach kommt sie
       als „von Hand" zurück. */
    const f = backoffice();
    f.setzte({}, {}, {}, { serena: { g: 750, a: 100 } });
    assert.equal(f.glasVorschlag("serena"), 100);
    assert.equal(f.glasVorschlag("w001"), 0, "ohne Eintrag kein Angebot");

    const p = { name: "Glas Sekt", anzahl: 4 };
    f.setzte({ [p.name]: "serena" }, {}, { [p.name]: 100 },
             { serena: { g: 750, a: 100 } });
    const r = f.flaschen(p, "serena");
    assert.equal(r.ok, true);
    assert.equal(r.woher, "hand", "nach dem Klick ist es eine Entscheidung");
    nah(r.fl, 4 * 100 / 750, "4 Gläser aus der 0,75er");
  });

  test("und von Hand schlägt beides", () => {
    const f = backoffice();
    const p = { name: "Radler 0,5l 0,5l", anzahl: 2 };
    f.setzte({ [p.name]: "fasspils" }, {}, { [p.name]: 250 }, { fasspils: { g: 50000 } });
    const r = f.flaschen(p, "fasspils");
    assert.equal(r.aus, 250);
    assert.equal(r.woher, "hand");
  });
});

describe("Die hinterlegte Zahl gewinnt gegen einen Widerspruch", () => {
  test("zwei Kassennamen mit verschiedenen Größen fallen nicht mehr durch", () => {
    /* Bekannter Fund (Jagd Runde 16): `gebArtikelBestaetigt` setzt bei
       Widerspruch `null`, und der Weg fiel still bis auf den
       750-Vorschlag durch. Mit der hinterlegten Zahl davor ist das
       vorbei — DASS der Widerspruch auch gemeldet gehört, bleibt offen
       und steht im Backlog. */
    const f = backoffice();
    f.setzte({ a: "w001", b: "w001" }, { a: 750, b: 1500 }, {},
             { w001: { g: 750 } });
    const g = f.gebindeGroesse("w001", "c");
    assert.equal(g.quelle, "bestaetigt");
    assert.equal(g.ml, 750);
  });

  test("am Kassennamen selbst bestätigt schlägt weiterhin alles", () => {
    /* Stufe 1 bleibt Stufe 1: wer für DIESE Position eine Grösse
       bestätigt hat, meint diese Position. */
    const f = backoffice();
    f.setzte({ a: "w001" }, { a: 1500 }, {}, { w001: { g: 750 } });
    assert.equal(f.gebindeGroesse("w001", "a").ml, 1500);
  });
});
