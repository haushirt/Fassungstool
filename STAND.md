# Stand · Fassungstool

**Letzte Aktualisierung:** 20.09.2026 (Analyse-Lauf Runde 19)

Diese Datei zuerst lesen. Das ganze Repo zu erkunden ist nicht nötig.
Tiefe Details: `PROJEKTANLEITUNG-Fassungstool.md`, `UEBERGABE-TECHNISCH.md`.

## Wo wir stehen
- **Runde 17 (Fassungsseite) ist gemergt** (PR #9, `47d65cb` auf `main`).
- **Runde 18 (Backoffice) liegt auf `claude/backoffice-leitung-r18-clvh73`**
  und bringt `sw.js` auf **v61**.
- Jeder Push auf `main` geht **automatisch live** (Workers Builds).
- `npm test`: **444 von 444 grün** (Stand 20.09.2026, Laufzeit ca. 4 s).
- Oberfläche von Hand: `node tests/ui-runde18.cjs` — **51 Urteile grün**,
  `node tests/ui-runde17.cjs` — 38/38. Beide brauchen Playwright und sind
  **nicht** Teil von `npm test` (Regel 8).
- Was Runde 18 gebracht hat, steht Punkt für Punkt in
  `review/RUNDE-18-BACKOFFICE.md` (mit Datei:Zeile und Prüfplan);
  die PR-Beschreibung steht in `review/ERGEBNIS.md`.

## Was Runde 18 verändert hat (nur `public/leitung.html`)
- Die vier Kacheln des Mittagsblicks sind **Knöpfe** und führen weiter.
- Neue Ansicht **„Eingänge"** unter Nachschlagen: jeder Vorgang mit allen
  Mengen, Notiz in der Liste, Detail auch am Handy lesbar.
- **Wisch von links** öffnet die Navigation, statt im Browser zurückzuspringen.
- **Druckblätter** je Vorgang und für „was nicht aufgeht" — das PDF macht der
  Druckdialog, keine neue Abhängigkeit.
- Danach **vier Jagden**, jede mit einem A-Fund — alle behoben, je mit eigener
  Prüfung (`review/JAGD.md`). Es war viermal derselbe Fund: Vier Stellen
  deuten dieselbe Differenz (Druckblatt, Mittagsblick, Bildschirm, CSV), und
  behoben wurde immer nur die, die gerade genannt war. Jetzt hängen alle vier
  an denselben Zahlen, und das Wort „Schwund" steht in keiner Deutungsspalte
  mehr.

## Analyse-Lauf Runde 19 (20.09.2026) — BLOCKER gefunden

Voller Bericht: `review/ANALYSE-BACK-FRONT.md`. Neue Funde in `review/BACKLOG.md`
(Runde 19). Zwei Mockups der neuen Übersicht unter `review/mockup/`.

**Vier Sachen sind kaputt, alle ohne Migration behebbar:**
1. **Jede geholte Getränkeflasche zählt im Backoffice doppelt.**
   `normVorgang` (`leitung.html:922`) rechnet die Fehlmenge neu und addiert
   `:968` zusätzlich `gent` — dieselbe Zahl. Gemessen: Journal 4, Backoffice 8.
   Von 445 Prüfungen verdeckt, weil jede Prüfdatei `gent` ohne `getr` setzt.
2. **Laufende Vorgänge werden voll mitgerechnet**, das Journal kennt nur
   abgeschlossene. Gemessen: Worker 12, Backoffice 7.
3. **Gleiche Zählnummer = stilles Überschreiben** mit HTTP 200
   (`src/index.js:348` prüft nur `>`).
4. **Die Rollen werden für Vorgänge nirgends durchgesetzt** —
   `PUT /api/vorgang/` hat keine Rechteprüfung.

Dazu: der Bestellzettel rechnet für 56 von 57 Weinen mit geratenen 6er-Kisten;
ein beschädigter Sitzungskeks liefert 500 statt 401 und hält die Offline-Reihe
an; das Backoffice braucht bei 60 Berichten **4,1 s leeren Schirm** beim Start
(61 Anfragen nacheinander).

## Was als Nächstes ansteht
- **Entscheidung von Casimir (steht ganz oben unter „Hoch"):** Was soll
  „Ignorieren" bedeuten? Heute nimmt es den Verkauf aus der Rechnung, und die
  betroffene Zeile sagt trotzdem „stimmt" in Grün. Gemessen: neun Flaschen
  verkauft, drei geholt — gezeigt „stimmt". Zwei Wege stehen ausgearbeitet in
  `review/BACKLOG.md`.
- **Am iPad nachsehen:** blättert Safari nach dem Wisch wirklich nicht mehr
  zurück? Das kann kein Prüfstand beantworten.
- **„Nicht angemeldet – bitte neu anmelden“, obwohl man angemeldet ist.**
  Ursache ist in Runde 17 gefunden und im Backlog beschrieben: Die App hängt
  an `sessionStorage`, die Sitzung am Server an einem Keks mit 12 Stunden
  Frist. **Casimir muss wählen** (sichtbarer Ablauf, gleitende Frist oder
  längere Frist).
- **Sonderentnahme Getränke:** der Weg zum Grund ist da (Jagd 14). Was fehlt,
  ist die Anzeige — das Backoffice liest den Grund nicht.
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
- Nach jeder Änderung in `public/`: `VERSION` in `sw.js` erhöhen — **auch beim
  zweiten und dritten Commit derselben Runde.** Genau das wurde in Runde 18
  einmal vergessen (`review/JAGD.md`, zweite Jagd).
- `tests/unklar-wandert.test.mjs:32` hängt an der Abschnittsmarke
  „7f · Speicher" in `leitung.html`. Buchstaben verschieben heißt: Zeile mitnehmen.
- Gearbeitet wird immer auf einem `claude/…`-Zweig, nie direkt auf `main`.
