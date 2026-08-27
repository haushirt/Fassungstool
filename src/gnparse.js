/* ═══════════════════════════════════════════════════════════════════════
   gastronovi Z-Bericht einlesen

   Kein Tabellen-CSV, sondern ein Sektionsdokument: vier gequotete Spalten,
   Tabulator als Trenner, Sektionen zwischen Strichlinien, keine Kopfzeile.
   Betriebstag ist das Datum von „Bis".

   Vier Fallen, alle berücksichtigt:
     1  Namen kommen doppelt vor (Bar und Restaurant getrennt gebucht)
        → über den Namen summieren, sonst fehlt ein Viertel des Ausschanks
     2  Nullpreis-Zeilen zählen mit — Welcomedrink und Haus-Einladung
        kosten nichts, ausgeschenkt wurden sie trotzdem
     3  Die Grösse steht im Namen, manchmal doppelt → letztes Vorkommen
     4  Der Positionsblock kennt keine Warengruppe — Fassbier lässt sich
        damit nicht von Flaschenbier trennen. Nur über das Mapping lösbar.
   ═══════════════════════════════════════════════════════════════════════ */

export function zahl(s) {
  if (s == null) return null;
  let t = String(s).trim().replace(/[€\s]/g, "");
  if (!t || !/\d/.test(t)) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
}

export function felder(zeile) {
  return zeile.split("\t").map(f => {
    let t = f.trim();
    if (t.startsWith('"') && t.endsWith('"') && t.length > 1) t = t.slice(1, -1);
    return t.replace(/""/g, '"').trim();
  });
}

const istStrich = z => /^[\s"'\-–—_=]*[-–—_=]{5,}[\s"'\-–—_=]*$/.test(z);

/* Ausschankmenge in Millilitern. Es gilt das letzte Vorkommen im Namen. */
export function ml(text) {
  if (!text) return null;
  const s = String(text).toLowerCase();
  let letzte = null, m;
  const rx = /(\d+(?:[.,]\d+)?)\s*(ml|cl|l)\b/g;
  while ((m = rx.exec(s))) letzte = m;
  if (letzte) {
    const v = parseFloat(letzte[1].replace(",", "."));
    return letzte[2] === "ml" ? v : letzte[2] === "cl" ? v * 10 : v * 1000;
  }
  const br = /(\d)\s*\/\s*(\d)\b/.exec(s);          // 1/8 Wein = 125 ml
  if (br) return 1000 * (+br[1] / +br[2]);
  return null;
}

export function parseZ(text) {
  const alle = String(text).split(/\r?\n/);

  const sekt = [];
  let akt = { titel: "(Kopf)", zeilen: [] }, strichZuvor = false;
  sekt.push(akt);
  alle.forEach(z => {
    if (!z.trim()) return;
    if (istStrich(z)) { strichZuvor = true; return; }
    const f = felder(z).filter((x, i, a) => !(x === "" && i === a.length - 1));
    if (!f.length) return;
    if (strichZuvor && f.filter(x => x !== "").length === 1) {
      akt = { titel: f.find(x => x !== "") || "(ohne Titel)", zeilen: [] };
      sekt.push(akt); strichZuvor = false; return;
    }
    strichZuvor = false;
    akt.zeilen.push(f);
  });

  /* Betriebstag: das Datum hinter „Bis" */
  let tag = "";
  for (const z of alle) {
    const f = felder(z);
    if (/^bis\b/i.test(f[0] || "")) {
      const d = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(f.slice(1).join(" ") || f[0]);
      if (d) { tag = `${d[3]}-${String(d[2]).padStart(2, "0")}-${String(d[1]).padStart(2, "0")}`; break; }
    }
  }
  let nr = "";
  const mz = /Z\s*(\d+)/.exec(alle.slice(0, 25).join(" "));
  if (mz) nr = "Z " + mz[1];

  /* Positionsblock: die Sektion mit den meisten Zeilen aus Text und Zahl */
  let beste = null, bestN = 0;
  sekt.forEach(s => {
    const n = s.zeilen.filter(f =>
      f.length >= 2 && f[0] && !/^\d/.test(f[0]) && zahl(f[1]) != null).length;
    if (n > bestN) { bestN = n; beste = s; }
  });

  const map = {};
  (beste ? beste.zeilen : []).forEach(f => {
    if (f.length < 2) return;
    const name = f[0], anz = zahl(f[1]);
    if (!name || anz == null) return;
    if (/^(summe|gesamt|total|zwischensumme)/i.test(name)) return;
    const um = zahl(f[3]) != null ? zahl(f[3]) : zahl(f[2]);
    if (!map[name]) map[name] = { name, anzahl: 0, umsatz: 0, zeilen: 0, ml: ml(name) };
    map[name].anzahl += anz;
    map[name].umsatz += (um || 0);
    map[name].zeilen++;
  });

  const positionen = Object.values(map).sort((a, b) => b.anzahl - a.anzahl);
  return {
    tag, nr, block: beste ? beste.titel : "—",
    sektionen: sekt.map(s => ({ titel: s.titel, n: s.zeilen.length })),
    positionen,
    umsatz: positionen.reduce((a, p) => a + (p.umsatz || 0), 0)
  };
}
