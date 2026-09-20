/* Die nicht gerechnete Lieferung muss überall mitreisen.

   Seit v30 wird eine Lieferung am Zähltag nicht auf den gezählten Bestand
   addiert, sondern als `unklar` ausgewiesen (Entscheidung Nr. 10). Die Zahl
   ist damit bewusst zu niedrig. Der erklärende Satz stand bis v30 aber NUR
   unter „Kellerbestand" — überall sonst wurde mit der zu niedrigen Zahl
   weitergerechnet, ohne ein Wort:

       Zählung 14.09. w003 = 10 Fl. · Lieferung 14.09. = 24 Fl.
       danach dreimal 6 Fl. gefasst   →  Bestand −8, `unklar` 24

       Nachbestellen:  11 × 12 = 132 Flaschen vorgeschlagen,
                       im Keller stehen 16
       Mittagsblick:   „1 Positionen stehen rechnerisch unter null —
                       die Zählung ist überholt. Neu zählen."
       Zählliste:      Rang 0, „rechnerisch unter null"

   Geprüft wird der ausgelieferte Code selbst (`public/leitung.html`),
   einschließlich der Ansichten bis „7d · Zählliste" — `bestellliste()` und
   `zaehlliste()` stehen dort und wären aus dem kürzeren Ausschnitt der
   übrigen Prüfungen nicht erreichbar.

   Die Rechnung selbst bleibt unverändert: 10 bleibt 10, −8 bleibt −8.
   Geprüft wird, dass die AUSKUNFT mitgeht — und die Gegenprobe, dass ein
   echter Fehlbestand weiterhin „neu zählen" auslöst.                    */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt } from "./hilfe/dateien.mjs";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7f · Speicher",
                          "public/leitung.html");

function backoffice() {
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.__b = { BEFUND, minusGeteilt, unklarZeilenSatz, bestellSpanne,
      setzte: liste => { VORGAENGE = liste.map(normVorgang).filter(Boolean).sort(nachZeit);
                         ZBER = {}; MAP = {}; },
      bestand, bestellliste, zaehlliste };`,
    s, { filename: "leitung.html#unklar-wandert" });
  return s.__b;
}

/* Betriebstage relativ zu heute — `verbrauch()` sieht nur die letzten
   EINST.tage (28) und `letzterTag()` sucht sich den jüngsten. */
const tg = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

const zaehlung = (tag, reihen, einzel) => ({
  mode: "keller", tag, name: "Asad", finished: true,
  zdone: { w003: 1 }, reihen: { w003: reihen }, einzel: { w003: einzel }, getr: {}
});
const lieferung = (tag, kisten, gr) => ({
  mode: "ware", tag, name: "Asad", finished: true,
  pos: [{ id: "w003", kisten, kistengr: gr }], jok: {}, jneu: {}, ein: {}, gent: {}
});
const tagesfassung = (tag, n) => ({
  mode: "tag", tag, name: "Asad", finished: true,
  rest: { w003: n }, bar: {}, barrot: {}, backup: {}, zusatz: {}, seen: {},
  getr: {}, gent: {}
});

/* Der Fall aus dem Fund: gezählt und geliefert am selben Tag, danach
   dreimal gefasst. Bestand −8, `unklar` 24, im Keller stehen 16. */
function fall() {
  const b = backoffice();
  b.setzte([zaehlung(tg(3), 1, 4), lieferung(tg(3), 2, 12),
            tagesfassung(tg(2), 6), tagesfassung(tg(1), 6), tagesfassung(tg(0), 6)]);
  return b;
}

describe("Die am Zähltag gelieferte Menge reist mit", () => {
  test("Ausgangslage: Bestand −8, ausgewiesen 24", () => {
    const b = fall();
    const B = b.bestand();
    assert.equal(B.b.w003, -8, "die Zahl bleibt, wie sie ist");
    assert.equal(B.unklar.w003, 24, "die Lieferung steht daneben, nicht drin");
  });

  test("Nachbestellen: die Zeile nennt die Menge und schlägt eine Spanne vor", () => {
    const b = fall();
    const zeile = b.bestellliste().find(r => r.w.id === "w003");
    assert.ok(zeile, "der Wein steht auf der Bestellliste");
    assert.equal(zeile.unklar, 24, "die nicht gerechnete Menge hängt an der Zeile");
    assert.equal(zeile.kg, 12, "Kistengröße aus PLAN.kiste");
    assert.ok(zeile.kistenMin < zeile.kisten,
      "mit den 24 Flaschen braucht es weniger Kisten — daraus wird die Spanne");
    assert.equal(b.bestellSpanne(zeile), zeile.kistenMin + "–" + zeile.kisten);
    assert.equal(b.bestellSpanne(zeile, true),
      zeile.kistenMin * 12 + "–" + zeile.kisten * 12, "dieselbe Spanne in Flaschen");
    assert.match(b.unklarZeilenSatz(zeile.unklar), /^Am Zähltag 24 Flaschen geliefert/);
  });

  test("Gegenprobe Nachbestellen: ohne Lieferung am Zähltag keine Spanne", () => {
    const b = backoffice();
    b.setzte([zaehlung(tg(3), 1, 4),
              tagesfassung(tg(2), 3), tagesfassung(tg(1), 3), tagesfassung(tg(0), 3)]);
    const zeile = b.bestellliste().find(r => r.w.id === "w003");
    assert.ok(zeile, "1 Flasche Rest, 3 pro Tag — die Zeile steht da");
    assert.equal(zeile.unklar, 0);
    assert.equal(zeile.kistenMin, zeile.kisten, "eine Zahl, keine Spanne");
    assert.equal(b.bestellSpanne(zeile), String(zeile.kisten));
  });

  test("Minus-Alarm: ein erklärtes Minus ist kein Grund für „neu zählen“", () => {
    const b = fall();
    const M = b.minusGeteilt(b.bestand());
    assert.equal(M.minus.length, 1, "eine Position steht unter null");
    assert.equal(M.echt.length, 0, "aber keine, die eine neue Zählung verlangt");
    assert.equal(M.erklaert.length, 1, "sie erklärt sich aus der Lieferung");
    assert.equal(M.erklaert[0].id, "w003");
  });

  test("Gegenprobe Minus-Alarm: ein echter Fehlbestand bleibt einer", () => {
    const b = backoffice();
    b.setzte([zaehlung(tg(3), 1, 4), tagesfassung(tg(2), 12)]);   /* 10 − 12 = −2 */
    const B = b.bestand();
    assert.equal(B.b.w003, -2);
    const M = b.minusGeteilt(B);
    assert.equal(M.echt.length, 1, "ohne ausgewiesene Lieferung bleibt es ein Fehlbestand");
    assert.equal(M.erklaert.length, 0);
  });

  test("Zählliste: der Grund nennt die Menge und drängt sich nicht vor", () => {
    const b = fall();
    const zeile = b.zaehlliste().find(r => r.w.id === "w003");
    assert.ok(zeile, "der Wein bleibt auf der Zählliste — Zählen klärt die Frage");
    assert.match(zeile.grund, /am Zähltag 24 Fl\. geliefert, nicht mitgerechnet/);
    assert.equal(zeile.rang, 1, "nicht Rang 0 — das ist kein rechnerischer Fehlbestand");
    assert.equal(zeile.unklar, 24);
  });

  test("Zählliste, halb gedeckt: Rang 0 bleibt, die Angabe reist trotzdem mit", () => {
    /* Zählung 10, Lieferung 12 am Zähltag, danach 30 gefasst → −20.
       Die Lieferung erklärt das Minus NICHT (−20 + 12 < 0): hier ist
       wirklich etwas offen. Verschwiegen werden darf sie deswegen nicht. */
    const b = backoffice();
    b.setzte([zaehlung(tg(3), 1, 4), lieferung(tg(3), 1, 12), tagesfassung(tg(2), 30)]);
    const zeile = b.zaehlliste().find(r => r.w.id === "w003");
    assert.equal(zeile.bestand, -20);
    assert.equal(zeile.rang, 0, "ein halb gedecktes Minus bleibt ein Fehlbestand");
    assert.match(zeile.grund, /^rechnerisch unter null — am Zähltag 12 Fl\. geliefert/);
    const M = b.minusGeteilt(b.bestand());
    assert.equal(M.echt.length, 1, "und es verlangt weiterhin eine neue Zählung");
  });

  test("Gegenprobe Zählliste: ein echtes Minus behält Rang 0", () => {
    const b = backoffice();
    b.setzte([zaehlung(tg(3), 1, 4), tagesfassung(tg(2), 12)]);
    const zeile = b.zaehlliste().find(r => r.w.id === "w003");
    assert.equal(zeile.grund, "rechnerisch unter null");
    assert.equal(zeile.rang, 0);
  });
});

describe("Eine Zeile mit Vorbehalt sagt nie „stimmt“", () => {
  /* 2 gerechnete Flaschen, 3 an einer Position ohne Größe, 2 entnommen:
     `diff` 0 bei einem Drittel fehlender Rechnung. Grün wäre gelogen. */
  test("Differenz 0 mit Vorbehalt → neutrale Plakette", () => {
    const b = backoffice();
    const B = b.BEFUND({ diff: 0, vorbehalt: { ohne: 1, gesamt: 2 } });
    assert.equal(B.w, "unvollständig");
    assert.equal(B.k, "p-grau", "dieselbe neutrale Plakette wie „kein Abgleich“");
  });

  test("Differenz 0 ohne Vorbehalt → weiterhin „stimmt“", () => {
    const b = backoffice();
    assert.deepEqual({ ...b.BEFUND({ diff: 0, vorbehalt: null }) },
                     { w: "stimmt", k: "p-ok" });
    assert.deepEqual({ ...b.BEFUND({ diff: 0.4, vorbehalt: null }) },
                     { w: "stimmt", k: "p-ok" });
  });

  test("echte Abweichungen behalten ihren Befund, mit und ohne Vorbehalt", () => {
    const b = backoffice();
    for (const v of [null, { ohne: 1, gesamt: 3 }]) {
      assert.equal(b.BEFUND({ diff: 1, vorbehalt: v }).w, "kleine Abweichung");
      assert.equal(b.BEFUND({ diff: -1.5, vorbehalt: v }).w, "kleine Abweichung");
      assert.equal(b.BEFUND({ diff: 2, vorbehalt: v }).w, "prüfen");
      assert.equal(b.BEFUND({ diff: -7.2, vorbehalt: v }).w, "prüfen");
    }
  });
});
