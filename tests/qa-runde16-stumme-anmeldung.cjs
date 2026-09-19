/* qa-guardian · Runde 16, Gegenprobe zum zweiten Veto
   ───────────────────────────────────────────────────
       node tests/qa-runde16-stumme-anmeldung.cjs

   EINE Frage, und zwar die, die vor allen anderen kommt: Was tut die
   Anmeldung, wenn der Server die Anfrage ANNIMMT und nie antwortet?

   Runde 16 hat `holeKurz()` gebaut und vier Wege darauf gelegt
   (`serverAbmelden`, `werHatDenCode`, `holeZBericht`, `holeGebindeGroessen`).
   `POST /api/anmelden` (public/index.html:2804) ist nicht dabei. Das ist
   der Weg, den im Keller jede und jeder ZUERST geht — und die einzige
   Stelle, an der ein Hänger heisst: gar nicht erst hinein.

   Die Lage ist keine erfundene: „WLAN da, kein Durchsatz" ist genau der
   Fall, mit dem Runde 16 die Zeitgrenze an den vier anderen Stellen
   begründet hat. `navigator.onLine` sagt dazu nichts, `fetch` bricht von
   sich aus nicht ab.

   Rückgabe 1, sobald eine Prüfung „nein" sagt.                          */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) { console.log("Playwright nicht gefunden — UNGEPRÜFT."); process.exit(0); }

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };
const PORT = 8789;

/* `stumm` nimmt die Anfrage an und antwortet nie. */
const LAGE = { stumm: true, anmeldeRufe: 0 };

const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    if (u === "/api/anmelden") {
      LAGE.anmeldeRufe++;
      q.resume();                       /* Leib lesen, aber nicht antworten */
      if (LAGE.stumm) return;
      a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: "Casimir" }));
    }
    if (u === "/api/ich") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: "Casimir", rolle: "service" })); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ vorgaenge: [] })); }
    a.writeHead(200, kopf); return a.end("{}");
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
  a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
  a.end(fs.readFileSync(f));
});

/* Kein `hh_user` — die Anmeldung muss dastehen. Ein auf DIESEM Gerät
   bekannter Code liegt bereit: Ohne Netz ist das die Rückfallebene, und
   genau sie wird hier nie erreicht. Der Hash steht im Gerätespeicher, der
   Code selbst nirgends (Regel 9). */
const SAAT = `(()=>{ try{ sessionStorage.clear(); }catch(e){} })();`;

let nein = 0;
const urteil = (satz, gut, dazu) => {
  if (!gut) nein++;
  console.log((gut ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
};

(async () => {
  await new Promise(r => srv.listen(PORT, "127.0.0.1", r));
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(SAAT);
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", e => fehler.push(String(e)));
  await p.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);

  const anmeldungDa = await p.locator("#pinReihe .pinfeld").count();
  urteil("die Anmeldung steht da", anmeldungDa === 4, anmeldungDa + " Felder");

  /* Vier Ziffern — die vierte sendet von selbst. */
  const t0 = Date.now();
  await p.keyboard.type("1234", { delay: 60 });

  /* Zwölf Sekunden zusehen: die Zeitgrenze der anderen vier Wege ist 8 s. */
  await p.waitForTimeout(12000);
  const stand = await p.evaluate(() => ({
    meldung: (document.querySelector("#pinFehler") || {}).textContent || "",
    wert: (document.querySelector("#uCode") || {}).value,
    angemeldet: (() => { try { return sessionStorage.getItem("hh_user"); }
                        catch (e) { return null; } })(),
    anmeldungSichtbar: !!(document.querySelector("#login") &&
      getComputedStyle(document.querySelector("#login")).display !== "none")
  }));
  const dauer = ((Date.now() - t0) / 1000).toFixed(0);

  urteil("die Anfrage ist beim Server angekommen", LAGE.anmeldeRufe >= 1,
         LAGE.anmeldeRufe + " Rufe an /api/anmelden");
  urteil("KERN · nach 12 s steht eine Auskunft auf dem Schirm",
         stand.meldung.trim().length > 0,
         "Meldung: „" + stand.meldung + "“ · nach " + dauer + " s");
  urteil("KERN · ein zweiter Anlauf ist möglich (Eingabe nicht gesperrt)",
         await (async () => {
           await p.keyboard.type("1234", { delay: 60 });
           await p.waitForTimeout(600);
           return LAGE.anmeldeRufe >= 2;
         })(),
         LAGE.anmeldeRufe + " Rufe an /api/anmelden");
  urteil("keine JS-Fehler dabei", fehler.length === 0, fehler.join(" | "));

  console.log("");
  console.log(nein ? "NEIN: " + nein + " Prüfung(en) rot." : "Alle Prüfungen ja.");
  await b.close();
  srv.close();
  process.exit(nein ? 1 : 0);
})();
