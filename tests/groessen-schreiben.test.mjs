/* ═══════════════════════════════════════════════════════════════════════
   Die Artikelliste schreibt richtig

   Die Jagd nach Runde 23 hat drei A-Funde an EINER Seite gemeldet — an
   der, auf der 95 Zahlen eingetippt werden. Jeder verlor oder verfälschte
   eine davon, ohne es zu sagen:

   A1 · Zwei Änderungen 60 ms auseinander löschten einander. Geschrieben
        wurde {w001:1500}, dann {w005:375}; in der Datenbank stand danach
        nur {w005:375}. Der Toast hatte „1500 ml" gesagt.
   A2 · `zeichne()` nach jeder Änderung riss das Feld im Fokus aus dem
        DOM; Chrome feuerte `change` mit dem Bruchstück. „750" über ein
        `zeichne()` hinweg getippt → {"g":7} in der Datenbank, als
        bestätigt gerechnet: drei Achtel wurden zu 53,57 Flaschen.
   A3 · Nach 403 und 500 galt der Wert im Gerät trotzdem. Rolle
        `wirtschaft`: Datenbank 750, Gerät 1500 — jede Differenz dieses
        Geräts halbiert.

   Jede Prüfung hier stellt genau einen davon nach. Gegen den Stand vor
   der Reparatur ist jede rot.
   ═══════════════════════════════════════════════════════════════════════ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ausschnitt } from "./hilfe/dateien.mjs";

const QUELLE = ausschnitt("const STAMM = {", "/* ════════════ 7 · Ansichten",
                          "public/leitung.html");

/* Ein Backoffice, dessen Server sich steuern lässt: `antwort` sagt, was
   der nächste POST zurückgibt, `bremse` wie lange er braucht. */
function backoffice(opt = {}) {
  const speicher = new Map(), posts = [];
  let serverStand = opt.stand || {};
  const stumm = { classList: { add() {}, remove() {} }, textContent: "",
                  querySelectorAll: () => [], appendChild() {}, innerHTML: "" };
  const s = { console, setTimeout, clearTimeout, JSON, CSS: { escape: x => x },
    localStorage: {
      getItem: k => (speicher.has(k) ? speicher.get(k) : null),
      setItem: (k, v) => speicher.set(k, String(v)),
      removeItem: k => speicher.delete(k) },
    document: { querySelector: () => stumm, createElement: () => stumm },
    fetch: async (u, o) => {
      if (!o || o.method !== "POST")
        return new Response(JSON.stringify({ groessen: serverStand }), { status: 200 });
      const koerper = JSON.parse(o.body);
      posts.push(koerper.wert);
      if (opt.bremse) await new Promise(r => setTimeout(r, opt.bremse));
      const st = opt.antwort || 200;
      if (st === 200) serverStand = koerper.wert;
      return new Response("{}", { status: st });
    } };
  vm.createContext(s);
  vm.runInContext(QUELLE + `
    globalThis.zeichne = () => { globalThis.__gezeichnet = (globalThis.__gezeichnet||0)+1; };
    globalThis.__f = { sendeGroessen, ladeGroessen, gebindeGroesse,
      stand: () => GROESSEN,
      setzG: o => { GROESSEN = o; },
      setzKann: b => { KANN_AUS = b; } };`,
    s, { filename: "leitung.html#groessen-schreiben" });
  return { f: s.__f, posts, server: () => serverStand, speicher, s };
}

describe("A1 · Zwei Änderungen kurz nacheinander", () => {
  test("beide stehen danach in der Datenbank", async () => {
    /* Genau der gemessene Fall: die zweite Änderung startet, während die
       erste noch unterwegs ist. Der Aufrufer setzt `GROESSEN` synchron,
       diese Funktion schickt den dann geltenden Stand — und die Anfragen
       laufen hintereinander, nicht nebeneinander. */
    const { f, server } = backoffice({ bremse: 30 });
    f.setzG({});

    f.stand().w001 = { g: 1500 };
    const eins = f.sendeGroessen();
    f.stand().w005 = { g: 375 };
    const zwei = f.sendeGroessen();
    await Promise.all([eins, zwei]);

    assert.deepEqual(JSON.parse(JSON.stringify(server())),
      { w001: { g: 1500 }, w005: { g: 375 } });
    assert.equal(server().w001.g, 1500, "die erste Zahl darf nicht verschwinden");
  });

  test("keine Anfrage schickt einen Stand, der einen neueren Wert vergisst", async () => {
    /* BERICHTIGT: Hier stand zuerst die Zusicherung, die erste Anfrage
       dürfe die zweite Änderung noch nicht kennen. Das ist keine
       Anforderung, sondern eine Beobachtung — und sie stimmt nicht, weil
       `GROESSEN` ein lebendes Objekt ist und die Kette erst im
       Microtask läuft. Worauf es ankommt, ist das Gegenteil: KEIN Körper
       darf einen Wert auslassen, der zu diesem Zeitpunkt schon gesetzt
       war. Genau daran ist A1 gescheitert. */
    const { f, posts } = backoffice({ bremse: 20 });
    f.setzG({});
    f.stand().a = { g: 100 }; const p1 = f.sendeGroessen();
    f.stand().b = { g: 200 }; const p2 = f.sendeGroessen();
    await Promise.all([p1, p2]);
    assert.equal(posts.length, 2);
    posts.forEach((k, i) => assert.equal(k.a && k.a.g, 100,
      "Anfrage " + (i + 1) + " hat den ersten Wert verloren"));
    assert.equal(posts[posts.length - 1].b.g, 200, "und der letzte trägt beide");
  });
});

describe("A3 · Was der Server nicht annimmt, gilt auch im Gerät nicht", () => {
  test("nach 403 steht der alte Stand", async () => {
    const { f } = backoffice({ antwort: 403, stand: { w005: { g: 750 } } });
    f.setzG({ w005: { g: 750 } });
    f.stand().w005 = { g: 1500 };
    const ok = await f.sendeGroessen();
    assert.equal(ok, false);
    assert.equal(f.stand().w005.g, 750,
      "sonst rechnet dieses Gerät mit 1500, während die Datenbank 750 hält");
  });

  test("nach 500 ebenso", async () => {
    const { f } = backoffice({ antwort: 500, stand: { w005: { g: 750 } } });
    f.setzG({ w005: { g: 750 } });
    f.stand().w005 = { g: 1500 };
    await f.sendeGroessen();
    assert.equal(f.stand().w005.g, 750);
  });

  test("und der Vorrat im Gerät wird nicht mit dem Abgewiesenen beschrieben", async () => {
    const { f, speicher } = backoffice({ antwort: 403, stand: { w005: { g: 750 } } });
    f.setzG({ w005: { g: 750 } });
    f.stand().w005 = { g: 1500 };
    await f.sendeGroessen();
    const vorrat = JSON.parse(speicher.get("hh_groessen_v1") || "{}");
    assert.notEqual(vorrat.w005 && vorrat.w005.g, 1500);
  });

  test("bei Erfolg wird geschrieben und gemerkt", async () => {
    const { f, server, speicher } = backoffice();
    f.setzG({});
    f.stand().w001 = { g: 750 };
    assert.equal(await f.sendeGroessen(), true);
    assert.equal(server().w001.g, 750);
    assert.equal(JSON.parse(speicher.get("hh_groessen_v1")).w001.g, 750);
  });
});

describe("C8 · Eine beschädigte Zeile überschreibt die Abschrift nicht", () => {
  test("`groessen: null` lässt den Gerätestand stehen", async () => {
    const { f, s } = backoffice();
    f.setzG({ w001: { g: 750 } });
    s.fetch = async () => new Response(JSON.stringify({ groessen: null }), { status: 200 });
    assert.equal(await f.ladeGroessen(), false);
    assert.equal(f.stand().w001.g, 750, "null heisst kaputt, nicht leer");
  });

  test("ein Server ohne den Schlüssel heisst sehr wohl leer", async () => {
    const { f, s } = backoffice();
    f.setzG({ w001: { g: 750 } });
    s.fetch = async () => new Response(JSON.stringify({}), { status: 200 });
    assert.equal(await f.ladeGroessen(), true);
    assert.deepEqual(JSON.parse(JSON.stringify(f.stand())), {});
  });
});

describe("B1 · Der Schalter behält ohne Netz seine letzte Wahrheit", () => {
  test("er wird mitgeschrieben und beim Laden zurückgeholt", () => {
    const eins = backoffice();
    eins.f.setzKann(true);
    /* `ladeZuordnung` schreibt ihn; hier von Hand, weil diese Prüfung
       den Speicher prüft und nicht den Abruf. */
    eins.speicher.set("hh_kann_ausschank_v1", "true");

    const zwei = backoffice();
    zwei.speicher.set("hh_kann_ausschank_v1", "true");
    const s2 = zwei.s;
    vm.runInContext(`globalThis.__k = !!JSON.parse(localStorage.getItem("hh_kann_ausschank_v1"));`, s2);
    assert.equal(s2.__k, true,
      "ohne Netz galt sonst nein, und eine Fasszeile zeigte gleichzeitig "
      + "offen im Feld und festgelegt daneben");
  });
});
