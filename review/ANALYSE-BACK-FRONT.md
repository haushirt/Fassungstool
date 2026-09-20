# Analyse · Keller und Backoffice

**20.09.2026 · Stand `f252b88` (= `main`), `sw.js` v61, `npm test` 445/445 grün**

Reiner Analyse-Lauf. Nichts am Code geändert. Gelesen wurde der ganze Weg:
Fassen im Keller (`public/index.html`) → Worker (`src/index.js`) → Z-Bericht aus
der Mail (`src/gnparse.js`) → Backoffice (`public/leitung.html`). Dazu ein
Prüfstand mit echtem Worker, echter Datenbank aus `docs/live-schema.sql` und dem
echten Z-Bericht aus `tests/fixtures/` — damit steht unten gemessenes Verhalten,
keine Vermutung.

---

## 1 · Zwei Sachen machen die Zahlen kaputt

### 1a · Jede geholte Getränkeflasche zählt im Backoffice doppelt

**Gemessen, nicht vermutet.** Ein Getränk, Soll 7 in der Lade, 3 noch da,
4 geholt und abgehakt — genau so, wie die App es beim Abschluss schickt:

```
App schickt              gent = 4
Ereignisjournal (Worker) entnahme 4 lager          ✔ richtig
Backoffice               getr = 8                  ✘ doppelt
```

Der Grund steht an zwei Stellen derselben Funktion: `normVorgang`
(`leitung.html:922–927`) rechnet die Fehlmenge aus der Ladengeometrie selbst
noch einmal aus (`Soll − Ist`) und legt sie ab; vierzig Zeilen später
(`:968`) addiert sie zusätzlich `gent` in denselben Topf — und `gent` **ist**
genau dieselbe Zahl (`index.html:4751`, `geholteGetraenke`). Der Worker rechnet
richtig: er liest nur `gent`.

**Wirkung:** Für jedes Getränk, an jedem Tag, entsteht eine erfundene
Abweichung in exakter Höhe der geholten Menge. Betroffen sind Mittagsblick,
„Verkauf ↔ Fassung", Zählliste, Verbrauch, Nachbestellen, Eingänge, CSV —
**und das gedruckte Blatt, das aus dem Haus geht.**
Die Gegenrichtung ist auch falsch: ist der Haken „geholt" nicht gesetzt, ist
`gent` leer, das Backoffice zählt trotzdem einmal, der Worker gar nicht.

Warum 445 grüne Prüfungen das nicht gefunden haben: **jede** Prüfdatei setzt
`gent` ohne `getr`. Ohne `getr` ist Ist = Soll, die Fehlmenge 0 — der Fehler
ist in den Prüfdaten wegdefiniert.

### 1b · Eine fehlende Angabe wird als Null gerechnet

Der Beweis steht als Bild bei (`review/mockup/bilder/heute-vorher-macbook.png`):
echter Worker, echte Datenbank, echter Z-Bericht. Der Mittagsblick sagt dazu

* Kachel **„Auffällige Differenzen · 12"** in Rot,
* zehn Weine mit **„Verkauf 0 · Entnahme 6 · +6"** und der Deutung
  **„mehr geholt als verkauft — Vorrat aufgebaut oder im Keller nachsehen"**,
* Bestellvorschlag **„7 × 6 Kisten"** für sieben Weine, drei mit negativem
  Bestand.

Keine dieser Zahlen stimmt. Der wahre Grund steht zwei Zentimeter darüber im
gelben Kasten: *44 Kassennamen sind keinem Artikel zugeordnet.* Ihr Verkauf
zählt als **0**, nicht als **unbekannt**.

Dieselbe Tabelle kann es richtig: fehlt die *Gebindegröße*, steht `—` und
**„kein Abgleich"**. Zwei Arten von Nichtwissen, zwei völlig verschiedene
Darstellungen, zwei Zeilen auseinander.

**Beides gehört behoben, bevor an der Übersicht gebaut wird.** Solange eine
fehlende Angabe als Null in die Rechnung geht und Getränke doppelt zählen, ist
jede schönere Übersicht nur eine schönere Verpackung.

---

## 2 · Fehler, die die Zahlen verfälschen

| Nr | Was | Wo | Wie es auffällt |
|---|---|---|---|
| **A1** | **Getränke doppelt** — siehe oben, gemessen. | `leitung.html:922`, `:968`; `index.html:4751`; `src/index.js:481` | Journal 4, Backoffice 8 |
| **A2** | **Fehlende Zuordnung zählt als Verkauf 0** statt „unbekannt" — mit selbstbewusster Deutung. | `leitung.html:1745` ff., Tabelle `:2557` | Bild: 10 Zeilen „+6 · mehr geholt als verkauft" ohne jede Erkenntnis |
| **A3** | **Das Backoffice rechnet laufende Vorgänge voll mit, das Journal nicht.** `bestand()`, `abgleich()`, `verbrauch()` prüfen `fertig` an keiner Stelle; der Worker bucht erst beim Abschluss. Gemessen: Worker 12, Backoffice 7. | `leitung.html:1470`, `:1565`, `:1897`; `src/index.js:390` | Solange im Keller gefasst wird (Stunden), zeigt die Leitung die Entnahme schon als Tatsache. Bleibt ein Gerät hängen, dauerhaft |
| **A4** | **Zwei Geräte mit gleicher Zählnummer: das zweite überschreibt still, mit HTTP 200.** Der Wächter prüft nur „größer", nicht „gleich" — und zwei offline begonnene Geräte haben beide die 1. Gemessen: Lenas Zählung dreier Weine verschwindet, ohne Meldung, Marinus' einer bleibt. | `src/index.js:348`; `index.html:2426` | Genau das „still zusammenführen", das die Projektregeln verbieten |
| **A5** | **Keller und Backoffice paaren verschiedene Tage.** Der Abschluss im Keller rechnet gegen den Z-Bericht des **Vortags**, das Backoffice gegen den **desselben** Tags. | `index.html:6030`, `leitung.html:1745` | Dauerhaft. Bekannt — im Backlog fehlt aber: **es sind zwei Leser, nicht einer** |
| **A6** | **Drei Zahlen für dieselbe Frage, gleichzeitig auf einem Schirm.** Menüzähler ab Differenz 1, Kachel ab 2, Tabelle wieder ab 1. | `leitung.html:2062` / `:2139` / `:2316` | Im Bild: 12, 12, 10 Zeilen |
| **A7** | **Bestand wird zweimal gerechnet** — im Worker aus dem Journal, im Browser aus den Vorgangs-JSONs. Gezeigt wird immer nur die Browser-Rechnung; `/api/bestand` hat außer den Prüfungen **keinen Aufrufer**. | `src/index.js:554`, `leitung.html:1470` | Genau dort sitzen A1 und A3 |
| **A8** | **Datum im App-Kopf frei änderbar, ohne Sicherung.** Rückdatieren lässt den alten Schlüssel dauerhaft als „läuft" am Server stehen; ein zweiter Vorgang am selben Tag bucht beim Abschluss die ganze alte Fassung zurück. | `index.html:6613`, `:3586`, `src/index.js:535` | Reproduzierbar |
| **A9** | **Scheitert der Mail-Import, erfährt es niemand.** Abgewiesener Absender, fehlender Anhang, abgelehnter Bericht schreiben ins Journal — das **keinen lesenden Endpunkt** hat. | `src/index.js:1045`, `:1057`, `:1111` | Ändert gastronovi Absender oder Format, sieht es tagelang nur wie mehr Schwund aus |
| **A10** | **Der Wochenbrief geht nirgendwohin.** Der Cron rechnet jede Woche und legt das Ergebnis im unlesbaren Journal ab. | `src/index.js:1078` | Läuft seit Monaten ins Leere |
| **A11** | **Die Rollen werden für Vorgänge nirgends durchgesetzt.** `PUT /api/vorgang/` hat keine Rechteprüfung, die App zeigt allen fünf Kacheln. Gemessen: eine Sitzung mit Rolle `service` schreibt eine vollständige Kellerzählung, HTTP 200. Das Backoffice sagt derweil „wirtschaft: zusätzlich Kellerzählung · Wareneingang". | `src/index.js:968`; `index.html:3249`; `leitung.html:773` | Die Leitung glaubt, sie habe jemanden eingeschränkt — hat sie nicht |
| **A12** | **Ein beschädigter Sitzungskeks liefert 500 statt 401.** Die Base64-Prüfung steht außerhalb des `try`. Die App wertet 500 als „Server antwortet nicht" und **hält die Offline-Reihe an** — statt zur Anmeldung zu führen. | `src/index.js:148`; `index.html:2528` | „Server antwortet nicht", obwohl der Server antwortet |
| **A13** | **Der Bestellzettel rechnet für 56 von 57 Weinen mit 6er-Kisten, geraten.** In den Stammdaten steht genau **eine** echte Kistengröße. Jeder Zwölferwein steht mit „× 6er" und doppelter Kistenzahl auf dem Zettel, der zum Lieferanten geht. | `leitung.html:3055`, `PLAN.kiste` | Doppelbestellung |
| **A14** | **Die Getränkezählung der Kellerzählung erreicht das Journal nie.** Der Worker liest im Modus `keller` nur den Wein. Die Leitung sieht „57 Flaschen gezählt", im Bestand existiert das nicht. | `src/index.js:459`, `leitung.html:942` | Angezeigte Zählung ohne Wirkung |
| ~~**A15**~~ | ~~**Sonderentnahmen gehen in die Verbrauchsprognose ein.**~~ **ZURÜCKGEZOGEN (Runde 20).** Casimir dazu wörtlich: „Doch tauchen sie auf, weil das im Kassensystem verbucht wird." Hauskonsum wird an der Kasse gebucht und steht damit im Z-Bericht. Nachgesehen in `tests/fixtures/zbericht-37-extended.csv`: 22 Warengruppen „… - Inner Haus", darunter „Beverage (Getränke) - Inner Haus" mit 87 Einheiten und „Wein - Weiß - Offen - Inner Haus" mit 10. Eine Sonderentnahme ist damit sehr wohl Verbrauch; das heutige Verhalten (A = B) ist richtig. **Offen bleibt etwas anderes:** ob diese Mengen in den ARTIKELzeilen mitlaufen, gegen die der Abgleich rechnet — die 22 Zeilen oben sind Gruppensummen, keine Artikel. Das ist eine Frage der Zuordnung und steht als eigener Punkt im Backlog. | `leitung.html:1565` | kein Fund |

---

## 3 · Was im Keller und im Backoffice unnötig Arbeit macht

**Die Nähte zwischen App und Backoffice sind offen.** Vier Dinge werden im
Keller sauber erfasst und im Backoffice nie gezeigt:

1. **Die Freigabe mit Code.** Die App sagt wörtlich „die Leitung sieht sie
   morgen früh" (`index.html:6248`). Das Feld reist mit, aber
   `public/leitung.html` liest es **an keiner Stelle**. Eine per Code
   freigegebene Fassung ist von einer vollständigen nicht zu unterscheiden.
2. **Der Grund einer Sonderentnahme.** Fünf Knöpfe im Keller (Bruch, Küche,
   Personal, Verkostung, Zimmer), sauber ins Journal geschrieben — und
   `normVorgang` (`leitung.html:898`) übernimmt das Feld nicht. Im Backoffice
   steht nur „Sonderentnahme · 3 Flaschen".
3. **Wareneingang: zwei von vier Schritten sind Zeremonie.** „+ Neuer Wein"
   wird nie gebucht (`src/index.js:465`), der Jahrgangswechsel wird von
   niemandem gelesen, und „Einräumen" hat keine Folge — ein Wareneingang lässt
   sich mit null eingeräumten Kisten abschließen, ohne dass etwas offen bleibt.
4. **Die Kostenstelle** (Bar / Restaurant) liefert der Worker mit und das
   Backoffice wirft sie weg (`leitung.html:1259`). Getrennt auswerten geht nicht.

**Und umgekehrt: der Keller sieht nichts vom Backoffice.**
`/api/bestand` wird von `index.html` **nie** aufgerufen. Wer im Keller steht,
sieht keinen Restbestand, keine letzte Zählung, keinen Vorwert. Zwei Folgen im
Alltag: Die Fassungsliste sagt „4 holen", es liegen zwei da — dass der Wein
damit aus ist, erfährt die Leitung frühestens am nächsten Tag. Und wer bei der
Zählung 30 statt 3 tippt, bekommt keinen Widerspruch.

**Zwei Stellen zwingen in die Code-Freigabe, obwohl nichts falsch ist:**

* **Teilzählung.** Der Abschluss verlangt **alle 57 Weine**
  (`index.html:6334`). Eine Zone zählen ist im Betrieb der Normalfall — und
  endet in der Freigabe, mit „Ohne Bestätigung freigegeben" über einer völlig
  korrekten Zählung.
* **Holen ohne Sammelknopf.** Bar und Restaurant haben „alles geprüft", der
  Holen-Schritt hat ihn nicht (`index.html:4291`). 15 Weine plus 12 Getränke =
  27 Griffe mit kalten Händen. Der Hinweis kommt erst im Abschluss.

**Eine Fehleingabe von gestern kann niemand mehr korrigieren.** Korrektur geht
nur am selben Gerät, am selben Tag, im selben Modus. Das Backoffice hat für
Vorgänge **keinen einzigen Schreibweg**. Die Leitung sieht „57 Flaschen Zweigelt
gezählt", weiß, dass es 7 waren, und kann nichts tun außer jemanden noch einmal
in den Keller schicken. Der Mechanismus dafür ist im Worker fertig gebaut
(Gegenbuchung, `src/index.js:534`) — es fehlt nur die Tür.

---

## 4 · Was heutige Systeme können und hier fehlt

| | Fehlt | Warum es zählt |
|---|---|---|
| **Ladezeit** | Das Backoffice holt beim Start **61 Anfragen nacheinander** (eine Liste + 60 Einzelberichte, `leitung.html:1267`). Bis alle durch sind, ist die Seite **leer** — kein Gerüst, keine Zahlen. **Gemessen:** 60 Berichte bei 60 ms Antwortzeit = **4,1 Sekunden weißer Schirm**, bei jedem Öffnen und jedem „Aktualisieren". Ein einziger Sammelabruf würde es tun. | Der erste Eindruck jeden Morgen |
| **Aktualität** | Kein automatisches Nachladen, kein „Stand 09:14". Der grüne Punkt oben zeigt den **Betriebstag**, nicht das Alter der Daten. Eine seit morgens offene Seite zeigt mittags alte Zahlen mit grünem Punkt. | Man vertraut einer Zahl, die vier Stunden alt ist |
| **Verlinkbarkeit** | Kein Deep-Link, kein Verlauf, kein Zustand über den Reload. Kein Lesezeichen auf einen Tag, kein Verschicken, Browser-Zurück verlässt die App. Zeitraum steht auf einer Unterseite, wirkt aber **global** auf drei andere Seiten mit — ohne Hinweis. | „Schau dir den 17. an" ist nicht möglich |
| **Euro** | Umsatz je Position liegt vollständig geladen vor und wird **an zwei Randstellen** gezeigt. Keine Differenz ist bewertet. „4 Flaschen Cola" und „4 Flaschen Moric Reserve" sind dieselbe Zeile. | Ohne Euro gibt es keine Rangfolge |
| **Trend** | Bis zu 60 Z-Berichte sind geladen. Keine einzige Zahl trägt „gegenüber Vorwoche", kein Verlaufsbild. | Ein Muster („dienstags fehlt immer der Bericht") sieht man nie |
| **Sortieren / Suchen** | Kein einziger Tabellenkopf in 4293 Zeilen ist klickbar. Sieben Ansichten, sieben feste Sortierungen, keine benannt. Keine übergreifende Suche — „wo taucht Moric Reserve auf" ist nicht beantwortbar. | 53 Weine mit den Augen absuchen |
| **Tabellen** | Jede Tabelle ist eine Scrollfläche mit `max-height:70vh` (`:414`). Man sieht nie die ganze Liste, und es scrollt zweimal. | Beim Kellerbestand sieht man 15 von 53 Weinen |
| **Benachrichtigung** | Nichts geht heraus, wenn etwas kippt. Z-Berichte kommen per Mail herein — zurück kommt nie etwas. | Man muss selbst nachsehen, um zu wissen, ob man nachsehen muss |
| **„Neu seit gestern"** | Kein Merker, keine Markierung neuer Vorgänge. Fünf Zeilen in der Liste, keine als neu erkennbar. | Man liest jeden Morgen dieselbe Liste noch einmal |
| **Prüfspur** | Das Ereignisjournal ist das Herz der Architektur — Zeitpunkt, Ort, Wer, Grund, **jede Korrektur** — und hat keinen lesenden Endpunkt. | Nachträgliche Änderungen sind unsichtbar |
| **Ein Gerät = eine Wahrheit** | Reichweiten-Schwelle, Mittelungsfenster und **alle Rezepturen** liegen im Browserspeicher des jeweiligen Geräts. MacBook und iPad liefern verschiedene Bestellvorschläge und verschiedene Abgleiche — ohne Hinweis. | Zwei Leute, zwei Wahrheiten |
| **Soll-Mengen** | Soll je Wein, Zonen, Kistengrößen stehen **fest im Quelltext** (`index.html:1940`). Ohne Entwickler nicht änderbar. | Jede Sortimentsänderung braucht eine Codeänderung |
| **Tastatur** | Ein einziger Tastaturgriff (Escape). Jedes Neuzeichnen wirft den Fokus auf `body`. | Am MacBook arbeitet man mit der Maus allein |
| **Totes Kapital** | `vVorgaenge` (`leitung.html:3155`) ist eine vierte, fertig gebaute Vorgangsliste, die über keinen Weg erreichbar ist. „Eingänge" und „Speicher" sind Zwillinge mit derselben Quelle, verschiedenen Spalten und unterschiedlicher Wahrheit. | Pflegeaufwand ohne Nutzen |

**Widersprüche in der Darstellung** (jeweils belegt): Rot steht für „mehr
geholt", Blau für „weniger" — die Farbe kodiert also die **Richtung**, nicht die
**Schwere**; die größte Abweichung ist damit der ruhigste Farbwert der Seite.
Die Reichweiten-Plakette hat auf einer Seite drei Stufen, auf zwei anderen zwei
— derselbe Wein ist hier gelb und dort grün. Für eine Seite gibt es fünf Namen
(„Verkauf ↔ Fassung", „Auffällige Differenzen", „vollständiger Abgleich",
„ohne Abgleich", „kein Abgleich").

---

## 5 · Der Vorschlag: eine Übersicht

Zwei Entwürfe liegen als Bild bei (`review/mockup/bilder/`). Beide beantworten
drei Fragen **in dieser Reihenfolge**, und das ist der eigentliche Unterschied
zum heutigen Mittagsblick:

> **1. Kann ich den Zahlen trauen? — 2. Was stimmt nicht? — 3. Was muss ich tun?**

Heute fängt die Seite bei Frage 2 an und beantwortet Frage 1 nie.

Gemeinsam in beiden Entwürfen:

* **Ein Urteilssatz ganz oben**, kein Kachelraster. „Den Differenzen ist noch
  nicht zu trauen" ist eine Auskunft; vier Kacheln mit Zahlen sind es nicht.
* **Der Abdeckungsbalken** — die eine Zahl, die heute nur auf dem Druckblatt
  steht: *wie viel vom Verkauf steckt überhaupt in dieser Rechnung.*
* **Euro neben jeder Flasche**, und danach sortiert.
* **„Nicht beurteilbar" ist ein eigener Zustand** — nie eine 0, nie ein Haken,
  nie eine Deutung.
* **Der laufende Tag steht getrennt** von dem Fenster, das abgeglichen wird.
  Heute endet der Mittagsblick immer bei *gestern*; was seit Mitternacht
  gefasst wurde, kommt auf der Startseite nicht vor.
* **Zeitraumwahl im Kopf**, sichtbar auf jeder Seite, und in der Adresse.
* **„geholt vor 1 Min."** statt eines grünen Punkts über dem Betriebstag.

**Variante A · „Der Weg der Zahlen"** — eine Kette aus fünf Gliedern
(Fassung → Z-Bericht → Zuordnung → Abgleich → Bestand). Reißt ein Glied, ist
alles dahinter **grau**, nicht grün und nicht rot. Darunter „Jetzt zu tun":
höchstens drei Zeilen, jede mit einem Knopf. Ruhig, führt.

**Variante B · „Was nicht stimmt"** — keine Kette, dafür **eine einzige Liste**
über alles hinweg: fehlende Zuordnung, fehlende Berichte, echte Abweichungen,
Bestand unter null, hängengebliebene Vorgänge, abgewiesene Mails — sortiert nach
dem, was es in Euro ausmacht. Dazu ein Säulenbild „Abweichung je Tag" über
14 Tage, schraffiert wo der Bericht fehlt. Dichter, sagt in einem Blick mehr.

---

## 6 · Was du entscheiden musst

1. **A oder B** (oder eine Mischung — die Kette aus A über der Liste aus B ist
   möglich).
2. **Was „Ignorieren" heißen soll** — steht seit Runde 18 offen und blockiert
   die ehrliche Deutung.
3. **Betriebstag-Versatz** — welcher der beiden Wege. Wichtig: es sind **zwei**
   Stellen, nicht eine.
4. **Anmeldung** — sichtbarer Ablauf, gleitende Frist oder längere Frist.
5. **Sollen Einstellungen und Rezepturen in die Datenbank?** Solange nicht, gibt
   es kein gemeinsames Backoffice, sondern eines je Gerät.

---

## 7 · Vorgeschlagene Reihenfolge

1. **A1 · Getränke doppelt** — eine Zeile Code, dazu eine Prüfung, die den
   Vorgang mit `getr` **und** `gent` bestückt (genau diese Lücke hat den Fehler
   445 grüne Prüfungen lang verdeckt).
2. **A3 · laufende Vorgänge** und **A7 · zwei Bestandsrechnungen** — dieselbe
   Wurzel wie A1: das Backoffice rechnet noch einmal, was der Worker schon
   gerechnet hat. Der saubere Weg ist, `/api/bestand` zu benutzen.
3. **A2 · fehlende Zuordnung als Null** und **A11/A12/A4** — Rechte,
   Sitzungsfehler, Gleichstand bei der Zählnummer.
4. **Erst dann die neue Übersicht.**

Punkte 1 bis 3 brauchen **keine** Migration. Alles in Abschnitt 3 (Freigabe,
Grund, Kostenstelle, Bestand im Keller) ist ebenfalls reine Anzeigearbeit.
