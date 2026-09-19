Fassungstool – Projektregeln für Claude Code

Kontext

Keller- und Getränkemanagement für das Alpine Spa Hotel Haus Hirt, Bad Gastein. Service (iPhone/iPad) erfasst Fassungen im Keller, die Leitung (MacBook) arbeitet im Backoffice. Maßgebliche Doku: `PROJEKTANLEITUNG-Fassungstool.md` (Stand 16.09.2026) und `UEBERGABE-TECHNISCH.md` (Stand 17.09.2026, die lange Fassung für die Werkbank) – beide vor jeder Arbeit lesen. Dazu, falls vorhanden: `WORKER-ANPASSUNG.md`, `ANMELDESPERRE.md`.

Arbeitsweise

* Updates während der Arbeit: nur Stichworte, kurz.
* „Review" = knappes Feedback, nur das Wichtigste.
* Ablauf jeder Aufgabe:
  1. Ziel feststellen + was konkret zu tun ist
  2. Kein separates Mockup. Auf einem eigenen Branch bauen.
  3. Belege erzeugen mit `node tests/ui-befunde.cjs` in 320/375/390/430 px und mir sagen, wo die Bilder liegen.
  4. Ergebnis mit Ziel abgleichen → nicht erfüllt: neue Runde
  5. Erfüllt: „Erledigt – bereit zum Review"
* Freigabe: erst nach meiner ausdrücklichen Freigabe mergen. Danach Jäger und qa-guardian laufen lassen, nicht davor.

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

1. Immer auf `claude/…`-Branches arbeiten, nie direkt auf `main`. Nie mergen, nie force-pushen.
2. Kein `wrangler deploy`. Erlaubt: lokale Tests mit `--local` bzw. `wrangler dev --local`.
   **Live-D1 seit 17.09.2026: NUR LESEN.** Lesende Abfragen (`SELECT`, `PRAGMA`, `sqlite_master`) über den
   Cloudflare-Connector sind erlaubt und erwünscht, um Code gegen die Wirklichkeit zu prüfen.
   JEDE schreibende Operation bleibt verboten – kein `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`,
   `DROP`, kein `wrangler d1 … --remote`. Es gibt keine Sicherung der Datenbank und keinen Papierkorb
   (Projektanleitung §8); ein falsches `DELETE` ist endgültig. Migrationen spiele weiterhin ICH ein.
3. `schema.sql` ist veraltet und wird NIE ausgeführt. Wahrheit ist die Live-D1, dokumentiert in
   `docs/live-schema.sql` (gezogen am 17.09.2026, liegt vor). Lokale Test-DB immer daraus aufbauen.
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
14. Die Spalten `schluessel`, `zaehlnr`, `geraet` auf `vorgang` weder verwenden noch löschen.
    (Die früher hier genannten Tabellen `idem` und `zbericht` EXISTIEREN in der Live-D1 nicht –
    am 17.09.2026 nachgesehen. Sie sind aus dieser Regel gestrichen.)

Schemaänderungen (v. a. Phase B)

* Nur additiv: neue Tabellen/Spalten/Indizes. Kein DROP, kein Umbau bestehender Tabellen, Journal bleibt append-only.
* Jede Änderung als eigene Datei `migrations/NNN_beschreibung.sql`, lokal gegen `docs/live-schema.sql` getestet.
* Neue Module hinter einem Feature-Flag: Ist die Migration live noch nicht eingespielt, bleibt das Modul unsichtbar und der Rest des Tools funktioniert unverändert.
* ~~Erste geplante Migration: die zwei Indizes auf `ereignis`.~~ **GEGENSTANDSLOS** – beide sind live
  bereits angelegt, breiter als dokumentiert: `(artikel, ort, ts)` und `(tag, art)`.
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

Nur wenn ich wörtlich `VERÖFFENTLICHEN` schreibe: Pull Request vom aktuellen `claude/…`-Branch → `main` erstellen, Beschreibung aus `review/ERGEBNIS.md`. Bei `VERÖFFENTLICHEN phase-a` (bzw. b/c) den PR vom jeweiligen Tag aus erstellen. Enthält der PR Migrationen, steht ganz oben: „Vor dem Merge Migrationen einspielen". Nicht selbst mergen – den Merge (= Live-Gang) mache ich.
