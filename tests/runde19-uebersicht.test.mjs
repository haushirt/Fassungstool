/* Die Übersicht sagt, was sie NICHT gerechnet hat.

   Anlass: die Jagd nach Runde 19. Der Filter `gebucht()` ist richtig —
   das Journal kennt einen laufenden Vorgang auch nicht —, aber er hat
   einen Weg geöffnet, den es vorher nicht gab: Zum ersten Mal fällt die
   ENTNAHME aus der Rechnung, nicht der Verkauf. Alle sechs Vorbehalte,
   die Druckblatt, CSV und Schirm führen, decken die andere Richtung ab.

   Gerechnet: 8 Flaschen verkauft, 6 geholt, Vorgang noch nicht
   abgeschlossen. Ohne Gegenmaßnahme steht dort „Verkauf 8 · Entnahme 0 ·
   Differenz −8 · mehr verkauft als geholt — Vorrat wird abgebaut" — eine
   Deutung über einen Keller, in dem nichts passiert ist.

   Dazu zwei kleinere Funde derselben Jagd:
   · Das Kettenglied „Zuordnung" stand grün auf „vollständig", wenn es
     gar keinen Z-Bericht und damit keinen einzigen Kassennamen gab.
   · „Läuft noch offen" zählte auch die LEEREN Stände mit, die die App
     beim Verwerfen absichtlich hinausschickt — für immer, mit der
     Aufforderung, sie im Keller abzuschliessen.                        */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt, lies } from "./hilfe/dateien.mjs";
import { parseZ } from "../src/gnparse.js";

/* Weiter als die anderen Prüfdateien: `kette`, `aufgaben` und
   `offeneVorgaenge` stehen IN der Übersicht, also hinter der Marke
   „7 · Ansichten". Gelesen wird deshalb bis zum Abgleich. */
const QUELLE = ausschnitt("const STAMM = {",
                          "/* ── Abgleich ──────────────",
                          "public/leitung.html");
const BERICHT = parseZ(lies("tests", "fixtures", "zbericht-37-extended.csv"));
const TAG = BERICHT.tag;

function umgebung() {
  const speicher = new Map();
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout, Intl,
    localStorage: { getItem: k => (speicher.has(k) ? speicher.get(k) : null),
      setItem: (k, v) => speicher.set(k, String(v)), removeItem: k => speicher.delete(k) },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.zeichne = () => {};
    globalThis.__f = { abgleich, kette, offeneVorgaenge, DEUTUNG, gebucht,
      setzte: (map, geb, zber, vorg) => { MAP = map || {}; GEB_BEST = geb || {};
        ZBER = zber || {}; VORGAENGE = vorg || []; REZ = {}; } };`,
    s, { filename: "leitung.html#uebersicht" });
  return s.__f;
}

const NAME = "GV Leindl Langenlois 1/8 l";
const bericht = (anzahl) => ({ [TAG]: { tag: TAG, nr: "Z 1", positionen:
  [{ name: NAME, anzahl, umsatz: anzahl * 4.5, ml: 125 }], umsatz: anzahl * 4.5 } });
/* Ohne abweichende Holmenge ist der Verbrauch gleich der Entnahme —
   siehe `normVorgang` seit Runde 20. */
const fassung = (fertig) => ({ mode: "tag", tag: TAG, fertig, name: "Lena",
  wein: { w001: 6 }, getr: {}, verbraucht: { w001: 6 },
  eingang: {}, zaehlung: null, gzaehlung: null,
  flWein: 6, flGetr: 0 });

describe("Ein laufender Vorgang verschweigt seine Entnahme nicht", () => {
  const lage = fertig => {
    const f = umgebung();
    f.setzte({ [NAME]: "w001" }, { [NAME]: 750 }, bericht(48), [fassung(fertig)]);
    return { f, a: f.abgleich(TAG, 1) };
  };

  test("abgeschlossen: Verkauf 8, Entnahme 6, Differenz −2", () => {
    const { a } = lage(true);
    const r = a.zeilen.find(x => x.id === "w001");
    assert.equal(r.verkauf, 8);
    assert.equal(r.entnahme, 6);
    assert.equal(r.diff, -2);
    assert.equal(a.stkLaufend, 0, "nichts ausgelassen");
    assert.equal(r.laufend, 0);
  });

  test("laufend: die Entnahme fällt heraus — und die Zeile sagt es", () => {
    const { a } = lage(false);
    const r = a.zeilen.find(x => x.id === "w001");
    assert.equal(r.entnahme, 0, "das Journal kennt sie auch nicht");
    assert.equal(r.laufend, 6, "die ausgelassene Menge steht an der Zeile");
    assert.equal(a.stkLaufend, 6, "und in der Summe");
    assert.equal(a.laufendImFenster, 1, "ein Vorgang");
  });

  test("ein Artikel, der NUR in einem laufenden Vorgang steht, fällt nicht aus der Liste", () => {
    /* Sonst verschwindet mit der Zeile auch der Hinweis. */
    const f = umgebung();
    f.setzte({}, {}, {}, [fassung(false)]);
    const a = f.abgleich(TAG, 1);
    const r = a.zeilen.find(x => x.id === "w001");
    assert.ok(r, "die Zeile steht da");
    assert.equal(r.laufend, 6);
  });

  test("Druckblatt und CSV nennen den fünften Weg mit eigenen Worten", () => {
    /* Die sechs bestehenden Vorbehalte decken nur die Verkaufsseite ab.
       Dieser hier ist der einzige auf der Entnahmeseite — er kehrt das
       Vorzeichen um und muss deshalb überall stehen, wo die anderen
       stehen. */
    const BO = lies("public", "leitung.html");
    assert.match(BO, /Vorgänge im Zeitraum sind"\)\s*\n\s*\+" noch nicht abgeschlossen/,
      "das Druckblatt nennt die ausgelassene Entnahme nicht");
    assert.match(BO, /Flaschen in noch nicht abgeschlossenen Vorgängen/,
      "der CSV-Kopf nennt sie nicht");
    assert.match(BO, /Fl\. in einem laufenden Vorgang, nicht gerechnet/,
      "die CSV-Zeile nennt sie nicht");
    assert.match(BO, /in laufenden Vorgängen nicht gerechnet/,
      "die Kachel „Aus dem Keller“ nennt sie nicht");
  });
});

describe("Das Kettenglied „Zuordnung“ behauptet nichts über eine leere Menge", () => {
  const B = { hat: false, b: {}, basis: null, seit: { ein: {}, raus: {} }, unklar: {} };

  test("ohne Z-Bericht steht es grau, nicht grün", () => {
    const f = umgebung();
    f.setzte({}, {}, {}, [fassung(true)]);
    const G = f.kette(f.abgleich(TAG, 1), B, fassung(true), TAG);
    assert.equal(G[2].t, "Zuordnung");
    assert.equal(G[2].k, "tot", "ohne Bericht gibt es keinen Kassennamen zu ordnen");
    assert.equal(G[3].k, "tot", "und der Abgleich wartet erst recht");
  });

  test("mit Bericht und ohne offene Namen steht es grün", () => {
    const f = umgebung();
    f.setzte({ [NAME]: "w001" }, { [NAME]: 750 }, bericht(48), [fassung(true)]);
    const G = f.kette(f.abgleich(TAG, 1), B, fassung(true), TAG);
    assert.equal(G[2].k, "ok");
  });

  test("mit offenen Namen steht es rot und der Abgleich wartet", () => {
    /* Ein Name OHNE Rebsortenkürzel — „GV Leindl …" ordnet `autoWein`
       von selbst zu und wäre gar nicht offen. */
    const f = umgebung();
    const fremd = { [TAG]: { tag: TAG, nr: "Z 1", umsatz: 9,
      positionen: [{ name: "Unbekanntes Getränk 0,5 l", anzahl: 2, umsatz: 9, ml: 500 }] } };
    f.setzte({}, {}, fremd, [fassung(true)]);
    const a = f.abgleich(TAG, 1);
    assert.equal(a.offen.length, 1, "der Prüffall braucht einen offenen Namen");
    const G = f.kette(a, B, fassung(true), TAG);
    assert.equal(G[2].k, "bad");
    assert.equal(G[3].k, "tot", "solange etwas offen ist, urteilt der Abgleich nicht");
  });
});

describe("„Läuft noch offen“ zählt nur, was Inhalt hat", () => {
  const leerVerworfen = { mode: "keller", tag: TAG, fertig: false, name: "Lena",
    wein: {}, getr: {}, verbraucht: {}, eingang: {}, zaehlung: null,
    gzaehlung: null, flWein: 0, flGetr: 0 };

  test("ein bewusst verworfener, leerer Stand zählt nicht mit", () => {
    /* Die App schickt ihn ausdrücklich hinaus, damit andere Geräte
       „läuft nicht mehr" sehen, und filtert ihn selbst wieder heraus
       (`fernHatInhalt`). Ohne dieselbe Schwelle stand er hier für immer
       als „noch abzuschliessen" — an etwas, das niemand abschliessen
       kann. */
    const f = umgebung();
    f.setzte({}, {}, {}, [leerVerworfen]);
    assert.equal(f.offeneVorgaenge().length, 0);
  });

  test("ein laufender Stand MIT Inhalt zählt weiter mit", () => {
    const f = umgebung();
    f.setzte({}, {}, {}, [fassung(false)]);
    assert.equal(f.offeneVorgaenge().length, 1);
  });

  test("eine laufende Zählung zählt mit, auch wenn sie nur Nullen enthält", () => {
    /* Eine gezählte 0 heisst „nichts mehr da" und ist eine Angabe. */
    const f = umgebung();
    f.setzte({}, {}, {}, [Object.assign({}, leerVerworfen, { zaehlung: { w001: 0 } })]);
    assert.equal(f.offeneVorgaenge().length, 1);
  });
});

describe("Beide Schwellen für den Vorgangs-Konflikt sind dieselbe", () => {
  test("die App fragt auch beim Gleichstand, wie der Server ihn wertet", () => {
    /* Der Server nennt seit Runde 19 den Gleichstand eines FREMDEN
       Geräts einen Konflikt (`vorgangSchreiben`). Sagte `fernNeuer` in
       der App weiter strikt `>`, wäre der eigene Stand ins Sackfach
       gegangen, ohne dass jemand gefragt wird — und der nächste
       Zwischenstand hätte den fremden 45 Sekunden später doch
       überschrieben. */
    const APP = lies("public", "index.html");
    assert.match(APP, /return \(v\.zaehlnr\|\|0\)>=eigen && \(v\.zaehlnr\|\|0\)>0 \? v : null;/,
      "`fernNeuer` fragt beim Gleichstand nicht");
    const WORKER = lies("src", "index.js");
    assert.match(WORKER, /zAlt > zNeu \|\| \(zAlt === zNeu && zAlt > 0 && fremd\)/,
      "der Worker wertet den Gleichstand nicht als Konflikt");
  });
});
