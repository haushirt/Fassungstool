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

/* ── Die Blockwahl, und was sie kostet ───────────────────────────────────
   Gefunden vom qa-guardian in Runde 3.

   `parseZ` sucht EINE Sektion — die mit den meisten Zeilen aus Text und
   Zahl — und liest nur diese als Positionsblock. Das ist richtig, solange
   gastronovi alle Artikel in einem Block ausgibt, und es ist die einzige
   Abwehr gegen den Zahlungsartenblock (Prüfung 8 oben).

   Es hat aber eine Kehrseite, die niemand gesehen hat, weil
   `tests/fixtures/` seit vier Zügen leer ist: Trennt die Kasse den
   Abschluss nach Kostenstellen in ZWEI Sektionen („Restaurant", „Bar"),
   dann gewinnt die grössere und die kleinere fällt LAUTLOS weg. Kein
   Fehler, keine Meldung — im Backoffice steht eine plausible Zahl, der
   halbe Ausschank fehlt darin.

   NACHTRAG 17.09., Runde 4: Der echte Bericht liegt vor
   (`tests/zbericht-37.test.mjs`) und ist NICHT gespalten — Bar und
   Restaurant stehen dort als Tagessumme, die Artikel in einem Block
   „Positionen". Geändert wurde daraufhin nur die Blockwahl: Trägt eine
   Sektion diesen Namen, gewinnt sie. Die Prüfungen hier beschreiben
   deshalb weiter den RÜCKFALL — Berichte ohne solchen Namen, bei denen es
   beim grössten Block bleibt. Dort besteht die Lücke unverändert, und
   auch die Entscheidung dazu bleibt offen
   (`review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 12, jetzt mit Befund).         */
describe("Z-Bericht: welcher Block gewinnt", () => {
  const zeile = (n, a, p, u) => T(n, a, p, u);
  const kopf = [T("Tagesabschluss Z 412", "", "", ""),
                T("Von", "15.09.2026 06:00", "", ""),
                T("Bis", "16.09.2026 05:59", "", "")];
  const strich = "-----------------------------------------";

  const einBlock = [...kopf, strich, T("Artikelumsätze", "", "", ""), strich,
    zeile("GV Leindl 1/8", "12", "5,00", "60,00 €"),
    zeile("GV Leindl 1/8", "8", "5,00", "40,00 €"),
    zeile("Cola 0,33 l", "20", "3,50", "70,00 €")].join("\n");

  const zweiBloecke = [...kopf, strich, T("Restaurant", "", "", ""), strich,
    zeile("GV Leindl 1/8", "12", "5,00", "60,00 €"),
    zeile("Riesling Hirsch 1/8", "9", "5,50", "49,50 €"),
    zeile("Cola 0,33 l", "20", "3,50", "70,00 €"),
    strich, T("Bar", "", "", ""), strich,
    zeile("GV Leindl 1/8", "8", "5,00", "40,00 €"),
    zeile("Gin Tonic", "14", "9,00", "126,00 €")].join("\n");

  test("ein Block: alles ist drin, doppelte Namen summieren sich (Eigenheit 1)", () => {
    const z = parseZ(einBlock);
    assert.equal(z.positionen.length, 2);
    assert.equal(z.positionen.find(p => p.name === "GV Leindl 1/8").anzahl, 20);
    assert.equal(z.umsatz, 170);
  });

  test("zwei Blöcke: der kleinere fällt lautlos weg — HEUTIGES Verhalten", () => {
    const z = parseZ(zweiBloecke);
    assert.equal(z.block, "Restaurant", "die grössere Sektion gewinnt");
    assert.equal(z.positionen.length, 3);
    assert.equal(z.positionen.find(p => p.name === "GV Leindl 1/8").anzahl, 12,
      "die 8 Achtel aus der Bar fehlen");
    assert.equal(z.positionen.find(p => p.name === "Gin Tonic"), undefined,
      "der Gin Tonic aus der Bar kommt gar nicht vor");
    assert.equal(z.umsatz, 179.5, "166 € Umsatz fehlen, ohne dass es jemand merkt");
  });

  test("der Verlust ist an `sektionen` ablesbar — der Rohstoff für eine Warnung", () => {
    const z = parseZ(zweiBloecke);
    const andere = z.sektionen.filter(s => s.titel !== z.block && s.titel !== "(Kopf)");
    assert.ok(andere.some(s => s.n >= 2),
      "neben dem gewählten Block steht eine zweite Sektion mit Positionszeilen. "
      + "Wer hier eine Warnung bauen will, hat die Zahl schon.");
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
      /* Der Tag, an dem ein echter Bericht hier liegt, ist der Tag, an dem
         sich die Blockwahl beweisen muss: Steht neben dem gewählten Block
         eine zweite Sektion mit ähnlich vielen Positionszeilen, dann ist
         der Bericht nach Kostenstellen gespalten und `parseZ` liest nur die
         Hälfte (siehe „welcher Block gewinnt" oben). */
      const andere = z.sektionen
        .filter(s => s.titel !== z.block && s.titel !== "(Kopf)")
        .filter(s => s.n >= Math.max(3, z.positionen.length / 2));
      assert.deepEqual(andere, [],
        "Neben dem gelesenen Block '" + z.block + "' steht mindestens eine weitere "
        + "Sektion mit ebenso vielen Positionszeilen: " + JSON.stringify(andere)
        + ". Dann liest parseZ nur einen Teil des Berichts. NICHT den Test lockern "
        + "— erst entscheiden, ob beide Blöcke gelesen werden sollen "
        + "(review/OFFENE-ENTSCHEIDUNGEN.md).");
    });
  }
});
