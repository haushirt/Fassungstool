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
