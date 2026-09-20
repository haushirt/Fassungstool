/* Oberflächen-Prüfstand · Backoffice · Runde 18 · NICHT Teil von `npm test`
   ──────────────────────────────────────────────────────────────────────
   `npm test` sammelt nur *.test.mjs; diese Datei heißt bewusst anders und
   läuft nur von Hand:

       node tests/ui-runde18.cjs

   Sie braucht Playwright und einen Chromium. Beides ist KEINE Abhängigkeit
   des Projekts (Regel 8) und steht nicht in package.json — gesucht wird an
   denselben Orten wie in `ui-leitung.cjs`, zusätzlich in einem
   Arbeitsverzeichnis über PW_ORT.

   Geprüft werden die vier Punkte aus Runde 18, jeder mit einem Urteil:

     B2  Die vier Kacheln des Mittagsblicks sind Knöpfe und führen an die
         Stelle, die die Zahl erklärt.
     B3  „Eingänge" zeigt je Vorgang MENGEN — auch für Wareneingang und
         für eine Kellerzählung, die nur Getränke gezählt hat.
     B4  Ein Wisch vom linken Rand öffnet die Navigation UND nimmt dem
         Browser die Zurück-Geste (`defaultPrevented`). Senkrechtes
         Scrollen bleibt unberührt.
     B5  „Als PDF" füllt das Druckblatt, und im Druckbild steht das Blatt
         allein da — Kopfleiste und Navigation sind fort.                */

const ORTE = [process.env.PW_ORT, "playwright",
  "/tmp/claude-0/node_modules/playwright",
  "/opt/node22/lib/node_modules/playwright",
  "/usr/lib/node_modules/playwright"].filter(Boolean);
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — die Oberfläche ist UNGEPRÜFT. Gesucht in:\n  "
    + ORTE.join("\n  "));
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const OUT = path.join(__dirname, "..", "review", "screens", "runde-18");
fs.mkdirSync(OUT, { recursive: true });
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
  ".png": "image/png", ".json": "application/json" };

const heute = new Date();
const tg = n => new Date(heute.getTime() - n * 864e5).toISOString().slice(0, 10);

/* Die fünf Vorgangsarten, absichtlich mit den zwei Fällen, die im
   „Speicher" mit zwei Strichen dastanden: ein Wareneingang (`pos`) und
   eine Kellerzählung, die NUR die Getränkelade gezählt hat (`getr`). */
const VOLL = [
  { id: "v1", tag: tg(5), mode: "keller", name: "Marlene", finished: true,
    zdone: { w001: 1, w005: 1, w026: 1, w031: 1 },
    reihen: { w001: 2, w005: 1, w026: 3, w031: 0 },
    einzel: { w001: 1, w005: 4, w026: 0, w031: 5 } },
  { id: "v2", tag: tg(4), mode: "keller", name: "Rudi", finished: true,
    notiz: "Nur die Laden, der Keller war zu",
    getr: { cola: 5, almd: 3, gasteiner: 11 } },
  { id: "v3", tag: tg(2), mode: "ware", name: "Asad", finished: true,
    notiz: "Lieferung Kastner, zwei Kisten fehlten",
    pos: [{ id: "w026", kisten: 2, kg: 6 }, { id: "cola", kisten: 2, kg: 24 }],
    gent: { almd: 12 } },
  { id: "v4", tag: tg(1), mode: "tag", name: "Lena", finished: true,
    barrot: { w026: 2 }, bar: { w001: 3 }, rest: { w005: 2, w031: 1 },
    holtN: {}, zusatz: {}, gent: { cola: 6 } },
  { id: "v5", tag: tg(1), mode: "nach", name: "Ilse", finished: true,
    notiz: "Zimmer 214, Geburtstag", ent: { w031: 1 }, gent: { almd: 2 } }
];

/* Ein Z-Bericht, damit „Verkauf ↔ Fassung" wirklich rechnet: ohne ihn
   druckt das Differenzblatt zu Recht „nichts vergleichbar" und die
   eigentliche Tabelle bliebe ungeprüft. Die Gebindegrößen stehen
   BESTÄTIGT im Mapping — ohne sie fällt jede Zeile in „ohne Abgleich". */
const ZTAG = tg(1);
const BERICHT = { tag: ZTAG, z: "Z-0815", positionen: [
  { rohbez: "Glatzer Rubin Carnuntum 0,75", anzahl: 3, betrag: 129, ausschankMl: 750 },
  { rohbez: "Moric Reserve 0,75", anzahl: 1, betrag: 62, ausschankMl: 750 },
  { rohbez: "Cola 0,33", anzahl: 10, betrag: 45, ausschankMl: 330 },
  { rohbez: "HP Omelett", anzahl: 4, betrag: 36, ausschankMl: null }
] };
const MAPPING = [
  { kassenname: "Glatzer Rubin Carnuntum 0,75", artikel: "w026", ignoriert: 0, gebinde_ml: 750 },
  { kassenname: "Moric Reserve 0,75", artikel: "w031", ignoriert: 0, gebinde_ml: 750 },
  { kassenname: "Cola 0,33", artikel: "cola", ignoriert: 0, gebinde_ml: 330 }
];

const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/leitung.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    if (u === "/api/ich") { a.writeHead(200, kopf); return a.end('{"name":"Ilse","rolle":"leitung"}'); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf); return a.end(JSON.stringify({ vorgaenge: VOLL })); }
    if (u === "/api/fassungsliste") {
      a.writeHead(200, kopf);
      return a.end(JSON.stringify(q.url.includes("tag=") ? BERICHT : { berichte: [{ tag: ZTAG }] }));
    }
    if (u === "/api/mapping") { a.writeHead(200, kopf); return a.end(JSON.stringify({ mapping: MAPPING })); }
    a.writeHead(200, kopf); return a.end("{}");
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
  a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
  a.end(fs.readFileSync(f));
});

let gut = 0, schlecht = 0;
const urteil = (name, ok, was) => {
  (ok ? gut++ : schlecht++);
  console.log((ok ? "  ok   " : "  FEHL ") + name + (was === undefined ? "" : "  → " + JSON.stringify(was)));
};

/* Ein echter Wisch: Touch-Ereignisse, wie sie ein Finger schickt. Der
   Rückgabewert sagt, ob der Browser die Bewegung noch für sich gehabt
   hätte (`defaultPrevented === false` heißt: Safari blättert zurück). */
const WISCH = `(von, nach, hoch) => {
  const T = (x, y) => new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y });
  const schick = (art, x, y) => {
    const e = new TouchEvent(art, { bubbles: true, cancelable: true,
      touches: art === "touchend" ? [] : [T(x, y)],
      changedTouches: [T(x, y)] });
    document.body.dispatchEvent(e); return e;
  };
  schick("touchstart", von, hoch);
  const a = schick("touchmove", von + (nach - von) * 0.4, hoch + (nach === von ? 40 : 0));
  const b = schick("touchmove", nach, hoch + (nach === von ? 90 : 0));
  schick("touchend", nach, hoch);
  return { verhindert: a.defaultPrevented || b.defaultPrevented,
           offen: document.body.classList.contains("navoffen") };
}`;

(async () => {
  await new Promise(r => srv.listen(8934, r));
  /* Der vorinstallierte Chromium kann zur Playwright-Fassung passen oder
     nicht. Passt er nicht, sagt PW_CHROME, wo er liegt. */
  const b = await pw.chromium.launch(
    process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", e => fehler.push(e.message));
  await p.goto("http://127.0.0.1:8934/leitung.html", { waitUntil: "load" });
  await p.waitForTimeout(600);

  /* ── B2 ─────────────────────────────────────────────────────────── */
  console.log("\nB2 · Kacheln im Mittagsblick");
  await p.screenshot({ path: path.join(OUT, "macbook-mittagsblick.png"), fullPage: true });
  const kacheln = await p.$$eval(".kpi", ks => ks.map(k => ({
    art: k.tagName, ziel: k.dataset.ziel || null,
    titel: (k.querySelector("span") || {}).textContent,
    weiter: (k.querySelector(".weiter") || {}).textContent || null })));
  urteil("alle vier sind Knöpfe mit Ziel",
    kacheln.length === 4 && kacheln.every(k => k.art === "BUTTON" && k.ziel && k.weiter),
    kacheln.map(k => k.titel + "→" + k.ziel));

  for (const [i, erwartet] of [[0, "eingaenge"], [1, "import"], [2, "abgleich"], [3, "bestellen"]]) {
    await p.evaluate(() => { SEITE = "heute"; zeichne(); });
    await p.waitForTimeout(150);
    await p.evaluate(n => document.querySelectorAll(".kpi")[n].click(), i);
    await p.waitForTimeout(250);
    const lage = await p.evaluate(() => ({
      seite: SEITE, ueber: (document.querySelector("main h2") || {}).textContent,
      detail: !!document.querySelector("#egDetail .karte"),
      vorschau: !!document.querySelector("#vor h3") }));
    urteil("Kachel " + (i + 1) + " führt nach „" + erwartet + "“", lage.seite === erwartet, lage);
  }
  /* Die Tagesfassungs-Kachel soll nicht nur die Seite wechseln, sondern
     den Vorgang aufschlagen, um den es geht. */
  await p.evaluate(() => { SEITE = "heute"; zeichne(); });
  await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelectorAll(".kpi")[0].click());
  await p.waitForTimeout(300);
  const auf = await p.evaluate(() => {
    const d = document.querySelector("#egDetail .karte");
    return { offen: !!d, kopf: d ? d.querySelector("h3").textContent.trim() : null,
      zeilen: d ? d.querySelectorAll("tbody tr").length : 0,
      mengen: d ? [...d.querySelectorAll("tbody tr td.r b")].map(e => e.textContent) : [] };
  });
  urteil("Kachel 1 schlägt die Tagesfassung mit Mengen auf",
    auf.offen && auf.zeilen > 0 && auf.mengen.length > 0, auf);

  /* ── B3 ─────────────────────────────────────────────────────────── */
  console.log("\nB3 · Eingänge");
  await p.evaluate(() => { EGOFFEN = null; EGFILTER = { modus: "", wer: "", q: "" };
    SEITE = "eingaenge"; zeichne(); });
  await p.waitForTimeout(300);
  const liste = await p.evaluate(() => [...document.querySelectorAll("#egListe tbody tr")]
    .map(r => [...r.querySelectorAll("td")].map(t => t.textContent.trim())));
  urteil("alle fünf Vorgänge stehen da", liste.length === 5, liste.map(z => z[1]));
  const ware = liste.find(z => z[1] === "Wareneingang");
  urteil("Wareneingang nennt eine Menge statt zweier Striche",
    !!ware && /\d/.test(ware[3]) && !/^—/.test(ware[3]), ware && ware[3]);
  const zaehlung = liste.filter(z => z[1] === "Kellerzählung");
  urteil("beide Kellerzählungen nennen eine gezählte Menge",
    zaehlung.length === 2 && zaehlung.every(z => /gezählt/.test(z[3])),
    zaehlung.map(z => z[3]));
  urteil("die Notiz der Sonderentnahme steht in der Liste",
    liste.some(z => /Geburtstag/.test(z.join(" "))),
    (liste.find(z => z[1] === "Sonderentnahme") || [])[5]);

  /* Detail je Vorgangsart: jede Zeile trägt eine Zahl. */
  for (const art of ["Wareneingang", "Kellerzählung", "Tagesfassung", "Sonderentnahme"]) {
    const d = await p.evaluate(a => {
      const zeilen = [...document.querySelectorAll("#egListe tbody tr")];
      const z = zeilen.find(r => r.children[1].textContent.trim() === a);
      if (!z) return { fehlt: true };
      z.querySelector("[data-eg]").click();
      const k = document.querySelector("#egDetail .karte");
      const bl = [...k.querySelectorAll("h3")].slice(1).map(h => h.childNodes[0].textContent.trim());
      const zl = [...k.querySelectorAll("tbody tr")].filter(r => !r.classList.contains("zwt"));
      return { bloecke: bl, zeilen: zl.length,
        ohneZahl: zl.filter(r => !/\d/.test(r.children[1].textContent)).length,
        leer: !!k.querySelector(".leer") };
    }, art);
    urteil(art + ": Detail zeigt Blöcke und in jeder Zeile eine Zahl",
      !d.fehlt && !d.leer && d.zeilen > 0 && d.ohneZahl === 0, d);
  }
  await p.evaluate(() => { EGOFFEN = null; SEITE = "eingaenge"; zeichne(); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, "macbook-eingaenge.png"), fullPage: true });

  /* Zwei leere Zustände, zwei Sätze. */
  const leer1 = await p.evaluate(() => { EGFILTER = { modus: "", wer: "", q: "zzzz" };
    SEITE = "eingaenge"; zeichne();
    return document.querySelector("#egListe .leer").textContent.trim(); });
  urteil("Filter ohne Treffer sagt „passt nicht“, nicht „gibt es nicht“",
    /passt/.test(leer1), leer1);
  const leer2 = await p.evaluate(() => { const merk = VORGAENGE; VORGAENGE = [];
    EGFILTER = { modus: "", wer: "", q: "" }; zeichne();
    const t = document.querySelector("#egListe .leer").textContent.trim();
    VORGAENGE = merk; zeichne(); return t; });
  urteil("leerer Bestand sagt „noch kein Vorgang“", /noch kein Vorgang/.test(leer2), leer2);

  /* ── B5 ─────────────────────────────────────────────────────────── */
  console.log("\nB5 · Druckblatt");
  await p.evaluate(() => { window.__gedruckt = 0; window.print = () => window.__gedruckt++; });
  const blatt = await p.evaluate(async () => {
    EGFILTER = { modus: "ware", wer: "", q: "" }; EGOFFEN = null; SEITE = "eingaenge"; zeichne();
    document.querySelector("#egListe [data-egpdf]").click();
    await new Promise(r => setTimeout(r, 250));
    const d = document.querySelector("#druck");
    return { drucken: document.body.classList.contains("drucken"),
      gedruckt: window.__gedruckt,
      titel: (d.querySelector("h1") || {}).textContent,
      ueberschriften: [...d.querySelectorAll("h2")].map(h => h.textContent),
      zahlen: [...d.querySelectorAll("td.r")].map(t => t.textContent.trim()).slice(0, 6),
      notiz: (d.querySelector(".notiz") || {}).textContent };
  });
  urteil("PDF je Vorgang: Blatt gefüllt und Druck ausgelöst",
    blatt.drucken && blatt.gedruckt === 1 && blatt.ueberschriften.length > 0
      && blatt.zahlen.some(z => /\d/.test(z)), blatt);
  /* Im Druckbild darf nur das Blatt stehen. */
  await p.emulateMedia({ media: "print" });
  const druckbild = await p.evaluate(() => ({
    kopfSichtbar: document.querySelector("header.kopf").getClientRects().length > 0,
    navSichtbar: document.querySelector("nav.seite").getClientRects().length > 0,
    blattSichtbar: document.querySelector("#druck").getClientRects().length > 0 }));
  urteil("im Druckbild steht das Blatt allein",
    druckbild.blattSichtbar && !druckbild.kopfSichtbar && !druckbild.navSichtbar, druckbild);
  await p.screenshot({ path: path.join(OUT, "druck-vorgang.png"), fullPage: true });
  await p.emulateMedia({ media: "screen" });
  await p.evaluate(() => { document.body.classList.remove("drucken");
    document.querySelector("#druck").innerHTML = ""; });

  const diff = await p.evaluate(async () => {
    window.__gedruckt = 0; SEITE = "abgleich"; zeichne();
    document.querySelector("#bPdf").click();
    await new Promise(r => setTimeout(r, 250));
    const d = document.querySelector("#druck");
    return { gedruckt: window.__gedruckt, titel: (d.querySelector("h1") || {}).textContent,
      abschnitte: [...d.querySelectorAll("h2")].map(h => h.textContent),
      zeilen: d.querySelectorAll("tbody tr").length,
      koepfe: [...d.querySelectorAll("th")].map(h => h.textContent),
      einleitung: (d.querySelector(".notiz") || {}).textContent.replace(/\s+/g, " ").trim().slice(0, 120) };
  });
  urteil("Differenz-PDF hat Titel und eine Einleitung in ganzen Sätzen",
    diff.gedruckt === 1 && /Verkauf/.test(diff.titel) && diff.einleitung.length > 30, diff);
  urteil("Differenz-PDF führt die Positionen auf, die nicht aufgehen",
    diff.abschnitte.includes("Nicht ausgeglichen") && diff.zeilen >= 2, diff);
  await p.emulateMedia({ media: "print" });
  await p.screenshot({ path: path.join(OUT, "druck-differenzen.png"), fullPage: true });
  await p.emulateMedia({ media: "screen" });
  await p.evaluate(() => { document.body.classList.remove("drucken");
    document.querySelector("#druck").innerHTML = ""; });

  /* ── B4 ─────────────────────────────────────────────────────────── */
  console.log("\nB4 · Wisch von links");
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true,
    hasTouch: true, deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
      + "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
  const q = await ctx2.newPage();
  q.on("pageerror", e => fehler.push("iphone: " + e.message));
  await q.goto("http://127.0.0.1:8934/leitung.html", { waitUntil: "load" });
  await q.waitForTimeout(600);

  /* Am Handy: dieselbe Liste, dasselbe Detail — in einer Spalte. */
  await q.evaluate(() => { EGOFFEN = null; EGFILTER = { modus: "", wer: "", q: "" };
    SEITE = "eingaenge"; zeichne(); });
  await q.waitForTimeout(250);
  await q.evaluate(() => document.querySelectorAll("#egListe [data-eg]")[1].click());
  await q.waitForTimeout(250);
  await q.screenshot({ path: path.join(OUT, "iphone-eingaenge-detail.png"), fullPage: true });
  /* Der eigentliche Befund hinter B3: Die Zahl stand immer in der
     Tabelle — am Handy aber 170px rechts ausserhalb des Bildes, weil
     jede Tabelle unter 900px auf 560px Mindestbreite gesetzt war. */
  const sichtbar = await q.evaluate(() => {
    const k = document.querySelector("#egDetail .karte");
    const zellen = [...k.querySelectorAll("tbody tr td.r")];
    const breit = window.innerWidth;
    return { spalten: zellen.length,
      ausserhalb: zellen.filter(c => c.getBoundingClientRect().right > breit + 1).length,
      fenster: breit,
      rechts: zellen.slice(0, 3).map(c => Math.round(c.getBoundingClientRect().right)) };
  });
  urteil("am Handy steht die Anzahl IM Bild, nicht rechts daneben",
    sichtbar.spalten > 0 && sichtbar.ausserhalb === 0, sichtbar);
  await q.evaluate(() => { EGOFFEN = null; SEITE = "heute"; zeichne(); });
  await q.waitForTimeout(200);

  const rein = await q.evaluate(`(${WISCH})(8, 160, 420)`);
  urteil("vom Rand nach rechts: Navigation offen UND Zurück-Geste genommen",
    rein.offen && rein.verhindert, rein);
  await q.waitForTimeout(500);   /* die Leiste fährt ein — erst dann abbilden */
  await q.screenshot({ path: path.join(OUT, "iphone-wisch-offen.png") });

  const raus = await q.evaluate(`(${WISCH})(300, 120, 420)`);
  urteil("nach links zurück: Navigation wieder zu", !raus.offen, raus);

  const mitte = await q.evaluate(`(${WISCH})(200, 340, 420)`);
  urteil("Wisch aus der Mitte lässt der Browser in Ruhe (und öffnet nichts)",
    !mitte.offen && !mitte.verhindert, mitte);

  const hoch = await q.evaluate(`(${WISCH})(8, 8, 500)`);
  urteil("senkrecht am Rand bleibt Scrollen", !hoch.offen && !hoch.verhindert, hoch);

  await ctx2.close(); await ctx.close(); await b.close();
  await new Promise(r => srv.close(r));

  console.log("\n" + (fehler.length ? "JS-FEHLER: " + fehler.join(" | ") : "keine JS-Fehler"));
  console.log(gut + " Urteile grün, " + schlecht + " rot.  Bilder: " + OUT);
  process.exit(schlecht || fehler.length ? 1 : 0);
})();
