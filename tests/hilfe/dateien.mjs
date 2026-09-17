/* ═══════════════════════════════════════════════════════════════════════
   Prüfgerüst · Dateizugriff
   Haus Hirt · Fassungstool

   Alles hier läuft mit Bordmitteln von Node (Version 22 oder neuer):
   `node --test tests/`. Kein Netz, keine Installation, keine
   Abhängigkeit — Regel 8 erlaubt keine neue.

   Die Prüfungen lesen die echten Dateien aus dem Arbeitsverzeichnis.
   Nichts wird kopiert, nichts wird verändert.
   ═══════════════════════════════════════════════════════════════════════ */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const pfad = (...t) => join(WURZEL, ...t);
export const gibt = (...t) => existsSync(pfad(...t));
export const lies = (...t) => readFileSync(pfad(...t), "utf8");
export const listet = (...t) => (gibt(...t) ? readdirSync(pfad(...t)) : []);

/* Der Inline-Block aus einer der HTML-Dateien. Ohne Bauschritt steht das
   ganze Programm in <script>…</script>; ein Syntaxfehler darin fällt
   ohne diese Prüfung erst auf dem iPhone auf, im Keller, ohne Netz. */
export function inlineSkript(datei = "public/index.html") {
  const h = lies(datei);
  const a = h.indexOf("<script>");
  const e = h.lastIndexOf("<\/script>");
  if (a < 0 || e < 0) throw new Error(datei + ": kein <script>-Block gefunden");
  return h.slice(a + 8, e);
}

/* Ein zusammenhängendes Stück aus dem Inline-Block, von Marke zu Marke.
   Zeilennummern altern in einer 4 300-Zeilen-Datei binnen einer Runde —
   Marken nicht. */
export function ausschnitt(von, bis, datei = "public/index.html") {
  const s = inlineSkript(datei);
  const a = s.indexOf(von);
  if (a < 0) throw new Error("Anfangsmarke nicht gefunden: " + von);
  const e = s.indexOf(bis, a);
  if (e < 0) throw new Error("Endmarke nicht gefunden: " + bis);
  return s.slice(a, e);
}
