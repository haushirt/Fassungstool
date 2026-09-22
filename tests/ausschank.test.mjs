/* ═══════════════════════════════════════════════════════════════════════
   Was ins Glas geht: Hand schlägt Kassenname

   Casimir, am 21.09.2026: „im backoffice gibt es aber die option 1/8
   nicht oder? … und spritzer ca 200ml von der 1L spritzer flasche."

   Nachgesehen: Das Achtel wird sehr wohl gelesen (125 ml stehen in der
   Datenbank). Was fehlte, war ein Ort, an dem ein Mensch eine Menge
   EINTRAGEN kann. Drei Fälle gibt der Kassenname nicht her:

     · „Weisser Spritzer"        keine Menge im Namen        → gar nichts
     · „Weizen alkoholfrei 0,5"  die Einheit fehlt           → gar nichts
     · „Radler 0,5l 0,5l"        der Name sagt 500,
                                 verbraucht werden 250 Pils  → FALSCH

   Der dritte ist der Grund, warum es diese Prüfung gibt. Bei den ersten
   beiden bleibt die Position sichtbar aus der Rechnung heraus — das ist
   unangenehm, aber ehrlich. Beim Radler steht eine plausible Zahl da, und
   sie ist das Doppelte des Wahren. Ohne den Vorrang „Hand vor Name"
   rechnet das Tool still falsch, und niemand sieht es.

   Gerechnet wird mit dem ausgelieferten Code aus public/leitung.html.
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt } from "./hilfe/dateien.mjs";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");

function backoffice() {
  const speicher = new Map(), gesendet = [];
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout,
    localStorage: {
      getItem: k => (speicher.has(k) ? speicher.get(k) : null),
      setItem: (k, v) => speicher.set(k, String(v)),
      removeItem: k => speicher.delete(k) },
    document: { querySelector: () => stumm },
    fetch: async (u, o) => { gesendet.push(o && o.body ? JSON.parse(o.body) : null);
      return new Response("{}", { status: 200 }); } };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.zeichne = () => {};
    globalThis.__f = { ausschankMenge, flaschen, setzeAusschank, sendeZuordnung,
      stand: () => ({ aus: AUS_BEST, map: MAP, geb: GEB_BEST }),
      setzte: (map, geb, aus, kann) => { MAP = map || {}; GEB_BEST = geb || {};
        AUS_BEST = aus || {}; REZ = {}; KANN_AUS = kann === undefined ? true : !!kann; } };`,
    s, { filename: "leitung.html#ausschank" });
  return { f: s.__f, gesendet, speicher };
}
const nah = (a, b, satz) => assert.ok(Math.abs(a - b) < 0.0005, satz + " — ist " + a);
/* Als Text vergleichen: Die Antwort entsteht in einem eigenen VM-Kontext
   und hat einen anderen Objekt-Prototyp; `deepEqual` aus `assert/strict`
   stolpert darüber, obwohl der Inhalt gleich ist. */
const menge = o => o.ml + " ml · " + o.woher;

/* Die echten Kassennamen aus der laufenden Datenbank, nicht erfundene. */
const RADLER = "Radler 0,5l 0,5l";
const SPRITZER = "Weißer Spritzer";
const WEIZEN = "Weizen alkoholfrei 0,5";
const ACHTEL = "GV Leindl Langenlois 1/8 l";

describe("Die Menge je Verkauf: zwei Quellen, eine Reihenfolge", () => {
  test("ohne Eintrag gilt der Kassenname — der Normalfall bleibt", () => {
    const { f } = backoffice();
    f.setzte({}, {}, {});
    assert.equal(menge(f.ausschankMenge(ACHTEL)), "125 ml · name");
    assert.equal(menge(f.ausschankMenge(RADLER)), "500 ml · name");
  });

  test("ein Eintrag schlägt den Namen", () => {
    const { f } = backoffice();
    f.setzte({}, {}, { [RADLER]: 250 });
    assert.equal(menge(f.ausschankMenge(RADLER)), "250 ml · hand",
      "der Name sagt 500 — genau das ist der Fehler, den es zu schlagen gilt");
  });

  test("wo der Name nichts hergibt, trägt der Eintrag allein", () => {
    const { f } = backoffice();
    f.setzte({}, {}, { [SPRITZER]: 200, [WEIZEN]: 500 });
    assert.equal(menge(f.ausschankMenge(SPRITZER)), "200 ml · hand");
    assert.equal(menge(f.ausschankMenge(WEIZEN)), "500 ml · hand");
  });

  test("ohne beides sagt sie das, statt eine Zahl zu erfinden", () => {
    const { f } = backoffice();
    f.setzte({}, {}, {});
    assert.equal(menge(f.ausschankMenge(SPRITZER)), "0 ml · keine");
    assert.equal(menge(f.ausschankMenge(WEIZEN)), "0 ml · keine",
      "0,5 ohne Einheit wird NICHT geraten");
  });
});

describe("Was daraus in der Rechnung wird", () => {
  test("der Radler: 2 × 250 ml aus einem 50-l-Fass", () => {
    const { f } = backoffice();
    f.setzte({ [RADLER]: "fasspils" }, { [RADLER]: 50000 }, { [RADLER]: 250 });
    const r = f.flaschen({ name: RADLER, anzahl: 2 }, "fasspils");
    assert.equal(r.ok, true);
    assert.equal(r.aus, 250);
    assert.equal(r.woher, "hand");
    nah(r.fl, 0.01, "2 × 250 ÷ 50000");
  });

  test("ohne Eintrag wäre es das Doppelte — die Gegenprobe", () => {
    const { f } = backoffice();
    f.setzte({ [RADLER]: "fasspils" }, { [RADLER]: 50000 }, {});
    const r = f.flaschen({ name: RADLER, anzahl: 2 }, "fasspils");
    nah(r.fl, 0.02, "2 × 500 ÷ 50000 — plausibel und falsch");
    assert.equal(r.woher, "name",
      "die Anzeige muss sagen können, woher die Zahl kommt");
  });

  test("der Spritzer: 4 × 200 ml aus der 1-l-Flasche", () => {
    const { f } = backoffice();
    f.setzte({ [SPRITZER]: "spritzer" }, { [SPRITZER]: 1000 }, { [SPRITZER]: 200 });
    const r = f.flaschen({ name: SPRITZER, anzahl: 4 }, "spritzer");
    assert.equal(r.ok, true);
    nah(r.fl, 0.8, "4 × 200 ÷ 1000");
  });

  test("ohne Eintrag fällt der Spritzer heraus und sagt warum", () => {
    const { f } = backoffice();
    f.setzte({ [SPRITZER]: "spritzer" }, { [SPRITZER]: 1000 }, {});
    const r = f.flaschen({ name: SPRITZER, anzahl: 4 }, "spritzer");
    assert.equal(r.ok, false);
    assert.equal(r.fehlt, "ausschank");
  });

  test("das Achtel rechnet, sobald die Flaschengröße bestätigt ist", () => {
    /* Casimirs eigentlicher Fund: An den Achteln lag es nie. In der
       laufenden Datenbank hat KEINE der 21 Zuordnungen eine
       Gebindegröße — deshalb rechnete keine einzige Zeile. */
    const { f } = backoffice();
    f.setzte({ [ACHTEL]: "w001" }, {}, {});
    assert.equal(f.flaschen({ name: ACHTEL, anzahl: 12 }, "w001").fehlt, "gebinde");

    f.setzte({ [ACHTEL]: "w001" }, { [ACHTEL]: 750 }, {});
    const r = f.flaschen({ name: ACHTEL, anzahl: 12 }, "w001");
    assert.equal(r.ok, true);
    nah(r.fl, 2, "12 Achtel sind zwei Flaschen");
    assert.equal(r.aus, 125);
  });
});

describe("Eintragen und wieder entfernen", () => {
  test("die Menge geht an den Server und wird gemerkt", async () => {
    const { f, gesendet, speicher } = backoffice();
    f.setzte({}, {}, {});
    await f.setzeAusschank(SPRITZER, "spritzer", 200);
    assert.equal(f.stand().aus[SPRITZER], 200);
    assert.equal(gesendet[0].ausschank_ml, 200);
    assert.equal(gesendet[0].artikel, "spritzer",
      "der Artikel muss mit — der Worker schreibt die Zeile als Ganzes");
    assert.equal(JSON.parse(speicher.get("hh_ausschank_v1"))[SPRITZER], 200);
  });

  test("eine 0 entfernt sie wieder, dann gilt wieder der Name", async () => {
    const { f, gesendet } = backoffice();
    f.setzte({}, {}, { [RADLER]: 250 });
    await f.setzeAusschank(RADLER, "fasspils", 0);
    assert.equal(RADLER in f.stand().aus, false);
    assert.equal(gesendet[0].ausschank_ml, null, "null löscht, 0 wäre eine Angabe");
    assert.equal(menge(f.ausschankMenge(RADLER)), "500 ml · name");
  });

  test("eine gewöhnliche Zuordnung schickt das Feld gar nicht mit", async () => {
    /* Sonst erbte die neue Spalte den Fallstrick von `gebinde_ml`: die
       Anweisung schreibt die Zeile als Ganzes, wer ein Feld weglässt,
       löscht es. Der Worker fasst `ausschank_ml` nur an, wenn der Körper
       sie nennt — also darf sie hier nicht genannt werden. */
    const { f, gesendet } = backoffice();
    f.setzte({}, {}, { [RADLER]: 250 });
    await f.sendeZuordnung(RADLER, "fasspils", 50000);
    assert.equal("ausschank_ml" in gesendet[0], false);
  });

  test("ohne eingespielte Migration wird sie nie mitgeschickt", async () => {
    /* Der Worker gäbe sonst 422 zurück — und die ganze Zuordnung käme
       nicht an, obwohl an ihr nichts falsch ist. */
    const { f, gesendet } = backoffice();
    f.setzte({}, {}, {}, false);
    await f.sendeZuordnung(SPRITZER, "spritzer", 1000, 200);
    assert.equal("ausschank_ml" in gesendet[0], false);
    assert.equal(gesendet[0].gebinde_ml, 1000, "der Rest geht normal hinaus");
  });

  test("und das Eintragen sagt es, statt still nichts zu tun", async () => {
    const { f, gesendet } = backoffice();
    f.setzte({}, {}, {}, false);
    await f.setzeAusschank(SPRITZER, "spritzer", 200);
    assert.deepEqual(gesendet, [], "nichts geht hinaus");
    assert.equal(SPRITZER in f.stand().aus, false, "und nichts wird gemerkt");
  });
});
