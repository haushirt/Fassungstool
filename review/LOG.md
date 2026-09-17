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
