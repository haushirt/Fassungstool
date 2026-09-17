/* Oberflächen-Aufnahme · NICHT Teil von `npm test`
   ────────────────────────────────────────────────
   `npm test` sucht nur Dateien, die auf .test.mjs enden; diese heißt bewusst
   anders und läuft nur von Hand:

       node tests/ui-aufnahme.cjs

   Sie braucht Playwright und einen Chromium. Beides ist KEINE Abhängigkeit
   des Projekts (Regel 8) und steht nicht in package.json — die Datei sucht
   ein global installiertes Playwright und legt sich sonst sauber hin.
   In den ersten beiden Runden war kein Browser da und die Oberfläche war
   von niemandem gesehen. Ab Runde 2 geht es; damit die nächste Runde nicht
   wieder bei null anfängt, steht das Vorgehen hier statt in einem
   Scratchpad: kleiner Dateiserver auf public/, Zustand über localStorage
   vorgeben, Bilder in iPhone- und MacBook-Größe.

   Ergebnis: review/screens/runde-<N>/  (Ordner über RUNDE unten).   */

const RUNDE = process.env.RUNDE || "2";

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
const OUT = path.join(__dirname, "..", "review", "screens", "runde-" + RUNDE);
fs.mkdirSync(OUT, { recursive: true });

const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
  ".png": "image/png", ".json": "application/json" };

/* /api/ wird nicht bedient: Die App muss auch ohne Server dastehen — das
   ist der Normalfall im Keller. */
const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) { a.writeHead(503); return a.end("{}"); }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
  a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
  a.end(fs.readFileSync(f));
});

const GERAETE = {
  iphone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  macbook: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
};

/* Der Zustand wird vor dem ersten Skriptlauf in den Gerätespeicher gelegt,
   nicht durchgeklickt — sonst hängt die Aufnahme an der Anmeldung. */
const saat = (ueberholt, ausgang) => `(()=>{ try{
  sessionStorage.setItem("hh_user","Asad");
  localStorage.setItem("hh_bekannt_v1", '{"x":"Asad"}');
  localStorage.setItem("hh_ueberholt_v1", ${JSON.stringify(JSON.stringify(ueberholt))});
  localStorage.setItem("hh_ausgang_v1", ${JSON.stringify(JSON.stringify(ausgang))});
}catch(e){} })();`;

const ueb = (mehr) => ({ schluessel: "tag_2026-09-16", id: "a",
  daten: { mode: "tag", tag: "2026-09-16", barrot: { w001: 2 } },
  zeit: "2026-09-16T20:40:00.000Z", quittiert: 0, fremd: null, ...mehr });

const UEB_NAME = [ueb({ fremd: { name: "Ian", zeit: "", zaehlnr: 7 } })];
const UEB_OHNE = [ueb({})];
/* Drei Stände heißt im Betrieb drei VERSCHIEDENE Vorgänge — an einem Abend
   laufen Tagesfassung, eine Sonderentnahme für die Küche und ein Nachfüllen
   an der Bar. Dreimal derselbe Modus kommt nicht vor (je Schlüssel liegt nur
   ein Eintrag im Sackfach) und ergäbe ein Bild, das lügt. */
const UEB_DREI = ["tag", "nach", "fuellen"].map((m, i) => ueb({
  schluessel: m + "_2026-09-16", id: "a" + i,
  daten: { mode: m, tag: "2026-09-16" } }));
const AUSGANG2 = [{ schluessel: "a", id: "1", daten: {}, versuche: 0 },
                  { schluessel: "b", id: "2", daten: {}, versuche: 0 }];

const FAELLE = [
  ["menu-ueberholt-1", UEB_NAME, [], "menu"],
  ["menu-ueberholt-ohne-name", UEB_OHNE, [], "menu"],
  ["menu-ueberholt-3", UEB_DREI, [], "menu"],
  ["menu-wartet", [], AUSGANG2, "menu"],
  ["menu-ohne-meldung", [], [], "menu"],
  ["schritt-ueberholt", UEB_NAME, [], "schritt"],
  ["schritt-wartet", [], AUSGANG2, "schritt"]
];

(async () => {
  await new Promise(r => srv.listen(8931, r));
  const b = await pw.chromium.launch();
  let fehler = 0;
  for (const [name, u, a, wo] of FAELLE) {
    for (const [g, cfg] of Object.entries(GERAETE)) {
      const ctx = await b.newContext(cfg);
      await ctx.addInitScript(saat(u, a));
      const p = await ctx.newPage();
      p.on("pageerror", e => { fehler++; console.log("!! JS-FEHLER", name, g, e.message); });
      await p.goto("http://127.0.0.1:8931/index.html", { waitUntil: "load" });
      await p.waitForTimeout(400);
      if (wo === "schritt") {
        await p.evaluate(() => { start("tag"); });
        await p.waitForTimeout(400);
        /* Das Hilfe-Sheet öffnet sich beim ersten Besuch eines Schritts von
           selbst und verdeckt die Statuszeile — hier zumachen. */
        const zu = p.locator("#hilfeZu");
        if (await zu.count() && await zu.isVisible()) { await zu.click(); await p.waitForTimeout(300); }
      }
      await p.evaluate(() => { if (typeof netzChip === "function") netzChip(); });
      await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(OUT, g + "-" + name + ".png") });
      if (g === "iphone") console.log(name, JSON.stringify(await messe(p)));
      await ctx.close();
    }
  }

  /* Bedienung statt Augenschein: Antippen, Tastatur, Zustandswechsel. */
  const ctx = await b.newContext(GERAETE.iphone);
  await ctx.addInitScript(saat(UEB_NAME, []));
  const p = await ctx.newPage();
  p.on("pageerror", e => { fehler++; console.log("!! JS-FEHLER bedienung", e.message); });
  await p.goto("http://127.0.0.1:8931/index.html", { waitUntil: "load" });
  await p.waitForTimeout(400);
  let tabs = 0, gefunden = false;
  while (tabs++ < 12) {
    await p.keyboard.press("Tab");
    const k = await p.evaluate(() => (document.activeElement || {}).className || "");
    if (String(k).includes("netzok")) { gefunden = true; break; }
  }
  console.log("Knopf per Tab erreichbar:", gefunden, "nach", tabs, "Tabs");
  if (gefunden) await p.screenshot({ path: path.join(OUT, "iphone-menu-ueberholt-fokus.png") });
  await p.keyboard.press("Enter");
  await p.waitForTimeout(200);
  console.log("nach Enter:", JSON.stringify(await p.evaluate(() => {
    const el = document.querySelector("#menu .netz");
    const s = JSON.parse(localStorage.getItem("hh_ueberholt_v1") || "[]");
    return { zeileWeg: el.style.display === "none",
      standBleibt: s.length === 1 && !!s[0].daten && s[0].quittiert === 1 };
  })));
  await ctx.close();

  await b.close(); srv.close();
  console.log(fehler ? "FERTIG MIT " + fehler + " JS-FEHLERN" : "fertig, keine JS-Fehler");
})();

/* Was am iPhone zählt: Trefferfläche, Zeilenumbruch, und ob --topH der
   gewachsenen Kopfleiste folgt. */
async function messe(p) {
  return p.evaluate(() => {
    const treffer = (x, y) => { const e = document.elementFromPoint(x, y); return e ? (e.className || e.tagName) : "-"; };
    const sicht = [...document.querySelectorAll(".netz")]
      .find(e => e.offsetParent !== null || e.getClientRects().length);
    if (!sicht) return null;
    const r = sicht.getBoundingClientRect();
    const btn = sicht.querySelector(".netzok");
    const br = btn && !btn.hidden ? btn.getBoundingClientRect() : null;
    const t = document.getElementById("topwrap");
    return { text: (sicht.querySelector(".netztext") || sicht).textContent,
      klasse: sicht.className, hoehe: Math.round(r.height),
      knopf: br ? { b: Math.round(br.width), h: Math.round(br.height),
        griffOben: treffer(br.x + br.width / 2, br.y - 4),
        griffUnten: treffer(br.x + br.width / 2, br.y + br.height + 3) } : null,
      kopfknopf: (() => { const o = {}; ["#bHilfe", "#bHome"].forEach(s => {
        const e = document.querySelector(s); if (!e) return;
        const k = e.getBoundingClientRect(); if (!k.height) return;
        o[s] = { h: Math.round(k.height), griff4: treffer(k.x + k.width / 2, k.y - 4) }; });
        return o; })(),
      topH: getComputedStyle(document.documentElement).getPropertyValue("--topH"),
      topwrapH: t ? Math.round(t.getBoundingClientRect().height) : null };
  });
}
