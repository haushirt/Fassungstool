/* qa-guardian · Runde 16, letzter Zug — das Gedaechtnis `hh_nkennung_v1`
   ───────────────────────────────────────────────────────────────────────
       node tests/qa-runde16-kennung.cjs

   NICHT Teil von `npm test` (braucht Playwright, Regel 8).

   Die siebte Jagd hat `nKennung` aus `vTeam()` auf Modulebene gehoben und
   zusaetzlich in den `localStorage` gespiegelt. Das beruehrt zwei harte
   Regeln, die eine Quelltext-Regex nicht messen kann:

   · Regel 9 — in dem neuen Schluessel darf KEIN Anmeldecode stehen.
     Geprueft wird deshalb am laufenden Objekt: nach dem Anlegen einer
     Person wird JEDER Eintrag beider Browserspeicher gelesen und gegen
     den gerade getippten Code gehalten. Dazu die Form: eine flache Karte
     Name -> Kennung, sonst nichts.
   · Der Speicher darf verweigern (privates Fenster, volles Kontingent).
     Dann muss das Backoffice unveraendert weiterlaufen — und darf vor
     allem nicht in die Dublette zurueckfallen, solange der Tab lebt.

   Dazu der Fall, den `tests/ui-runde16.cjs` Szene 8 offen laesst: ein
   ECHTES Neuladen des Tabs (`reload()`), nicht nur `zeichne()`.

   Alles im Arbeitsspeicher, kein Netz, keine Live-Datenbank (Regel 2). */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) { console.log("Playwright nicht gefunden — UNGEPRÜFT."); process.exit(0); }

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const PORT = 8793;
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };

/* Bei jedem Lauf gewuerfelt (Regel 9): kein fester Code im Quelltext. */
const rnd = () => String(require("crypto").randomInt(1000, 10000));

const BELEG = path.join(__dirname, "..", "review", "screens", "qa16");
const LAGE = { personenStumm: true, pakete: [], personen: [], absage: null };

const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/leitung.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    if (u === "/api/ich") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: "Casimir", rolle: "leitung" })); }
    if (u === "/api/personen") {
      if (q.method === "POST") {
        let leib = ""; q.on("data", c => leib += c);
        return q.on("end", () => {
          try { LAGE.pakete.push(JSON.parse(leib)); } catch (e) {}
          /* `absage` spielt die 409-Antwort des Namenswaechters. */
          if (LAGE.absage) { a.writeHead(409, kopf);
            return a.end(JSON.stringify({ fehler: LAGE.absage })); }
          a.writeHead(200, kopf); a.end(JSON.stringify({ ok: true }));
        });
      }
      if (LAGE.personenStumm) return;          /* GET antwortet nie */
      a.writeHead(200, kopf);
      return a.end(JSON.stringify({ personen: LAGE.personen }));
    }
    a.writeHead(200, kopf); return a.end("{}");
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
  a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
  a.end(fs.readFileSync(f));
});

let nein = 0;
const urteil = (satz, gut, dazu) => {
  if (!gut) nein++;
  console.log((gut ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
};
const warte = (p, ms) => p.waitForTimeout(ms);

/* Der Speicher, der wie im privaten Fenster bei JEDEM Zugriff wirft. */
const SPEICHER_TOT = `(()=>{
  const werf=()=>{ const e=new Error("QuotaExceededError"); e.name="QuotaExceededError"; throw e; };
  const tot={ getItem:werf, setItem:werf, removeItem:werf, clear:werf, key:werf, get length(){werf();} };
  try{ Object.defineProperty(window,"localStorage",{configurable:true,get:()=>tot}); }catch(e){}
})();`;

/* Ein Wert, den niemand geschrieben hat: Fremdmüll unter demselben
   Schluessel (anderes Werkzeug, halb geschriebene Zeile, Handarbeit). */
const SPEICHER_MUELL = `(()=>{ try{
  localStorage.setItem("hh_nkennung_v1","[nicht einmal JSON");
}catch(e){} })();`;

const SPEICHER_ARRAY = `(()=>{ try{
  localStorage.setItem("hh_nkennung_v1","[1,2,3]");
}catch(e){} })();`;

async function backoffice(b, saat) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  if (saat) await ctx.addInitScript(saat);
  const p = await ctx.newPage();
  const fehler = [], konsole = [];
  p.on("pageerror", e => fehler.push(String(e)));
  p.on("console", m => konsole.push(m.text()));
  await p.goto("http://127.0.0.1:" + PORT + "/leitung.html", { waitUntil: "load" });
  await warte(p, 700);
  await p.evaluate(() => { SEITE = "team"; zeichne(); });
  await warte(p, 400);
  return { ctx, p, fehler, konsole };
}
const anlegen = async (p, name, code) => {
  await p.fill("#nName", name);
  await p.fill("#nCode", code);
  await p.click("#nAdd");
  await warte(p, 700);
};
const speicherAbzug = p => p.evaluate(() => {
  const nimm = s => { const o = {}; try {
    for (let i = 0; i < s.length; i++) { const k = s.key(i); o[k] = s.getItem(k); }
  } catch (e) { return { FEHLER: String(e) }; } return o; };
  return { sitzung: nimm(sessionStorage), lokal: nimm(localStorage) };
});

(async () => {
  await new Promise(r => srv.listen(PORT, "127.0.0.1", r));
  const b = await pw.chromium.launch();
  try {

    /* ── K1 · Regel 9 am laufenden Objekt ───────────────────────── */
    {
      const { ctx, p, fehler, konsole } = await backoffice(b);
      const c1 = rnd(), c2 = rnd();
      LAGE.pakete = [];
      await anlegen(p, "Anna Beispiel", c1);
      await warte(p, 9200);                       /* die 8-s-Frist von kurz() */
      await anlegen(p, "Bernd Zweiter", c2);

      const sp = await speicherAbzug(p);
      const alleWerte = JSON.stringify(sp);
      urteil("K1 · der Code steht in KEINEM Browserspeicher",
        !alleWerte.includes(c1) && !alleWerte.includes(c2),
        "Codes " + c1 + "/" + c2);
      urteil("K1 · der Code steht in keiner Konsolenzeile",
        !konsole.some(z => z.includes(c1) || z.includes(c2)),
        konsole.slice(0, 2).join(" | "));

      const roh = sp.lokal["hh_nkennung_v1"];
      let karte = null; try { karte = JSON.parse(roh); } catch (e) {}
      urteil("K1 · `hh_nkennung_v1` ist eine flache Karte Name → Kennung",
        karte && typeof karte === "object" && !Array.isArray(karte)
        && Object.values(karte).every(v => typeof v === "string"),
        roh);
      urteil("K1 · sie enthaelt NUR Name und Kennung, keine Rolle, keinen Code",
        karte && Object.keys(karte).length === 2
        && !!karte["anna beispiel"] && !!karte["bernd zweiter"],
        JSON.stringify(karte));
      /* Die Kennung muss die vom Paket sein — sonst merkt sich das
         Fenster etwas anderes, als es geschrieben hat. */
      urteil("K1 · die gemerkte Kennung ist die gesendete",
        LAGE.pakete.length === 2
        && karte["anna beispiel"] === LAGE.pakete[0].id
        && karte["bernd zweiter"] === LAGE.pakete[1].id,
        "Pakete: " + LAGE.pakete.length);
      urteil("K1 · keine JS-Fehler", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── K2 · ECHTES Neuladen des Tabs ──────────────────────────── */
    /* Szene 8 in ui-runde16.cjs drueckt „Aktualisieren"; das ist
       `zeichne()`, nicht `location.reload()`. Der Unterschied ist der
       ganze Zweck der Spiegelung: nach einem Neuladen ist der
       Arbeitsspeicher leer, und nur der `localStorage` traegt noch. */
    {
      const { ctx, p, fehler } = await backoffice(b);
      LAGE.pakete = [];
      await anlegen(p, "Clara Dritte", rnd());
      await warte(p, 9200);
      await p.reload({ waitUntil: "load" });
      await warte(p, 900);
      await p.evaluate(() => { SEITE = "team"; zeichne(); });
      await warte(p, 400);
      await anlegen(p, "Clara Dritte", rnd());
      const k = new Set(LAGE.pakete.map(x => x.id));
      urteil("K2 · nach echtem Neuladen: zweimal derselbe Mensch → EINE Kennung",
        LAGE.pakete.length === 2 && k.size === 1,
        "Pakete: " + LAGE.pakete.length + " · Kennungen: " + k.size);
      urteil("K2 · keine JS-Fehler", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── K3 · privates Fenster: der Speicher wirft bei jedem Griff ─ */
    {
      const { ctx, p, fehler } = await backoffice(b, SPEICHER_TOT);
      LAGE.pakete = [];
      urteil("K3 · die Seite baut sich trotzdem auf",
        await p.locator("#nAdd").count() === 1);
      await anlegen(p, "Dora Vierte", rnd());
      await warte(p, 9200);
      await p.click("#bNeu"); await warte(p, 700);
      await p.evaluate(() => { SEITE = "team"; zeichne(); });
      await warte(p, 400);
      await anlegen(p, "Dora Vierte", rnd());
      const k = new Set(LAGE.pakete.map(x => x.id));
      urteil("K3 · ohne Speicher traegt der Arbeitsspeicher: EINE Kennung",
        LAGE.pakete.length === 2 && k.size === 1,
        "Pakete: " + LAGE.pakete.length + " · Kennungen: " + k.size);
      urteil("K3 · keine JS-Fehler", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── K4 · Fremdmuell unter demselben Schluessel ─────────────── */
    for (const [satz, saat] of [["kein JSON", SPEICHER_MUELL],
                                ["ein Array", SPEICHER_ARRAY]]) {
      const { ctx, p, fehler } = await backoffice(b, saat);
      LAGE.pakete = [];
      urteil("K4 · " + satz + ": die Seite baut sich auf",
        await p.locator("#nAdd").count() === 1);
      await anlegen(p, "Emil Fuenfter", rnd());
      urteil("K4 · " + satz + ": das Paket geht mit einer Kennung hinaus",
        LAGE.pakete.length === 1 && typeof LAGE.pakete[0].id === "string"
        && LAGE.pakete[0].id.length > 3,
        JSON.stringify(LAGE.pakete[0] && LAGE.pakete[0].id));
      urteil("K4 · " + satz + ": keine JS-Fehler", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── K5 · zwei Tabs, ein Mensch ────────────────────── */
    /* Hier stand ein Befund ohne Urteil: `sessionStorage` ist je Tab
       eigen, zwei offene `leitung.html` am MacBook ergaben damit zwei
       Kennungen. Seit dem Wechsel auf `localStorage` ist das ein Urteil.
       WICHTIG: zwei SEITEN in EINEM Kontext — zwei Kontexte sind zwei
       Browserprofile, also der Fall „zweites Geraet", und den deckt kein
       Browserspeicher. Dafuer wacht der Worker (`personSchreiben`,
       Namenspruefung, `tests/runde16.test.mjs`). */
    {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
      const fehler = [];
      const tab = async () => {
        const q = await ctx.newPage();
        q.on("pageerror", e => fehler.push(String(e)));
        await q.goto("http://127.0.0.1:" + PORT + "/leitung.html", { waitUntil: "load" });
        await warte(q, 800);
        await q.evaluate(() => { SEITE = "team"; zeichne(); });
        await warte(q, 400);
        return q;
      };
      LAGE.pakete = [];
      const p1 = await tab();
      await anlegen(p1, "Frida Sechste", rnd());
      await warte(p1, 9200);
      const p2 = await tab();
      await anlegen(p2, "Frida Sechste", rnd());
      const k = new Set(LAGE.pakete.map(x => x.id));
      urteil("K5 · zwei Tabs im selben Browser → EINE Kennung",
        LAGE.pakete.length === 2 && k.size === 1,
        "Pakete: " + LAGE.pakete.length + " · Kennungen: " + k.size);
      urteil("K5 · keine JS-Fehler", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── K6 · das Abmelden raeumt das Gedaechtnis ───────────── */
    /* `localStorage` vergeht nicht von selbst. Die Namen der Mitarbeiter
       gehoeren der Person, die angemeldet war — nicht der naechsten. */
    {
      const { ctx, p, fehler } = await backoffice(b);
      LAGE.pakete = [];
      await anlegen(p, "Gerda Siebte", rnd());
      await warte(p, 9200);
      const vorher = (await speicherAbzug(p)).lokal["hh_nkennung_v1"];
      urteil("K6 · vor dem Abmelden steht die Kennung da", !!vorher, vorher);
      await p.evaluate(() => abmelden());
      await warte(p, 1500);
      const nachher = await p.evaluate(() => {
        try { return localStorage.getItem("hh_nkennung_v1"); } catch (e) { return "FEHLER"; }
      });
      urteil("K6 · nach dem Abmelden ist sie weg", nachher === null, String(nachher));
      urteil("K6 · keine JS-Fehler", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── K7 · Die Absage muss lesbar sein und stehenbleiben ───── */
    /* qa-guardian, zweite Schlusskontrolle: Die wichtigste neue Meldung
       des Systems stand 2,2 s in einer Sprechblase, und bei 390 px machte
       `--radius-pill` (999px = halbe Hoehe) aus dem elfzeiligen Kasten
       einen KREIS — erste und letzte Zeile hell auf hellem Seitengrund,
       unlesbar. Jetzt steht ein Serverfehler in `#nFehler` ueber dem
       Formular und bleibt bis zum naechsten Versuch. */
    {
      LAGE.personenStumm = false;
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const p = await ctx.newPage();
      const fehler = [];
      p.on("pageerror", e => fehler.push(String(e)));
      LAGE.absage = "„Asad Karakiri“ ist schon angelegt. Einen zweiten Eintrag gibt es "
        + "nicht — wer wirklich so heißt wie jemand im Haus, braucht einen "
        + "unterscheidenden Namen. Einen neuen Code für die bestehende Person gibt es "
        + "über „PIN zurücksetzen“.";
      await p.goto("http://127.0.0.1:" + PORT + "/leitung.html", { waitUntil: "load" });
      await warte(p, 800);
      await p.evaluate(() => { SEITE = "team"; zeichne(); });
      await warte(p, 500);
      await anlegen(p, "Asad Karakiri", rnd());
      await warte(p, 600);

      const lage = await p.evaluate(() => {
        const f = document.querySelector("#nFehler");
        const t = document.querySelector("#toast");
        const r = t ? t.getBoundingClientRect() : null;
        const st = t ? getComputedStyle(t) : null;
        return {
          steht: !!(f && !f.hidden && /schon angelegt/.test(f.textContent)),
          toastB: r ? Math.round(r.width) : 0,
          toastH: r ? Math.round(r.height) : 0,
          radius: st ? parseFloat(st.borderTopLeftRadius) : 0,
          docBreit: document.documentElement.scrollWidth,
          fenster: window.innerWidth
        };
      });
      urteil("K7 · die Absage steht über dem Formular, nicht nur im Toast",
        lage.steht, JSON.stringify(lage.steht));
      /* BERICHTIGT (zehnte Jagd Runde 16 · C): Gemessen wurde hier der
         Toast „Nicht gespeichert" — 39 px hoch, und die Bedingung
         `toastH <= 48` war damit immer wahr. Ein zurueckgedrehtes
         `--radius-pill` waere gruen durchgegangen. Der lange Satz wird
         deshalb jetzt AUSDRUECKLICH in den Toast gegeben und dort
         gemessen. */
      const geo = await p.evaluate((satz) => {
        toast(satz);
        const t = document.querySelector("#toast");
        const r = t.getBoundingClientRect();
        const st = getComputedStyle(t);
        return { b: Math.round(r.width), h: Math.round(r.height),
                 radius: parseFloat(st.borderTopLeftRadius),
                 links: Math.round(r.left), rechts: Math.round(innerWidth - r.right),
                 zeilen: Math.round(r.height / parseFloat(st.lineHeight)) };
      }, LAGE.absage);
      urteil("K7 · der lange Satz im Toast ist kein Kreis",
        geo.radius * 2 < geo.h,
        "Radius " + geo.radius + " · Höhe " + geo.h);
      /* 195 px waren es vorher bei 390 px Fenster — exakt 50 vw, weil
         `left:50%` das `max-width` aushebelte. */
      urteil("K7 · und er nutzt die Breite (frueher 195 px = 50 vw)",
        geo.b > 250, geo.b + " px breit · " + geo.zeilen + " Zeilen");
      urteil("K7 · er steht mittig zwischen zwei Rändern",
        Math.abs(geo.links - geo.rechts) <= 2,
        "links " + geo.links + " · rechts " + geo.rechts);
      urteil("K7 · der Toast ist kein Kreis mehr (Radius unter der halben Höhe)",
        lage.radius * 2 < lage.toastH || lage.toastH <= 48,
        "Radius " + lage.radius + " · Höhe " + lage.toastH);
      urteil("K7 · kein waagrechter Überlauf bei 390 px",
        lage.docBreit <= lage.fenster, lage.docBreit + " / " + lage.fenster);
      fs.mkdirSync(BELEG, { recursive: true });
      await p.screenshot({ path: BELEG + "/k7-absage-390.png", fullPage: true });

      /* Und sie bleibt stehen, nachdem der Toast laengst weg ist. */
      await warte(p, 9500);
      const spaeter = await p.evaluate(() => {
        const f = document.querySelector("#nFehler");
        const t = document.querySelector("#toast");
        return { steht: !!(f && !f.hidden && /schon angelegt/.test(f.textContent)),
                 toastAn: !!(t && t.classList.contains("on")) };
      });
      urteil("K7 · nach zehn Sekunden steht sie immer noch da", spaeter.steht);
      urteil("K7 · der Toast ist dann weg", !spaeter.toastAn);
      urteil("K7 · keine JS-Fehler", fehler.length === 0, fehler[0]);
      await ctx.close();
      LAGE.absage = null;
    }

    /* ── K8 · Das Formular legt AN, es schreibt nicht um ──────── */
    /* Zehnte Jagd Runde 16 · A. Steht der Mensch in der Liste, ging bis
       eben SEINE Kennung ins Paket — und damit war der Namenswaechter im
       Worker stumm. `ON CONFLICT(id) DO UPDATE` schrieb die Zeile um:
       Code tot, Rolle zurueck auf „Service" (das Auswahlfeld wird nie
       vorbelegt), `aktiv:1` hob eine Sperre auf, und die einzige Leitung
       stufte sich damit selbst ab. Hier wird geklickt, nicht gelesen. */
    {
      LAGE.personenStumm = false;
      LAGE.personen = [{ id: "p-asad", name: "Asad Karakiri",
                         rolle: "wirtschaft", aktiv: 1 }];
      LAGE.pakete = [];
      const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
      const p = await ctx.newPage();
      const fehler = [];
      p.on("pageerror", e => fehler.push(String(e)));
      await p.goto("http://127.0.0.1:" + PORT + "/leitung.html", { waitUntil: "load" });
      await warte(p, 800);
      await p.evaluate(() => { SEITE = "team"; zeichne(); });
      await warte(p, 600);

      urteil("K8 · die Liste steht (sonst prueft diese Szene nichts)",
        /Asad Karakiri/.test(await p.locator("#teamL").innerText()));

      await anlegen(p, "Asad Karakiri", rnd());
      urteil("K8 · es geht KEIN Paket hinaus",
        LAGE.pakete.length === 0, "Pakete: " + JSON.stringify(LAGE.pakete));
      const f = await p.locator("#nFehler").innerText().catch(() => "");
      urteil("K8 · und es steht da, warum", /schon angelegt/.test(f), f.slice(0, 90));
      urteil("K8 · der Satz nennt den Weg, der wirklich hilft",
        /PIN zur\u00fccksetzen/.test(f) || /zur\u00fccksetzen/.test(f), f.slice(0, 90));

      /* Auch in der Schreibweise, die der Waechter im Worker abfaengt. */
      await anlegen(p, "  asad karakiri  ", rnd());
      urteil("K8 · auch in anderer Schreibweise geht nichts hinaus",
        LAGE.pakete.length === 0, "Pakete: " + LAGE.pakete.length);

      /* Und ein wirklich neuer Mensch geht weiterhin durch. */
      await anlegen(p, "Ian Lauchbein", rnd());
      urteil("K8 · ein neuer Mensch wird weiterhin angelegt",
        LAGE.pakete.length === 1 && LAGE.pakete[0].name === "Ian Lauchbein",
        "Pakete: " + LAGE.pakete.length);
      urteil("K8 · und nicht unter der Kennung eines anderen",
        LAGE.pakete.length === 1 && LAGE.pakete[0].id !== "p-asad",
        String(LAGE.pakete[0] && LAGE.pakete[0].id));
      urteil("K8 · keine JS-Fehler", fehler.length === 0, fehler[0]);
      await ctx.close();
      LAGE.personen = [];
      LAGE.personenStumm = true;
    }

  } finally {
    await b.close();
    srv.close();
  }
  console.log("");
  console.log(nein ? nein + " Prüfung(en) sagen NEIN." : "Alle Prüfungen ja.");
  process.exit(nein ? 1 : 0);
})();
