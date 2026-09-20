/* Getränke: geholt heisst EINMAL geholt — Worker UND Backoffice.
   Dazu: was noch läuft, ist noch nicht gebucht.

   Der Anlass (Analyse Runde 19, Funde A1 und A2). Zwei Fehler mit
   derselben Wurzel: Das Backoffice hat nachgerechnet, was der Worker
   längst gerechnet hatte.

   A1 — `normVorgang` in `public/leitung.html` leitete die geholte
   Getränkemenge aus der Ladengeometrie ab (`GSOLL − ist`, wahlweise
   `gholtN`) UND addierte danach `gent`. Die App baut ihr `gent` aber aus
   genau dieser Rechnung (`geholteGetraenke`, `public/index.html`). Jede
   geholte Flasche zählte damit doppelt: 4 geholt, 8 auf dem Schirm, eine
   erfundene Abweichung von +4 mit der Deutung „prüfen" — an jedem Tag,
   bei jedem Getränk, bis hinaus auf das gedruckte Blatt.

   A2 — `bestand()`, `verbrauch()` und `abgleich()` prüften `fertig` an
   keiner Stelle, der Worker schreibt seine Journalzeilen aber erst beim
   Abschluss. Ein Zwischenstand geht alle 45 Sekunden hinaus; stundenlang
   zeigte die Leitung damit eine Entnahme, die noch gar nicht gebucht war.

   Warum 445 grüne Prüfungen A1 nicht gefunden haben: JEDE Prüfdatei
   setzte `gent` OHNE `getr`. Ohne `getr` ist Ist = Soll, die Fehlmenge 0
   — der Fehler war in den Prüfdaten wegdefiniert. Diese Datei bestückt
   deshalb beide Felder gemeinsam.

   Geprüft wird DERSELBE Vorgang auf beiden Wegen: einmal echt durch den
   Worker (SQLite aus `docs/live-schema.sql`, Journal und `/api/bestand`
   gelesen), einmal durch das ausgelieferte `leitung.html`.            */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";
import { ausschnitt } from "./hilfe/dateien.mjs";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");
function backoffice() {
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout, Intl,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.__b = {
      normVorgang, bestand, verbrauch, gebucht, GSOLL,
      stelle(liste){ VORGAENGE = liste.map(normVorgang).filter(Boolean); },
      vorgaenge(){ return VORGAENGE; }
    };`, s, { filename: "leitung.html#getraenke-doppelt" });
  return s.__b;
}

const TAG = "2026-09-16";
const CODE = "7341";                 /* nur in dieser Prüfung */
let worker, B;
before(async () => { worker = await ladeWorker(); B = backoffice(); });

async function haus() {
  const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Lena", rolle: "leitung", code: CODE } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env);
  return { env, keks: keksAus(a) };
}
const senden = (env, keks, daten, sch) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(sch),
    { method: "PUT", keks, body: daten }), env);

const journal = env => {
  const t = { eingang: {}, entnahme: {}, zaehlung: {} };
  env.DB.tabellen.ereignis.forEach(r => {
    if (!t[r.art] || !r.artikel) return;
    t[r.art][r.artikel] = (t[r.art][r.artikel] || 0) + (+r.menge || 0);
  });
  return t;
};
const serverBestand = async (env, keks) =>
  (await (await worker.fetch(anfrage("/api/bestand", { keks }), env)).json());

/* Eine Tagesfassung, wie die App sie wirklich schickt: `getr` ist der
   GEZÄHLTE Ist-Stand der Lade, `gent` das, was daraufhin geholt und
   abgehakt wurde. Cola Zero steht mit Soll 7 in Lade 5. */
const fassung = (zusatz = {}) => Object.assign({
  mode: "tag", tag: TAG, name: "Lena", geraet: "ipad-1", zaehlnr: 1,
  zeit: TAG + "T11:00:00.000Z", archiviert: TAG + "T11:00:00.000Z", finished: true,
  bar: {}, barrot: {}, backup: {}, rest: {}, zusatz: {},
  getr: { colaz: 3 }, gholt: { colaz: 1 }, gent: { colaz: 4 }
}, zusatz);

describe("A1 · Geholte Getränke zählen genau einmal", () => {
  test("die Lade steht auf 7, drei sind da, vier geholt — dann sind es vier", async () => {
    const { env, keks } = await haus();
    const d = fassung();
    assert.equal(B.GSOLL.colaz, 7, "die Ladengeometrie hat sich geändert — Prüfung anpassen");

    const r = await senden(env, keks, d, "tag_" + TAG);
    assert.equal(r.status, 200);

    const j = journal(env), o = B.normVorgang(d);
    assert.equal(j.entnahme.colaz, 4, "Worker: vier Flaschen aus dem Lager");
    assert.equal(o.getr.colaz, 4, "Backoffice: dieselben vier, nicht acht");
    assert.equal(o.flGetr, 4, "die Spalte „Getränke Fl.“ zählt vier");
  });

  test("der gezählte Ist-Stand bleibt eine Angabe, keine Bewegung", () => {
    const o = B.normVorgang(fassung());
    assert.equal(o.gzaehlung.colaz, 3, "drei standen noch in der Lade");
    assert.equal(Object.keys(o.getr).length, 1, "nur die geholte Menge bewegt etwas");
  });

  test("ohne Haken „geholt“ bewegt sich nichts — auf beiden Wegen", async () => {
    /* Die Gegenrichtung desselben Fehlers: `gent` bleibt leer, weil
       niemand abgehakt hat. Der Worker buchte dann nichts, das
       Backoffice trotzdem die volle Fehlmenge. */
    const { env, keks } = await haus();
    const d = fassung({ gholt: {}, gent: {} });
    await senden(env, keks, d, "tag_" + TAG);
    const j = journal(env), o = B.normVorgang(d);
    assert.equal(j.entnahme.colaz, undefined, "Worker bucht nichts");
    assert.equal(o.getr.colaz, undefined, "Backoffice bucht auch nichts");
    assert.equal(o.gzaehlung.colaz, 3, "gezählt wurde trotzdem");
  });

  test("eine abweichende Holmenge kommt aus `gent`, nicht aus der Geometrie", async () => {
    /* Im Lager lagen nur zwei, obwohl vier gefehlt haben: `gholtN`
       steckt schon in `gent` (`geholteGetraenke`). Wer daneben noch
       einmal rechnet, bekommt sechs. */
    const { env, keks } = await haus();
    const d = fassung({ gholtN: { colaz: 2 }, gent: { colaz: 2 } });
    await senden(env, keks, d, "tag_" + TAG);
    const j = journal(env), o = B.normVorgang(d);
    assert.equal(j.entnahme.colaz, 2, "Worker");
    assert.equal(o.getr.colaz, 2, "Backoffice — nicht 2 + 4");
  });

  test("`gzusatz` kommt obendrauf, in beiden Fassungen gleich", async () => {
    const { env, keks } = await haus();
    const d = fassung({ gzusatz: { colaz: 1 } });
    await senden(env, keks, d, "tag_" + TAG);
    const j = journal(env), o = B.normVorgang(d);
    assert.equal(j.entnahme.colaz, 5, "Worker: vier geholt, eine zusätzlich");
    assert.equal(o.getr.colaz, 5, "Backoffice");
  });

  test("Nachfüllen rechnet genauso", async () => {
    const { env, keks } = await haus();
    const d = fassung({ mode: "fuellen", getr: { cola: 2 }, gholt: { cola: 1 },
                        gent: { cola: 5 } });
    await senden(env, keks, d, "fuellen_" + TAG);
    const j = journal(env), o = B.normVorgang(d);
    assert.equal(j.entnahme.cola, 5, "Worker");
    assert.equal(o.getr.cola, 5, "Backoffice");
  });
});

describe("A2 · Was noch läuft, zählt noch nicht", () => {
  const zaehlung = {
    mode: "keller", tag: "2026-09-15", name: "Lena", geraet: "ipad-1", zaehlnr: 1,
    zeit: "2026-09-15T09:00:00.000Z", archiviert: "2026-09-15T09:00:00.000Z",
    finished: true, zdone: { w003: 1 }, reihen: { w003: 2 }, einzel: { w003: 0 }
  };
  const laufend = {
    mode: "tag", tag: TAG, name: "Tobias", geraet: "ipad-2", zaehlnr: 1,
    zeit: TAG + "T11:00:00.000Z", archiviert: TAG + "T11:00:00.000Z",
    finished: false,                                   /* läuft noch */
    bar: {}, barrot: {}, backup: {}, rest: { w003: 5 }, zusatz: {}, getr: {}
  };

  test("der Worker bucht einen laufenden Vorgang nicht", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, zaehlung, "keller_2026-09-15");
    await senden(env, keks, laufend, "tag_" + TAG);
    const j = journal(env);
    assert.equal(j.zaehlung.w003, 12, "die abgeschlossene Zählung steht");
    assert.equal(j.entnahme.w003, undefined, "die laufende Fassung nicht");
    const sb = await serverBestand(env, keks);
    const b = sb.bestand || sb.b || sb;
    assert.equal(+((b.w003 && b.w003.bestand !== undefined) ? b.w003.bestand : b.w003), 12,
      "/api/bestand sagt zwölf");
  });

  test("das Backoffice sagt jetzt dieselben zwölf", () => {
    B.stelle([zaehlung, laufend]);
    assert.equal(B.bestand().b.w003, 12, "nicht sieben");
  });

  test("abgeschlossen wird derselbe Vorgang sofort mitgerechnet", () => {
    B.stelle([zaehlung, Object.assign({}, laufend, { finished: true })]);
    assert.equal(B.bestand().b.w003, 7, "zwölf minus fünf");
  });

  test("`verbrauch()` lässt laufende Vorgänge ebenfalls aussen vor", () => {
    B.stelle([zaehlung, laufend]);
    assert.equal(B.verbrauch().wein.w003, undefined, "läuft noch");
    B.stelle([zaehlung, Object.assign({}, laufend, { finished: true })]);
    assert.equal(B.verbrauch().wein.w003, 5, "abgeschlossen");
  });

  test("`gebucht()` ist der einzige Filter — die Liste selbst bleibt vollständig", () => {
    B.stelle([zaehlung, laufend]);
    assert.equal(B.vorgaenge().length, 2, "„Eingänge“ zeigt weiter beide");
    assert.equal(B.gebucht().length, 1, "gerechnet wird mit einem");
  });
});

/* ── Die Deutung behauptet nichts, was die Rechnung nicht weiss ──────
   Analyse Runde 19 · A. Entscheidung Nr. 9 bleibt gültig: Eine nicht
   zugeordnete Kassenposition nimmt keinem Artikel den BEFUND. Was
   Runde 19 ändert, ist allein der SATZ daneben: „mehr geholt als
   verkauft — Vorrat aufgebaut oder im Keller nachsehen" ist bei Verkauf
   genau null und offenen Kassennamen keine Auskunft, sondern eine
   Behauptung. In der Live-Lage (44 von 48 Namen offen) stand er zehnmal
   untereinander.                                                      */
describe("Die Deutung bei Verkauf null und offenen Kassennamen", () => {
  const D = (() => {
    const s = { console, setTimeout, clearTimeout, Intl,
      localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
      document: { querySelector: () => ({ classList: { add(){}, remove(){} } }) },
      fetch: async () => new Response("{}", { status: 200 }) };
    vm.createContext(s);
    vm.runInContext(QUELLE + "\nglobalThis.__d = DEUTUNG;", s,
                    { filename: "leitung.html#deutung" });
    return s.__d;
  })();

  test("offene Namen und Verkauf null → kein Urteil, sondern der Grund", () => {
    const satz = D({ diff: 6, verkauf: 0, entnahme: 6 }, 44);
    assert.match(satz, /0 verkauft laut Kasse/);
    assert.match(satz, /44 Kassennamen/);
    assert.doesNotMatch(satz, /Vorrat aufgebaut/,
      "kein Satz über den Keller, solange der Verkauf fehlen kann");
  });

  test("alles zugeordnet → die Null ist eine Messung, der alte Satz steht wieder", () => {
    assert.match(D({ diff: 6, verkauf: 0, entnahme: 6 }, 0),
      /mehr geholt als verkauft/);
  });

  test("ein gerechneter Verkauf behält seinen Satz, auch bei offenen Namen", () => {
    /* Entscheidung Nr. 9: eine offene Speise darf einem Wein mit
       gerechnetem Verkauf nichts nehmen. */
    assert.match(D({ diff: 3, verkauf: 2, entnahme: 5 }, 44),
      /mehr geholt als verkauft/);
  });

  test("die andere Richtung bleibt unberührt", () => {
    assert.match(D({ diff: -2, verkauf: 8, entnahme: 6 }, 44),
      /mehr verkauft als geholt/);
    assert.match(D({ diff: -2, verkauf: 0, entnahme: 0 }, 44),
      /mehr verkauft als geholt/, "nur das Plus kann aus fehlendem Verkauf kommen");
  });

  test("die Zahl selbst bleibt stehen — Nr. 9 ist nicht zurückgenommen", () => {
    const f = backoffice();
    /* Ein Wein mit Entnahme und ohne gerechneten Verkauf, daneben ein
       offener Kassenname: die Zeile bleibt eine Abweichung. */
    f.stelle([{ mode: "tag", tag: TAG, name: "Lena", geraet: "x", zaehlnr: 1,
      finished: true, bar: {}, barrot: {}, backup: {}, rest: { w001: 2 },
      zusatz: {}, getr: {} }]);
    assert.equal(f.gebucht().length, 1, "der Vorgang ist gebucht");
  });
});
