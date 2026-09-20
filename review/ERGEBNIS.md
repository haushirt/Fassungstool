# Ergebnis

Diese Datei ist die Beschreibung des Pull Requests. Sie wird am Ende einer
Phase gefüllt, nicht laufend.

---

# Was mit diesem Merge live geht · Runde 20 (20.09.2026)

**Stand davor: `0c4916c` (Runde 19, `sw.js` v64, live). Stand danach: `sw.js` v66.**

**Kein Schemaeingriff, keine Migration.** `migrations/`, `schema.sql`,
`wrangler.jsonc`, `package.json`, `src/index.js` unberührt, kein
Schreibzugriff auf die Live-D1. `RUNDEN` unverändert — bestehende
Anmeldungen bleiben gültig. Geändert sind nur `public/index.html`,
`public/leitung.html` und `public/sw.js`.

Anlass war eine Beobachtung beim Öffnen eines Vorgangs: *„warum sind
gezählt und aus dem Keller geholt anders sortiert und nicht die gleiche
Anzahl."* Beides stimmte — und es waren zwei verschiedene Ursachen.

---

## 1 · Es gibt zwei Zahlen je Position, das Tool behielt nur eine

* **„oben gefehlt"** = Soll − Ist an Bar, Restaurant, Backup und Lade.
  Das ist der **Verbrauch**; dagegen wird der Z-Bericht gerechnet.
* **„aus dem Keller geholt"** = was wirklich herausgetragen wurde.
  Diese Zahl geht **vom Bestand** ab.

Sie gehen auseinander, sobald im Lager weniger lag als oben gefehlt hat —
dann klappt in der App das Feld für die berichtigte Menge auf
(`holtN`/`gholtN`). Bisher ersetzte diese Eingabe die Zahl überall: oben
fehlten sechs, getragen wurden vier, und **gerechnet wurden vier** — auch
gegen die Kasse, die sechs verkauft hat.

Das widersprach der eigenen Festlegung in
`review/OFFENE-ENTSCHEIDUNGEN.md:122-127` und folgte stattdessen der
Glossarzeile `UEBERGABE-TECHNISCH.md:687`, die beide Begriffe gleichsetzt.
Die Glossarzeile ist jetzt aufgetrennt.

**Es ändert heute keine einzige Zahl.** In allen sechs Live-Vorgängen sind
`holtN`, `gholtN`, `zusatz` und `gzusatz` leer, beide Zahlen also
identisch. Beide werden im Backoffice aus denselben Rohfeldern gerechnet —
**kein neues Feld im Vorgang, keine Änderung an der Offline-Reihe, kein
Gerät im Feld, das ein neues Format kennen müsste**, und rückwirkend
gültig für jeden schon gespeicherten Vorgang.

Derselbe Schnitt gilt jetzt auch im Keller: der Vortagsabgleich beim
Abschluss rechnet gegen den Verbrauch, das Protokoll zeigt beide Spalten.
Vorher zeigten Journal, Backoffice und Protokoll bei einer Abweichung drei
verschiedene Zahlen.

## 2 · Das Vorgangsfenster

Statt fünf Tabellen, jede nach Menge sortiert: ein Kopf und **eine**
Tabelle je Abschnitt.

* **Kopf:** Vorgangsart und Tag, wer gefasst hat, die Uhrzeit **vom Gerät**
  (bisher wurde die Ankunft beim Server gezeigt — bei einem Gerät ohne
  Netz liegen dazwischen Stunden), der Zustand, und bei einer Freigabe
  ohne Bestätigung der Name und was offen war.
* **Eine Zeile je Artikel**, zwei Zahlenspalten. Die Spaltenköpfe sagen,
  **wofür** die Zahl da ist: „→ Z-Bericht" und „→ Bestand".
* **Eine Sortierung**: der Laufweg durch den Keller — dieselbe, in der die
  App zählen und holen lässt.
* **Weicht eine Zeile ab**, ist sie hervorgehoben und nennt den Grund
  („im Lager lagen nur 1").
* **Zusätzlich Entnommenes** steht an seiner Zeile statt eingemischt.
* **Sonderentnahme:** beide Spalten mit derselben Zahl, darüber der Grund
  im Klartext (Bruch, Küche, Personal, Verkostung) — den las das
  Backoffice bisher gar nicht.
* **Kellerzählung und Wareneingang** behalten ihre einspaltige Form; in
  der zweiten Spalte steht nichts, keine 0.

Das Druckblatt je Vorgang kommt aus derselben Quelle — eine Rechnung, zwei
Ausgaben.

## 3 · Ein Soll für beide Dateien

App und Backoffice rechneten das Soll der Getränke aus zwei verschiedenen
Ladenaufteilungen: die App nimmt das alte Regal heraus und ersetzt es
durch Lade 2, im Backoffice fehlte das. Gemessen: `gasteiner` App 15 /
Backoffice 18, `gastill` App 4 / Backoffice 1, die übrigen 35 gleich.
Jetzt rechnen beide dieselbe Aufteilung, und `tests/soll-gleich.test.mjs`
vergleicht sie Position für Position.

---

## Zurückgezogen

**A15 („Sonderentnahmen gehen in die Verbrauchsprognose ein")** ist kein
Fund. Hauskonsum wird an der Kasse gebucht und steht damit im Z-Bericht;
`tests/fixtures/zbericht-37-extended.csv` führt 22 Warengruppen
„… - Inner Haus". Bruch, Küche, Personal und Verkostung sind Verbrauch,
das heutige Verhalten ist richtig. Offen bleibt eine andere Frage, jetzt
im Backlog: ob diese Mengen in den ARTIKELzeilen mitlaufen, gegen die der
Abgleich rechnet.

## Nachweis

* `npm test`: **538 von 538** grün (vorher 511; 27 neue Prüfungen in
  `tests/zwei-zahlen`, `tests/vorgangsfenster`, `tests/soll-gleich`,
  `tests/keller-gegen-backoffice`).
* **Gegenprobe gefahren.** Die Rechnung zurückgebaut → 6 von 17 in
  `zwei-zahlen` und 2 in `vorgangsfenster` fallen. Das gemeinsame Soll
  zurückgebaut → 2 in `soll-gleich` fallen. Den Laufweg zurückgebaut →
  `keller-gegen-backoffice` fällt.
* **Am echten Vorgang** `tag_2026-09-20`: Wein 24/24, Getränke 38/38 —
  beide Spalten gleich, weil dort nichts abweicht. Derselbe Vorgang mit
  einem künstlichen `holtN`: die Spalten gehen auseinander und die Zeile
  nennt den Grund.
* **Keller gegen Backoffice**: derselbe Vorgang durch beide Rechnungen,
  mit und ohne Abweichung — dieselben Zeilen. Vorher nur ohne.
* Oberfläche von Hand (nicht Teil von `npm test`, Regel 8):
  `ui-mass` (LAUF=runde-20) alle Urteile grün in sechs Breiten,
  `ui-runde18` 54/54, `ui-runde17` 38/38, `ui-leitung-echt` 44/44,
  `ui-fremdgeraet` 10/10, `ui-zweiter-vorgang` 15/15, Gestaltungsschicht
  in beiden Dateien wortgleich.
* Bilder: `review/mockup/bilder/fenster-1440.png` und `-393.png`.

---

# Was mit diesem Merge live geht · Runde 19 (20.09.2026)

**Stand davor: `f252b88` (Runde 18, `sw.js` v61, live). Stand danach: `sw.js` v64.**

Zwei Teile: **fünf Rechenfehler behoben**, danach die **neue Übersicht**.
Grundlage ist ein Analyse-Lauf über den ganzen Weg vom Keller ins Backoffice
(`review/ANALYSE-BACK-FRONT.md`).

**Kein Schemaeingriff, keine Migration.** `migrations/`, `schema.sql`,
`wrangler.jsonc`, `package.json` unberührt, kein Schreibzugriff auf die
Live-D1. `RUNDEN` unverändert — bestehende Anmeldungen bleiben gültig.
Der neue Endpunkt `GET /api/journal` liest ausschließlich.

---

## Teil 1 · Fünf Fehler, die die Zahlen verfälscht haben

### 1 · Jede geholte Getränkeflasche zählte im Backoffice doppelt

`normVorgang` (`public/leitung.html`) leitete die geholte Menge aus der
Ladengeometrie her (`Soll − Ist`) **und** addierte danach `gent` — und `gent`
ist genau dieselbe Zahl, die die App aus derselben Rechnung baut
(`geholteGetraenke`, `public/index.html`). Der Worker liest nur `gent` und
rechnete immer richtig.

Gemessen mit echtem Worker und echter Datenbank: Lade Soll 7, 3 noch da,
4 geholt → Journal `entnahme 4`, Backoffice `8`, „Verkauf ↔ Fassung" zeigte
Differenz **+4** mit dem Befund „prüfen". Für **jedes Getränk an jedem Tag**
eine erfundene Abweichung in exakter Höhe der Entnahme — im Mittagsblick, im
Abgleich, in der Zählliste, im Verbrauch, in der Bestellliste, in der CSV und
auf dem gedruckten Blatt, das aus dem Haus geht.

Die Gegenrichtung war ebenso falsch: ohne Haken „geholt" ist `gent` leer, das
Backoffice zählte trotzdem, der Worker gar nicht.

Warum 445 grüne Prüfungen das nicht gefunden haben: **jede** Prüfdatei setzte
`gent` ohne `getr`. Ohne `getr` ist Ist = Soll und die Fehlmenge 0 — der Fehler
war in den Prüfdaten wegdefiniert. `tests/getraenke-doppelt.test.mjs` bestückt
jetzt beide Felder.

### 2 · Laufende Vorgänge gingen voll in die Rechnung ein

`bestand()`, `verbrauch()`, `abgleich()` und die Getränkeansicht prüften
`fertig` an keiner Stelle; der Worker leitet seine Journalzeilen aber erst beim
Abschluss ab. Die App schickt alle 45 Sekunden einen Zwischenstand hinaus.
Gemessen: Worker 12 Flaschen, Backoffice 7. Solange im Keller gefasst wird
(Stunden), zeigte die Leitung die Entnahme schon als Tatsache; blieb ein Gerät
hängen, dauerhaft.

Neuer Filter `gebucht()`. Die Listen zeigen weiter alles und sagen „läuft".
Weil damit zum ersten Mal die **Entnahme** aus der Rechnung fällt — alle
bisherigen sechs Vorbehalte decken die Verkaufsseite ab —, wird die
ausgelassene Menge zurückgegeben und überall benannt: an der Zeile, in der
Kachel „Aus dem Keller", im CSV-Kopf, je CSV-Zeile und im Druckblatt.

### 3 · Gleiche Zählnummer zweier Geräte überschrieb still

`vorgangSchreiben` prüfte nur „echt größer" und ließ den Gleichstand durch —
den häufigeren Fall: `zaehlnr()` zählt je Gerät, zwei offline begonnene Geräte
tragen beide die 1. Gemessen: Gerät A schickt drei gezählte Weine, Gerät B
einen — danach steht nur B im Vorgang, A bekommt „gespeichert". Genau das
stille Zusammenführen, das die Architektur verbietet.

Jetzt 409 — aber nur bei **fremdem** Gerät (`daten.geraet`), damit die
Wiederholung desselben Pakets aus der Offline-Reihe weiter durchgeht. Und
`fernNeuer` in der App fragt bei derselben Schwelle: sonst hätte der Wächter
den Verlust nur um 45 Sekunden verschoben und der Person, deren Stand gleich
gewinnt, gemeldet, ihre Arbeit sei verloren.

### 4 · Ein beschädigter Sitzungskeks lieferte 500 statt 401

`vonB64(sig)` stand außerhalb des `try`. Ein gekürzter Keks ergab 500 — und
`schiebe()` wertet alles ab 500 als Serverfehler und **hält die Offline-Reihe
an**. Im Keller stand „Server antwortet nicht", während der Server antwortete
und nur die Anmeldung neu gemacht gehört hätte.

### 5 · Die Rollen wurden für Vorgänge nirgends durchgesetzt

`PUT /api/vorgang/…` hatte keine Rechteprüfung; eine Sitzung mit der Rolle
`service` schrieb eine vollständige Kellerzählung mit HTTP 200, während das
Backoffice „wirtschaft: zusätzlich Kellerzählung · Wareneingang" behauptete.

**Entschieden: melden, nicht sperren.** Der Vorgang wird angenommen, der Fall
einmal je Vorgang im Journal vermerkt. Sofort zuzusperren wäre das falsche
Risiko: Steht bei jemandem die falsche Rolle, könnte er mitten im Dienst nicht
mehr speichern. Nach ein paar Tagen steht im Journal, wen eine Sperre träfe.

Dazu **`GET /api/journal`** (nur lesend, nur Leitung). Damit sind zum ersten
Mal sichtbar: abgewiesene Mail-Berichte, Berichte ohne lesbaren Anhang und der
Wochenbrief. Bisher stand im Backoffice nur „Z-Bericht noch nicht eingelesen"
— derselbe Satz für „kommt noch" und für „wurde an der Tür abgewiesen".

### Dazu: die Deutung behauptet nichts mehr, was die Rechnung nicht weiß

Verkauf **genau null** bei offenen Kassennamen bekam denselben Satz wie eine
echte Abweichung („mehr geholt als verkauft — Vorrat aufgebaut oder im Keller
nachsehen"). In der Live-Lage (44 von 48 Namen offen) stand er zehnmal
untereinander und war kein einziges Mal eine Auskunft.
**Entscheidung Nr. 9 bleibt unangetastet** — die Zahl bleibt stehen, die Zeile
zählt weiter mit, eine offene Speise nimmt keinem Wein den Befund. Geändert ist
allein der Satz daneben.

---

## Teil 2 · Die neue Übersicht (ehemals Mittagsblick)

Die Seite beantwortet drei Fragen **in dieser Reihenfolge** — bisher fing sie
bei der zweiten an und beantwortete die erste nie:

> **1 · Kann ich den Zahlen trauen? — 2 · Wo reißt es? — 3 · Was muss ich tun?**

* **Urteilssatz** statt vier Kacheln. „Den Differenzen ist noch nicht zu
  trauen" ist eine Auskunft; vier Zahlen sind es nicht.
* **Abdeckungsbalken** — wie viel vom Verkauf überhaupt in der Rechnung steckt.
  Die Zahl wird seit v27 gerechnet und stand bisher **nur auf dem Druckblatt**.
  Darunter, in drei Zeilen, woraus die Lücke besteht (nicht zugeordnet · Größe
  fehlt · Größe fehlt ohne Vorschlag · keine Menge im Kassennamen · ausgenommen)
  — drei Ursachen mit drei verschiedenen Maßnahmen.
* **Die Kette** aus fünf Gliedern: Fassung → Z-Bericht → Zuordnung → Abgleich →
  Bestand. Jedes ist ein Knopf und führt dorthin, wo man es repariert. Reißt
  eines, ist alles dahinter **grau** — nicht grün und nicht rot.
* **Höchstens drei Aufgaben** mit Knopf, sortiert nach dem, was sie
  freischalten. Darunter „Außerdem" **vollständig**, damit nichts verschwindet:
  hängengebliebene Vorgänge, abgewiesene Mails, Rollenvermerke.
* **Der laufende Tag**, ausdrücklich getrennt vom Abgleichfenster. Der
  Mittagsblick endete immer bei gestern; was seit Mitternacht gefasst wurde,
  kam auf der Startseite überhaupt nicht vor.
* **Sechs Zahlen** mit ihrem Zeitraum. Wo nichts berechenbar ist, ein Strich
  und der Grund — nie eine 0.
* **Abweichungen nach Euro sortiert.** Der Umsatz je Position lag geladen vor
  und wurde nirgends benutzt: „4 Flaschen Cola" und „4 Flaschen Moric Reserve"
  waren dieselbe Zeile.
* **Vierzehn Tage nebeneinander.** Schraffiert heißt „keine Angabe", nicht
  „null". Erst so sieht man ein Muster.
* **Zeitraum im Kopf**, auf jeder Seite sichtbar, überlebt das Neuladen. Er
  wirkt seit je global auf vier Seiten, stand aber versteckt auf einer.
* **„geholt vor N Min."** statt des Betriebstags im Chip. Eine seit morgens
  offene Seite zeigte mittags alte Zahlen mit grünem Punkt.

---

## Was NICHT geändert wurde

`public/index.html` nur an **einer** Stelle (`fernNeuer`, siehe Punkt 3).
Kein Schritt im Keller ändert sich. `src/gnparse.js`, `src/gnmap.js`,
`src/stamm.json` unberührt; Bericht 37 geht weiter gegen sich selbst auf
(48 Positionen, 145 Stück, 602,50 €). Das Getränke-Automapping bleibt aus.
Die Gestaltungsschicht steht weiter wortgleich in beiden Dateien.

## Geprüft

* `npm test`: **490 von 490** grün (vorher 445; 45 neue Prüfungen).
* **Gegenprobe:** ohne die Reparaturen fallen 8 bzw. 5 der neuen Prüfungen um.
* `tests/ui-mass.cjs` (Lauf `runde-19`): **alle Urteile grün** in sechs
  Breiten. Zwei Funde daraus wurden behoben — waagrechter Überlauf
  (594 px bei 390 px Fenster, Rasterspalte konnte nicht schrumpfen) und der
  Kontrast des Kettenpfeils (1,8:1; jetzt gezeichnet statt geschrieben).
* `ui-runde18` 54/54 · `ui-runde17` 38/38 · `ui-leitung-echt` 44/44 ·
  `ui-leitung` ohne JS-Fehler.
* Zwei Jagden auf den Gesamtzustand; alle A- und B-Funde in dieser Runde
  behoben oder im Backlog benannt.
* Bilder mit echten Daten: `review/mockup/bilder/`.

## Bekannt und weiter offen

`bestand()` gibt es zweimal (Worker und Browser) — `/api/bestand` hat weiterhin
keinen Leser in der Oberfläche. Der Betriebstag-Versatz zwischen Keller und
Abgleich ist unverändert und braucht eine Entscheidung. Kistengrößen und
Soll-Mengen sind weiterhin nur im Quelltext änderbar; Einstellungen und
Rezepturen liegen weiterhin je Gerät.
