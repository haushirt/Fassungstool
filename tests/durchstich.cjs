/* Durchstich · App ↔ echter Worker ↔ echtes Schema
   ═══════════════════════════════════════════════════════════════════════

   Die erste Prüfung, die `public/index.html`, `src/index.js` und
   `docs/live-schema.sql` GEMEINSAM anfasst.

   Warum es sie gibt: Bis Runde 3 waren 123 Prüfungen grün über einem
   Worker, der live keine einzige Zeile schreiben konnte. Grün war alles,
   weil jede Prüfung nur eine Hälfte ansah — die App gegen einen
   nachgebauten Server (`persona-tagesfassung.cjs`, `ui-leitung.cjs`), den
   Worker gegen eine Attrappe. Zwischen den Hälften lag der Fehler.

   Hier gibt es keinen nachgebauten Server:
     · `public/` kommt von der Platte,
     · `/api/*` geht in den ECHTEN Worker (`src/index.js`, nur `postal-mime`
       ist ersetzt, siehe `tests/hilfe/worker.mjs`),
     · `env.DB` ist echtes SQLite, aufgebaut aus `docs/live-schema.sql`
       (`tests/hilfe/d1-echt.mjs`) — mit NOT NULL, CHECK, PRIMARY KEY.
   Am Ende wird nicht der Server gefragt, sondern die Datenbank: steht die
   Zeile da, und steht sie richtig da.

   NICHT Teil von `npm test` (braucht Playwright, Regel 8 erlaubt keine
   neue Abhängigkeit). Von Hand:

       node tests/durchstich.cjs

   Ohne Playwright legt sie sich mit einer Zeile hin statt rot zu werden.

   Regel 2 bleibt unberührt: die Datenbank liegt im Arbeitsspeicher, kein
   `--remote`, kein Deploy, keine Verbindung nach aussen.
   Regel 9: Der Code unten ist erfunden und wird beim Start dieses Laufes
   über `/api/anlage` angelegt. Er gehört niemandem im Haus.
   ═══════════════════════════════════════════════════════════════════════ */

const ORTE = ["playwright", "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — kein Durchstich. Gesucht in:\n  " +
    ORTE.join("\n  ") + "\nOhne Browser gilt: der Weg App→Worker ist UNGEPRÜFT.");
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
                ".png": "image/png", ".json": "application/json" };

const PORT = 8934;
/* Bei jedem Lauf gewürfelt statt im Quelltext festgeschrieben. So kann
   keine erfundene Ziffernfolge je zufällig mit einem Code aus dem Haus
   zusammenfallen, und es steht nichts Codeartiges in der Geschichte
   (Regel 9). */
const CODE = String(require("crypto").randomInt(1000, 10000));

let fehler = 0, geprueft = 0;
const ok = (satz, bedingung, dazu) => {
  geprueft++;
  if (bedingung) console.log("  ✓ " + satz + (dazu ? "  (" + dazu + ")" : ""));
  else { fehler++; console.log("  ✗ " + satz + (dazu ? "  (" + dazu + ")" : "")); }
};

(async () => {
  /* ── Worker und Datenbank ──────────────────────────────────────────── */
  const { ladeWorker } = await import("./hilfe/worker.mjs");
  const { d1Echt } = await import("./hilfe/d1-echt.mjs");
  const worker = await ladeWorker();
  const DB = d1Echt();

  /* Das Sitzungsgeheimnis wird bei jedem Lauf gewürfelt und steht nirgends
     in einer Datei (Regel 9). */
  const env = {
    DB,
    TOKEN_SECRET: require("crypto").randomBytes(32).toString("hex"),
    ANLAGE_OFFEN: "1",
    ASSETS: { fetch: () => new Response("nicht hier", { status: 404 }) }
  };

  /* ── Die Brücke: Node-Anfrage → Worker → Node-Antwort ──────────────── */
  let netzAus = false;
  const srv = http.createServer(async (q, a) => {
    let u = q.url.split("?")[0];
    if (u === "/") u = "/index.html";

    if (u.startsWith("/api")) {
      if (netzAus) { q.socket.destroy(); return; }          /* Funkloch */
      const koerper = await new Promise(r => {
        if (q.method === "GET" || q.method === "HEAD") return r(undefined);
        let s = ""; q.on("data", c => s += c); q.on("end", () => r(s));
      });
      const h = new Headers();
      for (const [k, v] of Object.entries(q.headers))
        if (typeof v === "string") h.set(k, v);
      h.set("cf-connecting-ip", "10.0.0.1");
      const req = new Request("http://localhost:" + PORT + q.url,
        { method: q.method, headers: h, body: koerper });
      let r;
      try { r = await worker.fetch(req, env); }
      catch (e) { r = new Response(JSON.stringify({ fehler: String(e && e.message) }), { status: 500 }); }
      const kopf = {};
      r.headers.forEach((v, k) => { if (k !== "set-cookie") kopf[k] = v; });
      const kekse = typeof r.headers.getSetCookie === "function"
        ? r.headers.getSetCookie() : [r.headers.get("set-cookie")].filter(Boolean);
      /* `Secure` fällt weg, weil der Durchstich über http://localhost
         läuft. Das ist die EINZIGE Änderung an der Antwort des Workers —
         sie betrifft den Transportweg, nicht das, was geprüft wird. */
      if (kekse.length) kopf["set-cookie"] = kekse.map(k => k.replace(/;\s*Secure/gi, ""));
      a.writeHead(r.status, kopf);
      a.end(Buffer.from(await r.arrayBuffer()));
      return;
    }

    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
    a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
    a.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(PORT, r));
  const BASIS = "http://localhost:" + PORT;

  /* Eine Person anlegen — durch den Worker selbst, damit auch
     `personSchreiben` und der Rollen-CHECK mitgeprüft sind. */
  const anlage = await fetch(BASIS + "/api/anlage", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Lena", rolle: "service", code: CODE })
  });
  console.log("\n══ Durchstich: App ↔ echter Worker ↔ docs/live-schema.sql ══\n");
  console.log("0 · Einrichtung");
  ok("Person über /api/anlage angelegt", anlage.status === 200, "HTTP " + anlage.status);
  ok("die Zeile steht in `person`", DB.zeilen("person").length === 1);
  env.ANLAGE_OFFEN = "";                  /* Tür wieder zu, wie im Betrieb */

  const IPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" };

  const b = await pw.chromium.launch();
  const ctx = await b.newContext(IPHONE);
  const p = await ctx.newPage();
  let jsFehler = [];
  p.on("pageerror", e => jsFehler.push(e.message));

  /* ── 1 · Anmeldung ─────────────────────────────────────────────────── */
  console.log("\n1 · Anmeldung im Keller");
  await p.goto(BASIS + "/index.html", { waitUntil: "load" });
  await p.waitForTimeout(400);
  for (const z of CODE) await p.locator('[data-z="' + z + '"]').click();
  await p.waitForTimeout(700);
  const imMenu = await p.evaluate(() =>
    getComputedStyle(document.getElementById("menu")).display !== "none");
  ok("mit gültigem Code im Menü", imMenu);
  const ich = await p.evaluate(async () =>
    (await (await fetch("/api/ich", { credentials: "same-origin" })).json()));
  ok("/api/ich kennt die Person", ich && ich.name === "Lena" && ich.rolle === "service",
     JSON.stringify(ich));

  /* ── 2 · Tagesfassung bis zum Abschluss ────────────────────────────── */
  console.log("\n2 · Tagesfassung, Schritt für Schritt");
  await p.evaluate(() => start("tag"));
  await p.waitForTimeout(400);
  const schluessel = await p.evaluate(() => (typeof D === "function" && D())
    ? D().mode + "_" + D().tag : null);
  ok("Vorgangsschlüssel <modus>_<tag> gebildet", /^tag_\d{4}-\d{2}-\d{2}$/.test(schluessel || ""),
     String(schluessel));

  const zu = async () => {
    const x = p.locator("#hilfeZu");
    if (await x.count() && await x.isVisible()) { await x.click(); await p.waitForTimeout(200); }
  };
  /* Erst zwei Fehlmengen eintragen. Ohne sie ist die Tagesfassung zwar
     gültig — „alles da" —, aber es entsteht auch nichts zu buchen, und der
     Weg App → `ereignis` bliebe ungeprüft. Genau so tut es die Servicekraft:
     auf dem Platz fehlen zwei Flaschen, sie tippt sie herunter. */
  await zu();
  /* So wird gezählt: voll ist der Anfang, man tippt auf den Punkt, der dem
     ist-Stand entspricht (`dotRow`, index i → noch i+1 da). Der zweite
     Punkt bei Soll 3 heisst „eine fehlt".
     Nicht `.cnt` — diesen Selektor gibt es in der App nicht (er steht in
     `tests/persona-tagesfassung.cjs` und trifft dort nichts). */
  const zeilen = p.locator(".w");
  const wieViele = await zeilen.count();
  let getippt = 0;
  for (let i = 0; i < Math.min(2, wieViele); i++) {
    const punkt = zeilen.nth(i).locator('.dot[data-i="1"]');
    if (await punkt.count()) { await punkt.first().click(); await p.waitForTimeout(150); getippt++; }
  }
  const fehl = await p.evaluate(() => {
    const d = D(); return ["barrot", "bar", "backup", "rest"]
      .reduce((n, k) => n + Object.keys(d[k] || {}).length, 0);
  });
  ok("Fehlmengen lassen sich im Schritt Bar eintragen", fehl > 0,
     getippt + " Punkte getippt, " + fehl + " Fehlmengen im Zustand");

  for (let runde = 0; runde < 40; runde++) {
    await zu();
    const lage = await p.evaluate(() => ({
      tor: document.querySelectorAll(".gbtn").length,
      karte: [...document.querySelectorAll("button.weiter")].filter(e => e.offsetParent !== null).length,
      bnext: !!(document.getElementById("bNext") || {}).offsetParent
    }));
    /* Im Schritt „Holen" wird jede Zeile einzeln abgehakt (`holRow`).
       Einen Sammelknopf gibt es dort nicht — die Servicekraft tippt jeden
       Wein an, wenn er im Regal steht. */
    const holen = p.locator(".holz:not(.erledigt) .holzl");
    if (await holen.count()) {
      const n = await holen.count();
      for (let i = 0; i < n; i++) {
        const z = p.locator(".holz:not(.erledigt) .holzl");
        if (!(await z.count())) break;
        await z.first().click(); await p.waitForTimeout(200);
      }
      continue;
    }
    if (lage.tor) { await p.locator(".gbtn").first().click(); await p.waitForTimeout(300); continue; }
    if (!lage.karte && !lage.bnext) break;
    if (lage.karte) { await p.locator("button.weiter:visible").first().click(); await p.waitForTimeout(300); continue; }
    await p.locator("#bNext").click(); await p.waitForTimeout(300);
  }
  /* Der letzte offene Punkt im Abschluss ist das Foto der Fassungsliste
     (`offenList()`: „Fassungsliste noch nicht fotografiert"). Solange er
     offen ist, trägt der Abschlussknopf `.blocked` und führt in die
     Freigabe statt zum Protokoll. Das Bild selbst bleibt in der
     IndexedDB des Geräts (Architektur) — hier zählt nur der Vermerk. */
  const offenVorher = await p.evaluate(() => offenList());
  console.log("   offene Punkte vor dem Abschluss: " + JSON.stringify(offenVorher));
  await p.evaluate(() => {
    const d = D(); if (!d) return;
    d.fotos = [{ k: "pruef-1", zeit: Date.now() }];
    save(); render();
  });
  await p.waitForTimeout(300);
  const offenNachher = await p.evaluate(() => offenList());
  ok("nach Foto und allen Schritten ist kein Punkt mehr offen",
     offenNachher.length === 0, JSON.stringify(offenNachher));
  /* Nicht `#aDone` — so heisst der Knopf „Fertig" in der Verwaltung, der
     nur ins Menü zurückführt. Gemeint ist der Abschlussknopf. */
  const fertigKnopf = p.locator("button.finishbtn")
    .filter({ hasText: /Protokoll erstellen|melden/ });
  ok("der Abschlussknopf ist da", (await fertigKnopf.count()) > 0);
  if (await fertigKnopf.count()) { await fertigKnopf.first().click(); await p.waitForTimeout(800); }
  await p.evaluate(() => { if (typeof schiebe === "function") return schiebe(); });
  await p.waitForTimeout(900);

  /* ── 3 · Was steht jetzt in der DATENBANK? ─────────────────────────── */
  console.log("\n3 · In der Datenbank nachgesehen (nicht den Server gefragt)");
  const vg = DB.zeilen("vorgang");
  ok("genau eine Zeile in `vorgang`", vg.length === 1, vg.length + " Zeilen");
  const v = vg[0] || {};
  ok("`modus` = tag", v.modus === "tag", String(v.modus));
  ok("`tag` gesetzt", /^\d{4}-\d{2}-\d{2}$/.test(String(v.tag)), String(v.tag));
  ok("`wer` gesetzt", !!v.wer, String(v.wer));
  ok("`begonnen`/`geaendert` sind volle Zeitstempel (> 2³¹)",
     +v.begonnen > 2147483647 && +v.geaendert > 2147483647, v.begonnen + "/" + v.geaendert);
  ok("`status` ist einer der drei erlaubten Werte",
     ["offen", "abgeschlossen", "freigegeben"].includes(v.status), String(v.status));
  ok("`daten` ist lesbares JSON mit mode und tag",
     (() => { try { const d = JSON.parse(v.daten); return !!d.mode && !!d.tag; } catch (e) { return false; } })());
  ok("Regel 14: `schluessel`, `zaehlnr`, `geraet` unangetastet",
     v.schluessel === null && (v.zaehlnr === 0 || v.zaehlnr === null) && v.geraet === null,
     JSON.stringify([v.schluessel, v.zaehlnr, v.geraet]));

  const ev = DB.zeilen("ereignis");
  const buchungen = ev.filter(r => r.artikel !== "");
  console.log("   Journalzeilen: " + ev.length + " (davon Buchungen: " + buchungen.length + ")");
  if (v.status === "abgeschlossen")
    ok("der Abschluss hat Buchungen ins Journal gelegt", buchungen.length > 0,
       buchungen.length + " Zeilen");
  else
    console.log("  · Vorgang steht auf offen — Journal bleibt leer, das ist so gewollt");
  ok("jede Journalzeile trägt ihren Vorgang",
     ev.every(r => r.vorgang === (r.artikel === "" ? "" : v.id)));

  /* ── 4 · Doppeltes Absenden (Idempotenz) ───────────────────────────── */
  console.log("\n4 · Dasselbe Paket ein zweites Mal");
  const vorher = { v: DB.zeilen("vorgang").length, e: DB.zeilen("ereignis").length };
  await p.evaluate(sch => {
    const st = JSON.parse(localStorage.getItem("hh_archiv") || "{}");
    const stand = JSON.parse(localStorage.getItem("hh_keller_v12") || "{}");
    const paket = st[sch] || stand[sch] || Object.values(st)[0] || Object.values(stand)[0];
    if (!paket) return;
    const a = JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]");
    a.push({ schluessel: sch, id: "doppelt-1", daten: paket, versuche: 0 });
    a.push({ schluessel: sch, id: "doppelt-2", daten: paket, versuche: 0 });
    localStorage.setItem("hh_ausgang_v1", JSON.stringify(a));
  }, schluessel);
  await p.evaluate(() => schiebe());
  await p.waitForTimeout(1200);
  const nachher = { v: DB.zeilen("vorgang").length, e: DB.zeilen("ereignis").length };
  ok("kein zweiter Vorgang", nachher.v === vorher.v, vorher.v + " → " + nachher.v);
  ok("keine doppelten Buchungen im Journal", nachher.e === vorher.e, vorher.e + " → " + nachher.e);
  ok("die Warteschlange ist leer",
     (await p.evaluate(() => JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length)) === 0);

  /* ── 5 · Offline → Online ──────────────────────────────────────────── */
  console.log("\n5 · Funkloch im Keller, danach wieder Empfang");
  netzAus = true;
  await p.evaluate(() => {
    const a = JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]");
    a.push({ schluessel: "nach_2026-09-16", id: "offline-1", versuche: 0,
             daten: { mode: "nach", tag: "2026-09-16", name: "Lena", zaehlnr: 1,
                      ent: { "test-artikel": 2 }, finished: true } });
    localStorage.setItem("hh_ausgang_v1", JSON.stringify(a));
    return schiebe();
  });
  await p.waitForTimeout(900);
  const offen1 = await p.evaluate(() => ({
    offen: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length,
    zustand: (typeof NETZ !== "undefined") ? NETZ.zustand : "?"
  }));
  ok("offline bleibt der Stand in der Reihe liegen (Regel 6)", offen1.offen === 1,
     JSON.stringify(offen1));
  netzAus = false;
  await p.evaluate(() => schiebe());
  await p.waitForTimeout(1200);
  const offen2 = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length);
  ok("wieder online geht er von selbst hinaus", offen2 === 0, "noch offen: " + offen2);
  const nachOffline = DB.zeilen("vorgang");
  ok("die Sonderentnahme steht jetzt in `vorgang`",
     nachOffline.some(r => r.modus === "nach"), nachOffline.map(r => r.modus).join(","));
  ok("sie hat eine Entnahme ins Journal gelegt",
     DB.zeilen("ereignis").some(r => r.artikel === "test-artikel" && r.art === "entnahme"));

  /* ── 6 · Falsche Rolle ─────────────────────────────────────────────── */
  console.log("\n6 · Falsche Rolle");
  const rolleAntwort = await p.evaluate(async () => {
    const r = await fetch("/api/mapping", { method: "POST", credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kassenname: "Testwein 1/8", artikel: "x" }) });
    return { s: r.status, j: await r.text() };
  });
  ok("Service darf keine Zuordnung schreiben", rolleAntwort.s === 403,
     "HTTP " + rolleAntwort.s);
  ok("die Zuordnung ist nicht in der Datenbank gelandet",
     DB.zeilen("mapping").length === 0);

  /* ── 7 · Das Backoffice liest ECHTE Vorgänge ───────────────────────── */
  console.log("\n7 · Die Leitung an denselben Daten (normVorgang gegen echte `daten`)");
  const l = await ctx.newPage();
  const lFehler = [];
  l.on("pageerror", e => lFehler.push(e.message));
  await l.goto(BASIS + "/leitung.html", { waitUntil: "load" });
  await l.waitForTimeout(900);
  const leitung = await l.evaluate(() => ({
    quelle: (typeof QUELLE !== "undefined") ? QUELLE : "?",
    n: (typeof VORGAENGE !== "undefined") ? VORGAENGE.length : -1,
    tuer: !!document.querySelector('a[href="index.html"]'),
    text: (document.body.innerText || "").slice(0, 200)
  }));
  ok("die Leitung kommt mit demselben Keks hinein", !!leitung.quelle && leitung.quelle !== "Nicht angemeldet",
     JSON.stringify(leitung.quelle));
  ok("normVorgang() verträgt echte `vorgang.daten` vom Worker", leitung.n >= 1,
     leitung.n + " Vorgänge");
  ok("keine JS-Fehler im Backoffice an echten Daten", lFehler.length === 0, lFehler.join(" | "));

  /* ── 8 · Abgelaufene Sitzung ───────────────────────────────────────── */
  console.log("\n8 · Abgelaufene Sitzung");
  await ctx.clearCookies();
  const abgelaufen = await p.evaluate(async () => {
    const r = await fetch("/api/vorgaenge", { credentials: "same-origin" });
    return r.status;
  });
  ok("ohne Keks gibt der Worker nichts heraus", abgelaufen === 401, "HTTP " + abgelaufen);
  await p.evaluate(() => {
    const a = JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]");
    a.push({ schluessel: "tag_2026-09-10", id: "sess-1", versuche: 0,
             daten: { mode: "tag", tag: "2026-09-10", name: "Lena", zaehlnr: 1 } });
    localStorage.setItem("hh_ausgang_v1", JSON.stringify(a));
    return schiebe();
  });
  await p.waitForTimeout(800);
  const nachAbmeldung = await p.evaluate(() => ({
    offen: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length,
    zustand: (typeof NETZ !== "undefined") ? NETZ.zustand : "?"
  }));
  ok("der Stand bleibt bei 401 in der Reihe (Regel 6)", nachAbmeldung.offen === 1,
     JSON.stringify(nachAbmeldung));
  await l.reload({ waitUntil: "load" });
  await l.waitForTimeout(700);
  const leitungAus = await l.evaluate(() => (typeof QUELLE !== "undefined") ? QUELLE : "?");
  ok("die Leitung meldet: nicht angemeldet", leitungAus === "Nicht angemeldet", String(leitungAus));

  /* ── Schluss ───────────────────────────────────────────────────────── */
  await ctx.close(); await b.close(); srv.close(); DB.schliesse();

  console.log("\n══ Ergebnis ══");
  console.log("  " + (geprueft - fehler) + " von " + geprueft + " Punkten in Ordnung");
  if (jsFehler.length) console.log("  JS-Fehler in der App: " + jsFehler.join(" | "));
  if (fehler) { console.log("  DURCHSTICH ROT"); process.exit(1); }
  console.log("  Durchstich grün — App, Worker und Live-Schema passen zusammen.");
})().catch(e => { console.error("Durchstich abgebrochen:", e); process.exit(1); });
