---
name: nacht
description: Autonomer Runner fuer lange Sessions ohne Casimir - erst alles klaeren, dann stundenlang allein arbeiten.
argument-hint: "[was soll ueber Nacht passieren]"
disable-model-invocation: true
model: opus
---

# /nacht - autonom durcharbeiten

Modell: Opus. Wechselt es nicht automatisch, sage in 1 Zeile: "Bitte /model opus".

Auftrag: $ARGUMENTS

Dieser Skill hat zwei Phasen. **Phase 1 passiert MIT Casimir, Phase 2 ohne ihn.**
Alles, was du in Phase 2 wissen musst, musst du in Phase 1 fragen. Danach gibt
es keine Rueckfragen mehr.

## Phase 1 - mit Casimir (kurz halten)

1. Lies `STAND.md` und `CLAUDE.md`.
2. **Ziele festlegen.** Liste die Ziele in der Reihenfolge, in der du sie
   abarbeitest. Je Ziel ein **messbares Abnahmekriterium** ("fertig, wenn ...").
   Hoechstens 8 Zeilen.
3. **Alle offenen Fragen jetzt klaeren**, gebuendelt in EINER Nachricht.
   Diese zwei Fragen stellst du **immer**:
   - a) Nur bis zum Pull Request, oder darf ich auch mergen?
   - b) Darf deployt werden?
     Dazu der Hinweis: **Ein Merge kann automatisch deployen.** Pruefe im Repo,
     ob das so ist (z. B. Workers Builds, GitHub Actions auf `main`), und sage
     ihm das Ergebnis in 1 Zeile.
4. **Erinnere ihn:** "Waehle im Modus-Menue den Modus ohne Rueckfragen, sonst
   stehe ich nach dem ersten Schritt still."
5. **Vorschau (R3)**, hoechstens 4 Zeilen.
6. Abschlusssatz, genau so: **"Ich leg los, meld mich in ca. X h."**

## Phase 2 - ohne Casimir

- **Eigener Branch.** Nie direkt auf `main`.
- Ziel fuer Ziel in der vereinbarten Reihenfolge.
- **Regelmaessige Commits**, kleine Schritte, verstaendliche Commit-Titel.
- Nach **jedem** Ziel: Build, Lint und Tests des Projekts laufen lassen.
  Rot heisst: reparieren, bevor es weitergeht.
- **Keine Fragen.** Kommst du nicht weiter, schreibe die Blockade in
  `UEBERGABE.md` unter "Blockaden" und mache mit dem naechsten Ziel weiter.
  Niemals stehenbleiben und warten.
- Nichts anfassen, was nicht zu den Zielen gehoert (R7).

## Ende

1. **Abschluss nach R5**, hoechstens 6 Zeilen.
2. **Merge oder Pull Request**, genau wie in Phase 1 vereinbart. Nie mehr.
3. **`STAND.md`** aktualisieren: wo wir stehen, was als Naechstes ansteht,
   bekannte Baustellen.
4. **`LEARNINGS.md`** ergaenzen, kurz und datiert.
5. **`UEBERGABE.md`** schreiben mit einem fertigen Uebergabe-Prompt, den
   Casimir in die naechste Session kopieren kann:

   ```markdown
   # Uebergabe <Datum>

   ## Erledigt
   - ...

   ## Blockaden
   - ...

   ## Prompt fuer die naechste Runde
   <hier der fertige Text zum Kopieren>
   ```
