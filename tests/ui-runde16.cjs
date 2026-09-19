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
  zbericht: null, mapping: [], stumm: false, stummerLeib: null,
  abgemeldet: 0, gesendet: [],
  /* Szene 8 · das Team-Formular im Backoffice. `personenStumm` laesst
     NUR das GET nie antworten; das POST kommt an und wird beantwortet.
     Genau die Lage, in der die Kennung gebraucht wird: geschrieben ist
     geschrieben, aber die Liste kommt nicht zurueck, also kann der
     Client aus `LEUTE` nicht mehr ablesen, ob er schon geschrieben hat. */
  personen: [], personenStumm: false, pakete: []
};

const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    /* `stumm` nimmt die Anfrage an und antwortet nie — der Kellerfall:
       WLAN da, kein Durchsatz. `fetch` bricht von sich aus nicht ab.
       `stummerLeib` sendet Kopf und Statuszeile und danach nie den Leib —
       das halb durchgekommene Paket. Beides trifft JEDEN /api-Pfad; ein
       schwacher Access Point schweigt nicht nach Endpunkt.
       (Bis zur dritten Jagd traf `stumm` nur `/api/fassungsliste` — die
       Szene prüfte damit genau den Ausschnitt, den die Behebung abdeckte.) */
    if (LAGE.stumm && (LAGE.stumm === true || u === LAGE.stumm)) return;
    if (LAGE.stummerLeib && u === LAGE.stummerLeib) {
      a.writeHead(200, kopf); return;   /* Kopf ja, Leib nie */
    }
    if (u === "/api/ich") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: LAGE.wer, rolle: LAGE.rolle })); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ vorgaenge: [] })); }
    if (u === "/api/abmelden") { LAGE.abgemeldet++;
      a.writeHead(200, { ...kopf, "set-cookie": "hh_sitz=; Max-Age=0; Path=/" });
      return a.end(JSON.stringify({ ok: true })); }
    if (u === "/api/personen") {
      if (q.method === "POST") {
        let leib = ""; q.on("data", c => leib += c);
        return q.on("end", () => {
          try { LAGE.pakete.push(JSON.parse(leib)); } catch (e) {}
          a.writeHead(200, kopf); a.end(JSON.stringify({ ok: true }));
        });
      }
      if (LAGE.personenStumm) return;            /* GET antwortet nie */
      a.writeHead(200, kopf);
      return a.end(JSON.stringify({ personen: LAGE.personen || [] }));
    }
    if (u === "/api/mapping") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ mapping: LAGE.mapping || [] })); }
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
      /* Die Zeilen sehen aus, wie `gnparse.ml()` sie liefert: Die Menge
         steht im Kassennamen und landet in `ausschankMl` — „1/8 l" gibt
         125, „0,33 l" gibt 330. Umgerechnet wird mit der bestätigten
         Gebindegrösse aus /api/mapping, genau wie im Backoffice.
         Wein:    6 × 125 / 750 = 1 Flasche verkauft, 2 gefasst → +1.
         Getränk: 6 × 330 / 330 = 6 verkauft, 6 gefasst → keine Zeile.
         Glaswein ohne Grösse → aus der Rechnung, in den Fuss. */
      LAGE.zbericht = { tag: gestern, z: 37, positionen: [
        { rohbez: "Wein 1/8 l",    artikel: ids.wein, anzahl: 6,  ausschankMl: 125 },
        { rohbez: "Getränk 0,33 l",artikel: ids.getr, anzahl: 6,  ausschankMl: 330 },
        { rohbez: "Glaswein 1/8 l",artikel: "glas1",  anzahl: 12, ausschankMl: 125 },
        { rohbez: "Omelett",       artikel: null,     anzahl: 3,  ausschankMl: null }
      ]};
      LAGE.mapping = [
        { kassenname: "Wein 1/8 l",     gebinde_ml: 750 },
        { kassenname: "Getränk 0,33 l", gebinde_ml: 330 }
      ];
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
      urteil("R16/2 · die Position ohne Gebindegröße steht im Fuß, nicht als Zeile",
        /keine best.tigte Gebindegr/.test(await p.locator(".abglfuss").textContent() || ""),
        (await p.locator(".abglfuss").textContent() || "").slice(0, 70));
      /* BERICHTIGT (qa-guardian, Gegenprobe Runde 16): Hier stand, im
         Fenster dürfe „keinem Artikel zugeordnet" überhaupt nicht
         vorkommen. Das deckte den Fall, dass eine GEFASSTE Ware ohne
         zugeordnete Kassenposition mit „verkauft 0" als Abweichung
         dasteht und niemand sagt, warum (G1 der Gegenprobe). Der
         Anspruch lautet jetzt: die Küchenpositionen stehen nicht mit
         NAMEN und nicht als ZEILE im Keller — genannt wird nur ihre
         Zahl, und nur im Fuß. */
      urteil("R16/2 · die Küchenposition steht nicht mit Namen im Kellerfenster",
        !/Omelett/.test(await p.locator("#ovBody").textContent() || ""),
        (await p.locator("#ovBody").textContent() || "").slice(0, 60));
      urteil("R16/2 · und nur als Zahl im Fuß, nicht als Zeile",
        /1 Kassenposition ist keinem Artikel zugeordnet/
          .test(await p.locator(".abglfuss").textContent() || "") && zeilen === 1,
        (await p.locator(".abglfuss").textContent() || "").slice(0, 120));
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

    /* ── 4 · Abschluss ohne Verbindung ─────────────────────────────────
       Der Kern von Regel 6: Im Keller ist kein Netz, und eine fertige
       Fassung muss dort trotzdem abzuschliessen sein. Der Vorgang geht in
       den Ausgang und wartet; der Abgleich kommt nach.
       (Bis zur Jagd dieser Runde war der Knopf hier gesperrt, und diese
       Datei schrieb das als bestandene Prüfung fest.) */
    {
      LAGE.zbericht = null; LAGE.gesendet = [];
      const { ctx, p, fehler } = await seite(b);
      await tagesfassungBisAbschluss(p);
      const knopf = p.locator(".finishbtn[data-netz]");
      urteil("R16/4 · mit Netz ist der Knopf drückbar", await knopf.isEnabled());

      await ctx.setOffline(true);
      await p.evaluate(() => window.dispatchEvent(new Event("offline")));
      await warte(p, 500);
      urteil("R16/4 · ohne Netz ist er WEITER drückbar", await knopf.isEnabled());
      urteil("R16/4 · und darunter steht, was fehlt",
        await p.locator(".finishhint").isVisible() &&
        /Keine Verbindung/.test(await p.locator(".finishhint").textContent() || ""),
        (await p.locator(".finishhint").textContent() || "").trim());
      await bild(p, "07-abschluss-offline");

      await knopf.click();
      await warte(p, 900);
      urteil("R16/4 · ohne Netz kommt das kurze „Fertig“",
        (await p.locator("#ovT").textContent() || "") === "Fertig",
        await p.locator("#ovT").textContent());
      urteil("R16/4 · und es sagt, dass der Vorgang im Gerät wartet",
        /geht hinaus, sobald/.test(await p.locator("#ovBody").textContent() || ""),
        (await p.locator("#ovBody").textContent() || "").slice(0, 90));
      await bild(p, "11-popup-fertig-offline");
      await p.locator("#ovOk").click();
      await warte(p, 700);

      const lage = await p.evaluate(() => ({
        stand: JSON.parse(localStorage.getItem("hh_keller_v12") || "{}"),
        ausgang: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]")
      }));
      urteil("R16/4 · der Vorgang ist abgeschlossen",
        !!lage.stand.tag && lage.stand.tag.finished === true,
        JSON.stringify(lage.stand.tag && lage.stand.tag.finished));
      urteil("R16/4 · und liegt im Ausgang, statt verloren zu sein",
        lage.ausgang.some(x => x.schluessel && x.schluessel.indexOf("tag_") === 0),
        lage.ausgang.length + " Einträge");

      await ctx.setOffline(false);
      await p.evaluate(() => window.dispatchEvent(new Event("online")));
      await warte(p, 900);
      urteil("R16/4 · mit der Verbindung geht er von selbst hinaus",
        LAGE.gesendet.some(v => v.finished === true),
        LAGE.gesendet.length + " PUTs");
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── 4b · Kein Z-Bericht, keine Größen: nichts behaupten ──────────── */
    {
      LAGE.gesendet = [];
      const { ctx, p, fehler } = await seite(b);
      const ids = await tagesfassungBisAbschluss(p);
      /* Der heutige Live-Zustand: ein Z-Bericht ist da, aber KEINE der
         dreizehn Zuordnungen hat eine bestätigte Gebindegröße. Beide
         gefassten Artikel kommen darin vor — sonst wäre „gefasst 6,
         verkauft 0" eine echte Abweichung und gehörte gezeigt. */
      LAGE.zbericht = { tag: gestern, z: 37, positionen: [
        { rohbez: "Wein 1/8 l",    artikel: ids.wein, anzahl: 6, ausschankMl: 125 },
        { rohbez: "Getränk 0,33 l",artikel: ids.getr, anzahl: 6, ausschankMl: 330 }
      ]};
      LAGE.mapping = [];
      await p.locator(".finishbtn[data-netz]").click();
      await warte(p, 900);
      const text = await p.locator("#ovBody").textContent() || "";
      urteil("R16/2 · ohne Gebindegrößen sagt das Fenster „Nichts zu vergleichen“",
        /Nichts zu vergleichen/.test(text), text.slice(0, 80));
      urteil("R16/2 · und behauptet NICHT „Keine Abweichung“",
        !/Keine Abweichung/.test(text));
      await bild(p, "12-abgleich-ohne-groessen");
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── 4c · Der Server nimmt an und antwortet nie ────────────────────
       Der Keller hat selten gar kein Netz — er hat ein WLAN, das die
       Verbindung annimmt und schweigt. Ohne Zeitgrenze blieb der Knopf
       auf „speichert …" stehen, `laeuftAbschluss` auf true, und der
       Vorgang wurde weder abgeschlossen noch in den Ausgang gelegt:
       derselbe Zustand wie unter der Verbindungssperre, nur durch eine
       andere Tür (zweite Jagd Runde 16 · A). */
    {
      LAGE.zbericht = null; LAGE.mapping = []; LAGE.gesendet = [];
      LAGE.stumm = "/api/fassungsliste";
      const { ctx, p, fehler } = await seite(b);
      await tagesfassungBisAbschluss(p);
      const knopf = p.locator(".finishbtn[data-netz]");
      const t0 = Date.now();
      await knopf.click();
      /* Die Zeitgrenze steht auf acht Sekunden; zwölf sind Luft genug. */
      await p.waitForSelector("#ov.on", { timeout: 12000 }).catch(() => {});
      const dauer = Date.now() - t0;
      urteil("A · der schweigende Server hält den Abschluss nicht auf",
        await p.locator("#ov").evaluate(el => el.classList.contains("on")),
        Math.round(dauer / 1000) + " s bis zum Fenster");
      urteil("A · und der Knopf steht nicht mehr auf „speichert …“",
        (await knopf.textContent() || "").trim() === "Fertig – Speichern" &&
        await knopf.isEnabled(),
        (await knopf.textContent() || "").trim());
      await p.locator("#ovOk").click();
      await warte(p, 600);
      const lage = await p.evaluate(() => ({
        stand: JSON.parse(localStorage.getItem("hh_keller_v12") || "{}"),
        ausgang: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]")
      }));
      /* Abgeschlossen — und entweder schon hinaus oder in der Reihe.
         Der Prüfserver nimmt `PUT /api/vorgang/…` an (nur die Liste
         schweigt), also leert `schiebe()` den Ausgang sofort wieder.
         Beides ist richtig; verloren sein darf er nicht. */
      urteil("A · der Vorgang ist abgeschlossen und nicht verloren",
        !!lage.stand.tag && lage.stand.tag.finished === true &&
        (lage.ausgang.some(x => (x.schluessel || "").indexOf("tag_") === 0) ||
         LAGE.gesendet.some(v => v.finished === true)),
        "fertig: " + JSON.stringify(lage.stand.tag && lage.stand.tag.finished) +
        " · Ausgang " + lage.ausgang.length + " · PUTs " + LAGE.gesendet.length);
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      LAGE.stumm = false;
      await ctx.close();
    }

    /* ── 4d · Kopf ja, Leib nie ────────────────────────────────────────
       Die erste Frist endete, sobald der KOPF da war — `await r.json()`
       lief danach ohne jede Grenze. Ein halb durchgekommenes Paket über
       schwaches WLAN ist der Normalfall dieses Fehlerbilds, nicht die
       Ausnahme (dritte Jagd Runde 16 · A). */
    {
      LAGE.zbericht = null; LAGE.mapping = []; LAGE.gesendet = [];
      LAGE.stumm = false; LAGE.stummerLeib = "/api/fassungsliste";
      const { ctx, p, fehler } = await seite(b);
      await tagesfassungBisAbschluss(p);
      const knopf = p.locator(".finishbtn[data-netz]");
      await knopf.click();
      await p.waitForSelector("#ov.on", { timeout: 15000 }).catch(() => {});
      urteil("A · Kopf ohne Leib hält den Abschluss nicht auf",
        await p.locator("#ov").evaluate(el => el.classList.contains("on")));
      urteil("A · und der Knopf ist wieder frei",
        (await knopf.textContent() || "").trim() === "Fertig – Speichern" &&
        await knopf.isEnabled(), (await knopf.textContent() || "").trim());
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      LAGE.stummerLeib = null;
      await ctx.close();
    }

    /* ── 4e · Der Ausgang am schweigenden PUT ──────────────────────────
       Der einzige Weg, auf dem die Daten das Gerät verlassen, war der
       einzige ohne Frist. Ohne sie fiel `NETZ.laeuft` nie, und ALLE
       Anstösse danach prallten daran ab — der Ausgang stand für die
       ganze Sitzung still, während der Chip „Verbunden" sagte. */
    {
      LAGE.zbericht = null; LAGE.mapping = []; LAGE.gesendet = [];
      LAGE.stumm = "/api/vorgang/tag_" + heute;
      const { ctx, p, fehler } = await seite(b);
      await tagesfassungBisAbschluss(p);
      await p.locator(".finishbtn[data-netz]").click();
      await p.waitForSelector("#ov.on", { timeout: 15000 }).catch(() => {});
      await p.locator("#ovOk").click();
      await warte(p, 500);
      /* Die Frist am PUT steht auf 20 s. Danach muss die Sperre gefallen
         sein, sonst geht nie wieder etwas hinaus. */
      await p.waitForFunction(() => NETZ.laeuft === false, null,
        { timeout: 30000 }).catch(() => {});
      urteil("A · die Sperre des Ausgangs fällt auch am schweigenden Server",
        await p.evaluate(() => NETZ.laeuft) === false,
        "laeuft: " + await p.evaluate(() => NETZ.laeuft));
      /* Und ein neuer Anstoss muss wieder etwas versuchen. */
      LAGE.stumm = false;
      const vorher = LAGE.gesendet.length;
      await p.evaluate(() => schiebe());
      await warte(p, 1200);
      urteil("A · nach der Frist geht der Vorgang wieder hinaus",
        LAGE.gesendet.length > vorher,
        vorher + " → " + LAGE.gesendet.length + " PUTs");
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── 4f · Die Anmeldung am schweigenden Server ─────────────────────
       `laeuftPruefung` blieb true, der Wächter liess keinen zweiten
       Versuch durch, und die Rückfallebene für den Keller ohne Netz lag
       hinter demselben `await`. */
    {
      LAGE.stumm = "/api/anmelden";
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      /* Ohne Saat steht die Anmeldung; ein Code, der auf diesem Gerät
         schon einmal geglückt ist, liegt im Vorrat. */
      await ctx.addInitScript(`(()=>{ try{
        localStorage.setItem("hh_bekannt_v1", '{"roh:1234":"Casimir"}');
      }catch(e){} })();`);
      const p = await ctx.newPage();
      const fehler = [];
      p.on("pageerror", e => fehler.push(String(e)));
      await p.goto("http://127.0.0.1:8781/index.html", { waitUntil: "load" });
      await warte(p, 500);
      for (const z of ["1", "2", "3", "4"]) await p.keyboard.press(z);
      await p.waitForFunction(
        () => (document.querySelector("#pinFehler") || {}).textContent,
        null, { timeout: 15000 }).catch(() => {});
      urteil("A · die Anmeldung bleibt am schweigenden Server nicht stumm",
        !!(await p.locator("#pinFehler").textContent() || "").trim(),
        (await p.locator("#pinFehler").textContent() || "").trim().slice(0, 60));
      urteil("A · und ein zweiter Versuch ist danach wieder möglich",
        await p.evaluate(() => {
          const i = document.querySelector("#uCode");
          return !!i && i.value === "";
        }));
      await bild(p, "14-anmeldung-schweigender-server");
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      LAGE.stumm = false;
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

    /* ── 8 · Die Kennung überlebt „Aktualisieren“ ─────────────── */
    /* Siebte Jagd Runde 16 · A. `tests/runde16.test.mjs` prüfte den
       Quelltext und war grün, während `const nKennung={}` in `vTeam(m)`
       lag — eine Regex kann eine Lebensdauer nicht messen. Diese Szene
       klickt: Der Server nimmt das POST an, das GET auf `/api/personen`
       schweigt, dazwischen ein Druck auf „Aktualisieren“ (`#bNeu`), der
       `zeichne()` auslöst und die Ansicht neu baut. Landet derselbe
       Mensch danach mit einer ZWEITEN Kennung beim Server, stehen in der
       Live-D1 zwei aktive Zeilen mit zwei gültigen Anmeldecodes — und es
       gibt kein Löschen und keine Sicherung (Projektanleitung §8). */
    {
      LAGE.personenStumm = true; LAGE.pakete = [];
      const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
      const p = await ctx.newPage();
      const fehler = []; p.on("pageerror", e => fehler.push(String(e)));
      await p.goto("http://127.0.0.1:8781/leitung.html", { waitUntil: "load" });
      await warte(p, 800);
      await p.evaluate(() => { SEITE = "team"; zeichne(); });
      await warte(p, 500);

      const anlegen = async (code) => {
        await p.fill("#nName", "Anna Beispiel");
        await p.fill("#nCode", code);
        await p.click("#nAdd");
        await warte(p, 600);
      };
      await anlegen("1234");
      urteil("A/7 · der erste Anlauf kommt beim Server an",
        LAGE.pakete.length === 1, "Pakete: " + LAGE.pakete.length);
      /* `hole()` laeuft in die 8-s-Frist von `kurz()` — erst danach
         steht der Satz da, den die Leitung liest. Hier wird er
         abgewartet, nicht abgekuerzt: Der Griff zu „Aktualisieren"
         kommt im Haus genau nach diesem Satz. */
      await warte(p, 9000);
      urteil("A/7 · die Liste kam nicht — der Schirm sagt es",
        /Keine Verbindung zum Server/.test(await p.locator("#teamL").innerText()),
        (await p.locator("#teamL").innerText()).slice(0, 60));

      /* Der Griff, den der Satz auf dem Schirm nahelegt. */
      await p.click("#bNeu");
      await warte(p, 700);
      await p.evaluate(() => { SEITE = "team"; zeichne(); });
      await warte(p, 500);
      await anlegen("5678");

      const kennungen = new Set(LAGE.pakete.map(x => x.id));
      urteil("A/7 · zweimal derselbe Mensch → EINE Kennung, auch nach „Aktualisieren“",
        LAGE.pakete.length === 2 && kennungen.size === 1,
        "Pakete: " + LAGE.pakete.length + " · Kennungen: " + kennungen.size);
      urteil("A/7 · die Kennung steht auch nach einem Neuladen des Tabs bereit",
        await p.evaluate(() => {
          try { return !!JSON.parse(sessionStorage.getItem("hh_nkennung_v1") || "{}")["anna beispiel"]; }
          catch (e) { return false; }
        }));
      urteil("keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
      LAGE.personenStumm = false;
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
