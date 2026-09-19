/* Runde 17 · Fremdgerät, „läuft gerade woanders" und der Papierkorb
   ──────────────────────────────────────────────────────────────────
   NICHT Teil von `npm test` (die Datei endet nicht auf .test.mjs), sie
   läuft von Hand:

       node tests/ui-runde17.cjs

   Kein Worker nötig: /api/ antwortet 503, `FERN` kommt aus dem
   localStorage — so, wie es nach dem letzten Abgleich im Gerät liegt.
   Der Keller hat kein Netz; genau dort werden diese drei Fälle erlebt.

   Geprüft wird, was Runde 17 versprochen hat:

   H1  Der Fremdgerät-Dialog kennt drei Lagen.
       A · der fremde Vorgang ist ABGESCHLOSSEN → das sagt er, und
           „Ansehen" schickt ihn nicht ein zweites Mal hinaus.
       B · er LÄUFT, Modus Tagesfassung → Übernehmen oder Abbrechen,
           und Abbrechen führt ins Menü.
       C · er LÄUFT, Modus Sonderentnahme → dazu ein dritter Weg:
           ein eigener Vorgang daneben, mit eigenem Schlüssel.

   H2  Eine Kachel nur anzutippen legt NICHTS in den Ausgang. Erst mit
       der ersten erfassten Flasche wird daraus ein laufender Vorgang.

   H3  Der Papierkorb: auf der Kachel und in der Statusleiste. Er fragt
       nach, legt den Stand ins Archiv, räumt den Ausgang und nimmt den
       „läuft"-Zustand auf den anderen Geräten zurück.               */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — diese Fälle bleiben UNGEPRÜFT.");
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const PORT = 8961;
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };

let fehler = 0, geprueft = 0;
const ok = (satz, bedingung, dazu) => {
  geprueft++;
  console.log((bedingung ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
  if (!bedingung) fehler++;
};

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
const JETZT = new Date().toISOString();

/* Ein fremder Stand, wie ihn `zieheFern()` ablegt. */
const fern = (schluessel, modus, daten, fertig) => ({
  schluessel, modus, tag: HEUTE, name: "Bea", geraet: "ipad-2", zaehlnr: 5,
  status: fertig ? "fertig" : "laeuft", zeit: JETZT,
  daten: Object.assign({ mode: modus, tag: HEUTE, name: "Bea",
                         finished: !!fertig, ver: 12 }, daten)
});

const TAG_DATEN = { rest: { w001: 4 }, barrot: {}, bar: {}, backup: {},
  seen: { w001: 1 }, holt: {}, zusatz: {}, gzusatz: {}, gent: {}, getr: {},
  gdone: {}, gcheck: {}, goffen: {}, gholt: {}, gholtN: {}, holtN: {} };
const NACH_DATEN = { ent: { w002: 2 }, gent: {}, gzusatz: {}, grund: "kueche" };

function saatFuer(fernObj, eigen, geraet) {
  return `(()=>{ try{
    sessionStorage.setItem("hh_user","Asad");
    localStorage.setItem("hh_bekannt_v1", '{"x":"Asad"}');
    ${geraet ? `localStorage.setItem("hh_geraet_v1", ${JSON.stringify(geraet)});` : ""}
    localStorage.setItem("hh_fern_v1", ${JSON.stringify(JSON.stringify(fernObj))});
    localStorage.setItem("hh_keller_v12", ${JSON.stringify(JSON.stringify(eigen || {}))});
  }catch(e){} })();`;
}

const zustand = p => p.evaluate(() => ({
  ov: document.getElementById("ov").classList.contains("on"),
  titel: document.getElementById("ovT").textContent,
  koerper: document.getElementById("ovBody").textContent,
  okText: document.getElementById("ovOk").textContent,
  dritterWeg: !!document.getElementById("ovEigen"),
  imFormular: document.getElementById("app").style.display !== "none",
  menu: document.getElementById("menu").style.display !== "none",
  ausgang: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]"),
  archiv: Object.keys(JSON.parse(localStorage.getItem("hh_archiv") || "{}")),
  stand: JSON.parse(localStorage.getItem("hh_keller_v12") || "{}")
}));

async function seite(browser, fernObj, eigen, geraet) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(saatFuer(fernObj, eigen, geraet));
  const p = await ctx.newPage();
  p.on("pageerror", e => { fehler++; console.log("  !! JS-FEHLER:", e.message); });
  await p.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "load" });
  await p.waitForTimeout(400);
  return { ctx, p };
}

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const browser = await pw.chromium.launch();

  /* ══ H1-A · Der fremde Vorgang ist schon abgeschlossen ══════════════ */
  console.log("\n══ H1-A · fremder Vorgang ist fertig ══\n");
  {
    const { ctx, p } = await seite(browser,
      { ["tag_" + HEUTE]: fern("tag_" + HEUTE, "tag", TAG_DATEN, true) });
    await p.evaluate(() => start("tag"));
    await p.waitForTimeout(300);
    let z = await zustand(p);
    ok("der Dialog sagt, dass der Vorgang abgeschlossen ist",
       /abgeschlossen/i.test(z.titel), z.titel);
    ok("er bietet nicht „Übernehmen“ an", z.okText !== "Übernehmen", z.okText);
    ok("der Knopf heißt „Ansehen“", z.okText === "Ansehen", z.okText);

    await p.evaluate(() => document.getElementById("ovOk").click());
    await p.waitForTimeout(400);
    z = await zustand(p);
    ok("der fertige Stand geht NICHT noch einmal hinaus",
       z.ausgang.length === 0, z.ausgang.length + " im Ausgang");
    ok("er liegt dafür im Archiv", z.archiv.indexOf("tag_" + HEUTE) >= 0,
       z.archiv.join(","));
    ok("die eigene Tagesfassung wurde nicht angelegt",
       !z.stand.tag || !z.stand.tag.rest || !Object.keys(z.stand.tag.rest).length,
       JSON.stringify(z.stand.tag || null).slice(0, 60));
    await ctx.close();
  }

  /* ══ H1-B · Tagesfassung läuft woanders ═════════════════════════════ */
  console.log("\n══ H1-B · Tagesfassung läuft woanders ══\n");
  {
    const { ctx, p } = await seite(browser,
      { ["tag_" + HEUTE]: fern("tag_" + HEUTE, "tag", TAG_DATEN, false) });
    await p.evaluate(() => start("tag"));
    await p.waitForTimeout(300);
    let z = await zustand(p);
    ok("die App fragt", z.ov && /anderen Gerät/.test(z.titel), z.titel);
    ok("kein dritter Weg bei der Tagesfassung — die gibt es je Tag einmal",
       !z.dritterWeg);

    await p.evaluate(() => document.getElementById("ovNo").click());
    await p.waitForTimeout(400);
    z = await zustand(p);
    ok("Abbrechen führt ins Menü", z.menu && !z.imFormular);
    ok("Abbrechen startet keinen eigenen Vorgang",
       !z.stand.tag, JSON.stringify(z.stand).slice(0, 60));
    ok("und legt nichts in den Ausgang", z.ausgang.length === 0);

    await p.evaluate(() => start("tag"));
    await p.waitForTimeout(300);
    z = await zustand(p);
    ok("beim nächsten Antippen wird wieder gefragt", z.ov, z.titel);
    await ctx.close();
  }

  /* ══ H1-C · Sonderentnahme daneben ══════════════════════════════════ */
  console.log("\n══ H1-C · Sonderentnahme daneben ══\n");
  {
    const { ctx, p } = await seite(browser,
      { ["nach_" + HEUTE]: fern("nach_" + HEUTE, "nach", NACH_DATEN, false) });
    await p.evaluate(() => start("nach"));
    await p.waitForTimeout(300);
    let z = await zustand(p);
    ok("die App fragt", z.ov && /anderen Gerät/.test(z.titel), z.titel);
    ok("bei der Sonderentnahme gibt es den dritten Weg", z.dritterWeg);

    await p.evaluate(() => document.getElementById("ovEigen").click());
    await p.waitForTimeout(400);
    z = await zustand(p);
    ok("der eigene Vorgang ist offen", z.imFormular && !z.ov);
    const sitzung = await p.evaluate(() => (S.nach || {}).sitzung || "");
    ok("er trägt eine eigene Sitzung", !!sitzung, sitzung);
    const sch = await p.evaluate(() => schluesselVon(S.nach));
    ok("und damit einen eigenen Schlüssel", sch !== "nach_" + HEUTE, sch);
    ok("der Modus bleibt aus dem Schlüssel lesbar",
       sch.split("_")[0] === "nach", sch.split("_")[0]);

    const fremdNoch = await p.evaluate(() =>
      !!JSON.parse(localStorage.getItem("hh_fern_v1") || "{}")["nach_" +
        new Date().toISOString().slice(0, 10)]);
    ok("der fremde Stand bleibt unangetastet", fremdNoch);

    await p.evaluate(() => start("nach"));
    await p.waitForTimeout(300);
    z = await zustand(p);
    ok("die Frage kommt nicht bei jedem Antippen wieder", !z.ov, z.titel);
    await ctx.close();
  }

  /* ══ H2 · Nur ansehen ist kein Bearbeiten ═══════════════════════════ */
  console.log("\n══ H2 · „läuft“ erst bei echter Erfassung ══\n");
  {
    const { ctx, p } = await seite(browser, {});
    await p.evaluate(() => start("nach"));
    await p.waitForTimeout(300);
    /* Die 45-Sekunden-Runde von Hand auslösen, statt 45 s zu warten. */
    await p.evaluate(() => { sammle(); zwischenstand(); });
    let z = await zustand(p);
    ok("eine Kachel nur antippen legt nichts in den Ausgang",
       z.ausgang.length === 0, z.ausgang.length + " im Ausgang");

    await p.evaluate(() => { S.nach.ent = { w002: 3 }; save(); });
    await p.evaluate(() => { sammle(); zwischenstand(); });
    z = await zustand(p);
    ok("mit der ersten Flasche wird daraus ein laufender Vorgang",
       z.ausgang.length === 1, z.ausgang.length + " im Ausgang");
    ok("und zwar unter dem richtigen Schlüssel",
       z.ausgang[0] && z.ausgang[0].schluessel === "nach_" + HEUTE,
       z.ausgang[0] && z.ausgang[0].schluessel);
    await ctx.close();
  }

  /* ══ H2b · Ein leerer fremder Stand ist kein „woanders" ═════════════ */
  console.log("\n══ H2b · leerer fremder Stand zählt nicht ══\n");
  {
    const leer = { ent: {}, gent: {}, gzusatz: {}, grund: "" };
    const { ctx, p } = await seite(browser,
      { ["nach_" + HEUTE]: fern("nach_" + HEUTE, "nach", leer, false) });
    const zeile = await p.evaluate(() => {
      const e = document.querySelector(".fernzeile"); return e ? e.textContent : ""; });
    ok("die Startseite meldet keinen fremden Vorgang", zeile === "", zeile);
    await p.evaluate(() => start("nach"));
    await p.waitForTimeout(300);
    const z = await zustand(p);
    ok("und es wird nicht gefragt", !z.ov, z.titel);
    ok("der eigene Vorgang ist ohne Umweg offen", z.imFormular);
    await ctx.close();
  }

  /* ══ H3 · Der Papierkorb ════════════════════════════════════════════ */
  console.log("\n══ H3 · Vorgang zurücksetzen ══\n");
  {
    const eigen = { nach: Object.assign({ mode: "nach", tag: HEUTE, name: "Asad",
      notiz: "", finished: false, ver: 12 }, NACH_DATEN) };
    /* Der eigene Vorgang war schon einmal draußen: derselbe Schlüssel
       steht in FERN, mit der eigenen Gerätekennung. */
    const meinFern = { ["nach_" + HEUTE]: {
      schluessel: "nach_" + HEUTE, modus: "nach", tag: HEUTE, name: "Asad",
      /* DIESES Gerät — sonst hält `fernNeuer` den Stand für einen fremden
         und stellt erst einmal die Frage „auf einem anderen Gerät
         weiter?". Die Kennung wird unten mitgegeben. */
      geraet: "dieses-geraet", zaehlnr: 2, status: "laeuft", zeit: JETZT,
      daten: Object.assign({ mode: "nach", tag: HEUTE, name: "Asad",
                             finished: false, ver: 12 }, NACH_DATEN) } };
    const { ctx, p } = await seite(browser, meinFern, eigen, "dieses-geraet");

    const kachelKorb = await p.evaluate(() =>
      document.querySelectorAll('.mi-wrap .mi-del[data-del="nach"]').length);
    ok("auf der angefangenen Kachel steht ein Papierkorb", kachelKorb === 1,
       kachelKorb + " gefunden");
    const leereKachel = await p.evaluate(() =>
      document.querySelectorAll('[data-del="keller"]').length);
    ok("an einer leeren Kachel steht keiner", leereKachel === 0);

    /* Im Vorgang: der Papierkorb in der Statusleiste. */
    await p.evaluate(() => start("nach"));
    await p.waitForTimeout(400);
    const leisteKorb = await p.evaluate(() => {
      const b = document.querySelector("#netz .netzdel");
      return b && !b.hidden && b.querySelector("svg") ? 1 : 0; });
    ok("in der Statusleiste im Vorgang steht einer", leisteKorb === 1);

    await p.evaluate(() => { document.getElementById("bHome").click(); });
    await p.waitForTimeout(300);
    await p.evaluate(() =>
      document.querySelector('.mi-del[data-del="nach"]').click());
    await p.waitForTimeout(300);
    let z = await zustand(p);
    ok("ein Klick löscht nicht sofort, sondern fragt",
       z.ov && /zurücksetzen/i.test(z.titel), z.titel);
    ok("die Frage nennt den Vorgang", /Sonderentnahme/.test(z.koerper),
       z.koerper.slice(0, 50));

    await p.evaluate(() => document.getElementById("ovOk").click());
    await p.waitForTimeout(500);
    z = await zustand(p);
    ok("der Stand ist weg",
       !z.stand.nach || !Object.keys(z.stand.nach.ent || {}).length,
       JSON.stringify(z.stand.nach || null).slice(0, 60));
    ok("aber im Archiv gesichert", z.archiv.indexOf("nach_" + HEUTE) >= 0,
       z.archiv.join(","));
    ok("man steht wieder im Menü", z.menu && !z.imFormular);
    const korbWeg = await p.evaluate(() =>
      document.querySelectorAll('[data-del="nach"]').length);
    ok("die Kachel gilt nicht mehr als angefangen", korbWeg === 0);
    /* Der leere Stand mit höherer Zählnummer nimmt „läuft" zurück. */
    ok("ein leerer Stand geht hinaus und beendet „läuft“",
       z.ausgang.length === 1 && z.ausgang[0].schluessel === "nach_" + HEUTE,
       JSON.stringify(z.ausgang.map(x => x.schluessel)));
    const leerDraussen = z.ausgang[0] && z.ausgang[0].daten;
    ok("dieser Stand ist wirklich leer",
       leerDraussen && !Object.keys(leerDraussen.ent || {}).length
       && leerDraussen.finished === false);
    ok("und trägt eine höhere Zählnummer als der zuletzt gesendete",
       leerDraussen && leerDraussen.zaehlnr > 2, leerDraussen && leerDraussen.zaehlnr);
    await ctx.close();
  }

  await browser.close(); srv.close();
  console.log("\n══ Ergebnis ══");
  console.log(fehler ? `  ${fehler} von ${geprueft} Punkten NICHT in Ordnung`
                     : `  ${geprueft} von ${geprueft} Punkten in Ordnung`);
  process.exit(fehler ? 1 : 0);
})();
