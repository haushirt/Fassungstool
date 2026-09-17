# Fassungstool — Projektanleitung

**Haus Hirt, Bad Gastein · Stand 16.09.2026**
Ersetzt die Fassung vom 01.09.2026 vollständig.

---

## 1 · Wo das Projekt steht

**Das Tool läuft mehrgerätig.** Bis Mitte September schrieb die App
ausschließlich in den `localStorage` des jeweiligen Geräts und gab das
Ergebnis per Mail weiter — null Netzaufrufe. Das MacBook sah nie, was am
iPad gefasst wurde. Jetzt überträgt die App an den Worker, und die
Leitung liest vom Server.

| | |
|---|---|
| GitHub | `haushirt/Fassungstool`, privat |
| Worker | `fassungstool.ikrathc.workers.dev` |
| D1-Datenbank | `fassung`, Region WEUR |
| Database ID | `2e0490ca-2b9d-40a7-a45c-a207a9447e91` |
| Plan | Cloudflare **Free** — reicht mit weitem Abstand, siehe 4 |
| Deploy | **automatisch** seit 16.09., siehe 6 |

**Fertig:** Repo, Worker, D1, Anmeldung, vier Personen, Übertragung
Gerät → Server, Begrüßung aus den Vorgängen des Tages, Mail-Import des
Z-Berichts, echter Service Worker, gemeinsame Gestaltungsschicht, Auto-Deploy.

**⚑ Offen, dringend:** `ANLAGE_OFFEN` im Dashboard löschen. Solange die
Variable steht, kann jeder, der die Adresse kennt, sich selbst ein Konto
mit beliebiger Rolle anlegen. Das ist das einzige echte Loch im Projekt
und steht seit dem 01.09. offen.

---

## 2 · Die vier Personen

| Name | Rolle | Code |
|---|---|---|
| Casimir | `leitung` | — |
| Asad Karakiri | `service` | — |
| Ian Lauchbein | `service` | — |
| Marinus | `wirtschaft` | — |

**Die Codes stehen nicht mehr im Quelltext.** Bis v11 lagen sie als
`const USER={…}` in einer öffentlich ausgelieferten Datei — wer die
Adresse kannte, konnte alle vier lesen. Die Anmeldung läuft jetzt über
`/api/anmelden`. Für den Keller ohne Netz merkt sich das Gerät als
SHA-256-Prüfsumme, wer sich hier schon einmal erfolgreich angemeldet hat
(`hh_bekannt_v1`).

**Folge:** Ein Gerät muss sich einmal mit Netz angemeldet haben. Wird
der Browserspeicher gelöscht, ist es wieder ein fremdes Gerät.

---

## 3 · Wie die Übertragung funktioniert

**Ein Vorgang ist ein vollständiger Zustand, kein Zuwachs.** Er trägt
den Schlüssel `<modus>_<tag>` und geht per `PUT /api/vorgang/<schlüssel>`
an den Server. Derselbe Schlüssel schreibt dieselbe Zeile — doppeltes
Senden nach einem Netzabbruch kann keine Geistervorgänge erzeugen.

**Der Ausgang.** Jedes Gerät hält eine Warteschlange
(`hh_ausgang_v1`) mit höchstens einem Eintrag je Schlüssel: Der neuere
ersetzt den älteren restlos. Kein Netz heißt „1 Vorgang wartet" in der
Kopfleiste; sobald es zurück ist, geht er raus. Kein Server heißt: Die
App verhält sich wie vorher und blendet die Anzeige aus.

**Zwei Leute am selben Vorgang** werden gefragt, nicht zusammengerechnet.
Jedes Gerät zählt je Vorgang eine Zählnummer hoch; wer den Vorgang
öffnet und auf dem Server einen höheren Stand findet, bekommt die Frage
„Auf einem anderen Gerät weiter?". Ein stiller Merge würde den Bestand
verderben, ohne dass es jemand merkt.

**Was im Vorgang mitreist:** `geraet`, `zaehlnr`, `name`, `zeit`. Der
Worker legt beim Lesen `id`, `tag`, `mode`, `name`, `finished` und
`archiviert` darüber — `GET /api/vorgaenge` liefert also flache Objekte.

**Was nicht überträgt:** Fotos. Die bleiben in der IndexedDB des Geräts;
im Paket steht nur ihr Schlüssel. Die größte gemessene Nutzlast — eine
vollständige Kellerzählung über alle 57 Weine — wiegt 1 953 Byte.

---

## 4 · Speicher und Grenzen

D1 kostenlos: **5 GB**, 5 Millionen gelesene und 100 000 geschriebene
Zeilen pro Tag. Seit 1. September 2026 sind das **harte** Grenzen — wird
eine gerissen, schlagen die Abfragen bis Mitternacht UTC fehl.

Bei drei bis fünf Vorgängen am Tag sind das rund **2,5 MB im Jahr**. Der
kostenlose Tarif ist für dieses Haus nicht knapp, sondern grotesk
großzügig.

**Der eine Punkt, der wachsen kann:** `bestand()` im Worker liest die
gesamte `ereignis`-Tabelle, jedes Mal, ungefiltert. Heute ein paar
hundert Zeilen, nach einer Saison Zehntausende. Vorsorge, zwei Zeilen:

```sql
CREATE INDEX IF NOT EXISTS ereignis_artikel_ts ON ereignis(artikel, ts);
CREATE INDEX IF NOT EXISTS ereignis_tag ON ereignis(tag);
```

---

## 5 · Der Ist-Stand der Datenbank

**`schema.sql` im Repo ist VERALTET.** Die laufende Datenbank ist neuer.
Wer die Datei ausführt, erzeugt Tabellen, gegen die der Worker nicht
läuft. **Nicht anfassen, nicht ausführen.**

Die neun Tabellen: `person`, `anmeldeversuch`, `vorgang`, `ereignis`,
`fassungsliste`, `fassungszeile`, `mapping`, `stamm`, `_cf_KV`.

Der tatsächliche Stand, jederzeit in der D1-Console:

```sql
SELECT name, sql FROM sqlite_master WHERE type='table';
```

**Dazu am 16.09. angelegt und ungenutzt:** die Tabellen `idem` und
`zbericht` sowie die Spalten `schluessel`, `zaehlnr`, `geraet` auf
`vorgang`. Sie stammen aus einem Entwurf, bevor klar war, dass der
Worker beides bereits anders löst — Idempotenz über die `id` des
Vorgangs, Z-Berichte über `fassungsliste`/`fassungszeile`. Sie stören
nicht. Wer aufräumen will: `DROP TABLE idem; DROP TABLE zbericht;`

---

## 6 · Welche Datei wofür

| Änderung | Datei |
|---|---|
| App am iPhone/iPad: Kacheln, Laden, Farben, Fassungsablauf, Gestaltung | `public/index.html` |
| Backoffice: Mittagsblick, Auswertungen, Speicher, Gestaltung | `public/leitung.html` |
| Offline-Vorrat | `public/sw.js` |
| Symbol für den Startbildschirm | `public/icon.png` |
| Server: Endpunkte, Rechte, Anmeldung, Mailempfang | `src/index.js` |
| Z-Bericht einlesen / zuordnen | `src/gnparse.js`, `src/gnmap.js` |
| Neuer Wein, neues Getränk | `src/stamm.json` |
| **nicht anfassen** | `schema.sql` |

**Vier Dateien in `public/`, nicht mehr.** `tokens.css` und
`leitung.css` gab es kurzzeitig — sie sind wieder weg. Ohne Bauschritt
muss eine ausgelagerte CSS-Datei von Hand mitgeliefert werden, und fehlt
sie, fällt jeder Wert im seiteneigenen Stylesheet auf den Browser-Standard
zurück: Die Seite steht dann nackt da. Die Gestaltungsschicht steckt
deshalb **wortgleich in beiden HTML-Dateien**, mit einem Kasten obendrauf,
der darauf hinweist.

**Deploy läuft automatisch** seit dem 16.09. Vorher stand im Build
*Manually deployed* — die Git-Verbindung war schlicht nie verbunden
(Workers Builds → Settings → Build → Connect). Committen ist jetzt
Deployen.

**iPhone lädt aus dem Zwischenspeicher.** Zum Prüfen den Safari-Tab
schließen und neu öffnen, nicht nur neu laden. Nach jeder Änderung an
einer der vier Dateien die `VERSION` in `sw.js` erhöhen.

**Observability** ist im Dashboard eingeschaltet, steht aber nicht in
`wrangler.jsonc` — kann bei einem Deploy verlorengehen:

```jsonc
"observability": { "logs": { "enabled": true, "invocation_logs": true } }
```

**⚑ Seit Auto-Deploy gilt:** Alles, was nur im Dashboard eingetragen ist
— D1-Bindung, `ASSETS`, `ABSENDER`, Crons — kann ein `wrangler deploy`
entfernen, wenn es nicht in `wrangler.jsonc` steht. Echte Geheimnisse
wie `TOKEN_SECRET` bleiben Dashboard-Secrets und überleben.

---

## 7 · Was am 16.09. gebaut wurde

**Gestaltung.** Haus-Hirt-Teal `#004947` und Cream `#ECE9E2` statt
neutralem Warmgrau, Barlow und Cormorant Garamond mit Systemstack als
Rückfall (die vier `woff2`-Dateien unter `/fonts/` fehlen noch — ohne sie
greift die Systemschrift und alles funktioniert). Das Hauszeichen — der
Hirte mit dem Hund — als Vektor auf der Anmeldung.

**Bedienung.** Die vier Schrittreiter wurden bei 390 px rechts
abgeschnitten; jetzt eine Fortschrittszeile mit Punkten. Die zwei
Dauer-Hilfezeilen liegen in einem Sheet hinter dem Fragezeichen — das
spart rund 180 px. Anmeldung mit Ziffernblock. Der Winzer steht als
kleine Vorzeile über dem Wein, die Zählpunkte sind Ringe statt schwarzer
Flächen. „Noch offen" ist eine antippbare Liste, die zur Station springt.

**Laden.** Alle sechs messen sich jetzt an der Lade und wachsen mit dem
Schirm — vorher hingen 2 und 3 an einer festen Fensterformel, und im
Bar-Schritt bekam eine einzelne Lade nur die halbe Breite. Es gilt **ein
Maß für alle**: Jede Lade rechnet, was hineinpasst, der kleinste Wert
gewinnt, damit die Größe beim Weiterblättern nicht springt.

**Datenkorrektur:** In Lade 3 stand Dürnberg (w045), in `PLAN.bar`
Fritsch (w043). Die Lade hat jetzt Fritsch.

---

## 8 · Der Weg von hier

**⚑ Sofort:** `ANLAGE_OFFEN` löschen.

**Vier Änderungen im Worker**, ausformuliert in `WORKER-ANPASSUNG.md`
und `ANMELDESPERRE.md`:

1. 409-Guard in `vorgangSchreiben`. Ohne ihn überschreibt ein Gerät, das
   im Flugmodus lag, beim Aufwachen den neueren Stand — ohne Fehler,
   ohne Meldung.
2. Anmeldesperre: 10 Versuche statt 5, `uebrig` und `wartenBis` in der
   Antwort, Fehlversuche bei erfolgreicher Anmeldung löschen. Die Sperre
   zählt pro **IP**, und im Haus teilen sich alle Geräte eine — fünf
   Fehlversuche waren nicht fünf pro Person, sondern fünf für alle.
   Die App ist bereits darauf eingestellt.
3. Die zwei Indizes auf `ereignis` (Abschnitt 4).
4. `RUNDEN` von 1000 auf 100000. Die CPU-Diagnose vom 27.08. war
   widerlegt. Heraufsetzen heißt: **alle vier Personen neu anlegen**,
   weil die Prüfsummen nicht mehr passen. Also vor dem Start.

**Drei Stücke in der App**, noch nicht gebaut:

*A · Verwaltung ins Backoffice.* Der Editor für Glasweine und
Soll-Mengen saß in `index.html` hinter einer PIN. Er ist dort entfernt
und in der Leitung noch nicht nachgebaut — Glasweine und Soll-Mengen
lassen sich derzeit **nicht ändern**.

*B · „Leer" ankreuzen.* Häkchen setzt den Bestand auf 0, merkt sich
„ausgegangen", und die Leitung bekommt daraus eine eigene Zeile
„unbedingt nachbestellen".

*C · Fassungsliste raus, Vortagsabgleich rein.* Der Fotoschritt fällt
weg, auch der Kacheltext „Liste fotografieren". An seine Stelle kommt im
Abschluss der Tagesfassung ein Fenster mit den Zeilen, bei denen die
Entnahme von gestern und der verkaufte Ausschank um mindestens eine
Flasche auseinanderliegen. Die Daten liegen bereit:
`GET /api/fassungsliste?tag=…` liefert die Positionen samt
Artikelzuordnung. Damit fällt auch das Protokoll weg — das Mitspeichern
läuft ohnehin laufend über den Server.

**Danach:** die sechs Produkte ohne Stammdaten, Storno-Behandlung,
Cocktail-Rezepturen, Kistengröße Ott (w003, angenommen 12). Erst nach
zwei bis drei Wochen echter Daten.

**Und eine Hausaufgabe ohne Eile:** Es gibt keine Sicherung der
Datenbank. D1 hat keinen Papierkorb — ein falsches `DELETE` in der
Console, und der Kellerbestand ist weg.

---

## 9 · Grundsätze, die tragen

- **Ereignisjournal, append-only.** Korrekturen sind neue Zeilen, nie
  Änderungen am Bestehenden. Der Bestand fällt daraus ab.
- **Offline ist der Normalfall, nicht die Ausnahme.** Im Weinkeller gibt
  es kein Netz. Alles muss ohne Server funktionieren und nachreichen.
- **Die Codes sind Identifikation mit Rechten, kein Schutz.** Der echte
  Schutz ist die Sperre nach zu vielen Fehlversuchen.
- **Automatische Zuordnung von Getränken bleibt aus.** Bei Weinen über
  Rebsorten-Kürzel trifft sie 14 von 14; bei Getränken liefert die
  Ähnlichkeitssuche überzeugend falsche Treffer, die den Bestand
  stillschweigend verderben würden. Absicht, keine Lücke.
- **Zwei Geräte am selben Vorgang: fragen, nicht mischen.**
- **`/api/` wird nie zwischengespeichert.** Ein alter Bestand aus dem
  Cache wäre schlimmer als gar keiner.
- **Bei jedem Serverfehler: erst Logs, dann Hypothese.**
  Observability → Logs → Live → Aufruf wiederholen.

---

## 10 · Diagnose in dreißig Sekunden

```
https://fassungstool.ikrathc.workers.dev/api/ping
```

| Antwort | Ursache |
|---|---|
| HTML statt JSON | `run_worker_first` fehlt in `wrangler.jsonc` |
| `D1-Binding fehlt` | Database ID falsch oder Bindung nicht in `wrangler.jsonc` |
| `"personen":0` | Tabelle leer, niemand kann sich anmelden |
| `error code: 1101` | Ausnahme im Worker → Logs lesen |

**Kommt man nicht ins Backoffice?** `/api/ich` im selben Browser
aufrufen. `{"name":…}` heißt angemeldet; `{"fehler":"nicht angemeldet"}`
heißt: erst über `index.html` anmelden, dann `leitung.html`. Die Leitung
hat keine eigene Anmeldung, sie lebt vom Cookie.

**Steht in der Leitung „Lokal" statt „Server"?** Dann antwortet
`/api/vorgaenge` nicht, und sie liest den Browserspeicher desselben
Geräts.

**Ausgesperrt?** In der D1-Console:

```sql
DELETE FROM anmeldeversuch WHERE ok = 0;
```

**Seite sieht nackt aus?** Dann läuft eine alte Fassung, die noch auf
`tokens.css` verweist. Die vier aktuellen Dateien aus `public/` hochladen.
