---
name: zurueck
description: Letzte Aenderung sicher rueckgaengig machen - mit git revert, ohne Historie zu loeschen. Auch verwenden bei "rueckgaengig", "zurueck", "undo", "mach das wieder weg".
argument-hint: "[optional: was genau]"
disable-model-invocation: true
---

# /zurueck - sicher rueckgaengig machen

Gemeint ist: $ARGUMENTS

1. Zeige mit `git log --oneline -5`, was zuletzt passiert ist.
2. Sage in **genau einer Zeile**, was zurueckgenommen wird
   (Commit-Titel in einfacher Sprache).
3. **War die Aenderung schon live?** Pruefe, ob der Commit bereits auf dem
   Hauptzweig (`main`) liegt oder ein Deploy daran haengt. Wenn ja, haenge
   1 Zeile an: "Achtung: war schon live - das Zuruecknehmen geht auch live."
4. Frage kurz: "Zuruecknehmen?" - ausser `!!!` steht in seiner Nachricht.
5. Dann `git revert <commit>` - **niemals** `git reset --hard`, niemals
   `--force`, niemals Historie umschreiben.
6. Bei Konflikten: aufloesen, nicht abbrechen. Danach 1 Zeile Bestaetigung.
