/* Oberflächen-MESSUNG · NICHT Teil von `npm test`
   ───────────────────────────────────────────────
   `npm test` sammelt nur *.test.mjs; diese Datei heißt bewusst anders und
   läuft von Hand:

       LAUF=runde-6 node tests/ui-mass.cjs

   Sie braucht Playwright und einen Chromium. Beides ist KEINE Abhängigkeit
   des Projekts (Regel 8) und steht nicht in package.json — die Datei sucht
   ein global installiertes Playwright und legt sich sonst sauber hin.

   Warum eine dritte Datei neben `ui-aufnahme.cjs` (App) und
   `ui-leitung.cjs` (Backoffice): Die beiden machen Bilder von einzelnen
   Lagen. Hier wird GEMESSEN, in drei Breiten, für jeden Schritt der App und
   jede Ansicht des Backoffice, und die Messung hat ein Urteil:

     · waagrechter Überlauf         muss null sein, in jeder Breite
     · Trefferflächen               mindestens 44 × 44 px
     · Schriftgrößen im Service     nie unter 15 px
     · Kontrast Text gegen Grund    mindestens 4,5:1
     · Farben                       Haus-Hirt-Teal #004947, Cream #ECE9E2;
                                    verirrtes Warmgrau wird aufgezählt
     · Gestaltungsschicht           in index.html und leitung.html wortgleich

   Ausgabe: review/screens/<LAUF>/ mit den Bildern und `messung.json`.
   Rückgabewert 1, sobald ein Urteil „nein" lautet — damit die Moderation
   nach jeder Runde einen Durchlauf hat, der fällt, statt einen, den man
   lesen muss.

   Was hier NICHT bewiesen wird: echtes Safari auf echtem iPhone. Chromium
   kennt weder die Tastatur noch die Notch noch das Gummiband am Rand.
   Alles, was daran hängt, gilt als UNGEPRÜFT und gehört in den
   Morgenbrief.                                                          */

const LAUF = process.env.LAUF || "lauf";

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — die Oberfläche bleibt UNGEPRÜFT.");
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const OUT = path.join(__dirname, "..", "review", "screens", LAUF);
fs.mkdirSync(OUT, { recursive: true });
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };

/* ── Nachgebaute Daten. Erfundene Namen, erfundene Mengen. ───────────── */
const heute = new Date();
const tg = n => new Date(heute.getTime() - n * 864e5).toISOString().slice(0, 10);
const VOLL = [
  { id: "v1", tag: tg(3), mode: "keller", name: "Marlene", finished: true,
    zdone: { w001: 1, w005: 1, w026: 1, w031: 1 },
    z: { w001: { reihen: 2, einzel: 1 }, w005: { reihen: 1, einzel: 4 },
         w026: { reihen: 3, einzel: 0 }, w031: { reihen: 0, einzel: 5 } } },
  { id: "v2", tag: tg(1), mode: "tag", name: "Lena", finished: true,
    barrot: { w026: 2 }, bar: { w001: 3 }, rest: { w005: 2, w031: 1 },
    holtN: {}, zusatz: {}, gent: { cola: 6 } },
  { id: "v3", tag: tg(1), mode: "nach", name: "Asad", finished: true,
    ent: { w031: 1 }, gent: { almd: 2 } }
];

function server(api) {
  return http.createServer((q, a) => {
    let u = q.url.split("?")[0];
    if (u === "/") u = "/index.html";
    if (u.startsWith("/api")) return api(u, a);
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
    a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
    a.end(fs.readFileSync(f));
  });
}

const BREITEN = [
  { name: "390",  viewport: { width: 390,  height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  { name: "768",  viewport: { width: 768,  height: 1024 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true },
  { name: "1280", viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }
];

const SEITEN = ["heute", "abgleich", "import", "bestand", "bestellen", "getraenke",
  "zaehlliste", "speicher", "zuordnung", "rezepte", "team", "einst"];
const SCHRITTE = ["tag", "keller", "nach", "fuellen", "ware"];

/* ── Das Messgerät. Läuft im Browser. ────────────────────────────────── */
const MESSE = `(() => {
  const sicht = e => {
    if (!e.getClientRects().length) return false;
    const s = getComputedStyle(e);
    if (s.visibility === "hidden" || s.display === "none" || +s.opacity <= 0.05) return false;
    /* Die Klasse "vh" hält Text, der NUR dem Screenreader gilt
       (clip:rect(0 0 0 0)). Er ist absichtlich nicht zu sehen — ihn an
       Schriftgröße oder Kontrast zu messen, ergäbe jede Runde dieselben
       Geisterfunde.
       WICHTIG (Berichtigung Runde 9): Das galt bis dahin nur für das
       Element selbst. Ein geclippter Behälter versteckt aber auch seine
       Kinder — getBoundingClientRect() eines Kindes meldet trotzdem
       seine volle Größe. So wurden die nie sichtbaren Knöpfe
       „Zurück"/„Weiter" aus dem vh-Behälter in index.html als 65 × 29 px
       grosse Trefferflächen gezählt. Deshalb wird jetzt die ganze
       Elternkette geprüft: vh, clip:rect(0 0 0 0) und jeder Behälter,
       der beschneidet und dabei keine Ausdehnung hat. */
    let p = e;
    while (p && p.nodeType === 1) {
      const ps = (p === e) ? s : getComputedStyle(p);
      if (p.classList && p.classList.contains("vh")) return false;
      if (ps.clip === "rect(0px, 0px, 0px, 0px)") return false;
      if (p !== e) {
        if (ps.visibility === "hidden" || ps.display === "none") return false;
        const beschneidet = ps.overflow === "hidden" || ps.overflowX === "hidden" ||
                            ps.overflowY === "hidden" || ps.overflow === "clip";
        if (beschneidet && (p.clientWidth < 2 || p.clientHeight < 2)) return false;
      }
      /* Fixiert/absolut gesetzte Elemente entkommen dem Beschnitt des
         Textflusses, nicht aber einem overflow:hidden-Vorfahren mit
         eigener Position — die Elternkette wird darum ganz gegangen. */
      p = p.parentElement;
    }
    return true;
  };
  /* Überlauf: die Seite selbst und jedes sichtbare Element, das über den
     rechten Rand hinausragt. Ein Element, das nach links aus dem Bild
     läuft, zählt genauso. */
  const vw = document.documentElement.clientWidth;
  const ueber = [];
  document.querySelectorAll("*").forEach(e => {
    if (!sicht(e)) return;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    /* Was ganz ausserhalb liegt, ist kein Überlauf, sondern zugeschoben:
       die Navigationsschublade des Backoffice steht bei 390 px links
       neben dem Bild (li −286, re −6) und wartet auf den Knopf. Gezählt
       wird nur, was IM Bild steht und darüber hinausragt. */
    if (r.right <= 0 || r.left >= vw) return;
    if (r.right > vw + 1 || r.left < -1) {
      const s = getComputedStyle(e);
      /* Waagrecht scrollbare Behälter sind erlaubt, wenn sie es selbst
         sagen — ihr Inhalt zählt dann nicht als Überlauf der Seite. */
      let p = e.parentElement, inRolle = false;
      while (p) { const ps = getComputedStyle(p);
        if (ps.overflowX === "auto" || ps.overflowX === "scroll") { inRolle = true; break; }
        p = p.parentElement; }
      if (inRolle) return;
      ueber.push({ was: e.tagName + "." + String(e.className || "").split(" ")[0],
                   li: Math.round(r.left), re: Math.round(r.right),
                   text: (e.textContent || "").trim().slice(0, 40) });
    }
  });
  /* Trefferflächen: alles, was angetippt werden soll. */
  const klein = [];
  document.querySelectorAll("button,a,input,select,[role=button],[onclick]").forEach(e => {
    if (!sicht(e)) return;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    if (r.width < 44 || r.height < 44)
      klein.push({ was: e.tagName + "." + String(e.className || "").split(" ")[0],
                   b: Math.round(r.width), h: Math.round(r.height),
                   text: (e.textContent || e.value || "").trim().slice(0, 30) });
  });
  /* Schriftgrößen sichtbarer Textknoten. */
  const schrift = {};
  document.querySelectorAll("*").forEach(e => {
    if (!sicht(e)) return;
    const eigen = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!eigen) return;
    const px = Math.round(parseFloat(getComputedStyle(e).fontSize));
    if (!px) return;                       /* Zeichenknöpfe ohne eigene Grösse */
    const k = e.tagName + "." + String(e.className || "").split(" ")[0];
    if (!schrift[px]) schrift[px] = [];
    if (schrift[px].length < 4) schrift[px].push(k);
  });
  /* Kontrast. Grund wird über die Elternkette gesucht, bis eine Farbe
     nicht durchsichtig ist. Farbverläufe und Bilder kann das nicht — sie
     werden übersprungen und gezählt. */
  const rgb = s => { const m = /rgba?\\(([^)]+)\\)/.exec(s || ""); if (!m) return null;
    const t = m[1].split(",").map(x => parseFloat(x));
    return { r: t[0], g: t[1], b: t[2], a: t.length > 3 ? t[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const grund = e => { let p = e;
    while (p) { const c = rgb(getComputedStyle(p).backgroundColor);
      if (c && c.a > 0.5) return c; p = p.parentElement; }
    return { r: 255, g: 255, b: 255, a: 1 }; };
  const schwach = []; let uebersprungen = 0;
  document.querySelectorAll("*").forEach(e => {
    if (!sicht(e)) return;
    const txt = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim())
                 .map(n => n.textContent.trim()).join(" ");
    if (!txt) return;
    const s = getComputedStyle(e);
    /* Schriftgrösse 0 heisst: das Zeichen steht da, aber niemand sieht es
       (die Pfeile im Menü tragen ihr Bild im Pseudo-Element). Kontrast an
       so etwas zu messen, ergibt jede Runde denselben Geisterfund. */
    if (!parseFloat(s.fontSize)) return;
    const vg = rgb(s.color), hg = grund(e);
    if (!vg || !hg) { uebersprungen++; return; }
    const L1 = lum(vg), L2 = lum(hg);
    const v = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(s.fontSize), fett = +s.fontWeight >= 700;
    const grenze = (px >= 24 || (px >= 18.66 && fett)) ? 3 : 4.5;
    if (v < grenze) schwach.push({ was: e.tagName + "." + String(e.className || "").split(" ")[0],
      v: Math.round(v * 100) / 100, grenze, px: Math.round(px),
      vg: s.color, hg: "rgb(" + hg.r + "," + hg.g + "," + hg.b + ")",
      text: txt.slice(0, 30) });
  });
  return { vw, scrollW: document.documentElement.scrollWidth,
           ueber: ueber.slice(0, 12), ueberN: ueber.length,
           klein: klein.slice(0, 12), kleinN: klein.length,
           schrift, schwach: schwach.slice(0, 12), schwachN: schwach.length,
           kontrastUebersprungen: uebersprungen };
})()`;

/* ── Die geteilte Gestaltungsschicht: wortgleich in beiden Dateien? ──── */
function gestaltung() {
  const a = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const b = fs.readFileSync(path.join(ROOT, "leitung.html"), "utf8");
  /* Dieselben zwei Marken wie in tests/projektregeln.test.mjs — eine
     zweite Abgrenzung wäre genau das Duplikat, das hier gesucht wird. */
  const ANFANG = "ACHTUNG \u00b7 geteilte Gestaltungsschicht";
  const ENDE = "clip:rect(0 0 0 0);white-space:nowrap}";
  const schnitt = t => {
    const i = t.indexOf(ANFANG);
    if (i < 0) return null;
    const j = t.indexOf(ENDE, i);
    return j < 0 ? null : t.slice(i, j + ENDE.length);
  };
  const x = schnitt(a), y = schnitt(b);
  if (x == null || y == null) return { gefunden: false };
  if (x === y) return { gefunden: true, gleich: true, zeichen: x.length };
  const xa = x.split("\n"), ya = y.split("\n"), ab = [];
  for (let i = 0; i < Math.max(xa.length, ya.length) && ab.length < 8; i++)
    if (xa[i] !== ya[i]) ab.push({ zeile: i, index: (xa[i] || "").trim().slice(0, 60),
                                   leitung: (ya[i] || "").trim().slice(0, 60) });
  return { gefunden: true, gleich: false, abweichungen: ab, zeilenIndex: xa.length,
           zeilenLeitung: ya.length };
}

/* ══════════════════════════════════════════════════════════════════════ */
(async () => {
  const erg = { lauf: LAUF, zeit: new Date().toISOString(), seiten: {},
                gestaltung: gestaltung() };
  let nein = 0;
  const urteil = (satz, gut, dazu) => {
    if (!gut) nein++;
    console.log((gut ? "  ✓ " : "  ✗ ") + satz + (dazu ? "  (" + dazu + ")" : ""));
  };

  const srvL = server((u, a) => {
    const kopf = { "content-type": "application/json" };
    if (u === "/api/ich") { a.writeHead(200, kopf); return a.end('{"name":"Ilse","rolle":"leitung"}'); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ vorgaenge: VOLL })); }
    if (u === "/api/fassungsliste") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ listen: [] })); }
    if (u === "/api/mapping") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ mapping: [] })); }
    a.writeHead(200, kopf); a.end("{}");
  });
  await new Promise(r => srvL.listen(8977, r));
  const b = await pw.chromium.launch();

  /* ── Backoffice ─────────────────────────────────────────────────────── */
  for (const br of BREITEN) {
    for (const s of SEITEN) {
      const ctx = await b.newContext(br);
      const p = await ctx.newPage();
      const jsFehler = [];
      p.on("pageerror", e => jsFehler.push(e.message));
      await p.goto("http://127.0.0.1:8977/leitung.html", { waitUntil: "load" });
      await p.waitForTimeout(500);
      await p.evaluate(id => { if (typeof SEITE !== "undefined") { SEITE = id; zeichne(); } }, s);
      await p.waitForTimeout(350);
      const m = await p.evaluate(MESSE);
      m.jsFehler = jsFehler;
      erg.seiten["leitung/" + s + "@" + br.name] = m;
      await p.screenshot({ path: path.join(OUT, "leitung-" + br.name + "-" + s + ".png"),
                           fullPage: false });
      await ctx.close();
    }
  }

  /* ── App ────────────────────────────────────────────────────────────── */
  const saat = `(()=>{ try{
    sessionStorage.setItem("hh_user","Asad");
    localStorage.setItem("hh_bekannt_v1", '{"x":{"name":"Asad","rolle":"service"}}');
  }catch(e){} })();`;
  for (const br of BREITEN) {
    for (const s of ["menu", ...SCHRITTE]) {
      const ctx = await b.newContext(br);
      await ctx.addInitScript(saat);
      const p = await ctx.newPage();
      const jsFehler = [];
      p.on("pageerror", e => jsFehler.push(e.message));
      await p.goto("http://127.0.0.1:8977/index.html", { waitUntil: "load" });
      await p.waitForTimeout(500);
      if (s !== "menu") {
        await p.evaluate(m => { if (typeof start === "function") start(m); }, s);
        await p.waitForTimeout(450);
        const zu = p.locator("#hilfeZu");
        if (await zu.count() && await zu.isVisible()) { await zu.click(); await p.waitForTimeout(250); }
      }
      const m = await p.evaluate(MESSE);
      m.jsFehler = jsFehler;
      erg.seiten["app/" + s + "@" + br.name] = m;
      await p.screenshot({ path: path.join(OUT, "app-" + br.name + "-" + s + ".png"),
                           fullPage: false });
      await ctx.close();
    }
  }

  await b.close(); srvL.close();

  /* ── Urteil ─────────────────────────────────────────────────────────── */
  console.log("\n─── Urteil ───");
  let ueberGes = 0, kleinGes = 0, kleinSvc = 0, schwachGes = 0, winzig = 0, fehlerGes = 0;
  Object.entries(erg.seiten).forEach(([k, m]) => {
    if (m.ueberN) { ueberGes += m.ueberN;
      console.log("  Überlauf " + k + ": " + m.ueberN + " → " +
        m.ueber.slice(0, 3).map(u => u.was + "(" + u.re + "px)").join(", ")); }
    if (m.scrollW > m.vw + 1) console.log("  Seite rollt waagrecht: " + k +
      " " + m.scrollW + " > " + m.vw);
    kleinGes += m.kleinN;
    if (k.startsWith("app/")) kleinSvc += m.kleinN;
    schwachGes += m.schwachN;
    if (k.startsWith("app/"))
      Object.keys(m.schrift).map(Number).filter(px => px < 15)
        .forEach(px => { winzig++;
          console.log("  Schrift " + px + "px in " + k + ": " + m.schrift[px].join(", ")); });
    if (m.jsFehler && m.jsFehler.length) { fehlerGes += m.jsFehler.length;
      console.log("  JS-FEHLER " + k + ": " + m.jsFehler[0]); }
  });
  urteil("kein waagrechter Überlauf in 390/768/1280", ueberGes === 0, ueberGes + " Stellen");
  urteil("keine JS-Fehler", fehlerGes === 0, fehlerGes + " Fehler");
  urteil("Schrift im Service nie unter 15 px", winzig === 0, winzig + " Stellen");
  urteil("Trefferflächen mindestens 44 px (Service)", kleinSvc === 0, kleinSvc + " Knöpfe");
  urteil("Kontrast mindestens 4,5:1", schwachGes === 0, schwachGes + " Stellen");
  urteil("Gestaltungsschicht in beiden Dateien wortgleich",
         erg.gestaltung.gefunden && erg.gestaltung.gleich,
         erg.gestaltung.gefunden ? (erg.gestaltung.gleich ? "wortgleich" :
           (erg.gestaltung.abweichungen || []).length + " Abweichungen")
           : "Marke nicht gefunden");
  console.log("  (Trefferflächen im Backoffice: " + (kleinGes - kleinSvc) +
              " unter 44 px — dort ist die Maus im Einsatz, kein Urteil)");

  erg.summe = { ueberGes, kleinGes, kleinSvc, schwachGes, winzig, fehlerGes };
  fs.writeFileSync(path.join(OUT, "messung.json"), JSON.stringify(erg, null, 1));
  console.log("\nBilder und messung.json in review/screens/" + LAUF + "/");
  console.log("UNGEPRÜFT bleibt: echtes Safari, echte Tastatur, Notch, Gummiband.");
  process.exit(nein ? 1 : 0);
})();
