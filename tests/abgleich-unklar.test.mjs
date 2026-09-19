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
    /* BERICHTIGT (sechste Jagd Runde 16): Hier stand für JEDE Zeile
       „Größe fehlt". Das war zu grob — `flaschen()` unterscheidet seit je
       zwei Ursachen, und in Bericht 37 haben 26 von 48 Positionen gar
       keine Menge im Kassennamen („Aperol Spritz 1 Glas"). Für die ist
       „Größe fehlt" eine Falschauskunft: Sie schickt die Leitung ins
       Backoffice, wo es nichts zu bestätigen gibt — was fehlt, fehlt der
       KASSE. Geprüft wird jetzt beides: dass keine Differenz entsteht
       (das ist der Kern) UND dass der Grund der richtige ist. */
    for (const r of a.zeilen) {
      assert.ok(["groesse", "menge"].includes(r.unklar),
        r.name + ": unerwarteter Grund " + r.unklar);
      assert.equal(r.diff, null, r.name + ": keine Differenz ohne Verkauf");
      assert.ok(r.entnahme > 0, r.name + ": die Entnahme bleibt sichtbar");
    }
    assert.equal(auffaellig(a), 0, "keine rote Zahl in der Navigation");
  });

  test("der Grund steht in Klartext und für alle Leser gleich", () => {
    const f = umgebung();
    assert.equal(f.UNKLAR_GRUND.groesse, "Größe fehlt");
    assert.equal(f.unklarSatz("groesse"), "kein Abgleich möglich — Größe fehlt");
    assert.equal(f.unklarSatz("keinbericht"),
      "kein Abgleich möglich — kein Z-Bericht im Zeitraum");
    /* Bis v28 stand hier ein dritter Grund „offen". Er ist fort
       (`review/ENTSCHIEDEN-NACHTS.md`, Punkt 9) — siehe die Prüfung
       „eine nicht zugeordnete Kassenposition nimmt keinem Artikel den
       Befund" weiter unten. Es bleiben zwei Gründe. */
    /* Seit der sechsten Jagd ein dritter: „menge" — im Kassennamen steht
       keine Menge. Das ist eine andere Aufgabe als eine fehlende Größe
       und gehört anders benannt. */
    assert.equal(f.UNKLAR_GRUND.menge, "keine Menge im Kassennamen");
    assert.equal(f.unklarSatz("menge"),
      "kein Abgleich möglich — keine Menge im Kassennamen");
    assert.deepEqual(Object.keys(f.UNKLAR_GRUND).sort(),
      ["groesse", "keinbericht", "menge"]);
  });

  /* Die beiden Ursachen dürfen nicht durcheinandergeraten: Eine Position
     MIT Menge im Namen, aber ohne bestätigte Größe, ist Arbeit der
     Leitung; eine OHNE Menge im Namen ist es nicht. */
  test("die beiden Ursachen werden auseinandergehalten", () => {
    const mitMenge = umgebung();
    mitMenge.setzte({ "GV Leindl Langenlois 1/8 l": "w001" }, {},
      bericht([{ name: "GV Leindl Langenlois 1/8 l", anzahl: 4 }]),
      [vorgang({ w001: 1 }, {})]);
    assert.equal(zeile(mitMenge.abgleich(TAG, 1), "w001").unklar, "groesse",
      "Menge im Namen, Größe nicht bestätigt → Arbeit der Leitung");

    const ohneMenge = umgebung();
    ohneMenge.setzte({ "Aperol Spritz 1 Glas": "w001" }, {},
      bericht([{ name: "Aperol Spritz 1 Glas", anzahl: 4 }]),
      [vorgang({ w001: 1 }, {})]);
    assert.equal(zeile(ohneMenge.abgleich(TAG, 1), "w001").unklar, "menge",
      "keine Menge im Namen → das fehlt der Kasse, nicht dem Backoffice");
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

  test("eine nicht zugeordnete Kassenposition nimmt keinem Artikel den Befund", () => {
    /* Diese Prüfung stand bis v28 umgekehrt hier: Solange irgendeine
       Kassenposition offen war, bekam JEDER Artikel ohne gerechneten
       Verkauf „kein Abgleich möglich". Der Fund A/8-1 der Jagd hat das
       an Bericht 37 durchgerechnet: dreißig der offenen Namen sind
       Speisen (Schnittlauch, Käse, HP Omelett) — Speisen sind kein
       Ausnahmefall, sondern der Dauerzustand. Eine einzige davon schaltete
       den Schwund für alle ab: 12 Flaschen aus dem Keller, 0 verkauft,
       kein Urteil, keine rote Zahl, keine Zeile in der Zählliste.

       Entschieden (`review/ENTSCHIEDEN-NACHTS.md`, Punkt 9): Eine Position
       ohne Zuordnung betrifft per Definition keinen bestimmten Artikel und
       kann deshalb auch keinem den Befund nehmen. Was offen ist, sagt der
       Hinweis über der Tabelle — deshalb wird `a.offen` hier mitgeprüft. */
    const f = umgebung();
    f.setzte({ "MU Muster, Gelber Muskateller Styria 0,75 l": "w018" },
             { "MU Muster, Gelber Muskateller Styria 0,75 l": 750 },
             bericht([{ name: "MU Muster, Gelber Muskateller Styria 0,75 l", anzahl: 1 },
                      { name: "Unbekanntes Getränk 0,5 l", anzahl: 9 }]),
             [vorgang({ w018: 4, w001: 2 }, {})]);
    const a = f.abgleich(TAG, 1);
    assert.equal(a.offen.length, 1, "der Hinweis über der Tabelle zählt sie");
    assert.equal(a.offen[0].name, "Unbekanntes Getränk 0,5 l");
    assert.equal(zeile(a, "w001").unklar, null,
      "eine offene Speise darf den Schwund eines Weins nicht abschalten");
    assert.equal(zeile(a, "w001").diff, 2, "2 geholt, 0 verkauft");
    assert.equal(zeile(a, "w018").unklar, null, "gerechnet bleibt gerechnet");
    assert.ok(Math.abs(zeile(a, "w018").diff - 3) < 0.0005);
    assert.equal(auffaellig(a), 2, "beide Zeilen zählen in der roten Zahl mit");
  });

  test("halb gerechnet: die Differenz bleibt stehen, mit Vorbehalt", () => {
    /* Fund A/8-2: `nichtRechenbar(id,"groesse")` wurde im Berichtslauf
       gesetzt, bevor feststand, ob derselbe Artikel an einer späteren
       Position noch eine gerechnete Zahl bekommt — ein schon gerechneter
       Verkauf wurde damit rückwirkend gelöscht.

           „Prosecco, Serena 0,1 l"   6 × 100 ml / 750 = 0,80 Fl.
           „Prosecco, Serena 0,75 l"  1 × 750 ml / 750 = 1,00 Fl.
           Rezept „Aperol Spritz": ein Bestandteil ohne bestätigte Größe

       Bis v28: Verkauf —, Entnahme 9, Differenz —, „kein Abgleich
       möglich". 7,2 Flaschen Lücke, stumm. Jetzt: Differenz 7,2 mit dem
       Zusatz „1 von 3 Positionen ohne Größe". Lieber die Differenz MIT
       Vorbehalt als gar keine. */
    const f = umgebung();
    f.setzte({ "Prosecco, Serena 0,1 l": "spritzer", "Prosecco, Serena 0,75 l": "spritzer" },
             { "Prosecco, Serena 0,1 l": 750, "Prosecco, Serena 0,75 l": 750 },
             bericht([{ name: "Prosecco, Serena 0,1 l", anzahl: 6 },
                      { name: "Prosecco, Serena 0,75 l", anzahl: 1 },
                      { name: "Aperol Spritz", anzahl: 3 }]),
             [vorgang({}, { spritzer: 9, sanbitter: 2 })],
             { "Aperol Spritz": [{ id: "spritzer", ml: 100 }, { id: "sanbitter", ml: 20 }] });
    const a = f.abgleich(TAG, 1);
    const r = zeile(a, "spritzer");
    assert.equal(r.unklar, null, "ein gerechneter Verkauf wird nicht rückwirkend gelöscht");
    assert.ok(Math.abs(r.verkauf - 1.8) < 0.0005, "0,80 + 1,00 Flaschen");
    assert.ok(Math.abs(r.diff - 7.2) < 0.0005, "9 − 1,80");
    /* Feld für Feld statt `deepEqual`: das Objekt stammt aus dem
       vm-Kontext und hat damit einen anderen `Object`-Prototyp. */
    assert.equal(r.vorbehalt && r.vorbehalt.ohne, 1,
      "der Vorbehalt steht an der Zeile, statt den Befund zu löschen");
    assert.equal(r.vorbehalt.gesamt, 3, "1 von 3 Positionen ohne Größe");
    assert.equal(auffaellig(a), 1, "die Lücke zählt in der roten Zahl mit");

    /* Der Bestandteil, für den NICHTS gerechnet werden konnte, bleibt
       ohne Urteil — der Vorbehalt ersetzt die Vorsicht nicht. */
    assert.equal(zeile(a, "sanbitter").unklar, "groesse");
    assert.equal(zeile(a, "sanbitter").vorbehalt, null);
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
    /* w003 hat die größere Entnahme, aber keinen bestimmbaren Verkauf —
       er gehört trotzdem ans Ende. Bis v28 reichte für diese Prüfung eine
       offene Kassenposition; seit die keinen Artikel mehr stumm schaltet,
       wird die fehlende Gebindegröße genommen. */
    const f = umgebung();
    f.setzte({ "MU Muster, Gelber Muskateller Styria 0,75 l": "w018",
               "GV Leindl Langenlois 1/8 l": "w003" },
             { "MU Muster, Gelber Muskateller Styria 0,75 l": 750 },
             bericht([{ name: "MU Muster, Gelber Muskateller Styria 0,75 l", anzahl: 1 },
                      { name: "GV Leindl Langenlois 1/8 l", anzahl: 4 }]),
             [vorgang({ w018: 4, w003: 12 }, {})]);
    const a = f.abgleich(TAG, 1);
    assert.equal(zeile(a, "w003").unklar, "groesse");
    assert.deepEqual(Array.from(a.zeilen, r => r.id), ["w018", "w003"]);
  });
});
