/* ═══════════════════════════════════════════════════════════════════════
   Runde 24 · die neue Übersicht, der Kellerstand und „Analytics".
   Aufbau wie tests/ui-leitung-echt.cjs: echter Worker, SQLite aus
   docs/live-schema.sql, echter Z-Bericht. Aufruf: node tests/ui-runde24.cjs
   (nicht Teil von npm test, Regel 8). Bilder nach review/screens/r24/.
   -----------------------------------------------------------------------
   Vorlage des Kopfes:

   Diese Lücke hat der erste echte Bericht aufgerissen: `gnparse.js` war
   geprüft, `public/leitung.html` nicht — und dort stand eine zweite
   Abschrift desselben Lesers. Sie las aus derselben Datei 106 Positionen
   mit 5166,70 € statt 48 mit 602,50 €, und niemand sah es, weil keine
   Prüfung das Backoffice je an einen echten Bericht gelassen hat.

   Hier läuft deshalb alles echt: der Worker aus `src/index.js`, eine
   SQLite-Datenbank aus `docs/live-schema.sql`, der anonymisierte Bericht
   aus `tests/fixtures/`, und die Oberfläche in Chromium in MacBook-Maßen.
   Geprüft wird, was die Leitung SIEHT, und was danach in der Datenbank
   steht.

   Regel 2 bleibt unberührt: alles im Arbeitsspeicher, kein Netz, keine
   Live-Datenbank.                                                       */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — das Backoffice bleibt UNGEPRÜFT.");
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const FIXTURE = path.join(__dirname, "fixtures", "zbericht-37-extended.csv");
const PORT = 8967;
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };
/* Bei jedem Lauf gewürfelt (Regel 9). */
const CODE = String(require("crypto").randomInt(1000, 10000));

let fehler = 0, geprueft = 0;
const ok = (satz, bedingung, dazu) => {
  geprueft++;
  console.log((bedingung ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
  if (!bedingung) fehler++;
};

/* Die Zahlen des echten Berichts, unabhängig nachgerechnet in
   tests/zbericht-37.test.mjs. */
const POSITIONEN = 48, STUECK = 145, UMSATZ = 602.50;

(async () => {
  const { ladeWorker } = await import("./hilfe/worker.mjs");
  const { d1Echt } = await import("./hilfe/d1-echt.mjs");
  const worker = await ladeWorker();
  const DB = d1Echt();
  const env = { DB, TOKEN_SECRET: require("crypto").randomBytes(32).toString("hex"),
                ANLAGE_OFFEN: "1",
                ASSETS: { fetch: () => new Response("nicht hier", { status: 404 }) } };

  const srv = http.createServer(async (q, a) => {
    let u = q.url.split("?")[0];
    if (u === "/") u = "/leitung.html";
    if (u.startsWith("/api")) {
      const koerper = await new Promise(r => {
        if (q.method === "GET" || q.method === "HEAD") return r(undefined);
        let s = ""; q.on("data", c => s += c); q.on("end", () => r(s));
      });
      const h = new Headers();
      for (const [k, v] of Object.entries(q.headers)) if (typeof v === "string") h.set(k, v);
      h.set("cf-connecting-ip", "10.0.0.1");
      let r;
      try {
        r = await worker.fetch(new Request("http://localhost:" + PORT + q.url,
          { method: q.method, headers: h, body: koerper }), env);
      } catch (e) {
        r = new Response(JSON.stringify({ fehler: String(e && e.message) }), { status: 500 });
      }
      const kopf = {};
      r.headers.forEach((v, k) => { if (k !== "set-cookie") kopf[k] = v; });
      const kekse = typeof r.headers.getSetCookie === "function"
        ? r.headers.getSetCookie() : [r.headers.get("set-cookie")].filter(Boolean);
      if (kekse.length) kopf["set-cookie"] = kekse.map(k => k.replace(/;\s*Secure/gi, ""));
      a.writeHead(r.status, kopf);
      a.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
    a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
    a.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(PORT, r));
  const BASIS = "http://localhost:" + PORT;

  console.log("\n══ Backoffice: echter Bericht, echter Worker ══\n");

  /* ── 0 · Eine Leitung, ein Keks ─────────────────────────────────────── */
  await fetch(BASIS + "/api/anlage", { method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Casimir", rolle: "leitung", code: CODE }) });
  const an = await fetch(BASIS + "/api/anmelden", { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ code: CODE }) });
  const keks = (an.headers.getSetCookie()[0] || "").split(";")[0];
  env.ANLAGE_OFFEN = "";
  console.log("0 · Einrichtung");
  ok("Leitung angelegt und angemeldet", an.status === 200 && /^hh_sitz=/.test(keks));

  const MACBOOK = { viewport: { width: 1440, height: 900 } };
  const browser = await pw.chromium.launch();
  const sitzung = async () => {
    const ctx = await browser.newContext(MACBOOK);
    await ctx.addCookies([{ name: "hh_sitz", value: keks.split("=").slice(1).join("="),
                            domain: "localhost", path: "/" }]);
    const p = await ctx.newPage();
    p.on("pageerror", e => { fehler++; console.log("  !! JS-FEHLER:", e.message); });
    return { ctx, p };
  };
  const offen = async (p, seite) => {
    await p.goto(BASIS + "/leitung.html", { waitUntil: "load" });
    await p.waitForTimeout(600);
    if (seite) { await p.evaluate(s => { SEITE = s; zeichne(); }, seite); await p.waitForTimeout(400); }
  };


  const BILD = path.join(__dirname, "..", "review", "screens", "r24");
  fs.mkdirSync(BILD, { recursive: true });
  const put = (sch, daten) => fetch(BASIS + "/api/vorgang/" + encodeURIComponent(sch),
    { method: "PUT", headers: { "content-type": "application/json", cookie: keks },
      body: JSON.stringify(daten) });
  const alleWeine = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "stamm.json"), "utf8"))
    .WINES.map(w => w.id);

  console.log("1 · Daten: Z-Bericht, Kellerzählung mit „leer\", Tagesfassung");
  const z = await fetch(BASIS + "/api/fassungsliste", { method: "POST",
    headers: { "content-type": "text/plain", cookie: keks }, body: fs.readFileSync(FIXTURE, "utf8") });
  ok("Z-Bericht eingelesen", z.status === 200);
  const zdone = {}, einzel = {}, leer = {};
  alleWeine.forEach((id, i) => { zdone[id] = 1; einzel[id] = 4 + (i % 3); });
  delete einzel.w027; leer.w027 = 1;                     /* Dornenvogel: leer gezählt */
  let r = await put("keller_2026-09-14", { mode: "keller", tag: "2026-09-14", name: "Casimir",
    finished: true, zdone, reihen: {}, einzel, leer });
  ok("Kellerzählung mit leerem Platz gespeichert", r.status === 200);
  const j = await (await fetch(BASIS + "/api/journal?limit=500", { headers: { cookie: keks } })).json().catch(() => ({}));
  const zeilenJ = DB.zeilen("ereignis").filter(e => e.art === "zaehlung" && e.artikel === "w027");
  ok("„leer\" steht als Zählung 0 im Journal", zeilenJ.length === 1 && zeilenJ[0].menge === 0,
     JSON.stringify(zeilenJ.map(e => e.menge)));
  r = await put("tag_2026-09-16", { mode: "tag", tag: "2026-09-16", name: "Casimir", finished: true,
    rest: {}, barrot: {}, bar: { w001: 3, w011: 1 }, backup: {}, seen: {}, holt: { w001: 1, w011: 1, w026: 1 },
    holtN: { w026: 0 }, leer: { w026: 1 }, barrot: { w026: 2 },
    zusatz: {}, gzusatz: {}, gent: {}, getr: {}, gdone: {}, gcheck: {}, goffen: {}, gholt: {}, gholtN: {} });
  ok("Tagesfassung gespeichert", r.status === 200);

  let { ctx, p } = await sitzung();
  await p.goto(BASIS + "/leitung.html", { waitUntil: "load" });
  await p.waitForTimeout(900);
  /* Leindl ⅛: Flaschengröße 750 bestätigen, damit Glas gerechnet wird. */
  await p.evaluate(async () => { await sendeZuordnung("GV Leindl Langenlois 1/8 l", "w001", 750, true);
    MAP["GV Leindl Langenlois 1/8 l"] = "w001"; GEB_BEST["GV Leindl Langenlois 1/8 l"] = 750; });
  await p.waitForTimeout(400);
  await p.evaluate(() => { UEB.ende = "2026-09-16"; UEB.art = "tag"; UEB.filter = "alle"; zeichne(); });
  await p.waitForTimeout(300);

  console.log("\n2 · Navigation");
  const nav = await p.evaluate(() => [...document.querySelectorAll("#nav button")].map(b => b.textContent.trim()));
  ok("oben nur Übersicht, Kellerstand, Analytics (+ abmelden)",
     nav[0].startsWith("Übersicht") && nav[1].startsWith("Kellerstand") && nav[2].startsWith("Analytics") && nav.length === 4,
     nav.join(" | "));
  ok("Start ist die neue Übersicht", await p.evaluate(() => SEITE === "blick"));
  await p.locator("#nav .anaknopf").click(); await p.waitForTimeout(200);
  const nav2 = await p.evaluate(() => [...document.querySelectorAll("#nav button.ana")].map(b => b.textContent.trim()));
  ok("Analytics klappt alle alten Seiten auf", nav2.length === 13, nav2.length + ": " + nav2.join(" | "));
  ok("die Zeitraumwahl der alten Seiten ist auf der Übersicht aus", await p.evaluate(() => document.getElementById("zeitwahl").hidden));

  console.log("\n3 · Übersicht · Tag 16.09.");
  const blick = await p.evaluate(() => {
    const G = gegenueber(fenster("tag", "2026-09-16"));
    const f = id => G.zeilen.find(z => z.id === id);
    return { leindl: f("w001"), ges: f("w011"), glatz: f("w026"), offen: G.offen.length,
             rows: document.querySelectorAll(".brow").length, text: document.querySelector("main").textContent };
  });
  ok("Leindl: links 3 gefehlt", blick.leindl && blick.leindl.links === 3);
  ok("Leindl: rechts 4 Gläser ⅛ = 0,67 Fl.", blick.leindl && Math.abs(blick.leindl.rechts - 4 * 125 / 750) < 1e-9 && blick.leindl.gl === 4,
     blick.leindl && blick.leindl.rechts);
  ok("Leindl: Name aus der gastronovi-Liste (Glas und Flasche in einer Zeile)", blick.leindl && blick.leindl.name === "GV Leindl, Langenlois");
  ok("Leindl weicht ab (rot)", blick.leindl && blick.leindl.status === "ab");
  ok("Glaswein-Block zeigt die Gläser mit Rechnung", /4 Gläser ≈ 0,7 Fl\./.test(blick.text));
  await p.locator('[data-zu="glas"]').click(); await p.waitForTimeout(150);
  ok("ein Block klappt zu", !/4 Gläser ≈/.test(await p.locator("main").textContent()));
  await p.locator('[data-zu="glas"]').click(); await p.waitForTimeout(150);
  await p.locator('[data-blk="bar"]').click(); await p.waitForTimeout(150);
  const nurBar = await p.evaluate(() => [...document.querySelectorAll(".bblock h2")].map(e => e.textContent));
  ok("Filter zeigt nur einen Block", nurBar.length === 1 && /Bar-Flaschen/.test(nurBar[0]), nurBar.join("|"));
  await p.locator('[data-blk="alle"]').click(); await p.waitForTimeout(150);
  ok("Glatzer Rubin: Glas ohne bestätigte Größe → mit 0,75 l gerechnet und als „angenommen\" markiert",
     blick.glatz && blick.glatz.ann === true && Math.abs(blick.glatz.rechts - 2 * 125 / 750) < 1e-9);
  ok("vier Blöcke in Casimirs Reihenfolge: Flaschenwein, Glaswein, Bar-Flaschen, Rest",
     /1 · Flaschenwein[\s\S]*2 · Glaswein[\s\S]*3 · Bar-Flaschen[\s\S]*4 · Rest/.test(blick.text));
  const b1 = await p.evaluate(() => block1().zeilen.map(z => [z.id, z.L, z.R]));
  ok("Block 1: nur Restaurant gegen ganze Flaschen (Leindl-Gläser zählen dort nicht)",
     !b1.some(z => z[0] === "w001" && z[2] > 0), JSON.stringify(b1.slice(0, 5)));
  ok("Glatzer Rubin: beim Holen leer markiert", blick.glatz && blick.glatz.leer === true);
  ok("offene Kassennamen werden genannt", /ohne Zuordnung/.test(blick.text) === (blick.offen > 0));
  await p.screenshot({ path: path.join(BILD, "uebersicht-tag.png"), fullPage: true });

  await p.locator('[data-nur="1"]').click(); await p.waitForTimeout(200);
  const nurNicht = await p.evaluate(() => ({ ok: [...document.querySelectorAll(".brow .dot.ok")].length,
    offen: !!document.querySelector(".bblock.info") }));
  ok("„Stimmt nicht\" blendet alles aus, was stimmt, und Block 3", nurNicht.ok === 0 && !nurNicht.offen, JSON.stringify(nurNicht));
  await p.screenshot({ path: path.join(BILD, "stimmt-nicht.png"), fullPage: true });
  await p.locator('[data-nur="0"]').click(); await p.waitForTimeout(150);

  const b2 = await p.evaluate(() => block2(fenster("tag", "2026-09-16")).map(z => artVon(z.id)));
  ok("Block 2 enthält nur Bier, Softdrinks, Wasser", b2.every(a => a === "bier" || a === "soft"), b2.join(","));

  console.log("\n4 · Woche, Monat, Blättern");
  await p.locator('[data-art="woche"]').click(); await p.waitForTimeout(150);
  const wo = await p.evaluate(() => document.querySelector(".bdatum").textContent);
  ok("Woche: KW 38 · 14.09.–20.09.", wo === "KW 38 · 14.09.–20.09.", wo);
  await p.locator("#bZur").click(); await p.waitForTimeout(150);
  const wo2 = await p.evaluate(() => document.querySelector(".bdatum").textContent);
  ok("‹ blättert eine Woche zurück", wo2 === "KW 37 · 07.09.–13.09.", wo2);
  await p.locator('[data-art="monat"]').click(); await p.waitForTimeout(150);
  const mo = await p.evaluate(() => document.querySelector(".bdatum").textContent);
  ok("Monat: September 2026", /September 2026/.test(mo), mo);
  await p.locator("#bVor").click(); await p.waitForTimeout(150);
  const mo2 = await p.evaluate(() => document.querySelector(".bdatum").textContent);
  ok("› blättert einen Monat weiter", /Oktober 2026/.test(mo2), mo2);
  await p.evaluate(() => { UEB.art = "tag"; UEB.ende = "2026-09-16"; zeichne(); });

  console.log("\n5 · Kellerstand");
  await p.evaluate(() => { SEITE = "keller"; zeichne(); }); await p.waitForTimeout(200);
  const ks = await p.evaluate(() => { const B = bestand();
    return { dorn: B.b.w027, leindl: B.b.w001, glatz: B.b.w026, gez: B.gezaehlt.w001,
      text: document.querySelector("main").textContent }; });
  ok("Dornenvogel steht leer (0)", ks.dorn === 0);
  ok("Leindl: gezählt minus 3 geholt", ks.leindl === ks.gez - 3, ks.gez + " → " + ks.leindl);
  ok("Glatzer Rubin: leer beim Holen → nichts abgezogen", ks.glatz === 4 + (alleWeine.indexOf("w026") % 3), String(ks.glatz));
  ok("„leer\" steht im Kellerstand", /leer/i.test(ks.text));
  await p.screenshot({ path: path.join(BILD, "kellerstand.png"), fullPage: true });
  await p.locator("#bAna").click(); await p.waitForTimeout(250);
  const an2 = await p.evaluate(() => document.querySelector("main").textContent);
  ok("Analyse stellt geholt gegen verbucht", /Aus dem Keller geholt/.test(an2) && /Verbucht/.test(an2));
  await p.screenshot({ path: path.join(BILD, "kellerstand-analyse.png"), fullPage: true });
  await ctx.close();

  const handy = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await handy.addCookies([{ name: "hh_sitz", value: keks.split("=").slice(1).join("="), domain: "localhost", path: "/" }]);
  const h = await handy.newPage();
  h.on("pageerror", e => { fehler++; console.log("  !! JS-FEHLER:", e.message); });
  await h.goto(BASIS + "/leitung.html", { waitUntil: "load" }); await h.waitForTimeout(900);
  await h.evaluate(() => { UEB.ende = "2026-09-16"; UEB.art = "tag"; zeichne(); }); await h.waitForTimeout(200);
  const breit = await h.evaluate(() => document.documentElement.scrollWidth);
  ok("iPhone: kein waagrechter Überlauf", breit <= 393, breit + " px");
  await h.screenshot({ path: path.join(BILD, "uebersicht-iphone.png"), fullPage: true });
  await handy.close();

  await browser.close(); srv.close();
  console.log("\n" + (geprueft - fehler) + " von " + geprueft + " Prüfungen bestanden");
  process.exit(fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
