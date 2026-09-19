/* Mockup-Bilder fuer den Chat.
   ─────────────────────────────
     node mockup-shot.cjs --root public --page index.html --out review/mockup/a
     node mockup-shot.cjs --root . --page mockup/a.html --out bilder --selector "#kopf"

   Drei Groessen, wie Casimir arbeitet:
     iPhone 16   393 x 852
     iPad mini   744 x 1133
     MacBook    1440 x 900

   Playwright ist bewusst KEINE Abhaengigkeit des Projekts. Fehlt es, legt
   sich das Skript sauber hin und sagt im Klartext, was fehlt.              */

const ORTE = ["playwright",
              "/opt/node22/lib/node_modules/playwright",
              "/usr/lib/node_modules/playwright",
              "/usr/local/lib/node_modules/playwright"];
let pw = null;
for (const o of ORTE) { try { pw = require(o); break; } catch (e) { /* weiter */ } }
if (!pw) {
  console.log("KEIN BILD: Playwright ist nicht installiert.");
  console.log("Einstellen: in der Cloud-Umgebung ein Setup-Script mit");
  console.log("  npm install -g playwright && npx playwright install --with-deps chromium");
  process.exit(3);
}

const http = require("http");
const fs   = require("fs");
const path = require("path");

const arg = (n, s) => {
  const i = process.argv.indexOf("--" + n);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : s;
};

const ROOT     = path.resolve(arg("root", "public"));
const PAGE     = arg("page", "index.html");
const OUT      = path.resolve(arg("out", "review/mockup"));
const SELECTOR = arg("selector", "");
const WARTEN   = parseInt(arg("warten", "350"), 10);

const GERAETE = [
  { name: "iphone",  w: 393,  h: 852,  dsf: 2, mobil: true  },
  { name: "ipad",    w: 744,  h: 1133, dsf: 1, mobil: true  },
  { name: "macbook", w: 1440, h: 900,  dsf: 1, mobil: false }
];

const TYPEN = {
  ".html": "text/html;charset=utf-8", ".htm": "text/html;charset=utf-8",
  ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon"
};

function server() {
  return http.createServer((req, res) => {
    const rein = decodeURIComponent(req.url.split("?")[0]);
    const ziel = path.join(ROOT, path.normalize(rein).replace(/^(\.\.[/\\])+/, ""));
    if (!ziel.startsWith(ROOT) || !fs.existsSync(ziel) || fs.statSync(ziel).isDirectory()) {
      res.writeHead(404); return res.end("nicht da");
    }
    res.writeHead(200, {
      "Content-Type": TYPEN[path.extname(ziel)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(ziel).pipe(res);
  });
}

(async () => {
  if (!fs.existsSync(path.join(ROOT, PAGE))) {
    console.log("KEIN BILD: " + path.join(ROOT, PAGE) + " gibt es nicht.");
    process.exit(4);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const srv = server();
  await new Promise(r => srv.listen(0, "127.0.0.1", r));
  const basis = "http://127.0.0.1:" + srv.address().port + "/" + PAGE;

  const browser = await pw.chromium.launch();
  const bilder = [];
  try {
    for (const g of GERAETE) {
      const ctx = await browser.newContext({
        viewport: { width: g.w, height: g.h },
        deviceScaleFactor: g.dsf,
        isMobile: g.mobil,
        hasTouch: g.mobil
      });
      const seite = await ctx.newPage();
      await seite.goto(basis, { waitUntil: "networkidle" }).catch(() => {});
      await seite.waitForTimeout(WARTEN);

      const datei = path.join(OUT, g.name + ".png");
      if (SELECTOR) {
        const el = await seite.$(SELECTOR);
        if (!el) { console.log("Hinweis: " + SELECTOR + " nicht gefunden (" + g.name + ") - ganze Ansicht."); }
        await (el || seite).screenshot({ path: datei });
      } else {
        await seite.screenshot({ path: datei });
      }
      bilder.push(datei);
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }

  console.log("BILDER FERTIG:");
  for (const b of bilder) {
    console.log("  " + b + "  (" + Math.round(fs.statSync(b).size / 1024) + " kB)");
  }
})().catch(e => { console.log("KEIN BILD: " + e.message); process.exit(5); });
