/* ═══════════════════════════════════════════════════════════════════════
   Der erste ECHTE Z-Bericht: `tests/fixtures/zbericht-37-extended.csv`
   (gastronovi, Kostenstelle „Haus Hirt", Z 37, Nacht vom 15. auf den
   16.09.2026, anonymisiert vom Betreiber).

   Warum diese Datei die wichtigste im Prüfgerüst ist: Bis zum 17.09. war
   die Hälfte des Werkzeugs, die Wareneinsatz und Schwund rechnet,
   ausschliesslich an Berichten geprüft, die Agenten nach einer
   Beschreibung nachgebaut hatten — nach einer Beschreibung, die von
   denselben Agenten stammte. Der echte Bericht hat beim ersten Lauf
   **fünf Dinge** widerlegt, die 24 grüne Prüfungen behauptet hatten:

     · Er eröffnet jede Tabelle mit einer Spaltenüberschrift
       („Positionen | Anzahl | Betrag"), nicht mit einem nackten Titel.
       `parseZ` erkannte deshalb keine einzige Sektion und las 106
       „Positionen" mit 1345,75 Stück und 5166,70 € — Steuersätze,
       Kellner, Zimmerbuchungen und Warengruppen als Getränke.
     · Er trennt seine drei Teile mit Rauten statt Strichen.
     · Er schreibt die Z-Nummer in zwei Felder, nicht in einen Satz.
     · Er schreibt den offenen Wein als „1/8 l" — gelesen wurde acht
       Liter statt einem Achtel. Faktor 64, auf der halben Weinkarte.
     · Seine Leerzeilen sind vier leere Felder, keine leeren Zeilen.

   Deshalb stehen hier ZAHLEN, keine Formen: Jede Behauptung unten ist am
   Bericht selbst nachrechenbar, und zwei seiner eigenen Summen prüfen
   das Ergebnis gegen.
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseZ, kern, ml } from "../src/gnparse.js";
import { pfad } from "./hilfe/dateien.mjs";

const DATEI = "zbericht-37-extended.csv";
const TEXT = readFileSync(join(pfad("tests", "fixtures"), DATEI), "utf8");
const z = parseZ(TEXT);
const pos = n => z.positionen.find(p => p.name === n);
const stueck = z.positionen.reduce((a, p) => a + p.anzahl, 0);
const rund = n => Math.round(n * 100) / 100;

/* Die drei Zahlen, die der Bericht selbst nennt, an drei Stellen:
   Umsatz „Total", Hauptwarengruppen und Warengruppen. */
const UMSATZ_TOTAL = 550.50;     // „Umsatz | Total"
const WARE = 602.50;             // Beverage 602,50 + Food 0,00
const STUECK = 145;              // Beverage 87 + Food 58
const RABATT = -52.00;           // Welcomedrink, 3 Stück
const STORNO = 4.20;             // Bedienerfehler, 1 Stück

describe("Z 37 – Kopf und Blockwahl", () => {
  test("Betriebstag ist das Datum von „Bis“, nicht von „Von“", () => {
    assert.equal(z.tag, "2026-09-16",
      "der Abschluss läuft über Mitternacht: 15.09. 23:11 bis 16.09. 23:26");
  });

  test("Z-Nummer aus zwei Feldern („Z“ | „37“)", () => {
    assert.equal(z.nr, "Z 37");
  });

  test("gelesen wird der Block „Positionen“", () => {
    assert.equal(z.block, "Positionen");
  });

  test("der Bericht ist NICHT nach Kostenstellen gespalten", () => {
    /* Die offene Frage aus review/OFFENE-ENTSCHEIDUNGEN.md Nr. 12, am
       echten Bericht beantwortet: Bar und Restaurant stehen als Summe
       („Kostenstellen": 24 / 299,00 und 29 / 251,50), die Artikel stehen
       in EINEM Positionsblock. Getrennt gebucht sind sie trotzdem — das
       ist Eigenheit 1, siehe unten. */
    const andere = z.sektionen
      .filter(s => s.titel !== z.block && s.titel !== "(Kopf)")
      .filter(s => s.n >= Math.max(3, z.positionen.length / 2));
    assert.deepEqual(andere, [], "kein zweiter Block in Positionsgrösse");
    const pb = z.sektionen.filter(s => s.n >= 20).map(s => s.titel);
    assert.deepEqual(pb, ["Warengruppen", "Warengruppen (inner/außer Haus)", "Positionen"],
      "die beiden Warengruppen-Tabellen sind Zusammenfassungen derselben Artikel; "
      + "gelesen werden darf nur eine Ebene, sonst zählt jedes Getränk dreifach");
  });

  test("keine Tabelle des Berichts rutscht in die Positionen", () => {
    for (const fremd of ["Bar", "Restaurant", "Kellner 1", "Zimmerbuchung",
                         "Beverage (Getränke)", "Food (Speisen)", "AFG - Wasser",
                         "Wein - Weiß - Offen", "Welcomedrink", "Bedienerfehler",
                         "Total", "20,00"])
      assert.equal(pos(fremd), undefined, fremd + " ist keine Position");
  });
});

describe("Z 37 – die Positionen und die Gegenprobe", () => {
  test("50 Zeilen, 48 Namen, 145 Stück, 602,50 €", () => {
    assert.equal(z.positionen.length, 48);
    assert.equal(z.positionen.reduce((a, p) => a + p.zeilen, 0), 50,
      "50 Positionszeilen, zwei Namen kommen doppelt vor");
    assert.equal(stueck, STUECK);
    assert.equal(rund(z.umsatz), WARE);
  });

  test("die Gegenprobe des Berichts an sich selbst geht auf", () => {
    /* Hauptwarengruppen (87 + 58 = 145 Stück, 602,50 €) und Warengruppen
       (dieselben Zahlen, feiner aufgeteilt) sind vom Positionsblock
       unabhängig gerechnet. Stimmen sie mit unserer Summe überein, ist
       der Block vollständig gelesen — keine Zeile fehlt, keine ist
       doppelt. */
    assert.equal(stueck, 87 + 58);
    assert.equal(rund(z.umsatz), WARE);
  });

  test("je Name genau eine Position (fassungszeile: PRIMARY KEY (liste, rohbez))", () => {
    const namen = z.positionen.map(p => p.name);
    assert.equal(new Set(namen).size, namen.length);
  });

  test("keine Position ohne Zahl, kein NaN", () => {
    for (const p of z.positionen) {
      assert.ok(Number.isFinite(p.anzahl) && p.anzahl > 0, p.name);
      assert.ok(Number.isFinite(p.umsatz), p.name);
      assert.ok(p.ml === null || Number.isFinite(p.ml), p.name);
    }
  });
});

describe("Z 37 – die vier Eigenheiten (Regel 7) am echten Bericht", () => {
  test("1: doppelte Positionsnamen (Bar und Restaurant) werden summiert", () => {
    const a = pos("Aperol Spritz 1 Glas");
    assert.equal(a.zeilen, 2, "zwei Zeilen: 4 × 38,00 und 2 × 19,00");
    assert.equal(a.anzahl, 6);
    assert.equal(rund(a.umsatz), 57.00);

    const w = pos("CH Gesellmann 1/8 l");
    assert.equal(w.zeilen, 2, "derselbe Wein an Bar und im Restaurant");
    assert.equal(w.anzahl, 3, "2 + 1 Achtel — wer nur eine Zeile liest, holt zu wenig");
    assert.equal(rund(w.umsatz), 24.00);
  });

  test("2: 0,00-Zeilen zählen als Verbrauch", () => {
    const null0 = z.positionen.filter(p => p.umsatz === 0);
    assert.equal(null0.length, 12);
    assert.equal(null0.reduce((a, p) => a + p.anzahl, 0), 58,
      "58 Stück ohne einen Cent Umsatz — Frühstück, Beilagen, HP-Eier");
    assert.equal(pos("HP Omelett 1 Portion").anzahl, 11);
    assert.equal(pos("Schnittlauch").anzahl, 9);
    assert.equal(pos("Käse").anzahl, 8);
    /* Für die Fassung sind das keine Getränke — sie fallen erst bei der
       Zuordnung heraus, nicht beim Lesen. Wer sie hier wegwirft, wirft
       den Welcomedrink gleich mit weg. */
  });

  test("3: Grösse aus dem Namen, letztes Vorkommen, Brüche als Achtel", () => {
    assert.equal(pos("Hauslimo 0,25l 0,25l").ml, 250, "doppeltes Suffix");
    assert.equal(pos("Raschhofer Pils 0,5l 0,5l").ml, 500);
    assert.equal(pos("Stiegl alkoholfrei 0,3l").ml, 300);
    assert.equal(pos("Prosecco, Serena 0,1l").ml, 100);
    assert.equal(pos("Prosecco, Serena 0,75l").ml, 750);
    assert.equal(pos("Amaro Averna Siciliano 2 cl").ml, 20);

    /* Der teuerste Einzelfund des echten Berichts. */
    assert.equal(pos("GV Leindl Langenlois 1/8 l").ml, 125,
      "„1/8 l“ ist ein Achtel Liter. Gelesen wurden 8000 ml.");
    assert.equal(ml("1/8 l"), 125);
    assert.equal(ml("1/8"), 125);
    assert.ok(z.positionen.every(p => p.ml === null || p.ml <= 1000),
      "kein Getränk im Haus fasst mehr als einen Liter je Position");

    /* „1 Glas", „1 Tasse", „1 Portion" sind keine Mengenangaben. */
    for (const n of ["Espresso", "Cappuccino 1 Tasse", "Amaretto Sour 1 Glas",
                     "HP Rührei 1 Portion", "Käse"])
      assert.equal(pos(n).ml, null, n);
  });

  test("4: der Positionsblock kennt keine Warengruppe", () => {
    assert.ok(z.positionen.every(p => p.warengruppe === undefined),
      "die Warengruppe steht nur in einer eigenen Tabelle, nie an der Zeile. "
      + "Fassbier und Flaschenbier trennt allein das Mapping.");
  });

  test("der Kern führt Glas und Flasche desselben Weins zusammen", () => {
    assert.equal(kern("Prosecco, Serena 0,1l"), kern("Prosecco, Serena 0,75l"));
    assert.equal(kern("Stiegl alkoholfrei 0,3l"), kern("Stiegl alkoholfrei 0,5l"));
    assert.equal(kern("GV Leindl Langenlois 1/8 l"), "GV Leindl Langenlois",
      "erst den Bruch mit Einheit schneiden — sonst bleibt „1/“ stehen");
    assert.ok(z.positionen.every(p => kern(p.name).length > 0));
    assert.ok(z.positionen.every(p => !/\d\s*\/\s*$/.test(kern(p.name))),
      "kein abgeschnittener Bruch am Ende eines Kerns");
  });
});

/* ── Rabatt und Storno ────────────────────────────────────────────────
   Vorgabe des Betreibers vom 17.09.2026, wörtlich: „Rabatt und Storno
   zählen als Verbrauch – die Ware ist in beiden Fällen entnommen."

   Die beiden Fälle sehen gleich aus und sind es nicht. Der Unterschied
   lässt sich am Bericht AUSRECHNEN, nicht vermuten — genau das tun die
   zwei Prüfungen hier.                                                 */
describe("Z 37 – Rabatt und Storno zählen als Verbrauch", () => {
  test("Rabatt: die Ware steht schon in den Positionen, zum vollen Preis", () => {
    assert.equal(z.rabatte.anzahl, 3);
    assert.equal(rund(z.rabatte.betrag), RABATT);
    assert.deepEqual(z.rabatte.gruende.map(r => r.name), ["Welcomedrink"]);

    /* Die Rechnung des Berichts: Positionen 602,50 − Rabatt 52,00 =
       Umsatz 550,50. Sie geht auf den Cent auf. Also sind die drei
       Welcomedrinks in den Positionen enthalten — mit vollem Preis und
       voller Stückzahl. Für die Fassung ist NICHTS hinzuzuzählen; der
       Rabatt zieht allein am Geld. */
    assert.equal(rund(z.umsatz + z.rabatte.betrag), UMSATZ_TOTAL);
    assert.equal(stueck, STUECK, "der Rabatt kürzt keine Stückzahl");
  });

  test("Storno: die Ware fehlt den Positionen und ist keinem Artikel zuzuordnen", () => {
    assert.equal(z.storno.anzahl, 1);
    assert.equal(rund(z.storno.betrag), STORNO);
    assert.deepEqual(z.storno.gruende.map(r => r.name), ["Bedienerfehler"]);

    /* Gegenprobe: Wäre der stornierte Artikel im Positionsblock, müsste
       602,50 − 52,00 − 4,20 = 546,30 der Umsatz sein. Der Bericht sagt
       550,50. Der Storno steht also NICHT in den Positionen. */
    assert.notEqual(rund(z.umsatz + z.rabatte.betrag - z.storno.betrag), UMSATZ_TOTAL);
    assert.equal(z.positionen.filter(p => rund(p.umsatz) === STORNO).length, 0);

    /* Nach der Vorgabe ist die Ware entnommen und zählt: 145 + 1 = 146.
       Welcher Artikel es war, sagt der Bericht nicht — er nennt nur den
       Grund („Bedienerfehler"). Mehr ist daraus nicht zu holen. Diese
       eine Einheit ist damit Verbrauch OHNE Artikel, und sie muss
       sichtbar bleiben, statt lautlos zu fehlen: sonst taucht sie in der
       ersten Kellerzählung als Schwund auf. */
    const verbrauch = stueck + z.storno.anzahl;
    assert.equal(verbrauch, 146);
    assert.equal(z.storno.gruende.every(r => !pos(r.name)), true,
      "der Grund ist kein Artikelname und darf nie als Position gebucht werden");
  });

  test("beides bleibt am Ergebnis ablesbar, auch wenn nichts davon dasteht", () => {
    /* Ein Bericht ohne Rabatt- und Stornoblock liefert Nullen, keine
       fehlenden Felder — sonst muss jeder Aufrufer prüfen, ob es den
       Block gibt. */
    const leer = parseZ("\"Bis\"\t\"16.09.2026 23:26\"\n");
    assert.deepEqual(leer.rabatte, { anzahl: 0, betrag: 0, gruende: [] });
    assert.deepEqual(leer.storno, { anzahl: 0, betrag: 0, gruende: [] });
  });
});

describe("Z 37 – was der Bericht NICHT hergibt", () => {
  test("keine Warengruppe, keine Kostenstelle, kein Zeitpunkt je Position", () => {
    for (const p of z.positionen)
      assert.deepEqual(Object.keys(p).sort(),
        ["anzahl", "ml", "name", "umsatz", "zeilen"],
        "wer hier mehr findet, hat es erfunden");
  });

  test("Bar und Restaurant sind je Position nicht unterscheidbar", () => {
    /* Die Kostenstellen stehen als Tagessumme im Bericht, an der Zeile
       nicht. „Aperol Spritz 1 Glas" hat zwei Zeilen — welche die Bar
       war, sagt niemand. Für die Fassung („wo steht die Flasche?")
       taugt das nicht; dafür bleibt der Laufweg im Werkzeug. */
    const doppelt = z.positionen.filter(p => p.zeilen > 1).map(p => p.name);
    assert.deepEqual(doppelt.sort(), ["Aperol Spritz 1 Glas", "CH Gesellmann 1/8 l"]);
  });

  test("der Zeitraum steht im Bericht, `parseZ` gibt ihn nicht heraus", () => {
    /* `fassungsliste.von_ts` und `bis_ts` bleiben deshalb leer
       (review/OFFENE-ENTSCHEIDUNGEN.md Nr. 11). Der Rohtext steht in
       `fassungsliste.roh`, verloren ist nichts. */
    assert.equal(z.von, undefined);
    assert.equal(z.bis, undefined);
    assert.match(TEXT, /"Von"\t"15\.09\.2026 23:11"/);
    assert.match(TEXT, /"Bis"\t"16\.09\.2026 23:26"/);
  });
});

/* ── Durch den ganzen Weg ─────────────────────────────────────────────
   Der Parser allein beweist nichts über das, was in der Datenbank
   ankommt. Derselbe Bericht geht deshalb hier durch den echten Worker in
   eine echte SQLite-Datenbank aus `docs/live-schema.sql` — mit den
   Spalten, Typen und NOT-NULL-Marken der laufenden D1.                 */
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt, SCHEMA_DA } from "./hilfe/d1-echt.mjs";
import { randomInt } from "node:crypto";

describe("Z 37 – bis in die Datenbank", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt" }, () => {
  const CODE = String(randomInt(100000, 1000000));

  async function haus() {
    const worker = await ladeWorker();
    const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
    await worker.fetch(anfrage("/api/anlage", { method: "POST",
      body: { name: "Asad", rolle: "leitung", code: CODE } }), env);
    const a = await worker.fetch(anfrage("/api/anmelden",
      { method: "POST", body: { code: CODE } }), env);
    assert.equal(a.status, 200, "Anmeldung");
    return { worker, env, keks: keksAus(a) };
  }

  const senden = (worker, env, keks) => worker.fetch(anfrage("/api/fassungsliste",
    { method: "POST", keks, body: TEXT, headers: { "content-type": "text/plain" } }), env);

  test("der Bericht kommt vollständig in `fassungsliste` und `fassungszeile` an", async () => {
    const { worker, env, keks } = await haus();
    const a = await senden(worker, env, keks);
    const j = await a.json();
    assert.equal(a.status, 200, JSON.stringify(j));
    assert.equal(j.tag, "2026-09-16");
    assert.equal(j.positionen, 48);

    const [l] = env.DB.zeilen("fassungsliste");
    assert.equal(l.id, "2026-09-16", "der Betriebstag ist der Schlüssel");
    assert.equal(l.z, "Z 37");
    assert.equal(l.roh.length, TEXT.length, "der Rohtext bleibt vollständig erhalten");

    const zl = env.DB.zeilen("fassungszeile");
    assert.equal(zl.length, 48);
    assert.ok(zl.every(x => x.kern && x.kern.length), "`kern` ist live NOT NULL");
    assert.equal(zl.reduce((s, x) => s + x.anzahl, 0), STUECK);
    assert.equal(rund(zl.reduce((s, x) => s + x.betrag, 0)), WARE);

    const gv = zl.find(x => /GV Leindl/.test(x.rohbez));
    assert.equal(gv.anzahl, 4);
    assert.equal(gv.ausschankMl, 125, "ein Achtel, nicht acht Liter");
    assert.equal(gv.kern, "GV Leindl Langenlois");
  });

  test("der Storno geht mit hinaus, statt lautlos zu fehlen", async () => {
    const { worker, env, keks } = await haus();
    const j = await (await senden(worker, env, keks)).json();
    assert.equal(j.storno, 1, "1 Stück, keinem Artikel zuzuordnen");
    assert.equal(j.rabatt, 3, "3 Welcomedrinks — die stehen schon in den Positionen");
  });

  test("derselbe Bericht zweimal: eine Liste, 48 Zeilen", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    await senden(worker, env, keks);
    assert.equal(env.DB.zeilen("fassungsliste").length, 1);
    assert.equal(env.DB.zeilen("fassungszeile").length, 48);
  });

  test("Regel 5: kein Getränk wird automatisch zugeordnet", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    const zl = env.DB.zeilen("fassungszeile");
    const zugeordnet = zl.filter(x => x.artikel);
    assert.ok(zugeordnet.every(x => /^[a-z]\d{3}$/.test(x.artikel)),
      "zugeordnet wird nur über ein Kürzel im Namen, nie über Ähnlichkeit");
  });
});
