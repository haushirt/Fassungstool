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
| ~~`PROJEKTANLEITUNG-Fassungstool.md`~~ | — | **ERLEDIGT** am 17.09., Stand 16.09.2026 eingecheckt. Zugangscodes dabei nach Regel 9 entfernt. |
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


---

## 3. Aufgaben, die nur du ausführen kannst (Regel 13)

**Status:** OFFEN
**Gemeldet:** Setup

| Dringlichkeit | Aufgabe | Quelle |
|---|---|---|
| **sofort** | `ANLAGE_OFFEN` im Dashboard löschen. Solange sie steht, legt sich jeder mit der Adresse ein Konto mit Rolle `leitung` an. | Projektanleitung §1, §8 |
| hoch | `docs/live-schema.sql` erzeugen: `SELECT name, sql FROM sqlite_master WHERE type='table';` in der D1-Console, Ergebnis als Datei einchecken. | Regel 3, Projektanleitung §5 |
| hoch | `tests/fixtures/` füllen – anonymisierte Z-Berichte und Zählungen. | `CLAUDE.md`, Testdaten |
| mittel | Sicherung der D1 einrichten. D1 hat keinen Papierkorb. | Projektanleitung §8 |
| mittel | `WORKER-ANPASSUNG.md` und `ANMELDESPERRE.md` nachreichen oder als überholt erklären. | Projektanleitung §8 |
| mittel | `review/INPUT-TEAM.md` mit dem Team ausfüllen – hat laut `CLAUDE.md` Vorrang vor eigenen Ideen. | `CLAUDE.md` |

---

## 4. `RUNDEN` von 1000 auf 100000 (Regel 11)

**Status:** OFFEN
**Gemeldet:** Setup

**Hintergrund:** Projektanleitung §8 Punkt 4 nennt das Heraufsetzen als geplant, die CPU-Diagnose vom 27.08. sei widerlegt. Regel 11 verbietet jede Änderung ohne deine Freigabe, weil **alle vier Personen neu angelegt werden müssen** – die Prüfsummen passen sonst nicht mehr und niemand kommt hinein.

**Folge des Zeitpunkts:** Die Anleitung sagt „also vor dem Start". Passiert es mitten im Zyklus oder im laufenden Betrieb, steht der Service ohne Anmeldung da.

**Empfehlung:** Erst freigeben, wenn du die vier Personen unmittelbar danach neu anlegen kannst – idealerweise vormittags, nicht vor einem Abendservice. Kein Agent fasst `RUNDEN` vorher an.

---

## 5. `observability` in `wrangler.jsonc` aufnehmen (Regel 12)

**Status:** OFFEN
**Gemeldet:** Setup

**Hintergrund:** Observability ist im Dashboard eingeschaltet, steht aber nicht in `wrangler.jsonc`. Seit dem Auto-Deploy kann ein Deploy sie entfernen (Projektanleitung §6). Dasselbe Risiko gilt für D1-Bindung, `ASSETS`, `ABSENDER` und Crons.

**Vorschlag (nicht ausgeführt, Regel 12):**

```jsonc
"observability": { "logs": { "enabled": true, "invocation_logs": true } }
```

**Empfehlung:** Du trägst es selbst ein, nachdem du `wrangler.jsonc` gegen den Dashboard-Stand abgeglichen hast. Ein Agent kann nicht sehen, was im Dashboard steht, und würde beim Schreiben womöglich genau das überbügeln, was dort nur einseitig gepflegt ist.
