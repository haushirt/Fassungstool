# Runde 23 · Die Kassennamen der Berichte Z 41 bis Z 43

Anlass: drei neue Z-Berichte (19.–23.09.2026). Im Backoffice lagen
Z 40 und Z 41; Z 42 und Z 43 fehlen und müssen eingelesen werden.

**Keine Migration.** Live-D1 wurde nur gelesen.

## Was sich ändert

Die geprüfte Vorabliste wächst von **36 auf 100 ganze Kassennamen**.
Über die drei Berichte zusammen (104 verschiedene Namen) bleiben damit
**3 offen** statt 58.

| | vorher | nachher |
|---|---|---|
| Namen in der Vorabliste | 36 | 100 |
| offen in Z 41–43 | 58 | 3 |
| offen im Referenzbericht 37 | 7 | 2 |

### 1 · Fassbier ist keine Vermutung mehr

Raschhofer Pils (0,2 / 0,3 / 0,5 l) und Radler (0,3 / 0,5 l) standen im
Morgenbrief als offene Frage. Sie ist an den Daten entschieden: in allen
drei Berichten gehen genau diese fünf Namen Stück für Stück in der
Warengruppe **Bier · vom Fass** auf — 12 · 7 · 11, ohne Rest. Im Keller
liegt kein Fass und kein Pils. Gegenprobe: **Bier · Flaschenbier** geht
ebenso ohne Rest in den Kellerartikeln auf (4 · 4 · 2).

### 2 · Mischgetränke stehen auf Ignorieren

Runde 22 hatte das abgelehnt, mit einer Begründung, die weiter gilt: ein
Whiskey Sour nimmt Zitronensaft, ein Gin & Tonic nimmt Tonic, ein Virgin
Hugo nimmt Holundersirup — alles das wird im Keller gezählt und fehlt der
Rechnung, sobald es ignoriert wird.

Die Entscheidung ist inzwischen gefallen: im Backoffice stehen Aperol
Spritz, Sarti Spritz, Monkey Sour und Ipanema seit dem 22.09. von Hand
auf Ignorieren. Der neue Block `VORAB_MISCHGETRAENK` zieht die übrigen 27
Namen derselben Art nach. Er steht **getrennt**, damit das Zurücknehmen
eine Löschung ist: wer Rezepte will, entfernt den Block.

### 3 · Was sonst dazukam

* **Wein:** Fritsch Wagram Rosé (Glas und Flasche, Kürzel `RS` — keine
  Rebsorte, deshalb greift das Kassenmuster nicht), Kollwentz Leithakalk
  Chardonnay (die Kasse schreibt `Ch kollwenz`).
* **Getränke:** Franziskaner dunkel, Almdudler, Gasteiner still,
  Fentimans Ginger Beer, Spritzerwein, Johannisbeersaft.
* **Kein Keller:** ganze Gänge (Dinner Menü, Suppe, Salatbuffet), Tee und
  Milchgetränke aus der Maschine, zwei Schnäpse, hausgemachte Limonaden.

## Was offen bleibt

Drei Namen, alle aus derselben Ecke:

* **Gasteiner sparkling 0,20 l** — im Keller stehen 1 l, 0,25 l, still.
* **Gasteiner Quellwasser 0,5 l** — welcher der drei?
* **Apfelsaft 0,25 l** — im Keller gibt es keinen Apfelsaft.

## Geprüft

* `npm test` **581 von 581**
* Browser: `ui-runde22.cjs` 31/31 · `ui-leitung-echt.cjs` 44/44 ·
  `ui-runde21.cjs` 19/19 · `ui-runde18.cjs` 54/54
* Vorabliste gegen **vier echte Berichte** gerechnet: Z 40 (Rohtext aus
  der Live-D1), Z 41, Z 42, Z 43 und der Fixture-Bericht 37.
* Zwei Prüfungen hingen an Kassennamen, die offen bleiben sollten, und
  sind dadurch rot geworden. Beide sind so geändert, dass sie das prüfen,
  wovon sie handeln — eine davon hängt jetzt an einem erfundenen Namen.

## Nach dem Merge

Z 42 und Z 43 im Backoffice einlesen und einmal
**„Alle Vorschläge übernehmen"** drücken. Der Klick zieht auch die schon
eingelesenen Berichte Z 40 und Z 41 nach.
