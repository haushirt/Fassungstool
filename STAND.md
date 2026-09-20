# Stand · Fassungstool

**Letzte Aktualisierung:** 20.09.2026 (Runde 20 · zwei Zahlen je Position)

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

## Runde 19 (20.09.2026) — Reparatur und neue Übersicht

Bericht: `review/ANALYSE-BACK-FRONT.md`. Runde im Log unter „Runde 19".
`sw.js` steht auf **v64**. `npm test`: **490 von 490** grün.

**Behoben (alles ohne Migration):**
1. **Getränke zählten im Backoffice doppelt.** `normVorgang` leitete die
   geholte Menge selbst her UND addierte `gent`, das dieselbe Zahl ist.
   Gemessen: Journal 4, Backoffice 8. Jetzt 4.
2. **Laufende Vorgänge** gingen voll in Bestand, Verbrauch und Abgleich
   ein — das Journal kennt sie nicht. Neuer Filter `gebucht()`; die
   ausgelassene Menge wird überall benannt, wo auch die anderen
   Vorbehalte stehen.
3. **Gleiche Zählnummer zweier Geräte** überschrieb still mit 200. Jetzt
   409 — und `fernNeuer` in der App fragt bei derselben Schwelle, sonst
   hätte der Wächter den Verlust nur um 45 Sekunden verschoben.
4. **Beschädigter Sitzungskeks** lieferte 500 statt 401 und hielt damit
   die Offline-Reihe an.
5. **Rechte werden gemeldet, nicht gesperrt** (Entscheidung Casimir).
   Dazu `GET /api/journal` — damit sind abgewiesene Mail-Berichte zum
   ersten Mal sichtbar.

**Neu: die Übersicht (ehemals Mittagsblick).** Sie beantwortet drei Fragen
in dieser Reihenfolge: Kann ich den Zahlen trauen (Urteil und
Abdeckungsbalken) · Wo reißt es (die Kette aus fünf Gliedern) · Was ist zu
tun (höchstens drei Aufgaben mit Knopf, darunter „Außerdem" vollständig).
Danach der laufende Tag getrennt vom Abgleichfenster, sechs Zahlen, die
Abweichungen nach **Euro** sortiert, und 14 Tage nebeneinander.
Der Zeitraum steht jetzt im Kopf und überlebt das Neuladen; der Chip sagt,
wie alt die Daten sind, statt welcher Betriebstag gemeint ist.

## Runde 20 (20.09.2026) — zwei Zahlen je Position und ein Vorgangsfenster

Runde im Log unter „Runde 20". `sw.js` steht auf **v66**.
`npm test`: **538 von 538** grün.

Anlass war Casimirs Satz beim Öffnen eines Vorgangs: *„es sollte einfach
nur eine Zahl pro Position sein"* — und die Nachfrage brachte heraus, dass
es genau umgekehrt ist: **es gibt zwei Zahlen, und das Tool behielt nur
eine.**

1. **„Oben gefehlt" ist nicht dasselbe wie „aus dem Keller geholt".**
   Die erste (Soll − Ist an Bar, Restaurant, Backup, Lade) ist der
   **Verbrauch** — dagegen wird der Z-Bericht gerechnet. Die zweite ist,
   was wirklich herausgetragen wurde — die geht **vom Bestand** ab. Sie
   gehen auseinander, sobald im Lager weniger lag (`holtN`/`gholtN`).
   Beide werden im Backoffice aus denselben Rohfeldern gerechnet:
   **kein neues Feld, keine Migration, rückwirkend gültig.** In allen
   sechs Live-Vorgängen sind beide Zahlen gleich — es ändert sich heute
   keine einzige Zahl, die Unterscheidung ist da, bevor sie beisst.
2. **Das Vorgangsfenster.** Ein Kopf (wer, wann vom Gerät, Freigabe mit
   Grund) und **eine** Tabelle je Abschnitt statt fünf: eine Zeile je
   Artikel, zwei Spalten mit ihrem Auftrag im Kopf („→ Z-Bericht",
   „→ Bestand"), **eine** Sortierung — der Laufweg durch den Keller.
   Weicht eine Zeile ab, ist sie hervorgehoben und nennt den Grund.
   Druckblatt und Fenster kommen aus derselben Quelle.
3. **Ein Soll für beide Dateien.** App und Backoffice rechneten das Soll
   der Getränke aus zwei verschiedenen Ladenaufteilungen (gasteiner 15
   gegen 18, gastill 4 gegen 1). Jetzt aus derselben, dauerhaft geprüft.

**Zurückgezogen:** Analyse-Punkt A15 („Sonderentnahmen gehen in die
Verbrauchsprognose ein") ist kein Fund — Hauskonsum wird an der Kasse
gebucht und steht damit im Z-Bericht.

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
