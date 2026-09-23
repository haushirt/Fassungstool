/* Eine Vorabliste, zwei Dateien.

   `VORAB` steht im Worker (`src/gnmap.js`) und im Backoffice
   (`public/leitung.html`). Der Worker schreibt damit die Spalte
   `fassungszeile.artikel`, das Backoffice zeichnet damit den
   Zuordnung-Bildschirm. Gehen beide auseinander, zeigt der Schirm etwas
   anderes, als in der Datenbank steht — und zwar lautlos. Genau diese
   Sorte Abweichung hat Runde 20 beim Soll der Getränke gekostet
   (`tests/soll-gleich.test.mjs`).

   Diese Prüfung liest beide Fassungen aus den AUSGELIEFERTEN Dateien und
   vergleicht sie Eintrag für Eintrag.

   Dazu die Regel-5-Seite: die Vorabliste darf nur NACHSCHLAGEN. Kein
   Vergleich, kein Teilstück, keine Ähnlichkeit. Was hier steht, hat ein
   Mensch einzeln nachgesehen; was nicht hier steht, bleibt offen.      */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { VORAB, vorab, mappe } from "../src/gnmap.js";
import { lies, ausschnitt } from "./hilfe/dateien.mjs";

function vorabAusBackoffice() {
  const q = ausschnitt("const VORAB={", "/* Die Datenbank schlägt die Vorabliste",
                       "public/leitung.html");
  const s = {}; vm.createContext(s);
  vm.runInContext(q + "\nglobalThis.__ = VORAB;", s, { filename: "leitung.html#vorab" });
  return s.__;
}

const STAMM = JSON.parse(lies("src", "stamm.json"));
const ARTIKEL = new Set([
  ...STAMM.WINES.map(w => w.id),
  ...Object.keys(STAMM.GETR.name || {})
]);

describe("Die Vorabliste steht in beiden Dateien gleich", () => {
  const B = vorabAusBackoffice();

  test("dieselben Kassennamen", () => {
    assert.deepEqual(Object.keys(VORAB).sort(), Object.keys(B).sort());
  });

  test("derselbe Artikel je Name — auch „kein Keller“", () => {
    for (const n of Object.keys(VORAB))
      assert.equal(B[n], VORAB[n], n + " steht im Backoffice anders");
  });
});

describe("Jeder Eintrag zeigt auf etwas, das es gibt", () => {
  test("jede Artikel-Id steht im Stamm", () => {
    for (const [n, id] of Object.entries(VORAB))
      if (id !== null) assert.equal(ARTIKEL.has(id), true,
        n + " → " + id + " kennt der Stamm nicht");
  });

  test("„kein Keller“ ist genau null, nie leer oder undefiniert", () => {
    for (const [n, id] of Object.entries(VORAB))
      assert.equal(id === null || (typeof id === "string" && id.length > 0), true,
        n + " hat einen unbrauchbaren Wert");
  });

  test("kein Name steht zweimal", () => {
    /* Die Liste entsteht aus drei Gruppen (Wein, Getränk, kein Keller),
       die zusammengeschüttet werden. Stünde ein Name in zweien, gewänne
       lautlos die letzte Gruppe. Gezählt wird deshalb im Quelltext. */
    const roh = lies("src", "gnmap.js");
    for (const n of Object.keys(VORAB)) {
      const treffer = roh.split(JSON.stringify(n)).length - 1;
      assert.equal(treffer, 1, n + " steht " + treffer + "-mal in gnmap.js");
    }
  });
});

describe("Die Vorabliste schlägt nach — sie sucht nicht", () => {
  test("ein Name trifft nur ganz", () => {
    /* Anfang, Ende, Mitte, andere Grösse, anderer Fall: keiner davon
       darf durchgehen. Ginge einer durch, wäre es eine Suche. */
    for (const n of ["Käse ", " Käse", "Kase", "käse", "Käsebrot",
                     "Cola Zero 0,5l", "Cola Zero", "Coca Cola",
                     "ZW Glatzer Rubin Carnuntum", "Espressoo"])
      assert.equal(vorab(n), null, JSON.stringify(n) + " ist durchgegangen");
  });

  test("und trifft ganz genau dann, wenn er in der Liste steht", () => {
    for (const n of Object.keys(VORAB)) {
      const t = vorab(n);
      assert.notEqual(t, null, n + " steht in der Liste und trifft trotzdem nicht");
      assert.equal(t.id, VORAB[n], n);
    }
  });

  test("„kein Keller“ ist ein Treffer, kein Danebentreffer", () => {
    /* `{id:null}` heisst „gehört nicht in den Keller" und ist etwas
       anderes als `null` („steht nicht auf der Liste"). Wer die beiden
       verwechselt, macht aus jeder Speise wieder eine offene Zeile. */
    assert.deepEqual(vorab("Käse"), { id: null });
    assert.equal(vorab("Gibt es nicht"), null);
  });

  test("in der Liste selbst steckt keine Logik", () => {
    /* Der ganze Weg besteht aus einem `hasOwn` und einem Zugriff. Ein
       Schleifen- oder Vergleichsoperator darin wäre der Anfang einer
       Ähnlichkeitssuche. */
    const roh = lies("src", "gnmap.js");
    const fn = roh.slice(roh.indexOf("export function vorab(name)"));
    assert.equal(/includes|startsWith|indexOf|match|test\(|filter|replace/.test(fn), false,
      "vorab() vergleicht statt nachzuschlagen");
  });
});

describe("Die Vorabliste hebelt Regel 5 nicht aus", () => {
  test("mappe() rät weiterhin bei keinem einzigen Namen der Liste", () => {
    /* Die Vorabliste steht NEBEN `mappe()`, nicht darin. Was hier
       nachgeschlagen wird, bleibt für `mappe()` unbekannt — sonst hätte
       jemand die Suche doch wieder eingebaut. */
    for (const n of Object.keys(VORAB))
      assert.equal(mappe(n), null, n + " wird plötzlich geraten");
  });

  test("die Datenbank schlägt die Liste", () => {
    /* Reihenfolge im Worker: bestätigt → Vorabliste → Kassenmuster.
       Stünde die Liste vorn, überschriebe sie jede Entscheidung der
       Leitung — und ein Vertipper wäre nicht mehr zu korrigieren. */
    const w = lies("src", "index.js");
    const i = w.indexOf("kennt.has(p.name) ? fest[p.name] : v ? v.id : mappe(p.name)");
    assert.notEqual(i, -1, "die Reihenfolge im Worker ist eine andere");
  });
});
