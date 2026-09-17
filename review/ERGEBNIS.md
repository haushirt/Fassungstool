# Ergebnis

Diese Datei ist die Beschreibung des Pull Requests `v2-review` → `main`. Sie wird am Ende einer Phase gefüllt, nicht laufend.

## Was sich geändert hat

**Das Tool schreibt zum ersten Mal wirklich in die Datenbank.** Der Worker
hat gegen Spalten geschrieben, die es in der laufenden D1 nicht gibt
(`vorgang.art`, `vorgang.person`, `vorgang.ts`). Jede Fassung endete in
einem Fehler, den niemand sah: Die App legte das Paket in ihre Reihe und
versuchte es weiter. `vorgang` und `ereignis` waren leer, keine einzige
Fassung ist je angekommen. Der Worker ist jetzt an das dokumentierte
Live-Schema angepasst — nicht umgekehrt, es wird keine Tabelle geändert.

**Die Anmeldung nimmt längere Codes an.** Bis v21 hörte jedes Codefeld nach
vier Ziffern auf, und die App schickte den Code bei der vierten Ziffer von
selbst los. Wer einen sechsstelligen Code bekommen hätte, wäre nicht mehr
hereingekommen: vier Ziffern raus, „Code stimmt nicht", Feld leer — nach
zehn davon sperrt sich das Haus für eine Viertelstunde selbst aus. Jetzt
nehmen Anmeldung, Verwaltung und Freigabe sechs bis acht Ziffern,
abgeschickt wird auf eine Bestätigungstaste (✓, unten links im
Ziffernblock, leuchtet, sobald der Code lang genug ist). Der Worker vergibt
neue Codes nur noch mit sechs bis acht Ziffern; bestehende Codes gelten
weiter, bis sie ersetzt sind. **Das ist die Voraussetzung für Auflage 4
unten** — ohne diesen Stand lässt sich kein längerer Code vergeben.

Zwei Fehler in derselben Ecke sind dabei mitgegangen: Die Löschtaste des
Ziffernblocks hängte „undefined" an den Code statt die letzte Ziffer
wegzunehmen (`data-weg` steht ohne Wert in der Zeile, ein Wahrheitstest
darauf ist immer falsch) — wer sich vertippte, kam nicht mehr herein. Und
ein ersetzter Code blieb auf jedem Gerät liegen, das ihn einmal gesehen
hat, und kam dort ohne Netz weiter in die App; ein Gerät merkt sich jetzt
je Person genau einen Code, den zuletzt beim Server bestätigten.

**Sicherheit und Anmeldung.** Der vierstellige Verwaltungscode stand im
Klartext in der ausgelieferten `index.html` — er ist weg, Verwaltung und
Freigabe verlangen einen persönlichen Code, der sich auf diesem Gerät schon
einmal angemeldet hat. Die Anmeldesperre zählt zehn Fehlversuche je IP in
einer Viertelstunde und sagt, wie viele Versuche bleiben und ab wann es
wieder geht.

**Im Betrieb.** Der Keller-Schritt meldet nicht mehr „alle Kühlschränke
sind voll", wenn Bar und Restaurant gar nicht geprüft waren, sondern nennt
die ungeprüften Plätze und die Annahme dahinter. Der Satz zum überholten
Stand nennt den Vorgang beim Namen. Das Backoffice sagt in jeder Ansicht,
warum nichts dasteht, statt eine leere Tabelle zu zeigen.

**Der erste echte Z-Bericht liegt im Repo — und hat den Leser widerlegt.**
`tests/fixtures/zbericht-37-extended.csv` ist der anonymisierte Abschluss
Nr. 37 (Nacht vom 15. auf den 16.09.). Beim ersten Lauf las `parseZ`
daraus **106 Positionen mit 1345,75 Stück und 5166,70 €** statt 50 Zeilen
mit 145 Stück und 602,50 €: Steuersätze, Kellner, Zimmerbuchungen und
Warengruppen landeten als Getränke im Wareneinsatz. Der Grund ist die
Form, die niemand kannte — der echte Bericht eröffnet jede Tabelle mit
einer Spaltenüberschrift („Positionen | Anzahl | Betrag"), trennt seine
Teile mit Rauten statt Strichen, schreibt die Z-Nummer in zwei Felder und
seine Leerzeilen als vier leere Felder. Alles vier ist jetzt gelesen, der
Positionsblock wird beim Namen genommen, und die Summe wird gegen zwei
Summen des Berichts selbst geprüft.

**Der teuerste Einzelfund: „1/8 l" war acht Liter.** Der offene Wein heisst
im echten Bericht „GV Leindl Langenlois 1/8 l". Die Mengensuche griff auf
„8 l" und gab 8000 ml zurück statt 125 — Faktor 64, auf der halben
Weinkarte, und damit auf jeder Zahl, die Ausschank mit Fassung vergleicht.
Der nachgebaute Bericht schrieb „1/8" ohne Einheit und traf die Falle nie.
Mitbehoben: derselbe Fehler im Kern der Bezeichnung, der „GV Leindl
Langenlois 1/" stehen liess, sodass Glas und Flasche desselben Weins nie
zusammenfanden.

**Rabatt und Storno sind Verbrauch** (deine Vorgabe: die Ware ist in beiden
Fällen entnommen). Am Bericht nachgerechnet: Der Rabatt steckt bereits in
den Positionen — 602,50 − 52,00 Welcomedrink = 550,50 Umsatz, auf den
Cent. Für die Fassung ist nichts hinzuzuzählen; der Rabatt zieht allein am
Geld. Der Storno dagegen fehlt den Positionen (die 4,20 sind in den 602,50
nicht enthalten), und der Bericht nennt nur den Grund
(„Bedienerfehler"), nicht den Artikel. Diese eine Einheit geht deshalb als
Zahl mit hinaus — in die Antwort des Imports und in die Journalnotiz der
eingegangenen Mail —, statt lautlos zu fehlen und in der ersten
Kellerzählung als Schwund wieder aufzutauchen.

**Prüfgerüst.** `npm test` (195 Prüfungen) und `node tests/durchstich.cjs`
(35 Punkte) laufen ohne Netz und ohne Installation. Der Durchstich fasst
App und Worker gleichzeitig an, gegen eine Datenbank, die aus
`docs/live-schema.sql` aufgebaut ist — die Attrappe, die drei Runden lang
die falschen Spaltennamen bestätigt hat, ist gelöscht.

## Migrationen

<!--
Enthält der PR Migrationen, steht ganz oben im PR: "Vor dem Merge Migrationen einspielen".
Hier jede Migration Zeile für Zeile zum Einfügen in die D1-Konsole, jeweils mit erwarteter Ausgabe.

Beispielform:

### migrations/001_beschreibung.sql

| # | Zeile zum Einfügen | Erwartete Ausgabe |
|---|---|---|
| 1 | `CREATE INDEX ...;` | `Executed 1 command` |
-->

**In diesem Stand ist KEINE Migration nötig.** Der Code ist an das
vorhandene Schema angepasst worden, nicht umgekehrt (Regel 2 und 3). Was
hier steht, ist vorbereitet und **absichtlich nicht eingespielt**.

### migrations/001_mapping_rezept.sql — nur bei Bedarf, siehe OFFENE-ENTSCHEIDUNGEN Nr. 10

Nicht nötig für den aktuellen Stand. Der Worker lehnt Rezepturen mit einem
lesbaren 422 ab, solange die Spalte fehlt; alles andere läuft unverändert.

| # | Zeile zum Einfügen | Erwartete Ausgabe |
|---|---|---|
| 1 | `ALTER TABLE mapping ADD COLUMN rezept TEXT;` | `Executed 1 command` — 0 Zeilen gelesen, 0 geschrieben |
| 2 | `PRAGMA table_info(mapping);` (Kontrolle) | 7 Zeilen: `fremd, status, artikel, gebinde_ml, wer, angelegt, rezept` — die letzte mit `type=TEXT`, `notnull=0` |

Lokal gegen `docs/live-schema.sql` durchgespielt: bestehende Zeilen bleiben
stehen und bekommen `rezept = NULL`.

### Kontrolle des Schemas — erledigt, hier zum Nachschlagen

`docs/live-schema.sql` ist am 17.09. gezogen und anschliessend mit
`PRAGMA table_info` für **alle neun Tabellen** gegen die laufende D1
gegengelesen (Kopf der Datei, Commit `2ea053a`). Die Zeilen unten sind die
Gegenprobe, falls du sie noch einmal selbst sehen willst. Nur Lesen, kein
`INSERT`/`UPDATE`/`DELETE`:

| # | Zeile für die D1-Konsole | Erwartete Ausgabe |
|---|---|---|
| 1 | `PRAGMA table_info(vorgang);` | 13 Zeilen: `id, modus, branch, tag, wer, begonnen, geaendert, abgeschlossen, status, daten, schluessel, zaehlnr, geraet` |
| 2 | `PRAGMA table_info(ereignis);` | 11 Zeilen: `id, ts, tag, art, quelle, vorgang, artikel, ort, menge, wer, notiz` — `notiz` als einzige mit `notnull=0` |
| 3 | `PRAGMA table_info(fassungsliste);` | 9 Zeilen: `id, tag, z, kostenstelle, von_ts, bis_ts, importiert, wer, roh` |
| 4 | `PRAGMA table_info(fassungszeile);` | 7 Zeilen: `liste, rohbez, kern, anzahl, betrag, ausschankMl, artikel` |
| 5 | `PRAGMA table_info(mapping);` | 6 Zeilen: `fremd, status, artikel, gebinde_ml, wer, angelegt` |
| 6 | `PRAGMA table_info(stamm);` | 4 Zeilen: `schluessel, wert, geaendert, wer` |
| 7 | `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='fassungsliste';` | nur `i_liste_tag` — **kein** UNIQUE auf `tag` |

Weicht eine Zeile ab, ist `docs/live-schema.sql` und damit dieser Stand
falsch.

## Aufgaben für dich (nicht von Claude erreichbar)

<!-- Dashboard-Einstellungen, Secrets, alles nach Regel 13. -->

Die sieben Auflagen des qa-guardian aus Runde 3, in der Reihenfolge, in der
sie zu tun sind. **Die Reihenfolge ist nicht beliebig:** Auflage 2 braucht
diesen Stand live, sonst nimmt das Anmeldefeld den neuen Code nicht an.

| # | Wann | Was |
|---|---|---|
| 1 | **vor** dem Merge | **Die Geräte nicht aufräumen.** Kein Cache leeren, keine Seite „neu installieren". In der Reihe der Geräte (`hh_ausgang_v1`) liegen alle Fassungen, die nie angekommen sind. |
| 2 | **vor** dem Merge | **Sicherung der D1 anlegen.** Heute ist sie fast leer, ab dem ersten Abend stehen dort Daten, die es nur dort gibt, und D1 hat keinen Papierkorb. |
| 3 | beim Merge | **`migrations/001_mapping_rezept.sql` NICHT einspielen.** Dieser Stand braucht sie nicht (siehe oben, Abschnitt Migrationen). |
| 4 | direkt nach dem Livegang | **Die vier persönlichen Codes neu vergeben.** Ablauf unten. |
| 5 | direkt danach | **`ANLAGE_OFFEN` im Dashboard löschen.** Solange die Variable steht, legt sich jeder mit der Adresse ein Konto mit Rolle `leitung` an. Offen seit 01.09. |
| 6 | erster Abend | **Jemanden neben die Servicekraft stellen**, die die erste Fassung macht — bei Schritt 3 „Holen". Und beim ersten Kontakt der Geräte zusehen: Die Reihe schickt die liegengebliebenen Fassungen auf einmal nach. Das sieht aus wie ein Fehler und ist richtig so. |
| 7 | erste Woche | **Zahlen aus „Verkauf ↔ Fassung" in der ersten Woche gegenlesen**, bevor eine Bestellung oder Abrechnung darauf steht. Der erste echte Bericht liegt jetzt vor und wird richtig gelesen — aber es ist ein Bericht aus einer Nacht. Die Gegenprobe steht im Bericht selbst: Die Stückzahl und die Summe des Werkzeugs müssen mit „Warengruppen" und „Hauptwarengruppen" übereinstimmen (bei Nr. 37: 145 Stück, 602,50 €). |

### Auflage 4 Schritt für Schritt — die vier Codes

Die vier ersten Codes stehen im Klartext in der Geschichte des Anhangs
(Commits `3e8d7e2` und `f6ab7e1`) und wurden bis v11 öffentlich
ausgeliefert. Sie sind als bekannt zu behandeln. Umschreiben der Geschichte
verbietet Regel 1.

1. **Erst wenn dieser Stand live ist.** Mit dem alten Code anmelden — die
   alten Codes gelten weiter, sonst käme niemand mehr hinein, um sie zu
   ersetzen.
2. Im Backoffice **Team** öffnen. Zeigt die Ansicht „Nur die Leitung darf
   Mitarbeiter verwalten", fehlt dir die Rolle `leitung` — dann hier
   aufhören und `ANLAGE_OFFEN` **noch nicht** löschen.
3. Je Person: **Name genau so schreiben, wie er in der Liste steht** (die
   Zeile wird über den Namen gefunden; eine andere Schreibweise legt die
   Person ein zweites Mal an), Rolle wie gehabt, **Code: „Vorschlagen"**
   oder sechs bis acht eigene Ziffern. Speichern. Der Code erscheint danach
   nirgends mehr — jetzt notieren.
4. **Eine Person zuerst, dann prüfen:** auf einem zweiten Gerät mit dem
   neuen Code anmelden. Erst wenn das geht, die übrigen drei ändern.
5. Deinen eigenen Code zuletzt. Die offene Sitzung bleibt gültig (sie hängt
   am Keks, nicht am Code), du fliegst also nicht heraus.
6. **Danach `ANLAGE_OFFEN` löschen** (Auflage 5) und jedes Gerät im Haus
   einmal mit dem neuen Code anmelden. Erst diese Anmeldung räumt den alten
   Code aus dem Gerät; ein Gerät, das nie wieder angemeldet wird, kennt ihn
   ohne Netz weiter.

Vierstellige Codes nimmt das Backoffice nicht mehr an, die Taste
„Vorschlagen" schlägt sechsstellige vor.

### Weiterhin offen, unabhängig vom Livegang

* **`tests/fixtures/`** ist leer — ein echter, anonymisierter Z-Bericht
  fehlt. Das ist die grösste Unsicherheit des Projekts, siehe unten.
* **`review/INPUT-TEAM.md`** ist leer. Anliegen des Teams haben laut
  `CLAUDE.md` Vorrang vor allem, was die Rollen sich ausdenken.
* **`review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 4 bis 12** warten auf dich. Die
  teuersten: Nr. 7 (Sonderentnahme ohne Grund), Nr. 6 (wer Soll-Mengen und
  Glasweine festlegen darf), Nr. 12 (gespaltener Z-Bericht).

## Was ausdrücklich NICHT gebaut wurde

* **Der gespaltene Z-Bericht.** Die Frage ist am echten Bericht
  beantwortet: **Nr. 37 ist nicht gespalten.** Bar und Restaurant stehen
  als Tagessumme („Kostenstellen": 24 / 299,00 und 29 / 251,50), die
  Artikel stehen in einem einzigen Block „Positionen"; getrennt gebucht
  sind sie trotzdem, und genau das ist Eigenheit 1 (derselbe Wein zweimal,
  wird summiert). Der Positionsblock wird jetzt beim Namen gewählt, nicht
  mehr nach Zeilenzahl — damit gewinnt er auch gegen die beiden
  Warengruppen-Tabellen, die dieselben Artikel zusammengefasst noch einmal
  enthalten. Der alte Weg (grösster Block) bleibt als Rückfall für
  Berichte ohne diesen Namen, und mit ihm die Lücke: Ein tatsächlich
  gespaltener Bericht ohne „Positionen"-Überschrift verlöre weiter die
  kleinere Hälfte. Festgehalten in `tests/zbericht.test.mjs`, Entscheidung
  Nr. 12 — jetzt mit Befund.
* **Getränke-Automapping** bleibt aus (Regel 5).
* **Der Grund bei der Sonderentnahme** (Bruch, Personal, Küche,
  Verkostung) — fachliche Entscheidung Nr. 7, kein Agentenbeschluss.
* **Der Umzug des Verwaltungs-Editors ins Backoffice** und `hh_cfg_v9` nach
  D1 — hängt an Entscheidung Nr. 6.
* **`RUNDEN`** bleibt bei 1000 (Regel 11): Eine Änderung macht alle vier
  Anmeldungen ungültig.
* **`npm run deploy`** steht weiter in `package.json` und ist weiter im
  Backlog — entfernen ist deine Entscheidung, nicht meine.

## Getestet

| Prüfung | Ergebnis |
|---|---|
| `npm test` | 195 Prüfungen, alle grün. Ohne Netz, ohne Installation, Bordmittel von Node 22. |
| `tests/zbericht-37.test.mjs` | 24 Prüfungen am echten Bericht Nr. 37: Kopf, Blockwahl, die vier Eigenheiten mit ihren Zahlen, Rabatt und Storno, und der ganze Weg durch den Worker bis in `fassungszeile` (48 Zeilen, 145 Stück, 602,50 €, `ausschankMl` 125 für das Achtel). |
| `node tests/durchstich.cjs` | 35 von 35 Punkten. Fasst App **und** Worker gleichzeitig an, gegen eine echte SQLite-DB aus `docs/live-schema.sql`. **Vor jedem Livegang laufen lassen.** |
| `node tests/persona-tagesfassung.cjs` | Anmeldung mit sechsstelligem Code, Tagesfassung bis zum Abschluss, Abbruch, Offline, doppeltes Absenden, abgelaufene Sitzung — durchgelaufen. |
| Anmeldung am iPhone-Maß (Chromium) | Sechs Felder, ✓ dunkel bis zur vierten Ziffer, danach hell; Löschtaste nimmt die letzte Ziffer; acht Ziffern sind die Grenze. |

Nicht geprüft: **Safari auf einem Telefon** (alles Visuelle ist Chromium in
iPhone-Maßen) und der **Mailweg ab dem Postfach** (Dashboard). Der echte
Z-Bericht ist geprüft — einer, aus einer Nacht. Ein zweiter aus einer
anderen Woche wäre die billigste weitere Sicherheit.
