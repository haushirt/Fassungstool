/* Gebindegrößen und Mengenrechnung im Backoffice.

   Der Anlass: `flaschen()` in `public/leitung.html` hat bis v24 drei
   stille Annahmen gemacht — jeder Wein 750 ml, eine Position ohne
   Größenangabe im Namen eine ganze Flasche, und alles Übrige „eine
   Einheit = eine Flasche". Am echten Bericht Nr. 37 gemessen wurde
   daraus: „Amaro Averna Siciliano 2 cl" × 3 = 3 FLASCHEN, „Sanbitter
   Spritz 1 Glas" = 1 Flasche. Beides ging ungefragt in die Differenz und
   sah dort aus wie Schwund.

   Geprüft wird der ausgelieferte Code selbst: der Ausschnitt wird aus
   `public/leitung.html` herausgeschnitten und in einer eigenen Umgebung
   ausgeführt (dasselbe Verfahren wie in `tests/ausgang.test.mjs`).
   Gerechnet wird mit den Zahlen aus `tests/fixtures/zbericht-37-extended.csv`,
   gelesen vom echten Parser aus `src/gnparse.js`.                       */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt, lies } from "./hilfe/dateien.mjs";
import { parseZ } from "../src/gnparse.js";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");
const BERICHT = parseZ(lies("tests", "fixtures", "zbericht-37-extended.csv"));
const pos = name => {
  const p = BERICHT.positionen.find(x => x.name === name);
  if (!p) throw new Error("Position steht nicht im echten Bericht: " + name);
  return p;
};
const nah = (a, b, satz) => assert.ok(Math.abs(a - b) < 0.0005, satz + " — ist " + a);

function umgebung(antwortet = () => new Response("{}", { status: 200 })) {
  const speicher = new Map(), gesendet = [];
  const stummesElement = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = {
    console, setTimeout, clearTimeout,
    localStorage: {
      getItem: k => (speicher.has(k) ? speicher.get(k) : null),
      setItem: (k, v) => speicher.set(k, String(v)),
      removeItem: k => speicher.delete(k)
    },
    document: { querySelector: () => stummesElement },
    fetch: async (u, o) => { gesendet.push({ url: u, o,
      daten: o && o.body ? JSON.parse(o.body) : null }); return antwortet(u, o); }
  };
  vm.createContext(s);
  /* `let MAP`/`let ZBER` bleiben im Geltungsbereich des Ausschnitts —
     diese eine Zeile reicht sie heraus, ohne den Quelltext zu ändern. */
  vm.runInContext(QUELLE + `
    globalThis.__f = { flaschen, gebindeGroesse, abgleich, artName, GEBINDE_STANDARD,
      ladeZuordnung, sendeZuordnung, zeichne:()=>{},
      setzte:(map,geb,zber,vorg)=>{ MAP=map||{}; GEB_BEST=geb||{};
        ZBER=zber||{}; VORGAENGE=vorg||[]; REZ={}; } };`,
    s, { filename: "leitung.html#gebinde" });
  return { f: s.__f, gesendet, s };
}

/* Der Bericht, so wie ihn `abgleich()` erwartet: Betriebstag → geparster
   Bericht. Genau die Form, die `vomServer()` in leitung.html baut. */
const zber = () => ({ [BERICHT.tag]: BERICHT });

describe("Gebindegröße: eine Quelle, klare Auskunft", () => {
  test("nur bestätigte Werte gelten — geraten wird nichts", () => {
    const { f } = umgebung();
    f.setzte({}, {}, {}, []);
    const wein = f.gebindeGroesse("w001", "GV Leindl Langenlois 1/8 l");
    assert.equal(wein.quelle, "vorschlag", "750 ml für Wein ist ein Vorschlag, kein Befund");
    assert.equal(wein.ml, 750);
    const getr = f.gebindeGroesse("sanbitter", "Sanbitter Spritz 1 Glas");
    assert.equal(getr.quelle, null, "„Sanbitter“ trägt keine Größe im Namen");
    assert.equal(getr.ml, null);
  });

  test("die Größe im Artikelnamen ist ein Vorschlag, mapping.gebinde_ml ist Wahrheit", () => {
    const { f } = umgebung();
    f.setzte({ "Gasteiner Quellwasser 1l": "gasteiner" }, {}, {}, []);
    const v = f.gebindeGroesse("gasteiner", "Gasteiner Quellwasser 1l");
    assert.equal(v.quelle, "vorschlag");
    assert.equal(v.ml, 1000, "„Gasteiner 1 l“ steht im Artikelnamen");

    f.setzte({ "Gasteiner Quellwasser 1l": "gasteiner" },
             { "Gasteiner Quellwasser 1l": 1000 }, {}, []);
    assert.equal(f.gebindeGroesse("gasteiner", "Gasteiner Quellwasser 1l").quelle, "bestaetigt");
  });

  test("eine Bestätigung gilt für den Artikel, auch an einem anderen Kassennamen", () => {
    const { f } = umgebung();
    f.setzte({ "Prosecco, Serena 0,1l": "serena", "Prosecco, Serena 0,75l": "serena" },
             { "Prosecco, Serena 0,75l": 750 }, {}, []);
    const g = f.gebindeGroesse("serena", "Prosecco, Serena 0,1l");
    assert.equal(g.quelle, "bestaetigt");
    assert.equal(g.ml, 750);
  });

  test("widersprechen sich zwei Bestätigungen desselben Artikels, gilt keine", () => {
    /* Der wahrscheinliche Fehlgriff: auf der 0,1-l-Zeile wird das GLAS
       bestätigt statt der Flasche. Dann lieber keine Zahl als die falsche. */
    const { f } = umgebung();
    f.setzte({ "Prosecco, Serena 0,1l": "serena", "Prosecco, Serena 0,75l": "serena" },
             { "Prosecco, Serena 0,1l": 100, "Prosecco, Serena 0,75l": 750 }, {}, []);
    assert.equal(f.gebindeGroesse("serena", "Prosecco, Serena 0,1l").ml, 100,
      "der eigene Kassenname geht vor");
    const anderer = f.gebindeGroesse("serena", "MU Muster, Gelber Muskateller Styria 0,75 l");
    assert.notEqual(anderer.quelle, "bestaetigt", "der Widerspruch darf nicht durchschlagen");
  });

  test("für Spirituosen und Wasser wird kein Standard erfunden", () => {
    /* In STAMM gibt es keine einzige Spirituose, und `GETR` kennt nur die
       Ladengeometrie (Lade 6 trägt 0,33 l und 0,5 l nebeneinander). Ein
       Standard „Spirituose 700 ml" wäre geraten — er darf nicht
       zurückkommen. */
    const { f } = umgebung();
    assert.deepEqual(Object.keys(f.GEBINDE_STANDARD), ["wein"]);
  });
});

describe("flaschen(): rechnet oder sagt, was fehlt", () => {
  test("Ausschankmenge fehlt im Kassennamen → keine Zahl, kein geratenes Glas", () => {
    const { f } = umgebung();
    f.setzte({ "Sanbitter Spritz 1 Glas": "sanbitter" }, { "Sanbitter Spritz 1 Glas": 100 }, {}, []);
    const r = f.flaschen(pos("Sanbitter Spritz 1 Glas"), "sanbitter");
    assert.equal(r.ok, false);
    assert.equal(r.fehlt, "ausschank");
    assert.equal(r.fl, undefined, "bis v24 stand hier 1 Flasche je Glas");
  });

  test("Gebindegröße unbestätigt → keine Zahl, aber ein Vorschlag", () => {
    const { f } = umgebung();
    f.setzte({ "GV Leindl Langenlois 1/8 l": "w001" }, {}, {}, []);
    const r = f.flaschen(pos("GV Leindl Langenlois 1/8 l"), "w001");
    assert.equal(r.ok, false);
    assert.equal(r.fehlt, "gebinde");
    assert.equal(r.aus, 125, "das Achtel liest die Seite richtig");
    assert.equal(r.geb.ml, 750);
    assert.equal(r.geb.quelle, "vorschlag");
  });

  test("beides bestätigt → die Rechnung stimmt", () => {
    const { f } = umgebung();
    f.setzte({ "GV Leindl Langenlois 1/8 l": "w001",
               "MU Muster, Gelber Muskateller Styria 0,75 l": "w018",
               "Gasteiner Quellwasser 1l": "gasteiner" },
             { "GV Leindl Langenlois 1/8 l": 750,
               "MU Muster, Gelber Muskateller Styria 0,75 l": 750,
               "Gasteiner Quellwasser 1l": 1000 }, {}, []);
    const gv = f.flaschen(pos("GV Leindl Langenlois 1/8 l"), "w001");
    assert.equal(gv.ok, true);
    nah(gv.fl, 4 * 125 / 750, "4 Achtel sind zwei Drittel einer Flasche");
    const mu = f.flaschen(pos("MU Muster, Gelber Muskateller Styria 0,75 l"), "w018");
    nah(mu.fl, 1, "eine ganze Flasche bleibt eine ganze Flasche");
    const ga = f.flaschen(pos("Gasteiner Quellwasser 1l"), "gasteiner");
    nah(ga.fl, 1, "1 l aus einem 1-l-Gebinde");
  });

  test("ein 2-cl-Stamperl wird nicht zur Flasche", () => {
    /* „Amaro Averna Siciliano 2 cl“ × 3 = 60 ml. In den Stammdaten gibt es
       keine Spirituose; hier steht stellvertretend ein Getränkeartikel
       ohne Größe im Namen — genau die Lage, in der v24 drei Flaschen
       gebucht hat. */
    const { f } = umgebung();
    f.setzte({ "Amaro Averna Siciliano 2 cl": "noblier" }, {}, {}, []);
    const ohne = f.flaschen(pos("Amaro Averna Siciliano 2 cl"), "noblier");
    assert.equal(ohne.ok, false, "ohne bestätigte Flaschengröße wird nicht gerechnet");
    assert.equal(ohne.fehlt, "gebinde");

    f.setzte({ "Amaro Averna Siciliano 2 cl": "noblier" },
             { "Amaro Averna Siciliano 2 cl": 700 }, {}, []);
    const mit = f.flaschen(pos("Amaro Averna Siciliano 2 cl"), "noblier");
    nah(mit.fl, 3 * 20 / 700, "drei Stamperl sind 0,086 Flaschen, nicht 3");
    assert.ok(mit.fl < 0.1);
  });
});

describe("abgleich(): unbestätigte Größen sind keine Abweichung", () => {
  const MAP = { "GV Leindl Langenlois 1/8 l": "w001",
                "Amaro Averna Siciliano 2 cl": "noblier",
                "Sanbitter Spritz 1 Glas": "sanbitter" };
  /* Eine Tagesfassung, die vier Achtel-Weine nachgeholt hat. */
  const VORG = [{ mode: "tag", tag: BERICHT.tag, wein: { w001: 1 }, getr: {} }];

  test("ohne Bestätigung stehen sie in `ohneGroesse` und NICHT in `verk`", () => {
    const { f } = umgebung();
    f.setzte(MAP, {}, zber(), VORG);
    const a = f.abgleich(BERICHT.tag, 1);
    /* Array.from: `a` kommt aus der vm-Umgebung, ein dortiges Array ist
       für assert.deepEqual nicht dasselbe wie ein hiesiges. */
    const namen = Array.from(a.ohneGroesse, o => o.name).sort();
    /* Die automatisch erkannten Weine (`autoWein`) gehören genauso dazu —
       „automatisch zugeordnet" heisst nicht „Größe bekannt". */
    assert.deepEqual(namen, ["Amaro Averna Siciliano 2 cl", "BF Gesellmann Gols 1/8 l",
      "CH Gesellmann 1/8 l", "GV Leindl Langenlois 1/8 l",
      "MU Muster, Gelber Muskateller Styria 0,75 l", "Sanbitter Spritz 1 Glas"]);
    assert.equal(a.verk.w001, undefined, "kein erfundener Verkauf");
    assert.equal(a.verk.noblier, undefined);
    assert.equal(Object.keys(a.verk).length, 0);
    const w001 = a.zeilen.find(r => r.id === "w001");
    assert.equal(w001.verkauf, 0);
    assert.equal(w001.diff, 1, "die Entnahme steht da, aber sie ist kein Befund über den Verkauf");
    assert.equal(a.offen.some(o => o.name === "GV Leindl Langenlois 1/8 l"), false,
      "„zugeordnet, Größe fehlt“ ist NICHT dasselbe wie „nicht zugeordnet“");
  });

  test("der Grund steht dabei, samt Vorschlag", () => {
    const { f } = umgebung();
    f.setzte(MAP, {}, zber(), VORG);
    const a = f.abgleich(BERICHT.tag, 1);
    const gv = a.ohneGroesse.find(o => o.name === "GV Leindl Langenlois 1/8 l");
    assert.equal(gv.fehlt, "gebinde");
    assert.equal(gv.geb.ml, 750);
    assert.equal(gv.anzahl, 4, "die Menge aus dem echten Bericht");
    const sb = a.ohneGroesse.find(o => o.name === "Sanbitter Spritz 1 Glas");
    assert.equal(sb.fehlt, "ausschank");
  });

  test("nach der Bestätigung wandert die Position in die Rechnung", () => {
    const { f } = umgebung();
    f.setzte(MAP, { "GV Leindl Langenlois 1/8 l": 750 }, zber(), VORG);
    const a = f.abgleich(BERICHT.tag, 1);
    nah(a.verk.w001, 4 * 125 / 750, "vier Achtel");
    const w001 = a.zeilen.find(r => r.id === "w001");
    nah(w001.diff, 1 - 4 * 125 / 750, "eine geholte Flasche minus vier Achtel Verkauf");
    assert.equal(a.ohneGroesse.some(o => o.name === "GV Leindl Langenlois 1/8 l"), false);
  });
});

describe("Der Weg zum Server", () => {
  test("`mapping.gebinde_ml` wird beim Laden mitgelesen", async () => {
    const { f } = umgebung(() => new Response(JSON.stringify({ mapping: [
      { kassenname: "Raschhofer Pils 0,5l", artikel: "hell", ignoriert: 0, gebinde_ml: 500 },
      { kassenname: "Käse", artikel: null, ignoriert: 1, gebinde_ml: null } ] }),
      { status: 200, headers: { "content-type": "application/json" } }));
    assert.equal(await f.ladeZuordnung(), true);
    const g = f.gebindeGroesse("hell", "Raschhofer Pils 0,5l");
    assert.equal(g.quelle, "bestaetigt", "der einzige bestätigte Wert darf nicht wieder weggeworfen werden");
    assert.equal(g.ml, 500);
  });

  test("eine Zuordnung schickt die Gebindegröße immer mit", async () => {
    /* `POST /api/mapping` schreibt die Zeile als Ganzes (UPSERT mit
       excluded.*). Fehlt `gebinde_ml` im Körper, löscht ein Wechsel der
       Zuordnung die bestätigte Größe in der Datenbank. */
    const { f, gesendet } = umgebung();
    f.setzte({ "Raschhofer Pils 0,5l": "hell" }, { "Raschhofer Pils 0,5l": 500 }, {}, []);
    await f.sendeZuordnung("Raschhofer Pils 0,5l", "hell");
    assert.equal(gesendet.length, 1);
    assert.deepEqual(gesendet[0].daten, { kassenname: "Raschhofer Pils 0,5l",
      artikel: "hell", ignoriert: 0, gebinde_ml: 500 });
  });

  test("der Worker nimmt genau diesen Körper an", () => {
    /* Gegenprobe gegen `src/index.js`: Feldname und Spalte müssen
       zusammenpassen (Regel 4), sonst schreibt die Seite ins Leere. */
    const w = lies("src", "index.js");
    assert.match(w, /const \{ kassenname, artikel, ignoriert, gebinde_ml/);
    assert.match(w, /INSERT INTO mapping \(fremd, status, artikel, gebinde_ml, wer, angelegt\)/);
    assert.match(lies("docs", "live-schema.sql"), /gebinde_ml INTEGER/);
  });
});
