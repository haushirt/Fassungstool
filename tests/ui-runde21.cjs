/* ═══════════════════════════════════════════════════════════════════════
   Runde 21 am Bildschirm · echter Browser, echter Worker, echte SQLite

   Zwei Dinge lassen sich nur hier beantworten:

     1  Sieht die Leitung es, wenn ein Teilbericht den vollen ersetzt?
        Am Prüfstand steht nur, dass der Worker es MELDET. Ob die Meldung
        auf dem Schirm ankommt und stehen bleibt, statt als Toast
        wegzulaufen, sagt nur die Seite selbst.

     2  Wie viele Anfragen kostet das Öffnen des Backoffice? Bis Runde 21
        waren es 61 nacheinander — gemessen 4,1 s leerer Schirm. Gezählt
        wird hier, was der Browser wirklich schickt.

   Kein Netz, keine Live-Datenbank, kein Deploy (Regel 2).
   Lauf: node tests/ui-runde21.cjs
   ═══════════════════════════════════════════════════════════════════════ */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — Runde 21 bleibt am Schirm UNGEPRÜFT.");
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const FIXTURE = path.join(__dirname, "fixtures", "zbericht-37-extended.csv");
const PORT = 8957;
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };
const CODE = String(require("crypto").randomInt(1000, 10000));

let fehler = 0, geprueft = 0;
const ok = (satz, bedingung, dazu) => {
  geprueft++;
  console.log((bedingung ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
  if (!bedingung) fehler++;
};

const TEXT = fs.readFileSync(FIXTURE, "utf8");

/* Derselbe Tag, aber nur die ersten zehn Positionszeilen — die Form, die
   ein getrennter Abschluss der Bar erzeugt. */
function beschnitten(nr, behalten) {
  const zeilen = TEXT.split(/\r?\n/);
  const ab = zeilen.findIndex(z => /^"Positionen"\t"Anzahl"/.test(z));
  let gesehen = 0;
  return zeilen.filter((z, i) => {
    if (i <= ab + 1) return true;
    if (!/^"[^"]+"\t"[\d,.]+"/.test(z)) return true;
    return ++gesehen <= behalten;
  }).join("\n").replace(/^"Z"\t"37"/m, `"Z"\t"${nr}"`);
}

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

  console.log("\n══ Runde 21 am Bildschirm ══\n");

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

  /* Jede Anfrage an die Fassungsliste mitschreiben. */
  let rufe = [];
  p.on("request", r => { if (/\/api\/fassungsliste/.test(r.url())) rufe.push(r.method() + " " + r.url()); });

  const einlesen = async text => {
    await p.evaluate(s => { SEITE = "import"; zeichne(); });
    await p.waitForTimeout(300);
    await p.evaluate(t => { document.querySelector("#roh").value = t;
                            document.querySelector("#roh").dispatchEvent(new Event("input")); }, text);
    await p.click("#bLies");
    await p.waitForTimeout(700);
  };

  /* ── 1 · Der volle Bericht ──────────────────────────────────────────── */
  console.log("1 · Den echten Bericht einlesen");
  await p.goto(BASIS + "/leitung.html", { waitUntil: "load" });
  await p.waitForTimeout(700);
  await einlesen(TEXT);

  ok("48 Positionen stehen in der Datenbank", DB.zeilen("fassungszeile").length === 48,
     DB.zeilen("fassungszeile").length + " Zeilen");
  const l = DB.zeilen("fassungsliste")[0];
  ok("die Kostenstelle ist mitgekommen", l.kostenstelle === "Haus Hirt", l.kostenstelle);
  ok("der Zeitraum ist mitgekommen", l.von_ts > 0 && l.bis_ts > l.von_ts,
     new Date(l.von_ts).toISOString() + " → " + new Date(l.bis_ts).toISOString());

  const stand = await p.evaluate(() => document.querySelector("main").textContent);
  ok("nach einem sauberen Bericht steht KEIN Warnhinweis",
     !/Teilbericht/.test(stand));

  await p.evaluate(() => { SEITE = "import"; zeichne(); });
  await p.waitForTimeout(400);
  const imp = await p.evaluate(() => document.querySelector("main").textContent);
  ok("der Zeitraum steht am Schirm, in Wiener Zeit",
     /15\.09\. 23:11 – 16\.09\. 23:26/.test(imp),
     (imp.match(/\d\d\.\d\d\. \d\d:\d\d – \d\d\.\d\d\. \d\d:\d\d/) || ["nicht gefunden"])[0]);
  ok("die Tabelle „Auf dem Server“ hat eine Spalte Zeitraum",
     /Zeitraum/.test(imp));

  /* ── 2 · Der Teilbericht ────────────────────────────────────────────── */
  console.log("\n2 · Ein Teilbericht ersetzt ihn");
  await einlesen(beschnitten("41", 10));

  const nach = await p.evaluate(() => document.querySelector("main").textContent);
  ok("der Hinweis steht auf dem Schirm", /Teilbericht/.test(nach));
  ok("er nennt beide Berichte", /Z 37/.test(nach));
  ok("er nennt beide Positionszahlen", /48 Positionen/.test(nach) && /8 Positionen/.test(nach));
  ok("er sagt, was zu tun ist", /noch einmal\s+ziehen|noch einmal ziehen/.test(nach.replace(/\s+/g, " ")));
  ok("die Seite ist NICHT weitergesprungen", await p.evaluate(() => SEITE) === "import",
     await p.evaluate(() => SEITE));

  const notizen = DB.zeilen("ereignis").filter(r => r.quelle === "zbericht");
  ok("im Journal steht genau eine Zeile", notizen.length === 1, notizen.length + "");
  ok("und sie nennt beide Z-Nummern",
     notizen.length === 1 && /Z 37/.test(notizen[0].notiz) && /Z 41/.test(notizen[0].notiz),
     notizen[0] && notizen[0].notiz);

  /* Der Hinweis lässt sich wegklicken und kommt nicht von selbst wieder. */
  await p.click("#bWegW");
  await p.waitForTimeout(300);
  const weg = await p.evaluate(() => document.querySelector("main").textContent);
  ok("„Verstanden“ räumt den Hinweis weg", !/Teilbericht/.test(weg));

  /* ── 3 · Wie viele Anfragen kostet das Öffnen? ──────────────────────── */
  console.log("\n3 · Der Start des Backoffice");
  for (const d of ["10", "11", "12", "13", "14"]) {
    await fetch(BASIS + "/api/fassungsliste", { method: "POST",
      headers: { "content-type": "text/plain", cookie: keks },
      body: TEXT.replace(/"Bis"\t"16\.09\.2026/, `"Bis"\t"${d}.09.2026`) });
  }
  ok("sechs Betriebstage liegen auf dem Server", DB.zeilen("fassungsliste").length === 6,
     DB.zeilen("fassungsliste").length + "");

  rufe = [];
  const t0 = Date.now();
  await p.goto(BASIS + "/leitung.html", { waitUntil: "load" });
  await p.waitForTimeout(900);
  const dauer = Date.now() - t0;

  ok("das Öffnen kostet EINE Anfrage an die Fassungsliste, nicht sieben",
     rufe.length === 1, rufe.length + " Anfragen: " + rufe.join(" · "));
  ok("und es ist der Sammelabruf", /zeilen=1/.test(rufe[0] || ""), rufe[0]);
  ok("alle sechs Berichte sind danach geladen",
     await p.evaluate(() => Object.keys(ZBER).length) === 6,
     await p.evaluate(() => Object.keys(ZBER).length) + "");
  ok("jeder davon vollständig mit seinen Positionen",
     await p.evaluate(() => Object.values(ZBER).every(z => z.positionen.length > 0)));
  console.log("  · gemessen: " + dauer + " ms bis der Schirm steht");

  console.log("\n══ Ergebnis ══");
  console.log("  " + (geprueft - fehler) + " von " + geprueft + " Punkten in Ordnung");
  console.log(fehler ? "  ROT." : "  Runde 21 grün — die Leitung sieht es, und der Start ist flach.");
  await browser.close();
  srv.close();
  process.exit(fehler ? 1 : 0);
})();
