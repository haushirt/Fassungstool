/* Schlusskontrolle vor dem Merge · Runde 15 (qa-guardian)
   ──────────────────────────────────────────────────────────────
       node tests/qa-schluss.cjs

   NICHT Teil von `npm test` (braucht Playwright, Regel 8). Geprüft wird,
   was zwischen Runde 13/14 und dem Livegang steht und sich nur BEDIENT
   prüfen lässt:

     1 · Der Grund der Sonderentnahme im Getränke-Zweig.
     2 · Ein Vorgang, der VOR dem Deploy ohne Feld `grund` angefangen
         wurde: weiterarbeiten, abschliessen, in den Ausgang.
     3 · Der Ausgang hält je Schlüssel einen Eintrag (Regel: ein Vorgang
         ist ein Zustand), auch nach zweimaligem Abschluss.
     4 · Abbruch mitten in der Eingabe: neu laden, Stand steht noch.
     5 · Abgelaufene Sitzung (401): der Ausgang bleibt gefüllt.
     6 · Der Bildspeicher `hh_fotos` wird geleert — und die Marke fällt
         erst NACH dem Erfolg.

   Rückgabewert 1, sobald eine Prüfung „nein" sagt.                    */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) { console.log("Playwright nicht gefunden — UNGEPRÜFT."); process.exit(0); }

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };
const PORT = 8993;
const OUT = path.join(__dirname, "..", "review", "screens", "qa15");
fs.mkdirSync(OUT, { recursive: true });
const bild = (p, name) => p.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true });

const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna",
  year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

let ROLLE = "service", WER = "Asad", CODE401 = false;
const PUTS = [];
const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    if (CODE401) { a.writeHead(401, kopf); return a.end('{"fehler":"weg"}'); }
    if (u === "/api/ich") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: WER, rolle: ROLLE })); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ vorgaenge: [] })); }
    if (q.method === "PUT") {
      let b = ""; q.on("data", c => b += c);
      return q.on("end", () => { PUTS.push({ url: u, body: b });
        a.writeHead(200, kopf); a.end('{"gespeichert":true}'); });
    }
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

async function seite(b, vorher) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(SAAT("Asad"));
  if (vorher) await ctx.addInitScript(vorher);
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", e => fehler.push(e.message));
  await p.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "load" });
  await p.waitForTimeout(700);
  return { ctx, p, fehler };
}
const grussWeg = async p => {
  const k = p.locator("#grussPasst");
  if (await k.count() && await k.isVisible()) { await k.click(); await p.waitForTimeout(250); }
};
const hilfeWeg = async p => {
  await p.evaluate(() => { if (typeof schliesseHilfe === "function") schliesseHilfe(); });
  await p.waitForTimeout(150);
};
const gruendeSichtbar = p => p.evaluate(() =>
  document.querySelectorAll(".grundb").length);
/* Vor dem ersten Schritt steht das Tor „Was wird erfasst?" (.gate). */
const tor = async (p, was) => {
  await p.evaluate(w => { const b = [...document.querySelectorAll(".gate [data-b]")]
    .find(x => x.dataset.b === w); if (b) b.click(); }, was);
  await p.waitForTimeout(400);
};

(async () => {
  await new Promise(r => srv.listen(PORT, "127.0.0.1", r));
  const b = await pw.chromium.launch();
  try {
    /* ── 1 · Sonderentnahme, Zweig Getränke ─────────────────────────── */
    {
      const { ctx, p } = await seite(b);
      await grussWeg(p);
      await p.evaluate(() => start("nach"));
      await p.waitForTimeout(400);
      await tor(p, "wein"); await hilfeWeg(p);
      const wein = await gruendeSichtbar(p);
      /* Zurueck ans Tor und den anderen Zweig nehmen */
      await p.evaluate(() => { const b2 = [...document.querySelectorAll("[data-b]")]
        .find(x => x.dataset.b === "getr"); if (b2) b2.click(); });
      await p.waitForTimeout(400); await hilfeWeg(p);
      const getr = await gruendeSichtbar(p);
      await bild(p, "390-sonderentnahme-getraenke-ohne-grund");
      urteil("Sonderentnahme · Wein: die fünf Grundknöpfe stehen da", wein === 5, wein + " Knöpfe");
      urteil("Sonderentnahme · Getränke: der Grund ist erreichbar", getr === 5,
             getr + " Knöpfe im Zweig Getränke");
      /* Und was sagt der Abschluss dort? */
      const offen = await p.evaluate(() => { const o = offenList(); return o; });
      urteil("Sonderentnahme · Getränke: kein unerfüllbarer offener Punkt",
             !offen.some(t => t.indexOf("Grund fehlt") === 0),
             JSON.stringify(offen));
      /* Der Sprung des offenen Punktes führt wohin? */
      const ziel = await p.evaluate(() => offenZiel("Grund fehlt – wofür wurde geholt?"));
      const nachSprung = await p.evaluate(z => { go(z); return null; }, ziel)
        .then(() => p.waitForTimeout(400)).then(() => gruendeSichtbar(p));
      urteil("der Sprung vom offenen Punkt landet bei den Grundknöpfen",
             nachSprung === 5, "Schritt " + ziel + " zeigt " + nachSprung + " Knöpfe");
      /* Was kostet der unerfüllbare Punkt im Abschluss? */
      await p.evaluate(() => { const d = D(); d.gent = { cola033: 6 }; save(); go(lastStep()); });
      await p.waitForTimeout(500); await hilfeWeg(p);
      await p.evaluate(() => document.querySelector(".finishbtn").click());
      await p.waitForTimeout(400);
      const dialog = await p.evaluate(() => ({
        an: document.querySelector("#ov").classList.contains("on"),
        t: (document.querySelector("#ovT") || {}).textContent,
        code: !!document.querySelector("#fgCode") }));
      await bild(p, "390-sonderentnahme-getraenke-abschluss-code");
      urteil("Getränke-Sonderentnahme lässt sich ohne Code abschliessen",
             !(dialog.an && dialog.code), dialog.t + " · Codefeld: " + dialog.code);
      await ctx.close();
    }

    /* ── 2 · Vorgang von VOR dem Deploy, ohne Feld `grund` ───────────── */
    {
      const alt = `(()=>{ try{
        localStorage.setItem("hh_keller_v12", JSON.stringify({nach:{
          mode:"nach", tag:${JSON.stringify(heute)}, name:"Asad", notiz:"",
          ent:{w026:2}, gent:{}, gzusatz:{}, finished:false }}));
      }catch(e){} })();`;
      const { ctx, p, fehler } = await seite(b, alt);
      await grussWeg(p);
      await p.evaluate(() => start("nach"));
      await p.waitForTimeout(400);
      await tor(p, "wein"); await hilfeWeg(p);
      const stand = await p.evaluate(() => JSON.stringify(D().ent));
      urteil("alter Vorgang ohne `grund`: der Stand ist da", stand === '{"w026":2}', stand);
      urteil("alter Vorgang ohne `grund`: kein JS-Fehler", fehler.length === 0,
             fehler[0] || "keiner");
      /* Grund wählen und abschliessen */
      await p.evaluate(() => { document.querySelectorAll(".grundb")[2].click(); });
      await p.waitForTimeout(300);
      const gew = await p.evaluate(() => D().grund);
      urteil("der Grund wird im Vorgang abgelegt", gew === "bruch", String(gew));
      await p.evaluate(() => { go(lastStep()); });
      await p.waitForTimeout(400); await hilfeWeg(p);
      const offen = await p.evaluate(() => offenList());
      urteil("mit Grund ist im Abschluss nichts mehr offen", offen.length === 0,
             JSON.stringify(offen));
      await p.evaluate(() => { const fb = document.querySelector(".finishbtn"); fb.click(); });
      await p.waitForTimeout(600);
      const paket = await p.evaluate(() => {
        const a = JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]");
        return { n: a.length, s: a[0] && a[0].schluessel, g: a[0] && a[0].daten.grund };
      });
      urteil("der Abschluss legt genau einen Eintrag in den Ausgang",
             paket.n <= 1, paket.n + " Einträge · " + paket.s);
      urteil("der Grund reist im Paket mit", paket.g === "bruch" || PUTS.length > 0,
             "grund=" + paket.g + " · PUTs=" + PUTS.length);
      const gesendet = PUTS.filter(x => x.url.indexOf("nach_") >= 0);
      if (gesendet.length) {
        const d = JSON.parse(gesendet[gesendet.length - 1].body);
        urteil("das gesendete Paket trägt den Grund", d.grund === "bruch", String(d.grund));
      }
      await ctx.close();
    }

    /* ── 3 · Offline abschliessen, zweimal — ein Eintrag je Schlüssel ── */
    {
      const { ctx, p } = await seite(b);
      await ctx.setOffline(true);
      await grussWeg(p);
      await p.evaluate(() => start("nach"));
      await p.waitForTimeout(400);
      await tor(p, "wein"); await hilfeWeg(p);
      await p.evaluate(() => { const d = D(); d.ent = { w026: 2 }; d.grund = "kueche"; save(); render(); });
      await p.waitForTimeout(200);
      await p.evaluate(() => { go(lastStep()); });
      await p.waitForTimeout(400); await hilfeWeg(p);
      await p.evaluate(() => document.querySelector(".finishbtn").click());
      await p.waitForTimeout(400);
      /* noch einmal: Stand ändern und erneut abschliessen */
      await p.evaluate(() => { const d = D(); d.finished = false; d.ent = { w026: 3 }; save();
        geholteGetraenke(d); d.finished = true; save(); inDenAusgang(d, "fertig"); });
      await p.waitForTimeout(300);
      const a = await p.evaluate(() => JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]"));
      const schl = [...new Set(a.map(x => x.schluessel))];
      urteil("offline · der Ausgang hält je Schlüssel einen Eintrag",
             a.length === schl.length && a.length === 1,
             a.length + " Einträge, " + schl.length + " Schlüssel");
      urteil("offline · der jüngste Stand gewinnt",
             a[0] && a[0].daten.ent && a[0].daten.ent.w026 === 3,
             JSON.stringify(a[0] && a[0].daten.ent));
      /* wieder online: geht es hinaus? */
      const vorher = PUTS.length;
      await ctx.setOffline(false);
      await p.evaluate(() => schiebe());
      await p.waitForTimeout(800);
      const rest = await p.evaluate(() => JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length);
      urteil("online · der Ausgang leert sich", rest === 0 && PUTS.length > vorher,
             rest + " übrig · " + (PUTS.length - vorher) + " PUT");
      await ctx.close();
    }

    /* ── 4 · Abbruch mitten in der Eingabe ───────────────────────────── */
    {
      const { ctx, p } = await seite(b);
      await grussWeg(p);
      await p.evaluate(() => start("nach"));
      await p.waitForTimeout(400);
      await tor(p, "wein"); await hilfeWeg(p);
      await p.evaluate(() => { document.querySelectorAll(".grundb")[0].click(); });
      await p.evaluate(() => { const d = D(); d.ent = { w026: 1 }; save(); });
      await p.waitForTimeout(200);
      await p.reload({ waitUntil: "load" });
      await p.waitForTimeout(700);
      const nach = await p.evaluate(() => {
        const S2 = JSON.parse(localStorage.getItem("hh_keller_v12") || "{}");
        return { g: S2.nach && S2.nach.grund, e: JSON.stringify(S2.nach && S2.nach.ent) };
      });
      urteil("Abbruch mitten in der Eingabe: Grund und Menge stehen noch",
             nach.g === "kueche" && nach.e === '{"w026":1}', JSON.stringify(nach));
      await ctx.close();
    }

    /* ── 5 · Abgelaufene Sitzung ─────────────────────────────────────── */
    {
      const { ctx, p } = await seite(b);
      await grussWeg(p);
      await p.evaluate(() => start("nach"));
      await p.waitForTimeout(300);
      await tor(p, "wein"); await hilfeWeg(p);
      await p.evaluate(() => { const d = D(); d.ent = { w026: 2 }; d.grund = "bruch";
        d.finished = true; save(); inDenAusgang(d, "fertig"); });
      CODE401 = true;
      await p.evaluate(() => schiebe());
      await p.waitForTimeout(800);
      const st = await p.evaluate(() => ({ n: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length,
                                           z: NETZ.zustand }));
      urteil("abgelaufene Sitzung: nichts geht verloren, der Ausgang bleibt",
             st.n === 1 && st.z === "abgemeldet", st.n + " Einträge · " + st.z);
      CODE401 = false;
      await ctx.close();
    }

    /* ── 6 · Der Bildspeicher ────────────────────────────────────────── */
    {
      const vorher = `(()=>{ try{
        localStorage.setItem("hh_archiv", JSON.stringify({ "nach_2026-09-01":
          { mode:"nach", tag:"2026-09-01", fotos:[{k:"a"}], archiviert:"2026-09-01T20:00:00Z" }}));
        const q = indexedDB.open("hh_fotos", 1);
        q.onupgradeneeded = () => { try{ q.result.createObjectStore("f"); }catch(e){} };
        /* Die Verbindung wieder loslassen — ein offener Griff blockiert
           deleteDatabase, und genau das ist der Fall eines zweiten Tabs. */
        q.onsuccess = () => { try{ q.result.close(); }catch(e){} };
      }catch(e){} })();`;
      const { ctx, p } = await seite(b, vorher);
      await p.waitForTimeout(900);
      const st = await p.evaluate(async () => {
        const marke = localStorage.getItem("hh_fotos_geloescht_v1");
        const arch = JSON.parse(localStorage.getItem("hh_archiv") || "{}");
        let namen = [];
        try { namen = (await indexedDB.databases()).map(d => d.name); } catch (e) { namen = ["?"]; }
        return { marke, fotos: !!(arch["nach_2026-09-01"] || {}).fotos, namen };
      });
      urteil("der Bildspeicher ist weg", !st.namen.includes("hh_fotos"), st.namen.join(","));
      urteil("die Marke steht erst nach dem Löschen", st.marke === "1", String(st.marke));
      urteil("das Fach `fotos` ist aus dem Archiv genommen", st.fotos === false,
             st.fotos ? "noch da" : "weg");
      /* Zweiter Start: nichts läuft doppelt, nichts wirft */
      const p2 = await ctx.newPage();
      const f2 = []; p2.on("pageerror", e => f2.push(e.message));
      await p2.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "load" });
      await p2.waitForTimeout(700);
      urteil("zweiter Start nach dem Löschen: kein Fehler", f2.length === 0, f2[0] || "keiner");
      await ctx.close();
    }

    /* ── 7 · Offline, erster Start: das Löschen darf nicht am Netz hängen */
    {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
      await ctx.addInitScript(SAAT("Asad"));
      const p = await ctx.newPage();
      const fehler = []; p.on("pageerror", e => fehler.push(e.message));
      await p.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "load" });
      await p.waitForTimeout(400);
      await ctx.setOffline(true);
      await p.evaluate(() => { localStorage.removeItem("hh_fotos_geloescht_v1"); });
      await p.reload({ waitUntil: "load" }).catch(() => {});
      await p.waitForTimeout(900);
      const marke = await p.evaluate(() => localStorage.getItem("hh_fotos_geloescht_v1"));
      urteil("offline gestartet: der Bildspeicher wird trotzdem geräumt",
             marke === "1", String(marke));
      urteil("offline gestartet: kein JS-Fehler", fehler.length === 0, fehler[0] || "keiner");
      await ctx.close();
    }
  } finally {
    await b.close(); srv.close();
  }
  console.log(nein ? "\n" + nein + " Prüfung(en) NEIN." : "\nAlle Prüfungen ja.");
  process.exit(nein ? 1 : 0);
})();
