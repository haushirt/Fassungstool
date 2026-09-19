---
name: plan
description: Projektstart oder groesserer Schritt, Casimir ist dabei. Erst verstehen, Fragen buendeln, dann kurzer Plan mit Vorschau - umgesetzt wird erst nach seinem OK.
argument-hint: "[worum geht es]"
disable-model-invocation: true
model: opus
---

# /plan - gemeinsam planen

Modell: Opus. Wechselt es nicht automatisch, sage in 1 Zeile: "Bitte /model opus".

Aufgabe: $ARGUMENTS

Arbeite in dieser Reihenfolge und halte dich an die Regeln R1-R7 (Skill `regeln`):

1. **Verstehen.** Lies zuerst `STAND.md`, falls vorhanden, danach `CLAUDE.md`.
   Erkunde nur so viel Code wie noetig. Keine Zwischenberichte.
2. **Hinterfragen.** Gib knappes, ehrliches Feedback zum Vorhaben: Was ist
   unklar, was ist riskant, was wuerdest du anders machen. Hoechstens 5 Zeilen.
3. **Fragen buendeln.** Hoechstens 3 Fragen, alle in EINER Nachricht, am besten
   als Auswahl mit Vorschlag. Nur Fragen stellen, deren Antwort das Ergebnis
   wirklich aendert. Steht `!!!` in seiner Nachricht: keine Fragen.
4. **Plan.** Hoechstens 10 Zeilen:
   - was gebaut wird, in einfacher Sprache
   - welche Dateien angefasst werden
   - was er selbst bestaetigen oder manuell erledigen muss (gesammelt)
5. **Vorschau (R3).** Hoechstens 4 Zeilen: Dauer, Groesse S/M/L, Passung in %,
   kritische Punkte.
6. **Stopp.** Warte auf sein OK. Erst danach umsetzen.
7. **Umsetzen.** Eigener Branch. Waehrend der Arbeit nur Aufgabenliste plus
   1 Zeile Status (R4). Am Ende Abschluss nach R5, `STAND.md` aktualisieren,
   `LEARNINGS.md` ergaenzen.
