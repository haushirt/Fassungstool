# Morgenbrief · Nacht auf den 19.09.2026 · Runde 16

Eine Runde, ohne dich, durchgearbeitet. Ausgangsstand: **`ac8d93a`**
(`sw.js` v38), live. Neuer Stand: **`sw.js` v39**.

Der Brief der Nacht auf den 18.09. ist abgelöst — er beschrieb einen Pull
Request, der inzwischen gemergt ist, und schickte dich auf **sechs bis acht
Ziffern**. Das war schon beim Schreiben überholt und ist seit Runde 15
falsch: Es sind **vier**. Dieser Brief gilt.

---

## 1 · Was du tun musst, bevor gefasst wird

| ✔ | Was | Min. |
|---|---|---|
| ☐ | **Jedes Gerät einmal mit Netz neu laden.** iPhone/iPad: Seite herunterziehen. Als Web-App vom Startbildschirm: einmal ganz schließen und neu öffnen. | 5 |
| ☐ | **Erkennungszeichen prüfen:** Auf der Startseite steht ganz unten, unter den Kacheln, der Block **„Wenn etwas klemmt"** mit „Rohdaten sichern (JSON)". Steht er nicht da, läuft noch die alte App — dann noch einmal laden. | 1 |
| ☐ | **Drei Leute anlegen** im Backoffice unter „Team": **Asad Karakiri** (service), **Ian Lauchbein** (service), **Marinus** (wirtschaft). Namen und Rolle eintragen, Code irgendeinen vierstelligen — dann in der Zeile **„PIN zurücksetzen"** drücken und den gewürfelten Code notieren. Er ist **nur einmal** zu sehen. | 10 |
| ☐ | **Gasteiner 0,25 l in Lade 1 nachzählen.** Das Soll steht auf **8**. Passen dort acht Flaschen in die Spalte oder sieben? Die Zahl geht über das Nachfüllen ins Journal, und das Journal lässt sich nicht zurücknehmen. Sag mir die Zahl, dann ändere ich sie — ich habe sie ausdrücklich **nicht** angefasst. | 3 |

Mehr nicht. **Keine Migration, kein Dashboard-Schritt, kein Codewechsel.**

---

## 2 · Was in der Nacht passiert ist

### Die Funde der letzten Jagd — alle behoben

**„abmelden" hat nicht abgemeldet.** Der Knopf leerte nur den Speicher des
Geräts; die Sitzung am Server galt weitere zwölf Stunden. Am geteilten iPad
war die nächste Person damit über `/leitung.html` **volle Leitung** — samt
„PIN zurücksetzen". Der schwerste Fund der Nacht. Jetzt ruft der Knopf den
Server, wartet auf die Antwort und gibt das Gerät erst danach frei. Ohne
Netz wird die Abmeldung vorgemerkt, gesagt und beim nächsten Empfang
nachgeholt. Das Backoffice hat jetzt selbst einen Ausgang: unten in der
Navigation, „abmelden".

**Zwei Personen konnten denselben Code haben.** Beim Anmelden gewann dann
die letzte Zeile — und im Journal, das sich nicht ändern lässt, stünde
dauerhaft der falsche Name an einer Fassung. Ein doppelter Code wird jetzt
abgelehnt, auch gegen gesperrte Personen geprüft.

**Ein zurückgesetzter Code gab weiter frei.** „Trotzdem abschließen" prüfte
nur, was auf dem Gerät schon einmal geklappt hatte. Wer einen alten Code
kannte, gab damit im Protokoll unter dem Namen der alten Person frei. Jetzt
entscheidet der Server, und der tote Code fliegt dabei vom Gerät.

**Der neue Code konnte beim Zurücksetzen verloren gehen.** Brach die
Verbindung nach dem Speichern ab, war der Code vergeben und niemand hatte
ihn gesehen — die Person ausgesperrt, auf dem Schirm nur „Keine
Verbindung". Das Backoffice würfelt ihn jetzt selbst und kennt ihn, bevor
die Antwort unterwegs ist.

Dazu: Die Sperrmeldung sagte in allen drei Stufen „15 Minuten" und zählte
die Restversuche falsch. Und in einem privaten Fenster sprang die Anmeldung
stumm auf Anfang, ohne ein Wort.

### Die vier Punkte der Runde

**1 · Der Doppeltipp zoomt nicht mehr.** Zwei Flaschen, zweimal schnell auf
dieselbe Zeile — und die Seite sprang vergrößert. Weg. Der
Zwei-Finger-Zoom bleibt. Kein Eingabefeld ist mehr unter 16 px, damit
Safari beim Antippen nicht hineinspringt.

**2 · Der Abschluss ist eine Handlung geworden.** Ein Knopf: **„Fertig –
Speichern"**, in jedem Modus. „Protokoll senden", „Als PDF sichern", „Auch
als CSV" und das Notizfeld auf der Seite sind weg. Beim Drücken:

* Liegt ein **Z-Bericht vom Vorabend** vor, kommt das Fenster **Abgleich**:
  gefasst gegen verkauft, **nur die Abweichungen**, darunter **ein**
  Notizfeld für alles. Speichern → fertig, zurück zur Startseite.
* Liegt keiner vor: ein kurzes **„Fertig"**, dann die Startseite.

„Rohdaten sichern (JSON)" und „Zurücksetzen" sind nicht gelöscht — sie
stehen jetzt dezent am Ende des Menüs, als Notweg, wenn ein Gerät offline
klemmt.

**3 · Die Startseite.** Service hat den hellsten Grund und den kräftigsten
Ton, Bestand tritt zurück.

**4 · Die Verbindung.** Die Statuszeile sagt **„Verbunden"** statt „Nichts
liegt mehr auf diesem Gerät". „Fertig – Speichern" ist ohne Netz
ausgegraut, darunter steht der Grund, und sobald die Verbindung zurück ist,
wird der Knopf **von selbst** wieder drückbar. **Das Gefasste bleibt
unterdessen im Gerät gespeichert** — es geht nichts verloren, nur das
Abschließen wartet.

---

## 3 · Was ich allein entschieden habe

Du warst nicht erreichbar; hier sind die vier Entscheidungen, die ich
getroffen habe, und wie du sie zurückdrehst.

1. **Der Abgleich kommt nur bei Tagesfassung und Nachfüllen.** Bei
   Kellerzählung, Wareneingang und Sonderentnahme wäre jede Zeile eine
   „Abweichung" — dort kommt das kurze „Fertig". *Zurückdrehen: drei Zeilen
   in `abschlussSchritt`.*
2. **Der Abgleich rechnet den Offenausschank nicht mit.** Aus Gläsern
   Flaschen zu rechnen braucht die Gebindegröße, und live hat **keine** der
   13 Zuordnungen eine. Lieber eine ehrliche Fußzeile („die rechnet das
   Backoffice") als eine geratene Abweichung im Keller. *Sobald du die
   Größen bestätigt hast, lohnt der Ausbau — steht im Backlog.*
3. **„Fertig – Speichern" heißt in jedem Modus so**, auch wo bisher
   „Entnahme melden" / „Lieferung melden" stand.
4. **Ohne Netz meldet sich das Gerät trotzdem ab** und holt die Abmeldung
   am Server nach, sobald Empfang da ist. Sonst käme im Keller ohne Netz
   niemand mehr an ein Gerät.

---

## 4 · Was offen bleibt

* **Gasteiner 0,25 l** (siehe oben) — nur du kannst es nachzählen.
* **Die Anmeldesperre zählt pro IP.** Im Haus-WLAN teilen sich alle Geräte
  eine; zehn Vertipper an der Bar sperren den Keller mit aus. Der Ausweg
  wäre, pro Gerät zu zählen, und das braucht eine Migration — also dich.
* **Der Abgleich im Backoffice** („Verkauf ↔ Fassung") paart weiter um
  einen Tag versetzt. Der neue Abgleich im Keller paart richtig; die beiden
  widersprechen sich, bis das Backoffice nachzieht. Braucht deine
  Entscheidung (Backlog, seit 18.09.).
* **Die Selbstschutz-Abfragen** („dich selbst kannst du nicht sperren")
  stehen nur im Browser, nicht im Worker. Wer den Endpunkt direkt ruft,
  kommt daran vorbei. Nur die Leitung kann das, also kein Loch — aber es
  gehört in den Worker.
* Der Rest steht in `review/BACKLOG.md`, Abschnitt „Runde 16".

---

## 5 · Wenn etwas klemmt

**Zurückdrehen** (der Merge ist der Livegang, das Zurückdrehen auch):

```
git revert -m 1 <merge-commit> && git push origin main
```

Der Stand davor ist `ac8d93a` — die Fassung, mit der heute gearbeitet
wurde. **Es gibt keine Schemaänderung und keine Migration in diesem Stand**,
zurück geht also ohne Datenbankarbeit.

**Kommt niemand mehr herein:** `ANLAGE_OFFEN` im Dashboard setzen →
`POST /api/anlage` mit `{"name":"…","rolle":"leitung","code":"1234"}`
(vier Ziffern) → anmelden → `ANLAGE_OFFEN` wieder löschen.
