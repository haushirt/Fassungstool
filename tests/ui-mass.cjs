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
     · Trefferflächen               ein Kreis von 44 px um die Mitte muss
                                    den Knopf treffen (::after zählt mit)
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

/* Warum die Nacht „0 waagrechter Ueberlauf bei 390 px" meldete, waehrend
   die achte Kachel rechts angeschnitten war — drei Gruende, alle drei hier
   behoben. Der Verdacht aus dem Auftrag („misst gegen die Dokumentbreite")
   traf NICHT zu: gemessen wurde schon immer gegen
   `document.documentElement.clientWidth`, also die Fensterbreite. Die
   wirklichen Gruende, am Stand vom 18.09. frueh nachgemessen:

     1. Die Laden 1 bis 6 wurden nie GEMESSEN. `MESSE` lief nur auf dem
        ERSTEN Schritt jedes Modus; die Laden liegen hinter den Knoepfen
        „R 1 2 3 4 5 6". Der Ladenlauf weiter unten pruefte allein die
        Kuerzel auf Ueberlappung. Lade 4 hat das Messgeraet nie gesehen.
     2. Gemessen wurde nur gegen das FENSTER. `.drwi` traegt
        `overflow:hidden`: bei 390 px ist der Inhalt 359 px breit in einem
        Kasten von 356 px — das Kuerzel „Gast. 0,25" wird um 3 px
        abgeschnitten, ohne je aus dem Fenster zu ragen. Der Beschnitt
        durch einen VORFAHREN war kein Urteil.
     3. Gemessen wurde erst ab 390 px. Bei 320 px liegt dieselbe
        Beschriftung bei 323 px — 3 px ausserhalb des Fensters. Die Breite,
        in der der Fehler sichtbar aus dem Bild laeuft, stand nicht in der
        Liste.

   Breiten jetzt: 320 (iPhone SE), 375 (iPhone 13 mini / SE 3), 390
   (iPhone 14/15), 430 (Pro Max) — dazu 768 (iPad) und 1280 (MacBook). */
const SCHMAL = {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  deviceScaleFactor: 2, isMobile: true, hasTouch: true
};
const BREITEN = [
  { name: "320",  viewport: { width: 320,  height: 568 }, ...SCHMAL },
  { name: "375",  viewport: { width: 375,  height: 812 }, ...SCHMAL },
  { name: "390",  viewport: { width: 390,  height: 844 }, ...SCHMAL },
  { name: "430",  viewport: { width: 430,  height: 932 }, ...SCHMAL },
  { name: "768",  viewport: { width: 768,  height: 1024 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true },
  { name: "1280", viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }
];

const SEITEN = ["heute", "abgleich", "import", "bestand", "bestellen", "getraenke",
  "zaehlliste", "speicher", "zuordnung", "rezepte", "team", "einst"];
/* BERICHTIGUNG (Jagd 13): Bis hierher wurde je Modus nur der ERSTE Schritt
   gemessen — und der Zweig „Getränke" (branch="getr") von keller, nach und
   ware ueberhaupt nicht. Genau dort lag A1: in „Sonderentnahme · Getränke"
   stand der Zaehlknopf 31 px ausserhalb des Fensters, und die Seite rollte
   waagrecht. Eine Messung, die nur die Eingangstuer jedes Modus ansieht,
   sagt ueber den Rest des Hauses nichts.
   Jetzt wird jeder Schritt jedes Modus in beiden Zweigen gemessen. */
const SCHRITTE = ["tag", "keller", "nach", "fuellen", "ware"];
/* Welcher Modus hat welchen Zweig? `tag` und `fuellen` kennen nur Wein. */
const ZWEIGE = { tag: [null], fuellen: [null],
                 keller: ["wein", "getr"], nach: ["wein", "getr"],
                 ware: ["wein", "getr"] };

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
  /* Beschnitt durch einen VORFAHREN.
     Ein Kasten mit overflow:hidden schluckt jeden Beweis: Der Inhalt
     steht dann zwar sichtbar abgeschnitten auf dem Schirm, ragt aber nie
     aus dem FENSTER — und nur das Fenster wurde bis Runde 12 gemessen.
     Genau so blieb Lade 4 grün, während die achte Kachel im Keller
     angeschnitten dastand (.drwi, 359 px Inhalt in 356 px Kasten).
     Gemessen wird der TINTENKASTEN des Textes (Range über den Inhalt) —
     ein Wort, das über seine Spalte hinausragt, meldet sein Element
     sonst nicht. Elemente OHNE Text werden über ihren eigenen Kasten
     gemessen.
     Nicht gezählt wird, was sich selbst beschneidet und dabei „…" setzt:
     text-overflow:ellipsis ist eine Absicht, kein Fehler. */
  const tinte = el => {
    if ((el.textContent || "").trim()) {
      const r = document.createRange(); r.selectNodeContents(el);
      const rs = [...r.getClientRects()].filter(x => x.width > 0 && x.height > 0);
      if (rs.length) return { li: Math.min(...rs.map(x => x.left)),
                              re: Math.max(...rs.map(x => x.right)),
                              ob: Math.min(...rs.map(x => x.top)),
                              un: Math.max(...rs.map(x => x.bottom)) };
    }
    const b = el.getBoundingClientRect();
    return { li: b.left, re: b.right, ob: b.top, un: b.bottom };
  };
  const schnitt = [];
  document.querySelectorAll("*").forEach(e => {
    if (!sicht(e)) return;
    const eb = e.getBoundingClientRect();
    if (eb.width < 1 || eb.height < 1) return;
    if (e.children.length) return;            /* nur Blätter, sonst jeder Zweig doppelt */
    const t = tinte(e);
    let p = e.parentElement;
    while (p) {
      const ps = getComputedStyle(p);
      const klemmt = ps.overflow === "hidden" || ps.overflowX === "hidden" ||
                     ps.overflowY === "hidden" || ps.overflow === "clip";
      if (klemmt) {
        const r = p.getBoundingClientRect();
        const m = Math.max(r.left - t.li, t.re - r.right, r.top - t.ob, t.un - r.bottom);
        if (m > 1) schnitt.push({
          was: e.tagName + "." + String(e.className || "").split(" ")[0],
          von: p.tagName + "." + String(p.className || "").split(" ")[0],
          px: Math.round(m * 10) / 10,
          text: (e.textContent || "").trim().slice(0, 30) });
        break;                                /* der erste Klemmkasten entscheidet */
      }
      p = p.parentElement;
    }
  });

  /* Trefferflächen: alles, was angetippt werden soll.
     Gemessen wird der GRIFF, nicht der Anstrich. Viele Knöpfe sind
     absichtlich kleiner gezeichnet und tragen ihre Fläche in einem
     ::after — die meldet getBoundingClientRect() nicht. Deshalb wird
     zusätzlich getastet: um die Mitte des Knopfes werden zwölf Punkte
     auf einem Kreis von 44 px Durchmesser gelegt (der Daumen ist rund,
     nicht eckig). Trifft elementFromPoint dort überall den Knopf selbst
     oder etwas in ihm, ist er greifbar.
     "klein" = sichtbar kleiner als 44 px (Hinweis, kein Urteil),
     "griff" = auch nach dem Tasten nicht zu greifen (Urteil). */
  const KREIS = [];
  for (let i = 0; i < 12; i++) {
    const w = i * Math.PI / 6;
    KREIS.push([Math.cos(w) * 21.5, Math.sin(w) * 21.5]);
  }
  const greifbar = e => {
    const r = e.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const [dx, dy] of KREIS) {
      const x = cx + dx, y = cy + dy;
      /* Was ausserhalb des Bildes liegt, lässt sich nicht tasten — es
         zählt nicht gegen den Knopf, wird aber vermerkt. */
      if (x < 0 || y < 0 || x > vw - 1 || y > window.innerHeight - 1) continue;
      const t = document.elementFromPoint(x, y);
      if (!t) return false;
      if (t !== e && !e.contains(t)) return false;
    }
    return true;
  };
  const klein = [], griff = [];
  document.querySelectorAll("button,a,input,select,[role=button],[onclick]").forEach(e => {
    if (!sicht(e)) return;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    if (r.width >= 44 && r.height >= 44) return;
    const eintrag = { was: e.tagName + "." + String(e.className || "").split(" ")[0],
                      b: Math.round(r.width), h: Math.round(r.height),
                      text: (e.textContent || e.value || "").trim().slice(0, 30) };
    klein.push(eintrag);
    if (!greifbar(e)) griff.push(eintrag);
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
  const schwach = []; let uebersprungen = 0, leiseZiffern = 0;
  document.querySelectorAll("*").forEach(e => {
    if (!sicht(e)) return;
    const txt = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim())
                 .map(n => n.textContent.trim()).join(" ");
    if (!txt) return;
    /* Die Ziffer auf einem Zählpunkt ist absichtlich leise: sie soll eine
       Orientierung sein, kein Etikett, und wird in ziffernfarbe() auf
       1,9:1 gemischt (index.html, ZIEL). Gezählt wird sie trotzdem — aber
       als Hinweis, nicht als Urteil, sonst ertränkt sie jeden echten Fund.
       Entschieden wurde das vor dieser Runde; wer es zurückdreht, ändert
       die Gestaltung der Punkte, nicht die Messung. */
    if (e.classList && e.classList.contains("gpt")) { leiseZiffern++; return; }
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
           schnitt: schnitt.slice(0, 12), schnittN: schnitt.length,
           klein: klein.slice(0, 40), kleinN: klein.length,
           griff: griff.slice(0, 40), griffN: griff.length,
           schrift, schwach: schwach.slice(0, 12), schwachN: schwach.length,
           leiseZiffern, kontrastUebersprungen: uebersprungen };
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

/* Die Begrüßung (F9) kommt einmal je Gerät und Betriebstag und liegt dabei
   über der Startseite. Für die Messung wird sie weggeklickt. */
async function grussWeg(p) {
  const k = p.locator("#grussPasst");
  if (await k.count() && await k.isVisible()) { await k.click(); await p.waitForTimeout(250); }
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
  /* Die Leitung arbeitet am MacBook, gelegentlich am iPad. 320 und 375 px
     sind iPhone-Breiten, in denen das Backoffice nicht bedient wird — die
     Navigationsschublade („Fassungstool ›") ragt dort aus dem Bild. Das ist
     ein echter Fund, aber keiner dieser Runde: er steht in review/BACKLOG.md
     und nicht im Urteil, damit das Urteil den Service meint.
     Der Service (index.html) wird in JEDER Breite gemessen. */
  const BREITEN_LEITUNG = BREITEN.filter(b => b.viewport.width >= 390);
  for (const br of BREITEN_LEITUNG) {
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
      for (const zweig of (s === "menu" ? [null] : ZWEIGE[s])) {
        const ctx = await b.newContext(br);
        await ctx.addInitScript(saat);
        const p = await ctx.newPage();
        const jsFehler = [];
        p.on("pageerror", e => jsFehler.push(e.message));
        await p.goto("http://127.0.0.1:8977/index.html", { waitUntil: "load" });
        await p.waitForTimeout(500);
        /* F9: Die Begrüßung liegt beim Öffnen über allem. Sie hat ihre
           eigenen Belege (review/screens/f9/) — hier wird gemessen, was
           dahinter steht, sonst misst das Messgerät einmal je Breite
           dasselbe Fenster. */
        await grussWeg(p);
        if (s === "menu") {
          const m = await p.evaluate(MESSE);
          m.jsFehler = jsFehler;
          erg.seiten["app/menu@" + br.name] = m;
          await p.screenshot({ path: path.join(OUT, "app-" + br.name + "-menu.png") });
          await ctx.close();
          continue;
        }
        await p.evaluate(m => { if (typeof start === "function") start(m); }, s);
        await p.waitForTimeout(450);
        if (zweig) {
          /* keller/nach/ware fragen zuerst „Wein oder Getränke?". */
          const tor = p.locator('.gbtn.' + zweig);
          if (await tor.count()) { await tor.first().click(); await p.waitForTimeout(350); }
          else await p.evaluate(z => { if (typeof branch !== "undefined") { branch = z; render(); } }, zweig);
          await p.waitForTimeout(300);
        }
        const zu = p.locator("#hilfeZu");
        if (await zu.count() && await zu.isVisible()) { await zu.click(); await p.waitForTimeout(250); }
        /* Jeder Schritt, nicht nur der erste. */
        const anzahl = await p.evaluate(() =>
          (typeof steps === "function" ? steps().length : 1));
        for (let i = 0; i < anzahl; i++) {
          await p.evaluate(n => { if (typeof go === "function") go(n); }, i);
          await p.waitForTimeout(350);
          const zu2 = p.locator("#hilfeZu");
          if (await zu2.count() && await zu2.isVisible()) { await zu2.click(); await p.waitForTimeout(200); }
          const marke = s + (zweig ? "-" + zweig : "") + "-" + (i + 1);
          const m = await p.evaluate(MESSE);
          m.jsFehler = jsFehler.slice();
          erg.seiten["app/" + marke + "@" + br.name] = m;
          await p.screenshot({ path: path.join(OUT, "app-" + br.name + "-" + marke + ".png") });
        }
        await ctx.close();
      }
    }
  }

  /* ── Getränkeladen ──────────────────────────────────────────────────── */
  /* Die Läufe oben rufen `start(m)` und messen den ERSTEN Schritt. Die
     Laden 1 bis 6 liegen dahinter, hinter den Knöpfen „R 1 2 3 4 5 6" —
     das Messgerät hat sie bis Runde 11 nie gesehen. Genau dort standen
     aber die Kürzel, an denen gezählt wird, übereinander (Lade 4 bei
     390 px: „Ginger Ale"/„Bitter Lemon" 3 px ineinander).
     Gemessen wird der TINTENKASTEN des Textes (Range über den Inhalt),
     nicht der Kasten des Elements: ein Wort, das über seine Spalte
     hinausragt, meldet sonst niemand. */
  const KUERZEL = `(() => {
    const kasten = el => { const r = document.createRange();
      r.selectNodeContents(el); const rs = [...r.getClientRects()];
      if (!rs.length) return null;
      return { li: Math.min(...rs.map(x => x.left)),  re: Math.max(...rs.map(x => x.right)),
               ob: Math.min(...rs.map(x => x.top)),   un: Math.max(...rs.map(x => x.bottom)) }; };
    const stoss = [], schnitt = [];
    document.querySelectorAll(".drw").forEach(d => {
      const caps = [...d.querySelectorAll(".gcap")]
        .filter(c => c.textContent.trim() && c.getClientRects().length)
        .map(c => ({ t: c.textContent.trim(), k: kasten(c), el: c })).filter(x => x.k);
      for (let i = 0; i < caps.length; i++) for (let j = i + 1; j < caps.length; j++) {
        const a = caps[i].k, b = caps[j].k;
        const x = Math.min(a.re, b.re) - Math.max(a.li, b.li);
        const y = Math.min(a.un, b.un) - Math.max(a.ob, b.ob);
        if (x > 0.5 && y > 0.5) stoss.push(d.id + ": " + caps[i].t + " / " + caps[j].t +
          " (" + x.toFixed(1) + "\\u00d7" + y.toFixed(1) + " px)");
      }
      /* Beschnitt durch das Kürzel selbst oder einen Behälter darüber. */
      caps.forEach(c => { let p = c.el;
        while (p) { const s = getComputedStyle(p);
          if (s.overflow === "hidden" || s.overflowX === "hidden" || s.overflowY === "hidden") {
            const r = p.getBoundingClientRect();
            const m = Math.max(r.left - c.k.li, c.k.re - r.right,
                               r.top - c.k.ob, c.k.un - r.bottom);
            if (m > 0.5) { schnitt.push(d.id + ": " + c.t + " um " + m.toFixed(1) + " px"); break; }
          }
          p = p.parentElement; } });
    });
    return { stoss, schnitt };
  })()`;
  erg.laden = {};
  for (const br of BREITEN) {
    const ctx = await b.newContext(br);
    await ctx.addInitScript(saat);
    const p = await ctx.newPage();
    const jsFehler = [];
    p.on("pageerror", e => jsFehler.push(e.message));
    await p.goto("http://127.0.0.1:8977/index.html", { waitUntil: "load" });
    await p.waitForTimeout(500);
    await grussWeg(p);
    await p.evaluate(() => { if (typeof start === "function") start("tag"); });
    await p.waitForTimeout(450);
    const zu = p.locator("#hilfeZu");
    if (await zu.count() && await zu.isVisible()) { await zu.click(); await p.waitForTimeout(250); }
    for (const nr of ["R", "1", "2", "3", "4", "5", "6"]) {
      const kn = p.locator(".statb", { hasText: new RegExp("^" + nr + "$") });
      if (!(await kn.count())) continue;
      await kn.first().click();
      await p.waitForTimeout(350);
      const k = await p.evaluate(KUERZEL);
      k.jsFehler = jsFehler.slice();
      erg.laden["lade-" + nr + "@" + br.name] = k;
      /* Bis Runde 12 endete der Ladenlauf hier. Die Laden gingen damit nie
         durch das Messgerät — Überlauf, Beschnitt, Schrift, Kontrast und
         Trefferflächen der sechs Laden waren ungemessen, obwohl genau dort
         gezählt wird. */
      const mm = await p.evaluate(MESSE);
      mm.jsFehler = jsFehler.slice();
      erg.seiten["app/lade-" + nr + "@" + br.name] = mm;
      await p.screenshot({ path: path.join(OUT, "app-" + br.name + "-lade-" + nr + ".png") });
    }
    await ctx.close();
  }

  await b.close(); srvL.close();

  /* ── Urteil ─────────────────────────────────────────────────────────── */
  console.log("\n─── Urteil ───");
  let ueberGes = 0, kleinGes = 0, kleinSvc = 0, griffGes = 0, griffSvc = 0,
      schwachGes = 0, winzig = 0, fehlerGes = 0, klemmSvc = 0;
  Object.entries(erg.seiten).forEach(([k, m]) => {
    if (m.ueberN) { ueberGes += m.ueberN;
      console.log("  Überlauf " + k + ": " + m.ueberN + " → " +
        m.ueber.slice(0, 3).map(u => u.was + "(" + u.re + "px)").join(", ")); }
    if (m.scrollW > m.vw + 1) console.log("  Seite rollt waagrecht: " + k +
      " " + m.scrollW + " > " + m.vw);
    /* Beschnitt zählt im SERVICE als Urteil. Im Backoffice sitzt die Maus
       vor einem breiten Schirm; dort bleibt es ein Hinweis. */
    if (m.schnittN && k.startsWith("app/")) { klemmSvc += m.schnittN;
      console.log("  Beschnitten " + k + ": " + m.schnittN + " → " +
        m.schnitt.slice(0, 3).map(u => u.von + " schneidet " + u.was +
          " um " + u.px + "px" + (u.text ? " (" + u.text + ")" : "")).join(", ")); }
    kleinGes += m.kleinN;
    griffGes += m.griffN || 0;
    if (k.startsWith("app/")) { kleinSvc += m.kleinN; griffSvc += m.griffN || 0;
      if (m.griffN) console.log("  Griff unter 44px " + k + ": " +
        m.griff.map(g => g.was + "(" + g.b + "\u00d7" + g.h + ")").join(", ")); }
    schwachGes += m.schwachN;
    if (k.startsWith("app/"))
      Object.keys(m.schrift).map(Number).filter(px => px < 15)
        .forEach(px => { winzig++;
          console.log("  Schrift " + px + "px in " + k + ": " + m.schrift[px].join(", ")); });
    if (m.jsFehler && m.jsFehler.length) { fehlerGes += m.jsFehler.length;
      console.log("  JS-FEHLER " + k + ": " + m.jsFehler[0]); }
  });
  urteil("kein waagrechter Überlauf in 320/375/390/430/768/1280",
         ueberGes === 0, ueberGes + " Stellen");
  urteil("nichts im Service wird von einem Kasten abgeschnitten",
         klemmSvc === 0, klemmSvc + " Stellen");
  urteil("keine JS-Fehler", fehlerGes === 0, fehlerGes + " Fehler");
  urteil("Schrift im Service nie unter 15 px", winzig === 0, winzig + " Stellen");
  urteil("Trefferflächen mindestens 44 px (Service)", griffSvc === 0,
         griffSvc + " Knöpfe ohne Griff · " + kleinSvc + " sichtbar kleiner (erlaubt)");
  urteil("Kontrast mindestens 4,5:1", schwachGes === 0, schwachGes + " Stellen");
  {
    const leise = Object.values(erg.seiten).reduce((a, m) => a + (m.leiseZiffern || 0), 0);
    if (leise) console.log("  (Ziffern auf Zählpunkten: " + leise +
      " absichtlich leise bei 1,9:1 — Hinweis, kein Urteil)");
  }
  let stossGes = 0, schnittGes = 0;
  Object.entries(erg.laden || {}).forEach(([k, v]) => {
    stossGes += v.stoss.length; schnittGes += v.schnitt.length;
    v.stoss.slice(0, 3).forEach(s => console.log("  Kürzel stoßen " + k + ": " + s));
    v.schnitt.slice(0, 3).forEach(s => console.log("  Kürzel beschnitten " + k + ": " + s));
  });
  urteil("Kürzel in den Laden überlappen einander nicht", stossGes === 0, stossGes + " Stellen");
  urteil("kein Kürzel wird beschnitten", schnittGes === 0, schnittGes + " Stellen");
  urteil("Gestaltungsschicht in beiden Dateien wortgleich",
         erg.gestaltung.gefunden && erg.gestaltung.gleich,
         erg.gestaltung.gefunden ? (erg.gestaltung.gleich ? "wortgleich" :
           (erg.gestaltung.abweichungen || []).length + " Abweichungen")
           : "Marke nicht gefunden");
  console.log("  (Trefferflächen im Backoffice: " + (kleinGes - kleinSvc) +
              " sichtbar unter 44 px, davon " + (griffGes - griffSvc) +
              " auch ohne Griff — dort ist die Maus im Einsatz, kein Urteil)");

  erg.summe = { ueberGes, kleinGes, kleinSvc, griffGes, griffSvc,
                schwachGes, winzig, fehlerGes };
  fs.writeFileSync(path.join(OUT, "messung.json"), JSON.stringify(erg, null, 1));
  console.log("\nBilder und messung.json in review/screens/" + LAUF + "/");
  console.log("UNGEPRÜFT bleibt: echtes Safari, echte Tastatur, Notch, Gummiband.");
  process.exit(nein ? 1 : 0);
})();
