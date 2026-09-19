/* ═══════════════════════════════════════════════════════════════════════
   Runde 16 · die Funde der fünften Jagd und die vier Punkte der Runde

   Jede Prüfung hier stellt genau eine Lage nach, die vor dieser Runde
   falsch war, und fällt, wenn sie wiederkommt. Gegen den Stand von
   Runde 15 (`ac8d93a`) ist jede einzelne rot — nachgewiesen in
   review/LOG.md, Runde 16.

   Was der Browser braucht, steht nicht hier, sondern in
   `tests/ui-runde16.cjs` (Playwright, Regel 8: nicht Teil von `npm test`).
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";
import { lies } from "./hilfe/dateien.mjs";
import { randomInt } from "node:crypto";

const APP = lies("public", "index.html");
const BO = lies("public", "leitung.html");
const WORKER = lies("src", "index.js");

/* Bei jedem Lauf gewürfelt statt im Quelltext festgeschrieben: So kann
   keine erfundene Ziffernfolge je zufällig mit einem Code aus dem Haus
   zusammenfallen und für immer in der Geschichte stehen (Regel 9). */
const wuerfel = (n = 4) => String(randomInt(10 ** (n - 1), 10 ** n));

let worker;
before(async () => { worker = await ladeWorker(); });

async function haus(codeLeitung, codeService) {
  const DB = d1Echt();
  const env = { DB, TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  for (const [name, rolle, code] of [["Casimir", "leitung", codeLeitung],
                                     ["Asad", "service", codeService]]) {
    const a = await worker.fetch(
      anfrage("/api/anlage", { method: "POST", body: { name, rolle, code } }), env);
    assert.equal(a.status, 200, "Person anlegen: " + name);
  }
  return env;
}
const anmelden = (env, code, ip = "10.0.0.1") =>
  worker.fetch(anfrage("/api/anmelden", { method: "POST", body: { code }, ip }), env);

/* ═════ A1 · „abmelden" meldet wirklich ab ═════════════════════════════
   Bis Runde 15 leerte der Knopf nur den sessionStorage. Der Sitzungskeks
   blieb zwölf Stunden gültig — am geteilten iPad war die nächste Person
   über /leitung.html weiter volle Leitung, samt „PIN zurücksetzen". */
describe("A1 · Abmelden nimmt die Sitzung, nicht nur den Namen", () => {
  test("der Endpunkt nimmt den Keks, /api/ich antwortet danach 401", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const an = await anmelden(env, CL);
    assert.equal(an.status, 200);
    const keks = keksAus(an);

    const vorher = await worker.fetch(anfrage("/api/ich", { keks }), env);
    assert.equal(vorher.status, 200, "vor dem Abmelden ist die Sitzung gültig");

    const ab = await worker.fetch(anfrage("/api/abmelden", { method: "POST", keks }), env);
    assert.equal(ab.status, 200);
    /* Max-Age=0 ist das, was den Keks im Browser wirklich wegnimmt. */
    assert.match(ab.headers.get("set-cookie") || "", /hh_sitz=;/);
    assert.match(ab.headers.get("set-cookie") || "", /Max-Age=0/);

    /* Der Browser schickt den gelöschten Keks nicht mehr — genau das
       bildet der leere Keks hier nach. */
    const nachher = await worker.fetch(anfrage("/api/ich", { keks: "hh_sitz=" }), env);
    assert.equal(nachher.status, 401, "nach dem Abmelden gilt die Sitzung nicht mehr");
  });

  test("die App ruft den Endpunkt und wartet auf die Antwort", () => {
    assert.match(APP, /\$\("#bWechseln"\)\.onclick=\(\)=>abmelden\(\);/,
      "der Knopf leert wieder nur den Speicher");
    assert.match(APP, /async function abmelden\(\)/);
    assert.match(APP, /amServer=await serverAbmelden\(\)/,
      "es wird nicht auf die Antwort gewartet");
    /* Die Reihenfolge ist der Kern: erst der Server, dann das Gerät.
       Andersherum stünde die Anmeldung wieder da, während der Keks lebt. */
    const f = APP.slice(APP.indexOf("async function abmelden()"));
    const ruf = f.indexOf("await serverAbmelden()");
    const leeren = f.indexOf("setUser(\"\")");
    assert.ok(ruf > -1 && leeren > ruf, "der Speicher wird vor dem Server geleert");
  });

  test("ohne Netz wird die Abmeldung vorgemerkt und nachgeholt", () => {
    assert.match(APP, /const K_ABMELDUNG=/);
    assert.match(APP, /async function holeAbmeldungNach\(\)/);
    const online = APP.slice(APP.indexOf('addEventListener("online"'));
    assert.ok(online.slice(0, 200).includes("holeAbmeldungNach()"),
      "die Vormerkung wird bei Empfang nicht nachgeholt");
    /* Und sie darf eine NEUE Anmeldung nicht wieder abräumen. */
    assert.match(APP, /localStorage\.removeItem\(K_ABMELDUNG\)/,
      "die Vormerkung überlebt die nächste Anmeldung");
  });

  test("auch das Backoffice hat einen Ausgang", () => {
    assert.match(BO, /ab\.id="bAb"/, "leitung.html hat keinen Abmeldeknopf");
    assert.match(BO, /async function abmelden\(\)/);
    /* Seit der dritten Jagd mit Frist (`kurz()`), damit der Knopf am
       geteilten iPad nicht am schweigenden WLAN haengen bleibt. */
    assert.match(BO, /kurz\("\/api\/abmelden",\{method:"POST"\}\)/,
      "der Ausgang im Backoffice ruft den Endpunkt nicht");
    assert.match(BO, /async function kurz\(pfad,opt,ms\)/);
    /* Er steht in der Navigation, nicht in der Leiste: dort war unter
       900 px kein Platz mehr und die Leiste lief aus dem Fenster. */
    assert.match(BO, /nav\.seite button\.ausgang\{/);
  });

  /* Fünfte Jagd Runde 16 · B: Der zweite Griff am Team-Formular legte
     die Person ein ZWEITES Mal an — `hole()` lief nach dem Fehlschlag
     nicht, `LEUTE` blieb alt, `find()` fand nichts, `id` blieb
     undefined, und `personSchreiben()` bindet `id ||
     crypto.randomUUID()`. Es gibt kein Löschen und keine Sicherung.
     Der Client bringt jetzt seine eigene Kennung mit; zweimal dasselbe
     Paket schreibt dieselbe Zeile (`ON CONFLICT(id) DO UPDATE`). */
  test("der zweite Anlauf am Team-Formular wiederholt dieselbe Anfrage", () => {
    assert.match(BO, /let nAnlauf=null;/);
    assert.match(BO, /nAnlauf=\{name:nm, code, rolle, id:\(da\?da\.id:uuid\(\)\)\};/,
      "die Kennung wird nicht einmal vergeben und festgehalten");
    assert.match(BO, /sende\(\{id:nAnlauf\.id,/,
      "der Anlauf schickt seine Kennung nicht mit");
    assert.match(BO, /if\(gut\)\{ nAnlauf=null;/,
      "die Kennung faellt nicht, wenn es angekommen ist");
    assert.match(BO, /function uuid\(\)/);
  });
});

/* ═════ A2 · Zwei Personen dürfen nicht denselben Code haben ═══════════
   `anmelden()` rechnet jeden Code gegen JEDE Person und behält den
   LETZTEN Treffer. Bei zwei gleichen Codes entscheidet die Reihenfolge
   der Zeilen, wer man ist — und im append-only Journal steht dauerhaft
   der falsche Name. */
describe("A2 · Ein Code gehört genau einer Person", () => {
  test("anlegen mit einem schon vergebenen Code wird abgelehnt", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const a = await worker.fetch(anfrage("/api/anlage",
      { method: "POST", body: { name: "Marinus", rolle: "wirtschaft", code: CL } }), env);
    assert.equal(a.status, 409, "der doppelte Code ging durch");
    const j = await a.json();
    assert.match(j.fehler, /schon jemand/, "die Meldung nennt den Grund nicht");

    /* Und die Person darf dabei nicht angelegt worden sein. */
    const an = await anmelden(env, CL);
    assert.equal(an.status, 200);
    assert.equal((await an.json()).name, "Casimir",
      "der Code führt nach dem abgelehnten Versuch zur falschen Person");
  });

  test("denselben Code auf DERSELBEN Person neu zu setzen bleibt erlaubt", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));
    const liste = await worker.fetch(anfrage("/api/personen", { keks }), env);
    const ich = (await liste.json()).personen.find(p => p.name === "Casimir");

    const a = await worker.fetch(anfrage("/api/personen", { method: "POST", keks,
      body: { id: ich.id, name: "Casimir", rolle: "leitung", code: CL } }), env);
    assert.equal(a.status, 200, "die eigene Zeile kollidiert mit sich selbst");
  });

  test("auch ein gesperrter Mensch hält seinen Code besetzt", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));
    const liste = await worker.fetch(anfrage("/api/personen", { keks }), env);
    const asad = (await liste.json()).personen.find(p => p.name === "Asad");

    await worker.fetch(anfrage("/api/personen", { method: "POST", keks,
      body: { id: asad.id, name: "Asad", rolle: "service", aktiv: 0 } }), env);

    /* Gesperrte werden wieder freigegeben. Wäre der Code inzwischen ein
       zweites Mal vergeben, stünden danach zwei gleiche da. */
    const a = await worker.fetch(anfrage("/api/personen", { method: "POST", keks,
      body: { name: "Ian", rolle: "service", code: CS } }), env);
    assert.equal(a.status, 409, "der Code einer gesperrten Person war wieder frei");
  });

  test("der gewürfelte Ersatzcode meidet dieselben Zeilen", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));
    const liste = await worker.fetch(anfrage("/api/personen", { keks }), env);
    const asad = (await liste.json()).personen.find(p => p.name === "Asad");

    const a = await worker.fetch(anfrage("/api/person/pin",
      { method: "POST", keks, body: { id: asad.id } }), env);
    assert.equal(a.status, 200);
    const neu = (await a.json()).pin;
    assert.notEqual(neu, CL, "der Würfel traf den Code der Leitung");
    assert.match(neu, /^\d{4}$/);
  });
});

/* ═════ B1 · Die Sperrmeldung stimmt mit der Sperre überein ════════════
   `uebrig` zählte ALLE Fehlversuche der letzten zwei Stunden, während die
   Sperre am zehntjüngsten hängt. Auf dem Schirm stand „jetzt gesperrt",
   obwohl die Tür offen war. Dazu nannte die Meldung in allen drei Stufen
   „15 Minuten". */
describe("B1 · Meldung und Sperre kommen aus demselben Mass", () => {
  test("bei uebrig=0 ist wirklich gesperrt — und die Uhrzeit steht dabei", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const falsch = wuerfel(7);
    let letzte = null;
    for (let i = 0; i < 10; i++) {
      const a = await anmelden(env, falsch);
      assert.equal(a.status, 401);
      letzte = await a.json();
    }
    assert.equal(letzte.uebrig, 0, "der zehnte Fehlversuch sagt nicht „jetzt zu\"");
    assert.ok(letzte.wartenBis > Date.now(),
      "bei uebrig=0 fehlt die Uhrzeit, ab der es wieder geht");
    const zu = await anmelden(env, falsch);
    assert.equal(zu.status, 429, "uebrig=0 und trotzdem nicht gesperrt");
  });

  test("die Antwort nennt die Dauer, die wirklich gilt — 15, 30, 60", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const falsch = wuerfel(7);

    const dauer = [];
    for (let i = 0; i < 30; i++) {
      const a = await anmelden(env, falsch);
      if (a.status !== 401) continue;
      const j = await a.json();
      if (j.uebrig === 0) dauer.push(j.minuten);
      /* Während einer Sperre kommt nichts mehr dazu — die Fehlversuche
         werden von Hand nachgelegt, damit die Staffel erreichbar bleibt. */
      if (a.status === 401 && j.uebrig === 0) {
        await env.DB.prepare(
          `INSERT INTO anmeldeversuch (ip, ts, ok) VALUES (?1, ?2, 0)`
        ).bind("10.0.0.1", Date.now()).run();
      }
    }
    assert.ok(dauer.length >= 1, "keine einzige Sperrmeldung eingefangen");
    for (const d of dauer)
      assert.ok([15, 30, 60].includes(d), "unbekannte Dauer: " + d);
    assert.equal(dauer[0], 15, "die erste Stufe ist nicht die Viertelstunde");
  });

  test("die Dauer kommt aus der Staffel, nicht aus einem zweiten Text", () => {
    assert.match(WORKER, /function sperrDauer\(/);
    assert.match(WORKER, /function versucheBisSperre\(/);
    assert.match(WORKER, /SPERRE\.stufen\[stufe - 1\]/);
    assert.doesNotMatch(WORKER, /SPERRE\.versuche - \(fehl\.length \+ 1\)/,
      "die alte, falsche Rechnung steht noch im Worker");
  });

  test("die App liest die Dauer aus der Antwort statt sie zu erfinden", () => {
    assert.doesNotMatch(APP, /jetzt für 15 Minuten gesperrt/,
      "die App nennt weiter pauschal 15 Minuten");
    assert.doesNotMatch(APP, /dann ist für 15 Minuten gesperrt/,
      "die App nennt weiter pauschal 15 Minuten");
    assert.match(APP, /\+j\.minuten/, "die App liest die Dauer nicht aus der Antwort");
  });
});

/* ═════ B3 · Ein zurückgesetzter Code gibt nicht mehr frei ═════════════
   Freigabe und Wein-Editor fragten nur den Gerätespeicher. Der kennt
   jeden Code, der hier je geglückt ist — auch einen, den die Leitung
   längst ersetzt hat. */
describe("B3 · Der Server entscheidet, wer freigeben darf", () => {
  test("/api/code nennt den Namen, ohne die Sitzung zu wechseln", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CS));   /* angemeldet ist Asad */

    const a = await worker.fetch(anfrage("/api/code",
      { method: "POST", keks, body: { code: CL } }), env);
    assert.equal(a.status, 200);
    assert.equal((await a.json()).name, "Casimir");
    assert.equal(a.headers.get("set-cookie"), null,
      "der Nachschlag setzt einen Keks und wechselt damit die Person");

    const ich = await worker.fetch(anfrage("/api/ich", { keks }), env);
    assert.equal((await ich.json()).name, "Asad", "die Sitzung ist umgesprungen");
  });

  test("ein zurückgesetzter Code gilt danach nicht mehr", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));
    const liste = await worker.fetch(anfrage("/api/personen", { keks }), env);
    const asad = (await liste.json()).personen.find(p => p.name === "Asad");

    const vor = await worker.fetch(anfrage("/api/code",
      { method: "POST", keks, body: { code: CS } }), env);
    assert.equal(vor.status, 200, "vor dem Zurücksetzen gilt der alte Code");

    await worker.fetch(anfrage("/api/person/pin",
      { method: "POST", keks, body: { id: asad.id } }), env);

    const nach = await worker.fetch(anfrage("/api/code",
      { method: "POST", keks, body: { code: CS } }), env);
    assert.equal(nach.status, 401, "der alte Code gibt weiter frei");
  });

  test("ohne Sitzung ist der Nachschlag kein offenes Orakel", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const a = await worker.fetch(anfrage("/api/code",
      { method: "POST", body: { code: CL } }), env);
    assert.equal(a.status, 401, "jeder darf Codes durchprobieren");
  });

  /* qa-guardian, Schlusskontrolle Runde 16.
     Unter 401 stehen zwei grundverschiedene Aussagen: „diesen Code gibt es
     nicht" und „deine Sitzung ist abgelaufen". Die App nahm beides gleich
     und loeschte daraufhin einen GUELTIGEN Code aus `hh_bekannt_v1` — die
     Rueckfallebene fuer den Keller ohne Netz. Beide Seiten muessen sich
     unterscheiden lassen; das Feld `fehler` ist das Merkmal. */
  test("die beiden Neins unter 401 sind auseinanderzuhalten", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));

    /* Vierstellig — sonst weist der Worker schon die Form ab (A3) und
       kaeme gar nicht bis zum Nachschlag. */
    let falsch = wuerfel(); while (falsch === CL || falsch === CS) falsch = wuerfel();
    const toter = await worker.fetch(anfrage("/api/code",
      { method: "POST", keks, body: { code: falsch } }), env);
    assert.equal(toter.status, 401);
    assert.equal((await toter.json()).fehler, "unbekannt",
      "ein toter Code muss sich als solcher zu erkennen geben");

    const ohne = await worker.fetch(anfrage("/api/code",
      { method: "POST", body: { code: CL } }), env);
    assert.equal(ohne.status, 401);
    assert.equal((await ohne.json()).fehler, "nicht angemeldet",
      "eine abgelaufene Sitzung sagt nichts ueber den Code");
  });

  test("die App vergisst nur das echte Nein, nicht die abgelaufene Sitzung", () => {
    const a = APP.indexOf("async function werHatDenCode(code)");
    const e = APP.indexOf("function codeAbsage(erg)", a);
    const f = APP.slice(a, e);
    assert.match(f, /r\.status===401&&j\.fehler==="unbekannt"/,
      "vergissCode haengt weiter am blossen Status 401");
    /* Und der unbedingte Fall darf danach NICHT mehr vergessen. */
    const nachDem = f.slice(f.indexOf('j.fehler==="unbekannt"'));
    const zweiter = nachDem.indexOf("r.status===401");
    assert.ok(zweiter > 0, "der Fall „nicht angemeldet\" fehlt");
    assert.equal(/vergissCode/.test(nachDem.slice(zweiter)), false,
      "eine abgelaufene Sitzung nimmt dem Geraet weiter den gueltigen Code");
  });

  test("ein echter Rateversuch zählt auf dieselbe Sperre ein wie die Anmeldung", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));
    let falsch = wuerfel(); while (falsch === CL || falsch === CS) falsch = wuerfel();
    for (let i = 0; i < 10; i++)
      await worker.fetch(anfrage("/api/code",
        { method: "POST", keks, body: { code: falsch } }), env);
    const zu = await anmelden(env, falsch);
    assert.equal(zu.status, 429, "der Nachschlag ist der Weg an der Sperre vorbei");
  });

  /* Jäger, Runde 16 (A3): Die Freigabe ist der häufigste Dialog im Haus.
     Solange JEDE Anfrage von dort eine Zeile in `anmeldeversuch` trug,
     konnten zwölf ungeduldige Klicks auf ein leeres Feld die Anmeldung
     für das ganze Haus sperren — die Sperre zählt je IP, und im
     Haus-WLAN teilen sich alle Geräte eine. */
  test("ein leeres oder krummes Feld kostet KEINEN Anmeldeversuch", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));

    for (const krumm of ["", "1", "12", "123", "12345", "abcd", "12a4"]) {
      const a = await worker.fetch(anfrage("/api/code",
        { method: "POST", keks, body: { code: krumm } }), env);
      assert.equal(a.status, 422, "krumme Eingabe „" + krumm + "\" ging durch");
    }
    for (let i = 0; i < 20; i++)
      await worker.fetch(anfrage("/api/code",
        { method: "POST", keks, body: { code: "" } }), env);

    const n = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM anmeldeversuch WHERE ok = 0`).first();
    assert.equal(n.n, 0, "krumme Eingaben haben " + n.n + " Fehlversuche eingetragen");
    const auf = await anmelden(env, CL);
    assert.equal(auf.status, 200, "die Anmeldung ist durch leere Felder gesperrt");
  });

  test("die App schickt gar nicht erst, was die Form nicht hat", () => {
    const f = APP.slice(APP.indexOf("async function werHatDenCode(code)"),
                        APP.indexOf("function codeAbsage(erg)"));
    assert.match(f, /return \{name:null, quelle:"form"\};/,
      "eine krumme Eingabe geht weiter an den Server");
    assert.match(APP, /if\(erg\.quelle==="form"\)/,
      "die Absage nennt den Grund nicht");
  });

  test("die App fragt den Server und vergisst den toten Code", () => {
    assert.match(APP, /async function werHatDenCode\(code\)/);
    assert.match(APP, /async function vergissCode\(code\)/);
    assert.match(APP, /const erg=await werHatDenCode\(inp\.value\);/,
      "die Freigabe fragt weiter nur den Gerätespeicher");
    /* `bekannterCode` darf nur noch als Rückfallebene dastehen: in der
       Anmeldung und innerhalb von werHatDenCode.
       qa-guardian (Schlusskontrolle Runde 16): Gezählt wurde bisher die
       Zahl der Aufrufe. Das ist kein Mass für „entscheidet allein" —
       werHatDenCode hat seit der Trennung der beiden 401 (toter Code /
       abgelaufene Sitzung) zwei Rückfälle, beide innerhalb der Funktion.
       Geprüft wird deshalb der ORT: ausserhalb von werHatDenCode darf nur
       noch die Anmeldung fragen. */
    const a = APP.indexOf("async function werHatDenCode(code)");
    const e = APP.indexOf("function codeAbsage(erg)", a);
    assert.ok(a > 0 && e > a, "werHatDenCode nicht gefunden");
    const drinnen = [...APP.slice(a, e).matchAll(/await bekannterCode\(/g)].length;
    const gesamt = [...APP.matchAll(/await bekannterCode\(/g)].length;
    assert.ok(drinnen >= 1, "werHatDenCode hat keine Rückfallebene mehr");
    assert.equal(gesamt - drinnen, 1,
      "ausserhalb von werHatDenCode entscheidet bekannterCode an "
      + (gesamt - drinnen) + " Stellen — erlaubt ist nur die Anmeldung");
  });
});

/* ═════ B4 · Der neue Code kann nicht verloren gehen ═══════════════════ */
describe("B4 · Ein zurückgesetzter Code geht nicht verloren", () => {
  test("der Anrufer darf den Code mitbringen", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));
    const liste = await worker.fetch(anfrage("/api/personen", { keks }), env);
    const asad = (await liste.json()).personen.find(p => p.name === "Asad");

    let mit = wuerfel();
    while (mit === CL || mit === CS) mit = wuerfel();

    const a = await worker.fetch(anfrage("/api/person/pin",
      { method: "POST", keks, body: { id: asad.id, code: mit } }), env);
    assert.equal(a.status, 200);
    assert.equal((await a.json()).pin, mit, "der mitgebrachte Code wurde nicht genommen");

    const an = await anmelden(env, mit);
    assert.equal(an.status, 200);
    assert.equal((await an.json()).name, "Asad");
  });

  test("ein mitgebrachter Code wird geprüft wie jeder vergebene", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));
    const liste = await worker.fetch(anfrage("/api/personen", { keks }), env);
    const asad = (await liste.json()).personen.find(p => p.name === "Asad");

    const kurz = await worker.fetch(anfrage("/api/person/pin",
      { method: "POST", keks, body: { id: asad.id, code: "12" } }), env);
    assert.equal(kurz.status, 422, "eine falsche Länge ging durch");

    const doppelt = await worker.fetch(anfrage("/api/person/pin",
      { method: "POST", keks, body: { id: asad.id, code: CL } }), env);
    assert.equal(doppelt.status, 409, "der Code der Leitung ging durch");
  });

  test("ohne Code würfelt weiterhin der Worker", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));
    const liste = await worker.fetch(anfrage("/api/personen", { keks }), env);
    const asad = (await liste.json()).personen.find(p => p.name === "Asad");
    const a = await worker.fetch(anfrage("/api/person/pin",
      { method: "POST", keks, body: { id: asad.id } }), env);
    assert.equal(a.status, 200);
    assert.match((await a.json()).pin, /^\d{4}$/);
  });

  test("das Backoffice kennt den Code, bevor die Antwort da ist", () => {
    assert.match(BO, /vorschlag=wuerfelPin\(\)/,
      "das Backoffice würfelt nicht selbst");
    assert.match(BO, /body:JSON\.stringify\(vorschlag\?\{id:p\.id,code:vorschlag\}/);
    assert.match(BO, /Die Verbindung brach ab\. Ist der Code angekommen/,
      "bei Abbruch steht der Code nicht da");
    assert.doesNotMatch(BO, /catch\(e\)\{ toast\("Keine Verbindung"\); \}\s*\n\s*b\.disabled=false;\s*\n\s*\}\);/,
      "die alte, verlierende Fassung steht noch da");
  });
});

/* ═════ Runde 16 · Punkt 1 · Zoom ══════════════════════════════════════ */
describe("R16/1 · Doppeltipp zoomt nicht mehr, Pinch bleibt", () => {
  for (const [name, t] of [["index.html", APP], ["leitung.html", BO]]) {
    test(name + ": touch-action steht am html", () => {
      assert.match(t, /html\{touch-action:manipulation\}/,
        "der Doppeltipp zoomt dort weiter");
      assert.doesNotMatch(t, /html\{touch-action:(none|pan-[xy])/,
        "auch der Zwei-Finger-Zoom wäre damit weg");
    });
    test(name + ": Felder am Finger nie unter 16 px", () => {
      assert.match(t, /@media\(pointer:coarse\)\{\s*input,select,textarea\{font-size:var\(--text-base\)\}/,
        "Safari zoomt beim Fokus weiter hinein");
    });
  }
  test("--text-base ist wirklich 16 px", () => {
    assert.match(APP, /--text-base:16px/);
  });
});

/* ═════ Runde 16 · Punkt 2 · Abschluss ═════════════════════════════════ */
describe("R16/2 · Ein Knopf, ein Fenster, zurück zur Startseite", () => {
  test("Protokoll senden, PDF und CSV sind im Frontoffice weg", () => {
    for (const weg of ["Protokoll senden", "Als PDF sichern", "Auch als CSV"])
      assert.equal(APP.includes(">" + weg + "<"), false,
        "„" + weg + "\" steht noch in der App");
    for (const weg of ["function doSenden", "function expCsv", "function fullHtml",
                       "function csvText", "function openHtml"])
      assert.equal(APP.includes(weg + "("), false, weg + " ist noch da");
  });

  test("das Feld „Notiz (optional)" + " steht nicht mehr auf der Seite", () => {
    assert.equal(APP.includes('id="fNotiz"'), false,
      "das Notizfeld liegt weiter im Abschluss");
    /* Es lebt jetzt genau einmal, im Abgleichfenster. */
    assert.equal([...APP.matchAll(/id="abglNotiz"/g)].length, 1);
  });

  test("der einzige Knopf heisst in jedem Modus „Fertig – Speichern\"", () => {
    assert.match(APP, /fb\.textContent="Fertig – Speichern";/);
    assert.equal(APP.includes('"Entnahme melden"'), false);
    assert.equal(APP.includes('"Lieferung melden"'), false);
  });

  test("Rohdaten und Zurücksetzen stehen am Ende des Menüs", () => {
    assert.match(APP, /class="notweg"/);
    assert.match(APP, /id="bJsonAlles">Rohdaten sichern \(JSON\)</);
    /* Je angefangenem Vorgang ein eigener Knopf — nicht einer, der alle
       auf einmal wegräumt (Jagd Runde 16 · B2). */
    assert.match(APP, /data-reset="\$\{k\}"/);
    assert.match(APP, /function rohdatenSichern\(\)/);
    assert.match(APP, /function vorgangZuruecksetzen\(k\)/);
    assert.doesNotMatch(APP, /function allesZuruecksetzen\(\)/,
      "der Sammelknopf räumt wieder alle angefangenen Vorgänge auf einmal weg");
  });

  test("der Abschluss holt den Z-Bericht zum VORTAG", () => {
    assert.match(APP, /function vortagVon\(tag\)/);
    assert.match(APP, /d\.setUTCDate\(d\.getUTCDate\(\)-1\)/);
    assert.match(APP, /holeZBericht\(vortagVon\(d\.tag\)\)/);
    assert.match(APP, /API\+"\/fassungsliste\?tag="/);
  });

  test("mit Z-Bericht: Abgleich mit EINEM Notizfeld · ohne: kurzes Fertig", () => {
    assert.match(APP, /function popupAbgleich\(d,z,groessen\)/);
    assert.match(APP, /function popupFertig\(d\)/);
    assert.match(APP, /if\(z\)popupAbgleich\(d,z,groessen\); else popupFertig\(d\);/);
    /* Beide enden auf der Startseite. */
    const ab = APP.slice(APP.indexOf("function popupAbgleich"), APP.indexOf("function fensterZu"));
    assert.equal([...ab.matchAll(/zurStartseite\(\)/g)].length, 2,
      "eines der beiden Fenster führt nicht zur Startseite zurück");
  });
});

/* Der Abgleich rechnet — an einem nachgestellten Vorgang und einem
   nachgestellten Z-Bericht. Gerechnet wird mit den echten Funktionen aus
   index.html, nicht mit einer Kopie. */
describe("R16/2 · Der Abgleich zeigt nur die Abweichungen", () => {
  /* `gefassteMengen` und `abgleichZeilen` hängen an nichts ausser sich
     selbst; sie lassen sich damit aus der Datei schneiden und einzeln
     rechnen. Bricht das, ist eine Abhängigkeit dazugekommen — dann gehört
     die Prüfung in tests/ui-runde16.cjs, nicht hierher. */
  const schnitt = (name) => {
    const a = APP.indexOf("function " + name + "(");
    assert.ok(a > 0, name + " fehlt");
    let tiefe = 0, i = APP.indexOf("{", a);
    for (let j = i; j < APP.length; j++) {
      if (APP[j] === "{") tiefe++;
      else if (APP[j] === "}") { tiefe--; if (!tiefe) return APP.slice(a, j + 1); }
    }
    assert.fail(name + ": keine schliessende Klammer");
  };
  const rechne = new Function(
    schnitt("gefassteMengen") + "\n" + schnitt("verkaufteFlaschen") +
    "\n" + schnitt("abgleichZeilen") +
    "\nreturn {gefassteMengen, verkaufteFlaschen, abgleichZeilen};")();

  const vorgang = {
    mode: "tag", tag: "2026-09-19",
    rest: { w1: 2 }, bar: { w2: 3 }, barrot: {}, backup: {},
    zusatz: {}, gent: { cola: 6 }, gzusatz: {}
  };
  /* Die Zeilen sehen aus, wie `gnparse.ml()` sie wirklich liefert: Die
     Zahl im Kassennamen landet in `ausschankMl` — „1/8 l" gibt 125,
     „0,75 l" gibt 750, ein Name ohne Menge gibt null.
     (Die erste Fassung dieser Prüfung erfand Zeilen mit `ausschankMl:
     null` für „Cola 0,33"; solche liefert der Parser nie, und die Prüfung
     bestätigte damit nur sich selbst. Jagd Runde 16 · A2.) */
  const zBericht = { tag: "2026-09-18", positionen: [
    { rohbez: "Cola 0,33 l",  artikel: "cola", anzahl: 6,  ausschankMl: 330 },
    { rohbez: "Wein A 1/8 l", artikel: "w1",   anzahl: 6,  ausschankMl: 125 },
    { rohbez: "Wein B 0,75 l",artikel: "w2",   anzahl: 3,  ausschankMl: 750 },
    { rohbez: "Wein C 1/8 l", artikel: "w9",   anzahl: 12, ausschankMl: 125 },
    { rohbez: "Unbekannt",    artikel: null,   anzahl: 4,  ausschankMl: null }
  ]};
  /* Bestätigte Gebindegrössen, wie sie `GET /api/mapping` liefert. `w9`
     fehlt absichtlich — das ist der heutige Live-Zustand für ALLE
     dreizehn Zuordnungen. */
  const groessen = { "Cola 0,33 l": 330, "Wein A 1/8 l": 750, "Wein B 0,75 l": 750 };

  test("gefasst wird aus allen Fächern zusammengezählt", () => {
    assert.deepEqual(rechne.gefassteMengen(vorgang), { w1: 2, w2: 3, cola: 6 });
  });

  test("verkauft wird gerechnet wie im Backoffice: anzahl × ausschank ÷ gebinde", () => {
    const f = (p) => rechne.verkaufteFlaschen(p, groessen);
    /* Sechs Achtel aus der 0,75er sind eine Flasche. */
    assert.equal(f(zBericht.positionen[1]), 1);
    /* Drei ganze Flaschen bleiben drei. */
    assert.equal(f(zBericht.positionen[2]), 3);
    /* Sechs Flaschen Cola, Gebinde = Ausschank. */
    assert.equal(f(zBericht.positionen[0]), 6);
    /* Ohne bestätigte Grösse wird NICHTS geraten. */
    assert.equal(f(zBericht.positionen[3]), null);
    /* Ohne Menge im Namen wird NICHTS geraten (zweite Jagd Runde 16 · A).
       „Aperol Spritz 1 Glas" ist kein Stück Flasche — genau dieser Zweig
       hat im Backoffice bis v24 aus einem 2-cl-Stamperl eine Flasche
       gemacht. `flaschen()` in leitung.html gibt dort `fehlt:"ausschank"`
       zurück und vergleicht die Position nicht. */
    assert.equal(f({ rohbez: "Aperol Spritz 1 Glas", anzahl: 6, ausschankMl: null }), null);
    /* `f` nimmt nur EIN Argument — die Größen stehen schon darin. Die
       erste Fassung hängte hier ein zweites an, das nie ankam (C). */
    assert.equal(f({ rohbez: "X", anzahl: 2, ausschankMl: null }), null);
  });

  test("nur, was auseinandergeht — hier eine Zeile", () => {
    const a = rechne.abgleichZeilen(vorgang, zBericht, groessen);
    assert.equal(a.zeilen.length, 1, JSON.stringify(a.zeilen));
    assert.deepEqual(a.zeilen[0], { id: "w1", gefasst: 2, verkauft: 1, diff: 1,
      vorbehalt: false, ohne: 0, ganz: 1 });
    assert.equal(a.geprueft, 3, "nicht alle vergleichbaren Artikel gezählt");
  });

  test("ein Artikel ohne bestätigte Grösse bleibt aus der Rechnung — und wird gezählt", () => {
    const a = rechne.abgleichZeilen(vorgang, zBericht, groessen);
    assert.equal(a.ohneGebinde, 1);
    assert.equal(a.ohneZuordnung, 1);
    assert.equal(a.zeilen.some(z => z.id === "w9"), false,
      "eine Position ohne Gebindegrösse wird als Abweichung behauptet");
  });

  /* Die beiden Ursachen werden getrennt gezählt (dritte Jagd Runde 16):
     „keine Menge im Kassennamen" kann die Leitung nicht beheben, „keine
     bestätigte Gebindegrösse" schon. Der Kopf des Fensters nennt sonst
     einen Grund, den es nicht gibt. */
  test("keine Menge im Namen und keine bestätigte Grösse zählen getrennt", () => {
    const mitGlas = { tag: "2026-09-18", positionen: zBericht.positionen.concat(
      [{ rohbez: "Aperol Spritz 1 Glas", artikel: "cola", anzahl: 6, ausschankMl: null }]) };
    const a = rechne.abgleichZeilen(vorgang, mitGlas, groessen);
    assert.equal(a.ohneMenge, 1, "die Position ohne Menge im Namen fehlt");
    assert.equal(a.ohneGebinde, 1, "die Position ohne Gebindegrösse fehlt");
  });

  test("ohne JEDE Grösse wird nichts verglichen — und nichts behauptet", () => {
    /* Der heutige Live-Zustand. `geprueft` muss 0 sein, damit das Fenster
       „Nichts zu vergleichen" sagen kann statt „Keine Abweichung". */
    const a = rechne.abgleichZeilen(vorgang, zBericht, {});
    assert.equal(a.geprueft, 0);
    assert.equal(a.zeilen.length, 0);
    assert.equal(a.ohneGebinde, 4);
    assert.equal(a.geholt, true, "geholt-aber-leer ist nicht nicht-geholt");
  });

  /* `null` heisst „die Größen konnten nicht geholt werden" — ein
     Serverfehler darf nicht als unerledigte Arbeit der Leitung
     erscheinen (dritte Jagd Runde 16 · B). */
  test("nicht geholte Grössen sind etwas anderes als keine bestätigten", () => {
    const a = rechne.abgleichZeilen(vorgang, zBericht, null);
    assert.equal(a.geholt, false);
    const fenster = APP.slice(APP.indexOf("function popupAbgleich"),
                              APP.indexOf("function popupFertig"));
    assert.match(fenster, /!a\.geholt/,
      "das Fenster unterscheidet nicht zwischen nicht-geholt und nicht-bestätigt");
    assert.match(fenster, /nicht geholt werden/);
  });

  test("`holtN` schlägt die Summe der Fächer — wie im Worker", () => {
    const v = Object.assign({}, vorgang, { holtN: { w1: 1 } });
    assert.equal(rechne.gefassteMengen(v).w1, 1);
  });

  test("gar keine Abweichung ergibt eine leere Liste bei geprueft > 0", () => {
    const v = Object.assign({}, vorgang, { rest: { w1: 1 } });
    const a = rechne.abgleichZeilen(v, zBericht, groessen);
    assert.equal(a.zeilen.length, 0);
    assert.ok(a.geprueft > 0, "keine Abweichung ohne einen einzigen Vergleich");
  });

  test("das Fenster behauptet nichts, was es nicht gerechnet hat", () => {
    const fenster = APP.slice(APP.indexOf("function popupAbgleich"),
                              APP.indexOf("function popupFertig"));
    assert.match(fenster, /a\.geprueft===0/,
      "das Fenster unterscheidet nicht zwischen nichts-verglichen und nichts-gefunden");
    assert.match(fenster, /Nichts zu vergleichen/);
    /* BERICHTIGT (qa-guardian, Gegenprobe Runde 16): Hier stand
       `doesNotMatch(/ohneZuordnung/)` — „44 Kassenpositionen aus der
       Küche gehören nicht in den Keller". Der Anspruch war zu breit und
       hat einen schlimmeren Fall gedeckt: Ein Artikel, der GEFASST wurde
       und dessen Kassenposition keinem Artikel zugeordnet ist, steht in
       der Liste mit „verkauft 0" und der vollen Menge als Abweichung —
       im Browser nachgestellt (`tests/qa-runde16-gegenprobe.cjs`, G1).
       Ohne die Zahl im Fuss ist das eine Falschaussage. Geprüft wird
       deshalb nicht mehr das Schweigen, sondern die Bedingung: genannt
       wird sie nur, wenn es eine Abweichung gibt, die sie erklärt. */
    /* NACHGEZOGEN (vierte Jagd Runde 16 · C): Die Bedingung hing an
       `a.zeilen.length` — neben der grünen Plakette standen damit 45
       ungenannte Kassenzeilen. Sobald das Fenster überhaupt etwas über
       Vollständigkeit sagt, gehört die Zahl dazu; das ist `a.geprueft`. */
    assert.match(fenster, /a\.ohneZuordnung&&a\.geprueft/,
      "die unzugeordneten Kassenpositionen werden gar nicht oder immer genannt");
    assert.match(fenster, /keinem Artikel zugeordnet/);
  });

  test("eine gefasste Ware ohne zugeordnete Kassenposition ist erklärbar", () => {
    /* Der Live-Normalfall: 13 Zuordnungen, alles andere unzugeordnet.
       Der Artikel `g7` wurde gefasst, seine Kassenzeile trägt keinen
       Artikel — er steht mit „verkauft 0" da, und `ohneZuordnung` ist
       die einzige Zahl, die das erklärt. */
    const v = { mode: "tag", barrot: { g7: 6 }, bar: {}, backup: {}, rest: {},
                holtN: {}, zusatz: {}, gent: {}, gzusatz: {} };
    const z = { positionen: [
      { rohbez: "Almdudler 0,35 l", artikel: null, anzahl: 6, ausschankMl: 350 }
    ]};
    const a = rechne.abgleichZeilen(v, z, {});
    assert.equal(a.ohneZuordnung, 1);
    assert.deepEqual(a.zeilen, [{ id: "g7", gefasst: 6, verkauft: 0, diff: 6,
      vorbehalt: false, ohne: 0, ganz: 0 }]);
  });

  /* ── Vierte Jagd · die halbe Rechnung ────────────────────────────────
     Gemessen am echten Bericht 37: „Prosecco 0,1l" (rechenbar) und
     „Aperol Spritz 1 Glas" (keine Menge im Namen) zeigen auf denselben
     Artikel. Bis zur vierten Jagd fiel der Artikel damit GANZ heraus und
     das Fenster meldete in Grün „Keine Abweichung" — bei 8,2 Flaschen
     Lücke. Das Backoffice antwortet auf dieselbe Lage seit Runde 10 mit
     einer Differenz MIT VORBEHALT (`vorbehaltSatz` in leitung.html). */
  test("ein Artikel mit halb rechenbarem Verkauf fällt nicht heraus", () => {
    const v = { mode: "tag", barrot: {}, bar: {}, backup: {}, rest: { w1: 9 },
                holtN: {}, zusatz: {}, gent: {}, gzusatz: {} };
    const z = { positionen: [
      { rohbez: "Prosecco 0,1 l",     artikel: "w1", anzahl: 6, ausschankMl: 100 },
      { rohbez: "Aperol Spritz 1 Glas", artikel: "w1", anzahl: 6, ausschankMl: null }
    ]};
    const a = rechne.abgleichZeilen(v, z, { "Prosecco 0,1 l": 750 });
    assert.equal(a.zeilen.length, 1, "der Artikel fällt wieder ganz heraus: "
      + JSON.stringify(a));
    const r = a.zeilen[0];
    assert.equal(r.id, "w1");
    assert.equal(r.vorbehalt, true, "die Zeile trägt keinen Vorbehalt");
    assert.equal(r.ohne, 1);
    assert.equal(r.ganz, 2);
    assert.equal(r.gefasst, 9);
    assert.equal(r.verkauft, 0.8, "6 × 100 ÷ 750 = 0,8 Flaschen");
    assert.equal(r.diff, 8.2, "8,2 Flaschen Luecke statt keiner Abweichung");
    assert.equal(a.mitVorbehalt, 1);
  });

  test("ein Artikel, von dem KEINE Zeile rechenbar ist, bleibt stumm", () => {
    const v = { mode: "tag", barrot: {}, bar: {}, backup: {}, rest: { w1: 9 },
                holtN: {}, zusatz: {}, gent: {}, gzusatz: {} };
    const z = { positionen: [
      { rohbez: "Aperol Spritz 1 Glas", artikel: "w1", anzahl: 6, ausschankMl: null }
    ]};
    const a = rechne.abgleichZeilen(v, z, {});
    assert.equal(a.zeilen.length, 0);
    assert.equal(a.geprueft, 0);
    assert.equal(a.ohneMenge, 1);
  });

  /* ── Fünfte Jagd · der Quantor zeigte in die falsche Richtung ───────
     `diff = gefasst − verkauft`. Eine nicht rechenbare Kassenzeile ist
     ein VERKAUF; käme sie dazu, stiege `verkauft` und SÄNKE `diff`. Die
     gezeigte Zahl ist damit die OBERgrenze der Abweichung. „mind." hat
     das Gegenteil behauptet — an Bericht 37 gemessen: gezeigt „mind.
     +2,4", wahr +0,4. */
  test("die Zeile mit Vorbehalt behauptet keine Untergrenze", () => {
    const fenster = APP.slice(APP.indexOf("function popupAbgleich"),
                              APP.indexOf("function popupFertig"));
    /* Nur im CODE, nicht im Kommentar daneben — der erklaert den Fehler. */
    assert.doesNotMatch(fenster, /vorbehalt\?"mind\. "/,
      "der Quantor steht wieder vor der Zahl und zeigt in die falsche Richtung");
    /* Im Quelltext stehen die Umlaute als \u-Fluchten — hier wird der
       Quelltext gelesen, nicht das gerenderte Fenster. */
    assert.ok(fenster.includes("die echte L\\u00fccke ist kleiner"),
      "bei positiver Differenz fehlt die Richtung der Unsicherheit");
    assert.ok(fenster.includes("die echte L\\u00fccke ist gr\\u00f6\\u00dfer"),
      "bei negativer Differenz fehlt die Richtung der Unsicherheit");
  });

  test("die Zahlen im Fenster sind deutsch", () => {
    const fenster = APP.slice(APP.indexOf("function popupAbgleich"),
                              APP.indexOf("function popupFertig"));
    assert.match(fenster, /toLocaleString\("de-AT"/,
      "Punkt statt Komma — das Backoffice schreibt seit je deutsch");
  });

  /* Der Vorbehalt bekommt eine eigene, volle Zeile. In der Flexreihe
     blieb `.nm` bei 390 px strukturell 55 px breit (`.za` und `.df` sind
     `nowrap`) und der Satz wurde zur Wortleiter mit Trennung mitten im
     Wort (fünfte Jagd Runde 16 · B, in Chromium gemessen). */
  test("der Vorbehalt steht nicht in der Flexreihe", () => {
    assert.match(APP, /\.abglz\{display:flex;flex-wrap:wrap;/,
      "die Zeile bricht nicht um");
    assert.match(APP, /\.abglz \.vorb\{flex-basis:100%;/,
      "der Vorbehalt teilt sich die Zeile weiter mit den Zahlen");
    /* Und er hängt nicht mehr im Namensfeld. */
    const fenster = APP.slice(APP.indexOf("function popupAbgleich"),
                              APP.indexOf("function popupFertig"));
    assert.doesNotMatch(fenster, /class="nm">\$\{esc\(GN\(x\.id\)\)\}`\s*\+\(x\.vorbehalt/,
      "der Vorbehalt steckt wieder im Namensfeld");
  });

  test("die grüne Plakette steht nie über einer halben Rechnung", () => {
    const fenster = APP.slice(APP.indexOf("function popupAbgleich"),
                              APP.indexOf("function popupFertig"));
    /* Eine Zeile mit Vorbehalt wird IMMER gezeigt, auch bei diff 0 —
       damit kommt der Zweig mit der grünen Plakette gar nicht erst dran. */
    const rechnung = APP.slice(APP.indexOf("function abgleichZeilen"),
                               APP.indexOf("function vorgangFestschreiben"));
    assert.match(rechnung, /if\(Math\.abs\(a-b\)<0\.05 && !vorbehalt\)return;/,
      "eine Zeile mit Vorbehalt verschwindet bei diff 0 und die Plakette wird grün");
    assert.match(fenster, /mind\. /, "die Untergrenze ist nicht als solche gekennzeichnet");
    assert.match(fenster, /unvollst/, "der Vorbehalt steht nicht an der Zeile");
  });
});

/* ═════ Runde 16 · Punkt 3 · Gruppentöne ═══════════════════════════════ */
describe("R16/3 · Service sticht hervor, Bestand tritt zurück", () => {
  test("die beiden Gründe sind getauscht", () => {
    assert.match(APP, /\.grp--service\{--ton:var\(--accent\); --tonbg:var\(--surface\)\}/);
    assert.match(APP, /\.grp--bestand\{--ton:var\(--fg-subtle\); --tonbg:var\(--surface-3\)\}/);
    assert.doesNotMatch(APP, /\.grp--service\{--ton:var\(--accent\); --tonbg:var\(--accent-tint\)\}/,
      "Service trägt weiter den gedämpften Grund");
  });
  test("die Hausfarben bleiben", () => {
    assert.match(APP, /--accent:#004947/);
    assert.match(APP, /--surface:#FFFFFF/);
    assert.match(APP, /--surface-3:#EFEDE6/);
  });
  test("der Ton der Sonderentnahme bleibt, wie er war", () => {
    assert.match(APP, /\.grp--ausser\{--ton:var\(--warn-fg\); --tonbg:var\(--warn-bg\)\}/);
  });
});

/* ═════ Runde 16 · Punkt 4 · Statusleiste und Verbindung ═══════════════ */
describe("R16/4 · Verbunden — und ohne Verbindung wartet der Knopf", () => {
  test("die grüne Zeile sagt „Verbunden\"", () => {
    assert.match(APP, /z==="verbunden"\)\{ t="Verbunden"; k="ok"; \}/);
  });
  test("die übrigen Zustände bleiben, nur knapper", () => {
    assert.match(APP, /t="Kein Netz – alles im Gerät gespeichert"/);
    assert.match(APP, /o===1\?"1 Vorgang noch zu übertragen"/);
    assert.match(APP, /t="Nicht angemeldet – bitte neu anmelden"/);
    assert.match(APP, /:"Server antwortet nicht"; k="fehler"/);
  });
  /* BERICHTIGUNG (Jagd Runde 16 · A1, Veto des qa-guardian): Hier stand
     „der Abschlussknopf hängt an der Verbindung" als bestandene Prüfung —
     also der Fund selbst als sein Gegenteil. Der Auftrag der Runde
     verlangte die Sperre, aber im Keller ist kein Netz; eine fertige
     Tagesfassung war damit dort nicht abzuschliessen, und die
     Kellerzählung, die derselbe Auftrag unter „Nicht anfassen" führt, war
     mitgesperrt. Geprüft wird jetzt das Gegenteil: Der Knopf trägt kein
     `disabled` aus der Netzlage, und der Hinweis sagt nur, was fehlt. */
  test("der Abschlussknopf hängt NICHT an der Verbindung", () => {
    assert.match(APP, /function verbunden\(\)/);
    assert.match(APP, /function finishNetz\(\)/);
    assert.doesNotMatch(APP, /fb\.disabled=!an;/,
      "der Knopf wird wieder wegen der Netzlage gesperrt");
    const fn = APP.slice(APP.indexOf("function finishNetz()"),
                         APP.indexOf("function finishNetz()") + 900);
    assert.doesNotMatch(fn, /\.disabled/,
      "finishNetz() sperrt wieder den Knopf statt nur den Hinweis zu setzen");
    /* Und der Abschluss selbst darf nicht vorher aussteigen. */
    const schritt = APP.slice(APP.indexOf("async function abschlussSchritt"),
                              APP.indexOf("function popupAbgleich"));
    assert.doesNotMatch(schritt, /if\(!verbunden\(\)\)/,
      "abschlussSchritt() steigt ohne Netz wieder aus");
    assert.match(schritt, /vorgangFestschreiben\(d\);/);
  });
  test("ohne Netz wird trotzdem abgeschlossen und in den Ausgang gelegt", () => {
    /* Das ist der Kern von Regel 6: Der Vorgang geht in die Reihe und
       wartet dort. `holeZBericht()` gibt ohne Netz `null` zurück, dann
       kommt `popupFertig()` — und sagt, dass der Abgleich nachkommt. */
    const hole = APP.slice(APP.indexOf("async function holeZBericht"),
                           APP.indexOf("function abgleichZeilen"));
    assert.match(hole, /catch\(e\)\{ return null; \}/,
      "holeZBericht() reicht den Fehler durch statt null zu liefern");
    const fertig = APP.slice(APP.indexOf("function popupFertig"),
                             APP.indexOf("function fensterZu"));
    assert.match(fertig, /!verbunden\(\)/,
      "das Fenster sagt nicht, dass der Vorgang ohne Netz wartet");
  });
  test("der Hinweis unter dem Knopf sagt, was fehlt — und geht von selbst weg", () => {
    assert.match(APP, /hn\.textContent="Keine Verbindung – der Abgleich kommt nach"/);
    /* netzChip() läuft bei online/offline, nach jeder Übertragung und in
       der 45-s-Runde. Steht finishNetz() dort, verschwindet der Hinweis
       ohne Zutun. */
    const chip = APP.slice(APP.indexOf("function netzChip()"),
                           APP.indexOf("const OHNE_NETZ="));
    assert.match(chip, /finishNetz\(\);/,
      "der Hinweis wird nicht nachgeführt und bleibt stehen");
  });
  test("das Gefasste bleibt im Gerät, auch ohne Verbindung", () => {
    /* `save()` läuft bei jeder Änderung und hängt an nichts Netzartigem. */
    assert.match(APP, /function save\(\)/);
    const save = APP.slice(APP.indexOf("function save()"), APP.indexOf("function save()") + 400);
    assert.doesNotMatch(save, /verbunden\(\)|fetch\(/,
      "das Speichern im Gerät hängt an der Verbindung");
  });
});
