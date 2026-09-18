/* Betriebstag · F1 (18.09.2026)

   Der Befund vom iPhone: Am Freitag, 18.09., stand im Kopf der
   Tagesfassung „Für Donnerstag, 17.09.2026", während die Kellerzählung
   auf demselben Gerät „Für Freitag, 18.09.2026" schrieb. Zwei Ursachen
   lagen übereinander:

     1. `today()`/`yest()` lasen den Tag aus `toISOString()` — das ist UTC.
        Zwischen Mitternacht und 02:00 Ortszeit (Sommerzeit) ist das der
        Vortag.
     2. `blank()` zog für den Modus `tag` zusätzlich einen weiteren Tag ab.

   Ein Vorgang trägt den Schlüssel `<modus>_<tag>`. Rechnen zwei Stellen
   verschieden, liegt ein Abend unter zwei Schlüsseln — deshalb prüft
   diese Datei alle drei Stellen, die einen Betriebstag bilden: App,
   Backoffice, Worker.                                                   */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt, lies } from "./hilfe/dateien.mjs";

const QUELLE = ausschnitt("function wienTag(d){", "function blank(m){");

function tage(iso) {
  const s = { Intl, Date };
  vm.createContext(s);
  vm.runInContext(
    `const __echt = Date;
     Date = class extends __echt {
       constructor(...a){ return a.length ? new __echt(...a) : new __echt(${JSON.stringify(iso)}); }
       static now(){ return new __echt(${JSON.stringify(iso)}).getTime(); }
     };
     ${QUELLE}
     globalThis.__f = { today, yest, wienTag, tagMinus };`, s,
    { filename: "index.html#betriebstag" });
  return s.__f;
}

describe("Betriebstag wird in Europe/Vienna gebildet", () => {
  test("23:30 UTC ist in Wien schon der nächste Tag", () => {
    /* 18.09.2026 23:30 UTC = 19.09.2026 01:30 Wien (MESZ, UTC+2).
       Die alte Rechnung über toISOString() ergab hier den 18. */
    const f = tage("2026-09-18T23:30:00Z");
    assert.equal(f.today(), "2026-09-19");
    assert.equal(f.yest(), "2026-09-18");
  });

  test("mitten am Tag stimmen Wien und UTC überein", () => {
    const f = tage("2026-09-18T10:00:00Z");
    assert.equal(f.today(), "2026-09-18");
    assert.equal(f.yest(), "2026-09-17");
  });

  test("im Winter gilt UTC+1, nicht UTC+2", () => {
    /* 01.12.2026 23:30 UTC = 02.12.2026 00:30 Wien (MEZ, UTC+1). */
    assert.equal(tage("2026-12-01T23:30:00Z").today(), "2026-12-02");
    /* 01.12.2026 22:30 UTC = 01.12.2026 23:30 Wien — noch derselbe Tag. */
    assert.equal(tage("2026-12-01T22:30:00Z").today(), "2026-12-01");
  });

  test("tagMinus springt über die Zeitumstellung, ohne zu verrutschen", () => {
    const f = tage("2026-10-26T09:00:00Z");
    /* In der Nacht auf den 25.10.2026 wird zurückgestellt. */
    assert.equal(f.tagMinus("2026-10-26", 1), "2026-10-25");
    assert.equal(f.tagMinus("2026-10-25", 1), "2026-10-24");
    assert.equal(f.tagMinus("2026-03-30", 1), "2026-03-29");
  });
});

describe("Jeder Modus schlägt denselben Tag vor", () => {
  test("blank() datiert die Tagesfassung nicht mehr zurück", () => {
    const b = ausschnitt("function blank(m){", "function load(){");
    /* `vorgabeTag()` ist `today()`, solange niemand in der Begrüßung (F9)
       einen anderen Tag gewählt hat — siehe die Prüfung darunter. */
    assert.match(b, /tag:vorgabeTag\(\)/,
      "blank() muss für jeden Modus den vorgeschlagenen Tag setzen");
    assert.doesNotMatch(b, /yest\(\)/,
      "blank() darf keinen Modus auf den Vortag legen");
  });

  test("der vorgeschlagene Tag ist heute, solange niemand ihn ändert", () => {
    const v = ausschnitt("function vorgabeTag(){", "\n");
    assert.match(v, /return tagWahl\(\)\|\|today\(\)/);
  });

  test("eine Tageswahl aus der Begrüßung verfällt am nächsten Tag", () => {
    const w = ausschnitt("function tagWahl(){", "function setTagWahl");
    assert.match(w, /r\.am!==wienTag\(\)/,
      "eine am Vorabend gewählte Tageswahl darf am Morgen nicht weitergelten");
  });
});

describe("App, Backoffice und Worker rechnen denselben Tag", () => {
  const dateien = ["public/index.html", "public/leitung.html", "src/index.js"];

  for (const d of dateien) {
    test(d + " bildet den Betriebstag in Europe/Vienna", () => {
      assert.match(lies(d), /timeZone:\s*"Europe\/Vienna"/,
        d + " kennt keine Zeitzone für den Betriebstag");
    });

    test(d + " bildet keinen Betriebstag mehr aus UTC", () => {
      /* `new Date().toISOString().slice(0,10)` ist genau der Griff, der den
         Befund erzeugt hat. Zeitstempel (volles toISOString) bleiben
         erlaubt — nur das Abschneiden auf den Tag ist verboten. */
      const roh = lies(d);
      const treffer = [...roh.matchAll(/new Date\([^)]*\)\.toISOString\(\)\.slice\(0,\s*10\)/g)];
      assert.equal(treffer.length, 0,
        d + ": " + treffer.map(t => t[0]).join(", "));
    });
  }
});
