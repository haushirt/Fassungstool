/* ═══════════════════════════════════════════════════════════════════════
   Runde 22 · Die Vorabliste im Browser

   Zwei Fragen, die kein Prüfstand ohne Oberfläche beantwortet:

     1. Wie viele Kassennamen stehen nach dem Einlesen noch offen?
        Vorher waren es 44 von 48 — fast der ganze Bericht.
     2. Reicht EIN Klick, um den Rest zu bestätigen?

   Dazu der Fall, der die Liste gefährlich machen würde: eine bestätigte
   Zuordnung, die von der geprüften Liste abweicht. Sie muss gelten
   bleiben, und der Unterschied muss dastehen.

   Alles echt: Worker aus `src/index.js`, SQLite aus `docs/live-schema.sql`,
   der anonymisierte Bericht aus `tests/fixtures/`, Chromium in
   MacBook-Maßen. Regel 2 bleibt unberührt — kein Netz, keine Live-D1.
   ═══════════════════════════════════════════════════════════════════════ */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — die Vorabliste bleibt im Browser UNGEPRÜFT.");
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const FIXTURE = path.join(__dirname, "fixtures", "zbericht-37-extended.csv");
const PORT = 8961;
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };
const CODE = String(require("crypto").randomInt(1000, 10000));

let fehler = 0, geprueft = 0;
const ok = (satz, bedingung, dazu) => {
  geprueft++;
  console.log((bedingung ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
  if (!bedingung) fehler++;
};

(async () => {
  const { ladeWorker } = await import("./hilfe/worker.mjs");
  const { d1Echt } = await import("./hilfe/d1-echt.mjs");
  const { VORAB } = await import("../src/gnmap.js");
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

  console.log("\n══ Runde 22: die Vorabliste im Browser ══\n");

  await fetch(BASIS + "/api/anlage", { method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Casimir", rolle: "leitung", code: CODE }) });
  const an = await fetch(BASIS + "/api/anmelden", { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ code: CODE }) });
  const keks = (an.headers.getSetCookie()[0] || "").split(";")[0];
  env.ANLAGE_OFFEN = "";

  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "hh_sitz", value: keks.split("=").slice(1).join("="),
                          domain: "localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("pageerror", e => { fehler++; console.log("  !! JS-FEHLER:", e.message); });
  const offen = async seite => {
    await p.goto(BASIS + "/leitung.html", { waitUntil: "load" });
    await p.waitForTimeout(600);
    await p.evaluate(s => { SEITE = s; zeichne(); }, seite);
    await p.waitForTimeout(400);
  };

  /* ── 1 · Der Bericht kommt an ───────────────────────────────────────── */
  console.log("1 · Der echte Bericht, frisch eingelesen");
  const TEXT = fs.readFileSync(FIXTURE, "utf8");
  await offen("import");
  await p.evaluate(t => { const r = document.getElementById("roh");
    r.value = t; r.dispatchEvent(new Event("input")); }, TEXT);
  await p.locator("#bLies").click();
  await p.waitForTimeout(1200);

  const stand = await p.evaluate(() => {
    const z = ZBER["2026-09-16"];
    const z2 = n => zuordnung({ name: n }).status;
    const zaehl = { offen: 0, vorab: 0, ignoriert: 0, auto: 0, fest: 0 };
    z.positionen.forEach(x => { zaehl[z2(x.name)] = (zaehl[z2(x.name)] || 0) + 1; });
    return { n: z.positionen.length, ...zaehl };
  });
  ok("48 Positionen, wie immer", stand.n === 48, stand.n);
  ok("offen sind nur noch die, die wirklich eine Entscheidung brauchen",
     stand.offen < 30, stand.offen + " von 48 offen (vorher 44)");
  ok("die Vorabliste trägt den Großteil",
     stand.vorab + stand.ignoriert >= 25,
     stand.vorab + " vorgeschlagen, " + stand.ignoriert + " kein Keller, "
     + stand.auto + " über das Weinmuster");

  /* ── 2 · Was die Leitung sieht ──────────────────────────────────────── */
  console.log("\n2 · Der Zuordnung-Bildschirm");
  await offen("zuordnung");
  const schirm = await p.evaluate(() => {
    const zeile = n => [...document.querySelectorAll("tr")]
      .find(r => r.firstElementChild && r.firstElementChild.textContent === n);
    const lies = n => { const r = zeile(n); if (!r) return null;
      return { zustand: r.children[3].textContent.trim(),
               feld: r.querySelector("select").value }; };
    return {
      wein: lies("ZW Glatzer Rubin Carnuntum 1/8 l"),
      speise: lies("Käse"),
      cocktail: lies("Aperol Spritz 1 Glas"),
      knopf: document.getElementById("bAuto").textContent.trim()
    };
  });
  ok("der Wein ohne Komma steht als Vorschlag da",
     schirm.wein && /vorgeschlagen/.test(schirm.wein.zustand), schirm.wein
     && schirm.wein.zustand);
  ok("und im Feld steht schon der Wein, nicht „offen“",
     schirm.wein && schirm.wein.feld === "w026", schirm.wein && schirm.wein.feld);
  ok("die Speise steht als „vorgeschlagen: ignorieren“",
     schirm.speise && /ignorieren/.test(schirm.speise.zustand),
     schirm.speise && schirm.speise.zustand);
  ok("und im Feld steht „Ignorieren“",
     schirm.speise && schirm.speise.feld === "__ignoriert",
     schirm.speise && schirm.speise.feld);
  ok("der Cocktail bleibt offen — er braucht ein Rezept",
     schirm.cocktail && /offen/.test(schirm.cocktail.zustand),
     schirm.cocktail && schirm.cocktail.zustand);
  ok("der Knopf verspricht nicht mehr nur Weine", /Alle Vorschläge/.test(schirm.knopf),
     schirm.knopf);

  /* ── 3 · Ein Klick ──────────────────────────────────────────────────── */
  console.log("\n3 · Ein Klick für alles");
  const vorher = DB.zeilen("mapping").length;
  await p.locator("#bAuto").click();
  await p.waitForTimeout(2500);
  const m = DB.zeilen("mapping");
  ok("vorher stand nichts in der Zuordnungstabelle", vorher === 0, String(vorher));
  ok("ein Klick schreibt alle Vorschläge in die Datenbank", m.length >= 25,
     m.length + " Zeilen");
  ok("die Speisen stehen als „ignoriert“",
     (m.find(x => x.fremd === "Käse") || {}).status === "ignoriert");
  ok("der Wein ohne Komma steht auf seinem Artikel",
     (m.find(x => x.fremd === "ZW Glatzer Rubin Carnuntum 1/8 l") || {}).artikel === "w026");
  ok("und die Zeilen des Berichts sind nachgezogen",
     (DB.zeilen("fassungszeile").find(x => x.rohbez === "ZW Glatzer Rubin Carnuntum 1/8 l")
      || {}).artikel === "w026");

  await offen("zuordnung");
  const danach = await p.evaluate(() =>
    [...document.querySelectorAll("tr")].filter(r => /vorgeschlagen/.test(r.textContent)).length);
  ok("danach steht kein Vorschlag mehr offen", danach === 0, danach + " übrig");

  /* ── 4 · Die Datenbank schlägt die Liste ────────────────────────────── */
  console.log("\n4 · Eine Bestätigung, die der Liste widerspricht");
  /* Genau der Fall, der live steht: „Cola Zero" ist auf `cola` bestätigt,
     die geprüfte Liste sagt `colaz`. Die Bestätigung muss gelten — und
     der Unterschied muss dastehen, sonst bleibt ein Vertipper für immer. */
  await p.evaluate(() => {
    const r = [...document.querySelectorAll("tr")]
      .find(x => x.firstElementChild && x.firstElementChild.textContent === "Cola Zero 0,35l");
    const s = r.querySelector("select");
    s.value = "cola"; s.dispatchEvent(new Event("change"));
  });
  await p.waitForTimeout(900);
  const streit = await p.evaluate(() => {
    const r = [...document.querySelectorAll("tr")]
      .find(x => x.firstElementChild && x.firstElementChild.textContent === "Cola Zero 0,35l");
    return { zustand: r.children[3].textContent.trim(),
             feld: r.querySelector("select").value,
             db: null };
  });
  ok("die Bestätigung gilt", streit.feld === "cola", streit.feld);
  ok("sie steht auch in der Datenbank so",
     (DB.zeilen("mapping").find(x => x.fremd === "Cola Zero 0,35l") || {}).artikel === "cola");
  ok("und die Zeile sagt, was die geprüfte Liste dazu meint",
     /geprüfte Liste sagt/.test(streit.zustand) && /Cola Zero/.test(streit.zustand),
     streit.zustand);
  const zeile = DB.zeilen("fassungszeile").find(x => x.rohbez === "Cola Zero 0,35l");
  ok("die Berichtszeile folgt der Bestätigung, nicht der Liste",
     zeile.artikel === "cola", zeile.artikel);

  /* ── 5 · Kein Name rutscht durch ────────────────────────────────────── */
  console.log("\n5 · Gegenprobe");
  const durch = await p.evaluate(namen => namen.map(n => zuordnung({ name: n }).status),
    ["Cola Zero 0,5l", "Käsebrot", "kase", "ZW Glatzer Rubin Carnuntum"]);
  ok("ein Name, der nur ÄHNLICH aussieht, bleibt offen",
     durch.every(s => s === "offen"), durch.join(", "));
  ok("die Liste steht in beiden Dateien gleich (Zahl aus gnmap.js)",
     await p.evaluate(() => Object.keys(VORAB).length) === Object.keys(VORAB).length,
     Object.keys(VORAB).length + " Einträge");

  await browser.close();
  srv.close();
  console.log("\n══ Ergebnis ══");
  console.log("  " + (geprueft - fehler) + " von " + geprueft + " Punkten in Ordnung");
  console.log(fehler ? "  Runde 22 ROT." : "  Runde 22 grün — ein Klick reicht.");
  process.exit(fehler ? 1 : 0);
})();
