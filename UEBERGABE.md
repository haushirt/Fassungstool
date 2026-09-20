# Übergabe 21.09.2026 · Runde 22 (Vorabliste)

## Erledigt

- **`VORAB` in `src/gnmap.js`** — 37 geprüfte, GANZE Kassennamen:
  16 zeigen auf einen Artikel, 21 sind „kommt nicht aus dem Keller"
  (Speisen, Kaffee, Spirituosen pur auf 2 cl). Jeder Eintrag trägt seinen
  Grund in der Zeile daneben. Quelle: die beiden echten Berichte im Haus
  (Z 40 vom 19.09.2026 aus der Live-D1, nur gelesen; Bericht 37 aus
  `tests/fixtures/`) — 71 Namen zusammen.
- **Wortgleich gespiegelt in `public/leitung.html`**, zusammengehalten von
  `tests/vorab-gleich.test.mjs` (11 Urteile).
- **Worker:** `fassungsliste()` in `src/index.js` nutzt die Liste als
  zweite Stufe — **bestätigt → Vorabliste → `mappe()`**. Die Datenbank
  schlägt die Liste; eine bestätigte Zuordnung wird nie überschrieben.
- **Regel 5 unberührt:** `mappe()` ist Zeichen für Zeichen unverändert.
  Alle Regel-5-Prüfungen sind ohne eine einzige Änderung grün geblieben.
  `vorab()` vergleicht nichts — ein `Object.hasOwn` und ein Zugriff.
- **Backoffice:** neuer Zustand „vorgeschlagen", Knopf „Alle Vorschläge
  übernehmen", und wo eine bestätigte Zuordnung der geprüften Liste
  widerspricht, steht es in der Zeile.
- **Zwei Vertipper gefunden** (stehen live, nichts geändert):
  „Cola Zero 0,35l" liegt auf `cola` statt `colaz`, „Now-Limo Orange
  0,35l" auf `lemon` statt `orange`.
- `sw.js` auf **v68**. `public/index.html` nicht angefasst.
  **Keine Migration.**

**Zahlen:** Bericht 37 — 15 statt 44 offene Namen. Echter Bericht vom
19.09. — 20 statt 44 von 57.

**Geprüft:** `npm test` 572/572 · `node tests/ui-runde22.cjs` 21/21 ·
`node tests/ui-leitung-echt.cjs` 44/44 · `node tests/ui-runde21.cjs` 19/19.

## Blockaden

Keine technische. Was bleibt, sind **sechs Fragen an Casimir**, alle
aufbereitet in `review/MORGENBRIEF.md`:

1. Die zwei Vertipper bestätigen oder verwerfen.
2. Gasteiner: welcher der drei Artikel ist „sparkling 0,75 l", welcher
   „Quellwasser 1 l"? Möglicherweise fehlt ein Artikel im Stamm.
3. Raschhofer Pils (10 Stück an einem Abend) — vom Fass, oder fehlt der
   Artikel im Keller?
4. Radler, Hauslimo, Hausgemachte Limonade — gemischt (Rezept) oder
   ignorieren?
5. „Weißer Spritzer" → der Artikel „Spritzerwein"?
6. „Tomate" — Küchenzutat oder der Tomatensaft aus Lade 1? Gleicher Name.

**Die grosse Frage: die 15 Cocktails.** Die Vorgabe war „auf kein Keller
setzen". Das wurde **bewusst nicht gemacht** und im Morgenbrief begründet:
ein Whiskey Sour nimmt Zitronensaft, ein Ipanema Ginger Ale, ein Virgin
Hugo Holundersirup, ein Vermouth & Tonic Tonic — alle vier werden im
Keller gezählt. Ignoriert verschwände ihr Verbrauch aus der Rechnung und
käme in der nächsten Kellerzählung als Schwund zurück. Richtig wäre je
ein Rezept; dafür fehlt aber `migrations/001_mapping_rezept.sql`, die
Casimir einspielen muss (Regel 2). Steht als Backlog-Punkt „hoch".

## Prompt für die nächste Runde

ROLLE
Du arbeitest die Antworten aus `review/MORGENBRIEF.md` ab. Casimir hat
die sechs Fragen von Runde 22 beantwortet — seine Antworten stehen in
seiner Nachricht. Lies zuerst `STAND.md`, dann `review/MORGENBRIEF.md`
(Punkte 1 bis 5), dann `src/gnmap.js` (Kopf und `VORAB`).

AUFTRAG
1. Trage jede beantwortete Zuordnung in `VORAB` ein — wortgleich in
   `src/gnmap.js` UND `public/leitung.html`, jede mit Begründung in der
   Zeile daneben. `tests/vorab-gleich.test.mjs` hält beide Seiten
   zusammen; lass es nach jeder Änderung laufen.
2. Zuordnungen, die live falsch stehen (Cola Zero, Now-Limo Orange),
   kannst du NICHT selbst korrigieren — die Live-D1 ist nur lesbar
   (Regel 2). Schreibe Casimir stattdessen in einer Zeile, was er im
   Zuordnung-Bildschirm umstellen soll.
3. Sagt Casimir „Rezepte" zu den Cocktails: die Migration
   `migrations/001_mapping_rezept.sql` prüfen, `POST /api/mapping` das
   Feld `rezept` annehmen lassen, und die Rezepte aus dem Gerätespeicher
   (`hh_rezepte_v1`) auf den Server heben. Die Migration spielt Casimir
   ein — schreibe sie Zeile für Zeile nach `review/ERGEBNIS.md`, mit
   erwarteter Ausgabe. Ohne eingespielte Migration muss alles andere
   unverändert weiterlaufen (Feature-Flag).
   Sagt er „ignorieren": dann als `null` in `VORAB`, aber notiere in
   `review/BACKLOG.md`, welche Kellerartikel damit rechnerisch
   verschwinden.
4. Fehlt ein Artikel im Stamm (Raschhofer Pils, Gasteiner 0,75 l):
   `src/stamm.json` ergänzen und prüfen, ob die neue Id im Keller
   gezählt wird — ein Artikel ohne Lade ist im Bestand unsichtbar.

HARTE GRENZE
Regel 5 bleibt, wie sie ist: keine Ähnlichkeitssuche, keine Fuzzy-Logik,
kein Wildcard-Alias, `mappe()` bleibt unangetastet. Nur exakte, ganze
Kassennamen mit nachvollziehbarer Begründung. Bist du dir nicht zu 100 %
sicher: nicht eintragen, sondern in den Morgenbrief.

ABNAHME
`npm test` grün, `node tests/ui-runde22.cjs` grün, `sw.js`-Version
erhöht, `STAND.md` und `review/LOG.md` fortgeschrieben, und im Bericht
vom 19.09. stehen weniger als 10 Namen offen.
