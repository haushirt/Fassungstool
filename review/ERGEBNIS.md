# Runde 22 · Die Vorabliste

Der Z-Bericht liest sich seit Runde 21 sauber ein. Was danach kam, war
Handarbeit: 44 von 48 Kassennamen standen offen und warteten auf ein
Auswahlfeld. Diese Runde nimmt den Großteil davon vorweg — ohne die
Regel aufzuweichen, die genau das bisher verhindert hat.

## Was sich ändert

**1 · Eine geprüfte Liste ganzer Kassennamen.**
36 Einträge in `src/gnmap.js`: 15 zeigen auf einen Artikel, 21 sind
„kommt nicht aus dem Keller" (Speisen, Kaffee, Spirituosen pur auf
2 cl). Jeder Eintrag ist einzeln nachgesehen und trägt seinen Grund in
der Zeile daneben. Die Namen stammen aus den beiden echten Berichten,
die im Haus liegen: Z 40 vom 19.09.2026 aus dem Backoffice und
Bericht 37 aus `tests/fixtures/` — 71 Namen zusammen.

Im echten Bericht von gestern bleiben danach **20 von 57** offen statt
43 (dort sind 13 Namen schon von Hand bestätigt). Und diese 20 sind
keine Tipparbeit mehr, sondern Fragen, die eine Entscheidung brauchen
(`review/MORGENBRIEF.md`).

**2 · Regel 5 bleibt, wie sie war.**
`mappe()` ist Wort für Wort unverändert und rät bei keinem einzigen
dieser Namen — die drei Fehltreffer der abgeschalteten
Ähnlichkeitssuche stehen weiter als Prüfung in `tests/mapping.test.mjs`
und sind grün. Die Vorabliste steht **daneben**, nicht darin, und
schlägt nur nach: ein `Object.hasOwn` und ein Zugriff, kein Vergleich,
kein Teilstück, keine Ähnlichkeit. Ein Name, der morgen neu in der
Kasse auftaucht, kann hier nicht stillschweigend hineinrutschen.

Die Reihenfolge im Worker ist **bestätigt → Vorabliste → Kassenmuster**.
Die Datenbank schlägt die Liste: was die Leitung bestätigt hat, gilt.

**3 · Ein Klick im Backoffice.**
Neuer Zustand „vorgeschlagen" — nachgesehen, Artikel steht schon im
Feld, aber noch nicht bestätigt. Der Knopf heißt jetzt „Alle Vorschläge
übernehmen" und nimmt Weine, Getränke und die dauerhaft zu
ignorierenden Speisen auf einmal an. Eine bestätigte Zuordnung fasst er
nie an.

**4 · Zwei Vertipper sind dabei aufgefallen.**
Live steht „Cola Zero 0,35l" auf dem Artikel **Cola** (es gibt „Cola
Zero" als eigenen Artikel) und „Now-Limo Orange 0,35l" auf **Lemon
Lemonade**. Geändert wurde nichts — die Bestätigung gilt. Aber wo die
geprüfte Liste widerspricht, steht es jetzt in der Zeile:
*„geprüfte Liste sagt: …"*. Beides steht im Morgenbrief zum Nachsehen.

## Was ausdrücklich NICHT gemacht wurde

**Cocktails sind nicht auf „Ignorieren" gesetzt**, obwohl das die
Vorgabe war. Ein Whiskey Sour nimmt Zitronensaft, ein Ipanema Ginger
Ale, ein Virgin Hugo Holundersirup, ein Vermouth & Tonic Tonic — alle
vier liegen im Keller und werden gezählt. Ignoriert verschwände ihr
Verbrauch aus der Rechnung und käme in der nächsten Kellerzählung als
Schwund zurück. Die 15 Cocktailnamen bleiben offen und stehen mit
Begründung im Morgenbrief; sie brauchen ein Rezept, nicht ein Kreuz.

Nicht eingetragen wurde außerdem alles, wo ein Zweifel blieb:
Raschhofer Pils (im Keller gibt es kein Pils), Radler, Hauslimo,
Gasteiner Quellwasser, Weißer Spritzer, Tomate (gleicher Name wie der
Tomatensaft im Keller). Sechs Fragen, alle im Morgenbrief.

## Geprüft

- `npm test`: **572 von 572** grün (vorher 560). Neu
  `tests/vorab-gleich.test.mjs` mit 11 Urteilen: beide Dateien Eintrag
  für Eintrag gleich, jede Artikel-Id im Stamm, kein Name doppelt, und
  fünf Gegenproben, dass ein nur ähnlicher Name nicht durchgeht.
- Neu `node tests/ui-runde22.cjs`: **29 von 29** im echten Browser
  gegen echten Worker und echte SQLite. Darin gemessen: 15 statt 44
  offene Namen in Bericht 37, ein Klick schreibt 32 Zeilen in die
  Zuordnungstabelle, und eine widersprechende Bestätigung setzt sich
  gegen die Liste durch.
- `node tests/ui-leitung-echt.cjs`: unverändert **44 von 44**.
- `node tests/ui-runde21.cjs`: unverändert **19 von 19**.
- Die Zahlen des Berichts vom 19.09. sind aus der **Live-Datenbank
  gelesen** (nur `SELECT`, Regel 2).
- **Eine Jagd danach** (`review/JAGD.md`): 2 A, 4 B, 7 C. Beide A-Funde
  behoben und je mit einer eigenen Prüfung belegt:
  1. Der Sammelknopf fasste **Rezeptzeilen** an und setzte sie auf
     „ignoriert" — für eine Position mit Rezeptur ist eine Artikel-Id
     ein Bestandteil, kein Artikel. Jetzt überspringt er sie, derselbe
     Riegel, den der Nachbarknopf seit Runde 16 hat.
  2. **Ein Vorschlag liess sich nicht ablehnen.** „— offen —" schickte
     eine Zeile ohne Artikel hinaus, die Seite warf sie beim Laden weg,
     die Vorabliste griff wieder — der abgelehnte Vorschlag stand sofort
     erneut da. Die Datenbank hatte die Ablehnung die ganze Zeit; nur
     gelesen hat sie niemand. Jetzt hält sie, auch über das Neuladen.
  Dazu drei B-Funde behoben (Zuordnungen gelten erst nach dem Senden,
  eine Karte nennt die wartenden Vorschläge, der Hinweis auf eine
  abweichende Bestätigung steht nicht mehr in der kleinsten Schrift) und
  ein Eintrag **entfernt**, dessen Begründung ein Schluss statt eines
  Nachschlagens war („Johannisbeer gespritzt" — geschlossen aus
  „Mango gespritzt", und es ist nicht derselbe Saft).

## Keine Migration

Es kommt keine Spalte und keine Tabelle dazu. Die Liste steht im Code,
die Zuordnungstabelle bleibt, wie sie ist. `sw.js` steht auf **v69**.
`public/index.html` ist nicht angefasst.
