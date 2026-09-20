# Stand · Fassungstool

**Letzte Aktualisierung:** 20.09.2026

Diese Datei zuerst lesen. Das ganze Repo zu erkunden ist nicht nötig.
Tiefe Details: `PROJEKTANLEITUNG-Fassungstool.md`, `UEBERGABE-TECHNISCH.md`.

## Wo wir stehen
- **Runde 18 (Backoffice) ist fertig** auf `claude/backoffice-leitung-r18-clvh73`.
  `sw.js` steht auf **v60**. Runde 16 ist auf `main` (PR #5).
- Jeder Push auf `main` geht **automatisch live** (Workers Builds).
- `npm test`: **444 von 444 grün** (Stand 20.09.2026, Laufzeit ca. 4 s).
- Oberfläche: `node tests/ui-runde18.cjs` — 51 Urteile grün. Braucht Playwright
  und ist **nicht** Teil von `npm test` (Regel 8).
- Was Runde 18 gebracht hat, steht Punkt für Punkt in
  `review/RUNDE-18-BACKOFFICE.md` (mit Datei:Zeile und Prüfplan).
- Danach **vier Jagden**, jede mit einem A-Fund — alle behoben, je mit eigener
  Prüfung (`review/JAGD.md`). Es war viermal derselbe Fund: Vier Stellen deuten
  dieselbe Differenz (Druckblatt, Mittagsblick, Bildschirm, CSV), und behoben
  wurde immer nur die, die gerade genannt war. Jetzt sind alle vier an dieselben
  Zahlen angeschlossen.
- **Ein Punkt bleibt offen und braucht eine Entscheidung von Casimir:** Eine
  Zeile, deren Verkauf über „Ignorieren" aus der Rechnung fällt, trägt weiter
  die grüne Plakette „stimmt". Steht ganz oben in `review/BACKLOG.md` unter
  „Hoch", mit zwei ausgearbeiteten Wegen.
- Die Live-Datenbank ist **nur lesbar**. Migrationen spielt Casimir selbst ein.

## Was Runde 18 verändert hat (nur `public/leitung.html`)
- Die vier Kacheln des Mittagsblicks sind **Knöpfe** und führen weiter.
- Neue Ansicht **„Eingänge"** unter Nachschlagen: jeder Vorgang mit allen
  Mengen, Notiz in der Liste, Detail auch am Handy lesbar.
- **Wisch von links** öffnet die Navigation, statt im Browser zurückzuspringen.
- **Druckblätter** je Vorgang und für „was nicht aufgeht" — das PDF macht der
  Druckdialog, keine neue Abhängigkeit.

## Was als Nächstes ansteht
- **Am iPad nachsehen:** blättert Safari nach dem Wisch wirklich nicht mehr
  zurück? Das kann kein Prüfstand beantworten.
- Die offenen Punkte unter **„Hoch"** in `review/BACKLOG.md` – vor allem:
  - **Sonderentnahme Getränke** hat keinen Weg zum Grund; der Abschluss endet
    dauerhaft in der Code-Freigabe. (`public/index.html:3114`, `:3658`, `:5104`)
  - **Gasteiner 0,25 l steht auf Soll 8** statt 7, aus einem Gestaltungsgrund.
    Passen wirklich 8 in die Spalte? **Antwort von Casimir nötig.**
  - **Betriebstag gegen Abgleich um einen Tag versetzt**, und zwar dauerhaft.
    Zwei Lösungswege stehen im Backlog, beide brauchen eine Entscheidung.
  - `/api/code` räumt die Anmeldesperre nach einem Treffer nicht auf.
- Phase B (Wareneingang) liegt als Konzept in `review/PHASE-B-KONZEPT.md`.

## Bekannte Baustellen
- `schema.sql` ist veraltet und wird **nie** ausgeführt. Wahrheit ist
  `docs/live-schema.sql`.
- Getränke-Automapping bleibt aus – die Ähnlichkeitssuche trifft falsch.
- Genau vier Dateien in `public/`. Die Gestaltungsschicht steht wortgleich in
  `index.html` und `leitung.html` – Änderungen immer in beiden. Alles ab
  `leitung.html:245` ist dagegen nur die Leitung und darf allein stehen.
- Nach jeder Änderung in `public/`: `VERSION` in `sw.js` erhöhen.
- `tests/unklar-wandert.test.mjs:32` hängt an der Abschnittsmarke
  „7f · Speicher" in `leitung.html`. Buchstaben verschieben heißt: Zeile mitnehmen.
- Gearbeitet wird immer auf einem `claude/…`-Zweig, nie direkt auf `main`.
