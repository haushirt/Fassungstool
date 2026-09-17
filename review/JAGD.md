# Die Jagd

Funde des Jägers (`.claude/agents/jaeger.md`). Er baut nichts, er sucht nur.
Läuft nach jeder Runde, liest den Diff UND den Gesamtzustand.

Klassen:
* **A** – falsche Zahl, Datenverlust, Funktion kaputt, Sicherheitsloch
* **B** – sichtbarer Fehler oder Fehlbedienung wahrscheinlich
* **C** – Kosmetik (ab Runde 5 grundsätzlich nach `review/BACKLOG.md`)

Erledigtes wird nicht gelöscht, sondern in der Spalte „Stand" auf
„behoben in Runde N" gesetzt.

Zeilennummern beziehen sich auf den Stand `f69988e` (HEAD nach Runde 6).
`public/leitung.html` wurde während dieser Jagd von einer anderen Rolle
weiterbearbeitet; ab Zeile 1751 verschieben sich die Nummern um +4.

| Klasse | Runde | Fund | Datei:Zeile | Wie nachgestellt | Nächste Rolle | Stand |
|---|---|---|---|---|---|---|
| A | 6 | `kistenGr()` liest `p.kg`; die App legt `kistengr` ab — das Backoffice rechnet jede Lieferung mit der Vorgabe statt mit der erfassten Kistengröße | `public/leitung.html:678` · `public/index.html:2910` · `src/index.js:295` | Gerechnet: 2 Kisten Stiegl à 20 → App und Journal 40 Flaschen, Backoffice 12. Gasteiner 5 × 12 → 60 gegen 30 | software-engineer | offen |
| A | 6 | Zwei Vorgänge desselben Modus am selben Tag teilen den Schlüssel `<modus>_<tag>`: der zweite nimmt den ersten vollständig per Gegenbuchung zurück und überschreibt seine Zeile | `public/index.html:2230`, `:1509` · `src/index.js:262` | Am echten Worker gegen `docs/live-schema.sql` durchgespielt: nach der 2. Lieferung steht im Journal `eingang w003 −24` und `eingang cola −24`; `vorgang.daten.pos` trägt nur noch die zweite Lieferung | software-engineer | offen |
| A | 6 | Gelieferte Getränke (`gent` im Wareneingang) zählen im Backoffice als Entnahme — der Worker bucht dieselben Zeilen seit v22 als Eingang | `public/leitung.html:730`, `:1133` · `src/index.js:302` | 24 gelieferte Cola + 12 Hefeweizen → „Verkauf ↔ Fassung" zeigt Differenz +24 bzw. +12 mit der Deutung „Vorrat aufgebaut oder Schwund" | software-engineer | offen |
| A | 6 | `nachZeit()` stellt den Wareneingang VOR die Kellerzählung desselben Tages; der Worker ordnet nach Ankunft. Der Kellerbestand im Backoffice verliert die Lieferung | `public/leitung.html:740`, `:961` · `src/index.js:381` | Zählung 16.09. = 10 Fl. w003, Lieferung 16.09. = 24 Fl. → Backoffice 10, Worker 34; Banner sagt „Seither 0 Flaschen eingegangen" | software-engineer | offen |
| A | 6 | „Größe fehlt" bleibt nur auf der Verkaufsseite draußen. Auf der Entnahmeseite wird dieselbe Position zur vollen Abweichung — der Hinweis darüber behauptet das Gegenteil | `public/leitung.html:1136`, `:1267`, `:1278` | Mit dem echten Live-Mapping (13 Namen, `gebinde_ml` überall NULL) und Bericht 37: `verk` ist LEER, 10 Zeilen stehen als „PRÜFEN"/„kleine Abweichung", Deutung „Schwund" | software-engineer | offen |
| A | 6 | „Übernehmen" auf einer Rezeptzeile schreibt `MAP[Mischgetränk] = Bestandteil` und lässt den Worker alle alten Berichtszeilen dieses Namens umschreiben | `public/leitung.html:1392`, `:865` · `src/index.js:505` | Der Knopf trägt `data-geb=<Kassenname des Mischgetränks>`, `data-art=<id des fehlenden Bestandteils>`; `bestaetigeGebinde` setzt `MAP[name]=artId` und `POST /api/mapping` löst `UPDATE fassungszeile SET artikel = ?` aus. Kein Papierkorb (Projektanleitung §8) | software-engineer | offen |
| B | 6 | Eine Zählung auf 0 erzeugt keine Journalzeile (`if (menge)`): der Wein, der leer gezählt wurde, behält im Journal seinen alten Stand | `src/index.js:269`, `:267` | `zdone.w001=1, reihen=0, einzel=0` → Backoffice `zaehlung {w001:0}`, Worker: keine Zeile. Heute ohne Schirm (`/api/bestand` hat keinen Verbraucher), aber die Zählung fehlt im append-only-Journal | software-engineer | offen |
| B | 6 | 6 der 13 Live-Zuordnungen bekommen keinen Vorschlag; die Zeile sagt „Gebindegröße von Hand eintragen", und es gibt im ganzen Backoffice kein Feld dafür | `public/leitung.html:1388` | `grep` über `leitung.html`: `bestaetigeGebinde` wird nur vom Knopf `data-ml` aufgerufen, der nur bei `o.geb.ml` entsteht. Cola Zero, Now-Limo, Stiegl 0,5, Hefeweizen, Mango, Stiegl 0,3 sind damit unerreichbar | software-engineer | offen |
| B | 6 | Ein Paket, das der Server dauerhaft mit 4xx (≠409) ablehnt, hält die Offline-Reihe für immer an: `break` ohne Entnahme, `versuche` wird nie hochgezählt | `public/index.html:1632`, `:1579` | Code gelesen: der Kopf der Reihe bleibt liegen, jeder weitere Lauf versucht dasselbe Paket. `versuche:0` wird angelegt und nirgends erhöht — die Ausstiegsluke war vorgesehen und fehlt | software-engineer | offen |
| B | 6 | Trefferflächen im Service: `.dot` (die Hauptbedienung der Tagesfassung) ist 26 × 26 px, die Schrittpunkte sind mit `::after` real 24 × 44 px | `public/index.html:565`, `:409`, `:417` | `review/screens/runde-6/messung.json`, dazu die Bilder `app-390-tag.png` und `app-390-fuellen.png` angesehen: die drei Ringe je Weinzeile sind die Zähleingabe und liegen 8 px auseinander | designer | offen |
| B | 6 | `tests/gebinde.test.mjs` prüft den Rezeptweg, `bestaetigeGebinde`, `kistenGr`/`normVorgang` und den Fall „`verk` ist leer" nicht | `tests/gebinde.test.mjs:63–258` | Alle 15 `test(...)` gelesen: kein `REZ`, kein `VORGAENGE` mit Inhalt, keine Differenzspalte, kein Wareneingang. Genau die vier Wege, auf denen A-1, A-3, A-5 und A-6 liegen | software-engineer | offen |
| C | 6 | Der Messlauf zählt Kinder eines `.vh`-Behälters als sichtbare Trefferflächen — „Zurück"/„Weiter" 65 × 29 auf drei Seiten sind Geisterfunde, die Zahl 96 ist zu hoch | `tests/ui-mass.cjs:99` · `public/index.html:1331` | `sicht()` prüft `classList.contains("vh")` nur am Element selbst; `.vh` ist `width:1px;overflow:hidden;clip:rect(0 0 0 0)` (`index.html:221`) | → BACKLOG | offen |
| C | 6 | `.vh` steht zweimal in `index.html` (einmal in der Gestaltungsschicht, einmal darunter) | `public/index.html:221`, `:761` | `grep -n '\.vh{'` — zwei identische Regeln | → BACKLOG | offen |
| C | 6 | `parseZ` liefert `p.ml` bereits mit; `flaschen()` rechnet dieselbe Regel über `mlAusText(p.name)` ein drittes Mal | `src/gnparse.js:~30` · `public/leitung.html:594`, `:1066` | 15 Proben durch beide Fassungen: 0 Abweichungen. Heute deckungsgleich, aber ein drittes Vorkommen derselben Regel | → BACKLOG | offen |
| C | 6 | Widersprechen sich zwei Bestätigungen, fällt `gebindeGroesse` still auf den 750-Vorschlag zurück statt auf „unbekannt" | `public/leitung.html:647`, `:663` | `gebArtikelBestaetigt()` (`:647`) setzt `t[id]=null`; `if(ueberArtikel)` (`:663`) ist damit falsch und der Weg läuft bis Rang 4 durch (`:666`, Vorschlag 750) | → BACKLOG | offen |

---

## Die Rechnungen im Klartext

### A-1 · Die Kistengröße im Backoffice

`kistenGr(p)` (`leitung.html:678`) lautet:

```
function kistenGr(p){ if(p && p.kg) return +p.kg; return (PLAN.kiste||{})[p.id] || 6; }
```

`p.kg` hat es nie gegeben — der Worker sagt das seit Runde 5 selbst
(`src/index.js:288`, „`kg` gab es nie"). Die App legt die Kistengröße unter
`kistengr` ab (`index.html:2910`, Eingabefeld `.inKG`, vorbelegt aus
`PLAN.kiste`, danach frei änderbar). Das Backoffice liest den einen Namen,
den es nicht gibt, und fällt auf die Vorbelegung zurück. Solange niemand
das Feld anfasst, fällt es nicht auf; sobald jemand es anfasst, driften die
Zahlen:

| Position | erfasst | App + Journal | Backoffice | Abweichung |
|---|---|---|---|---|
| w003 (Ott · Fass 4) | 2 × 12 | 24 | 24 | — |
| w001 (Leindl) als 12er | 2 × 12 | 24 | 12 | 12 |
| st05 (Stiegl) als 20er | 2 × 20 | 40 | 12 | 28 |
| gasteiner als 12er | 5 × 12 | 60 | 30 | 30 |

`PLAN.kiste` kennt genau einen Eintrag (`{"w003":12}`). Jede andere Kiste
ist im Backoffice eine Sechserkiste, gleichgültig was im Keller gestanden
hat. Der Befund der Runde 6 („40 gegen 12") ist damit bestätigt.

### A-2 · Der zweite Wareneingang nimmt den ersten zurück

`start(m)` (`index.html:2230`) legt bei einem abgeschlossenen Vorgang einen
neuen an: `archive(cur); S[m]=blank(m)`. `blank("ware")` bekommt denselben
Betriebstag, also denselben Schlüssel `ware_<tag>`. `zaehlnr(sch,true)`
zählt an demselben Schlüssel weiter, der 409-Wächter
(`src/index.js:182`) greift deshalb nicht. Am echten Worker gegen das
dokumentierte Live-Schema durchgespielt:

```
1. Lieferung (zaehlnr 1, 2 Kisten à 12 w003, 24 Cola)
   Journal: eingang w003 24 · eingang cola 24
2. Lieferung (zaehlnr 2, 1 Kiste à 6 w001)
   Journal: eingang w003 24 · eingang cola 24
            eingang w003 −24 · eingang cola −24 · eingang w001 6
   vorgang.daten.pos: [{"id":"w001","kisten":1,"kistengr":6}]
```

Das Journal bleibt append-only und formal richtig — die Summe ist es nicht:
die erste Lieferung ist rechnerisch verschwunden. Dasselbe geschieht im
Gerätearchiv (`index.html:1509`, `a[rec.mode+"_"+rec.tag]=…` überschreibt)
und in der Vorgangszeile der Datenbank. Betroffen ist jeder Modus: zwei
Sonderentnahmen an einem Abend, zwei Nachfüllgänge, zwei Lieferungen.
Live existiert bereits `ware_2026-09-16` (am 17.09. lesend nachgesehen,
`pos` ist dort leer).

### A-3 · Gelieferte Getränke als Entnahme

`normVorgang` (`leitung.html:730`) schiebt `gent` unabhängig vom Modus in
`o.getr`, mit dem Kommentar „Getränke zusätzlich entnommen". Im
Wareneingang heisst `gent` aber GELIEFERT — genau die Stelle, die der
Worker in v22 berichtigt hat (`src/index.js:296–302`). `abgleich()`
(`leitung.html:1133`) summiert `v.getr` in `ent`:

```
Wareneingang 16.09., gent {cola:24, hell:12}
  normVorgang().getr → {cola:24, hell:12}
  abgleich()         → Cola  Verkauf 0  Entnahme 24  Diff +24  „prüfen"
                       Hell  Verkauf 0  Entnahme 12  Diff +12  „prüfen"
  Vorgangsliste, Spalte „Getränke Fl.": 36
```

Die Deutungsspalte schreibt dazu „mehr geholt als verkauft — Vorrat
aufgebaut oder Schwund". Der Vorzeichenfehler, der im Journal behoben ist,
steht unverändert auf dem Schirm.

### A-4 · Die Reihenfolge am selben Tag

`nachZeit()` (`leitung.html:740`) sortiert innerhalb eines Betriebstages
nach `MODUSRANG = {ware:0, keller:1, tag:2, fuellen:3, nach:4}`. Der Worker
sortiert nach `ts`, also nach Ankunft (`src/index.js:381`). Der übliche
Tagesablauf — vormittags zählen, mittags die Lieferung erfassen — läuft
damit in den beiden Fassungen entgegengesetzt:

```
Kellerzählung 16.09.: w003 = 1 Reihe + 4 = 10 Flaschen
Wareneingang  16.09.: 2 Kisten à 12     = 24 Flaschen

leitung bestand()  → 10   (ware liegt VOR keller, der Eingang fällt weg)
                      „Seither 0 Flaschen eingegangen"
Worker  bestand()  → 34   (Eingang kam nach der Zählung an)
```

24 Flaschen Unterschied, auf dem Schirm, von dem die Bestellliste gerechnet
wird (`bestellliste()` benutzt dasselbe `bestand()`). Welche der beiden
Reihenfolgen richtig ist, entscheidet nicht der Jäger — dass zwei
verschiedene im Umlauf sind, ist der Fund.

### A-5 · Was die Leitung morgen früh wirklich sieht

Mit dem Mapping, wie es heute in der Live-D1 steht (13 Namen, `gebinde_ml`
bei allen NULL — am 17.09. lesend nachgesehen) und Bericht 37:

```
Bericht 37: 48 Positionen · 145 Stück · 602,50 €
  offen (keine Zuordnung):   35 Namen · 118 Stück
  ohneGroesse:               13 Namen ·  27 Stück
  verk:                      {}   ← keine einzige Position gerechnet
```

`abgleich()` bildet `ids` aus `keys(verk) ∪ keys(ent)`. Ist `verk` leer,
bleibt jede Zeile bei `verkauf 0` und `diff = entnahme`. Mit einer
gewöhnlichen Tagesfassung desselben Tages daneben:

```
Cola                          Verkauf 0,00  Entnahme 6  Diff +6,00  PRÜFEN
Stiegl Freibier alkoholfrei   Verkauf 0,00  Entnahme 4  Diff +4,00  PRÜFEN
Leindl · Langenlois           Verkauf 0,00  Entnahme 3  Diff +3,00  PRÜFEN
…  10 Zeilen, rote Zahl 10 in der Navigation
```

Die Warnung, die Runde 6 eingebaut hat, greift dabei nicht: sie hängt an
`a.berichte === 0` (`leitung.html:1284`), und ein Bericht IST da. Der
Hinweis darüber sagt wörtlich, diese Positionen „zählen weder als Verkauf
noch als Abweichung" (`leitung.html:1267`) — auf der Verkaufsseite stimmt
das, auf der Entnahmeseite nicht.

Damit ist die Frage des Auftrags beantwortet: **ja, es ist schlimmer als
vorher.** Vorher stand eine geratene Zahl in der Verkaufsspalte und die
Differenz war zu klein. Jetzt steht dort 0,00 und die Differenz ist die
volle Entnahme — mit der Deutung „Schwund" daneben. Zum Vergleich, wenn
alle Vorschläge bestätigt wären:

```
Gasteiner 1 l   Verkauf 3,75  Entnahme 0  Diff −3,75
Muster · Gelber Muskateller  Verkauf 1,00  Entnahme 1  Diff 0,00  stimmt
… 7 auffällige Zeilen statt 10, sechs davon bleiben ohne Vorschlag (B)
```

### A-6 · Der Knopf auf einer Rezeptzeile

Fehlt einem Bestandteil eines Mischgetränks die Größe, legt `abgleich()`
die Zeile unter dem Namen des MISCHGETRÄNKS und der id des BESTANDTEILS ab
(`leitung.html:1099`). Der Knopf daneben ruft
`bestaetigeGebinde(<Mischgetränk>, <Bestandteil>, ml)`
(`leitung.html:1392`), und der schreibt:

```
MAP["Aperol Spritz"] = "prosecco"          leitung.html:867
POST /api/mapping {kassenname:"Aperol Spritz", artikel:"prosecco", …}
  → UPDATE fassungszeile SET artikel = 'prosecco' WHERE rohbez = 'Aperol Spritz'
                                             src/index.js:505
```

Drei Folgen: die Zuordnungsseite zeigt das Mischgetränk als fest einem
Bestandteil zugeordnet; alle schon eingelesenen Berichtszeilen werden
umgeschrieben, ohne Sicherung und ohne Papierkorb; und hat das Rezept
zwei Bestandteile ohne Größe, springt `MAP` beim zweiten Klick auf den
zweiten Bestandteil um. Der Weg ist heute nur erreichbar, wenn auf der
Rezepturseite ein Rezept angelegt wurde (`REZ` liegt in `localStorage`,
nicht in der Datenbank) — geprüft habe ich den Code, nicht wie viele
Rezepte die Leitung angelegt hat.

## Geprüft, ohne Fund

* **`ml()` gegen `mlAusText()`.** `src/gnparse.js` und `leitung.html:595`
  sind Zeile für Zeile dieselbe Regel. 15 Proben durch beide Fassungen
  (Bruch vor der Einheit, doppeltes Größensuffix „0,25l 0,25l", „2 cl",
  „0,33" ohne Einheit, „1 Glas"): 0 Abweichungen. Die Duplizierung besteht,
  die Drift nicht.
* **Gestaltungsschicht.** `messung.json` meldet `gefunden:true, gleich:true`
  über 10 025 Zeichen — `index.html` und `leitung.html` sind wortgleich.
* **Bericht 37, Gegenprobe an sich selbst.** `parseZ` liefert 48 Positionen
  aus 50 Zeilen (zwei doppelte Positionsnamen zusammengefasst), 145 Stück,
  602,50 €. Durch `abgleich()`: 118 Stück offen + 27 Stück ohne Größe = 145.
  Es geht auf, nichts fällt heraus.
* **Magnum und 0,375.** `flaschen()` verlangt `geb.quelle === "bestaetigt"`
  (`leitung.html:1069`); der 750-Vorschlag rechnet NICHT mit. Ein Magnum
  wird also nicht still halbiert, sondern landet unter „Größe fehlt" — das
  ist richtig. Offen bleibt, dass der Knopf „Übernehmen" auch dort 750 ml
  anbietet; wer ihn drückt, schreibt die falsche Flasche fest (→ BACKLOG).
* **Ein Artikelname, der eine falsche Größe trägt.** Über alle 55 Weine und
  31 Getränke gelaufen: Rang 3 greift bei genau zwei Artikeln — `gastklein`
  („Gasteiner 0,25 l" → 250) und `gasteiner` („Gasteiner 1 l" → 1000).
  Beide stimmen. „Stiegl 0,0 % · 0,33" liefert `null`, weil die Einheit
  fehlt, und fällt damit richtig in den dritten Zustand.
* **Waagrechter Überlauf.** 0 bei 390, 768 und 1280 px, 0 JS-Fehler.
* **`public/`** hat genau vier Dateien, `sw.js` steht auf `v25`.

## Was diese Jagd nicht beweisen kann

* Echtes Safari, Tastatur, Notch und Safe-Area — in Chromium nicht prüfbar,
  bleibt **ungeprüft**.
* Ob live Rezepturen angelegt sind (A-6): `REZ` liegt nur im Browser der
  Leitung, nicht in der D1.
* Wie oft die Kistengröße von Hand geändert wird (A-1): die einzige
  Wareneingangszeile der Live-D1 (`ware_2026-09-16`) hat `pos: []`.

## Nachtrag · was während der Jagd schon in Arbeit war

`public/index.html`, `public/leitung.html` und `public/sw.js` haben sich
unter den Händen geändert (ungesicherte Änderungen, dazu neu
`tests/kisten.test.mjs`, `tests/vorgang-zweimal.test.mjs`,
`tests/ui-zweiter-vorgang.cjs`, `review/screens/runde-7/`). Geprüft und
klassifiziert wurde der Stand `f69988e`. Zum laufenden Stand:

* **A-1 ist dort bereits behoben** — `kistenGr` lautet jetzt
  `(+p.kistengr || +p.kg) || 6`, wortgleich mit dem Worker.
* **A-2 wird bearbeitet** (`tests/vorgang-zweimal.test.mjs`); geprüft habe
  ich das nicht.
* **A-6 wird durch die neue Sammelbestätigung GRÖSSER, nicht kleiner.**
  `bestaetigeAlleGebinde(liste)` filtert auf `o.fehlt === "gebinde" && o.id`
  — Rezeptzeilen erfüllen genau das. Ein Klick schreibt dann für JEDES
  Mischgetränk `MAP[<Mischgetränk>] = <Bestandteil>` und löst je Zeile ein
  `UPDATE fassungszeile SET artikel` aus. Vor dem Sammelknopf musste man
  dafür einzeln klicken.
* **A-3, A-4, A-5 sind im laufenden Stand unverändert** (`normVorgang`
  Zeile mit `gent`, `MODUSRANG`, die Entnahmeseite von `abgleich`).

Die C-Funde stehen hier mit „→ BACKLOG"; eintragen muss sie die Rolle,
die die nächste Runde führt — der Jäger fasst `review/BACKLOG.md` nicht an.
