/* „Kein Abgleich möglich" — die Entnahme ohne Urteil.

   Der Anlass (Fund A-5 der Jagd, der teuerste): `abgleich()` bildet seine
   Zeilen aus `keys(verk) ∪ keys(ent)`. Eine Kassenposition ohne bestätigte
   Gebindegröße fällt aus `verk` heraus — der Artikel steht aber über die
   Tagesfassung in `ent`. Ergebnis mit dem Mapping, wie es in der Live-D1
   steht (13 Namen, `gebinde_ml` überall NULL) und Bericht 37:

       verk = {}   →   „Verkauf 0,00 · Entnahme 7 · Diff +7 · PRÜFEN"
                       Deutung: „mehr geholt als verkauft — Vorrat
                       aufgebaut oder Schwund", rote Zahl in der Navigation

   Der Hinweis über derselben Tabelle sagte wörtlich, diese Positionen
   zählten „weder als Verkauf noch als Abweichung". Auf der Verkaufsseite
   stimmte das, auf der Entnahmeseite nicht.

   Geprüft wird der ausgelieferte Code selbst, mit den Zahlen aus
   `tests/fixtures/zbericht-37-extended.csv` und dem echten Parser.

   Die Gegenprobe steht ausdrücklich mit drin: ein echter Fehlbestand muss
   weiterhin als Abweichung dastehen. Eine Vorsicht, die alles verschluckt,
   wäre derselbe Schaden mit umgekehrtem Vorzeichen.                     */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt, lies } from "./hilfe/dateien.mjs";
import { parseZ } from "../src/gnparse.js";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");
const BERICHT = parseZ(lies("tests", "fixtures", "zbericht-37-extended.csv"));
const TAG = BERICHT.tag;

function umgebung() {
  const speicher = new Map();
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout,
    localStorage: { getItem: k => (speicher.has(k) ? speicher.get(k) : null),
      setItem: (k, v) => speicher.set(k, String(v)), removeItem: k => speicher.delete(k) },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.zeichne = () => {};
    globalThis.__f = { abgleich, UNKLAR_GRUND, unklarSatz,
      setzte: (map, geb, zber, vorg, rez) => { MAP = map || {}; GEB_BEST = geb || {};
        ZBER = zber || {}; VORGAENGE = vorg || []; REZ = rez || {}; } };`,
    s, { filename: "leitung.html#unklar" });
  return s.__f;
}

/* Ein Vorgang in der Form, die `normVorgang` liefert. */
const vorgang = (wein, getr) => ({ mode: "tag", tag: TAG, wein: wein || {}, getr: getr || {} });
/* Ein Z-Bericht in der Form, die `vomServer()` ablegt. */
const bericht = positionen => ({ [TAG]: { tag: TAG, nr: 99, positionen, umsatz: 0 } });

const zeile = (a, id) => a.zeilen.find(r => r.id === id);
/* Was die rote Zahl in der Navigation zählt (`zaehler("abgleich")`). */
const auffaellig = a => a.zeilen.filter(r => !r.unklar && Math.abs(r.diff) >= 1).length;

describe("Verkauf nicht bestimmbar: keine Differenz, keine Deutung", () => {
  test("Live-Lage: 13 Zuordnungen, keine bestätigte Größe, ein echter Bericht", () => {
    const f = umgebung();
    const namen = BERICHT.positionen.slice(0, 13).map(p => p.name);
    const MAP = {}; namen.forEach((n, i) => (MAP[n] = ["w001", "w003", "w018"][i % 3]));
    f.setzte(MAP, {}, { [TAG]: BERICHT }, [vorgang({ w001: 3, w003: 2 }, {})]);
    const a = f.abgleich(TAG, 1);

    assert.equal(Object.keys(a.verk).length, 0, "die Ausgangslage: verk ist leer");
    assert.ok(a.zeilen.length > 0, "die Entnahme steht weiterhin da");
    for (const r of a.zeilen) {
      assert.equal(r.unklar, "groesse", r.name + " müsste „Größe fehlt“ sagen");
      assert.equal(r.diff, null, r.name + ": keine Differenz ohne Verkauf");
      assert.ok(r.entnahme > 0, r.name + ": die Entnahme bleibt sichtbar");
    }
    assert.equal(auffaellig(a), 0, "keine rote Zahl in der Navigation");
  });

  test("der Grund steht in Klartext und für alle Leser gleich", () => {
    const f = umgebung();
    assert.equal(f.UNKLAR_GRUND.groesse, "Größe fehlt");
    assert.equal(f.unklarSatz("groesse"), "kein Abgleich möglich — Größe fehlt");
    assert.equal(f.unklarSatz("offen"),
      "kein Abgleich möglich — Kassenpositionen sind nicht zugeordnet");
    assert.equal(f.unklarSatz("keinbericht"),
      "kein Abgleich möglich — kein Z-Bericht im Zeitraum");
  });

  test("bestätigte Größe → die Zeile bekommt ihren Befund zurück", () => {
    const f = umgebung();
    f.setzte({ "GV Leindl Langenlois 1/8 l": "w001" },
             { "GV Leindl Langenlois 1/8 l": 750 },
             bericht([{ name: "GV Leindl Langenlois 1/8 l", anzahl: 4 }]),
             [vorgang({ w001: 1 }, {})]);
    const r = zeile(f.abgleich(TAG, 1), "w001");
    assert.equal(r.unklar, null);
    assert.ok(Math.abs(r.verkauf - 4 * 125 / 750) < 0.0005, "4 Achtel");
    assert.ok(Math.abs(r.diff - (1 - 4 * 125 / 750)) < 0.0005);
  });

  test("echter Fehlbestand bleibt ein Befund — die Vorsicht verschluckt nichts", () => {
    /* Alles zugeordnet, alle Größen bestätigt, nichts offen: w018 ist
       verkauft und geholt, w001 wurde geholt und nie verkauft. Genau
       dafür gibt es diesen Schirm. */
    const f = umgebung();
    f.setzte({ "MU Muster, Gelber Muskateller Styria 0,75 l": "w018" },
             { "MU Muster, Gelber Muskateller Styria 0,75 l": 750 },
             bericht([{ name: "MU Muster, Gelber Muskateller Styria 0,75 l", anzahl: 1 }]),
             [vorgang({ w018: 4, w001: 2 }, {})]);
    const a = f.abgleich(TAG, 1);
    assert.equal(zeile(a, "w018").unklar, null);
    assert.ok(Math.abs(zeile(a, "w018").diff - 3) < 0.0005, "4 geholt, 1 verkauft");
    assert.equal(zeile(a, "w001").unklar, null,
      "ohne offene Kassenposition ist eine Entnahme ohne Verkauf ein Befund");
    assert.equal(zeile(a, "w001").diff, 2);
    assert.equal(auffaellig(a), 2);
  });

  test("nicht zugeordnete Kassenpositionen: Entnahme ohne Verkauf bekommt kein Urteil", () => {
    /* Solange Kassenpositionen offen sind, kann die Entnahme eines
       Artikels ohne gerechneten Verkauf genau daher stammen. Wer eine
       gerechnete Zahl hat, behält seine Differenz. */
    const f = umgebung();
    f.setzte({ "MU Muster, Gelber Muskateller Styria 0,75 l": "w018" },
             { "MU Muster, Gelber Muskateller Styria 0,75 l": 750 },
             bericht([{ name: "MU Muster, Gelber Muskateller Styria 0,75 l", anzahl: 1 },
                      { name: "Unbekanntes Getränk 0,5 l", anzahl: 9 }]),
             [vorgang({ w018: 4, w001: 2 }, {})]);
    const a = f.abgleich(TAG, 1);
    assert.equal(a.offen.length, 1);
    assert.equal(zeile(a, "w001").unklar, "offen");
    assert.equal(zeile(a, "w001").diff, null);
    assert.equal(zeile(a, "w001").entnahme, 2, "die Entnahme bleibt stehen");
    assert.equal(zeile(a, "w018").unklar, null, "gerechnet bleibt gerechnet");
    assert.ok(Math.abs(zeile(a, "w018").diff - 3) < 0.0005);
    assert.equal(auffaellig(a), 1);
  });

  test("kein Z-Bericht im Zeitraum: die Verkaufsseite ist unbekannt, nicht null", () => {
    const f = umgebung();
    f.setzte({}, {}, {}, [vorgang({ w001: 5 }, {})]);
    const a = f.abgleich(TAG, 1);
    assert.equal(a.berichte, 0);
    assert.equal(zeile(a, "w001").unklar, "keinbericht");
    assert.equal(zeile(a, "w001").diff, null);
    assert.equal(zeile(a, "w001").entnahme, 5);
  });

  test("Rezept mit Lücke: ALLE Bestandteile bleiben ohne Urteil", () => {
    /* Fehlt einem Bestandteil die Größe, bleibt die ganze Kassenposition
       draußen — dann fehlt der Verkauf jedes Bestandteils, nicht nur der
       des einen mit der Lücke. */
    const f = umgebung();
    f.setzte({ "Prosecco, Serena 0,75l": "serena" },
             { "Prosecco, Serena 0,75l": 750 },
             bericht([{ name: "Hausspritzer", anzahl: 12 }]),
             [vorgang({}, { serena: 2, sanbitter: 1 })],
             { "Hausspritzer": [{ id: "serena", ml: 100 }, { id: "sanbitter", ml: 50 }] });
    const a = f.abgleich(TAG, 1);
    assert.equal(a.ohneGroesse.length, 1, "die Position steht einmal in der Liste");
    assert.equal(zeile(a, "serena").unklar, "groesse", "der bestätigte Bestandteil auch");
    assert.equal(zeile(a, "sanbitter").unklar, "groesse");
    assert.equal(zeile(a, "serena").diff, null);
    assert.equal(auffaellig(a), 0);
  });

  test("unklare Zeilen stehen am Ende der Tabelle", () => {
    const f = umgebung();
    f.setzte({ "MU Muster, Gelber Muskateller Styria 0,75 l": "w018" },
             { "MU Muster, Gelber Muskateller Styria 0,75 l": 750 },
             bericht([{ name: "MU Muster, Gelber Muskateller Styria 0,75 l", anzahl: 1 },
                      { name: "Unbekanntes Getränk 0,5 l", anzahl: 9 }]),
             [vorgang({ w018: 4, w001: 2 }, {})]);
    const reihe = Array.from(f.abgleich(TAG, 1).zeilen, r => r.id);
    assert.deepEqual(reihe, ["w018", "w001"]);
  });
});
