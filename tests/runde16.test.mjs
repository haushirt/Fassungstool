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
    assert.match(BO, /fetch\("\/api\/abmelden",\{method:"POST"/,
      "der Ausgang im Backoffice ruft den Endpunkt nicht");
    /* Er steht in der Navigation, nicht in der Leiste: dort war unter
       900 px kein Platz mehr und die Leiste lief aus dem Fenster. */
    assert.match(BO, /nav\.seite button\.ausgang\{/);
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

  test("der Nachschlag zählt auf dieselbe Sperre ein wie die Anmeldung", async () => {
    const CL = wuerfel(), CS = wuerfel() === CL ? wuerfel(5) : wuerfel();
    const env = await haus(CL, CS);
    const keks = keksAus(await anmelden(env, CL));
    const falsch = wuerfel(7);
    for (let i = 0; i < 10; i++)
      await worker.fetch(anfrage("/api/code",
        { method: "POST", keks, body: { code: falsch } }), env);
    const zu = await anmelden(env, falsch);
    assert.equal(zu.status, 429, "der Nachschlag ist der Weg an der Sperre vorbei");
  });

  test("die App fragt den Server und vergisst den toten Code", () => {
    assert.match(APP, /async function werHatDenCode\(code\)/);
    assert.match(APP, /async function vergissCode\(code\)/);
    assert.match(APP, /const erg=await werHatDenCode\(inp\.value\);/,
      "die Freigabe fragt weiter nur den Gerätespeicher");
    /* `bekannterCode` darf nur noch als Rückfallebene dastehen: in der
       Anmeldung und innerhalb von werHatDenCode. */
    const treffer = [...APP.matchAll(/await bekannterCode\(/g)].length;
    assert.ok(treffer <= 2, "bekannterCode entscheidet noch an " + treffer + " Stellen");
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
    assert.match(APP, /id="bResetAlles" class="adminlink del"|class="adminlink del" id="bResetAlles"/);
    assert.match(APP, /function rohdatenSichern\(\)/);
    assert.match(APP, /function allesZuruecksetzen\(\)/);
  });

  test("der Abschluss holt den Z-Bericht zum VORTAG", () => {
    assert.match(APP, /function vortagVon\(tag\)/);
    assert.match(APP, /d\.setUTCDate\(d\.getUTCDate\(\)-1\)/);
    assert.match(APP, /holeZBericht\(vortagVon\(d\.tag\)\)/);
    assert.match(APP, /API\+"\/fassungsliste\?tag="/);
  });

  test("mit Z-Bericht: Abgleich mit EINEM Notizfeld · ohne: kurzes Fertig", () => {
    assert.match(APP, /function popupAbgleich\(d,z\)/);
    assert.match(APP, /function popupFertig\(d\)/);
    assert.match(APP, /if\(z\)popupAbgleich\(d,z\); else popupFertig\(d\);/);
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
    schnitt("gefassteMengen") + "\n" + schnitt("abgleichZeilen") +
    "\nreturn {gefassteMengen, abgleichZeilen};")();

  const vorgang = {
    mode: "tag", tag: "2026-09-19",
    rest: { w1: 2 }, bar: { w2: 3 }, barrot: {}, backup: {},
    zusatz: {}, gent: { cola: 6 }, gzusatz: {}
  };
  const zBericht = { tag: "2026-09-18", positionen: [
    { rohbez: "Cola 0,33", artikel: "cola", anzahl: 6, ausschankMl: null },
    { rohbez: "Wein A",    artikel: "w1",   anzahl: 1, ausschankMl: null },
    { rohbez: "Wein B",    artikel: "w2",   anzahl: 3, ausschankMl: null },
    { rohbez: "Glaswein",  artikel: "w9",   anzahl: 12, ausschankMl: 125 },
    { rohbez: "Unbekannt", artikel: null,   anzahl: 4, ausschankMl: null }
  ]};

  test("gefasst wird aus allen Fächern zusammengezählt", () => {
    assert.deepEqual(rechne.gefassteMengen(vorgang), { w1: 2, w2: 3, cola: 6 });
  });

  test("nur, was auseinandergeht — hier eine Zeile", () => {
    const a = rechne.abgleichZeilen(vorgang, zBericht);
    assert.equal(a.zeilen.length, 1, JSON.stringify(a.zeilen));
    assert.deepEqual(a.zeilen[0], { id: "w1", gefasst: 2, verkauft: 1, diff: 1 });
  });

  test("Offenausschank und nicht zugeordnete Zeilen stehen im Fuss, nicht als Abweichung", () => {
    const a = rechne.abgleichZeilen(vorgang, zBericht);
    assert.equal(a.imGlas, 1);
    assert.equal(a.ohneZuordnung, 1);
    assert.equal(a.zeilen.some(z => z.id === "w9"), false,
      "eine Position im Glas wird als Abweichung behauptet");
  });

  test("`holtN` schlägt die Summe der Fächer — wie im Worker", () => {
    const v = Object.assign({}, vorgang, { holtN: { w1: 1 } });
    assert.equal(rechne.gefassteMengen(v).w1, 1);
  });

  test("gar keine Abweichung ergibt eine leere Liste", () => {
    const v = Object.assign({}, vorgang, { rest: { w1: 1 } });
    assert.equal(rechne.abgleichZeilen(v, zBericht).zeilen.length, 0);
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
  test("der Abschlussknopf hängt an der Verbindung", () => {
    assert.match(APP, /function verbunden\(\)/);
    assert.match(APP, /function finishNetz\(\)/);
    assert.match(APP, /fb\.setAttribute\("data-netz","1"\)/);
    assert.match(APP, /fb\.disabled=!an;/);
    assert.match(APP, /hn\.textContent="Keine Verbindung"/);
    /* Eine abgelaufene Sitzung ist keine fehlende Verbindung. */
    assert.match(APP, /NETZ\.zustand==="abgemeldet"\s*\n?\s*\? "Nicht angemeldet – bitte neu anmelden"/);
  });
  test("er wird von selbst wieder drückbar", () => {
    /* netzChip() läuft bei online/offline, nach jeder Übertragung und in
       der 45-s-Runde. Steht finishNetz() dort, kommt der Knopf ohne
       Zutun zurück. */
    const chip = APP.slice(APP.indexOf("function netzChip()"),
                           APP.indexOf("const OHNE_NETZ="));
    assert.match(chip, /finishNetz\(\);/,
      "der Knopf wird nicht nachgeführt und bleibt grau");
    assert.match(APP, /\.finishbtn:disabled\{/, "der gesperrte Knopf ist nicht ausgegraut");
  });
  test("das Gefasste bleibt im Gerät, auch ohne Verbindung", () => {
    /* Der Knopf sperrt den ABSCHLUSS, nicht das Speichern. `save()` läuft
       bei jeder Änderung weiter und hängt an nichts Netzartigem. */
    assert.match(APP, /function save\(\)/);
    const save = APP.slice(APP.indexOf("function save()"), APP.indexOf("function save()") + 400);
    assert.doesNotMatch(save, /verbunden\(\)|fetch\(/,
      "das Speichern im Gerät hängt an der Verbindung");
  });
});
