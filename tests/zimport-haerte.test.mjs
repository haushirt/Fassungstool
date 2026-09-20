/* ═══════════════════════════════════════════════════════════════════════
   Runde 21 · Der Weg des Z-Berichts in die Datenbank, an vier Stellen
   nachgezogen. Alle vier standen offen im Backlog, drei davon seit
   Runde 3 bis 5.

     Z1  Der Import war NICHT ATOMAR. Kopf, `DELETE` und Zeilen waren
         drei Schreibvorgänge; scheiterte der dritte, stand der Kopf mit
         frischem `importiert` und null Positionen da — der alte Bericht
         gelöscht, der neue nie angekommen. Im Mailweg merkt das niemand,
         weil alles in `ctx.waitUntil` läuft.

     Z2  Ein TEILBERICHT ersetzte den vollen LAUTLOS, mit HTTP 200.
         Schliessen Bar und Restaurant getrennt ab, fehlt dem Abgleich
         danach eine ganze Kostenstelle, und es steht nirgends.

     Z3  `kostenstelle`, `von_ts`, `bis_ts` blieben leer, obwohl der
         Bericht sie im Kopf nennt und die Spalten live seit jeher da
         sind (review/OFFENE-ENTSCHEIDUNGEN.md Nr. 11).

     Z4  Das Backoffice holte 61 Anfragen nacheinander, um die Berichte
         zu laden — 4,1 s leerer Schirm bei jedem Öffnen.

   Gerechnet wird gegen echte SQLite aus `docs/live-schema.sql` und gegen
   den echten Bericht 37. Keine Attrappe, keine ausgedachten Zahlen.
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt, SCHEMA_DA } from "./hilfe/d1-echt.mjs";
import { pfad, lies } from "./hilfe/dateien.mjs";
import { parseZ } from "../src/gnparse.js";

const TEXT = readFileSync(join(pfad("tests", "fixtures"), "zbericht-37-extended.csv"), "utf8");
const TAG = "2026-09-16";
const VOLL = parseZ(TEXT).positionen.length;      /* 48 */

/* Ein Bericht desselben Tages mit weniger Positionen — die Form, die ein
   getrennter Abschluss der Bar erzeugt. Gebaut aus dem echten Bericht,
   damit Kopf und Trennlinien echt bleiben. */
function beschnitten(nr, behalten) {
  const zeilen = TEXT.split(/\r?\n/);
  const ab = zeilen.findIndex(z => /^"Positionen"\t"Anzahl"/.test(z));
  assert.ok(ab > 0, "Positionsblock im Bericht gefunden");
  let gesehen = 0;
  const raus = zeilen.filter((z, i) => {
    if (i <= ab + 1) return true;
    if (!/^"[^"]+"\t"[\d,.]+"/.test(z)) return true;
    return ++gesehen <= behalten;
  });
  return raus.join("\n").replace(/^"Z"\t"37"/m, `"Z"\t"${nr}"`);
}
/* Wie viele POSITIONEN daraus werden, sagt der Leser — nicht die Zahl der
   behaltenen Zeilen. Doppelte Namen (Bar und Restaurant) fasst er
   zusammen (Eigenheit 1 in `gnparse.js`). */
const zaehle = text => parseZ(text).positionen.length;

const wien = ms => new Intl.DateTimeFormat("de-AT", {
  timeZone: "Europe/Vienna", day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false
}).format(new Date(ms));

describe("Runde 21 · der Z-Import hält", { skip: SCHEMA_DA ? false :
  "docs/live-schema.sql fehlt" }, () => {
  const CODE = String(randomInt(1000, 10000));

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

  const senden = (worker, env, keks, text = TEXT) =>
    worker.fetch(anfrage("/api/fassungsliste",
      { method: "POST", keks, body: text, headers: { "content-type": "text/plain" } }), env);

  const journal = env => env.DB.zeilen("ereignis").filter(r => r.quelle === "zbericht");

  /* ── Z1 · entweder alles oder nichts ───────────────────────────────── */

  test("scheitert eine Zeile, bleibt der ALTE Bericht vollständig stehen", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    const vorher = env.DB.zeilen("fassungsliste")[0];
    assert.equal(env.DB.zeilen("fassungszeile").length, VOLL);

    /* Ein Fehler mitten im Schreiben, so wie ihn D1 wirft. Er trifft die
       dritte Zeile — Kopf und `DELETE` sind da schon durch. */
    const echt = env.DB.prepare;
    let n = 0;
    env.DB.prepare = sql => {
      const st = echt(sql);
      if (!/INSERT INTO fassungszeile/.test(sql)) return st;
      const bind = st.bind;
      return { ...st, bind: (...a) => {
        const g = bind(...a);
        return ++n === 3 ? { ...g, _lauf: () => { throw new Error("D1_ERROR: absichtlich"); } } : g;
      } };
    };
    const a = await senden(worker, env, keks, beschnitten("41", 10));
    env.DB.prepare = echt;

    assert.equal(a.status, 500, "der Fehler wird nicht verschluckt");
    const nachher = env.DB.zeilen("fassungsliste")[0];
    assert.equal(nachher.z, vorher.z, "die Z-Nummer des alten Berichts steht noch");
    assert.equal(nachher.importiert, vorher.importiert, "auch der Zeitpunkt ist unberührt");
    assert.equal(env.DB.zeilen("fassungszeile").length, VOLL,
      "die Zeilen des alten Berichts sind gelöscht worden — der Rückzug hat nicht gegriffen");
    assert.equal(journal(env).length, 0,
      "im Journal steht eine Ersetzung, die nie stattgefunden hat");
  });

  test("ein Bericht ohne eine einzige Position wird abgewiesen, nicht eingelesen", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    /* Betriebstag lesbar, Positionsblock leer — ein abgeschnittener
       Mailanhang. Die Uhrzeit steht hier bewusst NICHT hinter dem Datum:
       sonst hält `parseZ` die Kopfzeile „Bis | 16.09.2026 23:26" selbst
       für eine Position mit der Anzahl 16,09 (Eigenheit des Berichts,
       nicht dieser Runde). */
    const a = await senden(worker, env, keks, '"Bis"\t"Stand 16.09.2026"\n');
    assert.equal(a.status, 422);
    assert.match((await a.json()).fehler, /Position/);
    assert.equal(env.DB.zeilen("fassungszeile").length, VOLL,
      "die leere Datei hat den Tag leergeräumt");
  });

  /* ── Z2 · die Spur beim Ersetzen ───────────────────────────────────── */

  test("der erste Bericht eines Tages erzeugt keine Notiz", async () => {
    const { worker, env, keks } = await haus();
    const j = await (await senden(worker, env, keks)).json();
    assert.equal(j.ersetzt, null);
    assert.equal(journal(env).length, 0);
  });

  test("derselbe Bericht zweimal: keine Notiz, aber die Antwort sagt es", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    const j = await (await senden(worker, env, keks)).json();
    assert.equal(j.ersetzt.unveraendert, true);
    assert.equal(j.ersetzt.teilbericht, false);
    assert.equal(journal(env).length, 0,
      "der Mailweg kann denselben Bericht täglich bringen — das Journal darf nicht zumüllen");
  });

  test("48 Positionen durch 10 ersetzt: eine Notiz mit beiden Nummern und beiden Zahlen", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    const kurz = beschnitten("41", 10), wenige = zaehle(kurz);
    const j = await (await senden(worker, env, keks, kurz)).json();

    assert.equal(j.ersetzt.z, "Z 37");
    assert.equal(j.ersetzt.vorher, VOLL);
    assert.equal(j.ersetzt.nachher, wenige);
    assert.equal(j.ersetzt.teilbericht, true,
      "ein Sechstel der Positionen fällt nicht auf");

    const zeilen = journal(env);
    assert.equal(zeilen.length, 1);
    const t = zeilen[0].notiz;
    assert.match(t, /Z 37/);   assert.match(t, /Z 41/);
    assert.match(t, /48 Positionen/); assert.match(t, new RegExp(wenige + " Positionen"));
    assert.match(t, /Teilbericht/);
    /* Die Notiz ist eine Notiz, keine Buchung (Regel 6). */
    assert.equal(zeilen[0].art, "korrektur");
    assert.equal(zeilen[0].artikel, "");
    assert.equal(zeilen[0].menge, 0);
  });

  test("ein zweiter voller Bericht desselben Tages gilt nicht als Teilbericht", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    /* Nachbuchung oder Storno: derselbe Tag, fast dieselben Positionen. */
    const j = await (await senden(worker, env, keks, beschnitten("42", VOLL - 2))).json();
    assert.equal(j.ersetzt.teilbericht, false);
    assert.equal(journal(env).length, 1, "gemeldet wird trotzdem, nur ohne Verdacht");
    assert.doesNotMatch(journal(env)[0].notiz, /Teilbericht/);
  });

  test("der neue Bericht steht danach wirklich da", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    const kurz = beschnitten("41", 10);
    await senden(worker, env, keks, kurz);
    assert.equal(env.DB.zeilen("fassungszeile").length, zaehle(kurz),
      "Reste des alten Berichts");
    assert.equal(env.DB.zeilen("fassungsliste").length, 1, "ein Eintrag je Betriebstag");
    assert.equal(env.DB.zeilen("fassungsliste")[0].z, "Z 41");
  });

  test("der gespaltene Bericht wird benannt — und nur er", async () => {
    const { worker, env, keks } = await haus();
    /* Der echte Bericht hat EINEN Positionsblock, daneben Warengruppen,
       Kostenstellen und Bezahlarten. Die sind Zusammenfassungen, kein
       zweiter Ausschank — sie dürfen die Meldung nicht auslösen. */
    assert.equal(parseZ(TEXT).gespalten, false);
    await senden(worker, env, keks);
    const j = await (await senden(worker, env, keks, beschnitten("41", 10))).json();
    assert.equal(j.ersetzt.gespalten, false,
      "die Warengruppen-Tabelle gilt als zweiter Positionsblock");
    assert.doesNotMatch(journal(env)[0].notiz, /zweiten Block/);

    /* So sieht ein wirklich gespaltener Bericht aus: zweimal „Positionen". */
    const zwei = TEXT.replace(/^"Warengruppen"\t/m, '"Positionen"\t');
    assert.equal(parseZ(zwei).gespalten, true);
  });

  /* ── Z3 · Zeitraum und Kostenstelle ────────────────────────────────── */

  test("Kostenstelle und Zeitraum kommen in der Datenbank an", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    const [l] = env.DB.zeilen("fassungsliste");
    assert.equal(l.kostenstelle, "Haus Hirt");
    assert.equal(wien(l.von_ts), "15.09.2026, 23:11");
    assert.equal(wien(l.bis_ts), "16.09.2026, 23:26");
    /* 24 Stunden und 15 Minuten Betrieb. */
    assert.equal(l.bis_ts - l.von_ts, ((24 * 60) + 15) * 60 * 1000);
  });

  test("der Zeitraum kommt auch wieder heraus", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    const j = await (await worker.fetch(
      anfrage("/api/fassungsliste?tag=" + TAG, { keks }), env)).json();
    assert.equal(j.kostenstelle, "Haus Hirt");
    assert.equal(wien(j.von_ts), "15.09.2026, 23:11");
    assert.equal(wien(j.bis_ts), "16.09.2026, 23:26");
  });

  test("Sommer- und Winterzeit: die Uhrzeit des Berichts steht, nicht die von UTC", () => {
    /* Der Fehler, den diese Prüfung fängt: den Zeitstempel blind als UTC
       ablegen. Er sieht das ganze Jahr plausibel aus und liegt im Sommer
       zwei, im Winter eine Stunde daneben. */
    const bau = (d, m) => `"Kostenstelle"\t"Haus Hirt"\n"Von"\t"${d}.${m}.2026 23:11"\n`
      + `"Bis"\t"${d + 1}.${m}.2026 23:26"\n---------\n"Positionen"\t"Anzahl"\t"Betrag"\n`
      + `---------\n"Cola"\t"3"\t"9,00"\n`;
    const sommer = parseZ(bau(15, "07")), winter = parseZ(bau(15, "01"));
    assert.equal(wien(sommer.von), "15.07.2026, 23:11");
    assert.equal(wien(winter.von), "15.01.2026, 23:11");
    /* Und der Beweis, dass wirklich umgerechnet wurde: im Sommer liegt
       Wien zwei Stunden vor UTC, im Winter eine. */
    assert.equal(new Date(sommer.von).getUTCHours(), 21);
    assert.equal(new Date(winter.von).getUTCHours(), 22);
  });

  test("ein Bericht ohne Uhrzeit lässt die Spalten leer, statt Mitternacht zu erfinden", async () => {
    const { worker, env, keks } = await haus();
    const ohne = TEXT.replace(/"Von"\t"[^"]*"/, '"Von"\t""')
                     .replace(/"Bis"\t"16\.09\.2026 23:26"/, '"Bis"\t"16.09.2026"');
    const a = await senden(worker, env, keks, ohne);
    assert.equal(a.status, 200, JSON.stringify(await a.clone().json()));
    const [l] = env.DB.zeilen("fassungsliste");
    assert.equal(l.von_ts, null);
    assert.equal(l.bis_ts, null);
    assert.equal(l.tag, TAG, "der Betriebstag kommt weiter aus „Bis“, auch ohne Uhrzeit");
  });

  /* ── Z4 · ein Abruf statt einundsechzig ────────────────────────────── */

  test("`?zeilen=1` liefert dasselbe wie der Weg über `?tag=`", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    const einzeln = await (await worker.fetch(
      anfrage("/api/fassungsliste?tag=" + TAG, { keks }), env)).json();
    const sammel = await (await worker.fetch(
      anfrage("/api/fassungsliste?zeilen=1", { keks }), env)).json();
    assert.equal(sammel.berichte.length, 1);
    assert.deepEqual(sammel.berichte[0], einzeln);
  });

  test("die schlichte Übersicht bleibt, wie sie war — `positionen` ist dort eine Zahl", async () => {
    const { worker, env, keks } = await haus();
    await senden(worker, env, keks);
    const j = await (await worker.fetch(anfrage("/api/fassungsliste", { keks }), env)).json();
    assert.deepEqual(Object.keys(j.berichte[0]).sort(),
      ["importiert", "positionen", "tag", "z"]);
    assert.equal(j.berichte[0].positionen, VOLL);
  });

  test("die Zahl der Abfragen hängt nicht an der Zahl der Berichte", async () => {
    const { worker, env, keks } = await haus();

    /* Gezählt wird bei EINEM Bericht und bei DREI. Gleich viele Abfragen
       heisst: der Weg ist flach. Das ist die eigentliche Behauptung —
       die absolute Zahl enthält auch das Nachschlagen der Sitzung und
       änderte sich, sobald jemand daran etwas dreht. */
    const zaehlend = async () => {
      const echt = env.DB.prepare;
      let n = 0;
      env.DB.prepare = sql => { n++; return echt(sql); };
      const a = await worker.fetch(anfrage("/api/fassungsliste?zeilen=1", { keks }), env);
      env.DB.prepare = echt;
      return { n, j: await a.json() };
    };

    await senden(worker, env, keks);
    const eins = await zaehlend();
    for (const d of ["14", "15"]) {
      await senden(worker, env, keks,
        TEXT.replace(/"Bis"\t"16\.09\.2026/, `"Bis"\t"${d}.09.2026`));
    }
    assert.equal(env.DB.zeilen("fassungsliste").length, 3);
    const drei = await zaehlend();

    assert.equal(drei.n, eins.n,
      "drei Berichte kosten " + drei.n + " Abfragen, einer " + eins.n
      + " — es sind wieder so viele wie Tage");
    const j = drei.j;
    assert.equal(j.berichte.length, 3);
    assert.ok(j.berichte.every(b => b.positionen.length === VOLL));
    assert.deepEqual(j.berichte.map(b => b.tag),
      ["2026-09-16", "2026-09-15", "2026-09-14"], "der jüngste Tag zuerst");
  });

  test("die Obergrenze greift, auch wenn jemand eine grosse Zahl schickt", async () => {
    const { worker, env, keks } = await haus();
    /* Der Endpunkt steht jedem Angemeldeten offen, nicht nur der Leitung;
       60 Berichte sind schon gut 340 kB. */
    for (let t = 1; t <= 4; t++) {
      await senden(worker, env, keks,
        TEXT.replace(/"Bis"\t"16\.09\.2026/, `"Bis"\t"0${t}.09.2026`));
    }
    const j = await (await worker.fetch(
      anfrage("/api/fassungsliste?zeilen=1&limit=2", { keks }), env)).json();
    assert.equal(j.berichte.length, 2);
    const viel = await (await worker.fetch(
      anfrage("/api/fassungsliste?zeilen=1&limit=9000", { keks }), env)).json();
    assert.equal(viel.berichte.length, 4, "vier sind da, mehr als 90 dürften es nie werden");
  });
});

/* ── Und was die Seiten daraus machen ───────────────────────────────────
   Quelltextprüfungen im Stil von `tests/runde16.test.mjs`. Sie ersetzen
   keinen Browserlauf, aber sie halten die drei Zeilen fest, an denen der
   neue Weg hängt — und die eine, die NICHT angefasst werden darf.      */
describe("Runde 21 · was Backoffice und App tun", () => {
  const LEIT = lies("public", "leitung.html");
  const APP = lies("public", "index.html");

  test("das Backoffice holt die Berichte in EINEM Abruf", () => {
    assert.match(LEIT, /fassungsliste\?zeilen=1&limit=60/);
  });

  test("und fällt auf den alten Weg zurück, wenn der Server ihn nicht kennt", () => {
    /* Der alte Worker antwortet 200 mit der schlichten Übersicht, nicht
       mit einem Fehler — der Rückfall muss deshalb an der FORM hängen. */
    assert.match(LEIT, /every\(b=>Array\.isArray\(b\.positionen\)\)/);
    assert.match(LEIT, /fassungsliste\?tag="\+encodeURIComponent\(b\.tag\)/);
  });

  test("die App im Keller bleibt beim einzelnen Tag", () => {
    /* `holeZBericht()` braucht genau einen Tag und hat im Keller kein
       Netz zu verschenken. */
    assert.match(APP, /API\+"\/fassungsliste\?tag="/);
    assert.doesNotMatch(APP, /zeilen=1/);
  });

  test("ein ersetzter Teilbericht bekommt einen stehenden Hinweis, keinen Toast", () => {
    assert.match(LEIT, /vImport\.warnung/);
    assert.match(LEIT, /hinweis bad/);
    assert.match(LEIT, /Teilbericht/);
    /* Und die Seite läuft dann nicht weiter. */
    assert.match(LEIT, /if\(!faul\) SEITE=/);
  });

  test("der Zeitraum wird in Wiener Zeit gezeigt, nicht in UTC", () => {
    assert.match(LEIT, /function zeitraum\(z\)/);
    assert.match(LEIT, /timeZone:"Europe\/Vienna"/);
  });

  test("der Speicherstand ist erhöht", () => {
    /* Regel aus CLAUDE.md: nach jeder Änderung in `public/`. */
    const v = /const VERSION = "v(\d+)"/.exec(lies("public", "sw.js"));
    assert.ok(v && +v[1] >= 67, "sw.js steht noch auf v" + (v && v[1]));
  });
});
