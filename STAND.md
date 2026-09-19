# Stand · Fassungstool

**Letzte Aktualisierung:** 19.09.2026

Diese Datei zuerst lesen. Das ganze Repo zu erkunden ist nicht nötig.
Tiefe Details: `PROJEKTANLEITUNG-Fassungstool.md`, `UEBERGABE-TECHNISCH.md`.

## Wo wir stehen
- **Runde 16 ist gemergt** (PR #5, `d19cfcb` auf `main`). `sw.js` steht auf **v56**.
- Jeder Push auf `main` geht **automatisch live** (Workers Builds).
- `npm test`: **440 von 440 grün** (Stand 19.09.2026, Laufzeit ca. 4 s).
- Was mit Runde 16 live ging, steht in `review/ERGEBNIS.md`;
  was Casimir am Gerät tun muss, in `review/MORGENBRIEF.md`.
- Die Live-Datenbank ist **nur lesbar**. Migrationen spielt Casimir selbst ein.

## Was als Nächstes ansteht
- Die offenen Punkte unter **„Hoch"** in `review/BACKLOG.md` – vor allem:
  - **Sonderentnahme Getränke** hat keinen Weg zum Grund; der Abschluss endet
    dauerhaft in der Code-Freigabe. (`public/index.html:3114`, `:3658`, `:5104`)
  - **Gasteiner 0,25 l steht auf Soll 8** statt 7, aus einem Gestaltungsgrund.
    Passen wirklich 8 in die Spalte? Wenn nein, bucht jedes Nachfüllen dauerhaft
    eine Flasche zu viel. **Antwort von Casimir nötig.**
  - **Betriebstag gegen Abgleich um einen Tag versetzt**, und zwar dauerhaft.
    Zwei Lösungswege stehen im Backlog, beide brauchen eine Entscheidung.
  - `/api/code` räumt die Anmeldesperre nach einem Treffer nicht auf.
- Phase B (Wareneingang) liegt als Konzept in `review/PHASE-B-KONZEPT.md`.

## Bekannte Baustellen
- `schema.sql` ist veraltet und wird **nie** ausgeführt. Wahrheit ist
  `docs/live-schema.sql`.
- Getränke-Automapping bleibt aus – die Ähnlichkeitssuche trifft falsch.
- Genau vier Dateien in `public/`. Die Gestaltungsschicht steht wortgleich in
  `index.html` und `leitung.html` – Änderungen immer in beiden.
- Nach jeder Änderung in `public/`: `VERSION` in `sw.js` erhöhen.
- Gearbeitet wird immer auf einem `claude/…`-Zweig, nie direkt auf `main`
  (Regel 1 in `CLAUDE.md`, berichtigt am 19.09.2026 – vorher stand dort `v2-review`).
