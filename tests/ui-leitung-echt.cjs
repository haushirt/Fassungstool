/* ═══════════════════════════════════════════════════════════════════════
   Das Backoffice an einem echten Z-Bericht und einem echten Worker.

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
const PORT = 8955;
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };
/* Bei jedem Lauf gewürfelt (Regel 9). */
const CODE = String(require("crypto").randomInt(100000, 1000000));

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

  /* ── 1 · Den echten Bericht durch die Oberfläche einlesen ───────────── */
  console.log("\n1 · Z-Bericht über die Oberfläche einlesen");
  const TEXT = fs.readFileSync(FIXTURE, "utf8");
  let { ctx, p } = await sitzung();
  await offen(p, "import");
  ok("die Import-Ansicht ist da", await p.locator("#roh").count() === 1);

  await p.evaluate(t => { const r = document.getElementById("roh");
    r.value = t; r.dispatchEvent(new Event("input")); }, TEXT);
  await p.locator("#bLies").click();
  await p.waitForTimeout(1200);

  const gelesen = await p.evaluate(() => {
    const z = ZBER["2026-09-16"];
    return z ? { n: z.positionen.length, umsatz: z.umsatz,
                 stueck: z.positionen.reduce((a, x) => a + x.anzahl, 0),
                 nr: z.nr, achtel: (z.positionen.find(x => /GV Leindl/.test(x.name)) || {}).ml }
             : null;
  });
  ok("der Bericht ist angekommen", !!gelesen);
  ok("48 Positionen, nicht 106", gelesen && gelesen.n === POSITIONEN, gelesen && gelesen.n);
  ok("145 Stück, nicht 1345,75", gelesen && gelesen.stueck === STUECK, gelesen && gelesen.stueck);
  ok("602,50 €, nicht 5166,70 €", gelesen && Math.round(gelesen.umsatz * 100) / 100 === UMSATZ,
     gelesen && gelesen.umsatz);
  ok("Z-Nummer aus dem Bericht", gelesen && gelesen.nr === "Z 37", gelesen && gelesen.nr);
  ok("das Achtel ist ein Achtel, keine acht Liter", gelesen && gelesen.achtel === 125,
     gelesen && gelesen.achtel);

  const inDb = DB.zeilen("fassungszeile").length;
  ok("die Zeilen stehen in der Datenbank, nicht im Browser", inDb === POSITIONEN, inDb + " Zeilen");

  /* Nach dem Einlesen springt die Seite auf „Zuordnung" — die Liste der
     Kassennamen, die eine Entscheidung brauchen. Der Bericht selbst steht
     danach unter „Auf dem Server". */
  await offen(p, "import");
  const sichtbar = await p.evaluate(() => document.querySelector("main").textContent);
  ok("der Bericht steht unter „Auf dem Server“ mit der Zahl des Servers",
     /48/.test(sichtbar) && /602,50/.test(sichtbar) && !/106/.test(sichtbar));

  /* ── 2 · Zuordnen, und zwar für alle ────────────────────────────────── */
  console.log("\n2 · Zuordnung");
  await offen(p, "zuordnung");
  const ersteZeile = await p.evaluate(() => {
    const s = document.querySelector("select[data-name]");
    return s ? s.dataset.name : null;
  });
  ok("die Zuordnungsliste steht", !!ersteZeile, ersteZeile);
  await p.evaluate(() => {
    const s = document.querySelector("select[data-name]");
    s.value = "__ignoriert"; s.dispatchEvent(new Event("change"));
  });
  await p.waitForTimeout(700);
  const m = DB.zeilen("mapping");
  ok("die Zuordnung steht in der Datenbank `mapping`", m.length === 1, JSON.stringify(m[0] || {}));
  ok("sie steht als „ignoriert“", (m[0] || {}).status === "ignoriert");

  /* ── 3 · Das zweite Gerät ───────────────────────────────────────────── */
  console.log("\n3 · Zweites Gerät, leerer Browserspeicher");
  await ctx.close();
  ({ ctx, p } = await sitzung());
  await offen(p, "import");
  const zweit = await p.evaluate(() => ({
    berichte: Object.keys(ZBER).length,
    positionen: (ZBER["2026-09-16"] || { positionen: [] }).positionen.length,
    zuordnungen: Object.keys(MAP).length,
    lokalVorher: !!localStorage.getItem("hh_zberichte_v1")
  }));
  ok("der Bericht ist auch hier da", zweit.berichte === 1 && zweit.positionen === POSITIONEN,
     JSON.stringify(zweit));
  ok("die Zuordnung ist auch hier da", zweit.zuordnungen === 1, zweit.zuordnungen);

  /* ── 4 · Der Bericht aus der Mail ───────────────────────────────────── */
  console.log("\n4 · Ein Bericht, den niemand am MacBook eingelesen hat");
  const zweiterTag = TEXT.replace("16.09.2026 23:26", "17.09.2026 23:26").replace('"37"', '"38"');
  await fetch(BASIS + "/api/fassungsliste", { method: "POST",
    headers: { "content-type": "text/plain", cookie: keks }, body: zweiterTag });
  ok("zwei Berichte in der Datenbank", DB.zeilen("fassungsliste").length === 2);
  await ctx.close();
  ({ ctx, p } = await sitzung());
  await offen(p, "import");
  const beide = await p.evaluate(() => Object.keys(ZBER).sort());
  ok("das Backoffice sieht beide", beide.length === 2, beide.join(", "));

  /* ── 5 · Teilzählung ────────────────────────────────────────────────── */
  console.log("\n5 · Kellerbestand nach einer Teilzählung");
  const put = (sch, daten) => fetch(BASIS + "/api/vorgang/" + encodeURIComponent(sch),
    { method: "PUT", headers: { "content-type": "application/json", cookie: keks },
      body: JSON.stringify(daten) });
  const alleWeine = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "stamm.json"), "utf8"))
    .WINES.map(w => w.id);
  /* Die Form, in der die App eine Kellerzählung schickt: `zdone` sagt,
     welcher Wein gezählt wurde, `reihen` und `einzel` tragen die Zahl
     (eine Reihe sind sechs Flaschen). */
  const zaehlung = (paare) => {
    const zdone = {}, reihen = {}, einzel = {};
    for (const [id, n] of paare) { zdone[id] = 1; reihen[id] = 0; einzel[id] = n; }
    return { zdone, reihen, einzel };
  };
  await put("keller_2026-09-14", Object.assign({ mode: "keller", tag: "2026-09-14",
    name: "Casimir", zeit: "2026-09-14T09:00:00.000Z", finished: true },
    zaehlung(alleWeine.map((id, i) => [id, 3 + (i % 3)]))));
  const dreiIds = alleWeine.slice(0, 3);
  await put("keller_2026-09-16", Object.assign({ mode: "keller", tag: "2026-09-16",
    name: "Casimir", zeit: "2026-09-16T09:00:00.000Z", finished: true },
    zaehlung([[dreiIds[0], 1], [dreiIds[1], 2], [dreiIds[2], 0]])));

  await ctx.close();
  ({ ctx, p } = await sitzung());
  await offen(p, "bestand");
  const nach = await p.evaluate(ids => {
    const b = bestand();
    return { mitZahl: Object.keys(b.b).length, hat: b.hat,
             ersteDrei: ids.map(i => b.b[i]) };
  }, dreiIds);
  ok("nach der Teilzählung stehen alle Weine mit einer Zahl da",
     nach.mitZahl === alleWeine.length, nach.mitZahl + " von " + alleWeine.length);
  ok("die Teilzählung hat genau die drei gezählten überschrieben",
     nach.ersteDrei[0] === 1 && nach.ersteDrei[1] === 2 && nach.ersteDrei[2] === 0,
     JSON.stringify(nach.ersteDrei));

  const schirm = await p.evaluate(() => document.querySelector("main").textContent);
  ok("der Schirm nennt die jüngste Zählung als Grundlage",
     /16\.09\.2026/.test(schirm) && !/keine Kellerzählung/.test(schirm));

  /* ── 6 · Die Leitung sperrt sich nicht selbst aus ───────────────────── */
  console.log("\n6 · Mitarbeiter");
  await offen(p, "team");
  const zustand = await p.evaluate(async () => {
    const b = [...document.querySelectorAll("[data-ap]")][0];
    b.click(); await new Promise(r => setTimeout(r, 400));
    const t = document.getElementById("toast");
    return { meldung: t ? t.textContent : "", aktiv: (await (await fetch("/api/personen")).json())
      .personen.filter(x => x.aktiv).length };
  });
  ok("der Klick auf „Sperren“ bei der eigenen Person wird abgefangen",
     /nicht mehr herein|einzige freigegebene/.test(zustand.meldung), zustand.meldung);
  ok("die Person ist weiter freigegeben", zustand.aktiv === 1);

  /* ── 7 · „Größe fehlt" statt einer erfundenen Menge ─────────────────── */
  console.log("\n7 · Verkauf ↔ Fassung: unbestätigte Gebindegrößen");
  await ctx.close();
  ({ ctx, p } = await sitzung());
  await offen(p, "abgleich");
  const lage = await p.evaluate(() => {
    vAbgleich.tag = "2026-09-16"; SPANNE = 1; zeichne();
    const a = abgleich("2026-09-16", 1);
    return { ohne: a.ohneGroesse.length, verk: Object.keys(a.verk).length,
             gv: (a.ohneGroesse.find(o => /GV Leindl/.test(o.name)) || {}),
             text: document.querySelector("main").textContent };
  });
  ok("die Ansicht weist „Größe fehlt“ aus", /Größe fehlt/.test(lage.text));
  ok("die Achtel-Position steht dort mit ihrer echten Menge",
     lage.gv.anzahl === 4 && lage.gv.fehlt === "gebinde", JSON.stringify(lage.gv.anzahl));
  ok("solange nichts bestätigt ist, rechnet keine Zeile mit",
     lage.verk === 0, lage.verk + " Artikel in der Mengenrechnung");
  /* Bis v27 stand in jeder Zelle noch einmal das Wort „Vorschlag:" — das
     steht seit v28 nur in der Spaltenüberschrift, der Knopf daneben ist
     rechtsbündig. Geprüft wird beides: die Überschrift und der Wert. */
  ok("der Vorschlag steht sichtbar daneben",
     /750 ml/.test(lage.text) && /Vorschlag/.test(lage.text));

  /* Der Klick, der aus dem Vorschlag eine Bestätigung macht. */
  const geklickt = await p.evaluate(async () => {
    const b = [...document.querySelectorAll("button[data-geb]")]
      .find(x => /GV Leindl/.test(x.dataset.geb));
    if (!b) return null;
    const d = { name: b.dataset.geb, art: b.dataset.art, ml: b.dataset.ml };
    b.click(); await new Promise(r => setTimeout(r, 800));
    const a = abgleich("2026-09-16", 1);
    return Object.assign(d, { verkauf: a.verk.w001,
      nochOffen: a.ohneGroesse.some(o => /GV Leindl/.test(o.name)) });
  });
  ok("es gibt einen Knopf „Übernehmen“ an der Zeile", !!geklickt, geklickt && geklickt.name);
  const zeileDb = DB.zeilen("mapping").find(r => /GV Leindl/.test(r.fremd)) || {};
  ok("die bestätigte Größe steht in der Datenbank `mapping`",
     zeileDb.gebinde_ml === 750, JSON.stringify(zeileDb));
  ok("der Artikel geht dabei nicht verloren", zeileDb.artikel === "w001", zeileDb.artikel);
  ok("danach ist die Position gerechnet: 4 × 125 ml aus 750 ml = 0,67 Flaschen",
     geklickt && Math.abs(geklickt.verkauf - 4 * 125 / 750) < 0.001 && !geklickt.nochOffen,
     geklickt && String(geklickt.verkauf));

  /* ── 8 · Alle Vorschläge auf einmal ─────────────────────────────────
     In der Live-Datenbank hat KEINE Zuordnung eine bestätigte
     Gebindegröße. Einzeln wären das dreizehn Klicks, bevor der Abgleich
     am Morgen überhaupt eine Zahl zeigt. */
  console.log("\n8 · Sammelbestätigung der Gebindegrößen");
  /* Eine Position, für die es keinen Vorschlag geben KANN: im Kassennamen
     steht „1 Glas", keine Ausschankmenge. Sie muss in der Liste stehen
     bleiben, und der Sammelknopf darf sie nicht mitnehmen. */
  await p.evaluate(async () => {
    MAP["Sanbitter Spritz 1 Glas"] = "sanbitter"; schreib(K_MAP, MAP);
    await sendeZuordnung("Sanbitter Spritz 1 Glas", "sanbitter");
    /* Und eine Rezeptzeile: hier ist die Id, die in der Liste steht, ein
       BESTANDTEIL. Würde der Sammelknopf sie anfassen, stünde danach
       „dieses Mischgetränk = dieser Wein" in `mapping` — rückwirkend für
       jede gespeicherte Berichtszeile. */
    REZ["Amaro Averna Siciliano 2 cl"] = [{ id: "w020", ml: 20 }];
    schreib(K_REZ, REZ);
    zeichne();
  });
  await p.waitForTimeout(500);

  const vorher = await p.evaluate(() => {
    const a = abgleich("2026-09-16", 1);
    /* Dieselbe Bedingung wie im Sammelknopf: Rezeptzeilen gehören NICHT
       dazu (ihre Id ist ein Bestandteil, siehe unten). */
    const mit = a.ohneGroesse.filter(o =>
      o.fehlt === "gebinde" && !o.rezept && o.id && o.geb && o.geb.ml);
    const b = document.getElementById("bGebAlle");
    return { offen: a.ohneGroesse.length, mitVorschlag: mit.length,
             ohneVorschlag: a.ohneGroesse.length - mit.length,
             knopf: b ? b.textContent.trim() : null };
  });
  ok("es gibt einen Sammelknopf mit der Zahl darin",
     !!vorher.knopf && vorher.knopf.includes(String(vorher.mitVorschlag)), vorher.knopf);
  ok("es gibt überhaupt etwas zu bestätigen", vorher.mitVorschlag > 0,
     vorher.mitVorschlag + " mit Vorschlag, " + vorher.ohneVorschlag + " ohne");

  const mapVorher = DB.zeilen("mapping").filter(r => r.gebinde_ml).length;
  const nachher = await p.evaluate(async () => {
    document.getElementById("bGebAlle").click();
    await new Promise(r => setTimeout(r, 1500));
    const a = abgleich("2026-09-16", 1);
    return { offen: a.ohneGroesse.length,
             mitVorschlag: a.ohneGroesse.filter(o =>
               o.fehlt === "gebinde" && !o.rezept && o.geb && o.geb.ml).length,
             gerechnet: Object.keys(a.verk).length,
             meldung: (document.getElementById("toast") || {}).textContent || "" };
  });
  const mapNachher = DB.zeilen("mapping").filter(r => r.gebinde_ml).length;
  ok("jede bestätigte Größe steht einzeln in der Datenbank `mapping`",
     mapNachher - mapVorher === vorher.mitVorschlag,
     (mapNachher - mapVorher) + " neue Zeilen mit gebinde_ml");
  ok("die Rückmeldung nennt die Zahl",
     new RegExp(vorher.mitVorschlag + " Größen bestätigt").test(nachher.meldung), nachher.meldung);
  ok("danach steht keine Position mehr mit einem offenen Vorschlag da",
     nachher.mitVorschlag === 0, nachher.mitVorschlag);
  ok("was keinen Vorschlag hat, bleibt unangetastet",
     nachher.offen === vorher.ohneVorschlag, nachher.offen + " bleiben");
  ok("jetzt rechnen die Positionen mit", nachher.gerechnet > 0,
     nachher.gerechnet + " Artikel in der Mengenrechnung");

  /* Der Fund A-6: eine Rezeptzeile trägt den Bestandteil als Id. Weder der
     Sammelknopf noch der Knopf an der Zeile darf daraus eine Zuordnung
     machen — es gibt keinen Papierkorb. */
  const rezeptZeile = await p.evaluate(async () => {
    const a = abgleich("2026-09-16", 1);
    const o = a.ohneGroesse.find(x => x.name === "Amaro Averna Siciliano 2 cl") || {};
    const knopf = [...document.querySelectorAll("button[data-geb]")]
      .some(b => b.dataset.geb === "Amaro Averna Siciliano 2 cl");
    /* Und der Weg von Hand, falls ihn doch jemand aufruft: */
    await bestaetigeGebinde("Amaro Averna Siciliano 2 cl", "w020", 750);
    await new Promise(r => setTimeout(r, 400));
    return { rezept: !!o.rezept, id: o.id, knopf, map: MAP["Amaro Averna Siciliano 2 cl"] };
  });
  ok("die Rezeptzeile steht als Mischgetränk da, mit dem Bestandteil benannt",
     rezeptZeile.rezept && rezeptZeile.id === "w020", JSON.stringify(rezeptZeile));
  ok("an einer Rezeptzeile gibt es keinen Übernehmen-Knopf", !rezeptZeile.knopf);
  ok("auch der Sammelklick hat sie nicht angefasst",
     rezeptZeile.map === undefined &&
     !DB.zeilen("mapping").some(r => r.fremd === "Amaro Averna Siciliano 2 cl"),
     "mapping-Zeilen: " + DB.zeilen("mapping").length);

  /* ── Ergebnis ───────────────────────────────────────────────────────── */
  await browser.close(); srv.close();
  console.log("\n══ Ergebnis ══");
  console.log(fehler ? `  ${fehler} von ${geprueft} Punkten NICHT in Ordnung`
                     : `  ${geprueft} von ${geprueft} Punkten in Ordnung`);
  console.log(fehler ? "  Backoffice rot." : "  Backoffice grün — es sieht, was der Server sieht.");
  process.exit(fehler ? 1 : 0);
})();
