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

/* Strichlinie. Der echte Bericht (Nr. 37) trennt die drei grossen Teile
   — Z-Bericht, Detailbericht, Abrechnung — mit Rauten statt Strichen;
   ohne sie stünde „Detailbericht" als Zeile im Positionsblock. */
const istStrich = z => /^[\s"'\-–—_=#]*[-–—_=#]{5,}[\s"'\-–—_=#]*$/.test(z);

/* Ausschankmenge in Millilitern. Es gilt das letzte Vorkommen im Namen.

   Der Bruch steht VOR der Einheit und schluckt sie mit: Im echten Bericht
   heisst der offene Wein „GV Leindl Langenlois 1/8 l" — ein Achtel Liter.
   Bis zum 17.09. griff hier die Einheitensuche zuerst, las „8 l" und gab
   8000 ml zurück: Faktor 64 auf jedem offenen Wein, und damit auf der
   halben Weinkarte. Aufgefallen ist es erst am ersten echten Z-Bericht;
   der nachgebaute schrieb „1/8" ohne Einheit und traf die Falle nie. */
export function ml(text) {
  if (!text) return null;
  const s = String(text).toLowerCase();
  let letzte = null, m;
  const rx = /(\d)\s*\/\s*(\d)\s*l?\b|(\d+(?:[.,]\d+)?)\s*(ml|cl|l)\b/g;
  while ((m = rx.exec(s))) letzte = m;
  if (!letzte) return null;
  if (letzte[1]) return 1000 * (+letzte[1] / +letzte[2]);   // 1/8 l = 125 ml
  const v = parseFloat(letzte[3].replace(",", "."));
  return letzte[4] === "ml" ? v : letzte[4] === "cl" ? v * 10 : v * 1000;
}

/* Kernbezeichnung: der Positionsname ohne die Grössenangabe am Ende.

   `fassungszeile.kern` ist live NOT NULL und steht neben `rohbez`. Der
   Rohname trägt die Grösse mit („GV Leindl, Langenlois 1/8", „… 0,75l"),
   und derselbe Wein kommt in zwei Grössen als zwei Positionen. Der Kern
   ist das, was beide gemeinsam haben — die Stelle, an der später Glas
   und Flasche zusammenfinden, ohne dass jemand `rohbez` zerlegen muss.

   Bewusst nur ABSCHNEIDEN, nicht normalisieren: kein Kleinschreiben,
   keine Umlautauflösung. `rohbez` bleibt daneben unverändert stehen
   (Regel 7: doppelte Grössensuffixe, zwei Herkünfte). Ist nach dem
   Schnitt nichts mehr übrig, gilt der Rohname — die Spalte darf nie
   leer sein. */
export function kern(name) {
  const s = String(name || "").trim();
  let t = s, vorher;
  /* Schleife, weil die Grösse doppelt dastehen kann („Zweigelt 0,75 l
     0,125 l", Eigenheit 3). Ein einzelner Schnitt liesse die erste
     Angabe stehen. */
  do {
    vorher = t;
    /* Der Bruch MIT Einheit zuerst („… 1/8 l"): Schnitte die Einheit
       allein zuerst, bliebe „GV Leindl Langenlois 1/" stehen — und Glas
       und Flasche desselben Weins fänden nie zusammen. */
    t = t.replace(/[\s,;·|]*\b\d\s*\/\s*\d\s*(?:ml|cl|l)\b\.?\s*$/i, "")
         .replace(/[\s,;·|]*\b\d+(?:[.,]\d+)?\s*(?:ml|cl|l)\b\.?\s*$/i, "")
         .replace(/[\s,;·|]*\b\d\s*\/\s*\d\b\s*$/, "")
         .replace(/[\s,;·|]+$/, "")
         .trim();
  } while (t !== vorher);
  return t || s;
}

/* Ortszeit aus dem Kopf des Berichts → Zeitstempel.

   Der Bericht schreibt Wiener Zeit („15.09.2026 23:11"), der Worker läuft
   in UTC (`src/index.js`, Kopf von `wienTag`). Ohne Umrechnung stünde in
   `fassungsliste.von_ts` eine Zahl, die zwei Stunden danebenliegt und im
   Winter anders als im Sommer — genau die Art Fehler, die erst im
   November auffällt.

   Gerechnet wird ohne Bibliothek: einmal blind als UTC, dann den Versatz
   messen, den `Europe/Vienna` zu diesem Augenblick hat, und abziehen.
   Zweimal, weil der erste Versuch in der Nacht der Zeitumstellung um eine
   Stunde daneben liegen kann und der zweite darauf aufsetzt. */
const versatz = ms => {
  const t = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna", hour12: false, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(new Date(ms));
  const p = Object.fromEntries(t.map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
};

/* `null`, wenn keine UHRZEIT dabeisteht. Ein Datum allein als Mitternacht
   abzulegen wäre eine erfundene Zahl; dann bleibt die Spalte lieber leer,
   wie bisher. */
export function zeitpunkt(text) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})[\s,]+(\d{1,2}):(\d{2})/.exec(String(text || ""));
  if (!m) return null;
  const roh = Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
  let ms = roh - versatz(roh);
  ms = roh - versatz(ms);
  return ms;
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
    /* Eine Leerzeile des Berichts ist `""\t""\t""\t""` — nach `trim()`
       nicht leer, sondern vier leere Felder. Ohne diese Zeile stünde in
       jeder Sektion eine Geisterzeile, und die Zählung darunter
       behauptete Positionszeilen, wo keine sind. */
    if (!f.some(x => x !== "")) return;
    /* Eine Sektion beginnt nach einer Strichlinie — entweder mit einem
       nackten Titel („Zeitraum") oder, und das ist die Form des echten
       Berichts, mit einer Spaltenüberschrift: „Positionen | Anzahl |
       Betrag". Bis zum 17.09. galt nur die erste Form. Damit fiel im
       echten Bericht Nr. 37 KEINE einzige Tabelle auf eine eigene
       Sektion: Kostenstellen, Kellner, Bezahlarten, Warengruppen und die
       Positionen landeten alle im „Steuerbericht", und `parseZ` las 106
       Positionen mit 1345,75 Stück und 5166,70 € statt 50 mit 145 und
       602,50 €. Unterschieden wird an den Zahlen: In einer Überschrift
       steht rechts keine. */
    const ueberschrift = f.slice(1).every(x => x === "" || zahl(x) === null);
    if (strichZuvor && (f.filter(x => x !== "").length === 1 || ueberschrift)) {
      akt = { titel: f.find(x => x !== "") || "(ohne Titel)", zeilen: [] };
      sekt.push(akt); strichZuvor = false; return;
    }
    strichZuvor = false;
    akt.zeilen.push(f);
  });

  /* Betriebstag: das Datum hinter „Bis".

     Im selben Durchgang der Zeitraum („Von"/„Bis" mit Uhrzeit) und die
     Kostenstelle. Beide stehen seit jeher im Kopf des Berichts und haben
     live eine eigene Spalte (`fassungsliste.von_ts`, `bis_ts`,
     `kostenstelle`) — bis Runde 21 hat sie nur niemand gelesen
     (review/OFFENE-ENTSCHEIDUNGEN.md Nr. 11). Der Betriebstag wird
     weiterhin aus „Bis" abgeleitet, unverändert; die Uhrzeit kommt
     zusätzlich mit, sie ersetzt nichts.

     Wozu: An „von wann bis wann" sieht die Leitung ohne Rechnen, ob ein
     Bericht die ganze Nacht abdeckt oder nur den halben Abend — der Fall,
     in dem Bar und Restaurant getrennt abschliessen. */
  let tag = "", von = null, bis = null, kostenstelle = "";
  for (const z of alle) {
    const f = felder(z);
    const k = (f[0] || "").toLowerCase();
    const rest = f.slice(1).join(" ");
    /* Genau „Kostenstelle", nicht `\b`: vier Zeilen weiter unten beginnt
       die Tabelle „Kostenstellen | Anzahl | Betrag" mit Bar und Restaurant.
       Die ist eine Aufteilung des Tages, keine Kostenstelle des Berichts. */
    if (!kostenstelle && /^kostenstelle$/.test(k) && rest.trim()) kostenstelle = rest.trim();
    if (von == null && /^von\b/.test(k)) von = zeitpunkt(rest || f[0]);
    if (/^bis\b/.test(k)) {
      if (bis == null) bis = zeitpunkt(rest || f[0]);
      if (!tag) {
        const d = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(rest || f[0]);
        if (d) tag = `${d[3]}-${String(d[2]).padStart(2, "0")}-${String(d[1]).padStart(2, "0")}`;
      }
    }
    if (tag && von != null && bis != null && kostenstelle) break;
  }
  /* Die Z-Nummer steht im echten Bericht als eigene Zeile in zwei
     Feldern („Z" | „37"); der Kopf anderer Häuser schreibt sie in einen
     Satz („Tagesabschluss Z 417"). Beide Formen, Felder zuerst — im
     gequoteten Bericht steht zwischen Z und Nummer ein Anführungszeichen
     und ein Tabulator, an denen die Suche im Fliesstext scheitert. */
  let nr = "";
  for (const z of alle.slice(0, 25)) {
    const f = felder(z);
    if (/^z$/i.test(f[0] || "") && zahl(f[1]) != null) { nr = "Z " + f[1].trim(); break; }
  }
  if (!nr) {
    const mz = /Z\s*(\d+)/.exec(alle.slice(0, 25).join(" "));
    if (mz) nr = "Z " + mz[1];
  }

  /* Positionsblock. Zuerst beim Namen: Der echte Bericht überschreibt ihn
     mit „Positionen", und daneben stehen „Warengruppen" und
     „Warengruppen (inner/außer Haus)" — zwei Tabellen, die dieselben
     Artikel noch einmal zusammengefasst enthalten. Über die blosse Zahl
     der Zeilen gewinnt der Positionsblock nur, solange ein Haus mehr
     Artikel als Warengruppen führt. Das ist keine Eigenschaft, auf die
     man sich verlässt.
     Ohne einen solchen Namen bleibt es beim Alten: die Sektion mit den
     meisten Zeilen aus Text und Zahl. Das ist weiter die einzige Abwehr
     gegen den Zahlungsartenblock. */
  const zaehl = s => s.zeilen.filter(f =>
    f.length >= 2 && f[0] && !/^\d/.test(f[0]) && zahl(f[1]) != null).length;
  const NAME = /^(positionen|artikel|artikelums(a|ä)tze)$/i;
  /* Zwei Positionsblöcke heisst: der Bericht ist gespalten, und `parseZ`
     liest nur einen davon (review/OFFENE-ENTSCHEIDUNGEN.md Nr. 12 —
     nicht auf Verdacht behoben, Regel 7). Gezählt werden ausdrücklich
     nur Blöcke, die wie ein Positionsblock HEISSEN: Warengruppen,
     Kostenstellen und Bezahlarten stehen in jedem Bericht und sind
     Zusammenfassungen, kein zweiter Ausschank. Ohne diese Enge schlüge
     die Meldung bei jedem kleineren Bericht an. */
  const namensBloecke = sekt.filter(s => NAME.test(s.titel) && zaehl(s) > 0).length;
  let beste = sekt.find(s => NAME.test(s.titel) && zaehl(s) > 0) || null;
  let bestN = beste ? zaehl(beste) : 0;
  if (!beste) sekt.forEach(s => {
    const n = zaehl(s);
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

  /* Rabatte und Stornos — beides ist Verbrauch (Vorgabe des Betreibers:
     die Ware ist in beiden Fällen aus dem Keller heraus).

     RABATT: Die Ware steht bereits im Positionsblock, zum vollen Preis.
     Der Rabatt zieht nur am Geld. Im echten Bericht Nr. 37 geht die
     Rechnung auf: Positionen 602,50 − Rabatt 52,00 = Umsatz 550,50. Für
     die Fassung ist also nichts hinzuzuzählen — aber wer Euro mit Euro
     vergleicht, vergleicht falsch. Es zählen die Stück.

     STORNO: Die Ware steht NICHT im Positionsblock (602,50 enthält die
     4,20 nicht). Sie fehlt dem Verbrauch also. Der Bericht nennt nur den
     GRUND („Bedienerfehler"), nicht den Artikel — welche Flasche offen
     ist, sagt er nicht. Mehr als Zahl und Betrag ist daraus nicht zu
     holen; beides steht hier, damit es sichtbar bleibt statt lautlos zu
     fehlen. */
  const block = (rx) => {
    const s = sekt.find(x => rx.test(x.titel));
    const zeilen = (s ? s.zeilen : []).filter(f =>
      f.length >= 2 && f[0] && !/^(total|summe|gesamt)/i.test(f[0]) && zahl(f[1]) != null)
      .map(f => ({ name: f[0], anzahl: zahl(f[1]),
                   betrag: (zahl(f[3]) != null ? zahl(f[3]) : zahl(f[2])) || 0 }));
    return { anzahl: zeilen.reduce((a, r) => a + r.anzahl, 0),
             betrag: zeilen.reduce((a, r) => a + r.betrag, 0),
             gruende: zeilen };
  };

  return {
    tag, nr, von, bis, kostenstelle, gespalten: namensBloecke > 1,
    block: beste ? beste.titel : "—",
    /* `n` ist die Zahl der Zeilen, die nach einer Position AUSSEHEN —
       nicht die Zahl der Zeilen überhaupt. Sonst hält die Prüfung auf
       gespaltene Berichte den Bezahlartenblock (eine Buchung, 26
       Zimmernummern darunter) für einen zweiten Positionsblock. */
    sektionen: sekt.map(s => ({ titel: s.titel, n: zaehl(s) })),
    positionen,
    umsatz: positionen.reduce((a, p) => a + (p.umsatz || 0), 0),
    rabatte: block(/^rabatt/i),
    storno: block(/^storn/i)
  };
}
