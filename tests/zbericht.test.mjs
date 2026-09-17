/* Der gastronovi-Z-Bericht und seine vier Eigenheiten (harte Regel 7).
   Diese Prüfungen halten fest, was NICHT wegrefactort werden darf.

   Die Beispiele hier sind nachgebaut, nicht echt: `tests/fixtures/`
   ist noch leer. Sobald dort anonymisierte Berichte liegen, laufen die
   Prüfungen im zweiten Teil automatisch mit — bis dahin melden sie sich
   als übersprungen, damit die Lücke sichtbar bleibt. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseZ, zahl, ml, felder } from "../src/gnparse.js";
import { lies, listet, pfad } from "./hilfe/dateien.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const T = (...f) => f.map(x => `"${x}"`).join("\t");
const BERICHT = [
  T("Tagesabschluss Z 417", "", "", ""),
  T("Von", "16.09.2026 06:00", "", ""),
  T("Bis", "17.09.2026 05:59", "", ""),
  "-----------------------------------------",
  T("Artikelumsätze", "", "", ""),
  "-----------------------------------------",
  T("Grüner Veltliner 1/8", "12", "4,50", "54,00 €"),
  T("Grüner Veltliner 1/8", "5", "4,50", "22,50 €"),      /* Bar und Restaurant */
  T("Welcomedrink Sekt 0,1 l", "8", "0,00", "0,00 €"),    /* Nullpreis */
  T("Zweigelt 0,75 l 0,125 l", "3", "6,00", "18,00 €"),   /* Grösse doppelt */
  T("Summe", "28", "", "94,50 €"),
  "-----------------------------------------",
  T("Zahlungsarten", "", "", ""),
  "-----------------------------------------",
  T("Bar", "40,00 €", "", ""),
  T("Karte", "54,50 €", "", "")
].join("\n");

describe("Z-Bericht lesen", () => {
  const z = parseZ(BERICHT);
  const pos = n => z.positionen.find(p => p.name === n);

  test("Betriebstag ist das Datum von „Bis“", () => {
    assert.equal(z.tag, "2026-09-17");
  });

  test("Z-Nummer aus dem Kopf", () => {
    assert.equal(z.nr, "Z 417");
  });

  test("Eigenheit 1: doppelte Positionsnamen werden summiert, nicht verworfen", () => {
    const p = pos("Grüner Veltliner 1/8");
    assert.equal(p.anzahl, 17, "12 aus der Bar plus 5 aus dem Restaurant");
    assert.equal(p.zeilen, 2, "beide Herkünfte bleiben zählbar");
    assert.equal(p.umsatz, 76.5);
  });

  test("Eigenheit 2: 0-€-Zeilen zählen als Verbrauch", () => {
    const p = pos("Welcomedrink Sekt 0,1 l");
    assert.equal(p.anzahl, 8);
    assert.equal(p.umsatz, 0);
  });

  test("Eigenheit 3: bei doppelter Grösse gilt das letzte Vorkommen", () => {
    assert.equal(pos("Zweigelt 0,75 l 0,125 l").ml, 125);
    assert.equal(ml("Weissbier 0,5 l 0,3 l"), 300);
    assert.equal(ml("Grüner Veltliner 1/8"), 125, "Bruch als Rückfall");
    assert.equal(ml("Espresso"), null);
  });

  test("Eigenheit 4: es gibt keine Warengruppe je Zeile", () => {
    assert.ok(z.positionen.every(p => p.warengruppe === undefined),
      "wer hier eine Warengruppe findet, hat sie erfunden");
  });

  test("Summenzeilen werden nicht als Position gezählt", () => {
    assert.equal(pos("Summe"), undefined);
  });

  test("der Zahlungsartenblock wird nicht für den Positionsblock gehalten", () => {
    assert.equal(pos("Karte"), undefined);
    assert.equal(z.positionen.length, 3);
  });

  test("Umsatz ist die Summe der Positionen", () => {
    assert.equal(z.umsatz, 94.5);
  });

  test("deutsche Zahlen: Punkt ist Tausender, Komma ist Komma", () => {
    assert.equal(zahl("1.234,50 €"), 1234.5);
    assert.equal(zahl("0,00"), 0);
    assert.equal(zahl(""), null);
    assert.equal(zahl("—"), null);
  });

  test("gequotete Felder mit Anführungszeichen im Text", () => {
    assert.deepEqual(felder('"Wein ""Hirt"""\t"2"'), ['Wein "Hirt"', "2"]);
  });

  test("ein leerer oder fremder Text wirft nicht", () => {
    for (const t of ["", "irgendwas ohne Tabulator", "\n\n"]) {
      const r = parseZ(t);
      assert.deepEqual(r.positionen, []);
      assert.equal(r.umsatz, 0);
    }
  });
});

/* ── Echte Berichte, sobald sie da sind ──────────────────────────────── */
const dateien = listet("tests", "fixtures")
  .filter(f => /\.(csv|txt|tsv)$/i.test(f));

describe("Z-Bericht: echte Beispiele aus tests/fixtures/", { skip:
  dateien.length ? false : "tests/fixtures/ ist leer — echte, anonymisierte "
    + "Z-Berichte fehlen im Repo (Aufgabe für den Betreiber)" }, () => {
  for (const f of dateien) {
    test(f, () => {
      const z = parseZ(readFileSync(join(pfad("tests", "fixtures"), f), "utf8"));
      assert.match(z.tag, /^\d{4}-\d{2}-\d{2}$/, "Betriebstag erkannt");
      assert.ok(z.positionen.length > 0, "Positionsblock gefunden");
      assert.ok(z.positionen.every(p => p.anzahl > 0 || p.zeilen > 0));
      assert.ok(z.positionen.every(p => typeof p.umsatz === "number"));
      const namen = z.positionen.map(p => p.name);
      assert.equal(new Set(namen).size, namen.length, "je Name genau eine Position");
    });
  }
});
