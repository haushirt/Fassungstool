Fassungstool – Projektregeln für Claude Code

Kontext

Keller- und Getränkemanagement für das Alpine Spa Hotel Haus Hirt, Bad Gastein. Service (iPhone/iPad) erfasst Fassungen im Keller, die Leitung (MacBook) arbeitet im Backoffice. Maßgebliche Doku: `PROJEKTANLEITUNG-Fassungstool.md` (Stand 16.09.2026) – vor jeder Arbeit lesen. Dazu, falls vorhanden: `WORKER-ANPASSUNG.md`, `ANMELDESPERRE.md`.

Stack

* Worker `src/index.js` (Endpunkte, Rechte, Anmeldung, Mailempfang), D1-Datenbank `fassung`
* `public/index.html` = App iPhone/iPad · `public/leitung.html` = Backoffice (lebt vom Cookie, keine eigene Anmeldung)
* `public/sw.js` = Offline-Vorrat · `public/icon.png`
* gastronovi-Z-Bericht: `src/gnparse.js`, `src/gnmap.js` · Stammdaten `src/stamm.json`
* Kein Bauschritt. Deploy: JEDER PUSH AUF `main` GEHT AUTOMATISCH LIVE (Workers Builds).

Architektur, die bleibt

* Ein Vorgang ist ein vollständiger Zustand mit Schlüssel `<modus>_<tag>`, `PUT /api/vorgang/<schlüssel>`. Ausgang (`hh_ausgang_v1`) hält max. einen Eintrag je Schlüssel.
* Zwei Geräte am selben Vorgang: fragen („Auf einem anderen Gerät weiter?"), nie still zusammenführen.
* Ereignisjournal `ereignis` append-only; Korrekturen sind neue Zeilen.
* Offline ist der Normalfall. Fotos bleiben in der IndexedDB des Geräts.
* `/api/` wird nie zwischengespeichert (auch nicht im Service Worker).
* Genau vier Dateien in `public/`. Keine ausgelagerten CSS-Dateien. Die Gestaltungsschicht steht WORTGLEICH in `index.html` und `leitung.html` – jede Änderung daran in beiden Dateien identisch.
* Nach jeder Änderung an einer Datei in `public/`: `VERSION` in `sw.js` erhöhen.

Harte Regeln (nie brechen)

1. Nur auf Branch `v2-review` arbeiten. Nie auf `main` pushen, nie mergen, nie force-pushen.
2. Kein `wrangler deploy`, keine `wrangler d1 … --remote`-Befehle, kein Zugriff auf die Live-Datenbank. Erlaubt: lokale Tests mit `--local` bzw. `wrangler dev --local`.
3. `schema.sql` ist veraltet und wird NIE ausgeführt. Wahrheit ist die Live-D1, dokumentiert in `docs/live-schema.sql`. Lokale Test-DB immer aus `docs/live-schema.sql` aufbauen.
4. Code und Schema müssen zusammenpassen (Rollen: `service`, `wirtschaft`, `leitung`). Jede Änderung, die Tabellen oder Spalten berührt, gegen das dokumentierte Live-Schema prüfen.
5. Getränke-Automapping bleibt deaktiviert (Ähnlichkeitssuche liefert falsche Treffer).
6. Append-only-Ereignisjournal und Offline-Queue nicht aufweichen.
7. gastronovi-Eigenheiten in `gnparse.js` nicht wegrefactoren: doppelte Positionsnamen (Bar/Restaurant), 0-€-Zeilen zählen als Verbrauch, doppelte Größensuffixe, keine Warengruppe pro Zeile.
8. Keine neuen Frameworks, Build-Schritte oder Abhängigkeiten ohne Eintrag in `review/OFFENE-ENTSCHEIDUNGEN.md` und meine Freigabe.
9. Keine Zugangscodes, Passwörter oder Secrets in Dateien, Commits oder Logs.
10. Error 1101 ist nicht automatisch ein CPU-Limit – zuerst Logs, dann Hypothese.
11. `RUNDEN` nicht ändern. Eine Änderung macht alle Anmeldungen ungültig → nur in `review/OFFENE-ENTSCHEIDUNGEN.md`.
12. `wrangler.jsonc` nicht selbst ändern. Was nur im Dashboard steht (D1-Bindung, ASSETS, ABSENDER, Crons) könnte beim Deploy verloren gehen. Vorschläge (z. B. observability) nur in `review/OFFENE-ENTSCHEIDUNGEN.md`.
13. Dashboard-Einstellungen und Secrets sind für dich nicht erreichbar – nötige Schritte als Aufgabe für mich notieren.
14. Die ungenutzten Tabellen `idem`, `zbericht` und die Spalten `schluessel`, `zaehlnr`, `geraet` auf `vorgang` weder verwenden noch löschen.

Schemaänderungen (v. a. Phase B)

* Nur additiv: neue Tabellen/Spalten/Indizes. Kein DROP, kein Umbau bestehender Tabellen, Journal bleibt append-only.
* Jede Änderung als eigene Datei `migrations/NNN_beschreibung.sql`, lokal gegen `docs/live-schema.sql` getestet.
* Neue Module hinter einem Feature-Flag: Ist die Migration live noch nicht eingespielt, bleibt das Modul unsichtbar und der Rest des Tools funktioniert unverändert.
* Erste geplante Migration: die zwei Indizes auf `ereignis` aus Abschnitt 4 der Projektanleitung.
* Migrationen spiele ICH ein. In `review/ERGEBNIS.md` jede Migration Zeile für Zeile zum Einfügen in die D1-Konsole, jeweils mit erwarteter Ausgabe.

Testdaten

* `tests/fixtures/` enthält echte, anonymisierte Z-Berichte und Zählungen – das ist die Referenz.
* Anliegen des Teams stehen in `review/INPUT-TEAM.md` und haben Vorrang vor eigenen Ideen.

Sprache

* UI-Texte Deutsch. Fachbegriffe: Fassung, Tagesfassung, Kellerzählung, Wareneingang, Sonderentnahme, Nachfüllen, Gebinde, Kisten, Laufweg, Rebsorte.
* Commits: `[Rolle] Runde N: kurze Beschreibung`

Übergabeformat (jeder Agent, am Ende jedes Zugs)

An `review/LOG.md` anhängen UND als Antwort zurückgeben:

```
### Runde N – <Rolle>
**Kritik am Vorgänger:** konkrete Punkte mit Datei:Zeile, jeweils ✅ übernommen / ↩️ geändert / ❌ abgelehnt + Grund
**Umgesetzt:** max. 3 Punkte, je 1 Zeile
**Geprüft:** was getestet wurde und Ergebnis
**Für die Nächsten:** Hinweise/Fragen an andere Rollen
**Phase/Thema:** z. B. B / Wareneingang
**Backlog:** neue Punkte (Priorität hoch/mittel/niedrig) → auch in `review/BACKLOG.md`
**STATUS:** BLOCKER | VERBESSERUNGEN | FERTIG
```

FERTIG heißt: aus meiner Rolle keine Punkte mit Priorität hoch/mittel mehr offen.

Veröffentlichen

Nur wenn ich wörtlich `VERÖFFENTLICHEN` schreibe: Pull Request `v2-review` → `main` erstellen, Beschreibung aus `review/ERGEBNIS.md`. Bei `VERÖFFENTLICHEN phase-a` (bzw. b/c) den PR vom jeweiligen Tag aus erstellen. Enthält der PR Migrationen, steht ganz oben: „Vor dem Merge Migrationen einspielen". Nicht selbst mergen – den Merge (= Live-Gang) mache ich.
