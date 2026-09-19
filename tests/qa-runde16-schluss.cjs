/* Schlusskontrolle Runde 16 · qa-guardian
   ───────────────────────────────────────
       node tests/qa-runde16-schluss.cjs

   NICHT Teil von `npm test` (braucht Playwright, Regel 8).

   Geprüft werden die Randfälle, die in `tests/ui-runde16.cjs` NICHT
   stehen, weil dort jede Lage die Absicht der Runde bestätigt. Hier wird
   die Absicht gegen die Grundsätze des Hauses gehalten:

     Q1  Ohne Netz einen Vorgang abschliessen. Projektanleitung §9:
         „Offline ist der Normalfall, nicht die Ausnahme. Im Weinkeller
         gibt es kein Netz." Und die Hilfe der App (index.html, Kapitel
         „Abschluss") sagt wörtlich: „ohne Netz geht sie hinaus, sobald
         wieder Empfang da ist."
     Q2  Dasselbe für die Kellerzählung — sie braucht den Server an
         keiner Stelle, auch nicht für einen Abgleich.
     Q3  Abgelaufene Sitzung an der Freigabe: `POST /api/code` antwortet
         dann mit 401 „nicht angemeldet" — derselbe Status wie bei einem
         falschen Code. Vergisst die App daraufhin einen GÜLTIGEN Code,
         ist danach auch die Rückfallebene ohne Netz zerstört.
     Q4  Freigabe ohne Netz: der Geräte-Rückfall muss tragen.
     Q5  Doppelter Griff auf „Speichern" im Abgleichfenster.

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

/* Was der Prüfserver gerade tut. */
const LAGE = { rolle: "leitung", wer: "Casimir", codeAntwort: "treffer",
               gesendet: [], puts: 0 };

const srv = http.createServer((q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";
  if (u.startsWith("/api")) {
    const kopf = { "content-type": "application/json" };
    if (u === "/api/ich") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: LAGE.wer, rolle: LAGE.rolle })); }
    if (u === "/api/vorgaenge") { a.writeHead(200, kopf);
      return a.end(JSON.stringify({ vorgaenge: [] })); }
    if (u === "/api/fassungsliste") { a.writeHead(404, kopf);
      return a.end(JSON.stringify({ fehler: "nicht vorhanden" })); }
    if (u === "/api/code") {
      /* Genau der Fall aus Q3: die Sitzung ist abgelaufen. Der Router in
         src/index.js prüft den Keks VOR `codeNachschlagen()` und antwortet
         mit demselben Status wie ein unbekannter Code. */
      if (LAGE.codeAntwort === "abgelaufen") { a.writeHead(401, kopf);
        return a.end(JSON.stringify({ fehler: "nicht angemeldet" })); }
      if (LAGE.codeAntwort === "unbekannt") { a.writeHead(401, kopf);
        return a.end(JSON.stringify({ fehler: "unbekannt", uebrig: 7, minuten: 15 })); }
      a.writeHead(200, kopf);
      return a.end(JSON.stringify({ name: LAGE.wer, rolle: LAGE.rolle }));
    }
    if (u.startsWith("/api/vorgang/")) {
      let leib = ""; q.on("data", c => leib += c);
      return q.on("end", () => { LAGE.puts++;
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

/* `x` ist die SHA-256-Summe des Codes nicht — `bekannterCode()` rechnet
   sie selbst. Die Saat legt deshalb den echten Schlüssel ab, sobald die
   Seite steht (siehe `merkeCode` in index.html). */
const SAAT = `(()=>{ try{
  sessionStorage.setItem("hh_user","Casimir");
  sessionStorage.setItem("hh_rolle","leitung");
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
  await p.goto("http://127.0.0.1:8782/index.html", { waitUntil: "load" });
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

/* Eine vollständige Tagesfassung bis zum Abschlussschritt, ohne offene
   Punkte — mit den Funktionen der App selbst, nicht mit nachgebautem
   Zustand. Gleiche Vorbereitung wie in tests/ui-runde16.cjs. */
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
    return { wein, getr, offen: offenList() };
  });
  await warte(p, 500); await hilfeZu(p);
  return ids;
}

/* Eine Kellerzählung bis zum Abschlussschritt. Sie braucht den Server
   nirgends: kein Abgleich, kein Z-Bericht, nur ein Stand. */
async function kellerzaehlungBisAbschluss(p) {
  await grussZu(p);
  await p.evaluate(() => start("keller"));
  await warte(p, 300);
  await p.locator('.gbtn[data-b="wein"]').click();   /* Zweig: Wein */
  await warte(p, 300);
  const offen = await p.evaluate(() => {
    const d = S.keller;
    WINES.forEach(w => { d.reihen[w.id] = 1; d.zdone[w.id] = 1; });
    save(); go(lastStep());
    return offenList();
  });
  await warte(p, 500); await hilfeZu(p);
  return offen;
}

(async () => {
  await new Promise(r => srv.listen(8782, "127.0.0.1", r));
  const b = await pw.chromium.launch({ args: ["--no-sandbox"] });
  try {

    /* ── Q1 · Tagesfassung ohne Netz abschliessen ───────────────────── */
    {
      const { ctx, p, fehler } = await seite(b, true);
      const ids = await tagesfassungBisAbschluss(p);
      urteil("Q1 · der Abschluss steht ohne offenen Punkt da",
        ids.offen.length === 0, JSON.stringify(ids.offen));
      const knopf = p.locator(".finishbtn[data-netz]");
      const gesperrt = await knopf.isDisabled();
      await knopf.click({ force: true });
      await warte(p, 900);
      const nach = await p.evaluate(() => ({
        fertig: !!S.tag.finished,
        ausgang: (JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]"))
                   .filter(x => x.daten && x.daten.finished).length,
        fenster: document.querySelector("#ov").classList.contains("on")
      }));
      urteil("Q1 · GRUNDSATZ · ohne Netz lässt sich die Tagesfassung abschliessen",
        nach.fertig === true,
        "Knopf gesperrt: " + gesperrt + " · finished: " + nach.fertig +
        " · Fenster: " + nach.fenster);
      urteil("Q1 · GRUNDSATZ · der fertige Vorgang liegt in der Warteschlange",
        nach.ausgang === 1, nach.ausgang + " Einträge");
      urteil("Q1 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── Q2 · Kellerzählung ohne Netz abschliessen ──────────────────── */
    {
      const { ctx, p, fehler } = await seite(b, true);
      const offen = await kellerzaehlungBisAbschluss(p);
      urteil("Q2 · der Abschluss steht ohne offenen Punkt da",
        offen.length === 0, JSON.stringify(offen));
      const knopf = p.locator(".finishbtn[data-netz]");
      const gesperrt = await knopf.isDisabled();
      await knopf.click({ force: true });
      await warte(p, 700);
      const fertig = await p.evaluate(() => !!S.keller.finished);
      urteil("Q2 · GRUNDSATZ · die Kellerzählung braucht den Server nicht",
        fertig === true, "Knopf gesperrt: " + gesperrt + " · finished: " + fertig);
      urteil("Q2 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── Q3 · Abgelaufene Sitzung an der Freigabe ───────────────────── */
    {
      const { ctx, p, fehler } = await seite(b);
      await grussZu(p);
      await p.evaluate(() => merkeCode("1234", "Casimir"));
      const vorher = await p.evaluate(() => bekannterCode("1234"));
      urteil("Q3 · der Code ist auf diesem Gerät bekannt", vorher === "Casimir", vorher);

      LAGE.codeAntwort = "abgelaufen";
      const erg = await p.evaluate(() => werHatDenCode("1234"));
      const nachher = await p.evaluate(() => bekannterCode("1234"));
      urteil("Q3 · GRUNDSATZ · eine abgelaufene Sitzung nimmt dem Gerät " +
             "NICHT den gültigen Code",
        nachher === "Casimir",
        "quelle: " + erg.quelle + " · danach bekannt: " + nachher);
      urteil("Q3 · und die Meldung schickt zur Anmeldung, nicht zur Leitung",
        !/zurückgesetzt/.test(await p.evaluate(e => codeAbsage(e), erg)),
        await p.evaluate(e => codeAbsage(e), erg));

      /* Gegenprobe: ein wirklich unbekannter Code MUSS vergessen werden. */
      LAGE.codeAntwort = "unbekannt";
      await p.evaluate(() => merkeCode("4321", "Alt"));
      await p.evaluate(() => werHatDenCode("4321"));
      urteil("Q3 · Gegenprobe · ein zurückgesetzter Code fliegt weiter hinaus",
        (await p.evaluate(() => bekannterCode("4321"))) === null);
      LAGE.codeAntwort = "treffer";
      urteil("Q3 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── Q4 · Freigabe ohne Netz ────────────────────────────────────── */
    {
      const { ctx, p, fehler } = await seite(b);
      await grussZu(p);
      await p.evaluate(() => merkeCode("1234", "Casimir"));
      await ctx.setOffline(true);
      await p.evaluate(() => { window.dispatchEvent(new Event("offline")); });
      await warte(p, 300);
      const erg = await p.evaluate(() => werHatDenCode("1234"));
      urteil("Q4 · ohne Netz trägt der Gerätespeicher die Freigabe",
        erg.name === "Casimir" && erg.quelle === "geraet",
        JSON.stringify(erg));
      urteil("Q4 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

    /* ── Q5 · Doppelter Griff auf „Speichern" im Abgleich ───────────── */
    {
      LAGE.puts = 0; LAGE.gesendet = [];
      const { ctx, p, fehler } = await seite(b);
      await tagesfassungBisAbschluss(p);
      await p.locator(".finishbtn[data-netz]").click();
      await warte(p, 900);
      const fenster = (await p.locator("#ovT").textContent() || "").trim();
      urteil("Q5 · ohne Z-Bericht kommt das kurze „Fertig“", fenster === "Fertig", fenster);
      await p.locator("#ovOk").click();
      await p.locator("#ovOk").click({ force: true }).catch(() => {});
      await warte(p, 900);
      const schluessel = await p.evaluate(() =>
        (JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]")).map(x => x.schluessel));
      urteil("Q5 · doppelter Griff legt keinen zweiten Vorgang an",
        new Set(schluessel).size === schluessel.length,
        JSON.stringify(schluessel));
      urteil("Q5 · der Vorgang ist genau einmal als fertig angekommen",
        LAGE.gesendet.filter(x => x.finished).length === 1,
        LAGE.gesendet.filter(x => x.finished).length + " von " + LAGE.puts + " PUTs");
      urteil("Q5 · keine JS-Fehler dabei", fehler.length === 0, fehler[0]);
      await ctx.close();
    }

  } finally {
    await b.close(); srv.close();
  }
  console.log(nein ? "\n" + nein + " Prüfung(en) NEIN." : "\nAlle Prüfungen ja.");
  process.exit(nein ? 1 : 0);
})();
