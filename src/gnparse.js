/* ══════════════════════════════════════════════════════════════════
   gnparse.js · gastronovi Z-Bericht einlesen
   Reines JavaScript, keine Abhängigkeiten. Läuft im Cloudflare Worker
   und im Browser gleichermassen.

   Der Bericht ist kein Tabellen-CSV, sondern ein Sektionsdokument:
   vier gequotete Spalten, Tabulator als Trenner, Sektionen zwischen
   Strichlinien. Uns interessiert ausschliesslich die Sektion
   "Positionen"; alles andere wird als Kopfdaten mitgenommen.
   ══════════════════════════════════════════════════════════════════ */

/* Eine Zeile in ihre vier Felder zerlegen. Der Bericht quotet alles,
   auch leere Felder. Doppelte Anführungszeichen im Text kommen vor
   (Anna's 17 nicht, aber Zoll-Angaben schon) und werden entpackt. */
function zeile(s) {
  const f = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') {
      let v = "";
      i++;
      while (i < s.length) {
        if (s[i] === '"' && s[i + 1] === '"') { v += '"'; i += 2; continue; }
        if (s[i] === '"') { i++; break; }
        v += s[i++];
      }
      f.push(v);
    } else {
      let v = "";
      while (i < s.length && s[i] !== "\t") v += s[i++];
      f.push(v);
    }
    if (s[i] === "\t") i++;
  }
  return f;
}

const istStrich = v => /^-{5,}$/.test(v) || /^#{5,}$/.test(v);

/* "1.234,50" → 1234.5 · "" → null */
function zahl(v) {
  if (v == null || v === "") return null;
  const t = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  if (t === "" || t === "-") return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

/* "22.08.2026 23:59" → {iso:"2026-08-22", ts:…} */
function stempel(v) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(v || "");
  if (!m) return null;
  const [, d, mo, y, hh, mi] = m;
  return {
    iso: `${y}-${mo}-${d}`,
    ts: Date.UTC(+y, +mo - 1, +d, +(hh || 0), +(mi || 0))
  };
}

/* ── Mengeneinheit aus dem Positionsnamen ──────────────────────────
   Der Name trägt die Ausschankgrösse am Ende:
     "GV Leindl Langenlois 1/8 l"   → 125 ml
     "CR Werner Achs, Xur 0,75 l"   → 750 ml
     "Prosecco, Serena 0,1l"        → 100 ml
     "Negroni 1 Glas"               → Stück, kein Volumen
   Manche Positionen führen die Grösse doppelt ("Apfel gespritzt 0,25l
   0,25l") — es gilt das letzte Vorkommen. */
function einheit(name) {
  const n = String(name);
  let ml = null, roh = null;

  const bruch = [...n.matchAll(/(\d+)\s*\/\s*(\d+)\s*l?\b/gi)].pop();
  if (bruch) { ml = Math.round((+bruch[1] / +bruch[2]) * 1000); roh = bruch[0].trim(); }

  const liter = [...n.matchAll(/(\d+(?:,\d+)?)\s*l\b/gi)].pop();
  if (liter && !/^\d+\s*\/\s*\d+/.test(liter[0])) {
    const v = zahl(liter[1]);
    if (v != null && v > 0 && v <= 5) { ml = Math.round(v * 1000); roh = liter[0].trim(); }
  }

  const stueck = /\b(\d+)\s*(Glas|Gläser|Tasse|Tassen|Portion|Person|Personen|Stk|Stück)\b/i.exec(n);
  if (ml == null && stueck) { roh = stueck[0].trim(); }

  return { ml, roh, stueck: ml == null };
}

/* Namen ohne die Mengenangabe am Ende — das ist der Teil, der die
   Zuordnung trägt. */
function kern(name) {
  let t = String(name);
  /* Mehrfach abstreifen: manche Positionen führen die Grösse doppelt
     ("Apfel gespritzt 0,25l 0,25l"). */
  for (let i = 0; i < 4; i++) {
    const vor = t;
    t = t
      .replace(/\s*\d+\s*\/\s*\d+\s*l?\s*$/i, "")
      .replace(/\s*\d+(?:,\d+)?\s*l\s*$/i, "")
      .replace(/\s*\d+\s*(Glas|Gläser|Tasse|Tassen|Portion|Person|Personen|Stk|Stück)\s*$/i, "")
      .trim();
    if (t === vor) break;
  }
  return t.replace(/\s{2,}/g, " ").replace(/[,;]\s*$/, "").trim();
}

/* ── Hauptfunktion ────────────────────────────────────────────────── */
function gnParse(text) {
  const roh = String(text).replace(/^\uFEFF/, "");
  const zeilen = roh.split(/\r?\n/).map(zeile);

  /* Sektionskopf ist dreizeilig:  ─────  /  Name [+ Spaltentitel]  /  ─────
     Danach folgen die Datenzeilen bis zur nächsten Leerzeile bzw. zum
     nächsten Kopf. Kapitelmarken (#####) haben dieselbe Form und
     werden gleich behandelt; sie liefern nur keine Daten. */
  const kopf = {};
  const sektionen = {};
  let aktuell = null;
  let phase = 0;                       // 0 = Daten, 1 = Name erwartet, 2 = Endstrich erwartet

  for (const f of zeilen) {
    const a = (f[0] || "").trim();
    const b = (f[1] || "").trim();

    if (istStrich(a)) {
      if (phase === 2) phase = 0;      // Endstrich des Kopfes
      else phase = 1;                  // Anfangsstrich
      continue;
    }
    if (a === "" && b === "") continue;

    if (phase === 1) {
      aktuell = a;
      if (!sektionen[aktuell]) sektionen[aktuell] = { spalten: f.slice(1).filter(Boolean), zeilen: [] };
      phase = 2;
      continue;
    }

    if (aktuell) sektionen[aktuell].zeilen.push(f);
    else kopf[a] = b;
  }

  /* Kopfdaten stehen in der Sektion "Zeitraum" */
  const z = sektionen["Zeitraum"];
  const meta = { kostenstelle: null, z: null, von: null, bis: null, tag: null };
  if (z) for (const f of z.zeilen) {
    const k = (f[0] || "").trim(), v = (f[1] || "").trim();
    if (/^Kostenstelle$/i.test(k)) meta.kostenstelle = v;
    else if (/^Z$/i.test(k)) meta.z = v;
    else if (/^Von$/i.test(k)) meta.von = stempel(v);
    else if (/^Bis$/i.test(k)) meta.bis = stempel(v);
  }
  /* Betriebstag ist der Tag des Berichtsendes. Ein Z, der um 00:44
     beginnt, gehört trotzdem zum Vortag des Abrufs. */
  meta.tag = meta.bis ? meta.bis.iso : (meta.von ? meta.von.iso : null);

  /* ── Positionen ──────────────────────────────────────────────────
     Achtung: derselbe Name kommt mehrfach vor — gleicher Artikel,
     verschiedene Kostenstellen oder Preisstufen ("GV Leindl 1/8 l"
     6×36,00 und 2×12,00). Wird nicht summiert, fehlen Flaschen.
     Nullpreis-Zeilen (Haus-Einladung, Welcomedrink) zählen mit:
     ausgeschenkt wurde trotzdem. */
  const topf = new Map();
  const posSek = sektionen["Positionen"];
  if (posSek) for (const f of posSek.zeilen) {
    const name = (f[0] || "").trim();
    if (!name) continue;
    const anzahl = zahl(f[1]);
    if (anzahl == null) continue;
    const betrag = zahl(f[2]) || 0;
    const e = einheit(name);
    const key = name;
    if (!topf.has(key)) {
      topf.set(key, {
        name, kern: kern(name),
        ml: e.ml, einheitRoh: e.roh, stueck: e.stueck,
        anzahl: 0, betrag: 0, zeilen: 0
      });
    }
    const p = topf.get(key);
    p.anzahl += anzahl;
    p.betrag += betrag;
    p.zeilen++;
  }

  const positionen = [...topf.values()].map(p => ({
    ...p,
    volumenMl: p.ml != null ? p.ml * p.anzahl : null
  })).sort((a, b) => a.name.localeCompare(b.name, "de"));

  /* Warengruppe je Position gibt es im Bericht nicht — die Sektion
     "Warengruppen" ist eine eigene Summenliste. Wir geben sie mit
     zurück, damit die Leitungsseite grob gegenprüfen kann. */
  const warengruppen = (sektionen["Warengruppen"]?.zeilen || [])
    .map(f => ({ name: (f[0] || "").trim(), anzahl: zahl(f[1]), betrag: zahl(f[2]) }))
    .filter(x => x.name && x.anzahl != null);

  const storno = (sektionen["Stornierte Artikel"]?.zeilen || [])
    .map(f => ({ grund: (f[0] || "").trim(), anzahl: zahl(f[1]), betrag: zahl(f[2]) }))
    .filter(x => x.grund && x.anzahl != null);

  const rabatte = (sektionen["Rabatte"]?.zeilen || [])
    .map(f => ({ art: (f[0] || "").trim(), anzahl: zahl(f[1]), betrag: zahl(f[2]) }))
    .filter(x => x.art && x.anzahl != null);

  return { meta, positionen, warengruppen, storno, rabatte, sektionen: Object.keys(sektionen) };
}

/* Erkennung: ist das überhaupt ein gastronovi Z-Bericht? */
function gnErkennt(text) {
  const kopf = String(text).slice(0, 400);
  return /"Z-Bericht"/.test(kopf) || /"Kostenstelle"\t/.test(kopf);
}

export { gnParse, gnErkennt, einheit, kern, zahl, stempel };
