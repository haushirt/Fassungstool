/* Der Ausgang (hh_ausgang_v1) der App: offline → online, doppeltes
   Absenden, Abbruch mitten in der Eingabe, abgelaufene Sitzung.

   Der Ausschnitt wird aus `public/index.html` herausgeschnitten und in
   einer eigenen Umgebung ausgeführt — mit Attrappen für localStorage
   und fetch. So prüft die Prüfung den ausgelieferten Code selbst, nicht
   eine Abschrift davon. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt } from "./hilfe/dateien.mjs";

const QUELLE = ausschnitt('const API="/api";', "async function zieheFern()");

function umgebung(antwortet) {
  const speicher = new Map();
  const gesendet = [];
  const sandkasten = {
    console, crypto,
    localStorage: {
      getItem: k => (speicher.has(k) ? speicher.get(k) : null),
      setItem: (k, v) => speicher.set(k, String(v)),
      removeItem: k => speicher.delete(k)
    },
    navigator: { onLine: true },
    whoAmI: () => "Asad",
    netzChip: () => {},
    fetch: async (u, o) => {
      gesendet.push({ url: u, daten: JSON.parse(o.body) });
      return antwortet(gesendet.length, u, o);
    }
  };
  vm.createContext(sandkasten);
  /* `let NETZ` bleibt im Geltungsbereich des Ausschnitts — eine Zeile
     reicht ihn heraus, ohne den Quelltext zu verändern. */
  vm.runInContext(QUELLE + "\nglobalThis.__netz = () => NETZ;",
    sandkasten, { filename: "index.html#ausgang" });
  return { k: sandkasten, speicher, gesendet,
    netz: () => sandkasten.__netz(),
    ausgang: () => JSON.parse(speicher.get("hh_ausgang_v1") || "[]") };
}

const antwort = (status, koerper = {}) => new Response(
  JSON.stringify(koerper), { status, headers: { "content-type": "application/json" } });

const fassung = (mehr = {}) => ({ mode: "tag", tag: "2026-09-16",
  barrot: { w001: 2 }, rest: {}, ...mehr });

describe("Ausgang: was im Gerät liegt", () => {
  test("je Schlüssel höchstens ein Eintrag — der neuere ersetzt den älteren", () => {
    const u = umgebung(() => antwort(200));
    u.k.inDenAusgang(fassung({ barrot: { w001: 1 } }), "laeuft");
    u.k.inDenAusgang(fassung({ barrot: { w001: 2 } }), "laeuft");
    u.k.inDenAusgang(fassung({ barrot: { w001: 3 } }), "fertig");
    const a = u.ausgang();
    assert.equal(a.length, 1);
    assert.equal(a[0].schluessel, "tag_2026-09-16");
    assert.equal(a[0].daten.barrot.w001, 3, "der letzte Stand gewinnt");
    assert.equal(a[0].daten.zaehlnr, 3, "die Zählnummer wächst trotzdem weiter");
  });

  test("verschiedene Vorgänge liegen nebeneinander", () => {
    const u = umgebung(() => antwort(200));
    u.k.inDenAusgang(fassung(), "laeuft");
    u.k.inDenAusgang({ mode: "nach", tag: "2026-09-17", ent: { w002: 1 } }, "fertig");
    assert.deepEqual(u.ausgang().map(x => x.schluessel),
      ["tag_2026-09-16", "nach_2026-09-17"]);
  });

  test("ein halb ausgefüllter Vorgang ohne Tag geht nicht in den Ausgang", () => {
    const u = umgebung(() => antwort(200));
    u.k.inDenAusgang({ mode: "tag" }, "laeuft");
    u.k.inDenAusgang(null, "laeuft");
    assert.equal(u.ausgang().length, 0);
  });

  test("Gerät, Zählnummer, Name und Zeit reisen im Vorgang mit", () => {
    const u = umgebung(() => antwort(200));
    u.k.inDenAusgang(fassung(), "laeuft");
    const d = u.ausgang()[0].daten;
    assert.ok(d.geraet, "Gerätekennung gesetzt");
    assert.equal(d.zaehlnr, 1);
    assert.equal(d.name, "Asad");
    assert.match(d.zeit, /^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("Ausgang: offline und wieder online", () => {
  test("kein Netz: nichts geht verloren, der Zustand heisst offline", async () => {
    const u = umgebung(() => { throw new TypeError("Failed to fetch"); });
    u.k.inDenAusgang(fassung(), "fertig");
    await u.k.schiebe();
    assert.equal(u.ausgang().length, 1, "der Vorgang bleibt im Gerät");
    assert.equal(u.netz().zustand, "offline");
    assert.equal(u.netz().offen, 1);
  });

  test("Netz zurück: der Vorgang geht raus, der Ausgang ist leer", async () => {
    let netz = false;
    const u = umgebung(() => {
      if (!netz) throw new TypeError("Failed to fetch");
      return antwort(200, { gespeichert: true });
    });
    u.k.inDenAusgang(fassung(), "fertig");
    await u.k.schiebe();
    netz = true;
    await u.k.schiebe();
    assert.equal(u.ausgang().length, 0);
    assert.equal(u.netz().zustand, "verbunden");
    assert.equal(u.gesendet.at(-1).url, "/api/vorgang/tag_2026-09-16",
      "der Schlüssel modus_tag ist die Kennung");
  });

  test("zweimal schieben schickt nicht zweimal", async () => {
    const u = umgebung(() => antwort(200));
    u.k.inDenAusgang(fassung(), "fertig");
    await u.k.schiebe();
    await u.k.schiebe();
    assert.equal(u.gesendet.length, 1);
  });

  test("Netzabbruch mittendrin: der Rest bleibt in der Reihe", async () => {
    const u = umgebung(n => {
      if (n === 2) throw new TypeError("Failed to fetch");
      return antwort(200);
    });
    u.k.inDenAusgang(fassung(), "fertig");
    u.k.inDenAusgang({ mode: "nach", tag: "2026-09-17", ent: { w002: 1 } }, "fertig");
    u.k.inDenAusgang({ mode: "keller", tag: "2026-09-17" }, "fertig");
    await u.k.schiebe();
    assert.deepEqual(u.ausgang().map(x => x.schluessel),
      ["nach_2026-09-17", "keller_2026-09-17"]);
    assert.equal(u.netz().offen, 2);
  });

  test("abgelaufene Sitzung (401): nichts geht verloren, der Zustand sagt es", async () => {
    const u = umgebung(() => antwort(401, { fehler: "nicht angemeldet" }));
    u.k.inDenAusgang(fassung(), "fertig");
    await u.k.schiebe();
    assert.equal(u.ausgang().length, 1);
    assert.equal(u.netz().zustand, "abgemeldet");
  });

  test("Serverfehler (500) und Sperre (429) halten den Vorgang fest", async () => {
    for (const s of [500, 429]) {
      const u = umgebung(() => antwort(s, { fehler: "x" }));
      u.k.inDenAusgang(fassung(), "fertig");
      await u.k.schiebe();
      assert.equal(u.ausgang().length, 1, "Status " + s);
      assert.equal(u.netz().zustand, "serverfehler");
    }
  });

  /* ── Bekannte Lücke (Backlog, mittel) ──────────────────────────────
     Ein Paket, das der Server dauerhaft mit 400 ablehnt, bleibt vorne
     in der Reihe stehen und hält alles dahinter auf. Stilles Verwerfen
     verbietet Regel 6 — es braucht ein Sackfach mit sichtbarem Hinweis.
     Wer das baut, schreibt diese Prüfung um, statt sie zu löschen. */
  test("dauerhaft abgelehntes Paket blockiert die Reihe (bekannt)", async () => {
    const u = umgebung(() => antwort(400, { fehler: "Körper ist kein gültiges JSON" }));
    u.k.inDenAusgang(fassung(), "fertig");
    u.k.inDenAusgang({ mode: "nach", tag: "2026-09-17", ent: { w002: 1 } }, "fertig");
    await u.k.schiebe();
    await u.k.schiebe();
    assert.equal(u.ausgang().length, 2, "beide stehen noch");
    assert.equal(u.gesendet.length, 2, "immer nur das vorderste wird versucht");
    assert.equal(u.netz().zustand, "serverfehler");
  });

  /* ── Zweite bekannte Lücke ─────────────────────────────────────────
     Bei 409 (auf einem anderen Gerät gibt es einen neueren Stand) wird
     der Eintrag verworfen und die Zeile meldet danach „alles
     übertragen". Wer gerade gezählt hat, erfährt nie, dass seine
     Zählung nicht angekommen ist. */
  test("409 verwirft den eigenen Stand und meldet trotzdem Vollzug (bekannt)", async () => {
    const u = umgebung(() => antwort(409, { konflikt: true, server: { zaehlnr: 9 } }));
    u.k.inDenAusgang(fassung(), "fertig");
    await u.k.schiebe();
    assert.equal(u.ausgang().length, 0);
    assert.equal(u.netz().zustand, "verbunden");
    assert.equal(u.netz().offen, 0);
  });
});

describe("Zählnummer", () => {
  test("zählt je Schlüssel getrennt und nur beim Senden hoch", () => {
    const u = umgebung(() => antwort(200));
    assert.equal(u.k.zaehlnr("tag_2026-09-16"), 0);
    u.k.inDenAusgang(fassung(), "laeuft");
    u.k.inDenAusgang({ mode: "nach", tag: "2026-09-16" }, "fertig");
    assert.equal(u.k.zaehlnr("tag_2026-09-16"), 1);
    assert.equal(u.k.zaehlnr("nach_2026-09-16"), 1);
    u.k.inDenAusgang(fassung(), "fertig");
    assert.equal(u.k.zaehlnr("tag_2026-09-16"), 2);
    assert.equal(u.k.zaehlnr("nach_2026-09-16"), 1);
  });

  test("überlebt einen Neustart der App (steht im Gerätespeicher)", () => {
    const u = umgebung(() => antwort(200));
    u.k.inDenAusgang(fassung(), "laeuft");
    assert.deepEqual(JSON.parse(u.speicher.get("hh_zaehlnr_v1")), { "tag_2026-09-16": 1 });
  });
});
