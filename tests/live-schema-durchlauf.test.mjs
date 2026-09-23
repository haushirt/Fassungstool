/* ═══════════════════════════════════════════════════════════════════════
   Der ganze Worker gegen die echte Tabellenstruktur

   Anlass, Runde 3: In der laufenden D1 standen `vorgang` 0 Zeilen,
   `ereignis` 0, `fassungsliste` 0, `mapping` 0. Es ist nie ein Vorgang
   angekommen — der Worker schrieb gegen Spalten, die es dort nicht gibt
   (`vorgang.art`, `vorgang.person`, `vorgang.ts`), und liess die
   NOT-NULL-Spalten `modus`, `begonnen`, `status` weg. Bemerkt hat es
   niemand, weil die Prüfungen gegen eine Attrappe liefen, die genau die
   falschen Namen kannte.

   Hier läuft deshalb keine Attrappe, sondern SQLite mit dem Schema aus
   `docs/live-schema.sql` (siehe `hilfe/d1-echt.mjs`). Jede Abfrage des
   Workers muss sich gegen die echten Spalten, CHECK-Bedingungen und
   Schlüssel behaupten. Was hier grün ist, kann live nicht an einem
   Spaltennamen scheitern.

   Fehlt `docs/live-schema.sql`, meldet sich die ganze Datei als
   übersprungen — ein erfundenes Schema wäre schlimmer als keines.
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt, SCHEMA_DA } from "./hilfe/d1-echt.mjs";

const CODE = "4188";                       /* nur in dieser Prüfung */
let worker;
before(async () => { worker = await ladeWorker(); });

async function haus(start) {
  const env = { DB: d1Echt(start), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Asad", rolle: "leitung", code: CODE } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env);
  assert.equal(a.status, 200, "Anmeldung");
  return { env, keks: keksAus(a) };
}

const SCHLUESSEL = "tag_2026-09-16";
const fassung = (zaehlnr, mehr = {}) => ({
  mode: "tag", tag: "2026-09-16", name: "Asad", geraet: "iphone-1", zaehlnr,
  barrot: { w001: 2 }, bar: {}, backup: {}, rest: { w002: 1 },
  zeit: "2026-09-16T23:10:00.000Z", ...mehr
});
const put = (env, keks, daten, sch = SCHLUESSEL) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(sch),
    { method: "PUT", keks, body: daten }), env);

describe("Der Worker an der echten Tabellenstruktur", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt — ohne die Datei gibt es nichts zu prüfen" }, () => {

  /* Die eine Frage, um die es geht. */
  test("ein Vorgang kommt an: geschrieben, in den Spalten sichtbar", async () => {
    const { env, keks } = await haus();
    const a = await put(env, keks, fassung(1));
    assert.equal(a.status, 200, JSON.stringify(await a.clone().json()));

    const [v] = env.DB.zeilen("vorgang");
    assert.ok(v, "eine Zeile in vorgang");
    assert.equal(v.id, SCHLUESSEL);
    assert.equal(v.modus, "tag");
    assert.equal(v.tag, "2026-09-16");
    assert.equal(v.wer, "Asad");
    assert.equal(v.status, "offen");
    assert.equal(v.abgeschlossen, null, "ein laufender Vorgang hat kein Ende");
    assert.ok(v.begonnen > 0 && v.geaendert > 0, "begonnen und geaendert sind gesetzt");
    assert.equal(JSON.parse(v.daten).barrot.w001, 2);
  });

  test("und kommt über /api/vorgaenge FLACH wieder heraus", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(3, { finished: true }));

    const a = await worker.fetch(anfrage("/api/vorgaenge", { keks }), env);
    assert.equal(a.status, 200);
    const { vorgaenge } = await a.json();
    assert.equal(vorgaenge.length, 1);
    const v = vorgaenge[0];

    /* Genau diese sechs legt der Worker über die gespeicherten `daten` —
       `public/index.html` (`fernNeuer`, Archiv) und `public/leitung.html`
       lesen sie so. */
    assert.equal(v.id, SCHLUESSEL);
    assert.equal(v.tag, "2026-09-16");
    assert.equal(v.mode, "tag");
    assert.equal(v.name, "Asad");
    assert.equal(v.finished, true);
    assert.match(v.archiviert, /^\d{4}-\d{2}-\d{2}T/, "archiviert ist eine ISO-Zeit");
    /* und der Zustand selbst steht flach daneben, nicht unter `daten` */
    assert.equal(v.barrot.w001, 2);
    assert.equal(v.zaehlnr, 3);
    assert.equal(v.daten, undefined, "kein verschachteltes daten");
  });

  test("der Zeitraumfilter von/bis trifft die Spalte tag", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1), "tag_2026-09-16");
    await put(env, keks, { ...fassung(1), tag: "2026-09-20" }, "tag_2026-09-20");
    const eng = await (await worker.fetch(
      anfrage("/api/vorgaenge?von=2026-09-17&bis=2026-09-30", { keks }), env)).json();
    assert.deepEqual(eng.vorgaenge.map(v => v.tag), ["2026-09-20"]);
  });

  test("abgeschlossen setzt status und Zeitstempel, ohne Widerspruch zu daten", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1));
    await put(env, keks, fassung(2, { finished: true }));
    const [v] = env.DB.zeilen("vorgang");
    assert.equal(v.status, "abgeschlossen");
    assert.ok(v.abgeschlossen > 0);
    assert.equal(JSON.parse(v.daten).finished, true);
  });

  test("Regel 14: schluessel, zaehlnr und geraet bleiben unberührt", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(7));
    const [v] = env.DB.zeilen("vorgang");
    assert.equal(v.schluessel, null);
    assert.equal(v.zaehlnr, 0, "die Spalte bleibt auf ihrem Vorgabewert");
    assert.equal(v.geraet, null);
    assert.equal(v.branch, null);
  });

  /* `vorgang_schluessel` ist ein UNIQUE-Index auf einer Spalte, die der
     Worker nie füllt. In SQLite zählt NULL nicht als Dublette — ohne das
     käme schon der zweite Vorgang nicht mehr hinein. Hier nachgewiesen,
     statt darauf zu vertrauen. */
  test("mehrere Vorgänge trotz UNIQUE-Index auf dem leeren schluessel", async () => {
    const { env, keks } = await haus();
    for (const t of ["2026-09-14", "2026-09-15", "2026-09-16"])
      assert.equal((await put(env, keks, { ...fassung(1), tag: t }, "tag_" + t)).status, 200);
    assert.equal(env.DB.zeilen("vorgang").length, 3);
  });

  test("der Abschluss schreibt Ereignisse, die CHECK und NOT NULL bestehen", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, { finished: true }));
    const e = env.DB.zeilen("ereignis");
    assert.equal(e.length, 2, "w001 und w002");
    for (const z of e) {
      assert.ok(["zaehlung", "entnahme", "eingang", "korrektur"].includes(z.art));
      assert.equal(z.quelle, "vorgang");
      assert.equal(z.vorgang, SCHLUESSEL);
      assert.equal(z.ort, "keller");
      assert.equal(z.wer, "Asad");
      assert.equal(z.tag, "2026-09-16");
      assert.ok(z.menge > 0);
    }
  });

  /* Der Punkt aus Runde 2, der bis jetzt unbelegt war: `ereignis.quelle`
     hat live KEINE CHECK-Bedingung, `vorgang-korrektur` geht durch. */
  test("die Gegenbuchung aus Runde 2 wird von der Datenbank angenommen", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, { finished: true, barrot: { w001: 2 } }));
    const a = await put(env, keks, fassung(2, { finished: true, barrot: { w001: 5 } }));
    assert.equal(a.status, 200, JSON.stringify(await a.clone().json()));
    const korr = env.DB.zeilen("ereignis").filter(z => z.quelle === "vorgang-korrektur");
    assert.equal(korr.length, 1);
    assert.equal(korr[0].menge, 3, "gebucht wird die Differenz");
  });

  /* Vorgang und Journal gehen seit Runde 3 in EINEM `batch` hinaus.
     Scheitert eine Zeile des Journals, darf auch der Vorgang nicht
     stehen bleiben — sonst zeigt die Leitung eine Fassung, die im
     Bestand nie stattgefunden hat. Hier erzwungen, indem die Einfügung
     ins Journal eine Menge bekommt, die SQLite nicht nimmt. */
  test("scheitert das Journal, bleibt auch der Vorgang draussen", async () => {
    const { env, keks } = await haus();
    const echt = env.DB.prepare.bind(env.DB);
    env.DB.prepare = sql => /INSERT INTO ereignis/.test(sql)
      ? { bind: () => ({ _lauf: () => { throw new Error("D1_ERROR: erzwungen"); } }) }
      : echt(sql);

    const a = await put(env, keks, fassung(1, { finished: true }));
    assert.equal(a.status, 500, "der Fehler kommt als Klartext zurück");
    env.DB.prepare = echt;
    assert.equal(env.DB.zeilen("vorgang").length, 0, "nichts halb gespeichert");
    assert.equal(env.DB.zeilen("ereignis").length, 0);
  });

  test("dasselbe Paket zweimal: eine Zeile, ein Satz Ereignisse", async () => {
    const { env, keks } = await haus();
    const d = fassung(1, { finished: true });
    await put(env, keks, d);
    const n = env.DB.zeilen("ereignis").length;
    await put(env, keks, d);
    assert.equal(env.DB.zeilen("vorgang").length, 1);
    assert.equal(env.DB.zeilen("ereignis").length, n, "keine doppelten Ereignisse");
  });

  test("/api/bestand rechnet aus dem Journal", async () => {
    const { env, keks } = await haus();
    await put(env, keks, { mode: "keller", tag: "2026-09-16", name: "Asad", zaehlnr: 1,
      finished: true, zdone: { w001: 1 }, reihen: { w001: 2 }, einzel: { w001: 1 } },
      "keller_2026-09-16");
    const j = await (await worker.fetch(anfrage("/api/bestand", { keks }), env)).json();
    assert.equal(j.bestand.w001, 13, "2 Reihen à 6 plus 1 einzeln");
  });

  /* Der Mailweg. `notiz()` schrieb bis Runde 3 nur sechs Spalten, während
     `vorgang`, `artikel`, `ort`, `menge` und `wer` NOT NULL sind — jeder
     eingegangene Z-Bericht scheiterte danach still im `waitUntil`. */
  test("eine Notiz aus dem Mailempfang steht im Journal", async () => {
    const { env } = await haus();
    const wartet = [];
    await worker.email(
      { from: "kasse@example.org", raw: "" },
      env, { waitUntil: p => wartet.push(p) });
    await Promise.all(wartet);
    const [n] = env.DB.zeilen("ereignis");
    assert.ok(n, "die Notiz ist angekommen");
    assert.equal(n.quelle, "email");
    assert.equal(n.art, "korrektur");
    assert.equal(n.artikel, "", "leerer Artikel ist die Marke der Notiz");
    assert.match(n.notiz, /kein Z-Bericht/);
  });

  test("Notizen fallen aus dem Bestand heraus", async () => {
    const { env, keks } = await haus();
    const wartet = [];
    await worker.email({ from: "x@example.org", raw: "" }, env, { waitUntil: p => wartet.push(p) });
    await Promise.all(wartet);
    const j = await (await worker.fetch(anfrage("/api/bestand", { keks }), env)).json();
    assert.deepEqual(j.bestand, {}, "eine Notiz ist keine Buchung");
  });

  test("der Wochenbrief läuft und hinterlässt genau eine Notiz", async () => {
    const { env, keks } = await haus();
    await put(env, keks, fassung(1, { finished: true }));
    const wartet = [];
    await worker.scheduled({}, env, { waitUntil: p => wartet.push(p) });
    await Promise.all(wartet);
    const briefe = env.DB.zeilen("ereignis").filter(z => z.quelle === "wochenbrief");
    assert.equal(briefe.length, 1);
    assert.match(briefe[0].notiz, /Wochenbrief/);
  });

  /* ── Z-Bericht, Zuordnung, Stammdaten ─────────────────────────────── */
  /* Nachgebaut wie in `tests/zbericht.test.mjs` — `tests/fixtures/` ist
     weiterhin leer. Die vier Eigenheiten aus Regel 7 stecken mit drin. */
  const T = (...f) => f.map(x => `"${x}"`).join("\t");
  const ZBERICHT = [
    T("Tagesabschluss Z 47", "", "", ""),
    T("Von", "01.09.2026 06:00", "", ""),
    T("Bis", "02.09.2026 05:59", "", ""),
    "-----------------------------------------",
    T("Artikelumsätze", "", "", ""),
    "-----------------------------------------",
    T("GV Leindl, Langenlois 1/8", "12", "4,50", "54,00 €"),
    T("GV Leindl, Langenlois 1/8", "5", "4,50", "22,50 €"),   /* Bar + Restaurant */
    T("Raschhofer Pils 0,5l", "7", "4,20", "29,40 €"),
    T("Welcomedrink Sekt 0,1 l", "8", "0,00", "0,00 €"),      /* Nullpreis */
    T("Zweigelt 0,75 l 0,125 l", "3", "6,00", "18,00 €"),     /* Grösse doppelt */
    T("Summe", "35", "", "123,90 €")
  ].join("\n");
  const ZPOST = keks => anfrage("/api/fassungsliste",
    { method: "POST", keks, body: ZBERICHT, headers: { "content-type": "text/plain" } });

  test("ein Z-Bericht landet in fassungsliste und fassungszeile", async () => {
    const { env, keks } = await haus();
    const a = await worker.fetch(ZPOST(keks), env);
    const j = await a.json();
    assert.equal(a.status, 200, JSON.stringify(j));
    assert.equal(j.tag, "2026-09-02");
    assert.equal(j.positionen, 4, "die doppelte Position ist eine");

    const [l] = env.DB.zeilen("fassungsliste");
    assert.equal(l.id, "2026-09-02", "der Betriebstag ist der Schlüssel der Liste");
    assert.equal(l.tag, "2026-09-02");
    assert.equal(l.z, "Z 47");
    assert.equal(l.wer, "hand:Asad");
    assert.ok(l.importiert > 0);
    /* Seit Runde 21 liest der Leser die Kostenstelle — dieser nachgebaute
       Bericht nennt aber keine, also bleibt die Spalte zu Recht leer.
       (Bis Runde 21 stand hier „liefert der Leser heute nicht"; das galt
       damals für jeden Bericht und gilt jetzt nur noch für diesen.) */
    assert.equal(l.kostenstelle, null, "ohne Kostenstellenzeile bleibt die Spalte leer");

    const z = env.DB.zeilen("fassungszeile");
    assert.equal(z.length, 4);
    assert.ok(z.every(x => x.liste === "2026-09-02"));
    assert.ok(z.every(x => x.kern && x.kern.length), "kern ist NOT NULL und gefüllt");

    const pils = z.find(x => /Pils/.test(x.rohbez));
    assert.equal(pils.kern, "Raschhofer Pils", "die Grösse fällt aus dem Kern");
    assert.equal(pils.anzahl, 7);
    assert.equal(pils.ausschankMl, 500);
    assert.equal(pils.artikel, null, "Regel 5: Getränke werden nicht automatisch zugeordnet");

    const gv = z.find(x => /Leindl/.test(x.rohbez));
    assert.equal(gv.anzahl, 17, "Regel 7: beide Herkünfte summiert");
    assert.equal(gv.betrag, 76.5);
    assert.equal(gv.artikel, "w001", "Wein wird über das Kürzel bestätigt");

    const zw = z.find(x => /Zweigelt/.test(x.rohbez));
    assert.equal(zw.kern, "Zweigelt", "auch die doppelte Grössenangabe fällt weg");
    assert.equal(zw.ausschankMl, 125, "Regel 7: das letzte Vorkommen gilt");
  });

  test("derselbe Bericht zweimal: eine Liste, keine doppelten Zeilen", async () => {
    const { env, keks } = await haus();
    await worker.fetch(ZPOST(keks), env);
    await worker.fetch(ZPOST(keks), env);
    assert.equal(env.DB.zeilen("fassungsliste").length, 1);
    assert.equal(env.DB.zeilen("fassungszeile").length, 4);
  });

  test("/api/fassungsliste liest Kopf und Zeilen wieder zusammen", async () => {
    const { env, keks } = await haus();
    await worker.fetch(ZPOST(keks), env);

    const eine = await (await worker.fetch(
      anfrage("/api/fassungsliste?tag=2026-09-02", { keks }), env)).json();
    assert.equal(eine.tag, "2026-09-02");
    assert.equal(eine.positionen.length, 4);

    const liste = await (await worker.fetch(anfrage("/api/fassungsliste", { keks }), env)).json();
    assert.deepEqual(liste.berichte, [{ tag: "2026-09-02", z: "Z 47",
      importiert: liste.berichte[0].importiert, positionen: 4 }]);
  });

  test("eine Zuordnung von Hand zieht die schon eingelesenen Zeilen nach", async () => {
    const { env, keks } = await haus();
    await worker.fetch(ZPOST(keks), env);
    const a = await worker.fetch(anfrage("/api/mapping", { method: "POST", keks,
      body: { kassenname: "Raschhofer Pils 0,5l", artikel: "g042", gebinde_ml: 500 } }), env);
    assert.equal(a.status, 200, JSON.stringify(await a.json()));

    const [m] = env.DB.zeilen("mapping");
    assert.equal(m.fremd, "Raschhofer Pils 0,5l");
    assert.equal(m.status, "zugeordnet");
    assert.equal(m.gebinde_ml, 500);
    assert.equal(m.wer, "Asad");
    assert.equal(env.DB.zeilen("fassungszeile")
      .find(z => z.rohbez === "Raschhofer Pils 0,5l").artikel, "g042");

    const gelesen = await (await worker.fetch(anfrage("/api/mapping", { keks }), env)).json();
    /* `ausschank_ml` seit Runde 21 (Migration 002). Die Prüf-Datenbank
       wird aus `docs/live-schema.sql` gebaut, und dort steht die Spalte —
       also meldet der Schalter hier „kann". Dass er OHNE die Spalte das
       Gegenteil sagt, prüft `tests/migration-002.test.mjs`. */
    assert.equal(gelesen.kann.ausschank, true);
    assert.deepEqual(gelesen.mapping, [{ kassenname: "Raschhofer Pils 0,5l",
      artikel: "g042", ignoriert: 0, gebinde_ml: 500, ausschank_ml: null }]);
  });

  test("ignoriert wird zu status='ignoriert' und nicht zu einer 1", async () => {
    const { env, keks } = await haus();
    await worker.fetch(anfrage("/api/mapping",
      { method: "POST", keks, body: { kassenname: "Kaffee", ignoriert: true } }), env);
    assert.equal(env.DB.zeilen("mapping")[0].status, "ignoriert");
  });

  /* Solange es die Spalte nicht gibt, ist ein klarer 422 ehrlicher als
     ein stilles Wegwerfen. Siehe migrations/001_mapping_rezept.sql. */
  test("eine Rezeptur wird abgelehnt, nicht stillschweigend verschluckt", async () => {
    const { env, keks } = await haus();
    const a = await worker.fetch(anfrage("/api/mapping", { method: "POST", keks,
      body: { kassenname: "Hugo", rezept: [{ artikel: "w057", ml: 100 }] } }), env);
    assert.equal(a.status, 422);
    assert.match((await a.json()).fehler, /Migration/);
    assert.equal(env.DB.zeilen("mapping").length, 0);
  });

  test("/api/stamm liest die Spalte wert", async () => {
    const { env, keks } = await haus({ stamm: [
      { schluessel: "soll", wert: JSON.stringify({ w001: 3 }), geaendert: 1, wer: "Asad" }] });
    const j = await (await worker.fetch(anfrage("/api/stamm", { keks }), env)).json();
    assert.deepEqual(j, { soll: { w001: 3 } });
  });

  test("/api/personen liest und schreibt gegen die echte Tabelle", async () => {
    const { env, keks } = await haus();
    const a = await worker.fetch(anfrage("/api/personen", { method: "POST", keks,
      body: { name: "Lena", rolle: "service", code: "7702" } }), env);
    assert.equal(a.status, 200, JSON.stringify(await a.clone().json()));
    const j = await (await worker.fetch(anfrage("/api/personen", { keks }), env)).json();
    assert.deepEqual(j.personen.map(p => p.name), ["Asad", "Lena"]);
  });

  test("eine Rolle ausserhalb der drei nimmt die Datenbank nicht an", async () => {
    const { env, keks } = await haus();
    const a = await worker.fetch(anfrage("/api/personen",
      { method: "POST", keks, body: { name: "X", rolle: "chef", code: "1122" } }), env);
    assert.equal(a.status, 500, "CHECK (rolle IN …) schlägt zu");
    assert.equal(env.DB.zeilen("person").length, 1);
  });

  test("die Anmeldesperre zählt in der echten Tabelle mit", async () => {
    const { env } = await haus();
    for (let i = 0; i < 3; i++)
      await worker.fetch(anfrage("/api/anmelden", { method: "POST", body: { code: "0000" } }), env);
    assert.equal(env.DB.zeilen("anmeldeversuch").filter(v => !v.ok).length, 3);
  });
});
