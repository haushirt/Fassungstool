/* Zwei Vorgänge desselben Modus am selben Tag.

   Der Schlüssel eines Vorgangs ist `<modus>_<tag>` (CLAUDE.md), und ein
   Vorgang ist ein VOLLSTÄNDIGER Zustand. Beides zusammen heisst: die
   zweite Lieferung eines Tages ist kein zweiter Vorgang, sondern ein
   erweiterter erster. Die App hat bis v25 etwas anderes getan — nach dem
   Abschluss legte `start()` ein leeres Formular mit demselben Tag und
   damit demselben Schlüssel an; `ereignisseAbleiten` sah einen Zustand
   ohne die erste Lieferung und nahm sie per Gegenbuchung zurück.

   Zwei Lieferungen oder zwei Sonderentnahmen an einem Tag sind im Haus
   normal. Diese Prüfung stellt beide Wege nach — den Schaden und die
   Antwort darauf — und hält fest, was das Journal danach sagt.         */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";
import { lies } from "./hilfe/dateien.mjs";

const TAG = "2026-09-16";
const SCHLUESSEL = "ware_" + TAG;
const CODE = "8820";                 /* nur in dieser Prüfung */
let worker;
before(async () => { worker = await ladeWorker(); });

async function haus() {
  const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Asad", rolle: "wirtschaft", code: CODE } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env);
  return { env, keks: keksAus(a) };
}

const lieferung = (pos, zaehlnr) => ({
  mode: "ware", tag: TAG, name: "Asad", geraet: "ipad-1", zaehlnr,
  zeit: TAG + "T09:00:00.000Z", finished: true,
  pos, jok: {}, jneu: {}, ein: {}, gent: {}
});

const senden = (env, keks, daten) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(SCHLUESSEL),
    { method: "PUT", keks, body: daten }), env);

/* Genau die Abfrage aus der Aufgabe:
   SELECT art, artikel, menge FROM ereignis WHERE vorgang = 'ware_<tag>' */
const journal = env => env.DB.tabellen.ereignis
  .filter(r => r.vorgang === SCHLUESSEL && r.artikel !== "")
  .map(r => ({ art: r.art, artikel: r.artikel, menge: +r.menge }));
const bestandAus = env => journal(env).reduce((t, r) => {
  t[r.artikel] = (t[r.artikel] || 0) + (r.art === "eingang" ? r.menge : -r.menge);
  return t; }, {});

const ERSTE  = [{ id: "w003", kisten: 2, kistengr: 20 }];               /* 40 Flaschen */
const ZWEITE = [{ id: "w001", kisten: 2, kistengr: 12 }];               /* 24 Flaschen */

describe("Zweite Lieferung am selben Tag", () => {
  test("so war es: ein leerer zweiter Vorgang nimmt die erste Lieferung zurück", async () => {
    /* Der Schaden, nachgestellt. Nicht als Wunsch, sondern als Beleg:
       solange die App beim zweiten Start ein leeres Formular unter
       demselben Schlüssel anlegt, buchen 24 gelieferte Flaschen 40
       geliefertes wieder aus. */
    const { env, keks } = await haus();
    await senden(env, keks, lieferung(ERSTE, 1));
    assert.deepEqual(bestandAus(env), { w003: 40 });

    await senden(env, keks, lieferung(ZWEITE, 2));      /* nur die zweite Position */
    const nachher = bestandAus(env);
    assert.equal(nachher.w003, 0, "die erste Lieferung ist gegengebucht");
    assert.equal(nachher.w001, 24);
    assert.ok(journal(env).some(r => r.menge === -40),
      "die Gegenbuchung steht als eigene Zeile im Journal (append-only)");
  });

  test("so ist es richtig: der ergänzte Zustand bucht nur den Zuwachs", async () => {
    /* Das, was „Ergänzen" in der App erzeugt: derselbe Vorgang, jetzt mit
       beiden Lieferungen. Der Worker leitet die Differenz ab — die erste
       Position bleibt unangetastet, die zweite kommt dazu. */
    const { env, keks } = await haus();
    await senden(env, keks, lieferung(ERSTE, 1));
    await senden(env, keks, lieferung([...ERSTE, ...ZWEITE], 2));

    assert.deepEqual(bestandAus(env), { w003: 40, w001: 24 });
    assert.equal(journal(env).length, 2, "zwei Zeilen, keine Gegenbuchung");
    assert.ok(!journal(env).some(r => r.menge < 0));
  });

  test("dreimal dasselbe ergänzte Paket bleibt bei 64 Flaschen", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, lieferung(ERSTE, 1));
    const beide = lieferung([...ERSTE, ...ZWEITE], 2);
    await senden(env, keks, beide);
    await senden(env, keks, beide);
    await senden(env, keks, beide);
    assert.deepEqual(bestandAus(env), { w003: 40, w001: 24 });
    assert.equal(journal(env).length, 2, "die Offline-Reihe darf nichts verdoppeln");
  });

  test("dasselbe gilt für die zweite Sonderentnahme eines Tages", async () => {
    const { env, keks } = await haus();
    const ent = (t, zaehlnr) => ({ mode: "nach", tag: TAG, name: "Asad",
      geraet: "iphone-1", zaehlnr, zeit: TAG + "T18:00:00.000Z", finished: true,
      ent: t, gent: {}, gzusatz: {} });
    const put = d => worker.fetch(anfrage("/api/vorgang/nach_" + TAG,
      { method: "PUT", keks, body: d }), env);
    await put(ent({ w005: 2 }, 1));
    await put(ent({ w005: 2, w006: 1 }, 2));            /* ergänzt, nicht ersetzt */
    const zeilen = env.DB.tabellen.ereignis
      .filter(r => r.vorgang === "nach_" + TAG).map(r => [r.artikel, +r.menge]);
    assert.deepEqual(zeilen.sort(), [["w005", 2], ["w006", 1]]);
  });
});

describe("Die App fragt, statt still zu ersetzen", () => {
  /* Die Frage selbst wird in `public/index.html` gestellt (`start()`), das
     Verhalten am Schirm prüft `tests/ui-zweiter-vorgang.cjs` im Browser.
     Hier steht nur, was sich nicht wieder wegrefactoren darf: dass es die
     Frage überhaupt gibt und dass „Ergänzen" den bestehenden Zustand
     WEITERFÜHRT, statt ihn durch `blank()` zu ersetzen. */
  const APP = lies("public", "index.html");

  test("der Fall wird abgefangen, bevor `blank()` greift", () => {
    assert.match(APP, /cur\.finished&&cur\.tag===ziel&&hasData\(m,cur\)/,
      "die Bedingung „abgeschlossen, selber Tag, mit Inhalt“ fehlt");
    const frage = APP.indexOf("start._zweiter");
    const ersetzen = APP.indexOf("if(cur&&(cur.finished||cur.tag!==ziel)){archive(cur)");
    assert.ok(frage > 0 && ersetzen > frage,
      "gefragt wird vor dem Ersetzen, nicht danach");
  });

  test("„Ergänzen“ führt fort, „Neu beginnen“ sagt vorher, was es kostet", () => {
    assert.match(APP, /\$\("#ovOk"\)\.textContent="Ergänzen"/);
    assert.match(APP, /cur\.finished=false; save\(\); weiter\(\)/,
      "Ergänzen darf den bisherigen Zustand nicht wegwerfen");
    assert.match(APP, /Trotzdem neu beginnen/);
    assert.match(APP, /aus dem Bestand zurückgenommen/,
      "die Folge des Neubeginns muss dastehen");
  });
});
