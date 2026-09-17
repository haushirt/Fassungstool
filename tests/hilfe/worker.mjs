/* ═══════════════════════════════════════════════════════════════════════
   Prüfgerüst · Worker laden

   `src/index.js` bringt eine Abhängigkeit mit (`postal-mime`), die nur
   für den Mailempfang gebraucht wird und lokal nicht installiert ist
   (`node_modules` fehlt im Repo). Damit der Rest prüfbar bleibt, wird
   eine Kopie im Temp-Verzeichnis angelegt, in der genau diese eine
   Einfuhr durch eine Attrappe ersetzt ist. Die eigenen Module
   (`gnparse.js`, `gnmap.js`) bleiben die echten — sie werden mit
   vollem Pfad eingebunden.

   Am Original wird nichts geändert; die Kopie liegt ausserhalb des
   Repos und wird nie eingecheckt.
   ═══════════════════════════════════════════════════════════════════════ */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { lies, pfad } from "./dateien.mjs";

let geladen = null;

export async function ladeWorker() {
  if (geladen) return geladen;

  const quelle = lies("src", "index.js")
    .replace(/^import PostalMime from "postal-mime";$/m,
      "const PostalMime = { parse: async () => ({ attachments: [] }) };")
    .replace(/from "\.\/(gnparse|gnmap)\.js"/g,
      (_, m) => `from ${JSON.stringify(pathToFileURL(pfad("src", m + ".js")).href)}`);

  const ordner = mkdtempSync(join(tmpdir(), "fassung-pruef-"));
  const ziel = join(ordner, "worker.mjs");
  writeFileSync(ziel, quelle, "utf8");
  geladen = (await import(pathToFileURL(ziel).href)).default;
  return geladen;
}

/* Eine Anfrage an den Worker, mit Keks und IP wie hinter Cloudflare. */
export function anfrage(pfadTeil, opt = {}) {
  const h = new Headers(opt.headers || {});
  h.set("cf-connecting-ip", opt.ip || "10.0.0.1");
  if (opt.keks) h.set("cookie", opt.keks);
  if (opt.body !== undefined && !h.has("content-type"))
    h.set("content-type", "application/json");
  return new Request("https://pruef.local" + pfadTeil, {
    method: opt.method || "GET",
    headers: h,
    body: opt.body === undefined ? undefined
      : (typeof opt.body === "string" ? opt.body : JSON.stringify(opt.body))
  });
}

export const keksAus = antwort => {
  const s = antwort.headers.get("set-cookie") || "";
  return s.split(";")[0];
};
