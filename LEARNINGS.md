# Learnings · Fassungstool

<!-- Kurz und datiert. Neueste oben. -->

## 19.09.2026 (Runde 17)
- **Ein `save()` ist noch kein Arbeiten.** `start()` speichert unbedingt, und die
  45-Sekunden-Uhr machte daraus einen laufenden Vorgang am Server. Eine Schwelle,
  die die Oberfläche ohnehin schon zieht (`hasData`), war die richtige Antwort —
  kein neuer Begriff, und sie räumt beim Lesen zugleich die Altlasten weg.
- **Einen Serverzustand kann man auch ohne Schemaänderung zurücknehmen.** Der
  Worker leitet `status` allein aus `daten.finished` ab und bucht nur beim
  Abschluss. Ein LEERER laufender Stand mit höherer Zählnummer ist damit ein
  gültiges „hier läuft nichts mehr“ — ohne DELETE, ohne Migration.
- **Die Zählnummer des Geräts kann hinter der des Servers liegen** (übernommener
  Fremdstand, Neuinstallation, geleerter Speicher). Wer etwas hinausschickt, das
  ankommen MUSS, gleicht vorher an — sonst weist der 409-Wächter es ab.
- **`render()` hat einen frühen Ausstieg** (Gattungsfrage Wein/Getränke bei
  `nach`/`keller`/`ware`). Wer am Ende von `render()` etwas nachzeichnet, zeichnet
  es auf genau diesem Schirm nicht. Gefunden hat das erst die neue Prüfung.
- **Ein Knopf in einem Knopf geht nicht.** Die Menükachel ist selbst ein
  `<button>`; der Papierkorb braucht eine Hülle und ein Geschwister-Element.
  Dieselbe Falle hatte schon der Knopf „Gesehen“ in der Statuszeile.
- **Die Gestaltungsschicht ist nur der Token-Block** (bis ca. Zeile 244 in
  `leitung.html`). `.mi` und `.netz` stehen ausschliesslich in `index.html` —
  Regeln dafür müssen NICHT verdoppelt werden.
- **Ursache von „Nicht angemeldet“ gefunden:** `sessionStorage` (App) läuft
  gegen einen Keks mit 12 Stunden Frist (Server). Zwei Uhren, eine Anzeige.

## 19.09.2026
- Arbeits-Setup liegt jetzt zentral im Plugin `c` (Repo `haushirt/casimir-claude`),
  eingebunden über `.claude/settings.json`. Regeln nicht mehr je Repo pflegen.
- Der Check vor „fertig" nutzt `npm test` (440 Tests, ca. 4 s) – schnell genug,
  um vor jeder Fertigmeldung zu laufen.
- Regel 1 in `CLAUDE.md` nannte `v2-review` als einzigen Arbeitszweig – überholt.
  Von Casimir bestätigt und berichtigt: immer `claude/…`, nie direkt auf `main`.
