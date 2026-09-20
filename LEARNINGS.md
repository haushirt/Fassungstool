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

## 20.09.2026 · Runde 18 (Backoffice)

- **„Die Spalte fehlt" hieß: die Spalte steht neben dem Bild.** Der Befund
  „Ansehen zeigt nur Positionen, keine Anzahl" war richtig beobachtet und falsch
  erklärt. Die Zahl stand immer in der Tabelle — unter 900 px aber 170 px rechts
  ausserhalb, weil `.tabhuelle table{min-width:560px}` für JEDE Tabelle galt,
  auch für eine mit zwei Spalten. Lehre: Bevor etwas nachgebaut wird, erst am
  echten Gerät nachsehen, ob es nicht schon da ist.
- **Ein Prüfstand, der nur am MacBook misst, sieht genau diesen Fehler nicht.**
  Der Befund fiel erst auf, als die neue Ansicht bei 390 px abgebildet wurde.
  Seitdem misst `tests/ui-runde18.cjs`, ob eine Mengenzelle über die
  Fensterbreite hinausragt — eine Zahl, kein Augenschein.
- **Eine Zahl auf einem Schirm will angetippt werden.** Die vier Kacheln waren
  seit Runde 1 reine Anzeigen. Jede beantwortet eine Frage mit einer Zahl, und
  die nächste Frage ist immer „welche?".
- **PDF braucht keine PDF-Bibliothek.** Der Druckdialog des Browsers kann „Als
  PDF sichern"; nötig ist nur ein Blatt und ein `@media print`-Block. Das spart
  eine Abhängigkeit, einen Bauschritt und jede Menge Gewicht (Regel 8).
- **Argumente mit Vorgabewerten in der Mitte sind eine Falle.** Der Helfer
  `kachel(t,w,u,kl,status,ziel,fuehrt)` bekam bei zwei von vier Aufrufen ein
  Argument zu wenig — der Zieltext landete im Feld `ziel`. Kein Fehler, kein
  Absturz, nur zwei Kacheln, die nirgendwohin führten. Gefunden hat es der
  Prüfstand, nicht das Auge.
- **Abschnittsmarken im Quelltext sind Schnittstellen.** `tests/unklar-wandert`
  schneidet den Prüfausschnitt an „7e · Speicher" ab. Ein eingeschobener
  Abschnitt hat den Buchstaben verschoben und die Prüfung rot gemacht — richtig
  so, genau dafür ist sie da.

## 20.09.2026 · Runde 18, nach zwei Jagden

- **Wer eine Lücke über ihre Gründe zählt, zählt nur die Gründe, die er
  kennt.** Der erste Vorbehaltskasten las die drei Listen, die sich selbst
  melden. Zwei Wege melden sich nicht („Ignorieren", Rezeptzutat mit 0 ml) —
  und genau dort druckte das Blatt wieder „Schwund". Die Behebung war eine
  Zeile Arithmetik: zähle, wie viel von der Verkaufsseite in der Rechnung
  ANKOMMT, nicht warum etwas fehlt. Diese Zahl ist gegen den nächsten stillen
  Weg dicht, den noch niemand kennt.
- **Ein Ausdruck, der aus dem Haus geht, darf niemanden beschuldigen.** Das
  Wort „Schwund" ist auf einem Bildschirm mit drei Warnungen daneben etwas
  anderes als auf einem Blatt in einer WhatsApp-Gruppe. Es steht jetzt gar
  nicht mehr darauf.
- **Eine Regel, die nur zu Beginn einer Runde gilt, ist keine Regel.**
  `VERSION` in `sw.js` wurde beim ersten Commit erhöht und danach vergessen,
  während dieselbe Datei sich zweimal änderte. Offline wäre der alte Stand
  ausgeliefert worden — ausgerechnet der mit dem Fehler. Gehört vor jeden
  Push geprüft, nicht einmal.
- **Eine Behebung, die eine neue Lücke aufmacht, ist keine.** Nach der ersten
  Jagd liess die Wischgeste bei offener Leiste den Rand los — dort, wo der
  Daumen liegt. Zwei Jagden für dieselbe Geste.
- **Ein Prüfstand, der den Finger auf den Rumpf setzt statt auf das Element,
  kann einen Treffer nicht sehen.** Die erste Fassung des Wischprüfstands
  schickte alle Ereignisse an `document.body`; `event.target` war damit nie
  das Suchfeld, und die Prüfung hätte den Fund der Jagd nie gefunden.

## 20.09.2026 · Runde 18, nach der dritten Jagd

- **Kommt derselbe Fund dreimal, ist die Behebung falsch, nicht der Fund.**
  Dreimal lautete er „Bildschirm und Blatt sagen Verschiedenes", dreimal habe
  ich die Textstelle berichtigt, die gerade genannt war. Erst beim dritten Mal
  die beiden Stellen zu EINER gemacht. Zwei Texte für dieselbe Aussage sind
  keine Doppelung, sondern ein offener Widerspruch mit Verzögerung.
- **Eine Warnung, die nie ausgeht, ist keine Warnung.** Der Vorbehaltskasten
  zählte Rührei und Espresso als fehlenden Getränkeverkauf und hätte auf jedem
  Blatt „unvollständig" gesagt. Eine Entscheidung („Ignorieren") und eine
  Lücke sind zwei verschiedene Dinge und brauchen zwei verschiedene Töne.
- **Ein Prüfstand, der grün bleibt, wenn man den geprüften Zweig entfernt,
  prüft sich selbst.** Die Gegenprobe gehört in jedes Urteil: dieselbe Lage
  einmal mit und einmal ohne die Ursache.
- **Ein Prüfstand mit unrealistischen Eingabedaten prüft eine andere App.**
  Die Kassennamen trugen keine Einheit; `mlAusText()` fand nichts, und die
  Verkaufsseite war im ganzen Prüfstand leer. Alle Urteile über Differenzen
  liefen über reine Entnahme, ohne dass es jemandem auffiel.

## 20.09.2026 · Runde 18, nach vier Jagden

- **Eine Wahrheit mit mehreren Lesern heilt man nicht bei einem Leser.**
  Vier Stellen deuten dieselbe Differenz: Druckblatt, Mittagsblick,
  Bildschirm „Verkauf ↔ Fassung", CSV. Vier Jagden haben denselben A-Fund
  gemeldet, und dreimal habe ich den Leser behoben, der gerade in der Kritik
  stand. Wer eine Auskunft ändert, zählt zuerst, wie viele Stellen sie geben —
  und legt sie zusammen, statt sie nachzuziehen.
- **Ein Prüfstand, der die eigene Änderung nicht rot macht, bewacht nichts.**
  Die Mutationsprobe („dreh die Änderung zurück und sieh nach, ob es rot
  wird") hat vier von fünf Änderungen dieser Runde als unbewacht entlarvt.
  Sie gehört zu jedem neuen Urteil.
- **Manche Befunde sind keine Aufgaben, sondern Entscheidungen.** Dass eine
  Zeile mit ignoriertem Verkauf grün „stimmt" sagt, lässt sich nicht
  reparieren, ohne festzulegen, was „Ignorieren" bedeuten soll. Solche Punkte
  gehören mit zwei ausgearbeiteten Wegen in den Backlog, nicht in dieselbe
  Nacht.
