/* Belege zu den Befunden F1 bis F9 · NICHT Teil von `npm test`
   ────────────────────────────────────────────────────────────
       node tests/ui-befunde.cjs            (alle Befunde)
       node tests/ui-befunde.cjs f2 f3      (nur diese)

   Der Auftrag vom 18.09.2026 verlangt je Befund Bilder in 320 / 375 / 390
   und 430 px, abgelegt unter review/screens/f<N>/. ui-mass.cjs misst und
   urteilt; diese Datei belegt. Beides getrennt zu halten hat einen Grund:
   ein Beleg darf nie ein Urteil ersetzen.

   Playwright ist KEINE Abhängigkeit des Projekts (Regel 8). Fehlt es,
   legt sich die Datei sauber hin und sagt, dass die Oberfläche
   UNGEPRÜFT bleibt.                                                    */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) { console.log("Playwright nicht gefunden — die Oberfläche bleibt UNGEPRÜFT."); process.exit(0); }

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const SCREENS = path.join(__dirname, "..", "review", "screens");
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };

const BREITEN = [320, 375, 390, 430];
const HOEHE = { 320: 568, 375: 812, 390: 844, 430: 932 };

/* Der Server antwortet auf /api/ wie der echte: angemeldet, ein paar
   Vorgänge des Tages, sonst leer. Ohne /api/ zeigt die Startseite keine
   Begrüßung — und genau die ist Gegenstand von F7 und F9. */
const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna",
  year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const VORGAENGE = [
  { id: "v1", tag: heute, modus: "fuellen", name: "Ian", status: "fertig",
    zeit: heute + "T14:20:00.000Z", geraet: "fremd", zaehlnr: 3 }
];

/* Welche Rolle der Server gerade meldet. Die Szenen laufen nacheinander;
   `/api/ich` antwortet damit zur Saat passend — sonst zeigt die Startseite
   den Backoffice-Link auch dort nicht, wo er hingehoert (F5). */
let ROLLE = "service", WER = "Asad";
function server() {
  return http.createServer((q, a) => {
    let u = q.url.split("?")[0];
    if (u === "/") u = "/index.html";
    if (u.startsWith("/api")) {
      const kopf = { "content-type": "application/json" };
      if (u === "/api/ich") { a.writeHead(200, kopf);
        return a.end(JSON.stringify({ name: WER, rolle: ROLLE })); }
      if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
        return a.end(JSON.stringify({ vorgaenge: VORGAENGE })); }
      a.writeHead(200, kopf); return a.end("{}");
    }
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
    a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
    a.end(fs.readFileSync(f));
  });
}

const SAAT = `(()=>{ try{
  sessionStorage.setItem("hh_user","Asad");
  localStorage.setItem("hh_bekannt_v1", '{"x":{"name":"Asad","rolle":"service"}}');
}catch(e){} })();`;

/* Rolle leitung — nur damit sichtbar wird, was nur die Leitung sieht (F5). */
const SAAT_LEITUNG = `(()=>{ try{
  sessionStorage.setItem("hh_user","Casimir");
  localStorage.setItem("hh_bekannt_v1", '{"x":{"name":"Casimir","rolle":"leitung"}}');
}catch(e){} })();`;

const warte = (p, ms) => p.waitForTimeout(ms);

async function hilfeZu(p) {
  const zu = p.locator("#hilfeZu");
  if (await zu.count() && await zu.isVisible()) { await zu.click(); await warte(p, 200); }
}
async function grussZu(p) {
  const zu = p.locator("#grussPasst");
  if (await zu.count() && await zu.isVisible()) { await zu.click(); await warte(p, 300); }
}
async function modus(p, m) {
  await grussZu(p);
  await p.evaluate(x => { if (typeof start === "function") start(x); }, m);
  await warte(p, 450); await hilfeZu(p);
}
async function lade(p, nr) {
  const kn = p.locator(".statb", { hasText: new RegExp("^" + nr + "$") });
  if (await kn.count()) { await kn.first().click(); await warte(p, 350); }
}

/* Je Befund: welche Lage aufgenommen wird. */
const SZENEN = {
  f1: [["startseite", async p => { await grussZu(p); }],
       ["tagesfassung-kopf", async p => { await modus(p, "tag"); }],
       ["kellerzaehlung-kopf", async p => { await modus(p, "keller"); }]],
  f2: [["lade-1", async p => { await modus(p, "tag"); await lade(p, "1"); }],
       ["lade-4", async p => { await modus(p, "tag"); await lade(p, "4"); }],
       ["lade-5", async p => { await modus(p, "tag"); await lade(p, "5"); }],
       ["lade-6", async p => { await modus(p, "tag"); await lade(p, "6"); }]],
  f3: [["bar-rotweine", async p => { await modus(p, "tag"); }],
       ["restaurant", async p => { await modus(p, "tag");
         await p.evaluate(() => go(1)); await warte(p, 400); await hilfeZu(p); }]],
  f4: [["abschluss", async p => { await modus(p, "tag");
         await p.evaluate(() => go(lastStep())); await warte(p, 450); await hilfeZu(p); }],
       ["startseite-kachel", async p => { await grussZu(p); }]],
  f5: [["startseite-service", async p => { await grussZu(p); }],
       ["startseite-leitung", async p => { await grussZu(p); }, SAAT_LEITUNG]],
  f6: [["startseite", async p => { await grussZu(p); }],
       ["tagesfassung", async p => { await modus(p, "tag"); }],
       ["backoffice", null]],
  f7: [["startseite", async p => { await grussZu(p); }]],
  f8: [["lade-3", async p => { await modus(p, "tag"); await lade(p, "3"); }],
       ["lade-5", async p => { await modus(p, "tag"); await lade(p, "5"); }]],
  f9: [["begruessung", async p => { await warte(p, 600); }]]
};

(async () => {
  const nur = process.argv.slice(2).map(x => x.toLowerCase());
  const liste = Object.keys(SZENEN).filter(k => !nur.length || nur.includes(k));
  const srv = server();
  await new Promise(r => srv.listen(8979, r));
  const b = await pw.chromium.launch();
  let n = 0;

  for (const f of liste) {
    const OUT = path.join(SCREENS, f);
    fs.mkdirSync(OUT, { recursive: true });
    for (const [name, vorbereiten, saat] of SZENEN[f]) {
      for (const w of BREITEN) {
        const ctx = await b.newContext({
          viewport: { width: w, height: HOEHE[w] }, deviceScaleFactor: 2,
          isMobile: true, hasTouch: true,
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        });
        if (saat === SAAT_LEITUNG) { ROLLE = "leitung"; WER = "Casimir"; }
        else { ROLLE = "service"; WER = "Asad"; }
        await ctx.addInitScript(saat || SAAT);
        const p = await ctx.newPage();
        const fehler = [];
        p.on("pageerror", e => fehler.push(e.message));
        const seite = (name === "backoffice") ? "/leitung.html" : "/index.html";
        await p.goto("http://127.0.0.1:8979" + seite, { waitUntil: "load" });
        await warte(p, 500);
        if (vorbereiten) await vorbereiten(p);
        /* Ganze Seite, nicht nur der Ausschnitt: ein Beleg, der unten
           abgeschnitten ist, beweist genau das nicht, was er soll.
           Ausnahme: ein Fenster, das am unteren Rand klebt (F9). In einer
           Ganzseitenaufnahme steht `position:fixed` dort, wo der
           Ausschnitt gerade war — das Bild loege ueber seine Lage. */
        await p.screenshot({ path: path.join(OUT, w + "-" + name + ".png"),
                             fullPage: f !== "f9" });
        if (fehler.length) console.log("  JS-FEHLER " + f + "/" + name + "@" + w +
                                       ": " + fehler[0]);
        n++;
        await ctx.close();
      }
    }
    console.log("  " + f + " → review/screens/" + f + "/");
  }
  await b.close(); srv.close();
  console.log("\n" + n + " Bilder in " + liste.length + " Ordnern.");
  console.log("UNGEPRÜFT bleibt: echtes Safari, echte Tastatur, Notch, Gummiband.");
})();
