# Phase B — Konzept für KELLER, WARENEINGANG, SONDERENTNAHME

**Rolle:** controller (F&B-Controlling) · **Stand:** 17.09.2026 · Paket P5 des Nachtzyklus

**Dies ist ein Konzept. Es wurde nichts gebaut.** Kein Code, keine
Migration, keine Schemaänderung, kein Commit. Die einzige Datei, die in
diesem Zug entstanden ist, ist diese hier.

Grundlage: `CLAUDE.md` (Abschnitt „Schemaänderungen"),
`PROJEKTANLEITUNG-Fassungstool.md`, `UEBERGABE-TECHNISCH.md`,
`docs/live-schema.sql` (die Wahrheit über das Schema),
`review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 7 und Nr. 14, `review/BACKLOG.md`,
`src/index.js`, `public/index.html`, `public/leitung.html`,
`tests/fixtures/zbericht-37-extended.csv`.

---

## 0 · Die Gleichung, an der alles hängt

Alles, was in Phase B gebaut wird, muss diese eine Zeile je Artikel **und
je Lagerort** aushalten:

```
Anfangsbestand (Zählung)
  + Wareneingang
  − Verbrauch (Ausschank/Fassung)
  − Sonderentnahme (Bruch, Personal, Küche, Verkostung, Zimmer)
  = Sollbestand

Sollbestand − Endzählung = Differenz          (positiv: Schwund)
```

Heute rechnet `bestand()` (`src/index.js:373`) diese Zeile **ohne den
Lagerort**: Schlüssel ist allein der Artikel. Das geht nur so lange gut,
wie jeder Artikel genau einen Ort hat — Wein steht im Keller, Getränke im
Lager. Sobald ein zweiter Zählort dazukommt (Modul KELLER), kippt die
Rechnung still.

### Drei Befunde, die vor dem ersten Modul geklärt sein müssen

**B1 · `bestand()` schlüsselt nicht auf den Ort.**
`src/index.js:378` (`letzteZaehlung[r.artikel] = r.ts`) und `:385`
(`b[r.artikel] = …`). Eine Zählung des Getränkelagers und eine Zählung des
Kellers desselben Artikels überschreiben einander; die jüngere wird zum
Anker für beide Orte, alle Bewegungen des anderen Ortes werden dagegen
gerechnet. Bei `serena` (Prosecco — steht laut `PLAN.bar` an der Bar und
laut Wareneingang im Keller) passiert das sofort.
→ **Vorbedingung für Modul KELLER.** Schlüssel muss `artikel|ort` werden,
in `src/index.js:373 ff.` **und** in `public/leitung.html` (`bestand()`, dort
steht dieselbe Regel ein zweites Mal — siehe Hinweis an den skeptiker in
`review/LOG.md`, Runde 5). Der Index `i_ereignis_artikel (artikel, ort,
ts)` ist live bereits breit genug dafür (`docs/live-schema.sql:124`) — das
Schema kann es, der Code nicht.

**B2 · Zwei Vorgänge desselben Modus am selben Tag löschen einander
gegenseitig aus dem Journal.**
Der Schlüssel ist `<modus>_<tag>` (`public/index.html:1556`). Schließt man
einen Wareneingang ab und beginnt am selben Tag einen zweiten, legt
`start()` einen frischen Vorgang mit **demselben Schlüssel** an
(`public/index.html:2230`: `if(cur&&(cur.finished||cur.tag!==ziel))
{archive(cur);S[m]=blank(m);}` — die lokale Kopie wandert ins Archiv, der
Serverschlüssel bleibt gleich, und `zaehlnr` zählt weiter hoch, der
409-Wächter greift also nicht). `ereignisseAbleiten` (`src/index.js:262`)
vergleicht dann den neuen Zustand mit den Journalzeilen des ersten und
bucht die Differenz: Lieferung 1 wird mit einer Gegenbuchung **komplett
zurückgenommen**, Lieferung 2 eingebucht. Gemessen am Beispiel: 2 Kisten
Wein am Vormittag, am Nachmittag die Getränkelieferung erfasst → die 12
Weinflaschen vom Vormittag verschwinden lautlos aus dem Bestand, das
Protokoll im lokalen Archiv zeigt sie weiter.
Dasselbe gilt für **Sonderentnahme** (zwei an einem Tag ist der Normal-,
nicht der Sonderfall: Küche mittags, Bruch abends) und für
**Nachfüllen**.
→ **Vorbedingung für WARENEINGANG und SONDERENTNAHME.** Steht noch nicht im
Backlog. Lösungsvorschlag in den Modulen unten (laufende Nummer im
Schlüssel), Entscheidung bei Casimir.

**B3 · `ereignis.menge` ist seit der Gegenbuchung vorzeichenbehaftet.**
`src/index.js:296–308`. Eine nach unten korrigierte Sonderentnahme steht
als `art='entnahme', menge=−1` im Journal; `bestand()` rechnet
`b −= (−1) = +1` und damit richtig. **Jede neue Auswertung in Phase B
(Schwund je Zeitraum, Sonderentnahmen nach Grund, Eingänge je Lieferant)
muss vorzeichenrichtig summieren.** Wer `ABS(menge)` oder
`SUM(menge) … art='entnahme'` als Betrag liest, zählt eine zurückgenommene
Entnahme als zweite Entnahme: aus 1 − 1 = 0 wird 1 + 1 = 2. Das ist der
teuerste denkbare Fehler in einer Schwundliste, weil er nach oben lügt und
nach einer Korrektur am größten ist.

---

# Modul 1 · KELLER (Kellerzählung / Lagerorte)

## 1.1 Zweck

Die Kellerzählung ist der einzige Anker, den der ganze Bestand hat: ohne
Zählung rechnet der Worker bewusst gar keinen Bestand, sondern nur
Bewegung (`src/index.js:387`, „ohne Zählung kein Bestand"). Zwei Leute
gehen mit dem iPhone durch den Keller — Laufweg Rot, Rosé, Weiss, Cuvée,
Natural, Bubbles, Einzelgänger, Reihen mal sechs plus einzelne Flaschen —
und am Ende soll die Leitung am MacBook nicht nur eine neue Zahl sehen,
sondern **die Differenz zur letzten Rechnung**: Was war zu erwarten, was
wurde gezählt, wo ist die Lücke. Heute wird die alte Zahl von der neuen
ersetzt und die Differenz ist nirgends zu sehen — die Zählung überschreibt
still, was der Wareneingang und die Fassungen ausgerechnet hatten. Dazu
kommt die Lücke aus Entscheidung Nr. 14: Das **Getränkelager hat
Bewegungen, aber keine Zählung** — 48 gelieferte Cola und jede Entnahme
stehen im Journal, ein Bestand entsteht daraus nie, weil der Anker fehlt.
Für die Leitung heißt das: Beim Wein kann sie einer Zahl trauen, beim
Getränk nicht, und niemand sieht diesem Unterschied an, dass es ihn gibt.

## 1.2 Datenfluss

**Was heute schon steht:**

| Schritt | Ort im Code | Stand |
|---|---|---|
| Zählung im Keller erfassen (Reihen ×6 + einzeln, je Wein) | `public/index.html:2824 ff.`, `blank("keller")` `:1490` | **steht** |
| Zwischenstand offline in `hh_keller_v12`, Ausgang `hh_ausgang_v1` | `public/index.html:1565` | **steht** |
| Abschluss → `PUT /api/vorgang/keller_<tag>` | `src/index.js:170` | **steht** |
| Ableitung `art='zaehlung', ort='keller', menge=reihen*6+einzel` je Wein mit `zdone` | `src/index.js:280–283` | **steht** |
| Nachträgliche Korrektur der Zählung = neue Zählzeile (kein UPDATE) | `src/index.js:299–305` | **steht** |
| Bestand aus jüngster Zählung je Artikel + Bewegungen danach | `src/index.js:373` | **steht, aber ohne Ort (B1)** |
| Backoffice „Kellerbestand", „Zählliste" | `public/leitung.html` (`vBestand`, `vZaehlliste`) | **steht** |
| Zählung der **Bar-Laden** (`d.getr`, `d.gdone`) | `public/index.html:1490`, `leitung.html` (`normVorgang` → `gzaehlung`) | erfasst, **wird nicht gebucht** |
| Zählung des **Getränkelagers** | — | **fehlt** (Entscheidung Nr. 14) |
| Differenz Soll ↔ Ist bei der Zählung | — | **fehlt** |
| Lagerorte als Stammdatum (Liste, Beschriftung) | `PLAN.zone`/`PLAN.zonen` fest im Quelltext, `public/index.html:1348` | **fehlt in der Datenbank** |

**Was dazukommt — vom Antippen bis zur Zeile im Backoffice:**

1. Im Keller wählt der Zählende nach dem Tor Wein/Getränke zusätzlich den
   **Zählort**: „Weinkeller" oder „Getränkelager". Wein → `keller`,
   Getränkelager → `lager`. Mehr Orte nicht (siehe Entscheidung 1.5-a).
2. Gezählt wird wie heute; für das Getränkelager in **Kisten × Gebinde +
   Einzelflaschen**, angezeigt wird die Flaschenzahl. Die Gebindegröße
   kommt aus demselben Stammdatum wie im Wareneingang (Modul 2).
3. **Vor dem Abschluss** zeigt die App je Position die erwartete Menge und
   die Differenz: „Soll 30 · gezählt 29 · −1". Der Erwartungswert kommt aus
   `GET /api/bestand` und ist offline der zuletzt gezogene Stand; ohne Netz
   und ohne gemerkten Stand steht „—", nie eine erfundene Zahl.
   Die Differenz wird **angezeigt, nicht verrechnet**: gebucht wird immer
   die gezählte Menge. Die Differenz ist die Auswertung, nicht die Buchung.
4. Abschluss → `PUT /api/vorgang/keller_<tag>` wie heute.
   `ereignisseAbleiten` bucht `zaehlung` mit `ort='keller'` bzw.
   `ort='lager'`.
5. `GET /api/bestand` liefert nach B1 `bestand[artikel][ort]` sowie
   `gezaehlt[artikel][ort]`.
6. Im Backoffice entsteht daraus eine Zeile je Zählung:
   **Artikel · Ort · erwartet · gezählt · Differenz · Flaschen und (wo ein
   Preis hinterlegt ist, Phase C) Wert.** Die Zählung überschreibt die alte
   Zahl weiterhin — aber die Differenz bleibt als eigene, nicht gebuchte
   Kennzahl der Zählung stehen und ist über den Zeitraum summierbar.
   Das ist der Kern: *Differenzen sichtbar machen, nicht still
   überschreiben.*

**Abgrenzung (wichtig für die Zahlenlogik):** Die **Bar bleibt
Verbrauchsstelle, kein Lagerort.** Was den Keller oder das Lager verlässt,
gilt als verbraucht. Eine Bestandsführung an der Bar hätte zur Folge, dass
jeder Ausschank als Abgang gebucht werden müsste — das hieße, den Z-Bericht
in Flaschenbewegungen zu übersetzen und ihn damit in den Bestand zu
lassen. Das ist Phase C, nicht B. Die heute erfasste Lade-Ist-Zahl
(`d.getr`) bleibt, was sie ist: die Grundlage der Fehlmenge, nicht ein
Bestand.

## 1.3 Was es am Schema additiv braucht

**Nichts. Dieses Modul kommt ohne Schemaänderung aus.**

Begründung, Punkt für Punkt gegen `docs/live-schema.sql`:

* `ereignis.ort` ist `TEXT NOT NULL` **ohne CHECK** (`:73`). `'lager'` ist
  bereits in Gebrauch (`src/index.js:317`). Eine Zählung mit
  `ort='lager'` braucht keine Spalte und keinen neuen Wert im Schema.
* `ereignis.art` hat eine CHECK-Bedingung, aber `'zaehlung'` steht darin
  (`:69`).
* Der Index `i_ereignis_artikel (artikel, ort, ts)` (`:124`) trägt die
  Abfrage „jüngste Zählung je Artikel und Ort" bereits.
* Die **Lagerorte als Stammdatum** (Schlüssel, Beschriftung, Laufweg,
  welche Artikel dort liegen) passen in die vorhandene Tabelle `stamm`
  (`schluessel`/`wert`, `:111`) — eine Zeile, JSON im Wert, gelesen über
  das vorhandene `GET /api/stamm` (`src/index.js:585`). Kein DDL, nur eine
  Datenzeile, die Casimir einspielt:

```sql
-- Nur DATEN, kein DDL. Vorher prüfen, ob der Schlüssel schon existiert:
SELECT schluessel FROM stamm WHERE schluessel = 'lagerorte';
-- erwartete Ausgabe: keine Zeile
```

```sql
INSERT INTO stamm (schluessel, wert, geaendert, wer) VALUES (
 'lagerorte',
 '[{"id":"keller","t":"Weinkeller","zaehlbar":true},
   {"id":"lager","t":"Getränkelager","zaehlbar":true}]',
 1758067200000, 'Casimir');
-- erwartete Ausgabe: success true, rows_written 1, rows_read 0
-- Gegenprobe:
SELECT schluessel, length(wert) FROM stamm WHERE schluessel='lagerorte';
-- erwartete Ausgabe: eine Zeile, length > 0
-- Und: der Wert MUSS gültiges JSON sein — /api/stamm ruft JSON.parse
-- auf jede Zeile auf (src/index.js:588); ein Tippfehler im Wert legt
-- den Endpunkt für ALLE Schlüssel lahm.
```

Der Rest ist Code: Schlüsselung auf `artikel|ort` (B1), ein Zählort-Schritt
in `index.html`, die Differenzanzeige und die Backoffice-Zeile.

## 1.4 Feature-Flag

Weil es keine Migration gibt, hängt das Flag nicht an einer Spalte,
sondern an einer **Fähigkeit**, die der Worker selbst feststellt:

* `GET /api/stamm` gibt zusätzlich `_module` zurück, ein Objekt aus
  Wahrheitswerten. `keller_lager` ist genau dann `true`, wenn (a) die
  Stammzeile `lagerorte` existiert **und** (b) der Worker auf `artikel|ort`
  schlüsselt (das ist mit dem Code ausgeliefert, also implizit wahr).
* Fehlt die Zeile `lagerorte`, ist `_module.keller_lager` falsch: Die App
  zeigt keinen Zählort-Schritt, die Kellerzählung ist Wort für Wort die von
  heute, es wird ausschließlich `ort='keller'` gebucht, und das Backoffice
  zeigt die Ansicht „Getränkelager" nicht. **Nichts am bestehenden Weg
  ändert sich.**
* Die App merkt sich die zuletzt online gesehenen Flags in
  `hh_module_v1`; **Vorgabe ist „aus"**. Ein Gerät, das nie online ein
  eingeschaltetes Modul gesehen hat, schaltet es im Keller nicht selbst
  ein. Ein Gerät, das es gesehen hat, darf offline weiterarbeiten.
* Casimir kann ein Modul jederzeit ohne Deploy wieder ausschalten, indem
  er die Stammzeile entfernt oder in ihr `"aus":true` setzt. Das ist die
  Handbremse.
* Umgekehrt gilt die Reihenfolge: **erst B1 im Code, dann die Stammzeile.**
  Andersherum zählt jemand das Lager, und die Zählung überschreibt den
  Weinanker.

## 1.5 Entscheidungen für Casimir

**a) Wie viele Orte führen einen Bestand?**
· Option 1: zwei — Weinkeller und Getränkelager (Entscheidung Nr. 14,
Option 2). Folge: Getränke bekommen endlich einen Anker, „Nachbestellen"
kann Getränke mitführen, der Zählaufwand steigt um einen Gang ins
Getränkelager.
· Option 2: einer, wie heute. Folge: Getränkezahlen bleiben Fortschreibung
ohne Anker; das Backoffice muss das so sagen.
· Option 3: zusätzlich die Bar. Folge: jeder Ausschank müsste gebucht
werden — der Z-Bericht käme in den Bestand.
→ **Empfehlung: Option 1.** Option 3 ist Phase C.

**b) Wie oft wird das Getränkelager gezählt?**
· Jede Kellerzählung mitzählen / monatlich / nur zum Monatsende.
Folge: Je seltener, desto länger läuft ein Fehler unbemerkt mit; je öfter,
desto eher wird geschludert und die Zahl ist schlechter als keine.
→ **Empfehlung: monatlich, mit dem Monatsletzten als festem Termin** — und
im Backoffice steht das Datum der letzten Lagerzählung neben jeder
Getränkezahl. Antwort gehört ins Team (`review/INPUT-TEAM.md` ist bei
„Lagerorte" und „Laufweg" noch leer).

**c) Was passiert mit der Differenz einer Zählung?**
· Option 1: anzeigen, gebucht wird die Zählung (append-only, eine Zeile).
· Option 2: zusätzlich eine eigene Journalzeile „Inventurdifferenz"
(`art='korrektur'`), damit der Schwund als Bewegung auswertbar ist.
Folge: doppelte Buchung derselben Tatsache — Zählung *und*
Differenzzeile —, die jede spätere Summe verdoppelt, wenn sie jemand
mitzählt.
→ **Empfehlung: Option 1.** Die Differenz ist eine Auswertung
(Soll aus dem Journal minus gezählt), keine Buchung. Sie wird gerechnet,
nicht gespeichert.

---

# Modul 2 · WARENEINGANG

## 2.1 Zweck

Der Lieferant stellt die Kisten in den Keller und legt den Lieferschein
darauf. Wer sie einräumt, hat zwei Aufgaben in einer: den Bestand erhöhen
und **prüfen, ob geliefert wurde, was auf dem Schein steht**. Heute kann
die App nur das erste — sie nimmt Positionen mit Kisten und Kistengröße
auf, rechnet in Flaschen um und bucht `eingang` (`src/index.js:307–312`).
Der Lieferschein selbst kommt nirgends vor: keine Nummer, kein Lieferant,
keine Abweichung. Wenn zwei Wochen später die Rechnung kommt, gibt es
nichts, woran man sie hält, und eine Fehlmenge in der Lieferung ist im
Tool nicht von Schwund im Keller zu unterscheiden — sie sieht am
Monatsende genauso aus. Dazu die Umrechnung: Die Kistengröße steht heute
fest im Quelltext (`PLAN.kiste`, nur `w003:12`,
`public/index.html:1348`); jede andere Größe muss die Person im Keller von
Hand eintippen, und niemand außer dem Programmierer kann sie pflegen. Eine
falsche Kistengröße halbiert oder verdoppelt den Zugang still — genau der
Fehler, der in Runde 5 gefunden wurde (`kg` statt `kistengr`).

## 2.2 Datenfluss

**Was heute schon steht:**

| Schritt | Ort im Code | Stand |
|---|---|---|
| Positionen aufnehmen (Wein, Jahrgang, Kisten, Kistengröße) | `public/index.html:2871 ff.`, `:2881` | **steht** |
| Neuer Wein als Position `__neu` mit Stammdatenfeldern | `public/index.html:2890 ff.` | steht, **wird nicht gebucht** (kein Artikel) |
| Jahrgänge prüfen (`jok`, `jneu`), Einräumen (`ein`) | `public/index.html:2917`, `:2948` | steht, **nur im Protokoll** |
| Getränkelieferung `gent` → `eingang @lager` | `src/index.js:315` | **steht** (seit Runde 5 mit richtigem Vorzeichen) |
| Weinlieferung → `eingang @keller`, Flaschen = Kisten × `kistengr` | `src/index.js:307–312` | **steht** |
| Gegenbuchung bei Korrektur nach dem Abschluss | `src/index.js:296–308` | **steht** |
| Zweite Lieferung am selben Tag | `public/index.html:2230` | **kaputt (B2)** |
| Lieferant, Lieferscheinnummer | — | **fehlt** |
| Abweichung zum Lieferschein (fehlt / zu viel / Bruch bei Anlieferung) | — | **fehlt** |
| Einzelflaschen außerhalb ganzer Kisten | — | **fehlt** (nur über Kistengröße 1 zu tricksen) |
| Gebindegrößen pflegbar | `PLAN.kiste` im Quelltext | **fehlt in der Datenbank** |
| Wareneingang im Backoffice sichtbar | „Speicher" zeigt `—` | **fehlt** (Backlog Runde 5, zwei Zeilen) |

**Was dazukommt:**

1. **Kopf der Lieferung, vor den Positionen:** Lieferant (Liste aus dem
   Stammdatum, freie Eingabe erlaubt) und Lieferscheinnummer. Beides ein
   Feld, beides freiwillig — aber die Abschlussseite sagt, wenn es fehlt
   („ohne Lieferschein, Rechnungsprüfung nicht möglich"), statt es zu
   erzwingen. Ein Pflichtfeld im Keller senkt die Meldequote (dieselbe
   Erfahrung wie bei der Sonderentnahme, Entscheidung Nr. 7).
2. **Je Position:** Kisten × Gebinde **+ Einzelflaschen**, daneben die
   gerechnete Flaschenzahl, unverändert sichtbar wie heute
   („24 Flaschen · 12er Kisten"). Die Gebindegröße kommt vorbelegt aus dem
   Stammdatum und bleibt änderbar; wird sie geändert, merkt sich das
   Backoffice den Vorschlag zur Aufnahme in die Stammdaten (nicht
   automatisch, siehe 2.5-c).
3. **Abweichung zum Lieferschein**, eine optionale Zeile je Position:
   `geliefert` (was tatsächlich dasteht) und `laut Schein`. Sind beide
   gleich, ist nichts zu tun. Weichen sie ab, ein Grund aus drei Knöpfen:
   *fehlt · zu viel · Bruch bei Anlieferung*.
   **Gebucht wird immer `geliefert`** — der Bestand ist, was im Keller
   steht. Die Abweichung ist eine Notiz an der Buchung und im Backoffice
   die Zeile „Reklamation offen".
4. Abschluss → `PUT /api/vorgang/ware_<tag>[_<lfd>]` (siehe 2.5-a),
   `ereignisseAbleiten` bucht wie heute `eingang` mit `ort='keller'`
   bzw. `'lager'`, zusätzlich mit `notiz` = `"LS <nr> · <lieferant>"`.
5. Backoffice: Ansicht **„Eingänge"** — je Zeitraum eine Zeile je
   Lieferung (Datum, Lieferant, LS-Nr., Positionen, Flaschen), aufklappbar
   auf die Positionen, dazu eine eigene kurze Liste „Abweichungen zum
   Lieferschein, noch nicht geklärt". Und die Korrektur derselben Lieferung
   erscheint als **eigene Zeile mit Vorzeichen**, nicht als stille
   Änderung der alten (B3).

## 2.3 Was es am Schema additiv braucht

**Nichts — in der empfohlenen Fassung.** Und das ist die bessere Antwort.

* Lieferant, Lieferscheinnummer, Einzelflaschen, Abweichung und Grund sind
  Felder **im Vorgangsobjekt** (`daten`, `TEXT NOT NULL`,
  `docs/live-schema.sql:59`). Der Vorgang ist ein vollständiger Zustand;
  neue Felder darin kosten kein DDL und keine Migration. Das Backoffice
  liest sie über `GET /api/vorgaenge`, das sie ohnehin flach durchreicht
  (`src/index.js:161`).
* Der **Beleg an der Buchung** passt in `ereignis.notiz` (`TEXT`,
  nullable, `docs/live-schema.sql:76`). Die Spalte existiert, wird von
  `SQL_EREIGNIS` (`src/index.js:234`) heute nur nicht befüllt — dort ein
  zehnter Bindungsplatz, mehr nicht. Damit steht der Lieferschein an der
  Journalzeile, ohne dass eine Spalte entsteht.
* Die **Gebindegrößen** gehören in `stamm`, wie die Lagerorte:

```sql
SELECT schluessel FROM stamm WHERE schluessel = 'gebinde';
-- erwartete Ausgabe: keine Zeile
INSERT INTO stamm (schluessel, wert, geaendert, wer)
VALUES ('gebinde', '{"std":6,"w003":12}', 1758067200000, 'Casimir');
-- erwartete Ausgabe: success true, rows_written 1
```

**Was NICHT ins Schema kommt und auch nicht ins Tool:** Einkaufspreise,
Rechnungen, Lieferantenkonten. Sobald ein Preis in der Datenbank steht,
ist die nächste Frage die Bewertung des Bestands, und dann baut man eine
Buchhaltung. Der Wert einer Differenz gehört in die Auswertung der Leitung
(Phase C, notfalls in einer Tabellenkalkulation), nicht in die Erfassung im
Keller.

**Nur falls Entscheidung 2.5-b anders ausfällt** (Eingänge je Lieferant
auswertbar **aus dem Journal**, nicht aus den Vorgängen), wäre eine
additive Spalte nötig — dann exakt dieselbe Form wie Migration 003 unten,
mit `beleg` statt `grund`. Empfohlen wird sie nicht.

## 2.4 Feature-Flag

* `_module.wareneingang_beleg` ist wahr, wenn die Stammzeile `gebinde`
  existiert. Ohne sie: Der Wareneingang ist der von heute — Kisten,
  Kistengröße aus `PLAN.kiste`, kein Lieferschein, kein Abweichungsfeld,
  kein „Eingänge"-Reiter im Backoffice.
* Alte Pakete aus der Offline-Reihe kennen die neuen Felder nicht. Der
  Worker liest sie mit `||`-Vorgabe; eine fehlende Lieferscheinnummer ist
  kein Fehler, sondern eine leere Notiz. Umgekehrt darf ein Gerät mit
  neuen Feldern gegen einen alten Worker senden, ohne dass etwas
  verlorengeht: Unbekannte Felder im Vorgangs-JSON werden gespeichert und
  wieder ausgeliefert, sie fallen nur aus der Ableitung heraus.
* Da kein DDL im Spiel ist, gibt es hier keinen Zustand „App schreibt in
  eine Spalte, die es nicht gibt". Genau deshalb ist die Fassung ohne
  Migration auch die sicherere.

## 2.5 Entscheidungen für Casimir

**a) Zwei Lieferungen an einem Tag — wie wird der Schlüssel eindeutig?**
(Befund B2, betrifft ebenso Sonderentnahme und Nachfüllen.)
· Option 1: laufende Nummer im Schlüssel, `ware_<tag>_2`, vergeben beim
Neubeginn, wenn für heute schon ein abgeschlossener Vorgang existiert.
Folge: kleine Änderung an `schluesselVon`/`start`
(`public/index.html:1556`, `:2230`), das Format `<modus>_<tag>` bleibt
lesbar, der 409-Wächter und die Idempotenz bleiben unberührt.
· Option 2: alles in einen Vorgang je Tag, zweite Lieferung als weitere
Positionen. Folge: Wer den Vorgang abgeschlossen und archiviert hat, muss
ihn wieder aufmachen — und auf zwei Geräten gibt das den Konfliktdialog,
nicht zwei Lieferungen.
· Option 3: so lassen. Folge: **die erste Lieferung verschwindet aus dem
Bestand.** Nicht vertretbar.
→ **Empfehlung: Option 1**, und zwar vor jedem anderen Phase-B-Punkt.

**b) Wo lebt die Lieferscheinnummer?**
· Option 1: im Vorgang, plus als Text in `ereignis.notiz` (keine
Migration). Folge: Rechnungsprüfung geht, „alle Eingänge von Lieferant X"
rechnet das Backoffice aus den Vorgängen.
· Option 2: eigene Spalte `ereignis.beleg` (eine additive ALTER-Zeile).
Folge: gruppierbar direkt im Journal; dafür eine Spalte, die in 95 % der
Zeilen leer ist.
→ **Empfehlung: Option 1.** Der Beleg wird nachgeschlagen, nicht
gruppiert.

**c) Wer darf Gebindegrößen ändern?**
· Option 1: Keller ändert für die eine Lieferung, Leitung pflegt das
Stammdatum. · Option 2: Keller ändert dauerhaft.
Folge bei 2: Ein Vertipper im Keller ändert die Umrechnung aller künftigen
Lieferungen dieses Artikels, rückwirkend unsichtbar.
→ **Empfehlung: Option 1.** Das Backoffice zeigt „Marinus hat am 16.09.
für Ott 12 statt 6 erfasst — Stammdaten anpassen?" als Vorschlag mit einem
Knopf. (Hängt an Entscheidung Nr. 6, wer Stammdaten setzen darf.)

---

# Modul 3 · SONDERENTNAHME

## 3.1 Zweck

Eine Flasche verlässt den Keller außer der Reihe: Die Küche holt Weißwein
für den Fond, der Spätdienst nimmt ein Personalgetränk, beim Einräumen
zerbricht eine Flasche, das Team verkostet den neuen Jahrgang, aufs Zimmer
geht eine Flasche als Einladung. **Fünf Vorgänge, fünf verschiedene
Behandlungen im Wareneinsatz** — und heute landen alle fünf im selben
Topf, weil der Grund im optionalen Freitextfeld am Ende steht, das nach
dem Service niemand mehr ausfüllt (Entscheidung Nr. 7). Für den F&B-Anteil
heißt das: Der Wareneinsatz Getränke ist zu hoch ausgewiesen, der
Personalaufwand und der Wareneinsatz Küche zu niedrig, Marketing taucht
gar nicht auf, und der Bruch — die einzige Zahl, die man wirklich abstellen
kann, weil sie auf ein Verhalten zeigt — ist nicht messbar. Der Grund ist
bei einer Sonderentnahme nicht die Nebensache, er ist die Sache.

## 3.2 Datenfluss

**Was heute schon steht:**

| Schritt | Ort im Code | Stand |
|---|---|---|
| Modus `nach`, Wein antippen (`d.ent`), Getränke (`d.gent`) | `public/index.html:1420`, `blank` `:1493` | **steht** |
| Ableitung `entnahme @keller` (Wein) und `entnahme @lager` (Getränk) | `src/index.js:279`, `:317` | **steht** |
| Freitext-Notiz am Ende | `public/index.html:3746` | steht, **in „Speicher" nicht angezeigt** (Backlog Runde 5) |
| Menügruppe „Außer der Reihe" statt „Notfall" | `public/index.html:2025` | **steht** (Runde 1) |
| Grund als Pflichtschritt | — | **fehlt** |
| Grund im Journal | — | **fehlt** |
| Auswertung nach Grund | — | **fehlt** |
| Zwei Sonderentnahmen an einem Tag | `public/index.html:2230` | **kaputt (B2)** |

**Was dazukommt:**

1. Kachel antippen → **zuerst** die Frage „Wofür?", fünf Knöpfe, ein
   Tipper, einhändig, keine Tastatur: **Küche · Personal · Bruch ·
   Verkostung/Gast · Zimmer** (Wortlaut aus Entscheidung Nr. 7,
   Reihenfolge mit dem Team abstimmen).
2. Danach zählen wie heute. Die Notiz bleibt optional, für den Sonderfall
   („Glas beim Ausschank gebrochen, Tisch 12").
3. **Ein Grund je Entnahme, nicht je Tag.** Wer zwei Gründe an einem Tag
   hat, macht zwei Vorgänge — das setzt B2/2.5-a voraus. Der Grund steht im
   Vorgang **und** an jeder Journalzeile dieses Vorgangs.
4. Abschluss → `PUT /api/vorgang/nach_<tag>_<lfd>`; `ereignisseAbleiten`
   bucht `entnahme` mit `grund`.
5. Backoffice: **„Sonderentnahmen"** je Zeitraum, nach Grund gruppiert,
   Flaschen (und später Wert), dazu jede Zeile mit Wer/Wann/Notiz. Und im
   Mittagsblick: die Sonderentnahmen von gestern in einer Zeile, nach
   Grund, weil das die Zahl ist, die die Leitung morgens braucht, um zu
   fragen.

**Zahlenlogik, zwei Fallen, die zwingend in die Spezifikation gehören:**

* **Die Marke der Gegenbuchung muss den Grund enthalten.**
  `ereignisseAbleiten` faltet seine Zeilen heute auf
  `marke = art|artikel|ort` (`src/index.js:288`). Hat ein Vorgang zwei
  Zeilen mit gleichem Artikel und Ort, aber verschiedenem Grund, fallen
  sie zu einer zusammen; die Korrekturrechnung vergleicht dann Äpfel mit
  der Summe aus Äpfeln und Birnen und bucht eine Differenz, die es nicht
  gibt. Sobald `grund` existiert: `marke = art|artikel|ort|grund`. Dasselbe
  gilt für die Rückfrage `SELECT … FROM ereignis WHERE vorgang = ?1`
  (`:311`), die `grund` mitlesen muss.
* **Doppelzählung mit der Kasse.** Eine Flasche, die aufs Zimmer verkauft
  oder als „Welcomedrink" über die Kasse gebongt wird, steht bereits im
  Z-Bericht — im Fixture `zbericht-37-extended.csv` als Rabatt
  „Welcomedrink 3 · −52,00" und als 0-€-Positionen, die laut Regel 7 als
  Verbrauch zählen. Wird dieselbe Flasche zusätzlich als Sonderentnahme
  „Zimmer" gemeldet, ist sie zweimal verbraucht.
  → Regel, ein Satz in der App über den fünf Knöpfen: **„Was über die
  Kasse läuft, wird hier nicht gemeldet."** `Zimmer` meint die Einladung
  ohne Bon, nicht die verrechnete Flasche.

## 3.3 Was es am Schema additiv braucht

**Eine additive Spalte und ein Index — die einzige Migration, die Phase B
nach diesem Konzept braucht.**

`migrations/003_ereignis_grund.sql` (Nummer frei, `001` ist vergeben):

```sql
-- Zeile 1
ALTER TABLE ereignis ADD COLUMN grund TEXT;
```
*Erwartete Ausgabe der D1-Konsole:* keine Ergebniszeilen, Meldung
„Query executed successfully", `rows_read 0`, `rows_written 0`. SQLite
fügt eine nullable Spalte am Ende an, ohne die Tabelle neu zu schreiben;
alle bestehenden Zeilen bekommen `NULL`. Kein DROP, kein Umbau, das
Journal bleibt append-only.

```sql
-- Zeile 2
CREATE INDEX IF NOT EXISTS i_ereignis_grund ON ereignis(grund, tag) WHERE grund IS NOT NULL;
```
*Erwartete Ausgabe:* keine Ergebniszeilen, „Query executed successfully".
Der Teilindex bleibt leer, solange nichts gebucht ist, und kostet damit
nichts. Er trägt die Auswertung „Sonderentnahmen je Grund und Zeitraum".

```sql
-- Zeile 3, Gegenprobe
PRAGMA table_info(ereignis);
```
*Erwartete Ausgabe:* **12 Zeilen** (heute 11: id, ts, tag, art, quelle,
vorgang, artikel, ort, menge, wer, notiz). Die zwölfte:
`cid 11 · name grund · type TEXT · notnull 0 · dflt_value NULL · pk 0`.

```sql
-- Zeile 4, Gegenprobe
SELECT count(*) AS zeilen, count(grund) AS mit_grund FROM ereignis;
```
*Erwartete Ausgabe:* eine Zeile, `mit_grund = 0`, `zeilen` = die bisherige
Zeilenzahl, **unverändert**.

Erlaubte Werte (`kueche`, `personal`, `bruch`, `verkostung`, `zimmer`):
**bewusst ohne CHECK-Bedingung.** Eine CHECK-Bedingung lässt sich in
SQLite nachträglich nicht ohne Tabellenumbau ändern — und ein sechster
Grund ist wahrscheinlicher als ein Tippfehler im Worker, der die Werte
ohnehin aus einer festen Liste setzt. `ereignis.quelle` steht live aus
demselben Grund ohne CHECK da (`docs/live-schema.sql:26`).

## 3.4 Feature-Flag

Hier hängt das Flag an einer echten Spalte, und deshalb gilt die harte
Regel: **Die App darf nicht in eine Spalte schreiben, die es vielleicht
nicht gibt.** Ein `INSERT` auf `grund` ohne Migration wirft eine Ausnahme;
weil Vorgang und Journal in **einem** `batch` hinausgehen
(`src/index.js:225`), nimmt D1 den ganzen Abschluss zurück — der
Kellermitarbeiter drückt „Fertig" und nichts ist gespeichert, wieder und
wieder, bis der Ausgang aufgibt. Das ist der teuerste Fehlerfall, den
dieses Modul haben kann.

Absicherung in drei Lagen:

1. **Der Worker stellt selbst fest, was die Datenbank kann.** Einmal je
   Isolat `PRAGMA table_info(ereignis)` lesen, Ergebnis in einer
   Modulvariablen halten, daraus `_module.sonderentnahme_grund`. Kein
   Vertrauen auf eine Einstellung, die jemand von Hand setzen muss.
2. **Rückfallweg statt Absturz.** Ist die Spalte nicht da, schreibt der
   Worker den Grund als Vorspann in `ereignis.notiz`
   (`"[bruch] Glas beim Einräumen"`). Der Bestand stimmt in jedem Fall,
   nur die Gruppierung im Backoffice fällt weg. Nichts geht verloren, und
   die Reihenfolge Migration/Deploy wird unkritisch.
3. **Die App zeigt die fünf Knöpfe erst, wenn `_module` es sagt**, und
   merkt sich das in `hh_module_v1` (Vorgabe: aus). Ohne Flag ist die
   Sonderentnahme Wort für Wort die von heute, mit der optionalen Notiz.

Das Backoffice zeigt die Ansicht „Sonderentnahmen nach Grund" nur bei
eingeschaltetem Modul und schreibt darüber, ab wann gruppiert wird —
Zeilen davor haben keinen Grund und dürfen nicht als „ohne Grund"
aussehen, als hätte jemand etwas versäumt. „Vor dem 01.10. wurde der Grund
nicht erfasst" ist die ehrliche Zeile.

## 3.5 Entscheidungen für Casimir

**a) Fünf Gründe oder sechs?**
· Option 1: die fünf aus Entscheidung Nr. 7 (Küche · Personal · Bruch ·
Verkostung/Gast · Zimmer). · Option 2: „Verkostung/Gast" in *Verkostung
(Team, Schulung)* und *Gast (Kulanz)* trennen. Folge: Sie gehören
buchhalterisch in verschiedene Töpfe (Werbung/Schulung gegen
Umsatzschmälerung); sechs Knöpfe passen in zwei Reihen zu drei, kosten
also keine Bedienbarkeit.
→ **Empfehlung: Option 1 starten**, die Notiz trägt den Unterschied. Nach
einem Monat zeigt die Auswertung, wie groß der gemischte Topf ist; ist er
groß, wird er getrennt. Ein Grund, den man nach vier Wochen Daten einführt,
ist besser als einer, den man errät.

**b) Grund als Spalte oder nur im Vorgang?**
· Option 1: Spalte `ereignis.grund` (Migration 003). Folge: Der Grund
klebt an der Buchung, ist im Journal auswertbar und überlebt jede
Überschreibung des Vorgangs. · Option 2: nur im Vorgangs-JSON, keine
Migration, das Backoffice gruppiert aus `/api/vorgaenge`. Folge: Der Grund
hängt am Dokument, nicht an der Buchung; wird der Vorgang überschrieben
(B2!), ist er weg, und der Wochenbrief im Worker, der aus dem Journal
rechnet, sieht ihn nie.
→ **Empfehlung: Option 1.** Es ist die einzige Stelle in Phase B, an der
sich eine Schemaänderung wirklich lohnt: Die Auswertung nach Grund ist der
ganze Zweck des Moduls.

**c) Darf eine Sonderentnahme nachträglich umgewidmet werden?**
(„Das war kein Bruch, das war eine Verkostung.")
· Option 1: ja, als neue Zeilen — Gegenbuchung auf den alten Grund,
Neubuchung auf den neuen. Folge: sauber append-only, im Backoffice sind
beide Zeilen zu sehen, die Summe stimmt. · Option 2: nein.
→ **Empfehlung: Option 1**, aber nur durch die Leitung im Backoffice und
mit sichtbarer Spur. Vorbedingung ist wieder die Marke mit `grund`
(3.2), sonst hebt die Umwidmung die Menge auf, statt sie zu verschieben.

---

# Reihenfolge

**Stufe 0 — vor jedem Modul, Code, keine Migration.**
1. **B1:** Bestand auf `artikel|ort` schlüsseln, im Worker
   (`src/index.js:373`) **und** im Backoffice
   (`public/leitung.html`, `bestand()`) — besser noch: das Backoffice liest
   `/api/bestand`, dann gibt es die Regel nur einmal. Ohne das darf keine
   zweite Zählstelle entstehen.
2. **B2:** eindeutiger Vorgangsschlüssel bei mehreren Vorgängen desselben
   Modus am selben Tag (2.5-a). Ohne das löscht jede zweite Lieferung und
   jede zweite Sonderentnahme die erste aus dem Bestand.
3. **B3:** eine Prüfung, die eine nach unten korrigierte Entnahme durch
   jede neue Auswertung schickt und nachweist, dass die Summe 0 und nicht
   2 ergibt.
*Warum zuerst:* Alle drei sind Fehler in der Zahl, nicht fehlende
Funktionen. Ein Modul auf einer falschen Rechnung zu bauen heißt, die
falsche Zahl schöner anzuzeigen.

**Stufe 1 — SONDERENTNAHME.**
Kleinster Eingriff, größter Ertrag: ein Schritt mit fünf Knöpfen, eine
additive Spalte, eine Auswertung. Sie ist die einzige der drei, die
**heute schon falsche betriebswirtschaftliche Zahlen liefert** (alles im
Wareneinsatz Getränke), und sie braucht keine Änderung an der Bestands-
mechanik. Außerdem ist sie der beste Prüfstein für den Feature-Flag-Weg
mit echter Migration, bevor größere Module daran hängen.

**Stufe 2 — WARENEINGANG.**
Baut auf B2 auf, braucht keine Migration, und macht die Eingangsseite der
Gleichung erst prüfbar (Lieferschein). Vor der Kellerzählung, weil eine
Zählung nur so viel wert ist wie der Zugang, gegen den sie sich rechnet:
Wer im Oktober zählt und im September zwei Lieferungen verloren hat,
findet Schwund, den es nie gab.

**Stufe 3 — KELLER / Lagerorte.**
Zuletzt, weil es die Stufen 1 und 2 voraussetzt (der Anker ist nur so gut
wie die Bewegungen davor) und weil es die einzige der drei ist, die eine
**Antwort aus dem Team** braucht: wie oft das Getränkelager gezählt wird
und wie die Lagerorte im Haus wirklich heißen
(`review/INPUT-TEAM.md`, beide Zeilen leer).

**Was in Phase C gehört — ausdrücklich nicht in B:**
* **Die Bar als Lagerort mit Bestand.** Setzt voraus, dass der Ausschank
  aus dem Z-Bericht als Abgang gebucht wird; damit kommt die Kasse in den
  Bestand, mit Stornos, Rabatten und 0-€-Zeilen. Der Nutzen ist ein
  genauerer Schwundort, der Preis ist die halbe Komplexität einer
  Warenwirtschaft.
* **Werte statt Flaschen** (Einstandspreise, bewerteter Schwund,
  Wareneinsatz in Prozent). Erst wenn die Mengen ein Quartal lang
  gestimmt haben.
* **Bestellwesen** (bestellt gegen geliefert). Es gibt heute keine
  Bestellung im Tool; ohne sie ist „Fehlmenge zum Lieferschein" das
  Höchste, was ehrlich geht.
* **Storno- und Rabattbehandlung** im Abgleich Verkauf ↔ Fassung
  (Projektanleitung §8). Im Fixture stehen 1 Storno (4,20 €,
  „Bedienerfehler") und 3 Welcomedrinks (−52,00 €) — beide erzeugen
  Differenzen, die heute wie Schwund aussehen.
* **Umbuchungen zwischen Lagerorten** als eigene Buchungsart.
* **Entscheidung Nr. 15** (Betriebstag statt Zeitstempel als Basis der
  Zählung). Fachlich richtig, aber es bewegt Zahlen, die heute schon
  angezeigt werden — eigener Zug, nicht nebenbei in einem Modul.

---

# Anhang · Ein Zeitraum durchgerechnet

Mit `tests/fixtures/zbericht-37-extended.csv` (Z-Bericht Nr. 37,
Betriebstag 15.09. 23:11 – 16.09. 23:26, Kostenstelle Haus Hirt).
**Hinweis:** `tests/fixtures/` enthält heute **nur diesen einen
Z-Bericht**; die in `CLAUDE.md` genannten Zählungen liegen dort nicht.
Die Ausschankzahlen unten sind deshalb aus dem echten Bericht gerechnet,
die Fassungsbewegungen sind als typischer Fall gesetzt und als solche
gekennzeichnet.

**Ausschank laut Z-37, in Flaschen zu 0,75 l** (Positionsblock, doppelte
Positionsnamen summiert — Regel 7):

| Position | Anzahl | Menge | Flaschen |
|---|---|---|---|
| Prosecco, Serena 0,1 l | 6 | 0,600 l | 0,80 |
| Prosecco, Serena 0,75 l | 1 | 0,750 l | 1,00 |
| GV Leindl Langenlois 1/8 l | 4 | 0,500 l | 0,67 |
| CH Gesellmann 1/8 l (2 + 1, zwei Zeilen) | 3 | 0,375 l | 0,50 |
| ZW Glatzer Rubin Carnuntum 1/8 l | 2 | 0,250 l | 0,33 |
| MU Muster, Gelber Muskateller 0,75 l | 1 | 0,750 l | 1,00 |
| BF Gesellmann Gols 1/8 l | 1 | 0,125 l | 0,17 |
| NW Heinrich, Naked Red 1/8 | 1 | 0,125 l | 0,17 |
| RS Dürnberg, Blanc de Noir 1/8 | 1 | 0,125 l | 0,17 |
| **Summe Wein** | **20** | **3,600 l** | **4,80** |

**Rechnung für `serena` (Prosecco), Zeitraum 14.–17.09., Ort `keller`:**

| Bewegung | Quelle | Menge |
|---|---|---|
| Anfangsbestand, Kellerzählung 14.09. | `zaehlung @keller` | 24 |
| Wareneingang 16.09., 2 Kisten à 6 | `eingang @keller` | +12 |
| Tagesfassung 15.09. (Bar Soll 6 + Backup 2) | `entnahme @keller` | −3 |
| Tagesfassung 16.09. | `entnahme @keller` | −2 |
| Sonderentnahme 16.09., **Bruch** | `entnahme @keller`, `grund='bruch'` | −1 |
| **Sollbestand 17.09.** | | **30** |
| Endzählung 17.09. | `zaehlung @keller` | 29 |
| **Differenz** | | **−1 · Schwund** |

Gegenprobe zur Kasse: Am 16.09. wurden 2 Flaschen aus dem Keller geholt,
der Z-Bericht weist 1,80 Flaschen Ausschank aus. Die Differenz von 0,20
Flaschen (150 ml) ist der Anbruch an der Bar und **kein Schwund** — sie
muss sich über die Tage ausgleichen. Genau deshalb ist die Bar in Phase B
Verbrauchsstelle und kein Lagerort: Eine Zählung, die 0,2 Flaschen
auflösen müsste, gibt es nicht.

**Gegenprobe Vorzeichen (Befund B3).** Die Sonderentnahme wird am 17.09.
auf 0 korrigiert (es war doch kein Bruch, die Flasche stand hinter der
Kiste). `ereignisseAbleiten` schreibt eine zweite Zeile
`art='entnahme', menge=−1, quelle='vorgang-korrektur'`.

* `bestand()` rechnet `30 − 1 − (−1) = 30` → Sollbestand 30, Differenz zur
  Zählung 29 wäre −1. Richtig.
* Eine Schwundliste, die `SUM(menge) WHERE art='entnahme' AND
  grund='bruch'` **vorzeichenrichtig** summiert: `1 + (−1) = 0` Flaschen
  Bruch. Richtig.
* Dieselbe Liste mit `SUM(ABS(menge))`: **2 Flaschen Bruch**, an einem
  Tag, an dem keine zerbrochen ist. Das ist der Fehler, den Phase B nicht
  machen darf.

**Getränkelager, Entscheidung Nr. 14, am Beispiel Cola Zero** (Z-37:
4 × 0,35 l verkauft):

| | ohne Zählung (heute) | mit Zählung `@lager` (Option 2) |
|---|---|---|
| Lieferung 48 Flaschen | im Journal | im Journal |
| Entnahmen ins Lokal | im Journal | im Journal |
| `/api/bestand` | **liefert nichts** (`basis == null`, `src/index.js:387`) | 60 + 48 − 24 = 84 Soll |
| Zählung 30.09. | — | 80 → **−4 Flaschen Differenz** |
| Leitung sieht | nichts, und weiß nicht, dass sie nichts sieht | eine Zahl und ihre Differenz |

Das ist der ganze Inhalt von Entscheidung Nr. 14: Nicht „fehlt eine
Funktion", sondern „eine Hälfte des Sortiments hat keinen Anker, und
niemand sieht ihr das an."
