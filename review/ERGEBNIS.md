# Was mit diesem Merge live geht · Runde 23 (23.09.2026)

**Stand davor: `48d1d01` (Runde 22, `sw.js` v71, live). Stand danach: `sw.js` v72.**

> ## ⚠ Vor dem Merge Migration einspielen
> Diese Runde bringt **Migration 002**. Sie ist additiv (eine neue,
> nullable Spalte), und ohne sie läuft alles wie bisher — aber der
> Fassartikel bleibt dann unsichtbar. **Erst einspielen, dann mergen.**

Anlass waren drei Sätze von Casimir:

> „im backoffice gibt es aber die option 1/8 nicht oder? also kann nicht
> eingelesen werden. und bier auch nicht also vom fass um zu kontrolieren
> wie viel fässer gebraucht werden. und spritzer ca 200ml von der 1L
> spritzer flasche."

---

## Was wirklich los war

Nachgesehen in der laufenden Datenbank: **21 Zuordnungen, davon 0 mit
Gebindegröße.** Deshalb rechnete keine einzige Zeile. Das Achtel wird
sehr wohl gelesen — 125 ml stehen bei sieben Kassennamen längst da; es
fehlte die zweite Zahl. Fassbier gab es als Artikel überhaupt nicht.

## 1 · Größen gehören an den Artikel

Neue Ansicht in **Einstellungen**: alle 95 Artikel, je zwei Zahlen — wie
groß die Flasche (oder das Fass) ist und was bei einem Verkauf ins Glas
geht. Vorausgefüllt nach den Regeln aus dem Haus:

| Regel | gilt für | Zahl |
|---|---|---|
| Weinflasche | alle 57 Weine | Gebinde 750 ml |
| Glas Wein | 53 stille Weine | 125 ml |
| Glas Sekt/Champagner | die 4 Schaumweine | 100 ml |
| Bierfass | der Fassartikel | Gebinde 50 000 ml |
| Getränke | 2 von 37 | was im Artikelnamen steht |

**Gerechnet wird erst, was einmal bestätigt ist.** Damit bleibt die
Entscheidung aus Runde 6 unverändert in Kraft — *lieber eine Zeile
weniger gerechnet als eine falsch*, nachdem „Amaro Averna 2 cl" × 3
einmal als drei ganze Flaschen in der Differenz stand. Eine Klassenregel
ist Wissen, das jemand ausgesprochen hat; wer keine Klasse hat (Amaro,
Spirituosen, 33 der 37 Getränke), bekommt weiter nichts. Der eine Blick
auf die Liste ist außerdem die Stelle, an der eine Magnum auffällt.

**Kein Schemaeingriff dafür:** Die Tabelle `stamm` steht seit je live und
war leer — `GET /api/stamm` las sie, ein Schreibweg fehlte. Den gibt es
jetzt, an die Rolle `leitung` gebunden.

## 2 · Bier vom Fass

Neuer Artikel „Raschhofer Pils vom Fass", 50 l. Er taucht **nur** im
Abgleich auf — nicht im Kellerbestand, nicht in der Zählliste, nicht auf
dem Bestellzettel, nicht in der Fassung. Eigener Abschnitt **„Vom Fass"**
unter Verkauf ↔ Fassung: Kassenname, Stück, ins Glas mit Herkunft, Liter,
darunter die Fässer.

**Er erzeugt keine Falschmeldung.** Ein Fass wird nicht gezählt, steht
also nie auf der Entnahmeseite. Liefe es durch die normale Rechnung,
stünde dort jeden Tag „verkauft 0,03 · geholt 0 · Differenz". Es hat
deshalb einen eigenen Topf, und dieselbe Ausnahme gilt im Keller.

**Radler ist halb Pils** — und das ist der gefährlichste Fall der ganzen
Runde: „Radler 0,5l" sagt im Namen 500, verbraucht werden 250. Die Zahl
ist nicht leer, sondern **falsch und sieht richtig aus**. Deshalb lässt
sich die Menge je Kassenname von Hand setzen (Migration 002), und die
Anzeige nennt überall, **woher** sie kommt: „von Hand" oder „aus dem
Namen".

## 3 · Die Zuordnung zeigt nur noch

Neue Spalte **„Rechnung"**: `250 ml ins Glas · von Hand → 50 000 ml
Gebinde`. Gepflegt wird bei den Artikelgrößen — Casimir: *„Es hat keinen
Mehrwert das immer irgendwo stehen zu haben."*

## 4 · Frage 1 steht ganz oben

Gemessen stand „Ist heute gefasst worden?" in **Block 5 von 8** der
Übersicht — unter Urteil, Abdeckungsbalken, Kette und Aufgabenliste, am
MacBook unter der Falz. Und alles darüber rechnet auf **gestern**.

Jetzt in der ersten Zeile, ohne Scrollen: links heute (gefasst / läuft /
noch nicht), rechts der letzte Abgleichtag — beide anklickbar. Steht der
letzte Tag mit Daten nicht wirklich gestern, heißt die Karte „Zuletzt"
statt „Gestern".

---

## Die Migration · Zeile für Zeile in die D1-Konsole

| # | Eingabe | Erwartete Ausgabe |
|---|---|---|
| 1 | `PRAGMA table_info(mapping);` | 6 Zeilen |
| 2 | `ALTER TABLE mapping ADD COLUMN ausschank_ml INTEGER;` | „Executed 1 command", 0 rows |
| 3 | `PRAGMA table_info(mapping);` | 7 Zeilen, neu `ausschank_ml` |
| 4 | `SELECT COUNT(*) FROM mapping;` | unverändert |

Danach die Seite einmal neu laden. Der Worker fragt die Spalte zur
Laufzeit ab und merkt sich ein „Nein" höchstens eine Minute.

## Sechs Handgriffe danach

1. **Einstellungen → „Alle Vorgaben übernehmen"** (60 Größen auf einmal).
2. **Zuordnung:** `Raschhofer Pils 0,2l/0,3l/0,5l` und `Radler 0,3l/0,5l`
   → „Raschhofer Pils vom Fass".
3. Bei `Radler 0,5l` **250** und bei `Radler 0,3l` **150** ins Glas.
4. `Weißer Spritzer` → Spritzerwein, 200 ins Glas, 1000 Gebinde.
5. `Weizen alkoholfrei 0,5` → Franziskaner alkoholfrei, 500 / 500.
6. Die übrigen Getränke, wenn du Zeit hast — sie stehen in der Liste
   untereinander und sagen, dass sie fehlen.

---

## Nachweis

* `npm test`: **634 von 634** grün (vorher 608; 26 neue in
  `tests/artikelgroessen`, `tests/fassbier`, `tests/migration-002`).
* **Gegenproben gefahren.** Die neue Stufe zurückgebaut → 3 Prüfungen in
  `artikelgroessen` und 3 in `fassbier` fallen. Die Ausnahme in der App
  zurückgebaut → 1 weitere fällt.
* **Am echten Bericht 37:** Raschhofer Pils 1×0,3 l + 2×0,5 l = 1,30 l =
  0,03 Fass, und `fasspils` steht in **keiner** Differenzzeile. Ohne die
  Handzahlen käme 5,40 l statt 4,75 l heraus — plausibel und falsch.
* Oberfläche von Hand (nicht Teil von `npm test`): `ui-mass` (LAUF=runde-23)
  alle Urteile grün in sechs Breiten, Gestaltungsschicht wortgleich ·
  `ui-runde22` 31/31 · `ui-runde21` 19/19 · `ui-runde18` 54/54 ·
  `ui-runde17` 38/38 · `ui-leitung-echt` 44/44 · `ui-fremdgeraet` 10/10.
* Am echten Backoffice bei 1440 und 393 px gemessen: kein Überlauf,
  nichts abgeschnitten, kein Querscrollen, alle 190 Zahlenfelder gleich
  breit auf zwei Kanten, keine JS-Fehler.
* Bilder: `review/screens/runde-23/`, Mockups in `review/mockup/`.

---

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

Im echten Bericht von gestern bleiben danach **21 von 57** offen statt
43 (dort sind 13 Namen schon von Hand bestätigt). Und diese 21 sind
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

- `npm test`: **581 von 581** grün (vorher 560). Neu
  `tests/vorab-gleich.test.mjs` mit 11 Urteilen: beide Dateien Eintrag
  für Eintrag gleich, jede Artikel-Id im Stamm, kein Name doppelt, und
  fünf Gegenproben, dass ein nur ähnlicher Name nicht durchgeht.
- Neu `node tests/ui-runde22.cjs`: **31 von 31** im echten Browser
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
- **Und eine zweite Jagd auf die Reparatur**: 1 A, 2 B, 7 C. Der A-Fund
  war eine Sackgasse — eine Ablehnung sperrte die Position dauerhaft aus
  dem Rezeptur-Bildschirm aus, und zurück führte kein Weg. Behoben, samt
  beider B-Funde: die Rücknahme bei Fehlschlag nimmt jetzt auch die
  bestätigte Gebindegröße zurück, und die Meldung danach sagt, was
  wirklich geschehen ist.
- **Und eine dritte Jagd**: an der Reparatur **kein A, kein B**. Ein
  B-Fund aus dem Gesamtzustand ist mitgenommen, weil er genau die erste
  Aufgabe des Morgenbriefs trifft: die Übersicht erklärte **jeden
  geglückten Mailempfang zum Ausfall** („solange das so bleibt, kommt
  kein Z-Bericht mehr von selbst herein" hing an jeder Mailnotiz, auch
  an der Erfolgsmeldung). Am ersten Morgen, an dem die Weiterleitung
  steht, wäre das ein Alarm, der nie ausgeht. Behoben und mit
  `tests/mailmeldung.test.mjs` (9 Urteile) festgehalten. Alles in
  `review/JAGD.md`.

## Keine Migration

Es kommt keine Spalte und keine Tabelle dazu. Die Liste steht im Code,
die Zuordnungstabelle bleibt, wie sie ist. `sw.js` steht auf **v71**.
`public/index.html` ist nicht angefasst.
