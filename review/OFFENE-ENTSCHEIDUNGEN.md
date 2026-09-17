# Offene Entscheidungen

Hier steht alles, was ein Agent NICHT selbst entscheiden darf. Laut `CLAUDE.md` gehören hierher unter anderem:

* neue Frameworks, Build-Schritte oder Abhängigkeiten (Regel 8)
* jede Änderung an `RUNDEN` (Regel 11)
* Vorschläge zu `wrangler.jsonc`, z. B. observability (Regel 12)
* Schritte, die nur im Cloudflare-Dashboard möglich sind – Secrets, D1-Bindung, ASSETS, ABSENDER, Crons (Regel 13)
* größere Ablaufänderungen aus Sicht des Betriebs (hospitality-pro)

Format je Punkt: Frage · Hintergrund · Optionen mit Folgen · Empfehlung · Status.
Status: OFFEN | FREIGEGEBEN | ABGELEHNT. Freigaben bitte direkt hier eintragen, damit der nächste Zug sie sieht.

---

## 1. Fehlende Referenzdateien – blockiert den Start

**Status:** OFFEN
**Gemeldet:** Setup

**Hintergrund:** `CLAUDE.md` setzt drei Dinge voraus, die im Repo nicht liegen:

| Datei | Wofür gebraucht | Folge, wenn sie fehlt |
|---|---|---|
| `docs/live-schema.sql` | Regel 3: einzige Wahrheit über das Live-Schema, Basis jeder lokalen Test-DB | Regel 3 und 4 sind nicht prüfbar. QA kann SQL-Stellen im Code gegen nichts abgleichen. Schemaänderungen in Phase B lassen sich nicht testen. |
| `PROJEKTANLEITUNG-Fassungstool.md` | „vor jeder Arbeit lesen", Abschnitt 4 enthält die zwei geplanten `ereignis`-Indizes | Jede Rolle arbeitet ohne die maßgebliche Doku. Die erste geplante Migration ist nicht spezifiziert. |
| `tests/fixtures/` | Referenz für QA (Parser, Randfälle) und Controller (Zeitraum durchrechnen) | Schritt 4 im Ablauf von qa-guardian und controller ist nicht ausführbar. |

**Optionen:**

1. Dateien nachliefern, dann Zyklus starten. → Alle Regeln greifen wie vorgesehen. Empfohlen.
2. Zyklus ohne sie starten. → Rollen arbeiten nach Codelektüre statt nach dokumentiertem Schema. Regel 3 wird faktisch ausgesetzt; QA kann kein Veto auf Schemabasis aussprechen.
3. Live-Schema von Claude aus `src/index.js` rekonstruieren lassen. → Verletzt Regel 3 (`schema.sql` ist veraltet, Wahrheit ist die Live-D1) und erzeugt eine Vermutung, die wie eine Quelle aussieht. Nicht empfohlen.

**Empfehlung:** Option 1. `docs/live-schema.sql` aus der Live-D1 exportieren (D1-Konsole, `PRAGMA`/Schema-Export) und zusammen mit der Projektanleitung und den Fixtures einchecken.

---

## 2. Arbeitsbranch `v2-review` vs. Setup auf `main`

**Status:** OFFEN
**Gemeldet:** Setup

**Hintergrund:** Regel 1 verbietet jeden Push auf `main`. Das Setup selbst (diese Dateien, `CLAUDE.md`, die Rollen) liegt auf deine ausdrückliche Anweisung hin auf `main`. Ab jetzt gilt Regel 1 ohne Ausnahme: Der Zyklus läuft auf `v2-review`.

**Zu klären:** Soll bei künftigen Setup-/Regeländerungen ebenfalls direkt auf `main` gearbeitet werden, oder gehen auch die über `v2-review` und einen PR?

**Empfehlung:** Regeldateien künftig ebenfalls über `v2-review`, damit es keinen zweiten Weg an Regel 1 vorbei gibt. Jeder Push auf `main` löst zudem einen Workers-Build aus.
