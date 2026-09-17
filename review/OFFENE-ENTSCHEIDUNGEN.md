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
| **sofort** | Die vier persönlichen Codes neu vergeben. Sie stehen im Klartext in der Git-Historie (`public/index.html`, Stände vor v11) und wurden bis dahin öffentlich ausgeliefert; die Historie darf niemand umschreiben (Regel 1). Nicht wieder vierstellig. | qa-guardian, Runde 1 |
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
**Betrifft:** `public/index.html:1836` (Menüknopf „Verwaltung", `bAdmin`), `:1899` (`askPin`), `:1933` (`renderAdmin`), `:1956` (`.aSoll`), `hh_cfg_v9`
**Zeilenangaben am 17.09. von qa-guardian nachgezogen** – die ursprünglichen stammten aus einem Stand vor den Änderungen dieser Runde.

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

**Nachgeprüft (qa-guardian, Runde 1) — zwei Berichtigungen und ein Urteil:**

*Berichtigung 1, Umfang.* Der Editor betrifft **nur die Bar**: `renderAdmin()`
baut genau zwei Blöcke, `barrot` (Rotweine) und `bar` (Barkühlschrank), und
schreibt nach `hh_cfg_v9`. Die Soll-Mengen des **Restaurants** stehen in
`PLAN.soll` und sind über die App nicht änderbar; Schränke und Laden auch
nicht. Der Satz „Soll-Menge je Platz (Bar, Schrank, Lade)" oben ist in der
Sache richtig gemeint, trifft aber heute nur die Bar-Plätze. Alles Übrige am
Befund ist nachgeprüft und stimmt: `oninput` → `saveCfg` bei jedem
Tastendruck (`public/index.html:1956`), kein Name, keine Zeit, kein Journal,
und `hh_cfg_v9` liegt im `localStorage` eines Geräts.

*Berichtigung 2, Vergleichsmaßstab.* Vor Runde 1 lag hinter „Verwaltung" ein
vierstelliger Verwaltungscode, der **im Klartext in der ausgelieferten Datei
stand**. Zugang hatte damit nicht „die Leitung", sondern jeder, der die Seite
aufrufen und den Quelltext lesen konnte — auch ein Gast im Haus-WLAN. Gemessen
daran hat `bekannterCode()` den Kreis **verkleinert** (nur noch Codes, die auf
diesem Gerät einmal angemeldet waren), nicht vergrössert. Vergrössert wurde er
allein gegenüber der *beabsichtigten* Sperre, die es nie gab.

*Urteil zur Regelfrage.* Kein Verstoss gegen eine harte Regel, also kein
Rückbau. Regel 9 verlangte die Entfernung des Klartext-Codes — sie ist erfüllt.
Regel 4 ist eine Schema-Regel („Code und Schema müssen zusammenpassen") und
zählt die Rollen auf, die in der Spalte `person.rolle` stehen; der Editor rührt
keine Tabelle und keine Spalte an, sondern den Gerätespeicher. Eine Regel, die
verlangt, dass jede Funktion der App an eine Rolle gebunden ist, gibt es in
`CLAUDE.md` nicht. Die beiden möglichen Rückbauten wären ausserdem beide
schlechter: den Klartext-Code zurückholen verletzt Regel 9, den Editor
streichen macht Glasweine nirgends änderbar (Projektanleitung §8 A ist nicht
gebaut). **Es ist eine Betriebsentscheidung, keine Regelverletzung — und
Betriebsentscheidungen gehören laut `CLAUDE.md` genau hierher.** Der
hospitality-pro hat also richtig gehandelt, sie hier einzutragen statt
zurückzudrehen; seine Sachargumente gegen den heutigen Zustand bleiben davon
unberührt und sind die besseren.

*Dazu ein eigener Befund, der unabhängig von der Entscheidung gilt:*
`bekannterCode(code)` prüft, ob **irgendein** Code auf diesem Gerät schon
einmal angemeldet war — nicht, ob es der Code der Person ist, die gerade
angemeldet ist (`public/index.html:1330`). Am geteilten iPad genügt also der
Code einer Kollegin; ins Protokoll kommt trotzdem der Name aus `whoAmI()`.
Wer Option 2 baut, sollte beides in einem Zug erledigen: Rolle merken **und**
gegen den eigenen Code prüfen.

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

---

## 8. Oberflächen-Aufnahme im Prüflauf – Playwright ist da, aber nicht unser

**Status:** OFFEN
**Gemeldet:** ui-designer (Runde 2)

**Hintergrund:** In Runde 1 hat jede der vier Rollen im Zug notiert, dass
die Oberfläche von niemandem gesehen wurde – kein Browser, kein Chromium.
Das stimmt für Runde 1 und ist in Runde 2 **nicht mehr richtig**: In der
Arbeitsumgebung liegt ein global installiertes Playwright
(`/opt/node22/lib/node_modules/playwright`) mit Chromium unter
`/opt/pw-browsers`. Damit sind in dieser Runde zum ersten Mal echte
Bildschirmaufnahmen entstanden (`review/screens/runde-2/`), und zwei
Behauptungen aus Runde 1 haben sich am gemessenen Objekt als falsch
erwiesen (Trefferfläche des „?"-Knopfes: 42px statt der behaupteten 44px).

**Was daran zu entscheiden ist:** Regel 8 verbietet neue Abhängigkeiten
ohne Freigabe. Playwright steht **nicht** in `package.json` und soll dort
nach meinem Vorschlag auch nicht stehen – es ist eine Eigenheit dieser
Arbeitsumgebung, nicht des Projekts. `tests/ui-aufnahme.cjs` ist deshalb
so gebaut, dass es kein Teil von `npm test` ist (der Prüflauf sucht nur
`*.test.mjs`), Playwright an drei Orten sucht und sich ohne Fund mit
einer Zeile hinlegt, statt den Lauf rot zu machen.

**Optionen:**

1. So lassen: `npm test` bleibt ohne Abhängigkeit lauffähig, die Aufnahme
   ist ein Handgriff für die Rollen, die gestalten. Kein Eintrag in
   `package.json`. **Empfohlen.**
2. Playwright als `devDependency` aufnehmen und einen Prüflauf
   „Oberfläche" bauen, der Umbrüche, Trefferflächen und Kontraste
   automatisch misst. → Stärkste Absicherung, aber eine echte neue
   Abhängigkeit samt Browser-Download; `npm test` läuft dann nicht mehr
   ohne Netz und ohne Installation, was heute sein größter Vorzug ist.
3. Gar nicht aufnehmen. → Zurück zu „die Oberfläche hat niemand gesehen".
   Nicht empfohlen.

**Empfehlung:** Option 1, und in jedem Zug, der `public/` anfasst, einmal
`node tests/ui-aufnahme.cjs` laufen lassen und die Bilder ansehen.

---

## 9. Fotoschritt „Fassungsliste" – was wirklich wegfällt, wenn er wegfällt

**Status:** OFFEN
**Gemeldet:** hospitality-pro (Runde 2), auf Bitte des Betreibers beurteilt
**Betrifft:** `public/index.html:3885` (`rFotos` im Abschluss), `:4044`
(`offenList`, Punkt „Fassungsliste noch nicht fotografiert"), `:1352`
(Kacheltext), Projektanleitung §8 C, `UEBERGABE-TECHNISCH.md` §9.2 C

**Warum das hier steht:** Der Kacheltext der Tagesfassung endet weiter mit
„Liste fotografieren". Solange der Schritt existiert, ist der Text richtig –
er beschreibt, was die App verlangt. Die Frage ist nicht das Wort, sondern
der Schritt. Ich habe ihn nicht angefasst; das ist ein Umbau.

**Ist-Ablauf (im Browser angesehen, `runde-2b`):** Schritt 4 „Abschluss"
zeigt von oben nach unten: die große Zahl „0 Flaschen aus dem Keller", dann
die Überschrift **Fassungsliste** mit dem dunklen Knopf **„Foto aufnehmen"**,
dann die offenen Punkte, dann als heller Knopf „Fertig – Protokoll
erstellen". Der auffälligste Knopf im letzten Schritt der Tagesfassung ist
damit das Foto, nicht der Abschluss.

**Drei Befunde aus dem Betrieb, alle belegbar:**

1. **Das Foto sieht die Leitung nie.** Fotos bleiben in der IndexedDB des
   Geräts, im Vorgang reist nur ihr Schlüssel (Projektanleitung §3, „Was
   nicht überträgt"). Die Leitung arbeitet am MacBook und liest vom Server –
   dort ist das Bild nicht. Ein Arbeitsschritt, dessen Ergebnis nie jemand
   ansieht, hört im Betrieb binnen weniger Wochen von selbst auf. Er hört
   aber nicht auf, in der Liste der offenen Punkte zu stehen.
2. **Das Foto ist kein Beweis, obwohl es wie einer aussieht.** „Wir haben es
   geholt, es ist nur nicht gebucht" ist der häufigste Streitfall am Morgen.
   Das Bild dazu liegt auf genau einem Telefon und ist weg, sobald der
   Browserspeicher geleert wird oder das Gerät wechselt. Wer sich darauf
   verlässt, verlässt sich auf nichts.
3. **Der schwerste Punkt: das Foto treibt die Freigabe.** Ist alles geprüft,
   alles geholt und nur das Foto fehlt, steht im Abschluss „Ein Punkt ist
   noch offen", und „Fertig – Protokoll erstellen" führt in den Dialog
   „Trotzdem abschließen?" mit Code-Eingabe. Im Protokoll steht danach
   **„Ohne Bestätigung freigegeben von …"** – auf einer tadellosen
   Tagesfassung. Zwei Schäden auf einmal: Die Servicekraft lernt, dass die
   Freigabe der normale Weg aus dem Abschluss ist (sie soll die Ausnahme
   sein), und die Leitung bekommt am Morgen eine Warnung, die nichts
   bedeutet. Nach ein paar Wochen liest sie diese Warnung nicht mehr – und
   dann auch die echte nicht.

**Meine Beurteilung:** Der Schritt gehört weg, so wie §8 C es vorsieht – und
zwar nicht wegen des Fotos, sondern wegen Befund 3. Was die Liste leistet
(„was stand auf dem Zettel?"), leistet der Vortagsabgleich nicht; der
beantwortet eine andere Frage („stimmt die Entnahme von gestern mit dem
Ausschank überein?"). Das ist kein Einwand: Die erste Frage beantwortet ein
Bild, das niemand ansieht, auch nicht.

**Was ausdrücklich NICHT gebaut werden soll:** kein Upload der Fotos auf den
Server (Nutzlast, Speicher, Datenschutz – dafür sind sie zu wenig wert),
keine Texterkennung, kein Abtippen der Fassungsliste von Hand.

**Soll-Ablauf (Vorschlag, nicht gebaut):**

1. Im Abschluss fällt der Block „Fassungsliste / Foto aufnehmen" ersatzlos
   weg, ebenso der Punkt „Fassungsliste noch nicht fotografiert" in
   `offenList()`. Damit ist eine vollständige Fassung wieder ohne Freigabe
   abschließbar.
2. An seine Stelle tritt der Vortagsabgleich: die Zeilen, bei denen die
   Entnahme von gestern und der verkaufte Ausschank um mindestens eine
   Flasche auseinanderliegen (`GET /api/fassungsliste?tag=…`).
3. Der Kacheltext der Tagesfassung endet dann auf „… aus dem Keller holen,
   Gestern gegenprüfen." – **erst dann**, nicht vorher.
4. Bereits aufgenommene Fotos bleiben in der IndexedDB und in archivierten
   Protokollen sichtbar; `fclean()` räumt sie ohnehin mit dem Vorgang weg.

**Zwischenschritt, falls der Umbau wartet (eine Zeile, Entscheidung nötig):**
Den Punkt „Fassungsliste noch nicht fotografiert" aus `offenList()` nehmen
und das Foto als freiwillige Beigabe stehenlassen. Das nimmt Befund 3 sofort
die Spitze, ohne dass jemand den Abschluss umbaut. Ich habe es nicht getan,
weil damit ein offener Punkt verschwindet, den heute jemand bewusst
hineingeschrieben hat – das ist eine Entscheidung des Hauses, keine
Wortwahl.

---

## 10. `mapping.rezept` – die Spalte gibt es nicht (Migration liegt bereit)

*software-engineer, Runde 3*

**Befund.** `mappingSchreiben` (`src/index.js`) nahm ein Feld `rezept`
entgegen und schrieb es nach `mapping.rezept`. Diese Spalte gibt es in der
laufenden Datenbank nicht (`docs/live-schema.sql`: `fremd`, `status`,
`artikel`, `gebinde_ml`, `wer`, `angelegt`). Jeder solche Aufruf war ein
500 – aufgefallen ist es nie, weil kein Client diesen Endpunkt benutzt.

**Was ich getan habe.** Der Worker schreibt `rezept` nicht mehr. Kommt es
trotzdem im Körper an, antwortet er mit **422 und Klartext**
(„Rezepturen kann die Datenbank noch nicht aufnehmen"), statt den Wert
stillschweigend fallen zu lassen. Ein stiller Verlust wäre die schlechtere
Hälfte: die Leitung sähe eine gespeicherte Rezeptur, die nirgends steht.

**Was zu entscheiden ist.** Rezepturen liegen heute ausschließlich im
Gerätespeicher der Leitung (`hh_rezepte_v1` in `public/leitung.html`) – auf
einem einzigen MacBook, ungezeichnet, ohne Sicherung. Sobald der Abgleich
Mischgetränke auflösen soll („Hugo" = 100 ml w057 + Sirup), brauchen sie
einen Platz in der Datenbank.

**Fertig, nicht eingespielt:** `migrations/001_mapping_rezept.sql` – eine
additive, nullable Spalte. Lokal gegen `docs/live-schema.sql` durchgespielt.
Solange sie nicht eingespielt ist, läuft alles unverändert weiter; der
422-Weg ist das Feature-Flag. Zeile für Zeile in `review/ERGEBNIS.md`.

**Meine Empfehlung:** noch nicht einspielen. Erst wenn Phase B den
Vortagsabgleich baut und dabei feststeht, wie eine Rezeptur aussieht.

---

## 11. Drei Spalten der Fassungsliste bleiben leer

*software-engineer, Runde 3*

`fassungsliste` hat live die Spalten `kostenstelle`, `von_ts` und `bis_ts`.
`parseZ` (`src/gnparse.js`) liefert heute keine davon: es liest den
Betriebstag aus „Bis" und die Z-Nummer aus dem Kopf, mehr nicht. Der Worker
schreibt sie deshalb **nicht** – sie sind nullable, das ist zulässig, aber
es ist eine Lücke, kein Zustand.

Dazu zwei Fragen, die ich nicht selbst beantworten kann:

1. **Kommt je Betriebstag genau ein Z-Bericht?** Der Worker legt die Liste
   jetzt unter `id = <Betriebstag>` ab – ein Bericht je Tag, ein zweiter
   ersetzt den ersten. Auf `fassungsliste.tag` liegt live **kein**
   UNIQUE-Index (nur `i_liste_tag`), ein `ON CONFLICT(tag)` gibt es also
   nicht; der Betriebstag als Schlüssel ist der Weg ohne Schemaänderung.
   Kommen Bar und Restaurant als **getrennte** Berichte (dafür stünde die
   Spalte `kostenstelle`), überschreibt der zweite den ersten. Nach
   `src/gnparse.js` und `tests/zbericht.test.mjs` enthält ein Bericht beide
   Herkünfte – dann stimmt es. **Bitte einmal am echten Postfach ansehen.**
2. **Was soll in `kern` stehen?** `fassungszeile.kern` ist NOT NULL und
   musste gefüllt werden. Ich habe es als „Positionsname ohne die
   Größenangabe" gedeutet (`kern()` in `src/gnparse.js`): aus
   „Zweigelt 0,75 l 0,125 l" wird „Zweigelt". Das ist eine begründete
   Auslegung, keine Vorgabe – im Repo benutzt die Spalte sonst niemand.
   Ist etwas anderes gemeint, ist es eine Zeile Code.

---

### Antwort aus dem Betrieb (hospitality-pro, Runde 3)

**Zu 1 – ein Z-Bericht je Betriebstag, nicht je Kostenstelle.** Der
Tagesabschluss wird am Ende des Betriebstages für das Haus gezogen, und die
Positionsliste darin führt Bar und Restaurant als getrennte Zeilen. Genau
deshalb kommt derselbe Name zweimal vor – das ist Eigenheit 1 in
`gnparse.js` und Regel 7, und sie wäre sinnlos, wenn es zwei getrennte
Berichte gäbe. **Ein Eintrag je Tag in `fassungsliste` ist damit richtig,
`kostenstelle` bleibt leer.**

**Aber: „der zweite ersetzt den ersten" ist im Betrieb nicht immer harmlos.**
Zwei Fälle, die vorkommen:

* **Nachzügler und Storno.** Die Kasse wird abgeschlossen, danach kommt noch
  eine Buchung oder ein Storno – es wird ein zweiter Z gezogen. Der ist der
  richtige, Ersetzen ist hier genau das Gewünschte.
* **Getrennter Abschluss.** Die Bar schließt um 1 Uhr, das Restaurant um
  23 Uhr; wer aus Gewohnheit zweimal abschließt, schickt zwei **Teil**-Berichte
  für denselben Tag. Dann wirft der zweite den ersten weg, und dem Abgleich
  fehlt eine ganze Kostenstelle – ohne dass es irgendwo steht.

Beide Fälle sehen im Worker gleich aus. **Was ich brauche, ist keine
Schemaänderung, sondern eine Spur:** Wird ein Bericht für einen Tag ersetzt,
soll die Notiz im Journal die alte und die neue Z-Nummer und beide
Positionszahlen nennen („Z 41 (218 Positionen) ersetzt durch Z 42 (96
Positionen)"). Fällt die Zahl der Positionen beim Ersetzen deutlich, war es
ein Teilbericht, und die Leitung sieht es am Morgen. → Backlog, mittel.

**Am Postfach nachzusehen (Aufgabe für den Betreiber):** ob an einem Tag
eine oder zwei Mails von gastronovi eintreffen, und ob im Kopf des Berichts
eine Kostenstelle steht. Solange `tests/fixtures/` leer ist, ist alles oben
Hauspraxis, nicht gemessen.

**Zu 2 – `kern` ist richtig gedeutet: der Positionsname ohne Größe.** Der
Zweck der Spalte ist der Blick, den die Leitung und der Sommelier ohnehin
haben: *ein* Wein, zwei Ausschankgrößen. „Grüner Veltliner Leindl" – 34
Achtel und 6 Flaschen, eine Zeile. Die Größe darf dabei nicht verloren
gehen, sie steckt in `ausschankMl` und wird für die Umrechnung auf Flaschen
gebraucht; `rohbez` bleibt daneben unangetastet. Beides ist so gebaut.

Zwei Dinge dazu aus der Praxis:

* **`kern` darf kein Suchschlüssel werden.** Kleinschreiben, Umlaute
  auflösen, Winzer abschneiden – das ist der Anfang der Ähnlichkeitssuche,
  die nach Regel 5 abgeschaltet bleibt, weil sie falsche Treffer liefert
  („Riesling Federspiel" ≠ „Riesling Smaragd", und der Preis unterscheidet
  sich um das Doppelte). Nur abschneiden, sonst nichts – so wie jetzt.
* **Geschnitten wird heute nur die Maßangabe.** In der Kasse heißen
  Positionen aber auch „… Glas", „… Fl.", „… Karaffe", „… 1/8". Die
  Bruchzahl ist abgedeckt, die Wörter nicht: „Zweigelt Glas" und „Zweigelt
  0,75 l" bekämen zwei verschiedene `kern`. Ob das im Haus vorkommt, sagt
  der erste echte Z-Bericht – **nicht vorab erweitern**, sondern am echten
  Bericht ablesen und dann eine Zeile ändern. → Backlog, niedrig.
