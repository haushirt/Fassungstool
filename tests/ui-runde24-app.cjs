/* ═══════════════════════════════════════════════════════════════════════
   Runde 24 · die App: „leer" bei der Kellerzählung und beim Holen,
   „Zusätzlich entnommen" als eigene Karte.
   Aufbau wie tests/ui-mass.cjs (statischer Server, /api ohne Inhalt).
   Aufruf: node tests/ui-runde24-app.cjs — nicht Teil von npm test (Regel 8).
   Bilder nach review/screens/r24/.                                      */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) { console.log("Playwright nicht gefunden — die App bleibt UNGEPRÜFT."); process.exit(0); }

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const BILD = path.join(__dirname, "..", "review", "screens", "r24");
fs.mkdirSync(BILD, { recursive: true });
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };
const PORT = 8978;

let fehler = 0, geprueft = 0;
const ok = (satz, b, dazu) => { geprueft++; if (!b) fehler++;
  console.log((b ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : "")); };

const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) { a.writeHead(200, { "content-type": "application/json" });
    return a.end(JSON.stringify({ ok: true, vorgaenge: [] })); }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
  a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
  a.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true });
  await ctx.addInitScript(`(()=>{ try{ sessionStorage.setItem("hh_user","Asad");
    localStorage.setItem("hh_bekannt_v1", '{"x":{"name":"Asad","rolle":"service"}}'); }catch(e){} })();`);
  const p = await ctx.newPage();
  p.on("pageerror", e => { fehler++; console.log("  !! JS-FEHLER:", e.message); });
  const weg = async () => { for (const s of ["#grussPasst", "#hilfeZu"]) {
    const l = p.locator(s); if (await l.count() && await l.first().isVisible()) { await l.first().click(); await p.waitForTimeout(200); } } };
  await p.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500); await weg();

  console.log("\n1 · Kellerzählung · leer");
  await p.evaluate(() => start("keller")); await p.waitForTimeout(400);
  const tor = p.locator(".gbtn.wein"); if (await tor.count()) { await tor.first().click(); await p.waitForTimeout(300); }
  await weg();
  const k = p.locator(".zw .leerknopf").first();
  ok("jeder Wein hat einen Knopf „leer\"", await p.locator(".zw .leerknopf").count() > 40);
  await k.click(); await p.waitForTimeout(200);
  const z1 = await p.evaluate(() => { const d = D(), id = Object.keys(d.leer || {})[0];
    return { id, zdone: id && d.zdone[id], summe: (d.reihen[id] || 0) * 6 + (d.einzel[id] || 0) }; });
  ok("„leer\" zählt den Wein als gezählt mit 0", z1.id && z1.zdone === 1 && z1.summe === 0, JSON.stringify(z1));
  ok("die Zeile zeigt „leer ✓\"", /leer ✓/.test(await p.locator(".zw.istleer").first().textContent()));
  await p.screenshot({ path: path.join(BILD, "app-zaehlung-leer.png") });
  await p.locator(".zw.istleer .zbtn").nth(3).click(); await p.waitForTimeout(150);
  const z2 = await p.evaluate(id => ({ leer: !!(D().leer || {})[id], zdone: D().zdone[id] }), z1.id);
  ok("eine gezählte Flasche nimmt „leer\" zurück", !z2.leer && z2.zdone === 1, JSON.stringify(z2));

  console.log("\n2 · Tagesfassung · Holen · leer");
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {}
    sessionStorage.setItem("hh_user", "Asad"); start("tag");
    const d = D(); d.bar = { w001: 3 }; d.barrot = { w026: 2 }; save(); go(2); });
  await p.waitForTimeout(400); await weg();
  const nL = await p.locator(".holz .leerknopf").count();
  ok("jede Holzeile hat „leer\"", nL >= 2, String(nL));
  await p.locator(".holz .leerknopf").first().click(); await p.waitForTimeout(200);
  const h = await p.evaluate(() => { const d = D(), id = Object.keys(d.leer || {})[0];
    return { id, n: d.holtN[id], erledigt: d.holt[id] }; });
  ok("„leer\" setzt die Holmenge auf 0 und hakt die Zeile ab", h.id && h.n === 0 && h.erledigt === 1, JSON.stringify(h));
  ok("die Zeile ist als leer markiert", await p.locator(".holz.istleer").count() === 1);

  console.log("\n3 · Zusätzlich entnommen");
  const kopf = p.locator(".zusatzkopf").first();
  ok("eine eigene Karte mit Titel und Knopf", await kopf.count() === 1 && /Hinzufügen/.test(await kopf.textContent()));
  await kopf.click(); await p.waitForTimeout(200);
  ok("der Knopf öffnet die Suche", await p.locator(".zusatzq").count() === 1 && /Fertig/.test(await kopf.textContent()));
  await p.locator(".zusatz").first().scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(BILD, "app-holen-leer-zusatz.png"), fullPage: true });

  await b.close(); srv.close();
  console.log("\n" + (geprueft - fehler) + " von " + geprueft + " Prüfungen bestanden");
  process.exit(fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
