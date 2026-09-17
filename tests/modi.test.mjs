/* ═══════════════════════════════════════════════════════════════════════
   Die fünf Modi bis ins Journal — und was sie dort ablegen.

   Die Lücke, die „195 Prüfungen grün" offengelassen hat: Geprüft war die
   Tagesfassung und die Sonderentnahme. `fuellen`, `keller` und `ware`
   fasste keine Prüfung an, und genau dort standen drei falsche Zahlen:

     · Wareneingang rechnete jede Kiste mit sechs Flaschen, weil der
       Worker `kg` las und die App `kistengr` schreibt. Beim Zwölfer kam
       die halbe Lieferung an.
     · Eine Getränkelieferung wurde als Entnahme gebucht — dasselbe Feld
       `gent` heisst im Wareneingang „geliefert" und in der
       Sonderentnahme „geholt".
     · Nachfüllen erzeugte überhaupt keine Zeile: Der Worker summierte
       die Weinorte, die beim Nachfüllen leer sind, und die geholten
       Getränke standen in einem Feld, das er nie las.

   Geprüft wird gegen eine echte SQLite-Datenbank aus
   `docs/live-schema.sql` — Spalten, CHECK-Bedingungen und NOT-NULL wie
   live.
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt, SCHEMA_DA } from "./hilfe/d1-echt.mjs";

let worker;
before(async () => { worker = await ladeWorker(); });

const CODE = String(randomInt(100000, 1000000));

async function haus() {
  const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage", { method: "POST",
    body: { name: "Asad", rolle: "leitung", code: CODE } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env);
  assert.equal(a.status, 200, "Anmeldung");
  env.ANLAGE_OFFEN = "";
  return { env, keks: keksAus(a) };
}

const senden = (env, keks, schluessel, daten) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(schluessel),
    { method: "PUT", keks, body: daten }), env);

/* Die Buchungen eines Vorgangs, ohne die Notizzeilen (`artikel = ''`). */
const buchungen = env => env.DB.zeilen("ereignis")
  .filter(r => r.artikel !== "")
  .map(r => ({ art: r.art, artikel: r.artikel, menge: r.menge, ort: r.ort }));

describe("Die fünf Modi im Journal", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt" }, () => {

  test("ware: die Kistengröße der App zählt, nicht die Sechs", async () => {
    const { env, keks } = await haus();
    const a = await senden(env, keks, "ware_2026-09-16", {
      mode: "ware", tag: "2026-09-16", name: "Asad", zeit: "2026-09-16T10:00:00.000Z",
      finished: true,
      /* So legt die App eine Position ab: `kistengr`, nicht `kg`. */
      pos: [{ id: "w003", kisten: 2, kistengr: 12, jg: "2025" },
            { id: "w001", kisten: 1, kistengr: 6, jg: "2024" }]
    });
    assert.equal(a.status, 200, JSON.stringify(await a.json()));
    const b = buchungen(env);
    assert.deepEqual(b.find(x => x.artikel === "w003"),
      { art: "eingang", artikel: "w003", menge: 24, ort: "keller" },
      "zwei Zwölferkisten sind 24 Flaschen, nicht 12");
    assert.deepEqual(b.find(x => x.artikel === "w001"),
      { art: "eingang", artikel: "w001", menge: 6, ort: "keller" });
  });

  test("ware: eine Getränkelieferung ist ein Eingang, keine Entnahme", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, "ware_2026-09-16", {
      mode: "ware", tag: "2026-09-16", name: "Asad", zeit: "2026-09-16T10:00:00.000Z",
      finished: true, pos: [], gent: { cola: 24, tonicth: 6 }
    });
    const b = buchungen(env);
    assert.equal(b.length, 2);
    assert.ok(b.every(x => x.art === "eingang" && x.ort === "lager"),
      "geliefert heisst eingang: " + JSON.stringify(b));
    assert.equal(b.find(x => x.artikel === "cola").menge, 24);
  });

  test("ware: zusätzlich Entnommenes bleibt eine Entnahme", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, "ware_2026-09-16", {
      mode: "ware", tag: "2026-09-16", name: "Asad", zeit: "2026-09-16T10:00:00.000Z",
      finished: true, pos: [], gent: { cola: 24 }, gzusatz: { almd: 2 } });
    const b = buchungen(env);
    assert.equal(b.find(x => x.artikel === "cola").art, "eingang");
    assert.equal(b.find(x => x.artikel === "almd").art, "entnahme");
  });

  test("fuellen: die geholten Getränke stehen im Journal", async () => {
    const { env, keks } = await haus();
    /* `gent` füllt die App beim Abschluss aus den abgehakten Positionen
       (`geholteGetraenke` in public/index.html) — der Server kann die
       Fehlmenge nicht ausrechnen, das Soll steht im Gerät. */
    const a = await senden(env, keks, "fuellen_2026-09-16", {
      mode: "fuellen", tag: "2026-09-16", name: "Asad",
      zeit: "2026-09-16T18:00:00.000Z", finished: true,
      barrot: {}, bar: {}, backup: {}, gent: { cola: 6, tonicth: 3 }
    });
    assert.equal(a.status, 200);
    const b = buchungen(env);
    assert.equal(b.length, 2, "zwei Getränke geholt, zwei Zeilen: " + JSON.stringify(b));
    assert.ok(b.every(x => x.art === "entnahme" && x.ort === "lager"));
    assert.equal(b.find(x => x.artikel === "cola").menge, 6);
  });

  test("fuellen ohne geholte Getränke schreibt nichts — und meldet keinen Fehler",
    async () => {
      const { env, keks } = await haus();
      const a = await senden(env, keks, "fuellen_2026-09-16", {
        mode: "fuellen", tag: "2026-09-16", name: "Asad",
        zeit: "2026-09-16T18:00:00.000Z", finished: true,
        barrot: {}, bar: {}, backup: {}, gent: {} });
      assert.equal(a.status, 200);
      assert.equal(buchungen(env).length, 0);
      assert.equal(env.DB.zeilen("vorgang").length, 1, "der Vorgang steht trotzdem da");
    });

  test("keller: die Zählung steht je Artikel im Journal", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, "keller_2026-09-16", {
      mode: "keller", tag: "2026-09-16", name: "Asad",
      zeit: "2026-09-16T09:00:00.000Z", finished: true,
      zdone: { w001: 1, w026: 1 },
      reihen: { w001: 2, w026: 0 }, einzel: { w001: 3, w026: 4 }
    });
    const b = buchungen(env);
    assert.equal(b.length, 2);
    assert.ok(b.every(x => x.art === "zaehlung" && x.ort === "keller"));
    assert.equal(b.find(x => x.artikel === "w001").menge, 15, "zwei Reihen à sechs, plus drei");
    assert.equal(b.find(x => x.artikel === "w026").menge, 4);
  });

  test("tag: Wein aus dem Keller, Getränke aus dem Lager", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, "tag_2026-09-16", {
      mode: "tag", tag: "2026-09-16", name: "Asad", zeit: "2026-09-16T23:00:00.000Z",
      finished: true, barrot: { w026: 2 }, rest: { w026: 1 }, bar: {}, backup: {},
      zusatz: { w001: 1 }, gent: { cola: 4 }
    });
    const b = buchungen(env);
    assert.equal(b.find(x => x.artikel === "w026").menge, 3, "barrot 2 + rest 1");
    assert.equal(b.find(x => x.artikel === "w026").ort, "keller");
    assert.equal(b.find(x => x.artikel === "cola").ort, "lager");
    assert.ok(b.every(x => x.art === "entnahme"));
  });

  test("nach: die Sonderentnahme bleibt eine Entnahme", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, "nach_2026-09-16", {
      mode: "nach", tag: "2026-09-16", name: "Asad", zeit: "2026-09-16T21:00:00.000Z",
      finished: true, ent: { w026: 2 }, gent: { cola: 3 } });
    const b = buchungen(env);
    assert.equal(b.length, 2);
    assert.ok(b.every(x => x.art === "entnahme"));
    assert.equal(b.find(x => x.artikel === "cola").ort, "lager");
  });

  test("der Bestand rechnet Eingang und Entnahme mit dem richtigen Vorzeichen",
    async () => {
      const { env, keks } = await haus();
      /* Eine Millisekunde Abstand zwischen den drei Vorgängen. `ereignis.ts`
         ist die SCHREIBZEIT, nicht die Zeit der Handlung; wer in derselben
         Millisekunde schreibt, hat keine Reihenfolge. Siehe die Prüfung
         darunter und Entscheidung Nr. 15. */
      const tick = () => new Promise(r => setTimeout(r, 2));
      await senden(env, keks, "keller_2026-09-14", {
        mode: "keller", tag: "2026-09-14", name: "Asad",
        zeit: "2026-09-14T09:00:00.000Z", finished: true,
        zdone: { w003: 1 }, reihen: { w003: 0 }, einzel: { w003: 10 } });
      await tick();
      await senden(env, keks, "ware_2026-09-15", {
        mode: "ware", tag: "2026-09-15", name: "Asad",
        zeit: "2026-09-15T10:00:00.000Z", finished: true,
        pos: [{ id: "w003", kisten: 2, kistengr: 12 }] });
      await tick();
      await senden(env, keks, "nach_2026-09-16", {
        mode: "nach", tag: "2026-09-16", name: "Asad",
        zeit: "2026-09-16T21:00:00.000Z", finished: true, ent: { w003: 4 } });

      const j = await (await worker.fetch(anfrage("/api/bestand", { keks }), env)).json();
      assert.equal(j.bestand.w003, 10 + 24 - 4,
        "gezählt 10, geliefert 24, entnommen 4");
    });

  test("gleiche Millisekunde: die Bewegung fällt heraus — BEKANNT (Nr. 15)",
    async () => {
      /* `bestand()` ordnet allein über `ereignis.ts`, und `ts` ist die
         Zeit des SCHREIBENS. Treffen Zählung und Lieferung in derselben
         Millisekunde ein — und genau das tun sie, wenn die Geräte nach
         einem Funkloch ihre Warteschlange auf einmal nachschicken —, dann
         verwirft `r.ts <= basis` die Bewegung.

         Diese Prüfung ÄNDERT nichts, sie hält den Zustand fest: Die
         Rechnung anzufassen hat eine fachliche Folge (zählt der
         Betriebstag oder der Zeitstempel?) und gehört dem Betreiber —
         `review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 15. Wird sie rot, ist die
         Entscheidung umgesetzt und der Text hier gegenstandslos. */
      const { env, keks } = await haus();
      await senden(env, keks, "keller_2026-09-14", {
        mode: "keller", tag: "2026-09-14", name: "Asad",
        zeit: "2026-09-14T09:00:00.000Z", finished: true,
        zdone: { w003: 1 }, reihen: { w003: 0 }, einzel: { w003: 10 } });
      await senden(env, keks, "ware_2026-09-15", {
        mode: "ware", tag: "2026-09-15", name: "Asad",
        zeit: "2026-09-15T10:00:00.000Z", finished: true,
        pos: [{ id: "w003", kisten: 2, kistengr: 12 }] });

      const j = await (await worker.fetch(anfrage("/api/bestand", { keks }), env)).json();
      const zeilen = env.DB.zeilen("ereignis").filter(r => r.artikel === "w003");
      const gleich = zeilen.length === 2 && zeilen[0].ts === zeilen[1].ts;
      if (gleich) assert.equal(j.bestand.w003, 10,
        "gleiche Millisekunde: die 24 gelieferten Flaschen fallen heraus");
      else assert.equal(j.bestand.w003, 34,
        "verschiedene Millisekunden: die Lieferung zählt");
    });
});

describe("Zuordnung wirkt rückwirkend — in beide Richtungen", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt" }, () => {
  const T = (...f) => f.map(x => `"${x}"`).join("\t");
  const BERICHT = [
    T("Bis", "16.09.2026 23:26", "", ""),
    "-----------------------------------------",
    T("Positionen", "Anzahl", "Betrag", ""),
    "-----------------------------------------",
    T("Prosecco, Serena 0,1l", "6", "36,00", ""),
    T("Espresso", "7", "22,40", "")
  ].join("\n");

  const einlesen = (env, keks) => worker.fetch(anfrage("/api/fassungsliste",
    { method: "POST", keks, body: BERICHT, headers: { "content-type": "text/plain" } }), env);
  const zuordnen = (env, keks, body) => worker.fetch(anfrage("/api/mapping",
    { method: "POST", keks, body }), env);
  const zeile = (env, name) =>
    env.DB.zeilen("fassungszeile").find(z => z.rohbez === name);

  test("ein Artikel wandert in die schon eingelesene Zeile", async () => {
    const { env, keks } = await haus();
    await einlesen(env, keks);
    assert.equal(zeile(env, "Espresso").artikel, null);
    await zuordnen(env, keks, { kassenname: "Espresso", artikel: "w001" });
    assert.equal(zeile(env, "Espresso").artikel, "w001");
  });

  test("„ignoriert“ räumt den Artikel wieder weg", async () => {
    const { env, keks } = await haus();
    await einlesen(env, keks);
    await zuordnen(env, keks, { kassenname: "Espresso", artikel: "w001" });
    await zuordnen(env, keks, { kassenname: "Espresso", ignoriert: 1 });
    assert.equal(zeile(env, "Espresso").artikel, null,
      "sonst rechnet „Verkauf ↔ Fassung“ weiter mit einer Position, "
      + "die die Leitung gerade ausgeschlossen hat");
    const m = env.DB.zeilen("mapping").find(x => x.fremd === "Espresso");
    assert.equal(m.status, "ignoriert");
  });
});

describe("Das Postfach lässt nur die freigegebene Domäne herein",
  { skip: SCHEMA_DA ? false : "docs/live-schema.sql fehlt" }, () => {

  const post = async (von, absender) => {
    const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ABSENDER: absender };
    let abgewiesen = null;
    const ctx = { waitUntil: p => p };
    await worker.email({ from: von, raw: "", setReject: g => { abgewiesen = g; } }, env, ctx);
    return abgewiesen;
  };

  test("die eigene Domäne kommt durch", async () => {
    assert.equal(await post("kasse@gastronovi.com", "gastronovi.com"), null);
    assert.equal(await post("kasse@mail.gastronovi.com", "gastronovi.com"), null,
      "auch eine Unterdomäne");
  });

  test("eine Domäne, die nur so ENDET, kommt nicht durch", async () => {
    /* `endsWith` auf der ganzen Adresse liess das bis v22 durch: Wer
       `boesegastronovi.com` registriert, legt beliebige Z-Berichte in die
       Datenbank. */
    assert.match(await post("post@boesegastronovi.com", "gastronovi.com") || "",
      /nicht freigegeben/);
    assert.match(await post("kasse@gastronovi.com.example.net", "gastronovi.com") || "",
      /nicht freigegeben/);
  });

  test("die Freigabe darf mit oder ohne @ geschrieben sein", async () => {
    assert.equal(await post("kasse@gastronovi.com", "@gastronovi.com"), null);
    assert.equal(await post("kasse@gastronovi.com", " GASTRONOVI.COM , sonst.at"), null);
  });

  test("ohne ABSENDER bleibt die Tür offen — wie bisher", async () => {
    assert.equal(await post("wer@auch.immer", ""), null);
  });
});
