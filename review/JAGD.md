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
| B | 6 | Trefferflächen im Service: `.dot` (die Hauptbedienung der Tagesfassung) ist 26 × 26 px, die Schrittpunkte sind mit `::after` real 24 × 44 px | `public/index.html:565`, `:409`, `:417` | `review/screens/runde-6/messung.json`, dazu die Bilder `app-390-tag.png` und `app-390-fuellen.png` angesehen: die drei Ringe je Weinzeile sind die Zähleingabe und liegen 8 px auseinander | designer | **behoben in Runde 9** — nachgemessen: Punkt 26 × 26 sichtbar, Griff 47 px, die Naht zwischen zwei Punkten liegt genau auf der Mitte (elementFromPoint, neun Proben je Naht) |
| B | 6 | `tests/gebinde.test.mjs` prüft den Rezeptweg, `bestaetigeGebinde`, `kistenGr`/`normVorgang` und den Fall „`verk` ist leer" nicht | `tests/gebinde.test.mjs:63–258` | Alle 15 `test(...)` gelesen: kein `REZ`, kein `VORGAENGE` mit Inhalt, keine Differenzspalte, kein Wareneingang. Genau die vier Wege, auf denen A-1, A-3, A-5 und A-6 liegen | software-engineer | **behoben in Runde 7/8** — `kisten`, `vorgang-zweimal`, `abgleich-unklar`, `reihenfolge`, `lieferung-getraenke`; 270 grün |
| C | 6 | Der Messlauf zählt Kinder eines `.vh`-Behälters als sichtbare Trefferflächen — „Zurück"/„Weiter" 65 × 29 auf drei Seiten sind Geisterfunde, die Zahl 96 ist zu hoch | `tests/ui-mass.cjs:99` · `public/index.html:1331` | `sicht()` prüft `classList.contains("vh")` nur am Element selbst; `.vh` ist `width:1px;overflow:hidden;clip:rect(0 0 0 0)` (`index.html:221`) | → BACKLOG | **behoben in Runde 9** (`0d810d4`) — gemessen 96 → 78 |
| C | 6 | `.vh` steht zweimal in `index.html` (einmal in der Gestaltungsschicht, einmal darunter) | `public/index.html:221`, `:761` | `grep -n '\.vh{'` — zwei identische Regeln | → BACKLOG | offen — `index.html:221`, `:761` |
| C | 6 | `parseZ` liefert `p.ml` bereits mit; `flaschen()` rechnet dieselbe Regel über `mlAusText(p.name)` ein drittes Mal | `src/gnparse.js:~30` · `public/leitung.html:594`, `:1066` | 15 Proben durch beide Fassungen: 0 Abweichungen. Heute deckungsgleich, aber ein drittes Vorkommen derselben Regel | → BACKLOG | offen — beide Fassungen weiter Zeichen für Zeichen gleich |
| C | 6 | Widersprechen sich zwei Bestätigungen, fällt `gebindeGroesse` still auf den 750-Vorschlag zurück statt auf „unbekannt" | `public/leitung.html:647`, `:663` | `gebArtikelBestaetigt()` (`:647`) setzt `t[id]=null`; `if(ueberArtikel)` (`:663`) ist damit falsch und der Weg läuft bis Rang 4 durch (`:666`, Vorschlag 750) | → BACKLOG | offen — `leitung.html:663`, `:669` |
| A | 8 | Eine einzige nicht zugeordnete Kassenposition schaltet den Schwund-Befund für ALLE Artikel ohne gerechneten Verkauf ab | `public/leitung.html:1288`, `:1281`, `:1301`, `:1340`, `:1381`, `:2053` | Bericht 37 + Tagesfassung durch den ausgelieferten Code: w002 = 12 Flaschen geholt, 0 verkauft → `diff: null`, „kein Abgleich möglich“. Vor Runde 8: „+12 · prüfen“ | software-engineer | **behoben in Runde 10** — nachgerechnet am 18.09.: w002 `diff +12`, Plakette „prüfen“, rote Zahl 1, Zählliste „Verkauf und Entnahme 12 Fl. auseinander“; der Hinweis über der Tabelle zählt die 44 offenen Positionen weiter |
| A | 8 | `nichtRechenbar(id,"groesse")` wird ohne Rücksicht auf einen schon gerechneten Verkauf gesetzt — ein Artikel mit halb gerechnetem Verkauf verliert seine Differenz | `public/leitung.html:1263`, `:1253`, `:1294` | Spritzerwein: 1,80 Fl. aus „Prosecco, Serena 0,1 l/0,75 l“ gerechnet, 9 Fl. entnommen → Zeile zeigt „— / — / kein Abgleich möglich“ statt +7,2. Die Übergabe Runde 8 behauptet ausdrücklich das Gegenteil | software-engineer | **behoben in Runde 10** — nachgerechnet: 1,80 gerechnet, `diff 7,20` mit Vorbehalt. Grenzfall geprüft: sind ALLE Positionen eines Artikels ohne Größe, bleibt es bei „kein Abgleich möglich — Größe fehlt“ (richtig). Zweiter Grenzfall → neuer B-Fund B/10-1 |
| A | 8 | `bestand()`: kommt die Kellerzählung SPÄTER an als die Fassung desselben Betriebstages, fällt die ganze Entnahme weg — still | `public/leitung.html:1089`, `:792`, `:1786` | Sieben Fälle durch den ausgelieferten `bestand()`: Zählung 10 Fl., Fassung 6 Fl., gleicher Tag, Zählung kommt 07:30 am Folgetag an → 10 statt 4, Banner „Seither 0 Flaschen entnommen“. Ebenso bei identischem `ts` und bei fehlendem `ts` | software-engineer | **behoben in Runde 10, in Runde 11 verengt** — acht Fälle (die sieben plus „Zählung + Lieferung + Entnahme am selben Tag“) am 18.09. selbst durch Worker UND Backoffice gerechnet: jede Zahl gleich. Der Preis der Verengung steht als neuer A-Fund A/11-1 |
| B | 7 | Der Satz unter der Größen-Tabelle nennt für die übrig gebliebenen Positionen den falschen Grund; für sie gibt es weiterhin kein Eingabefeld | `public/leitung.html:1596`, `:1577` | Bericht 37, Live-Mapping: 18 Positionen ohne Größe, der Sammelknopf nimmt 5. Der Satz sagt, den übrigen 13 fehle „die Ausschankmenge im Kassennamen“ — bei allen 13 steht sie im Namen (Cola Zero 0,35 l …); es fehlt die Gebindegröße | software-engineer | offen |
| B | 8 | Der Fremdgerät-Dialog lässt sich seit Runde 8 ablehnen — und das zweite Gerät überschreibt danach den abgeschlossenen Vorgang des ersten, sobald seine eigene Zählnummer die fremde überholt | `public/index.html:2246`, `:1694`, `:1576` · `src/index.js:183` | `zaehlnr` wächst je Gerät bei JEDEM Zwischenstand. Gerät B lehnt ab, arbeitet 6 Zwischenstände → `zaehlnr` 6 > 5 des Geräts A → der 409-Wächter greift nicht mehr, `ereignisseAbleiten` bucht die Lieferung von A gegen. A bekommt kein Signal | software-engineer | offen |
| C | 8 | `fehlt:"ausschank"` wird als Grund „groesse“ verbucht — die Zeile sagt „Größe fehlt“, obwohl die Ausschankmenge fehlt | `public/leitung.html:1263`, `:1193` | `flaschen()` gibt beide Fälle zurück, `nichtRechenbar` bekommt in beiden Fällen `"groesse"` | → BACKLOG | offen |
| C | 8 | `bestellliste()` rechnet mit `PLAN.kiste \|\| 6` statt mit der im Wareneingang erfassten `kistengr` — eine zweite Kistengrößen-Quelle neben `kistenGr()` | `public/leitung.html:1835`, `:690` | `PLAN.kiste` kennt einen Eintrag (`w003:12`); jeder andere Wein wird als Sechserkiste vorgeschlagen, auch wenn er zweimal als Zwölfer geliefert wurde. Die „à 6“ steht sichtbar daneben | → BACKLOG | offen |
| C | 8 | Abgleich bei 390 px: die neue Spalte „Befund“, die den Strich erklärt, liegt außerhalb; „DIFFE…“ ist mitten im Wort abgeschnitten | `public/leitung.html:1625` · `review/screens/jagd-8/leitung-390-abgleich.png` | Bild angesehen: sichtbar sind Artikel · Verkauf · Entnahme, danach beschnitten. Kein Überlauf, weil `.tabhuelle` rollt. Backoffice = MacBook, deshalb C | → BACKLOG | offen |
| C | 8 | Zuordnungsseite zeigt ein Mischgetränk mit Rezeptur als „festgelegt“, während das Feld daneben „— offen —“ steht | `public/leitung.html:1969`, `:1978` | `zuordnung()` gibt `status:"rezept"` zurück; der Pillen-Ausdruck hat dafür keinen Zweig und fällt in „festgelegt“ | → BACKLOG | offen |
| C | 7 | `kurzInhalt(m,"ware")` zählt die gelieferten Getränke (`gent`) nicht mit — der Dialog nennt eine zu kleine Flaschenzahl | `public/index.html:2207` | 2 Kisten à 20 + 24 Cola → „1 Position · 40 Flaschen“; die 24 Cola fehlen im Satz, obwohl sie im selben Vorgang stehen | → BACKLOG | offen |
| C | 7 | „Ein zweiter, leerer Vorgang würde den ersten ersetzen“ — auch ein VOLLER zweiter Vorgang ersetzt ihn vollständig | `public/index.html:2262` | `ereignisseAbleiten` vergleicht Soll gegen Ist: der neue Zustand ist der ganze Zustand, die erste Lieferung wird in jedem Fall gegengebucht | → BACKLOG | offen |
| A | 11 | Die am Zähltag gelieferte Menge wird ausgewiesen — aber nur im Kellerbestand. Nachbestellen, Mittagsblick und Zählliste rechnen auf der zu niedrigen Zahl, ohne den Satz, der sie erklärt | `public/leitung.html:1964`, `:1970`, `:1514`, `:1534`, `:2186` | Zählung 14.09. w003 = 10 Fl., Lieferung 14.09. = 24 Fl., danach 3 × 6 Fl. gefasst: Bestand **−8**, `unklar 24`. Nachbestellen: „Bestand −8 · 11 × 12 = **132 Flaschen**“; Zählliste: „rechnerisch unter null“; Mittagsblick: „1 Positionen stehen rechnerisch unter null — die Zählung ist überholt. Neu zählen.“ Im Keller stehen 16 | software-engineer | **behoben in Runde 12** — am 18.09. selbst gerechnet: alle vier Ansichten nennen die 24 Flaschen; Bestellvorschlag **10–11 × 12 = 120–132** statt 11 × 12 = 132 (Ziel 126, mit 16 im Keller sind 10 Kisten richtig). Spanne reist in Tabelle, Mittagsblick, Zettel und CSV mit |
| B | 9 | Im Getränkefach „Mischgetränke“ überlappen sich die Kürzel bei 390 px, seit `--text-xs` 15 px ist | `public/index.html:113`, `:1252`, `:1298` | In Chromium gemessen (Range + elementFromPoint, Kellerzählung → Getränke): „Ginger Ale“/„Bitter Lemon“ −3 px, „Bitter Lemon“/„Tonic TH“ −4 px, „Ginger Beer“/„Gast. 0,25“ −3 px. Mit `--text-xs:11px` im selben Aufbau: keine einzige Berührung | ui-designer | **behoben in Runde 12** — über 15 Breiten von 320 bis 768 px in Chromium nachgemessen: **0 Überlappungen**. Gegenprobe gegen `44825cd` im selben Messgerät: 9 Stellen. Lade 4 versetzt (34 px Spalte), Lade 5/6 nicht (48 px) |
| B | 10 | Trifft der Vorbehalt und ist die Differenz 0, steht die grüne Plakette „stimmt“ da | `public/leitung.html:1738`, `:1734`, `:1392` | 2 Fl. aus einer Position gerechnet, 3 Fl. an einer zweiten ohne Größe, 2 Fl. entnommen → `diff 0`, `vorbehalt {ohne:1,gesamt:2}`. Die Zeile sagt „stimmt“ und daneben klein „1 von 2 Positionen ohne Größe — die Differenz ist unvollständig“. In der roten Zahl und in der Zählliste steht sie mit 0 | software-engineer | **behoben in Runde 12** — `BEFUND` (`leitung.html:1309`) gibt bei `\|diff\| < 0,5` mit Vorbehalt „unvollständig" (p-grau); Tabelle und CSV lesen dieselbe Funktion. Rest siehe C/12-4 |
| C | 9 | Kürzel im Getränkefach werden unten beschnitten: `.gcap` ist 15 px hoch, die Zeile misst seit v28 18,75 px | `public/index.html:1242`, `:1279` | gemessen: „Still“, „Serena“, „Seher“, „Noblier“, „De Saint Gall“, „Leindl“, „Hirsch“, „Verus“, „Fritsch (Karl)“ mit scrollHeight 19 / clientHeight 15; im Bild sind die Klammern von „Fritsch (Karl)“ unten abgeschnitten | → BACKLOG | neu |
| C | 9 | Das Messgerät sieht die Getränkeladen nie — es ruft `start(m)` und misst den ERSTEN Schritt jedes Modus | `tests/ui-mass.cjs:330`, `:93` | Beide Funde oben liegen hinter `branch="getr"`. Ein eigener Durchlauf über 17 Lagen (alle Schritte aller fünf Modi) fand sie; `LAUF=jagd-final` meldet dieselben Lagen als ✓ | → BACKLOG | neu |
| C | 10 | Der Mittagsblick nennt einen Grund, den es seit v29 nicht mehr gibt: „Größe fehlt oder Position nicht zugeordnet“ | `public/leitung.html:1510` | `UNKLAR_GRUND` kennt nur noch `groesse` und `keinbericht` (`:1255`); eine offene Position schaltet seit Entscheidung 9 nichts mehr stumm | → BACKLOG | neu |
| C | 11 | Der Kommentar über `nachZeit` behauptet das Gegenteil dessen, was v30 rechnet | `public/leitung.html:820` | „Bewusst in Kauf genommen: Wird die Lieferung eines Tages VOR der Zählung desselben Tages in den Keller gestellt, zählt sie trotzdem obendrauf“ — seit v30 wird sie ausgewiesen statt addiert (`:1153`) | → BACKLOG | neu |
| C | 12 | „Das ist kein Zählfehler" behauptet eine Gewissheit, die es nicht gibt — steckte die Lieferung schon in der Zählung, sind die 8 Flaschen wirklich fort; der rote Alarm ist in diesem Fall zum neutralen Satz geworden | `public/leitung.html:1577`, `:1972` | Zählung 10, Lieferung 24 am Zähltag, 18 gefasst: `minusGeteilt` legt den Wein in `erklaert`, `hinweis bad` wird zu `hinweis` ohne Klasse. Die Maßnahme daneben („im Keller nachsehen") bleibt richtig, deshalb C | → BACKLOG |
| C | 12 | Die Untergrenze der Bestellspanne kann 0 werden, die Obergrenze hat `Math.max(1,…)` — die Zeile schlägt „0–2 × 12 · 0–24 Flaschen" vor und zählt trotzdem in die Kachel „Nachbestellen" | `public/leitung.html:2029`, `:2032`, `:1458` | Gerechnet: Zählung 8, Lieferung 24 am Zähltag, danach 6 × 1 Fl., `pt` 1 → Ziel 21, `b` 2, `b+u` 26 ≥ 21 → `kistenMin` 0, `kisten` 2 | → BACKLOG |
| C | 12 | `bestellvorschlag.csv` führt in „Kisten"/„Flaschen" weiter die OBERE Einzelzahl (11 / 132); die Spanne steht nur in der neuen Spalte „Kisten mindestens" | `public/leitung.html:2080`, `:2083` | Im Code ausdrücklich so entschieden (Kommentar `:2078`). Wer nur die alten Spalten liest, bestellt bis zu eine Kiste zu viel | → BACKLOG |
| C | 12 | Eine Zeile mit Vorbehalt und `\|diff\| < 0,5` steht in KEINEM Zähler: nicht in der roten Zahl (Filter `\|diff\| ≥ 1`), nicht in `ohneUrteil` (nur `r.unklar`), nicht in der Zählliste | `public/leitung.html:1424`, `:1512`, `:2261` | Rest von B/10-1: die grüne Plakette ist fort, die Zeile bleibt aber unsichtbar, sobald man nach Zahlen statt nach Zeilen sieht | → BACKLOG |
| C | 12 | Bei 320 px ragt der Tintenkasten der versetzten Kürzel 6,2 px über die Kante der Ladenkarte | `public/index.html:1274` | Über 15 Breiten gemessen: 320 → 6,2 px, 402 → 3,6, 414/428 → 1,1, 390/393 → 0. Kein Beschnitt, kein waagrechter Überlauf (`scrollWidth = clientWidth`). 320 px ist kein Gerät im Haus | → BACKLOG |

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

---

# Dritte Jagd · Runden 9, 10, 11 (18.09.2026, Stand `78165b2`)

Gerechnet wurde alles selbst: `bestand()` beider Fassungen gegeneinander über
acht Lagen, `abgleich()` gegen `tests/fixtures/zbericht-37-extended.csv` durch
den ausgelieferten Code, die Oberfläche in Chromium über 17 Lagen der App.

## A/11-1 · Die ausgewiesene Menge fehlt genau dort, wo bestellt wird

Entscheidung 10 sagt: „das Backoffice sagt es an der Zahl". Das tut genau
**eine** Ansicht — der Kellerbestand (`leitung.html:1914`, Satz über der
Tabelle, und `:1939`, Satz in der Zeile des Weins). Drei weitere Ansichten
rechnen auf derselben, absichtlich zu niedrigen Zahl und sagen nichts:

```
Zählung   14.09.  w003 = 1 Reihe + 4      → 10 Flaschen
Lieferung 14.09.  2 Kisten à 12           → 24 Flaschen, unklar
Fassung   14./15./16.09.  je 6 Flaschen   → −18

bestand().b.w003      = −8        bestand().unklar.w003 = 24
wirklich im Keller    = 16        (wenn die Lieferung nach der Zählung kam)
```

| Ansicht | was dort steht | Datei:Zeile |
|---|---|---|
| Kellerbestand | −8 **plus** „Am Zähltag wurden 24 Flaschen … geliefert" | `:1914`, `:1939` |
| Nachbestellen | „Bestand −8 · Reicht 0 T · **11 × 12 = 132 Flaschen**" | `:1964`, `:1990` |
| Mittagsblick | Kachel „Nachbestellen 1", dazu „1 Positionen stehen rechnerisch unter null — die Zählung vom 14.09. ist überholt. **Neu zählen.**" | `:1514`, `:1534` |
| Zählliste | „rechnerisch unter null", Rang 0 | `:2186`, `:2193` |

Der Minus-Alarm ist damit **systematisch falsch auslösbar**: Er entsteht
nicht mehr nur, wenn ohne Vorgang aus dem Keller geholt wurde, sondern jedes
Mal, wenn am Zähltag geliefert und danach mehr gefasst wurde, als gezählt
worden ist. Die Maßnahme, die er auslöst („neu zählen"), ist richtig — die
Bestellung über 132 Flaschen, die daneben steht, ist es nicht: 24 davon
stehen schon im Keller, 2 Kisten zu viel.

`bestellliste()` liest `B.b`, `B.unklar` kommt im ganzen Abschnitt
„Nachbestellen" nicht vor (`grep` über `leitung.html`: `B.unklar` steht nur
in `vBestand`).

## B/9-1 · Die Kürzel im Mischgetränke-Fach überlappen

Kellerzählung → Getränke → Lade 4, 390 px, in Chromium gemessen (Range über
den Textknoten, nicht die Kastenbreite):

```
„Ginger Ale"  ↔ „Bitter Lemon"   −3 px
„Bitter Lemon"↔ „Tonic TH"       −4 px
„Ginger Beer" ↔ „Gast. 0,25"     −3 px
```

Die Spalte ist 34 px breit (`--gcell` bei 390 px), das Kürzel bricht auf zwei
Zeilen um und darf über den Rand laufen (`.drwi .gcol .gcap{overflow:visible}`,
`index.html:1252`). Bei 11 px passte es, bei 15 px nicht mehr. Derselbe
Aufbau mit `--text-xs:11px` gesetzt: **keine einzige Berührung**. Im Bild
liest sich die Reihe als „GingerBitter / LemonTH" und „GingerGast." — das
ist die Beschriftung der Spalten, an denen gezählt wird.

Nicht betroffen: Tagesfassung, Nachfüllen, Wareneingang (dort steht die
Getränkemenge als Liste, nicht als Fach), und dieselbe Lade bei 768/1280 px.

## B/10-1 · „stimmt" über einer Differenz, die unvollständig ist

```
Position 1  „… 0,75 l"   2 × 750 ml / 750 = 2,00 Fl.   (gerechnet)
Position 2  „GV Flasche"  3 Stück, keine Ausschankmenge (nicht gerechnet)
Entnahme                                     2 Fl.
→ diff = 2 − 2 = 0, vorbehalt {ohne:1, gesamt:2}
```

Die Zeile trägt die grüne Plakette **„stimmt"** und daneben, klein und grau,
„1 von 2 Positionen ohne Größe — die Differenz ist unvollständig"
(`leitung.html:1738` + `:1734`). Wer die Tabelle nach Farbe liest — und dafür
sind Plaketten da —, liest „geprüft, in Ordnung". Gerechnet ist die Zeile
aber nur zur Hälfte; die drei nicht gerechneten Flaschen würden sie ins
Minus drehen. In der roten Zahl (`:1432`) und in der Zählliste (`:2188`)
zählt sie mit 0, also gar nicht.

Der umgekehrte Fall ist richtig gelöst: bei `diff ≥ 1` steht der Vorbehalt
auch im Mittagsblick unter der Deutung (`:1568`).

## Nachgerechnet, ohne Fund

* **A/8-1 ist zu.** Bericht 37 (48 Positionen, **145 Stück, 602,50 €** —
  die Gegenprobe geht weiter auf) mit einer Tagesfassung über 12 Flaschen
  w002 und 44 offenen Kassenpositionen: `diff +12`, Plakette „prüfen",
  rote Zahl 1, Mittagsblick 1, Zählliste „Verkauf und Entnahme 12 Fl.
  auseinander". Der Hinweis über der Tabelle steht und zählt richtig
  („44 Kassenpositionen ohne Zuordnung"), `UNKLAR_GRUND` kennt „offen"
  nicht mehr.
* **A/8-2 ist zu, samt Grenzfällen.** Alle Positionen eines Artikels ohne
  Größe → weiterhin „kein Abgleich möglich — Größe fehlt" (richtig, denn
  gerechnet ist nichts). Der zweite Grenzfall steht oben als B/10-1.
* **A/8-3 ist zu — acht Fälle, zwei Fassungen, dieselbe Zahl.** Worker
  (SQLite aus `docs/live-schema.sql`) gegen `bestand()` aus dem
  ausgelieferten `leitung.html`:

```
Fall                                               Worker   Backoffice  unklar
1 Zählung, Fassung am Folgetag                       4 / 4      —
2 Fassung kommt vor der Zählung desselben Tages      4 / 4      —
5 nur Zählung                                       10 / 10     —
6 Zählung von gestern kommt zuletzt                  4 / 4      —
7 Zählung + Lieferung am selben Tag                 10 / 10    24 / 24
7b dieselbe Lage, Lieferung zuerst angekommen       10 / 10    24 / 24
8 NEU: Zählung + Lieferung + Entnahme am selben Tag  4 / 4     24 / 24
8b NEU: dieselbe Lage, Entnahme kommt zuerst an      4 / 4     24 / 24
8c NEU: dazu eine Sonderentnahme am selben Tag       2 / 2     24 / 24
9 Lieferung am Tag NACH der Zählung                 34 / 34     —
```

* **Die Prüfungen selbst.** `npm test` **275 grün**, dreimal hintereinander
  und zusätzlich unter `TZ=Pacific/Kiritimati`, `TZ=Pacific/Midway`,
  `TZ=Europe/Vienna` — keine Wackler mehr. `durchstich` 35/35,
  `ui-leitung-echt` 40/40, `ui-zweiter-vorgang` 15/15, `ui-fremdgeraet`
  10/10, `LAUF=jagd-final node tests/ui-mass.cjs` alle sechs Urteile ✓.
  Der einzige Satz, der einen Fund festschreibt statt ihn zu prüfen, ist
  `tests/worker-vorgang.test.mjs:106` — er sagt das selbst und steht im
  Backlog. Die drei in Runde 10 ersetzten Zusicherungen sind ersetzt, nicht
  gelöscht; die Uhrabhängigkeit in `modi.test.mjs:194` ist fort.
* **Duplikate.** `ml()` (`gnparse.js:48`) und `mlAusText()`
  (`leitung.html:630`) weiter Zeichen für Zeichen dieselbe Rechnung.
  `bestand()` zweimal — über acht Lagen dieselbe Zahl UND dieselbe
  `unklar`-Menge. Gestaltungsschicht laut `messung.json` wortgleich.
* **Getränke im Zähltag-Fall.** Der Worker legt für Getränke keine
  `zaehlung`-Zeile an (`index.js:281`), das Backoffice führt sie nicht in
  `zuletzt` (`leitung.html:1119`) — beide Fassungen halten Getränke
  deshalb aus `unklar` heraus. Kein Auseinanderlaufen.
* **Oberfläche, 17 Lagen der App bei 390 px** (alle Schritte von tag,
  keller, nach, ware, fuellen, beide Zweige): kein waagrechter Überlauf,
  keine Schrift unter 15 px, keine JS-Fehler. Die Datumzeile bricht bei
  langen Wochentagen um („Für Donnerstag, 17.09.2026 · ändern"), „Rubin
  Carnuntum" bricht — beides bekannt und im Backlog. Es sind **nicht nur
  diese zwei**: dazu kommen B/9-1 und der C-Fund am `.gcap`.
* **Trefferflächen.** `.dot` neu gemessen: Punkt 26 px, Griff 47 px, und
  die Naht zwischen zwei Punkten liegt genau auf der Mitte (neun Proben je
  Naht mit `elementFromPoint`). Der Kommentar „überlappen nicht"
  (`index.html:582`) stimmt geometrisch nicht (4 px), in der Wirkung
  schon — kein Fund.
* **Gesamtzustand.** Vier Dateien in `public/`, `sw.js` auf **v30**, keine
  Änderung an `package.json`, `wrangler.jsonc`, `docs/`, `migrations/`,
  keine Codes oder Namen in den Diffs, Journal weiter append-only, die
  Offline-Reihe unverändert (`index.html:1671–1697`).

## Ungeprüft geblieben

* **Die Live-D1.** In dieser Umgebung gibt es keinen Cloudflare-Connector
  und kein `CLAUDE_API`-Token; `wrangler d1 … --remote` antwortet
  „CLOUDFLARE_API_TOKEN fehlt". Was die Leitung morgen früh sieht, ist
  deshalb aus dem Stand der zweiten Jagd gerechnet (13 Zuordnungen, keine
  einzige bestätigte Gebindegröße) — mit dieser Lage und Bericht 37 zeigt
  der Abgleich **6 Weine als „prüfen" mit der Deutung „Vorrat aufgebaut
  oder Schwund"**, deren Verkauf in den 31 nicht zugeordneten
  Kassenpositionen steckt. Das ist der bewusst gewählte Preis von
  Entscheidung 9 und in beiden Ansichten benannt — aber es ist das Bild,
  das morgen früh auf dem Schirm steht.
* Echtes Safari, echtes iPad, Bildschirmtastatur, Notch, Safe-Area,
  Gummiband, der Wechsel des Service Workers von v27 auf v30 auf einem
  Gerät, das v27 im Speicher hat.


---

# Vierte Jagd · Runde 12 (18.09.2026, Stand `ea34f84`, Diff `44825cd..HEAD`)

**Kein A, kein B.** Fünf C-Funde, alle oben in der Tabelle.

## 1 · A/11-1 — zu, nachgerechnet

Der Fall des Fundes durch den ausgelieferten `leitung.html`, im Browser
gezeichnet (Chromium, 1280 und 390 px), nicht aus dem Kommentar gelesen:

```
Zählung   14.09.  w003 = 1 Reihe + 4   → 10 Fl.
Lieferung 14.09.  2 Kisten à 12        → 24 Fl., ausgewiesen
Fassung   15./16./17.09. je 6 Fl.      → −18

bestand().b.w003 = −8   ·   unklar.w003 = 24   ·   proTag 6
Ziel = ceil(6 × 14 × 1,5) = 126
kisten    = ceil((126 − 0)/12)  = 11      (Bestand −8, gedeckelt auf 0)
kistenMin = ceil((126 − 16)/12) = 10      (−8 + 24 = 16)
```

| Ansicht | was jetzt dasteht |
|---|---|
| Kellerbestand | „Am Zähltag wurden 24 Flaschen … geliefert"; zusätzlich „1 weitere Position steht nur deshalb unter null …" |
| Nachbestellen | „**10–11** à 12 · **120–132**" plus der Satz „… Vor dem Bestellen nachsehen." |
| Mittagsblick | „1 Position steht nur deshalb unter null, weil am Zähltag 24 Flaschen geliefert wurden … kein Zählfehler — im Keller nachsehen." |
| Zählliste | „am Zähltag 24 Fl. geliefert, nicht mitgerechnet", Rang 1 statt 0 |

Alle vier nennen die 24. Die Bestellmenge ist vertretbar: im Keller stehen
16, gebraucht werden 126 − 16 = 110, das sind 10 Kisten — genau die
Untergrenze. Die Obergrenze 11 bleibt stehen, sie liegt eine Kiste darüber.

Die Spanne wird nirgends als einzelne Zahl weiterverarbeitet: `bestellSpanne`
steht in der Tabelle (`:2060`, `:2061`), im Mittagsblick (`:1644`) und im
kopierten Zettel (`:2070`). `r.kisten` als nackte Zahl gibt es nur noch in
der CSV (`:2082`) — dort neben zwei neuen Spalten (C/12-3). Kein weiterer
Leser im Repo (`grep` über `public/`, `src/`; der Worker kennt keine
Bestellliste).

## 2 · Folgefehler: keine gefunden

Die fünf selbst genannten Bewegungen, jede nachgesehen:

* **Kistenzahl-Untergrenze** — `kistenMin = Math.min(kistenMin, kisten)`
  (`:2032`). Die Obergrenze ist Zeichen für Zeichen die alte Formel; sie
  sinkt nie. Stimmt.
* **Rote Bannerzahl** — `vBestand` zeigt `M.echt.length` im roten Kasten,
  `M.erklaert.length` in einem neutralen (`:1968`, `:1974`). Stimmt.
* **Sortierung der Zählliste** — erklärtes Minus Rang 1, halb gedecktes
  bleibt Rang 0 (`:2272`). Kein `bestand` ändert sich; die Länge der Liste
  und damit die Zahl in der Navigation bleibt gleich. Stimmt.
* **Zwei neue CSV-Spalten** — hinten angehängt, Kopf und Zeile haben beide
  11 Felder (`:2080`, `:2083`). Stimmt.
* **Ladenhöhen** — `.gcap` folgt der Zeilenhöhe (`index.html:1242`).
  Gegenprobe gegen `44825cd` im selben Messgerät: vorher **9 Überlappungen
  und 27 Beschnitte**, jetzt **0 und 0**. Der Prüfstein beißt.

Zur ausdrücklichen Frage: **keine Ansicht rechnet ungesagt mit
`bestand + unklar`.** `unklarMenge` hat genau fünf Leser
(`:1578` Mittagsblick, `:1982` Kellerbestand, `:2028` Bestellliste,
`:2264` Zählliste, `:1179` `minusGeteilt`), alle vier Rechenstellen sind in
der Übergabe benannt. `reichweite`, `anteil`, `seit`, die Zahl in der
Bestandsspalte und der Worker rechnen unverändert auf `b`.

## 3 · Gesamtstand

```
npm test                    286 grün, dreimal hintereinander, kein Flackern
                            286 grün unter TZ=Pacific/Kiritimati, Pacific/Midway, Europe/Vienna
durchstich                  35/35
ui-leitung-echt             40/40
ui-zweiter-vorgang          15/15
ui-fremdgeraet              10/10
LAUF=jagd-schluss ui-mass   alle 8 Urteile ✓ (Überlauf 0, JS-Fehler 0,
                            Schrift ≥ 15 px, Griffe, Kontrast, Kürzel-Stoß 0,
                            Kürzel-Beschnitt 0, Gestaltungsschicht wortgleich)
```

Vier Dateien in `public/`, `sw.js` auf **v31**, keine Änderung an `src/`,
`migrations/`, `docs/`, `schema.sql`, `package.json`, `wrangler.jsonc` —
also keine Schemaänderung und keine neue Abhängigkeit. Journal und
Offline-Reihe sind im Diff nicht berührt. Keine Codes, Namen oder
Geheimnisse in den Diffs.

**Eigene Messung über 15 Breiten** (320–768 px, Laden 4/5/6/1, Tintenkasten
per Range): 0 Überlappungen an jeder Breite, `scrollWidth = clientWidth`
überall. Der Versatz schaltet bei Spalten < 40 px; bei 440 px (Spalte 40 px,
ohne Versatz) berührt sich trotzdem nichts.

**Zwei Bilder wirklich angesehen:** `review/screens/jagd-schluss/app-390-lade-4.png`
— Mischgetränke, acht Spalten, Kürzel abwechselnd hoch/tief gesetzt, keine
Berührung, jedes Kürzel mittig über seiner Säule. Und die Bestellliste,
einmal mit den Prüfdaten (`leitung-1280-bestellen.png`, keine Spanne, weil
keine Lieferung am Zähltag) und einmal mit dem Fall des Fundes: „10–11 à 12 ·
120–132" mit dem Satz darunter.

## Ungeprüft geblieben

* Echtes Safari, echtes iPad, Tastatur, Notch, Safe-Area, der Wechsel des
  Service Workers von v30 auf v31 auf einem Gerät, das v30 im Speicher hat.
* Die Live-D1 (kein Connector in dieser Sitzung).
* Das Druck-Layout der Getränkeladen mit der neuen Kürzelhöhe.

---

# Fünfte Jagd · Runde 13

Gejagt am 18.09.2026 auf `claude/fassungstool-befunde-beheben-guhmat`,
Diff `50c1123..6abd9ff` (ein Commit) und Gesamtzustand. Gelesen:
`review/INPUT-TEAM.md` (F1–F9 + M), der ganze Diff, `public/index.html`,
`public/leitung.html`, `src/index.js`, `tests/ui-mass.cjs`,
`tests/betriebstag.test.mjs`, `tests/oberflaeche-f.test.mjs`.

Selbst ausgeführt: `npm test` (325 grün), `LAUF=jagd13 node tests/ui-mass.cjs`
(alle zehn Urteile grün) — und danach fünf eigene Playwright-Läufe an den
Stellen, die `ui-mass.cjs` **nicht** anfasst. Dort liegen die A-Funde.
Zeilennummern beziehen sich auf `6abd9ff`.

| Klasse | Runde | Fund | Datei:Zeile | Wie nachgestellt / gerechnet | Nächste Rolle | Stand |
|---|---|---|---|---|---|---|
| A | 13 | **„Sonderentnahme · Getränke" ist zerrissen: der Zählknopf steht 31 px außerhalb des Fensters, die Seite rollt waagrecht.** `.w` ist seit F3 ein Raster mit vier festen Spalten, aber sechs andere Zeilentypen benutzen dieselbe Klasse. In `getrRow()` landet das Flaschenbild in der 1fr-Spalte, der NAME in der 118-px-Ringspalte und der Zählknopf in der 24-px-Spalte für die Fehlmenge. | `public/index.html:574` (`.w{display:grid…}`) · `:4325` (`getrRow`) | Chromium 390×844, „Sonderentnahme → Getränke → Säfte": `document.documentElement.scrollWidth` **421** bei `clientWidth` **390**. `BUTTON.cnt` liegt bei **375…421 px**, also 31 px draußen; bei 320 px genauso (305…351). Der Name „Tomate" steht bei x=216, sein Bild bei x=16. Beleg: `review/screens/jagd13/A1-sonderentnahme-getraenke-390.png` | software-engineer | offen |
| A | 13 | **„Diesen Stand übernehmen?" → Ja → der übernommene Stand ist sofort weg.** `fernNeuer(m)` fragt nach `today()`, `start(m)` rechnet mit `vorgabeTag()`. Sobald in der Begrüßung (F9) ein anderer Tag gewählt wurde, laufen die beiden auseinander. | `public/index.html:1953` (`fernNeuer`) · `:2526` (`start`, `ziel=vorgabeTag()`) · `:2567` (`archive(cur)`) | Chromium: Tageswahl 17.09., fremder Stand `tag_2026-09-18` (Lena, `bar:{w001:1}`, zaehlnr 5). Dialog erscheint, „Übernehmen" geklickt. Danach `S.tag = {tag:"2026-09-17", bar:{}, seen:{}}`, Archiv `["tag_2026-09-18"]`, Kopf „Für Donnerstag, 17.09.2026". Lenas Stand ist aus `S` verschwunden — und `hh_zaehlnr_v1["tag_2026-09-18"]=5` ist gesetzt, der Dialog kommt also nie wieder. | software-engineer | offen |
| A | 13 | **Ein laufender Vorgang wird durch „Anderes Datum" still archiviert und geleert.** Kein Dialog, keine Frage — obwohl beim zweiten Vorgang desselben Tages und beim Fremdgerät ausdrücklich gefragt wird. | `public/index.html:2567` (`if(cur&&(cur.finished\|\|cur.tag!==ziel)){archive(cur);S[m]=blank(m);}`) · `:2734` (`setTagWahl`) | Chromium: Tagesfassung 18.09. angefangen (`bar:{w001:2}`), zurück ins Menü, in der Begrüßung „Anderes Datum" → 17.09., Tagesfassung öffnen. Ergebnis: `tag:"2026-09-17"`, `bar:{}`, `dialogOffen:false`. Die Kachel „Angefangen" ist weg. | software-engineer | offen |
| A | 13 | **Der Betriebstag der Tagesfassung wurde umgestellt, der Abgleich im Backoffice nicht.** `blank()` datiert `tag` nicht mehr auf `yest()`, sondern auf heute. `abgleich(tag)` paart aber unverändert den Z-Bericht von Tag X mit den Vorgängen von Tag X, und `letzterTag()` schlägt weiterhin „gestern" vor. Die Paarung verschiebt sich damit **dauerhaft** um einen Tag, nicht nur um den Merge herum. | `public/index.html:1720` (`blank`) · `public/leitung.html:1336` (`abgleich`), `:1511` (`letzterTag`) · gelöschter Kommentar `public/index.html:2779` | Der gestrichene Kommentar nannte die Regel selbst: „Die Tagesfassung läuft auf den Vortag — das ist der Tag, dessen Verbrauch nachgefüllt wird und gegen dessen Z-Bericht später verglichen wird." Genau diese Regel steht jetzt nur noch in `abgleich()`. `review/BACKLOG.md` nennt den Effekt „einmalig und sichtbar" — er ist ab sofort ständig. | Moderation (Entscheidung), dann software-engineer | offen |
| B | 13 | **Vier weitere Zeilentypen stehen im falschen Raster.** Archivliste: das „›" sitzt 142 px vor dem rechten Rand statt daran. `countRow` (Zusätzlich entnommen): die Zählknöpfe 40 px vom Rand. `rEin` (Wareneingang einräumen): Haken bei x=32, Text erst bei x=200. `rJahr`: das 64-px-Jahrgangsfeld steckt in der 24-px-Spalte und reicht bis an die Fensterkante. | `public/index.html:574` · `:2318` (Archiv) · `:2846` (`countRow`) · `:3359` (`rJahr`) · `:3391` (`rEin`) | Chromium 390 px, Zeilen im Original nachgebaut: `SPAN.go[200..216]`, `DIV.knum[200..318]`, `SPAN.box2[32..68] \| SPAN.tx[200..318]`, `INPUT.zf[326..390]`. Beleg: `review/screens/jagd13/B1-w-zeilen-390.png` | software-engineer | offen |
| B | 13 | **F6 macht die Navigationsschublade des Backoffice kaputt, genau auf den Geräten mit Notch.** `.kopf` wächst um `max(12px,env(safe-area-inset-top))` bei `box-sizing:content-box`; `nav.seite{top:56px}`, `body.navoffen::after{inset:56px 0 0}` und `.huelle{min-height:calc(100vh - 56px)}` blieben bei 56 px stehen. | `public/leitung.html:254` gegen `:289`, `:504`, `:509` | Chromium 390 px: ohne Notch `.kopf` 0…68, Schublade beginnt bei 56 → 12 px liegen dahinter. Mit simuliertem `padding-top:59px` (iPhone 14/15 Pro): `.kopf` 0…**115**, Schublade weiterhin bei 56 → die **obersten 59 px der Schublade stehen hinter dem Kopf**, der Dunkelschleier lässt dort Tipser durch. `.huelle` bleibt 788 px = 100vh − 56. | software-engineer | offen |
| B | 13 | **Der Backoffice-Link hängt an einer Rolle, die nur einmal je Seitenaufruf geholt wird.** `zieheRolle()` läuft in `netzStart()`, das durch `netzStart._an` gegen jeden zweiten Aufruf gesperrt ist; `setUser("")` löscht `hh_rolle` nicht. | `public/index.html:1779` (`zieheRolle`) · `:2072` (`netzStart._an`) · `:1579` (`setUser`) · `:2297` (Link) | Chromium: Rolle `leitung` gesetzt, Link da. Dann `setUser("")` → `renderLogin()` → neue Anmeldung als Service → `meineRolle()` weiterhin `"leitung"`, Link weiterhin da, `netzStart._an === true`. Umgekehrt bekommt die Leitung, die nach einer Service-Person anmeldet, den Link gar nicht. `/api/vorgaenge` und `/api/bestand` prüfen keine Rolle — die Tür führt also wirklich hinein. | software-engineer | offen |
| B | 13 | **Die Laden 4 und 6 passen nicht mehr auf einen iPhone-Schirm und brechen ihre acht physischen Spalten in 4+4 um.** | `public/index.html:1299` (`repeat(auto-fit,minmax(72px,1fr))`) · `:3861` (`DHOCH=320`) | Gemessen, alt gegen neu, `.drw`-Höhe in Chromium: Lade 4 @390 **608 → 1040 px**, @320 **608 → 1499 px**; Lade 6 @390 **638 → 1078 px**. Fenster 844 px. Der Kommentar bei `DHOCH` behauptet, das sei „die gemessene Grenze, bei der Lade 4 auf einem iPhone noch als Ganzes lesbar bleibt" — sie ist es nicht mehr. Dazu: die Lade hat physisch acht Spalten nebeneinander, der Schirm zeigt 4 über 4. | Moderation (ist der Umbruch gewollt?), dann software-engineer | offen |

## Die Rechnung zu A1, im Klartext

`.w` trug bis `50c1123` `display:flex`; die Kinder legten sich der Reihe
nach von links nach rechts, das letzte an den rechten Rand. Seit
`public/index.html:574` gilt

```
.w{--dotsp:118px; display:grid;
   grid-template-columns:minmax(0,1fr) var(--dotsp) 24px auto; …}
```

Die vier Spuren sind für `dotRow()` gerechnet — Name, Ringe, Fehlmenge,
Häkchen. `getrRow()` hängt aber drei ganz andere Kinder ein:
`.gic` (Flaschenbild), `.tx` (Name), `.knum` (Zählknöpfe). Das Raster
verteilt sie stur: Bild in 1fr, Name in die 118-px-Ringspalte, Zählknöpfe
in die 24-px-Fehlmengenspalte. `.knum` ist 24 px breit, sein Inhalt
(`.kminus` 25 px + Lücke + `.cnt` 46 px) läuft heraus; die vierte Spur
(`auto`) ist 0 px breit, also läuft er aus der Zeile und aus dem Fenster:

```
Zeile   [16 … 358]
.gic    [16 …  42]
.tx     [216 … 334]      ← der Name, 174 px von seinem Bild entfernt
.knum   [342 … 366]
.cnt    [375 … 421]      ← Fensterbreite 390
```

Bei 320 px dasselbe Bild (`.cnt` 305…351). Betroffen sind
„Sonderentnahme · Getränke" und „Wareneingang · Getränke"
(`render()`, `RG={nach:[rGetrMenge,…], ware:[rGetrMenge,…]}`,
`public/index.html:2798`).

## Warum die reparierte Messung das nicht sieht

`tests/ui-mass.cjs` misst je Modus nur den **ersten** Schritt
(`for (const s of ["menu", ...SCHRITTE]) … start(m)`), dazu neu die sieben
Ladenknöpfe der Tagesfassung. Ungemessen bleiben weiterhin:

* der ganze Zweig `branch === "getr"` (`nach`, `ware`, `keller`, `fuellen`)
  — dort liegt A1,
* `tag`-Schritte 1 (Restaurant, die längsten Weinnamen — also genau der
  Fall, für den F3 gebaut wurde), 2 (Holen) und 3 (Abschluss),
* `ware`-Schritte 1 (`rJahr`) und 2 (`rEin`),
* die Archivliste, das Anmeldebild,
* die Begrüßung selbst (`grussWeg(p)` klickt sie in jedem Lauf weg).

Die Behauptung aus `review/INPUT-TEAM.md`, das Messgerät habe die Laden
„bis Runde 12 nie gesehen", stimmt — der Satz gilt unverändert für alles
oben Aufgezählte.

## Was an der Messung ehrlich ist

Die Gegenprobe ist echt. Ich habe sie selbst gefahren: `50c1123` in einem
eigenen Worktree, nur `tests/ui-mass.cjs` von heute daraufgelegt. Ergebnis:

```
✗ kein waagrechter Überlauf …            (1 Stelle)   DIV.gcap(323px) @320
✗ nichts im Service wird abgeschnitten   (3 Stellen)  Lade 4 @320 / @430
✗ Trefferflächen mindestens 44 px        (56 Knöpfe)  .statb 38×44 @320
✗ Kürzel in den Laden überlappen nicht   (1 Stelle)   Cranberry/Ananas @320
✗ kein Kürzel wird beschnitten           (4 Stellen)
```

Gegen `6abd9ff` sind dieselben Urteile grün. Der Test ist also gebaut, wie
verlangt. Die beiden Rücknahmen halte ich für vertretbar: die 1212 leisen
Ziffern auf den Zählpunkten sind eine dokumentierte Entscheidung und
stehen als Hinweis mit Zahl im Protokoll, und die Breitengrenze fürs
Backoffice steht samt Fund in `review/BACKLOG.md`. Das ist kein
Wegreparieren. Der blinde Fleck ist nicht die Schwelle, sondern der
Umfang — siehe oben.

## C-Funde → `review/BACKLOG.md`

1. „3 Vorgänge wartet" — der Plural ist verlorengegangen; dieselbe Form in
   „Server antwortet nicht – 3 Vorgänge wartet" und „3 Vorgänge wartet –
   kein Netz". `public/index.html:2034-2039` (`netzChip`); festgeschrieben in
   `tests/oberflaeche-f.test.mjs:95`.
2. `tests/oberflaeche-f.test.mjs` beweist nichts über Darstellung: 21 von
   21 Prüfungen sind Textsuchen nach genau den Zeichenketten, die derselbe
   Zug geschrieben hat (`assert.match(APP, /t="Alles übertragen"/)`).
   Grün heißt hier nur: der Text steht noch da.
3. `aufraeumenFotospeicher()` schreibt bei JEDEM Start den gesamten
   Zustand neu (`save()`), auch wenn nichts zu löschen war; die Marke
   `hh_fotos_geloescht_v1` wird VOR dem Löschen gesetzt — ein von einem
   zweiten Tab blockiertes `deleteDatabase` wird nie wiederholt.
   `public/index.html:4932-4947`.
4. Die Ursachenerzählung zu M ist an einer Stelle unbelegt: „bei 390 px …
   die achte Kachel um 3 px abgeschnitten, genau der Befund". Die eigene
   Gegenprobe meldet Beschnitt in Lade 4 nur bei **320** und **430** px,
   nicht bei 390.
5. `wienTag()` steht jetzt dreimal im Repo (`public/index.html:1681`,
   `public/leitung.html:1199`, `src/index.js:38`), `tagMinus()` zweimal —
   zusammengehalten von einem Kommentar „wer eine ändert, ändert beide".
6. `askPin`, `openAdmin`, `renderAdmin` (`public/index.html:2368-2466`)
   haben seit F5 keinen Aufrufer mehr. Bewusst so, aber toter Code.
7. `resultText()` mischt Einheiten: „N Flaschen aus dem Keller geholt"
   (Flaschen) direkt neben „3 Weine sind noch nicht geholt" (Positionen).
   `public/index.html:4689`.

## Gesamtstand

```
npm test                       325 grün / 61 Suiten
LAUF=jagd13 node ui-mass.cjs   alle 10 Urteile ✓ (siehe blinder Fleck oben)
Gegenprobe gegen 50c1123       5 Urteile ✗ — der neue Test greift
```

Vier Dateien in `public/`, `sw.js` von v31 auf **v32** erhöht,
Gestaltungsschicht wortgleich (von `ui-mass.cjs` geprüft: „wortgleich"),
`schema.sql`, `migrations/`, `docs/`, `wrangler.jsonc`, `package.json`
unberührt, `RUNDEN` unberührt, keine Änderung an Anmeldung, Token oder
Codes (`zieheRolle()` liest nur `GET /api/ich`), keine Geheimnisse im
Diff. Journal und Offline-Reihe sind im Diff nicht berührt; `zieheRolle()`
fällt ohne Netz still durch und lässt `NETZ.zustand` unangetastet.

## Ungeprüft geblieben

* Echtes Safari auf echtem iPhone/iPad: Notch, Safe-Area, Tastatur,
  Gummiband, der Wechsel des Service Workers v31 → v32.
* Ob `sel.showPicker()` auf einem `.vh`-Input (`#grussSel`, 5×4 px,
  `clip:rect(0,0,0,0)`) unter iOS-Safari den Kalender öffnet. In Chromium
  wirft es nicht; die Rückfallebene `sel.click()` auf ein geclipptes
  Eingabefeld ist dort nicht prüfbar. Der Weg „Anderes Datum" hängt daran.
* Die Live-D1 (kein Connector in dieser Sitzung).
* Der Vergleich Bericht 37 (145 Stück, 602,50 €) läuft über
  `tests/zbericht-37.test.mjs` weiterhin auf; `src/gnparse.js` und
  `src/gnmap.js` sind in dieser Runde nicht angefasst worden. `ml()` und
  `mlAusText()` sind unverändert wortgleich.

---

## Jagd nach Runde 18 (Stand `dc4a068`, Zweig `claude/backoffice-leitung-r18-clvh73`)

**1 × A, 3 × B, 4 × C.** Alle A- und B-Funde sind in derselben Nacht behoben
(`b5573ab`ff). Die C-Funde stehen in `review/BACKLOG.md`.

| Klasse | Runde | Fund | Datei:Zeile | Wie nachgestellt | Nächste Rolle | Stand |
|---|---|---|---|---|---|---|
| A | 18 | **`druckDifferenzen()` ließ alle drei Vorbehalte des Bildschirms weg und druckte „mehr geholt als verkauft — Vorrat aufgebaut oder Schwund" als Messwert.** Das Blatt geht in eine WhatsApp-Gruppe. | `public/leitung.html` (`druckDifferenzen`) gegen `:2315`, `:2321`, `csvAbgleich` | Bericht 37 mit leerem Mapping wie in der Live-D1: Bildschirm sagt „44 Kassennamen ohne Zuordnung — ihr Verkauf fehlt in dieser Rechnung" (136 von 145 Stück), CSV trägt denselben Abschnitt. Das Blatt trug keines von beidem und schrieb „Cola 0 verkauft / 6 geholt / +6 — Schwund", Summe „Verkauft 0 · Geholt 16". An diesem Tag gingen 145 Stück und 602,50 € über die Kasse. | software-engineer | **behoben in Runde 18** — ein Vorbehaltskasten nennt fehlende Berichte, nicht zugeordnete Kassennamen und Namen ohne bestätigte Größe; solange einer davon gilt, fällt das Wort „Schwund" aus der Deutung, die Unterzeile sagt „unvollständige Rechnung". Geprüft: `tests/ui-runde18.cjs`, zwei Urteile |
| B | 18 | **Die Kachel „Tagesfassung" versprach „Positionen und Mengen ansehen" und legte das Detail am Handy 921 px unter den Falz.** Der Weg über den Knopf rollte hin, der über die Kachel nicht. | `public/leitung.html` (`[data-ziel]`-Horcher) gegen den `[data-eg]`-Horcher | 390 × 844: nach dem Klick `scrollY=0`, `#egDetail .karte` bei `top=921`. | software-engineer | **behoben in Runde 18** — ist ein Detail offen, gewinnt es über `scrollTo(0,0)`. Gemessen: `top=139` bei 844 px |
| B | 18 | **Das offene Detail überlebte einen Filter, der seinen Vorgang ausschloss.** `finde()` suchte in `alle` statt in der gefilterten Liste. | `public/leitung.html` (`vEingaenge.malListe`) | „zzzz" ins Suchfeld: Liste sagt „Kein Vorgang passt zu dieser Suche", darunter stand unverändert die volle Karte der Tagesfassung. Dasselbe beim Modusfilter. | software-engineer | **behoben in Runde 18** — `finde()` sucht in `L`, und ohne Treffer wird `#egDetail` geräumt. Geprüft: ein Urteil |
| B | 18 | **`randwisch()` nahm Gesten, die ihm nicht gehörten**: Randzone bis 32 px, der Inhalt beginnt bei 16 px. Über dem Suchfeld und über der waagrecht rollenden Vorgangstabelle sprang die Navigation auf; bei offener Leiste wurde jede waagrechte Geste geschluckt. | `public/leitung.html` (`randwisch`) | 390 px: Wisch ab x=20 über `#egQ` → `defaultPrevented`, Navigation auf. Über `#egListe .tabhuelle` (`scrollWidth 703` gegen `clientWidth 356`) → Tabelle rollt nicht, „Ansehen"/„PDF" bleiben unerreichbar. | software-engineer | **behoben in Runde 18** — Zone auf 20 px, ausdrückliches Nein für Eingabefelder und waagrecht rollende Hüllen, `preventDefault` nur noch in der Richtung, die etwas bewirkt. Zusätzlich öffnet die ganze Zeile das Detail. Geprüft: vier Urteile |

### Ausdrücklich geprüft, kein Fund
* **`vgSchluessel` kollidiert nicht.** Serverdaten tragen `roh.id`; lokal ist
  `hh_archiv` nach `mode_tag` und `hh_keller_v12` nach Modus verschlüsselt.
* **`nurImBrowser()` stürzt nicht ab** — gegen sechs Sorten Schrott im
  `localStorage` geprüft, je 0 Ergebnisse, keine Ausnahme.
* **`drucke()` ist sauber** — Cmd-P ohne Knopf druckt weiter die Seite, nach
  `afterprint` ist alles geräumt, die 180-s-Frist kann keinen jüngeren Druck
  abräumen.
* **Gegenprobe Bericht 37 geht auf**: 48 Positionen, 145 Stück, 602,50 €.
  Der Wareneingang rechnet richtig: 2×6 + 2×24 + 12 = 72 Flaschen.
* **Regeln**: vier Dateien in `public/`, `VERSION` v56 → v57, Gestaltungsschicht
  wortgleich, keine neue Abhängigkeit.

### Ungeprüft geblieben
* Echtes Safari/iOS: ob `preventDefault()` die Zurück-Geste wirklich nimmt und
  ob `window.print()` nach 80 ms Verzug dort noch als Nutzergeste gilt.
* Notch/Safe-Area und die eingeblendete Tastatur.

## Zweite Jagd nach Runde 18 (Stand `9717c6f`)

**1 × A, 4 × B, 4 × C.** Der A-Fund ist der A-Fund der ersten Jagd, durch eine
zweite Tür: Der Vorbehaltskasten kannte nur die drei Lücken, die sich selbst
melden — die zwei stummen zählte niemand.

| Klasse | Runde | Fund | Datei:Zeile | Wie nachgestellt / gerechnet | Nächste Rolle | Stand |
|---|---|---|---|---|---|---|
| A | 18 | **`halbeRechnung` war falsch, sobald Verkauf STILL verschwand.** Ein Kassenname auf „Ignorieren" und eine Rezeptzutat mit `0 ml` nehmen den Verkauf aus der Rechnung, ohne eine Spur in `a` zu hinterlassen. Der Kasten schwieg, und die Deutungsspalte druckte wieder „Vorrat aufgebaut oder **Schwund**". | `public/leitung.html` (`abgleich`, Zweige `ignoriert` und Rezept) gegen `druckDifferenzen` (`vorbehalte`) | Bericht 37, ein Z-Bericht, `spanne=1`, alles auf „Ignorieren" ausser Cola: `a.offen=0`, `a.ohneGroesse=0`, `a.berichte=a.spanne` → **kein Vorbehalt**, Blatt druckt „Leindl · Langenlois · Verkauft 0 · Geholt 3 · +3 · Vorrat aufgebaut oder Schwund". Der Verkauf dieser Weine ist nicht null — er ist ignoriert. Zweiter Weg: Rezeptur mit `0 ml` → `6 × 0 / 350 = 0` meldet „gerechnet". Kein erfundener Fall: „Ignorieren" ist der einzige Weg, einen Cocktail ohne Menge im Kassennamen aus dem roten Balken zu bekommen, und in Bericht 37 sind ~10 der 44 offenen Namen genau das. | software-engineer | **behoben in Runde 18** — `abgleich()` zählt `stkGesamt`/`stkGerechnet`/`stkIgnoriert` (additiv). Die erste Zeile des Kastens lautet „Von N verkauften Einheiten sind M in diese Rechnung eingegangen — K nicht" und ist gegen jeden künftigen stillen Weg dicht. Eine Rezeptzutat ohne Menge gilt nicht mehr als gerechnet, das Formular nimmt die 0 nicht mehr an. Das Wort „Schwund" steht in der Deutungsspalte überhaupt nicht mehr. Geprüft: drei Urteile |
| B | 18 | **Bei OFFENER Leiste gab `randwisch()` Safari die Zurück-Geste am linken Rand zurück** — genau dort, wo der Daumen liegt, wenn die Schublade offen ist. Die Behebung der ersten Jagd hatte einen Schritt zu weit zurückgenommen. | `public/leitung.html` (`randwisch`, `if(hin>0 === offen())`) | 390 × 844, `navoffen` gesetzt, Wisch x=8 → x=160: `{verhindert:false}`. | software-engineer | **behoben in Runde 18** — behalten wird die Geste, wenn sie wirkt ODER am Rand beginnt. Geprüft: zwei Urteile (Mitte losgelassen, Rand abgefangen) |
| B | 18 | **Das Detail aus „Nur auf diesem Gerät" wurde von jedem Tastendruck im Suchfeld der SERVERLISTE gelöscht** — während seine eigene Tabelle unverändert darunter stehenblieb. Ohne Wort, ohne Grund. | `public/leitung.html` (`vEingaenge`, Fremd-Abschnitt) | Ein Vorgang im `hh_archiv`, den der Server nicht kennt: „Ansehen" → Karte da; „Lena" ins Suchfeld → Karte weg, Fremdtabelle da. | software-engineer | **behoben in Runde 18** — eigene Fläche `#egFremdDetail`, eigener Merker `EGFREMD`, `malDetail(v, wohin)`. Geprüft: ein Urteil |
| B | 18 | **`VERSION` in `sw.js` stand seit dem ersten Commit der Runde unverändert**, obwohl `leitung.html` sich danach zweimal geändert hatte. Offline hätte der Service Worker das Blatt OHNE Vorbehaltskasten ausgeliefert — den A-Fund der ersten Jagd. Regel aus `CLAUDE.md`, und die Unterlagen führten „v57" als geprüft. | `public/sw.js` | `git log -1 -- public/sw.js` → `dc4a068`; `leitung.html` danach `b5573ab`, `9717c6f`. | software-engineer | **behoben in Runde 18** — v58 |
| B | 18 | **Der Kopfkasten behauptete weiter „Ein Plus heisst: mehr geholt als verkauft"** — derselbe falsche Satz, den die Behebung aus der Deutungsspalte genommen hatte, drei Zeilen über dem Kasten, der ihn widerruft. | `public/leitung.html` (`druckDifferenzen`, Kopf) | Im Ausdruck nachgelesen: drei Sätze, zwei Aussagen. | software-engineer | **behoben in Runde 18** — „mehr geholt, als die Rechnung an Verkauf kennt" |

### C-Funde der zweiten Jagd
Zwei sofort behoben: der 4-px-Streifen zwischen Inhaltsbeginn (16) und Randzone
(20) gehört jetzt ausdrücklich der Randgeste (sonst blieb dort ein Loch, durch
das Safari zurückblättert), und der Zeilenklick öffnet nichts mehr, wenn Text
markiert ist. Zwei stehen im Backlog: `tr.klickbar` hat keinen Tastaturweg
ausser dem Knopf, und `.b.klein` ist 36 px hoch — das steht in der GETEILTEN
Gestaltungsschicht und muss in beide Dateien.

### Was die zweite Jagd nachgerechnet und in Ordnung gefunden hat
* Der Vorbehaltskasten zählt richtig: leeres Mapping + Bericht 37 →
  `a.offen.length = 44`, 136 Stück; `teileOhneGroesse` → 4 / 9 Einheiten.
  **136 + 9 = 145 = Gegenprobe des Berichts.** Der Bildschirm daneben sagt
  dieselben Zahlen.
* Der Kachel-Weg ist wirklich repariert (Karte bei `top = 215` statt 921).
* `drucke()`: kein Horcher-Leck, kein jüngerer Druck wird abgeräumt.
* Gestaltungsschicht zeichengleich; `tr.klickbar` und
  `#druck .notiz.vorbehalt` stehen beide unterhalb der Trennmarke.

## Dritte Jagd nach Runde 18 (Stand `1e8035b`)

**1 × A, 4 × B, 3 × C.** Der A-Fund ist wieder derselbe — behoben wurde er beim
zweiten Mal nur auf dem Papier.

| Klasse | Runde | Fund | Datei:Zeile | Wie nachgerechnet | Stand |
|---|---|---|---|---|---|
| A | 18 | **Das Wort „Schwund" stand unverändert in der Deutungsspalte des MITTAGSBLICKS.** Die Behebung der zweiten Jagd hatte nur das Blatt erreicht. Und zwar für genau die Zeile, um die es ging: Ein Kassenname auf „Ignorieren" ruft `zaehlePos()` nie auf, der Artikel bekommt weder `unklar` noch `vorbehalt` und steht als volle, unkommentierte Abweichung da — samt roter Zahl in der Navigation. | `public/leitung.html` (`vHeute`, `td.deutung`) gegen `druckDifferenzen` | Bericht 37, Cocktails und Speisen auf „Ignorieren" (der beworbene Weg): Zeile `Leindl · Langenlois · Verkauft 0 · Geholt 3 · +3`, `unklar:null`, `vorbehalt:null` → die Deutungsspalte druckt wörtlich „mehr geholt als verkauft — Vorrat aufgebaut oder Schwund". **Zwei Deutungsspalten mit zwei Texten** — dasselbe Duplikatsmuster, das diese Datei schon dreimal eingeholt hat. | **behoben in Runde 18** — `const DEUTUNG` ist der eine Satz an der einen Stelle, Mittagsblick und Blatt rufen ihn, das Wort fällt überall weg. „Was noch fehlt" hat eine Zeile für ignorierte Kassennamen bekommen |
| B | 18 | **`zaehlePos(x.id,false,"menge")` im neuen Rezeptzweig** — `zaehlePos` kennt genau einen Grundwert, `"ausschank"`, und wirft alles andere in „ohne bestätigte Größe". Die Zeile hätte zu einer bestätigten Größe behauptet, sie fehle; dieselbe Falschzuweisung hat die sechste Jagd in Runde 16 abgestellt. | `public/leitung.html` (`abgleich`, Rezeptzweig) gegen `zaehlePos` | Rezept `{id:"cola", ml:0}`, cola mit 350 ml bestätigt → `vorbehalt.cola = {ohne:1, gesamt:2, menge:0, gebinde:1}` → „1 ohne bestätigte Größe". | **behoben in Runde 18** |
| B | 18 | **„Unvollständig" war dabei, der Normalzustand zu werden.** `draussen` zählte Speisen und Kaffee mit: Im bestmöglich gepflegten Zustand blieben von 145 Einheiten 99 „nicht in der Rechnung", davon 80 Rührei und Espresso. Jedes Blatt hätte ab jetzt „Diese Rechnung ist unvollständig" getragen — und ein Warnhinweis, der nie ausgeht, unterscheidet den Normalzustand nicht mehr vom Schaden. | `public/leitung.html` (`druckDifferenzen`) | Bericht 37 bestmöglich gepflegt: `stkGesamt 145`, `stkGerechnet 46`, `draussen 99`. | **behoben in Runde 18** — `ausgenommen` (Entscheidung, steht im Kasten ohne Alarm) und `luecke` (ungewollt, macht die Rechnung unvollständig) sind getrennt; der Kasten hat eine laute und eine leise Kopfzeile |
| B | 18 | **Ein Z-Bericht mit null Positionen** ergab `stkGesamt 0`, `luecke 0` und damit keinen einzigen Vorbehalt — das Blatt druckte „+6" ohne jeden Hinweis. `ladeBerichte()` prüft nur `e.tag`, nicht die Positionen. | `public/leitung.html` (`druckDifferenzen`) | `positionen:[]`, spanne 1, Vorgang mit `wein:{w001:6}`. | **behoben in Runde 18** — eigener Vorbehalt: „Der Z-Bericht enthält keine einzige Position. Die Verkaufsseite ist damit nicht leer, sondern unbekannt." |
| B | 18 | **Das Urteil, das den A-Fund der zweiten Jagd bewachen sollte, konnte nicht rot werden.** In „Weg 2" blieben zwei Kassennamen unzugeordnet — der Vorbehalt kam von dort, nicht vom 0-ml-Zweig. Nimmt man den ganzen Zweig aus `abgleich()` heraus, bleibt das Urteil grün. | `tests/ui-runde18.cjs` | Nachgestellt. | **behoben in Runde 18** — lückenloses Mapping, das Urteil liest `stkGesamt`/`stkGerechnet`/`luecke` direkt und führt die Gegenprobe (dieselbe Rezeptur MIT Menge) mit. Dazu ein Aufbau, bei dem wirklich nichts fehlt |

### C-Funde der dritten Jagd — beide sofort behoben
* `randwisch()` nahm am linken Rand auch die Geste nach LINKS und tat dann
  nichts. Safaris Zurück-Geste am linken Rand ist ein Wisch nach RECHTS; nach
  links gehört die Geste der Seite darunter.
* Über einem Eingabefeld blieb die Zurück-Geste am Rand offen, weil
  `eigenerBedarf` das Feld vor `amRand` prüfte — dieselbe Lücke, die für die
  offene Leiste gerade geschlossen worden war. Am Rand gewinnt jetzt immer die
  Randgeste.

### Was die dritte Jagd nachgerechnet und in Ordnung gefunden hat
* Kein Pfad schreibt in `verk`, ohne `stkGerechnet` zu erhöhen, und keiner
  umgekehrt. `draussen` kann weder negativ noch NaN werden.
* Derselbe Kassenname an mehreren Tagen wird als Einheiten summiert, nicht als
  Namen; `ignoriert[]` fasst nach Namen zusammen wie `offen` und `ohneGroesse`.
* Die Gründe im Vorbehaltskasten sind disjunkt und addieren sich genau zu der
  Zahl darüber — der Kasten ist in sich widerspruchsfrei.
* `merkeOhneGroesse(p, l.id, {fehlt:"ausschank"}, true)` — viertes Argument
  richtig, `r.forEach(…)` für alle Zutaten richtig, keine Division durch null.
* `malDetail(v, wohin)`: keine doppelten Kennungen mehr, `EGFREMD` und
  `EGOFFEN` getrennt, die Filterfelder rufen `malListe()` statt `zeichne()`.
* Gegenprobe Bericht 37 geht auf: 48 Positionen, 145 Stück, 602,50 €.

### Ein Befund über den Prüfstand selbst
Die Kassennamen des Prüfstands trugen keine Einheit („Cola 0,33"). `flaschen()`
liest die Ausschankmenge über `mlAusText(p.name)` — ohne Einheit findet es
nichts, und **die Verkaufsseite blieb im ganzen Prüfstand leer**. Jede
Differenz bestand nur aus der Entnahme. Seit dieser Jagd tragen die Namen eine
Einheit, und das Blatt zeigt endlich auch Zeilen mit echtem Verkauf.

## Vierte Jagd nach Runde 18 (Stand `f41c7dc`)

**1 × A, 3 × B, 6 × C.** Der A-Fund ist zum vierten Mal derselbe — eine
Wahrheit, mehrere Leser, und die Behebung landet jedes Mal nur bei den Lesern,
die in der Kritik standen. Diesmal sind es die beiden, die niemand genannt
hatte: der Bildschirm „Verkauf ↔ Fassung" und die CSV-Ausfuhr.

| Klasse | Runde | Fund | Wie nachgerechnet | Stand |
|---|---|---|---|---|
| A | 18 | **Bildschirm und CSV kennen „Ignorieren" nicht — die grüne Plakette „stimmt" steht über einer Rechnung, in der zwei Drittel des Verkaufs fehlen.** `stkGesamt/stkGerechnet/stkIgnoriert` waren an zwei von vier Lesern angeschlossen. | Ein Z-Bericht, 1 von 1 eingelesen. „Cola 0,33 l" ×3 zugeordnet, „Cola Sonderausschank 0,33 l" ×6 auf „Ignorieren". Keller gibt 3 Flaschen. **Wahr: 9 verkauft, 3 geholt → −6.** Gezeigt: `Cola · 3 · 3 · 0 · `**`stimmt`** in Grün, keine Hinweise; die CSV wortgleich. `abgleich()` weiss es die ganze Zeit: `stkGesamt 9 · stkGerechnet 3 · stkIgnoriert 6`. | **teilweise behoben in Runde 18** — Bildschirm, CSV, Kachel und Blatt benennen die ignorierten Namen jetzt alle. **Offen bleibt die Plakette der EINZELNEN Zeile**: Welcher Artikel hinter einem ignorierten Kassennamen steckt, ist nicht bestimmbar; ein pauschales Abwerten aller Zeilen träfe jeden Tag, an dem Speisen ignoriert sind. Steht als **hoch** im Backlog, mit zwei Wegen zur Entscheidung |
| B | 18 | Die Kachel „Auffällige Differenzen" meldete im selben Fall „0 · Verkauf und Entnahme decken sich" in Grün — gegen den Kommentar drei Zeilen darüber, der wörtlich verlangt: „Eine grüne Null darf nur dastehen, wenn auch wirklich verglichen wurde." | Gemessener Kacheltext. | **behoben in Runde 18** — die Kachel nennt „N ignoriert (M Einheiten)" |
| B | 18 | `randwisch()` gab Safari bei OFFENER Leiste die Zurück-Geste ab x = 21 px zurück — der B-Fund der zweiten Jagd, um fünf Pixel verschoben. Bei offener Leiste liegt das Blatt über 0–280 px; der Grund für die schmale Zone gilt dort gar nicht. | 390 × 844, Blatt `left 0 · right 280`, Wisch ab x = 25 → `verhindert:false`. | **behoben in Runde 18** — bei offener Leiste zählt die Breite des Blattes als Rand (`offsetWidth`, nicht die animierte Kante). Geprüft: zwei Urteile |
| B | 18 | **Der Prüfstand bewachte drei der fünf Änderungen nicht.** Mutationsprobe: `zaehlePos(…,"ausschank")` zurückgedreht → 43 grün. Ignorier-Zeile entfernt → 43 grün. `!(amRand && hin>0)` zurück → 43 grün. `amRand`-Vorrang zurück → 43 grün. | Mutationsprobe auf einer Kopie. | **behoben in Runde 18** — acht neue Urteile, jedes an genau der Stelle, die es bewacht. 51 Urteile, 0 rot |

### C-Funde der vierten Jagd
Zwei sofort behoben (falscher Numerus in beiden neuen Texten, fehlender
Zeitraum in der Zeile „Was noch fehlt"). Vier stehen im Backlog: eine Rezeptur
schattet „Ignorieren" still ab; am Rand gewinnt die Randgeste auch über dem
Suchfeld (bewusst); ein einzelner leerer Bericht in einem Fenster mit sieben
fällt stumm durch; und für die VERSION-Regel gibt es keinen Wächter.

### Beobachtung ohne Klasse
Ein einzelner `npm test`-Lauf meldete einmal `443/1`; in über zwanzig weiteren
Läufen nicht wiederholbar. Zwölf Prüfdateien hängen an `Date.now()`. Wer Zeit
hat, wiederholt den Lauf um Mitternacht (Wien). Steht im Backlog.

## Jagd nach Runde 22 · die Vorabliste

Sechs Felder abgesucht: 2 A, 4 B, 7 C. `npm test` 572/572, `ui-runde22`
21/21, `ui-leitung-echt` 44/44, `ui-runde21` 19/19 — alle nachgelaufen,
alle grün. Die Funde lagen an Stellen, an denen keine dieser Prüfungen
hinsah.

| Stufe | Fund | Datei | Nachgestellt | Behoben |
|---|---|---|---|---|
| A | „Alle Vorschläge übernehmen" fasst Rezeptzeilen an und setzt sie auf „ignoriert" | `public/leitung.html` `#bAuto` | Rezept auf „Amaro Averna Siciliano 2 cl", Knopf geklickt → `mapping.status='ignoriert'`; auf jedem zweiten Gerät ist die Position danach dauerhaft ignoriert, ihre Bestandteile fallen aus der Rechnung | ✅ `#bAuto` überspringt `REZ` — derselbe Riegel, den `#bGebAlle` seit Runde 16 hat. Prüfung in `tests/ui-runde22.cjs` §3 |
| A | Ein Vorschlag lässt sich nicht ablehnen; Datenbank sagt NULL, Schirm sagt `colaz` | `leitung.html` `sel.onchange` · `ladeZuordnung()` · `src/index.js` | „— offen —" gewählt: Toast „gespeichert", Zeile steht sofort wieder auf „vorgeschlagen". Der Worker zählte sie weder als zugeordnet noch als offen | ✅ Die Datenbank hatte die Ablehnung die ganze Zeit (`status='zugeordnet', artikel=NULL`) — nur las sie niemand. `ladeZuordnung()` liest sie jetzt als `__offen`, `zuordnung()` gibt „offen" zurück, der Sammelknopf lässt sie in Ruhe, und `offen` im Worker zählt sie mit. Prüfung §4b |
| B | 33 Zuordnungen bleiben nach 403 oder ohne Netz als „festgelegt" stehen | `leitung.html` `#bAuto` · `sel.onchange` | Rolle „wirtschaft" klickt: D1 leer, Gerät voll, 29 Pillen springen auf „festgelegt" | ✅ Erst senden, dann merken; bei Fehlschlag zurück auf den alten Wert. Die Meldung sagt jetzt „ist NICHT gespeichert" |
| B | 29 unbestätigte Vorschläge erzeugen kein Signal | `leitung.html` `zaehler("zuordnung")` | Zähler 44 → 15; die Vorschläge rechnen schon mit, stehen aber nirgends als Zahl | ✅ Eine Karte über der Tabelle: „n Vorschläge warten auf einen Klick. Sie rechnen schon mit." Die Zahl neben dem Menüpunkt bleibt, was sie ist |
| B | Die Datenbank kann „kein Keller" nicht von „noch offen" unterscheiden | `src/index.js` | Beides landet als `fassungszeile.artikel = NULL` | ↩️ Nicht behoben, in den Backlog. Heute liest niemand diese Spalte so; die erste Abfrage `WHERE artikel IS NULL` würde Käse und Aperol Spritz gleich zählen. Braucht eine Migration, die nur Casimir einspielt |
| B | „Johannisbeer gespritzt" → `johan`: aus dem Nachbarn geschlossen, nicht nachgeschlagen | `src/gnmap.js` | Die Begründung im Quelltext war eine Analogie zu „Mango gespritzt" — und es ist nicht derselbe Saft | ✅ Eintrag entfernt. Er steht jetzt im Morgenbrief. Von 37 Einträgen bleiben 36 |
| C | „geprüfte Liste sagt …" stand in der kleinsten Schrift des Schirms | `leitung.html` | 11 px, 5,3:1 — für eine Zeile, die einen Vertipper mit Geldfolge meldet | ✅ 13 px in der Warnfarbe, der Artikel fett |
| C | Sechs weitere (`ml()` ohne „l", Ausschank gegen Gebinde, Reihenfolge in `zuordnung()` ungeprüft, `vorabAbweichung` schweigt im umgekehrten Fall, Spirituosen hart ausgeschlossen, „live" im Morgenbrief) | — | — | ↩️ In den Backlog, `review/BACKLOG.md` |

**Was aufgegangen ist:** Bericht 37 rechnet unverändert (48 Positionen,
145 Stück, 602,50 €, Rabatt 3, Storno 1). Alle Artikel-Ids der Liste
stehen im Stamm und sind im Auswahlfeld wählbar. `ml()` und
`mlAusText()` stimmen auf allen 56 geprüften Namen überein. `vorab()`
schlägt wirklich nur nach — „Käse ", „ Käse", „käse", „Käsebrot",
„Cola Zero", „Cola Zero 0,5l" gehen alle nicht durch. `mappe()` ist
unangetastet. Bei 390 px kein waagrechter Überlauf, Sammelknopf
208 × 44 px.

### Zweite Jagd (auf die Reparatur)

1 A, 2 B, 7 C. Die Reparatur der beiden ersten A-Funde hält — Worker und
Schirm zählen identisch, die Ablehnung überlebt Neuladen und
Sammelklick. Aber `__offen` war an einer Stelle nicht mitgedacht.

| Stufe | Fund | Nachgestellt | Behoben |
|---|---|---|---|
| A | Eine Ablehnung sperrt die Position dauerhaft aus dem Rezeptur-Schirm aus | `vRezepte()` bot nur Namen ohne MAP-Eintrag an; `__offen` ist einer. Betroffen ausgerechnet „Mango gespritzt", für das der Morgenbrief selbst ein Rezept vorschlägt. Zurück führte kein Weg: der Select kennt kein „nie angefasst", ein DELETE auf `mapping` gibt es nicht | ✅ Ein abgelehnter Name bleibt wählbar. Prüfung in `tests/ui-runde22.cjs` §4b |
| B | Die Rücknahme bei Fehlschlag war halb: die Zuordnung kam zurück, die bestätigte Gebindegröße blieb gelöscht | Cola Zero auf 330 ml bestätigt, Netz gekappt, Wechsel scheitert: Zeile sagt „festgelegt", 4,24 Flaschen fallen aus dem Abgleich, die Datenbank hält die Größe weiter | ✅ Beides zurück |
| B | Die Meldung nach einem Fehlschlag sagte das Gegenteil: „die Zuordnung ist nur auf diesem Gerät" — dort ist sie seit der Reparatur gerade nicht | Gemessener Toast-Text | ✅ „Nicht gespeichert — es bleibt beim alten Stand"; der Aufrufer schaltet die alte Zeile stumm |
| C | `gebArtikelBestaetigt()` legte einen Eintrag unter dem Schlüssel `__offen` an | `Object.keys(t) = ["__offen"]` | ✅ Eine Zeile |
| C | „Feste Zuordnungen" zählte Ablehnungen und Ignorierte mit | Eine Ablehnung, sonst nichts: angezeigt „1" | ✅ Zählt nur echte Artikel |
| C | `abgelehnt:true` wurde nirgends gelesen | grep: kein zweites Vorkommen | ✅ Die Zeile sagt jetzt „abgelehnt — offen" statt „offen" |
| C | Die Zahl zum Bericht vom 19.09. war nach dem Entfernen von „Johannisbeer gespritzt" nicht nachgerechnet | Der Name steht in keiner Fixture, also nur im Live-Bericht | ✅ Nachgerechnet gegen die Live-D1: **21**, nicht 20. Überall berichtigt |
| C | Drei weitere (32 gegen 33 Zeilen je nach Rezeptur, `bestaetigeGebinde()` merkt weiter vor dem Senden) | — | ↩️ Backlog |

**Geprüft, ohne Fund:** kein Doppelzählen zwischen `abgelehnt` und
`kennt` (ohne mapping 15/15, nach Sammelklick 15/15, nach einer
Ablehnung 16/16, nach „Käse → offen" 17/17 — Worker und Schirm gleich).
Es entsteht keine `mapping`-Zeile, die vorher nicht entstanden wäre. Das
Rückrollen stimmt für alle vier Ausgangszustände. Alle elf Leser von
`MAP` durchgesehen — `__offen` wird nirgends als Artikel-Id
weitergereicht. Die neue Karte bei 390 px ohne Überlauf, und sie
verschwindet, wenn nichts mehr wartet. Gestaltungsschicht wortgleich
(11 344 Zeichen, beide Dateien identisch).

### Dritte Jagd (auf die zweite Reparatur)

**Zur Reparatur selbst: kein A, kein B.** Alle sieben Punkte halten der
Nachrechnung stand. Nachgestellt im Browser gegen echten Worker und
echte SQLite: die Rücknahme bei Fehlschlag bringt Zuordnung UND
Gebindegröße zurück, ein abgelehnter Name führt über die Rezeptur
weiter, und kein Weg schreibt einen Bestandteil als Artikel. Bericht 37
geht in vier Zuständen an sich selbst auf (frisch, nach Sammelklick,
nach Ablehnung, Ablehnung plus Rezept): 145 Stück, 602,50 €, und
gerechnet + ignoriert + offen + ohne Größe = 145 in allen vieren.
`npm test` fünfzehnmal gelaufen, dazu fünfmal mit verschobener Uhr über
Wiener Mitternacht, UTC-Mitternacht und 02:00 CEST — kein Wackeln.

Ein B-Fund aus dem Gesamtzustand, vom Thema der Runde unabhängig:

| Stufe | Fund | Nachgestellt | Behoben |
|---|---|---|---|
| B | Jeder GEGLÜCKTE Mailempfang wurde auf der Übersicht zum Ausfall erklärt | `meldungen()` hängte an die jüngste Notiz der Quelle `email` unbedingt „— solange das so bleibt, kommt kein Z-Bericht mehr von selbst herein". Der Mailweg schreibt unter derselben Quelle auch die Erfolgsmeldung. Gemessen: „Mailempfang 20.09. 22:18: Z-Bericht 2026-09-16: 48 Positionen, 15 offen — solange das so bleibt, kommt kein Z-Bericht mehr von selbst herein." | ✅ Der Worker setzt das Wort „angekommen", das Backoffice liest es. Der Warnsatz hängt nur noch am Ausfall. Neu `tests/mailmeldung.test.mjs`, 9 Urteile, beide Seiten festgehalten |

Der Fund ist alt (der Satz stammt aus Runde 19, die Erfolgsnotiz vom
27.08.) und war vom ersten Tag an falsch — er fällt nur jetzt auf, weil
der Mailweg seit Runde 21 fertig ist und die Weiterleitung Casimirs
erste Aufgabe ist. Am ersten Morgen, an dem sie steht, hätte die
Übersicht täglich behauptet, der Empfang sei kaputt.

Sechs C-Funde in den Backlog: der Grund eines Fehlschlags fällt im
Zuordnung-Bildschirm weg (403 und „kein Netz" sind nicht mehr zu
unterscheiden), die Import-Vorschau nennt eine Rezeptposition
„bestätigt" mit leerem Artikel, Schirm und Worker zählen „offen"
verschieden, sobald Rezepte im Spiel sind, `#bAuto` bricht bei einem
Fehlschlag nicht ab, „Zuordnungen vom Server" zählt weiter alles, und
die Unterlagen datieren einen Tag vor.
