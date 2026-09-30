/* Runde 24 · Die gastronovi-Artikelliste steht zweimal: als Datei
   (docs/gastronovi-artikel.csv, so wie Casimir sie geliefert hat) und als
   `GN_ARTIKEL` in public/leitung.html. Diese Prüfung hält beide wortgleich. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const csv = fs.readFileSync(new URL("../docs/gastronovi-artikel.csv", import.meta.url), "utf8")
  .trim().split("\n").slice(1).map(l => l.split(";"));
const html = fs.readFileSync(new URL("../public/leitung.html", import.meta.url), "utf8");
const block = html.slice(html.indexOf("const GN_ARTIKEL=["), html.indexOf("];", html.indexOf("const GN_ARTIKEL=[")) + 1);
const liste = JSON.parse(block.slice(block.indexOf("[")));

test("GN_ARTIKEL ist wortgleich mit docs/gastronovi-artikel.csv", () => {
  assert.equal(liste.length, csv.length);
  assert.deepEqual(liste, csv);
});
test("jede Zeile hat Titel und Mengenbeschreibung", () => {
  for (const [t, m] of liste) { assert.ok(t && t.trim() === t); assert.ok(m && m.trim() === m); }
});
