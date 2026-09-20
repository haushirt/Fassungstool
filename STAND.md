# Stand · Fassungstool

**Letzte Aktualisierung:** 19.09.2026 (Runde 17)

Diese Datei zuerst lesen. Das ganze Repo zu erkunden ist nicht nötig.
Tiefe Details: `PROJEKTANLEITUNG-Fassungstool.md`, `UEBERGABE-TECHNISCH.md`.

## Wo wir stehen
- **Runde 17 ist gemergt und live** (PR #9, `47d65cb` auf `main`).
  `sw.js` steht auf **v57**. Sie bringt drei Dinge: der Fremdgerät-Dialog
  lässt sich wirklich abbrechen, „Läuft gerade woanders“ steht nur noch bei
  echter Erfassung, und ein Papierkorb setzt eine falsch gestartete Session
  zurück. Einzelheiten in `review/ERGEBNIS.md` und `review/LOG.md` (Runde 17).
- Davor: Runde 16 (PR #5, `d19cfcb`), `sw.js` v56.
- Jeder Push auf `main` geht **automatisch live** (Workers Builds).
- `npm test`: **442 von 442 grün** (Stand 19.09.2026, Laufzeit ca. 4 s).
  Dazu von Hand: `node tests/ui-runde17.cjs` **38/38**.
- Was mit Runde 17 live ging, steht oben in `review/ERGEBNIS.md`;
  was Casimir am Gerät tun muss, in `review/MORGENBRIEF.md`.
- Die Live-Datenbank ist **nur lesbar**. Migrationen spielt Casimir selbst ein.

## Was als Nächstes ansteht
- Die offenen Punkte unter „Hoch“ in `review/BACKLOG.md` – vor allem:
  - **„Nicht angemeldet – bitte neu anmelden“, obwohl man angemeldet ist.**
    Ursache ist in Runde 17 gefunden und im Backlog beschrieben: Die App hängt
    an `sessionStorage`, die Sitzung am Server an einem Keks mit 12 Stunden
    Frist. **Casimir muss wählen**, wie es weitergeht (sichtbarer Ablauf,
    gleitende Frist oder längere Frist).
  - **Sonderentnahme Getränke** hat keinen Weg zum Grund; der Abschluss endet
    dauerhaft in der Code-Freigabe. Casimir macht das separat.
  - **Gasteiner 0,25 l:** Soll 8 ist richtig — bestätigt am 19.09.2026. Erledigt.
  - **Betriebstag gegen Abgleich um einen Tag versetzt**, und zwar dauerhaft.
    Zwei Lösungswege stehen im Backlog, beide brauchen eine Entscheidung —
    von Casimir auf später gestellt.
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
- Seit Runde 17 darf ein Vorgang einen Schlüssel mit Zusatz tragen:
  `<modus>_<tag>-<sitzung>`, aber nur bei Nachfüllen und Sonderentnahme und nur,
  wenn jemand bewusst neben einem fremden Vorgang startet. Freigegeben, aber die
  Zeile in `CLAUDE.md` ist noch nicht nachgezogen — siehe
  `review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 16.
