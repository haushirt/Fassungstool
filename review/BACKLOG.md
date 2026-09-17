# Backlog

Gesammelte Punkte aus allen Rollen. Erledigtes nicht löschen, sondern nach „Erledigt" verschieben – so bleibt nachvollziehbar, wer was wann behoben hat.

Spalten: Priorität · Rolle (wer hat es gemeldet) · Runde · Punkt · Datei:Zeile

## Hoch

| Rolle | Runde | Punkt | Datei:Zeile |
|---|---|---|---|
| Setup | – | Der Verwaltungs-Editor ist über den Menüknopf „Verwaltung" weiter erreichbar, obwohl Projektanleitung §8 A ihn als aus `index.html` entfernt beschreibt. Doku und Code widersprechen sich. Der Klartext-Code ist seit Runde 1 weg, der Editor selbst nicht. | `public/index.html:1782`, `:1842` |
| software-engineer | 1 | Verwaltungs-Editor nach `leitung.html` umziehen (§9.2 A) und `hh_cfg_v9` von localStorage nach D1 `stamm` heben, damit Glasweine und Soll-Mengen für alle Geräte gelten. Wartet auf `docs/live-schema.sql`. | `public/index.html:1862` → `public/leitung.html` |
| hospitality-pro | 1 | Soll-Mengen und Glasweine kann seit Runde 1 jede Servicekraft ändern (`bekannterCode()`), die Änderung ist ungezeichnet (`oninput`→`saveCfg`, kein Name, keine Zeit, kein Journal) und gilt nur auf einem Gerät. Damit rechnen iPad, iPhone und MacBook mit verschiedenen Soll-Werten – und die Fehlmenge, die jeden Tag aus dem Keller geholt wird, hängt davon ab, wer fasst. Entscheidung: `review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 6. | `public/index.html:1911`, `:1975` |
| hospitality-pro | 1 | Die Sonderentnahme erfasst keinen Grund. Bruch, Personalgetränk, Küche, Verkostung und Zimmer werden betrieblich völlig verschieden behandelt; ohne Grund landet alles im Wareneinsatz Getränke. Der Grund steht heute im optionalen Freitextfeld ganz am Ende – das füllt nach dem Service niemand mehr aus. Entscheidung: `review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 7. | `public/index.html:1361`, `:3746` |
| Setup | – | `ANLAGE_OFFEN` im Dashboard steht seit 01.09. offen – Selbstanlage eines Kontos mit beliebiger Rolle. Nur von dir lösbar (Regel 13). | Dashboard |
| Setup | – | Keine Sicherung der D1. Ein falsches `DELETE` in der Console löscht den Kellerbestand unwiederbringlich (Projektanleitung §8). | Dashboard |
| Setup | – | `docs/live-schema.sql` fehlt im Repo. Ohne die Datei ist harte Regel 3 nicht erfüllbar (lokale Test-DB, Abgleich aller SQL-Stellen). | – |
| Setup | – | `tests/fixtures/` fehlt. QA und Controller können ohne die anonymisierten Z-Berichte und Zählungen nicht rechnerisch prüfen. | – |
| ui-designer | 1 | Im Menü (Startschirm) gibt es keinen Übertragungszustand: `#netz` liegt in `#app` und ist nur während eines Vorgangs sichtbar. Genau dort, nach dem Abschluss, stellt sich aber die Frage „ist es draußen?". Die Statuszeile gehört auch über die Kachelliste. | `public/index.html:1280`, `:1599` |

## Mittel

| Rolle | Runde | Punkt | Datei:Zeile |
|---|---|---|---|
| hospitality-pro | 1 | Das Datum eines Vorgangs lässt sich im Kopf auf jeden beliebigen Tag stellen, auch in die Zukunft, ohne Rückfrage. Eine Tagesfassung auf dem falschen Tag erzeugt einen zweiten Vorgangsschlüssel und wird gegen den falschen Z-Bericht verglichen; in der Leitung sieht das am Morgen aus wie zwei Fassungen. Mindestens: Rückfrage, wenn das Datum mehr als einen Tag vom Vorschlag abweicht, und kein Datum in der Zukunft. | `public/index.html:4277` |
| hospitality-pro | 1 | Die Hilfe zum Restaurant-Schritt nennt feste Soll-Mengen im Fließtext („Soll: 3 Flaschen, je 2 bei Riesling, Rosé, Cuvée Weiss und Naturwein weiss"). Sobald die Leitung ein Soll ändert, widerspricht die Hilfe dem, was auf dem Schirm steht. Zahlen aus den Daten holen oder weglassen. | `public/index.html:1377` |
| hospitality-pro | 1 | Die Hilfe zum vierten Schritt der Tagesfassung heißt „Fassungsliste fotografieren", der Schritt heißt „Abschluss". Wer im Abschluss auf das Fragezeichen tippt, bekommt eine Foto-Anleitung statt einer Auskunft darüber, was „Fertig – Protokoll erstellen" auslöst. Mit Projektanleitung §8 C (Foto raus, Vortagsabgleich rein) gemeinsam anfassen. | `public/index.html:1380` |
| hospitality-pro | 1 | Zwei Wörter für denselben Gang: In der Tagesfassung heißt der Schritt „Keller", im Nachfüllen „Holen". Es ist derselbe Weg nach unten. Ein Wort wählen. | `public/index.html:1366`, `:1367` |
| Setup | – | `review/INPUT-TEAM.md` ist noch leer. Team-Anliegen haben laut `CLAUDE.md` Vorrang vor eigenen Ideen. | `review/INPUT-TEAM.md` |
| software-engineer | 1 | Die Offline-Queue bleibt bei einem dauerhaften 4xx stehen: Ein Paket, das der Server immer wieder mit 400/422 ablehnt, hält alle nachfolgenden Vorgänge auf und meldet nur „Server antwortet nicht". Stilles Verwerfen verbietet Regel 6 – also Sackfach plus sichtbarer Hinweis. Entscheidung nötig. | `public/index.html:1494` |
| software-engineer | 1 | `vorgangSchreiben` prüft nicht, ob der Pfad-Schlüssel zu `daten.mode`/`daten.tag` passt. Bei einer Abweichung stehen Spalte `tag` und Kennung auseinander – die Datumsfilter der Leitung und der Wochenbrief rechnen dann am falschen Tag. Erst nach dem Punkt darüber umsetzbar (422 würde die Queue blockieren). | `src/index.js:170` |
| software-engineer | 1 | Kein Testgerüst im Repo (§10: Prüfserver, Mehrgeräte- und Gestaltungslauf). `node_modules` fehlt, `src/index.js` lässt sich lokal nur mit einer `postal-mime`-Attrappe importieren. | – |
| ui-designer | 1 | `askPin`, `#pinIn`, `.input--pin`: Der Verwaltungsdialog heißt im Code weiter „PIN", in der Oberfläche „persönlicher Code". Für den Nutzer unsichtbar, für den nächsten Leser irreführend — umbenennen, wenn der Editor ohnehin nach `leitung.html` zieht. | `public/index.html:1894` |
| ui-designer | 1 | Der Menüknopf heißt „Verwaltung", der Dialog dahinter regelt Glasweine und Soll-Mengen. Ein Wort, das nichts verspricht. Beim Umzug ins Backoffice besser „Glasweine und Soll-Mengen". | `public/index.html:1831` |
| ui-designer | 1 | Dialoge mit Code-Feld (`.card2`, `max-height:88vh`) können mit offener Zifferntastatur länger sein als der sichtbare Bereich — der Knopf „Freigeben" landet dann hinter der Tastatur. Betrifft vor allem die Freigabe mit vielen offenen Punkten. Braucht einen Browsertest auf echtem Gerät. | `public/index.html:749` |
| ui-designer | 1 | `.ov` ist kein Dialog im Sinne des Browsers: kein `role="dialog"`, kein `aria-modal`, keine Escape-Taste, kein Fokuskäfig. Das Hilfe-Sheet daneben hat alles davon. | `public/index.html:1289` |

## Niedrig

| Rolle | Runde | Punkt | Datei:Zeile |
|---|---|---|---|
| hospitality-pro | 1 | Kistengröße für Ott (w003) ist mit 12 angenommen, nicht geprüft (Projektanleitung §8). Beim nächsten Wareneingang am Lieferschein nachsehen – eine falsche Kistengröße verdoppelt oder halbiert den Zugang still. | `src/stamm.json` |
| software-engineer | 1 | `versuche: 0` im Ausgangseintrag wird nie hochgezählt und nie gelesen – toter Code. Entweder Zählung führen und im Netz-Chip zeigen oder Feld streichen. | `public/index.html:1470` |
| software-engineer | 1 | Verwaltung und Freigabe hängen jetzt an `hh_bekannt_v1`. Wird der Speicher des Geräts geleert, sind beide bis zur nächsten Anmeldung mit Netz gesperrt. Im Keller ohne Netz fällt das auf. | `public/index.html:1291` |
| ui-designer | 1 | `--danger` (#B4471F) als Textfarbe auf Cream ergibt 4,4:1 und liegt damit unter dem Schwellwert für kleine Schrift. `.pinfehler` ist umgestellt, andere Stellen (`.mi .when`, `.explesser button.del`) nicht — die sind 11–13px groß. | `public/index.html:360`, `:314` |
| ui-designer | 1 | Der Zustand „Nicht angemeldet" ist nicht anfassbar: die Statuszeile sagt, was zu tun ist, führt aber nicht hin. Ein Knopf „Neu anmelden" wäre der kurze Weg. | `public/index.html:1599` |

## Erledigt

| Rolle | Runde | Punkt | Erledigt in |
|---|---|---|---|
| Setup | 1 | Verwaltungscode `const PIN` im Klartext in der ausgelieferten App (Regel 9). Konstante und Erwähnung im Kommentar entfernt; Verwaltung prüft jetzt `bekannterCode()`. | `public/index.html:1842` |
| Setup | 1 | Abschluss-Freigabe über den Klartext-Code übersteuerbar. Es zählt nur noch ein Zugangscode, der auf diesem Gerät schon einmal angemeldet war. | `public/index.html:3726` |
| software-engineer | 1 | Anmeldesperre nach §9.1 C: 10 Versuche, `uebrig` bei 401, `wartenBis` bei 429, Erfolg räumt die Fehlversuche der IP weg. | `src/index.js:99`, `:131`, `:137` |
