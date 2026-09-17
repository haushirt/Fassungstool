/* Der Wochenbrief (`scheduled` in src/index.js) — bis Runde 2 von keiner
   einzigen Prüfung durchlaufen.

   Warum das gerade jetzt zählt: Seit Runde 2 bucht `ereignisseAbleiten`
   Korrekturen als Gegenbuchung nach. Damit stehen im Journal erstmals
   NEGATIVE Mengen. Der Wochenbrief ist die einzige Stelle im Worker, die
   `menge` aufsummiert statt Zeile für Zeile zu lesen — wenn irgendwo ein
   Betrag statt einer vorzeichenbehafteten Zahl gelesen wird, dann hier.
   Der software-engineer hat das in seiner Übergabe als offenen Punkt an
   die QA weitergegeben; diese Datei ist die Antwort darauf.

   Grenze, die dazugehört: Die D1-Attrappe bildet `SUM(menge)` als
   vorzeichenbehaftete Summe nach, weil SQLite das so tut. Ein Beweis über
   die laufende Datenbank ist das nicht (Regel 3, `docs/live-schema.sql`
   fehlt) — geprüft wird der Worker, nicht D1. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker } from "./hilfe/worker.mjs";
import { d1Attrappe } from "./hilfe/d1-attrappe.mjs";

const worker = await ladeWorker();

/* Der Brief wird über `notiz()` ins Journal gelegt; `ctx.waitUntil` muss
   abgewartet werden, sonst prüft man gegen eine leere Tabelle. */
async function briefeSchreiben(DB) {
  const warten = [];
  await worker.scheduled({}, { DB }, { waitUntil: p => warten.push(p) });
  await Promise.all(warten);
  return DB.tabellen.ereignis.filter(e => e.quelle === "wochenbrief").map(e => e.notiz);
}

const heute = new Date().toISOString().slice(0, 10);

const zeile = (artikel, menge, art = "entnahme", tag = heute) =>
  ({ id: artikel + menge + Math.random(), ts: Date.now(), tag, art,
     quelle: "vorgang", vorgang: "v1", artikel, ort: "keller", menge, wer: "Asad" });

describe("Wochenbrief", () => {
  test("er läuft überhaupt und schreibt genau eine Notiz", async () => {
    const DB = d1Attrappe({ ereignis: [zeile("w001", 4)] });
    const briefe = await briefeSchreiben(DB);
    assert.equal(briefe.length, 1, "der Wochenbrief hat nichts geschrieben");
    assert.match(briefe[0], /^Wochenbrief \d{4}-\d{2}-\d{2} bis \d{4}-\d{2}-\d{2}/);
  });

  test("die Gegenbuchung wird abgezogen, nicht dazugezählt", async () => {
    /* Fassung nimmt 5, Korrektur danach nimmt 3 davon zurück. Im Keller
       fehlen 2 Flaschen — nicht 8. Läse hier jemand den Betrag, stünde
       „8" im Brief und die Leitung suchte sechs Flaschen, die es nie
       gab. */
    const DB = d1Attrappe({ ereignis: [
      zeile("w001", 5),
      Object.assign(zeile("w001", -3), { quelle: "vorgang-korrektur" })
    ] });
    const [brief] = await briefeSchreiben(DB);
    const z = brief.split("\n").find(l => l.includes("w001"));
    assert.equal(z.trim().split(/\s+/)[0], "2",
      "Vorzeichen verloren — im Brief steht: " + JSON.stringify(z));
  });

  test("eine vollständig zurückgenommene Entnahme steht mit 0 im Brief, nicht doppelt", async () => {
    const DB = d1Attrappe({ ereignis: [
      zeile("w002", 1),
      Object.assign(zeile("w002", -1), { quelle: "vorgang-korrektur" })
    ] });
    const [brief] = await briefeSchreiben(DB);
    const z = brief.split("\n").find(l => l.includes("w002"));
    assert.equal(z.trim().split(/\s+/)[0], "0", "im Brief steht: " + JSON.stringify(z));
  });

  test("die Reihenfolge ist die der Summen, nicht die der Beträge", async () => {
    /* w010 hat viel Bewegung, aber fast alles wurde zurückgenommen; w011
       hat wenig Bewegung, die bleibt. Wer Beträge summiert, setzt w010
       nach oben — und die Leitung sieht den falschen Wein zuoberst. */
    const DB = d1Attrappe({ ereignis: [
      zeile("w010", 20),
      Object.assign(zeile("w010", -19), { quelle: "vorgang-korrektur" }),
      zeile("w011", 6)
    ] });
    const [brief] = await briefeSchreiben(DB);
    const zeilen = brief.split("\n").filter(l => /w0\d\d/.test(l));
    assert.deepEqual(zeilen.map(l => l.trim().split(/\s+/)[1]), ["w011", "w010"]);
    assert.equal(zeilen[1].trim().split(/\s+/)[0], "1");
  });

  test("Zählungen und Eingänge gehören nicht in die Verbrauchsliste", async () => {
    const DB = d1Attrappe({ ereignis: [
      zeile("w003", 12, "zaehlung"),
      zeile("w003", 6, "eingang"),
      zeile("w003", 2)
    ] });
    const [brief] = await briefeSchreiben(DB);
    const z = brief.split("\n").find(l => l.includes("w003"));
    assert.equal(z.trim().split(/\s+/)[0], "2",
      "es darf nur die Entnahme zählen — im Brief: " + JSON.stringify(z));
  });

  test("ein Betriebstag ohne Z-Bericht wird gemeldet", async () => {
    const DB = d1Attrappe({
      ereignis: [],
      vorgang: [{ id: "tag_" + heute, tag: heute, art: "tag", wer: "Asad",
                  daten: "{}", abgeschlossen: 1, ts: Date.now() }],
      fassungsliste: []
    });
    const [brief] = await briefeSchreiben(DB);
    assert.match(brief, new RegExp("Ohne Z-Bericht: " + heute));
  });

  test("liegt der Z-Bericht vor, meldet der Brief keine Lücke", async () => {
    const DB = d1Attrappe({
      ereignis: [],
      vorgang: [{ id: "tag_" + heute, tag: heute, art: "tag", wer: "Asad",
                  daten: "{}", abgeschlossen: 1, ts: Date.now() }],
      fassungsliste: [{ tag: heute, nr: "Z 1", quelle: "email", roh: "", ts: 1 }]
    });
    const [brief] = await briefeSchreiben(DB);
    assert.match(brief, /Alle Betriebstage haben einen Z-Bericht\./);
  });

  test("ohne jede Bewegung wirft der Brief nicht", async () => {
    const [brief] = await briefeSchreiben(d1Attrappe());
    assert.ok(brief.length > 0);
  });
});
