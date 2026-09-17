/* Zweiter Wareneingang am selben Tag · im Browser
   ───────────────────────────────────────────────
   NICHT Teil von `npm test` (die Datei endet nicht auf .test.mjs), sie
   läuft von Hand:

       node tests/ui-zweiter-vorgang.cjs

   Sie schreibt nichts in `review/screens` und braucht keinen Worker: die
   App muss diesen Fall offline entscheiden, im Keller, ohne Netz.

   Geprüft wird das, was `tests/vorgang-zweimal.test.mjs` am Worker nicht
   sehen kann: dass die App FRAGT, statt den abgeschlossenen Vorgang des
   Tages still durch ein leeres Formular zu ersetzen — und dass
   „Ergänzen" den bisherigen Inhalt behält.                              */

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
const PORT = 8957;
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };

let fehler = 0, geprueft = 0;
const ok = (satz, bedingung, dazu) => {
  geprueft++;
  console.log((bedingung ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
  if (!bedingung) fehler++;
};

/* /api/ antwortet nicht: der Keller hat kein Netz. */
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
/* Die erste Lieferung des Tages: 2 Kisten à 20 Flaschen, abgeschlossen. */
const ERSTE = { mode: "ware", tag: HEUTE, name: "Asad", notiz: "", finished: true,
  ver: 12, pos: [{ id: "w003", jg: "2023", kisten: 2, kistengr: 20, neu: null }],
  jok: { w003: 1 }, jneu: {}, ein: { w003: 1 }, gent: {}, _gesendet: 1 };

const saat = zustand => `(()=>{ try{
  sessionStorage.setItem("hh_user","Asad");
  localStorage.setItem("hh_bekannt_v1", '{"x":"Asad"}');
  localStorage.setItem("hh_keller_v12", ${JSON.stringify(JSON.stringify(zustand))});
}catch(e){} })();`;

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const browser = await pw.chromium.launch();
  const IPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true };

  const seite = async (zustand) => {
    const ctx = await browser.newContext(IPHONE);
    await ctx.addInitScript(saat(zustand));
    const p = await ctx.newPage();
    p.on("pageerror", e => { fehler++; console.log("  !! JS-FEHLER:", e.message); });
    await p.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "load" });
    await p.waitForTimeout(500);
    return { ctx, p };
  };

  console.log("\n══ Zweiter Wareneingang am selben Tag ══\n");

  /* ── 1 · Es wird gefragt ───────────────────────────────────────────── */
  let { ctx, p } = await seite({ ware: ERSTE });
  await p.evaluate(() => start("ware"));
  await p.waitForTimeout(300);
  const dialog = await p.evaluate(() => ({
    offen: document.getElementById("ov").classList.contains("on"),
    titel: document.getElementById("ovT").textContent,
    text: document.getElementById("ovBody").textContent,
    ok: document.getElementById("ovOk").textContent,
    neu: !!document.getElementById("ovNeu"),
    imFormular: document.getElementById("app").style.display !== "none"
  }));
  ok("die App fragt, statt still zu ersetzen", dialog.offen, dialog.titel);
  ok("sie sagt, was schon dasteht", /40 Flaschen/.test(dialog.text), dialog.text.slice(0, 90));
  ok("„Ergänzen“ ist der vorgeschlagene Weg", dialog.ok === "Ergänzen", dialog.ok);
  ok("„Neu beginnen“ gibt es weiterhin, mit seiner Folge daneben",
     dialog.neu && /zurückgenommen/.test(dialog.text));

  /* ── 2 · Abbrechen lässt alles, wie es war ─────────────────────────── */
  await p.evaluate(() => document.getElementById("ovNo").click());
  await p.waitForTimeout(300);
  const nachAbbruch = await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("hh_keller_v12"));
    return { pos: (s.ware.pos || []).length, fertig: !!s.ware.finished,
             menu: document.getElementById("menu").style.display !== "none",
             ov: document.getElementById("ov").classList.contains("on") };
  });
  ok("Abbrechen führt zurück ins Menü", nachAbbruch.menu && !nachAbbruch.ov);
  ok("der abgeschlossene Wareneingang bleibt unangetastet",
     nachAbbruch.pos === 1 && nachAbbruch.fertig === true, JSON.stringify(nachAbbruch));

  /* ── 3 · Ergänzen führt den bestehenden Vorgang fort ───────────────── */
  await p.evaluate(() => start("ware"));
  await p.waitForTimeout(200);
  await p.evaluate(() => document.getElementById("ovOk").click());
  await p.waitForTimeout(400);
  const nachErgaenzen = await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("hh_keller_v12"));
    return { pos: (s.ware.pos || []).map(x => x.id + "×" + x.kisten + "à" + x.kistengr),
             fertig: !!s.ware.finished, tag: s.ware.tag,
             imFormular: document.getElementById("app").style.display !== "none",
             archiv: Object.keys(JSON.parse(localStorage.getItem("hh_archiv") || "{}")) };
  });
  ok("die erste Lieferung steht noch da",
     nachErgaenzen.pos.join(",") === "w003×2à20", nachErgaenzen.pos.join(","));
  ok("der Vorgang ist wieder offen und wird fortgeführt",
     nachErgaenzen.fertig === false && nachErgaenzen.imFormular);
  ok("derselbe Tag, also derselbe Schlüssel", nachErgaenzen.tag === HEUTE);
  ok("nichts ist ins Archiv geschoben worden",
     nachErgaenzen.archiv.length === 0, nachErgaenzen.archiv.join(","));

  /* Eine zweite Position dazu, abschliessen — das Paket im Ausgang muss
     BEIDE Lieferungen tragen, sonst bucht der Server die erste aus. */
  const paket = await p.evaluate(() => {
    const d = S.ware;
    d.pos.push({ id: "w001", jg: "2023", kisten: 2, kistengr: 12, neu: null });
    d.jok.w001 = 1; d.ein.w001 = 1;
    d.finished = true; save(); inDenAusgang(d, "fertig"); d._gesendet = 1;
    const a = JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]");
    const e = a[a.length - 1];
    return { schluessel: e.schluessel, eintraege: a.length,
             flaschen: (e.daten.pos || []).reduce((x, q) => x + q.kisten * (+q.kistengr || 6), 0) };
  });
  ok("das Paket geht unter dem Tagesschlüssel hinaus",
     paket.schluessel === "ware_" + HEUTE, paket.schluessel);
  ok("je Schlüssel liegt ein Eintrag im Ausgang", paket.eintraege === 1, paket.eintraege);
  ok("es trägt beide Lieferungen: 40 + 24 Flaschen",
     paket.flaschen === 64, paket.flaschen + " Flaschen");

  /* ── 4 · Ein Vorgang von gestern wird weiterhin still archiviert ───── */
  await ctx.close();
  ({ ctx, p } = await seite({ ware: Object.assign({}, ERSTE, { tag: "2020-01-01" }) }));
  await p.evaluate(() => start("ware"));
  await p.waitForTimeout(300);
  const alt = await p.evaluate(() => ({
    ov: document.getElementById("ov").classList.contains("on"),
    pos: (S.ware.pos || []).length,
    archiv: Object.keys(JSON.parse(localStorage.getItem("hh_archiv") || "{}"))
  }));
  ok("ein anderer Tag ist ein anderer Schlüssel — keine Frage nötig", !alt.ov);
  ok("der alte Vorgang liegt im Archiv, das Formular ist leer",
     alt.pos === 0 && alt.archiv.includes("ware_2020-01-01"), alt.archiv.join(","));

  await ctx.close(); await browser.close(); srv.close();
  console.log("\n══ Ergebnis ══");
  console.log(fehler ? `  ${fehler} von ${geprueft} Punkten NICHT in Ordnung`
                     : `  ${geprueft} von ${geprueft} Punkten in Ordnung`);
  process.exit(fehler ? 1 : 0);
})();
