/* qa-guardian · Runde 16, Gegenprobe — der halb durchgekommene Leib
   ─────────────────────────────────────────────────────────────────
       node tests/qa-runde16-stummer-leib.cjs

   Die dritte Jagd hat in `index.html` gefunden, dass ein `AbortController`
   um ein nacktes `fetch` nur den KOPF absichert: `fetch` löst auf, sobald
   die Kopfzeilen da sind, das `finally` räumt die Uhr weg, und ein
   `await r.json()` beim Aufrufer wartet danach ohne jede Frist. `holeKurz()`
   liest den Leib deshalb jetzt selbst, innerhalb der Frist.

   `kurz()` in `public/leitung.html` (im selben Zug entstanden) tut das
   NICHT — es gibt die `Response` zurück, und der Aufrufer bei
   „PIN zurücksetzen" ruft danach `await r.json()`. Der Kommentar dort sagt
   „dieselbe Rechnung wie `holeKurz()`"; das stimmt für den Kopf, nicht für
   den Leib. Diese Prüfung stellt genau das nach: 200 + `content-type`, der
   Leib kommt nie.

   Erwartet (nach einer Behebung): Nach der Frist steht eine Auskunft da und
   der Knopf ist wieder frei. Rückgabe 1, solange das nicht so ist.       */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) { console.log("Playwright nicht gefunden — UNGEPRÜFT."); process.exit(0); }

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };
const PORT = 8791;
const LAGE = { pinRufe: 0 };

const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/leitung.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    if (u === "/api/person/pin") {
      LAGE.pinRufe++;
      q.resume();
      /* Kopf JA, Leib NIE — der halb durchgekommene Fall. */
      a.writeHead(200, kopf);
      /* Node haelt die Kopfzeilen sonst zurueck, bis geschrieben wird —
         `flushHeaders()` schickt sie sofort. Erst dadurch entsteht der
         Fall, um den es geht: `fetch` loest auf, der Leib kommt nie. */
      a.flushHeaders();
      return;                                   /* kein a.end() */
    }
    if (u === "/api/ich") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: "Casimir", rolle: "leitung" })); }
    if (u === "/api/personen") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ personen: [
        { id: 1, name: "Lena", rolle: "service", aktiv: 1 }] })); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ vorgaenge: [] })); }
    if (u === "/api/stamm") { a.writeHead(200, kopf); return a.end("{}"); }
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

(async () => {
  await new Promise(r => srv.listen(PORT, "127.0.0.1", r));
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", e => fehler.push(String(e)));
  await p.goto("http://127.0.0.1:" + PORT + "/leitung.html", { waitUntil: "load" });
  await p.waitForTimeout(1200);

  /* Statt den Knopf durch das Backoffice zu klicken (das Team-Blatt
     haengt an Rolle und Personenliste) wird die Frist direkt am Helfer
     gemessen — das ist der Mechanismus, um den es geht.

     NACHGEZOGEN: `kurz()` gibt seit der Behebung nicht mehr die
     `Response` zurueck, sondern liest den Leib INNERHALB der Frist und
     liefert ihn fertig ({ok, status, json, daten}). Damit gibt es beim
     Aufrufer kein `await r.json()` mehr, an dem etwas haengen koennte —
     genau das ist die Behebung. Gemessen wird deshalb, dass der EINE
     Aufruf binnen der Frist zurueckkommt und nichts Halbes liefert. */
  const mess = await p.evaluate(async () => {
    if (typeof kurz !== "function") return { fehlt: true };
    const t0 = Date.now();
    try {
      const wach = new Promise(r2 => setTimeout(() => r2("__frist"), 12000));
      const w = await Promise.race([
        kurz("/api/person/pin", { method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: 1 }) }, 8000)
          .then(r => ({ art: "da", r }), e => ({ art: String(e.name || e) })),
        wach]);
      const nach = Date.now() - t0;
      if (w === "__frist") return { kopfNach: null, leibNach: null,
        abbruch: "haengt weiter" };
      /* Abbruch durch die Frist ist der ERWARTETE Ausgang: Der Server
         schweigt. Wichtig ist nur, dass der Aufruf zurueckkommt — und,
         wenn er mit Daten zurueckkommt, dass sie vollstaendig sind. */
      if (w.art !== "da") return { kopfNach: nach, leibNach: nach, abbruch: w.art };
      return { kopfNach: nach, leibNach: nach, abbruch: null,
               halb: w.r && w.r.json === true && w.r.daten === null };
    } catch (e) { return { kopfNach: Date.now() - t0, leibNach: Date.now() - t0,
                           abbruch: String(e.name || e) }; }
  }).catch(e => ({ haenger: String(e) }));

  urteil("die Anfrage ist beim Server angekommen", LAGE.pinRufe >= 1,
         LAGE.pinRufe + " Rufe an /api/person/pin");
  urteil("`kurz()` gibt es in leitung.html", !mess.fehlt,
         mess.fehlt ? "nicht gefunden" : "ja");
  urteil("KERN \u00b7 der Aufruf kommt binnen 12 s zurueck, auch ohne Leib",
         !mess.haenger && mess.leibNach != null && mess.leibNach < 12000,
         mess.haenger ? "haengt: " + mess.haenger
           : "zurueck nach " + mess.leibNach + " ms \u00b7 "
             + (mess.abbruch || "kein Abbruch"));
  urteil("KERN \u00b7 und liefert nie eine halb gelesene Antwort",
         !mess.halb, mess.halb ? "Kopf als JSON gemeldet, Leib leer" : "ja");

  urteil("keine JS-Fehler dabei", fehler.length === 0, fehler.join(" | "));

  /* ── Gegenprobe: dieselbe Lage gegen `holeKurz()` in index.html ──────
     Die Fassung dort liest den Leib INNERHALB der Frist. Sie muss also
     binnen der Frist zurueckkommen — sonst waere die Behebung nur
     behauptet. */
  const p2 = await ctx.newPage();
  const fehler2 = [];
  p2.on("pageerror", e => fehler2.push(String(e)));
  await p2.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "load" });
  await p2.waitForTimeout(600);
  const mess2 = await p2.evaluate(async () => {
    if (typeof holeKurz !== "function") return { fehlt: true };
    const t0 = Date.now();
    const wach = new Promise(r2 => setTimeout(() => r2("__frist"), 14000));
    const lauf = holeKurz("/api/person/pin", { method: "POST",
      headers: { "content-type": "application/json" }, body: "{}" }, 8000)
      .then(() => "__da", e => "__" + (e.name || e));
    const w = await Promise.race([lauf, wach]);
    return { nach: Date.now() - t0, aus: w };
  });
  urteil("Gegenprobe \u00b7 `holeKurz()` in index.html kommt binnen der Frist zur\u00fcck",
         !mess2.fehlt && mess2.aus !== "__frist" && mess2.nach < 12000,
         mess2.fehlt ? "holeKurz nicht gefunden"
           : "nach " + mess2.nach + " ms \u00b7 " + mess2.aus);
  urteil("Gegenprobe \u00b7 keine JS-Fehler", fehler2.length === 0, fehler2.join(" | "));

  console.log("");
  console.log(nein ? "NEIN: " + nein + " Prüfung(en) rot." : "Alle Prüfungen ja.");
  await b.close(); srv.close();
  process.exit(nein ? 1 : 0);
})();
