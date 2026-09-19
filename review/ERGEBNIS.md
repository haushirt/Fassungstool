# Ergebnis

Diese Datei ist die Beschreibung des Pull Requests. Sie wird am Ende einer
Phase gefüllt, nicht laufend.

---

# Was mit diesem Merge live geht · Runde 16 (Nacht auf den 19.09.2026)

**Stand davor: `ac8d93a` (`sw.js` v38, live). Stand danach: `sw.js` v53.**
Er bringt die A- und B-Funde der fünften Jagd und die vier Punkte der
Runde 16 hinaus — und die Funde der sechsten Jagd, die auf diese Runde
folgte.

**Kein Schemaeingriff, keine Migration.** `migrations/`, `schema.sql`,
`wrangler.jsonc`, `package.json` unberührt, kein `ALTER`, kein `CREATE`,
kein `INSERT` in die Live-D1. `RUNDEN` unverändert — bestehende
Anmeldungen bleiben gültig. Die Spalten `schluessel`, `zaehlnr`, `geraet`
sind nicht angefasst (Regel 14).

## Was im Betrieb anders ist

**1 · „abmelden" meldet wirklich ab.** Bis heute leerte der Knopf nur den
Speicher des Geräts; die Sitzung am Server galt weitere zwölf Stunden. Am
geteilten iPad war die nächste Person damit über `/leitung.html` volle
Leitung — samt „PIN zurücksetzen". Der Knopf ruft jetzt `POST
/api/abmelden`, wartet auf die Antwort und gibt das Gerät erst danach
frei. Ohne Netz wird die Abmeldung vorgemerkt, gesagt und beim nächsten
Empfang nachgeholt. Das Backoffice hat einen eigenen Ausgang bekommen: am
Fuß der Navigation, „abmelden".

**2 · Ein Code gehört genau einer Person.** „Selbst eintragen",
„Vorschlagen" und `POST /api/anlage` prüften bisher nicht auf Dopplung.
Zwei gleiche Codes hießen: beim Anmelden gewinnt die letzte Zeile, und im
append-only Journal steht dauerhaft der falsche Name. Ein doppelter Code
wird jetzt mit einer klaren Meldung abgelehnt — gezählt werden alle
anderen Personen, auch gesperrte.

**3 · Der Abschluss ist eine Handlung, keine Ausgabestelle.** Es gibt nur
noch **einen** Knopf, „Fertig – Speichern", in jedem Modus. „Protokoll
senden", „Als PDF sichern", „Auch als CSV" und das Feld „Notiz (optional)"
sind im Frontoffice ersatzlos entfallen. Beim Drücken:

* Liegt zum **Vorabend** ein Z-Bericht vor, kommt das Fenster **Abgleich**:
  gefasst gegen verkauft, **nur die Abweichungen**, darunter **ein**
  Notizfeld für alles. Speichern → Vorgang abgeschlossen, Notiz am
  Vorgang, zurück zur Startseite.
* Liegt keiner vor, kommt ein kurzes **Fertig** und dann die Startseite.

„Rohdaten sichern (JSON)" und „Zurücksetzen" sind **nicht** gelöscht: Sie
stehen jetzt dezent am Ende des Menüs, als Notweg bei Offline-Problemen.

**4 · Ohne Verbindung wird trotzdem abgeschlossen — anders als bestellt.**
Der Auftrag der Nacht sagte: „‚Fertig – Speichern' ist nur bei bestehender
Verbindung drückbar." So war es gebaut, und genau so hat es gemessen
funktioniert — **auch bei der Kellerzählung**, die weder Z-Bericht noch
Abgleich kennt und die derselbe Auftrag unter „Nicht anfassen" führt.

Im Keller ist kein Netz. Eine fertige Tagesfassung war damit dort nicht
abzuschließen: Der Vorgang blieb „läuft", ging nicht in den Ausgang, und
es entstand keine Journalzeile — genau der Weg, für den der Ausgang gebaut
wurde. Das bricht harte Regel 6 („Offline-Queue nicht aufweichen") und
Projektanleitung §9 („Offline ist der Normalfall"); die Hilfe der App
selbst sagt zwei Bildschirme weiter das Gegenteil.

Derselbe Auftrag hat das Urteil von **Jäger und qa-guardian zur
Merge-Bedingung** gemacht. Beide haben diesen Punkt gemeldet — der Jäger
als A-Fund, der qa-guardian als Veto. **Die Sperre ist deshalb draußen.**

Was vom Punkt 4b gebaut bleibt: Der Hinweis steht unter dem Knopf, solange
keine Verbindung da ist („Keine Verbindung – der Abgleich kommt nach"), und
verschwindet von selbst, sobald sie zurück ist. Ohne Netz gibt es keinen
Abgleich — der Z-Bericht liegt am Server —, also kommt das kurze „Fertig",
und es steht dabei, dass der Vorgang im Gerät wartet und hinausgeht, sobald
Empfang da ist.

**Das ist die eine Stelle, an der dieser Stand von deinem Auftrag
abweicht.** Willst du die Sperre doch, ist sie in zwei Zeilen zurück —
dann gehört aber „Offline ist der Normalfall" mit derselben Runde aus
Projektanleitung, Hilfe und CLAUDE.md gestrichen.

**5 · Kleinigkeiten, die den Tag ausmachen.** Der Doppeltipp zoomt nicht
mehr (Zwei-Finger-Zoom bleibt), kein Eingabefeld unter 16 px, damit Safari
beim Fokus nicht hineinspringt. Die Statuszeile sagt „Verbunden" statt
„Nichts liegt mehr auf diesem Gerät". Auf der Startseite sind die
Gruppentöne getauscht: Service steht auf dem hellsten Grund, Bestand tritt
zurück.

**6 · Der Abgleich rechnet — oder sagt, dass er es nicht kann.** Die erste
Fassung dieser Nacht las das Feld `ausschankMl` als „wird offen im Glas
ausgeschenkt" und nahm jede solche Position aus der Rechnung. Das Feld ist
aber die **Menge aus dem Kassennamen**: „1/8 l" ergibt 125, „0,75 l" ergibt
750 — das eine ein Glas, das andere eine ganze Flasche. Gegen den echten
Bericht 37 fielen damit **alle vier** zugeordneten Positionen heraus, und
das Fenster meldete „Keine Abweichung", ohne eine einzige Zahl verglichen
zu haben. Gefunden von der Jagd nach dieser Runde.

Jetzt gilt dieselbe Rechnung wie im Backoffice: `anzahl × Ausschank ÷
Gebindegröße`, die Größen kommen aus der Zuordnung (`GET /api/mapping`).
Fehlt eine Größe, wird keine erfunden — die Position bleibt draußen und
wird gezählt. Und wenn **gar nichts** vergleichbar war, sagt das Fenster
„Nichts zu vergleichen" statt „Keine Abweichung". Das ist heute der
Regelfall: live hat keine der dreizehn Zuordnungen eine bestätigte
Gebindegröße — siehe „Danach".

**7 · Behoben, ohne dass man es sieht.** Die Sperrmeldung an der Tür nannte
in allen drei Stufen „15 Minuten" und zählte die Restversuche mit einer
anderen Rechnung als die Sperre selbst — beides kommt jetzt aus einer
Quelle. Ein nicht schreibbarer Speicher (privates Fenster) ließ die
Anmeldung stumm auf Anfang springen; jetzt steht da, was los ist. Freigabe
und Wein-Editor fragen den **Server**, wer zu einem Code gehört
(`POST /api/code`, ohne Sitzungswechsel, an derselben Sperre) — ein
zurückgesetzter Code gibt damit nicht mehr frei. Und der neue Code beim
Zurücksetzen kann nicht mehr verloren gehen: Das Backoffice würfelt ihn
selbst und kennt ihn, bevor die Antwort unterwegs ist.

Aus der Jagd nach dieser Runde dazu: Ein **leeres oder krummes Feld** im
Freigabedialog kostet keinen Anmeldeversuch mehr — vorher hätten zwölf
ungeduldige Klicks die Anmeldung für das ganze Haus sperren können, weil
die Sperre je IP zählt. Eine **abgelaufene Sitzung** nimmt dem Gerät nicht
mehr den gültigen Code aus dem Vorrat (beide Fälle antworten mit 401, aber
nur einer heißt „diesen Code gibt es nicht"). Und eine **ohne Netz
vorgemerkte Abmeldung** überlebt jetzt eine Offline-Anmeldung der nächsten
Person — vorher erbte sie zwölf Stunden lang die Sitzung der vorigen, samt
Personenverwaltung und „PIN zurücksetzen".

Aus den beiden letzten Jagden noch zwei Dinge, die im Haus zählen:

* **Eine Person wird nicht mehr zweimal angelegt.** Bricht die Verbindung
  beim Anlegen ab, steht auf dem Schirm „Keine Verbindung zum Server."
  und man greift zu „Aktualisieren". Bis eben verlor das Backoffice dabei
  sein Gedächtnis: derselbe Mensch bekam beim zweiten Tippen eine zweite
  Zeile mit einem zweiten gültigen Anmeldecode — und „Sperren" wirkte
  danach nicht mehr, weil der andere Code weiter herein lässt. Gelöscht
  werden kann in der Live-D1 nichts (Projektanleitung §8). Das Gedächtnis
  überlebt jetzt das Neuzeichnen und sogar ein Neuladen des Tabs.
* **Einen Namen gibt es einmal.** Das Gedächtnis oben deckt einen
  Browser ab — ein zweites Gerät sieht es nicht. Deshalb wacht jetzt
  auch der Server: Wer unter einem Namen, den es schon gibt, eine ZWEITE
  Zeile anlegen will, bekommt eine klare Absage. Alles andere bleibt
  erlaubt (sperren, freigeben, Rolle ändern, „PIN zurücksetzen").
  **Folge für den Betrieb:** Zwei Menschen mit exakt demselben Namen
  brauchen einen unterscheidenden Zusatz. Das habe ich in der Nacht
  entschieden, weil ein Doppeleintrag in der Live-D1 nicht rückholbar ist
  (kein Löschen, keine Sicherung, §8) — sag Bescheid, wenn du es anders
  willst.
* **„Größe fehlt" schickt niemanden mehr ins Leere.** Zwei verschiedene
  Dinge hießen gleich: eine fehlende **Gebindegröße** (die lässt sich im
  Backoffice bestätigen) und eine fehlende **Menge im Kassennamen**
  („Aperol Spritz 1 Glas" — da hilft nur ein anderer Kassenname oder eine
  Rezeptur). Der Mittagsblick versprach für beide die Sammelbestätigung;
  bei Bericht 37 waren das 10 von 17 Positionen, für die es dort nichts zu
  tun gibt. Getrennt wird jetzt nach dem, was zu TUN ist, und zwar mit
  genau der Bedingung, die der Sammelknopf anwendet: **hier unten
  gesammelt bestätigen** · **von Hand eintragen** (kein Vorschlag im
  Stamm, oder Mischgetränk — die Größe gehört zum Bestandteil) ·
  **keine Menge im Kassennamen**. Das steht so im Mittagsblick, in der
  Abschnittsüberschrift, im Sammelhinweis, in der CSV und in der
  Z-Bericht-Ansicht. Der Abschnitt heißt daher nicht mehr „Größe
  fehlt", sondern **„Nicht gerechnet"**.

## Erkennungszeichen nach dem Deploy

Auf der Startseite steht unter den Kacheln der Block **„Wenn etwas klemmt"**
mit „Rohdaten sichern (JSON)". Steht er nicht da, läuft noch die alte App —
dann mit Netz neu laden (iPhone: Seite herunterziehen; als Web-App: einmal
schließen und neu öffnen).

## Vor dem Merge

Nichts. Keine Migration, kein Dashboard-Schritt, kein Codewechsel.

## Danach

* Auf **jedem** Gerät die App einmal **mit Netz** neu laden.
* **Asad Karakiri** (service), **Ian Lauchbein** (service) und **Marinus**
  (wirtschaft) im Backoffice unter „Team" anlegen und den PIN über „PIN
  zurücksetzen" vergeben.
* **Die Gebindegrößen bestätigen** — Backoffice → „Verkauf ↔ Fassung" →
  Abschnitt „Nicht gerechnet" → „Alle N Vorschläge übernehmen". Solange keine einzige
  bestätigt ist, kann der Abgleich im Keller nichts rechnen und sagt genau
  das. Sechs Positionen (Cola, Sanbitter, Almdudler, Gasteiner still)
  haben keinen Vorschlag und brauchen die Zahl von Hand.
* **Gasteiner 0,25 l in der Lade nachzählen.** Das Soll steht auf 8; steht
  dort in Wirklichkeit Platz für 7, bucht jedes Nachfüllen dauerhaft eine
  Flasche zu viel ins append-only Journal.

---

# Vorgeschichte · Was mit dem Merge von Runde 13–15 live ging

**Stand davor: `50c1123` (`sw.js` v31). Stand danach: `sw.js` v37.**
Der Merge bringt **drei Runden zusammen** hinaus: Runde 13 (elf Befunde vom
echten iPhone), Runde 14 (Oberfläche, Punkt für Punkt) und Runde 15 (die
Funde von Jäger und qa-guardian). Elf Commits.

**Kein Schemaeingriff, keine Migration.** `migrations/`, `schema.sql`,
`wrangler.jsonc`, `package.json` unberührt, kein `ALTER`, kein `CREATE`.
Die Spalten `schluessel`, `zaehlnr`, `geraet` sind nicht angefasst,
`RUNDEN` unverändert — bestehende Anmeldungen bleiben gültig.

**Was auf jedem Gerät einmalig passiert:** Der Fotoschritt der
Fassungsliste ist entfallen (Runde 13, F4). Beim ersten Start nach dem
Deploy löscht die App die IndexedDB `hh_fotos` — die dort liegenden Bilder
sind danach weg und nicht wiederherstellbar. So bestellt; die Marke fällt
erst nach erfolgreichem Löschen, ein abgebrochener Versuch wird beim
nächsten Start wiederholt.

## Die drei größten Änderungen für den Betrieb

**1 · Der Betriebstag stimmt (Runde 13, F1).** Der Tag kommt aus
`Europe/Vienna` statt aus UTC, und die Tagesfassung trägt den Tag, an dem
sie gemacht wird — nicht mehr den Vortag. Startseite und Vorgang nennen
seit Runde 15 denselben Tag; wer über die Begrüßung ein anderes Datum
wählt, sieht das oben stehen („Donnerstag, 17.09. · gewählt").

**2 · Die Sonderentnahme verlangt einen Grund.** Fünf Knöpfe — Küche,
Personal, Bruch/Kork, Verkostung/Gast, Zimmer — in **beiden** Zweigen, Wein
wie Getränke. Ohne Grund bleibt der Vorgang offen. Der Grund geht als
`grund=<schlüssel>` in die bestehende Spalte `ereignis.notiz`; keine neue
Spalte, keine Migration.

**3 · Die Oberfläche ist für das iPhone neu gesetzt.** Startseite mit
farbigem Kopf und Datum, Statusfeld als Einstieg in die Begrüßung, drei
Gruppen statt einer Liste; die Laden zeigen jede Flasche mit Namen in einer
Reihe; die Weinzeile hat kleinere Ringe ohne Umbruch und farbige
Rebsortenüberschriften.

## Stammdaten: eine Änderung

**Gasteiner 0,25 l: Soll 7 → 8** (`src/stamm.json`, `public/index.html`,
`public/leitung.html`). Von Casimir bestätigt. Das Soll geht über `gFehlt()`
ins append-only Journal — stimmt es nicht mit dem Fach überein, bucht jedes
Nachfüllen dauerhaft falsch.

## Was vor dem Merge zu wissen ist

**Der Abgleich im Backoffice paart dauerhaft um einen Tag versetzt.**
Seit F1 trägt die Tagesfassung den Tag, an dem sie gemacht wird; der
Z-Bericht eines Tages gehört aber zur Fassung des Folgetags.
`abgleich()` paart weiter Z-Bericht(X) mit Vorgang(X). Das ist **kein**
Übergangseffekt um den Merge herum, sondern gilt bis auf Weiteres, und im
Backoffice steht nichts davon. Offen als A4 in `review/BACKLOG.md`.

**Der Grund erreicht die Leitung noch nicht.** Er steht im Journal, wird
aber von keiner Abfrage gelesen und weder im Protokoll noch im Backoffice
angezeigt. Nächste Runde, `review/BACKLOG.md`.

## Prüfstand

`npm test` **359/359** · `node tests/ui-nachjagd.cjs` **23/23** ·
`LAUF=runde15 node tests/ui-mass.cjs` **zehn von zehn Urteilen grün** über
sechs Breiten und jeden Schritt jedes Modus · Z-Bericht-Prüfungen gegen
`tests/fixtures/` grün · Worker-Durchstich für den Grund gegen
`docs/live-schema.sql` in echtem SQLite.

Belege: `review/screens/f1…f9/`, `review/screens/r14/`,
`review/screens/r15/`, auf iPhone 16 / iPad mini / MacBook unter
`review/screens/geraete/`, als Kontaktbögen in `review/bogen/`.

**UNGEPRÜFT bleibt:** echtes Safari auf echtem iPhone und iPad — Notch,
Safe-Area, Tastatur, Gummiband und der Wechsel des Service Workers von
v31 auf v36. Ebenso VoiceOver und die Live-D1.

---

# Runde 13 · Dringende Fehlerbehebung, 18.09.2026

**Stand davor: `50c1123` (`sw.js` v31). Stand danach: `sw.js` v32.**
Auftrag: elf Befunde vom echten iPhone, ausgeführt als F1 bis F9 plus
„Messung reparieren". Wortlaut und Ergebnis je Befund mit Datei:Zeile und
Beleg: `review/INPUT-TEAM.md`.

## Was sich ändert — und was das im Haus bedeutet

**1 · Der Betriebstag stimmt wieder (F1, A-Fund).** Am Freitag stand im
Kopf „Für Donnerstag, 17.09.2026", während die Kellerzählung auf demselben
Gerät „Für Freitag" schrieb. Zwei Ursachen lagen übereinander: Der Tag kam
aus `toISOString()`, also aus UTC — zwischen Mitternacht und 02:00 Ortszeit
ist das der Vortag —, und `blank()` zog für die Tagesfassung noch einen
weiteren Tag ab. Ein Vorgang trägt den Schlüssel `<modus>_<tag>`; zwei
Rechnungen heißt zwei Schlüssel für denselben Abend. Gerechnet wird jetzt
in Europe/Vienna, an einer Stelle je Datei, und in allen dreien: App,
Backoffice, Worker.

> **Das bewegt Zahlen, die die Leitung sieht.** Bis heute früh lag ein
> Vorgang des Modus `tag` unter dem VORTAG, ab jetzt unter dem Tag, an dem
> er gemacht wird. Vorgänge von vor und nach dem Merge liegen damit unter
> verschiedenen Schlüsseln. Es geht nichts verloren; der Abgleich gegen den
> Z-Bericht vergleicht in den Tagen um den Merge herum einmal um einen Tag
> versetzt. Steht auch in `review/BACKLOG.md`.

**2 · Die Laden sind wieder eindeutig (F2, der gefährlichste Befund nach
F1).** Ein zweizeiliger Name („Alm-dudler", „Weiss-bier afr.") hob seine
ganze Spalte an, weil die Spalten unten bündig standen. In Lade 6 lagen
dadurch fünf Kopfzahlen auf fünf Höhen, kein Name stand unter seiner
Flasche, und in Lade 1 trugen einzelne Flaschen gar keine Beschriftung —
das Kürzel stand nur unter der LETZTEN einer Reihe, obwohl in derselben
Spalte zwei Sorten übereinander liegen. Im Keller wird so der Name der
falschen Flasche zugeordnet. Jede Lade ist jetzt ein Raster, das umbricht:
Kopfzahlen auf einer Linie, Trennstriche auf einer Linie, Namen auf einer
Linie, jede Flasche mit Namen, und bei 320 px nichts mehr angeschnitten.

**3 · Die Zählringe fluchten (F3).** Sie hingen im Namensblock, gleich
hinter dem Namen — bei jedem Wein woanders, und bei 320 px lief der Name
sogar unter den ersten Ring. Die Zeile ist jetzt ein Raster mit fester
Ringspalte.

**4 · Der Fotoschritt der Fassungsliste ist weg (F4).** Restlos, an 23
Stellen, jede einzeln aufgeführt in `review/INPUT-TEAM.md`. Mit ihm geht
die IndexedDB `hh_fotos`.

> **Achtung, unwiederbringlich:** Beim ersten Start nach dem Merge löscht
> jedes Gerät seinen Bildspeicher EINMAL. Protokolle im Archiv, die ein
> Foto trugen, zeigen es danach nicht mehr. Das war die ausdrückliche
> Vorgabe („der Foto-Zwischenspeicher in der IndexedDB … Dann löschen").
> Wer eines dieser Bilder noch braucht, holt es sich VOR dem Merge.

**5 · „Verwaltung" raus, „Backoffice" rein (F5).** An derselben Stelle,
sichtbar nur für die Rolle `leitung`, vorerst auf die Leitungsübersicht.
Die Rolle kommt aus `GET /api/ich` — die Anmeldung selbst ist nicht
angefasst. Ohne Netz bleibt der Link weg, statt ins Leere zu führen. Der
Verwaltungs-Editor ist nicht gelöscht, er hat nur keinen Eingang mehr.

**6 · Der Kopf beginnt unter der Statusleiste (F6).** Auf der Startseite,
in der Anmeldung, in jeder Fassung und im Backoffice. `viewport-fit=cover`
fehlte in `leitung.html` ganz — ohne das liefert `env()` auch auf dem
iPhone 0.

**7 · Die Startseite widerspricht sich nicht mehr (F7).** Das grüne Feld
spricht nur noch von Übertragung („Alles übertragen", „1 Vorgang wartet").
Das Wort „offen" gehört der Aufgabe.

**8 · Begrüßung beim Öffnen (F9).** Einmal je Gerät und Betriebstag, klein,
von unten: Tag, Name, was heute ansteht, dazu „Passt" und „Anderes Datum".
Ohne Netz bleibt die dritte Zeile weg statt falsch zu sein. Gebaut erst
nach F1 — ein Knopf, der den falschen Tag bestätigt, wäre schlimmer als
kein Knopf.

**9 · Die Messung war falsch, nicht der Befund.** Sie meldete „0 Überlauf
bei 390 px", während die achte Kachel angeschnitten dastand. Drei Gründe,
alle drei behoben; der vermutete („misst gegen die Dokumentbreite") traf
nicht zu. Die Laden wurden nie gemessen, Beschnitt durch einen
`overflow:hidden`-Vorfahren war kein Urteil, und 320 px stand nicht in der
Liste. Nachweis: Gegen `50c1123` ist der neue Test ROT
(`review/screens/beweis-alt/`), gegen den Stand danach grün
(`review/screens/schluss/`).

**Nebenher gefunden, weil jetzt auch 320 px gemessen wird:** die
Stationsleiste (R · 1 … 6) hatte dort 38 px je Knopf statt 44. Sie bricht
jetzt um, statt zu schrumpfen.

## Was NICHT erledigt ist

* **F10 und F11 gibt es nicht.** Der Auftrag kündigt „elf Befunde" und
  „F1…F11" an, führt aber nur F1 bis F9 aus. Sie sind nicht erfunden
  worden. Bitte nachreichen.
* **F8 ist nicht bestätigt.** Der Abstand zwischen Ladenkasten und
  „Überspringen" war schon vorher genau 24 px — in jeder der sechs Laden
  nachgemessen, Tabelle in `review/INPUT-TEAM.md`. Geändert habe ich das
  tote Ende darunter (Fußpolster 40 → 12 px). Welche Lade, welches Gerät?
* **Echtes Safari bleibt ungeprüft.** Alles hier ist in Chromium belegt.
  F6 lässt sich dort grundsätzlich nicht zeigen: Chromium hat weder Notch
  noch Statusleiste, `env(safe-area-inset-top)` ist immer 0. Geprüft ist
  nur, dass die Regel dasteht.

## Geprüft

* `npm test`: **325 Prüfungen grün** (Start der Runde: 286). Neu:
  `tests/betriebstag.test.mjs` (11), `tests/oberflaeche-f.test.mjs` (26).
* `tests/ui-mass.cjs`, sechs Breiten (320/375/390/430/768/1280), **jeder
  Schritt jedes Modus in beiden Zweigen**, Laden 1–6 einzeln — 288
  Seitenmessungen: **zehn Urteile ✓**, null Überlauf, null Beschnitt, null
  JS-Fehler, keine Schrift unter 15 px, kein Griff unter 44 px im Service,
  kein Kontrast unter 4,5:1, Gestaltungsschicht wortgleich.
* `tests/ui-nachjagd.cjs`: neun Prüfungen, die die A- und B-Funde der
  fünften Jagd nachstellen — alle ja.
* Belege je Befund in 320/375/390/430 px: `review/screens/f1/` bis `f9/`.

## Was die Jagd danach gefunden hat

Der Jäger fand in diesem Stand **vier A-Funde, vier B-Funde**. Drei der
vier A-Funde waren meine eigenen, aus dieser Runde:

* **A1** — Das Raster aus F3 stand an `.w`, der Grundform ALLER acht
  Listenzeilen. In „Sonderentnahme · Getränke" stand der Zählknopf 31 px
  ausserhalb des Fensters. Behoben.
* **A2/A3** — `fernNeuer()` und `start()` fragten verschiedene Tage, und
  ein laufender Vorgang wurde still weggeräumt, sobald „Anderes Datum"
  gewählt war. Beides behoben, beides in `tests/ui-nachjagd.cjs`.
* **A4** — siehe oben unter „Was NICHT erledigt ist": eine Entscheidung,
  kein Fehler, den ich beheben darf.

Und die erweiterte Messung fand sofort **vier Fehler, die es seit Monaten
gibt und die niemand gemessen hatte**: die Kellerzählung rollte bei 320 px
waagrecht (178 Stellen), die Sprungleiste lag unter der Statuszeile, ihre
Knöpfe waren 36 px breit, die Zählfelder 40 px. Alle vier behoben. Die
Lehre ist die des Auftrags: eine Messung, die nur die Eingangstür jedes
Modus ansieht, sagt über das Haus nichts.

## Sperrliste

Der Diff berührt nichts aus **Anmeldung, Token, Codes, Schema,
Migrationen, `RUNDEN`, `wrangler.jsonc`**. `public/` hat unverändert vier
Dateien. Die geteilte Gestaltungsschicht steht in beiden HTML-Dateien
wortgleich. `sw.js` VERSION v31 → v32. Keine Migration in diesem Stand.

## Vor dem Merge

Keine Migration nötig. Aber: **Merge = Livegang auf alle Geräte.** Was
dabei einmalig passiert, steht oben unter 1 (verschobener Betriebstag) und
4 (gelöschter Bildspeicher).


---

# Vorgeschichte · Nacht auf den 18.09.2026


## Was sich geändert hat

**Das Tool schreibt zum ersten Mal wirklich in die Datenbank.** Der Worker
hat gegen Spalten geschrieben, die es in der laufenden D1 nicht gibt
(`vorgang.art`, `vorgang.person`, `vorgang.ts`). Jede Fassung endete in
einem Fehler, den niemand sah: Die App legte das Paket in ihre Reihe und
versuchte es weiter. `vorgang` und `ereignis` waren leer, keine einzige
Fassung ist je angekommen. Der Worker ist jetzt an das dokumentierte
Live-Schema angepasst — nicht umgekehrt, es wird keine Tabelle geändert.

**Die Anmeldung nimmt genau vier Ziffern.** Runde 13 hatte die Felder auf
sechs bis acht geöffnet, weil die vier ersten Codes des Hauses aus der
Geschichte des Anhangs bekannt sind. Runde 15 dreht das zurück: Im Keller
wird mit kalten Fingern getippt, und vier Ziffern sind das, was sich ein
Team merkt. Abgeschickt wird jetzt von selbst, sobald die vierte Ziffer
steht; der Haken bleibt als zweiter Weg. **Der Worker vergibt neue Codes
nur noch mit vier Ziffern; bestehende Prüfsummen gelten weiter** — geprüft
wird die Länge ausschliesslich beim Vergeben, nie beim Anmelden. Was das
für den Livegang bedeutet, steht unter „Die Codes Schritt für Schritt":
ein Code mit mehr als vier Ziffern lässt sich danach nirgends mehr
eintippen.

Zwei Fehler in derselben Ecke sind dabei mitgegangen: Die Löschtaste des
Ziffernblocks hängte „undefined" an den Code statt die letzte Ziffer
wegzunehmen (`data-weg` steht ohne Wert in der Zeile, ein Wahrheitstest
darauf ist immer falsch) — wer sich vertippte, kam nicht mehr herein. Und
ein ersetzter Code blieb auf jedem Gerät liegen, das ihn einmal gesehen
hat, und kam dort ohne Netz weiter in die App; ein Gerät merkt sich jetzt
je Person genau einen Code, den zuletzt beim Server bestätigten.

**Sicherheit und Anmeldung.** Der vierstellige Verwaltungscode stand im
Klartext in der ausgelieferten `index.html` — er ist weg, Verwaltung und
Freigabe verlangen einen persönlichen Code, der sich auf diesem Gerät schon
einmal angemeldet hat. Die Anmeldesperre zählt zehn Fehlversuche je IP in
einer Viertelstunde und sagt, wie viele Versuche bleiben und ab wann es
wieder geht.

**Im Betrieb.** Der Keller-Schritt meldet nicht mehr „alle Kühlschränke
sind voll", wenn Bar und Restaurant gar nicht geprüft waren, sondern nennt
die ungeprüften Plätze und die Annahme dahinter. Der Satz zum überholten
Stand nennt den Vorgang beim Namen. Das Backoffice sagt in jeder Ansicht,
warum nichts dasteht, statt eine leere Tabelle zu zeigen.

**Der erste echte Z-Bericht liegt im Repo — und hat den Leser widerlegt.**
`tests/fixtures/zbericht-37-extended.csv` ist der anonymisierte Abschluss
Nr. 37 (Nacht vom 15. auf den 16.09.). Beim ersten Lauf las `parseZ`
daraus **106 Positionen mit 1345,75 Stück und 5166,70 €** statt 50 Zeilen
mit 145 Stück und 602,50 €: Steuersätze, Kellner, Zimmerbuchungen und
Warengruppen landeten als Getränke im Wareneinsatz. Der Grund ist die
Form, die niemand kannte — der echte Bericht eröffnet jede Tabelle mit
einer Spaltenüberschrift („Positionen | Anzahl | Betrag"), trennt seine
Teile mit Rauten statt Strichen, schreibt die Z-Nummer in zwei Felder und
seine Leerzeilen als vier leere Felder. Alles vier ist jetzt gelesen, der
Positionsblock wird beim Namen genommen, und die Summe wird gegen zwei
Summen des Berichts selbst geprüft.

**Der teuerste Einzelfund: „1/8 l" war acht Liter.** Der offene Wein heisst
im echten Bericht „GV Leindl Langenlois 1/8 l". Die Mengensuche griff auf
„8 l" und gab 8000 ml zurück statt 125 — Faktor 64, auf der halben
Weinkarte, und damit auf jeder Zahl, die Ausschank mit Fassung vergleicht.
Der nachgebaute Bericht schrieb „1/8" ohne Einheit und traf die Falle nie.
Mitbehoben: derselbe Fehler im Kern der Bezeichnung, der „GV Leindl
Langenlois 1/" stehen liess, sodass Glas und Flasche desselben Weins nie
zusammenfanden.

**Rabatt und Storno sind Verbrauch** (deine Vorgabe: die Ware ist in beiden
Fällen entnommen). Am Bericht nachgerechnet: Der Rabatt steckt bereits in
den Positionen — 602,50 − 52,00 Welcomedrink = 550,50 Umsatz, auf den
Cent. Für die Fassung ist nichts hinzuzuzählen; der Rabatt zieht allein am
Geld. Der Storno dagegen fehlt den Positionen (die 4,20 sind in den 602,50
nicht enthalten), und der Bericht nennt nur den Grund
(„Bedienerfehler"), nicht den Artikel. Diese eine Einheit geht deshalb als
Zahl mit hinaus — in die Antwort des Imports und in die Journalnotiz der
eingegangenen Mail —, statt lautlos zu fehlen und in der ersten
Kellerzählung als Schwund wieder aufzutauchen.

**Das Backoffice zeigt und ändert, was auf dem Server steht.** Bis v22
redete die Leitungsseite mit dem Server an vier Stellen: wer bin ich, die
Vorgänge, die Mitarbeiter. Z-Berichte, Zuordnungen, Rezepturen und
Einstellungen lagen im Browserspeicher **eines** MacBooks. Das hatte zwei
Folgen, die im Betrieb weh tun: Ein Bericht, der per Mail hereinkam, war im
Backoffice unsichtbar — und die Zuordnung, die dort eine halbe Stunde
Arbeit kostet, wirkte nicht auf den Import, weil der Worker eine
Zuordnungstabelle las, in die niemand schrieb. Beides kommt jetzt vom
Server; der Browserspeicher ist nur noch die Abschrift für den Fall ohne
Netz.

Dabei kam heraus, dass in `public/leitung.html` ein **zweiter Z-Bericht-
Leser** stand — eine Abschrift von `gnparse.js` mit genau den Fehlern, die
dort schon behoben waren. Dieselbe Datei: Worker 48 Positionen und
602,50 €, Backoffice 106 Positionen und 5166,70 €, das Achtel als acht
Liter. Der zweite Leser ist ersatzlos weg, es gibt einen Leser und eine
Zahl.

**Drei Eingaben schrieben falsche oder gar keine Mengen.** Der Wareneingang
rechnete jede Kiste mit sechs Flaschen (der Worker las `kg`, die App
schreibt `kistengr`) — beim Zwölfer kam die halbe Lieferung an, während
der Schirm „24 Flaschen · 12er Kisten" zeigte. Eine Getränkelieferung
wurde als Entnahme gebucht, ein Vorzeichenfehler von 48 Flaschen. Und das
**Nachfüllen erzeugte überhaupt keine Buchung**: Der Worker summierte die
Weinorte, die beim Nachfüllen leer sind, und die geholten Getränke standen
in einem Feld, das er nie las. Alle drei behoben und mit Prüfungen
festgenagelt. Dazu: „Ignoriert" räumt den Artikel jetzt auch wieder aus den
schon eingelesenen Zeilen, die Absenderprüfung des Postfachs vergleicht die
Domäne statt das Ende der Adresse (`post@boesegastronovi.com` kam durch),
und ein abgelehnter Mailimport nennt den Grund statt „Z-Bericht undefined".

**Zwei Fallen im Backoffice.** Eine Teilzählung — drei auffällige Weine
nachzählen, wie es die Zählliste selbst vorschlägt — setzte die anderen
vierundfünfzig auf „—"; die Leitung rechnet jetzt wie der Worker je Artikel
mit der jüngsten Zählung. Und die Leitung konnte sich mit einem Klick
selbst sperren: Bei einer einzigen Leitungsperson kam danach niemand mehr
hinein, Rückweg nur über die D1-Konsole.

**Prüfgerüst.** `npm test` (211 Prüfungen) und `node tests/durchstich.cjs`
(35 Punkte) laufen ohne Netz und ohne Installation. Der Durchstich fasst
App und Worker gleichzeitig an, gegen eine Datenbank, die aus
`docs/live-schema.sql` aufgebaut ist — die Attrappe, die drei Runden lang
die falschen Spaltennamen bestätigt hat, ist gelöscht.

## Migrationen

<!--
Enthält der PR Migrationen, steht ganz oben im PR: "Vor dem Merge Migrationen einspielen".
Hier jede Migration Zeile für Zeile zum Einfügen in die D1-Konsole, jeweils mit erwarteter Ausgabe.

Beispielform:

### migrations/001_beschreibung.sql

| # | Zeile zum Einfügen | Erwartete Ausgabe |
|---|---|---|
| 1 | `CREATE INDEX ...;` | `Executed 1 command` |
-->

**In diesem Stand ist KEINE Migration nötig.** Der Code ist an das
vorhandene Schema angepasst worden, nicht umgekehrt (Regel 2 und 3). Was
hier steht, ist vorbereitet und **absichtlich nicht eingespielt**.

### migrations/001_mapping_rezept.sql — nur bei Bedarf, siehe OFFENE-ENTSCHEIDUNGEN Nr. 10

Nicht nötig für den aktuellen Stand. Der Worker lehnt Rezepturen mit einem
lesbaren 422 ab, solange die Spalte fehlt; alles andere läuft unverändert.

| # | Zeile zum Einfügen | Erwartete Ausgabe |
|---|---|---|
| 1 | `ALTER TABLE mapping ADD COLUMN rezept TEXT;` | `Executed 1 command` — 0 Zeilen gelesen, 0 geschrieben |
| 2 | `PRAGMA table_info(mapping);` (Kontrolle) | 7 Zeilen: `fremd, status, artikel, gebinde_ml, wer, angelegt, rezept` — die letzte mit `type=TEXT`, `notnull=0` |

Lokal gegen `docs/live-schema.sql` durchgespielt: bestehende Zeilen bleiben
stehen und bekommen `rezept = NULL`.

### Kontrolle des Schemas — erledigt, hier zum Nachschlagen

`docs/live-schema.sql` ist am 17.09. gezogen und anschliessend mit
`PRAGMA table_info` für **alle neun Tabellen** gegen die laufende D1
gegengelesen (Kopf der Datei, Commit `2ea053a`). Die Zeilen unten sind die
Gegenprobe, falls du sie noch einmal selbst sehen willst. Nur Lesen, kein
`INSERT`/`UPDATE`/`DELETE`:

| # | Zeile für die D1-Konsole | Erwartete Ausgabe |
|---|---|---|
| 1 | `PRAGMA table_info(vorgang);` | 13 Zeilen: `id, modus, branch, tag, wer, begonnen, geaendert, abgeschlossen, status, daten, schluessel, zaehlnr, geraet` |
| 2 | `PRAGMA table_info(ereignis);` | 11 Zeilen: `id, ts, tag, art, quelle, vorgang, artikel, ort, menge, wer, notiz` — `notiz` als einzige mit `notnull=0` |
| 3 | `PRAGMA table_info(fassungsliste);` | 9 Zeilen: `id, tag, z, kostenstelle, von_ts, bis_ts, importiert, wer, roh` |
| 4 | `PRAGMA table_info(fassungszeile);` | 7 Zeilen: `liste, rohbez, kern, anzahl, betrag, ausschankMl, artikel` |
| 5 | `PRAGMA table_info(mapping);` | 6 Zeilen: `fremd, status, artikel, gebinde_ml, wer, angelegt` |
| 6 | `PRAGMA table_info(stamm);` | 4 Zeilen: `schluessel, wert, geaendert, wer` |
| 7 | `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='fassungsliste';` | nur `i_liste_tag` — **kein** UNIQUE auf `tag` |

Weicht eine Zeile ab, ist `docs/live-schema.sql` und damit dieser Stand
falsch.

## Aufgaben für dich (nicht von Claude erreichbar)

<!-- Dashboard-Einstellungen, Secrets, alles nach Regel 13. -->

Die Auflagen des qa-guardian aus Runde 3, in der Reihenfolge, in der sie zu
tun sind. **Die Reihenfolge ist nicht beliebig:** Der Codewechsel braucht
diesen Stand live UND die neue App auf dem Gerät, sonst nimmt das
Anmeldefeld den neuen Code nicht an.

**`ANLAGE_OFFEN` ist seit 17.09. gelöscht** (`/api/ping` meldet
`anlage: false`) — die frühere Auflage dazu ist erledigt. Für den
Codewechsel wird sie **nicht** gebraucht: Die Benutzerverwaltung im
Backoffice läuft über die Anmeldung, nicht über die offene Tür. Der einzige
Fall, in dem sie noch einmal nötig wäre, steht unten unter „Notweg".

| # | Wann | Was |
|---|---|---|
| 0 | **vor** dem Merge | **Prüfen, ob du eine Leitung bist.** Im Fassungstool anmelden, dann `leitung.html` öffnen und auf **Team** gehen. Siehst du die Personenliste, ist alles beisammen. Steht dort „Nur die Leitung darf Mitarbeiter verwalten", fehlt deinem Konto die Rolle `leitung` — dann gilt der Notweg unten, und zwar **bevor** du mergst. |
| 1 | **vor** dem Merge | **Die Geräte nicht aufräumen.** Kein Cache leeren, keine Seite „neu installieren". In der Reihe der Geräte (`hh_ausgang_v1`) liegen alle Fassungen, die nie angekommen sind. |
| 2 | **vor** dem Merge | **Sicherung der D1 anlegen.** Heute ist sie fast leer, ab dem ersten Abend stehen dort Daten, die es nur dort gibt, und D1 hat keinen Papierkorb. |
| 3 | beim Merge | **`migrations/001_mapping_rezept.sql` NICHT einspielen.** Dieser Stand braucht sie nicht (siehe oben, Abschnitt Migrationen). |
| 4 | direkt nach dem Merge | **Auf jedem Gerät die neue App holen** — mit Netz öffnen und neu laden. Erkennbar am Anmeldeschirm: ein Kopf in der Hausfarbe mit „Haus Hirt", darunter **vier** Kästchen und der Satz „Melde dich mit deinem Code an." Stehen dort sechs Kästchen oder drei Sätze Text, läuft noch die alte App. |
| 5 | danach | **Die persönlichen Codes auf vier Ziffern bringen.** Ablauf unten. |
| 6 | erster Abend | **Jemanden neben die Servicekraft stellen**, die die erste Fassung macht — bei Schritt 3 „Holen". Und beim ersten Kontakt der Geräte zusehen: Die Reihe schickt die liegengebliebenen Fassungen auf einmal nach. Das sieht aus wie ein Fehler und ist richtig so. |
| 7 | erste Woche | **Zahlen aus „Verkauf ↔ Fassung" gegenlesen**, bevor eine Bestellung oder Abrechnung darauf steht. Der erste echte Bericht liegt jetzt vor und wird richtig gelesen — aber es ist ein Bericht aus einer Nacht. Die Gegenprobe steht im Bericht selbst: Die Stückzahl und die Summe des Werkzeugs müssen mit „Warengruppen" und „Hauptwarengruppen" übereinstimmen (bei Nr. 37: 145 Stück, 602,50 €). |

### Die Codes Schritt für Schritt

**Runde 15 dreht die Länge zurück: genau vier Ziffern.** Der Grund ist die
Bedienung im Keller — kalte Finger, eine Flasche in der anderen Hand. Der
Preis ist der kleinere Zahlenraum; was dagegensteht, ist die gestaffelte
Sperre (unten).

**Vorher lesen, es ist die einzige Falle dieses Merges:**

Der Stand von Runde 13 hat das Gegenteil verlangt — dort stand hier die
Anweisung, alle Codes durch **sechs- bis achtstellige** zu ersetzen, weil
die vier ersten Codes des Hauses im Klartext in der Geschichte des Anhangs
stehen (Commits `3e8d7e2` und `f6ab7e1`) und bis v11 öffentlich
ausgeliefert wurden. Wer dieser Anweisung gefolgt ist, hat heute einen
Code mit mehr als vier Ziffern.

**Nach diesem Merge lässt sich ein solcher Code nirgends mehr eintippen.**
Der Worker prüft beim Anmelden weiterhin keine Länge — die Prüfsumme
bleibt gültig. Aber jedes Eingabefeld der App hört nach der vierten Ziffer
auf: Anmeldung, Verwaltung, Freigabe. Und `leitung.html` hat keine eigene
Anmeldung, es lebt vom Keks aus der App. Wer nicht in die App kommt, kommt
auch nicht ins Backoffice.

> **Deshalb vor dem Merge:** Tippe deinen Code und zähle die Ziffern.
> **Mehr als vier → nicht mergen**, sondern zuerst über den Notweg unten
> einen vierstelligen setzen.

Sind es vier Ziffern, ist nichts zu tun — du meldest dich nach dem Merge
an wie bisher.

### Codes vergeben und zurücksetzen

Die Benutzerverwaltung liegt im Backoffice unter **Team** und läuft über
`GET/POST /api/personen`. Der Worker verlangt dort nur eines: eine gültige
Anmeldung mit der Rolle `leitung`. `ANLAGE_OFFEN` braucht sie nicht — das
betrifft ausschliesslich `/api/anlage` und `/api/hash`, also die
Selbstanlage OHNE Anmeldung, und die ist seit dem 17.09. geschlossen.

Zwei Wege, einen Code zu setzen:

* **„PIN zurücksetzen"** (neu in Runde 15), je Zeile in der Liste. Der
  Server würfelt vier Ziffern, prüft sie gegen alle anderen Personen auf
  Dopplung, speichert nur die Prüfsumme und zeigt den Code **genau
  einmal** gross auf dem Schirm. Er lässt sich nicht noch einmal anzeigen —
  notieren, solange er dasteht.
* **Selbst eintragen** geht seit Runde 16 **nur noch für NEUE Menschen.**
  Das Formular legt an; wer schon in der Liste steht, bekommt eine Absage
  mit dem Hinweis auf seine Zeile. Einen neuen Code für jemanden, den es
  schon gibt, holst du dort über „PIN zurücksetzen", die Rolle änderst du
  im Auswahlfeld seiner Zeile.

  *(Bis Runde 16 schrieb dieses Formular die vorhandene Person still um —
  ihr bisheriger Code war danach tot, ohne dass es jemand erfuhr, ihre
  Rolle fiel auf „Service" zurück, weil das Auswahlfeld nie vorbelegt
  wurde, und eine Sperre war aufgehoben. Die einzige Leitung stufte sich
  damit sofort selbst ab, samt laufender Sitzung; zurück ging es nur über
  die D1-Konsole. Gefunden von der zehnten Jagd.)*

**Reihenfolge, wenn mehrere Codes zu ändern sind:**

1. **Eine Person zuerst, dann prüfen:** auf einem zweiten Gerät mit der
   neuen App mit dem neuen Code anmelden. Erst wenn das geht, die übrigen.
2. **Deinen eigenen zuletzt.** Setzt du ihn über „PIN zurücksetzen" in
   deiner Zeile neu, bleibt die offene Sitzung gültig — sie hängt am Keks,
   nicht am Code —, du fliegst also nicht heraus. Melde dich erst ab, wenn
   der neue Code auf einem zweiten Gerät funktioniert hat.
3. **Zum Schluss jedes Gerät im Haus einmal mit dem neuen Code anmelden.**
   Erst diese Anmeldung räumt den alten Code aus dem Gerät; ein Gerät, das
   nie wieder angemeldet wird, kennt ihn ohne Netz weiter.

**Aussperren kannst du dich dabei teilweise doch.** Die eigene Person und
die letzte freigegebene Leitung lassen sich in der Oberfläche nicht
sperren — der Worker setzt das aber nicht durch, und „PIN zurücksetzen"
hat keine solche Bremse. Beides steht im Backlog.

### Die Sperre nach Fehlversuchen

Zehn Fehlversuche in zwei Stunden sperren **die IP** für eine
Viertelstunde, die nächsten zehn für eine halbe, danach für eine ganze.
Länger wird es nicht. Eine geglückte Anmeldung räumt alle Fehlversuche
dieser IP sofort weg.

**Im Haus teilen sich alle Geräte eine IP.** Zehn Vertipper an der Bar
sperren also auch den Keller aus — auch jemanden, der seinen Code weiss.
Das ist bekannt und nicht behoben; der Weg dorthin (pro Gerät zählen
statt pro IP) steht mit Priorität hoch im Backlog und braucht eine
Migration.

### Notweg — wenn niemand mehr hineinkommt

Er gilt für zwei Fälle: Es gibt kein Konto mit der Rolle `leitung`, oder
der hinterlegte Code hat mehr als vier Ziffern und lässt sich nicht mehr
eintippen. Die D1-Konsole wird dafür **nicht** gebraucht.

1. `ANLAGE_OFFEN` im Dashboard **wieder setzen** (irgendein Wert).
2. Sofort eine Leitung anlegen: `POST /api/anlage` mit
   `{"name":"…","rolle":"leitung","code":"…"}`, **Code genau vier Ziffern**.
   Kontrolle: `/api/ping` — `personen` muss um eins gestiegen sein.
3. **`ANLAGE_OFFEN` im selben Arbeitsgang wieder löschen** — nicht „später",
   nicht „nach dem Service". Zwischen Setzen und Löschen liegen Minuten, und
   in dieser Zeit legt sich jeder, der die Adresse kennt, ein Konto mit
   Rolle `leitung` an. Kontrolle: `/api/ping` meldet wieder
   `anlage: false`.
4. Anmelden, dann im Backoffice unter **Team** die übrigen Codes richten.

### Weiterhin offen, unabhängig vom Livegang

* **Ein zweiter echter Z-Bericht.** `tests/fixtures/` hat seit dem 17.09.
  einen — aus einer Nacht. Einer aus einer anderen Woche, am besten mit
  Fassbier und ohne Frühstück, wäre die billigste weitere Sicherheit.
* **`review/INPUT-TEAM.md`** ist leer. Anliegen des Teams haben laut
  `CLAUDE.md` Vorrang vor allem, was die Rollen sich ausdenken. Besonders
  die Zeile „Leitung: Was will ich morgens auf einen Blick sehen?".
* **`review/OFFENE-ENTSCHEIDUNGEN.md` Nr. 4 bis 15** warten auf dich. Die
  teuersten: Nr. 7 (Sonderentnahme ohne Grund), Nr. 6 (wer Soll-Mengen und
  Glasweine festlegen darf), Nr. 15 (Betriebstag oder Zeitstempel — greift
  genau dann, wenn die Geräte am ersten Tag alles auf einmal nachschicken).

## Was ausdrücklich NICHT gebaut wurde

* **Der gespaltene Z-Bericht.** Die Frage ist am echten Bericht
  beantwortet: **Nr. 37 ist nicht gespalten.** Bar und Restaurant stehen
  als Tagessumme („Kostenstellen": 24 / 299,00 und 29 / 251,50), die
  Artikel stehen in einem einzigen Block „Positionen"; getrennt gebucht
  sind sie trotzdem, und genau das ist Eigenheit 1 (derselbe Wein zweimal,
  wird summiert). Der Positionsblock wird jetzt beim Namen gewählt, nicht
  mehr nach Zeilenzahl — damit gewinnt er auch gegen die beiden
  Warengruppen-Tabellen, die dieselben Artikel zusammengefasst noch einmal
  enthalten. Der alte Weg (grösster Block) bleibt als Rückfall für
  Berichte ohne diesen Namen, und mit ihm die Lücke: Ein tatsächlich
  gespaltener Bericht ohne „Positionen"-Überschrift verlöre weiter die
  kleinere Hälfte. Festgehalten in `tests/zbericht.test.mjs`, Entscheidung
  Nr. 12 — jetzt mit Befund.
* **Getränke-Automapping** bleibt aus (Regel 5).
* **Der Grund bei der Sonderentnahme** (Bruch, Personal, Küche,
  Verkostung) — fachliche Entscheidung Nr. 7, kein Agentenbeschluss.
* **Der Umzug des Verwaltungs-Editors ins Backoffice** und `hh_cfg_v9` nach
  D1 — hängt an Entscheidung Nr. 6.
* **`RUNDEN`** bleibt bei 1000 (Regel 11): Eine Änderung macht alle vier
  Anmeldungen ungültig.
* **`npm run deploy`** steht weiter in `package.json` und ist weiter im
  Backlog — entfernen ist deine Entscheidung, nicht meine.

## Getestet

| Prüfung | Ergebnis |
|---|---|
| `npm test` | 211 Prüfungen, alle grün. Ohne Netz, ohne Installation, Bordmittel von Node 22. |
| `tests/ui-leitung-echt.cjs` | 22 Punkte: das Backoffice in Chromium (1440×900) gegen den echten Worker, die echte Datenbank und den echten Z-Bericht. Eingelesen über die Oberfläche, Zuordnung landet in `mapping`, ein zweites Gerät mit leerem Browserspeicher sieht beides, ein nur per Mail eingelieferter Bericht ist sichtbar, eine Teilzählung lässt alle 57 Weine stehen. |
| `tests/modi.test.mjs` | 16 Prüfungen: alle fünf Modi bis ins Journal (Vorzeichen, Ort, Kistengröße), die Zuordnung in beide Richtungen, die Absenderprüfung des Postfachs. |
| `tests/zbericht-37.test.mjs` | 24 Prüfungen am echten Bericht Nr. 37: Kopf, Blockwahl, die vier Eigenheiten mit ihren Zahlen, Rabatt und Storno, und der ganze Weg durch den Worker bis in `fassungszeile` (48 Zeilen, 145 Stück, 602,50 €, `ausschankMl` 125 für das Achtel). |
| `node tests/durchstich.cjs` | 35 von 35 Punkten. Fasst App **und** Worker gleichzeitig an, gegen eine echte SQLite-DB aus `docs/live-schema.sql`. **Vor jedem Livegang laufen lassen.** |
| `node tests/persona-tagesfassung.cjs` | Anmeldung mit vierstelligem Code, Tagesfassung bis zum Abschluss, Abbruch, Offline, doppeltes Absenden, abgelaufene Sitzung — durchgelaufen. |
| Anmeldung am iPhone-Maß (Chromium) | Vier Felder; Ziffern kommen vom Ziffernblock UND von der Tastatur, Rücktaste nimmt die letzte weg, die vierte Ziffer sendet von selbst. |

Nicht geprüft: **Safari auf einem Telefon** (alles Visuelle ist Chromium in
iPhone-Maßen) und der **Mailweg ab dem Postfach** (Dashboard). Der echte
Z-Bericht ist geprüft — einer, aus einer Nacht. Ein zweiter aus einer
anderen Woche wäre die billigste weitere Sicherheit.
