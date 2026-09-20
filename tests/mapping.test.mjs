/* Harte Regel 5: Das Getränke-Automapping bleibt deaktiviert.

   Der Grund steht im Kopf von `src/gnmap.js` und ist teuer: Ein falscher
   Treffer bucht still den falschen Bestand ab. Die drei Beispiele dort
   sind die echten Fehltreffer der abgeschalteten Ähnlichkeitssuche —
   sie stehen hier als Prüfung, damit „wir bauen die Suche wieder ein"
   nicht unbemerkt durchgeht.

   Wein wird zugeordnet, weil die Kasse dort ein verbindliches Muster hat
   (KÜRZEL Winzer, Wein Grösse). Diese Prüfungen halten beide Seiten
   fest: dass Wein trifft UND dass Getränke nicht raten. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mappe } from "../src/gnmap.js";
import { lies } from "./hilfe/dateien.mjs";

describe("Regel 5: Getränke werden nicht automatisch zugeordnet", () => {
  /* Wörtlich die drei Fehltreffer aus dem Kopf von gnmap.js. */
  for (const name of [
    "Raschhofer Pils 0,5l",
    "Now-Limo Lemon 0,35l",
    "Prosecco, Serena 0,1l"
  ]) test(name + " → von Hand bestätigen", () => {
    assert.equal(mappe(name), null,
      "die Ähnlichkeitssuche ist zurück — Regel 5 verbietet das");
  });

  test("auch Getränke, die wie ein Rebsortenkürzel anfangen, treffen nicht", () => {
    for (const n of ["RED Bull 0,25l", "IPA Brew Age 0,33l", "COLA Zero 0,33l"])
      assert.equal(mappe(n), null, n);
  });

  test("ein Name ohne Kürzel wird nie geraten", () => {
    for (const n of ["Espresso", "Almdudler", "Ott Fass 4", "", "   ", "Hugo 0,2l"])
      assert.equal(mappe(n), null, JSON.stringify(n));
  });

  test("im Worker gibt es keinen zweiten, lockereren Weg", () => {
    /* `fassungsliste()` darf nur über die bestätigte Zuordnung, die
       geprüfte Vorabliste und `mappe()` gehen und sonst `null` schreiben
       — sonst entsteht das Automapping an anderer Stelle neu.

       Die Vorabliste ist seit Runde 22 die zweite Stufe. Sie ist keine
       Lockerung: sie schlägt ganze Namen nach und vergleicht nichts
       (`vorab()` in `src/gnmap.js`). Diese Zeile hält fest, dass es bei
       genau diesen drei Stufen bleibt. */
    const w = lies("src", "index.js");
    assert.equal(/levenshtein|aehnlich|ähnlich|similar|fuzzy|bestMatch/i.test(w), false,
      "eine Ähnlichkeitssuche im Worker");
    assert.match(w,
      /kennt\.has\(p\.name\) \? fest\[p\.name\] : v \? v\.id : mappe\(p\.name\)/,
      "die Zuordnung läuft nicht mehr über Datenbank → Vorabliste → mappe()");
  });

  test("und auch in gnmap.js selbst nicht", () => {
    const g = lies("src", "gnmap.js");
    assert.equal(/levenshtein|distance\s*\(|similar|fuzzy|bestMatch/i.test(g), false,
      "eine Ähnlichkeitssuche in gnmap.js");
  });
});

describe("Wein wird weiterhin zugeordnet", () => {
  test("Kürzel plus Winzer reicht, wenn es nur einen gibt", () => {
    assert.equal(mappe("GV Leindl, Langenlois 1/8"), "w001");
    assert.equal(mappe("RI Hirsch, Zöbing 1/8"), "w005");
  });

  test("zwei Weine desselben Winzers werden am Weinnamen getrennt", () => {
    /* Sabathi führt Sauvignon Blanc und Weissburgunder — das Kürzel
       entscheidet, nicht die Ähnlichkeit. */
    assert.equal(mappe("SB Hannes Sabathi, Sauvignon Blanc 1/8"), "w008");
    assert.equal(mappe("WB Hannes Sabathi, Weißburgunder 1/8"), "w010");
  });

  test("ein falsches Kürzel trifft lieber nichts als das Falsche", () => {
    assert.equal(mappe("ZW Leindl, Langenlois 1/8"), null,
      "Leindl hat keinen Zweigelt — geraten wird nicht");
  });
});
