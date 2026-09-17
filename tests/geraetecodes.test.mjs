/* Was sich ein Gerät an Codes merkt (`hh_bekannt`).

   Der Vorrat ist die Rückfallebene für den Keller ohne Netz: Dort prüft
   niemand mehr beim Server, es zählt, was das Gerät kennt. Damit hängt an
   ihm auch die Auflage vor dem Livegang — die vier ersten Codes des Hauses
   stehen in der Geschichte des Anhangs und werden ersetzt. Ein ersetzter
   Code, der auf dem iPad liegen bleibt, macht die Ersetzung wertlos.

   Geprüft wird der ausgelieferte Ausschnitt selbst, in einer eigenen
   Umgebung mit einer Attrappe für localStorage. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt } from "./hilfe/dateien.mjs";
import { randomInt } from "node:crypto";

/* Gewürfelt statt festgeschrieben: keine erfundene Ziffernfolge soll je
   zufällig mit einem Code aus dem Haus zusammenfallen (Regel 9). */
const wuerfel = (n = 6) => String(randomInt(10 ** (n - 1), 10 ** n));
const NEU = wuerfel(), ALT = wuerfel(4), ANDERE = wuerfel();

const QUELLE = ausschnitt('const K_BEKANNT="', "const USER={}");

/* Der Schlüssel steht im ausgelieferten Ausschnitt selbst — wird er dort
   umbenannt, liest die Prüfung den neuen und behauptet nichts Altes. */
const SCHLUESSEL = /const K_BEKANNT="([^"]+)"/.exec(QUELLE)[1];

function geraet(vorbelegt = null) {
  const speicher = new Map();
  if (vorbelegt) speicher.set(SCHLUESSEL, JSON.stringify(vorbelegt));
  const sandkasten = { console, crypto, TextEncoder,
    localStorage: {
      getItem: k => (speicher.has(k) ? speicher.get(k) : null),
      setItem: (k, v) => speicher.set(k, String(v)),
      removeItem: k => speicher.delete(k)
    } };
  vm.createContext(sandkasten);
  vm.runInContext(QUELLE, sandkasten, { filename: "index.html#codes" });
  return { k: sandkasten,
    vorrat: () => JSON.parse(speicher.get(SCHLUESSEL) || "{}") };
}

describe("Codevorrat des Geräts", () => {
  test("ein gemerkter Code führt zurück auf den Namen", async () => {
    const g = geraet();
    await g.k.merkeCode(NEU, "Lena");
    assert.equal(await g.k.bekannterCode(NEU), "Lena");
    assert.equal(await g.k.bekannterCode(wuerfel()), null);
  });

  test("der Code steht nicht im Klartext im Gerät", async () => {
    const g = geraet();
    await g.k.merkeCode(NEU, "Lena");
    assert.equal(JSON.stringify(g.vorrat()).includes(NEU), false);
  });

  test("ein ersetzter Code verschwindet, sobald der neue bestätigt ist",
    async () => {
      const g = geraet();
      await g.k.merkeCode(ALT, "Lena");             /* der alte, vierstellige */
      assert.equal(await g.k.bekannterCode(ALT), "Lena");
      await g.k.merkeCode(NEU, "Lena");             /* der neue vom Server */
      assert.equal(await g.k.bekannterCode(ALT), null,
        "der ersetzte Code kommt ohne Netz weiter hinein");
      assert.equal(await g.k.bekannterCode(NEU), "Lena");
      assert.equal(Object.keys(g.vorrat()).length, 1, "genau ein Code je Person");
    });

  test("die Codes der anderen im Haus bleiben unangetastet", async () => {
    const g = geraet();
    await g.k.merkeCode(NEU, "Lena");
    await g.k.merkeCode(ANDERE, "Asad");
    await g.k.merkeCode(wuerfel(), "Lena");
    assert.equal(await g.k.bekannterCode(ANDERE), "Asad");
    assert.equal(Object.keys(g.vorrat()).length, 2);
  });
});
