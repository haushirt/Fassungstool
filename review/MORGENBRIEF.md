# Morgenbrief · Nacht auf den 18.09.2026

Gearbeitet wurde in vier Runden (6–9) mit sechs Rollen, dazwischen dreimal
der Jäger. Alles liegt auf `claude/optimistic-feynman-o7jsgy`.
Ausgangsstand der Nacht: **`e3eb7b9`** (= `main`, `sw.js` v24).

---

## 1 · Was jetzt live ist

**STAND BEI ABSCHLUSS DES BRIEFS: (wird beim letzten Zug eingetragen)**

Rückweg auf den Stand vor der Nacht, falls alles weg soll:

```
git revert --no-commit e3eb7b9..HEAD && git commit -m "Nacht zurueckgedreht"
```

Die Nacht hat sieben Zahlenfehler behoben, die heute live standen:

1. **Kein geratenes Glas mehr.** „Amaro Averna 2 cl" × 3 wurde als **3 ganze
   Flaschen** verbucht statt 0,09; „Sanbitter Spritz 1 Glas" als eine
   Flasche. Positionen ohne bestätigte Größe rechnen jetzt gar nicht mit und
   stehen sichtbar als „Größe fehlt".
2. **`mapping.gebinde_ml` wird endlich benutzt.** Die Spalte gab es live, der
   Worker schrieb sie — gelesen hat sie nie jemand.
3. **Kistengröße:** Das Backoffice las `p.kg`, ein Feld, das die App nie
   geschrieben hat. Zwei Kisten à 20 standen im Journal mit 40, auf dem
   Schirm mit 12.
4. **Zweiter Wareneingang am selben Tag:** nahm den ersten per Gegenbuchung
   aus dem Bestand. Jetzt fragt die App („Ergänzen" / „Trotzdem neu
   beginnen" / „Abbrechen").
5. **Gelieferte Getränke** zählten im Backoffice als Entnahme — 24 gelieferte
   Cola erschienen als „Diff +24, Vorrat aufgebaut oder Schwund".
6. **Zwei Sortierungen:** Backoffice rechnete Lieferung vor Zählung, der
   Worker nach Ankunft. 10 Flaschen gegen 34 für denselben Tag.
7. **Der Fremdgerät-Dialog ließ sich nicht ablehnen** — „Abbrechen" öffnete
   ihn sofort wieder.

---

## 2 · Was du selbst tun musst

| ✔ | Was | Minuten | Warum nur du |
|---|---|---|---|
| ☐ | **Die vier persönlichen Codes neu vergeben**, sechs bis acht Ziffern. Ablauf in `review/ERGEBNIS.md`, Abschnitt „Die vier Codes Schritt für Schritt". | 20 | Ich habe lesend nachgesehen: alle vier Personen stammen unverändert vom **01.09.** Die ersten Codes stehen im Klartext in der Git-Historie und gelten weiter. |
| ☐ | **Jedes Gerät einmal neu anmelden** (iPhone, iPad, MacBook), sonst gilt der alte Code dort ohne Netz weiter. | 10 | Geräte |
| ☐ | **Im Backoffice die Gebindegrößen bestätigen**: „Verkauf ↔ Fassung" → Block „Größe fehlt" → **„Alle N Vorschläge übernehmen"**. Live sind es 13 Zuordnungen, alle ohne Größe. | 2 | Erst danach zeigt der Abgleich Zahlen. Sechs davon haben keinen Vorschlag (Cola, Sanbitter, Almdudler, Gasteiner still) — für die fehlt noch ein Eingabefeld, siehe Punkt 4. |
| ☐ | **`review/INPUT-TEAM.md` mit dem Team füllen** — Lagerorte, Laufweg, was beim Fassen nervt. | 15 | Ohne diese Antworten kann Phase B (Keller) nicht spezifiziert werden. |
| ☐ | **Migration `001_mapping_rezept.sql`**: NICHT einspielen, solange keine Rezepturen gebraucht werden. Wenn doch (Aperol Spritz & Co. sollen mitrechnen): einspielen, Ablauf in `review/ERGEBNIS.md`. | 5 | Migrationen spielst nur du ein. |
| ☐ | **Dashboard prüfen:** `ANLAGE_OFFEN` muss gelöscht sein. | 2 | Dashboard erreiche ich nicht. |

### iPhone-Prüfliste — was in Chromium nicht beweisbar war

Alles unten wurde bei 390 px in Chromium gemessen, **nicht** in echtem Safari.
Bitte einmal am eigenen Gerät durchgehen:

| ✔ | Wo tippen | Was passieren muss |
|---|---|---|
| ☐ | Tagesfassung öffnen, ganz nach unten scrollen | „Zurück"/„Weiter" sind erreichbar und liegen nicht unter der Home-Leiste (Safe-Area) |
| ☐ | Im Abschluss den Freigabe-Dialog öffnen, Code tippen | Der Knopf „Freigeben" bleibt über der Bildschirmtastatur sichtbar |
| ☐ | Im Keller-Schritt eine Zahl tippen und wegtippen | Die getippte Zahl bleibt stehen (kein Neuaufbau der Karte) |
| ☐ | Zweiten Wareneingang am selben Tag starten | Die Frage „Ergänzen / Trotzdem neu beginnen / Abbrechen" kommt, „Ergänzen" behält die erste Lieferung |
| ☐ | Flugmodus an, eine Fassung abschließen, Flugmodus aus | Das Paket geht binnen 45 s hinaus, die Statuszeile sagt es |
| ☐ | Auf dem zweiten Gerät denselben Vorgang öffnen, „Abbrechen" drücken | Der Dialog kommt **nicht** sofort wieder (das war bis heute Nacht kaputt) |
| ☐ | Service-Worker: Seite zweimal neu laden | Die neue Fassung (v27 oder höher) ist aktiv, nicht die alte aus dem Vorrat |

---

## 3 · Was ich nachts entschieden habe

Sieben Entscheidungen, jede mit Begründung, Aufwand zum Zurückdrehen und dem
Vermerk **„vorläufig, revidierbar"**: `review/ENTSCHIEDEN-NACHTS.md`.

Die drei, die am weitesten reichen:
* **Ausschankmenge** gehört in `stamm`, nicht in `mapping.gebinde_ml` — die
  Spalte wird nicht umgedeutet (45 Min. zurückzudrehen).
* **Soll-Mengen und Glasweine** ändert künftig die Leitung im Backoffice; der
  Editor in der App wird schreibgeschützt, nicht gelöscht (5 Min., solange
  P2 nicht gebaut ist).
* **Betriebstag entscheidet**, Zeitstempel nur bei Gleichstand (30 Min.).

Nicht entschieden und unverändert bei dir: Rollenbindung eines künftigen
`POST /api/stamm`, eine eigene Spalte `mapping.ausschank_ml`, die volle
Historie einer Soll-Änderung, `bekannterCode()`, das Zählen des
Getränkelagers, `RUNDEN`, `wrangler.jsonc`, Dashboard.

---

## 4 · Was ich nicht geschafft habe

* **P2 (Verwaltung raus aus der App) ist nicht gebaut.** Der Editor steht
  weiter in `public/index.html`, das Backoffice hat keine Verwaltungsseite
  und keinen Link dorthin. Entschieden ist der Weg (siehe oben), gebaut ist
  er nicht — das ist der größte offene Posten.
* **Kein Eingabefeld für Gebindegrößen ohne Vorschlag.** Sechs der 13
  Live-Zuordnungen (Cola, Sanbitter, Almdudler, Gasteiner still) haben keine
  Größe im Namen und bleiben deshalb dauerhaft aus der Rechnung. Der
  Endpunkt nimmt die Zahl an, es fehlt nur das Feld. Backlog, Priorität hoch.
* **Mischgetränke rechnen nicht mit.** Aperol Spritz, Pisco Sour und die
  übrigen „1 Glas"-Positionen — im echten Bericht 20 Stück und 244,50 € —
  brauchen Rezepturen; die liegen heute nur im Browser der Leitung.
* **Der Worker rechnet `bestand()` weiter nach Ankunftszeit**, das Backoffice
  seit heute Nacht nach Betriebstag. Im Normalfall dieselbe Zahl; ein
  nachgereichtes Paket lässt sie auseinanderlaufen. Backlog, Priorität hoch.
* **Die „sechs Oberflächenfehler aus dem iPhone-Test" lagen nicht vor** —
  weder `review/UEBERGABE.md` noch `fassungstool_review_referenz.md` sind im
  Repo. Ich habe die Oberfläche stattdessen neu vermessen
  (`tests/ui-mass.cjs`, drei Breiten, mit Urteil) und danach gearbeitet.
* **Echtes Safari bleibt ungeprüft.** Chromium kennt weder Bildschirmtastatur
  noch Notch noch Gummiband — daher die Prüfliste oben.

---

## 5 · Phase B: die Entscheidungen, die du treffen musst

Konzept: `review/PHASE-B-KONZEPT.md` (drei Module, je Zweck, Datenfluss,
Schema, Feature-Flag). Kein Code, wie verabredet.

Vorweg drei Befunde, die **vor** dem ersten Modul geklärt sein müssen
(Abschnitt 0 des Konzepts) — zwei davon sind heute Nacht behoben, der dritte
nicht: `bestand()` schlüsselt nicht auf `ort`. Sobald das Getränkelager ein
zweiter Zählort wird, wird die jüngere Zählung zum Anker für beide Orte.

Die Entscheidungen, kurz:
* **Wie viele Orte führen einen Bestand?** Empfehlung: zwei (Weinkeller,
  Getränkelager). Die Bar ist Phase C.
* **Wie oft wird das Getränkelager gezählt?** Empfehlung: monatlich, fester
  Termin, Datum neben jeder Zahl. Braucht die Antwort des Teams.
* **Was passiert mit der Differenz einer Zählung?** Empfehlung: anzeigen,
  gebucht wird die Zählung — die Differenz ist eine Auswertung, keine
  Buchung.
* **Wareneingang und Sonderentnahme:** je drei Fragen in den Abschnitten 2.5
  und 3.5. Die dringendste ist der **Grund** bei der Sonderentnahme (Küche ·
  Personal · Bruch/Kork · Verkostung/Gast · Zimmer) — der Stellvertreter hat
  ihn vorläufig entschieden, Wortlaut und Reihenfolge gehören ins Team.
* **Genau eine Migration** braucht Phase B:
  `ALTER TABLE ereignis ADD COLUMN grund TEXT;` plus Teilindex. Fertig
  formuliert mit erwarteter Ausgabe im Konzept, Abschnitt 3.3.

---

**Unterlagen:** `review/JAGD.md` (Funde des Jägers, mit Rechnungen) ·
`review/ENTSCHIEDEN-NACHTS.md` · `review/PHASE-B-KONZEPT.md` ·
`review/LOG.md` (Runden 6–9) · `review/BACKLOG.md` ·
`review/screens/` (`basis-live` = Stand vor der Nacht, danach je Runde).
