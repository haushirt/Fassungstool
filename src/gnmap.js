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
  "Glas Seher Sparkling Rosé 0,1l": "w055",
  /* Fritsch (Karl) · Wagram Rosé — Glas. „RS" ist keine Rebsorte,
     deshalb greift das Kassenmuster nicht. Der Bericht bucht die Flasche
     desselben Namens unter der Warengruppe Wein · Rosé · Flaschen; es
     gibt im Haus genau einen Wagram-Rosé. */
  "RS Fritsch Wagram 1/8 l": "w043",
  /* Derselbe Wein als Flasche. */
  "RS Fritsch, Wagram 0,75 l": "w043",
  /* Kollwentz · Leithakalk Chardonnay — die Kasse schreibt den Winzer
     klein und ohne t, das Kürzel CH steht für Chardonnay. Von Kollwentz
     liegen zwei Weine im Haus: der Leithakalk als Zweigelt und als
     Chardonnay. Das Kürzel entscheidet. */
  "Ch kollwenz": "w066"
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
  /* „Mango" (Lade 1 · Säfte) — schon bestätigt.
     „gespritzt" heisst Saft plus Soda; hier steht trotzdem der ganze
     Saft. Das hat das Haus so entschieden, es steht seit Wochen in der
     Datenbank, und diese Zeile schreibt nur mit, was ohnehin gilt. */
  "Mango gespritzt 0,25l 0,25l": "mango",
  /* „Schwarze Johannisbeere" (Lade 1 · Säfte). Bis Runde 22 stand dieser
     Name bewusst NICHT hier: er wäre ein Schluss aus dem Mango-Eintrag
     gewesen, kein Nachschlagen. Am 23.09.2026 hat Casimir ihn
     ausdrücklich angeordnet — beide Säfte gehen gleich, so wie er
     „Mango gespritzt" selbst bestätigt hat. Steht damit auf seiner
     Anweisung, nicht auf einem Schluss. */
  "Johannisbeer gespritzt 0,25l 0,25l": "johan",
  /* „Franziskaner Weissbier dunkel" — wörtlich. Das Gegenstück zum
     hellen Weizen, das seit Wochen auf `hell` bestätigt steht, und das
     einzige dunkle Weizen im Haus. Warengruppe: Bier · Flaschenbier. */
  "Hefeweizen dunkel 0,5l": "dunkel",
  /* „Almdudler" — wörtlich, der einzige im Stamm.
     Warengruppe: AFG · Softdrinks. */
  "Almdudler 0,35l": "almd",
  /* Die Gasteiner-Familie, am 23.09.2026 von Casimir geklärt: im Haus
     gibt es genau drei Flaschen — still, sparkling gross (0,75) und
     sparkling klein (0,2). Alles, was die Kasse sonst noch Gasteiner
     nennt, ist keine davon.

     „Gasteiner still" — wörtlich. */
  "Gasteiner still 0,75l": "gastill",
  /* Die grosse prickelnde. Im Keller heisst sie „Gasteiner 1 l"; auf
     diesen Artikel steht der Name seit Wochen bestätigt, und Casimir
     hat ihn am 23.09. als die 0,75er bezeichnet. Der Artikelname im
     Stamm trägt also die falsche Grösse — die Zuordnung stimmt. */
  "Gasteiner sparkling 0,75l": "gasteiner",
  /* Die kleine prickelnde — im Keller „Gasteiner 0,25 l". Auch hier
     weicht die Grösse im Namen ab (0,2 gegen 0,25); es ist die einzige
     kleine Flasche im Haus. */
  "Gasteiner sparkling 0,20l": "gastklein",
  /* „Fentimans Ginger Beer" — wörtlich, Lade 4 · Mischgetränke. Im
     Bericht vom 22.09. die einzige Zeile der Warengruppe AFG · Bar Mixer. */
  "Fentimans Ginger Beer 1 Glas": "gingerbeer",
  /* „Spritzerwein" (Lade 1). Der Bericht bucht diesen Namen unter den
     offenen Weinen, und im Keller liegt genau ein Spritzerwein. */
  "Weißer Spritzer": "spritzer"
};

/* Kommt nicht aus dem Keller. Diese Namen stehen im Z-Bericht, zehren
   aber nichts, was hier gezählt wird — sie gehören dauerhaft aus der
   Zuordnungsliste heraus (Vorgabe Casimir, 20.09.2026).

   Zu den Mischgetränken siehe den eigenen Block weiter unten. */
const VORAB_KEIN_KELLER = [
  /* Küche: Beilagen und Zutaten, durchweg mit 0 € gebucht. */
  "Champignons", "Käse", "Paprika", "Pinien", "Rucola", "Schinken",
  "Schnittlauch", "Speck", "Zwiebeln", "Extra Speck",
  /* Die Tomate steht im Bericht zwischen Käse und Zwiebeln, mit 0 €.
     Im Keller gibt es einen gleichnamigen Tomatensaft — Runde 22 wollte
     das nicht raten. Casimir hat den Namen am 22.09. im Backoffice
     selbst auf Ignorieren gesetzt; diese Zeile schreibt das mit. */
  "Tomate",
  "HP Omelett 1 Portion", "HP Rührei 1 Portion",
  /* Küche: ganze Gänge und Buffets. Warengruppen Abendessen und
     Mittagessen — Speisen, nie ein Getränk. */
  "Dinner Menü 1 Person", "Abend suppe", "Salatbuffet 1 Person",
  /* Kaffee: Maschine und Kühlschrank, kein Kellerartikel. */
  "Cappuccino 1 Tasse", "Cappuccino Hafer 1 Glas", "Espresso",
  "Espresso doppio 1 Glas", "Espresso Macchiato",
  "Latte Macchiato 1 Glas", "Verlängerter 1 Glas",
  /* Dieselbe Maschine, dieselbe Milch: Warengruppen Heissgetränke ·
     Tee und Extra zu Heissgetränke. Tee liegt als Beutel in der Bar,
     im Stamm steht zu keinem davon ein Artikel. */
  "Tee Ingwer-Zitrone frisch 1 Tasse", "Tee Kamille 1 Tasse",
  "Tee Früchtetee 1 Tasse", "Heiße Schokolade 1 Glas",
  "Golden Milk (Kurkuma Latte) 1 Glas", "Babyccino 1 Tasse",
  /* Spirituosen pur: die Bar führt sie, der Keller zählt sie
     nicht — im Stamm gibt es zu keinem davon einen Artikel.
     Die beiden Schreyer & Muster stehen im Bericht unter der
     Warengruppe Spirituosen · Schnaps. */
  "Amaro Averna Siciliano 2 cl", "Lagavulin 16 Years 2 cl",
  "Obstler Durzbauer 2 cl", "Zirberl Schreyer & Muster 2 cl",
  "Zwetschke Schreyer & Muster 2 cl", "Vermouth 12cl",
  /* Fassbier. Nachgesehen an der Warengruppe: in allen drei Berichten
     vom 19. bis 23.09. gehen genau diese fünf Namen in Bier · vom Fass
     auf, Stück für Stück (12 · 7 · 11). Im Keller liegt kein Fass und
     kein Pils — nur Flaschen. Damit ist die Frage aus dem Morgenbrief
     beantwortet: das Pils kommt vom Fass. Der Radler steht in derselben
     Warengruppe; sein Limonadenanteil ist damit nicht geklärt, sondern
     mit dem Fassbier zusammen aus der Rechnung genommen. */
  "Raschhofer Pils 0,2l 0,2l", "Raschhofer Pils 0,3l 0,3l",
  "Raschhofer Pils 0,5l 0,5l", "Radler 0,3l 0,3l", "Radler 0,5l 0,5l",
  /* Hausgemachte Limonaden. Im Backoffice steht „Hausgemachte Limonade
     1 Glas" seit dem 22.09. auf Ignorieren — von Casimir selbst
     bestätigt. Diese beiden Namen sind dieselbe Sache unter anderem
     Etikett und folgen seiner Entscheidung. */
  "Hausgemachte Limonade 1 Glas", "Hauslimo 0,25l 0,25l",
  "Hauslimo 0,5l 0,5l", "Holundersoda 0,5l 0,5l",
  /* Gasteiner Quellwasser. Im Haus gibt es drei Gasteiner-Flaschen
     (still, sparkling gross, sparkling klein) — Quellwasser ist keine
     davon. Die 1-Liter-Zeile steht live schon von Hand auf Ignorieren;
     Casimir hat die Familie am 23.09.2026 abschliessend aufgezählt. */
  "Gasteiner Quellwasser 0,5l", "Gasteiner Quellwasser 1l"
];

/* Mischgetränke: Cocktails, Mocktails, Spritz, Sours, Gin & Tonic, Mules.

   Bis Runde 22 stand hier bewusst nichts. Der Grund gilt unverändert:
   ein Whiskey Sour nimmt Zitronensaft, ein Ipanema Ginger Ale, ein
   Virgin Hugo Holundersirup, ein Gin & Tonic Tonic — alles das liegt im
   Keller und wird gezählt. Auf Ignorieren gesetzt, verschwindet ihr
   Verbrauch aus der Rechnung und kommt in der nächsten Kellerzählung
   als Schwund zurück.

   Casimir hat trotzdem so entschieden, und zwar nicht nur in Worten:
   im Backoffice stehen Aperol Spritz, Sarti Spritz, Monkey Sour und
   Ipanema seit dem 22.09. von Hand auf Ignorieren. Dieser Block zieht
   die übrigen Namen derselben Art nach.

   Er steht getrennt, damit das Zurücknehmen ein Handgriff ist: wer
   Rezepte will, löscht diesen Block und legt sie im Zuordnung-Bildschirm
   unter „Mischgetränk" an. Eine bestätigte Zuordnung in der Datenbank
   schlägt diese Liste ohnehin jederzeit. */
const VORAB_MISCHGETRAENK = [
  "Amaretto Sour 1 Glas", "Averna Sour 1 Glas", "Whiskey Sour 1 Glas",
  "Pisco Sour 1 Glas", "Penicillin 1 Glas", "Sanbittèr Sour",
  "Campari Spritz 1 Glas", "Sanbitter Spritz 1 Glas", "Hugo 1 Glas",
  "Virgin Hugo 1 Glas", "Nojito 1 Glas", "Kinder Cocktail 1 Glas",
  "Negroni 1 Glas", "Old fashioned 1 Glas", "Daiquiri 1 Glas",
  "Margarita 1 Glas", "Espresso Martini 1 Glas", "Pornstar Martini 1 Glas",
  "Cosmopolitan 1 Glas",
  "Moscow Mule 1 Glas", "Milano Mule", "Gin Basil Smash 1 Glas",
  "Gin & Tonic Hendrick's 1 Glas", "Gin & Tonic Monkey 47 Dry 1 Glas",
  "Gin & Tonic Tanqueray 1 Glas", "Vermouth & Tonic 1 Glas",
  "Special Cocktail",
  /* Diese fünf stehen live schon von Hand auf Ignorieren. Sie stehen
     hier trotzdem: sonst wäre die Liste bei genau den Namen stumm, an
     denen sich die Entscheidung ablesen lässt. */
  "Aperol Spritz 1 Glas", "Sarti Spritz 1 Glas", "Monkey Sour 1 Glas",
  "Ipanema 1 Glas", "Campari Orange 1 Glas"
];

export const VORAB = {
  ...VORAB_WEIN,
  ...VORAB_GETRAENK,
  ...Object.fromEntries(VORAB_KEIN_KELLER.map(n => [n, null])),
  ...Object.fromEntries(VORAB_MISCHGETRAENK.map(n => [n, null]))
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
