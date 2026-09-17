# In der Nacht entschieden

Casimir schläft. Diese Entscheidungen hat der Stellvertreter
(`.claude/agents/stellvertreter.md`) an seiner Stelle getroffen, damit der
Zyklus nicht stehen bleibt. **Jede einzelne ist vorläufig und revidierbar.**
Was zurückgedreht werden soll, steht in `review/MORGENBRIEF.md` mit Aufwand
in Minuten.

Nicht hier entschieden – und deshalb unverändert in der Morgenliste:
Anmeldung, Token, Rechte, Codes; Migrationen und Schemaänderungen; `RUNDEN`;
`wrangler.jsonc`; alles, was eine Dashboard-Einstellung braucht; alles
Löschende; Phase-B-Code.

---

## Vorbemerkung des Stellvertreters (Nacht 17./18.09.2026)

Zwei der fünf Dateien, die meine Rollenbeschreibung als Wissensgrundlage
nennt, gibt es im Repo **nicht**: `review/UEBERGABE.md` und
`fassungstool_review_referenz.md`. Ich sage das, statt es zu überspielen.
Gelesen habe ich stattdessen: `PROJEKTANLEITUNG-Fassungstool.md`,
`UEBERGABE-TECHNISCH.md`, `review/OFFENE-ENTSCHEIDUNGEN.md` (Punkte 6, 7,
9, 12, 14, 15), `review/LOG.md` (Runden 1–5), `review/BACKLOG.md`,
`docs/live-schema.sql` und den betroffenen Code.

**Ein Fund vorweg, der drei der sieben Antworten trägt:** Die Tabelle
`fassungszeile` hat live eine Spalte **`ausschankMl INTEGER`**
(`docs/live-schema.sql`), sie wird beim Import schon geschrieben
(`src/index.js:430`) und gelesen (`:456`, `public/leitung.html:734`). Die
Frage „wohin mit der Ausschankmenge" ist also enger als gedacht — es fehlt
nicht der Ort für die Zahl je Bericht, sondern der Ort für die **einmal
bestätigte** Zahl je Kassenname. Und: `mapping.gebinde_ml` wird
geschrieben (`src/index.js:490`) und über `/api/mapping` ausgeliefert
(`:615`), aber **von keiner Rechnung gelesen** — `public/leitung.html`
kennt die Spalte nicht. Sie ist heute tot.

---

### 1 · Wohin gehört die bestätigte Ausschankmenge einer Kassenposition?

**Entschieden:** In die Tabelle `stamm`, ein Schlüssel je Kassenname
(`ausschank/<kassenname>`, Wert `{"ml":125}`), geschrieben über einen
neuen Endpunkt `POST /api/stamm`; `mapping.gebinde_ml` wird **nicht**
umgedeutet, und bis der Schreibweg steht, wird eine Position ohne
bestätigte Größe als „Größe fehlt" ausgewiesen statt gerechnet.

**Warum:** `stamm` ist ein freier Schlüssel-Wert-Speicher mit den Spalten
`wer` und `geaendert` — das ist keine Zweckentfremdung, sondern genau der
Zweck, und es erledigt nebenbei die Forderung aus Nr. 6, dass eine
Stammdatenänderung gezeichnet sein muss, ohne eine einzige Migration;
Option (b) scheitert an der Haltung „nichts stillschweigend umdeuten",
Option (c) allein ließe drei Pakete stehen.

**Dazu im Einzelnen, damit die Nächsten nicht raten müssen:**

1. **Sofort und unabhängig vom Schreibweg:** `flaschen()`
   (`public/leitung.html:973–979`) hört auf zu raten. Die beiden stillen
   Annahmen — `(aus||750)/750` für Wein und „eine Einheit = eine Flasche"
   für Getränke — fallen weg. Eine Position ohne bestätigte Größe geht
   **nicht** in die Verkaufssumme, sondern in eine eigene Liste „Größe
   fehlt", neben der es heute schon gibt („offen"). Lieber eine Zeile
   weniger gerechnet als eine falsch.
2. **Eine Zahl, ein Leser.** `flaschen()` liest die Größe künftig aus
   `p.ml` (kommt vom Server, `public/leitung.html:734`), nicht mehr aus
   `mlAusText(p.name)` im Browser. Das ist dieselbe Berichtigung, die
   Runde 5 für den Z-Bericht gemacht hat („Es gibt einen Leser, eine
   Zahl"); zwei Kopien derselben Ableitung waren zweimal der teuerste
   Fund des Jägers.
3. **Der Vorschlag bleibt ein Vorschlag.** `mlAusText` darf weiter aus dem
   Kassennamen lesen — aber nur, um der Leitung „125 ml?" zur Bestätigung
   **vorzuschlagen**. Erst der Klick macht daraus einen Wert. Nichts
   automatisch zuordnen, was der Mensch bestätigen kann.
4. **Beim Import wird der bestätigte Wert in `fassungszeile.ausschankMl`
   mitgeschrieben** — dieselbe Mechanik, die `mappingSchreiben` für
   `artikel` schon hat (`src/index.js:497`, `UPDATE fassungszeile`). Damit
   bleibt nachvollziehbar, mit welcher Größe ein *bestimmter* Bericht
   gerechnet wurde, auch wenn der Stammwert später geändert wird.
5. **Ein Schlüssel je Kassenname, kein einzelner JSON-Klumpen.** Sonst
   überschreibt jeder Schreibvorgang die ganze Tabelle, und `wer`/
   `geaendert` sagen nur noch, wer zuletzt irgendetwas angefasst hat. Bei
   Bericht Nr. 37 sind das 48 Zeilen — eine Größenordnung, die
   `/api/stamm` unverändert ausliefern kann.
6. **`mapping.gebinde_ml` wird nicht angefasst** — weder benutzt noch
   gelöscht (nichts Löschendes). Sie heißt Gebinde und soll Gebinde
   bleiben, falls das Haus einmal eine 1,5-l-Flasche führt.

**Betrifft:** `public/leitung.html:973` (`flaschen`), `:587` (`mlAusText`),
`:734`; `src/index.js:585` (`/api/stamm`, heute nur GET), `:430`, `:456`;
`docs/live-schema.sql` (`stamm`, `fassungszeile`, `mapping`)

**→ Morgenliste (nicht von mir entschieden):** (a) ob `POST /api/stamm` im
Worker an die Rolle `leitung` gebunden wird — das ist eine Rechtefrage;
(b) ob mittelfristig doch eine eigene Spalte `mapping.ausschank_ml` per
Migration kommt, die ehrlichere Heimat, die aber heute niemand einspielen
kann.

**Aufwand, wenn Casimir es zurückdreht:** 20 Min., solange nur „Größe
fehlt" ausgewiesen wird; rund 45 Min., wenn `POST /api/stamm` schon steht.
*vorläufig, revidierbar*

---

### 2 · Wer darf Soll-Mengen und Glasweine festlegen (Nr. 6)?

**Entschieden:** Ändern darf **die Leitung**, geändert wird **im
Backoffice** (`public/leitung.html`, neue Ansicht „Vorgaben"), die Werte
liegen in D1 `stamm` statt in `hh_cfg_v9`, und der heutige Editor in der
Service-App wird **nicht gelöscht, sondern schreibgeschützt**.

**Warum:** „Verwaltung gehört ins Backoffice, nicht in die Service-App" —
aber Option 3 aus Nr. 6 (Editor ersatzlos raus) macht Glasweine
vorübergehend nirgends änderbar, und das ist schlechter als der heutige
Zustand; ein schreibgeschützter Blick auf die geltenden Soll-Mengen kostet
den Service nichts und nimmt ihm nichts weg.

**Im Einzelnen:**

1. **Ein Paket, nicht zwei Schritte.** Die Ansicht im Backoffice und der
   Schreibschutz in der App gehören in denselben Zug (P2). Erst wenn die
   Werte in `stamm` stehen und dort änderbar sind, wird das Feld in der
   App stumpf.
2. **Kein Rollencheck nötig — und deshalb auch keiner gebaut.**
   `leitung.html` lebt ohnehin vom Cookie, und ein Feld, das niemand mehr
   ändern kann, braucht keine Sperre. Damit fasse ich weder Anmeldung noch
   Rechte an. Das ist der Grund, warum ich Option 2 aus Nr. 6 (Rolle beim
   Anmelden merken) **nicht** wähle: Sie löst dasselbe Problem teurer und
   auf der Ausschlussliste.
3. **`hh_cfg_v9` wird zur Abschrift**, genau wie der `localStorage` für
   die Z-Berichte seit Runde 5: gelesen wird der Serverwert, der
   Gerätespeicher trägt nur noch die letzte bekannte Fassung, damit der
   Keller ohne Netz nicht leer dasteht. Damit endet der schlimmste Befund
   aus Nr. 6 — drei Geräte mit drei Soll-Ständen.
4. **Gezeichnet wird über `stamm.wer` und `stamm.geaendert`**, nicht über
   das Ereignisjournal: `ereignis.art` hat live eine CHECK-Bedingung
   (`zaehlung|entnahme|eingang|korrektur`), eine Stammdatenänderung passt
   dort nicht hinein, und eine neue Art wäre eine Migration. `stamm`
   beantwortet „wer zuletzt, wann" — nicht „alter Wert → neuer Wert".
   Das ist weniger, als Nr. 6 verlangt, aber heute erreichbar.
5. **Der Service behält seinen echten Weg:** „Ist gerade aus" melden
   (Projektanleitung §8 B), nicht die Stammdaten ändern. Service meldet
   den Zustand, die Leitung entscheidet den Ersatz.
6. **Der Menüpunkt heißt nicht mehr „Verwaltung".** Er verspricht heute
   etwas, das er nach P2 nicht mehr hält. „Vorgaben" sagt, was drinsteht.

**Betrifft:** `public/index.html:1836` (`bAdmin`), `:1899` (`askPin`),
`:1933` (`renderAdmin`), `:1956` (`.aSoll`), `hh_cfg_v9`;
`public/leitung.html` (neue Ansicht); `src/index.js:585` — Paket P2

**→ Morgenliste (nicht von mir entschieden):** Die volle Historie einer
Soll-Änderung (alter Wert → neuer Wert, dauerhaft) braucht eine eigene
Tabelle oder eine neue `ereignis.art` — beides Migration. Ebenso der
Befund des qa-guardian, dass `bekannterCode()` irgendeinen Gerätecode
prüft statt den der angemeldeten Person (`public/index.html:1330`); für
den Editor erledigt sich das mit dem Schreibschutz, für die **Freigabe**
nicht, und das ist eine Rechtefrage.

**Aufwand, wenn Casimir es zurückdreht:** 5 Min., solange P2 nicht gebaut
ist; rund 60 Min. danach.
*vorläufig, revidierbar*

---

### 3 · Fällt der Fotoschritt „Fassungsliste" weg (Nr. 9)?

**Entschieden:** Weg fällt **die Freigabe-Kopplung**, nicht die
Möglichkeit zu fotografieren — und der Vortagsabgleich tritt **nicht** an
dieselbe Stelle, weil er im Keller ohne Netz nichts anzeigen kann.

**Warum:** Der Schaden aus Nr. 9 ist Befund 3 (eine tadellose Tagesfassung
endet in „Ohne Bestätigung freigegeben von …", und die Leitung lernt,
Warnungen zu überlesen) — das ist eine Zeile; alles andere ist Umbau, und
ein Ersatz, der Netz braucht, ist im Keller kein Ersatz.

**Was genau fällt:**

1. Der Punkt „Fassungsliste noch nicht fotografiert" aus `offenList()`
   (`public/index.html:4044`) — **sofort und unabhängig von allem
   anderen**. Damit ist eine vollständige Fassung wieder ohne Freigabe
   abschließbar, und die Freigabe ist wieder die Ausnahme, die sie sein
   soll.
2. Der Vorrang des Fotoknopfs im Abschluss. Der Fotoblock rutscht **unter**
   „Fertig – Protokoll erstellen" und heißt „Foto anhängen (freiwillig)".
   Die Umkehr der Knopfgewichte erledigt sich dabei von selbst
   (`.finishbtn.blocked` greift nicht mehr) — der Backlog-Punkt aus
   hospitality-pro Runde 2 sagt ausdrücklich „nicht einzeln anfassen",
   und das gilt weiter.

**Was ausdrücklich NICHT fällt:**

3. Das Foto selbst. Nichts löschen: bereits aufgenommene Bilder bleiben in
   der IndexedDB und in archivierten Protokollen, `fclean()` räumt sie wie
   bisher mit dem Vorgang weg. Wer die Liste fotografieren will, darf.
4. Der Kacheltext der Tagesfassung (`public/index.html:1352`) verliert den
   Halbsatz „Liste fotografieren", sobald das Foto freiwillig ist — aber
   „Gestern gegenprüfen" kommt **erst**, wenn der Vortagsabgleich wirklich
   in der App steht. Bis dahin endet der Text nach dem Holen. Nr. 9 Punkt 3 sagt das
   selbst („erst dann, nicht vorher"), und ein Kacheltext, der etwas
   verspricht, das der Schritt nicht kann, ist der Anfang desselben
   Schadens noch einmal.

**Was der Vortagsabgleich sein darf und was nicht:**

5. Er gehört dorthin, wo Netz und Bildschirm sind: ins Backoffice. In der
   App darf er als **Anzeige** erscheinen, wenn die Daten da sind
   (`GET /api/fassungsliste?tag=…`) — aber **nie** als offener Punkt und
   **nie** als Bedingung für den Abschluss. Sonst steht im Keller ohne
   Netz derselbe Zwang wie heute, nur mit einer Netzabhängigkeit davor.
   Das wäre schlimmer als der Fotoschritt.
6. Der Satz aus Nr. 9 bleibt richtig: Was die Liste leistet („was stand
   auf dem Zettel?"), leistet der Vortagsabgleich nicht. Das ist kein
   Einwand — ein Bild, das niemand ansieht, leistet es auch nicht.

**Betrifft:** `public/index.html:4044` (`offenList`), `:3885` (`rFotos`),
`:1352` (Kacheltext), `:911` (`.fotobtn.leer`), `:286`
(`.finishbtn.blocked`); Projektanleitung §8 C

**Aufwand, wenn Casimir es zurückdreht:** 10 Min. (Punkt 1 und 2 sind
zusammen wenige Zeilen).
*vorläufig, revidierbar*

---

### 4 · Hat das Getränkelager einen Bestand oder nur Bewegungen (Nr. 14)?

**Entschieden:** Heute **nur Bewegungen** — und das Backoffice sagt es an
der Zahl, wörtlich: „Getränke werden nicht gezählt. Diese Zahl ist eine
Fortschreibung ohne Zählung."

**Warum:** Eine Fortschreibung ohne Anker sieht genauso aus wie ein
Bestand, und eine Zahl, die still etwas anderes behauptet, als sie ist,
ist schlimmer als eine fehlende — dieselbe Haltung wie bei „Größe fehlt".

**Dazu:** Solange dieser Satz steht, darf keine Getränkebestellung auf die
Zahl gestützt werden; die Ansicht „Bestellen" führt Getränke deshalb
weiter **nicht** mit. Das ist Option 1 aus Nr. 14, aber ehrlich
beschriftet statt stillschweigend.

**Betrifft:** `public/leitung.html` (Ansicht „Getränke"),
`src/index.js:281` (Kellerzählung), `public/index.html:3090` (`gFehlt`)

**→ Morgenliste (nicht von mir entschieden):** Option 2 und 3 aus Nr. 14
(Getränkelager in die Kellerzählung aufnehmen bzw. eigener Modus
„Lagerzählung") sind Phase-B-Code und hängen an einer Antwort, die nur das
Team geben kann — wie oft das Lager wirklich gezählt wird. `INPUT-TEAM.md`
ist bis heute leer.

**Aufwand, wenn Casimir es zurückdreht:** 5 Min. (ein Satz).
*vorläufig, revidierbar*

---

### 5 · Zählt der Betriebstag oder der Zeitstempel (Nr. 15)?

**Entschieden:** Der **Betriebstag** (`ereignis.tag`) entscheidet, der
Zeitstempel nur noch bei Gleichstand innerhalb desselben Tages — und ein
Paket, das älter ist als die jüngste Zählung, wird beim Eintreffen
gemeldet („nachgereicht, nicht mehr eingerechnet"). Das ist Option 3.

**Warum:** `ereignis.ts` ist die Zeit des Schreibens, nicht die der
Handlung; in einem Haus, dessen Keller der Normalfall ohne Netz ist,
rechnet die heutige Formel genau dann falsch, wenn sie am meisten gebraucht
wird — und „lieber weniger Funktion als eine, die still falsch rechnet"
gilt auch für eine Zahl, die schon angezeigt wird.

**Zwei Fallen, die beim Bauen nicht übersehen werden dürfen:**

1. **Die Regel ist nicht `tag > Zähltag` allein.** Wird am Morgen des 16.
   gezählt und am Abend des 16. gefasst, fiele diese Entnahme sonst
   vollständig unter den Tisch — derselbe Fehler wie heute, nur
   andersherum. Richtig ist: `tag > Zähltag` **oder** (`tag = Zähltag`
   **und** `ts > Zähl-ts`).
2. **`bestand()` gibt es zweimal** — im Worker (`src/index.js:362 ff.`)
   und im Backoffice (`public/leitung.html`). Beide rechnen dieselbe Regel
   getrennt; wer eine ändert und die andere nicht, erzeugt zwei Wahrheiten.
   Der software-engineer hat in Runde 5 selbst angeregt, dass die Leitung
   besser `/api/bestand` liest. Wird das jetzt gemacht, ist diese
   Entscheidung an einer Stelle umgesetzt statt an zweien.
3. **Es bewegt Zahlen, die die Leitung heute sieht.** Also nicht still: in
   `review/ERGEBNIS.md` gehört eine Zeile, welche Bestände sich dadurch
   ändern und warum.

**Betrifft:** `src/index.js:362 ff.` (`bestand`), `public/leitung.html`
(zweite Bestandsrechnung)

**Aufwand, wenn Casimir es zurückdreht:** 30 Min. (zwei Stellen, plus die
Prüfungen).
*vorläufig, revidierbar*

---

### 6 · Ein Z-Bericht, zwei Blöcke — welcher gewinnt (Nr. 12, nur der Rückfall)?

**Entschieden:** Im Rückfall gewinnt weiter der größte Block — aber
**nie mehr lautlos**: Der Import nennt künftig immer, wie viele
Positionszeilen außerhalb des gelesenen Blocks standen, und **verweigert**
den Import mit Klartext, wenn kein Block über seinen Namen gefunden wurde
**und** eine zweite Sektion mindestens so viele Positionszeilen hat wie die
gewählte.

**Warum:** Ein halb eingelesener Bericht ist der teuerste Fehler dieses
Werkzeugs — er erzeugt eine plausible Zahl, die jede Nacht in dieselbe
Richtung falsch ist, und schickt jemanden in den Keller, um dort etwas zu
suchen, das an der Bar verkauft wurde; ein verweigerter Import kostet einen
Morgen und ist sichtbar.

**Und was ausdrücklich nicht getan wird:**

1. **Nicht „alle Sektionen mit Positionszeilen einlesen".** Das Risiko,
   den Zahlungsarten- oder Trinkgeldblock mitzunehmen, ist größer als der
   Nutzen: Umsatz zu **erfinden** ist schlimmer, als ihn zu verlieren.
   Regel 7 verbietet ohnehin das Schrauben an `gnparse.js` auf Verdacht.
2. **Keine eigene `fassungsliste`-Zeile je Kostenstelle.** Das
   widerspricht der Antwort des hospitality-pro zu Nr. 11 („ein Eintrag
   je Tag").
3. **Frage 2 aus Nr. 12 bleibt offen — zu Recht.** Für Haus Hirt ist der
   Fall nicht eingetreten (Bericht Nr. 37 ist nicht gespalten, die
   Blockwahl geht seit Runde 4 über den Namen). Käme je ein wirklich
   gespaltener Bericht, ist die Antwort „beide Blöcke lesen und je
   Positionsname summieren" — das ist Eigenheit 1 aus Regel 7 eine Ebene
   höher. Gebaut wird das aber erst, wenn ein solcher Bericht in
   `tests/fixtures/` liegt, nicht vorher.
4. Punkt 1 aus Nr. 12 ist inzwischen halb erledigt:
   `tests/fixtures/zbericht-37-extended.csv` liegt vor. Der teure Teil der
   Frage ist damit beantwortet, der billige Rest ist die Meldung oben.

**Betrifft:** `src/gnparse.js:114–120` (Blockwahl), `src/index.js:415 ff.`
(`fassungslistenSchreiben`, Rückmeldung und Journalnotiz),
`tests/zbericht.test.mjs` (Block „welcher Block gewinnt")

**Aufwand, wenn Casimir es zurückdreht:** 20 Min.
*vorläufig, revidierbar*

---

### 7 · Sonderentnahme ohne Grund (Nr. 7)

**Entschieden:** Ja, der Grund wird erfasst — als **erster** Schritt, mit
fünf festen Knöpfen, ein Tipper, keine Tastatur: **Küche · Personal ·
Bruch/Kork · Verkostung/Gast · Zimmer**. Er ist Pflicht, die Notiz bleibt
freiwillig, und er gehört zum Vorgang, nicht zur einzelnen Zeile.

**Warum:** Bei einer Sonderentnahme ist der Grund nicht die Nebensache,
sondern die Sache — „3 Flaschen weg" ohne Grund ist für die Leitung keine
Auskunft, sondern eine Frage; und ein Tipper auf einen großen Knopf ist im
Keller billiger als das Freitextfeld am Ende, das nach dem Service niemand
mehr ausfüllt.

**Vier Festlegungen, die das Bauen entscheiden:**

1. **Keine Migration nötig.** Der Grund reist im Vorgang (`daten` ist ein
   JSON-Blob) und geht im Journal in `ereignis.notiz` — Freitext, heute
   für abgeleitete Zeilen ungenutzt (`src/index.js:328` bindet zehn
   Werte, `notiz` bleibt leer). Damit er sich im Backoffice gruppieren
   lässt, steht er **vorn und in fester Form**: `grund=bruch` und danach
   erst die freie Notiz. Eine neue `ereignis.art` wäre eine Migration und
   kommt nicht in Frage — die CHECK-Bedingung lässt nur
   `zaehlung|entnahme|eingang|korrektur` zu.
2. **„Bruch/Kork" statt nur „Bruch".** Die korkige Flasche ist im Hotel
   der häufigste Weinverlust überhaupt und ist kein Bruch. Ohne eigenes
   Wort wird sie entweder falsch einsortiert oder gar nicht gemeldet.
3. **Kein sechster Knopf „Anderes".** Er würde binnen zwei Wochen zur
   Voreinstellung und die ganze Unterscheidung wertlos machen. Wer
   wirklich keinen der fünf Fälle hat, nimmt den nächstliegenden und
   schreibt eine Notiz.
4. **Zwei Gründe = zwei Sonderentnahmen.** Ein Grund je Vorgang, nicht je
   Flasche. Der Modus ist kurz; ihn zweimal zu durchlaufen ist billiger,
   als jede Zeile einzeln einem Konto zuzuordnen — und es hält die
   Kostenzuordnung sauber.

**Bleibt wie in Nr. 7 beschrieben ausgeschlossen:** kein Pflichtfeld
Kostenstelle, keine Tisch- oder Zimmernummer, keine Preisrechnung in der
App.

**Wortlaut und Reihenfolge der fünf Gründe sind ausdrücklich vorläufig** —
sie gehören mit dem Team abgestimmt (`review/INPUT-TEAM.md`, bis heute
leer). Das ist der Teil dieser Entscheidung, der am ehesten zurückgedreht
wird, und er kostet fünf Zeichenketten.

**Betrifft:** `public/index.html:1361` (Modus `nach`), `:3746` (Notiz),
`blank("nach")`; `src/index.js:289` (`ereignisseAbleiten`, Zweig `nach`),
`:328` (Journalzeile)

**Aufwand, wenn Casimir es zurückdreht:** 40 Min. für den ganzen Schritt,
5 Min. für die Wortwahl allein.
*vorläufig, revidierbar*

---

## Nachtrag zu Entscheidung 1 (beim Abschluss bemerkt)

Während ich schrieb, hat ein anderer Zug `public/leitung.html` umgebaut
(unbeglichen im Arbeitsbaum, nicht von mir): `mapping.gebinde_ml` wird
dort jetzt als **bestätigte Gebindegröße** gelesen (`GEB_BEST`,
`gebindeGroesse()`), mit einer ausdrücklichen Rangfolge
bestätigt → Vorschlag → „wird NICHT gerechnet". Die Kommentarzeile dort
trennt genau richtig: im **Kassennamen** steht die Ausschankmenge, im
**Artikelnamen** die Gebindegröße — zwei verschiedene Dinge.

Das bestätigt Entscheidung 1 von zwei Seiten:

* Option (b) ist damit nicht nur unsauber, sondern **belegt kollisions-
  trächtig**: Die Spalte ist ab sofort mit dem Nenner der Rechnung belegt.
  Wer sie zusätzlich mit dem Zähler belegte, hätte zwei Bedeutungen in
  einer Spalte und keine Möglichkeit, sie auseinanderzuhalten.
* Die beiden Arbeiten ergänzen sich sauber: `mapping.gebinde_ml` trägt die
  Gebindegröße (Nenner), `stamm` trägt die Ausschankmenge (Zähler). Beide
  kennen die drei Zustände bestätigt / Vorschlag / fehlt, und beide
  rechnen im Zustand „fehlt" nicht.

Wer als Nächster an `flaschen()` geht, sollte die Zählerseite genau nach
demselben Muster bauen wie die dort schon gebaute Nennerseite — gleiche
Rangfolge, gleiche Rückgabe `{ml, quelle, woher}`, gleiche Wortwahl im
Backoffice. Zwei verschiedene Formen für dieselbe Unterscheidung wären der
nächste teure Fund.

*vorläufig, revidierbar*
