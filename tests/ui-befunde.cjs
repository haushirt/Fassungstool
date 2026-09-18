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

/* Zwei Sätze von Ansichten.

   Standard sind die vier Breiten aus dem Auftrag vom 18.09.2026 — sie
   spannen den Bereich auf, in dem die Gestaltung halten muss.

   Mit GERAETE=1 laufen stattdessen die drei Geräte, auf denen wirklich
   gearbeitet wird: iPhone 16 im Keller, iPad mini an der Bar, MacBook im
   Backoffice. Die Bilder landen dann unter review/screens/geraete/. */
const ANSICHT_BREITEN = [
  { name: "320", w: 320, h: 568 }, { name: "375", w: 375, h: 812 },
  { name: "390", w: 390, h: 844 }, { name: "430", w: 430, h: 932 }
];
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const ANSICHT_GERAETE = [
  { name: "iphone16", w: 393, h: 852,  dpr: 3, ua: UA_IPHONE, mobil: true },
  { name: "ipadmini", w: 744, h: 1133, dpr: 2, ua: UA_IPAD,   mobil: true },
  { name: "macbook",  w: 1440, h: 900, dpr: 2, ua: UA_MAC,    mobil: false }
];
const ANSICHTEN = process.env.GERAETE ? ANSICHT_GERAETE : ANSICHT_BREITEN;
const UNTER = process.env.GERAETE ? "geraete" : null;

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

/* Ein überholter Stand im Sackfach — sonst bleibt „Gesehen" verborgen. */
const SAAT_UEBERHOLT = SAAT + `(()=>{ try{
  localStorage.setItem("hh_ueberholt_v1", JSON.stringify([{
    schluessel:"keller_2026-09-17", id:"x1",
    daten:{mode:"keller", tag:"2026-09-17", zeit:"2026-09-17T20:10:00.000Z"},
    zeit:"2026-09-17T20:10:00.000Z",
    fremd:{name:"Ian", zeit:"2026-09-17T21:00:00.000Z"}}]));
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
/* keller/nach/ware fragen zuerst „Wein oder Getränke?". */
async function zweig(p, z) {
  const tor = p.locator(".gbtn." + z);
  if (await tor.count()) { await tor.first().click(); await warte(p, 400); }
  else await p.evaluate(x => { if (typeof branch !== "undefined") { branch = x; render(); } }, z);
  await warte(p, 350); await hilfeZu(p);
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
  f9: [["begruessung", async p => { await warte(p, 600); }]],

  /* Runde 14 · was in f1…f9 keine eigene Lage hatte: der Pflichtgrund der
     Sonderentnahme, der umbenannte Abschlussknopf und die Begrüßung, die
     jetzt am Statusfeld hängt. */
  r14: [["sonderentnahme-grund", async p => { await modus(p, "nach"); await zweig(p, "wein"); }],
        ["sonderentnahme-gewaehlt", async p => { await modus(p, "nach"); await zweig(p, "wein");
          const g = p.locator(".grundb").first();
          if (await g.count()) { await g.click(); await warte(p, 350); } }],
        ["abschluss-knopf", async p => { await modus(p, "tag");
          await p.evaluate(() => go(lastStep())); await warte(p, 450); await hilfeZu(p); }],
        ["statusfeld-begruessung", async p => { await grussZu(p);
          const s = p.locator(".netzmehr");
          if (await s.count()) { await s.click(); await warte(p, 400); } }]],

  /* Runde 15 · die drei Funde der Agenten, je eine Lage. */
  r15: [["grund-im-getraenkezweig", async p => { await modus(p, "nach"); await zweig(p, "getr"); }],
        ["startseite-gewaehlter-tag", async p => { await grussZu(p);
          await p.evaluate(() => {
            const g = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
            setTagWahl(g); renderMenu();
          }); await warte(p, 350); }],
        ["startseite-quittieren", async p => { await grussZu(p); await warte(p, 300); },
         SAAT_UEBERHOLT]],

  /* Runde 15 · Anmeldeseite, vier Stellen, Tastatur.
     Ohne Saat steht die Anmeldung — genau darum geht es hier. */
  r15: [["anmeldung", async p => { await warte(p, 400); }, " "],
        ["anmeldung-getippt", async p => { await warte(p, 400);
          await p.keyboard.press("1"); await p.keyboard.press("2");
          await warte(p, 250); }, " "],
        ["anmeldung-falsch", async p => { await warte(p, 400);
          for (const z of ["1","2","3","4"]) await p.keyboard.press(z);
          await warte(p, 900); }, " "],
        /* Das Backoffice mit drei Personen und dem neuen Knopf. Der
           Prüfserver kennt keine Personen, also antwortet die Seite sich
           hier selbst — es geht um die Gestaltung, nicht um den Weg. */
        ["backoffice-team", async p => { await warte(p, 600);
          await p.evaluate(() => {
            const echt = window.fetch;
            window.fetch = (u, o) => {
              const s = String(u);
              if (s.includes("/api/personen"))
                return Promise.resolve(new Response(JSON.stringify({ personen: [
                  { id: "1", name: "Asad",    rolle: "service",    aktiv: 1 },
                  { id: "2", name: "Ian",     rolle: "wirtschaft", aktiv: 1 },
                  { id: "3", name: "Casimir", rolle: "leitung",    aktiv: 1 }]}),
                  { headers: { "content-type": "application/json" } }));
              return echt(u, o);
            };
          });
          await p.evaluate(() => { SEITE = "team"; zeichne(); });
          await warte(p, 700);
        }, SAAT_LEITUNG],
        ["backoffice-neuer-pin", async p => { await warte(p, 600);
          await p.evaluate(() => {
            const echt = window.fetch;
            window.fetch = (u, o) => {
              const s = String(u);
              if (s.includes("/api/person/pin"))
                return Promise.resolve(new Response(JSON.stringify({ pin: "7391", name: "Asad" }),
                  { headers: { "content-type": "application/json" } }));
              if (s.includes("/api/personen"))
                return Promise.resolve(new Response(JSON.stringify({ personen: [
                  { id: "1", name: "Asad", rolle: "service", aktiv: 1 }]}),
                  { headers: { "content-type": "application/json" } }));
              return echt(u, o);
            };
            window.confirm = () => true;
          });
          await p.evaluate(() => { SEITE = "team"; zeichne(); });
          await warte(p, 700);
          const k = p.locator("[data-pin]");
          if (await k.count()) { await k.first().click(); await warte(p, 700); }
        }, SAAT_LEITUNG]]
};

(async () => {
  const nur = process.argv.slice(2).map(x => x.toLowerCase());
  const liste = Object.keys(SZENEN).filter(k => !nur.length || nur.includes(k));
  const srv = server();
  await new Promise(r => srv.listen(8979, r));
  const b = await pw.chromium.launch();
  let n = 0;

  for (const f of liste) {
    const OUT = UNTER ? path.join(SCREENS, UNTER, f) : path.join(SCREENS, f);
    fs.mkdirSync(OUT, { recursive: true });
    for (const [name, vorbereiten, saat] of SZENEN[f]) {
      for (const a of ANSICHTEN) {
        const w = a.name;
        const ctx = await b.newContext({
          viewport: { width: a.w, height: a.h }, deviceScaleFactor: a.dpr || 2,
          isMobile: a.mobil !== false, hasTouch: a.mobil !== false,
          userAgent: a.ua || UA_IPHONE
        });
        if (saat === SAAT_LEITUNG) { ROLLE = "leitung"; WER = "Casimir"; }
        else { ROLLE = "service"; WER = "Asad"; }
        await ctx.addInitScript(saat || SAAT);
        const p = await ctx.newPage();
        const fehler = [];
        p.on("pageerror", e => fehler.push(e.message));
        const seite = (name === "backoffice" || name.startsWith("backoffice-"))
          ? "/leitung.html" : "/index.html";
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
