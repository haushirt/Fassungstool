# Learnings · Fassungstool

<!-- Kurz und datiert. Neueste oben. -->

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
