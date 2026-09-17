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

---

## 6. Wer darf Soll-Mengen und Glasweine festlegen?

**Status:** OFFEN
**Gemeldet:** hospitality-pro, Runde 1
**Betrifft:** `public/index.html:1782` (Menüknopf „Verwaltung"), `:1911` (`askPin`), `:1975` (`renderAdmin`), `hh_cfg_v9`

**Was sich geändert hat:** Bis Runde 1 lag hinter „Verwaltung" ein eigener
Verwaltungscode. Der stand im Klartext in der ausgelieferten Datei und
musste weg – richtig so. An seine Stelle ist `bekannterCode()` getreten:
**jeder Code, der sich auf diesem Gerät schon einmal angemeldet hat.**
Damit darf jetzt jede Servicekraft Glasweine und Soll-Mengen ändern.

**Aus dem Betrieb heraus: falsch.** Nicht wegen Misstrauen – wegen der
Sache, um die es geht.

1. **Glasweine sind die Karte.** Welcher Wein offen ausgeschenkt wird,
   entscheiden Leitung und Sommelier: Preis, Weinkarte, Einkauf,
   Anbruchverlust hängen daran. Wer den Glaswein in der App tauscht, hat
   ihn nicht auf der Karte getauscht. Am nächsten Abend steht ein Wein im
   Bar-Schritt, den der Gast nicht bestellen kann – und einer fehlt, den
   er bestellt.
2. **Die Soll-Menge ist der Hahn zum Keller.** Soll − Ist = Fehlmenge =
   was jeden Tag heraufgetragen wird. Ein Soll von 3 auf 5 erhöht die
   tägliche Entnahme dauerhaft, ohne dass irgendwo ein Beschluss steht.
   Und sie ist die Bezugsgröße, gegen die später der Z-Bericht geprüft
   wird (Projektanleitung §8 C): Verschiebt sich das Soll still, ist der
   Abgleich „Entnahme gegen Ausschank" wertlos.
3. **Die Änderung ist ungezeichnet.** `renderAdmin()` schreibt bei jedem
   Tastendruck (`oninput` → `saveCfg`) in `hh_cfg_v9`. Kein Name, keine
   Uhrzeit, kein Eintrag im Ereignisjournal, keine Rückfrage. Am Morgen
   danach ist nicht feststellbar, dass sich etwas geändert hat, geschweige
   denn wer.
4. **Das Schlimmste: sie gilt nur auf einem Gerät.** `hh_cfg_v9` liegt im
   `localStorage`. Der Kasten im Editor sagt es sogar selbst („gilt nur
   auf diesem Gerät, für die anderen den Code unten übertragen") – und
   niemand überträgt um 23 Uhr einen Konfigurationscode. Ergebnis: iPad
   an der Bar, iPhone und MacBook rechnen mit drei verschiedenen Soll-Werten.
   Wer heute fasst, entscheidet, wie viel geholt wird.
5. **Neue Mitarbeitende ohne Einschulung.** „Verwaltung" steht offen im
   Menü und verspricht nichts Bestimmtes (siehe Backlog). Wer dort auf der
   Suche nach etwas anderem landet, verschiebt mit einem Tipper auf ein
   Zahlenfeld das Soll – ohne Warnung, ohne Bestätigung, ohne Weg zurück.

**Das echte Anliegen des Service ist ein anderes.** „Der Glaswein ist aus,
ich stelle einen anderen rein" passiert samstags um 19 Uhr und ist
berechtigt. Dafür ist aber Projektanleitung §8 B da („Leer" ankreuzen →
Zeile „unbedingt nachbestellen" für die Leitung), nicht das Ändern der
Stammdaten. Service meldet den Zustand, die Leitung entscheidet den Ersatz.

**Wer im Haus entscheidet was:**

| Was | Wer | Wann |
|---|---|---|
| Welche Weine offen ausgeschenkt werden | Leitung mit Sommelier | beim Kartenwechsel, im Backoffice |
| Soll-Menge je Platz (Bar, Schrank, Lade) | Leitung | nach Saison-/Verbrauchslage, im Backoffice |
| „Ist gerade aus" melden | Service | im Moment, in der Fassung |
| Mehr geholt als Soll (Fest, Gruppe) | Service | als Zusatzentnahme im laufenden Vorgang, nicht als neues Soll |

**Optionen:**

1. **So lassen.** Kein Aufwand. Folge: drei Geräte mit drei Soll-Ständen,
   keine Nachvollziehbarkeit, Z-Bericht-Abgleich auf wackeligem Grund.
   Nicht empfohlen.
2. **Rolle beim Anmelden mitspeichern und den Editor daran hängen.**
   `/api/anmelden` liefert `rolle` bereits mit (`src/index.js:140`), die App
   wirft sie weg (`public/index.html:1757`) und `merkeCode` legt nur den
   Namen ab (`:1325`). Speichert man `{name, rolle}`, funktioniert die
   Prüfung auch offline im Keller. Der Editor bleibt für `service` sichtbar,
   aber schreibgeschützt, mit einer Zeile: „Soll-Mengen und Glasweine legt
   die Leitung fest." Kleiner Eingriff, wirkt sofort. **Empfohlen als
   Sofortschritt.**
3. **Editor ganz aus `index.html` heraus**, wie es Projektanleitung §8 A
   schon behauptet. Ehrlich, aber bis `leitung.html` ihn hat, sind
   Glasweine und Soll-Mengen nirgends änderbar.
4. **Zielbild (ohnehin im Backlog, hoch):** Editor in `leitung.html`,
   `hh_cfg_v9` nach D1 `stamm`, jede Änderung mit Name und Zeit ins
   Ereignisjournal. Dann gilt ein Soll für alle Geräte und man sieht am
   Morgen, wer wann was verstellt hat.

**Empfehlung:** Jetzt Option 2, Ziel Option 4. Unabhängig davon, wer
ändern darf, gilt: **Eine Soll-Änderung ist eine Stammdatenänderung und
muss gezeichnet sein** – Name, Zeit, alter Wert, neuer Wert. Ohne das ist
jede Zahl im Keller später unwiderlegbar und unbelegbar zugleich.

---

## 7. Sonderentnahme ohne Grund – Bruch, Personal, Küche, Verkostung

**Status:** OFFEN
**Gemeldet:** hospitality-pro, Runde 1
**Betrifft:** `public/index.html:1361` (Modus `nach`), `:3746` (Notiz), `blank("nach")`

**Ist-Ablauf:** Die Sonderentnahme zählt Flaschen. Warum sie den Keller
verlassen haben, steht – wenn überhaupt – im optionalen Freitextfeld
„Notiz" am Ende, Platzhalter „z. B. Bruch, Verkostung". Optional, ganz
zuletzt, ein Feld für alles.

**Problem im Betrieb:** Der Grund ist bei einer Sonderentnahme nicht die
Nebensache, er ist die Sache. Für die Leitung am Morgen ist „3 Flaschen
weg" ohne Grund keine Information, sondern eine Frage. Und die vier Fälle
werden völlig verschieden behandelt:

| Fall | Was daran hängt |
|---|---|
| Bruch | Schwund, Versicherung, kein Umsatz – muss ausgebucht werden |
| Personalgetränk | Personalaufwand, nicht Wareneinsatz Restaurant |
| Küche (Kochwein, Fond) | Wareneinsatz Küche, nicht Getränke |
| Verkostung / Gast | Marketing bzw. Kulanz, Umsatzschmälerung |
| Zimmer / Amenity | wird dem Zimmer verrechnet oder ist Einladung |

Ohne Grund landet alles im selben Topf und der Wareneinsatz Getränke wird
zu hoch ausgewiesen. Dazu: Ein Freitextfeld am Ende wird nach dem Service
nicht mehr ausgefüllt – und wer keinen Grund angeben muss, meldet die
Entnahme im Zweifel gar nicht.

**Soll-Ablauf (Vorschlag, nicht gebaut):**

1. Kachel antippen → **zuerst** die Frage „Wofür?" mit fünf festen
   Knöpfen: Küche · Personal · Bruch · Verkostung/Gast · Zimmer. Ein
   Tipper, einhändig, keine Tastatur.
2. Danach erst die Flaschen zählen wie bisher.
3. Notiz bleibt optional – für den Sonderfall („Glas beim Ausschank
   gebrochen, Tisch 12").
4. Der Grund reist im Vorgang mit und steht im Protokoll ganz oben, nicht
   in einer Fußnote.
5. Leitung am Morgen: die Sonderentnahmen des Tages nach Grund gruppiert.

**Ausdrücklich NICHT:** kein Pflichtfeld Kostenstelle, keine Zuordnung zu
Tisch oder Zimmernummer, keine Preisrechnung in der App. Fünf Knöpfe,
mehr nicht.

**Warum das eine Entscheidung ist und keine Wortänderung:** Es ändert den
Schritt-Ablauf des Modus `nach`, das Datenmodell des Vorgangs (`grund`)
und das Protokoll. Reihenfolge und Wortlaut der fünf Gründe gehören mit
dem Team abgestimmt (`review/INPUT-TEAM.md`).

**Sofort umgesetzt, ohne Entscheidung:** Die Menügruppe hieß „Notfall".
Eine Sonderentnahme ist kein Notfall, sondern Alltag; ein Wort, das
Hemmung erzeugt, senkt die Meldequote und verdirbt den Bestand. Sie heißt
jetzt „Außer der Reihe", und die Kachel nennt die Fälle beim Namen.
