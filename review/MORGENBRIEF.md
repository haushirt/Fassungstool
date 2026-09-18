# Morgenbrief · Nacht auf den 18.09.2026

Sieben Runden (6–12) mit fünf Rollen, dazwischen viermal der Jäger — eine
Rolle, die nichts baut und nur sucht. Alles liegt auf
`claude/optimistic-feynman-o7jsgy`. Ausgangsstand: **`e3eb7b9`** (`sw.js` v24).

---

## 1 · Was live ist: NICHTS

`main` steht unverändert auf `e3eb7b9`, genau dort, wo du es gestern Abend
verlassen hast. Die Nacht liegt als **Pull Request** bereit:
**https://github.com/haushirt/Fassungstool/pull/2**

**Warum kein Merge — obwohl das Gate am Ende offen war.** Um 03:52 waren alle
sieben Bedingungen erfüllt: 286 Prüfungen grün (dreimal, drei Zeitzonen), der
Jäger meldete null A- und null B-Funde, alle acht Urteile des Messgeräts ✓,
`/api/ping` unverändert, `sw.js` von v24 auf v31, nichts aus der
Ausschlussliste berührt, und es war vor fünf.

Ich habe trotzdem nicht gemergt: **Die gesamte Oberflächenarbeit dieser Nacht
ist ausschließlich in Chromium belegt.** Der Service arbeitet auf iPhone und
iPad; ein Merge zieht v31 automatisch auf alle Geräte, und der Erste, der einen
Safari-Fehler sähe, stünde mit einer Flasche in der Hand im Keller. Zwischen
„ich merge um vier" und „du merged um acht, nach zehn Minuten auf dem eigenen
Telefon" liegt fast kein Zeitgewinn, aber ein ganzer Abendservice Unterschied.
Begründung ausführlich in `review/ENTSCHIEDEN-NACHTS.md` Nr. 11.

**Du merged selbst, wenn du willst.** Danach zurück geht es mit:

```
git revert --no-commit e3eb7b9..HEAD && git commit -m "Nacht zurueckgedreht"
```

### Was der Stand behebt — alles Fehler, die HEUTE live sind

1. **Kein geratenes Glas.** „Amaro Averna 2 cl" × 3 wurde als **3 ganze
   Flaschen** gebucht statt 0,09; „Sanbitter Spritz 1 Glas" als eine Flasche.
   Positionen ohne bestätigte Größe rechnen nicht mehr mit und stehen als
   „Größe fehlt" da.
2. **`mapping.gebinde_ml` wird endlich gelesen.** Die Spalte gibt es live, der
   Worker schreibt sie — benutzt hat sie nie jemand.
3. **Kistengröße:** Das Backoffice las ein Feld, das die App nie geschrieben
   hat. Zwei Kisten à 20 standen im Journal mit 40, auf dem Schirm mit 12.
4. **Zweiter Wareneingang am selben Tag** nahm den ersten per Gegenbuchung aus
   dem Bestand. Jetzt fragt die App: Ergänzen, neu beginnen oder abbrechen.
5. **Gelieferte Getränke** zählten im Backoffice als Entnahme — 24 gelieferte
   Cola erschienen als „Diff +24, Vorrat aufgebaut oder Schwund".
6. **Zwei Sortierungen im Umlauf:** derselbe Tag ergab 10 Flaschen im
   Backoffice und 34 im Worker.
7. **Der Fremdgerät-Dialog ließ sich nicht ablehnen** — „Abbrechen" öffnete ihn
   sofort wieder.
8. **Die Oberfläche im Service ist erstmals vermessen:** jeder Griff 44 px
   (vorher 48 zu kleine), keine Schrift unter 15 px (vorher 36 Stellen), kein
   Kontrast unter 4,5:1 (vorher 117), kein Überlauf bei 390/768/1280 px.

**Geprüft:** 286 Prüfungen grün (Start der Nacht: 211), dreimal hintereinander
und unter drei Zeitzonen; vier Browserläufe (Backoffice 40/40, Durchstich
35/35, zweiter Vorgang 15/15, Fremdgerät 10/10); Messgerät mit acht Urteilen.

---

## 2 · Was du selbst tun musst

| ✔ | Was | Min. | Warum nur du |
|---|---|---|---|
| ☐ | **Die vier Codes neu vergeben**, sechs bis acht Ziffern (Ablauf: `review/ERGEBNIS.md`). | 20 | Lesend nachgesehen: alle vier Personen stammen vom **01.09.**, die Codes sind nie ersetzt worden. Die ersten stehen im Klartext in der Git-Historie und gelten weiter. |
| ☐ | **Jedes Gerät einmal neu anmelden.** | 10 | Sonst gilt der alte Code dort ohne Netz weiter. |
| ☐ | **Pull Request ansehen und mergen**, falls du den Stand willst. | 10 | Merge = Livegang. |
| ☐ | **Gebindegrößen bestätigen:** „Verkauf ↔ Fassung" → „Größe fehlt" → „Alle N Vorschläge übernehmen". | 2 | Live haben **alle 13** Zuordnungen keine Größe. Erst danach zeigt der Abgleich Zahlen. Sechs davon (Cola, Sanbitter, Almdudler, Gasteiner still) haben keinen Vorschlag — siehe Punkt 4. |
| ☐ | **`review/INPUT-TEAM.md` mit dem Team füllen** — Lagerorte, Laufweg, was beim Fassen nervt. | 15 | Ohne diese Antworten lässt sich Phase B (Keller) nicht festlegen. |
| ☐ | **Migration `001_mapping_rezept.sql`** nur einspielen, wenn Mischgetränke mitrechnen sollen. | 5 | Migrationen spielst nur du ein. Dieser Stand braucht sie nicht. |
| ☐ | **Dashboard:** prüfen, dass `ANLAGE_OFFEN` gelöscht ist. | 2 | Nicht erreichbar für mich. |

### iPhone-Prüfliste — in Chromium nicht beweisbar

| ✔ | Wo tippen | Was passieren muss |
|---|---|---|
| ☐ | Tagesfassung, ganz nach unten | „Zurück"/„Weiter" liegen nicht unter der Home-Leiste (Safe-Area) |
| ☐ | Freigabe-Dialog, Code tippen | „Freigeben" bleibt über der Tastatur sichtbar |
| ☐ | Zählpunkte einer Weinzeile antippen | Jeder Punkt trifft einzeln — sie stehen jetzt in einem 46-px-Raster |
| ☐ | Schrittpunkte oben im Kopf antippen | Schritt 3 trifft Schritt 3, nicht Schritt 2 |
| ☐ | Lade 4 „Mischgetränke" ansehen | Die Kürzel überlappen nicht und sind unten nicht beschnitten |
| ☐ | Zweiten Wareneingang am selben Tag starten | Die Frage kommt; „Ergänzen" behält die erste Lieferung |
| ☐ | Flugmodus an, Fassung abschließen, Flugmodus aus | Das Paket geht binnen 45 s hinaus |
| ☐ | Zweites Gerät, denselben Vorgang, „Abbrechen" | Der Dialog kommt **nicht** sofort wieder |
| ☐ | Seite zweimal neu laden | Fassung v31 ist aktiv, nicht die alte aus dem Vorrat |

---

## 3 · Was ich nachts entschieden habe

Zehn Entscheidungen, jede mit Begründung, Aufwand zum Zurückdrehen und dem
Vermerk **„vorläufig, revidierbar"**: `review/ENTSCHIEDEN-NACHTS.md`.

Die vier, die am weitesten reichen:
* **Ausschankmenge** gehört in `stamm`, nicht in `mapping.gebinde_ml` — die
  Spalte wird nicht umgedeutet (45 Min.).
* **Soll-Mengen und Glasweine** ändert die Leitung im Backoffice; der Editor in
  der App wird schreibgeschützt, nicht gelöscht (5 Min. — noch nicht gebaut).
* **Bei gleichem Betriebstag gilt die Kellerzählung als Erstes** (20 Min.).
  Zwei meiner eigenen Vorgaben musste ich dafür zurücknehmen; steht dort.
* **Eine Lieferung am Zähltag wird nicht addiert, sondern ausgewiesen**
  (15 Min.) — weil nicht feststellbar ist, ob die Zählung sie schon enthält.

Nicht entschieden, unverändert bei dir: Rollenbindung eines künftigen
`POST /api/stamm`, eine Spalte `mapping.ausschank_ml`, die Historie einer
Soll-Änderung, `bekannterCode()`, das Zählen des Getränkelagers, `RUNDEN`,
`wrangler.jsonc`, Dashboard.

---

## 4 · Was ich nicht geschafft habe

* **P2 (Verwaltung raus aus der App) ist nicht gebaut.** Der Editor steht
  weiter in `public/index.html`, das Backoffice hat keine Verwaltungsseite und
  keinen Link dorthin. Der Weg ist entschieden, der Bau fehlt. Größter Posten.
* **Kein Feld für Gebindegrößen ohne Vorschlag.** Cola, Sanbitter, Almdudler,
  Gasteiner still tragen keine Größe im Namen und bleiben deshalb aus der
  Rechnung. Der Endpunkt nimmt die Zahl an, es fehlt nur das Eingabefeld.
* **Mischgetränke rechnen nicht mit** — im echten Bericht 20 Stück und
  244,50 €. Sie brauchen Rezepturen, die heute nur im Browser der Leitung
  liegen.
* **Kein erfasster Zählzeitpunkt.** Deshalb ist „Zählung oder Lieferung zuerst?"
  nur ausweisbar, nicht entscheidbar. `vorgang.begonnen` taugt dafür **nicht**
  (es trägt die Ankunftszeit beim Server) — das müsste die App beim Anlegen
  schreiben.
* **Die „sechs Oberflächenfehler aus dem iPhone-Test" lagen nicht vor.** Weder
  `review/UEBERGABE.md` noch `fassungstool_review_referenz.md` sind im Repo.
  Ich habe die Oberfläche stattdessen neu vermessen und danach gearbeitet.
* **Echtes Safari bleibt ungeprüft** — daher die Prüfliste oben.

**Und das Unangenehmste, offen gesagt:** Von den behobenen Rechenfehlern hat
diese Nacht drei selbst erzeugt — jedes Mal aus einer richtigen Absicht, jedes
Mal in der Runde danach gefunden und behoben. Gefunden hat sie der Jäger, nicht
die Rolle, die sie gebaut hat, und nicht ich. Ohne diese Rolle wären sie live
gegangen. Wenn du aus dieser Nacht eine Sache behältst, dann die: **Wer baut,
prüft sich nicht selbst.**

---

## 5 · Phase B: die Entscheidungen, die du treffen musst

Konzept: `review/PHASE-B-KONZEPT.md` — drei Module (Keller, Wareneingang,
Sonderentnahme), je Zweck, Datenfluss, Schema, Feature-Flag. Kein Code.

Vorweg: Ein Befund aus Abschnitt 0 ist noch offen — `bestand()` schlüsselt
nicht auf `ort`. Sobald das Getränkelager ein zweiter Zählort wird, wird die
jüngere Zählung zum Anker für beide Orte.

* **Wie viele Orte führen einen Bestand?** Empfehlung: zwei (Weinkeller,
  Getränkelager). Die Bar ist Phase C.
* **Wie oft wird das Getränkelager gezählt?** Empfehlung: monatlich, fester
  Termin, das Datum neben jeder Zahl. Braucht die Antwort des Teams.
* **Was passiert mit der Differenz einer Zählung?** Empfehlung: anzeigen,
  gebucht wird die Zählung. Die Differenz ist eine Auswertung, keine Buchung.
* **Der Grund bei der Sonderentnahme** (Küche · Personal · Bruch/Kork ·
  Verkostung/Gast · Zimmer): vorläufig entschieden, Wortlaut gehört ins Team.
* **Genau eine Migration** braucht Phase B:
  `ALTER TABLE ereignis ADD COLUMN grund TEXT;` plus Teilindex — fertig
  formuliert mit erwarteter Ausgabe im Konzept, Abschnitt 3.3.

---

**Unterlagen:** `review/JAGD.md` (alle Funde mit Rechnung) ·
`review/ENTSCHIEDEN-NACHTS.md` · `review/PHASE-B-KONZEPT.md` ·
`review/LOG.md` (Runden 6–12) · `review/BACKLOG.md` ·
`review/screens/` (`basis-live` = Stand vor der Nacht, danach je Runde).
