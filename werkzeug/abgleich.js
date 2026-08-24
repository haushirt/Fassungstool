#!/usr/bin/env node
/* abgleich.js · Z-Bericht einlesen und auswerten
   Aufruf:  node abgleich.js <bericht.csv> [mapping.json]

   Ohne Fassungsdaten zeigt der Läufer nur die Soll-Seite: was laut
   Kasse ausgeschenkt wurde. Sobald die Ereignistabelle steht, tritt
   die Ist-Seite daneben und die Ampel bekommt ihren Sinn.            */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gnParse, gnErkennt } from "../src/gnparse.js";
import { gnMap, verbrauch } from "../src/gnmap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const datei = process.argv[2];
if (!datei) { console.error("Aufruf: node abgleich.js <bericht.csv> [mapping.json]"); process.exit(1); }

const { WINES, GETR } = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "stamm.json"), "utf8"));
const mappingDatei = process.argv[3] || path.join(__dirname, "mapping.json");
const bestand = fs.existsSync(mappingDatei) ? JSON.parse(fs.readFileSync(mappingDatei, "utf8")) : {};

const text = fs.readFileSync(datei, "utf8");
if (!gnErkennt(text)) { console.error("Das ist kein gastronovi Z-Bericht."); process.exit(2); }

const b = gnParse(text);
const m = gnMap(b.positionen, WINES, GETR, bestand);
const v = verbrauch(m.zugeordnet);

const fl = n => n.toFixed(2).replace(".", ",");

console.log(`\nBetriebstag ${b.meta.tag}  ·  Z ${b.meta.z}  ·  ${b.meta.kostenstelle}`);
console.log(`${b.positionen.length} Positionen, davon ${b.positionen.filter(p => p.ml).length} mit Ausschankmenge\n`);

console.log("AUSGESCHENKT LAUT KASSE");
console.log("─".repeat(64));
for (const x of v) console.log(`${fl(x.flaschen).padStart(6)} Fl   ${String(x.bez).padEnd(38)} ${x.quellen.join(" + ")}`);
console.log("─".repeat(64));
console.log(`${fl(v.reduce((a, x) => a + x.flaschen, 0)).padStart(6)} Fl   gesamt\n`);

const offen = m.offen.filter(o => o.pos.ml);
if (offen.length) {
  console.log(`ZUORDNUNG OFFEN — ${offen.length} Positionen, einmalig zu bestätigen`);
  console.log("─".repeat(64));
  for (const o of offen) {
    const v2 = o.vorschlag;
    console.log(`${(o.pos.anzahl + "×").padStart(4)} ${String(o.pos.einheitRoh).padEnd(7)} ${o.pos.name.padEnd(34)} ${v2 ? "~ " + v2.bez : ""}`);
  }
  console.log("\nSolange Positionen offen sind, wird keine Ampel gestellt.\n");
}

if (b.storno.length) {
  const t = b.storno.find(x => /^Total$/i.test(x.grund));
  if (t && t.anzahl) console.log(`Hinweis: ${t.anzahl} stornierte Artikel im Bericht — vor dem ersten Livegang klären, ob sie in "Positionen" bereits abgezogen sind.\n`);
}
