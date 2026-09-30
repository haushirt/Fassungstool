# Runde 24 · Backoffice neu geordnet · „leer" in der App

**Keine Migration.** Live-D1 nur gelesen (Mapping: 13 zugeordnet, 8 ignoriert, **0 bestätigte Flaschengrößen**).

## Backoffice
- **Oben nur noch zwei Seiten:** „Übersicht" und „Kellerstand". Alle bisherigen Seiten liegen unverändert unter **„Analytics"** (aufklappbar, gleiche Gruppen). Die alte Übersicht heißt dort „Tagesbericht".
- **Neue Übersicht** (Vorlage `review/mockup/r24/e-v3.html`, von Casimir freigegeben):
  - Tag / Woche (Mo–So) / Monat, mit ‹ › blättern.
  - Links „Fassung · fehlt oben", rechts „Z-Bericht · gastronovi", je Zeile ein Status-Punkt (grün stimmt, rot weicht ab, gelb offen).
  - Nach Art sortiert und farbig: Weiß, Rosé, Rot, Natur, Schaumwein, Bier, Wasser & Soft, Mixer, Säfte. Filter-Chips mit Zahl der Abweichungen.
  - Gläser: eigenes Feld mit Rechnung „4 × ⅛ l = 0,7 Fl.", Kopfzahl „23 Gläser = 6,6 Fl.".
  - Was stimmt, ist je Art zu einer grauen Zeile zusammengeklappt. „Stimmt nicht" zeigt nur Abweichungen.
  - Hinweise nur als Tatsachen: Z-Bericht fehlt (mit Knopf zum Einlesen), Fassung fehlt, Vorgang läuft, Kassennamen ohne Zuordnung (unten aufgelistet).
  - Namen: Wein aus der gastronovi-Artikelliste (`docs/gastronovi-artikel.csv`, exakter Vergleich, kein Raten), sonst der Kassenname wörtlich.
  - **Flaschengrößen werden angenommen und markiert** (Entscheidung Casimir 30.09.): Wein mit dem Vorschlag (meist 0,75 l), Getränke 1 Stück = 1 Flasche. Jede solche Zahl trägt „angenommen". Analytics rechnet weiter streng.
- **Kellerstand:** letzte Zählung + Eingänge − geholt, nach Art, „leer" sichtbar. Knopf **„Analyse"**: aus dem Keller geholt ↔ verbucht seit der Zählung.

## App
- **Kellerzählung:** Knopf „leer" je Wein → gezählt mit 0, Abschluss möglich. Eine gezählte Flasche nimmt „leer" zurück.
- **Holen:** Knopf „leer" je Position → Menge 0, Zeile erledigt, Backoffice zeigt „leer".
- **Zusätzlich entnommen** ist eine eigene Karte mit Titel, Zahl und Knopf „+ Hinzufügen" statt eines grauen Textlinks.

## Nachtrag 30.09. · Laden und Bar
- **Bar · Rotweine:** Achs Goldberg, Gebeshuber Pinot Noir, Dürnberg Elementum (Geräte mit alter Voreinstellung stellen selbst um).
- **Lade 2:** oben ein Kästchen mit 4 still und 6 Gasteiner sparkling **0,33** (neu), unten 18 Gasteiner **0,75 l** (6 je Reihe). Der 0,25er ist aus den Laden genommen.
- **Zitronensaft** gerade nicht vorrätig: kein Soll, in Lade 1 als „aus".

## Worker
- Eine Zählung mit 0 geht jetzt ins Journal (vorher verworfen). Bewegungen mit 0 bleiben draußen. Append-only unverändert.

## Geprüft
- `npm test` **583 von 583** (neu: `tests/gastronovi-liste.test.mjs`).
- Browser: `tests/ui-runde24.cjs` **30/30** (echter Worker), `tests/ui-runde24-app.cjs` **14/14**, `ui-leitung-echt` 44/44, `ui-runde22` 31/31, `ui-runde21` 19/19, `ui-runde17` 38/38, `ui-runde18` ohne Fund.
- Bilder: `review/screens/r24/`. `sw.js` auf **v77**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01XL68Bp63fcSJLfNTZNmuMH
