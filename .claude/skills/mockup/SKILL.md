---
name: mockup
description: Bild vor Code bei jeder optischen Aenderung. Verwende diesen Skill IMMER, sobald das Wort "mockup" irgendwo in Casimirs Nachricht steht - auch in Kombination mit anderen Befehlen. Ausserdem bei Aufgaben zu Aussehen, Layout, Farben, Schrift, Abstaenden, Knoepfen oder Bildschirmen, bevor echter Code geschrieben wird.
argument-hint: "[welches Element oder welcher Screen]"
---

# /mockup - erst Bild, dann Code

Gewuenscht: $ARGUMENTS

**Grundsatz:** Vor jeder optischen Aenderung zuerst ein Bild. Echter Code erst,
nachdem Casimir eine Variante gewaehlt hat.

## So billig wie moeglich
- Nur das **betroffene Element oder den betroffenen Screen** rendern, nie die
  ganze App.
- Im **echten Stil des Projekts**: die vorhandenen Farben, Schriften und
  Abstaende aus den Projektdateien uebernehmen, nicht neu erfinden.
- Wenn es sinnvoll ist: **zwei Varianten A und B**. Sonst eine.
- Nur die noetigen Ansichten aufnehmen.

## Ablauf
1. Finde die Stelle im Projekt (HTML/CSS) und uebernimm die Gestaltungsschicht.
2. Lege eine einzelne Mockup-Datei unter `review/mockup/` (oder `mockup/`,
   falls es `review/` nicht gibt) ab - eine Datei je Variante.
3. Bilder erzeugen:

   ```bash
   node "${CLAUDE_PROJECT_DIR}/.claude/scripts/mockup-shot.cjs" \
     --root <ordner-mit-der-html> --page <datei.html> --out <zielordner>
   ```

   Aufgenommen wird in drei Groessen:
   - iPhone 16: 393x852
   - iPad mini: 744x1133
   - MacBook: 1440x900

   Fehlt Playwright oder der Browser, meldet das Skript das im Klartext.
   Dann schreibe in 1 Zeile, was Casimir einstellen muss, und mache ohne Bild
   weiter - nicht still scheitern.
4. **Bilder direkt im Chat zeigen:** jedes erzeugte PNG mit dem Read-Werkzeug
   oeffnen, damit es sichtbar wird. Kein Text drumherum ausser einer Zeile
   je Variante.
5. Frage kurz: "A oder B?" bzw. "Passt das?" - dann warten.
6. Erst nach seiner Wahl den echten Code aendern.
