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

   ── Und seit Runde 22: die Vorabliste ────────────────────────────────

   `mappe()` bleibt Wort für Wort, wie sie war — sie rät weiterhin nicht.
   Daneben steht `VORAB`: eine Liste GANZER Kassennamen, Zeichen für
   Zeichen, jeder einzeln nachgesehen und mit Grund. Das ist nichts
   anderes als das, was die Leitung im Zuordnung-Bildschirm tut — nur
   vorher erledigt. Was dort nicht steht, bleibt offen; ein Name, bei dem
   auch nur ein Zweifel blieb, steht in `review/MORGENBRIEF.md` statt hier.

   Der Unterschied zur abgeschalteten Ähnlichkeitssuche ist nicht der
   Ton, sondern die Art: hier wird nichts verglichen und nichts gemessen.
   Es gibt nur Nachschlagen oder nicht — `Object.hasOwn`, sonst nichts.
   Deshalb kann ein Name, der morgen neu in der Kasse auftaucht, hier
   unmöglich stillschweigend hineinrutschen.

   Die Datenbank schlägt die Liste. Wer im Backoffice etwas bestätigt,
   behält recht — auch wenn hier etwas anderes steht. Wo beides
   auseinandergeht, sagt es der Zuordnung-Bildschirm.
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

/* ── Vorabliste ────────────────────────────────────────────────────────
   Ganzer Kassenname → Artikel-Id, oder `null` für „kommt nicht aus dem
   Keller". Kein Muster, keine Abkürzung, kein Teilstück: der Schlüssel
   ist der Name, wie die Kasse ihn schreibt, mitsamt Größe und doppeltem
   Größensuffix. Jede Zeile nennt den Grund, den ein Mensch in einer
   Sekunde nachprüft.

   Die Namen stammen aus den beiden echten Berichten, die im Haus
   liegen: Z 40 vom 19.09.2026 (Backoffice) und Bericht 37
   (`tests/fixtures`). 71 Namen zusammen. */

/* Wein. Diese sechs Namen passen nicht in das Kassenmuster — entweder
   fehlt das Komma vor dem Weinnamen, oder das Kürzel ist gar keine
   Rebsorte („NW" Naturwein, „RS" Rosé). Der Artikel selbst steht in
   jedem der sechs Namen ausgeschrieben. */
const VORAB_WEIN = {
  /* Heinrich · Naked Red — steht wörtlich im Namen. „NW" ist keine
     Rebsorte, deshalb greift das Kassenmuster nicht. Im Backoffice
     bereits auf denselben Artikel bestätigt. */
  "NW Heinrich, Naked Red 1/8": "w053",
  /* Dürnberg · Blanc de Noir — wörtlich im Namen. „RS" ist keine
     Rebsorte. Ebenfalls schon auf denselben Artikel bestätigt. */
  "RS Dürnberg, Blanc de Noir 1/8": "w045",
  /* Glatzer · Rubin Carnuntum, Zweigelt — wörtlich im Namen. Hier fehlt
     das Komma: `mappe()` sieht zwei Glatzer-Zweigelt (Rubin Carnuntum
     und Dornenvogel), kann ohne Komma nicht trennen und lässt zu Recht
     offen. Der Weinname steht trotzdem da. */
  "ZW Glatzer Rubin Carnuntum 1/8 l": "w026",
  /* Serena · Piu Frizzante — der einzige Serena im Haus. Glas. */
  "Prosecco, Serena 0,1l": "serena",
  /* Derselbe Wein als Flasche. */
  "Prosecco, Serena 0,75l": "serena",
  /* Seher · La Petite Frizzante Rosé — der einzige Schaumwein von Seher.
     Der andere Seher im Haus (Wolfgang Seher, Wilde Reben) ist ein
     Weißwein und kann „Sparkling Rosé" nicht sein. */
  "Glas Seher Sparkling Rosé 0,1l": "w055"
};

/* Getränke. Jeder Eintrag: der Name der Kasse links, der Name des
   Kellerartikels rechts — beide so nah beieinander, dass die Prüfung
   ein Blick ist. */
const VORAB_GETRAENK = {
  /* „Cola" */
  "Coca Cola 0,35l": "cola",
  /* „Cola Zero" — wortgleich. ACHTUNG: im Backoffice steht auf diesem
     Namen `cola` bestätigt; das sieht nach Vertippen aus, denn „Cola
     Zero" liegt als eigener Artikel in Lade 5. Die Datenbank schlägt
     die Liste, es ändert sich also nichts von allein —
     `review/MORGENBRIEF.md` nennt es zum Nachsehen. */
  "Cola Zero 0,35l": "colaz",
  /* „Orange Lemonade" — die Now-Limo-Reihe liegt im Stamm als Berry,
     Orange und Lemon Lemonade. ACHTUNG: im Backoffice steht auf diesem
     Namen `lemon` bestätigt — siehe oben, dasselbe Muster. */
  "Now-Limo Orange 0,35l": "orange",
  /* „Lemon Lemonade" — dieselbe Reihe. Genau dieser Name ist der
     Fehltreffer, an dem die Ähnlichkeitssuche gescheitert ist
     (sie schlug Thomas Henry Bitter Lemon vor). */
  "Now-Limo Lemon 0,35l": "lemon",
  /* „Franziskaner Weissbier hell" — schon bestätigt. */
  "Hefeweizen hell 0,5l": "hell",
  /* „Franziskaner Weissbier alkoholfrei" — das einzige alkoholfreie
     Weizen im Keller. (Der Name der Kasse hört ohne „l" auf.) */
  "Weizen alkoholfrei 0,5": "hefe0",
  /* „Stiegl 0,0 % · 0,33" — schon bestätigt. */
  "Stiegl alkoholfrei 0,3l": "st03",
  /* „Stiegl Freibier alkoholfrei" — schon bestätigt. */
  "Stiegl alkoholfrei 0,5l": "st05",
  /* „Mango" (Lade 1 · Säfte) — schon bestätigt. */
  "Mango gespritzt 0,25l 0,25l": "mango",
  /* „Schwarze Johannisbeere" (Lade 1 · Säfte) — dasselbe Muster wie
     „Mango gespritzt", derselbe Saft, dieselbe Lade. */
  "Johannisbeer gespritzt 0,25l 0,25l": "johan"
};

/* Kommt nicht aus dem Keller. Diese Namen stehen im Z-Bericht, zehren
   aber nichts, was hier gezählt wird — sie gehören dauerhaft aus der
   Zuordnungsliste heraus (Vorgabe Casimir, 20.09.2026).

   Cocktails stehen bewusst NICHT hier: ein Whiskey Sour nimmt
   Zitronensaft, ein Ipanema Ginger Ale, ein Virgin Hugo Holundersirup —
   alle drei liegen im Keller und werden gezählt. Sie wegzuwerfen hiesse,
   ihren Verbrauch später als Schwund wiederzufinden. Sie brauchen ein
   Rezept und stehen in `review/MORGENBRIEF.md`. */
const VORAB_KEIN_KELLER = [
  /* Küche: Beilagen und Zutaten, durchweg mit 0 € gebucht. */
  "Champignons", "Käse", "Paprika", "Pinien", "Rucola", "Schinken",
  "Schnittlauch", "Speck", "Zwiebeln",
  "HP Omelett 1 Portion", "HP Rührei 1 Portion",
  /* Kaffee: Maschine und Kühlschrank, kein Kellerartikel. */
  "Cappuccino 1 Tasse", "Cappuccino Hafer 1 Glas", "Espresso",
  "Espresso doppio 1 Glas", "Espresso Macchiato",
  "Latte Macchiato 1 Glas", "Verlängerter 1 Glas",
  /* Spirituosen pur, 2 cl: die Bar führt sie, der Keller zählt sie
     nicht — im Stamm gibt es zu keinem davon einen Artikel. */
  "Amaro Averna Siciliano 2 cl", "Lagavulin 16 Years 2 cl",
  "Obstler Durzbauer 2 cl"
];

export const VORAB = {
  ...VORAB_WEIN,
  ...VORAB_GETRAENK,
  ...Object.fromEntries(VORAB_KEIN_KELLER.map(n => [n, null]))
};

/* Nachschlagen, sonst nichts. Kein Vergleich, kein Teilstück, keine
   Ähnlichkeit — der Name trifft ganz oder gar nicht.

   Rückgabe:
     { id: "w026" }  → dieser Artikel
     { id: null }    → kommt nicht aus dem Keller
     null            → steht nicht auf der Liste, bleibt offen         */
export function vorab(name) {
  return Object.hasOwn(VORAB, String(name)) ? { id: VORAB[String(name)] } : null;
}
