---
name: tag
description: Autonom durcharbeiten, waehrend Casimir erreichbar ist. Entscheidet Kleinkram selbst, fragt nur bei wichtigen Weichen - gebuendelt und mit Antwortoptionen fuers Handy.
argument-hint: "[was soll heute passieren]"
disable-model-invocation: true
model: opus
---

# /tag - allein arbeiten, Casimir ist erreichbar

Modell: Opus. Wechselt es nicht automatisch, sage in 1 Zeile: "Bitte /model opus".

Auftrag: $ARGUMENTS

Wie `/nacht`, mit einem Unterschied: Casimir ist am Handy erreichbar. Das heisst
**nicht**, dass du ihn fragen sollst. Es heisst, dass du bei einer echten Weiche
fragen **darfst**, statt sie selbst zu entscheiden.

## Start (kurz)
1. Lies `STAND.md`, dann `CLAUDE.md`.
2. Ziele in der Reihenfolge, in der du sie abarbeitest, je Ziel ein messbares
   Abnahmekriterium ("fertig, wenn ..."). Hoechstens 8 Zeilen.
3. **Vorschau (R3)**, hoechstens 4 Zeilen.
4. Loslegen. Eigener `claude/…`-Branch, nie direkt auf `main`.

## Was du selbst entscheidest
Alles, was leicht rueckgaengig zu machen ist und das Ergebnis nicht sichtbar
aendert: Benennungen, Reihenfolge im Code, Aufteilung in Dateien, Testaufbau,
Formulierungen im Commit, welchen von zwei gleichwertigen Wegen du nimmst.
**Nicht fragen. Entscheiden, weiterarbeiten** - und jede dieser Entscheidungen
mit einem Satz Begruendung sammeln. Sie kommen alle in den Abschluss.

## Wann du fragst
Nur bei einer **echten Weiche**. Eine Weiche ist es, wenn eines von beidem gilt:
- **Schwer rueckgaengig:** Daten, Schema, Migration, Live-Gang, geloeschte
  Inhalte, etwas, das Geraete im Betrieb betrifft.
- **Das Ergebnis aendert sich klar:** Casimir wuerde am Bildschirm etwas anderes
  sehen oder anders arbeiten, je nachdem wie du entscheidest.

Alles andere ist keine Weiche, auch wenn es sich gross anfuehlt.

## Wie du fragst
1. **Erst alles erledigen, was nicht von der Antwort abhaengt.** Eine Frage
   stoppt die Arbeit nicht - sie wartet, bis nichts anderes mehr geht.
2. Dann **gebuendelt fragen, hoechstens 3 Fragen** in EINER Nachricht.
3. **Mit Antwortoptionen**, damit er am Handy nur tippen muss: je Frage 2 bis 4
   klare Moeglichkeiten, die beste zuerst und mit "(Empfehlung)" markiert.
   Nutze dafuer das Auswahl-Werkzeug (AskUserQuestion), nicht Fliesstext.
4. Je Frage eine Zeile, warum sie wichtig ist. Keine Erklaerungen darueber hinaus.
5. **Nach seiner Antwort sofort weiterarbeiten. Keine Bestaetigung, keine
   Zusammenfassung, keine Rueckfrage** - einfach machen.
6. Antwortet er nicht: die sicherere Moeglichkeit nehmen, das in
   `UEBERGABE.md` unter "Selbst entschieden, weil keine Antwort kam" vermerken
   und weiterarbeiten. Niemals stehenbleiben und warten.

## Waehrend der Arbeit
- Regelmaessige Commits, kleine Schritte.
- Nach **jedem** Ziel: Build, Lint und Tests. Rot heisst reparieren, bevor es
  weitergeht.
- Nur Aufgabenliste plus hoechstens 1 Zeile Status (R4). Sonst kein Text.
- Nichts anfassen, was nicht zu den Zielen gehoert (R7).

## Ende
1. **Abschluss nach R5**, hoechstens 6 Zeilen.
2. Direkt darunter: **"Selbst entschieden:"** - die gesammelten Entscheidungen,
   je eine Zeile. Diese Liste zaehlt nicht zu den 6 Zeilen.
3. `STAND.md` aktualisieren, `LEARNINGS.md` kurz und datiert ergaenzen.
4. Pull Request auf `main`. **Nicht selbst mergen**, ausser er hat es
   ausdruecklich gesagt - ein Merge kann automatisch deployen.
