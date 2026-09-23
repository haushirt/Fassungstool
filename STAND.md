# Stand · Fassungstool

**Letzte Aktualisierung:** 23.09.2026 (Runde 23 · Größen am Artikel, Bier vom Fass)

Diese Datei zuerst lesen. Das ganze Repo zu erkunden ist nicht nötig.
Tiefe Details: `PROJEKTANLEITUNG-Fassungstool.md`, `UEBERGABE-TECHNISCH.md`.

## Runde 23 (23.09.2026) — noch NICHT live

**Braucht Migration 002 vor dem Merge.** Was sie bringt:

- **Größen gehören an den Artikel.** Neue Liste in den Einstellungen: alle
  95 Artikel, je zwei Zahlen (Flasche/Fass und Glas), vorausgefüllt nach
  den Regeln aus dem Haus — Weinflasche 750, Glas Wein 125, Glas Sekt 100,
  Fass 50 000. Ein Knopf übernimmt alle. **Gerechnet wird erst, was
  bestätigt ist**; die Entscheidung aus Runde 6 bleibt damit in Kraft.
  Gespeichert in `stamm` — die Tabelle stand seit je live und war leer,
  es fehlte nur der Schreibweg. Keine Migration dafür.
- **Bier vom Fass** wird gerechnet, ohne im Keller aufzutauchen. Eigener
  Abschnitt „Vom Fass" unter Verkauf ↔ Fassung, keine Differenzzeile.
  Radler ist halb Pils: der Kassenname sagt 500, verbraucht werden 250 —
  deshalb die Menge von Hand je Kassenname (**Migration 002**), und die
  Anzeige nennt überall, woher die Zahl kommt.
- **Die Zuordnung zeigt nur noch** (Spalte „Rechnung"), gepflegt wird bei
  den Größen.
- **Frage 1 steht ganz oben.** „Ist heute gefasst worden?" stand in Block
  5 von 8 und war am MacBook unter der Falz.

Der Befund, der alles ausgelöst hat: In der laufenden Datenbank haben
**21 Zuordnungen, davon 0 eine Gebindegröße** — deshalb rechnete keine
einzige Zeile. Das Achtel wurde die ganze Zeit korrekt gelesen.

`sw.js` steht auf **v72**. `npm test`: **634 von 634** grün.
Die Einrichtungsliste (sechs Handgriffe) steht in `review/ERGEBNIS.md`.

## Wo wir stehen
- **Runde 22 ist gemergt und LIVE** (PR #16, 21.09.2026). Alle Runden bis
  einschliesslich 22 sind auf `main`.
- Die Runden 17 bis 22 stehen weiter unten, jede mit dem, was sie gebracht hat.
- Jeder Push auf `main` geht **automatisch live** (Workers Builds).
- `sw.js` steht mit Runde 22 auf **v71**.
- `npm test`: **581 von 581 grün** (Stand 21.09.2026, Laufzeit ca. 4 s).
- Oberfläche von Hand, **nicht** Teil von `npm test` (Regel 8), braucht
  Playwright: `node tests/ui-runde22.cjs` 31/31 ·
  `node tests/ui-runde21.cjs` 19/19 · `node tests/ui-leitung-echt.cjs` 44/44 ·
  `node tests/ui-runde18.cjs` 51/51 · `node tests/ui-runde17.cjs` 38/38.
- Die PR-Beschreibung der jeweils letzten Runde steht in
  `review/ERGEBNIS.md`, die Übergaben aller Runden in `review/LOG.md`,
  die Fragen an Casimir in `review/MORGENBRIEF.md`.
- **Offen ist keine Migration.**

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

## Runde 21 (20.09.2026) — der Weg des Z-Berichts in die Datenbank

Runde im Log unter „Runde 21". `sw.js` steht auf **v67**.
`npm test`: **560 von 560** grün. Browser: `node tests/ui-runde21.cjs`
19 von 19, `node tests/ui-leitung-echt.cjs` 44 von 44.
**Keine Migration** — alle Spalten stehen live.

Der Auftrag lautete, den Z-Bericht-Import serverseitig zu bauen. **Das war
seit Runde 5 gebaut** (POST und GET `/api/fassungsliste`, ein Leser im
Worker, Upsert je Betriebstag, Laden vom Server); der Auftrag stützte sich
auf ein Dokument, das es im Repo nicht gibt. Casimir hat auf Rückfrage
entschieden, stattdessen die echten Lücken desselben Weges zu schliessen.

1. **Der Import war nicht atomar.** Kopf, Räumen und Zeilen waren drei
   Schreibvorgänge; scheiterte der dritte, war der alte Bericht gelöscht
   und der neue nie angekommen — im Mailweg unbemerkt. Jetzt einer.
   Ein Bericht ohne Positionen wird abgewiesen, statt den Tag leerzuräumen.
2. **Ein Teilbericht ersetzte den vollen lautlos.** Schliessen Bar und
   Restaurant getrennt ab, fehlte dem Abgleich danach eine ganze
   Kostenstelle, mit einem grünen „eingelesen". Jetzt nennt eine
   Journalzeile beide Z-Nummern und beide Positionszahlen, und bei
   Verdacht bleibt das Backoffice stehen und sagt, was zu tun ist.
   Zweimal dieselbe Datei erzeugt keine Zeile.
3. **Zeitraum und Kostenstelle** stehen im Bericht und blieben leer. Jetzt
   werden sie gelesen und gezeigt („15.09. 23:11 – 16.09. 23:26"). Daran
   sieht man ohne Rechnen, ob ein Bericht die ganze Nacht abdeckt.
4. **Der Start des Backoffice kostete bis zu 61 Anfragen** nacheinander,
   gemessen 4,1 s leerer Schirm. Jetzt eine.

**Die tägliche Automation (Gmail → Backoffice) ist im Code fertig** — der
Mailempfang schreibt über dieselbe Funktion. Es fehlt allein die
Einrichtung im Dashboard, siehe unten.

## Runde 22 (21.09.2026) — die Vorabliste

Runde im Log unter „Runde 22". `sw.js` steht auf **v71**.
`npm test`: **581 von 581** grün. Browser: `node tests/ui-runde22.cjs`
31 von 31, `node tests/ui-leitung-echt.cjs` 44 von 44,
`node tests/ui-runde21.cjs` 19 von 19. **Keine Migration.**

Nach dem Einlesen standen 44 von 48 Kassennamen offen und warteten auf
ein Auswahlfeld. Jetzt sind es 15 — und im echten Bericht vom 19.09.
noch 21 von 57 statt 43.

1. **`VORAB` in `src/gnmap.js`:** 36 geprüfte GANZE Kassennamen, 15 auf
   einen Artikel, 21 als „kommt nicht aus dem Keller" (Speisen, Kaffee,
   Spirituosen pur). Jeder Eintrag trägt seinen Grund daneben. Wortgleich
   gespiegelt in `public/leitung.html`, zusammengehalten von
   `tests/vorab-gleich.test.mjs`.
2. **Regel 5 ist unberührt.** `mappe()` steht Zeichen für Zeichen, wie sie
   war, und rät bei keinem dieser Namen — alle Regel-5-Prüfungen sind ohne
   Änderung grün. Die Vorabliste steht DANEBEN und schlägt nur nach
   (`Object.hasOwn`, kein Vergleich). Reihenfolge im Worker:
   **bestätigt → Vorabliste → Kassenmuster.** Die Datenbank schlägt die Liste.
3. **Ein Klick im Backoffice.** Neuer Zustand „vorgeschlagen"; der Knopf
   heisst „Alle Vorschläge übernehmen" und nimmt Weine, Getränke und die
   zu ignorierenden Speisen auf einmal an. Eine bestätigte Zuordnung fasst
   er nie an.
4. **Zwei Vertipper gefunden** (stehen live): „Cola Zero" liegt auf `cola`
   statt `colaz`, „Now-Limo Orange" auf `lemon` statt `orange`. Nichts
   geändert — aber wo die geprüfte Liste widerspricht, sagt es die Zeile.

**Bewusst NICHT gemacht:** Cocktails auf „Ignorieren" setzen, obwohl das
die Vorgabe war. Sie zehren Zitronensaft, Ginger Ale, Holundersirup und
Tonic aus dem Keller; ignoriert käme das als Schwund zurück. Die 15
Namen bleiben offen und brauchen ein Rezept (`review/BACKLOG.md`, hoch).

## Was als Nächstes ansteht

- **Sechs Fragen aus Runde 22** stehen fertig aufbereitet in
  `review/MORGENBRIEF.md`: die zwei Vertipper, die Gasteiner-Artikel,
  Raschhofer Pils (im Keller gibt es kein Pils), Radler, Hauslimo,
  „Weißer Spritzer", „Tomate" — und die grosse: sollen die 15 Cocktails
  Rezepte bekommen oder ignoriert werden?
- **Casimirs Aufgabe für die Automation:** die Weiterleitung von
  gastronovi auf die Mailadresse des Workers einrichten und `ABSENDER`
  prüfen. Dashboard — für Agenten nicht erreichbar (Regel 13).
  Code ist fertig, es braucht keine Runde mehr dafür.
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
