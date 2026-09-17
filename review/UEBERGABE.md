# Übergabe Fassungstool — Stand 17.09.2026, Abend

Diese Datei ist so geschrieben, dass jemand ohne Vorwissen aus dem Chat
weiterarbeiten kann: ein neuer Mensch, eine neue Sitzung. Alles, was hier
behauptet wird, steht mit Datei und Zeile daneben oder ist an einer
Prüfung nachrechenbar.

**Zuerst lesen:** `CLAUDE.md` (die harten Regeln), dann Abschnitt 5 dieser
Datei (die Fallen). Wer nur eine Sache mitnimmt: *Prüfungen können grün
sein und nichts beweisen.* Dieses Projekt hat das zweimal an einem Tag
bewiesen.

---

## 1 · STAND HEUTE

### Live auf `main` (Stand `e3eb7b9`, gemergt am 17.09.)

Jeder Push auf `main` geht über Workers Builds automatisch live. Der
Merge von Pull Request #1 ist die erste Auslieferung nach Phase A.

**Was das Tool jetzt kann, was vorher nicht ging:**

* **Eine Fassung kommt in der Datenbank an.** Der Worker schrieb bis zum
  17.09. gegen Spalten, die es in der Live-D1 nicht gibt (`vorgang.art`,
  `vorgang.person`, `vorgang.ts`). Jede Fassung endete in einem Fehler,
  den niemand sah — die App legte das Paket in ihre Reihe und versuchte es
  weiter. `vorgang` und `ereignis` waren leer. **Keine einzige Fassung war
  je angekommen.** Seit dem Merge geht der Weg von der Anmeldung bis in
  die Datenbank durch: Tagesfassung, Nachfüllen, Sonderentnahme,
  Kellerzählung, Wareneingang.
* **Der gastronovi-Z-Bericht wird richtig gelesen.** Am ersten echten
  Bericht (Nr. 37) las der Parser 106 Positionen mit 1345,75 Stück und
  5166,70 € — Steuersätze, Kellner und Warengruppen als Getränke. Jetzt
  48 Positionen, 145 Stück, 602,50 €, gegengerechnet an zwei Summen des
  Berichts selbst.
* **Der Z-Bericht lässt sich als Datei hochladen** (Backoffice →
  Z-Bericht → ziehen oder einfügen). Kein Postfach, keine Domain nötig.
* **Das Backoffice liest vom Server**, nicht mehr aus dem Browserspeicher
  eines MacBooks: Z-Berichte und Zuordnungen stehen in der Datenbank und
  auf jedem Gerät.
* **Anmeldung mit sechs bis acht Ziffern**, Bestätigungstaste statt
  Absenden bei der vierten Ziffer, Sperre nach zehn Fehlversuchen je IP.
* **Prüfgerüst:** `npm test` 211 Prüfungen, `node tests/durchstich.cjs`
  35 Punkte, `node tests/ui-leitung-echt.cjs` 22 Punkte. Alles ohne Netz
  und ohne Installation lauffähig.

**Was live NICHT geht:** die vier persönlichen Codes sind noch die alten
(siehe Abschnitt 4, „Vom Betreiber zu tun"), und keiner der sechs Punkte
aus dem iPhone-Test (Abschnitt 3).

### Auf `v2-review`, noch nicht gemergt

Drei Commits, nur `public/` und `review/`:

| Commit | Was |
|---|---|
| `0f357a1` | `review/INPUT-TEAM.md`: die sechs Punkte aus dem iPhone-Test des Betreibers eingetragen — die Datei war seit dem Setup leer. |
| `641d197` | `main` in den Arbeitszweig nachgezogen. Ohne das hätte der nächste Pull Request die `wrangler.jsonc` des Betreibers (`observability`, `ABSENDER`) stillschweigend zurückgenommen. |
| `0109cf2` | Runde 6: vier der sechs iPhone-Punkte behoben — Safe-Area, Springen beim Scrollen, Zahlenreihe der Getränkeladen, Widerspruch auf der Startseite. `sw.js` v24 → v25. |

### Die letzten Commits auf `main`, je ein Satz

| Commit | Was |
|---|---|
| `e3eb7b9` | Merge von PR #1 — Phase A geht live. |
| `486ccbb` | `ERGEBNIS.md`: Codewechsel ohne `ANLAGE_OFFEN`, Reihenfolge berichtigt. |
| `3d5ec15` | `ERGEBNIS.md`: überholten Satz zu `tests/fixtures/` berichtigt. |
| `b9659f9` | Runde 5: Backoffice redet mit dem Server; drei falsche Mengen in den Eingaben behoben; zwei Fallen im Backoffice. |
| `e0001d6` | Betreiber: `wrangler.jsonc` mit `observability` und `ABSENDER`. |
| `7cf3abb` | Runde 4: erster echter Z-Bericht als Fixture, Parser daran berichtigt, 24 Prüfungen. |
| `8d28279` | Runde 4: Übergabedokumente, Backlog, Entscheidung 13. |
| `2300717` | Runde 4: Anmeldung und Codevergabe für längere Codes. |
| `2ea053a` | `docs/live-schema.sql` gegen alle neun Tabellen der laufenden D1 gegengelesen. |
| `66df3d4` | Runde 3 (qa-guardian): Durchstich App–Worker–Live-Schema, Urteil zum Livegang. |

---

## 2 · WAS PHASE A GEBRACHT HAT

Ehrlich, auch wo nichts passiert ist.

| Pflichtpunkt | Stand | Wo |
|---|---|---|
| Code und Schema stimmen überein (Regel 3, 4) | **erledigt** — alle neun Tabellen per `PRAGMA table_info` gegengelesen, vier statische Wächter halten es | `docs/live-schema.sql` (Kopf), `tests/schema.test.mjs` |
| Eine Fassung kommt in der Datenbank an | **erledigt**, alle fünf Modi mit richtigem Vorzeichen und Ort | `src/index.js:262` (`ereignisseAbleiten`), `tests/modi.test.mjs` |
| Z-Bericht lesen (Regel 7, vier Eigenheiten) | **erledigt** und am echten Bericht geprüft; es sind acht Eigenheiten, nicht vier | `src/gnparse.js`, `tests/zbericht-37.test.mjs` |
| Z-Bericht importieren (Datei und Mail) | **erledigt** für die Datei; der Mailweg läuft ins Leere, solange es keine Domain gibt | `src/index.js:407` (`fassungsliste`), `public/leitung.html:1297` |
| Zuordnung Kassenname → Artikel | **teilweise** — sie wirkt und ist rückwirkend, aber sie kennt keine Ausschankgröße (Abschnitt 3, Glas/Flasche) | `src/index.js:482`, `public/leitung.html:1564` |
| Kellerbestand | **erledigt** — je Artikel die jüngste Zählung, hält eine Teilzählung aus | `src/index.js:373`, `public/leitung.html:882` |
| Backoffice sieht, was auf dem Server steht | **teilweise** — Vorgänge, Berichte, Zuordnungen, Personen ja; Stammdaten nein (§8 A) | `public/leitung.html:747`, `:783` |
| Backoffice kann ändern | **teilweise** — Personen und Zuordnungen ja; Glasweine, Soll-Mengen, Kistengrößen, Kellerbereiche, neuer Wein: **nein**, stehen fest im Quelltext | `public/leitung.html` (`STAMM`/`PLAN` im Kopf) |
| Anmeldung, Codes, Sperre | **erledigt** im Code — die vier Codes selbst sind noch die alten | `src/index.js:511`, `public/index.html:1894` |
| Verwaltungs-Editor aus der App entfernen (§8 A) | **offen** — der Knopf „Verwaltung" steht weiter in der App | `public/index.html:2135` (`askPin`) |
| Weg aus der App ins Backoffice | **offen** — es gibt keinen einzigen Link auf `leitung.html` | `public/index.html` |
| Fotoschritt → Vortagsabgleich (Stück C) | **offen** | `public/index.html:4232` (`rFotos`) |
| Getränke im Journal | **teilweise** — Bewegungen ja, Zählung nein (Entscheidung 14) | `public/index.html:3143` (`geholteGetraenke`) |
| Prüfgerüst | **erledigt** — 211 + 35 + 22 Punkte, echte SQLite aus dem Live-Schema, echter Bericht, echte Oberfläche | `tests/` |
| Die sieben Auflagen vor dem Livegang | **teilweise** — die Codeseite ist fertig, fünf davon liegen beim Betreiber (Abschnitt 4) | `review/ERGEBNIS.md` |
| `tests/fixtures/` mit echten Daten | **erledigt** für einen Bericht aus einer Nacht; ein zweiter aus einer anderen Woche fehlt | `tests/fixtures/zbericht-37-extended.csv` |
| `review/INPUT-TEAM.md` | **teilweise** — die sechs Punkte des Betreibers stehen drin, die Abschnitte „Was fehlt?" und „Leitung: Was will ich morgens sehen?" sind leer | `review/INPUT-TEAM.md` |

---

## 3 · OFFENE FEHLER

Die sechs Punkte aus dem iPhone-Test des Betreibers (17.09.) plus
Glas/Flasche. Keiner davon war je Auftrag einer Runde — sie sind beim
Benutzen aufgefallen.

| # | Fehler | Befund im Code | Stand |
|---|---|---|---|
| 1 | **Kein Weg aus der App ins Backoffice.** Es gibt nur „Verwaltung", und die gehört ins Backoffice. | In `public/index.html` kommt `leitung.html` nur in Kommentaren vor — **0 Links**. Der Knopf `bAdmin` → `askPin` steht bei `:2135`. | **offen** — nächster Schritt |
| 2 | **Startseite widersprach sich:** „Die Tagesfassung ist heute noch offen" über grün „Nichts offen – alles übertragen". Zweimal „offen", zweierlei gemeint. | `public/index.html:1778` (`netzChip`) | **behoben** in `0109cf2`: „Übertragung: alles ans Haus übertragen"; das Wort „offen" gehört jetzt der Arbeit allein |
| 3 | **Safari springt beim Scrollen nach oben.** | Zwei Ursachen. Safari feuert `resize` beim Scrollen (Adressleiste), der Horcher baute die Lade neu. Dazu das Nachziehen des Menüs alle drei Minuten. | **behoben** in `0109cf2` — **noch nicht in echtem Safari geprüft** |
| 4 | **Kopfzeile unter der Statusleiste**, Uhrzeit verdeckt. | `viewport-fit=cover` stand im Kopf, `env(safe-area-inset-top)` nirgends. | **behoben** in `0109cf2`, gemessen: Titel y=8 → y=67 bei 59 px Aussparung. **Noch nicht in echtem Safari geprüft** |
| 5 | **Zahl bei den kleinen Gasteinern auf anderer Höhe.** | Säulen unten bündig, Zahlen hingen an der Säulenhöhe. Gemessen: „Gast. 0,25" bei 376, Nachbarn bei 331. | **behoben** in `0109cf2` — alle acht Zahlen bei 331 |
| 6 | **Fotoschritt der Fassungsliste ist noch da**, treibt den Abschluss in die Freigabe. | `public/index.html:4232` (`rFotos`), Abschlusspunkt „Fassungsliste noch nicht fotografiert". | **offen** — Stück C, Vortagsabgleich, Variante (a) ist entschieden |
| 7 | **Die Zuordnung unterscheidet nicht zwischen Glas und Flasche.** | `public/leitung.html:983` (`flaschen`): die Ausschankgröße wird **automatisch** aus dem Kassennamen gelesen (`mlAusText`), das Gebinde ist für Wein hart 750. Steht keine Größe im Namen, gilt „ein Verkauf = eine Flasche" — **6 Aperol Spritz = 6 Flaschen**. | **offen** — hat Vorrang vor Punkt 6 |

**Zu Glas/Flasche, damit niemand neu suchen muss:**

* Der Z-Bericht berührt den **Bestand nicht**. `bestand()` (`src/index.js:373`)
  liest nur `ereignis`; der Import schreibt in `fassungsliste`/`fassungszeile`
  und erzeugt keine Ereigniszeile. Gerechnet wird die Umrechnung nur im
  **Abgleich** des Backoffice.
* Beispiele aus Nr. 37, heutiger Stand: `CH Gesellmann 1/8 l` (3) → 0,5
  Flaschen ✓ · `MU Muster … 0,75 l` (1) → 1,0 ✓ · `Prosecco 0,1l` (6) → 0,8
  und `0,75l` (1) → 1,0, zusammen 1,8 ✓ (nur wenn beide auf denselben
  Artikel zeigen) · `Amaro Averna 2 cl` (3) → gegen 750 statt 700 ml
  gerechnet · **jedes „… 1 Glas" ohne Größe im Namen → 1 Verkauf = 1 Flasche.**
* **Beschlossen, noch nicht gebaut:** dritter Zustand „Größe unbestätigt",
  solange nicht rechnen, im Abgleich „Größe fehlt" ausweisen · Vorschlag
  aus dem Namen ja, Übernahme nur per Klick · Ausschank je Kassenname in
  `mapping.gebinde_ml` (**Spalte existiert live**, `mappingSchreiben`
  nimmt sie schon entgegen, gesetzt wird sie nirgends) · Gebinde je
  Artikel (750 Wein, 700 Spirituose, 1000 Gasteiner) aus dem Code in die
  Stammdaten.
* **Keine Migration nötig** für Glas/Flasche. `fassungszeile.anzahl` ist
  `REAL`, Nachkommastellen sind möglich. `ereignis.menge` ist
  `INTEGER NOT NULL` — bleibt so, der Verkauf soll den Bestand nicht
  abbuchen (Entscheidung des Betreibers).

---

## 4 · ENTSCHEIDUNGEN

### Getroffen, mit Begründung in einem Satz

| Entscheidung | Warum |
|---|---|
| Live-D1 nur lesen, nie schreiben | Es gibt keine Sicherung und keinen Papierkorb; ein falsches `DELETE` ist endgültig. |
| Code an das Live-Schema anpassen, nicht umgekehrt | Additive Migrationen sind erlaubt, aber der Umbau bestehender Tabellen nicht — und der Code war falsch, nicht das Schema. |
| Die D1-Attrappe im Prüfgerüst löschen | Sie kannte die falschen Spaltennamen und bestätigte sie: 123 grüne Prüfungen über einem Worker, der live keine Zeile schreiben konnte. |
| Persönliche Codes sechs bis acht Ziffern, Bestätigungstaste | Die vier ersten Codes stehen im Klartext in der Geschichte des Anhangs; bei wechselnder Länge kann die App nicht raten, wann der Code zu Ende ist. |
| Der Positionsblock des Z-Berichts wird beim Namen gewählt | Daneben stehen zwei Warengruppen-Tabellen mit denselben Artikeln; über die Zeilenzahl gewinnt der richtige Block nur zufällig. |
| Rabatt und Storno zählen als Verbrauch | Vorgabe des Betreibers: die Ware ist in beiden Fällen entnommen. Der Rabatt steckt schon in den Positionen, der Storno fehlt ihnen und nennt keinen Artikel. |
| Das Backoffice parst nicht selbst | Es gab zwei Leser derselben Datei mit zwei Ergebnissen; jetzt gibt es einen. |
| Z-Berichte und Zuordnungen kommen vom Server | Sonst ist der per Mail eingelieferte Bericht unsichtbar und die Zuordnungsarbeit an ein Gerät gebunden. |
| Vortagsabgleich: Variante (a), gestern gefasst vs. gestern verkauft | Entscheidung des Betreibers; Anzeige erst ab einer ganzen Flasche Abweichung, sonst „passt", kein Zwang zur Korrektur. |
| Historie: additive Spalte `gehandelt` statt `ts` umzudeuten | Die Schreibzeit wird für die Idempotenz gebraucht und soll bleiben, wie sie ist. |
| `ereignis.menge` bleibt `INTEGER` | Der Verkauf soll den Bestand nicht abbuchen — das bleibt bei Zählung, Fassung und Wareneingang. |
| Getränke-Automapping bleibt aus (Regel 5) | Ähnlichkeitssuche liefert falsche Treffer; dasselbe gilt jetzt für die Ausschankgröße. |

### Offen — was jeweils vom Betreiber gebraucht wird

Alle in `review/OFFENE-ENTSCHEIDUNGEN.md`, dort ausformuliert mit
Optionen und Folgen.

| Nr. | Frage | Gebraucht wird |
|---|---|---|
| 4 | `RUNDEN` von 1000 auf 100000 | Eine Freigabe **plus** der Termin: danach müssen alle vier Personen sofort neu angelegt werden, sonst kommt niemand hinein. |
| 5 | `observability` in `wrangler.jsonc` | Erledigt vom Betreiber selbst (`e0001d6`) — Eintrag kann geschlossen werden. |
| 6 | Wer darf Soll-Mengen und Glasweine festlegen? | Eine Antwort: nur Leitung, oder jede Servicekraft. Daran hängt die Verwaltungsseite und `hh_cfg_v9`. |
| 7 | Sonderentnahme ohne Grund | Die Liste der Gründe (Bruch, Personal, Küche, Verkostung, Zimmer) und ob der Grund Pflicht wird. **Teuerster offener Punkt.** |
| 8 | Oberflächen-Aufnahmen im Prüflauf | Ob Playwright eine erlaubte Abhängigkeit ist (Regel 8). |
| 9 | Fotoschritt der Fassungsliste | Durch Stück C beantwortet, sobald gebaut — Eintrag dann schliessen. |
| 10 | `mapping.rezept` — Spalte fehlt live | Ob Rezepturen gebraucht werden. Migration liegt bereit, ist absichtlich nicht eingespielt. |
| 11 | Drei Spalten der Fassungsliste bleiben leer | Ob `kostenstelle`, `von_ts`, `bis_ts` gefüllt werden sollen. |
| 12 | Gespaltener Z-Bericht | Am echten Bericht beantwortet (Nr. 37 ist nicht gespalten); offen bleibt nur der Rückfall für fremde Layouts. |
| 13 | Codelänge sechs bis acht mit ✓-Taste, oder genau sechs ohne | Ein Satz nach einer Woche Betrieb. |
| 14 | Hat das Getränkelager einen Bestand? | Ob das Lager gezählt werden soll und wie oft. |
| 15 | Betriebstag oder Zeitstempel? | Eine Entscheidung, bevor die Geräte das erste Mal eine volle Warteschlange nachschicken. |

### Vom Betreiber zu tun (nicht von einem Agenten erreichbar)

1. **Die vier persönlichen Codes neu vergeben** — Ablauf Schritt für
   Schritt in `review/ERGEBNIS.md`. Kurz: neue App auf dem Gerät holen
   (sechs Kästchen und ✓-Taste im Anmeldeschirm), mit dem **alten** Code
   anmelden, Backoffice → Team, eine Person zuerst, auf einem zweiten
   Gerät prüfen, eigenen Code zuletzt.
2. **Sicherung der D1** — es gibt keine.
3. **Geräte nicht aufräumen**, bis die Warteschlangen einmal durch sind.
4. **In der ersten Woche jede Zahl aus „Verkauf ↔ Fassung" gegenlesen.**
5. `ANLAGE_OFFEN` ist seit 17.09. gelöscht (`/api/ping` meldet
   `anlage: false`) — **erledigt**.
6. `review/INPUT-TEAM.md` weiter füllen, besonders „Leitung: Was will ich
   morgens auf einen Blick sehen?".

---

## 5 · FALLEN UND WISSEN

### Die harten Regeln aus `CLAUDE.md` — die, an denen es weh tut

1. **Nur auf `v2-review` arbeiten.** Nie auf `main` pushen, nie mergen,
   nie force-pushen. Den Merge (= Livegang) macht der Betreiber.
2. **Live-D1 nur lesen.** `SELECT`, `PRAGMA`, `sqlite_master` über den
   Cloudflare-Connector sind erlaubt und erwünscht. Jedes Schreiben ist
   verboten. Kein `wrangler deploy`, kein `--remote`.
3. **`schema.sql` im Wurzelverzeichnis ist veraltet und wird NIE
   ausgeführt.** Wahrheit ist `docs/live-schema.sql`. Lokale Test-DB
   immer daraus aufbauen.
4. **`wrangler.jsonc` nicht selbst ändern** (Regel 12) — was nur im
   Dashboard steht, geht beim Deploy sonst verloren.
5. **Keine Codes, Passwörter oder Secrets** in Dateien, Commits, Logs.
   Prüfungen würfeln ihre Codes beim Start.
6. **Genau vier Dateien in `public/`.** Die Gestaltungsschicht steht
   **wortgleich** in `index.html` und `leitung.html` — zwischen der Marke
   „ACHTUNG · geteilte Gestaltungsschicht" und der `.vh`-Regel. Eine
   Prüfung hält es fest.
7. **Nach jeder Änderung in `public/`: `VERSION` in `sw.js` erhöhen.**
   Sonst holt das iPhone den neuen Stand nicht. Steht auf **v25**.

### Die Fallen, die dieses Projekt gelegt hat

* **Eine Prüfattrappe, die die falschen Spaltennamen mitlernt, bestätigt
  jeden Fehler.** 123 grüne Prüfungen über einem Worker, der live keine
  Zeile schreiben konnte. Deshalb: `tests/hilfe/d1-echt.mjs` baut eine
  echte SQLite aus `docs/live-schema.sql`.
* **Dieselbe Logik zweimal im Haus.** Erst der Z-Bericht-Leser (einmal in
  `gnparse.js`, einmal in `leitung.html` — dieselbe Datei, 48 gegen 106
  Positionen), dann die Bestandsrechnung. **Es gibt sie immer noch
  zweimal:** `bestand()` in `src/index.js:373` und in
  `public/leitung.html:882`. Wer eine ändert, muss die andere ansehen.
* **Nachgebaute Testdaten beweisen nur, was sich jemand ausgedacht hat.**
  Der erste echte Z-Bericht hat vier Formannahmen auf einmal widerlegt
  und einen Faktor 64 aufgedeckt („1/8 l" als acht Liter).
* **`ereignis.ts` ist die Schreibzeit, nicht die Zeit der Handlung.**
  Nach einem Funkloch liegen alle Zeilen auf der Minute des
  Nachschickens. Betrifft die Bestandsrechnung (Entscheidung 15) und die
  geplante Historie.
* **Grün heisst nicht geprüft, wenn die Oberfläche nie angefasst wurde.**
  `npm test` war 195 grün, während drei der fünf Modi falsche oder gar
  keine Mengen schrieben. Neu deshalb: `tests/modi.test.mjs` und
  `tests/ui-leitung-echt.cjs` fassen den ausgelieferten Code an.
* **Chromium ist nicht Safari.** In diesem Container läuft nur Chromium;
  WebKit ist bei Playwright eingetragen, aber nicht installiert.
  Alles Visuelle am iPhone muss der Betreiber selbst gegenprüfen.
* **Der Service Worker liefert alte Stände aus.** Nach einem Deploy
  braucht jedes Gerät einmal Netz und ein Neuladen. Erkennungszeichen für
  v25: sechs Kästchen und die ✓-Taste im Anmeldeschirm.
* **Offline ist der Normalfall.** Die Warteschlange (`hh_ausgang_v1`)
  verwirft nie etwas, auch nach Tagen nicht. Ein Gerät, das lange ohne
  Netz war, schickt beim ersten Kontakt alles auf einmal — das sieht aus
  wie ein Fehler und ist richtig so.

### Die Werkzeuge

| Befehl | Was er prüft |
|---|---|
| `npm test` | 211 Prüfungen, Bordmittel von Node 22, kein Netz |
| `node tests/durchstich.cjs` | 35 Punkte: App **und** Worker gleichzeitig, gegen echtes Schema. **Vor jedem Livegang laufen lassen.** |
| `node tests/ui-leitung-echt.cjs` | 22 Punkte: Backoffice in Chromium gegen echten Worker und echten Z-Bericht |
| `node tests/persona-tagesfassung.cjs` | eine Servicekraft am iPhone, erster Tag, durch die ganze Tagesfassung |
| `RUNDE=x node tests/ui-aufnahme.cjs` | Aufnahmen der App |

Chromium liegt unter `/opt/pw-browsers`, **kein `playwright install`.**

### Wo was steht

| Datei | Inhalt |
|---|---|
| `CLAUDE.md` | die harten Regeln, das Übergabeformat, die Rollen |
| `docs/live-schema.sql` | **die Wahrheit** über das Schema (Regel 3) |
| `review/ERGEBNIS.md` | die Beschreibung des letzten Pull Requests, die Auflagen vor dem Livegang, der Codewechsel Schritt für Schritt |
| `review/OFFENE-ENTSCHEIDUNGEN.md` | Nr. 1–15, was der Betreiber entscheiden muss |
| `review/BACKLOG.md` | rund 17 Punkte unter „hoch", dazu mittel/niedrig und alles Erledigte mit Fundstelle |
| `review/INPUT-TEAM.md` | Anliegen aus dem Haus — hat Vorrang vor allem, was Rollen sich ausdenken |
| `review/LOG.md` | alle Züge aller Runden, jeder mit Kritik am Vorgänger |
| `PROJEKTANLEITUNG-Fassungstool.md`, `UEBERGABE-TECHNISCH.md` | die maßgebliche Doku des Hauses |

### Womit als Nächstes weitergemacht wird

In dieser Reihenfolge, so abgesprochen:

1. **Punkt 1** — „Verwaltung" raus aus der App, für Rolle `leitung` ein
   Weg ins Backoffice, und dort eine Verwaltungsseite: **vorerst nur
   Glasweine und Soll-Mengen** (der alte PIN-Editor), dazu das Gebinde je
   Artikel. Der Rest kommt in Phase B.
2. **Glas/Flasche** — dritter Zustand „Größe unbestätigt", Vorschlag nur
   auf Klick, Ausschank in `mapping.gebinde_ml`, Gebinde in die
   Stammdaten. Hat Vorrang vor Punkt 6.
3. **Stück C** — Fotoschritt raus, Vortagsabgleich rein, Variante (a),
   Anzeige erst ab einer ganzen Flasche Abweichung, sonst „passt", kein
   Zwang zur Korrektur.
4. In derselben Migration billig mitnehmen: additive Spalte
   `ereignis.gehandelt` für die spätere Historie im Backoffice
   (Filter nach Zeitraum, Person, Artikel, CSV — Backlog, nicht jetzt).
