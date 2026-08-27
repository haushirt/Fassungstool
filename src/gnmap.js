/* ═══════════════════════════════════════════════════════════════════════
   Kassenname → Artikel

   Weine folgen einem verbindlichen Muster: KÜRZEL Winzer, Wein Grösse.
   Das Rebsorten-Kürzel bestätigt den Treffer gegen — 14 von 14 korrekt,
   ohne einen Handgriff.

   Getränke haben keine Systematik, und die Ähnlichkeitssuche trifft
   daneben, ohne es zu merken:

     Raschhofer Pils 0,5l   → schlägt Raschhofer Red Ale vor
     Now-Limo Lemon 0,35l   → schlägt Thomas Henry Bitter Lemon vor
     Prosecco, Serena 0,1l  → schlägt La Farra Prosecco Rosé vor

   Ein falscher Treffer bucht still den falschen Bestand ab. Deshalb geht
   hier nur Wein durch. Jedes Getränk wird einmal von Hand bestätigt und
   ist danach für immer festgelegt.
   ═══════════════════════════════════════════════════════════════════════ */

export const WEINE = [
  {"id": "w001", "winzer": "Leindl", "wein": "Langenlois", "reb": "Grüner Veltliner", "r": "Grüner Veltliner"},
  {"id": "w003", "winzer": "Ott", "wein": "Fass 4", "reb": "Grüner Veltliner", "r": "Grüner Veltliner"},
  {"id": "w002", "winzer": "Simon Gattinger", "wein": "Loiben Federspiel", "reb": "Grüner Veltliner", "r": "Grüner Veltliner"},
  {"id": "w004", "winzer": "Weinberghof Fritsch", "wein": "Ried Schlossberg 1ÖTW", "reb": "Grüner Veltliner", "r": "Grüner Veltliner"},
  {"id": "w005", "winzer": "Hirsch", "wein": "Zöbing", "reb": "Riesling", "r": "Riesling"},
  {"id": "w006", "winzer": "Pichler-Krutzler", "wein": "Loiben", "reb": "Riesling", "r": "Riesling"},
  {"id": "w007", "winzer": "Emrich-Schönleber", "wein": "Mineral", "reb": "Riesling", "r": "Riesling"},
  {"id": "w008", "winzer": "Hannes Sabathi", "wein": "Sauvignon Blanc", "reb": "Sauvignon Blanc", "r": "Sauvignon Blanc"},
  {"id": "w009", "winzer": "Verus", "wein": "Sauvignon Blanc", "reb": "Sauvignon Blanc", "r": "Sauvignon Blanc"},
  {"id": "w010", "winzer": "Hannes Sabathi", "wein": "Weißburgunder", "reb": "Weißburgunder", "r": "Weißburgunder"},
  {"id": "w011", "winzer": "Gesellmann", "wein": "Chardonnay", "reb": "Chardonnay", "r": "Chardonnay"},
  {"id": "w013", "winzer": "Domaine Borgeot", "wein": "Bourgogne Blanc Côte d'Or", "reb": "Chardonnay", "r": "Chardonnay"},
  {"id": "w014", "winzer": "Domaine Pillot", "wein": "Bourgogne Blanc", "reb": "Chardonnay", "r": "Chardonnay"},
  {"id": "w016", "winzer": "Andreas Gsellmann", "wein": "Grauburgunder", "reb": "Grauburgunder", "r": "Grauburgunder"},
  {"id": "w015", "winzer": "Dürnberg", "wein": "Grauburgunder", "reb": "Grauburgunder", "r": "Grauburgunder"},
  {"id": "w017", "winzer": "Josef Fritz", "wein": "Wagram Terrassen", "reb": "Roter Veltliner", "r": "Roter Veltliner"},
  {"id": "w018", "winzer": "Muster", "wein": "Gelber Muskateller Styria", "reb": "Gelber Muskateller", "r": "Muskateller"},
  {"id": "w019", "winzer": "Ingrid Groiss", "wein": "Anna's 17", "reb": "Gemischter Satz", "r": "Gemischter Satz"},
  {"id": "w020", "winzer": "Mayer am Pfarrplatz", "wein": "Wiener Gemischter Satz", "reb": "Gemischter Satz", "r": "Gemischter Satz"},
  {"id": "w023", "winzer": "Bründlmayer", "wein": "Spiegel", "reb": "Grauburgunder / Weißburgunder", "r": "Cuvée"},
  {"id": "w022", "winzer": "Heinrich (f. U&K)", "wein": "Tulpe", "reb": "Weißburgunder / Chardonnay", "r": "Cuvée"},
  {"id": "w060", "winzer": "Muster (U&K)", "wein": "Fräulein Klein", "reb": "Muskateller-Cuvée", "r": "Cuvée"},
  {"id": "w021", "winzer": "Wolfgang Seher", "wein": "Wilde Reben", "reb": "GV / Riesling / Muskateller", "r": "Cuvée"},
  {"id": "w045", "winzer": "Dürnberg", "wein": "Blanc de Noir", "reb": "Zweigelt", "r": "Zweigelt"},
  {"id": "w043", "winzer": "Fritsch (Karl)", "wein": "Wagram Rosé", "reb": "Zweigelt", "r": "Zweigelt"},
  {"id": "w046", "winzer": "Ultimate Provence", "wein": "UP Rosé", "reb": "Cinsault / Grenache / Syrah / Rolle", "r": "Cuvée"},
  {"id": "w026", "winzer": "Glatzer", "wein": "Rubin Carnuntum", "reb": "Zweigelt", "r": "Zweigelt"},
  {"id": "w027", "winzer": "Glatzer", "wein": "Dornenvogel", "reb": "Zweigelt Reserve", "r": "Zweigelt"},
  {"id": "w025", "winzer": "Kollwentz", "wein": "Leithakalk", "reb": "Zweigelt", "r": "Zweigelt"},
  {"id": "w024", "winzer": "Werner Achs", "wein": "Goldberg", "reb": "Zweigelt", "r": "Zweigelt"},
  {"id": "w031", "winzer": "Moric", "wein": "Reserve", "reb": "Blaufränkisch", "r": "Blaufränkisch"},
  {"id": "w030", "winzer": "Muhr", "wein": "Samt & Seide", "reb": "Blaufränkisch", "r": "Blaufränkisch"},
  {"id": "w028", "winzer": "Nittnaus", "wein": "Kalk & Schiefer", "reb": "Blaufränkisch", "r": "Blaufränkisch"},
  {"id": "w032", "winzer": "Gebeshuber", "wein": "Gumpoldskirchen", "reb": "Pinot Noir", "r": "Pinot Noir"},
  {"id": "w035", "winzer": "Schiefer", "wein": "Pinot Noir", "reb": "Pinot Noir", "r": "Pinot Noir"},
  {"id": "w033", "winzer": "Domaine Confuron-Gindre", "wein": "Bourgogne", "reb": "Pinot Noir", "r": "Pinot Noir"},
  {"id": "w034", "winzer": "Domaine Ecard", "wein": "Savigny-les-Beaune", "reb": "Pinot Noir", "r": "Pinot Noir"},
  {"id": "w036", "winzer": "Dürnberg", "wein": "Elementum", "reb": "Merlot", "r": "Merlot"},
  {"id": "w041", "winzer": "Lamole di Lamole", "wein": "Chianti Classico Duelame", "reb": "Sangiovese", "r": "Sangiovese"},
  {"id": "w042", "winzer": "Ceste", "wein": "Barbera d'Alba Sposabella", "reb": "Barbera", "r": "Barbera"},
  {"id": "w038", "winzer": "Claus Preisinger", "wein": "Heideboden", "reb": "Zw / BF / Merlot", "r": "Cuvée"},
  {"id": "w039", "winzer": "Heinrich", "wein": "Pannobile", "reb": "Zweigelt / Blaufränkisch", "r": "Cuvée"},
  {"id": "w037", "winzer": "Heinrich (f. U&K)", "wein": "Nelke", "reb": "Zweigelt / Blaufränkisch", "r": "Cuvée"},
  {"id": "w040", "winzer": "Werner Achs", "wein": "Xur", "reb": "Zw / BF / St. Laurent", "r": "Cuvée"},
  {"id": "w055", "winzer": "Seher", "wein": "La Petite Frizzante Rosé", "reb": "Pinot Noir", "r": "Schaumwein"},
  {"id": "w056", "winzer": "De Saint Gall", "wein": "Champagne 1er Cru Blanc de Blancs", "reb": "Chardonnay", "r": "Schaumwein"},
  {"id": "w057", "winzer": "La Farra", "wein": "Prosecco Rosé Brut", "reb": "Glera / Pinot Nero", "r": "Schaumwein"},
  {"id": "serena", "winzer": "Serena", "wein": "Piu Frizzante", "reb": "Glera", "r": "Schaumwein"},
  {"id": "w048", "winzer": "Andreas Gsellmann", "wein": "Traminer", "reb": "Traminer", "r": "Traminer"},
  {"id": "w050", "winzer": "Heinrich", "wein": "Roter Traminer Freyheit", "reb": "Roter Traminer", "r": "Traminer"},
  {"id": "w049", "winzer": "Heinrich", "wein": "Muskat Freyheit", "reb": "Muskateller", "r": "Muskateller"},
  {"id": "w052", "winzer": "Heinrich", "wein": "Pinot Freyheit", "reb": "Pinot Noir", "r": "Pinot Noir"},
  {"id": "w047", "winzer": "Claus Preisinger", "wein": "Kalk und Kiesel", "reb": "WB / GV / Welschriesling", "r": "Cuvée"},
  {"id": "w051", "winzer": "Heinrich", "wein": "Naked White", "reb": "WB / Chardonnay / GV", "r": "Cuvée"},
  {"id": "w053", "winzer": "Heinrich", "wein": "Naked Red", "reb": "Zw / BF / St. Laurent", "r": "Cuvée"},
  {"id": "w065", "winzer": "Gesellmann", "wein": "Creitzer Reserve", "reb": "Blaufränkisch", "r": "Blaufränkisch"},
  {"id": "w066", "winzer": "Kollwentz", "wein": "Leithakalk", "reb": "Chardonnay", "r": "Chardonnay"}
];

const KUERZEL = {
  GV:"Grüner Veltliner", RI:"Riesling", RIE:"Riesling", SB:"Sauvignon Blanc",
  WB:"Weißburgunder", CH:"Chardonnay", GB:"Grauburgunder", RV:"Roter Veltliner",
  MU:"Muskateller", MUS:"Muskateller", GS:"Gemischter Satz", GEM:"Gemischter Satz",
  ZW:"Zweigelt", BF:"Blaufränkisch", PN:"Pinot Noir", ME:"Merlot", MER:"Merlot",
  SA:"Sangiovese", BA:"Barbera", TR:"Traminer", CU:"Cuvée", CUV:"Cuvée"
};

const flach = s => String(s || "").toLowerCase()
  .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
  .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/* Gibt eine Artikel-Id zurück oder null. Null heisst: von Hand bestätigen.
   Es gibt bewusst kein „wahrscheinlich" — ein Vorschlag, der still
   durchgeht, ist schlimmer als eine offene Zeile. */
export function mappe(name) {
  const m = /^([A-ZÄÖÜ]{2,3})\s+(.+)$/.exec(String(name).trim());
  if (!m) return null;
  const reb = KUERZEL[m[1].toUpperCase()];
  if (!reb) return null;

  const teil = m[2].split(",");
  const winzer = flach(teil[0]);
  if (!winzer) return null;

  let kand = WEINE.filter(w => {
    const wf = flach(w.winzer);
    return wf === winzer || wf.startsWith(winzer) || winzer.startsWith(wf) || wf.includes(winzer);
  });
  kand = kand.filter(w => flach(w.reb).includes(flach(reb)) || flach(w.r).includes(flach(reb)));

  if (kand.length === 1) return kand[0].id;
  if (kand.length > 1 && teil[1]) {
    const wein = flach(teil[1].replace(/\d+\s*[\/,.]?\d*\s*l?$/, ""));
    const eng = kand.filter(w => flach(w.wein) &&
      (flach(w.wein).includes(wein.split(" ")[0]) || wein.includes(flach(w.wein))));
    if (eng.length === 1) return eng[0].id;
  }
  return null;
}
