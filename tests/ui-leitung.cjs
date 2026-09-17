/* Oberflächen-Aufnahme · Backoffice · NICHT Teil von `npm test`
   ─────────────────────────────────────────────────────────────
   `npm test` sammelt nur *.test.mjs; diese Datei heißt bewusst anders und
   läuft nur von Hand:

       RUNDE=3 node tests/ui-leitung.cjs

   Sie braucht Playwright und einen Chromium. Beides ist KEINE Abhängigkeit
   des Projekts (Regel 8) und steht nicht in package.json.

   Warum eine eigene Datei neben `ui-aufnahme.cjs`: `leitung.html` hat keine
   eigene Anmeldung, sie lebt vom Cookie — ohne einen Server, der `/api/ich`
   und `/api/vorgaenge` beantwortet, sieht man nur die Tür. Der Server hier
   ist nachgebaut (Vorlage: `persona-tagesfassung.cjs`) und beweist nichts
   über den echten Worker; er macht nur sichtbar, was das Backoffice tut,
   wenn eine Antwort kommt.

   Vier Lagen, weil sie verschiedene Dinge zeigen:
     leer   Server antwortet, hat aber null Vorgänge — der Zustand am ersten
            Tag nach dem Livegang (`vorgang` und `ereignis` sind live leer).
     voll   drei Vorgänge, darunter eine Kellerzählung.
     aus    Server antwortet nicht (503) → Rückfall auf den Gerätespeicher.
     tuer   401 → die Seite zeigt die Tür zum Fassungstool.

   Ergebnis: review/screens/runde-<N>-leitung/                            */

const RUNDE = process.env.RUNDE || "3";

const ORTE = [
  "playwright",
  "/opt/node22/lib/node_modules/playwright",
  "/usr/lib/node_modules/playwright"
];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — keine Aufnahme. Gesucht in:\n  " +
    ORTE.join("\n  ") + "\nOhne Browser gilt: die Oberfläche ist UNGEPRÜFT.");
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const OUT = path.join(__dirname, "..", "review", "screens", "runde-" + RUNDE + "-leitung");
fs.mkdirSync(OUT, { recursive: true });

const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
  ".png": "image/png", ".json": "application/json" };

/* ── Nachgebaute Vorgänge ───────────────────────────────────────────────
   Erfundene Namen, erfundene Mengen. Die Form folgt dem, was
   `vorgaengeLesen` in src/index.js zurückgibt: der Zustand `daten` flach,
   mit `id`, `tag`, `mode`, `name`, `finished` darübergelegt.            */
const heute = new Date();
const tg = n => new Date(heute.getTime() - n * 864e5).toISOString().slice(0, 10);

const VOLL = [
  { id: "v1", tag: tg(3), mode: "keller", name: "Marlene", finished: true,
    zdone: { w001: 1, w005: 1, w026: 1, w031: 1 },
    z: { w001: { reihen: 2, einzel: 1 }, w005: { reihen: 1, einzel: 4 },
         w026: { reihen: 3, einzel: 0 }, w031: { reihen: 0, einzel: 5 } } },
  { id: "v2", tag: tg(1), mode: "tag", name: "Lena", finished: true,
    barrot: { w026: 2 }, bar: { w001: 3 }, rest: { w005: 2, w031: 1 },
    holtN: {}, zusatz: {}, gent: { cola: 6 } },
  { id: "v3", tag: tg(1), mode: "nach", name: "Asad", finished: true,
    ent: { w031: 1 }, gent: { almd: 2 } }
];

function bau(lage) {
  return http.createServer((q, a) => {
    let u = q.url.split("?")[0];
    if (u === "/") u = "/leitung.html";
    if (u.startsWith("/api")) {
      if (lage === "aus") { a.writeHead(503); return a.end("{}"); }
      const kopf = { "content-type": "application/json" };
      if (lage === "tuer") { a.writeHead(401, kopf); return a.end('{"fehler":"nicht angemeldet"}'); }
      if (u === "/api/ich") { a.writeHead(200, kopf); return a.end('{"name":"Ilse","rolle":"leitung"}'); }
      if (u === "/api/vorgaenge") {
        a.writeHead(200, kopf);
        return a.end(JSON.stringify({ vorgaenge: lage === "voll" ? VOLL : [] }));
      }
      a.writeHead(200, kopf); return a.end("{}");
    }
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
    a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
    a.end(fs.readFileSync(f));
  });
}

const GERAETE = {
  iphone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  macbook: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
};

const SEITEN = ["heute", "abgleich", "import", "bestand", "bestellen", "getraenke",
  "zaehlliste", "speicher", "zuordnung", "rezepte", "team", "einst"];

/* Was gemessen wird statt geschätzt: Trefferflächen der Kopfleiste und der
   Navigation, und was der Quellen-Chip gerade sagt. */
async function messe(p) {
  return p.evaluate(() => {
    const mass = s => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return r.height ? { b: Math.round(r.width), h: Math.round(r.height) } : "unsichtbar"; };
    const navB = document.querySelector("nav.seite button");
    return {
      quelle: (document.querySelector("#tQuelle") || {}).textContent,
      quelleSichtbar: !!(document.querySelector("#cQuelle") || {}).getClientRects
        && document.querySelector("#cQuelle").getClientRects().length > 0,
      bNav: mass("#bNav"), bNeu: mass("#bNeu"), bFass: mass("#bFass"),
      navKnopf: navB ? Math.round(navB.getBoundingClientRect().height) : null,
      kleinsteKnopfhoehe: Math.min(...[...document.querySelectorAll("button, select, input")]
        .filter(e => e.getClientRects().length)
        .map(e => Math.round(e.getBoundingClientRect().height))),
      seitenbreite: document.documentElement.scrollWidth,
      fensterbreite: window.innerWidth
    };
  });
}

(async () => {
  const b = await pw.chromium.launch();
  let fehler = 0;
  for (const lage of ["leer", "voll", "aus", "tuer"]) {
    const srv = bau(lage);
    await new Promise(r => srv.listen(8933, r));
    for (const [g, cfg] of Object.entries(GERAETE)) {
      const ctx = await b.newContext(cfg);
      const p = await ctx.newPage();
      p.on("pageerror", e => { fehler++; console.log("!! JS-FEHLER", lage, g, e.message); });
      await p.goto("http://127.0.0.1:8933/leitung.html", { waitUntil: "load" });
      await p.waitForTimeout(500);
      const seiten = (lage === "leer" || lage === "voll") ? SEITEN : ["heute"];
      for (const s of seiten) {
        if (s !== "heute") {
          await p.evaluate(id => { SEITE = id; zeichne(); window.scrollTo(0, 0); }, s);
          await p.waitForTimeout(250);
        }
        await p.screenshot({ path: path.join(OUT, g + "-" + lage + "-" + s + ".png"),
          fullPage: s === "heute" });
      }
      console.log(lage, g, JSON.stringify(await messe(p)));
      /* Schmal: die Navigation ist ein Blatt — einmal aufmachen und ansehen. */
      if (g === "iphone" && (lage === "leer" || lage === "voll")) {
        await p.evaluate(() => { SEITE = "heute"; zeichne(); });
        await p.click("#bNav"); await p.waitForTimeout(400);
        await p.screenshot({ path: path.join(OUT, g + "-" + lage + "-nav.png") });
      }
      await ctx.close();
    }
    await new Promise(r => srv.close(r));
  }
  await b.close();
  console.log(fehler ? "FERTIG MIT " + fehler + " JS-FEHLERN" : "fertig, keine JS-Fehler");
})();
