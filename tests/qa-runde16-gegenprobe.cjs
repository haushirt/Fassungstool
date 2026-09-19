/* Gegenprobe zum Veto · qa-guardian, Runde 16 (zweiter Durchgang)
   ────────────────────────────────────────────────────────────────
       node tests/qa-runde16-gegenprobe.cjs

   NICHT Teil von `npm test` (braucht Playwright, Regel 8).

   `tests/qa-runde16-schluss.cjs` prüft, ob die Merge-Sperre gefallen ist.
   Hier stehen die Lagen, die weder dort noch in `tests/ui-runde16.cjs`
   vorkommen, weil beide Dateien die Absicht der Runde bestätigen:

     G1  Der Abgleich mit einer Kassenposition, die KEINEM Artikel
         zugeordnet ist, obwohl derselbe Artikel gefasst wurde. Live ist
         das der Normalfall (13 Zuordnungen, 44 unzugeordnete Positionen
         allein in Bericht 37). Die Zeile behauptet dann „verkauft 0" —
         der Fuss muss sagen, woher die Null kommt.
     G2  Offline abschliessen, dann Empfang: genau EIN PUT, der Ausgang
         leert sich, ein zweiter Anlauf schickt nichts nach.
     G3  Der Server antwortet 500 beim Leeren: der Vorgang bleibt liegen,
         nichts verschwindet, danach geht er genau einmal hinaus.
     G4  Abgelaufene Sitzung (401) beim Leeren: derselbe Anspruch.
     G5  Eine krumme Eingabe an der Freigabe kostet keinen Anmeldeversuch
         — sie geht gar nicht erst hinaus.

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

const LAGE = { rolle: "leitung", wer: "Casimir", zbericht: null, mapping: [],
               gesendet: [], puts: 0, putStatus: 200, codeRufe: 0 };

const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    if (u === "/api/ich") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: LAGE.wer, rolle: LAGE.rolle })); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ vorgaenge: [] })); }
    if (u === "/api/mapping") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ mapping: LAGE.mapping || [] })); }
    if (u === "/api/code") { LAGE.codeRufe++; a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: LAGE.wer, rolle: LAGE.rolle })); }
    if (u === "/api/fassungsliste") {
      if (!LAGE.zbericht) { a.writeHead(404, kopf);
        return a.end(JSON.stringify({ fehler: "nicht vorhanden" })); }
      a.writeHead(200, kopf); return a.end(JSON.stringify(LAGE.zbericht));
    }
    if (u.startsWith("/api/vorgang/")) {
      let leib = ""; q.on("data", c => leib += c);
      return q.on("end", () => {
        LAGE.puts++;
        if (LAGE.putStatus !== 200) { a.writeHead(LAGE.putStatus, kopf);
          return a.end(JSON.stringify({ fehler: "nicht jetzt" })); }
        try { LAGE.gesendet.push(JSON.parse(leib)); } catch (e) {}
        a.writeHead(200, kopf); a.end(JSON.stringify({ gespeichert: true }));
      });
    }
    a.writeHead(200, kopf); return a.end("{}");
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
  a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
  a.end(fs.readFileSync(f));
});

const SAAT = `(()=>{ try{
  sessionStorage.setItem("hh_user","Casimir");
  sessionStorage.setItem("hh_rolle","leitung");
  localStorage.setItem("hh_bekannt_v1", '{"x":"Casimir"}');
}catch(e){} })();`;

let nein = 0;
const urteil = (satz, gut, dazu) => {
  if (!gut) nein++;
  console.log((gut ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
};
const warte = (p, ms) => p.waitForTimeout(ms);

async function seite(b, offline) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(SAAT);
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", e => fehler.push(String(e)));
  await p.goto("http://127.0.0.1:8783/index.html", { waitUntil: "load" });
  await warte(p, 500);
  if (offline) {
    await ctx.setOffline(true);
    await p.evaluate(() => { window.dispatchEvent(new Event("offline")); });
    await warte(p, 300);
  }
  return { ctx, p, fehler };
}
async function grussZu(p) {
  const zu = p.locator("#grussPasst");
  if (await zu.count() && await zu.isVisible()) { await zu.click(); await warte(p, 350); }
}
async function hilfeZu(p) {
  const zu = p.locator("#hilfeZu");
  if (await zu.count() && await zu.isVisible()) { await zu.click(); await warte(p, 250); }
}

async function tagesfassungBisAbschluss(p) {
  await grussZu(p);
  const ids = await p.evaluate(() => {
    start("tag");
    const d = S.tag;
    const wein = WINES[0].id, getr = Object.keys(GSOLL)[0];
    WINES.forEach(w => { d.seen[w.id] = 1; });
    barUnits().forEach(u => {
      if (u.k === "lade") { d.gdone = d.gdone || {}; d.gdone[u.id] = 1; }
      else u.arr.forEach(x => { d.seen[x.id + "_" + u.bucket] = 1; });
    });
    d.gdone = d.gdone || {};
    ALLE_LADEN().forEach(L => { d.gdone[L.id] = 1; });
    d.rest[wein] = 2; d.holt[wein] = 1;
    d.getr[getr] = GSOLL[getr] - 6;
    d.gholt = d.gholt || {}; d.gholt[getr] = 1;
    save(); go(lastStep());
    return { wein, getr, offen: offenList(), tag: d.tag };
  });
  await warte(p, 500); await hilfeZu(p);
  return ids;
}

(async () => {
  await new Promise(r => srv.listen(8783, "127.0.0.1", r));
  const b = await pw.chromium.launch({ args: ["--no-sandbox"] });
  try {

    /* ── G1 · unzugeordnete Kassenposition zu einem gefassten Artikel ── */
    {
      LAGE.zbericht = null; LAGE.mapping = []; LAGE.gesendet = []; LAGE.puts = 0;
      const { ctx, p, fehler } = await seite(b);
      const ids = await tagesfassungBisAbschluss(p);
      /* Der Wein ist zugeordnet UND hat eine bestätigte Größe — er ist
         vergleichbar. Das Getränk wurde gefasst (6 Flaschen), seine
         Kassenposition ist aber keinem Artikel zugeordnet: genau der
         Live-Stand. */
      LAGE.zbericht = { tag: "2026-09-18", z: 37, positionen: [
        { rohbez: "Wein 1/8 l", artikel: ids.wein, anzahl: 6, ausschankMl: 125 },
        { rohbez: "Getränk 0,33 l", artikel: null, anzahl: 6, ausschankMl: 330 }
      ]};
      LAGE.mapping = [{ kassenname: "Wein 1/8 l", gebinde_ml: 750 }];
      await p.locator(".finishbtn[data-netz]").click();
      await warte(p, 900);
      const text = (await p.locator("#ovBody").textContent() || "").replace(/\s+/g, " ");
      const zeilen = await p.evaluate(() => [...document.querySelectorAll("#ovBody .abglz")]
        .map(z => z.textContent.replace(/\s+/g, " ").trim()));
      const phantom = zeilen.some(z => /verkauft 0\b/.test(z));
      urteil("G1 · das Fenster steht", (await p.locator("#ovT").textContent()) === "Abgleich");
      urteil("G1 · die gefasste, aber unzugeordnete Ware steht als Abweichung da",
        phantom, JSON.stringify(zeilen));
      urteil("G1 · WAHRHEIT · und der Fuß sagt, dass Kassenpositionen unzugeordnet sind",
        !phantom || /zugeordnet/.test(text), text.slice(0, 260));
      urteil("G1 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── G1b · derselbe Fuß auf dem schmalsten Gerät (320 px) ────────── */
    {
      LAGE.zbericht = null; LAGE.mapping = [];
      const ctx = await b.newContext({ viewport: { width: 320, height: 568 },
        deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await ctx.addInitScript(SAAT);
      const p = await ctx.newPage();
      const fehler = [];
      p.on("pageerror", e => fehler.push(String(e)));
      await p.goto("http://127.0.0.1:8783/index.html", { waitUntil: "load" });
      await warte(p, 500);
      const ids = await tagesfassungBisAbschluss(p);
      LAGE.zbericht = { tag: "2026-09-18", z: 37, positionen: [
        { rohbez: "Wein 1/8 l", artikel: ids.wein, anzahl: 6, ausschankMl: 125 },
        { rohbez: "Getränk 0,33 l", artikel: null, anzahl: 6, ausschankMl: 330 }
      ]};
      LAGE.mapping = [{ kassenname: "Wein 1/8 l", gebinde_ml: 750 }];
      await p.locator(".finishbtn[data-netz]").click();
      await warte(p, 900);
      const mass = await p.evaluate(() => ({
        ueber: document.documentElement.scrollWidth > window.innerWidth + 1,
        breite: document.documentElement.scrollWidth,
        fenster: window.innerWidth
      }));
      urteil("G1b · 320 px · kein waagrechter Überlauf",
        !mass.ueber, mass.breite + " px im " + mass.fenster + "-px-Fenster");
      fs.mkdirSync(path.join(__dirname, "..", "review", "screens", "runde16"),
        { recursive: true });
      await p.screenshot({ fullPage: true, path: path.join(__dirname, "..",
        "review", "screens", "runde16", "13-abgleich-fuss-320.png") });
      urteil("G1b · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── G2 · offline abschliessen, dann Empfang ─────────────────────── */
    {
      LAGE.zbericht = null; LAGE.gesendet = []; LAGE.puts = 0; LAGE.putStatus = 200;
      const { ctx, p, fehler } = await seite(b, true);
      await tagesfassungBisAbschluss(p);
      await p.locator(".finishbtn[data-netz]").click();
      await warte(p, 900);
      const imFach = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length);
      urteil("G2 · ohne Netz liegt genau ein Eintrag im Ausgang", imFach === 1, imFach + "");
      await ctx.setOffline(false);
      await p.evaluate(() => { window.dispatchEvent(new Event("online")); });
      await warte(p, 1500);
      const nach = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length);
      urteil("G2 · mit Empfang geht er hinaus — genau ein PUT",
        LAGE.puts === 1 && nach === 0, LAGE.puts + " PUTs · " + nach + " übrig");
      /* Zweiter Anlauf: es darf nichts nachkommen. */
      await p.evaluate(() => { window.dispatchEvent(new Event("online")); });
      await warte(p, 1200);
      urteil("G2 · ein zweiter Anlauf schickt nichts nach",
        LAGE.puts === 1, LAGE.puts + " PUTs");
      urteil("G2 · der Vorgang kam als abgeschlossen an",
        LAGE.gesendet.length === 1 && LAGE.gesendet[0].finished === true,
        JSON.stringify(LAGE.gesendet.map(v => v.finished)));
      urteil("G2 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── G3 · Serverfehler beim Leeren ───────────────────────────────── */
    {
      LAGE.zbericht = null; LAGE.gesendet = []; LAGE.puts = 0; LAGE.putStatus = 500;
      const { ctx, p, fehler } = await seite(b);
      await tagesfassungBisAbschluss(p);
      await p.locator(".finishbtn[data-netz]").click();
      await warte(p, 1500);
      const liegt = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length);
      urteil("G3 · bei 500 bleibt der Vorgang im Ausgang liegen",
        liegt === 1, liegt + " Einträge · " + LAGE.puts + " Versuche");
      LAGE.putStatus = 200;
      await p.evaluate(() => { window.dispatchEvent(new Event("online")); });
      await warte(p, 1500);
      const weg = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length);
      urteil("G3 · danach geht er genau einmal hinaus",
        weg === 0 && LAGE.gesendet.length === 1,
        weg + " übrig · " + LAGE.gesendet.length + " angekommen");
      urteil("G3 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── G4 · abgelaufene Sitzung beim Leeren ────────────────────────── */
    {
      LAGE.zbericht = null; LAGE.gesendet = []; LAGE.puts = 0; LAGE.putStatus = 401;
      const { ctx, p, fehler } = await seite(b);
      await tagesfassungBisAbschluss(p);
      await p.locator(".finishbtn[data-netz]").click();
      await warte(p, 1500);
      const liegt = await p.evaluate(() => ({
        n: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length,
        fertig: !!S.tag.finished
      }));
      urteil("G4 · bei 401 bleibt der fertige Vorgang liegen, nichts verschwindet",
        liegt.n === 1 && liegt.fertig === true, JSON.stringify(liegt));
      urteil("G4 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      LAGE.putStatus = 200;
      await ctx.close();
    }

    /* ── G5 · krumme Eingabe an der Freigabe ─────────────────────────── */
    {
      LAGE.codeRufe = 0;
      const { ctx, p, fehler } = await seite(b);
      await grussZu(p);
      const erg = await p.evaluate(async () => {
        const drei = await werHatDenCode("123");
        const leer = await werHatDenCode("");
        const buch = await werHatDenCode("12a4");
        return { drei, leer, buch, satz: codeAbsage(drei) };
      });
      urteil("G5 · drei Ziffern gehen gar nicht erst hinaus",
        LAGE.codeRufe === 0, LAGE.codeRufe + " Rufe an /api/code");
      urteil("G5 · und die Absage nennt die Länge",
        /4/.test(erg.satz), erg.satz);
      urteil("G5 · leeres Feld und Buchstaben ebenso",
        erg.leer.quelle === "form" && erg.buch.quelle === "form",
        JSON.stringify([erg.leer, erg.buch]));
      urteil("G5 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

  } finally {
    await b.close();
    srv.close();
  }
  console.log(nein ? "\n" + nein + " Prüfung(en) nein." : "\nAlle Prüfungen ja.");
  process.exit(nein ? 1 : 0);
})();
