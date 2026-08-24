/* ══════════════════════════════════════════════════════════════════
   gnmap.js · Positionsnamen aus dem Z-Bericht auf den Stamm zuordnen

   Der Bericht benennt Weine nach einem festen Muster:
       KÜRZEL Winzer, Wein  Ausschankgrösse
       "GV Leindl Langenlois 1/8 l"
       "CR Heinrich für Unger & Klein Nelke 1/8 l"
   Das reicht für einen Vorschlag, nicht für eine Entscheidung. Jede
   Zuordnung wird einmal bestätigt und dann in der Mapping-Tabelle
   festgehalten; ab da läuft sie ohne Rückfrage.
   ══════════════════════════════════════════════════════════════════ */

/* Rebsorten-Kürzel, wie sie in der Kasse geführt werden. */
const KUERZEL = {
  GV: "Grüner Veltliner", RI: "Riesling", SB: "Sauvignon Blanc",
  WB: "Weißburgunder", CH: "Chardonnay", GB: "Grauburgunder",
  RV: "Roter Veltliner", MU: "Muskateller", GS: "Gemischter Satz",
  CW: "Cuvée Weiss", TR: "Traminer",
  ZW: "Zweigelt", BF: "Blaufränkisch", PN: "Pinot Noir", ME: "Merlot",
  SA: "Sangiovese", BA: "Barbera", CR: "Cuvée Rot",
  RS: "Rosé", NW: "Naturwein", SW: "Schaumwein"
};

/* Gebindegrössen: woraus wird ausgeschenkt. Wein 0,75 l als Standard,
   Getränke tragen ihre Grösse meist im Namen. */
const GEBINDE_WEIN = 750;

const OHNE = new Set(["fuer", "für", "und", "de", "di", "der", "die", "das", "am", "vom", "von", "im"]);

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const tokens = s => norm(s).split(" ").filter(t => t.length > 1 && !OHNE.has(t));

/* Kürzel am Anfang abtrennen: "GV Leindl Langenlois" → {kz:"GV", rest:"Leindl Langenlois"} */
function kuerzel(kern) {
  const m = /^([A-Z]{2})\s+(.+)$/.exec(String(kern).trim());
  if (m && KUERZEL[m[1]]) return { kz: m[1], reb: KUERZEL[m[1]], rest: m[2] };
  return { kz: null, reb: null, rest: String(kern).trim() };
}

/* Wie stark decken sich zwei Tokenmengen? Seltene, lange Token
   (Winzernamen) wiegen schwerer als kurze. */
function deckung(a, b) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let treffer = 0, gewicht = 0;
  for (const t of a) {
    const g = Math.min(t.length, 8);
    gewicht += g;
    if (setB.has(t)) treffer += g;
    else if (b.some(x => x.startsWith(t) || t.startsWith(x))) treffer += g * 0.7;
  }
  return treffer / gewicht;
}

function baueIndex(WINES, GETR) {
  const eintraege = [];
  for (const w of WINES) {
    eintraege.push({
      artikel: w.id, art: "wein",
      bez: `${w.winzer} · ${w.wein}${w.jg && w.jg !== "?" ? " " + w.jg : ""}`,
      tok: tokens(`${w.winzer} ${w.wein}`),
      reb: norm(w.reb || ""), farbe: w.f,
      gebindeMl: GEBINDE_WEIN
    });
  }
  const namen = (GETR && GETR.name) || {};
  for (const id of Object.keys(namen)) {
    const n = namen[id];
    /* Gebinde aus dem Stammnamen, z. B. "Gasteiner 0,25 l" */
    const m = [...String(n).matchAll(/(\d+(?:,\d+)?)\s*l\b/gi)].pop();
    const ml = m ? Math.round(parseFloat(m[1].replace(",", ".")) * 1000) : null;
    eintraege.push({
      artikel: "getr:" + id, art: "getraenk",
      bez: n, tok: tokens(n), reb: "", farbe: null, gebindeMl: ml
    });
  }
  return eintraege;
}

/* Ein Vorschlag je Position. sicherheit: 0…1 */
function vorschlag(pos, index) {
  const { kz, reb, rest } = kuerzel(pos.kern);
  const tok = tokens(rest);
  if (!tok.length) return null;

  let best = null;
  for (const e of index) {
    let s = deckung(tok, e.tok);
    /* Rebsorten-Kürzel bestätigt oder widerlegt den Treffer. */
    if (reb && e.art === "wein") {
      const rn = norm(reb);
      if (e.reb.includes(rn) || rn.includes(e.reb)) s += 0.25;
      else if (reb === "Rosé" && e.farbe === "ROSÉ") s += 0.25;
      else if (reb === "Naturwein" && e.farbe === "NATURAL") s += 0.2;
      else if (reb === "Cuvée Rot" && e.farbe === "ROT") s += 0.1;
      else s -= 0.2;
    }
    /* Ein Wein-Kürzel schliesst Getränke aus. */
    if (kz && e.art === "getraenk") s -= 0.5;
    if (best == null || s > best.s) best = { s, e };
  }
  if (!best || best.s < 0.35) return null;
  return {
    artikel: best.e.artikel, bez: best.e.bez, art: best.e.art,
    gebindeMl: best.e.gebindeMl, sicherheit: Math.min(1, best.s)
  };
}

/* Alle Positionen zuordnen. bestand = bereits bestätigte Mapping-Zeilen. */
function gnMap(positionen, WINES, GETR, bestand) {
  const index = baueIndex(WINES, GETR);
  const fest = bestand || {};
  const zugeordnet = [], offen = [], ignoriert = [];

  for (const p of positionen) {
    const f = fest[p.name];
    if (f && f.status === "ignoriert") { ignoriert.push({ pos: p }); continue; }
    if (f && f.status === "zugeordnet") {
      zugeordnet.push({ pos: p, artikel: f.artikel, gebindeMl: f.gebinde_ml, quelle: "mapping", sicherheit: 1 });
      continue;
    }
    const v = pos_ist_ware(p) ? vorschlag(p, index) : null;
    /* Nur Weine mit Rebsorten-Kürzel gehen ohne Rückfrage durch: dort
       ist das Namensmuster verbindlich und das Kürzel bestätigt die
       Sorte. Getränkenamen sind Handelsnamen ohne Systematik — dort
       trifft die Automatik zwar oft, aber wenn sie danebenliegt
       ("Raschhofer Pils" → "Raschhofer Red Ale"), bucht sie still den
       falschen Bestand ab. Ein falscher Treffer ist teurer als eine
       Rückfrage, die einmal im Leben kommt. */
    const sicher = v && v.art === "wein" && kuerzel(p.kern).kz && v.sicherheit >= 0.6;
    if (sicher) {
      zugeordnet.push({
        pos: p, artikel: v.artikel, bez: v.bez,
        gebindeMl: v.gebindeMl || p.ml, quelle: "vorschlag", sicherheit: v.sicherheit
      });
    } else {
      offen.push({ pos: p, vorschlag: v });
    }
  }
  return { zugeordnet, offen, ignoriert };
}

/* Positionen ohne Volumenangabe sind Speisen, Kaffee, Cocktails,
   Beilagen — für den Kellerabgleich uninteressant. Sie kommen erst
   gar nicht in die Warteschlange, sonst ertrinkt sie. */
function pos_ist_ware(p) {
  return p.ml != null;
}

/* Verbrauch je Artikel in Flaschen. */
function verbrauch(zuordnungen) {
  const topf = new Map();
  for (const z of zuordnungen) {
    const gm = z.gebindeMl || z.pos.ml;
    if (!gm) continue;
    const flaschen = (z.pos.ml * z.pos.anzahl) / gm;
    if (!topf.has(z.artikel)) topf.set(z.artikel, { artikel: z.artikel, bez: z.bez, ml: 0, flaschen: 0, quellen: [] });
    const t = topf.get(z.artikel);
    t.ml += z.pos.ml * z.pos.anzahl;
    t.flaschen += flaschen;
    t.quellen.push(`${z.pos.anzahl}× ${z.pos.einheitRoh || "?"}`);
  }
  return [...topf.values()].sort((a, b) => b.flaschen - a.flaschen);
}

export { gnMap, verbrauch, vorschlag, baueIndex, KUERZEL };
