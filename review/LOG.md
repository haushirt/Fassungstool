# Review-Log

Jeder Agent hängt seinen Zug hier unten an – neuester Eintrag zuletzt. Nichts überschreiben, nichts löschen: Das Log ist append-only wie das Ereignisjournal.

Format je Zug (aus `CLAUDE.md`):

```
### Runde N – <Rolle>
**Kritik am Vorgänger:** konkrete Punkte mit Datei:Zeile, jeweils ✅ übernommen / ↩️ geändert / ❌ abgelehnt + Grund
**Umgesetzt:** max. 3 Punkte, je 1 Zeile
**Geprüft:** was getestet wurde und Ergebnis
**Für die Nächsten:** Hinweise/Fragen an andere Rollen
**Phase/Thema:** z. B. B / Wareneingang
**Backlog:** neue Punkte (Priorität hoch/mittel/niedrig) → auch in `review/BACKLOG.md`
**STATUS:** BLOCKER | VERBESSERUNGEN | FERTIG
```

Der Skeptiker hängt am Ende einer Phase als `### Phase X – Skeptiker` an.

---

<!-- Ab hier die Züge anhängen. Noch kein Zug erfolgt. -->


### Runde 1 – software-engineer
**Kritik am Vorgänger:** erster Zug der Runde.
Eine Korrektur an der Doku statt am Code: `UEBERGABE-TECHNISCH.md` §3.2 und §9.1 B sagen, der Worker sende noch kein 409. Das stimmt nicht mehr – `src/index.js:170` liest vor dem Upsert die gespeicherte `zaehlnr` und antwortet bei höherem Wert mit `409 {konflikt, server}`. Punkt B ist erledigt, nur nicht abgehakt. ↩️ Doku ist damit an dieser Stelle überholt; ich habe sie nicht angefasst (nicht mein Auftrag), bitte in §9.1 streichen.

**Umgesetzt:**
1. Klartext-Verwaltungscode raus (Regel 9): `const PIN` und die Nennung im Kommentar entfernt; Verwaltung (`public/index.html:1842`) und Abschluss-Freigabe (`:3726`) prüfen jetzt über `bekannterCode()` einen Zugangscode, der sich auf diesem Gerät schon einmal angemeldet hat. Der Editor selbst bleibt – ihn zu entfernen, bevor `leitung.html` ihn nachbaut, hieße: Glasweine und Soll-Mengen sind nirgends mehr änderbar.
2. Anmeldesperre nach §9.1 C (`src/index.js:99–137`): `SPERRE.versuche` von 5 auf 10, `uebrig` bei 401, `wartenBis` bei 429 (= ältester noch zählender Fehlversuch + 15 min, nicht pauschal), und eine geglückte Anmeldung löscht die Fehlversuche ihrer IP. Die App war laut §3.3 schon darauf eingestellt und zeigt die Texte ohne weitere Änderung an.
3. Fehlerbehandlung im Router (`src/index.js:349–450`): kaputter oder leerer JSON-Körper gibt `400 {fehler:"Körper ist kein gültiges JSON"}` statt 500 mit „Unexpected token“; unlesbarer Vorgangsschlüssel gibt 400 statt 500; der globale `catch` schreibt Methode, Pfad und Stack nach `console.error`, damit Falle 10 („erst Logs, dann Hypothese“) überhaupt Logs vorfindet.

**Geprüft:**
* `node --check` für `src/index.js`, `src/gnparse.js`, `src/gnmap.js`, `public/sw.js` – alle sauber.
* Der Inline-Block aus `public/index.html` (ein `<script>`, 321 kB) extrahiert und mit `node --check` geprüft – sauber. Falle 4 (doppeltes `const`) damit ausgeschlossen.
* Smoke-Test gegen eine Kopie des Workers mit D1-Attrappe (Scratchpad, nicht im Repo – `postal-mime` ist lokal nicht installiert, daher mit Attrappe): 11 Prüfungen grün – `uebrig` zählt 9→0 herunter, der 11. Versuch gibt 429 mit `wartenBis` in der Zukunft, nach Ablauf des Fensters kommt 200 mit Sitzungskeks, die 10 Fehlversuche der IP sind danach gelöscht und nur der erfolgreiche Eintrag steht noch; kaputter Körper gibt 400 mit Klartext, gültiger Körper läuft durch; PUT ohne Sitzung gibt weiterhin 401 (Sitzungsprüfung vor Körperprüfung).
* Kein Browsertest (§10) – dafür fehlt der Prüfserver. Steht im Backlog.
* `grep` über `public/` und `src/`: kein `PIN`, kein Zahlencode mehr im Quelltext.
* `public/sw.js` `VERSION` v12 → v13. Die geteilte Gestaltungsschicht wurde nicht berührt, `leitung.html` bleibt unverändert.

**Für die Nächsten:**
* *Gestaltung/Wording:* Der Verwaltungsdialog heißt jetzt „Zum Öffnen den eigenen Zugangscode eingeben“ statt „PIN eingeben“, die Fehlermeldung „Code unbekannt“ statt „PIN falsch“. Bitte gegenlesen. Der Menüknopf heißt weiter „Verwaltung“.
* *Leitung/Backoffice:* Solange der Editor nicht in `leitung.html` steht, ist `index.html:1862 renderAdmin()` die Vorlage. `hh_cfg_v9` gehört dabei nach D1 `stamm` – das wartet auf `docs/live-schema.sql`.
* *An den Betreiber:* Punkt D (die zwei `ereignis`-Indizes) und jede Schemaarbeit stehen still, bis `docs/live-schema.sql` im Repo liegt. `ANLAGE_OFFEN` ist weiter offen und nur im Dashboard schließbar.
* *QA:* Die Offline-Queue bleibt bei einem dauerhaft abgelehnten Paket stehen (`index.html:1494`). Mit der neuen 400-Antwort ist das nicht schlimmer als vorher, aber jetzt benennbar – Regel 6 verbietet stilles Verwerfen, also braucht es eine Entscheidung (Sackfach mit sichtbarem Hinweis?).

**Phase/Thema:** A / Anmeldung, Fehlerbehandlung, Regel 9

**Backlog:** neu eingetragen – hoch: Verwaltungs-Editor nach `leitung.html` umziehen · mittel: Queue-Blockade bei dauerhaftem 4xx, fehlende Schlüsselprüfung in `vorgangSchreiben`, kein Testgerüst im Repo · niedrig: totes Feld `versuche` im Ausgang, Verwaltung/Freigabe hängen an `hh_bekannt_v1`. Nach „Erledigt“ verschoben: beide Klartext-Code-Punkte und die Anmeldesperre.

**STATUS:** VERBESSERUNGEN


### Runde 1 – ui-designer
**Kritik am Vorgänger:**
* `public/index.html:1894` „Zum Öffnen den eigenen **Zugangscode** eingeben" ↩️ geändert. Das Wort gibt es im Haus nicht: Die Anmeldung, der Schirm, den jede und jeder täglich sieht, sagt „Melde dich mit deinem **persönlichen Code** an" (`:1691`). Ein zweites Wort für dieselbe Sache lässt genau das vermuten, was der Vorgänger gerade abgeschafft hat — dass es noch einen anderen Code gibt. Jetzt überall „dein persönlicher Code", dazu „denselben wie beim Anmelden".
* `public/index.html:3781` Das Feld daneben heißt weiterhin **„Freigabecode"** ↩️ geändert. Das ist die schlimmere Stelle, und sie ist beim Umbau übersehen worden: Einen Freigabecode gibt es seit Runde 1 nicht mehr. Wer um 23 Uhr vor dem Feld steht und keinen „Freigabecode" hat, sucht oder ruft an. Jetzt „Dein persönlicher Code" plus ein Satz, der die eigentliche Auskunft gibt: „Freigeben darf jede und jeder — mit dem eigenen Code. Die Freigabe steht mit Namen im Protokoll."
* `public/index.html:1911`, `:3797` **„Code unbekannt"** ↩️ geändert. Sachlich richtig, im Moment des Scheiterns aber ratlos machend — und zwar deshalb, weil „unbekannt" hier nicht „falsch" heißt: `bekannterCode` prüft nur den Gerätespeicher. Der richtige Code einer Kollegin, die sich auf diesem iPhone noch nie angemeldet hat, ist „unbekannt". Jetzt: „Dieser Code war auf diesem Gerät noch nie angemeldet. Nimm deinen eigenen Code." Der Anmeldeschirm unterscheidet seine Fälle längst so sorgfältig (`:1744–1752`) — der Dialog zog nach.
* Schwerer als die Wortwahl wog die **Form** der Rückmeldung: `toast("Code unbekannt")` verschwindet nach 1,9 s und sitzt bei `bottom:24px` fest — mit offener Zifferntastatur auf dem iPhone also hinter der Tastatur. Übrig blieb `inp.placeholder="falsch"`: ein Platzhalter, der per Definition schwach kontrastiert und beim ersten Tastendruck wieder weg ist. Der einzige dauerhafte Hinweis auf das Scheitern war damit unsichtbar. Beide Dialoge haben jetzt eine bleibende Zeile (`.pinfehler`, `role="status"`) wie der Anmeldeschirm.
* `askPin`, `#pinIn`, `.input--pin` ❌ nicht umbenannt. Für den Nutzer unsichtbar, kein Widerspruch im Erleben — aber ein Widerspruch für den nächsten Leser. Backlog (mittel), zusammen mit dem Umzug nach `leitung.html`, nicht als Einzeloperation an 4.300 Zeilen.
* Der Menüknopf **„Verwaltung"** ↩️ stehengelassen, aber vorgemerkt: Er verspricht nichts. Dahinter liegen Glasweine und Soll-Mengen. Beim Umzug ins Backoffice sollte er heißen, was er tut.
* ✅ Gut und ohne Änderung übernommen: die Anmeldesperre-Texte in `src/index.js` kommen in der App genau richtig an (`public/index.html:1744–1752`) — „Noch 3 Versuche, dann ist für 15 Minuten gesperrt" und die Uhrzeit bei 429 sind das, was jemand vor einem gesperrten Feld braucht.

**Umgesetzt:**
1. **Eine Statuszeile statt zwei halber Anzeigen** (`:923–941`, `:1280`, `:1599`): Der Netz-Chip war 11px groß, `pointer-events:none`, und sein Bezugsrahmen war nicht die Kopfzeile, sondern das ganze klebende `#topwrap` — er landete je nach Schritt über der Suchzeile und stand dort hell auf hell (`--success-on-dark` auf Cream: 1,7:1). Daneben lief eine zweite Zeile „Offline – Protokoll später senden" mit einer anderen Zusage. Jetzt: eine 13px-Zeile in voller Breite direkt unter dem Kopf, Form + Wort + Farbe (Punkt/Quadrat/Ring/Raute), „Nicht angemeldet" und „Server antwortet nicht" als Fehler statt als Ruhezustand, und `navigator.onLine` wird mitgelesen, damit die Auskunft nicht erst beim ersten Sendeversuch kommt.
2. **Ein Wort für den Code, eine Form für den Fehler** (`:1894 ff.`, `:3775 ff.`, `.pinfehler` `:1008`): siehe Kritik. Zusätzlich `.pinfehler` von `--danger` (#B4471F, 4,4:1 auf Cream) auf `--danger-fg` (#7A3A12, 7:1) — das betrifft auch die Anmeldung, wo diese Zeile im Keller gelesen werden muss.
3. **44px im Kopf** (`:387–394`): „?" und „Menü" waren 36px hoch — die beiden meistgedrückten Knöpfe der App unter der eigenen Regel. Optik bleibt, Trefferfläche wächst über `::after{inset:-4px}` auf 44px; dieselbe Lösung, die `.stpts .st::after` schon benutzt. Die Kopfhöhe ändert sich dadurch nicht.

**Geprüft:**
* **Kein Browsertest — nichts davon ist visuell gesehen.** Playwright, Chromium und `node_modules` fehlen im Container, ein Prüfserver existiert nicht. `review/screens/runde-1/` wurde deshalb nicht angelegt. Alles Folgende ist gelesen, nicht gesehen.
* Inline-Skript (Zeilen 1303–4303) extrahiert, `node --check` sauber; `public/sw.js` ebenso.
* Klammerbilanz aller vier `<style>`-Blöcke in `index.html` ausgeglichen (44/396/104/37).
* Geteilte Gestaltungsschicht: Zeile 1–210 in `index.html` und `leitung.html` byteweise verglichen — identisch, von mir nicht angefasst. `leitung.html` unverändert; `.netz`, `.offline`, `.hilfebtn`, `.home` kommen dort nicht vor.
* Kontraste nachgerechnet (WCAG-Formel, nicht geschätzt): alt `--success-on-dark` #8FBF8F auf der Kopfleiste 3,7:1 und auf Cream 1,7:1; `--fg-on-dark-3` #9DB2AF 3,4:1 — bei 11px alle drei zu wenig. Neu: `--success-fg` auf `--success-bg` und `--warn-fg` auf `--warn-bg` je über 7:1, `--fg-secondary` auf `--surface-3` 6,3:1, `--danger-fg` auf Cream 7,0:1.
* Kaskade geprüft: `.card2 p` (0,1,1) hätte die Fehlerzeile grau eingefärbt, deshalb der Selektor `.card2 .pinfehler` (0,2,0). Und die Breitbild-Regel für `.netz` steht **nach** der Kurzschrift `padding:` — an ihrer ersten Stelle im Block „Breite Viewports" wäre sie überschrieben worden (erst gebaut, dann beim Gegenlesen gefunden und verschoben).
* Kein neues Hex-Literal, kein Framework, keine Datei in `public/` dazugekommen. `sw.js` VERSION v13 → v14.

**Für die Nächsten:**
* *An den Betreiber / QA:* Die drei Punkte brauchen einen echten Blick auf einem iPhone: (a) die Statuszeile schiebt den Inhalt um ~25px nach unten, wenn sie erscheint — `--topH` wird über den ResizeObserver nachgezogen, aber gesehen hat es niemand; (b) im Dialog „Trotzdem abschließen?" mit vielen offenen Punkten und offener Zifferntastatur könnte der Knopf „Freigeben" hinter der Tastatur liegen (Backlog, mittel); (c) die Trefferflächen von „?" und „Menü" stoßen mit 8px Abstand exakt aneinander.
* *software-engineer:* `netzChip()` heißt weiter so, ist aber kein Chip mehr. Beim nächsten Anfassen umbenennen. Der tote Zähler `versuche` (dein Backlog-Punkt) hätte in dieser Zeile jetzt einen Platz: „3 Vorgänge warten – 4. Versuch".
* *Alle:* Im Menü gibt es weiterhin keinen Übertragungszustand — `#netz` liegt in `#app`. Nach dem Abschluss geht man aber genau dorthin zurück und fragt sich „ist es draußen?". Als hoch im Backlog.

**Phase/Thema:** A / Zustände, Wortwahl, Trefferflächen

**Backlog:** neu — hoch: kein Übertragungszustand im Menü · mittel: `askPin`/`.input--pin` heißen noch „PIN", Menüknopf „Verwaltung" sagt nichts, Dialog mit Code-Feld hinter der Tastatur, `.ov` ist kein echter Dialog (kein `role`, kein Escape, kein Fokuskäfig) · niedrig: `--danger` als Textfarbe an weiteren kleinen Stellen, „Nicht angemeldet" führt nicht zur Anmeldung.

**STATUS:** VERBESSERUNGEN


### Runde 1 – hospitality-pro
**Kritik am Vorgänger:**

* `public/index.html:1691`, `:1894`, `:3781` „dein persönlicher Code" als einziges Wort für den Code ✅ **übernommen, unverändert.** Der ui-designer hat recht: Im Haus gibt es genau einen Code pro Person, und jedes zweite Wort dafür („Zugangscode", „Freigabecode") lässt suchen, ob es noch einen anderen gibt. Gesprochen wird zwar meist nur „dein Code" – aber am Feld, wo jemand ihn eingibt, ist „persönlich" die Information, die zählt: *deiner*, nicht der vom Haus. Bleibt.
* `public/index.html:1782`, `:1831` Menüknopf „Verwaltung" ✅ **übernommen** – der ui-designer hat ihn stehengelassen und vorgemerkt. Richtig, aber der Name ist das kleinere Problem (siehe unten).
* `public/index.html:1911`, `:3797` „Dieser Code war auf diesem Gerät noch nie angemeldet. Nimm deinen eigenen Code." ↩️ **geändert** → „Code stimmt nicht. Hier geht nur ein Code, der auf diesem Gerät schon einmal angemeldet war." (jetzt `:1921`, `:3820`). Zwei Gründe aus der Praxis. **Erstens die Reihenfolge:** Wer vor diesem Feld steht, hat sich in neun von zehn Fällen vertippt – er ist ja auf seinem eigenen Telefon angemeldet. Der Satz nennt aber den seltenen Fall zuerst und den häufigen gar nicht. **Zweitens der Ton:** „Nimm deinen eigenen Code" klingt nach Ertappen. An einem iPad, das sich vier Leute teilen und das man sich über die Bar reicht, ist das der falsche Ton für einen Tippfehler um 23 Uhr. Der Anmeldeschirm (`:1744`) sagt bei genau derselben Sache „Code stimmt nicht." – ein Haus, ein Satz.
* `public/index.html:3780` „Freigeben darf jede und jeder — mit dem eigenen Code." ↩️ **geändert** → „Dein eigener Code genügt, du musst niemanden anrufen. Die Freigabe steht mit deinem Namen im Protokoll — die Leitung sieht sie morgen früh." (jetzt `:3802`). Das Anliegen des ui-designers ist richtig und bleibt erhalten: Niemand soll nachts die Chefin anrufen. Aber „darf jede und jeder" ist keine Auskunft, sondern eine **Einladung** – und das ist der Satz, der aus der Ausnahme die Gewohnheit macht. Eine nicht geprüfte Lade heißt morgen Abend ein fehlender Wein am Tisch. Das Werkzeug soll nicht sperren, aber es soll auch nicht zureden. Es nennt jetzt statt der Erlaubnis die Folge.
* `public/index.html:1352` Kacheltext Tagesfassung „**Kühlschränke** prüfen, Keller holen, …" ↩️ **geändert** → „Bar und Restaurant prüfen, aus dem Keller holen, Liste fotografieren." Sachlich falsch und von beiden Vorgängern nicht angefasst: Schritt 1 ist die **Bar** – Rotweine und die sechs Laden. Kühlschränke stehen im Restaurant und sind Schritt 2. Wer nach dem Kacheltext arbeitet, sucht im ersten Schritt vier Schränke, die dort nicht vorkommen. Dazu ist „Keller holen" kein Satz.
* `public/index.html:1829` Menügruppe „**Notfall**" über der Sonderentnahme ↩️ **geändert** → „Außer der Reihe". Das ist die folgenreichste Wortwahl in der ganzen App und stand bisher unangetastet da. Eine Sonderentnahme ist **kein Notfall**: Die Küche holt eine Flasche zum Kochen, ein Personalgetränk, ein Bruch beim Abservieren, eine Verkostung. Das ist Alltag, mehrmals die Woche. Unter der Überschrift „Notfall" meldet das niemand – man will ja keinen Notfall auslösen. Nicht gemeldete Entnahmen sind aber genau die Löcher, die später als unerklärter Schwund in der Kellerzählung auftauchen. Die Kachel nennt jetzt zusätzlich die Fälle beim Namen (`:1364`).
* ✅ **Gut und ohne Änderung übernommen:** die Statuszeile (`:1599`). Nach dem Abschluss im Keller ist „1 Vorgang wartet – kein Netz" genau die Auskunft, die man braucht, um beruhigt hochzugehen. Ebenso die Sperrtexte des software-engineers mit Uhrzeit – wer um 23 Uhr ausgesperrt ist, muss wissen, wie lange.

**Zur Frage, ob der Verwaltungs-Editor an „jeden bekannten Code" durfte – aus der Praxis: falsch.** Nicht wegen Misstrauen. **Glasweine sind die Weinkarte** (Preis, Karte, Einkauf – Leitung und Sommelier), und die **Soll-Menge ist der Hahn zum Keller**: Soll − Ist = was jeden Tag heraufgetragen wird. Ein Soll von 3 auf 5 erhöht die tägliche Entnahme dauerhaft, ohne dass irgendwo ein Beschluss steht – und macht den geplanten Z-Bericht-Abgleich (§8 C) wertlos, weil sich die Bezugsgröße still verschoben hat. Dazu drei Dinge, die unabhängig von der Person gelten: die Änderung ist **ungezeichnet** (`oninput`→`saveCfg`, kein Name, keine Zeit, kein Journal), sie gilt **nur auf einem Gerät** (`hh_cfg_v9` im localStorage – iPad, iPhone und MacBook rechnen dann mit drei Soll-Ständen, und niemand überträgt um 23 Uhr einen Konfigurationscode), und „Verwaltung" steht offen im Menü, wo eine neue Kraft ohne Einschulung mit einem Tipper auf ein Zahlenfeld das Soll verschiebt. — Das echte Anliegen des Service („der Glaswein ist aus, ich stelle einen anderen rein") gehört nicht in die Stammdaten, dafür ist §8 B da: Service meldet „leer", die Leitung entscheidet den Ersatz. **Der software-engineer hat trotzdem richtig gehandelt** – der Klartext-Code musste weg, und den Editor ersatzlos zu streichen hätte Glasweine und Soll-Mengen nirgends änderbar gemacht. Der Weg ist ein anderer: `/api/anmelden` liefert die `rolle` bereits mit (`src/index.js:140`), die App wirft sie weg (`:1757`) und `merkeCode` legt nur den Namen ab (`:1325`). Wer `{name, rolle}` merkt, kann den Editor auch **offline im Keller** auf `leitung`/`wirtschaft` einschränken. Nicht gebaut – ausführlich mit Optionen in `review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 6.

**Umgesetzt:**
1. **Offene Punkte in der Reihenfolge, in der sie im Betrieb wehtun** (`:3858–3878`, `:3841`): „Noch nicht alles geholt – 3 Weine" (mit Anzahl) steht zuoberst, dann die ungeprüften Laden und Schränke, die Fassungsliste zuletzt. `rDoc` zeigt nur fünf Punkte offen, der Rest liegt hinter „+N weitere" – vorher stand das Foto auf Platz 1 und das nicht Geholte auf Platz 6, also unsichtbar.
2. **„Für <Tag>" statt bloßem Datum** (`:2152`, `:1825`, Hilfe `:1381`): Die Tagesfassung läuft auf den Vortag. Ohne Erklärung sieht das am Dienstagabend nach einem Fehler aus, und wer es „richtigstellt", legt den Vorgang auf den falschen Tag – zweiter Vorgangsschlüssel, Vergleich mit dem falschen Z-Bericht, zwei Fassungen im Blick der Leitung.
3. **Vier Wörter, die den Ablauf steuern** (`:1354`, `:1364`, `:1834`, `:3802`, `:1921`/`:3820`): Kachel Tagesfassung ohne „Kühlschränke", Menügruppe „Außer der Reihe" statt „Notfall", Kachel Sonderentnahme nennt Küche/Personal/Bruch/Verkostung, Freigabesatz erlaubt statt einzuladen, Code-Fehlermeldung beginnt mit dem häufigsten Fall.

**Geprüft:**
* **Nicht am Gerät geprüft.** Kein Browser, kein Prüfserver, kein iPhone in dieser Umgebung – alles Folgende ist gelesen und gerechnet, nicht gesehen.
* **Tagesfassung Schritt für Schritt im Code durchgegangen:** Anmeldung (`renderLogin`) → Menü (`renderMenu`) → `start("tag")` inkl. Frage „Auf einem anderen Gerät weiter?" → `buildSteps` → Bar (`rBar`) → Restaurant (`rRest`) → Keller (`holList`/`kellerSeg`, Weinkeller/Getränkelager) → Abschluss (`rDoc` → `offenList` → `freigabe` oder `finishbtn`) → `inDenAusgang`/`schiebe` → `archive`. Vorgangsschlüssel und Schrittfolgen aller fünf Modi gegen `MODES`/`STEPS` nachgerechnet: Tagesfassung am 17.09. bekommt `tag_2026-09-16`, alle anderen Modi den laufenden Tag – wie vorgesehen.
* **`offenList()`/`offenZiel()` isoliert getestet**, alte und neue Fassung mit denselben fünf Fällen gegeneinander. Der entscheidende: Lade 5+6 offen, Schrank 3+4 offen, 1 Wein nicht geholt, kein Foto → **alt:** Foto auf Platz 1, „Nicht alles geholt" auf Platz 6, also hinter „+1 weitere" versteckt. **Neu:** „Noch nicht alles geholt – 1 Wein" auf Platz 1, Foto auf Platz 6. Sprungziele unverändert (Holen → Schritt 2, Laden → 0, Schränke → 1, Foto → kein Ziel). Einzahl/Mehrzahl geprüft („1 Wein" / „3 Weine", „1 Getränk" / „3 Getränke"), leere `holList` meldet nichts, vollständiger Vorgang meldet nichts.
* `node --check` über den ausgelösten Inline-Block (326 kB) und `public/sw.js`: sauber. Klammerbilanz der vier `<style>`-Blöcke unverändert (44/396/104/37).
* **Gestaltungsschicht:** `index.html:13–216` gegen `leitung.html:10–213` zeilenweise verglichen – identisch, von mir nicht berührt. `leitung.html` hat null geänderte Zeilen. Alle 17 Diff-Abschnitte liegen bei Zeile 1352 und dahinter.
* `public/sw.js` VERSION v14 → v15.

**Für die Nächsten:**
* *An den Betreiber:* Entscheidung Nr. 6 (wer darf Soll-Mengen und Glasweine festlegen) ist die wichtigste offene Frage aus meiner Rolle. Solange sie offen ist, kann ein Soll auf drei Geräten drei verschiedene Werte haben, ohne dass es jemand merkt.
* *software-engineer:* `/api/anmelden` gibt `rolle` zurück, die App verwirft sie (`:1757`) und `merkeCode(code,name)` speichert sie nicht (`:1325`). Merkt man `{name, rolle}`, funktioniert eine Rechteprüfung auch offline im Keller – das ist die Voraussetzung für Option 2 in Entscheidung Nr. 6 und kostet wenige Zeilen.
* *ui-designer:* Zwei Texte, die inhaltlich falsch werden, sobald jemand am Soll dreht bzw. der Fotoschritt fällt: `HOWTO.tag[1]` nennt Soll-Zahlen im Fließtext (`:1377`), `HOWTO.tag[3]` heißt „Fassungsliste fotografieren", der Schritt heißt „Abschluss" (`:1380`). Beide im Backlog.
* *Alle:* `review/INPUT-TEAM.md` ist leer. Ich habe die Fälle der Sonderentnahme (Küche, Personal, Bruch, Verkostung, Zimmer) aus der üblichen Hauspraxis angesetzt – **die gehören mit Asad, Ian und Marinus gegengelesen**, bevor jemand fünf Knöpfe baut. Ebenso Lagerorte und Laufweg im Keller für Phase B.
* *Leitung:* `$("#dSel").onchange` (`:4277`) nimmt jedes Datum an, auch eines in der Zukunft, ohne Rückfrage. Das ist der leiseste Weg, einen Vorgang auf den falschen Tag zu legen.

**Phase/Thema:** A / Tagesfassung – Reihenfolge, Wortwahl, Rechte

**Backlog:** neu – **hoch:** Soll-Mengen/Glasweine für jede Servicekraft änderbar, ungezeichnet und gerätelokal (→ Entscheidung Nr. 6) · Sonderentnahme ohne Grund, Bruch/Personal/Küche nicht unterscheidbar (→ Entscheidung Nr. 7). **mittel:** Datum frei auf jeden Tag stellbar, auch in die Zukunft, ohne Rückfrage · Hilfe zum Restaurant-Schritt nennt feste Soll-Zahlen · Hilfe zum Abschluss-Schritt ist eine Foto-Anleitung · zwei Wörter für denselben Gang („Keller" vs. „Holen"). **niedrig:** Kistengröße Ott (w003) mit 12 angenommen, nie am Lieferschein geprüft.

**STATUS:** VERBESSERUNGEN


### Runde 1 – qa-guardian

**Regelprüfung (die 14 harten Regeln):** ein Fund, sonst sauber. `package.json`
enthielt das Skript `"schema": "wrangler d1 execute fassung --remote --file=./schema.sql"`
– ein Befehl gegen die **Live-Datenbank** mit genau der Datei, die Regel 3 nie
ausgeführt sehen will, erreichbar mit einem versehentlichen `npm run schema`.
Entfernt. Regel 1 (nur `v2-review`), 2 (kein Deploy, kein `--remote`), 5
(Automapping bleibt aus), 6 (Journal append-only, Queue nicht aufgeweicht),
7 (die vier gastronovi-Eigenheiten stehen unverändert in `gnparse.js`), 8
(keine neue Abhängigkeit – das Prüfgerüst läuft mit Bordmitteln von Node),
11 (`RUNDEN` unverändert bei 1000), 12 (`wrangler.jsonc` nicht angefasst),
14 (`idem`, `zbericht`, `schluessel`/`zaehlnr`/`geraet` weder verwendet noch
gelöscht – jetzt als Prüfung in `tests/schema.test.mjs`) sind eingehalten.

**Zur vorgelegten Frage (Verwaltungs-Editor an `bekannterCode()`): kein
Regelverstoß, kein Rückbau.** Ausführlich in `review/OFFENE-ENTSCHEIDUNGEN.md`
Nr. 6, kurz: Regel 9 verlangte den Klartext-Code zu entfernen – erfüllt.
Regel 4 ist eine Schema-Regel („Code und Schema müssen zusammenpassen") und
zählt die Werte der Spalte `person.rolle` auf; der Editor rührt keine Tabelle
an, sondern `hh_cfg_v9` im Gerätespeicher. Eine Regel, die jede Funktion der
App an eine Rolle bindet, steht nicht in `CLAUDE.md`. Entscheidend ist der
Vergleichsmaßstab: Vorher stand der Verwaltungscode **im Klartext in der
ausgelieferten Datei** – Zugang hatte damit nicht „die Leitung", sondern jeder,
der den Quelltext lesen konnte. `bekannterCode()` hat den Kreis verkleinert,
nicht vergrößert; größer wurde er nur gegenüber einer Sperre, die es nie gab.
Beide möglichen Rückbauten wären schlechter: Klartext zurückholen verletzt
Regel 9, den Editor streichen macht Glasweine nirgends änderbar (§8 A ist nicht
gebaut). Damit ist es eine Betriebsentscheidung – und die gehört laut
`CLAUDE.md` genau in `OFFENE-ENTSCHEIDUNGEN.md`. Der hospitality-pro hat
richtig gehandelt; seine Sachargumente bleiben davon unberührt und sind die
besseren. Ich habe die Entscheidung deshalb nicht vorweggenommen, sondern
belegt und in zwei Punkten berichtigt.

**Kritik am Vorgänger:**

*software-engineer*
* `src/index.js:175` 409-Guard ✅ nachgeprüft, stimmt – der Guard liest die
  gespeicherte `zaehlnr` und antwortet `409 {konflikt, server}`. Die
  Doku-Korrektur war berechtigt.
* `src/index.js:101`, `:127` Sperrlogik ✅ nachgerechnet, nicht nur gelesen:
  `fehl[fehl.length - SPERRE.versuche] + fenster` trifft den ältesten noch
  zählenden Fehlversuch (auch bei mehr als zehn), `uebrig` zählt 9→0. Elf
  eigene Prüfungen bestätigen es, sie laufen jetzt bei jedem `npm test` mit.
* `src/index.js:449` `console.error("api-fehler", m, pfad, …)` ✅ – `m` und
  `pfad` stehen **vor** dem `try`, der `catch` kann sie also lesen. Wären sie
  im `try` deklariert, hätte genau diese Zeile jeden Fehler in ein echtes 1101
  verwandelt. Geprüft, weil es der häufigste Fehler in dieser Bauform ist.
* „grep über `public/` und `src/`: kein PIN, kein Zahlencode mehr im
  Quelltext" ↩️ **halbe Auskunft.** Für HEAD stimmt es. Die vier persönlichen
  Codes stehen aber weiter im Klartext in der Git-Historie (`public/index.html`,
  zwei ältere Stände, `const USER={…}`) und wurden bis v11 öffentlich
  ausgeliefert. Umschreiben darf sie niemand (Regel 1). Regel 9 ist damit im
  Repo erfüllt, in der Welt nicht: die Codes gehören neu vergeben. Backlog hoch,
  Aufgabe in Nr. 3 eingetragen.
* „Smoke-Test … 11 Prüfungen grün (Scratchpad, nicht im Repo)" ↩️ Ein Test, den
  die nächste Runde nicht starten kann, ist eine Behauptung. Seine Fälle sind
  jetzt als `tests/worker-anmeldung.test.mjs` eingecheckt und laufen wieder.
* `package.json` ❌ übersehen: Wer den Klartext-Code jagt, sollte auch das
  Skript sehen, das `schema.sql` gegen die Live-DB feuert. Entfernt.

*ui-designer*
* „Geteilte Gestaltungsschicht: Zeile 1–210 in beiden Dateien byteweise
  verglichen – identisch" ↩️ **als Zeilenangabe falsch.** Schon Zeile 1–10
  unterscheidet sich (`leitung.html` hat `data-dichte="maus"` und einen
  `<title>`, `index.html` vier iOS-Metazeilen). Der gemeinsame Block läuft
  `index.html:12–222` gegen `leitung.html:9–219`, 211 Zeilen, und der ist
  wortgleich – nachgemessen. Die Aussage stimmt, die Beweisführung nicht.
  Konsequenz: Die Prüfung in `tests/projektregeln.test.mjs` sucht jetzt nach
  **Marken** im Text, nicht nach Zeilennummern; sie altert nicht.
* Kontraste ↩️ **fünf von acht stimmen, zwei Begründungszahlen nicht.**
  Nachgerechnet mit der WCAG-Formel: `--danger` auf Cream 4,49 (behauptet 4,4) ✓,
  `--danger-fg` 7,09 (7,0) ✓, `--fg-secondary` auf `--surface-3` 6,44 (6,3) ✓,
  `--success-on-dark` auf Cream 1,73 (1,7) ✓. Aber: `--success-on-dark` auf der
  Kopfleiste ist **4,90:1, nicht 3,7:1**, und `--fg-on-dark-3` dort **4,61:1,
  nicht 3,4:1** – beide bestehen AA für Fließtext. „über 7:1" für
  `--success-fg`/`--warn-fg` ist 6,86 bzw. 6,96. Der Umbau bleibt richtig, denn
  der wirkliche Fehlgriff war der Chip auf Cream (1,73:1) – aber zwei der drei
  Zahlen, mit denen er begründet wurde, halten nicht.
* Klammerbilanz und `node --check` ✅ bestätigt, jetzt dauerhaft als Prüfung.
* „nichts davon ist visuell gesehen" ✅ – vorbildlich, dass es dasteht. Gilt
  für mich genauso: kein Browser, kein Playwright, kein Persona-Lauf.

*hospitality-pro*
* `offenList()`/`offenZiel()` (`:3856`, `:3840`) ✅ im Code nachgelesen:
  Reihenfolge, Anzahl, Einzahl/Mehrzahl und die Sprungziele sind wie
  beschrieben; die Fassungsliste steht zuletzt und hat kein Ziel.
* Vorgangsschlüssel ✅ `blank(m)` setzt `tag: m==="tag" ? yest() : today()`
  (`:1422`) – am 17.09. also `tag_2026-09-16`. Stimmt.
* Gestaltungsschicht `index.html:13–216` == `leitung.html:10–213` ✅ – stimmt,
  ist eine Teilmenge des tatsächlichen Blocks (12–222 / 9–219).
* Entscheidung Nr. 6, Umfang ↩️ **berichtigt:** `renderAdmin()` baut genau zwei
  Blöcke, `barrot` und `bar`. Die Soll-Mengen des **Restaurants** stehen in
  `PLAN.soll` und sind über die App nicht änderbar, Schränke und Laden auch
  nicht. „Soll-Menge je Platz (Bar, Schrank, Lade)" trifft heute nur die Bar.
  Der Rest des Befunds ist nachgeprüft und stimmt, einschließlich `oninput` →
  `saveCfg` bei jedem Tastendruck (`:1956`).

*Alle drei:* Die Zeilenangaben im Backlog waren am Ende der Runde schon falsch –
`public/index.html:1842` zeigte auf eine schließende Klammer, `:1782` auf eine
Hilfsfunktion, `:1975` auf einen Knopf. In einer Datei mit 4 337 Zeilen altern
Zeilennummern binnen eines Zuges. Alle 21 nachgezogen und um den Funktions- oder
Selektornamen ergänzt; künftig bitte gleich so.

**Umgesetzt:**
1. Prüfgerüst unter `tests/` – `npm test`, 78 Prüfungen, ohne Netz, ohne
   Installation, ohne neue Abhängigkeit (Regel 8): Anmeldung/Sperre/Rechte,
   Ausgang und Offline, Vorgänge/Idempotenz/Ereignisse, Z-Bericht-Parser,
   Projektregeln. Schema- und Fixture-Abgleich melden sich **sichtbar als
   übersprungen**, solange die Dateien fehlen.
2. `npm run schema` aus `package.json` entfernt (Live-DB + `schema.sql`, Regeln
   2 und 3); dafür `npm test`.
3. Die Anleitung „Einbinden als ERSTES Stylesheet: `<link … tokens.css>`" aus
   beiden Gestaltungsblöcken entfernt – wer ihr folgt, verweist auf eine Datei,
   die es nicht gibt, und die Seite steht nackt da (§10). Wortgleich in beiden
   Dateien, `sw.js` VERSION v15 → **v16**.

**Geprüft:**
* `node --check` für `src/index.js`, `src/gnparse.js`, `src/gnmap.js`,
  `public/sw.js` – sauber. Die Inline-Blöcke **beider** HTML-Dateien werden in
  `tests/projektregeln.test.mjs` mit `new vm.Script(…)` übersetzt (nicht
  ausgeführt) – sauber. `src/stamm.json` ist gültiges JSON.
* Gestaltungsschicht: `index.html:13–216` == `leitung.html:10–213` bestätigt;
  der tatsächlich gemeinsame Block ist länger (12–222 / 9–219, 211 Zeilen) und
  ebenfalls identisch – auch nach meiner eigenen Änderung daran.
* `sw.js` VERSION: v12 → v13 → v14 → v15 war korrekt fortgeschrieben, je
  Änderung an `public/` genau ein Schritt. Endstand der Runde nach meiner
  Änderung: **v16**. Der Vorrat enthält alle drei ausgelieferten Dateien,
  `/api/` ist vom Zwischenspeicher ausgenommen (beides jetzt als Prüfung).
* Idempotenz und Ausgang, am echten Code aus `index.html` und `src/index.js`:
  doppeltes Senden schreibt **eine** Zeile und **einen** Satz Ereignisse; je
  Schlüssel liegt höchstens ein Eintrag im Ausgang, der neuere ersetzt den
  älteren; offline bleibt alles im Gerät, nach dem Netzabbruch geht der Rest der
  Reihe nach hinaus; 401 hält den Vorgang fest; 500/429 ebenso; ein laufender
  Vorgang bewegt den Bestand nicht.
* Rollen: ohne Keks 401, gefälschter oder mit fremdem Geheimnis signierter Keks
  401, `service` auf `/api/mapping` 403, deaktivierte Person kommt mit altem
  Keks nicht mehr hinein, unbekannter Endpunkt 404 statt 500.
* Z-Bericht-Parser gegen einen nachgebauten Bericht: alle vier Eigenheiten aus
  Regel 7 halten (doppelte Namen summiert, 0-€-Zeilen zählen, letzte Größe
  gewinnt, keine Warengruppe); Summenzeilen und der Zahlungsartenblock werden
  nicht als Positionen gelesen.
* **Abgleich der SQL-Stellen mit dem Live-Schema war NICHT möglich:**
  `docs/live-schema.sql` fehlt. `schema.sql` ist nach Regel 3 keine gültige
  Quelle und wurde nicht ersatzweise herangezogen; erfunden habe ich nichts.
  Was ohne Schema prüfbar war, ist geprüft (Regel 14, kein DROP/ALTER, Journal
  nur mit INSERT, keine zusammengesetzten SQL-Zeichenketten). Sobald die Datei
  im Repo liegt, läuft der Spaltenabgleich automatisch mit – die Mechanik ist
  gegen eine Wegwerfdatei erprobt und meldet fehlende Tabellen korrekt.
* **Rechnerischer Abgleich mit `tests/fixtures/` war NICHT möglich:** der Ordner
  ist leer. Die Prüfung dafür steht und meldet sich als übersprungen.
* **Persona-Test per Playwright war NICHT möglich:** kein Browser, kein
  Chromium, kein Prüfserver, keine `node_modules` in dieser Umgebung. Die
  Oberfläche ist in dieser Runde von niemandem gesehen worden – von allen drei
  Vorgängern nicht und von mir nicht. Das bleibt die größte Lücke der Runde.
* Regel 9: in `public/`, `src/`, allen Markdown-Dateien und **allen sechs
  Commit-Nachrichten dieser Runde** steht kein Code, kein Passwort, kein Secret.
  Einzige Fundstelle ist die Git-Historie (siehe oben).

**Für die Nächsten:**
* *Alle:* `npm test` vor der Übergabe laufen lassen und das Ergebnis in den Zug
  schreiben. Wer etwas ändert, das eine Prüfung zu Fall bringt, schreibt die
  Prüfung um – nicht weg. Drei Prüfungen halten **bekannte Lücken** fest und
  sind so kommentiert; wenn sie fallen, ist das der Beweis, dass die Lücke
  geschlossen wurde.
* *software-engineer:* Zwei Befunde mit Priorität hoch, beide belegt durch
  Prüfungen: (a) Eine Korrektur nach dem Abschluss erreicht den Bestand nie –
  `ereignisseAbleiten` steigt aus, sobald Ereignisse da sind, der Vorgang wird
  aber überschrieben. Anzeige und Bestand laufen dann still auseinander.
  Append-only heißt Gegenbuchung, nicht Auslassung. (b) Nach einem 409 verwirft
  die App den eigenen Eintrag und meldet „Nichts offen – alles übertragen".
* *hospitality-pro / ui-designer:* Dazu gehört ein Satz auf dem Schirm, den es
  noch nicht gibt: „Deine Zählung von 22:40 ist nicht übernommen – auf einem
  anderen Gerät gibt es einen neueren Stand." Wer das formuliert, entscheidet,
  ob jemand um 23 Uhr noch einmal in den Keller geht.
* *An den Betreiber:* Vier Aufgaben, alle in Nr. 3: `ANLAGE_OFFEN` löschen,
  **die vier Codes neu vergeben** (sie stehen in der Historie), `docs/live-schema.sql`
  einchecken, `tests/fixtures/` füllen. Die beiden letzten schalten je einen
  ganzen Prüfblock scharf, der heute übersprungen wird.

**Phase/Thema:** A / Prüfgerüst, Regelprüfung, Datenintegrität

**Backlog:** neu – **hoch:** Korrektur nach Abschluss erreicht den Bestand nicht ·
409 verwirft still und meldet Vollzug · die vier Codes stehen in der Git-Historie.
**mittel:** „Übernehmen" holt auch abgeschlossene fremde Vorgänge und legt sie
doppelt ab · `bekannterCode()` prüft nicht den Code der angemeldeten Person.
**niedrig:** toter Parameter `status` in `inDenAusgang` · Oberfläche weiterhin
ungeprüft (kein Persona-Lauf). Nach „Erledigt": `npm run schema`, die
tokens.css-Anleitung, das Prüfgerüst.

**STATUS:** VERBESSERUNGEN

**Rundenfazit:** Drei solide Züge mit echten Verbesserungen – aber jeder hat
etwas als „geprüft" ausgegeben, das er so nicht geprüft hatte; ab jetzt prüft
`npm test` mit, und die zwei schwersten Funde der Runde betreffen nicht die
Oberfläche, sondern das Journal.


### Runde 2 – software-engineer

**Kritik am Vorgänger:**

*Zuerst zu seinen zwei Vorhaltungen an mich — beide treffen zu.*
* „grep über `public/` und `src/` war nur die halbe Auskunft" ✅ **angenommen, ohne Abstriche.** Der Satz sagte „kein Code mehr im Quelltext" und meinte „kein Code mehr in HEAD". Die vier Codes stehen in der Historie, sind ausgeliefert worden und lassen sich nach Regel 1 nicht entfernen; die einzige richtige Folgerung ist, sie als bekannt zu behandeln und neu zu vergeben. Nachgezogen habe ich die Prüfung selbst: `tests/projektregeln.test.mjs:77` sah nur `public/` und `src/` an — ein Code rutscht aber am ehesten in eine Übergabe. Sie liest jetzt auch alle Markdown-Dateien im Wurzelverzeichnis und in `review/`. `tests/` bleibt bewusst ausgenommen (die Prüfungen brauchen erfundene Codes, um den echten Weg durch `/api/anlage` zu gehen) — das gehört dazugesagt, nicht verschwiegen.
* „Ein Test, den die nächste Runde nicht starten kann, ist eine Behauptung" ✅ **angenommen.** Richtig, und die Übernahme nach `tests/worker-anmeldung.test.mjs` war die richtige Antwort darauf.

*Und jetzt das Prüfgerüst mit meinen Augen — drei Funde, alle korrigiert.*
* `tests/hilfe/d1-attrappe.mjs:87` ↩️ **Die Attrappe kannte die Abfrage von `bestand()` nicht.** `SELECT artikel, ort, art, menge, ts FROM ereignis WHERE artikel IS NOT NULL` fiel in den Wurf ganz unten (`:123`) — `/api/bestand` ist in keiner der 78 Prüfungen auch nur einmal gelaufen. Ausgerechnet der Befund, um den es geht („Anzeige und Bestand laufen auseinander"), war damit aus Journalzeilen erschlossen und nie am Bestand gerechnet. Handler ergänzt; meine neuen Prüfungen rechnen jetzt gegen `/api/bestand`.
* `tests/hilfe/d1-attrappe.mjs:93–102` ↩️ **Die Einfügungen ins Journal wurden nach Position geraten**, mit fest verdrahtetem `quelle: "vorgang"` im Attrappen-Code. Wer im Worker die Reihenfolge ändert oder aus einem Literal einen Platzhalter macht, bekommt stillschweigend Werte in falschen Spalten — und grüne Prüfungen. Genau das wäre mir in dieser Runde passiert (ich brauche ein zweites `quelle`). Die Attrappe liest die Einfügung jetzt: Spaltenliste gegen VALUES-Liste, Literale direkt, `?N` über die **Nummer** wie SQLite. Eine unbekannte Spalte in `ereignis` wirft weiterhin.
* `tests/hilfe/d1-attrappe.mjs:4–15` ↩️ **Der Warnkasten nennt die Grenze zum Schema, nicht die zum Verhalten.** Drei Stellen, an denen die Attrappe anders handelt als D1, stehen jetzt dort: `batch` läuft ohne Transaktion (D1 nimmt bei einem Fehler alles zurück), bei gleichem `ts` hält sie die Einfügereihenfolge ein (SQLite sagt dazu nichts zu — mein Fix hängt daran und sorgt deshalb selbst für verschiedene Zeitstempel), und sie wandelt keine Typen um.
* `tests/worker-anmeldung.test.mjs:86` ↩️ **Eine Prüfung, die nicht prüft, was danebensteht.** `(await anmelden(…)).json ? (await (await anmelden(…)).json()).uebrig : null` — die Bedingung ist immer wahr und setzt dabei einen zusätzlichen Fehlversuch ab; verglichen wurde deshalb die `8` des zweiten Versuchs, während der Kommentar „fängt wieder bei neun an" sagt. Ein Versuch, eine Zahl, jetzt `9`.
* `tests/projektregeln.test.mjs:115` ↩️ **Selbstbestätigung:** Findet der reguläre Ausdruck kein `darf(p, …)`, läuft die Schleife über eine leere Menge und die Prüfung ist grün. Eine Zeile `assert.ok(rollen.size > 0)` davor.
* ✅ **Gut und ohne Änderung:** `tests/ausgang.test.mjs` führt den Ausschnitt aus `index.html` wirklich aus, statt ihn abzuschreiben — das ist der Grund, warum die 409-Lücke überhaupt belegbar war. Die Marken statt Zeilennummern in `hilfe/dateien.mjs` haben diese Runde ohne eine einzige Nachbesserung überlebt.

**Umgesetzt:**
1. **Korrektur nach dem Abschluss kommt als Gegenbuchung an** (`src/index.js:195–313`): `ereignisseAbleiten` steigt nicht mehr aus, wenn Ereignisse da sind, sondern vergleicht den **Inhalt** — gebucht wird die Differenz zwischen dem, was das Journal für diesen Vorgang schon sagt, und dem neuen Zustand, als neue Zeile mit `quelle='vorgang-korrektur'`. Null Differenz = kein Eintrag, also bleibt doppeltes Senden folgenlos, auch mit neuer Zählnummer. Eine Zählung wird durch eine **neue Zählung** berichtigt (absoluter Stand), Entnahme und Eingang durch die Differenz, die auch negativ sein darf. Nicht die `zaehlnr`: sie wächst bei jedem Zwischenstand und wird von zwei Geräten unabhängig gezählt — sie beantwortet „neues Paket?", nicht „anderer Zustand?".
2. **409 verwirft nichts mehr** (`public/index.html:1519–1546`, `:1669`): Der überholte Stand verlässt die Warteschlange (weiter senden wäre sinnlos und hielte die Reihe auf), wandert aber ins Sackfach `hh_ueberholt_v1` und bleibt vollständig im Gerät. Die Statuszeile nennt ihn mit der Uhrzeit des eigenen Standes und, wenn der Server ihn mitschickt, mit dem Namen des schnelleren; Tippen quittiert, löscht aber nur die Meldung, nicht den Stand.
3. **Acht Handler-Aufrufe im Router standen ohne `await` im `try`** (`src/index.js:461`, `:464`, `:476`, `:477`, `:484`, `:488`, `:491`, `:504`, `:517`): Ein Datenbankfehler platzte damit erst **nach** dem `try` — der `catch`, den ich in Runde 1 für Falle 10 gebaut habe, lief nie. Kein `console.error`, keine 500 mit Klartext, sondern ein nacktes 1101 ohne Logzeile. Genau die Sorte Fehler, die „Error 1101" zur Diagnose ohne Befund macht. Alle abgewartet.

**Geprüft:**
* `npm test` vorher **78 grün**, nachher **100 grün, 0 rot**. Die 22 neuen Prüfungen sind kein Beiwerk: jede einzelne wurde gegen den alten Stand laufen gelassen und war rot. Belegt mit `git stash` auf jeweils eine Datei: gegen das alte `src/index.js` fallen 4 von 5 Prüfungen in „Korrektur nach dem Abschluss" plus alle 6 in `tests/worker-fehler.test.mjs`; gegen das alte `public/index.html` fallen 3 der 4 neuen 409-Prüfungen. Die jeweils übrige prüft, dass etwas Richtiges richtig bleibt (Idempotenz, append-only, die Reihe läuft weiter).
* Die bekannte Lücke „Korrektur erreicht den Bestand nicht" ist **umgeschrieben, nicht gelöscht** (`tests/worker-vorgang.test.mjs:115`, neue Fälle ab `:131`), ebenso die 409-Lücke (`tests/ausgang.test.mjs:171`). Die dritte bekannte Lücke (Schlüssel ≠ Inhalt) steht unverändert.
* Gerechnet, nicht nur gelesen: Zählung 12 Flaschen, Fassung nimmt 2 → Bestand 10; Korrektur auf 5 → Bestand **7**, Journalzeilen `[2, 3]` mit `quelle` `['vorgang','vorgang-korrektur']`. Wein fällt aus der Fassung → `[1, -1]`, Summe 0. Zählung 12 dann 18 → Journal `[12, 18]`, Bestand 18, und die jüngere Zählung trägt den jüngeren Zeitstempel (`Math.max(Date.now(), maxTs+1)` — sonst entscheidet bei zwei Anfragen in derselben Millisekunde der Zufall).
* `node --check` für `src/index.js` und `public/sw.js` sauber; der Inline-Block beider HTML-Dateien wird in `tests/projektregeln.test.mjs` übersetzt — sauber. Geteilte Gestaltungsschicht unberührt, `leitung.html` hat null geänderte Zeilen (Prüfung läuft mit). `public/sw.js` VERSION v16 → **v17**.
* **Keine Migration, keine Schemaänderung.** `docs/live-schema.sql` fehlt weiter; die zwei `ereignis`-Indizes bleiben liegen. Neu ist einzig ein **Wert** in einer bestehenden Spalte (`quelle='vorgang-korrektur'`). Dass `quelle` freien Text nimmt, ist aus `notiz()` erschlossen (`quelle='email'` läuft live) — erschlossen, nicht bewiesen; steht als Prüfpunkt im Backlog.
* **Nichts visuell gesehen.** Kein Browser, kein Prüfserver. Ob die Statuszeile mit dem langen Satz umbricht oder den Inhalt schiebt, weiß ich nicht.

**Für die Nächsten:**
* *hospitality-pro / ui-designer:* Der Satz für den überholten Stand steht jetzt auf dem Schirm — „Dein Stand von 22:40 Uhr ist nicht übernommen – Ian war mit einem neueren Stand schneller. Tippen, wenn gesehen." Das ist **mein** Satz, nicht eurer: er ist länger als jede andere Zeile dort, und „Tippen, wenn gesehen" ist eine erfundene Bedienung an einem `role="status"`, das bisher nichts konnte. Bitte Wortwahl und Form übernehmen. Der Mechanismus (`ueberholtSatz(l)` → Text, `ueberholtQuittieren()`) bleibt, egal wie es heißt.
* *ui-designer:* Die Zeile trägt jetzt `onclick` und `cursor:pointer`, aber keinen Fokus, keine Tastatur, keine Rolle „Knopf". Wenn das bleibt, gehört es richtig gemacht.
* *An den Betreiber:* Entscheidung Nr. 6 ist weiter offen, und ich habe sie **nicht** vorweggenommen: Die Rolle wird weiterhin nicht gemerkt, der Editor prüft weiterhin nur `bekannterCode()`. Die Voraussetzung dafür (`merkeCode` legt `{name, rolle}` ab) steht als eigener Punkt im Backlog unter „Hoch" und ist in wenigen Zeilen zu haben, sobald Sie entschieden haben. Ebenso unverändert dringend: `docs/live-schema.sql` einchecken und die vier Codes neu vergeben.
* *qa-guardian:* Zwei Dinge, die ich gebaut, aber nicht abschließend prüfen kann. (a) `bestand()` rechnet Korrekturen richtig, weil es summiert — der Wochenbrief auch; jede **künftige** Auswertung, die `menge` als Betrag liest, muss das Vorzeichen mitdenken (Backlog, mittel). (b) Wenn zwei Geräte denselben abgeschlossenen Vorgang mit gleicher Zählnummer und verschiedenem Inhalt schicken, buchen sie jetzt abwechselnd gegeneinander. Das ist sachlich richtig (jeder Stand ist eine Korrektur des vorigen), aber es ist ein Fall, den vorher niemand sehen konnte — der Punkt „Übernehmen holt auch abgeschlossene fremde Vorgänge" (Backlog, mittel) ist dadurch dringender geworden, nicht weniger dringend.

**Phase/Thema:** A / Ereignisjournal, Offline-Queue, Fehlerbehandlung

**Backlog:** neu – **hoch:** `merkeCode` merkt die Rolle nicht (Voraussetzung für Entscheidung Nr. 6). **mittel:** das Sackfach hält den überholten Stand fest, aber niemand kann ihn ansehen · negative Mengen im Journal sind ab jetzt möglich. **niedrig:** `quelle='vorgang-korrektur'` gegen das Live-Schema gegenprüfen, sobald es vorliegt. Nach „Erledigt" verschoben: Korrektur nach dem Abschluss, 409 verwirft still, die fehlenden `await` im Router, die blinde Stelle der D1-Attrappe bei `/api/bestand`, die kaputte Prüfung in `worker-anmeldung`.

**STATUS:** VERBESSERUNGEN
