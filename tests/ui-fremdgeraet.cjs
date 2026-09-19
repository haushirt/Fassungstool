/* „Auf einem anderen Gerät weiter?" · Ablehnen muss möglich sein
   ─────────────────────────────────────────────────────────────
   NICHT Teil von `npm test` (die Datei endet nicht auf .test.mjs), sie
   läuft von Hand:

       node tests/ui-fremdgeraet.cjs

   Sie schreibt nichts in `review/screens` und braucht keinen Worker: die
   Frage stellt die App offline, aus `hh_fern_v1`.

   Der Anlass: Im Abbrechen-Zweig stand bis v26
   `start._uebernommen=false; start(m);` (`public/index.html`). `start(m)`
   fragte `fernNeuer(m)` erneut, bekam denselben fremden Stand und öffnete
   den Dialog sofort wieder — „Abbrechen" war eine Schleife, aus der nur
   „Übernehmen" herausführte. Diese Prüfung wird rot, sobald der Dialog
   nach dem Ablehnen wiederkommt.

   Runde 17: Der Abbrechen-Zweig startete danach trotzdem einen eigenen
   Vorgang (`start._uebernommen=true; start(m)`). Jetzt führt er ins
   Menü zurück, ohne etwas anzufangen — die Prüfung darunter ist
   entsprechend nachgezogen.                                            */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — dieser Fall bleibt UNGEPRÜFT.");
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const PORT = 8959;
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };

let fehler = 0, geprueft = 0;
const ok = (satz, bedingung, dazu) => {
  geprueft++;
  console.log((bedingung ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
  if (!bedingung) fehler++;
};

/* /api/ antwortet nicht: der Keller hat kein Netz. `FERN` kommt aus dem
   localStorage, wie nach dem letzten Abgleich mit dem Server. */
const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) { a.writeHead(503); return a.end("{}"); }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
  a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
  a.end(fs.readFileSync(f));
});

const HEUTE = new Date().toISOString().slice(0, 10);
/* Der fremde Stand: ein anderes Gerät, höhere Zählnummer. */
const FREMD = {
  ["ware_" + HEUTE]: {
    mode: "ware", tag: HEUTE, name: "Bea", geraet: "ipad-2", zaehlnr: 5,
    zeit: new Date().toISOString(), status: "offen",
    daten: { mode: "ware", tag: HEUTE, name: "Bea", finished: false, ver: 12,
             pos: [{ id: "w001", jg: "2023", kisten: 9, kistengr: 6, neu: null }],
             jok: { w001: 1 }, jneu: {}, ein: { w001: 1 }, gent: {} }
  }
};
/* Der eigene Stand auf diesem Gerät: eine Position, noch nicht gesendet. */
const EIGEN = { mode: "ware", tag: HEUTE, name: "Asad", notiz: "", finished: false,
  ver: 12, pos: [{ id: "w003", jg: "2023", kisten: 2, kistengr: 20, neu: null }],
  jok: { w003: 1 }, jneu: {}, ein: { w003: 1 }, gent: {} };

const saat = `(()=>{ try{
  sessionStorage.setItem("hh_user","Asad");
  localStorage.setItem("hh_bekannt_v1", '{"x":"Asad"}');
  localStorage.setItem("hh_fern_v1", ${JSON.stringify(JSON.stringify(FREMD))});
  localStorage.setItem("hh_keller_v12", ${JSON.stringify(JSON.stringify({ ware: EIGEN }))});
}catch(e){} })();`;

const zustand = p => p.evaluate(() => ({
  ov: document.getElementById("ov").classList.contains("on"),
  titel: document.getElementById("ovT").textContent,
  imFormular: document.getElementById("app").style.display !== "none",
  menu: document.getElementById("menu").style.display !== "none",
  pos: (S.ware.pos || []).map(x => x.id + "×" + x.kisten),
  name: S.ware.name || ""
}));

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const browser = await pw.chromium.launch();
  const IPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true };
  const ctx = await browser.newContext(IPHONE);
  await ctx.addInitScript(saat);
  const p = await ctx.newPage();
  p.on("pageerror", e => { fehler++; console.log("  !! JS-FEHLER:", e.message); });
  await p.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);

  console.log("\n══ Fremdes Gerät: übernehmen oder ablehnen ══\n");

  /* ── 1 · Es wird gefragt ───────────────────────────────────────────── */
  await p.evaluate(() => start("ware"));
  await p.waitForTimeout(300);
  let z = await zustand(p);
  ok("die App fragt, statt still zusammenzuführen", z.ov, z.titel);
  ok("die Frage nennt den fremden Stand", /anderen Gerät/.test(z.titel), z.titel);

  /* ── 2 · Ablehnen lehnt ab ─────────────────────────────────────────── */
  await p.evaluate(() => document.getElementById("ovNo").click());
  await p.waitForTimeout(400);
  z = await zustand(p);
  ok("der Dialog kommt nach dem Ablehnen NICHT wieder", !z.ov, z.titel);
  ok("der eigene Stand steht unverändert da",
     z.pos.join(",") === "w003×2", z.pos.join(","));
  /* RUNDE 17 · Hier stand bis v56 `z.imFormular && !z.menu`: Ablehnen
     warf einen zwar nicht in die Schleife zurück, startete aber trotzdem
     einen eigenen Vorgang — gerade bei der Tagesfassung, die es je Tag
     genau einmal gibt, war das der falsche Ausgang. Abbrechen heißt
     jetzt: zurück ins Menü, nichts angefangen. */
  ok("nach dem Ablehnen steht man wieder im Menü", z.menu && !z.imFormular);

  /* Ein zweiter Klick auf denselben Knopf darf nichts anderes tun —
     die Marke `start._uebernommen` darf nicht hängenbleiben. */
  const marke = await p.evaluate(() => start._uebernommen === true);
  ok("die Marke bleibt nicht auf „schon gefragt“ stehen", !marke);

  /* ── 3 · Beim nächsten bewussten Öffnen wird wieder gefragt ────────── */
  await p.evaluate(() => start("ware"));
  await p.waitForTimeout(300);
  z = await zustand(p);
  ok("wer den Vorgang erneut öffnet, bekommt die Frage erneut", z.ov, z.titel);

  /* ── 4 · Übernehmen übernimmt — und fragt danach nicht mehr ────────── */
  await p.evaluate(() => document.getElementById("ovOk").click());
  await p.waitForTimeout(400);
  z = await zustand(p);
  ok("nach „Übernehmen“ steht der fremde Stand da",
     z.pos.join(",") === "w001×9", z.pos.join(","));
  ok("und der Dialog ist zu", !z.ov);
  await p.evaluate(() => start("ware"));
  await p.waitForTimeout(300);
  z = await zustand(p);
  ok("er kommt auch beim nächsten Öffnen nicht wieder", !z.ov, z.titel);

  await ctx.close(); await browser.close(); srv.close();
  console.log("\n══ Ergebnis ══");
  console.log(fehler ? `  ${fehler} von ${geprueft} Punkten NICHT in Ordnung`
                     : `  ${geprueft} von ${geprueft} Punkten in Ordnung`);
  process.exit(fehler ? 1 : 0);
})();
