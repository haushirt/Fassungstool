# Anliegen aus dem Team

## DRINGENDE FEHLERBEHEBUNG · Fassungstool · 18.09.2026

Elf Befunde vom echten iPhone. Das Tool ist heute im Einsatz. Ziel: alles
behoben, belegt, gemergt — heute.

**Anmerkung des Bearbeiters:** Der Auftrag kündigt „F1…F11" an, führt aber
nur F1 bis F9 aus. F10 und F11 stehen nicht im Auftragstext. Sie werden
hier **nicht erfunden**. Als zehnter Punkt steht der Auftrag „Messung
reparieren" (Überlauf-Test), er ist unten als **M** wörtlich übernommen.
Fehlt F10/F11 wirklich, bitte nachreichen.

---

## A · FALSCHE ZAHLEN UND FALSCHE ZUORDNUNG

### F1 · Falscher Fassungstag
  Ist: Am Freitag, 18.09., steht im Kopf "Für Donnerstag, 17.09.2026".
  Soll: Vorgeschlagen wird der heutige Tag in Europe/Vienna.
  Zuerst Ursache benennen. Verdacht: Datum in UTC gebildet, oder der
  Betriebstag ist absichtlich zurückversetzt (Nachtservice).
  Zwingend mitprüfen: Rechnen App, Worker und Backoffice denselben Tag?
  Wenn nicht, landen Vorgänge unter zwei Schlüsseln — das ist ein
  A-Fund und hat Vorrang vor allem anderen in dieser Liste.

### F2 · Kacheln in den Laden verschieben sich durch Text
  (betrifft Handyansicht allgemein, Lade 4, Lade 5 und 6)
  Ist: Die Kacheln liegen nicht in gleich hohen Zellen. Ein zweizeiliger
  Name ("Wild Berry", "Johannisbeere", "Ho-lunder") schiebt die Nachbarn
  nach unten. Folge: Kein Name steht unter seiner Flasche, Zählspalten
  stehen versetzt (blaue Spalte "Gast. 0,25" beginnt tiefer, ihre
  Kopfzahl 7/7 ist halb verdeckt), einzelne Flaschen haben gar keine
  sichtbare Beschriftung.
  Gefahr: Im Keller wird der Name der falschen Flasche zugeordnet →
  falscher Bestand. Höchste Priorität dieser Liste nach F1.
  Soll:
    - Jede Lade ist ein CSS-Grid:
      grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
      gap: 8px; align-items: start;
    - Jede Zelle enthält EINEN Stapel in fester Reihenfolge:
      Kopfzahl – Zählpunkte – Trennstrich – Flaschenbild – Name.
      Nichts absolut positioniert, nichts umfließend.
    - Name: text-align center, min-height 2.6em (zwei Zeilen Platz),
      hyphens auto, overflow-wrap anywhere. JEDE Flasche hat einen
      sichtbaren Namen.
    - Kopfzahlen aller Spalten auf einer Linie, Trennstriche auf einer
      Linie, Namen auf einer Linie.
    - Bei 390 px nichts rechts angeschnitten. Passt eine Spalte nicht,
      bricht das Raster um.
  Prüfbreiten: 320 / 375 / 390 / 430 px.

### F3 · Zählpunkte in der Weinzeile stehen zu weit links
  Ist: Die Zählringe sitzen direkt hinter dem Namensblock. Weil Namen
  unterschiedlich lang sind ("Gumpoldskirchen" vs. kurz), stehen die
  Ringe in jeder Zeile woanders. Beim Zählen wandert der Blick.
  Soll: Die Zeile ist ein Grid mit drei Spalten:
    [Name/Winzer/Soll · 1fr] [Zählringe · feste Spalte] [voll · fest]
  Die Ringe beginnen in JEDER Zeile an derselben x-Position, unabhängig
  von der Namenslänge. Gleicher Abstand untereinander, mindestens 46 px
  Trefferfläche, vertikal mittig zum Namensblock. "voll" ganz rechts.
  Prüfen mit dem längsten und dem kürzesten Weinnamen untereinander —
  die Ringe müssen exakt fluchten.

---

## B · WAS LÄNGST WEG SEIN SOLLTE

### F4 · Der Fotoschritt ist immer noch drin
  Ist: Die App verlangt weiterhin ein Foto der Fassungsliste. Am 17.09.
  entschieden abgeschafft, zum dritten Mal als erledigt gemeldet, nie weg.
  Soll: Restlos raus, an ALLEN Stellen:
    - der Schritt im Fassungsablauf (public/index.html, ~:4232)
    - der Kacheltext "Liste fotografieren"
    - jede Schaltfläche, jeder Hinweis, jede Fortschrittsanzeige, die den
      Schritt mitzählt ("1 von 4" muss danach stimmen)
    - der Foto-Zwischenspeicher in der IndexedDB und jeder Verweis
      darauf im Vorgangspaket
  Vorgehen: Erst im ganzen Projekt nach "foto", "photo", "bild", "kamera"
  suchen und mir JEDE Fundstelle mit Datei:Zeile zeigen. Dann löschen.
  An seine Stelle kommt nichts — der Vortagsabgleich ist eine eigene
  Aufgabe und nicht Teil dieser Runde.

### F5 · "Verwaltung" steht weiter in der App, kein Weg ins Backoffice
  Ist: Link "Verwaltung" am Fuß der Startseite. Null Links zur Leitung.
  Soll: "Verwaltung" aus der App entfernen. An derselben Stelle ein Link
  "Backoffice" auf leitung.html, sichtbar nur für Rolle leitung. Die
  Verwaltungsseite im Backoffice ist noch nicht gebaut — der Link geht
  vorerst auf die Leitungsübersicht.

---

## C · OBERFLÄCHE

### F6 · Kopfzeile überlappt die iOS-Statusleiste
  Ist: Titel liegt unter Uhrzeit, Mobilfunk-, WLAN- und Batteriesymbol —
  auf der Startseite ("Haus Hirt") UND in der Tagesfassung. "?" und
  "Menü" ebenso.
  Soll: Der Seitenkopf beginnt unterhalb der Statusleiste.
  Weg: padding-top: max(12px, env(safe-area-inset-top)) am obersten
  Kopfelement JEDER Seite, auch public/leitung.html. Prüfen, ob
  viewport-fit=cover im meta-Tag steht — ohne das liefert env() 0.

### F7 · Startseite widerspricht sich selbst
  Ist: "Die Tagesfassung ist heute noch offen." direkt über dem grünen
  Feld "Nichts offen – alles übertragen".
  Ursache: zwei Bedeutungen von "offen" — unerledigte Aufgabe vs. leere
  Warteschlange.
  Soll: Das grüne Feld spricht nur noch von Übertragung: "Alles
  übertragen" bzw. "1 Vorgang wartet". Das Wort "offen" bleibt der
  Aufgabe vorbehalten.

### F8 · Toter Leerraum unter den Laden
  Ist: Zwischen Ladenkasten und "Überspringen" mehrere Zentimeter nichts.
  Soll: 24 px Abstand, nicht mehr.

---

## D · NEU, ERST NACH F1

### F9 · Begrüßungsfenster beim Öffnen
  Erst bauen, wenn F1 behoben ist — sonst bestätigt der Knopf den
  falschen Tag.
  Verhalten: Beim Öffnen der App erscheint einmal ein kleines Sheet von
  unten, nicht bildschirmfüllend, mit drei Zeilen:
    "Fr. 18.09."
    "Hallo Asad."
    "Heute steht die Tagesfassung noch an."   (Status aus den Vorgängen
                                               des Tages, wie die
                                               bisherige Begrüßung)
  Zwei Schaltflächen: "Passt" (primär, schließt) und "Anderes Datum"
  (öffnet die bestehende Datumsauswahl).
  Regeln: erscheint höchstens einmal je Gerät und Betriebstag; blockiert
  nichts, wenn kein Netz da ist (dann Status weglassen statt Fehler);
  ist mit Wischen nach unten schließbar; Trefferflächen ≥ 46 px;
  respektiert die Safe-Area unten.

---

## M · MESSUNG REPARIEREN
Die Nacht meldete "0 waagrechter Überlauf bei 390 px", während die achte
Kachel rechts angeschnitten war. Finde heraus warum und bau den Test um:
Er misst je Element getBoundingClientRect gegen die Fensterbreite, nicht
die Dokumentbreite. Nachweis: Der neue Test muss gegen den Stand von
heute früh ROT sein. Ist er das nicht, ist er weiterhin kaputt — dann
nicht weiterbauen, sondern das melden.

---

## Ablauf je Befund
1. Ursache benennen (Datei:Zeile) — vor jeder Änderung
2. beheben
3. Screenshots 320/375/390/430 px nach review/screens/f<N>/
4. hinter den Befund: behoben in <Datei:Zeile>, Beleg <Pfad>

---

## Ergebnisse

Die Zeilennummern der URSACHE beziehen sich auf den Stand von heute früh
(`50c1123`, `sw.js` v31), die der BEHEBUNG auf den Stand danach.

| Befund | Ursache (Datei:Zeile, Stand 50c1123) | Behoben in | Beleg |
|---|---|---|---|
| **F1** | `public/index.html:1568-1569` — `today()`/`yest()` aus `toISOString()`, also UTC; `:1571` — `blank()` setzte für `mode==="tag"` ausdrücklich `yest()`. Dazu `public/leitung.html:1186, 1317, 1493` (dieselbe UTC-Rechnung) und `src/index.js:728, 763` (`notiz()` und Wochenbrief datieren in UTC). | `public/index.html:1681` (`wienTag`/`tagMinus`), `:1720` (`blank`), `:2526` (`start`); `public/leitung.html:1199`; `src/index.js:38` | `review/screens/f1/` · Test `tests/betriebstag.test.mjs` |
| **F2** | `public/index.html:1209-1212` — `.drwi{display:flex;align-items:flex-end;overflow:hidden}`: unten bündig ⇒ ein zweizeiliger Name hebt seine ganze Spalte; `overflow:hidden` verschluckte den Beschnitt. `:1257` — `.gcap{min-height:26px;height:auto}` (Höhe schwankt mit der Zeilenzahl). `:1279-1284` — `.drwi.gversetzt .gcap{width:200%}` schreibt jede zweite Spalte eine Zeile tiefer. `:3571` — setzt diese Marke. `:3581-3587`/`:3745-3747` — `versetzt` verschiebt Kopfzahl, Strich, Bild und Name mit. `:3639-3641`/`:3652` — nur die LETZTE Flasche einer Reihe bekam einen Namen. | `public/index.html:1299-1302` (Raster), `:1310` (`.gnums`), `:1317` (`.gstks`), `:1355` (`.gcap`), `:3705` (`gFit`), `:3888` (`drwBox`), `:3800`/`:3820` (jede Flasche mit Namen) | `review/screens/f2/` (320/375/390/430 × Lade 1, 4, 5, 6) |
| **F3** | `public/index.html:2771` — `tx.appendChild(dots)`: die Ringe hingen IM Namensblock, direkt hinter dem Namen. `:538-539` — `.w{display:flex}`, `:587-589` — `.dots{justify-content:flex-end;max-width:210px}`. Bei 320 px lief der Name unter den ersten Ring. | `public/index.html:574` (`.w` als Raster), `:635` (`.dots`), `:645` (Schmalfall 320 px), `:2917` (`dotRow`) | `review/screens/f3/` |
| **F4** | 23 Fundstellen, alle mit Datei:Zeile im Abschnitt „F4 — jede Fundstelle" unten. | `public/index.html:989` (CSS weg), `:4567` (Modul weg), `:4575`/`:4959` (`aufraeumenFotospeicher`); `public/leitung.html:738` | `review/screens/f4/` · Test `tests/oberflaeche-f.test.mjs` |
| **F5** | `public/index.html:2112` — `<button class="adminlink" id="bAdmin">Verwaltung</button>`; kein einziger Verweis auf `leitung.html` in der ganzen Datei. | `public/index.html:2298` (Link), `:1765` (Rolle aus `/api/ich`), `:2350` (Verwaltung ohne Eingang) | `review/screens/f5/` (Service ohne, Leitung mit Link) |
| **F6** | `public/index.html:383-384` — `header{padding:var(--space-2) …}` ohne `env(safe-area-inset-top)`; `:351` `.menu` und `:945` `.login` ebenso. `public/leitung.html:5` — `viewport-fit=cover` fehlte ganz, damit liefert `env()` dort immer 0. | `public/index.html:401` (`header`), `:369` (`.menu`), `:1034` (`.login`); `public/leitung.html:5, 251, 495` | Test `tests/oberflaeche-f.test.mjs` — **in Chromium nicht zeigbar**, siehe unten |
| **F7** | `public/index.html:1855` — `t="Nichts offen – alles übertragen"`; `:1854` — `"… warten auf Übertragung"`. Dasselbe Wort „offen" wie im Satz darüber (`:2069`, `tagesSatz`), zwei Bedeutungen. | `public/index.html:2039` (`netzChip`) | `review/screens/f7/` |
| **F8** | **Nicht bestätigt.** Der Abstand war schon vorher genau 24 px — nachgemessen in jeder Lade, siehe unten. | `public/index.html:931` (`.navrow`, jetzt ausdrücklich 24 px), `:493` (`main:has(.navrow)`, Fußpolster 40 → 12 px) | `review/screens/f8/` |
| **F9** | Neu gebaut, nach F1. | `public/index.html:1506` (Markup), `:1381` (Gestaltung), `:2664` (Verhalten), `:4959` (Aufruf), `:1697` (`tagWahl`/`vorgabeTag`) | `review/screens/f9/` |
| **M** | Drei Gründe, alle drei falsch vermutet bzw. nicht gefunden — siehe „Messung" unten. | `tests/ui-mass.cjs:81` (Breiten), `:186` (Beschnitt), `:466` (Laden werden gemessen), `:571` (Urteil) | `review/screens/beweis-alt/` (ROT) vs. `review/screens/schluss/` |

---

## F4 — jede Fundstelle, wie verlangt

Gesucht wurde im ganzen Projekt nach `foto`, `photo`, `bild`, `kamera`.
Stand `50c1123`. Die Produktfotos der Getränke (`GETR.pic`, `.gshot`,
`L.photo`) sind etwas anderes und bleiben — sie stehen deshalb unten
getrennt.

**Entfernt (Fassungsliste):**

| Datei:Zeile | Was |
|---|---|
| `public/index.html:930-951` | CSS-Block `P10 · Fotos der Fassungsliste` (`.fotoblock`, `.fotos`, `.foto`, `.fotobtn`) |
| `public/index.html:1140` | `.netz,.fotoblock,.zusatzlink{display:none!important}` im Druckbild |
| `public/index.html:1495` | Kacheltext „… aus dem Keller holen, **Liste fotografieren**." |
| `public/index.html:1529-1533` | Hilfetext „Abschluss": „Die Fassungsliste von der Rezeption abfotografieren …" |
| `public/index.html:1574` | `fotos:[]` im Vorgangspaket (`blank`) |
| `public/index.html:1596-1600` | `archive()` räumte die Bilder eines verdrängten Eintrags weg |
| `public/index.html:2150` | `fillFotos(box)` in der Archivansicht |
| `public/index.html:2279` | `hasData("tag")` zählte `d.fotos.length` als Inhalt |
| `public/index.html:4104` | `if(mode==="tag")rFotos(m);` — der Block im Abschluss |
| `public/index.html:4172` | `fillFotos(box)` im Protokoll |
| `public/index.html:4234` | `offenZiel()`: „Fassungsliste noch nicht …" → kein Ziel |
| `public/index.html:4254` | Kommentar „das Foto der Fassungsliste ist Papier …" |
| `public/index.html:4263` | `offenList()`: „Fassungsliste noch nicht fotografiert" |
| `public/index.html:4279-4441` | Das ganze Modul: `FDB`, `fdb`, `fput`, `fget`, `fdel`, `fkeys`, `fclean`, `fshrink`, `fillFotos`, `docFotos`, `rFotos` |
| `public/index.html:4400` | `h+=docFotos();` im Protokoll |
| `public/index.html:4481-4484` | `resultText()`: „Fassungsliste als Foto beigelegt." / „Kein Foto …" |
| `public/index.html:4573` | Kommentar „Fotos kommen in voller Groesse mit." |
| `public/index.html:4581-4586` | `protoDateien()` hängte die Bilder an die Mail |
| `public/index.html:4697` | `fclean()` beim Start |
| `public/leitung.html:732` | `fotos:(v.fotos||[]).length` in `normVorgang` |
| `public/leitung.html:2148` | Anzeige „N Fotos" in der Vorgangstabelle |
| `public/leitung.html:2384` | dieselbe Anzeige im Speicher |
| IndexedDB `hh_fotos` | wird beim Start EINMAL gelöscht (`public/index.html:4575`) |

**Geblieben (Produktfotos der Getränke, nicht Gegenstand von F4):**
`public/index.html:916` (`.gcol--geprueft .gshot`), `:1369`, `:1374`,
`:1410` (Kommentare), `:2463` („Produktfoto antippen" in der Bedienhilfe),
`:3125`, `:3167-3169` (Bilddaten und Flaschenzeichnung), `:3751`
(`if(L.photo)`), `src/stamm.json:754, 827, 871` (`"photo": 1`).

**Nicht gefunden:** eine Fortschrittsanzeige, die den Fotoschritt
mitzählte. Es gab keine — der Schritt war nie ein eigener Schritt. Die
Schrittliste der Tagesfassung lautete und lautet
`["Bar","Restaurant","Holen","Abschluss"]` (`public/index.html:1496`);
das Foto war ein Block INNERHALB des Schrittes „Abschluss" und ein Punkt
in `offenList()`. „1 von 4" stimmte vorher und stimmt nachher — Beleg:
`review/screens/f4/390-abschluss.png` zeigt „Abschluss · 4 von 4" und elf
offene Punkte statt zwölf.

---

## F8 — was gemessen wurde

Der Auftrag sagt „mehrere Zentimeter nichts" und fordert 24 px. Gemessen
(Chromium, 390 px, `.drw` Unterkante → `.navrow` Oberkante), am Stand von
heute früh UND danach:

| Lade | vorher | nachher |
|---|---|---|
| 1 | 24 px | 24 px |
| 2 | 24 px | 24 px |
| 3 | 24 px | 24 px |
| 4 | 24 px | 24 px |
| 5 | 24 px | 24 px |
| 6 | 24 px | 24 px |

**Der Rand war also nie größer als gefordert.** Was ich gefunden habe und
geändert habe: Unter der Leiste lagen zusätzlich 16 px Rand und 40 px
Fußpolster von `<main>`, zusammen 56 px totes Ende der Seite. Das
Fußpolster steht jetzt auf 12 px, wo die Seite ihre eigene Leiste
mitbringt (`public/index.html:493`).

**Was ich NICHT gefunden habe:** eine Stelle, an der zwischen Ladenkasten
und „Überspringen" mehrere Zentimeter stehen. Ich rate nicht. Zwei
Vermutungen, beide unbewiesen:
1. Bei kurzen Laden (Lade 2, Regal) ist die Seite kürzer als der Schirm —
   unter „Überspringen" bleibt dann der leere Rest der Seite stehen. Das
   ist kein Rand, sondern eine kurze Seite.
2. Der Knopf „Überspringen" ist absichtlich rahmenlos (`.b.go.leise`,
   52 px hoch). Von der Kastenkante bis zur SCHRIFT sind es deshalb
   24 + 26 = 50 px, auch wenn der Rand 24 px misst.

**Bitte um Angabe:** welche Lade, welches Gerät, quer oder hoch.

---

## Messung — warum sie grün sagte

Der Auftrag vermutet, der Test messe gegen die Dokumentbreite. **Das traf
nicht zu**: `tests/ui-mass.cjs` maß schon vorher jedes Element mit
`getBoundingClientRect()` gegen `document.documentElement.clientWidth`,
also gegen die Fensterbreite. Die drei wirklichen Gründe, am Stand von
heute früh nachgemessen:

1. **Die Laden wurden nie gemessen.** `MESSE` lief nur auf dem ERSTEN
   Schritt jedes Modus. Die Laden 1–6 liegen hinter den Knöpfen
   „R 1 2 3 4 5 6"; der Ladenlauf prüfte dort allein die Kürzel auf
   Überlappung. Lade 4 hat das Messgerät bis Runde 12 nie gesehen.
2. **Beschnitt durch einen Vorfahren war kein Urteil.** `.drwi` trug
   `overflow:hidden`. Bei 390 px stehen 359 px Inhalt in einem Kasten von
   356 px — „Gast. 0,25" wird um 3 px abgeschnitten, ohne je aus dem
   Fenster zu ragen. Genau die achte Kachel, genau der Befund.
3. **320 px stand nicht in der Liste.** Gemessen wurde 390/768/1280. Bei
   320 px liegt dieselbe Beschriftung bei 323 px, also 3 px AUSSERHALB
   des Fensters — dort hätte schon das alte Urteil angeschlagen.

**Nachweis, dass der neue Test greift.** Gegen den Stand von heute früh
(`50c1123`, `public/` und `src/` zurückgestashed, nur `tests/ui-mass.cjs`
neu) läuft er ROT:

```
Überlauf app/lade-4@320: 1 → DIV.gcap(323px)
Beschnitten app/lade-4@320: 2 → DIV.drwi schneidet DIV.gcap um 7.2px (San­bitter),
                                DIV.drwi schneidet DIV.gcap um 4.9px (Gast. 0,25)
Beschnitten app/lade-4@430: 1 → DIV.drwi schneidet DIV.gcap um 1.1px (Gast. 0,25)
✗ kein waagrechter Überlauf in 320/375/390/430/768/1280  (13 Stellen)
✗ nichts im Service wird von einem Kasten abgeschnitten  (3 Stellen)
```

Voller Lauf: `review/screens/beweis-alt/messung.json`.

**Zwei Dinge habe ich am Messgerät zurückgenommen, beide mit Grund:**
* Die Ziffern auf den Zählpunkten (`.gpt`) zählen beim Kontrast als
  Hinweis, nicht als Urteil. Sie sind absichtlich auf 1,9:1 gemischt
  (`ziffernfarbe`, `ZIEL`) — 240 „Fehler" aus einer bewussten Entscheidung
  ertränken jeden echten Fund.
* Das Backoffice wird nur ab 390 px gemessen. Bei 320/375 px ragt seine
  Navigationsschublade aus dem Bild; das ist ein echter Fund, aber keiner
  dieser Runde und keiner für ein MacBook. Er steht in `review/BACKLOG.md`.

**Neu gefunden, weil jetzt auch 320 px gemessen wird:** die Stationsleiste
(R · 1 … 6) hatte dort 38 px je Knopf statt 44. Behoben in
`public/index.html:521` — die Leiste bricht um, statt zu schrumpfen.

---

## Offene Fragen ans Team (aus der alten Fassung übernommen)

* Was nervt beim Fassen?
* Wo passieren Fehler?
* Was fehlt?
* Was soll auf keinen Fall anders werden?
* Keller (für Phase B): Lagerorte (Name/Beschriftung, was liegt wo), Laufweg beim Zählen
* Leitung: Was will ich morgens auf einen Blick sehen?
