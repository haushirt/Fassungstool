/* Runde 16 im Browser · Belege UND Urteil
   ───────────────────────────────────────
       node tests/ui-runde16.cjs

   NICHT Teil von `npm test` (braucht Playwright, Regel 8). Was hier läuft,
   lässt sich in `tests/runde16.test.mjs` nicht prüfen, weil es einen
   echten Aufbau braucht: das Abschlussfenster mit und ohne Z-Bericht, der
   ausgegraute Knopf ohne Verbindung, der Weg durchs Abmelden.

   Jede Lage wird zugleich in 390 px abgelegt (review/screens/runde16/) —
   das sind die Belege aus dem Auftrag. Ein Beleg ersetzt aber nie ein
   Urteil: deshalb steht neben jedem Bild eine Prüfung, und die Rückgabe
   ist 1, sobald eine „nein" sagt.                                       */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) { console.log("Playwright nicht gefunden — UNGEPRÜFT."); process.exit(0); }

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const ZIEL = path.join(__dirname, "..", "review", "screens", "runde16");
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };

const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna",
  year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const gestern = (() => { const d = new Date(heute + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); })();

/* Was der Prüfserver gerade tut. Die Szenen stellen es vor dem Aufruf um. */
const LAGE = {
  rolle: "leitung", wer: "Casimir",
  /* Der Z-Bericht zum Vorabend — oder keiner (404), je nach Szene.
     Gefüllt wird er von der Szene selbst, sobald sie die echten
     Artikelkennungen der App kennt. */
  zbericht: null,
  abgemeldet: 0, gesendet: []
};

const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    if (u === "/api/ich") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: LAGE.wer, rolle: LAGE.rolle })); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ vorgaenge: [] })); }
    if (u === "/api/abmelden") { LAGE.abgemeldet++;
      a.writeHead(200, { ...kopf, "set-cookie": "hh_sitz=; Max-Age=0; Path=/" });
      return a.end(JSON.stringify({ ok: true })); }
    if (u === "/api/fassungsliste") {
      if (!LAGE.zbericht) { a.writeHead(404, kopf);
        return a.end(JSON.stringify({ fehler: "nicht vorhanden" })); }
      a.writeHead(200, kopf); return a.end(JSON.stringify(LAGE.zbericht));
    }
    if (u.startsWith("/api/vorgang/")) {
      let leib = ""; q.on("data", c => leib += c);
      return q.on("end", () => {
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

async function seite(b, saat) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(saat === undefined ? SAAT : saat);
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", e => fehler.push(String(e)));
  await p.goto("http://127.0.0.1:8781/index.html", { waitUntil: "load" });
  await warte(p, 500);
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
const bild = async (p, name) => {
  fs.mkdirSync(ZIEL, { recursive: true });
  await p.screenshot({ path: path.join(ZIEL, name + "-390.png"), fullPage: true });
};

/* Eine Tagesfassung bis zum Abschluss, ohne offene Punkte — und mit zwei
   Mengen, die der Abgleich vergleichen kann. Gearbeitet wird mit den
   Funktionen der App selbst (`barUnits`, `ALLE_LADEN`, `lastStep`), nicht
   mit einem nachgebauten Zustand: sonst prüfte die Lage sich selbst. */
async function tagesfassungBisAbschluss(p) {
  await grussZu(p);
  const ids = await p.evaluate(() => {
    start("tag");
    const d = S.tag;
    const wein = WINES[0].id;
    const getr = Object.keys(GSOLL)[0];
    WINES.forEach(w => { d.seen[w.id] = 1; });
    barUnits().forEach(u => {
      if (u.k === "lade") { d.gdone = d.gdone || {}; d.gdone[u.id] = 1; }
      else u.arr.forEach(x => { d.seen[x.id + "_" + u.bucket] = 1; });
    });
    d.gdone = d.gdone || {};
    ALLE_LADEN().forEach(L => { d.gdone[L.id] = 1; });
    /* Zwei Flaschen Wein und sechs Getränke — das ist das „Gefasste".
       Die Getränke NICHT in `d.gent` schreiben: `geholteGetraenke()` baut
       das Fach beim Abschluss aus `gFehlt()` und `gholt` neu auf. Gesetzt
       wird deshalb, was die App selbst liest — sechs fehlende Flaschen in
       der Lade und der Haken „geholt". */
    d.rest[wein] = 2; d.holt[wein] = 1;
    d.getr[getr] = GSOLL[getr] - 6;
    d.gholt = d.gholt || {}; d.gholt[getr] = 1;
    save();
    go(lastStep());
    return { wein, getr, offen: offenList() };
  });
  await warte(p, 500); await hilfeZu(p);
  return ids;
}

(async () => {
  await new Promise(r => srv.listen(8781, "127.0.0.1", r));
  const b = await pw.chromium.launch({ args: ["--no-sandbox"] });
  try {

    /* ── 1 · Startseite: die getauschten Gruppentöne ─────────────────── */
    {
      const { ctx, p, fehler } = await seite(b);
      await grussZu(p);
      await bild(p, "01-startseite");
      const toene = await p.evaluate(() => {
        const g = s => {
          const el = document.querySelector(s);
          if (!el) return null;
          const k = el.querySelector(".mi");
          return { ton: getComputedStyle(el).getPropertyValue("--ton").trim(),
                   bg: k ? getComputedStyle(k).backgroundColor : null };
        };
        return { service: g(".grp--service"), bestand: g(".grp--bestand") };
      });
      const hell = s => { const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(s || "");
        return m ? (+m[1] + +m[2] + +m[3]) / 3 : -1; };
      urteil("R16/3 · Service steht auf dem helleren Grund als Bestand",
        hell(toene.service.bg) > hell(toene.bestand.bg),
        "Service " + Math.round(hell(toene.service.bg)) +
        " · Bestand " + Math.round(hell(toene.bestand.bg)));
      urteil("R16/3 · Service trägt den Haus-Teal als Ton",
        /0,\s*73,\s*71|#004947/.test(toene.service.ton), toene.service.ton);
      urteil("R16/2 · der Notweg steht am Ende des Menüs",
        await p.locator(".notweg #bJsonAlles").count() === 1);
      urteil("R16/4 · die Statuszeile sagt „Verbunden“",
        (await p.locator(".netz--block .netztext").textContent() || "").trim() === "Verbunden",
        (await p.locator(".netz--block .netztext").textContent() || "").trim());
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── 2 · Abschluss MIT Z-Bericht → Pop-up „Abgleich" ─────────────── */
    {
      const { ctx, p, fehler } = await seite(b);
      LAGE.zbericht = null;                       /* erst nach den ids füllen */
      const ids = await tagesfassungBisAbschluss(p);
      urteil("der Abschluss steht ohne offenen Punkt da",
        ids.offen.length === 0, JSON.stringify(ids.offen));
      /* Wein: gefasst 2, verkauft 1 → eine Abweichung.
         Getränk: gefasst 6, verkauft 6 → keine, darf nicht erscheinen. */
      LAGE.zbericht = { tag: gestern, z: 37, positionen: [
        { rohbez: "Wein", artikel: ids.wein, anzahl: 1, ausschankMl: null },
        { rohbez: "Getränk", artikel: ids.getr, anzahl: 6, ausschankMl: null },
        { rohbez: "Glaswein", artikel: "glas1", anzahl: 12, ausschankMl: 125 },
        { rohbez: "Unbekannt", artikel: null, anzahl: 3, ausschankMl: null }
      ]};
      await bild(p, "02-abschluss-mit-zbericht");
      const knopf = p.locator(".finishbtn[data-netz]");
      urteil("R16/2 · genau ein Knopf, und er heisst „Fertig – Speichern“",
        (await knopf.textContent() || "").trim() === "Fertig – Speichern",
        (await knopf.textContent() || "").trim());
      urteil("R16/2 · „Protokoll senden“, PDF und CSV stehen nicht mehr da",
        await p.locator("#bMail, #bView, #bCsv").count() === 0);
      await knopf.click();
      await warte(p, 900);
      urteil("R16/2 · das Fenster „Abgleich“ steht",
        (await p.locator("#ovT").textContent() || "") === "Abgleich",
        await p.locator("#ovT").textContent());
      const zeilen = await p.locator("#ovBody .abglz").count();
      urteil("R16/2 · nur die Abweichung wird gezeigt — eine Zeile", zeilen === 1, zeilen + "");
      urteil("R16/2 · und zwar die richtige",
        (await p.locator("#ovBody .abglz .df").first().textContent() || "").trim() === "+1",
        await p.locator("#ovBody .abglz .df").first().textContent());
      urteil("R16/2 · EIN Notizfeld für alles",
        await p.locator("#abglNotiz").count() === 1);
      urteil("R16/2 · kein „Abbrechen“ neben dem Speichern",
        await p.locator("#ovNo").isHidden());
      await bild(p, "03-popup-abgleich");
      await p.fill("#abglNotiz", "zwei Flaschen für die Küche");
      await p.locator("#ovOk").click();
      await warte(p, 800);
      urteil("R16/2 · danach steht die Startseite da",
        await p.locator("#menu").isVisible() && await p.locator(".grp--service").count() === 1);
      const letzte = LAGE.gesendet[LAGE.gesendet.length - 1];
      urteil("R16/2 · der Vorgang ist abgeschlossen beim Server angekommen",
        !!letzte && letzte.finished === true);
      urteil("R16/2 · und die Notiz hängt am Vorgang",
        !!letzte && letzte.notiz === "zwei Flaschen für die Küche",
        letzte && letzte.notiz);
      await bild(p, "04-nach-dem-abschluss");
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── 3 · Abschluss OHNE Z-Bericht → kurzes „Fertig" ──────────────── */
    {
      LAGE.zbericht = null; LAGE.gesendet = [];
      const { ctx, p, fehler } = await seite(b);
      await tagesfassungBisAbschluss(p);
      await bild(p, "05-abschluss-ohne-zbericht");
      await p.locator(".finishbtn[data-netz]").click();
      await warte(p, 900);
      urteil("R16/2 · das kurze Fenster „Fertig“ steht",
        (await p.locator("#ovT").textContent() || "") === "Fertig",
        await p.locator("#ovT").textContent());
      urteil("R16/2 · ohne Notizfeld",
        await p.locator("#abglNotiz").count() === 0);
      await bild(p, "06-popup-fertig");
      await p.locator("#ovOk").click();
      await warte(p, 700);
      urteil("R16/2 · danach steht die Startseite da",
        await p.locator("#menu").isVisible());
      urteil("R16/2 · der Vorgang ist trotzdem abgeschlossen hinausgegangen",
        LAGE.gesendet.some(v => v.finished === true));
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── 4 · Abschluss ohne Verbindung ───────────────────────────────── */
    {
      LAGE.zbericht = null; LAGE.gesendet = [];
      const { ctx, p, fehler } = await seite(b);
      await tagesfassungBisAbschluss(p);
      const knopf = p.locator(".finishbtn[data-netz]");
      urteil("R16/4 · mit Netz ist der Knopf drückbar", await knopf.isEnabled());

      await ctx.setOffline(true);
      await p.evaluate(() => window.dispatchEvent(new Event("offline")));
      await warte(p, 500);
      urteil("R16/4 · ohne Netz ist er ausgegraut", await knopf.isDisabled());
      urteil("R16/4 · und darunter steht der Grund",
        await p.locator(".finishhint").isVisible() &&
        (await p.locator(".finishhint").textContent() || "").trim() === "Keine Verbindung");
      await bild(p, "07-abschluss-offline");

      /* Das Gefasste darf dabei nicht verloren gehen. */
      const stand = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("hh_keller_v12") || "{}"));
      urteil("R16/4 · das Gefasste liegt weiter im Gerät",
        !!stand.tag && Object.keys(stand.tag.rest || {}).length === 1 &&
        stand.tag.finished === false,
        JSON.stringify(stand.tag && stand.tag.rest));

      await ctx.setOffline(false);
      await p.evaluate(() => window.dispatchEvent(new Event("online")));
      await warte(p, 700);
      urteil("R16/4 · mit der Verbindung kommt der Knopf von selbst zurück",
        await knopf.isEnabled());
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── 5 · Abmelden ────────────────────────────────────────────────── */
    {
      LAGE.abgemeldet = 0;
      const { ctx, p, fehler } = await seite(b);
      await grussZu(p);
      await bild(p, "08-vor-dem-abmelden");
      urteil("A1 · angemeldet: der Name steht in der Sitzung",
        await p.evaluate(() => sessionStorage.getItem("hh_user")) === "Casimir");
      await p.locator("#bWechseln").click();
      await warte(p, 900);
      urteil("A1 · der Knopf ruft POST /api/abmelden",
        LAGE.abgemeldet === 1, "gerufen: " + LAGE.abgemeldet);
      urteil("A1 · danach ist die Sitzung dieses Geräts leer",
        await p.evaluate(() => sessionStorage.getItem("hh_user")) === null);
      urteil("A1 · und die Rolle ist mitgegangen",
        await p.evaluate(() => sessionStorage.getItem("hh_rolle")) === null);
      urteil("A1 · die Anmeldung steht wieder da",
        await p.locator("#pinReihe .pinfeld").count() === 4);
      urteil("A1 · ohne Netz wurde nichts vorgemerkt",
        await p.evaluate(() => localStorage.getItem("hh_abmeldung_offen_v1")) === null);
      await bild(p, "09-nach-dem-abmelden");
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── 6 · Abmelden ohne Netz: vorgemerkt, nicht verschwiegen ──────── */
    {
      LAGE.abgemeldet = 0;
      const { ctx, p, fehler } = await seite(b);
      await grussZu(p);
      await ctx.setOffline(true);
      await p.locator("#bWechseln").click();
      await warte(p, 900);
      urteil("A1 · ohne Netz wird die Abmeldung vorgemerkt",
        await p.evaluate(() => localStorage.getItem("hh_abmeldung_offen_v1")) === "1");
      urteil("A1 · und es steht auf dem Schirm",
        /nicht beendet/.test(await p.locator("#pinFehler").textContent() || ""),
        await p.locator("#pinFehler").textContent());
      await bild(p, "10-abmelden-ohne-netz");
      await ctx.setOffline(false);
      await p.evaluate(() => window.dispatchEvent(new Event("online")));
      await warte(p, 900);
      urteil("A1 · mit dem Empfang wird sie nachgeholt",
        LAGE.abgemeldet >= 1, "gerufen: " + LAGE.abgemeldet);
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── 7 · Zoom: Doppeltipp weg, Pinch da, Felder 16 px ────────────── */
    {
      const { ctx, p, fehler } = await seite(b);
      await grussZu(p);
      const ta = await p.evaluate(() =>
        getComputedStyle(document.documentElement).touchAction);
      urteil("R16/1 · touch-action am html ist „manipulation“",
        ta === "manipulation", ta);
      const klein = await p.evaluate(() => {
        const aus = [];
        document.querySelectorAll("input,select,textarea").forEach(el => {
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) return;
          const g = parseFloat(getComputedStyle(el).fontSize);
          if (g < 16) aus.push(el.id || el.className || el.tagName);
        });
        return aus;
      });
      urteil("R16/1 · kein sichtbares Feld unter 16 px",
        klein.length === 0, klein.join(", "));
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

  } finally {
    await b.close();
    srv.close();
  }

  console.log("");
  console.log(nein ? nein + " Prüfung(en) sagen NEIN." : "Alle Prüfungen ja.");
  console.log("Bilder in review/screens/runde16/");
  process.exit(nein ? 1 : 0);
})();
