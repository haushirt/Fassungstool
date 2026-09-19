# Protokoll · Runde 16 · Nachtlauf 18./19.09.2026

Ausgangsstand **`ac8d93a`** (`sw.js` v38, live) → Endstand **`62eb37b`**
(`sw.js` v56) auf `claude/runde16`. Pull Request
[#5](https://github.com/haushirt/Fassungstool/pull/5).

Zeitstempel sind Commit-Zeiten auf `claude/runde16` (UTC). Was vor dem
ersten Commit liegt — Unterlagen lesen, Teil A und Teil B bauen — ist
nicht einzeln belegbar; es steckt in `1ca61e4`.

---

## 1 · Zeitleiste

### Bau und erste Prüfung

| Zeit | Commit | Was |
|---|---|---|
| — | | Unterlagen gelesen (`PROJEKTANLEITUNG`, `UEBERGABE-TECHNISCH`, `CLAUDE.md`), Branch `claude/runde16` von `main` |
| **00:26** | `1ca61e4` | **Teil A und Teil B gebaut.** A1 (Abmelden ruft `POST /api/abmelden`), A2 (Code-Dopplung in `personSchreiben`), B1 (Sperrmeldung aus demselben Maß), B2 (nicht schreibbarer Speicher), B3 (Freigabe fragt den Server: neuer Endpunkt `POST /api/code`), B4 (neuer PIN geht bei Abbruch nicht verloren), B5 (Unterlagen + `PIN_LAENGE`). Dazu R16-1 bis R16-4: `touch-action: manipulation`, Felder ≥ 16 px; Abschluss auf **einen** Knopf; Gruppentöne getauscht; „Verbunden" |
| 00:31 | `758938f` | Papiere: `ERGEBNIS.md`, `LOG.md`, `BACKLOG.md`, `MORGENBRIEF.md` |
| 00:35 | `b55d6ca` | Erster Messlauf abgelegt |
| 00:36 | `3ac0ef0` | **qa-guardian, 1. Durchgang:** 401 ist nicht gleich 401 im Code-Nachschlag — behoben |
| **00:47** | `131e8be` | **qa-guardian: VETO.** Punkt 4b (Abschluss nur mit Verbindung) blockierte auch die **Kellerzählung**, die derselbe Auftrag unter „Nicht anfassen" führt. Die 1. Jagd hatte denselben Punkt unabhängig als A gemeldet |
| **00:57** | `8bd775b` | **Vier A-Funde behoben**, darunter: der Abgleich rechnete nicht und meldete trotzdem „Keine Abweichung"; die Freigabe verbrannte Anmeldeversuche; eine vorgemerkte Abmeldung fiel der nächsten Anmeldung zum Opfer. **Punkt 4b entfernt** — Abweichung dokumentiert |
| 01:01 | `06dbd16` | Messlauf grün |

### Die Jagdschleife

| Zeit | Commit | Jagd | Befund und Behebung |
|---|---|---|---|
| 01:27 | `366ab97` | **2.** | `verkaufteFlaschen()` rechnete Gläser als Flaschen („ein 2-cl-Stamperl wurde zur Flasche"); der Abschluss hing am schweigenden Server |
| 01:49–02:12 | `79d8bc7`, `4197aef` | **3.** | Jede Anfrage bekommt eine Frist, die hält. `kurz()` im Backoffice gab die `Response` zurück und räumte die Uhr, sobald der **Kopf** da war — „PIN zurücksetzen" hing danach unbegrenzt, während der neue Code am Server schon stand |
| 02:29 | `53ee4b9` | **4.** | Differenz **mit Vorbehalt** statt grüner Plakette |
| 02:48 | `c3560ed` | **5.** | Der Quantor zeigte in die falsche Richtung („mind." statt Obergrenze). Neu: die Kennung am Menschen, damit ein zweiter Anlauf nach abgebrochener Frist keine zweite Person anlegt |
| 03:13 | `7d35bae` | **6.** | Kennung am Menschen statt am Formularinhalt; Artikelname auf eigener Zeile; Ursachen im Backoffice getrennt |
| 03:52 | `64f4bf4` | **7.** | **A:** `const nKennung={}` stand **in** `vTeam()` — `zeichne()` löschte es bei „Aktualisieren", bei jedem Seitenwechsel und bei einem `storage`-Ereignis. Auf Modulebene gehoben, in `sessionStorage` gespiegelt |
| 04:26 | `c61ed70` | **8.** | **B:** geteilt wurde nach der Ursache, der Bildschirm kennt drei Zustände (angekündigt 23, sammelbar 12). Gemeinsame Bedingung `sammelbar()`. **B:** `sessionStorage` ist je Tab → `localStorage` + **Namenswächter im Worker**. **qa-guardian, 2. Durchgang: FREI** |
| 05:00 | `94d1832` | **9.** | **A:** die CSV „Ohne Zuordnung" wies die Stückzahl **eines Tages** aus, während die Ausfuhr über das Fenster geht (136 statt 952). **B:** Wächter mit Leerraum/NBSP/NFD umgehbar. **B:** die 409-Meldung stand 2,2 s in einer Sprechblase, bei 390 px ein Kreis von 195 × 208 px |
| 05:34–05:44 | `fb10168`, `216b7aa` | **10.** | **A: Der Namenswächter feuerte nie.** Das Formular schickte die gefundene `id` mit → `ON CONFLICT(id) DO UPDATE` schrieb die Zeile um: Code tot, Rolle zurück auf „Service", Sperre aufgehoben, **die einzige Leitung stufte sich selbst ab**. **qa-guardian, 3. Durchgang: VETO** für denselben Fund + drei Einwände (u. a.: mein „die Absage steht über dem Formular" war schlicht falsch, sie stand darunter) |
| **06:30** | `b90934e` | **11.** | **A:** Die Absage hing an `LEUTE` — und die Liste ist leer, wenn `hole()` in die Frist läuft. Kennung trägt jetzt `{id, ok}` |
| **06:40** | `379f2e5` | — | ⚠️ **Mein Fehler:** Ich hatte `b90934e` gepusht, **ohne den Lauf abzuwarten** — drei Prüfungen in `ui-runde16.cjs` Szene 8 waren rot. Sie prüften zu Recht rot: sie maßen noch das alte Verhalten. Nachgezogen |
| **07:49** | `23d262b` | **12.** | **A:** `ok:false` wurde **nie** fortgeschrieben — die Falle blieb unbegrenzt scharf. `kennungHeilen()` + 30-Minuten-Frist. **Die wichtigste Kritik der Nacht:** meine Prüfungen zählten **Pakete, nie Zeilen** — daran ist derselbe Fund zwei Runden lang durch grüne Urteile gelaufen. Beide Prüfserver führen seither Zeilen |
| 08:29 | `a852e25` | **13.** | **0 A · 0 B · 7 C — STATUS FERTIG.** Drei C ließen einen **falschen Satz** auf dem Schirm; alle sieben gebaut |
| **09:06** | `3b45b19` | — | **qa-guardian, 4. Durchgang: FREI für `a852e25`**, Veto aufgehoben, Kernfall am echten Worker gegen `docs/live-schema.sql` nachgemessen. Dazu: `tests/durchstich.cjs` war **tot** (seit Runde 15) und galt laut Unterlagen als Tor vor dem Livegang → wiederbelebt, **35/35**. Vier Reibungspunkte in den Morgenbrief |
| 09:07 | `62eb37b` | — | PR-Beschreibung, Pull Request #5 |

**Summe:** 13 Jagden, 4 Schlusskontrollen, 2 Vetos (beide aufgehoben),
~38 Commits, `sw.js` v38 → v56 (18 Erhöhungen).

---

## 2 · Warum neun Stunden

### Die Rechnung

Die Schleife war **sequenziell** und ihre Taktzeit lag bei **45 bis 70
Minuten**:

```
Jagd (15–42 min) → ich baue (10–30 min) → Gesamtlauf (25–35 min) → nächste Jagd
```

Dreizehn Takte × ~55 min ≈ **12 Stunden Arbeit**, durch Überlappung auf
~9 Stunden Wanduhr gedrückt. Gemessene Einzelzeiten der Agenten, soweit
protokolliert: Jagden 14–42 min (Summe der sechs letzten: 2 h 28),
Schlusskontrollen 14–31 min (Summe der vier: 1 h 37). Ein voller
Prüflauf — neun Browsersuiten plus `ui-mass` — dauert 25–35 Minuten, und
ich habe ihn **elfmal** gefahren.

### Wohin die Zeit wirklich ging

| Anteil | Grob | Warum |
|---|---|---|
| **Prüfläufe** | ~40 % | Jede Änderung in `public/` erzwingt `VERSION`-Erhöhung und damit einen vollen Lauf. Ich habe nach **jeder** Runde alles gefahren statt gezielt |
| **Prüfagenten** | ~30 % | 17 Agentenläufe, überwiegend nacheinander |
| **Eigentliches Bauen** | ~20 % | Die Änderungen selbst waren meist klein — zehn bis dreißig Zeilen |
| **Nacharbeit an Prüfungen** | ~10 % | Nach jeder Verhaltensänderung mussten meine eigenen Prüfungen nachgezogen werden |

### Wo ich im Kreis gelaufen bin — und warum

**Der teuerste Kreis: fünf Runden für einen Fund.** „Das Anlegen-Formular
überschreibt eine bestehende Person" habe ich in `fb10168`, `b90934e`,
`23d262b` und `a852e25` behoben — viermal, und dreimal davon hielt es
nicht. Die Ursache war nicht Schlamperei beim Bauen, sondern **mein
Prüfgerüst**: Es zählte **Pakete**, nicht Zeilen. „Nichts geschrieben"
und „dieselbe Zeile still überschrieben" sehen an einem Paketzähler
identisch aus. Ich konnte mit meinen eigenen Mitteln also gar nicht
sehen, ob eine Behebung greift — der Jäger musste es jedes Mal von außen
am echten Worker finden. Ab `23d262b` führen beide Prüfserver Zeilen; die
nächste Runde war sauber.

**Der zweite Kreis: die Ebene zu früh aufhören.** Dreimal in Folge lautete
der Befund „zwei Stellen reden über dieselbe Menge und rechnen
verschieden" — Mittagsblick gegen Überschrift, dann Überschrift gegen
Sammelknopf, dann Navigationszahl gegen die Seite dahinter. Ich habe
jedes Mal die gemeldete Stelle repariert statt die **Klasse**. Erst in
Runde 12 gab es eine gemeinsame Zählstelle; danach war die Familie tot.

**Der dritte Kreis: meine eigenen Prüfungen als Bremse.** Nach jeder
Verhaltensänderung waren drei bis sechs eigene Urteile rot — nicht weil
der Code falsch war, sondern weil sie das alte Verhalten festschrieben.
Einmal habe ich das erst **nach dem Push** bemerkt (`b90934e` → `379f2e5`).

**Zwei Prozessfehler, die mir anzurechnen sind:**

1. **Ich habe im selben Arbeitsbaum gebaut, während der qa-guardian maß** —
   und für eine Gegenprobe kurz eine alte Fassung über eine Datei
   geschrieben. Seine Messungen aus diesem Fenster waren wertlos; er hat
   es zu Recht gerügt. Danach: erst bauen und committen, dann prüfen
   lassen, nichts dazwischen.
2. **Ich habe gepusht, bevor der Lauf durch war** — mit drei roten
   Prüfungen im Branch. Zwölf Minuten später behoben, aber der Stand war
   zwölf Minuten lang falsch.

### Was den Lauf verkürzt hätte

**An deinem Auftrag:**

* **„Jäger ohne A/B" ist eine Schleife ohne Boden.** Jede Jagd findet
  etwas — das ist ihre Aufgabe. Ab der **achten** Jagd gab es **kein A
  mehr, das aus der Runde selbst stammte**; die späteren A-Funde waren
  Folgefehler meiner eigenen Behebungen, und die letzten Jagden fanden
  fast nur noch C. Eine Obergrenze („höchstens vier Runden, Rest in den
  Backlog") oder ein Schweregrad-Tor („nur A blockt den Merge") hätte
  hier **drei bis vier Stunden** gespart.
* **Jäger *und* qa-guardian nach jeder Runde** verdoppelt die Taktzeit.
  Der qa-guardian ist als Schlusskontrolle wertvoll — nach jeder Runde
  ist er Luxus.
* **Zwei widersprüchliche Vorgaben:** „Punkt 4b: Abschluss nur mit
  Verbindung" gegen „Kellerzählung nicht anfassen". Das kostete die erste
  Runde plus ein Veto. Ein Satz mehr im Auftrag („4b gilt nur für
  Tagesfassung und Nachfüllen") hätte es erledigt.
* **„Belege in 320/375/390/430 px" nach jeder Runde** — der Messlauf ist
  der teuerste einzelne Schritt. Einmal am Ende hätte gereicht.

**An meinem Vorgehen:**

* **Das Prüfgerüst zuerst gegen die Wirklichkeit bauen** (Zeilen, echter
  Worker, echtes Schema). Das hätte mindestens drei Runden gespart — es
  war der einzige strukturelle Fehler der Nacht.
* **Die Klasse beheben, nicht den Fall.** Beim ersten „zwei Stellen
  rechnen verschieden" alle Stellen suchen.
* **Gezielt prüfen statt alles.** `npm test` plus die zwei betroffenen
  Suiten nach jeder Runde, der volle Lauf einmal vor dem Merge.
* **Mehrere Befunde in einem Zug beheben** statt einer pro Takt.
* **Nie pushen, bevor der Lauf durch ist. Nie bauen, während geprüft wird.**

---

## 3 · Was sich ändert · `ac8d93a` (v38) → `62eb37b` (v56)

### Für die Servicekraft am iPhone — Schritt für Schritt

**Anmelden.** Sieht gleich aus: vier Felder, die vierte Ziffer schickt
von selbst ab. Anders ist, was bei einem Fehler passiert. Die Sperrmeldung
sagte bisher in **allen** Stufen „15 Minuten" — auch wenn es 30 oder 60
waren — und zählte die Restversuche anders als die Sperre selbst. Jetzt
kommt beides aus derselben Rechnung. Ein leeres oder krummes Feld kostet
keinen Versuch mehr (vorher hätten zwölf ungeduldige Tipper das ganze
Haus gesperrt, weil die Sperre je Netzanschluss zählt). Und in einem
privaten Fenster sprang die Anmeldung stumm auf Anfang zurück — jetzt
steht da, was los ist.

**Die Startseite.** Drei Dinge fallen auf:
* **Die Farben sind getauscht.** Service ist jetzt der kräftigste Ton,
  Bestand der zurückhaltendste. Was man im Dienst braucht, springt zuerst
  ins Auge.
* **Oben steht „Verbunden"**, wo vorher „Nichts liegt mehr auf diesem
  Gerät" stand. Die Frage ist die Leitung, nicht der Speicher.
* **Ganz unten ein neuer Block „WENN ETWAS KLEMMT"** mit „Rohdaten sichern
  (JSON)" und „Zurücksetzen". Das ist auch das **Erkennungszeichen**: Steht
  er nicht da, läuft noch die alte App.

**Zoom.** Der Doppeltipp zoomt nicht mehr — beim schnellen Tippen auf
Zählpunkte sprang der Schirm bisher. Zwei Finger zoomen weiter. Und kein
Eingabefeld ist mehr unter 16 px, weil iOS sonst beim Antippen
hineinzoomt und nicht wieder heraus.

**Durch die Fassung.** Unverändert. Zählen, Laden, Fotos — alles wie
gehabt.

**Der Abschluss — hier ist der größte Unterschied.** Vorher standen dort
vier Wege: „Protokoll senden", „Als PDF sichern", „Auch als CSV", dazu ein
Feld „Notiz (optional)". Jetzt steht dort **ein** Knopf: **„Fertig –
Speichern"**. In jedem Modus.

Was danach kommt, hängt davon ab, ob zum Vorabend ein Z-Bericht da ist:
* **Mit Z-Bericht** öffnet sich das Fenster **Abgleich**: gefasst gegen
  verkauft, **nur die Abweichungen**, und **ein** Notizfeld für alles.
  Speichern → Vorgang zu → Startseite.
* **Ohne Z-Bericht** ein kurzes **Fertig** → Startseite.

Kann für einen Artikel nichts gerechnet werden, steht die Zahl mit
Vorbehalt da — und der Satz daneben sagt, in **welche Richtung** die
Unsicherheit zeigt („die echte Lücke ist kleiner/größer"), statt eine
grüne Plakette zu setzen. Ist **gar nichts** vergleichbar, sagt das
Fenster „Nichts zu vergleichen" statt „Keine Abweichung" — das war bisher
eine Falschaussage gegenüber jemandem, der gerade gezählt hat.

**Im Keller ohne Netz.** Der Knopf ist **nicht** gesperrt. Darunter steht
„**Keine Verbindung – der Abgleich kommt nach**". Die Fassung wird
gespeichert, geht in die Warteschlange und läuft hinaus, sobald Empfang
da ist. Auf der Startseite steht dann „Kein Netz – alles im Gerät
gespeichert" beziehungsweise „Kein Netz – 1 Vorgang wartet". (Warum das
so ist und nicht anders: Abschnitt 4.)

**Abmelden.** Der Knopf hat bisher nur den Speicher des Geräts geleert —
die Sitzung am Server galt **weitere zwölf Stunden**. Am geteilten iPad
hatte die nächste Person damit über `/leitung.html` volle Leitung, samt
„PIN zurücksetzen". Jetzt ruft der Knopf den Server, wartet auf die
Antwort und gibt das Gerät erst danach frei. Ohne Netz wird die Abmeldung
vorgemerkt, **gesagt** und beim nächsten Empfang nachgeholt.

### Für dich im Backoffice

**Ein eigener Ausgang.** Am Fuß der Navigation steht „abmelden". Vorher
gab es dort keinen.

**„Mitarbeiter" ist umgebaut.** Das Formular heißt jetzt **„Neuen
Menschen aufnehmen"** und tut genau das:
* Ein **doppelter Code** wird abgelehnt — geprüft gegen alle anderen
  Personen, auch gesperrte. Vorher gewann beim Anmelden die letzte Zeile,
  und im Journal, das sich nicht ändern lässt, stünde dauerhaft der
  falsche Name an einer Fassung.
* Ein **doppelter Name** wird abgelehnt, vom Formular **und** vom Server.
  Vorher schrieb das Formular die vorhandene Person still um: ihr Code war
  danach tot, ohne dass es jemand erfuhr, ihre Rolle fiel auf „Service"
  zurück, eine Sperre war aufgehoben — und die einzige Leitung stufte sich
  damit **sofort selbst ab**, Rückweg nur über die D1-Konsole.
* Bricht die Verbindung beim Anlegen ab, entsteht **kein** zweiter
  Eintrag: Das Fenster merkt sich, welche Kennung es einem Namen gegeben
  hat, und wiederholt denselben Anlauf. Sobald der Server bestätigt hat,
  schreibt dasselbe Formular nichts mehr.

**„Verkauf ↔ Fassung" ist ehrlicher.** Der Abschnitt hieß „Größe fehlt"
und versprach allen die Sammelbestätigung. Er heißt jetzt **„Nicht
gerechnet"** und trennt nach dem, was zu **tun** ist:
1. **hier unten gesammelt bestätigen** (Vorschlag steht bereit),
2. **von Hand eintragen** (kein Vorschlag im Stamm, oder Mischgetränk —
   die Größe gehört zum Bestandteil),
3. **keine Menge im Kassennamen** („Aperol Spritz 1 Glas") — da hilft
   Bestätigen gar nichts.

Die angekündigte Zahl ist jetzt **genau die**, die der Sammelknopf
anfasst. Vorher hieß es „23", und er nahm 12.

**Der Mittagsblick** nennt die Gründe, die **wirklich gelten** — vorher
nannte eine Kachel einen Grund, den es seit v29 nicht mehr gibt, und ein
Hinweis ließ den häufigsten weg.

**Die Z-Bericht-Ansicht** sagt den echten Grund statt pauschal „Größe
fehlt". Bei Bericht 37 betraf das 26 von 48 Positionen.

**Die CSV** nennt im Kopf **und im Dateinamen** den Zeitraum, die Spanne
und die Zahl der Berichte darin. Jede Zahl in der Datei ist über das
Fenster summiert — das stand vorher nirgends, und bei sieben Berichten
standen dort 952 Einheiten, wo an dem genannten Betriebstag 136 verkauft
wurden. Neue Spalte **„Was zu tun ist"**. ⚠️ **Der Dateiname ändert sich**
bei Spannen über einen Tag: `abgleich_2026-09-12_bis_2026-09-18.csv`.

**Die Zahl neben „Zuordnung"** zählt jetzt dasselbe wie die Seite
dahinter. Vorher zählte sie einen Tag, die Seite alle geladenen Berichte
— war der letzte Tag zufällig vollständig zugeordnet, verschwand die Zahl
ganz, während 44 Kassennamen warteten.

**Meldungen sind lesbar.** Was der Server ablehnt, steht **über** dem
Knopf und **bleibt stehen**, bis der nächste Versuch läuft. Der Toast war
bei 390 px ein Kreis von 195 × 208 px, aus dem oben und unten die Zeilen
herausliefen; er ist jetzt 358 px breit, sechs statt elf Zeilen, und
bleibt nach Textlänge stehen statt 2,2 Sekunden.

### Technisch

| | |
|---|---|
| **Geänderte Dateien** | `public/index.html` (+1326/−…), `public/leitung.html` (+888), `public/sw.js` (Version), `src/index.js` (+270). **Mehr nicht.** |
| **Unberührt** | `wrangler.jsonc`, `schema.sql`, `migrations/`, `package.json`, `docs/`, `RUNDEN = 1000`, die Spalten `schluessel`/`zaehlnr`/`geraet` |
| **Neuer Endpunkt** | `POST /api/code` — fragt, wer zu einem Code gehört, ohne Sitzungswechsel, an derselben Sperre |
| **Neuer Browserspeicher** | `hh_nkennung_v1` (nur `leitung.html`): Name → `{id, ok, t}`. **Keine Codes.** Wird von „abmelden" geräumt |
| **`sw.js`** | v38 → **v56** |
| **Prüfungen** | `npm test` **440/440** in 81 Suiten (live: 370 in 71 Suiten — **+70 Prüfungen**). Neu: `tests/runde16.test.mjs` (1099 Z.), `tests/ui-runde16.cjs` (751), `tests/qa-runde16-kennung.cjs` (646), `qa-runde16-schluss` (286), `qa-runde16-gegenprobe` (303), `qa-runde16-stumme-anmeldung` (122), `qa-runde16-stummer-leib` (159). Erweitert: `abgleich-unklar`, `gebinde`, `ui-leitung-echt` (44/44), `ui-mass`, `durchstich` (wieder **35/35**) |
| **Belege** | `review/screens/lauf/`, `review/screens/runde16/` |

---

## 4 · Abweichungen vom Auftrag

### 4.1 · Punkt 4 · „«Fertig – Speichern» nur bei bestehender Verbindung"

**Bestellt war**, wörtlich: *„«Fertig – Speichern» ist nur bei bestehender
Verbindung drückbar. Ohne Verbindung: Knopf ausgegraut, darunter kurz
«Keine Verbindung». Die bis dahin gefassten Mengen bleiben wie bisher
offline auf dem Gerät gespeichert und gehen nicht verloren. Sobald die
Verbindung zurück ist, wird der Knopf automatisch wieder aktiv."*

**Gebaut war es genau so** — und es hat gemessen funktioniert.

**Warum es nicht bleiben konnte.** Die Sperre wirkte auf **jeden** Modus,
also auch auf die **Kellerzählung**. Die kennt weder Z-Bericht noch
Abgleich, hat mit der Verbindung nichts zu tun — und steht im selben
Auftrag unter „Nicht anfassen". Im Keller ist kein Netz. Eine fertige
Zählung war dort nicht abzuschließen: Der Vorgang blieb „läuft", ging
nicht in den Ausgang, und die Zählung stand bis zum nächsten Empfang
zwischen den Stühlen. Das verletzt außerdem Regel 6 (Offline-Warteschlange
nicht aufweichen) und §9 der Projektanleitung (Offline ist der Normalfall).

Der Jäger meldete es als **A**, der qa-guardian zog dafür ein **Veto**.
Beide unabhängig, beide in derselben Runde. Da die Merge-Bedingung deines
Auftrags genau deren Urteil ist, habe ich die Sperre entfernt.

**Was stattdessen da ist.** Der Knopf ist **immer** drückbar. Darunter
steht, solange es gilt, eine von drei Zeilen — und sie nennt den Grund,
der wirklich zutrifft:

| Lage | Text unter dem Knopf |
|---|---|
| Kein Netz | „Keine Verbindung – der Abgleich kommt nach" |
| Server antwortet nicht | „Server antwortet nicht – der Abgleich kommt nach" |
| Sitzung abgelaufen | „Nicht angemeldet – der Vorgang wartet im Gerät" |

Der Hinweis **verschwindet mit der Ursache**, nicht nach Sekunden.

**Woran die Servicekraft merkt, dass noch nichts beim Server ist.** An
drei Stellen, ohne dass sie danach suchen muss:

1. **Vor dem Drücken:** die Zeile unter dem Knopf (oben).
2. **Nach dem Drücken:** Es kommt **kein** Abgleich-Fenster — der braucht
   den Z-Bericht vom Server. Es kommt das kurze „Fertig". Der Unterschied
   ist sichtbar, und im Hinweis stand vorher schon, warum.
3. **Auf der Startseite:** die Statuszeile trägt den Zustand, farbig
   abgesetzt:
   * „**Kein Netz – alles im Gerät gespeichert**" (nichts wartet)
   * „**Kein Netz – 1 Vorgang wartet**" (etwas wartet)
   * „**Server antwortet nicht – 2 Vorgänge warten**"
   * „**Verbunden**" (alles draußen)

   Die Zeile bleibt stehen, solange etwas wartet, und wechselt von selbst
   auf „Verbunden", wenn der Ausgang leer ist.

**Was du dadurch verlierst:** Die Gewissheit „nur mit Verbindung
abgeschlossen" gibt es nicht. Eine Fassung kann fertig sein, während der
Abgleich noch aussteht.
**Was du gewinnst:** Die Kellerzählung funktioniert dort, wo sie
stattfindet. Der Weg zurück steht in `review/ERGEBNIS.md` und
`review/LOG.md` — die Sperre nur für `tag` und `fuellen` zu setzen wäre
drei Zeilen, falls du es doch willst.

### 4.2 · Zusätzlich gebaut, nicht bestellt

| Was | Warum | Was du bekommst |
|---|---|---|
| **Namenswächter im Worker** | Der Browser kann ein zweites **Gerät** nicht sehen. Ohne Server-Wache entstand bei schweigender Liste eine zweite Zeile mit zweitem gültigem Code — nicht rückholbar (§8) | Zwei Menschen mit **exakt** gleichem Namen brauchen einen unterscheidenden Zusatz. Entschieden ohne Rückfrage, dokumentiert in `review/ENTSCHIEDEN-NACHTS.md`, revidierbar |
| **Verfall unbestätigter Kennungen (30 min)** | Ein abgebrochener Anlauf blieb sonst **unbegrenzt** eine Falle | Nach einer halben Stunde geht eine neue Kennung hinaus und der Server sagt sauber nein, statt still zu überschreiben |
| **`POST /api/code`** | B3 verlangte „Freigabe gegen den Server prüfen"; dafür gab es keinen Weg ohne Sitzungswechsel | Ein zurückgesetzter Code gibt nicht mehr frei |
| **CSV-Kopf und -Dateiname** | Jede Zahl darin war über das Fenster summiert, der Kopf nannte einen einzelnen Tag | Der Dateiname ändert sich bei Spannen > 1 Tag |
| **`tests/durchstich.cjs` wiederbelebt** | War seit Runde 15 tot und galt laut `ERGEBNIS.md` als Tor vor dem Livegang | 35/35, und die falsche Zeile in den Unterlagen ist berichtigt |
| **Toast im Backoffice umgebaut** | War bei 390 px ein unlesbarer Kreis | — |

### 4.3 · Bewusst **nicht** gebaut

| Was | Warum |
|---|---|
| **B6 · Gasteiner 0,25 auf 8** | So bestellt: „NICHT ändern — das muss ich erst physisch nachzählen." Unberührt |
| **Wettlauf zweier gleichzeitiger Personen-Pakete** | Dicht macht ihn nur ein UNIQUE-Index — eine **Migration**, und die Nacht hatte ausdrücklich keine. Im Backlog samt der Abfrage, die vorher lesend laufen muss |
| **Die restlichen C-Funde der letzten Jagden** | Im Backlog, keiner vor Dienstbeginn nötig |

### 4.4 · Regelabweichung

**Branch `claude/runde16` statt `v2-review`** (CLAUDE.md, harte Regel 1) —
so im Auftrag der Nacht vorgegeben. Von beiden Prüfern als bekannt geführt,
kein Fund.

---

## 5 · Was du noch nicht weißt

### Entscheidungen, die ich allein getroffen habe

1. **Punkt 4b entfernt** (Abschnitt 4.1). Die größte Abweichung.
2. **Zwei Menschen mit gleichem Namen** brauchen einen Zusatz. Beim
   zweiten Anlegen kommt: *„«Asad» ist schon angelegt. Einen zweiten
   Eintrag gibt es nicht …"*
3. **Das Anlegen-Formular legt nur an.** Wer schon in der Liste steht,
   bekommt eine Absage mit Verweis auf seine Zeile. Rolle ändern und Code
   neu setzen gehen **nur** dort.
4. **Unbestätigte Kennungen verfallen nach 30 Minuten.**
5. **Satzzeichen werden im Namensvergleich nicht normalisiert** —
   „Marinus." gilt als anderer Name. Absicht: aus „ähnlich" auf
   „derselbe Mensch" zu schließen ist der Fehler, den Regel 5 beim
   Automapping verbietet.
6. **Umbenannt:** Abschnitt „Größe fehlt" → **„Nicht gerechnet"**;
   Formular „Aufnehmen oder Code neu setzen" → **„Neuen Menschen
   aufnehmen"**. Der Morgenbrief ist nachgezogen.
7. **Ich habe einen Punkt des qa-guardian abgelehnt:** Er ordnete den
   Toast der geteilten Gestaltungsschicht zu. Die endet bei
   `leitung.html:244`, die Regel steht bei 550, und die App hat eine
   eigene. Geändert ist nur das Backoffice. Er hat es in der nächsten
   Kontrolle bestätigt.
8. **`.gitignore`** um `review/screens/qa16/` und `runde-2-qa/` erweitert
   (23 MB Prüfbilder, die nicht ins Repo gehören).

### Was dir am Morgen auffallen wird

* ⚠️ **Der Rollen-Auswahlkasten in deiner EIGENEN Zeile hat keine
  Rückfrage.** Ein Klick auf „Service", und du bist ausgesperrt:
  `GET /api/personen` antwortet 403, Rückweg nur über die D1-Konsole.
  („Sperren" daneben fragt zweimal nach.) **Das ist nicht neu — es steht
  wortgleich schon live.** Der Morgenbrief schickt dich in Punkt 3 in die
  Nähe, deshalb steht die Warnung jetzt darin. Backlog, Priorität mittel.
* **Das Rollenfeld bleibt nach dem Speichern stehen**, während Name und
  Code geleert werden. In der Reihenfolge des Briefs (service, service,
  wirtschaft) geht es gut; bei anderer Reihenfolge bekommt der nächste
  die Rolle des vorigen.
* **Der Menüpunkt heißt „Mitarbeiter"**, nicht „Team".
* **Das Erkennungszeichen steht in Großbuchstaben:** „WENN ETWAS KLEMMT".
* **Der CSV-Dateiname** trägt bei Spannen > 1 Tag den Zeitraum.

### Zwei Dinge, die nur du nachsehen kannst

1. **`ANLAGE_OFFEN` im Dashboard** (`/api/ping` → `anlage`). Solange
   gesetzt, steht `POST /api/anlage` **ohne Anmeldung** offen, und der
   Aufrufer bestimmt die Rolle selbst — **jeder Name legt eine
   Leitungs-Zeile an**. Der neue Namenswächter bremst dort nur die exakte
   Wiederholung; „Casimir." genügt, um an ihm vorbeizukommen. Das ist der
   schwerste offene Punkt der Nacht, und er ist für mich nicht erreichbar.
2. **Stehen in der Datenbank schon zwei Personen mit demselben Namen?**
   Nur lesend:
   `SELECT lower(trim(name)) n, COUNT(*) c FROM person GROUP BY n HAVING c > 1;`
   Kommt etwas zurück, sag es mir — löschen geht nicht (§8), sperren
   schon.

### Ungeprüft geblieben

* **Der Klick-Durchgang auf der Live-Adresse.** Der Egress-Proxy dieser
  Bauumgebung weist `fassungstool.ikrathc.workers.dev` per
  Organisationsrichtlinie ab (403 auf CONNECT). Ich konnte die Live-App
  **nicht einmal öffnen**. Alles Gemessene lief gegen den echten Worker
  aus `src/index.js` an einer SQLite aus `docs/live-schema.sql` — dieselbe
  Codebasis, dasselbe Schema, aber nicht dieselbe Maschine.
  **Was du selbst prüfen musst:** anmelden · Erkennungszeichen sehen ·
  abmelden (danach muss `/leitung.html` keine Leitung mehr zeigen) · eine
  Tagesfassung bis zum Pop-up durchklicken, **nicht** abschließen.
* **Echtes Safari auf iPhone und iPad.** Alles Visuelle ist Chromium.
  Besonders offen: **Notch und Safe-Area** (`env(safe-area-inset-*)` ist
  in Chromium 0), die **Hardwaretastatur**, das **Gummiband-Scrollen** und
  der **Wechsel des Service Workers** von v38 auf v56 auf einem Gerät, das
  die App vom Startbildschirm startet.
* **Die Live-Datenbank.** Nur gelesen: `mapping` 13, `person` 2,
  `vorgang` 2, `ereignis` 15 — unverändert, wie vor der Nacht. Kein
  Schreibzugriff, keine Migration.
* **Zwei Geräte gleichzeitig** am selben Anlegen-Formular (der Wettlauf,
  Abschnitt 4.3).
* **Ein einzelner, nicht reproduzierbarer `fail 1`** in einem von fünfzehn
  `npm test`-Läufen des Jägers, ohne ein einziges `not ok` im Protokoll.
  In vierzehn weiteren Läufen nicht wieder aufgetreten, bei mir nie. Ich
  führe es nicht als Fund, aber es soll nicht verloren gehen.
