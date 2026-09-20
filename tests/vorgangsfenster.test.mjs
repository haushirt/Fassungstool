/* Ein Vorgang, ein Fenster, eine Tabelle, EINE Sortierung.

   Der Anlass, wörtlich: „warum sind gezählt und aus dem keller geholt
   anders sortiert und nicht die gleiche anzahl."

   Beides stimmte. Das Fenster baute je Topf eine eigene Tabelle und
   sortierte jede absteigend nach Menge; bei Gleichstand entschied die
   Einfügereihenfolge der Objektschlüssel — und die ist im Zählblock die
   Stammdatenreihenfolge, im Holblock `barrot, bar, backup, rest`. Zwei
   Tabellen mit denselben Artikeln standen deshalb in verschiedener
   Reihenfolge und mit verschiedener Zeilenzahl nebeneinander.

   Seit Runde 20 gibt es je Abschnitt EINE Tabelle mit EINER Zeile je
   Artikel und zwei Zahlenspalten. Die Anzahl kann damit von Bauart her
   nicht mehr abweichen, und die Reihenfolge ist der Laufweg durch den
   Keller — dieselbe, die im Keller gilt.                              */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt } from "./hilfe/dateien.mjs";

/* Weiter als die anderen Prüfdateien: `vgTafel` steht bei den Ansichten. */
const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7f · Speicher",
                          "public/leitung.html");
function backoffice() {
  const stumm = { classList: { add() {}, remove() {} }, textContent: "",
                  querySelectorAll: () => [], appendChild() {}, innerHTML: "" };
  const s = { console, setTimeout, clearTimeout, Intl,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => stumm, createElement: () => stumm,
                addEventListener() {} },
    addEventListener() {}, fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.zeichne = () => {};
    globalThis.__f = { normVorgang, vgTafel, vgTafelHtml, vgWann, vgKopfZeile,
      vgFreigabeSatz, wegCmp, PLAN };`, s, { filename: "leitung.html#fenster" });
  return s.__f;
}
const F = backoffice();
const TAG = "2026-09-20";

/* Dieselben Mengen, aber die Schlüssel in anderer Reihenfolge und über
   andere Orte verteilt — genau das, was die Reihenfolge früher gedreht
   hat. */
const vorgangA = { mode: "tag", tag: TAG, name: "Asad", finished: true,
  barrot: {}, bar: { w001: 2, w043: 1 }, backup: {},
  rest: { w024: 1, w028: 3, w001: 1 },
  zusatz: {}, getr: { colaz: 4, cola: 3 }, gent: { colaz: 3, cola: 4 }, gzusatz: {} };
const vorgangB = { mode: "tag", tag: TAG, name: "Asad", finished: true,
  barrot: {}, bar: { w043: 1, w001: 2 }, backup: {},
  rest: { w001: 1, w028: 3, w024: 1 },
  zusatz: {}, getr: { cola: 3, colaz: 4 }, gent: { cola: 4, colaz: 3 }, gzusatz: {} };

/* Als Text vergleichen, nicht als Feld: Die Tabelle entsteht in einem
   eigenen VM-Kontext, ihre Felder haben deshalb einen anderen
   Array-Prototyp und `deepEqual` aus `assert/strict` stolpert darüber,
   obwohl der Inhalt gleich ist. Text vergleicht den Inhalt — und sagt
   im Fehlerfall auch gleich, welche Reihenfolge herauskam. */
const ids = tafel => tafel.map(a => a.titel + ":" + a.ids.join(",")).join(" | ");

describe("Eine Zeile je Artikel, und die Anzahl kann nicht abweichen", () => {
  const T = F.vgTafel(F.normVorgang(vorgangA));

  test("Wein und Getränke sind je ein Abschnitt mit zwei Spalten", () => {
    const zwei = T.filter(a => a.zwei).map(a => a.titel).join(" | ");
    assert.equal(zwei, "Wein | Getränke");
  });

  test("jeder Artikel steht genau einmal", () => {
    T.forEach(a => assert.equal(new Set(a.ids).size, a.ids.length, a.titel));
  });

  test("beide Zahlen einer Zeile stehen in DERSELBEN Zeile", () => {
    /* Der Kern: Es gibt keine zwei Listen mehr, deren Längen
       auseinandergehen könnten. */
    T.filter(a => a.zwei).forEach(a =>
      assert.equal(a.zeilen.length, a.ids.length, a.titel));
  });

  test("ein Artikel, der nur auf EINER Seite vorkommt, fällt nicht heraus", () => {
    /* Lücke gesehen, nichts geholt: verbraucht ja, geholt nein. Die
       Zeile muss trotzdem da sein, mit einem Strich in der zweiten
       Spalte — sonst verschwindet der Verbrauch aus dem Fenster. */
    const t = F.vgTafel(F.normVorgang(Object.assign({}, vorgangA,
      { getr: { colaz: 1 }, gent: {} })));
    const g = t.find(a => a.titel === "Getränke");
    const z = g.zeilen.find(x => x.id === "colaz");
    assert.equal(z.verbraucht, 6, "sieben minus eins");
    assert.equal(z.geholt, undefined, "nichts geholt — ein Strich, keine 0");
  });
});

describe("Die Sortierung hängt nicht von der Schlüsselreihenfolge ab", () => {
  test("derselbe Vorgang, andere Reihenfolge im Rohstand, gleiche Tabelle", () => {
    assert.equal(ids(F.vgTafel(F.normVorgang(vorgangA))),
                 ids(F.vgTafel(F.normVorgang(vorgangB))));
  });

  test("Wein steht im Laufweg durch den Keller", () => {
    /* Erst die Zone (Rot vor Rosé vor Weiss …), darin der Platz im
       Regal. Dieselbe Ordnung, in der die App zählen und holen lässt. */
    const w = F.vgTafel(F.normVorgang(vorgangA)).find(a => a.titel === "Wein");
    assert.equal(w.ids.join(","), [...w.ids].sort(F.wegCmp).join(","));
    /* Ausgeschrieben, damit die Prüfung nicht dieselbe Rechnung noch
       einmal macht: w024 und w028 stehen im Rotweinregal (Zone 1, darin
       Platz 0 vor Platz 4), w043 im Rosé am Eingang (Zone 2), w001 im
       Weissweinregal (Zone 3). */
    assert.equal(w.ids.join(","), "w024,w028,w043,w001");
  });

  test("gezählt und geholt stehen in derselben Reihenfolge", () => {
    /* Die Beschwerde, an der Wurzel gepackt: Ein Vorgang, der BEIDES
       trägt, muss beide Listen gleich ordnen. */
    const v = F.normVorgang({ mode: "keller", tag: TAG, name: "Asad", finished: true,
      zdone: { w043: 1, w024: 1, w001: 1 },
      reihen: { w043: 1, w024: 1, w001: 1 }, einzel: {} });
    const z = F.vgTafel(v).find(a => a.titel.startsWith("Gezählter Bestand · Wein"));
    assert.equal(z.ids.join(","), [...z.ids].sort(F.wegCmp).join(","));
    assert.equal(z.ids.join(","), "w024,w043,w001");
  });
});

describe("Was die Kopfzeile sagt", () => {
  test("die Uhrzeit kommt vom Gerät, nicht von der Ankunft", () => {
    const o = F.normVorgang(Object.assign({}, vorgangA,
      { zeit: TAG + "T11:04:00.000Z", archiviert: TAG + "T23:30:00.000Z" }));
    assert.match(F.vgWann(o), /^gefasst /);
    assert.doesNotMatch(F.vgWann(o), /angekommen/);
  });

  test("fehlt sie, wird die Ankunft gezeigt UND so genannt", () => {
    /* Nie stillschweigend vertauschen: Vorgänge aus dem Gerätespeicher
       tragen kein `zeit`. */
    const o = F.normVorgang(Object.assign({}, vorgangA,
      { zeit: undefined, archiviert: TAG + "T23:30:00.000Z" }));
    assert.match(F.vgWann(o), /^angekommen /);
  });

  test("ohne beides steht nichts da, keine erfundene Uhrzeit", () => {
    const o = F.normVorgang(Object.assign({}, vorgangA,
      { zeit: undefined, archiviert: undefined }));
    assert.equal(F.vgWann(o), "");
  });

  test("die Freigabe mit Code wird beim Namen genannt", () => {
    const o = F.normVorgang(Object.assign({}, vorgangA, { uebersteuert:
      { von: "Asad", offen: ["Nicht alle Positionen gezählt"] } }));
    const satz = F.vgFreigabeSatz(o);
    assert.match(satz, /Ohne Bestätigung freigegeben von Asad/);
    assert.match(satz, /Nicht alle Positionen gezählt/);
    assert.equal(F.vgFreigabeSatz(F.normVorgang(vorgangA)), "", "sonst nichts");
  });

  test("der Grund einer Sonderentnahme steht im Klartext", () => {
    const o = F.normVorgang({ mode: "nach", tag: TAG, name: "Asad",
      finished: true, ent: { w001: 1 }, grund: "bruch" });
    assert.match(F.vgKopfZeile(o), /Bruch/);
  });
});

describe("Das HTML sagt, wofür jede Zahl da ist", () => {
  /* Zeilenumbrueche im Quelltext sind im Browser ein Leerzeichen. Ein
     Satz, der in der Vorlage ueber zwei Zeilen laeuft, steht im HTML mit
     Umbruch und Einrueckung darin — geprueft wird, was der Leser sieht. */
  const flach = x => x.replace(/\s+/g, " ");
  const h = flach(F.vgTafelHtml(F.normVorgang(vorgangA)));

  test("beide Spaltenköpfe nennen ihren Auftrag", () => {
    assert.match(h, /oben gefehlt/);
    assert.match(h, /→ Z-Bericht/);
    assert.match(h, /aus dem Keller/);
    assert.match(h, /→ Bestand/);
  });

  test("am Handy steht die Kurzform daneben, nicht statt dessen", () => {
    /* Bei 393 px fiel die Namensspalte mit den langen Köpfen auf ein
       Wort je Zeile. Beide Formen stehen im HTML, die Medienabfrage
       entscheidet — so geht die Langform nicht verloren. */
    assert.match(h, /class="spL"/);
    assert.match(h, /class="spK"/);
  });

  test("eine Zeile, in der die Zahlen auseinandergehen, ist markiert", () => {
    const o = F.normVorgang(Object.assign({}, vorgangA, { holtN: { w001: 1 } }));
    const x = flach(F.vgTafelHtml(o));
    assert.match(x, /class="weicht"/);
    assert.match(x, /im Lager lagen nur 1/);
  });

  test("ohne Abweichung ist nichts markiert", () => {
    assert.doesNotMatch(h, /class="weicht"/);
  });

  test("zusätzlich Entnommenes steht an seiner Zeile", () => {
    const x = flach(F.vgTafelHtml(F.normVorgang(
      Object.assign({}, vorgangA, { zusatz: { w005: 2 } }))));
    assert.match(x, /davon 2 zusätzlich entnommen/);
  });

  test("unter der Tabelle steht, was die beiden Spalten bedeuten", () => {
    assert.match(h, /gegen die der Z-Bericht gerechnet wird/);
    assert.match(h, /geht vom Kellerstand ab/);
  });

  test("ein leerer Vorgang behauptet nichts", () => {
    const x = flach(F.vgTafelHtml(F.normVorgang({ mode: "tag", tag: TAG, finished: true })));
    assert.match(x, /keine Mengen bewegt und nichts gezählt/);
  });
});
