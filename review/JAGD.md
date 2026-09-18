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
| A | 6 | `kistenGr()` liest `p.kg`; die App legt `kistengr` ab — das Backoffice rechnet jede Lieferung mit der Vorgabe statt mit der erfassten Kistengröße | `public/leitung.html:678` · `public/index.html:2910` · `src/index.js:295` | Gerechnet: 2 Kisten Stiegl à 20 → App und Journal 40 Flaschen, Backoffice 12. Gasteiner 5 × 12 → 60 gegen 30 | software-engineer | **behoben in Runde 7** — `leitung.html:690` lautet `(+p.kistengr \|\| +p.kg) \|\| 6`, wortgleich mit `src/index.js:296` |
| A | 6 | Zwei Vorgänge desselben Modus am selben Tag teilen den Schlüssel `<modus>_<tag>`: der zweite nimmt den ersten vollständig per Gegenbuchung zurück und überschreibt seine Zeile | `public/index.html:2230`, `:1509` · `src/index.js:262` | Am echten Worker gegen `docs/live-schema.sql` durchgespielt: nach der 2. Lieferung steht im Journal `eingang w003 −24` und `eingang cola −24`; `vorgang.daten.pos` trägt nur noch die zweite Lieferung | software-engineer | **behoben in Runde 7 für EIN Gerät** (Dialog „steht schon", `index.html:2266`). Über zwei Geräte offen → B/8-2 |
| A | 6 | Gelieferte Getränke (`gent` im Wareneingang) zählen im Backoffice als Entnahme — der Worker bucht dieselben Zeilen seit v22 als Eingang | `public/leitung.html:730`, `:1133` · `src/index.js:302` | 24 gelieferte Cola + 12 Hefeweizen → „Verkauf ↔ Fassung" zeigt Differenz +24 bzw. +12 mit der Deutung „Vorrat aufgebaut oder Schwund" | software-engineer | **behoben in Runde 8** — `leitung.html:756`; `o.eingang` wird nur in `bestand()` (`:1092`) gelesen, keine Doppelzählung nachgerechnet |
| A | 6 | `nachZeit()` stellt den Wareneingang VOR die Kellerzählung desselben Tages; der Worker ordnet nach Ankunft. Der Kellerbestand im Backoffice verliert die Lieferung | `public/leitung.html:740`, `:961` · `src/index.js:381` | Zählung 16.09. = 10 Fl. w003, Lieferung 16.09. = 24 Fl. → Backoffice 10, Worker 34; Banner sagt „Seither 0 Flaschen eingegangen" | software-engineer | **behoben in Runde 8**, aber durch A/8-3 ersetzt: derselbe Tag wird jetzt allein nach Ankunft geordnet |
| A | 6 | „Größe fehlt" bleibt nur auf der Verkaufsseite draußen. Auf der Entnahmeseite wird dieselbe Position zur vollen Abweichung — der Hinweis darüber behauptet das Gegenteil | `public/leitung.html:1136`, `:1267`, `:1278` | Mit dem echten Live-Mapping (13 Namen, `gebinde_ml` überall NULL) und Bericht 37: `verk` ist LEER, 10 Zeilen stehen als „PRÜFEN"/„kleine Abweichung", Deutung „Schwund" | software-engineer | **teilweise behoben in Runde 8** — die volle Abweichung ist weg, dafür A/8-1 und A/8-2 |
| A | 6 | „Übernehmen" auf einer Rezeptzeile schreibt `MAP[Mischgetränk] = Bestandteil` und lässt den Worker alle alten Berichtszeilen dieses Namens umschreiben | `public/leitung.html:1392`, `:865` · `src/index.js:505` | Der Knopf trägt `data-geb=<Kassenname des Mischgetränks>`, `data-art=<id des fehlenden Bestandteils>`; `bestaetigeGebinde` setzt `MAP[name]=artId` und `POST /api/mapping` löst `UPDATE fassungszeile SET artikel = ?` aus. Kein Papierkorb (Projektanleitung §8) | software-engineer | **behoben in Runde 7** — alle vier Wege nachgesehen (Einzelknopf `:918`, Sammelknopf `:948`, Zuordnungsseite `:1974`, Server `ladeZuordnung :880`) |
| B | 6 | Eine Zählung auf 0 erzeugt keine Journalzeile (`if (menge)`): der Wein, der leer gezählt wurde, behält im Journal seinen alten Stand | `src/index.js:269`, `:267` | `zdone.w001=1, reihen=0, einzel=0` → Backoffice `zaehlung {w001:0}`, Worker: keine Zeile. Heute ohne Schirm (`/api/bestand` hat keinen Verbraucher), aber die Zählung fehlt im append-only-Journal | software-engineer | offen — `src/index.js:269` unverändert |
| B | 6 | 6 der 13 Live-Zuordnungen bekommen keinen Vorschlag; die Zeile sagt „Gebindegröße von Hand eintragen", und es gibt im ganzen Backoffice kein Feld dafür | `public/leitung.html:1388` | `grep` über `leitung.html`: `bestaetigeGebinde` wird nur vom Knopf `data-ml` aufgerufen, der nur bei `o.geb.ml` entsteht. Cola Zero, Now-Limo, Stiegl 0,5, Hefeweizen, Mango, Stiegl 0,3 sind damit unerreichbar | software-engineer | offen und GRÖSSER: an Bericht 37 gemessen 13 von 18 ohne Vorschlag; dazu B/8-1 |
| B | 6 | Ein Paket, das der Server dauerhaft mit 4xx (≠409) ablehnt, hält die Offline-Reihe für immer an: `break` ohne Entnahme, `versuche` wird nie hochgezählt | `public/index.html:1632`, `:1579` | Code gelesen: der Kopf der Reihe bleibt liegen, jeder weitere Lauf versucht dasselbe Paket. `versuche:0` wird angelegt und nirgends erhöht — die Ausstiegsluke war vorgesehen und fehlt | software-engineer | offen — `index.html:1639` `break` ohne Entnahme, `versuche` nirgends erhöht |
| B | 6 | Trefferflächen im Service: `.dot` (die Hauptbedienung der Tagesfassung) ist 26 × 26 px, die Schrittpunkte sind mit `::after` real 24 × 44 px | `public/index.html:565`, `:409`, `:417` | `review/screens/runde-6/messung.json`, dazu die Bilder `app-390-tag.png` und `app-390-fuellen.png` angesehen: die drei Ringe je Weinzeile sind die Zähleingabe und liegen 8 px auseinander | designer | offen im gemessenen Stand (`.dot` 26 × 26); der ui-designer arbeitet gerade daran (ungesichert) |
| B | 6 | `tests/gebinde.test.mjs` prüft den Rezeptweg, `bestaetigeGebinde`, `kistenGr`/`normVorgang` und den Fall „`verk` ist leer" nicht | `tests/gebinde.test.mjs:63–258` | Alle 15 `test(...)` gelesen: kein `REZ`, kein `VORGAENGE` mit Inhalt, keine Differenzspalte, kein Wareneingang. Genau die vier Wege, auf denen A-1, A-3, A-5 und A-6 liegen | software-engineer | **behoben in Runde 7/8** — `kisten`, `vorgang-zweimal`, `abgleich-unklar`, `reihenfolge`, `lieferung-getraenke`; 270 grün |
| C | 6 | Der Messlauf zählt Kinder eines `.vh`-Behälters als sichtbare Trefferflächen — „Zurück"/„Weiter" 65 × 29 auf drei Seiten sind Geisterfunde, die Zahl 96 ist zu hoch | `tests/ui-mass.cjs:99` · `public/index.html:1331` | `sicht()` prüft `classList.contains("vh")` nur am Element selbst; `.vh` ist `width:1px;overflow:hidden;clip:rect(0 0 0 0)` (`index.html:221`) | → BACKLOG | **behoben in Runde 9** (`0d810d4`) — gemessen 96 → 78 |
| C | 6 | `.vh` steht zweimal in `index.html` (einmal in der Gestaltungsschicht, einmal darunter) | `public/index.html:221`, `:761` | `grep -n '\.vh{'` — zwei identische Regeln | → BACKLOG | offen — `index.html:221`, `:761` |
| C | 6 | `parseZ` liefert `p.ml` bereits mit; `flaschen()` rechnet dieselbe Regel über `mlAusText(p.name)` ein drittes Mal | `src/gnparse.js:~30` · `public/leitung.html:594`, `:1066` | 15 Proben durch beide Fassungen: 0 Abweichungen. Heute deckungsgleich, aber ein drittes Vorkommen derselben Regel | → BACKLOG | offen — beide Fassungen weiter Zeichen für Zeichen gleich |
| C | 6 | Widersprechen sich zwei Bestätigungen, fällt `gebindeGroesse` still auf den 750-Vorschlag zurück statt auf „unbekannt" | `public/leitung.html:647`, `:663` | `gebArtikelBestaetigt()` (`:647`) setzt `t[id]=null`; `if(ueberArtikel)` (`:663`) ist damit falsch und der Weg läuft bis Rang 4 durch (`:666`, Vorschlag 750) | → BACKLOG | offen — `leitung.html:663`, `:669` |
| A | 8 | Eine einzige nicht zugeordnete Kassenposition schaltet den Schwund-Befund für ALLE Artikel ohne gerechneten Verkauf ab | `public/leitung.html:1288`, `:1281`, `:1301`, `:1340`, `:1381`, `:2053` | Bericht 37 + Tagesfassung durch den ausgelieferten Code: w002 = 12 Flaschen geholt, 0 verkauft → `diff: null`, „kein Abgleich möglich“. Vor Runde 8: „+12 · prüfen“ | software-engineer | offen |
| A | 8 | `nichtRechenbar(id,"groesse")` wird ohne Rücksicht auf einen schon gerechneten Verkauf gesetzt — ein Artikel mit halb gerechnetem Verkauf verliert seine Differenz | `public/leitung.html:1263`, `:1253`, `:1294` | Spritzerwein: 1,80 Fl. aus „Prosecco, Serena 0,1 l/0,75 l“ gerechnet, 9 Fl. entnommen → Zeile zeigt „— / — / kein Abgleich möglich“ statt +7,2. Die Übergabe Runde 8 behauptet ausdrücklich das Gegenteil | software-engineer | offen |
| A | 8 | `bestand()`: kommt die Kellerzählung SPÄTER an als die Fassung desselben Betriebstages, fällt die ganze Entnahme weg — still | `public/leitung.html:1089`, `:792`, `:1786` | Sieben Fälle durch den ausgelieferten `bestand()`: Zählung 10 Fl., Fassung 6 Fl., gleicher Tag, Zählung kommt 07:30 am Folgetag an → 10 statt 4, Banner „Seither 0 Flaschen entnommen“. Ebenso bei identischem `ts` und bei fehlendem `ts` | software-engineer | offen |
| B | 7 | Der Satz unter der Größen-Tabelle nennt für die übrig gebliebenen Positionen den falschen Grund; für sie gibt es weiterhin kein Eingabefeld | `public/leitung.html:1596`, `:1577` | Bericht 37, Live-Mapping: 18 Positionen ohne Größe, der Sammelknopf nimmt 5. Der Satz sagt, den übrigen 13 fehle „die Ausschankmenge im Kassennamen“ — bei allen 13 steht sie im Namen (Cola Zero 0,35 l …); es fehlt die Gebindegröße | software-engineer | offen |
| B | 8 | Der Fremdgerät-Dialog lässt sich seit Runde 8 ablehnen — und das zweite Gerät überschreibt danach den abgeschlossenen Vorgang des ersten, sobald seine eigene Zählnummer die fremde überholt | `public/index.html:2246`, `:1694`, `:1576` · `src/index.js:183` | `zaehlnr` wächst je Gerät bei JEDEM Zwischenstand. Gerät B lehnt ab, arbeitet 6 Zwischenstände → `zaehlnr` 6 > 5 des Geräts A → der 409-Wächter greift nicht mehr, `ereignisseAbleiten` bucht die Lieferung von A gegen. A bekommt kein Signal | software-engineer | offen |
| C | 8 | `fehlt:"ausschank"` wird als Grund „groesse“ verbucht — die Zeile sagt „Größe fehlt“, obwohl die Ausschankmenge fehlt | `public/leitung.html:1263`, `:1193` | `flaschen()` gibt beide Fälle zurück, `nichtRechenbar` bekommt in beiden Fällen `"groesse"` | → BACKLOG | offen |
| C | 8 | `bestellliste()` rechnet mit `PLAN.kiste \|\| 6` statt mit der im Wareneingang erfassten `kistengr` — eine zweite Kistengrößen-Quelle neben `kistenGr()` | `public/leitung.html:1835`, `:690` | `PLAN.kiste` kennt einen Eintrag (`w003:12`); jeder andere Wein wird als Sechserkiste vorgeschlagen, auch wenn er zweimal als Zwölfer geliefert wurde. Die „à 6“ steht sichtbar daneben | → BACKLOG | offen |
| C | 8 | Abgleich bei 390 px: die neue Spalte „Befund“, die den Strich erklärt, liegt außerhalb; „DIFFE…“ ist mitten im Wort abgeschnitten | `public/leitung.html:1625` · `review/screens/jagd-8/leitung-390-abgleich.png` | Bild angesehen: sichtbar sind Artikel · Verkauf · Entnahme, danach beschnitten. Kein Überlauf, weil `.tabhuelle` rollt. Backoffice = MacBook, deshalb C | → BACKLOG | offen |
| C | 8 | Zuordnungsseite zeigt ein Mischgetränk mit Rezeptur als „festgelegt“, während das Feld daneben „— offen —“ steht | `public/leitung.html:1969`, `:1978` | `zuordnung()` gibt `status:"rezept"` zurück; der Pillen-Ausdruck hat dafür keinen Zweig und fällt in „festgelegt“ | → BACKLOG | offen |
| C | 7 | `kurzInhalt(m,"ware")` zählt die gelieferten Getränke (`gent`) nicht mit — der Dialog nennt eine zu kleine Flaschenzahl | `public/index.html:2207` | 2 Kisten à 20 + 24 Cola → „1 Position · 40 Flaschen“; die 24 Cola fehlen im Satz, obwohl sie im selben Vorgang stehen | → BACKLOG | offen |
| C | 7 | „Ein zweiter, leerer Vorgang würde den ersten ersetzen“ — auch ein VOLLER zweiter Vorgang ersetzt ihn vollständig | `public/index.html:2262` | `ereignisseAbleiten` vergleicht Soll gegen Ist: der neue Zustand ist der ganze Zustand, die erste Lieferung wird in jedem Fall gegengebucht | → BACKLOG | offen |

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


---

# Jagd auf Runde 7 und Runde 8

Klassifiziert wurde `0d38504` (HEAD nach Runde 8) für `public/`, `src/`
und `tests/`; die Oberflächenmessung lief mit `tests/ui-mass.cjs` in der
Fassung `0d810d4` (Runde 9). **Während der Jagd hat der ui-designer
`public/index.html` und `public/leitung.html` weiter bearbeitet
(ungesichert, `.dot`-Raster, `.st`-Griff, `--text-xs/-sm` auf 15 px).**
Die Zeilennummern und die Messwerte beziehen sich auf `0d38504`, nicht auf
den laufenden Stand.

Die Live-D1 war in diesem Zug nicht erreichbar (kein Cloudflare-Connector in
dieser Sitzung). Was über den Live-Stand gesagt wird, stammt aus der Jagd auf
Runde 6 (17.09., lesend): 13 Zuordnungen, `gebinde_ml` überall NULL.

## A/8-1 · Eine unzugeordnete Speise schaltet den Schwund ab

`abgleich()` setzt seit Runde 8 (`leitung.html:1288`):

```
Object.keys(ent).forEach(id=>{
  if(verk[id]>0) return;
  if(!berichte.length) return nichtRechenbar(id,"keinbericht");
  if(offen.length) nichtRechenbar(id,"offen");
});
```

Die Begründung im Code lautet, die Entnahme könne aus einer nicht
zugeordneten Kassenposition stammen. Der Bedingungssatz prüft aber nicht,
OB sie das kann — er prüft nur, ob irgendwo im Bericht noch eine Position
offen ist. Bericht 37 durch den ausgelieferten Code, mit den vierzehn
Getränkezuordnungen und allen Größen bestätigt:

```
offen: 30 Namen — Schnittlauch, Käse, Rucola, Speck, Paprika, Pinien,
       HP Omelett, Cappuccino, Espresso, Pisco Sour …

Tagesfassung desselben Tages: w001 3 · w002 12 · cola 6 · st05 4

Leindl · Langenlois          Verkauf 0,67  Entnahme  3  Diff +2,33  prüfen
Stiegl Freibier              Verkauf 2,00  Entnahme  4  Diff +2,00  prüfen
Simon Gattinger · Loiben     Verkauf   —   Entnahme 12  Diff   —
                             „kein Abgleich möglich — Kassenpositionen
                              sind nicht zugeordnet“
Cola                         Verkauf   —   Entnahme  6  Diff   —
```

Zwölf Flaschen aus dem Keller, keine verkauft — das ist die Zeile, wegen
der es diese Seite gibt. Sie steht jetzt ohne Urteil da und zählt nirgends
mit: nicht in der roten Zahl der Navigation (`:1340`, Filter
`!r.unklar`), nicht in „Auffällige Differenzen“ im Mittagsblick
(`:1381`), und nicht in der Zählliste — dort ist `dif[r.id]` bei einer
unklaren Zeile `null`, `d = dif[w.id]||0` also 0, und die Schwelle
`Math.abs(d)>=3` reißt nie (`:2053`).

Speisen sind in `offen` nicht der Ausnahmefall, sondern der Dauerzustand:
Schnittlauch kann kein Wein sein, und ein neues Gericht heißt jeden Monat
neu. `offen.length === 0` verlangt, dass jede einzelne Speise von Hand auf
„Ignorieren“ gesetzt wird — und zwar immer wieder. Bis dahin meldet
„Verkauf ↔ Fassung“ für jeden Artikel ohne gerechneten Verkauf gar nichts.

Vor Runde 8 stand dort „+12 · prüfen“ mit einer zu großen Zahl. Jetzt steht
dort nichts. Beides ist falsch; das zweite fällt niemandem auf.

## A/8-2 · Die halbe Wahrheit, die die Übergabe ausschließt

Die Übergabe zu Runde 8 sagt: „unklar wird ein Artikel nur, wenn für ihn
ÜBERHAUPT kein Verkauf gerechnet wurde — echter Schwund bleibt ein Befund.“
Das gilt für `offen` und `keinbericht` (beide hinter `if(verk[id]>0)
return;`). Für `groesse` gilt es nicht: die Marke wird im Berichtslauf
gesetzt, bevor irgendjemand weiß, ob der Artikel anderswo eine gerechnete
Zahl bekommt (`:1263` und `:1253`).

Nachgerechnet mit Bericht 37 und einer Rezeptur
`Aperol Spritz 1 Glas = Spritzerwein 100 ml + Sanbitter 20 ml`, Größe des
Sanbitter nicht bestätigt:

```
„Prosecco, Serena 0,1 l“   6 × 100 ml / 750  = 0,80 Fl.   gerechnet
„Prosecco, Serena 0,75 l“  1 × 750 ml / 750  = 1,00 Fl.   gerechnet
                                       verk[spritzer] = 1,80

Aperol Spritz: ein Bestandteil ohne Größe
  → r.forEach(x=>nichtRechenbar(x.id,"groesse"))
  → unklar[spritzer] = "groesse"

Zeile: Spritzerwein   Verkauf —   Entnahme 9   Differenz —
       „kein Abgleich möglich — Größe fehlt“
```

7,2 Flaschen Lücke, und der Bildschirm sagt, er könne dazu nichts sagen.
Die Verkaufsspalte zeigt richtigerweise „—“ statt der unvollständigen 1,80
(`:1617`) — die Zahl 1,80 existiert aber und ginge in eine Differenz ein,
wenn die Zeile nicht stumm geschaltet würde. Wer entscheidet, was hier
richtig ist, entscheidet der Jäger nicht; dass die Übergabe diesen Fall
ausdrücklich ausschließt, ist der Fund.

## A/8-3 · Am selben Tag entscheidet allein die Ankunftszeit

`nachZeit()` (`:792`) und `bestand()` (`:1089`) ordnen innerhalb eines
Betriebstages nach `ts` — das ist beim Server `geaendert`, also der
Zeitpunkt, an dem das Paket ANKOMMT (`src/index.js:163`, `:187`), nicht
der, an dem gezählt wurde. Sieben Fälle durch den ausgelieferten
`bestand()`, Zählung 10 Flaschen w003, Fassung 6 Flaschen, beide am
16.09.:

```
1  Zählung an 16.09. 09:05 · Fassung an 16.09. 22:00     →  4   richtig
2  Zählung an 17.09. 07:30 · Fassung an 16.09. 22:00     → 10   FALSCH
3  beide mit demselben Zeitstempel                        → 10   FALSCH
4  beide ohne Zeitstempel (Dateieinlesung, Altarchiv)     → 10   FALSCH
6  Zählung Tag 16.09. an 17.09. 20:00 · Fassung Tag 17.09.
   an 17.09. 08:00                                        →  4   richtig
7  Zählung 09:05 · Lieferung 12:00                        → 34   richtig
```

Fall 2 ist der Alltag, den `CLAUDE.md` als Normalfall beschreibt: im Keller
ist kein Netz. Das iPad zählt vormittags und bleibt unten; die Tagesfassung
geht abends vom iPhone an der Bar hinaus; das iPad kommt am nächsten Morgen
herauf. Ergebnis: der Kellerbestand ist um die ganze Tagesentnahme zu hoch,
die Bestellliste rechnet auf derselben Zahl (`:1829`), und der Banner
darunter sagt ausdrücklich „Seither 0 Flaschen entnommen“ (`:1786`).

`tests/reihenfolge.test.mjs` prüft diesen Fall nicht: `spiele()` schickt
die Pakete in Listenreihenfolge, die Ankunftszeit folgt dort immer dem
Betriebstag. Die Umkehrung und der Gleichstand fehlen.

Zur Frage der Runde 8 nach Worker gegen Backoffice: in Fall 2 und 3 sind
sich beide EINIG (und beide falsch), in Fall 6 unterscheiden sie sich
(Backoffice 4, Worker 10 — hier hat das Backoffice recht). Sichtbar wird
der Unterschied heute nicht: `/api/bestand` hat ausser den Prüfungen
keinen Leser (`grep` über `src/`, `public/`). Der Backlog-Eintrag der
Runde 8 bleibt damit richtig eingeordnet.

## B/8-1 · Der Sammelknopf lässt genau die Getränke stehen

Bericht 37 durch den ausgelieferten Code, Live-Mapping, nichts bestätigt:

```
ohneGroesse: 18 Positionen
Sammelknopf nimmt:  5   (4 automatische Weinvorschläge à 750 „Standard
                         Weinflasche“, dazu Gasteiner 1 l)
bleibt stehen:     13   Cola Zero 0,35 l · Now-Limo Orange 0,35 l ·
                        Stiegl alkoholfrei 0,5/0,3 l · Hefeweizen hell 0,5 l ·
                        Hauslimo 0,5/0,25 l · Raschhofer Pils 0,5/0,3 l ·
                        Mango gespritzt 0,25 l · Prosecco Serena 0,1/0,75 l ·
                        Gasteiner sparkling 0,75 l
```

Der Satz daneben (`:1596`) lautet: „Die übrigen 13 bleiben unberührt: dort
fehlt die Ausschankmenge im Kassennamen, oder es ist ein Mischgetränk.“
Bei allen dreizehn steht die Ausschankmenge im Namen, und keines ist ein
Mischgetränk — `flaschen()` gibt für alle `fehlt:"gebinde"` zurück. Was
fehlt, ist die GEBINDEgröße: `gebindeGroesse()` hat für ein Getränk keinen
Rang 3 (im Artikelnamen steht keine Größe) und keinen Rang 4
(`GEBINDE_STANDARD` kennt nur Wein). Die Zeile sagt „Gebindegröße von Hand
eintragen“ (`:1577`), und ein Feld dafür gibt es im ganzen Backoffice
nicht. Nach dem Sammelklick bleibt der Getränke-Abgleich also vollständig
stumm — und der Satz nennt dafür einen Grund, der nicht zutrifft.

## B/8-2 · Ablehnen und überschreiben

Runde 8 hat den Fremdgerät-Dialog begehbar gemacht (`index.html:2246`,
ein Wort). Damit ist ein Weg offen, den es vorher nicht gab.

`fernNeuer(m)` (`:1694`) meldet einen fremden Stand nur, solange
`fremd.zaehlnr > eigene zaehlnr`. Die Zählnummer wächst je Gerät bei JEDEM
Zwischenstand (`inDenAusgang`, `:1576`, alle 45 s bei Änderungen).

```
Gerät A  Wareneingang, 4 Zwischenstände + Fertig     → zaehlnr 5, abgeschlossen
Gerät B  öffnet Wareneingang, Dialog, „Abbrechen“    → blank, zaehlnr 0
         Zwischenstände 1…5  → 409, Sackfach (B sieht „überholt“)
         Zwischenstand 6     → 6 > 5, der Wächter (src/index.js:183)
                               greift nicht mehr, 200 OK
         ereignisseAbleiten bucht A gegen:
           eingang w003 −24 · eingang cola −24 · <B's Zeilen>
```

Gerät A bekommt kein Signal. Der Dialog sagt beim Ablehnen nichts darüber,
dass der eigene Stand den fremden ersetzen wird — er sagt nur beim
Übernehmen, dass der eigene ersetzt wird.

## Geprüft, ohne Fund

* **A/6-6 (Rezeptzeilen) ist zu.** Vier Wege nachgesehen: der Einzelknopf
  verweigert Rezeptnamen (`:918`), der Sammelknopf filtert sie aus
  (`:948`, `:1588` zusätzlich über `!o.rezept`), die Zuordnungsseite
  bietet nur die Artikelliste (kein Bestandteilknopf, `:1957`), und
  `ladeZuordnung()` (`:880`) übernimmt ausschließlich den Serverstand.
  Ein Weg, der `MAP[<Mischgetränk>] = <Bestandteil>` schreibt, existiert
  nicht mehr.
* **A/6-3 zählt nicht doppelt.** `o.eingang` wird ausser in `bestand()`
  (`:1092`) nur in der Speicheransicht gelesen (`:2184`, `:2203`).
  Getränke haben keine `o.zaehlung` — `nach(id)` ist für sie immer
  falsch —, ihr Eingang läuft also gar nicht erst in den Bestand. Bestellliste
  und Mittagsblick lesen `bestand()`, nicht `eingang`.
* **„Ergänzen“ bei einem OFFENEN Vorgang.** Der Dialog fragt nur bei
  `cur.finished` (`:2266`); ein laufender Vorgang wird wie bisher still
  fortgeführt. Richtig so.
* **„Ergänzen“ mit Offline-Reihe dazwischen.** `inDenAusgang` hält je
  Schlüssel EINEN Eintrag; die fortgeführte Lieferung ersetzt die wartende,
  es geht ein Paket mit beiden Lieferungen hinaus. Richtig so.
* **Bericht 37, Gegenprobe an sich selbst.** Weiter 48 Positionen, 145 Stück,
  602,50 €. Durch `abgleich()` mit dem Live-Mapping: 106 offen + 39 ohne
  Größe + 0 gerechnet = 145. Doppelte Positionsnamen, 0,00-Zeilen und
  doppelte Größensuffixe („Hauslimo 0,5l 0,5l“ → 500 ml) unverändert richtig.
* **`ml()` gegen `mlAusText()`.** Derselbe reguläre Ausdruck, dieselbe
  Rechnung — keine Drift.
* **Gestaltungsschicht.** `messung.json` meldet wortgleich.
* **`npm test` 270 grün**, `public/` hat vier Dateien, `sw.js` steht auf
  `v27`.

## Oberfläche, gemessen (`LAUF=jagd-8`)

```
waagrechter Überlauf   0        JS-Fehler 0      Gestaltungsschicht wortgleich
Schrift unter 15 px   36 (unverändert zur Basislinie)
Kontrast unter 4,5:1 117 (unverändert zur Basislinie)
Trefferflächen Service 78  (Runde 8: 96)
```

Die 78 sind 26 je Breite. Davon sind **10 je Breite Geisterfunde**:
`.home` (57 × 36) und `.hilfebtn` (36 × 36) tragen seit v24 ein
`::after` mit `max(100%, 44px)` (`index.html:397`), das
`getBoundingClientRect()` nicht meldet. **Echt sind `.dot` (26 × 26, ohne
`::after`, sechs je Weinzeile der Tagesfassung) und `.st` (10 × 10
gezeichnet, über `inset:-17px -7px` real 24 × 44 — die Breite reißt).**
Das ist der B-Fund aus Runde 6, unverändert. Der ui-designer arbeitet
gerade genau daran (ungesicherte Änderungen: `.dot::after` mit
`inset:-9px` und 18 px Raster, `.st` mit `inset:-17px` und 44-px-Zelle,
`--text-xs/-sm` auf 15 px) — geprüft habe ich das NICHT.

**Ungeprüft bleibt:** echtes Safari, echte Tastatur, Notch, Safe-Area, der
Wechsel des Service Workers auf v27, und der laufende Stand des
ui-designers.
