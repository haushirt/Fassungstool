# Runde 18 · Backoffice (`public/leitung.html`)

Stand: 20.09.2026 · Zweig `claude/backoffice-leitung-r18-clvh73` · `sw.js` **v57**
Unabhängig von Runde 17 (Frontoffice). Vier Punkte, jeder mit Fundstelle,
Lösungsweg, Abgleich gegen `review/BACKLOG.md` und Prüfplan.

Alle Zeilennummern beziehen sich auf den Endstand dieser Runde.

---

## B2 · Die Kacheln des Mittagsblicks führen jetzt weiter

### Befund
`vHeute()` baute die vier Kacheln als `<div class="kpi">` — reine Anzeigen ohne
Ereignis. Jede beantwortet eine Frage mit einer Zahl, und die nächste Frage ist
immer dieselbe: **welche**? Der einzige Weg dorthin war das Menü links, und dort
stand nirgends, welcher Punkt zu welcher Kachel gehört.

| Fundstelle vor der Änderung | Was dort stand |
|---|---|
| `public/leitung.html` (`vHeute`, Helfer `kachel`) | `` `<div class="kpi …">` `` ohne `onclick` |
| ebenda, „Tagesfassung“ | `fassung.flWein` als Text, kein Weg zum Vorgang |
| ebenda, „Z-Berichte“ | Zahl der Berichte, kein Weg zur Vorschau |
| ebenda, „Auffällige Differenzen“ | Zahl, kein Weg zum Abgleich |
| ebenda, „Nachbestellen“ | Zahl, kein Weg zur Liste |

Ein halber Weg bestand: `#bAlleAbw` („Zum vollständigen Abgleich“) und `#bMehr`
(„Alle ansehen“) — beide **unter** den Tabellen, nicht an der Zahl.

### Lösungsweg (umgesetzt)
`public/leitung.html:2096` · Der Helfer `kachel()` nimmt zwei Felder mehr
(`ziel`, `fuehrt`). Mit Ziel wird er zu `<button type="button" class="kpi"
data-ziel="…">` und trägt am Fuss eine Zeile, die sagt, wohin er führt; ohne
Ziel bleibt er ein `<div>` und sieht unverändert aus.

`public/leitung.html:2144` · Ein Horcher über `[data-ziel]` setzt `SEITE` und,
wo es nötig ist, den Zustand der Zielansicht:

| Kachel | Ziel | Was am Ziel passiert |
|---|---|---|
| Tagesfassung (vorhanden) | `eingaenge` | `EGOFFEN` auf den Vorgang → Detail ist beim Ankommen offen |
| Tagesfassung (fehlt) | `eingaenge` | `EGFILTER.modus="tag"` → die früheren Tagesfassungen, also: wann kam zuletzt eine |
| Z-Berichte | `import` | `vImport.zeig` = Tag → Vorschau öffnet sich von selbst (`:2747`) |
| Auffällige Differenzen | `abgleich` | `vAbgleich.tag` auf den Betriebstag der Kachel |
| Nachbestellen | `bestellen` | — |

`public/leitung.html:631` · `button.kpi` bekommt die Gestaltung eines Kastens
zurück (`display:flex`, `text-align:left`, `font:inherit`, `appearance:none`),
dazu Zeigefinger und eine Randfarbe beim Überfahren. `.kpi .weiter`
(`:639`) hält die Wegzeile mit `margin-top:auto` am Fuss — sonst säße sie bei
jeder Kachel auf anderer Höhe, weil die Untertexte verschieden lang sind.

**Keine Kachel ist eine Sackgasse.** Fehlt die Tagesfassung, führt sie auf die
früheren; fehlt der Z-Bericht, dorthin, wo er eingelesen wird.

### Backlog-Abgleich
Kein bestehender Punkt. Neu aufgenommen ist der Rest: „Zum vollständigen
Abgleich“ unter der Tabelle ist seit dieser Runde ein zweiter Weg zum selben
Ort (niedrig, kein Schaden).

### Prüfplan
`tests/ui-runde18.cjs`, Abschnitt **B2** — 6 Urteile:
1. Alle vier Kacheln sind `BUTTON`, haben `data-ziel` und eine Wegzeile.
2.–5. Jede Kachel landet auf der erwarteten Seite (`eingaenge`, `import`,
   `abgleich`, `bestellen`) — gemessen an `SEITE` und der Überschrift.
6. Kachel 1 schlägt das Detail auf und dort stehen Mengen (`.karte tbody td.r b`).

Von Hand am MacBook: Mittagsblick öffnen, jede Kachel einmal antippen, mit dem
Rückweg über das Menü wieder zurück.

---

## B3 · Neue Ansicht „Eingänge“ — mit Mengen

### Befund, und warum er anders lag als vermutet
Die Vermutung war: „`Ansehen` zeigt nur Positionen, keine Anzahl.“ Im Speicher
(`vSpeicher.malDetail`) stand die Anzahl aber immer in der Tabelle. **Sie stand
nur ausserhalb des Bildes.**

`public/leitung.html:601` · Unter 900 px gilt `.tabhuelle table{min-width:560px}`
— eine Regel für die *breiten* Tabellen. Sie traf auch die zweispaltige
Mengentabelle: Bei 390 px Fensterbreite lag die Spalte „Flaschen“ rund 170 px
rechts neben dem Bild, und die erste Spalte klebte davor. Wer das Detail am
Handy aufmachte, sah eine Liste von Positionen ohne jede Zahl — genau der
gemeldete Eindruck.

Drei weitere Lücken, alle drei im Backlog vorgemerkt:

| Lücke | Fundstelle | Folge |
|---|---|---|
| `flWein`/`flGetr` zählen `eingang` und `zaehlung` nicht (`normVorgang`, `:963`) | Liste im Speicher | Wareneingang über 72 Flaschen und Kellerzählung über 46 standen mit **zwei Strichen** da |
| `gzaehlung` wird berechnet (`normVorgang`, `:919`, `:933`) und **nirgends gezeigt** | Detail im Speicher | Eine Kellerzählung, die nur die Getränkelade gezählt hat, meldete „Dieser Vorgang hat keine Mengen bewegt“ — bei 19 gezählten Flaschen |
| Die Notiz stand nur im Detail | Liste im Speicher | Bei einer Sonderentnahme ist sie oft der ganze Inhalt |

### Lösungsweg (umgesetzt)
Neuer Abschnitt **`7e · Eingänge`**, `public/leitung.html:3135`–`3327`.
Der Speicher bleibt unangetastet danebenstehen: Er ist die Werkbank (Suche,
CSV, Rohdaten), „Eingänge“ ist der Blick von aussen auf denselben Bestand.

| Baustein | Zeile | Aufgabe |
|---|---|---|
| Menüpunkt `eingaenge` | `:1956` | erster Punkt der Gruppe „Nachschlagen“, mit Zähler (`:1981`) |
| `EGFILTER` / `EGOFFEN` | `:3158` | Filter und offenes Detail, überleben ein Neuzeichnen |
| `vgSchluessel(v)` | `:3163` | stabiler Schlüssel: Server-`id`, sonst Modus + Tag + Ablagezeit + Name |
| `vgBloecke(v)` | `:3169` | die fünf Mengenblöcke eines Vorgangs, in der Reihenfolge, in der sie im Keller entstehen |
| `vgMengen(v)` | `:3182` | dieselben Blöcke als Kurzzeilen für die Liste |
| `vgName(id)` | `:3192` | Winzer · Wein · Jahrgang, sonst der Getränkename |
| `nurImBrowser()` | `:3199` | Vorgänge, die nur im Gerätespeicher liegen |
| `vEingaenge(m)` | `:3209` | Liste, Detail, Filter, CSV, PDF |
| `.tabhuelle.schmal` | `:595` | zwei Spalten brauchen keine Mindestbreite und keine klebende erste Spalte |

Die fünf Blöcke im Detail (Überschrift nennt Positionszahl und Summe):
„Aus dem Weinkeller geholt“ · „Aus dem Getränkelager geholt“ ·
„Wareneingang · geliefert“ · „Gezählter Bestand · Weinkeller“ ·
„Gezählter Bestand · Getränkelade“.

Eine **gezählte Null bleibt stehen** (`art:"zaehlung"`): „nichts mehr da“ ist
eine Angabe. Bei den Bewegungen fällt die Null heraus.

Die Liste führt `Mengen` statt zweier fast immer leerer Spalten, dazu die
Notiz. Zwei leere Zustände statt einem:
* nichts da → „Es ist noch kein Vorgang eingegangen. Sobald im Keller eine
  Fassung abgeschlossen wird, steht sie hier.“
* Filter ohne Treffer → „Kein Vorgang passt zu dieser Suche. Filter
  zurücksetzen, dann stehen wieder alle N da.“

### Backlog-Abgleich (ausdrücklich verlangt)

| Punkt | Stand nach Runde 18 |
|---|---|
| **hospitality-pro R5** — „Speicher“: Wareneingang und Kellerzählung stehen mit „—“ da, Notiz fehlt in der Liste | **erledigt in „Eingänge“.** Die Liste nennt jede Menge (`72 Fl. geliefert`, `19 Fl. gezählt (Getränke)`) und die Notiz. Im **Speicher** steht die alte Anzeige unverändert — bewusst: er bleibt die Werkbank, und zwei Ansichten gleichzeitig umzubauen wäre in einer Nacht nicht prüfbar. → bleibt als *niedrig* im Backlog |
| **ui-designer R3** — „Nichts gefunden.“ auch dann, wenn es gar nichts gibt | **erledigt in „Eingänge“** (zwei Sätze, siehe oben). Im Speicher unverändert → bleibt als *niedrig* |
| **qa-guardian R3** — nach dem Livegang ist der Gerätespeicher der Leitung nirgends mehr erreichbar | **teilweise.** „Eingänge“ zeigt unter „Nur auf diesem Gerät“ (`:3238`), was im Browser liegt und der Server nicht kennt, samt Mengen und Detail — mit dem ausdrücklichen Satz, dass es in keine Rechnung dieser Seite eingeht. Nicht erledigt ist der **Weg zurück**: Diese Vorgänge lassen sich von hier aus nicht an den Server schicken. Das wäre ein Schreibweg aus dem Backoffice heraus, und diese Seite schreibt nichts an Vorgängen (Architektur). → bleibt als *mittel* im Backlog, mit dem Vorschlag, es in der App zu lösen |

### Prüfplan
`tests/ui-runde18.cjs`, Abschnitt **B3** — 10 Urteile. Die Vorgangsliste des
Prüfstands enthält absichtlich genau die Fälle, die vorher stumm waren:
eine Kellerzählung nur über Wein, eine **nur über Getränke**, einen
Wareneingang mit zwei Kistengrössen, eine Tagesfassung, eine Sonderentnahme
mit Notiz.

1. Alle fünf Vorgänge stehen in der Liste.
2. Wareneingang nennt eine Menge statt zweier Striche → `72 Fl. geliefert`.
3. Beide Kellerzählungen nennen eine gezählte Menge.
4. Die Notiz der Sonderentnahme steht in der Liste.
5.–8. Detail je Vorgangsart: Blöcke vorhanden, **jede Zeile trägt eine Zahl**,
   kein „keine Mengen bewegt“.
9./10. Die beiden leeren Zustände nennen verschiedene Sätze.

Dazu, im Abschnitt B4 gemessen, weil es ein Fenster von 390 px braucht:
**„am Handy steht die Anzahl IM Bild“** — keine Zelle der Klasse `.r` ragt über
`window.innerWidth` hinaus. Das ist die Prüfung gegen den eigentlichen Befund.

Von Hand: `review/screens/runde-18/macbook-eingaenge.png` und
`iphone-eingaenge-detail.png`.

---

## B4 · Wischen von links öffnet die Seitenleiste

### Befund
`public/leitung.html:218` (Gestaltungsschicht) setzt `touch-action:manipulation`
— das nimmt den Doppeltipp-Zoom, nicht die Zurück-Geste. Safari am iPad liest
einen Wisch vom linken Rand als „zurück“ und verlässt das Backoffice, meist ins
Fassungstool, die Seite davor. Die Navigation liegt unter 900 px aber genau
dort als Blatt (`nav.seite`, `:576`), zu öffnen bisher nur über `#bNav`
(`:3896`).

### Lösungsweg (umgesetzt)
`public/leitung.html:3921` · `randwisch()`, ein Horcher in drei Teilen:

* `touchstart` (passiv) merkt sich den Ansatz — **nur** wenn er in den linken
  32 px liegt oder die Navigation bereits offen ist. Sonst wird nichts gemerkt
  und nichts angefasst.
* `touchmove` (**`passive:false`**) entscheidet nach 10 px Totzone: mehr
  senkrecht als waagrecht → Finger loslassen, das ist Scrollen. Sonst gehört
  die Geste der Seite, und ab da wird `preventDefault()` gerufen — **das ist
  der Griff, der Safari die Zurück-Geste nimmt.** Ab 48 px öffnet bzw.
  schliesst sich die Leiste.
* `touchend`/`touchcancel` setzen zurück.

`public/leitung.html:623` · `html{overscroll-behavior-x:contain}` für Chrome und
die Android-Browser, die auf den Horcher nicht angewiesen sind.

Die Gestaltungsschicht bleibt unberührt: `touch-action` steht weiter auf
`manipulation` (`none` nähme den Zwei-Finger-Zoom mit).

### Backlog-Abgleich
Kein bestehender Punkt. Verwandt: „Das Backoffice läuft bei 320 und 375 px aus
dem Bild“ (Fehlerbehebung 18.09.) — bleibt offen, diese Runde hat die Breiten
nicht angefasst.

### Prüfplan
`tests/ui-runde18.cjs`, Abschnitt **B4** — 4 Urteile, mit echten
`TouchEvent`s bei 390 × 844 und `hasTouch`. Gemessen wird beides: ob die Leiste
aufgeht **und ob `defaultPrevented` gesetzt ist** — ohne das zweite bliebe die
Zurück-Geste beim Browser.

1. Vom Rand nach rechts → offen **und** verhindert.
2. Nach links zurück → zu.
3. Wisch aus der Mitte → nichts offen, **nicht** verhindert.
4. Senkrecht am Rand → nichts offen, **nicht** verhindert (Scrollen bleibt).

**Was ein Prüfstand nicht kann:** Chromium bestätigt, dass `preventDefault()`
gerufen wird; ob Safari daraufhin wirklich nicht zurückblättert, zeigt erst
das iPad. Das ist der eine Punkt dieser Runde, der am Gerät nachzusehen ist.
Bild: `review/screens/runde-18/iphone-wisch-offen.png`.

---

## B5 · Blätter zum Ausdrucken statt einer PDF-Bibliothek

### Befund
Es gab keinen Druckweg. Ausgegeben wurde ausschliesslich CSV (`hol()`,
`public/leitung.html:2500`), und eine CSV-Datei geht nicht in eine
WhatsApp-Gruppe.

### Entscheidung: kein Fremdbaustein
Eine PDF-Bibliothek wäre eine neue Abhängigkeit und ein Bauschritt — Regel 8,
und sie wöge mehr als alles andere in dieser Datei zusammen. Der Browser kann
PDF von sich aus:

* **MacBook** · Drucken ▸ links unten „PDF“ ▸ „Als PDF sichern“ (oder „In Mail senden“)
* **iPad/iPhone** · Teilen ▸ Drucken ▸ Vorschau mit zwei Fingern aufziehen ▸ Teilen

Das kostet nichts, läuft offline und veraltet nicht.

### Lösungsweg (umgesetzt)

| Baustein | Zeile | Aufgabe |
|---|---|---|
| `drucke(titel, inhalt, unterzeile)` | `:2526` | füllt `#druck`, setzt `body.drucken`, ruft `window.print()` |
| `druckVorgang(v)` | `:2550` | ein Vorgang: Kopf, Notiz, jeder Mengenblock mit Summe |
| `druckDifferenzen(tag, a)` | `:2574` | „was nicht aufgeht“, plus „ohne Abgleich“ mit Grund |
| `#druck` + `@media print` | `:648`–`:682` | das Blatt; am Schirm nie sichtbar |
| Knopf je Zeile / im Detail | `:3283`, `:3314` | „PDF“ neben „Ansehen“, „Als PDF“ im Detail |
| Knopf im Abgleich | `:2301`, `:2309` | „Differenzen als PDF“ neben „Als CSV“ |

Drei Entscheidungen, die im Blatt stecken:

* **Aufgeräumt wird über `afterprint`**, mit einem Notausgang nach 180 Sekunden.
  Die Frist ist bewusst lang: Wer räumt, während der Druckdialog offen steht,
  druckt ein leeres Blatt. `DRUCKLAUF` (`:2525`) verhindert, dass ein alter
  Notausgang einen neuen Druck leerräumt.
* **Ein Cmd-P ohne Knopf druckt weiter die Seite selbst.** Die Druckregeln
  hängen an `body.drucken` (`:652`) — ohne die Klasse greift nichts.
* **Das Differenzblatt nennt keine Preise und keinen Umsatz.** Es ist für eine
  Gruppe gedacht, in der nicht alle alles sehen müssen. Es druckt auch dann,
  wenn nichts abweicht: „Verkauf und Entnahme decken sich“ ist eine Nachricht,
  die verschickt werden darf, und ein Knopf, der manchmal nichts tut, wird
  nicht benutzt.

### Backlog-Abgleich
Kein bestehender Punkt. Neu im Backlog: ein Sammelblatt über mehrere Vorgänge
(z. B. eine ganze Woche) gibt es nicht — jedes Blatt ist ein Vorgang.

### Prüfplan
`tests/ui-runde18.cjs`, Abschnitt **B5** — 4 Urteile:
1. „PDF“ am Wareneingang: `body.drucken` gesetzt, `window.print()` **einmal**
   gerufen, Überschriften und Zahlen im Blatt, Notiz übernommen.
2. Im Druckbild (`emulateMedia({media:"print"})`) steht das Blatt **allein**:
   Kopfleiste und Navigation sind unsichtbar.
3. Differenzblatt: Titel und eine Einleitung in ganzen Sätzen.
4. Differenzblatt führt die Positionen auf, die nicht aufgehen (Abschnitt
   „Nicht ausgeglichen“, mindestens zwei Zeilen) — dafür liefert der Prüfstand
   einen Z-Bericht samt bestätigter Gebindegrössen, sonst stünde dort zu Recht
   „nichts vergleichbar“.

Bilder: `review/screens/runde-18/druck-vorgang.png`,
`druck-differenzen.png`.

Von Hand am MacBook einmal wirklich drucken und als PDF sichern — der
Prüfstand misst das Blatt, nicht den Drucker.

---

## Geprüft

| Prüfung | Ergebnis |
|---|---|
| `npm test` | **444 von 444 grün** (ca. 4 s) |
| `node tests/ui-runde18.cjs` | **34 Urteile grün, 0 rot, keine JS-Fehler** |
| Regeln (`tests/projektregeln.test.mjs`) | vier Dateien in `public/`, Gestaltungsschicht wortgleich, `VERSION` **v57**, keine neue Abhängigkeit in `package.json` |

`tests/ui-runde18.cjs` ist wie `ui-leitung.cjs` **nicht** Teil von `npm test`
(Playwright ist keine Abhängigkeit des Projekts). Aufruf:

```
node tests/ui-runde18.cjs
# passt der vorinstallierte Chromium nicht zur Playwright-Fassung:
PW_ORT=<pfad>/node_modules/playwright PW_CHROME=<pfad>/chrome node tests/ui-runde18.cjs
```

Eine Zeile in `tests/unklar-wandert.test.mjs:32` musste mitgehen: Ihre Endmarke
war der Abschnittskopf „7e · Speicher“, und der Speicher heisst jetzt `7f`,
weil „Eingänge“ davor einsortiert ist.

## Nicht angefasst (R7)

* `vSpeicher` bleibt, wie es war — samt seiner zwei Striche und seinem einen
  leeren Satz. Beide Punkte stehen als *niedrig* im Backlog.
* Der Versatz um einen Tag zwischen Betriebstag und Abgleich (Backlog, „Hoch“)
  wirkt auch in „Eingänge“ und im Differenzblatt. Er braucht eine Entscheidung,
  keine Runde.
* Die App (`public/index.html`) ist unberührt.

---

## Nachtrag · was die Jagd gefunden hat (und was daraufhin geschah)

Der Jäger hat den Stand `dc4a068` gelesen und **1 × A, 3 × B, 4 × C** gemeldet.
Alle A- und B-Funde sind in derselben Nacht behoben, mit je einer eigenen
Prüfung. Die Einzelheiten stehen in `review/JAGD.md`.

### A · Das Blatt für die Gruppe nannte „Schwund", wo der Verkauf fehlte

Das ist der schwerste Fund der Runde, und er betrifft genau das Blatt, das aus
dem Haus geht. `druckDifferenzen()` übernahm die Vorbehalte des Bildschirms
nicht: dass Z-Berichte fehlen, dass Kassennamen keinem Artikel zugeordnet sind,
dass zugeordnete Namen keine bestätigte Größe haben. Mit dem Mapping, wie es
live steht, ist das kein Randfall — in Bericht 37 sind **136 von 145 verkauften
Stück nicht zugeordnet**. „Verkauft 0 · Geholt 6 · +6 · Schwund" ist dann keine
Messung, sondern eine Lücke mit einem Vorwurf daneben.

**Behoben:** Ein eigener Kasten unter der Einleitung nennt jeden Vorbehalt mit
Zahl. Solange einer davon gilt, fällt das Wort „Schwund" aus der Deutungsspalte
(sie sagt dann „mehr geholt als GERECHNETER Verkauf — es fehlt Verkauf in der
Rechnung"), die Summenzeile trägt „Verkaufsseite unvollständig", und die
Unterzeile des Kopfs sagt **„unvollständige Rechnung"**.

Prüfung: zwei Urteile in `tests/ui-runde18.cjs` — der Kasten nennt die fehlenden
Berichte **und** die nicht zugeordneten Namen, und im ganzen Blatt steht nirgends
das Wort „Schwund", solange die Rechnung halb ist.

### B · drei Funde, alle behoben

| Fund | Behebung | Prüfung |
|---|---|---|
| Die Kachel „Tagesfassung" legte das Detail am Handy 921 px unter den Falz — `scrollTo(0,0)` statt `scrollIntoView` | Ist ein Detail offen, gewinnt es | „Kachel bringt das Detail am Handy ins Bild": `top=139` bei 844 px Fensterhöhe |
| Das offene Detail überlebte einen Filter, der seinen Vorgang ausschloss (`finde()` suchte in `alle` statt in `L`) | `finde()` sucht in der gefilterten Liste; ohne Treffer wird `#egDetail` geräumt | „ein Filter, der den Vorgang ausschliesst, räumt auch sein Detail" |
| `randwisch()` nahm Gesten über dem Suchfeld und über der waagrecht rollenden Vorgangstabelle — Randzone 32 px, Inhalt ab 16 px; bei offener Leiste wurde jede waagrechte Geste geschluckt | Zone auf 20 px, ausdrückliches Nein für Eingabefelder und rollende Hüllen, `preventDefault` nur in der Richtung, die etwas bewirkt | vier Urteile: Suchfeld, rollende Tabelle, Leerlauf bei offener Leiste, und die Zeile als zweiter Weg |

Dazu ein Zusatz, den derselbe Fund nötig machte: In den Eingängen stehen
„Ansehen“ und „PDF“ bei 390 px erst nach dem waagrechten Rollen. **Die ganze
Zeile öffnet jetzt das Detail**; die Knöpfe bleiben für Maus und Tastatur.

### C · vier Funde

Drei davon stehen in `review/BACKLOG.md` (drei Schwellen für dieselbe Frage,
zwei Menüpunkte mit derselben Zahl, Trefferflächen unter 44 px). Einer ist
sofort behoben: Der Satz „Gezählte Bestände sind Ist-Stände, keine Entnahme"
stand im Fuß **jedes** Vorgangsblatts, auch auf einer Lieferung ohne eine
einzige Zählung. Er steht jetzt nur noch dort, wo ein Zählblock im Blatt ist.

### Stand nach der Behebung

| Prüfung | Ergebnis |
|---|---|
| `npm test` | **444 von 444 grün** |
| `node tests/ui-runde18.cjs` | **34 Urteile grün, 0 rot, keine JS-Fehler** |
