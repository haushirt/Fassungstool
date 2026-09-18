/* Nachjagd · die A- und B-Funde der fünften Jagd, nachgestellt
   ──────────────────────────────────────────────────────────────
       node tests/ui-nachjagd.cjs

   NICHT Teil von `npm test` (braucht Playwright, Regel 8). Jede Prüfung
   hier stellt genau eine Lage nach, die der Jäger in Runde 13 gefunden
   hat, und fällt, wenn sie wiederkommt. Rückgabewert 1, sobald eine
   Prüfung „nein“ sagt.

   Warum eine eigene Datei und nicht ui-mass.cjs: Dort wird die OBERFLÄCHE
   vermessen. Hier wird BEDIENT — Dialoge, Personenwechsel, Tageswahl. Das
   sind Abläufe, keine Maße.                                            */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) { console.log("Playwright nicht gefunden — UNGEPRÜFT."); process.exit(0); }

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };

const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna",
  year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const gestern = (() => { const d = new Date(heute + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); })();

let ROLLE = "service", WER = "Asad", FERN = [];
const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    if (u === "/api/ich") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: WER, rolle: ROLLE })); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ vorgaenge: FERN })); }
    a.writeHead(200, kopf); return a.end("{}");
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
  a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
  a.end(fs.readFileSync(f));
});

const SAAT = n => `(()=>{ try{
  sessionStorage.setItem("hh_user",${JSON.stringify(n)});
  localStorage.setItem("hh_bekannt_v1", '{"x":{"name":${JSON.stringify(n)},"rolle":"service"}}');
}catch(e){} })();`;

let nein = 0;
const urteil = (satz, gut, dazu) => {
  if (!gut) nein++;
  console.log((gut ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
};

async function seite(b, name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(SAAT(name || "Asad"));
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", e => fehler.push(e.message));
  await p.goto("http://127.0.0.1:8991/index.html", { waitUntil: "load" });
  await p.waitForTimeout(600);
  return { ctx, p, fehler };
}
const grussWeg = async p => {
  const k = p.locator("#grussPasst");
  if (await k.count() && await k.isVisible()) { await k.click(); await p.waitForTimeout(250); }
};
/* Die Hilfe kommt einmal je Modus von selbst und liegt über allem —
   auch über dem Dialog, den diese Prüfungen bedienen wollen. */
const hilfeWeg = async p => {
  await p.evaluate(() => { if (typeof schliesseHilfe === "function") schliesseHilfe(); });
  await p.waitForTimeout(150);
};

(async () => {
  await new Promise(r => srv.listen(8991, r));
  const b = await pw.chromium.launch();

  /* ── A3 · „Anderes Datum“ darf keinen laufenden Vorgang leeren ─────── */
  {
    const { ctx, p } = await seite(b);
    await grussWeg(p);
    await p.evaluate(() => { start("tag"); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { const d = D(); d.barrot = { w026: 2 }; save(); });
    await p.evaluate(() => { mode = null; renderMenu(); });
    await p.waitForTimeout(200);
    /* Einen anderen Tag wählen, wie es die Begrüßung tut. */
    await p.evaluate(t => setTagWahl(t), gestern);
    await p.evaluate(() => { start("tag"); });
    await p.waitForTimeout(400);
    const lage = await p.evaluate(() => ({
      dialog: document.querySelector("#ov").classList.contains("on"),
      titel: (document.querySelector("#ovT") || {}).textContent || "",
      stand: JSON.stringify((S.tag || {}).barrot || {})
    }));
    urteil("A3 · ein angefangener Vorgang wird nicht still geleert",
           lage.dialog && lage.stand === '{"w026":2}',
           "Dialog: " + lage.dialog + " · Stand: " + lage.stand);
    /* „Weiter am …“ behält den angefangenen Stand. */
    if (lage.dialog) {
      await hilfeWeg(p);
      await p.locator("#ovOk").click();
      await p.waitForTimeout(400);
      const nachher = await p.evaluate(() => ({
        tag: (S.tag || {}).tag, stand: JSON.stringify((S.tag || {}).barrot || {}) }));
      urteil("A3 · „Weiter am …“ behält Tag und Inhalt",
             nachher.stand === '{"w026":2}' && nachher.tag === heute,
             JSON.stringify(nachher));
    }
    await ctx.close();
  }

  /* ── A2 · Fremdgerät-Dialog und start() fragen denselben Tag ───────── */
  {
    FERN = [{ id: "tag_" + gestern, tag: gestern, mode: "tag", name: "Ian",
              finished: false, geraet: "fremd", zaehlnr: 9,
              barrot: { w026: 3 }, zeit: gestern + "T18:00:00.000Z" }];
    const { ctx, p } = await seite(b);
    await grussWeg(p);
    await p.waitForTimeout(700);
    await p.evaluate(t => setTagWahl(t), gestern);
    await p.evaluate(() => { start("tag"); });
    await p.waitForTimeout(400);
    const dialog = await p.evaluate(() =>
      document.querySelector("#ov").classList.contains("on"));
    if (dialog) {
      await hilfeWeg(p);
      await p.locator("#ovOk").click();
      await p.waitForTimeout(500);
      const nach = await p.evaluate(() => ({
        tag: (S.tag || {}).tag, stand: JSON.stringify((S.tag || {}).barrot || {}) }));
      urteil("A2 · ein übernommener Stand ist danach noch da",
             nach.tag === gestern && nach.stand === '{"w026":3}', JSON.stringify(nach));
    } else {
      urteil("A2 · der Fremdgerät-Dialog kommt für den gewählten Tag", false,
             "kein Dialog");
    }
    await ctx.close();
    FERN = [];
  }

  /* ── B3 · Die Rolle geht mit der Person ────────────────────────────── */
  {
    ROLLE = "leitung"; WER = "Casimir";
    const { ctx, p } = await seite(b, "Casimir");
    await grussWeg(p);
    await p.waitForTimeout(800);
    const alsLeitung = await p.evaluate(() => !!document.querySelector("#bBackoffice"));
    urteil("B3 · die Leitung sieht den Backoffice-Link", alsLeitung);
    /* Person wechseln — die Rolle darf nicht am Gerät hängenbleiben. */
    await p.evaluate(() => { setUser(""); renderLogin(); });
    await p.waitForTimeout(200);
    const rolleWeg = await p.evaluate(() => meineRolle());
    urteil("B3 · beim Abmelden geht die Rolle mit", rolleWeg === "",
           "hh_rolle: " + JSON.stringify(rolleWeg));
    await p.evaluate(() => { setUser("Asad"); renderMenu(); });
    await p.waitForTimeout(200);
    const alsService = await p.evaluate(() => !!document.querySelector("#bBackoffice"));
    urteil("B3 · der Service sieht ihn nicht", !alsService);
    await ctx.close();
    ROLLE = "service"; WER = "Asad";
  }

  /* ── A1 · Die Getränkezeile steht im Bild ──────────────────────────── */
  {
    const { ctx, p, fehler } = await seite(b);
    await grussWeg(p);
    await p.evaluate(() => { start("nach"); });
    await p.waitForTimeout(400);
    const tor = p.locator(".gbtn.getr");
    if (await tor.count()) { await tor.first().click(); await p.waitForTimeout(500); }
    const zu = p.locator("#hilfeZu");
    if (await zu.count() && await zu.isVisible()) { await zu.click(); await p.waitForTimeout(200); }
    const lage = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const raus = [];
      document.querySelectorAll(".w, .w *").forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        if (r.right > vw + 1 || r.left < -1)
          raus.push(e.tagName + "." + String(e.className || "").split(" ")[0] +
                    "[" + Math.round(r.left) + ".." + Math.round(r.right) + "]");
      });
      return { vw, scrollW: document.documentElement.scrollWidth,
               raus: raus.slice(0, 6), n: raus.length };
    });
    urteil("A1 · Sonderentnahme · Getränke: nichts steht ausserhalb des Fensters",
           lage.n === 0, lage.raus.join(", "));
    urteil("A1 · die Seite rollt dort nicht waagrecht",
           lage.scrollW <= lage.vw + 1, lage.scrollW + " > " + lage.vw);
    urteil("A1 · keine JS-Fehler dabei", fehler.length === 0, fehler[0] || "");
    await ctx.close();
  }

  await b.close(); srv.close();
  console.log(nein ? "\n" + nein + " Prüfung(en) NEIN." : "\nAlle Prüfungen ja.");
  process.exit(nein ? 1 : 0);
})();
