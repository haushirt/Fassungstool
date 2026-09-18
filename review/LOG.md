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


### Runde 2 – ui-designer

**Zuerst die Nachricht, die alles andere in dieser Runde verändert: Es gibt
einen Browser.** In Runde 1 hat jede der vier Rollen in ihren Zug
geschrieben, die Oberfläche sei von niemandem gesehen worden. Das stimmte.
Für Runde 2 stimmt es nicht mehr: In der Arbeitsumgebung liegt ein global
installiertes Playwright samt Chromium (`/opt/pw-browsers`). Die Bilder
liegen in `review/screens/runde-2/`, iPhone 390×844 und MacBook 1440×900,
und ich habe sie angesehen. Das Vorgehen steht als `tests/ui-aufnahme.cjs`
im Repo – **nicht** Teil von `npm test` (der Lauf sucht nur `*.test.mjs`),
ohne Eintrag in `package.json`, und ohne gefundenes Playwright legt es sich
mit einer Zeile hin statt rot zu werden. Regel 8 ist damit nicht berührt;
die Frage, ob daraus mehr werden soll, steht als Nr. 8 in
`review/OFFENE-ENTSCHEIDUNGEN.md`. Der qa-guardian hat in Runde 1
geschrieben: „Ein Test, den die nächste Runde nicht starten kann, ist eine
Behauptung." Das gilt für Bilder genauso.

**Kritik am Vorgänger:**

*Die zwei Punkte, die er mir ausdrücklich übergeben hat.*

* `public/index.html:1638` (alt) **„Dein Stand von 22:40 Uhr ist nicht
  übernommen – Ian war mit einem neueren Stand schneller. Tippen, wenn
  gesehen."** ↩️ **geändert** → „Dein Stand von 22:40 ist nicht übernommen
  – Ian hat danach gezählt." (jetzt `:1681`). 113 Zeichen auf 66. Was weg
  ist und warum: **„Uhr"** ist neben „22:40" doppelt. **„war mit einem
  neueren Stand schneller"** erzählt einen Wettlauf – um 23 Uhr, nach einer
  Stunde Zählen, ist das der falsche Rahmen, und es beantwortet die einzige
  Frage nicht, die in diesem Moment zählt: *Muss ich noch einmal
  hinunter?* „hat danach gezählt" beantwortet sie mit Nein, in vier
  Wörtern. **„Tippen, wenn gesehen"** ist ersatzlos weg (siehe unten). Die
  Uhrzeit bleibt – sie ist das Einzige, woran man den eigenen Stand
  wiedererkennt. Ohne Namen heißt es „ein anderes Gerät hat danach
  gezählt", bei mehreren „3 Stände sind nicht übernommen – andere Geräte
  haben danach gezählt." Alle drei Fälle sind aufgenommen.
* **`onclick` + `cursor:pointer` an einem `role="status"`** ↩️ **geändert,
  und zwar in der Geste selbst.** Tippen ist hier falsch, nicht nur
  unvollständig gebaut: Die Zeile ist eine Auskunft, und eine Auskunft, die
  auf Berührung verschwindet, verschwindet auch unter dem Daumen, der beim
  Hochlaufen aus dem Keller das Telefon hält. Eine unsichtbare Fläche über
  die ganze Bildschirmbreite, die eine Meldung löscht, ist die schlechteste
  Version von „versteckte Geste". Jetzt steht ein echter `<button>` daneben
  („Gesehen", `:948` `.netzok`), die Live-Region `role="status"` sitzt auf
  dem **Text** und nicht mehr auf dem Knopf, und die Zeile selbst ist
  wieder unanfassbar. Gemessen statt behauptet: per Tab in **einem** Schritt
  erreichbar, Enter quittiert, der Fokusring ist im Bild
  (`iphone-menu-ueberholt-fokus.png`), der Stand bleibt danach mit
  `quittiert:1` und vollständigen Daten im Gerät liegen.
* ✅ **Gut und unverändert übernommen: der Mechanismus.** `ueberholtSatz(l)`
  → Text, `ueberholtQuittieren()` → quittiert, Sackfach `hh_ueberholt_v1`.
  Ich habe nur den Text und die Bedienung getauscht; an Ablauf, Speicher
  und Prüfungen ist nichts angefasst, `tests/ausgang.test.mjs` läuft
  unverändert durch.
* ↩️ **Ein Befund, den er nicht sehen konnte, und der seine Arbeit fast
  wirkungslos gemacht hätte:** Die Meldung erscheint nach dem Abschluss –
  und nach dem Abschluss steht man im **Menü**. `#netz` lag in `#app`
  (`:1317`), das im Menü auf `display:none` steht. Der 409-Satz, um den es
  in seinem ganzen Punkt 2 geht, wäre also genau dort unsichtbar gewesen,
  wo er gebraucht wird. Das war mein eigener offener Backlog-Punkt aus
  Runde 1 („kein Übertragungszustand im Menü", hoch) – durch seine Meldung
  ist er von „unschön" zu „macht die Meldung wirkungslos" geworden.
  Behoben, siehe Umgesetzt 3.

*Und zwei Berichtigungen an mir selbst, jetzt nachgemessen statt geschätzt.*

* `public/index.html:394` (alt) „Die Trefferfläche wächst: 36 + 2×4 = 44."
  ❌ **war falsch für einen der beiden Knöpfe.** Ein absolut gesetztes
  `::after` mit `inset:-4px` rechnet gegen die **Polster**kante seines
  Bezugsrahmens; der 1px-Rahmen von `.hilfebtn` fällt heraus. Im Browser
  gemessen: 4px über der Oberkante traf der „?"-Knopf **nicht** mehr, es
  waren 42px. „Menü" (`border:0`) war korrekt bei 44. Berichtigt (`:398`)
  und die Größe steht jetzt direkt da, statt sie aus Rahmenbreiten zu
  erschließen. Derselbe Fehler war mir gerade beim neuen Knopf noch einmal
  unterlaufen und ist am Messwert aufgefallen.
* „Die Statuszeile schiebt den Inhalt um ~25px, `--topH` wird über den
  ResizeObserver nachgezogen, aber gesehen hat es niemand." ✅ **jetzt
  gesehen und gemessen:** ohne Meldung `--topH: 156px`, mit dem
  zweizeiligen 409-Satz `175px`, `#topwrap` jeweils gleich hoch. Der
  ResizeObserver hält. Die Zeile bricht sauber um; damit das Zeichen dabei
  nicht in die Mitte des Blocks rutscht, steht es jetzt über einen
  gerechneten Versatz auf der **ersten** Zeile (`:942`, `align-items:
  flex-start`).

**Umgesetzt:**

1. **Der Satz für den überholten Stand, auf das Nötige gekürzt** (`:1681`
   `ueberholtSatz`): 113 → 66 Zeichen, drei Fälle (mit Name, ohne Name,
   mehrere), kein Wettlauf, keine erfundene Geste, dafür die Antwort auf
   „muss ich noch einmal hinunter?".
2. **Die Meldung bekommt einen Knopf statt einer Geste** (`:948`
   `.netzok`, `:1317`, `:1946` Markup, `:1697` `netzChip`): echter
   `<button>`, per Tastatur erreichbar, Fokusring aus der Tokenebene,
   Trefferfläche **44px** (nachgemessen: ±4px über und unter der sichtbaren
   Kante). `role="status"` sitzt jetzt auf dem Text. Im selben Zug die
   42px-Fläche von „?" berichtigt (`:398`).
3. **Der Übertragungszustand steht auch im Menü** (`:1697` `netzChip`,
   `:1946` Block, `:972` `.netz--block`): `netzChip()` malt an alle
   `.netz`-Knoten; im Menü steht derselbe Zustand als Block über den
   Kacheln – gleiche Farben, gleiche Formen, gleicher Satz, nur ohne
   Leiste zum Anhängen. Sichtbar ist immer nur einer von beiden, der andere
   liegt in einem Elternteil mit `display:none`.

**Geprüft:**

* **Zum ersten Mal in diesem Zyklus visuell geprüft.** 16 Aufnahmen in
  `review/screens/runde-2/`, je iPhone und MacBook, sieben Zustände:
  überholter Stand mit Namen / ohne Namen / dreifach, „Vorgänge warten",
  stumm, dazu dieselben Zustände im laufenden Schritt. Alle angesehen.
  **Keine JS-Fehler** in keinem der 14 Seitenaufrufe (`pageerror` wird
  mitgeschrieben).
* Gemessen, nicht geschätzt: Knopf 36px sichtbar, Trefferfläche 44px
  (`elementFromPoint` 4px über und 3px unter der Kante trifft `.netzok`,
  4px darunter nicht mehr). „?" und „Menü" jetzt beide bei 44px.
  Statuszeile im Schritt 36px einzeilig, 55px zweizeilig; `--topH` folgt
  156 → 175px. Im Menü als Block 37px bzw. 75px.
* Bedienung durchgespielt: Tippen quittiert; Tab erreicht den Knopf im
  ersten Schritt, Enter quittiert; danach steht sofort der nächste Zustand
  („Nichts offen – alles übertragen", grün, Knopf verborgen) statt einer
  Lücke; `hh_ueberholt_v1` enthält danach weiterhin **einen** Eintrag mit
  vollständigen Daten und `quittiert:1` – der Stand ist nicht weg, nur die
  Zeile schweigt (Regel 6).
* Kontraste gerechnet (WCAG-Formel, alle vier Zahlen selbst gerechnet):
  Text `--danger-fg` #7A3A12 auf `--danger-bg` #FBEDE6 = **7,52:1**;
  Knopfschrift und Knopfrahmen #7A3A12 auf `--surface` #FFFFFF = **8,60:1**;
  Fokusring `--ring` #004947 auf #FBEDE6 = **8,99:1**. Keine Zahl ohne
  Rechnung, keine geschätzte Zahl im Text.
* `npm test`: vorher **100 grün**, nachher **100 grün, 0 rot**. Keine
  Prüfung ist gefallen, also keine umgeschrieben. `tests/ausgang.test.mjs`
  schneidet den Ausschnitt bis `zieheFern` heraus – `netzChip` und
  `ueberholtSatz` liegen dahinter und sind dort als Attrappe gesetzt;
  meine Änderungen berühren die Prüfungen nicht.
* `node --check` für `public/sw.js` und `tests/ui-aufnahme.cjs` sauber; die
  Inline-Blöcke beider HTML-Dateien werden in `tests/projektregeln.test.mjs`
  übersetzt – sauber.
* **Geteilte Gestaltungsschicht nicht berührt:** `index.html:12–222` gegen
  `leitung.html:9–219` zeilenweise verglichen, 211 Zeilen, identisch.
  `leitung.html` hat **null** geänderte Zeilen; `.netz`, `.netzok`,
  `.netz--block` kommen dort nicht vor, alle meine CSS-Änderungen liegen
  bei Zeile 398 und dahinter. Genau vier Dateien in `public/`, keine
  ausgelagerte CSS-Datei, kein neues Hex-Literal, kein Framework.
* `public/sw.js` VERSION v17 → **v18**.

**Für die Nächsten:**

* *Alle:* `node tests/ui-aufnahme.cjs` läuft und legt Bilder nach
  `review/screens/runde-<N>/` (`RUNDE=3 node …`). Wer `public/` anfasst,
  sollte ihn laufen lassen und die Bilder **ansehen**. Er schreibt auch
  jeden JS-Fehler der Seite mit – das ist die billigste Regressionsprüfung,
  die wir haben.
* *hospitality-pro:* Der Satz gehört jetzt dir zum Gegenlesen. Zwei
  Stellen, an denen ich unsicher bin: Ist **„nicht übernommen"** im Haus
  verständlich, oder heißt das gesprochen eher „ist nicht angekommen"? Und
  ist **„Gesehen"** der richtige Knopf, oder sagt man „Passt"? Ich habe
  bewusst nicht „Verstanden" genommen – das klingt nach Belehrung.
* *software-engineer:* Ein Befund aus den Bildern, der dich betrifft: Das
  Hilfe-Sheet öffnet sich beim **ersten** Besuch eines Schritts von selbst
  und legt sich über den ganzen Schirm, samt Statuszeile. Wer mit einem
  überholten Stand in einen Schritt geht, sieht zuerst eine
  Bedienungsanleitung. Im Backlog (mittel).
* *software-engineer:* Dein Punkt „niemand kann den Stand ansehen" ist
  durch meine Änderung **dringender** geworden, nicht kleiner: „Gesehen"
  ist jetzt die einzige Handlung, und danach ist der Stand endgültig aus
  dem Blick. Daneben gehört ein zweiter Knopf „Ansehen". Die Zeile hat
  Platz dafür, der Bau (`.netz` als Flex-Reihe, Knopf als Geschwister des
  Textes) ist darauf vorbereitet.
* *An den Betreiber:* Entscheidung **Nr. 8** ist neu – ob die
  Oberflächen-Aufnahme dauerhaft ein Handgriff bleiben soll (mein
  Vorschlag) oder in den Prüflauf wandert. Unverändert dringend bleiben
  Nr. 3 (vier Codes neu vergeben, `docs/live-schema.sql`) und Nr. 6.

**Phase/Thema:** A / Zustände nach dem Abschluss, Wortwahl, Trefferflächen

**Backlog:** neu – **mittel:** Hilfe-Sheet verdeckt beim ersten Besuch eines
Schritts die Statuszeile samt Fehlermeldung · Ansicht „Was war in meinem
Stand?" fehlt neben „Gesehen". **niedrig:** `netzChip()` heißt noch Chip und
malt jetzt an zwei Stellen, `id="netz"` wird von keinem Selektor mehr
benutzt · `--topH` steht im Menü auf 0px, weil `#topwrap` dort verborgen
liegt. Nach „Erledigt" verschoben: kein Übertragungszustand im Menü (hoch),
der 409-Satz samt Geste, die 42px-Trefferfläche des „?"-Knopfes.

**STATUS:** VERBESSERUNGEN


### Runde 2 – hospitality-pro

**Zuerst, weil es den Rest dieses Zuges erklärt: Ich habe die App diesmal
gesehen.** Der ui-designer hat den Browser gefunden, ich habe ihn benutzt
und bin die Tagesfassung Schritt für Schritt durchgegangen — Menü,
Bar, Restaurant, Keller, Abschluss, dazu das Getränkelager und das
Nachfüllen. Der wichtigste Fund dieses Zuges war im Code nicht zu sehen,
sondern nur auf dem Schirm (Punkt 1 unten). Was gesehen und was gelesen
ist, steht unter „Geprüft" getrennt.

**Kritik am Vorgänger:**

*Die zwei Wortfragen, die der ui-designer mir ausdrücklich vorgelegt hat.*

* **„nicht übernommen" oder „nicht angekommen"?** ✅ **„nicht übernommen"
  bleibt, ohne Abstriche.** Die beiden Sätze bedeuten im Haus zwei
  verschiedene Dinge, und die Verwechslung wäre teuer. „Ist nicht
  angekommen" heißt bei uns: Netz, Funkloch, nochmal schicken — und
  genau das ist die falsche Handlung, denn nochmal schicken hilft hier
  nie. Wer „nicht angekommen" liest, geht im Zweifel wieder hinunter und
  zählt ein zweites Mal ins Leere. „Nicht übernommen" heißt: es ist
  angekommen, es wurde abgelehnt, ein anderer war vorher da. Das Wort ist
  im Haus geläufig (eine Bestellung, die nicht übernommen wurde, ist
  nicht verschwunden, sondern abgelehnt). Dass der Halbsatz danach
  gleich sagt, wer gezählt hat, macht es endgültig eindeutig.
* **„Gesehen" oder „Passt"?** ✅ **„Gesehen" bleibt.** „Passt" ist bei uns
  die geläufigere Antwort, aber es ist eine **Zustimmung** — „passt so,
  ist in Ordnung". Hier ist gerade nicht alles in Ordnung: Der eigene
  Stand ist weg, und ob Ians Stand vollständig ist, weiß in diesem
  Moment niemand. Ein Knopf, der „Passt" sagt, nimmt eine Zusage ab, die
  die Servicekraft nicht geben kann. „Gesehen" sagt genau, was es tut:
  zur Kenntnis genommen, die Zeile schweigt. Das ist auch die Antwort,
  die man der Chefin gibt. „Verstanden" war richtig verworfen.
* ↩️ **Was in der Meldung aber gefehlt hat: welcher Vorgang.** Um 23 Uhr
  ist „Dein Stand von 20:40" keine Auskunft. An einem Abend laufen leicht
  drei Vorgänge — die Tagesfassung, eine Sonderentnahme für die Küche, ein
  Nachfüllen an der Bar. Ob die Stunde Zählen weg ist oder eine Flasche
  für den Koch, ist der ganze Unterschied. Und bei mehreren stand nur
  „3 Stände sind nicht übernommen" — damit kann niemand etwas anfangen.
  Behoben, siehe Umgesetzt 2.
* ↩️ **Und: die Uhrzeit allein stimmt nur am selben Tag.** Ein iPad, das
  über Nacht ohne Netz im Spind liegt, meldete am Morgen „von 20:40" und
  meinte gestern. Jetzt „gestern 20:40" bzw. „12.09. 20:40".
* ✅ **Gut und ohne Änderung: der Knopf statt der Geste.** Eine Auskunft,
  die unter dem Daumen verschwindet, während man mit dem Telefon in der
  Hand aus dem Keller hochgeht, ist keine Auskunft. Der ui-designer hat
  recht, und der Fokusring im Bild ist der Beleg.
* **Zur Frage des software-engineers, ob „Gesehen" als einzige Handlung
  im Betrieb tragbar ist: nein, aber es ist nicht dringend.** Tragbar
  wäre es, wenn der Satz die Frage beantwortet, die um 23 Uhr zählt —
  „muss ich noch einmal hinunter?". Das tut er, solange der andere Stand
  vollständig ist. Der 409 hängt aber an der Zählnummer, nicht an der
  Vollständigkeit: Ian kann mit einem halb gezählten Stand gewinnen, und
  dann ist meine Stunde Arbeit weg, ohne dass es jemand merkt. Deshalb
  gehört „Ansehen" daneben (steht als Backlog-Punkt des software-engineers
  unter Mittel, ich lasse ihn dort). **Dringend ist es nicht**, weil der
  Fall selten und der Ausweg im Haus kurz ist: man fragt Ian. Was das
  Werkzeug dafür liefern muss, ist der Name — und den liefert es jetzt.

*Und ein Punkt an mich selbst aus Runde 1.*

* `public/index.html:1352` Kacheltext „… Liste fotografieren" ✅ **bleibt
  vorerst und ist richtig**, solange der Schritt existiert — beurteilt,
  nicht angefasst, ausführlich in `review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 9.
  Kurz: Der Schritt gehört weg, aber nicht wegen des Fotos. Das Foto
  verlässt das Gerät nie (Projektanleitung §3), die Leitung sieht es also
  nie — ein Arbeitsschritt, dessen Ergebnis niemand ansieht, hört im
  Betrieb von selbst auf. **Der schwere Punkt ist ein anderer, und den
  habe ich im Browser durchgespielt:** Ist alles geprüft, alles geholt und
  fehlt nur das Foto, meldet der Abschluss „Ein Punkt ist noch offen" und
  „Fertig – Protokoll erstellen" führt in „Trotzdem abschließen?" mit
  Code-Eingabe. Im Protokoll steht danach „Ohne Bestätigung freigegeben
  von …" — auf einer tadellosen Tagesfassung. Die Servicekraft lernt so,
  dass die Freigabe der normale Weg aus dem Abschluss ist; die Leitung
  lernt, eine Warnung zu überlesen, die meistens nichts bedeutet. Das ist
  der Grund, aus dem der Schritt fallen soll, und es ist der einzige, der
  eilt.

**Umgesetzt:**

1. **Der Keller-Schritt hat gelogen, wenn vorher nicht gezählt wurde**
   (`:2650` `rHol`, `:3635` `gHolBlock`). Wer Schritt 1 und 2 überspringt
   oder unterbricht — Schichtwechsel, Gast im Restaurant, Telefon —, las
   im Keller „Kein Wein zu holen. **Alle Kühlschränke sind voll.**" und
   ging leer hinauf. In Wahrheit war nichts gezählt: Ungeprüft gilt in der
   Fassung als voll. Jetzt nennt die Meldung die Zahl der ungeprüften
   Plätze bzw. Laden und die Annahme dahinter („Was nicht gezählt ist,
   gilt als voll"); dieselbe Falle im Getränkelager mitbehoben. Nebenbei
   raus: Kühlschränke stehen weder an der Bar noch im Restaurant, dort
   sind es Laden und Schränke.
2. **Der 409-Satz nennt den Vorgang** (`:1689` `ueberholtSatz`): der Name
   steht vorn wie eine Betreffzeile, weil er nicht am Artikel hängen darf
   („Deine Nachfüllen" gäbe es sonst). Einer: „Tagesfassung: Dein Stand
   von 20:40 ist nicht übernommen – Ian hat danach gezählt." Mehrere:
   „Nicht übernommen: Tagesfassung, Sonderentnahme, Nachfüllen. Andere
   Geräte haben danach gezählt." Ab vier bleibt es bei der Anzahl. Dazu
   „gestern 20:40" bzw. „12.09. 20:40" für Stände, die nicht von heute
   sind.
3. **Zwei Hilfetexte, die im falschen Moment das Falsche sagen**
   (`:1422`, `:1429`, beide aus meinem eigenen Backlog): Die Hilfe zum
   Restaurant-Schritt nannte feste Soll-Zahlen im Fließtext — das Soll
   steht ohnehin bei jedem Wein auf dem Schirm („Soll 3"), im Browser
   nachgesehen. Und die Hilfe zum vierten Schritt hieß „Fassungsliste
   fotografieren", während der Schritt „Abschluss" heißt: Wer dort um
   23 Uhr auf „?" tippt, will wissen, was „Fertig – Protokoll erstellen"
   auslöst, und bekam eine Foto-Anleitung. Sie heißt jetzt „Abschluss" und
   sagt: abschließen, senden, ohne Netz später — und dass die Freigabe mit
   dem eigenen Code geht. Das Foto bleibt ein Satz, solange es den Schritt
   gibt.

**Geprüft:**

* **Gesehen, nicht gelesen** — mit Playwright und Chromium, 390×844:
  die Tagesfassung von der Anmeldung bis zum Abschluss (Menü → Bar →
  Restaurant → Keller/Weinkeller → Keller/Getränkelager → Abschluss), dazu
  Nachfüllen bis zum Holen-Schritt. **Keine JS-Fehler** in keinem der
  Läufe. Neue Bilder in `review/screens/runde-2b/` (sechs von mir, der
  Rest aus dem Lauf von `tests/ui-aufnahme.cjs`).
* **Die drei Änderungen am Bild und am Text nachgemessen, nicht
  angenommen:** Keller ohne jede Prüfung → „Nichts zu holen — aber 11
  Plätze sind noch nicht geprüft." (roter Kasten); ein einzelner offener
  Schrank → „1 Platz ist" (Einzahl geprüft, sie fehlte im ersten Anlauf);
  alles geprüft → der grüne Kasten „Kein Wein zu holen. Bar und Restaurant
  sind voll." Getränkelager: 6 Laden offen in der Tagesfassung, 5 im
  Nachfüllen (Lade 3 fällt dort weg — stimmt) und der grüne Kasten, sobald
  alle bestätigt sind.
* **409-Satz in sechs Fällen aufgenommen und gemessen:** mit Name (81
  Zeichen, 3 Zeilen, 75px), ohne Name (97), gestern (89, 4 Zeilen, 93px),
  fünf Tage alt (93), zwei Vorgänge (83), fünf Vorgänge (Rückfall auf die
  Anzahl, 68). `--topH` folgt der gewachsenen Kopfzeile auf 193px, der
  Knopf „Gesehen" bleibt bei 44px Trefferfläche, per Tab in einem Schritt
  erreichbar, Enter quittiert, der Stand bleibt mit `quittiert:1` im
  Gerät.
* **Hilfetexte im geöffneten Sheet gelesen**, nicht nur im Quelltext:
  Titel „Abschluss" bzw. „Restaurant prüfen", Text vollständig, keine
  abgeschnittene Zeile.
* **Ein Fehler, den mir erst der Prüflauf gezeigt hat:** Im neuen
  Hilfetext stand ein typografisches Anführungszeichen unten („) mit einem
  geraden Zeichen (") als Abschluss — das beendet die JS-Zeichenkette.
  `npm test` war rot („Unexpected identifier 'schließt'"), behoben,
  wieder grün. Genau die Prüfung, die der qa-guardian in Runde 1 gebaut
  hat.
* `npm test`: vorher **100 grün**, nachher **100 grün, 0 rot**. Keine
  Prüfung gefallen, also keine umgeschrieben.
* **Geteilte Gestaltungsschicht nicht berührt:** `index.html:12–222` gegen
  `leitung.html:9–219`, 211 Zeilen, zeilenweise verglichen — identisch.
  `leitung.html` hat **null** geänderte Zeilen und steht nicht im `git
  status`. Kein neues Hex, keine neue Datei in `public/`, kein Framework,
  keine Schemaarbeit. `public/sw.js` VERSION v18 → **v19**.
* **Eine Testvorlage berichtigt** (`tests/ui-aufnahme.cjs`): Der Fall
  „drei überholte Stände" setzte dreimal denselben Modus. Je Schlüssel
  liegt aber nur ein Eintrag im Sackfach — dreimal „Tagesfassung" kann es
  nicht geben, und das Bild hätte gelogen. Jetzt Tagesfassung,
  Sonderentnahme, Nachfüllen: der Abend, den es wirklich gibt.
* **Nicht geprüft:** nichts auf einem echten iPhone, nur im nachgebauten
  Gerät. Und der Abschluss mit einer vollständig gezählten Fassung ist
  nicht durchgespielt (dafür müsste man 57 Weine antippen) — die
  Freigabe-Falle in Nr. 9 habe ich über den Zustand im Speicher erzeugt,
  nicht durch echtes Zählen.

**Für die Nächsten:**

* *ui-designer:* Im Abschluss der Tagesfassung ist „Foto aufnehmen" der
  dunkle Hauptknopf und „Fertig – Protokoll erstellen" der helle daneben.
  Der auffälligste Knopf im letzten Schritt ist der Nebenschritt. Ich habe
  ihn nicht angerührt, weil er mit Entscheidung Nr. 9 zusammenhängt —
  aber wenn Nr. 9 anders ausgeht als ich vorschlage, gehört die
  Rangfolge trotzdem umgedreht. Backlog, mittel.
* *ui-designer:* Zwei Wörter für denselben Gang stehen noch offen
  („Keller" in der Tagesfassung, „Holen" im Nachfüllen). Ich hatte drei
  Punkte und habe die schwereren genommen. Aus meiner Sicht gewinnt
  **„Holen"** — es ist das, was man tut, und es passt auf beide Räume
  (Weinkeller und Getränkelager). „Keller" ist der Ort, und der steht
  ohnehin in den Reitern.
* *software-engineer:* „Ungeprüft gilt als voll" ist die tragende Annahme
  der ganzen Fassung und steht jetzt in zwei Leermeldungen — sonst
  nirgends. Eine neue Kraft ohne Einschulung erfährt sie nie. Ein Satz in
  `BEDIEN` (`:2263`) wäre der richtige Ort, das ist deine oder die des
  ui-designers Wahl. Backlog, mittel.
* *An den Betreiber:* **Entscheidung Nr. 9 ist neu** (Fotoschritt). Sie
  hat einen Zwischenschritt, der eine Zeile kostet und den eiligen Teil
  sofort entschärft: den Punkt „Fassungsliste noch nicht fotografiert"
  aus `offenList()` nehmen. Ich habe ihn nicht gebaut, weil damit ein
  offener Punkt verschwindet, den jemand bewusst hineingeschrieben hat.
  Unverändert dringend aus meiner Rolle: **Nr. 6** (wer darf Soll-Mengen
  ändern) und **Nr. 7** (Sonderentnahme ohne Grund) — beide seit Runde 1
  offen, beide kosten jeden Tag Zahlen, die niemand mehr erklären kann.
  Und `review/INPUT-TEAM.md` ist immer noch leer: Die fünf Gründe der
  Sonderentnahme und der Laufweg im Keller gehören mit Asad, Ian und
  Marinus gegengelesen, bevor jemand Knöpfe dafür baut.

**Phase/Thema:** A / Tagesfassung – Plausibilität im Keller, Wortwahl nach
dem Abschluss, Hilfe im richtigen Moment

**Backlog:** neu – **hoch:** Der Fotoschritt treibt die Freigabe; eine
tadellose Tagesfassung wird als „ohne Bestätigung freigegeben" protokolliert
(→ Entscheidung Nr. 9). **mittel:** „Foto aufnehmen" ist im Abschluss der
Hauptknopf, „Fertig" der Nebenknopf · „Ungeprüft gilt als voll" steht
nirgends in der Bedienungshilfe. Nach „Erledigt" verschoben: die lügende
Leermeldung im Keller, der 409-Satz ohne Vorgangsnamen, die Soll-Zahlen in
der Restaurant-Hilfe, die Foto-Anleitung im Abschluss-Schritt.

**STATUS:** VERBESSERUNGEN


### Runde 2 – qa-guardian

**Zuerst, weil es den ganzen Zug trägt: Der Persona-Test war diesmal
möglich.** In Runde 1 stand in meiner Übergabe, meine Rolle sehe einen
Persona-Test am Phasenende vor und er gehe hier nicht. Das war falsch, und
der ui-designer hat es aufgedeckt. Ich habe ihn nachgeholt — aber nicht mit
`tests/ui-aufnahme.cjs`: die Aufnahme legt den Zustand in den
Gerätespeicher und fotografiert. Eine neue Servicekraft legt nichts in den
Gerätespeicher. Dafür steht jetzt `tests/persona-tagesfassung.cjs` im Repo:
mit einem kleinen Server, der `/api` wirklich beantwortet, damit Anmeldung,
Warteschlange, Idempotenz und abgelaufene Sitzung überhaupt sichtbar
werden. 23 Bilder in `review/screens/runde-2-qa/`.

**Kritik am Vorgänger:**

*Ich habe alle drei nachgemessen, nicht nachgelesen. Diesmal hielt jede
geprüfte Zahl — mit einer Rundungsstelle Abweichung.*

* software-engineer: „jede der 22 neuen Prüfungen war gegen den alten
  Stand rot" ✅ **stimmt, auf die Zahl.** In einem eigenen Arbeitsbaum das
  alte `src/index.js` eingespielt: **10 rot** (4 der 5 in „Korrektur nach
  dem Abschluss" plus alle 6 in `worker-fehler`) — genau seine Aufteilung.
  Mit dem alten `public/index.html`: **3 rot**, exakt die drei genannten
  409-Prüfungen. Nichts beschönigt.
* software-engineer, Regel 6 (Gegenbuchung bucht nach statt zu ersetzen)
  ✅ **hält.** `ereignisseAbleiten` kennt nur `INSERT`; im ganzen Worker
  gibt es kein `UPDATE ereignis` und kein `DELETE FROM ereignis`, und
  `tests/schema.test.mjs` hält das fest. Die Zählung, die im neuen Stand
  gar nicht mehr vorkommt, wird bewusst **nicht** zurückgenommen — das ist
  die richtige Lesart von „gezählt wurde sie trotzdem".
* software-engineer, seine Frage an mich — negative Mengen ↩️ **geprüft,
  und eine Lücke gefunden, die er nicht sehen konnte.** `bestand()`
  (`src/index.js:330`) rechnet vorzeichenbehaftet, `public/leitung.html`
  liest `menge` **nirgends** (es gibt genau drei `FROM ereignis` im Repo,
  alle in `src/index.js`). Der Wochenbrief rechnet richtig — aber
  `scheduled` ist in **keiner** der 100 Prüfungen je gelaufen, weil die
  D1-Attrappe seine beiden Abfragen nicht kannte. Die einzige Stelle, die
  `menge` **aufsummiert**, war unbelegt. Attrappe ergänzt, acht Prüfungen
  in `tests/wochenbrief.test.mjs`. Und ich habe sie gegengeprüft wie seine:
  mit `Math.abs` in der Summe fallen 3 der 8 — sie prüfen also wirklich
  das Vorzeichen, nicht bloß, dass etwas dasteht.
* ui-designer: „nicht Teil von `npm test`, nicht in `package.json`, legt
  sich ohne Playwright hin" ✅ **nachgesehen, stimmt dreifach.** `npm test`
  sammelt `tests/**/*.test.mjs`; die Zahl stieg von 100 auf 123 und keine
  davon kommt aus einer `.cjs`. In `package.json` steht nichts davon.
  `require.resolve` scheitert für `"playwright"` (es gibt kein
  `node_modules`) und trifft `/opt/node22/lib/node_modules/playwright` —
  ohne den Fund wäre es `console.log` + `exit(0)`. **Regel 8 unberührt.**
* ui-designer, die gemessenen Zahlen ✅ **selbst nachgerechnet und
  nachgemessen.** Kontraste mit eigener WCAG-Rechnung: #7A3A12 auf
  #FBEDE6 = **7,52** (behauptet 7,52), auf #FFFFFF = **8,60** (8,60),
  #004947 auf #FBEDE6 = **8,98** (behauptet 8,99 — Rundung). Die drei
  Farben stehen so in `index.html:81` und `:116`. Trefferflächen mit
  eigenem `elementFromPoint`-Abtasten Pixel für Pixel: „Gesehen" 36px
  sichtbar, 4 darüber, 4 darunter = **44**; „?" und „Menü" ebenfalls
  **44/44**. Die 42px-Korrektur hält.
* hospitality-pro ✅ **alle drei Messwerte nachgestellt.** Keller ohne jede
  Prüfung: wörtlich „Nichts zu holen — aber 11 Plätze sind noch nicht
  geprüft." Der 409-Satz mit „gestern": **89 Zeichen** (89), `--topH`
  **193px** und `#topwrap` gleich hoch (193). Und seine Vorlage für den
  ui-designer stimmt bis in die Farbe: im Abschluss ist „Foto aufnehmen"
  `rgb(0,73,71)`, „Fertig – Protokoll erstellen" `rgb(255,255,255)` mit
  Klasse `finishbtn blocked` — der Hauptknopf ist der Nebenschritt.
* ❌ **Abgelehnt habe ich nichts.** Es gab in dieser Runde nichts
  zurückzunehmen; das ist das erste Mal.

**REGELPRÜFUNG (alle 14, gegen `feb7ba2..b5ed1ca`): kein Verstoß — mit
einer Stelle, die sich hier nicht prüfen lässt.**
Regel 1 nur `v2-review` ✓ · 2 kein Deploy/`--remote` ✓ (`npm run deploy`
steht weiter im Backlog, hoch — das ist deine Entscheidung, nicht meine;
neu ist eine Prüfung, die einen Rückfall fängt) · **3/4: nicht prüfbar** —
`docs/live-schema.sql` gibt es im Repo nicht, `docs/` existiert gar nicht.
Der software-engineer hat mit `quelle='vorgang-korrektur'` einen neuen
**Wert** in eine bestehende Spalte gebracht und selbst gesagt, das sei aus
`notiz()` **erschlossen**. Ich sage es deutlicher: In `ereignis.quelle`
stehen heute drei feste Literale — und drei feste Literale sehen genauso
aus wie eine Aufzählung in einer CHECK-Bedingung. Ich habe das **nicht**
aus `schema.sql` beantwortet (Regel 3 verbietet es) und **nicht**
übersprungen, sondern eine Prüfung gebaut, die genau das findet, sobald die
Datei da ist. Mit einem erfundenen Schema **im Wegwerf-Arbeitsbaum**
gegengeprüft: mit CHECK rot, ohne CHECK grün. Im Repo liegt kein
erfundenes Schema. · 5 ✓ (neu belegt) · 6 append-only ✓ und Offline-Reihe
nicht aufgeweicht ✓ · 7 ✓ · 8 kein Framework, keine Abhängigkeit, alles
Bordmittel ✓ · 9 ✓ · 11 `RUNDEN = 1000` unverändert ✓ · 12
`wrangler.jsonc` unberührt ✓ · 14 ✓. Genau vier Dateien in `public/`,
Gestaltungsschicht 211 Zeilen zeilenweise identisch, `leitung.html` null
geänderte Zeilen, `sw.js` v19. Ich habe an `public/` und `src/` **nichts**
angefasst — deshalb bleibt v19 richtig.

**Umgesetzt:**
1. **Der Wochenbrief ist zum ersten Mal gelaufen** (`tests/wochenbrief.test.mjs`,
   Attrappe `tests/hilfe/d1-attrappe.mjs`): 8 Prüfungen, davon 3 echt am
   Vorzeichen. Gegenbuchung wird abgezogen (5 − 3 = **2**, nicht 8), die
   Reihenfolge folgt den Summen und nicht den Beträgen.
2. **Zwei ungeprüfte harte Regeln haben jetzt Prüfungen:** Regel 5
   (`tests/mapping.test.mjs`, 10 Prüfungen — die drei echten Fehltreffer
   aus dem Kopf von `gnmap.js` wörtlich) und Regel 2/3 (kein Skript mit
   `--remote`, `d1 execute` oder `schema.sql`; im Arbeitsbaum als rot
   belegt).
3. **Persona-Durchlauf und drei neue Reihen-Prüfungen**
   (`tests/persona-tagesfassung.cjs`, `tests/ausgang.test.mjs`): 409 ohne
   lesbaren Körper (Cloudflare-Fehlerseite), dauerhafter 500, und das
   stille Abschneiden des Sackfachs bei 20.

**Geprüft:**
* `npm test`: **123 grün, 0 rot** (vorher 100). Beide bekannten Lücken
  melden sich weiter laut als SKIP — `docs/live-schema.sql` und
  `tests/fixtures/`. `node --check` sauber für `src/index.js`,
  `gnparse.js`, `gnmap.js`, `sw.js` und beide `.cjs`; die Inline-Blöcke
  beider HTML-Dateien werden übersetzt.
* **Persona, iPhone 390×844, „neue Servicekraft, erster Tag, nach dem
  Abendservice", vom leeren Anmeldefeld bis „Fertig – Protokoll
  erstellen":** falscher Code → „Dieser Code ist nicht hinterlegt.";
  richtiger Code → Menü mit „Hallo Lena. Die Tagesfassung ist heute noch
  offen."; Schritt 1 Bar (Rotweine + 6 Laden), Schritt 2 Restaurant
  (4 Schränke), Schritt 3 Keller, Schritt 4 Abschluss. **Kein JS-Fehler
  in keinem Aufruf.** Sie ist an keiner Stelle stecken geblieben. Drei
  Stellen, an denen sie zögern würde, unten.
* **Idempotenz / Abbruch / Netz / Rolle / Sitzung — am laufenden Werkzeug,
  nicht am Papier:** Abbruch mitten in der Eingabe (Neuladen) → Zählstand
  Zeichen für Zeichen derselbe, noch angemeldet, steht wieder im Schritt.
  Offline → „1 Vorgang warten – kein Netz", nichts verloren. Wieder online
  → geht von selbst hinaus, Reihe leer. Dasselbe Paket zweimal
  nachgelegt → **ein** Vorgang beim Server, Zustand unverändert.
  Abgelaufene Sitzung → „Nicht angemeldet – bitte neu anmelden", der Stand
  **bleibt** in der Reihe (Regel 6). Falsche Rolle: der Worker antwortet
  auf `/api/personen`, `/api/mapping` POST und `/api/fassungsliste` POST
  nur mit `leitung` (`darf(p,…)`, in `projektregeln` gegen die drei Rollen
  gehalten).
* **Z-Bericht, Regel 7:** alle vier Eigenheiten stehen als eigene
  Prüfungen und laufen grün — doppelte Positionsnamen (12+5=17, beide
  Herkünfte zählbar), 0-€-Zeile als Verbrauch, doppeltes Größensuffix
  (letztes gilt: 125 ml), keine Warengruppe je Zeile.
* **Rechnerischer Abgleich mit `tests/fixtures/`: ÜBERSPRUNGEN.** Der
  Ordner ist leer, also gibt es hier nichts zu berichten. Zum zweiten Mal.
* **Nicht geprüft:** nichts auf einem echten iPhone, nichts gegen eine
  echte D1, kein `wrangler dev`. Der nachgebaute Server in
  `persona-tagesfassung.cjs` zeigt, wie die **App** auf Antworten
  reagiert — er beweist nichts über den Worker.

**Für die Nächsten:**
* *An den Betreiber — die eine Sache, die Phase A aufhält:*
  `docs/live-schema.sql`. Eine Zeile in der D1-Konsole:
  `SELECT name, sql FROM sqlite_master WHERE type='table';` Damit wird aus
  drei erschlossenen Aussagen eine geprüfte, ohne dass jemand daran denken
  muss — die Prüfungen liegen und warten. Unverändert dringend daneben:
  die vier Codes neu vergeben, `ANLAGE_OFFEN` schließen, `tests/fixtures/`.
* *hospitality-pro:* Drei Beobachtungen aus dem Durchlauf, keine davon
  ein Fehler, alle drei deine Wahl. (a) Die Persona kommt in **11 Tipps**
  auf den dunklen Hauptknopf durch die ganze Tagesfassung („Rest ist da –
  weiter" ×11) — und der Keller zeigt danach den **grünen** Kasten „Kein
  Wein zu holen. Bar und Restaurant sind voll." Der schnellste Weg durch
  das Werkzeug ist vom echten Zählen nicht zu unterscheiden. Deine Leer-
  meldung fängt den Fall „gar nicht angefasst" sauber ab; dieser Fall hier
  ist der andere. (b) „Überspringen" unten steht in Schritt 1 und 2 sieben
  bzw. vier Karten lang gleich da, während „Schritt 1 von 4" sich nicht
  rührt — richtig gebaut, aber beim ersten Mal nicht offensichtlich.
  (c) Dein Befund zum Abschluss ist bestätigt, Farbe für Farbe.
* *ui-designer:* Das Hilfe-Sheet beim ersten Besuch ist im Durchlauf
  sofort aufgefallen — es war die **erste** Handlung der Persona im ersten
  Schritt, vor allem anderen. Dein Backlog-Punkt (mittel) trifft; aus
  meiner Sicht darf er hoch, sobald daneben eine Fehlermeldung steht.
* *software-engineer:* Zwei Punkte für dich im Backlog. Der wichtigere:
  `vorgangSchreiben` schreibt die `vorgang`-Zeile **vor** dem Journal.
  Wirft `ereignisseAbleiten`, ist genau der Zustand da, den du behoben hast
  — Vorgang gespeichert, Journal nicht —, nur eine Stelle weiter hinten.
  Zwei `prepare().run()` sind in D1 keine Transaktion; **ein** `batch` wäre
  eine.
* *Skeptiker (Blind-Review Phasenende):* Drei Stellen, an denen ich
  **nichts** beweisen kann und die niemand für bewiesen halten sollte:
  (1) alles, was mit dem Schema zu tun hat — die D1-Attrappe ist ein
  Nachbau und sagt das in ihrem Kopf selbst; (2) alles Visuelle ist
  Chromium in iPhone-Maßen, kein Safari auf einem Telefon; (3) der
  rechnerische Abgleich fehlt vollständig, weil es keine Testdaten gibt.
  Wo du Behauptungen suchst: dort.

**Phase/Thema:** A / Regelprüfung, Persona-Durchlauf, Wochenbrief, Regel 5

**Backlog:** neu – **hoch:** `quelle='vorgang-korrektur'` gegen das
Live-Schema ungeprüft (und mit einer CHECK-Bedingung wäre es ein 500 bei
jeder Korrektur) · die Offline-Reihe hat keinen Fehlversuchszähler
(`versuche` wird angelegt und nie erhöht; ein 500 blockiert die Reihe
lautlos für immer). **mittel:** `vorgangSchreiben` schreibt Vorgang und
Journal ohne Transaktion · „bitte neu anmelden" ohne Weg zum Anmelden im
laufenden Schritt · das Sackfach verwirft ab 20 still. Der Punkt des
software-engineers „negative Mengen sind ab jetzt möglich" ist zur Hälfte
beantwortet: der Bestand ist geprüft (Beleg in der Zeile ergänzt), der
vorausschauende Teil — jede künftige Auswertung in Phase B/C — bleibt
offen und steht weiter unter Mittel. Ganz nach Erledigt gehört er nicht;
das wäre bequem und falsch.

**STATUS:** VERBESSERUNGEN

**Kann Phase A abgeschlossen werden?** Aus meiner Rolle: **noch nicht — es
fehlt genau eine Datei.** Die Arbeit selbst ist so weit: kein Regelverstoß
in dieser Runde, 123 grüne Prüfungen, die Persona kommt ohne Vorwissen
durch, und zum ersten Mal hat jede Rolle das geprüft, was sie behauptet.
Was zwingend fehlt, ist `docs/live-schema.sql`. Regel 4 verlangt, jede
Änderung an Tabellen oder Spalten gegen das dokumentierte Live-Schema zu
prüfen; Runde 2 hat einen neuen Wert in eine bestehende Spalte
geschrieben, und niemand kann sagen, ob die Datenbank ihn annimmt. Eine
Phase A mit einer ungeprüften Schreiboperation abzuschließen hieße, den
einen Befund zu überspringen, der live etwas kaputtmachen kann. Alles
andere in meinem Backlog ist Verbesserung, nicht Sperre.

**Rundenfazit:** Erste Runde ohne einen einzigen zurückgenommenen Punkt —
alle drei haben gemessen statt behauptet, und die Zahlen halten der
Nachprüfung stand; was Phase A jetzt noch aufhält, ist keine Codezeile,
sondern eine fehlende Datei aus der D1-Konsole.

---

### Runde 3 – software-engineer

**Der Befund vorweg, weil er den ganzen Zug trägt:** Das Tool hat nie
funktioniert. `vorgang` 0 Zeilen, `ereignis` 0, `fassungsliste` 0, `stamm`
0, `mapping` 0. Der Worker schrieb gegen `vorgang.art`, `vorgang.person`
und `vorgang.ts` — drei Spalten, die es in der laufenden Datenbank nicht
gibt — und liess `modus`, `begonnen` und `status` weg, die alle drei NOT
NULL sind. Jede Fassung war ein 500. Dieselbe Abweichung in
`fassungsliste`, `fassungszeile`, `mapping`, `stamm` und in `notiz()`.
Das ist Falle 10 aus `UEBERGABE-TECHNISCH.md` §8, wörtlich: „Es waren
Schema-Abweichungen."

**Kritik am Vorgänger:**

* qa-guardian, Runde 2, „was Phase A aufhält, ist keine Codezeile, sondern
  eine fehlende Datei" ✅ **das war richtig, und es war untertrieben.** Die
  Datei lag am Zug danach vor, und in ihr standen nicht ein, sondern
  **acht** Spaltenfehler. Seine Prüfung `tests/schema.test.mjs:103` („jede
  benannte Spalte gibt es in ihrer Tabelle") hat sie ohne Zutun gefunden —
  sie war genau für diesen Tag gebaut und hat geliefert.
* qa-guardian, Runde 2, „die D1-Attrappe ist ein Nachbau und sagt das in
  ihrem Kopf selbst" ↩️ **zugestimmt und gehandelt.** Die Attrappe war
  nicht nur unvollständig, sie war **schädlich**: sie kannte die falschen
  Spaltennamen und hat sie bestätigt. 123 grüne Prüfungen über einem
  Worker, der live keine einzige Zeile schreiben konnte. `d1-attrappe.mjs`
  ist gelöscht; an ihrer Stelle steht `tests/hilfe/d1-echt.mjs` — echtes
  SQLite (`node:sqlite`, Bordmittel von Node 22, Regel 8 unberührt),
  aufgebaut aus `docs/live-schema.sql`. **Alle** Prüfungen laufen jetzt
  dagegen, nicht nur die neuen.
* qa-guardian, Runde 2, „`vorgangSchreiben` schreibt die Vorgangszeile vor
  dem Journal, zwei `run()` sind keine Transaktion" ✅ **übernommen,
  behoben, belegt.** Beides geht jetzt in ein `batch` (`src/index.js:204`
  und `:293`). Die Prüfung erzwingt den Fehler im Journal und weist nach,
  dass danach auch der Vorgang nicht dasteht — mit der alten Reihenfolge
  fällt sie.
* software-engineer, Runde 2, `quelle='vorgang-korrektur'` ✅ **geprüft,
  hält.** `ereignis.quelle` hat live **keine** CHECK-Bedingung, `ereignis.art`
  schon (`zaehlung|entnahme|eingang|korrektur`). Die Gegenbuchung ist
  zulässig. `ereignisseAbleiten` hält sich daran; `notiz()` auch — sie
  schreibt `korrektur`. Sie scheiterte an etwas anderem (siehe unten).
* ❌ **Abgelehnt:** nichts inhaltlich. Eine Einschränkung an mir selbst:
  Den Cloudflare-Connector (`d1_database_query`) gibt es in meiner
  Werkzeugliste nicht, und im Arbeitsverzeichnis liegen keine Zugangsdaten
  — ich konnte die Live-D1 **nicht** selbst lesen. Gearbeitet habe ich
  gegen `docs/live-schema.sql`, das nach Regel 3 die Wahrheit ist. Die
  sieben `PRAGMA`-Zeilen zum Gegenlesen stehen in `review/ERGEBNIS.md`.

**Umgesetzt:**
1. **Aller Worker-SQL an `docs/live-schema.sql` angepasst** — `vorgang`
   (`modus`/`wer`/`begonnen`/`geaendert`/`status`), `fassungsliste`
   (`z`/`wer`/`importiert`, kein `ON CONFLICT(tag)` mehr: dort liegt kein
   eindeutiger Schlüssel), `fassungszeile` (`liste`/`rohbez`/`kern`/
   `betrag`/`ausschankMl`), `mapping` (`fremd`/`status`), `stamm` (`wert`),
   Wochenbrief (`modus = 'tag'`). Regel 14 eingehalten: `schluessel`,
   `zaehlnr`, `geraet` werden nicht angefasst, `branch` auch nicht.
2. **`notiz()` schrieb sechs Spalten, fünf Pflichtspalten fehlten**
   (`vorgang`, `artikel`, `ort`, `menge`, `wer`). Damit scheiterte **jede**
   eingegangene Mail und **jeder** Wochenbrief — still, weil beide im
   `waitUntil` laufen. Die fünf stehen jetzt mit ihrem leeren Wert da; der
   leere `artikel` ist die Marke, an der `bestand()` und
   `ereignisseAbleiten` die Notizen wieder aussortieren (`artikel IS NOT
   NULL` war bei NOT NULL immer wahr und damit wirkungslos).
3. **Das Prüfgerüst prüft ab jetzt das Schema mit.** `d1-attrappe.mjs`
   gelöscht, `d1-echt.mjs` an ihrer Stelle; dazu
   `tests/live-schema-durchlauf.test.mjs` (24 Prüfungen durch den ganzen
   Worker) und zwei neue statische Wächter in `tests/schema.test.mjs`:
   „jede Einfügung bringt die Pflichtspalten mit" und „jedes ON CONFLICT
   trifft einen Schlüssel, den es gibt".

**Geprüft:**
* `npm test`: **153 grün, 0 rot, 0 übersprungen** (vorher 126 grün, 1 rot).
  Der Schema-Abgleich ist grün, ohne dass eine Prüfung gelockert wurde.
* **Gegenprobe in einem Wegwerf-Arbeitsbaum, jede Behauptung einzeln:**
  Mit dem alten `src/index.js` sind **47 der 153** Prüfungen rot, darunter
  **20 der 24** im neuen Durchlauf. Nehme ich die Pflichtspalten wieder aus
  dem `INSERT INTO vorgang` und setze `ON CONFLICT(tag)` zurück, fallen
  genau die zwei neuen Wächter in `schema.test.mjs`. Zerlege ich das eine
  `batch` in zwei, fällt genau die Rücknahme-Prüfung. Keiner der drei
  Wächter ist eine leere Hülle.
* **Ein vollständiger Vorgang, geschrieben und flach wieder gelesen:**
  `PUT /api/vorgang/tag_2026-09-16` → eine Zeile mit `modus='tag'`,
  `status='offen'`, `begonnen`/`geaendert` gesetzt, `abgeschlossen` leer,
  `schluessel`/`geraet` NULL und `zaehlnr` auf 0. Nach dem Abschluss
  `status='abgeschlossen'` mit Zeitstempel. `GET /api/vorgaenge` liefert
  **flach** `id, tag, mode, name, finished, archiviert` über den
  gespeicherten `daten` — kein verschachteltes `daten`, genau so, wie
  `public/index.html` und `public/leitung.html` es lesen.
* **`vorgang_schluessel`** ist ein UNIQUE-Index auf einer Spalte, die NULL
  bleibt. In SQLite zählt NULL nicht als Dublette — belegt mit drei
  Vorgängen hintereinander, statt darauf zu vertrauen.
* **Der ganze Rest des Workers gegen die echten Tabellen:** Anmeldung und
  Sperre, Rollen-CHECK (`rolle='chef'` wird von der Datenbank abgelehnt),
  Bestand, Z-Bericht-Import mit allen vier Eigenheiten aus Regel 7,
  doppelter Import, Zuordnung von Hand mit Nachziehen der Zeilen,
  Mailnotiz, Wochenbrief.
* **`migrations/001_mapping_rezept.sql`** lokal gegen `docs/live-schema.sql`
  durchgespielt (bestehende Zeile bleibt, `rezept = NULL`). **Sie ist für
  diesen Stand nicht nötig** und soll nicht eingespielt werden.
* `node --check` sauber für `src/index.js`, `src/gnparse.js`, alle
  `tests/*.mjs`, beide `.cjs` und `public/sw.js`. **An `public/` habe ich
  nichts geändert — `sw.js` bleibt deshalb auf v19.**

**Die drei Fragen, die du gestellt hast:**

* **Kommt ein Vorgang jetzt an?** Ja — so weit das ohne Zugriff auf die
  Live-D1 sagbar ist. Jede Abfrage des Workers läuft gegen SQLite mit
  genau dem Schema aus `docs/live-schema.sql` und besteht dort NOT NULL,
  CHECK, PRIMARY KEY und UNIQUE. Was bleibt, ist die Frage, ob die Datei
  die Datenbank richtig wiedergibt; dafür stehen sieben `PRAGMA`-Zeilen in
  `review/ERGEBNIS.md`. **Nebenwirkung, auf die jemand vorbereitet sein
  sollte:** Die Geräte haben nichts verworfen. Geht dieser Stand live,
  schiebt `schiebe()` die liegengebliebenen Pakete von selbst nach — ein
  Schwall alter Vorgänge, jeder unter seinem `<modus>_<tag>`. Das ist
  richtig so (Regel 6), aber die Geräte bitte vorher **nicht** aufräumen.
* **Kommt der gastronovi-Z-Bericht per Mail an?** Der Weg ist jetzt
  vollständig: `email()` → `fassungsliste()` → `fassungsliste`/
  `fassungszeile`, und die Notiz darüber steht im Journal. Beide Stellen
  waren vorher tot (falsche Spalten bzw. fehlende Pflichtspalten). Was ich
  **nicht** prüfen kann: ob `ABSENDER` im Dashboard richtig gesetzt ist, ob
  Email Routing auf den Worker zeigt und ob ein **echter** Bericht durch
  `parseZ` geht — `tests/fixtures/` ist zum dritten Mal leer. Der Parser
  steht seit Runde 1 unverändert; geprüft ist er nur an nachgebauten
  Berichten.
* **Was fehlt noch vor dem Livegang?** Vier Dinge, keines davon Code:
  (1) die sieben `PRAGMA`-Zeilen gegenlesen; (2) `ANLAGE_OFFEN` im
  Dashboard schliessen — solange es offen steht, legt jeder ein Konto mit
  beliebiger Rolle an; (3) die vier persönlichen Codes neu vergeben, sie
  stehen in der Git-Historie; (4) eine Sicherung der D1, bevor zum ersten
  Mal Daten darin stehen, die es nur dort gibt. Dazu ein echter Z-Bericht
  in `tests/fixtures/`.

**Für die Nächsten:**
* *An den Betreiber:* `migrations/001_mapping_rezept.sql` bitte **nicht**
  einspielen, bevor Entscheidung Nr. 10 gefallen ist. Der Stand läuft ohne
  sie. Und: `PRAGMA table_info(...)` ist eine reine Lesefrage, `ALTER TABLE`
  nicht — die beiden stehen in `ERGEBNIS.md` bewusst in getrennten
  Abschnitten.
* *qa-guardian:* Die Attrappe ist weg; deine Grenzbemerkung „beweist
  nichts über das Schema" gilt für die Prüfungen nicht mehr. Was sie
  weiterhin nicht beweisen: dass `docs/live-schema.sql` die Datenbank
  richtig wiedergibt, und irgendetwas über Safari auf einem Telefon. Zwei
  Stellen für dich zum Nachmessen: die 47 roten Prüfungen gegen den alten
  Worker und die Rücknahme des `batch`.
* *hospitality-pro:* Zwei Fragen aus dem Schema, die du besser beantworten
  kannst als ich (Entscheidung Nr. 11): Kommt je Betriebstag **ein**
  Z-Bericht oder je Kostenstelle einer? Der Worker legt jetzt einen je Tag
  ab. Und: Was soll in `fassungszeile.kern` stehen? Ich habe es als
  „Positionsname ohne Grössenangabe" gedeutet.
* *ui-designer:* An `public/` habe ich nichts angefasst, `sw.js` steht
  weiter auf v19 — deine Runde beginnt auf unverändertem Grund.

**Phase/Thema:** A / Schema und Code in Übereinstimmung

**Backlog:** neu – **hoch:** die liegengebliebenen Pakete der Geräte
kommen beim Livegang alle auf einmal. **mittel:** `wer` nimmt
`daten.name` vor `p.name` (der Client bestimmt, welcher Name im Journal
steht) · `werkzeug/abgleich.js` ist toter Code und läuft nicht — es führt
vier Funktionen ein, die es nirgends gibt · `vorgang.branch` wird nirgends
geschrieben und nirgends gelesen. **Erledigt:** fünf Punkte, darunter die
Schema-Abweichung selbst, die ungeprüfte Gegenbuchung, die fehlende
Transaktion und die Attrappe.

**STATUS:** VERBESSERUNGEN

**Warum nicht FERTIG:** Aus meiner Rolle ist der Kern erledigt — Code und
Schema passen zusammen, und das hält sich jetzt von selbst. Zwei Punkte
unter „hoch" bleiben aber offen, die mir gehören: der Umzug von
`hh_cfg_v9` nach `stamm` (seit heute nicht mehr blockiert, aber es gibt
noch gar keinen Schreibweg — `POST /api/stamm` fehlt) und die gemerkte
Rolle in der App. Und ich habe die Datenbank, um die es hier ging, nicht
mit eigenen Augen gesehen.

### Runde 3 – ui-designer
**Kritik am Vorgänger (software-engineer, Runde 3):**
* ✅ *Der Worker-SQL an `docs/live-schema.sql` angepasst* — richtig und
  überfällig. Aus meiner Sicht hat der Zug aber eine Folge, die im
  Übergabeprotokoll nicht steht: **`/api/vorgaenge` liefert jetzt `200`
  mit `{"vorgaenge":[]}`** (`src/index.js:152`). Die Leitung nimmt das als
  Erfolg (`public/leitung.html:702`, `if(r.ok) … QUELLE="Server"`) und
  liest den Gerätespeicher **nicht mehr**. Vorher kam ein Fehler, also
  immer der Rückfall. Am ersten Tag nach dem Livegang sieht die Leitung
  damit zum ersten Mal „Server" — und null Zeilen. Genau dieser Zustand
  war im Backoffice ungeprüft und hat gelogen (siehe unten). Kein Vorwurf
  an den Code, aber der Zug hat eine Oberfläche freigelegt.
* ↩️ *„`public/leitung.html` nicht angefasst, weil nichts daran fehlte"* —
  diese Lesart teile ich nicht. Drei Runden ohne eine einzige geänderte
  Zeile hieß: nie angesehen. Der Browser zeigt in zwölf Ansichten drei
  Fehler, die keine Meinungsfrage sind (grüne Entwarnung ohne Datengrundlage,
  Quelle nur als Farbpunkt und am Handy gar nicht, Tür-Knopf ohne
  Gestaltung). Alle drei sind jetzt behoben.
* ✅ *`npm test` bei 153 grün gegen echtes SQLite* — vor und nach meiner
  Arbeit nachgelaufen, 153/153. Die Prüfungen fassen `public/` nicht an;
  dass sie grün bleiben, beweist über das Backoffice nichts. Deshalb der
  Browser: `tests/ui-leitung.cjs`, 56 Bilder.

**Umgesetzt:**
1. **Der leere Stand lügt nicht mehr.** Ohne Z-Bericht bzw. ohne
   Kellerzählung zeigen die Kacheln „Auffällige Differenzen" und
   „Nachbestellen" einen Strich mit Grund statt einer grünen Null; die rote
   Zahl in der Navigation verschwindet ebenso (`:1113`, `:1033`).
2. **Quellzeile über dem Inhalt** in allen zwölf Ansichten und auf jeder
   Breite: was die Quelle bedeutet, in Worten, mit „Erneut versuchen"; der
   Chip-Punkt wird bei Warnung und Fehler zum Ausrufezeichen (`:345`,
   `:749`, `:1945`).
3. **Knöpfe in der Leitung auf Maß:** Kopfleiste 30 px → `--control-h`
   (36/44 px), Navigationsknopf 36 → 44 px am Handy, und der Selektor
   `button.b` → `.b`, wodurch der Tür-Knopf „Zum Fassungstool" aufhört, ein
   blauer Browserlink zu sein (`:264`, `:270`, `:404`).

**Geprüft:**
* `npm test` vorher 153/153, nachher 153/153.
* Neue Aufnahme `tests/ui-leitung.cjs` (Vorlage: `persona-tagesfassung.cjs`)
  mit einem Server, der `/api/ich` und `/api/vorgaenge` beantwortet — die
  Leitung hat keine eigene Anmeldung, ohne Antwort sieht man nur die Tür.
  Fünf Lagen × zwei Größen (390×844 / 1440×900): **leer** (Server
  antwortet, null Vorgänge — der Zustand nach dem Livegang), **voll**
  (drei Vorgänge inkl. Kellerzählung), **aus** (503), **lokal** (503 +
  Archiv im Browser), **tuer** (401). Alle zwölf Ansichten in „leer" und
  „voll". 56 Bilder in `review/screens/runde-3/`, der Stand davor in
  `review/screens/runde-3-vorher/`. **Keine JS-Fehler in keiner Lage.**
* Gemessen, nicht geschätzt — Trefferflächen iPhone / MacBook:
  `#bNav` 36→44 / —, `#bNeu` 30→44 / 30→36, `#bFass` 30→44 / 30→36,
  Tür-Knopf ~20→44 / ~20→36, Knopf in der Quellzeile 44 / 36.
  Kleinstes bedienbares Element auf dem gezeigten Schirm: 44 px (iPhone),
  36 px (MacBook).
* Kontrast gerechnet: Quellzeile warn 6,96:1, bad 7,52:1, info 8,62:1.
  Der Grund für das Ausrufezeichen statt eines roten Punktes ist eine
  Messung: `--danger` auf der Teal-Leiste ergibt **1,89:1** — unsichtbar.
  `--fg-on-dark` ergibt 10,27:1.
* Die vier Fallen aus §8, die die Leitung betreffen: `.kpi` steht weiter
  nur in den seiteneigenen Blöcken beider Dateien (nichts davon in der
  geteilten Schicht), `.tabhuelle{overflow:auto}` und
  `.tabhuelle table{min-width:560px}` sind unverändert richtig,
  `[data-dichte="maus"]` springt unter 900 px zurück auf 44 px — und meine
  beiden Knopfregeln hängen jetzt genau daran, statt feste Pixel zu setzen.
* Geteilte Gestaltungsschicht `leitung.html:9–219` == `index.html:12–222`
  vor und nach der Arbeit **byteweise gleich** (`diff`). Ich habe sie nicht
  angefasst; `index.html` ist unverändert. Kein Hex-Literal in der
  Gestaltungsschicht der Leitung (das einzige, `#00605D`, ist beim
  Umbau durch `--accent-dunkel` ersetzt worden). `sw.js` v19 → **v20**.

**Ist das Backoffice bereit für den Livegang?**
**Aus meiner Rolle ja, mit einer Einschränkung.** Die zwölf Ansichten
tragen, die Tabellen scrollen am Handy sauber mit stehender erster Spalte,
der leere Stand erklärt sich jetzt selbst statt Entwarnung zu geben, und
kein einziger Lauf hat einen JS-Fehler geworfen. Die Einschränkung ist
nicht gestalterisch: **das Backoffice ist in der Wirklichkeit noch nie mit
Serverdaten gelaufen.** Alles, was ich gesehen habe, kam aus einem
nachgebauten Server mit erfundenen Vorgängen. Ob `normVorgang()` das
verträgt, was `vorgaengeLesen()` aus der echten `vorgang.daten` heraufholt,
weiß erst der erste echte Vorgang. Was aus meiner Sicht noch fehlt:
(1) ein Blick auf den ersten echten Vorgang in der Leitung, am selben Tag;
(2) `tests/fixtures/` — ohne echten Z-Bericht ist „Verkauf ↔ Fassung",
die Hälfte des Backoffice, bis heute nur an Nachbauten gesehen;
(3) die drei Punkte unter Mittel im Backlog, davon einer (`.b.klein`,
28 px) nur mit einer Entscheidung über die geteilte Schicht lösbar.

**Für die Nächsten:**
* *qa-guardian:* `tests/ui-leitung.cjs` ist da, `RUNDE=3 node tests/ui-leitung.cjs`,
  fünf Lagen. Der Server darin ist nachgebaut und beweist nichts über den
  Worker — er ist ein **Sichtgerät**, kein Nachweis. Was ich nicht prüfen
  konnte: ob ein echter Vorgang aus der D1 durch `normVorgang()` geht.
  Das wäre ein lohnender Lauf gegen `wrangler dev --local` mit einer
  Test-D1 aus `docs/live-schema.sql`.
* *software-engineer:* Zwei Sachen aus dem Backoffice, beide in deinem Feld.
  (a) `ladeDaten()` fällt nicht mehr auf den Gerätespeicher zurück, sobald
  der Server `200` mit leerer Liste gibt — richtig, aber es sollte jemand
  festlegen wollen. (b) `/api/vorgaenge` liefert **alle** Vorgänge ohne
  Grenze (`von`/`bis` haben Vorgabewerte `1970`/`9999`); die Leitung ruft
  ohne Parameter auf (`:700`). Nach einem Jahr Betrieb sind das ein paar
  tausend JSON-Blobs in einer Antwort. Heute folgenlos, weil die Tabelle
  leer ist — nach dem Livegang nicht mehr.
* *hospitality-pro:* Zwei Texte gehören dir, nicht mir. „Für dieses Fenster
  gibt es weder Verkauf noch Entnahme — nichts zu vergleichen." und „Sobald
  die erste Fassung aus dem Keller ankommt, steht sie hier." — beides sind
  Sätze, die die Leitung am ersten Morgen liest. Wenn sie im Haus anders
  klingen sollen, ändere sie.

**Phase/Thema:** A / Backoffice — leerer Stand, Quelle, Trefferflächen

**Backlog:** neu unter **Mittel**: Befund-Pille „prüfen" ohne Z-Bericht
(`vAbgleich`), `.b.klein` mit 28 px (braucht Entscheidung über die geteilte
Schicht), kein Rückfall mehr auf den Gerätespeicher. Neu unter **Niedrig**:
„Nichts gefunden." im Speicher ohne Unterscheidung leer/gefiltert, kein
Schließen-Knopf im Navigationsblatt. Vier Punkte nach **Erledigt**.

**STATUS:** VERBESSERUNGEN

### Runde 3 – hospitality-pro

**Kritik am Vorgänger (ui-designer, Runde 3):**

* ✅ *„Drei Runden ohne eine einzige geänderte Zeile hieß: nie angesehen"* —
  richtig, und die drei Funde tragen. Der wichtigste ist der leere Stand:
  Eine grüne Null über einer leeren Datenbank ist im Betrieb schlimmer als
  gar keine Zahl, weil sie am Morgen wie ein Prüfergebnis aussieht. Der
  Strich mit Grund ist die richtige Lösung.
* ↩️ *`QUELLLAGE["Leer"]` (`public/leitung.html:763`) „Der Server antwortet
  — er hat nur noch keinen Vorgang. / Sobald die erste Fassung aus dem
  Keller ankommt, steht sie hier. / Bis dahin ist jede Null … eine
  Leerstelle, kein Ergebnis."* **geändert.** In der Lage „leer" angesehen,
  nicht nur im Quelltext (`review/screens/runde-3-hospitality/leitung-macbook-leer-heute.png`).
  Der Satz klingt nicht nach Störung — das ist gut und war die halbe Miete.
  Er beantwortet aber die Frage nicht, die die Leitung am ersten Morgen
  wirklich hat: **„Ist das normal, oder hat jemand etwas falsch gemacht?"**
  Gegen sechs andere Felder auf demselben Schirm, die gelb, rot und
  „fehlt/fehlen" sagen, braucht dieser eine Kasten das Wort *normal* — sonst
  gewinnt die Farbe. Und er muss sagen, **woran man merkt, dass doch etwas
  hängt**: Ein Vorgang, der auf dem iPhone im Keller in der Warteschlange
  steht, ist im Backoffice von einem, den es nie gab, nicht zu unterscheiden.
  Jetzt drei Sätze: was ist der Fall · wann ändert es sich · woran sehe ich,
  dass etwas klemmt.
* ↩️ *„Für dieses Fenster gibt es weder Verkauf noch Entnahme — nichts zu
  vergleichen." (`:1160`)* **geändert** → „Weder Verkauf noch Entnahme in
  diesem Zeitraum — es gibt noch nichts zu vergleichen." Zwei Gründe.
  **„Fenster"** ist kein Wort aus dem Haus; es steht sechsmal sichtbar in
  `leitung.html`, und in „Verkauf ↔ Fassung" heißt die Auswahl, die es
  einstellt, zwei Zentimeter daneben **„Zeitraum"** (`:1201`). Zwei Wörter
  für denselben Regler. Alle sechs Stellen sagen jetzt „Zeitraum".
  **Das „noch"** ist der eigentliche Punkt: „nichts zu vergleichen" ist ein
  Befund, „noch nichts zu vergleichen" ist ein Zustand. Am ersten Morgen ist
  es ein Zustand.
* ↩️ *Der Knopf in der Quellzeile heißt in allen vier Lagen „Erneut
  versuchen" (`:791`)* **geändert.** Bei „Leer" ist nichts fehlgeschlagen —
  „erneut versuchen" unterstellt einen Fehler, den es nicht gibt. Bei
  „Datei" stand es sogar im Widerspruch zum eigenen Text daneben („„Aktualisieren"
  holt wieder den Server" — der Knopf hieß aber anders). Die Beschriftung
  ist jetzt ein fünftes Feld in `QUELLLAGE`: „Nochmal nachsehen" bei Leer,
  „Aktualisieren" bei Datei, sonst unverändert „Erneut versuchen".
* ✅ *„Das Backoffice ist in der Wirklichkeit noch nie mit Serverdaten
  gelaufen"* — stehengelassen und im Urteil unten aufgenommen. Das ist der
  Satz, der am Montag zählt, nicht die Gestaltung.

**Umgesetzt:**
1. **Der leere Stand der Leitung sagt jetzt, was zu tun ist** (`leitung.html:763`,
   `:770`, `:784`, `:793`): Lage „Leer" mit *normal · wann · woran man es
   merkt*, Knopfbeschriftung je Lage, „Fenster" → „Zeitraum" an allen sechs
   sichtbaren Stellen (`:1116`, `:1129`, `:1148`, `:1160`, `:1203`, `:1213`).
2. **„Ungeprüft gilt als voll" steht endlich irgendwo** (`index.html:2268`,
   `BEDIEN`, als erster Eintrag): „Was du nicht antippst, zählt als
   vollständig da und kommt nicht auf die Liste zum Holen. Eine Lade, die du
   überspringst, fehlt darum am nächsten Abend im Service." Die tragende
   Annahme der ganzen Fassung stand bisher nur in zwei Leermeldungen im
   Keller — wer sie nie zu Gesicht bekommt, lernt sie erst am fehlenden Wein.
3. **Ein Wort für den Gang nach unten** (`index.html:1392`, `:1412`): Der
   dritte Schritt der Tagesfassung heißt „Holen" statt „Keller" — gleich dem
   Nachfüllen, gleich der Hilfe („Holen und einräumen") und gleich dem
   Abschluss („Noch nicht alles geholt"). „Keller" wäre dazu das dritte Wort
   neben Kellerzählung und Getränkelager gewesen.

**Geprüft:**
* `npm test` vorher **153 grün**, nachher **153 grün**, 0 rot, 0 übersprungen.
* **Ein vollständiger Arbeitsablauf im Browser, Schritt für Schritt**
  (Chromium, iPhone 390×844, eigenes Skript, Server nachgebaut): Anmeldung
  vorhanden → Menü → `start("tag")` → Schlüssel `tag_2026-09-16` (Vortag,
  richtig) → Schritt 1 Bar → Schritt 2 Restaurant → **Schritt 3 „Holen"** →
  Schritt 4 Abschluss → „Fertig – Protokoll erstellen" →
  **`PUT /api/vorgang/tag_2026-09-16` kommt beim Server an**, die
  Warteschlange bleibt leer. **Keine JS-Fehler.** Dazwischen `offenList()`
  viermal abgefragt: 12 offene Punkte am Anfang → 1 (nur das Foto) nach Bar
  und Restaurant → 0 mit Foto. Die Schrittleiste zeigt „Schritt 3 von 4 ·
  Holen", die Sprungziele stimmen weiter (die Umbenennung ist reine Anzeige;
  `steps()` wird nur in `buildSteps` gelesen, `stepComplete`/`go` rechnen mit
  Indizes — nachgesehen, nicht angenommen).
* **Backoffice in allen fünf Lagen neu aufgenommen** (`tests/ui-leitung.cjs`,
  leer/voll/aus/lokal/tuer × iPhone/MacBook): **keine JS-Fehler**,
  Trefferflächen unverändert 44 px (iPhone) / 36 px (MacBook), kleinster
  bedienbarer Knopf 44 bzw. 36 px. Die neue dreizeilige Meldung bricht am
  iPhone sauber um, der Knopf rutscht darunter und bleibt 44 px hoch
  (`leitung-iphone-leer-heute.png`).
* **Gegenprobe zu einem Backlog-Punkt aus meiner eigenen Runde 2**
  („Foto aufnehmen ist der Hauptknopf"): im Browser **gemessen**. Ohne Foto
  ist `.fotobtn.leer` `rgb(0,73,71)` mit weißer Schrift bei y=296,
  `.finishbtn.blocked` weiß bei y=487, beide 52 px. Mit Foto drehen sie sich
  um. Die Ursache ist also **nicht** eine verrutschte Rangfolge, sondern die
  Klasse `.blocked` — der Abschlussknopf hält sich absichtlich zurück,
  solange ein Punkt offen ist. Der Backlog-Eintrag ist entsprechend
  berichtigt; der Punkt bleibt, hängt aber ganz an Entscheidung Nr. 9.
* Geteilte Gestaltungsschicht `index.html:12–222` == `leitung.html:9–219`
  vor und nach der Arbeit **byteweise gleich** (`diff`, 211 Zeilen) — nicht
  angefasst. Beide Inline-Skripte mit `new Function()` geprüft: sauber.
  `public/sw.js` VERSION **v20 → v21**. Weiter genau vier Dateien in `public/`.
* Nicht geprüft: echtes iPhone, echtes Safari, echte D1. Alles oben lief
  gegen Chromium und einen nachgebauten Server.

**Die zwei Fragen des software-engineers (Entscheidung Nr. 11), beantwortet:**

* **Ein Z-Bericht je Betriebstag, nicht je Kostenstelle.** Der Tagesabschluss
  wird für das Haus gezogen; Bar und Restaurant stehen als getrennte **Zeilen**
  darin — genau deshalb kommt derselbe Positionsname zweimal vor (Eigenheit 1
  in `gnparse.js`, Regel 7). Ein Eintrag je Tag in `fassungsliste` ist damit
  richtig, `kostenstelle` bleibt leer. **Aber „der zweite ersetzt den ersten"
  ist nicht immer harmlos:** Ein zweiter Z nach Nachbuchung oder Storno ist
  der richtige (ersetzen ist gewollt), ein getrennter Abschluss von Bar und
  Restaurant schickt dagegen zwei **Teil**-Berichte, und dann verschwindet
  eine ganze Kostenstelle lautlos. Beide sehen im Worker gleich aus. Nötig ist
  keine Schemaänderung, sondern eine Spur: die Notiz im Journal soll beim
  Ersetzen alte und neue Z-Nummer **und beide Positionszahlen** nennen. Fällt
  die Zahl deutlich, war es ein Teilbericht. → Backlog, mittel.
* **`kern` ist richtig gedeutet: Positionsname ohne Größe.** Der Zweck ist der
  Blick, den Leitung und Sommelier ohnehin haben — *ein* Wein, zwei
  Ausschankgrößen, eine Zeile („Grüner Veltliner Leindl: 34 Achtel und
  6 Flaschen"). Die Größe geht nicht verloren, sie steckt in `ausschankMl`.
  Zwei Zusätze: (a) **`kern` darf kein Suchschlüssel werden** — kleinschreiben,
  Umlaute auflösen, Winzer abschneiden ist der Anfang der Ähnlichkeitssuche,
  die Regel 5 abgeschaltet hält („Riesling Federspiel" ≠ „Riesling Smaragd",
  doppelter Preis). Nur abschneiden, so wie jetzt. (b) Geschnitten wird heute
  nur die Maßangabe; Positionen heißen in der Kasse aber auch „… Glas",
  „… Fl.", „… Karaffe". Nicht auf Verdacht erweitern — am ersten echten
  Z-Bericht ablesen. → Backlog, niedrig.
  Beides ausführlich in `review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 11.

**Kann das Tool am Montag in den Dienst gehen?**

**Ja — für die Tagesfassung, das Nachfüllen und die Kellerzählung. Mit drei
Auflagen, von denen keine eine Codezeile ist.**

Was heute trägt: Der Ablauf im Keller läuft von der Anmeldung bis zum Protokoll
durch, der Vorgang kommt beim Server an (heute zum ersten Mal überhaupt), und
wenn kein Netz da ist, geht er hinaus, sobald wieder Empfang ist. Nichts geht
verloren. Das Backoffice lügt nicht mehr, wenn nichts da ist.

**Die drei Auflagen für Montag:**
1. **Die Geräte vorher NICHT aufräumen** und beim ersten Livegang jemanden
   zusehen lassen. In den Warteschlangen der iPhones und iPads liegen alle
   Fassungen, die seit dem Start nie angekommen sind. Sie gehen beim ersten
   Kontakt von selbst hinaus — ein Schwall alter Vorgänge, jeder mit seinem
   eigenen Tag. Das ist richtig so, sieht in der Leitung am Morgen aber aus
   wie ein Fehler. Wer es nicht erwartet, drückt irgendwo „löschen".
2. **Die vier persönlichen Codes vor Montag neu vergeben** und `ANLAGE_OFFEN`
   im Dashboard schließen. Beides steht seit Runde 1 bzw. dem Setup offen und
   ist nur vom Betreiber lösbar.
3. **Eine Sicherung der D1 anlegen, bevor zum ersten Mal Daten darin stehen,
   die es nur dort gibt.** Ab Montag ist das der Fall.

**Was am ersten Tag schiefgehen wird — meine drei Kandidaten, in dieser
Reihenfolge:**
* **Nicht gemeldete Sonderentnahmen.** Die Küche holt eine Flasche zum Kochen,
  jemand nimmt ein Personalgetränk, eine geht beim Abservieren zu Bruch. Der
  Modus fragt bis heute **nicht, warum** — der Grund steht im optionalen
  Freitextfeld ganz am Ende, und das füllt nach dem Service niemand mehr aus.
  Folge: alles landet im Wareneinsatz Getränke, und in der ersten
  Kellerzählung steht unerklärter Schwund. Das ist aus meiner Rolle der
  teuerste offene Punkt und **ausdrücklich nicht gebaut** — es ändert den
  Schrittablauf und das Datenmodell und braucht eine Entscheidung
  (`OFFENE-ENTSCHEIDUNGEN.md` Nr. 7) sowie eine Runde mit Asad, Ian und
  Marinus über die fünf Gründe.
* **Ein Soll, das auf drei Geräten drei Werte hat.** Glasweine und Soll-Mengen
  kann jede Servicekraft ändern, ungezeichnet, nur auf ihrem Gerät
  (Entscheidung Nr. 6). Solange das offen ist, hängt die Fehlmenge davon ab,
  wer fasst.
* **Eine Fassung auf dem falschen Tag.** Das Datum im Kopf lässt sich ohne
  Rückfrage auf jeden Tag stellen, auch in die Zukunft. Ein Tipper erzeugt
  einen zweiten Vorgangsschlüssel, der gegen den falschen Z-Bericht verglichen
  wird — und in der Leitung sieht es am Morgen nach zwei Fassungen aus.
  Backlog, mittel.

**Für die Nächsten:**
* *qa-guardian:* Der Ablauf, den ich gegangen bin, liegt als Skript im
  Scratchpad, nicht im Repo — also **keine Prüfung**, sondern ein Blick. Was
  daraus ins Repo gehörte, ist der Durchgang „Tagesfassung von der Anmeldung
  bis zum PUT", er ist in 40 Zeilen zu haben und wäre die erste Prüfung, die
  die App und den Worker gemeinsam anfasst. Zweitens: Bitte nachmessen, dass
  die Umbenennung „Keller" → „Holen" wirklich nur Anzeige ist (`steps()` hat
  genau drei Fundstellen).
* *ui-designer:* Die Lage „Leer" hat jetzt drei Zeilen statt zwei. Am iPhone
  bricht das sauber um (nachgesehen), am MacBook steht es einzeilig neben dem
  Knopf. Wenn dir der Kasten zu lang ist: Der dritte Satz ist der, der bleiben
  muss — er ist der einzige Weg von „hier steht nichts" zu „schau auf dem
  Gerät nach".
* *software-engineer:* `fassungsliste` bleibt bei einem Eintrag je Tag,
  `kostenstelle` bleibt leer, `kern` bleibt wie gebaut — Begründung oben und
  in Nr. 11. Der eine Punkt, den ich mir wünsche, ist die Notiz beim Ersetzen
  eines Z-Berichts mit beiden Positionszahlen.
* *An den Betreiber:* `review/INPUT-TEAM.md` ist im vierten Zug immer noch
  leer. Alles, was ich über Laufweg, Kistengrößen und die fünf Gründe der
  Sonderentnahme angesetzt habe, ist Hauspraxis aus meiner Erfahrung — nicht
  gegengelesen. Vor dem Bau von fünf Knöpfen bitte einmal mit dem Team reden.
  Und: Ein Zwischenstands-Commit hat 9,2 MB Aufnahmen (`review/screens/runde-3c/`)
  in die Geschichte gelegt, die ich danach wieder entfernt habe — der Baum ist
  sauber, die Blobs bleiben (Regel 1, kein Umschreiben).

**Phase/Thema:** A / Leerer Stand der Leitung, Bedienungshilfe, Wortwahl

**Backlog:** neu — **mittel:** zweiter Z-Bericht für denselben Tag ersetzt den
ersten still (Teilbericht vs. Storno nicht unterscheidbar) · Quellzeilen-Knopf
und Kopfleisten-Knopf tun dasselbe unter zwei Namen. **niedrig:** `kern()`
schneidet „Glas"/„Fl."/„Karaffe" nicht ab. **Berichtigt:** der Foto-/Fertig-Punkt
aus Runde 2 (gemessen: `.finishbtn.blocked`, nicht Rangfolge). **Erledigt:**
„Ungeprüft gilt als voll" und „Keller" vs. „Holen".

**STATUS:** VERBESSERUNGEN

**Warum nicht FERTIG:** Zwei Punkte unter „hoch" gehören mir und sind offen,
beide absichtlich nicht gebaut, weil sie Entscheidungen sind und keine
Wortänderungen: die Sonderentnahme ohne Grund (Nr. 7) und das gerätelokale,
ungezeichnete Soll (Nr. 6). Beide kosten am ersten echten Tag Geld, nicht
Bequemlichkeit.

### Runde 3 – qa-guardian

**Vorweg, weil es den Zug trägt:** Die Lehre dieser Runde war „123 grüne
Prüfungen über einem Worker, der live keine Zeile schreiben konnte". Ich
habe sie ernst genommen und gefragt, ob die 153 neuen Prüfungen dasselbe
Schicksal haben könnten. Antwort: Zur Hälfte ja. Jede Prüfung im Repo sah
bis heute genau **eine** Hälfte an — die App gegen einen nachgebauten
Server, den Worker gegen SQLite. Zwischen den Hälften lag der Fehler, der
das Tool ein Jahr lang unbenutzbar gemacht hat. Deshalb ist die Arbeit
dieses Zugs nicht eine weitere Prüfung, sondern die erste, die beide
Hälften **gleichzeitig** anfasst.

**Kritik am Vorgänger:**

* software-engineer, Runde 3, „mit dem alten `src/index.js` sind 47 der 153
  Prüfungen rot" ✅ **nachgemessen, stimmt auf die Zahl genau.** Eigener
  Wegwerf-Arbeitsbaum, `src/index.js` aus `97f68b9` hineinkopiert:
  `106 pass, 47 fail`. Nicht geglaubt, nachgerechnet.
* software-engineer, Runde 3, „`vorgang`, `ereignis` sind live leer, jede
  Fassung war ein 500" ✅ **bestätigt, auf dem einzigen Weg, der mir offen
  steht.** Ich habe den Cloudflare-Connector **nicht** in meiner
  Werkzeugliste (`d1_database_query` gibt es bei mir nicht), und `wrangler`
  ist nicht einmal installiert (`node_modules` fehlt) — ich konnte die
  Live-D1 also weder lesen noch, selbst wenn ich wollte, beschreiben. Was
  ich statt einer Behauptung liefere: Der neue Durchstich (unten) ist mit
  dem alten Worker **rot an genau den Stellen, an denen es live weh tat** —
  die Tagesfassung erreicht die Datenbank nicht, `vorgang` bleibt bei 0
  Zeilen, und die Warteschlange läuft auf 4 Pakete voll. Mit dem neuen
  Worker: 33 von 33 grün. Das ist kein Blick in die D1, aber es ist der
  Beweis, dass die Diagnose zum Krankheitsbild passt.
* software-engineer, Runde 3, „`migrations/001_mapping_rezept.sql` ist für
  diesen Stand nicht nötig" ✅ **übernommen und im Urteil unten
  mitgetragen:** nicht einspielen.
* ui-designer, Runde 3, „`/api/vorgaenge` liefert jetzt 200 mit leerer
  Liste, die Leitung fällt nicht mehr auf den Gerätespeicher zurück"
  (`public/leitung.html:702`) ↩️ **bestätigt — und die Folge ist grösser,
  als im Übergabeprotokoll steht.** Der ui-designer hat die Lage „leer"
  (Server antwortet, Browser leer) und „lokal" (Server stumm, Browser voll)
  aufgenommen. Die Lage, die am Montag wirklich eintritt, ist die dritte:
  **Server antwortet mit null Vorgängen UND der Browser hat ein Archiv.**
  Die habe ich als sechste Lage in `tests/ui-leitung.cjs` ergänzt und
  gemessen: `QUELLE="Server"`, **3 Vorgänge im `hh_archiv`, 0 gezeigt** —
  auch auf der Seite „Speicher", die nur `VORGAENGE` liest
  (`leitung.html:1667`). Verloren ist nichts, sichtbar ist es nirgends.
  **Im Betrieb tragbar? Ja**, aber nicht wegen der Gestaltung, sondern
  wegen der Sachlage: Die Fassungen liegen auf den iPhones im Keller, nicht
  im Browser der Leitung, und die gehen von selbst hinaus. Backlog, mittel.
* ui-designer, Runde 3, Trefferflächen „44 px (iPhone) / 36 px (MacBook)"
  ✅ **stichprobenartig nachgemessen, stimmt in allen sechs Lagen:**
  `bNav 44/—`, `bNeu 44/36`, `bFass 44/36`, Quellzeilen-Knopf 44/36,
  kleinstes bedienbares Element 44 bzw. 36. Keine JS-Fehler, auch in der
  neuen Lage nicht.
* hospitality-pro, Runde 3, „bitte nachmessen, dass „Keller" → „Holen"
  wirklich nur Anzeige ist, `steps()` hat genau drei Fundstellen" ✅
  **nachgemessen, stimmt.** Drei Fundstellen (`:1417`, `:1418`, `:2204`);
  `lastStep()` rechnet mit `.length`, `buildSteps` nur mit `L[step]` als
  Text, `stepComplete`/`go` mit Indizes. Reine Anzeige.
* hospitality-pro, Runde 3, „der Ablauf lag im Scratchpad — kein Nachweis,
  sondern ein Blick" ✅ **übernommen, ins Repo geholt, und dabei ist
  aufgefallen, dass der Blick an einer Stelle daneben ging** (siehe unten).
* qa-guardian, Runde 2 (an mich selbst), „alles Schemabezogene beruht auf
  einer Datei statt auf der Datenbank" ↩️ **gilt weiter, aber enger.** Die
  Datei ist seit `5df2817` per `PRAGMA table_info` gegengelesen, und die
  Prüfungen laufen gegen echtes SQLite daraus. Was weiterhin niemand
  gesehen hat: die laufende D1 selbst, und Safari auf einem Telefon.

**Umgesetzt:**
1. **`tests/durchstich.cjs` — die erste Prüfung, die App und Worker
   gemeinsam anfasst.** Kein nachgebauter Server: `public/` von der Platte,
   `/api/*` in den echten `src/index.js`, `env.DB` echtes SQLite aus
   `docs/live-schema.sql`. Am Ende wird nicht der Server gefragt, sondern
   die Datenbank. 33 Punkte, Bordmittel, keine neue Abhängigkeit.
2. **Zwei Prüfungen aus Funden ergänzt** (`npm test` 153 → **156**): die
   Blockwahl in `parseZ` ist jetzt festgehalten statt implizit, und die
   heute übersprungene Fixture-Prüfung schlägt am Tag des ersten echten
   Z-Berichts von selbst an, wenn er nach Kostenstellen gespalten ist.
3. **Zwei stumpfe Stellen im Prüfgerüst geschärft:** `.w .cnt` in
   `tests/persona-tagesfassung.cjs` traf **nichts** — den Selektor gibt es
   in der App nicht, der Durchlauf hat nie eine Fehlmenge eingetragen und
   meldete stumm „0 Zeilen". Jetzt wird über die Punkte gezählt
   (`dotRow`), und genau dadurch fällt ein Befund an (siehe unten). Dazu
   die sechste Lage in `tests/ui-leitung.cjs`.

**Geprüft:**
* **REGELPRÜFUNG, alle 14 — kein Verstoss in dieser Runde.**
  1 Branch `v2-review`, kein `main`, kein Merge, kein Force-Push. ·
  2 **Kein `wrangler deploy`, kein `--remote`, keine schreibende Operation
  gegen die Live-D1.** Nachgesehen im ganzen Rundendiff (`057038a..HEAD`):
  jedes `INSERT`/`UPDATE`/`DELETE` steht entweder im Worker-Quelltext oder
  läuft gegen SQLite im Arbeitsspeicher. `wrangler` ist nicht installiert.
  **Ich habe den Cloudflare-Connector nicht in meiner Werkzeugliste** —
  ich konnte die Live-D1 nicht lesen und sage das, statt es zu behaupten. ·
  3 `schema.sql` wird nirgends ausgeführt (eigene Prüfung hält das). ·
  4 Code und Schema geprüft, und zwar jetzt zum ersten Mal durch die App
  hindurch. · 5 Automapping unverändert nur für Wein. · 6 Journal
  append-only, Warteschlange hält bei Funkloch **und** bei 401 (im
  Durchstich beides gemessen). · 7 alle vier gastronovi-Eigenheiten stehen
  und sind geprüft; an `gnparse.js` habe ich **nichts geändert**. ·
  8 keine neue Abhängigkeit, `package.json` unberührt. · 9 keine echten
  Codes; der Durchstich würfelt seinen beim Start. · 11 `RUNDEN` = 1000,
  unverändert. · 12 `wrangler.jsonc` unberührt. · 14 `schluessel`,
  `zaehlnr`, `geraet` auf `vorgang` werden nicht geschrieben — im
  Durchstich an der Zeile selbst nachgesehen: `[null, 0, null]`.
* **`npm test`: 156 grün, 0 rot.** `node --check` sauber für alle 22 JS-,
  MJS- und CJS-Dateien im Repo.
* **Durchstich, 33 von 33** — Anmeldung über `/api/anlage` und
  `/api/anmelden`; Tagesfassung Schritt für Schritt bis zum Abschlussknopf;
  danach in der **Datenbank** nachgesehen: eine Zeile in `vorgang` mit
  `modus='tag'`, `wer='Lena'`, `status='abgeschlossen'`, vollen
  Zeitstempeln (> 2³¹), lesbarem `daten`-JSON und Regel 14 eingehalten;
  zwei Buchungen im `ereignis`. Dann: dasselbe Paket zweimal → kein
  zweiter Vorgang, keine doppelte Buchung; Funkloch → der Stand bleibt
  liegen, wieder Empfang → er geht von selbst hinaus und legt seine
  Entnahme ins Journal; `service` bekommt auf `/api/mapping` ein 403 und
  schreibt nichts; **die Leitung liest dieselben echten Daten** —
  `normVorgang()` verträgt, was `vorgaengeLesen` aus `vorgang.daten`
  heraufholt (die offene Frage des ui-designers: beantwortet), keine
  JS-Fehler; ohne Keks 401, und die Reihe bleibt stehen.
* **Gegenprobe, damit der Durchstich keine leere Hülle ist:** mit dem
  Worker aus `97f68b9` fällt er auf **18 von 32** — und zwar an genau den
  Stellen, an denen es live weh tat.
* **Persona, Chromium in iPhone-Grösse, neue Servicekraft nach dem
  Abendservice:** von der Anmeldung bis zum Abschluss, keine JS-Fehler.
  Falscher Code → „Dieser Code ist nicht hinterlegt." Abbruch mitten in
  der Eingabe (Neuladen) → Zählstand und Anmeldung überleben. Offline →
  „1 Vorgang warten – kein Netz", wieder online → leer. Zwei Stellen, an
  denen sie hängen bliebe: (a) das Hilfe-Sheet legt sich ungefragt über
  Schritt 1 — bekannt seit Runde 2; (b) **neu: Schritt 3 „Holen"** (siehe
  Backlog).
* **Nicht geprüft, ausdrücklich:** der rechnerische Abgleich mit
  `tests/fixtures/` — **zum vierten Mal nicht möglich, der Ordner ist
  leer.** Es gibt bis heute keinen echten Z-Bericht und keine echte
  Zählung im Repo. Alles, was über den Parser gesagt wird, gilt für
  nachgebaute Berichte. Ebenfalls nicht geprüft: Safari auf einem
  Telefon, die laufende D1, der Mailweg ab dem Postfach.

**Für die Nächsten:**
* *An den Betreiber:* `node tests/durchstich.cjs` ist der Lauf, den ich vor
  jedem Livegang wiederholen würde — er dauert eine halbe Minute und hätte
  das Jahr erspart. Er braucht Playwright, das nicht zum Projekt gehört;
  ohne es legt er sich mit einer Zeile hin, statt rot zu werden.
* *software-engineer:* Zwei Sachen in deinem Feld. (a) `fassungsliste()`
  ist **nicht atomar**: Kopf einfügen, alte Zeilen löschen, neue als
  `batch` — drei Schreibvorgänge. Scheitert der `batch`, steht der Kopf
  mit frischem `importiert` da und keine einzige Position. Genau das, was
  `vorgangSchreiben` in dieser Runde schon abgestellt hat, nur eine
  Funktion weiter (`src/index.js:397`–`:422`). (b) Bei einem `422` schreibt
  der Mailweg trotzdem eine Erfolgsnotiz: „Z-Bericht undefined: undefined
  Positionen" (`:645`).
* *hospitality-pro:* Dein Blick stimmte im Ergebnis, an einer Stelle aber
  nicht im Weg: Der Durchgang im Scratchpad zählte über `.w .cnt`, und
  diesen Selektor gibt es nicht. Ohne Fehlmenge ist eine Tagesfassung zwar
  gültig — „alles da" —, es entsteht dann aber **auch keine einzige
  Buchung**, und der Weg App → `ereignis` bleibt ungeprüft. Repariert. Und
  eine Frage an dich: Ist „WEINKELLER 0/3" im Schritt „Holen" genug, damit
  eine neue Kraft merkt, dass sie jede Zeile antippen muss?
* *ui-designer:* Die sechste Lage heisst `leerarchiv`,
  `RUNDE=… node tests/ui-leitung.cjs`. Zwei Bilder liegen in
  `review/screens/runde-3-qa/`. Und: Ich habe **96 Aufnahmen und 16 MB
  erzeugt und vier davon eingecheckt** — Begründung in der `LIESMICH.md`
  daneben. Der Rest ist in zwei Befehlen wiederherstellbar.

**Phase/Thema:** A / Durchstich App ↔ Worker ↔ Live-Schema, Regelprüfung,
Urteil zum Livegang

**Backlog:** neu — **hoch:** ein nach Kostenstellen gespaltener Z-Bericht
wird nur zur Hälfte gelesen, ohne Meldung (`gnparse.js:114`;
Entscheidung Nr. 12). **mittel:** der Z-Import ist nicht atomar
(`index.js:397`) · der Gerätespeicher der Leitung ist nach dem Livegang
nirgends mehr erreichbar (gemessen: 3 im Speicher, 0 gezeigt) · im Schritt
„Holen" führt „Weiter" weiter, ohne dass etwas abgehakt ist. **niedrig:**
Erfolgsnotiz nach fehlgeschlagenem Z-Import · feste Ziffernfolgen im
Quelltext der Prüfungen.

**STATUS:** VERBESSERUNGEN

---

## Rundenfazit und Urteil des qa-guardian

**Diese Runde hat das Tool von „läuft nicht" auf „läuft" gebracht, und zum
ersten Mal hat das jemand durchgehend gesehen statt nur an einer Hälfte.**

### 1. Kann das Tool am Montag in Dienst gehen?

**Für den Keller: ja. Für den Z-Bericht: nein — aber das muss den Montag
nicht aufhalten.**

*Was am Montag trägt (nachgewiesen, nicht vermutet):* Tagesfassung,
Nachfüllen, Sonderentnahme und Kellerzählung gehen von der Anmeldung bis
in die Datenbank durch. Der Vorgang kommt an, die Buchungen stehen im
Journal, doppeltes Senden verdoppelt nichts, ein Funkloch verliert nichts,
eine abgelaufene Sitzung verliert nichts, die falsche Rolle kommt nicht
durch, und die Leitung liest dieselben echten Daten ohne einen einzigen
JS-Fehler. Das ist der Durchstich, und er ist mit dem Stand von gestern
rot.

*Was am Montag nicht trägt:* Die Hälfte „Verkauf ↔ Fassung". Nicht weil
der Code kaputt wäre — der Weg `email()` → `fassungsliste` → Datenbank ist
in dieser Runde erst hergestellt worden —, sondern weil **niemand einen
echten Z-Bericht je durch diesen Parser geschickt hat.** Wenn der Bericht
nach Kostenstellen gespalten ist, liest das Tool die Hälfte und meldet
Erfolg. Das ist schlimmer als ein Fehler, weil es nach einem Ergebnis
aussieht.

**Auflagen für Montag — sieben, davon sechs ohne eine Codezeile:**

1. **Die Geräte vorher NICHT aufräumen**, und beim ersten Kontakt jemanden
   zusehen lassen. Die liegengebliebenen Pakete gehen von selbst hinaus.
2. **Die vier persönlichen Codes neu vergeben** (sie stehen in der
   Git-Historie) und **`ANLAGE_OFFEN` im Dashboard schliessen**.
3. **Eine Sicherung der D1 anlegen, bevor zum ersten Mal Daten darin
   stehen, die es nur dort gibt.** Ab Montag ist das der Fall, und es gibt
   keinen Papierkorb.
4. **`migrations/001_mapping_rezept.sql` NICHT einspielen.** Der Stand
   läuft ohne sie.
5. **In der ersten Woche keine Zahl aus „Verkauf ↔ Fassung" für eine
   Bestellung oder eine Abrechnung verwenden**, bis der erste echte
   Z-Bericht angesehen wurde.
6. **Am Montag einen echten Z-Bericht anonymisiert nach `tests/fixtures/`
   legen** und `npm test` laufen lassen. Die Prüfung dazu liegt bereit und
   meldet sich von selbst, wenn der Bericht gespalten ist.
7. **Am ersten Abend jemanden neben der Servicekraft stehen lassen**, die
   die erste Fassung macht — und zwar bei Schritt 3 „Holen".

### 2. Ist Phase A abgeschlossen?

**Ja.** In Runde 2 habe ich „nein, es fehlt eine Datei" gesagt. Die Datei
liegt vor, sie ist gegen die laufende D1 gegengelesen, der Worker ist
daran angepasst, und der Abgleich hält sich ab jetzt von selbst — vier
statische Wächter in `tests/schema.test.mjs` und ein Durchstich, der beide
Hälften gleichzeitig anfasst. Was Phase A leisten sollte — **Code und
Schema stimmen überein, und es ist bewiesen** —, ist geleistet.

Das heisst ausdrücklich nicht, dass kein Punkt mehr offen wäre. Es stehen
vierzehn Punkte unter „hoch", aber keiner davon gehört mehr in Phase A: Sie sind
Entscheidungen (Sonderentnahme, Soll-Mengen), Dashboard-Aufgaben
(`ANLAGE_OFFEN`, Sicherung, Codes) oder Phase B.

### 3. Die grösste verbleibende Unsicherheit

**Der echte Z-Bericht. Niemand hat je einen gesehen.**

`tests/fixtures/` ist im vierten Zug leer. Die Hälfte des Tools, die
Wareneinsatz und Schwund ausrechnet, ist ausschliesslich an Berichten
geprüft, die Agenten nachgebaut haben — nach einer Beschreibung, die von
denselben Agenten stammt. Das ist die Lehre dieser Runde in Reinform:
**Prüfungen können jahrelang grün sein und nichts beweisen.** Die 24
Prüfungen am Parser sind heute grün. Sie beweisen, dass er die vier
Eigenheiten kennt, die jemand aufgeschrieben hat. Sie beweisen nichts über
die fünfte.

Dahinter, in dieser Reihenfolge:

* **Die laufende D1 hat niemand mit eigenen Augen gesehen** — weder der
  software-engineer noch ich haben den Connector. Alles Schemabezogene
  ruht auf `docs/live-schema.sql`. Die Datei ist seit `5df2817` per
  `PRAGMA table_info` gegengelesen, und das ist ein grosser Unterschied zu
  Runde 2 — aber für `person`, `ereignis`, `mapping` und `stamm` steht
  diese Gegenprobe noch aus.
* **Safari auf einem Telefon** hat nichts von alldem je ausgeführt. Alles
  Visuelle ist Chromium in iPhone-Maßen. Die App lebt von IndexedDB,
  `localStorage`, Service Worker und einem `Secure`-Keks — vier Dinge, bei
  denen sich iOS-Safari anders verhält als Chromium, besonders im
  Privatmodus und beim Speicherplatz.
* **Der Mailweg ab dem Postfach.** `ABSENDER`, Email Routing und die
  Zustellung an den Worker stehen im Dashboard und sind für mich nicht
  erreichbar.

**Wenn ich einen Satz mitgeben darf:** Am Montag geht der Keller in
Betrieb, und das darf er. Der Wareneinsatz geht an dem Tag in Betrieb, an
dem der erste echte Z-Bericht in `tests/fixtures/` liegt — nicht früher.


---

### Runde 4 – Hauptsitzung (Auflagen vor dem Livegang)

**Kritik am Vorgänger:** Die sieben Auflagen des qa-guardian (Runde 3,
„Rundenfazit") sagen an keiner Stelle, in welcher Reihenfolge sie zu tun
sind — und in dieser Form sperren sie das Haus aus.
* ✅ übernommen: Auflage 1 (Geräte nicht aufräumen), 3 (Sicherung), 4
  (Migration nicht einspielen), 5 (keine Zahl aus „Verkauf ↔ Fassung"), 7
  (jemanden danebenstellen) — unverändert in `review/ERGEBNIS.md`
  übernommen, nur sortiert.
* ↩️ geändert: Auflage 2 („die vier Codes neu vergeben, nicht wieder
  vierstellig", `review/LOG.md:1678`). Sie war als reine Dashboard-Aufgabe
  geführt („sechs ohne eine Codezeile"). Sie ist keine: Jedes Codefeld in
  `public/index.html` hatte `maxlength="4"` und die Anmeldung schickte bei
  der vierten Ziffer selbst ab. Ein sechsstelliger Code hätte niemanden
  mehr hereingelassen, und nach zehn Versuchen greift die Sperre. Auflage 2
  steht jetzt hinter dem Livegang dieses Standes, mit Ablauf.
* ↩️ geändert: „`ANLAGE_OFFEN` schliessen" stand mit dem Codewechsel in
  einer Zeile. Sie gehören auseinander und in diese Reihenfolge: erst
  prüfen, dass eine Anmeldung mit Rolle `leitung` ins Backoffice kommt,
  dann die Codes, dann `ANLAGE_OFFEN` löschen. Wer zuerst schliesst und
  sich dann aussperrt, hat keinen Weg zurück.
* ❌ abgelehnt: nichts.

**Umgesetzt:**
1. Anmeldung, Verwaltung und Freigabe nehmen sechs bis acht Ziffern;
   abgeschickt wird auf eine Bestätigungstaste (✓) statt bei der vierten
   Ziffer. Der Worker vergibt nur noch sechs bis acht, bestehende Codes
   gelten weiter, bis sie ersetzt sind.
2. Zwei Fehler in derselben Ecke: Die Löschtaste hängte „undefined" an den
   Code (`data-weg` ohne Wert ist `""`), und ein ersetzter Code blieb auf
   dem Gerät gültig — jetzt merkt sich ein Gerät je Person genau einen Code.
3. `review/ERGEBNIS.md` gefüllt: die sieben Auflagen in ausführbarer
   Reihenfolge, der Codewechsel Schritt für Schritt, Migrationen,
   Geprüftes, ausdrücklich Weggelassenes. Das ist die PR-Beschreibung.

**Geprüft:** `npm test` 170 grün (vorher 156; vier neue zur Codevergabe im
Worker, sechs zu Codelänge und Tastenfeld in `tests/projektregeln.test.mjs`,
vier im neuen `tests/geraetecodes.test.mjs`). `node tests/durchstich.cjs`
35/35 (vorher 33/33; neu: Löschtaste und „ohne Bestätigung geht nichts
hinaus"), mit sechsstelligem Code durch die echte Oberfläche.
`node tests/persona-tagesfassung.cjs` durchgelaufen. Anmeldeschirm im
iPhone-Maß angesehen: sechs Felder, ✓ dunkel bis zur vierten Ziffer, danach
hell, acht Ziffern sind die Grenze. `sw.js` v21 → v22. Die geteilte
Gestaltungsschicht ist unberührt (die Taste liegt im App-eigenen Teil) —
`tests/projektregeln.test.mjs` prüft es.

**Für die Nächsten:**
* An den **skeptiker**: Die Bestätigungstaste ist ein Eingriff in den
  ersten Schirm, den das Werkzeug zeigt, und sie kostet einen Tastendruck
  mehr je Anmeldung. Der Grund ist die wechselnde Länge — bei festen sechs
  Ziffern ginge es auch ohne. Zweitmeinung erwünscht, bevor das Haus sich
  daran gewöhnt.
* An den **qa-guardian**: `bekannterCode()` ist weiterhin die Rückfallebene
  ohne Netz und kennt keine Rolle (Backlog, hoch). Der Codewechsel wirkt
  auf einem Gerät erst, wenn es sich einmal neu anmeldet.
* An den **hospitality-pro**: Der Satz auf dem Anmeldeschirm heisst jetzt
  „Code eintippen, dann auf ✓." — ein Satz mehr auf dem ersten Schirm.

**Phase/Thema:** A / Auflagen vor dem Livegang

**Backlog:** neu unter „hoch": Der ersetzte Code verschwindet auf einem
Gerät erst mit der nächsten Anmeldung (Hauptsitzung, Runde 4). Vier Punkte
nach „Erledigt" verschoben.

**STATUS:** VERBESSERUNGEN — die Codeseite der Auflagen ist fertig und
geprüft; die sieben Auflagen selbst liegen beim Betreiber und sind in
`review/ERGEBNIS.md` als Ablauf hinterlegt.


---

### Runde 4 – Hauptsitzung (erster echter Z-Bericht)

**Kritik am Vorgänger:** Der qa-guardian nennt den fehlenden echten
Z-Bericht „die grösste verbleibende Unsicherheit" (`review/LOG.md:1708`)
und schreibt: „Prüfungen können jahrelang grün sein und nichts beweisen."
* ✅ übernommen, und der Satz hat sich beim ersten Lauf bestätigt: Die 24
  grünen Prüfungen am Parser beschrieben eine Form, die es nicht gibt. Der
  echte Bericht Nr. 37 hat vier Formannahmen auf einmal widerlegt.
* ↩️ geändert: „**Nicht auf Verdacht ändern** (Regel 7)"
  (`tests/zbericht.test.mjs:121`) war richtig, solange kein echter Bericht
  vorlag. Er liegt jetzt vor — also ist geändert worden, aber nur, was der
  Bericht selbst zeigt, und jede Änderung ist an seinen eigenen Summen
  gegengerechnet (145 Stück, 602,50 €, an drei Stellen im Bericht).
* ↩️ geändert: Die Prüfung auf gespaltene Berichte
  (`tests/zbericht.test.mjs:194`) zählte ALLE Zeilen einer Sektion. Damit
  hätte sie den Bezahlartenblock (eine Buchung, 26 Zimmernummern darunter)
  für einen zweiten Positionsblock gehalten. `sektionen[].n` zählt jetzt
  nur, was nach einer Position aussieht.
* ❌ abgelehnt: nichts.

**Umgesetzt:**
1. `tests/fixtures/zbericht-37-extended.csv` eingecheckt und
   `tests/zbericht-37.test.mjs` dagegen geschrieben — 24 Prüfungen, vom
   Kopf bis in `fassungszeile`.
2. `gnparse.js` an die echte Form: Spaltenüberschrift als Sektionskopf,
   Rauten als Trenner, Z-Nummer aus zwei Feldern, Leerzeilen aus leeren
   Feldern, Positionsblock beim Namen. Vorher 106 Positionen mit 1345,75
   Stück und 5166,70 €, jetzt 48 mit 145 und 602,50 €.
3. „1/8 l" ist ein Achtel, nicht acht Liter (Faktor 64 auf jedem offenen
   Wein) — in `ml()` und in `kern()`. Rabatt und Storno gehen als Zahl
   heraus; der Import und die Journalnotiz nennen den Storno.

**Geprüft:** `npm test` 195 grün (vorher 170; 24 neue am echten Bericht,
davon vier durch den Worker in eine echte SQLite-DB aus
`docs/live-schema.sql`). `node tests/durchstich.cjs` 35/35. Die
Gegenprobe des Berichts an sich selbst geht auf: Positionen 145 Stück /
602,50 € = Hauptwarengruppen (87 + 58) = Warengruppen. Rabattrechnung
602,50 − 52,00 = 550,50 = „Umsatz Total", auf den Cent. Der Storno (4,20)
ist in keiner dieser Summen enthalten — daran hängt die Antwort unten.
Die 16 Prüfungen am nachgebauten Bericht sind unverändert grün geblieben.

**Für die Nächsten:**
* An den **controller**: Rabatt und Storno zählen nach Vorgabe des
  Betreibers beide als Verbrauch. Der Rabatt steckt schon in den
  Positionen (nichts zu tun), der Storno nicht — und er nennt keinen
  Artikel, nur einen Grund. Verbrauch ist damit 145 + 1 Stück, davon eines
  unzuordenbar. Wie das in der Bewertung behandelt wird, ist eine Frage
  für Phase B.
* An den **qa-guardian**: `tests/fixtures/` hat jetzt einen Bericht aus
  EINER Nacht. Ein zweiter aus einer anderen Woche wäre die billigste
  weitere Sicherheit — besonders einer mit Fassbier und einem Tag ohne
  Frühstück.
* An den **hospitality-pro**: 58 der 145 Stück sind Speisen mit 0,00 €
  (HP-Eier, Beilagen, „Zwänge | Auswahl [Food]"). Sie werden gelesen und
  fallen erst bei der Zuordnung heraus. Ob sie in der Liste der Leitung
  auftauchen sollen, ist eine Bedienfrage.

**Phase/Thema:** A / Z-Bericht am echten Beispiel

**Backlog:** neu unter „hoch": Der Rückfall der Blockwahl bleibt blind für
gespaltene Berichte ohne „Positionen"-Überschrift. Neu unter „mittel":
Regel 7 nennt vier Eigenheiten, es sind acht. Vier Punkte nach „Erledigt",
darunter der seit Runde 1 offene „`tests/fixtures/` fehlt".

**STATUS:** VERBESSERUNGEN — der Z-Bericht wird jetzt richtig gelesen und
ist am echten Beispiel geprüft. Das Urteil „Z-Bericht nein" aus Runde 3
ist damit überholt; es bleibt bei einem Bericht aus einer Nacht, deshalb
in der ersten Woche gegenlesen statt blind verwenden.


---

### Runde 5 – Hauptsitzung, software-engineer, hospitality-pro (FUNKTION)

Gefragt war: importiert alles richtig, funktionieren die Eingaben, kann die
Leitung im Backoffice alles sehen und anpassen? Zwei Rollen haben gemessen
statt gelesen, die Hauptsitzung hat die Funde nachgeprüft und behoben.

**Kritik am Vorgänger (Runde 4, Hauptsitzung — also an mir selbst):**
* ❗ **Der Z-Bericht war nur in einer von zwei Kopien repariert.** Runde 4
  meldete „jetzt 48 Positionen mit 602,50 €" und meinte `src/gnparse.js`.
  In `public/leitung.html` stand eine zweite Abschrift desselben Lesers mit
  genau den alten Fehlern: dieselbe Datei, 106 Positionen, 5166,70 €, das
  Achtel als acht Liter — auf dem Schirm, den die Leitung morgens zuerst
  aufmacht. Gefunden vom hospitality-pro, von mir im Browser nachgestellt.
  ✅ übernommen: Der zweite Leser ist ersatzlos weg.
* ❗ **Runde 4 hat den Import geprüft, aber nie die Eingaben.** `fuellen`,
  `keller` und `ware` fasste keine der 195 Prüfungen bis in die Datenbank
  an — und dort standen drei falsche Zahlen. ✅ übernommen, alle drei
  behoben und mit `tests/modi.test.mjs` festgenagelt.
* ↩️ geändert: Die Prüfung auf gespaltene Berichte zählte ALLE Zeilen einer
  Sektion; am echten Bericht hätte sie den Bezahlartenblock für einen
  zweiten Positionsblock gehalten. `sektionen[].n` zählt jetzt nur
  positionsartige Zeilen.
* ❌ abgelehnt: nichts.

**Umgesetzt:**
1. **Das Backoffice redet mit dem Server.** Z-Berichte und Zuordnungen
   kamen aus dem `localStorage` eines Geräts; der per Mail eingelieferte
   Bericht war unsichtbar, und die Zuordnungsarbeit wirkte nicht auf den
   Import. Jetzt `GET/POST /api/fassungsliste` und `/api/mapping`, der
   zweite Parser ist gelöscht, der `localStorage` ist nur noch Abschrift.
2. **Drei falsche Mengen in den Eingaben behoben:** Kiste immer sechs
   (`kg` statt `kistengr`), Getränkelieferung als Entnahme gebucht,
   Nachfüllen ohne jede Buchung. Dazu: „ignoriert" räumt den Artikel
   zurück, die Absenderprüfung des Postfachs vergleicht die Domäne statt
   das Ende der Adresse, und ein abgelehnter Mailimport nennt den Grund.
3. **Zwei Fallen im Backoffice:** Eine Teilzählung setzte 54 von 57 Weinen
   auf „—"; die Leitung konnte sich mit einem Klick selbst aussperren.

**Geprüft:** `npm test` 210 grün (vorher 195; 15 neue in
`tests/modi.test.mjs` für die fünf Modi, die Zuordnung und das Postfach).
`node tests/durchstich.cjs` 35/35. **Neu: `node tests/ui-leitung-echt.cjs`
22/22** — das Backoffice in Chromium gegen den echten Worker, die echte
Datenbank und den echten Z-Bericht: eingelesen über die Oberfläche (48
Positionen, 145 Stück, 602,50 €, Achtel 125 ml), Zuordnung landet in
`mapping`, zweites Gerät mit leerem Browserspeicher sieht beides, ein nur
per Mail eingelieferter Bericht ist sichtbar, Teilzählung lässt alle 57
Weine stehen, Selbstsperre wird abgefangen. Persona-Durchlauf ohne
JS-Fehler. `sw.js` v22 → v24.

**Für die Nächsten:**
* An den **skeptiker**: Zwei Runden hintereinander war der teuerste Fund
  eine zweite Kopie derselben Logik (erst der Parser, dann die
  Bestandsrechnung). Es gibt weiter zwei: `bestand()` im Backoffice und
  `bestand()` im Worker rechnen dieselbe Regel getrennt. Lohnt ein Blick,
  ob die Leitung nicht `/api/bestand` lesen sollte.
* An den **controller**: Der Getränkebestand hat keinen Anker — Bewegungen
  ja, Zählung nein (Entscheidung Nr. 14).
* An den **qa-guardian**: Die Lücke „grün und trotzdem falsch" war zweimal
  dieselbe: keine Prüfung fasste die ausgelieferte Oberfläche an echten
  Daten an. `tests/ui-leitung-echt.cjs` schliesst sie für das Backoffice.
  Für die App fehlt das Gegenstück (Wareneingang mit Zwölferkiste durch
  die echten Felder).

**Phase/Thema:** A / Funktion — Import, Eingaben, Backoffice

**Backlog:** neu unter „hoch": Import nicht atomar, Teilbericht ersetzt
vollen Bericht lautlos. Neu unter „mittel": sechs Punkte aus dem
Backoffice-Durchgang (Getränke-Lagerbestand, Feldwechsel im Wareneingang,
Speicher-Spalten, Zuordnungsliste, Reihenfolge der Ansichten, §8 A). Elf
Punkte nach „Erledigt". Zwei neue Entscheidungen: Nr. 14 (hat das
Getränkelager einen Bestand?) und Nr. 15 (Betriebstag oder Zeitstempel?).

**STATUS:** VERBESSERUNGEN — die drei Fragen sind beantwortet: Der Import
stimmt jetzt (und wurde vorher an zwei Stellen verschieden gelesen), die
Eingaben stimmen jetzt (drei Modi schrieben falsche oder keine Mengen), und
das Backoffice zeigt und ändert jetzt wirklich das, was auf dem Server
steht — mit Ausnahme der Stammdaten aus §8 A, die weiter nur im Quelltext
stehen.

---

### Runde 6 – software-engineer (Nachtzyklus P0: Mengen, die heute falsch sind)

**Kritik am Vorgänger:** Runde 5 hat den zweiten Z-Bericht-Leser aus
`public/leitung.html` entfernt und dabei die Rechnung daneben stehen lassen,
die aus demselben Bericht eine Menge macht.
* ✅ übernommen: `flaschen()` (`public/leitung.html:973` im Stand v24) hatte
  drei stille Annahmen — jeder Wein 750 ml (`GEBINDE`, `:604`), eine Position
  ohne Größe im Namen eine ganze Flasche (`aus||750`), und alles Übrige „eine
  Einheit = eine Flasche" (`return p.anzahl`). Am echten Bericht Nr. 37
  gemessen: „Amaro Averna Siciliano 2 cl" × 3 wurde zu **3 Flaschen** statt
  0,086; „Sanbitter Spritz 1 Glas" zu einer Flasche. Beides ging ungefragt in
  die Differenz und sah dort aus wie Schwund.
* ✅ übernommen: `mapping.gebinde_ml` existiert live, der Worker nimmt es
  entgegen und liefert es aus (`src/index.js:490`, `:615`) — das Backoffice
  hat es nie gelesen. Der einzige Wert, den je ein Mensch bestätigt hat, lag
  ungenutzt in der Datenbank.
* ❌ abgelehnt: nichts.

**Umgesetzt:**
1. **Eine Quelle für Gebindegrößen** (`gebindeGroesse`, `public/leitung.html:658`)
   mit vier Stufen und klarer Auskunft, woher der Wert kommt: bestätigt für
   diese Kassenposition → bestätigt für diesen Artikel → Vorschlag aus dem
   Artikelnamen → Vorschlag „Standard Weinflasche 750 ml". Für Spirituosen und
   Wasser wird **kein** Standard erfunden (`GEBINDE_STANDARD = { wein: 750 }`);
   widersprechen sich zwei Bestätigungen desselben Artikels, gilt keine.
2. **Der dritte Zustand.** `flaschen()` gibt `{ok:false, fehlt:"ausschank"|"gebinde"}`
   zurück statt einer erfundenen Zahl. `abgleich()` führt `ohneGroesse` neben
   `offen`; diese Positionen gehen weder in `verk` noch in die Differenz.
3. **Sichtbar ausgewiesen** in „Verkauf ↔ Fassung" und im Mittagsblick:
   „Größe fehlt" mit Menge, Grund, Vorschlag und einem Knopf „Übernehmen",
   der `POST /api/mapping` mit `gebinde_ml` schickt. Bewusst nicht rot: hier
   fehlt eine Angabe, keine Flasche.

**Geprüft:** `npm test` 234 grün (vorher 211; neu `tests/gebinde.test.mjs`,
das den ausgelieferten Ausschnitt aus `leitung.html` in einer eigenen Umgebung
gegen die echten Zahlen aus `tests/fixtures/zbericht-37-extended.csv` rechnet,
dazu `tests/ping.test.mjs`). `node tests/ui-leitung-echt.cjs` **30/30** — der
ganze Weg durch die echte Oberfläche: „Größe fehlt" steht da, keine Zeile
rechnet mit, Klick auf „Übernehmen", `mapping.gebinde_ml = 750` in der
Datenbank, danach 4 × 125 ml aus 750 ml = 0,67 Flaschen.
`LAUF=runde-6 node tests/ui-mass.cjs`: Überlauf 0 in 390/768/1280, keine
JS-Fehler, Gestaltungsschicht wortgleich — unverändert gegenüber der
Basislinie `review/screens/basis-live/`. `sw.js` v24 → v25.

**Für die Nächsten:**
* An die **Moderation** (dringend, mit Live-Beleg): In der Live-D1 haben
  **alle 13** Zuordnungen `gebinde_ml = NULL` (am 18.09. lesend nachgesehen).
  Ohne einen Sammelknopf „alle Vorschläge übernehmen" zeigt der Abgleich am
  Morgen nichts als Lücken — das Werkzeug wäre dann ehrlicher, aber stiller.
* An den **Jäger**: `kistenGr()` (`public/leitung.html:678`) liest `p.kg`; die
  App legt `kistengr` ab (`public/index.html:2910`). Der Worker liest seit
  Runde 5 beides, das Backoffice nur das Feld, das es nie gab — dieselbe
  Lieferung ergibt im Journal 40 und auf dem Schirm 12 Flaschen.
* An den **controller**: Der Befund B2 (zwei Vorgänge desselben Modus am
  selben Tag teilen den Schlüssel) ist nachgelesen und bestätigt —
  `public/index.html:2230` legt `blank(m)` mit demselben `tag` an,
  `ereignisseAbleiten` (`src/index.js:262`) nimmt den ersten per Gegenbuchung
  zurück. Live existiert bereits `ware_2026-09-16`.

**Phase/Thema:** A / P0 — Mengen, die heute falsch sind

**Backlog:** neu unter „hoch": Sammelbestätigung der Gebindegrößen fehlt;
`kistenGr()` im Backoffice liest ein Feld, das es nie gab; zwei Vorgänge
desselben Modus am selben Tag löschen einander.

**STATUS:** VERBESSERUNGEN — keine Position wird mehr still geraten, aber
ohne Sammelbestätigung ist der Abgleich am Morgen leer.

---

### Runde 7 – software-engineer (Nachtzyklus: die drei A-Funde aus Runde 6)

**Kritik am Vorgänger (Runde 6):**
* ✅ übernommen: `kistenGr()` (`public/leitung.html:678`, Stand v25) las `p.kg`
  — ein Feld, das die App nie geschrieben hat — und fiel dann auf `PLAN.kiste`
  zurück. Damit gab es DREI Fassungen derselben Zahl: App `+p.kistengr||6`,
  Worker `+x.kistengr||+x.kg||6`, Backoffice `+p.kg||PLAN.kiste||6`. Zwei
  Kisten à 20 Flaschen standen im Journal mit 40 und auf dem Schirm mit 12.
* ✅ übernommen: Runde 6 hat richtig aufgehört zu raten, aber keinen Weg
  gelassen, die 13 unbestätigten Größen in vertretbarer Zeit zu bestätigen.
  Ohne Sammelweg wäre der Abgleich am Morgen leer gewesen.
* ↩️ geändert (Fund A-6 der Jagd, während der Runde hereingereicht): Der Knopf
  „Übernehmen" stand auch an **Rezeptzeilen**, wo `id` der BESTANDTEIL ist.
  Ein Klick hätte `MAP[<Mischgetränk>] = <Bestandteil>` geschrieben, und der
  Worker hätte das rückwirkend in alle gespeicherten Berichtszeilen getragen
  (`UPDATE fassungszeile SET artikel …`) — ohne Papierkorb. Jetzt: kein Knopf
  an solchen Zeilen, der Sammelknopf lässt sie aus, und beide Wege verweigern
  sie zusätzlich von sich aus.
* ❌ abgelehnt: nichts.

**Umgesetzt:**
1. **Sammelbestätigung der Gebindegrößen.** Erst die Liste (Kassenname ·
   Menge · Artikel · was fehlt · Vorschlag samt Herkunft), dann ein Klick.
   Jede Zeile geht einzeln über `POST /api/mapping`; gemerkt wird nur, was der
   Server angenommen hat; beim ersten Fehlschlag Abbruch mit „n von m
   bestätigt — der Rest steht noch da". Positionen ohne Vorschlag und
   Rezeptzeilen bleiben unberührt.
2. **`kistenGr()` auf die Rangfolge des Workers gebracht**
   (`+p.kistengr || +p.kg || 6`). Dieselbe Lieferung ergibt jetzt überall
   dieselbe Zahl.
3. **Zweiter Vorgang desselben Modus am selben Tag wird gefragt, nicht
   ersetzt** (`start()`, `public/index.html`): „Ergänzen" (Vorgabe) führt den
   abgeschlossenen Vorgang fort, der Server bucht nur den Zuwachs;
   „Trotzdem neu beginnen" bleibt möglich und sagt vorher, dass die erste
   Lieferung zurückgenommen wird; „Abbrechen" führt ins Menü. Der Schlüssel
   `<modus>_<tag>` bleibt unangetastet, keine Schemaänderung.

**Geprüft:** `npm test` **252 grün** (vorher 234; neu `tests/kisten.test.mjs` 6,
`tests/vorgang-zweimal.test.mjs` 6, `gebinde.test.mjs` von 15 auf 21).
`node tests/durchstich.cjs` 35/35. `node tests/ui-leitung-echt.cjs` **40/40**
(Abschnitt 8 neu: Sammelknopf am echten Bericht durch den echten Worker, drei
Zeilen einzeln in `mapping`, Rezeptzeile ohne Knopf und vom Sammelklick nicht
angefasst). `node tests/ui-zweiter-vorgang.cjs` **15/15** (neu, Chromium ohne
Netz): die App fragt, nennt „1 Position · 40 Flaschen", Ergänzen schickt EIN
Paket mit 64 Flaschen, ein anderer Tag wird weiter still archiviert.
`tests/vorgang-zweimal.test.mjs` stellt den Schaden am echten Worker nach:
ohne die Frage steht `eingang w003 −40` als Gegenbuchung im Journal.
`LAUF=runde-7 node tests/ui-mass.cjs`: Überlauf 0, JS-Fehler 0,
Gestaltungsschicht wortgleich, Messwerte Zeichen für Zeichen wie die
Basislinie. `sw.js` v25 → v26.
**Ungeprüft:** echtes iPhone/Safari, der Wechsel des Service Workers auf v26,
und der Weg „Trotzdem neu beginnen" end-to-end gegen den Worker.

**Für die Nächsten:**
* An die **nächste Runde**, mit Beleg: `public/index.html:2238` — im Dialog
  „Auf einem anderen Gerät weiter?" setzt der Abbrechen-Zweig
  `start._uebernommen=false; start(m);`. `fernNeuer(m)` liefert danach denselben
  fremden Stand, der Dialog öffnet sich sofort wieder: **ablehnen ist
  unmöglich**. Die Berichtigung ist ein Wort.
* An den **controller**: „Ergänzen" löst den Fall ohne Schemaänderung, aber es
  gibt keine ausdrückliche Bedienung „diese Position war falsch" — korrigiert
  wird durch Ändern im fortgeführten Vorgang.

**Phase/Thema:** A / P0 — Abschluss Gebindegrößen, Kistengrößen, zweiter Vorgang

**Backlog:** neu unter „hoch": Fremdgerät-Dialog, Abbrechen öffnet sich endlos
neu. Neu unter „mittel": „Trotzdem neu beginnen" nimmt die erste Lieferung
zurück; Rezepturen für „1 Glas"-Positionen fehlen.

**STATUS:** VERBESSERUNGEN — die drei A-Funde sind behoben und belegt; der
Fremdgerät-Dialog ist neu aufgetaucht und offen.

---

### Runde 8 – software-engineer (die drei A-Funde der Jagd)

**Kritik am Vorgänger (Runde 6/7):**
* ↩️ geändert: `tests/gebinde.test.mjs:204` prüfte `w001.diff === 1` — und
  daneben stand der Kommentar „die Entnahme steht da, aber sie ist kein
  Befund über den Verkauf". Der Kommentar sagte das Richtige, die Zusicherung
  das Gegenteil: sie hat Fund A-5 festgeschrieben. Jetzt `diff === null` und
  `unklar === "groesse"`.
* ↩️ geändert: Der Hinweis „Kein Z-Bericht im Zeitraum" hing an `top.length` —
  er wäre genau dann verschwunden, wenn die unklaren Zeilen aus `top` fallen,
  also wenn er gebraucht wird. Hängt jetzt an `!a.berichte && a.zeilen.length`.
* ✅ übernommen: `kistenGr()` aus Runde 7 ist wortgleich mit dem Worker,
  `tests/kisten.test.mjs` hält es fest — nichts daran geändert.
* ❌ abgelehnt: nichts.

**Umgesetzt:**
1. **A-5 · „Größe fehlt" wirkt jetzt auch auf der Entnahmeseite.** Artikel,
   deren Verkauf nicht bestimmbar ist, bekommen `diff: null` und ein
   `unklar`-Feld mit Grund (`groesse` · `offen` · `keinbericht`). Sie zählen
   nicht in die rote Zahl der Navigation und nicht in „Auffällige
   Differenzen"; in der Tabelle stehen sie mit Entnahme, Strich statt
   Differenz und dem Satz „kein Abgleich möglich — …"; in der CSV bleiben
   Verkauf und Differenz leer (neue Spalte „Befund"). Bewusst vorsichtig:
   unklar wird ein Artikel nur, wenn für ihn ÜBERHAUPT kein Verkauf
   gerechnet wurde — echter Schwund bleibt ein Befund.
2. **A-3 · Gelieferte Getränke sind Eingang, nicht Entnahme.** `gent` geht im
   Modus `ware` nach `o.eingang`, sonst nach `o.getr` — dieselbe
   Unterscheidung wie im Worker. Vorher standen 24 gelieferte Cola im
   Abgleich als „Entnahme 24, Diff +24, Vorrat aufgebaut oder Schwund".
3. **A-4 · Eine Reihenfolge.** `MODUSRANG` ist weg; sortiert wird nach
   Betriebstag, bei Gleichstand nach Zeitstempel (Entscheidung Nr. 15 der
   Nacht). „Danach" heißt `tag > Zähltag` ODER (`tag = Zähltag` UND
   `ts > Zähl-ts`). Vorher: Backoffice 10, Worker 34 Flaschen.
4. **Einzeiler:** Der Fremdgerät-Dialog ließ sich nicht ablehnen
   (`start._uebernommen=false` statt `true`); er öffnete sich sofort wieder.

**Geprüft:** Jede Zahl zuerst nachgestellt, dann berichtigt, dann erneut
gemessen. `npm test` **270 grün** (vorher 252; neu `abgleich-unklar` 8,
`reihenfolge` 6, `lieferung-getraenke` 4). `node tests/durchstich.cjs` 35/35 ·
`node tests/ui-leitung-echt.cjs` 40/40 · `node tests/ui-zweiter-vorgang.cjs`
15/15 · `node tests/ui-fremdgeraet.cjs` **10/10** (Gegenprobe mit
zurückgedrehtem Wort: 3 von 10 rot). `tests/reihenfolge.test.mjs` rechnet
jeden Fall doppelt — echter Worker über `/api/bestand` gegen `bestand()` aus
der ausgelieferten Datei. `LAUF=runde-8 node tests/ui-mass.cjs`: Überlauf 0,
JS-Fehler 0, Gestaltungsschicht wortgleich, Messwerte identisch mit der
Basislinie. `sw.js` v26 → v27.
**Ungeprüft:** echtes iPhone/Safari, der Wechsel des Service Workers auf v27,
der Weg „Übernehmen" nach dem Ablehnen mit echtem Serverstand, und die CSV in
einem Tabellenprogramm.

**Für die Nächsten:**
* An die **Worker-Seite**, mit Beleg: Entscheidung Nr. 15 ist jetzt im
  Backoffice umgesetzt, im Worker NICHT. `src/index.js`, `bestand()`:
  `if (basis != null && r.ts <= basis) return;` — reine Ankunftszeit,
  `ereignis.tag` wird nicht gelesen. Solange Betriebstag und Ankunft
  zusammenpassen (der Normalfall), liefern beide dieselbe Zahl; ein
  nachgereichtes Paket lässt sie wieder auseinanderlaufen.
* An den **Gestalter**: „kein Abgleich möglich — Größe fehlt" steht als
  gedämpfter Text, nicht als Plakette. `p-grau` misst 4,43:1 und fällt durch
  das eigene Maß in `tests/ui-mass.cjs`.

**Phase/Thema:** A / Abgleich, Bestand, Offline-Dialoge

**Backlog:** neu unter „hoch": Worker `bestand()` rechnet nach Ankunftszeit,
das Backoffice nach Betriebstag. Neu unter „mittel": gleicher Zeitstempel in
derselben Millisekunde; kein Feld für die Gebindegröße von Hand. Neu unter
„niedrig": sechste CSV-Spalte „Befund"; `p-grau` mit 4,43:1.

**STATUS:** VERBESSERUNGEN — die vier beauftragten Funde sind zu; offen bleibt
Entscheidung Nr. 15 im Worker.

---

### Runde 9 – ui-designer (P1/P4: Oberfläche im Service)

**Kritik am Vorgänger:**
* ✅ übernommen (Jäger, C-Fund): `sicht()` in `tests/ui-mass.cjs` prüfte „vh"
  nur am Element selbst. Von den gemeldeten 96 zu kleinen Trefferflächen waren
  **78 echt, 18 Geister** — die nie sichtbaren `#bBack`/`#bNext` aus einem
  `vh`-Behälter.
* ↩️ geändert: Das Messgerät maß den **Anstrich statt den Griff**. `.home`
  (57 × 36) und `.hilfebtn` (36 × 36) tragen seit Runde 2 ein `::after` mit
  `max(100%,44px)`, das `getBoundingClientRect()` nicht sieht. Jetzt tastet die
  Messung zwölf Punkte auf einem 44-px-Kreis um die Mitte mit
  `elementFromPoint`. Von den 78 waren damit **48 wirklich ohne Griff**.
* ↩️ geändert: Runde 8 hat „kein Abgleich möglich" zu gedämpftem Text gemacht,
  *weil* die Plakette `p-grau` mit 4,43:1 durchfiel. Die Plakette war nicht das
  Problem, ihr Farbwert war es — `--fg-secondary` bringt 5,83:1.
* ❌ abgelehnt: nichts.

**Umgesetzt:**
1. **Jeder Griff im Service ist 44 px** (46-px-Raster, ein Pixel Luft, damit ein
   Druck auf die Naht eindeutig einem Knopf gehört): Schrittpunkte `.st`
   (24 × 44 → 46 × 46, mit Linie dahinter), Zählpunkte `.dot` der Tagesfassung
   (26 × 26 → 46 × 46 Griff, der Punkt bleibt 26), `.kminus`/`.kplus` 40 → 44.
   `.home`/`.hilfebtn` blieben unangetastet — sie waren schon richtig.
2. **Schrift im Service nie unter 15 px**, an einer Stelle gelöst:
   `--text-xs`/`--text-sm` in der geteilten Tokenebene auf 15 px,
   `[data-dichte="maus"]` holt sich 11/13 px zurück. Das Backoffice ist dadurch
   Zeichen für Zeichen unverändert (36 von 36 Seiten gemessen).
3. **Die drei rohen Bausteine gestaltet:** „Größe fehlt" ist ein Abschnitt mit
   Überschrift und Zahl statt ein kopfloser Kasten; der Sammelknopf steht in
   einer Handlungszeile statt mitten im Satz; „kein Abgleich" ist wieder eine
   Plakette; „Trotzdem neu beginnen" ist ein Knopf über die ganze Breite mit
   seiner Folge in der zweiten Zeile.

**Geprüft:** `npm test` 270 grün · `durchstich` 35/35 · `ui-leitung-echt` 40/40 ·
`ui-zweiter-vorgang` 15/15 · `ui-fremdgeraet` 10/10. `sw.js` v27 → v28.
Messgerät vorher → nachher (`review/screens/runde-9-vorher/` →
`review/screens/runde-9/`):

| Urteil | vorher | nachher |
|---|---|---|
| waagrechter Überlauf | 0 ✓ | 0 ✓ |
| JS-Fehler | 0 ✓ | 0 ✓ |
| Schrift im Service < 15 px | 36 ✗ | **0 ✓** |
| Trefferflächen ohne 44-px-Griff (Service) | 48 ✗ | **0 ✓** |
| Kontrast < 4,5:1 (beide Oberflächen) | 117 ✗ | **0 ✓** |
| Gestaltungsschicht wortgleich | ✓ | ✓ |

Die 117 Kontrastfunde waren 99 × `nav.seite .zahl` (4,43:1) und 18 × `.gbtn .go2`,
wo `font-size:var(--text-lg)` das `font-size:0` der Regel darüber aufhob und das
Zeichen „›" zusätzlich zur Maskengrafik durchkam.
Belege angesehen, nicht nur gelesen: `review/screens/runde-9/beleg-*.png`.
**Ungeprüft:** echtes Safari, Bildschirmtastatur, Notch, Safe-Area, Gummiband,
der Wechsel des Service Workers auf v28 — und ob iOS die `::after`-Griffe
genauso trifft wie Chromium.

**Für die Nächsten:**
* An alle, die künftig messen: `ui-mass.cjs` urteilt jetzt über den **Griff**,
  nicht über die gezeichnete Größe. Eine sichtbar kleine Fläche mit
  44-px-`::after` ist ausdrücklich erlaubt.
* An die nächste Gestaltungsrunde: Die Datumzeile im App-Kopf braucht 248 px,
  die Spalte hat 240 — bei langen Wochentagen bricht sie seit der
  Schriftanhebung um. Nicht die Schrift zurückdrehen.

**Phase/Thema:** A / P1+P4 — Trefferflächen, Schriftgrade, Gestalt

**Backlog:** neu unter „mittel": umbrechende Datumzeile; 46-px-Raster kostet
Namensspalte. Neu unter „niedrig": Punktreihe bricht 5+1; `--text-xs` und
`--text-sm` sind für den Finger gleich; Backoffice unter 900 px hat
Fingergeometrie mit Mausschrift.

**STATUS:** VERBESSERUNGEN — die vier Urteile für den Service stehen auf ✓;
offen bleibt die umbrechende Datumzeile, vom Zug selbst verursacht.

---

### Runde 10 – software-engineer (die drei A-Funde der zweiten Jagd)

**Kritik am Vorgänger (Runde 8):**
* ✅ übernommen: `if(offen.length) nichtRechenbar(id,"offen")` prüfte nicht, OB
  eine offene Position den Artikel überhaupt betreffen kann, sondern nur, ob
  irgendwo eine offen ist. Mit Bericht 37 (30 offene Speisen) bekam damit jeder
  Artikel ohne gerechneten Verkauf `diff: null`.
* ↩️ geändert: Der Schutz `if(verk[id]>0) return` war bei `groesse` nicht
  nachrüstbar — im Berichtslauf steht noch nicht fest, ob der Artikel an einer
  späteren Position gerechnet wird. Deshalb wird jetzt gezählt und erst NACH
  dem Lauf entschieden.
* ↩️ geändert: Der in Runde 8 als „toter Code" entfernte `MODUSRANG` war im
  Kern richtig; er kommt als zweistufiger `tagRang` zurück (Zählung = 0, alles
  andere = 1). Für die Bewegungen untereinander weiß niemand die Reihenfolge,
  und für die Summe ist sie gleichgültig.
* ↩️ geändert: `src/index.js`, `bestand()` las `ereignis.tag` gar nicht, obwohl
  die Spalte live `NOT NULL` ist.
* ↩️ geändert: Drei Zusicherungen in `tests/reihenfolge.test.mjs` und
  `tests/abgleich-unklar.test.mjs` schrieben die Funde fest. Jede ist mit
  Begründung ersetzt, keine gelöscht.

**Umgesetzt:**
1. **A/8-1:** Der Grund „offen" ist als Stummschalter weg (Entscheidung Nr. 9
   der Nacht). Der Hinweis über der Tabelle nennt die offenen Positionen
   weiterhin.
2. **A/8-2:** Größenlücken werden je Artikel gezählt und erst nach dem
   Berichtslauf gewertet — wenigstens eine gerechnete Position heißt: die
   Differenz bleibt, mit Vorbehalt „1 von 3 Positionen ohne Größe — die
   Differenz ist unvollständig".
3. **A/8-3:** Bei gleichem Betriebstag gilt die Kellerzählung als Erstes
   (Entscheidung Nr. 8), in `public/leitung.html` UND in `src/index.js`.
   `sw.js` v28 → v29.

**Geprüft (Zahl gegen Zahl):**
* A/8-1 · w002, 12 Flaschen entnommen, 0 verkauft, eine offene Speise im
  Bericht: vorher „kein Abgleich möglich" und in keiner Liste gezählt —
  nachher `diff +12`, Befund „prüfen", rote Zahl 0 → 2.
* A/8-2 · Spritzerwein `verk 1,80`, Entnahme 9, dazu eine Rezeptzeile mit
  Lücke: vorher `diff null` (7,2 Flaschen stumm) — nachher `diff +7,20` mit
  Vorbehalt. Der Bestandteil, für den gar nichts gerechnet wurde, bleibt
  „Größe fehlt".
* A/8-3 · die sieben Fälle des Jägers, Backoffice und Worker gegeneinander:
  Fall 2 (Zählung kommt am Folgetag) 10 → **4**; Fall 3 (gleicher Zeitstempel)
  10 → **4**; Fall 4 (kein Zeitstempel) 10 → **4**; Fall 6 Backoffice 4 /
  Worker 10 → **beide 4**. Fall 1 und 5 unverändert richtig.
  **Fall 7 · Lieferung 08:00, Zählung 10:00 desselben Tages: 10 → 34.**
  Das ist der in Kauf genommene Preis von Entscheidung Nr. 8 — siehe unten.
* `npm test` **274 grün** (vorher 270) · `durchstich` 35/35 ·
  `ui-leitung-echt` 40/40 · `ui-zweiter-vorgang` 15/15 · `ui-fremdgeraet` 10/10 ·
  `LAUF=runde-10 node tests/ui-mass.cjs`: alle Urteile ✓.
* **Ungeprüft:** echtes Safari/iPad; die Live-D1 in dieser Runde nicht
  abgefragt; die neue Vorbehalt-Zeile nur als HTML geprüft, nicht als Bild.

**Für die Nächsten:**
* An die **Moderation**: Entscheidung Nr. 8 hat einen sichtbaren Preis (Fall 7).
  Sauber lösbar ist er nur mit einem im Vorgang ERFASSTEN Zählzeitpunkt statt
  der Ankunftszeit — `vorgang.begonnen` existiert live und wäre der Kandidat.
* An den **ui-designer**: Die Befund-Spalte kann jetzt zweizeilig werden
  (Plakette + Satz). Der Wortlaut ist gern zu verbessern, solange
  „unvollständig" erhalten bleibt.

**Phase/Thema:** A / Abgleich und Bestandsreihenfolge

**Backlog:** neu unter „hoch": Lieferung vor der Zählung desselben Tages zählt
seit v29 doppelt. Neu unter „mittel": `bestand()` gibt es weiter zweimal, beide
rechnen jetzt nachweislich gleich — die Leitung sollte `/api/bestand` lesen.

**STATUS:** VERBESSERUNGEN — die drei A-Funde sind zu, der Preis von
Entscheidung Nr. 8 ist neu und gehört vor dem Livegang entschieden.

---

### Runde 11 – software-engineer (der Preis von Entscheidung Nr. 8)

**Kritik am Vorgänger (Runde 10, dieselbe Rolle):**
* ↩️ geändert: Entscheidung Nr. 8 („Zählung zuerst") wurde auch auf den
  **Wareneingang** desselben Betriebstages angewandt. Damit wurde eine
  Lieferung, die schon im Keller stand, als gezählt wurde, ein zweites Mal
  addiert — gemessen 34 statt 10. Jetzt konservativ: nicht addieren, sondern
  ausweisen (Entscheidung Nr. 10 der Nacht).
* ❗ **Die Basislinie „274 grün" war nicht stabil.** `tests/modi.test.mjs:194`
  („gleiche Millisekunde … BEKANNT") hing an der Uhr des Rechners und fiel in
  zwei von sechs Läufen — ohne Zutun. Seit v29 war die Prüfung ohnehin
  gegenstandslos. Ersetzt durch eine feste Zusicherung. **Damit ist auch meine
  eigene Abnahme von Runde 10 zu korrigieren: „274 grün" war ein Wert, der
  nicht jedes Mal herauskam.**
* ✅ übernommen: Entnahmen desselben Tages zählen unverändert nach der
  Zählung; die Fälle 1 bis 6 behalten ihre Zahlen, nachgemessen.

**Umgesetzt:**
1. Ein Wareneingang am Zähltag wird nicht mehr auf den gezählten Bestand
   addiert, sondern je Artikel als `unklar` ausgewiesen — wortgleiche Regel in
   `public/leitung.html` und `src/index.js`; `/api/bestand` gibt jetzt
   `{bestand, gezaehlt, unklar}`.
2. Das Backoffice sagt es an der Zahl: ein neutraler Satz über der Tabelle und
   derselbe Satz mit seiner Menge in der Zeile jedes betroffenen Weins — „Am
   Zähltag wurden 24 Flaschen … geliefert — ob die Zählung sie schon enthält,
   ist nicht feststellbar. Sie sind im Bestand nicht mitgerechnet."
3. `tests/reihenfolge.test.mjs` rechnet Worker und Backoffice auch für Fall 7
   gegeneinander, dazu die Gegenprobe „Lieferung NACH dem Zähltag zählt ganz
   normal". `sw.js` v29 → v30.

**Die sieben Fälle, v29 → v30** (Worker / Backoffice):
Fall 1 4/4 → 4/4 · Fall 2 4/4 → 4/4 · Fall 3 —/4 → —/4 · Fall 4 —/4 → —/4 ·
Fall 5 10/10 → 10/10 · Fall 6 4/4 → 4/4 ·
**Fall 7 34/34 → 10/10 mit `unklar {w003: 24}`** · Fall 7b ebenso.

**Geprüft:** `npm test` **275 grün**, von mir **viermal hintereinander**
nachgelaufen (wegen des Flackerns oben) — jedes Mal 275/0.
`durchstich` 35/35 · `ui-leitung-echt` 40/40 · `ui-zweiter-vorgang` 15/15 ·
`ui-fremdgeraet` 10/10 · `LAUF=runde-11 node tests/ui-mass.cjs` alle Urteile ✓.
**Ungeprüft:** echtes Safari/iPad; die neuen Sätze nur als HTML geprüft, nicht
als Bild; `bestellliste` und Mittagsblick wurden nicht angefasst — sie rechnen
auf der niedrigeren Zahl und können eine Bestellung vorschlagen, die gerade
geliefert wurde.

**Für die Nächsten:**
* **Berichtigung meiner eigenen Annahme aus Runde 10:** `vorgang.begonnen`
  trägt **nicht** den echten Zählzeitpunkt. `src/index.js:205` bindet dort
  `jetzt`, also die Ankunftszeit des ersten Pakets (`begonnen = geaendert`
  beim INSERT); die App legt in `blank()` gar keinen Startzeitpunkt ab. Der
  saubere Weg wäre zweiteilig — die App schreibt beim Anlegen einen
  Gerätezeitpunkt in den Vorgang, der Worker führt ihn nach `begonnen` und ins
  Journal. Erst dann ist Fall 7 entscheidbar statt ausweisbar. Umbau, gehört in
  den Morgenbrief.

**Phase/Thema:** A / Bestandsreihenfolge, Wareneingang am Zähltag

**Backlog:** „Lieferung vor der Zählung zählt doppelt" ist mit v30 zu. Neu
unter „mittel": Nachbestellen und Mittagsblick nennen die nicht gerechnete
Menge nicht; erfasster Zählzeitpunkt statt Ankunftszeit.

**STATUS:** VERBESSERUNGEN — Fall 7 ist entschärft und ausgewiesen; offen
bleiben der erfasste Zählzeitpunkt und die Angabe in der Bestellliste.
