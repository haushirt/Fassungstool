/* Persona-Durchlauf · NICHT Teil von `npm test`
   ─────────────────────────────────────────────
   `npm test` sammelt nur *.test.mjs; diese Datei heißt bewusst anders und
   läuft nur von Hand:

       node tests/persona-tagesfassung.cjs

   Sie braucht Playwright und einen Chromium. Beides ist KEINE Abhängigkeit
   des Projekts (Regel 8), steht nicht in package.json, und ohne gefundenes
   Playwright legt sie sich mit einer Zeile hin statt rot zu werden.

   Unterschied zu `tests/ui-aufnahme.cjs`: Die Aufnahme legt den Zustand in
   den Gerätespeicher und fotografiert. Hier wird NICHTS vorgelegt. Die
   Persona — neue Servicekraft, erster Tag, nach dem Abendservice — beginnt
   vor dem leeren Anmeldefeld und tippt sich durch, wie sie es im Keller
   täte. Dazu ein kleiner Server, der /api wirklich beantwortet: nur so
   sind Anmeldung, Warteschlange, Idempotenz und Abmeldung überhaupt zu
   sehen. Der Server merkt sich, was ankommt — am Ende wird geprüft, ob
   zweimal Senden zweimal schreibt.

   Ergebnis: review/screens/runde-<N>-qa/   (Ordner über RUNDE unten). */

const RUNDE = process.env.RUNDE || "2";
/* Bei jedem Lauf gewürfelt, wie in `tests/durchstich.cjs`: So kann keine
   erfundene Ziffernfolge je zufällig mit einem Code aus dem Haus
   zusammenfallen und für immer in der Geschichte stehen (Regel 9).
   Sechs Ziffern, wie sie der Worker seit dem 17.09. verlangt. */
const wuerfel = () => String(require("crypto").randomInt(100000, 1000000));
const CODE = wuerfel();
let FALSCH = wuerfel(); while (FALSCH === CODE) FALSCH = wuerfel();

const ORTE = [
  "playwright",
  "/opt/node22/lib/node_modules/playwright",
  "/usr/lib/node_modules/playwright"
];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) {} }
if (!pw) {
  console.log("Playwright nicht gefunden — kein Persona-Durchlauf. Gesucht in:\n  " +
    ORTE.join("\n  ") + "\nOhne Browser gilt: die Bedienung ist UNGEPRÜFT.");
  process.exit(0);
}

const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "public");
const OUT = path.join(__dirname, "..", "review", "screens", "runde-" + RUNDE + "-qa");
fs.mkdirSync(OUT, { recursive: true });

const TYPEN = { ".html": "text/html;charset=utf-8", ".js": "text/javascript",
  ".png": "image/png", ".json": "application/json" };

/* ── Der nachgebaute Server ──────────────────────────────────────────────
   Erfundene Codes, erfundene Namen — es gibt hier nichts Echtes zu
   schützen (Regel 9). Er bildet nur die Antworten nach, auf die die App
   reagiert; er ist KEIN Beweis über den echten Worker. Wofür er da ist:
   sichtbar zu machen, was die App tut, wenn ein Server antwortet. */
const SERVER = {
  codes: { [CODE]: { name: "Lena", rolle: "service" } },
  vorgaenge: {},          /* schluessel -> daten */
  puts: [],               /* jede angekommene Übertragung, der Reihe nach */
  angemeldet: false,
  aus: 0,                 /* >0: der Server ist „weg" (Netz simulieren) */
  session: true,          /* false: Sitzung abgelaufen -> 401 */
  rolle: "service"
};

function leseKoerper(q) {
  return new Promise(r => { let s = ""; q.on("data", c => s += c); q.on("end", () => r(s)); });
}

const srv = http.createServer(async (q, a) => {
  let u = q.url.split("?")[0];
  if (u === "/") u = "/index.html";

  if (u.startsWith("/api")) {
    const j = (o, s) => { a.writeHead(s || 200, { "content-type": "application/json" }); a.end(JSON.stringify(o)); };
    if (SERVER.aus) { a.destroy(); return; }               /* Funkloch */

    if (u === "/api/anmelden") {
      const b = JSON.parse((await leseKoerper(q)) || "{}");
      const p = SERVER.codes[b.code];
      if (!p) return j({ fehler: "unbekannt", uebrig: 8 }, 401);
      SERVER.angemeldet = true; SERVER.rolle = p.rolle;
      return j({ name: p.name, rolle: p.rolle });
    }
    if (!SERVER.session) return j({ fehler: "nicht angemeldet" }, 401);
    if (u === "/api/ich") return j({ name: "Lena", rolle: SERVER.rolle });
    if (u === "/api/vorgaenge") return j({ vorgaenge: Object.values(SERVER.vorgaenge) });
    if (u.startsWith("/api/vorgang/") && q.method === "PUT") {
      const id = decodeURIComponent(u.slice(13));
      const d = JSON.parse((await leseKoerper(q)) || "{}");
      SERVER.puts.push({ id, zaehlnr: +d.zaehlnr || 0, finished: !!d.finished });
      const alt = SERVER.vorgaenge[id];
      /* Dieselbe Regel wie im Worker (src/index.js:172): höhere Zählnummer
         gewinnt, nicht die spätere Ankunft. */
      if (alt && (+alt.zaehlnr || 0) > (+d.zaehlnr || 0))
        return j({ konflikt: true, server: alt }, 409);
      SERVER.vorgaenge[id] = Object.assign({}, d, { id, mode: d.mode, tag: d.tag });
      return j({ id, gespeichert: true });
    }
    return j({ fehler: "unbekannter Endpunkt" }, 404);
  }

  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { a.writeHead(404); return a.end("nix"); }
  a.writeHead(200, { "content-type": TYPEN[path.extname(f)] || "text/plain" });
  a.end(fs.readFileSync(f));
});

const IPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" };

const BEFUND = [];     /* jede Stelle, an der die Persona hängen bliebe */
const notiere = (wo, was) => { BEFUND.push(wo + ": " + was); console.log("  ⚑ " + wo + " — " + was); };

let n = 0;
const bild = async (p, name) => {
  n++; await p.screenshot({ path: path.join(OUT, String(n).padStart(2, "0") + "-" + name + ".png") });
};

/* Was auf dem Schirm steht — so, wie die Persona es liest. */
const sichtbar = p => p.evaluate(() => {
  const roh = document.body.innerText || "";
  return roh.split("\n").map(s => s.trim()).filter(Boolean);
});

/* Das Hilfe-Sheet öffnet sich beim ersten Besuch eines Schritts von selbst
   und legt sich über alles. Für die Persona ist das eine Handlung. */
async function hilfeWeg(p, wo) {
  const zu = p.locator("#hilfeZu");
  if (await zu.count() && await zu.isVisible()) {
    notiere(wo, "Hilfe-Sheet öffnet sich ungefragt und verdeckt den Schritt — erst wegtippen");
    await zu.click(); await p.waitForTimeout(250);
    return true;
  }
  return false;
}

(async () => {
  await new Promise(r => srv.listen(8932, r));
  const b = await pw.chromium.launch();
  const ctx = await b.newContext(IPHONE);
  const p = await ctx.newPage();
  let jsFehler = 0;
  p.on("pageerror", e => { jsFehler++; console.log("!! JS-FEHLER", e.message); });

  console.log("\n══ Persona: neue Servicekraft, erster Tag, 22:40 Uhr ══\n");

  /* ── 1. Vor dem Anmeldefeld ─────────────────────────────────────────── */
  await p.goto("http://127.0.0.1:8932/index.html", { waitUntil: "load" });
  await p.waitForTimeout(500);
  await bild(p, "anmeldung");
  const anmeldeText = (await sichtbar(p)).join(" | ");
  console.log("1. Anmeldung sieht:", anmeldeText.slice(0, 200));

  /* Falscher Code zuerst — so fängt ein erster Tag oft an. */
  for (const z of FALSCH) await p.locator('[data-z="' + z + '"]').click();
  await p.locator("[data-ok]").click();
  await p.waitForTimeout(400);
  const fehlerSatz = await p.locator("#pinFehler").textContent();
  console.log("   falscher Code →", JSON.stringify(fehlerSatz));
  await bild(p, "anmeldung-falscher-code");

  /* Jetzt der richtige. */
  for (const z of CODE) await p.locator('[data-z="' + z + '"]').click();
  await p.locator("[data-ok]").click();
  await p.waitForTimeout(600);
  const imMenu = await p.evaluate(() => {
    const m = document.getElementById("menu");
    return !!m && getComputedStyle(m).display !== "none";
  });
  console.log("2. Im Menü:", imMenu);
  if (!imMenu) notiere("Anmeldung", "kommt mit gültigem Code nicht ins Menü");
  await bild(p, "menu");
  console.log("   Menü sieht:", (await sichtbar(p)).join(" | ").slice(0, 260));

  /* ── 2. Tagesfassung starten ────────────────────────────────────────── */
  await p.evaluate(() => start("tag"));
  await p.waitForTimeout(500);
  await hilfeWeg(p, "Schritt 1 (Bar)");
  await bild(p, "schritt1-bar");
  console.log("3. Schritt 1:", (await sichtbar(p)).join(" | ").slice(0, 300));

  /* Der Schritt „Bar" hat zwei Zweige (Wein / Getränke). Die Persona wählt
     Wein, zählt drei Positionen ab, geht zurück und macht die Getränke. */
  const tor = await p.locator(".gbtn").count();
  console.log("   Zweige im Schritt 1:", tor);
  if (tor) { await p.locator('.gbtn[data-b="wein"]').click(); await p.waitForTimeout(400); }
  await bild(p, "schritt1-wein");

  /* Fehlmengen eintragen. ACHTUNG, Fund des qa-guardian in Runde 3: hier
     stand `.w .cnt` — diesen Selektor gibt es in der App nicht, der Zähler
     traf nie etwas und meldete stumm „0 Zeilen". Gezählt wird mit den
     Punkten (`dotRow`): voll ist der Anfang, der Punkt mit dem Index i
     heisst „noch i+1 da". Der zweite Punkt bei Soll 3 ist „eine fehlt". */
  const plus = p.locator('.w .dot[data-i="1"]');
  const wieViele = await plus.count();
  console.log("   Zeilen im Weinzweig:", wieViele);
  for (let i = 0; i < Math.min(3, wieViele); i++) { await plus.nth(i).click(); await p.waitForTimeout(80); }
  await bild(p, "schritt1-wein-gezaehlt");

  /* ── 3. Mitten in der Eingabe abbrechen ─────────────────────────────── */
  const vorAbbruch = await p.evaluate(() => localStorage.getItem("hh_keller_v12"));
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(600);
  const nachAbbruch = await p.evaluate(() => ({
    stand: localStorage.getItem("hh_keller_v12"),
    imMenu: getComputedStyle(document.getElementById("menu")).display !== "none",
    angemeldet: !!sessionStorage.getItem("hh_user")
  }));
  console.log("4. Abbruch mitten in der Eingabe (Neuladen):");
  console.log("   Zählstand überlebt:", vorAbbruch === nachAbbruch.stand);
  console.log("   noch angemeldet:", nachAbbruch.angemeldet, "· steht im Menü:", nachAbbruch.imMenu);
  if (vorAbbruch !== nachAbbruch.stand)
    notiere("Abbruch", "der Zählstand ist nach dem Neuladen nicht mehr derselbe");
  if (!nachAbbruch.angemeldet)
    notiere("Abbruch", "nach dem Neuladen wieder vor dem Anmeldefeld — im Keller ohne Netz das Ende");
  await bild(p, "nach-abbruch");

  /* ── 4. Offline weiterarbeiten ──────────────────────────────────────── */
  SERVER.aus = 1;
  await p.evaluate(() => { try { start("tag"); } catch (e) {} });
  await p.waitForTimeout(400);
  await hilfeWeg(p, "Schritt 1 nach Abbruch");
  const p2 = p.locator(".gbtn");
  if (await p2.count()) { await p2.first().click(); await p.waitForTimeout(300); }
  const plus2 = p.locator('.w .dot[data-i="1"]');
  for (let i = 0; i < Math.min(2, await plus2.count()); i++) { await plus2.nth(i).click(); await p.waitForTimeout(80); }
  await p.evaluate(() => { if (typeof sammle === "function") sammle();
                           if (typeof zwischenstand === "function") zwischenstand();
                           if (typeof schiebe === "function") schiebe(); });
  await p.waitForTimeout(700);
  const offlineZustand = await p.evaluate(() => ({
    zustand: (typeof NETZ !== "undefined") ? NETZ.zustand : "?",
    offen: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length,
    satz: (document.querySelector(".netztext") || {}).textContent || ""
  }));
  console.log("5. Offline:", JSON.stringify(offlineZustand));
  await bild(p, "offline");
  if (!/offline|kein|wartet|Netz|übertrag/i.test(offlineZustand.satz))
    notiere("Offline", "die Statuszeile sagt nicht, dass gerade nichts hinausgeht: " +
      JSON.stringify(offlineZustand.satz));

  /* ── 5. Wieder online: geht die Reihe von selbst hinaus? ────────────── */
  SERVER.aus = 0;
  const vorherPuts = SERVER.puts.length;
  await p.evaluate(() => { if (typeof schiebe === "function") schiebe(); });
  await p.waitForTimeout(900);
  const onlineZustand = await p.evaluate(() => ({
    zustand: (typeof NETZ !== "undefined") ? NETZ.zustand : "?",
    offen: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length,
    satz: (document.querySelector(".netztext") || {}).textContent || ""
  }));
  console.log("6. Wieder online:", JSON.stringify(onlineZustand),
    "· neu beim Server:", SERVER.puts.length - vorherPuts);
  await bild(p, "wieder-online");
  if (onlineZustand.offen !== 0)
    notiere("Offline→Online", "die Warteschlange ist nach dem Senden nicht leer");

  /* ── 6. Doppeltes Absenden ──────────────────────────────────────────── */
  const vorDoppelt = Object.keys(SERVER.vorgaenge).length;
  const schluessel = Object.keys(SERVER.vorgaenge)[0];
  const standVorher = schluessel ? JSON.stringify(SERVER.vorgaenge[schluessel]) : null;
  await p.evaluate(() => {
    const a = JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]");
    const letzte = (window.__letzte || null);
    return letzte;
  });
  /* Dasselbe Paket ein zweites Mal in die Reihe legen — genau das tut die
     App nach einem Netzabbruch. */
  await p.evaluate(sch => {
    const d = JSON.parse(localStorage.getItem("hh_keller_v12") || "{}");
    const paket = d[Object.keys(d)[0]] || {};
    const a = JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]");
    a.push({ schluessel: sch, id: "doppelt-1", daten: paket, versuche: 0 });
    a.push({ schluessel: sch, id: "doppelt-2", daten: paket, versuche: 0 });
    localStorage.setItem("hh_ausgang_v1", JSON.stringify(a));
  }, schluessel || "tag_x");
  await p.evaluate(() => { if (typeof schiebe === "function") schiebe(); });
  await p.waitForTimeout(900);
  console.log("7. Doppeltes Absenden: Vorgänge beim Server vorher", vorDoppelt,
    "nachher", Object.keys(SERVER.vorgaenge).length,
    "· Zustand unverändert:", standVorher === JSON.stringify(SERVER.vorgaenge[schluessel]));
  if (Object.keys(SERVER.vorgaenge).length !== vorDoppelt)
    notiere("Idempotenz", "zweimal dasselbe Paket hat einen zweiten Vorgang erzeugt");

  /* ── 7. Abgelaufene Sitzung ─────────────────────────────────────────── */
  SERVER.session = false;
  await p.evaluate(() => {
    const a = JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]");
    a.push({ schluessel: "tag_abgelaufen", id: "sess-1", daten: { mode: "tag", tag: "2026-09-17" }, versuche: 0 });
    localStorage.setItem("hh_ausgang_v1", JSON.stringify(a));
    if (typeof schiebe === "function") schiebe();
  });
  await p.waitForTimeout(800);
  const sess = await p.evaluate(() => ({
    zustand: (typeof NETZ !== "undefined") ? NETZ.zustand : "?",
    satz: (document.querySelector(".netztext") || {}).textContent || "",
    offen: JSON.parse(localStorage.getItem("hh_ausgang_v1") || "[]").length
  }));
  console.log("8. Abgelaufene Sitzung:", JSON.stringify(sess));
  await bild(p, "sitzung-abgelaufen");
  if (!/anmeld/i.test(sess.satz))
    notiere("Sitzung", "der 401 steht nicht als Satz auf dem Schirm: " + JSON.stringify(sess.satz));
  if (sess.offen === 0)
    notiere("Sitzung", "der Stand ist bei abgelaufener Sitzung aus der Reihe verschwunden (Regel 6)");
  SERVER.session = true;

  /* ── 8. Der ganze Weg bis zum Abschluss ─────────────────────────────── */
  console.log("\n9. Schritt für Schritt bis zum Abschluss:");
  await p.evaluate(() => { localStorage.removeItem("hh_ausgang_v1"); });
  await p.evaluate(() => start("tag"));
  await p.waitForTimeout(400);
  /* Die Persona drückt, was am größten und dunkelsten ist: die
     Bestätigung der Karte („Rest ist da – weiter", „Lade geprüft –
     weiter"). „Überspringen" unten ist der leise Ausweg — sie nimmt ihn
     nur, wenn es die Karte nicht mehr gibt. */
  let letzterSchritt = -1, stehtSeit = 0;
  for (let runde = 0; runde < 40; runde++) {
    await hilfeWeg(p, "Schritt " + (runde + 1));
    const lage = await p.evaluate(() => ({
      nr: (typeof step !== "undefined") ? step : -1,
      marke: (document.querySelector(".stlbl") || {}).textContent || "",
      prim: [...document.querySelectorAll("button.weiter")]
        .filter(e => e.offsetParent !== null)
        .map(e => (e.textContent || "").trim().slice(0, 44)),
      bnext: (document.getElementById("bNext") || {}).textContent || "",
      bnextDa: !!(document.getElementById("bNext") || {}).offsetParent,
      tor: document.querySelectorAll(".gbtn").length
    }));
    if (lage.nr === letzterSchritt) stehtSeit++; else { stehtSeit = 0; letzterSchritt = lage.nr; }
    console.log("   " + String(runde + 1).padStart(2) + ". " + lage.marke.trim() +
      " · Karte: " + JSON.stringify(lage.prim) +
      " · unten: „" + lage.bnext.trim() + (lage.bnextDa ? "" : "\" (weg") + "\"");
    if (runde < 12) await bild(p, "weg-" + String(runde + 1).padStart(2, "0"));
    if (lage.tor) { await p.locator(".gbtn").first().click(); await p.waitForTimeout(350); continue; }
    if (!lage.bnextDa && !lage.prim.length) break;         /* letzter Schritt */

    const karte = p.locator("button.weiter:visible");
    if (await karte.count()) { await karte.first().click(); await p.waitForTimeout(400); continue; }
    const bn = p.locator("#bNext");
    if ((await bn.count()) && await bn.isVisible()) { await bn.click(); await p.waitForTimeout(400); continue; }
    notiere("Weg", "in „" + lage.marke.trim() + "\" führt kein sichtbarer Knopf weiter");
    break;
  }
  const abschluss = await sichtbar(p);
  console.log("   Abschluss sieht:", abschluss.join(" | ").slice(0, 400));
  await bild(p, "abschluss");

  /* Welcher Knopf ist im Abschluss der auffälligste? */
  const knoepfe = await p.evaluate(() => [...document.querySelectorAll("button")]
    .filter(b => b.offsetParent !== null && (b.textContent || "").trim().length > 3)
    .map(b => ({ t: b.textContent.trim().slice(0, 40), klasse: b.className,
                 bg: getComputedStyle(b).backgroundColor })));
  console.log("   Knöpfe im Abschluss:", JSON.stringify(knoepfe.slice(0, 8)));

  await ctx.close(); await b.close(); srv.close();

  console.log("\n══ Befund ══");
  if (!BEFUND.length) console.log("  keine Stelle gefunden, an der die Persona hängen bliebe");
  BEFUND.forEach((z, i) => console.log("  " + (i + 1) + ". " + z));
  console.log(jsFehler ? "\nFERTIG MIT " + jsFehler + " JS-FEHLERN" : "\nfertig, keine JS-Fehler");
  console.log("Bilder: " + OUT);
})();
