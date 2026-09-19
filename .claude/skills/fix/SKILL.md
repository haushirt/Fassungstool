---
name: fix
description: Kleine Fixes und Aenderungen - 1 Zeile Verstaendnis, kurze Vorschau, eine Rueckfrage, dann machen. Hoechstens 3 Dateien.
argument-hint: "[was soll geaendert werden]"
disable-model-invocation: true
model: sonnet
---

# /fix - kleine Aenderung

Modell: Sonnet. Wechselt es nicht automatisch, sage in 1 Zeile: "Bitte /model sonnet".

Aufgabe: $ARGUMENTS

1. **1 Zeile Verstaendnis.** "Verstanden: ..." - was du gleich tust.
2. **Vorschau (R3), hoechstens 4 Zeilen.** Dauer, Groesse S/M/L, Passung in %,
   kritische Punkte.
3. **Eine Rueckfrage:** "So ausfuehren?" - dann warten.
   **Entfaellt komplett**, wenn `!!!` in seiner Nachricht steht: dann sofort machen.
4. **Umfangsgrenze: hoechstens 3 Dateien.** Merkst du beim Arbeiten, dass es
   mehr wird, brich ab und schreibe genau eine Zeile:
   "Groesser als gedacht -> /plan?"
5. **Optische Aenderung?** Steht "mockup" in seiner Nachricht, nutze zuerst den
   Skill `mockup`. Steht es nicht da, frage in 1 Zeile: "Mockup?"
6. **Fertig.** Kurzer Abschluss nach R5, hoechstens 6 Zeilen. Der Check vor
   "fertig" laeuft automatisch - warte sein Ergebnis ab, bevor du fertig meldest.
