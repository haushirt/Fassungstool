# Learnings · Fassungstool

<!-- Kurz und datiert. Neueste oben. -->

## 19.09.2026
- Arbeits-Setup liegt jetzt zentral im Plugin `c` (Repo `haushirt/casimir-claude`),
  eingebunden über `.claude/settings.json`. Regeln nicht mehr je Repo pflegen.
- Der Check vor „fertig" nutzt `npm test` (440 Tests, ca. 4 s) – schnell genug,
  um vor jeder Fertigmeldung zu laufen.
- Regel 1 in `CLAUDE.md` nannte `v2-review` als einzigen Arbeitszweig – überholt.
  Von Casimir bestätigt und berichtigt: immer `claude/…`, nie direkt auf `main`.
