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
  { rohbez: "Glatzer Rubin Carnuntum 0,75 l", anzahl: 3, betrag: 129, ausschankMl: 750 },
  { rohbez: "Moric Reserve 0,75 l", anzahl: 1, betrag: 62, ausschankMl: 750 },
  { rohbez: "Cola 0,33 l", anzahl: 10, betrag: 45, ausschankMl: 330 },
  { rohbez: "HP Omelett", anzahl: 4, betrag: 36, ausschankMl: null }
] };
const MAPPING = [
  { kassenname: "Glatzer Rubin Carnuntum 0,75 l", artikel: "w026", ignoriert: 0, gebinde_ml: 750 },
  { kassenname: "Moric Reserve 0,75 l", artikel: "w031", ignoriert: 0, gebinde_ml: 750 },
  { kassenname: "Cola 0,33 l", artikel: "cola", ignoriert: 0, gebinde_ml: 330 }
];
/* „HP Omelett" bleibt absichtlich unzugeordnet: Genau diese Lage — ein
   Verkauf, der gar nicht in der Rechnung steht — hat die Jagd nach
   Runde 18 als A-Fund gemeldet. Das Blatt muss sie benennen. */

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
  /* Der Finger setzt auf DAS Element, das an dieser Stelle liegt — nicht
     auf den Rumpf. Genau daran hängt, ob die Geste dem Suchfeld oder der
     Navigation gehört (Jagd nach Runde 18 · B). */
  const ziel = document.elementFromPoint(Math.max(0, Math.min(von, window.innerWidth - 1)),
                                         hoch) || document.body;
  const T = (x, y) => new Touch({ identifier: 1, target: ziel, clientX: x, clientY: y });
  const schick = (art, x, y) => {
    const e = new TouchEvent(art, { bubbles: true, cancelable: true,
      touches: art === "touchend" ? [] : [T(x, y)],
      changedTouches: [T(x, y)] });
    ziel.dispatchEvent(e); return e;
  };
  const warOffen = document.body.classList.contains("navoffen");
  schick("touchstart", von, hoch);
  const a = schick("touchmove", von + (nach - von) * 0.4, hoch + (nach === von ? 40 : 0));
  const b = schick("touchmove", nach, hoch + (nach === von ? 90 : 0));
  schick("touchend", nach, hoch);
  return { verhindert: a.defaultPrevented || b.defaultPrevented,
           offen: document.body.classList.contains("navoffen"),
           warOffen, ziel: ziel.id || ziel.className || ziel.tagName };
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

  /* ── Rückfall: keine Ansicht darf an Runde 18 zerbrechen ────────── */
  console.log("\nAlle Ansichten zeichnen");
  const SEITEN = ["heute", "abgleich", "import", "bestand", "bestellen", "getraenke",
    "zaehlliste", "eingaenge", "speicher", "zuordnung", "rezepte", "team", "einst"];
  const vorher = fehler.length;
  for (const s of SEITEN) {
    await p.evaluate(id => { SEITE = id; zeichne(); window.scrollTo(0, 0); }, s);
    await p.waitForTimeout(120);
  }
  const leer = await p.evaluate(() => [...document.querySelectorAll("main section")].length);
  urteil("alle 13 Ansichten zeichnen ohne JS-Fehler",
    fehler.length === vorher && leer > 0, { neueFehler: fehler.slice(vorher) });
  await p.evaluate(() => { SEITE = "heute"; zeichne(); });
  await p.waitForTimeout(200);

  /* ── B2 ─────────────────────────────────────────────────────────────
     UMGESCHRIEBEN in Runde 19. Geprüft wurden hier die vier Kacheln des
     Mittagsblicks: jede ein Knopf, jede mit Ziel, jede führt weiter.
     Die Kacheln gibt es nicht mehr — an ihrer Stelle steht die Kette
     („Der Weg der Zahlen"), und sie erbt die Zusicherung: Jedes Glied
     ist ein Knopf, jedes trägt ein Ziel, jedes führt dorthin, wo man
     dieses Glied repariert. Dieselbe Prüfung, fünf statt vier Elemente,
     und zusätzlich der Punkt, um den es Runde 19 ging: ein Glied, das
     nichts sagen kann, muss GRAU sein und nicht rot. */
  console.log("\nB2 · Die Kette auf der Übersicht");
  await p.screenshot({ path: path.join(OUT, "macbook-uebersicht.png"), fullPage: true });
  const glieder = await p.$$eval(".glied", ks => ks.map(k => ({
    art: k.tagName, ziel: k.dataset.ziel || null,
    titel: (k.querySelector(".gt") || {}).textContent,
    wort: (k.querySelector(".gw") || {}).textContent || null,
    unter: (k.querySelector(".gu") || {}).textContent || null,
    tot: k.classList.contains("glied--tot") })));
  urteil("alle fünf Glieder sind Knöpfe mit Ziel, Wort und Erklärung",
    glieder.length === 5 && glieder.every(g =>
      g.art === "BUTTON" && g.ziel && g.wort && g.unter),
    glieder.map(g => g.titel + "→" + g.ziel));

  const ZIELE = [["Fassung", ["eingaenge"]], ["Z-Bericht", ["import"]],
                 ["Zuordnung", ["zuordnung"]], ["Abgleich", ["abgleich"]],
                 ["Bestand", ["bestand", "zaehlliste"]]];
  for (const [i, [name, erlaubt]] of ZIELE.entries()) {
    await p.evaluate(() => { SEITE = "heute"; zeichne(); });
    await p.waitForTimeout(150);
    await p.evaluate(n => document.querySelectorAll(".glied")[n].click(), i);
    await p.waitForTimeout(250);
    const lage = await p.evaluate(() => ({
      seite: SEITE, ueber: (document.querySelector("main h2") || {}).textContent,
      detail: !!document.querySelector("#egDetail .karte") }));
    urteil("Glied " + (i + 1) + " („" + name + "“) führt nach „" + erlaubt.join(" oder ") + "“",
      erlaubt.includes(lage.seite), lage);
  }

  /* Das Glied „Fassung" soll nicht nur die Seite wechseln, sondern den
     Vorgang aufschlagen, um den es geht — wie vorher die erste Kachel. */
  await p.evaluate(() => { SEITE = "heute"; zeichne(); });
  await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelectorAll(".glied")[0].click());
  await p.waitForTimeout(300);
  const auf = await p.evaluate(() => {
    const d = document.querySelector("#egDetail .karte");
    return { offen: !!d, kopf: d ? d.querySelector("h3").textContent.trim() : null,
      zeilen: d ? d.querySelectorAll("tbody tr").length : 0,
      mengen: d ? [...d.querySelectorAll("tbody tr td.r b")].map(e => e.textContent) : [] };
  });
  urteil("Glied 1 schlägt die Tagesfassung mit Mengen auf",
    auf.offen && auf.zeilen > 0 && auf.mengen.length > 0, auf);

  /* Der Kern von Runde 19: Solange Kassennamen offen sind, kann das
     Glied „Abgleich" nichts sagen. Es muss grau stehen, nicht rot — eine
     rote Zahl wäre dort eine Behauptung über den Keller. */
  await p.evaluate(() => { SEITE = "heute"; zeichne(); });
  await p.waitForTimeout(200);
  const lage4 = await p.evaluate(() => {
    const a = abgleich(letzterTag(), SPANNE);
    const g = document.querySelectorAll(".glied")[3];
    return { offen: a.offen.length, berichte: a.berichte,
             tot: g.classList.contains("glied--tot"),
             wort: g.querySelector(".gw").textContent };
  });
  urteil("das Glied „Abgleich“ ist grau, solange etwas davor fehlt",
    (lage4.offen > 0 || !lage4.berichte) ? lage4.tot : !lage4.tot, lage4);

  /* Und die Übersicht muss den laufenden Tag überhaupt erwähnen — bis
     Runde 19 endete sie immer bei gestern. */
  const heute = await p.evaluate(() =>
    [...document.querySelectorAll("main h3")].some(h => /^Heute · /.test(h.textContent)));
  urteil("der laufende Tag steht auf der Übersicht", heute, { heute });

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
  /* B-Fund der Jagd: Was nicht in der Liste steht, darf nicht unter ihr stehen. */
  const stehen = await p.evaluate(() => {
    EGFILTER = { modus: "", wer: "", q: "" }; EGOFFEN = null; SEITE = "eingaenge"; zeichne();
    document.querySelectorAll("#egListe [data-eg]")[1].click();
    const vorher = !!document.querySelector("#egDetail .karte");
    EGFILTER.q = "zzzz"; zeichne();
    const nachher = !!document.querySelector("#egDetail .karte");
    EGFILTER = { modus: "ware", wer: "", q: "" }; zeichne();
    const gefiltert = !!document.querySelector("#egDetail .karte");
    EGFILTER = { modus: "", wer: "", q: "" }; EGOFFEN = null; zeichne();
    return { vorher, nachher, gefiltert };
  });
  urteil("ein Filter, der den Vorgang ausschliesst, räumt auch sein Detail",
    stehen.vorher && !stehen.nachher && !stehen.gefiltert, stehen);

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

  /* A-Fund der Jagd: Das Blatt geht aus dem Haus. Es muss dieselben
     Vorbehalte tragen wie der Bildschirm — und darf niemanden mit einer
     halben Rechnung des Schwunds bezichtigen. */
  const vorb = await p.evaluate(() => {
    const d = document.querySelector("#druck");
    const k = d.querySelector(".notiz.vorbehalt");
    return { kasten: !!k,
      punkte: [...d.querySelectorAll(".notiz li")].map(li => li.textContent.trim()),
      schwund: /Schwund/.test([...d.querySelectorAll("tbody td")].map(c => c.textContent).join(" ")),
      unterzeile: (d.querySelector(".druckunter") || {}).textContent || "" };
  });
  urteil("Differenz-PDF nennt die Vorbehalte des Bildschirms",
    vorb.kasten && vorb.punkte.length >= 2
      && vorb.punkte.some(s => /nicht eingelesen/.test(s))
      && vorb.punkte.some(s => /keinem Artikel zugeordnet/.test(s)), vorb);
  urteil("Differenz-PDF sagt bei halber Rechnung nirgends „Schwund“",
    !vorb.schwund && /unvollständige Rechnung/.test(vorb.unterzeile), vorb);
  await p.emulateMedia({ media: "print" });
  await p.screenshot({ path: path.join(OUT, "druck-differenzen.png"), fullPage: true });
  await p.emulateMedia({ media: "screen" });
  await p.evaluate(() => { document.body.classList.remove("drucken");
    document.querySelector("#druck").innerHTML = ""; });

  /* ── A der zweiten Jagd: Verkauf, der STILL verschwindet ────────── */
  console.log("\nA · stille Lücken auf der Verkaufsseite");
  const still = await p.evaluate(async () => {
    const lauf = async () => { SEITE = "abgleich"; zeichne();
      window.__gedruckt = 0; document.querySelector("#bPdf").click();
      await new Promise(r => setTimeout(r, 200));
      const d = document.querySelector("#druck");
      const txt = d.textContent;
      const erg = { laut: !!d.querySelector(".notiz.vorbehalt"),
        kasten: !!d.querySelector(".notiz li"),
        punkte: [...d.querySelectorAll(".notiz li")].map(li => li.textContent.trim()),
        /* Der Vorwurf steht in der DEUTUNGSSPALTE. Im Vorbehaltskasten
           und unter „Ohne Abgleich" kommt das Wort vor, um es zu
           verneinen — das ist der Punkt, nicht der Fehler. */
        schwund: /Schwund/.test([...d.querySelectorAll("tbody td")]
                   .map(c => c.textContent).join(" ")),
        unvollstaendig: /unvollständige Rechnung/.test(txt) };
      document.body.classList.remove("drucken"); d.innerHTML = "";
      return erg; };

    const merkMap = MAP, merkRez = REZ, merkGeb = GEB_BEST;
    /* Weg 1 · alles auf „Ignorieren", nur Cola zugeordnet. Kein offener
       Name, keine fehlende Größe — die drei alten Gründe schweigen. */
    MAP = {}; REZ = {};
    Object.keys(ZBER).forEach(tg => ZBER[tg].positionen.forEach(
      q => { MAP[q.name] = "__ignoriert"; }));
    MAP["Cola 0,33 l"] = "cola"; GEB_BEST = { "Cola 0,33 l": 330 };
    SPANNE = 1; vAbgleich.tag = letzterTag();
    const ignoriert = await lauf();

    const zahlen = () => { const x = abgleich(letzterTag(), SPANNE);
      return { gesamt: x.stkGesamt, gerechnet: x.stkGerechnet,
               ausgenommen: x.stkIgnoriert,
               luecke: x.stkGesamt - x.stkGerechnet - x.stkIgnoriert }; };
    const zIgnoriert = zahlen();

    /* Weg 2 · LÜCKENLOSES Mapping, nur die Rezeptzutat hat 0 ml. Ohne
       das trüge der Vorbehalt „Kassennamen ohne Zuordnung" das Urteil
       allein, und der 0-ml-Zweig bliebe unbewacht (dritte Jagd · B). */
    MAP = {}; GEB_BEST = {};
    Object.keys(ZBER).forEach(tg => ZBER[tg].positionen.forEach(q => {
      if (q.name === "HP Omelett") return;
      MAP[q.name] = q.name === "Cola 0,33 l" ? "cola"
        : q.name === "Moric Reserve 0,75 l" ? "w031" : "w026";
      GEB_BEST[q.name] = q.name === "Cola 0,33 l" ? 330 : 750; }));
    REZ = { "HP Omelett": [{ id: "cola", ml: 0 }] };
    const zMitNull = zahlen();
    const nullRezept = await lauf();
    /* Gegenprobe: dieselbe Rezeptur MIT Menge schliesst die Lücke. */
    REZ = { "HP Omelett": [{ id: "cola", ml: 200 }] };
    const zOhneNull = zahlen();

    /* Und ein Bericht, bei dem WIRKLICH nichts fehlt — nur so ist zu
       prüfen, dass der laute Kasten auch wieder ausgeht. */
    const merkZ = ZBER, merkS = SPANNE;
    const tg = letzterTag();
    ZBER = { [tg]: { tag: tg, nr: "Z-heil", block: "Positionen", sektionen: [],
      positionen: [{ name: "Cola 0,33 l", anzahl: 4, umsatz: 18, ml: 330, zeilen: 1 }],
      umsatz: 18 } };
    MAP = { "Cola 0,33 l": "cola" }; GEB_BEST = { "Cola 0,33 l": 330 }; REZ = {};
    SPANNE = 1; vAbgleich.tag = tg;
    const zHeil = zahlen();
    const heil = await lauf();
    ZBER = merkZ; SPANNE = merkS;

    MAP = merkMap; REZ = merkRez; GEB_BEST = merkGeb; SPANNE = 7;
    return { ignoriert, nullRezept, heil, zIgnoriert, zMitNull, zOhneNull, zHeil };
  });
  /* „Ignorieren" ist eine ENTSCHEIDUNG, keine Lücke: Das Blatt benennt
     sie, schlägt aber keinen Alarm — sonst stünde die laute Warnung auf
     jedem Blatt, das je gedruckt wird (dritte Jagd · B). */
  urteil("„Ignorieren“ steht im Kasten — benannt, aber ohne Alarm",
    still.ignoriert.kasten && !still.ignoriert.laut && !still.ignoriert.unvollstaendig
      && still.ignoriert.punkte.some(s => /Ignorieren/.test(s)), still.ignoriert);
  urteil("„Ignorieren“ wird als AUSNAHME gezählt, nicht als Lücke",
    still.zIgnoriert.ausgenommen > 0 && still.zIgnoriert.gesamt > 0,
    still.zIgnoriert);
  /* Die eigentliche Rechenmitte: die Lücke muss an der 0 hängen und ohne
     sie verschwinden. */
  /* Die Rechenmitte: die 0 ml MUSS die Lücke vergrössern, und die Menge
     MUSS sie schliessen. Ohne den 0-ml-Zweig in `abgleich()` sind beide
     Läufe gleich und dieses Urteil rot. */
  urteil("eine Rezeptzutat mit 0 ml vergrössert die Lücke — mit Menge schliesst sie sich",
    still.zMitNull.luecke > still.zOhneNull.luecke
      && still.zOhneNull.gerechnet > still.zMitNull.gerechnet,
    { mitNull: still.zMitNull, ohneNull: still.zOhneNull });
  urteil("ohne Lücke geht der laute Kasten wieder aus",
    still.zHeil.luecke === 0 && still.nullRezept.laut && !still.heil.laut
      && !still.heil.unvollstaendig,
    { zahlen: still.zHeil, mitNull: still.nullRezept, heil: still.heil });
  urteil("das Wort „Schwund“ steht auf diesem Blatt nie",
    !still.ignoriert.schwund && !still.nullRezept.schwund && !still.heil.schwund,
    { a: still.ignoriert.schwund, b: still.nullRezept.schwund, c: still.heil.schwund });
  /* Der Grund, den eine 0-ml-Rezeptur hinterlässt, muss „keine Menge im
     Kassennamen" sein — nicht „Größe fehlt". Dreht man
     `zaehlePos(…,"ausschank")` auf `"menge"` zurück, wird dieses Urteil
     rot (vierte Jagd · B). */
  const grund = await p.evaluate(() => {
    const merkMap = MAP, merkRez = REZ, merkGeb = GEB_BEST, merkS = SPANNE;
    MAP = { "Cola 0,33 l": "cola" }; GEB_BEST = { "Cola 0,33 l": 330 };
    REZ = { "HP Omelett": [{ id: "cola", ml: 0 }] };
    SPANNE = 1; vAbgleich.tag = letzterTag();
    const a = abgleich(letzterTag(), 1);
    const z = a.zeilen.find(r => r.id === "cola");
    const og = a.ohneGroesse.find(o => o.id === "cola" || o.artikel === "cola");
    const erg = { unklar: z ? z.unklar : null,
      vorbehalt: z && z.vorbehalt ? { menge: z.vorbehalt.menge, gebinde: z.vorbehalt.gebinde } : null,
      fehlt: og ? og.fehlt : null };
    MAP = merkMap; REZ = merkRez; GEB_BEST = merkGeb; SPANNE = merkS;
    return erg;
  });
  urteil("eine Rezeptzutat ohne Menge zählt als „keine Menge“, nicht als „Größe fehlt“",
    (grund.vorbehalt ? grund.vorbehalt.menge > 0 && grund.vorbehalt.gebinde === 0
                     : grund.unklar === "menge"), grund);

  /* Die neue Zeile in „Was noch fehlt" — dort, wo sie wirklich steht. */
  const fehltZeile = await p.evaluate(() => {
    const merkMap = MAP, merkS = SPANNE;
    MAP = {}; Object.keys(ZBER).forEach(tg => ZBER[tg].positionen.forEach(
      q => { MAP[q.name] = "__ignoriert"; }));
    SPANNE = 1; SEITE = "heute"; zeichne();
    const txt = document.querySelector("main").textContent;
    /* Die vier Kacheln sind in Runde 19 der Kette und dem
       Abdeckungsbalken gewichen. Die Zusicherung bleibt dieselbe: Die
       ZAHL der ignorierten Namen muss in der Zusammenfassung stehen,
       nicht nur im Fließtext darunter — sonst liest sie niemand. Neuer
       Ort: die Legende unter dem Balken. */
    const kopf = [...document.querySelectorAll(".vlegende, .vbalken")]
      .map(k => k.textContent).join(" ");
    MAP = merkMap; SPANNE = merkS;
    return { zeile: /auf „Ignorieren“ und .*nicht als Verkauf/.test(txt),
      kachel: /ignoriert\)/.test(kopf) };
  });
  urteil("„Was noch fehlt“ nennt die ignorierten Kassennamen",
    fehltZeile.zeile, fehltZeile);
  urteil("die Zusammenfassung über dem Abgleich nennt sie ebenfalls",
    fehltZeile.kachel, fehltZeile);

  /* Bildschirm und CSV kennen den vierten Weg jetzt auch (vierte Jagd · A). */
  const leser = await p.evaluate(() => {
    const merkMap = MAP, merkS = SPANNE;
    MAP = {}; Object.keys(ZBER).forEach(tg => ZBER[tg].positionen.forEach(
      q => { MAP[q.name] = "__ignoriert"; }));
    SPANNE = 1; vAbgleich.tag = letzterTag(); SEITE = "abgleich"; zeichne();
    const hinweise = [...document.querySelectorAll("main .hinweis")]
      .map(h => h.textContent.replace(/\s+/g, " ").trim());
    const a = abgleich(letzterTag(), 1);
    /* Die CSV ohne Datei: derselbe Aufbau, nur abgefangen. */
    let csv = ""; const merkHol = window.hol;
    window.hol = (n, inhalt) => { csv = inhalt; };
    csvAbgleich(letzterTag(), a);
    window.hol = merkHol;
    MAP = merkMap; SPANNE = merkS;
    return { hinweis: hinweise.some(h => /Ignorieren/.test(h)),
      csvKopf: /Ignorieren/.test(csv), csvZahl: /Verkaufte Einheiten im Zeitraum/.test(csv) };
  });
  urteil("der Bildschirm „Verkauf ↔ Fassung“ nennt die ignorierten Namen",
    leser.hinweis, leser);
  urteil("die CSV trägt die Bilanz im Kopf und einen eigenen Abschnitt",
    leser.csvKopf && leser.csvZahl, leser);

  /* Zweite Deutungsspalte: der Mittagsblick (dritte Jagd · A). */
  const schirm = await p.evaluate(() => {
    SEITE = "heute"; zeichne();
    /* Nur die DEUTUNGSSPALTE. Der Hinweis darüber verneint das Wort —
       das ist der Punkt, nicht der Fehler. */
    /* `td.deutung` war die eigene Spalte des Mittagsblicks. Die
       Übersicht aus Runde 19 stellt die Deutung unter den Artikelnamen,
       damit daneben der Wert in Euro Platz hat — dieselbe Aussage, ein
       anderes Element. Geprüft wird weiter, dass es sie ÜBERHAUPT gibt
       und dass in ihr das Wort „Schwund" nicht vorkommt. */
    const txt = [...document.querySelectorAll("main .deutung")]
      .map(c => c.textContent).join(" ");
    return { schwund: /Schwund/.test(txt), zeilen: document.querySelectorAll("main .deutung").length,
      ignorierzeile: /auf .Ignorieren. und zählen nicht als Verkauf/.test(txt) };
  });
  urteil("auch die Deutung auf der Übersicht sagt nirgends „Schwund“",
    !schirm.schwund && schirm.zeilen > 0, schirm);

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

  /* B-Fund der Jagd nach Runde 18: Die Kachel versprach „Positionen und
     Mengen ansehen" und legte die Karte bei 390px 921px unter den Falz.
     Die Kacheln sind in Runde 19 der Kette gewichen — die Zusicherung
     hängt jetzt am ersten Glied, das dasselbe verspricht. */
  await q.evaluate(() => { EGOFFEN = null; EGFILTER = { modus: "", wer: "", q: "" };
    SEITE = "heute"; zeichne(); window.scrollTo(0, 0); });
  await q.waitForTimeout(250);
  await q.evaluate(() => document.querySelectorAll(".glied")[0].click());
  await q.waitForTimeout(900);          /* das Rollen ist weich */
  const falz = await q.evaluate(() => {
    const d = document.querySelector("#egDetail .karte");
    return d ? { oben: Math.round(d.getBoundingClientRect().top),
                 fenster: window.innerHeight } : { fehlt: true };
  });
  urteil("Glied „Fassung“ bringt das Detail am Handy ins Bild",
    !falz.fehlt && falz.oben >= 0 && falz.oben < falz.fenster, falz);
  await q.evaluate(() => { EGOFFEN = null; SEITE = "heute"; zeichne(); window.scrollTo(0, 0); });
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

  /* B-Fund der Jagd: Die Zone reichte bis 32px, der Inhalt beginnt bei 16px. */
  const bedarf = await q.evaluate(async WISCHQ => {
    EGOFFEN = null; EGFILTER = { modus: "", wer: "", q: "" }; SEITE = "eingaenge"; zeichne();
    await new Promise(r => setTimeout(r, 250));
    const wisch = eval("(" + WISCHQ + ")");
    const mass = s => { const e = document.querySelector(s);
      return e ? Math.round(e.getBoundingClientRect().left) : null; };
    const feld = document.querySelector("#egQ").getBoundingClientRect();
    const huelle = document.querySelector("#egListe .tabhuelle");
    /* Der Finger setzt MITTEN auf das Suchfeld bzw. die Rollfläche. */
    const zu = () => document.body.classList.remove("navoffen");
    zu();
    /* Deutlich im Feld, nicht im 4px-Streifen am Rand — dort gewinnt
       absichtlich die Randgeste (dritte Jagd · C). */
    const aufFeld = (() => { const y = Math.round(feld.top + feld.height / 2);
      return wisch(Math.round(feld.left) + 40, Math.round(feld.left) + 140, y); })();
    zu();
    const r = huelle.getBoundingClientRect();
    /* Deutlich INNERHALB, nicht im 4px-Streifen am Rand: dort gewinnt
       absichtlich die Randgeste (zweite Jagd · C). */
    const aufTabelle = wisch(Math.round(r.left) + 40, Math.round(r.left) + 140,
      Math.round(r.top + r.height / 2));
    zu();
    return { feldLinks: mass("#egQ"), huelleLinks: mass("#egListe .tabhuelle"),
      rollt: huelle.scrollWidth > huelle.clientWidth,
      aufFeld, aufTabelle };
  }, WISCH);
  urteil("über dem Suchfeld greift die Geste nicht",
    !bedarf.aufFeld.verhindert && !bedarf.aufFeld.offen, bedarf.aufFeld);
  urteil("über einer waagrecht rollenden Tabelle greift die Geste nicht",
    bedarf.rollt && !bedarf.aufTabelle.verhindert && !bedarf.aufTabelle.offen, bedarf);

  /* …bei offener Leiste: aus der MITTE nach rechts bewirkt nichts und
     wird losgelassen — AM RAND aber bliebe sonst die Zurück-Geste des
     Browsers stehen, und genau dort liegt der Daumen (zweite Jagd · B). */
  const leerlauf = await q.evaluate(async WISCHQ => {
    SEITE = "heute"; zeichne();
    document.body.classList.add("navoffen");
    await new Promise(r => setTimeout(r, 400));
    /* NEBEN dem Blatt, nicht darauf: Das Blatt selbst zählt seit der
       vierten Jagd als Rand, weil Safari dort sonst zurückblättert. */
    const e = eval("(" + WISCHQ + ")")(340, 380, 420);
    document.body.classList.remove("navoffen");
    return e;
  }, WISCH);
  urteil("bei offener Leiste wird ein Wisch NEBEN dem Blatt nicht geschluckt",
    !leerlauf.verhindert, leerlauf);
  const randOffen = await q.evaluate(WISCHQ => {
    SEITE = "heute"; zeichne();
    document.body.classList.add("navoffen");
    const e = eval("(" + WISCHQ + ")")(8, 160, 420);
    document.body.classList.remove("navoffen");
    return e;
  }, WISCH);
  urteil("bei offener Leiste bleibt die Zurück-Geste AM RAND abgefangen",
    randOffen.verhindert, randOffen);

  /* Nach LINKS am Rand bei geschlossener Leiste: bewirkt nichts und ist
     nichts zu schützen — Safaris Zurück am linken Rand ist ein Wisch nach
     rechts (dritte Jagd · C). Dreht man `!(schutz && hin>0)` auf
     `!schutz` zurück, wird dieses Urteil rot. */
  const linksAmRand = await q.evaluate(WISCHQ => {
    SEITE = "heute"; zeichne(); document.body.classList.remove("navoffen");
    const e = eval("(" + WISCHQ + ")")(12, 12 - 90, 420);
    document.body.classList.remove("navoffen");
    return e;
  }, WISCH);
  urteil("nach links am Rand bleibt die Geste bei der Seite darunter",
    !linksAmRand.verhindert && !linksAmRand.offen, linksAmRand);

  /* Bei offener Leiste reicht das Blatt selbst als Rand — ab x=21 blieb
     die Zurück-Geste sonst offen (vierte Jagd · B). */
  const blattRand = await q.evaluate(async WISCHQ => {
    SEITE = "heute"; zeichne();
    document.body.classList.add("navoffen");
    await new Promise(r => setTimeout(r, 400));   /* das Blatt fährt ein */
    const breite = document.querySelector("nav.seite").offsetWidth;
    const e = eval("(" + WISCHQ + ")")(60, 200, 420);
    document.body.classList.remove("navoffen");
    return Object.assign(e, { breite });
  }, WISCH);
  urteil("bei offener Leiste ist auch x=60 noch geschützt",
    blattRand.verhindert && blattRand.breite > 60, blattRand);

  /* Am Rand gewinnt die Randgeste auch über einem Eingabefeld — dreht man
     den `amRand`-Vorrang in `eigenerBedarf` zurück, wird dies rot. */
  const feldAmRand = await q.evaluate(async WISCHQ => {
    EGOFFEN = null; EGFILTER = { modus: "", wer: "", q: "" }; SEITE = "eingaenge"; zeichne();
    await new Promise(r => setTimeout(r, 200));
    document.body.classList.remove("navoffen");
    const f = document.querySelector("#egQ").getBoundingClientRect();
    const e = eval("(" + WISCHQ + ")")(Math.round(f.left) + 2, Math.round(f.left) + 120,
      Math.round(f.top + f.height / 2));
    document.body.classList.remove("navoffen");
    return e;
  }, WISCH);
  urteil("am Rand gewinnt die Randgeste auch über dem Suchfeld",
    feldAmRand.verhindert && feldAmRand.offen, feldAmRand);

  /* 4px-Streifen zwischen Inhaltsbeginn (16) und Randzone (20): dort
     gewinnt die Randgeste, sonst bliebe ein Loch (zweite Jagd · C). */
  const streifen = await q.evaluate(async WISCHQ => {
    EGOFFEN = null; EGFILTER = { modus: "", wer: "", q: "" }; SEITE = "eingaenge"; zeichne();
    await new Promise(r => setTimeout(r, 200));
    document.body.classList.remove("navoffen");
    const h = document.querySelector("#egListe .tabhuelle").getBoundingClientRect();
    const e = eval("(" + WISCHQ + ")")(18, 120, Math.round(h.top + h.height / 2));
    document.body.classList.remove("navoffen");
    return e;
  }, WISCH);
  urteil("im 4px-Streifen am Rand gewinnt die Randgeste",
    streifen.verhindert && streifen.offen, streifen);

  /* Das Detail aus „Nur auf diesem Gerät" gehört zu seiner eigenen
     Tabelle — ein Tastendruck im Suchfeld der Serverliste darf es nicht
     löschen (zweite Jagd · B). */
  const fremdDetail = await q.evaluate(async () => {
    /* Ein Vorgang, den der „Server" dieses Prüfstands nicht kennt. */
    try { localStorage.setItem("hh_archiv", JSON.stringify({ "nach_2026-01-02":
      { mode: "nach", tag: "2026-01-02", name: "Uralt", finished: true,
        notiz: "aus dem Gerätespeicher", ent: { w026: 2 } } })); } catch (e) {}
    EGOFFEN = null; EGFILTER = { modus: "", wer: "", q: "" }; SEITE = "eingaenge"; zeichne();
    await new Promise(r => setTimeout(r, 200));
    const knopf = document.querySelector("[data-fremd]");
    if (!knopf) return { fehlt: true };
    knopf.click();
    const auf = !!document.querySelector("#egFremdDetail .karte");
    EGFILTER.q = "Lena"; zeichne();
    const nachher = !!document.querySelector("#egFremdDetail .karte");
    const tabelleDa = !!document.querySelector("[data-fremd]");
    try { localStorage.removeItem("hh_archiv"); } catch (e) {}
    EGFILTER = { modus: "", wer: "", q: "" }; EGOFFEN = null; zeichne();
    return { auf, nachher, tabelleDa };
  });
  urteil("das Detail aus dem Gerätespeicher überlebt den Filter der Serverliste",
    !fremdDetail.fehlt && fremdDetail.auf && fremdDetail.nachher && fremdDetail.tabelleDa,
    fremdDetail);

  /* Die Zeile selbst öffnet das Detail — „Ansehen" liegt bei 390px
     ausserhalb der Rollfläche. */
  const zeile = await q.evaluate(async () => {
    EGOFFEN = null; EGFILTER = { modus: "", wer: "", q: "" }; SEITE = "eingaenge"; zeichne();
    await new Promise(r => setTimeout(r, 200));
    const tr = document.querySelectorAll("#egListe [data-egzeile]")[1];
    const t = tr.getBoundingClientRect();
    const knopf = tr.querySelector("[data-eg]").getBoundingClientRect();
    tr.querySelector("td").click();
    return { imBild: Math.round(knopf.right) <= window.innerWidth,
      offen: !!document.querySelector("#egDetail .karte") };
  });
  urteil("die Zeile öffnet das Detail, auch wenn „Ansehen“ ausserhalb liegt",
    !zeile.imBild && zeile.offen, zeile);

  await ctx2.close(); await ctx.close(); await b.close();
  await new Promise(r => srv.close(r));

  console.log("\n" + (fehler.length ? "JS-FEHLER: " + fehler.join(" | ") : "keine JS-Fehler"));
  console.log(gut + " Urteile grün, " + schlecht + " rot.  Bilder: " + OUT);
  process.exit(schlecht || fehler.length ? 1 : 0);
})();
