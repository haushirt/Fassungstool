# Ergebnis

Diese Datei ist die Beschreibung des Pull Requests `v2-review` → `main`. Sie wird am Ende einer Phase gefüllt, nicht laufend.

## Was sich geändert hat

<!-- Pro Phase/Thema ein kurzer Absatz: was das Tool jetzt kann, was anders ist. Aus Sicht der Nutzer, nicht als Commit-Liste. -->

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

### Was ICH zur Kontrolle nicht selbst lesen konnte

Der Cloudflare-Connector (`d1_database_query`) stand mir in diesem Lauf
nicht zur Verfügung — in meiner Werkzeugliste gibt es ihn nicht, und im
Arbeitsverzeichnis liegen keine Zugangsdaten. Gearbeitet habe ich deshalb
gegen `docs/live-schema.sql`, das nach Regel 3 die Wahrheit ist. **Bitte
einmal gegenlesen**, dann ist die Kette geschlossen:

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
falsch. Nur Lesen, kein `INSERT`/`UPDATE`/`DELETE`.

## Aufgaben für dich (nicht von Claude erreichbar)

<!-- Dashboard-Einstellungen, Secrets, alles nach Regel 13. -->

Keine offenen Aufgaben.

## Was ausdrücklich NICHT gebaut wurde

<!-- Bewusst weggelassen, mit Grund. Verhindert, dass es in der nächsten Phase als Lücke wieder auftaucht. -->

## Getestet

<!-- Was geprüft wurde und mit welchem Ergebnis. Aus den QA-Zügen in review/LOG.md. -->
