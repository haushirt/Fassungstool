/* Ein geglückter Mailempfang ist kein Ausfall.

   Dritte Jagd Runde 22 · B. `meldungen()` hängte an die jüngste Notiz
   der Quelle `email` UNBEDINGT den Satz „— solange das so bleibt, kommt
   kein Z-Bericht mehr von selbst herein." Der Mailweg schreibt unter
   derselben Quelle aber auch die Erfolgsmeldung. Am ersten Morgen, an
   dem die Weiterleitung steht, hätte die Übersicht also täglich
   behauptet, der Empfang sei kaputt — ein Alarm, der nie ausgeht, und
   genau der Fehlertyp, den die dritte Jagd nach Runde 18 schon einmal
   abgestellt hat.

   Die beiden Seiten gehören zusammen: der Worker setzt das Wort
   („angekommen"), das Backoffice liest es. Diese Prüfung hält beide
   Seiten an derselben Stelle fest — sonst fällt eine von ihnen lautlos
   um, und der Alarm ist wieder da.                                     */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt, lies } from "./hilfe/dateien.mjs";

const WARNUNG = "kommt kein Z-Bericht mehr von selbst herein";

function umgebung(notizen) {
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout, Intl,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(
    ausschnitt("const STAMM = {", "/* ── Abgleich ──────────────", "public/leitung.html")
    + `
    globalThis.zeichne = () => {};
    NOTIZEN = ${JSON.stringify(notizen)};
    globalThis.__ = { meldungen };`,
    s, { filename: "leitung.html#meldungen" });
  return s.__;
}

const notiz = (n) => ({ quelle: "email", notiz: n, ts: Date.now() });
const mailzeile = (n) => umgebung([notiz(n)]).meldungen()
  .find(z => /^Mailempfang/.test(z)) || "";

describe("Der Warnsatz hängt am Ausfall, nicht an jeder Mailnotiz", () => {
  test("die Erfolgsmeldung trägt ihn NICHT", () => {
    /* Wörtlich der Satz, den `src/index.js` bei Status 200 schreibt. */
    const z = mailzeile("Z-Bericht 2026-09-16 angekommen: 48 Positionen, 15 offen");
    assert.equal(z.includes(WARNUNG), false, z);
    assert.match(z, /48 Positionen/, "die Meldung selbst steht weiter da");
  });

  test("auch mit Stornohinweis nicht", () => {
    const z = mailzeile("Z-Bericht 2026-09-16 angekommen: 48 Positionen, 15 offen"
      + ", 1 storniert — keinem Artikel zuzuordnen");
    assert.equal(z.includes(WARNUNG), false, z);
  });

  test("ein abgewiesener Bericht trägt ihn", () => {
    const z = mailzeile("Z-Bericht abgelehnt (422): keine Positionen erkannt"
      + " — Betreff: Tagesabschluss");
    assert.equal(z.includes(WARNUNG), true, z);
  });

  test("ein Anhang, der keiner war, trägt ihn", () => {
    assert.equal(mailzeile("kein Z-Bericht im Anhang: Werbung").includes(WARNUNG), true);
  });

  test("und ein Fehler trägt ihn", () => {
    assert.equal(mailzeile("Fehler: D1 nicht erreichbar").includes(WARNUNG), true);
  });

  test("ohne Mailnotiz steht gar keine Zeile da", () => {
    assert.equal(umgebung([]).meldungen().some(z => /^Mailempfang/.test(z)), false);
  });
});

describe("Worker und Backoffice meinen dasselbe Wort", () => {
  test("der Worker schreibt „angekommen“ genau bei Status 200", () => {
    const w = lies("src", "index.js");
    assert.match(w, /a\.status === 200\s*\n?\s*\?\s*`Z-Bericht \$\{j\.tag\} angekommen:/,
      "die Erfolgsmeldung trägt das Wort nicht mehr");
  });

  test("und nur die Erfolgsmeldung trägt es", () => {
    /* Stünde es auch in einer Absage, wäre der Alarm dort stumm —
       derselbe Fehler, nur andersherum. */
    const w = lies("src", "index.js");
    for (const zeile of ["Z-Bericht abgelehnt", "kein Z-Bericht im Anhang", "Fehler: "]) {
      const i = w.indexOf(zeile);
      assert.notEqual(i, -1, zeile + " gibt es nicht mehr");
      assert.equal(w.slice(i, i + 120).includes("angekommen"), false, zeile);
    }
  });

  test("das Backoffice liest genau dieses Wort", () => {
    const b = lies("public", "leitung.html");
    assert.match(b, /\\bangekommen\\b/,
      "das Backoffice erkennt den Erfolg an etwas anderem als am Wort");
  });
});
