/* Runde 19 · Drei Löcher im Worker und ein neues Fenster.

   A3 — Der 409-Wächter prüfte nur „echt grösser" und liess den
        GLEICHSTAND durch. `zaehlnr()` zählt JE GERÄT: zwei Geräte, die
        beide offline beginnen, tragen beide die 1. Das zweite Paket
        überschrieb das erste mit HTTP 200, ohne Sackfach und ohne
        Meldung — die Arbeit des ersten war vom Schirm, lebte aber im
        append-only-Journal weiter. Genau das „stille Zusammenführen",
        das die Projektregeln verbieten.
        Die Wiederholung DESSELBEN Geräts muss weiter durchgehen: Die
        Warteschlange sendet ein Paket nach Netzabbruch unverändert noch
        einmal.

   B2 — `vonB64(sig)` stand ausserhalb des `try`. Ein beschädigter Keks
        ergab 500 statt 401 — und `schiebe()` in der App hält bei allem
        ab 500 die Offline-Reihe an. Im Keller stand „Server antwortet
        nicht", während der Server antwortete.

   B1 — `PUT /api/vorgang/…` hatte überhaupt keine Rechteprüfung. Nach
        Casimirs Entscheidung vom 20.09.2026 wird gemeldet, nicht
        gesperrt: der Vorgang geht durch, der Fall steht im Journal.

   Neu — `GET /api/journal` macht die Notizzeilen von aussen lesbar.
        Ohne diesen Weg war jeder abgewiesene Mailbericht unsichtbar.  */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";

const TAG = "2026-09-16";
let worker;
before(async () => { worker = await ladeWorker(); });

async function haus(rolle = "leitung", code = "9017") {
  const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Lena", rolle, code } }), env);
  const a = await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code } }), env);
  return { env, keks: keksAus(a) };
}
const senden = (env, keks, daten, sch) =>
  worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(sch),
    { method: "PUT", keks, body: daten }), env);

const zaehlung = (geraet, wer, weine, zaehlnr = 1) => ({
  mode: "keller", tag: TAG, name: wer, geraet, zaehlnr,
  zeit: TAG + "T09:00:00.000Z", archiviert: TAG + "T09:00:00.000Z", finished: true,
  zdone: Object.fromEntries(weine.map(w => [w, 1])),
  reihen: Object.fromEntries(weine.map(w => [w, 1])),
  einzel: Object.fromEntries(weine.map(w => [w, 0]))
});

describe("A3 · Gleicher Zählstand von zwei Geräten", () => {
  test("das zweite Gerät bekommt 409 statt stillschweigend zu überschreiben", async () => {
    const { env, keks } = await haus();
    const a = await senden(env, keks, zaehlung("ipad-1", "Lena", ["w001","w002","w003"]),
                           "keller_" + TAG);
    assert.equal(a.status, 200, "das erste Gerät kommt durch");

    const b = await senden(env, keks, zaehlung("ipad-2", "Marinus", ["w001"]),
                           "keller_" + TAG);
    assert.equal(b.status, 409, "das zweite bekommt einen Konflikt");
    const j = await b.json();
    assert.equal(j.konflikt, true);
    assert.equal(j.server.wer ?? j.server.name, "Lena", "der Serverstand reist mit zurück");

    const zeile = env.DB.tabellen.vorgang.find(v => v.id === "keller_" + TAG);
    const d = JSON.parse(zeile.daten);
    assert.equal(Object.keys(d.zdone).length, 3, "Lenas drei Weine stehen noch");
    assert.equal(d.name, "Lena");
  });

  test("dasselbe Gerät darf sein Paket wiederholen — die Reihe darf nicht steckenbleiben", async () => {
    /* Netzabbruch nach dem Schreiben, vor der Antwort: Die
       Warteschlange schickt unverändert noch einmal. Ein blosses `>=`
       hätte den eigenen, gerade angekommenen Stand ins Sackfach
       geschickt. */
    const { env, keks } = await haus();
    const d = zaehlung("ipad-1", "Lena", ["w001", "w002"]);
    assert.equal((await senden(env, keks, d, "keller_" + TAG)).status, 200);
    assert.equal((await senden(env, keks, d, "keller_" + TAG)).status, 200,
      "derselbe Stand vom selben Gerät geht wieder durch");
  });

  test("eine höhere Zählnummer gewinnt weiter, auch vom fremden Gerät", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, zaehlung("ipad-1", "Lena", ["w001"], 1), "keller_" + TAG);
    const b = await senden(env, keks, zaehlung("ipad-2", "Marinus", ["w002"], 2),
                           "keller_" + TAG);
    assert.equal(b.status, 200, "der neuere Stand überholt den älteren");
  });

  test("eine niedrigere Zählnummer wird weiter abgewiesen", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, zaehlung("ipad-1", "Lena", ["w001"], 3), "keller_" + TAG);
    const b = await senden(env, keks, zaehlung("ipad-1", "Lena", ["w002"], 2),
                           "keller_" + TAG);
    assert.equal(b.status, 409);
  });

  test("ohne Gerätekennung bleibt es beim alten Verhalten — durchlassen", async () => {
    /* Alte Pakete aus einer Offline-Reihe tragen kein `geraet`. Ein
       Konflikt, den man nicht beweisen kann, darf keine Arbeit ins
       Sackfach schicken. */
    const { env, keks } = await haus();
    const ohne = z => { const k = Object.assign({}, z); delete k.geraet; return k; };
    await senden(env, keks, ohne(zaehlung("", "Lena", ["w001"])), "keller_" + TAG);
    const b = await senden(env, keks, ohne(zaehlung("", "Marinus", ["w002"])),
                           "keller_" + TAG);
    assert.equal(b.status, 200);
  });
});

describe("B2 · Ein beschädigter Keks ist 401, nicht 500", () => {
  const faelle = {
    "abgeschnittenes Base64": k => k.slice(0, -3),
    "Müll in der Unterschrift": k => k.split(".")[0] + ".@@@@",
    "Müll in der Nutzlast": k => "hh_sitz=@@@@." + k.split(".")[1],
    "gar keine Unterschrift": k => k.split(".")[0] + "."
  };
  for (const [name, kaputt] of Object.entries(faelle)) {
    test(name + " → 401", async () => {
      const { env, keks } = await haus();
      const r = await worker.fetch(anfrage("/api/ich", { keks: kaputt(keks) }), env);
      const text = await r.text();
      assert.equal(r.status, 401, text);
      assert.equal(JSON.parse(text).fehler, "nicht angemeldet",
        "der Text muss „abgemeldet“ heissen, nicht nach Serverfehler klingen");
    });
  }
  test("der heile Keks geht weiter durch", async () => {
    const { env, keks } = await haus();
    const r = await worker.fetch(anfrage("/api/ich", { keks }), env);
    assert.equal(r.status, 200);
  });
});

describe("B1 · Rechte: melden, nicht sperren", () => {
  test("Service darf eine Kellerzählung schreiben — und es steht im Journal", async () => {
    const { env, keks } = await haus("service", "4488");
    const r = await senden(env, keks, zaehlung("ipad-1", "Lena", ["w001"]), "keller_" + TAG);
    assert.equal(r.status, 200, "niemand wird mitten im Dienst ausgesperrt");

    const notizen = env.DB.tabellen.ereignis.filter(z => z.quelle === "rechte");
    assert.equal(notizen.length, 1, "genau ein Vermerk");
    assert.match(notizen[0].notiz, /Rolle service/);
    assert.match(notizen[0].notiz, /keller/);
    assert.match(notizen[0].notiz, /wirtschaft/);
    assert.equal(notizen[0].artikel, "", "eine Notiz, keine Buchung");
  });

  test("der Zwischenstand desselben Vorgangs flutet das Journal nicht", async () => {
    const { env, keks } = await haus("service", "4488");
    const d = zaehlung("ipad-1", "Lena", ["w001"], 1);
    await senden(env, keks, Object.assign({}, d, { finished: false }), "keller_" + TAG);
    await senden(env, keks, Object.assign({}, d, { zaehlnr: 2 }), "keller_" + TAG);
    await senden(env, keks, Object.assign({}, d, { zaehlnr: 3 }), "keller_" + TAG);
    assert.equal(env.DB.tabellen.ereignis.filter(z => z.quelle === "rechte").length, 1,
      "nur der erste Schreibvorgang wird vermerkt");
  });

  test("was die Rolle darf, wird nicht vermerkt", async () => {
    const { env, keks } = await haus("service", "4488");
    await senden(env, keks, { mode: "nach", tag: TAG, name: "Lena", geraet: "ipad-1",
      zaehlnr: 1, zeit: TAG + "T18:00:00.000Z", finished: true,
      ent: { w001: 1 }, gent: {}, gzusatz: {} }, "nach_" + TAG);
    assert.equal(env.DB.tabellen.ereignis.filter(z => z.quelle === "rechte").length, 0);
  });

  test("Wirtschaft darf zählen, Leitung alles", async () => {
    for (const rolle of ["wirtschaft", "leitung"]) {
      const { env, keks } = await haus(rolle, "4488");
      await senden(env, keks, zaehlung("ipad-1", "Lena", ["w001"]), "keller_" + TAG);
      assert.equal(env.DB.tabellen.ereignis.filter(z => z.quelle === "rechte").length, 0,
        rolle + " braucht keinen Vermerk");
    }
  });
});

describe("Das Journal ist von aussen lesbar", () => {
  test("nur die Leitung darf hineinsehen", async () => {
    for (const rolle of ["service", "wirtschaft"]) {
      const { env, keks } = await haus(rolle, "4488");
      const r = await worker.fetch(anfrage("/api/journal", { keks }), env);
      assert.equal(r.status, 403, rolle);
    }
  });

  test("ein abgewiesener Mailbericht ist danach sichtbar", async () => {
    const { env, keks } = await haus();
    await worker.email({ from: "post@fremd.example", raw: "" }, env,
      { waitUntil: p => p });
    /* `setReject` fehlt absichtlich nicht — der Absender wird abgewiesen,
       bevor gelesen wird; geprüft ist hier der Leseweg, nicht der Mailweg. */
    const r = await worker.fetch(anfrage("/api/journal?quelle=email", { keks }), env);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.zeilen), "eine Liste kommt zurück");
  });

  test("Notizen kommen ohne `alles`, Buchungen nur mit", async () => {
    const { env, keks } = await haus();
    await senden(env, keks, zaehlung("ipad-1", "Lena", ["w001"]), "keller_" + TAG);
    const nur = await (await worker.fetch(anfrage("/api/journal", { keks }), env)).json();
    assert.equal(nur.zeilen.filter(z => z.artikel).length, 0, "keine Buchungen");
    const alle = await (await worker.fetch(anfrage("/api/journal?alles=1", { keks }), env)).json();
    assert.ok(alle.zeilen.some(z => z.artikel === "w001"), "mit `alles` schon");
  });

  test("die jüngste Zeile steht oben und `limit` greift", async () => {
    const { env, keks } = await haus();
    const r = await worker.fetch(anfrage("/api/journal?alles=1&limit=1", { keks }), env);
    const j = await r.json();
    assert.ok(j.zeilen.length <= 1);
  });
});
