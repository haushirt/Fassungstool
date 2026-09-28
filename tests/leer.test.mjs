/* Runde 24 · „Leer" und die Reihenfolge der Kellerzählung.

   Casimir, 28.09.2026: Ist ein Wein aus, stand in der Kellerzählung 0 —
   und 0 hiess für das Tool „nicht gezählt". Dazu lief die Zählung nach
   den Kellerzonen, nicht in der Reihenfolge der Tagesfassung.

   Geprüft wird:
   · Eine als leer gezählte Position setzt den Bestand auf 0 — im Worker
     UND im Backoffice. Bis v73 schrieb der Worker für eine gezählte 0
     keine Zeile; der alte Bestand blieb stehen.
   · „Leer" beim Holen (abgehakt, Menge 0) steht im Backoffice als eigener
     Block „Im Lager leer".
   · Die Kellerzählung folgt Schrank 1 bis 4 wie die Tagesfassung.       */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ladeWorker, anfrage, keksAus } from "./hilfe/worker.mjs";
import { d1Echt } from "./hilfe/d1-echt.mjs";
import { ausschnitt, lies } from "./hilfe/dateien.mjs";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");
function backoffice() {
  const stumm = { classList: { add() {}, remove() {} }, textContent: "" };
  const s = { console, setTimeout, clearTimeout,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => stumm },
    fetch: async () => new Response("{}", { status: 200 }) };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.__b = { normVorgang,
      rechne: liste => { VORGAENGE = liste.map(normVorgang).filter(Boolean).sort(nachZeit);
                         return bestand(); } };`, s, { filename: "leitung.html#leer" });
  return s.__b;
}

const CODE = "6610";                 /* nur in dieser Prüfung */
let worker, B;
before(async () => { worker = await ladeWorker(); B = backoffice(); });

async function spiele(schritte) {
  const env = { DB: d1Echt(), TOKEN_SECRET: "pruefgeheimnis", ANLAGE_OFFEN: "1" };
  await worker.fetch(anfrage("/api/anlage",
    { method: "POST", body: { name: "Asad", rolle: "wirtschaft", code: CODE } }), env);
  const keks = keksAus(await worker.fetch(anfrage("/api/anmelden",
    { method: "POST", body: { code: CODE } }), env));
  const liste = [];
  for (const d of schritte) {
    const a = await worker.fetch(anfrage("/api/vorgang/" + encodeURIComponent(d.mode + "_" + d.tag),
      { method: "PUT", keks, body: d }), env);
    assert.equal(a.status, 200);
    liste.push(Object.assign({}, d, { archiviert: new Date().toISOString() }));
    await new Promise(r => setTimeout(r, 3));
  }
  const j = await (await worker.fetch(anfrage("/api/bestand", { keks }), env)).json();
  return { worker: j, backoffice: B.rechne(liste), env };
}
const zaehlung = (tag, reihen, einzel) => ({
  mode: "keller", tag, name: "Asad", geraet: "ipad-1", zaehlnr: 1, finished: true,
  zdone: { w003: 1 }, reihen: reihen ? { w003: reihen } : {}, einzel: einzel ? { w003: einzel } : {}, getr: {}
});

describe("Leer gezählt", () => {
  test("setzt den Bestand auf 0 — Worker und Backoffice gleich", async () => {
    const e = await spiele([zaehlung("2026-09-15", 1, 4), zaehlung("2026-09-16", 0, 0)]);
    assert.equal(e.worker.bestand.w003, 0, "Worker");
    assert.equal(e.backoffice.b.w003, 0, "Backoffice");
    const z = e.env.DB.tabellen.ereignis.filter(r => r.art === "zaehlung" && r.vorgang === "keller_2026-09-16");
    assert.equal(z.length, 1, "die gezählte 0 steht als eigene Zeile im Journal");
    assert.equal(+z[0].menge, 0);
  });
});

describe("Leer beim Holen", () => {
  test("steht im Backoffice als „Im Lager leer“", () => {
    const v = B.normVorgang({ mode: "tag", tag: "2026-09-16", name: "Asad", finished: true,
      rest: { w003: 2 }, bar: {}, barrot: {}, backup: {}, holt: { w003: 1 }, holtN: { w003: 0 },
      gholt: { cola: 1 }, gholtN: { cola: 0 }, getr: {}, gent: {} });
    assert.deepEqual({ ...v.leer }, { w003: 0, cola: 0 });
    assert.equal(v.verbraucht.w003, 2, "oben gefehlt bleibt für den Z-Bericht");
    assert.equal(v.wein.w003, undefined, "aus dem Keller kam nichts");
  });
  test("eine blosse Abweichung ohne Haken ist nicht leer", () => {
    const v = B.normVorgang({ mode: "tag", tag: "2026-09-16", name: "Asad", finished: true,
      rest: { w003: 2 }, holt: {}, holtN: { w003: 0 }, getr: {}, gent: {} });
    assert.equal(v.leer, undefined);
  });
});

describe("Reihenfolge der Kellerzählung", () => {
  test("Schrank 1 bis 4 wie in der Tagesfassung, danach Bubbles", () => {
    const h = lies("public/index.html");
    const nimm = (a, e) => { const i = h.indexOf(a); return h.slice(i, h.indexOf(e, i)); };
    const s = {};
    vm.createContext(s);
    vm.runInContext(nimm("const WINES = ", "\n") + ";" + nimm("const PLAN = ", "\n") + ";" +
      nimm("const SCHRANK=", "\n\nconst MODES") + nimm("const WIDX=", "\nconst g=") +
      nimm("const ZGRUPPEN=", "function rZaehl(") +
      "globalThis.__r=zaehlGruppen().map(g=>[g.t,g.list.map(w=>w.id)]);", s);
    const G = s.__r;
    assert.deepEqual([...G].map(g => g[0]),
      ["Rotwein kräftig", "Rotwein fein & Cuvées", "Weisswein klassisch",
       "Weiss übrige, Rosé, Natur", "Bubbles"]);
    const alle = [...G].flatMap(g => [...g[1]]);
    assert.equal(new Set(alle).size, alle.length, "kein Wein doppelt");
    const P = JSON.parse(nimm("const PLAN = ", "\n").slice(13).replace(/;$/, ""));
    const rest = alle.filter(id => P.restorder[id] != null);
    const sortiert = [...rest].sort((a, b) => P.restorder[a] - P.restorder[b]);
    assert.deepEqual(rest, sortiert, "dieselbe Folge wie die Schränke im Restaurant");
  });
});
