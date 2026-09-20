/* Ein Soll, zwei Dateien.

   Der Anlass (Runde 20 · A): App und Backoffice haben das Soll der
   Getränke aus zwei verschiedenen Ladenaufteilungen gerechnet. Die App
   nimmt das alte Regal heraus und ersetzt es durch Lade 2
   (`GETR.laden.filter(L=>L.id!=="regal")` plus `WLADEN`,
   `public/index.html`); im Backoffice fehlten beide Zeilen.

   Gemessen am echten Vorgang `tag_2026-09-20`: Gasteiner war mit 11
   gezählt, die App vermerkte 4 geholt (15 − 11), das Backoffice hätte 7
   erwartet (18 − 11). Bei „Gasteiner still" dasselbe in klein: App 4,
   Backoffice 1. Die übrigen 35 Getränke stimmten überein — genau die
   Sorte Abweichung, die niemand sucht und die nur in einer einzigen
   Spalte auffällt.

   Diese Prüfung rechnet beide Fassungen aus den AUSGELIEFERTEN Dateien
   und vergleicht sie Position für Position. Sie hätte den Fund von
   selbst gemeldet.                                                    */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt } from "./hilfe/dateien.mjs";

/* Beide Male wird der echte Block ausgeführt, nicht nachgebaut. Die
   Marken liegen bewusst hinter `colTeile` bzw. umschliessen es: Die
   Funktion wird hochgezogen, der IIFE von `GSOLL` läuft sofort. */
function gsollAusApp() {
  const q = ausschnitt("const GETR = {", "function gMasse(", "public/index.html");
  const s = { console }; vm.createContext(s);
  vm.runInContext(q + "\nglobalThis.__ = { GSOLL, GIDS };", s,
                  { filename: "index.html#gsoll" });
  return s.__;
}
function gsollAusBackoffice() {
  const q = ausschnitt("const STAMM = {", "const GN = id =>", "public/leitung.html");
  const s = { console }; vm.createContext(s);
  vm.runInContext(q + "\nglobalThis.__ = { GSOLL, GIDS };", s,
                  { filename: "leitung.html#gsoll" });
  return s.__;
}

describe("Das Soll der Getränke ist in App und Backoffice dasselbe", () => {
  const A = gsollAusApp(), B = gsollAusBackoffice();

  test("dieselben Getränke", () => {
    assert.deepEqual([...A.GIDS].sort().join(","), [...B.GIDS].sort().join(","));
  });

  test("dieselben Mengen, Position für Position", () => {
    const anders = [...new Set([...A.GIDS, ...B.GIDS])].sort()
      .filter(id => (A.GSOLL[id] || 0) !== (B.GSOLL[id] || 0))
      .map(id => `${id}: App ${A.GSOLL[id]} / Backoffice ${B.GSOLL[id]}`);
    assert.deepEqual(anders, [], "Soll läuft auseinander:\n  " + anders.join("\n  "));
  });

  test("das alte Regal ist auf beiden Seiten heraus", () => {
    /* Der eigentliche Fund: Gasteiner kommt aus Lade 2 (15), nicht mehr
       aus dem Regal (18). Die Zahlen stehen ausgeschrieben da, damit
       eine Änderung an der Lade diese Prüfung bewusst anfasst. */
    assert.equal(A.GSOLL.gasteiner, 15, "App");
    assert.equal(B.GSOLL.gasteiner, 15, "Backoffice");
    assert.equal(A.GSOLL.gastill, 4, "App");
    assert.equal(B.GSOLL.gastill, 4, "Backoffice");
  });

  test("ein Platz mit eigenem Topf zählt nicht ins Ladensoll", () => {
    /* In Lade 3 stehen offene Weine und Sekt — sie tragen im dritten
       Feld `"bar"` und gehören zur Barzählung, nicht zur Lade. Zählte
       man sie mit, bekäme der Serena ein Getränke-Soll. */
    assert.equal(A.GSOLL.serena, undefined, "App");
    assert.equal(B.GSOLL.serena, undefined, "Backoffice");
    assert.equal(A.GSOLL.noblier, 1, "Noblier hat keinen eigenen Topf und zählt");
    assert.equal(B.GSOLL.noblier, 1, "Backoffice");
  });
});
