/* Derselbe Vorgang, zwei Rechner, eine Antwort.

   Im Keller rechnet die App beim Abschluss den Vortagsabgleich
   (`abgleichZeilen` → `verbrauchteMengen`, public/index.html). Im
   Backoffice rechnet `abgleich()` über `normVorgang` dieselbe Frage noch
   einmal (public/leitung.html). Zwei Rechnungen an zwei Orten, ohne
   gemeinsame Quelle — solange sie dasselbe sagen, merkt es niemand.

   Bis Runde 20 sagten sie es NICHT: Die App nahm, was aus dem Keller
   getragen wurde, das Backoffice ebenso — beide also die Entnahme.
   Sobald im Lager weniger lag als oben fehlte (`holtN`/`gholtN`), war
   das die falsche Zahl, und zwar an beiden Orten. Seit Runde 20 rechnen
   beide mit dem Verbrauch.

   Diese Prüfung stellt sie gegeneinander: mit Abweichung und ohne.
   Punkt 6 aus dem Nachweis der Runde.                                 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt, lies } from "./hilfe/dateien.mjs";

const APP = lies("public", "index.html");

/* Eine Funktion samt Rumpf aus der Datei schneiden. Wie in
   tests/runde16.test.mjs — Zeilennummern altern, Namen nicht. */
function funktion(name) {
  const a = APP.indexOf("function " + name + "(");
  assert.ok(a > 0, name + " fehlt in public/index.html");
  let tiefe = 0;
  for (let j = APP.indexOf("{", a); j < APP.length; j++) {
    if (APP[j] === "{") tiefe++;
    else if (APP[j] === "}") { tiefe--; if (!tiefe) return APP.slice(a, j + 1); }
  }
  assert.fail(name + ": keine schliessende Klammer");
}

/* Die App-Seite mit dem ECHTEN Ladensoll — nicht mit einer kleinen
   nachgebauten Fassung. Genau das Soll ist Teil der Rechnung. */
function keller() {
  const q = ausschnitt("const GETR = {", "function gMasse(", "public/index.html");
  const s = { console }; vm.createContext(s);
  vm.runInContext(q + "\n" + funktion("gefassteMengen") + "\n"
    + funktion("verbrauchteMengen")
    + "\nglobalThis.__ = { gefassteMengen, verbrauchteMengen, GSOLL };", s,
    { filename: "index.html#mengen" });
  return s.__;
}
function backoffice() {
  const q = ausschnitt("const STAMM = {", "/* ════════════ 7f · Speicher",
                       "public/leitung.html");
  const stumm = { classList: { add() {}, remove() {} }, textContent: "",
                  querySelectorAll: () => [], appendChild() {}, innerHTML: "" };
  const s = { console, setTimeout, clearTimeout, Intl,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => stumm, createElement: () => stumm,
                addEventListener() {} },
    addEventListener() {}, fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(q + `
    globalThis.zeichne = () => {};
    globalThis.__ = { normVorgang, GSOLL };`, s, { filename: "leitung.html#norm" });
  return s.__;
}
const K = keller(), B = backoffice();

/* Zwei Töpfe Position für Position vergleichbar machen: als eine Zeile
   Text, sortiert. Leere Zahlen fallen weg — „nicht da" und „0" sind
   dasselbe Nichts. */
const alsText = o => Object.keys(o || {}).filter(id => +o[id])
  .sort().map(id => id + "=" + (+o[id])).join(" ");

/* Der echte Vorgang vom 20.09., gekürzt auf das, was gerechnet wird.
   Die Zahlen stammen aus tag_2026-09-20 (Asad). */
const basis = () => ({
  mode: "tag", tag: "2026-09-20", name: "Asad", finished: true,
  barrot: {}, bar: { serena: 8, w001: 2, w043: 1 }, backup: {},
  rest: { w024: 1, w028: 3, w031: 1, w065: 3, w032: 1,
          w001: 1, w023: 1, w045: 2 },
  zusatz: {}, gzusatz: {},
  getr: { johan: 1, mara: 3, gasteiner: 11, sanbitter: 9, wildberry: 9,
          gingerale: 5, gastklein: 2, cola: 3, colaz: 4, orange: 5,
          st03: 2, hefe0: 3, hell: 5 },
  gent: { johan: 1, mara: 1, sanbitter: 1, gingerale: 4, gastklein: 6,
          cola: 4, colaz: 3, orange: 2, st03: 6, hefe0: 4, hell: 2,
          gasteiner: 4 },
  holtN: {}, gholtN: {}
});

describe("Keller und Backoffice rechnen denselben Verbrauch", () => {
  test("ohne Abweichung — der Normalfall, und er bleibt wie er war", () => {
    const d = basis();
    assert.equal(alsText(K.verbrauchteMengen(d)),
                 alsText(B.normVorgang(d).verbraucht));
  });

  test("mit Abweichung beim Wein: im Lager lagen nur zwei von dreien", () => {
    /* w065: oben fehlten 3, getragen wurden 2. Der Verbrauch bleibt 3 —
       auf beiden Seiten. Vor Runde 20 stand hier beidseits 2. */
    const d = basis(); d.holtN = { w065: 2 };
    assert.equal(alsText(K.verbrauchteMengen(d)),
                 alsText(B.normVorgang(d).verbraucht));
    assert.equal(K.verbrauchteMengen(d).w065, 3, "die Lücke oben, nicht der Weg");
    assert.equal(K.gefassteMengen(d).w065, 2, "der Bestand sieht die zwei");
    assert.equal(B.normVorgang(d).wein.w065, 2, "das Backoffice ebenso");
  });

  test("mit Abweichung beim Getränk", () => {
    const d = basis(); d.gholtN = { st03: 3 };
    assert.equal(alsText(K.verbrauchteMengen(d)),
                 alsText(B.normVorgang(d).verbraucht));
    assert.equal(K.verbrauchteMengen(d).st03, 6, "Soll 8 minus gezählt 2");
  });

  test("zusätzlich Entnommenes zählt auf beiden Seiten gleich", () => {
    const d = basis(); d.zusatz = { w005: 2 }; d.gzusatz = { cola: 1 };
    assert.equal(alsText(K.verbrauchteMengen(d)),
                 alsText(B.normVorgang(d).verbraucht));
  });

  test("auch die Entnahme selbst stimmt überein", () => {
    /* Die zweite Zahl darf dabei nicht verrutschen. `wein` und `getr`
       im Backoffice sind zusammen, was die App als `gefassteMengen`
       kennt — und was der Worker ins Journal schreibt. */
    const d = basis(); d.holtN = { w065: 2 }; d.gholtN = { st03: 3 };
    const o = B.normVorgang(d);
    assert.equal(alsText(K.gefassteMengen(d)),
                 alsText(Object.assign({}, o.wein, o.getr)));
  });

  test("Sonderentnahme und Nachfüllen ebenso", () => {
    for (const d of [
      { mode: "nach", tag: "2026-09-20", name: "Asad", finished: true,
        grund: "bruch", ent: { w001: 1 }, gent: { cola: 2 } },
      { mode: "fuellen", tag: "2026-09-20", name: "Asad", finished: true,
        barrot: {}, bar: { w001: 2 }, backup: {}, rest: {},
        getr: { cola: 5 }, gent: { cola: 2 }, zusatz: {}, gzusatz: {} }
    ]) {
      assert.equal(alsText(K.verbrauchteMengen(d)),
                   alsText(B.normVorgang(d).verbraucht), d.mode);
    }
  });

  test("beide Seiten laufen denselben Weg durch den Keller", () => {
    /* Der Fund dieser Runde: `ZORD` stand im Backoffice als
       {1,2,3,4,5,6,7}, in der App als {1,2,5,3,4,6,7} — unter einem
       Kommentar, der „wortgleich" behauptete. Die Zonennummer ist nicht
       die Gehrichtung: Natural (5) kommt vor Weiss (3).

       Geprüft wird das Ergebnis, nicht der Wortlaut: beide Ordnungen
       über ALLE Weine laufen lassen und die Reihenfolge vergleichen.
       Eine Textprüfung fiele bei jeder harmlosen Umformatierung um und
       liesse eine echte Abweichung durch, die anders geschrieben ist. */
    const ordnung = (datei, ruf) => {
      const q = lies("public", datei);
      /* Der Regalplan: in der App ein eigenes Literal, im Backoffice ein
         Feld von `STAMM`. Beide werden mitgelesen — geht auch DER
         auseinander, fällt diese Prüfung ebenfalls. */
      const lit = (marke) => {
        const a = q.indexOf(marke);
        assert.ok(a > 0, datei + ": " + marke + " fehlt");
        return JSON.parse(q.slice(a + marke.length, q.indexOf(";\n", a)));
      };
      const daten = datei === "index.html"
        ? { WINES: lit("const WINES = "), PLAN: lit("const PLAN = ") }
        : (x => ({ WINES: x.WINES, PLAN: x.PLAN }))(lit("const STAMM = "));

      const a = q.indexOf("const ZORD");
      assert.ok(a > 0, datei + ": ZORD fehlt");
      const zord = q.slice(a, q.indexOf(";", a) + 1);
      const b = q.indexOf("function wegCmp(");
      assert.ok(b > 0, datei + ": wegCmp fehlt");
      let tiefe = 0, ende = -1;
      for (let j = q.indexOf("{", b); j < q.length; j++) {
        if (q[j] === "{") tiefe++;
        else if (q[j] === "}") { tiefe--; if (!tiefe) { ende = j + 1; break; } }
      }
      const f = new Function("WINES", "PLAN",
        zord + "\nconst ZR=z=>ZORD[z]||z||99;\nconst WIDX={};"
        + "WINES.forEach((w,i)=>WIDX[w.id]=i);\n" + q.slice(b, ende)
        + "\nreturn " + ruf + ";");
      return { sortiere: f(daten.WINES, daten.PLAN), daten };
    };
    /* Die App vergleicht Wein-Objekte, das Backoffice Artikel-ids — der
       einzige erlaubte Unterschied zwischen den beiden Fassungen. */
    const A = ordnung("index.html", "l=>l.map(id=>({id})).sort(wegCmp).map(w=>w.id)");
    const B = ordnung("leitung.html", "l=>[...l].sort(wegCmp)");
    const ids = A.daten.WINES.map(w => w.id);
    assert.equal(ids.join(","), B.daten.WINES.map(w => w.id).join(","),
      "schon die Weinliste läuft auseinander");
    assert.equal(A.sortiere(ids).join(","), B.sortiere(ids).join(","));
    /* Und die Gehrichtung ist wirklich die des Kellers, nicht die
       Zonennummer: Natural steht vor Weiss. */
    const zonen = A.sortiere(ids).map(id => A.daten.PLAN.zone[id]);
    assert.ok(zonen.indexOf(5) < zonen.indexOf(3),
      "Natural muss vor Weiss kommen — sonst ist ZORD wieder aufsteigend");
  });

  test("beide Seiten benutzen dasselbe Ladensoll", () => {
    /* Sonst stimmten die Zeilen oben nur zufällig. */
    assert.equal(alsText(K.GSOLL), alsText(B.GSOLL));
  });
});
