# Fassungstool — Technische Übergabe

**Haus Hirt, Bad Gastein · Stand 17.09.2026**
Für Claude Code. Alles, was man wissen muss, um an diesem Projekt weiterzuarbeiten,
ohne die Fehler von vorne zu machen.

Die `PROJEKTANLEITUNG-Fassungstool.md` ist die kurze Fassung für Menschen.
Dies hier ist die lange für die Werkbank.

> **Hinweis zu Regel 9:** Die Zugangscodes und der Verwaltungscode aus der
> Originalfassung stehen hier bewusst nicht. Sie gehören nicht ins Repo.

---

# 0 · Worum es geht

Ein Werkzeug für den Weinkeller und die Bar eines 34-Zimmer-Hotels.
Vier Leute benutzen es:

| Name | Rolle | Code | Gerät |
|---|---|---|---|
| Casimir Ikrath | `leitung` | — | MacBook + iPhone |
| Asad Karakiri | `service` | — | iPad an der Bar |
| Ian Lauchbein | `service` | — | iPhone |
| Marinus | `wirtschaft` | — | iPhone |

**Der Ablauf im Haus:** Am Nachmittag geht jemand durch die Bar, prüft
Kühlschränke und Laden, notiert was fehlt, holt es aus dem Keller, räumt
ein. Das ist die *Tagesfassung*. Dazu kommen *Nachfüllen* (nur Getränke),
*Sonderentnahme* (außer der Reihe), *Kellerzählung* (Inventur) und
*Wareneingang* (Lieferung).

**Die harte Randbedingung:** Im Weinkeller gibt es kein Netz. Alles muss
offline funktionieren und nachreichen. Das ist keine Nettigkeit, das ist
der Normalfall.

**Der Betreiber hat keine lokale Werkzeugkette.** Dateien werden direkt
in GitHub ersetzt. Cloudflare baut und deployt automatisch (Workers
Builds, seit 16.09. verbunden). Kein `npm run` auf einem Laptop, kein
lokaler Wrangler. Was einen Bauschritt braucht, muss durch Cloudflare
gehen oder gar nicht existieren.

---

# 1 · Repo, Infrastruktur, Deploy

```
haushirt/Fassungstool        (privat)
├── public/
│   ├── index.html           App · ~4 300 Zeilen · alles inline
│   ├── leitung.html         Backoffice · ~1 900 Zeilen · alles inline
│   ├── sw.js                Service Worker · 98 Zeilen
│   └── icon.png             512×512, Startbildschirm
├── src/
│   ├── index.js             Worker · fetch + email + scheduled
│   ├── gnparse.js           Z-Bericht zerlegen  (parseZ)
│   ├── gnmap.js             Kassenname → Artikel (mappe)
│   └── stamm.json           Weine, Getränke, Ladengeometrie
├── wrangler.jsonc
└── schema.sql               ⚠ VERALTET — nie ausführen
```

| | |
|---|---|
| Worker | `fassungstool.ikrathc.workers.dev` |
| D1 | `fassung`, WEUR, ID `2e0490ca-2b9d-40a7-a45c-a207a9447e91` |
| Plan | Cloudflare Free |
| Bindings | `env.DB` (D1), `env.ASSETS`, `env.TOKEN_SECRET`, `env.ABSENDER`, ⚑ `env.ANLAGE_OFFEN` |

**`run_worker_first` ist gesetzt.** Jede Anfrage geht zuerst an den
Worker; der Router reicht alles außerhalb `/api/` an `env.ASSETS.fetch`
durch. Deshalb funktionieren statische Dateien — aber nur wegen dieser
einen Zeile im Router.

**⚑ Seit Auto-Deploy:** Alles, was nur im Dashboard eingetragen ist
(D1-Bindung, `ASSETS`, `ABSENDER`, Crons, Observability), kann ein
`wrangler deploy` entfernen, wenn es nicht in `wrangler.jsonc` steht.
Secrets wie `TOKEN_SECRET` überleben. Nach jedem strukturellen Deploy
`/api/ping` prüfen.

**iOS cacht hartnäckig.** Nach jeder Änderung an einer der vier Dateien
in `public/` die `VERSION` in `sw.js` erhöhen (`const VERSION = "v12"`),
sonst behält das iPhone den alten Stand.

---

# 2 · `public/index.html` — die App

Eine Datei, kein Framework, keine Abhängigkeit. Aufbau:

```
Zeile     1 –  200   <head>, geteilte Gestaltungsschicht (siehe §7)
Zeile   228 – 1030   CSS der App
Zeile  1030 – 1424   Markup + Modi + Anmeldung + Menü
Zeile  1424 – 1560   Mehrgerätebetrieb (Ausgang, Sync, Begrüßung)
Zeile  1560 – 2680   Fassungsablauf: Schritte, Stationen, Zeilen
Zeile  2680 – 3400   Getränke: Ladengeometrie, Renderer, Trefferflächen
Zeile  3400 – 3862   Protokoll (HTML/PDF/CSV), Archiv
Zeile  3862 – 4311   Fotos (IndexedDB), Service Worker, Start
```

## 2.1 · Modi

`const MODES = { tag, fuellen, keller, nach, ware }`

| Modus | Titel | Schritte | Tor Wein/Getränke |
|---|---|---|---|
| `tag` | Tagesfassung | Bar, Restaurant, Keller, Abschluss | nein (startet mit `wein`) |
| `fuellen` | Nachfüllen | Bar, Keller, Abschluss | nein |
| `keller` | Kellerzählung | Zählen, Abschluss | **ja** |
| `nach` | Sonderentnahme | eine Seite | **ja** |
| `ware` | Wareneingang | Positionen, Abschluss | **ja** |

Das Tor kommt aus `start(m)`: `branch = (m==="tag"||m==="fuellen") ? "wein" : null`.
Ist `branch === null`, rendert `render()` die Torseite (`rGate`) und
kehrt **vor** `renderHowto()` zurück — das ist der Grund, warum das
Hilfe-Sheet bei diesen Modi erst nach der Zweigwahl aufgeht.

## 2.2 · Der Bar-Schritt und die Laden

`ALLE_LADEN()` setzt die Stationsfolge zusammen:

```
R  = Rotweine (nicht gekühlt, aus PLAN.barrot)
1  = GETR.laden[0]  "Lade 1 · Säfte"          kind: grid
2  = WLADEN[0]      "Lade 2 · Gasteiner & Stille"  kind: fach
3  = WLADEN[1]      "Lade 3 · Offene Weine"   kind: fach
4  = GETR.laden[1]  "Lade 4 · Mischgetränke"  kind: col
5  = GETR.laden[2]  "Lade 5 · Softdrinks"     kind: col
6  = GETR.laden[3]  "Lade 6 · Bier"           kind: col
```

**Vier Ladenarten, vier Renderer:**

- **`grid`** — Raster aus Zellen mit Produktfotos (Säfte). Größe über
  `--gcell`.
- **`col`** — Säulen von Punkten, darunter Flaschenfoto und Kürzel.
  Jede Säule ist ein Stapel `[id, anzahl]` oder `{stapel:[…]}`.
  `versetzt: -1|1` verschiebt eine Säule um eine halbe Flasche nach
  oben/unten, damit sie in den Lücken der Nachbarsäule sitzt.
  `platz: n` reserviert n Plätze, auch wenn weniger Flaschen drin sind.
- **`fach`** — Lade in Fächer geteilt, jedes mit eigener Überschrift und
  eigener Zählung. Ein Fach ist `kind:"reihen"` (Zeilen aus Zellen) oder
  `kind:"raster"` (Gasteiner 1 l).
  Eine Zelle: `[id, anzahl, bucket, beschriftung?]` oder
  `{stapel:[[id,n],[id,n]]}` für zwei Sorten übereinander.
  `leerOben: 1` heißt: von oben wird geleert, der oberste Punkt ist der
  hinterste Platz.
- **`rack`** — Gitter für Gasteiner-Kisten.

**Die Punktgröße** ist der Ort, an dem schon zweimal etwas schiefging.
Drei Funktionen:

- `gMasse(cols, breite)` — reine Mathematik: wie hoch darf die Lade sein,
  damit k Säulen in `breite` passen.
- `gEinheit(breite)` — **ein Maß für alle Laden**. Rechnet für jede
  `col`-Lade die größtmögliche Punktgröße und nimmt das Minimum. Lade 4
  mit zehn Flaschen je Säule gibt es vor. Ohne das springt die Größe beim
  Weiterblättern von Lade zu Lade. Ergebnis wird je Breite gecacht.
- `gFit(box, L)` — misst das tatsächliche DOM und setzt `--gd`,
  `--gpt-s`, `--gcell`, `--grack`.

`gFit` läuft **zweimal**: einmal direkt nach dem Aufbau, einmal in
`requestAnimationFrame`. Beim ersten Lauf steht die endgültige Breite oft
noch nicht fest.

## 2.3 · Slots und Zustand der Zählung

Jeder Platz in einer Lade bekommt einen Schlüssel:

```js
slotKey(L, id, soll)  →  "lade/artikel"     // füllt SLOT{}
sIst(k) / sSet(k, n) / sSoll(k)             // lesen und schreiben
FACHSLOT[fkey]                              // welche Slots zu welchem Fach
```

Der eigentliche Wert liegt im Vorgangsobjekt unter `d.getr[id]` — der
**Ist-Stand in der Lade**, nicht die Fehlmenge. Die Fehlmenge ist
`Soll − Ist` und wird beim Ableiten der Ereignisse gerechnet.

## 2.4 · Speicherschlüssel

| Schlüssel | Inhalt |
|---|---|
| `hh_keller_v12` | die laufenden Vorgänge, `{ tag:{…}, keller:{…}, … }` |
| `hh_archiv` | abgeschlossene Vorgänge, lokal max. 30 |
| `hh_user` | angemeldeter Name (sessionStorage-artig über `whoAmI()`) |
| `hh_cfg_v9` | Verwaltungseinstellungen (Bar-Slots) |
| `hh_fotos` | Schlüssel der Fotos; die Bilder liegen in IndexedDB |
| `hh_howto_v1` | welche Hilfe schon gesehen wurde, je Modus |
| `hh_geraet_v1` | UUID dieses Geräts |
| `hh_ausgang_v1` | Warteschlange zum Server |
| `hh_zaehlnr_v1` | Zählnummer je Vorgangsschlüssel |
| `hh_fern_v1` | letzter bekannter Serverstand |
| `hh_bekannt_v1` | `{ sha256("hh:"+code): name }` — Offline-Anmeldung |
| `hh_nkennung_v1` | **nur `leitung.html`**, seit Runde 16: `{ kleingeschriebener Name: Kennung }`. Damit bekommt derselbe Mensch dieselbe Zeile, auch wenn die Personenliste nach einem Abbruch nicht zurückkommt. **Keine Codes darin** (harte Regel 9). Wird von `abmelden()` geräumt. Die Wache gegen ein zweites Gerät steht im Worker (`personSchreiben`, Namensprüfung) — ein Browserspeicher kann das nicht sehen. |

**Nie ungeprüft schreiben.** `jlese`/`jschreib` fangen Quota-Fehler ab;
`save()` zeigt bei vollem Speicher einen Toast.

---

# 3 · Mehrgerätebetrieb

**Grundsatz:** Das Gerät ist die Wahrheit, solange es allein ist. Der
Server ist die Wahrheit, sobald mehrere Geräte im Spiel sind. Dazwischen
liegt ein Ausgang, der nie etwas verliert.

## 3.1 · Der Weg eines Vorgangs

```
Benutzer tippt
  → save()                       localStorage + merkeAenderung()
  → inDenAusgang(rec, status)    Paket in hh_ausgang_v1
  → schiebe()                    PUT /api/vorgang/<modus>_<tag>
  → Worker: upsert vorgang       + ereignisseAbleiten bei finished
```

`inDenAusgang` hält **höchstens einen Eintrag je Schlüssel** — ein
Vorgang ist ein Zustand, kein Zuwachs, der neuere ersetzt den älteren
restlos. Das Paket ist der Vorgang selbst, angereichert um `geraet`,
`zaehlnr`, `name`, `zeit`. Diese Felder reisen **im** JSON mit und kommen
über `/api/vorgaenge` wieder zurück.

**Der Schlüssel `<modus>_<tag>` ist die Kennung.** Zweimal dasselbe Paket
schreibt dieselbe Zeile — doppeltes Senden nach einem Netzabbruch kann
keine Geistervorgänge erzeugen. Kein Idempotenzschlüssel nötig.

**Ausgelöst wird `schiebe()`** beim Abschluss, beim Archivieren, alle
45 s (`sammle()` + `zwischenstand()`), bei `online`, bei
`visibilitychange`. `zieheFern()` läuft beim Start, alle 180 s und beim
Zurückkehren in den Vordergrund.

## 3.2 · Konflikte

Jedes Gerät zählt je Vorgangsschlüssel eine `zaehlnr` hoch. Findet
`fernNeuer(m)` beim Öffnen eines Modus auf dem Server eine höhere Nummer
von einem anderen Gerät, kommt die Frage „Auf einem anderen Gerät
weiter?" — übernehmen oder eigenen Stand behalten.

**Zwei Leute an derselben Fassung sind ein Organisationsproblem, kein
Datenproblem.** Ein stiller Merge würde den Bestand verderben, ohne dass
es jemand merkt. Deshalb wird gefragt.

Der Client behandelt `409` bereits korrekt: Eintrag verwerfen (er ist
nicht verloren, sondern überholt), beim nächsten Öffnen fragen.

> **Korrektur 17.09.2026 (Runde 1, software-engineer):** Der Satz „Der
> Worker sendet noch kein 409" stimmt nicht mehr. `vorgangSchreiben` liest
> vor dem Upsert die gespeicherte `zaehlnr` und antwortet bei höherem Wert
> mit `409 {konflikt:true, server}` — `src/index.js`. Der Guard war schon
> vor Runde 1 im Code.

## 3.3 · Anmeldung

```js
POST /api/anmelden {code}
  → 200 {name, rolle} + Set-Cookie hh_sitz
  → 401 {fehler:"unbekannt", uebrig?}
  → 429 {fehler:"zu viele Versuche", wartenBis?}
```

Bei Erfolg merkt sich das Gerät `sha256("hh:"+code) → name` in
`hh_bekannt_v1`. Ohne Netz prüft `bekannterCode()` dagegen. **Codes
stehen nicht mehr im Quelltext** — bis v11 lagen alle vier als Klartext
in einer öffentlich ausgelieferten Datei.

Die App zeigt ab vier verbleibenden Versuchen eine Warnung und im
Sperrfall die Uhrzeit. `uebrig` und `wartenBis` liefert der Worker
**seit Runde 1** (17.09.2026) mit — siehe §9.1 C.

## 3.4 · Begrüßung

`tagesSatz()` baut aus `FERN` (Vorgänge des heutigen Tages vom Server)
Sätze wie „Asad Karakiri hat um 14:34 nachgefüllt." und „Die
Tagesfassung ist heute noch offen." `grussZeile()` setzt „Hallo <Vorname>."
darüber. **Ohne Server bleibt es beim Gruß ohne Satz** — ein erfundener
Tagesbericht wäre schlimmer als gar keiner.

`zieheFern()` zeichnet das Menü neu, wenn sich der Fernstand geändert
hat und man gerade im Menü steht. Ohne das bliebe die Zeile bis zum
nächsten Menüaufruf unsichtbar.

---

# 4 · `src/index.js` — der Worker

Ein `export default` mit drei Einstiegen: `fetch`, `email`, `scheduled`.

## 4.1 · Sitzung

```js
hashe(code, salt)        PBKDF2-SHA256, RUNDEN = 1000
gleich(a, b)             zeitkonstanter Vergleich
tokenBauen / tokenPruefen  HMAC-signiert, 12 h
keks(token)              hh_sitz, HttpOnly Secure SameSite=Lax
ich(request, env)        → {id, name, rolle} | null
darf(p, ...rollen)       Rollenprüfung
```

`anmelden()` rechnet den Code **gegen jede Person**, damit aus der
Antwort nicht ablesbar ist, ob es den Code gibt. Kostet Zeit, ist
Absicht. Sperre: 5 Fehlversuche je IP in 15 Minuten
(`anmeldeversuch`-Tabelle).

## 4.2 · Endpunkte

| Pfad | Methode | Rolle | Zweck |
|---|---|---|---|
| `/api/ping` | GET | — | Diagnose, Personenzahl |
| `/api/hash` | GET | ⚑ nur `ANLAGE_OFFEN` | Prüfsumme erzeugen |
| `/api/anlage` | POST | ⚑ nur `ANLAGE_OFFEN` | Person anlegen |
| `/api/anmelden` | POST | — | Sitzung |
| `/api/abmelden` | GET | — | Cookie löschen |
| `/api/ich` | GET | angemeldet | Name + Rolle |
| `/api/stamm` | GET | angemeldet | Stammdaten aus D1 |
| `/api/bestand` | GET | angemeldet | Bestand aus dem Journal |
| `/api/vorgaenge` | GET | angemeldet | flache Vorgangsobjekte |
| `/api/vorgang/<id>` | PUT | angemeldet | Vorgang schreiben |
| `/api/fassungsliste` | GET/POST | GET alle, POST `leitung` | Z-Berichte |
| `/api/mapping` | GET/POST | POST `leitung` | Kassenname → Artikel |
| `/api/personen` | GET/POST | `leitung` | Mitarbeiter |

**`/api/vorgaenge` liefert flach:** die gespeicherten `daten`, darüber
gelegt `id`, `tag`, `mode`, `name`, `finished`, `archiviert`. Nicht
`{schluessel, zaehlnr, daten}` — das war ein Entwurf, der verworfen wurde.

## 4.3 · Ereignisse

`vorgangSchreiben` upsertet nach `id`. **Ereignisse entstehen erst beim
Abschluss** (`daten.finished`), und nur einmal: `ereignisseAbleiten`
prüft, ob zu diesem Vorgang schon Zeilen existieren. Ein laufender
Vorgang darf den Bestand nicht bewegen, sonst zählt jeder Zwischenstand
mit.

Abgeleitet wird je Modus:
- `tag`/`fuellen` → `entnahme` aus `barrot|bar|backup|rest`, überschrieben
  durch `holtN`, plus `zusatz`
- `nach` → `entnahme` aus `ent`
- `keller` → `zaehlung` aus `reihen*6 + einzel`, nur für `zdone`
- `ware` → `eingang` aus `pos[].kisten * kg`
- immer: `gent`, `gzusatz` → `entnahme`, Ort `lager`

`bestand()` liest **alle** Ereignisse, nimmt je Artikel die jüngste
Zählung als Basis und rechnet ab da vor. **Ohne Zählung kein Bestand,
nur Bewegung** — das ist Absicht und wird in der Leitung auch so gesagt.

## 4.4 · Mail

`email(message, env, ctx)`: Absender gegen `env.ABSENDER` prüfen
(Kommaliste von Domains), `PostalMime.parse`, Anhang mit `.csv`/`.txt`
suchen, der `Bis` und Tabulatoren enthält, sonst `mail.text`. Dann
`fassungsliste()` → `parseZ` → `fassungsliste` + `fassungszeile`, Mapping
über `mappe()`. Fehlschläge landen als Notiz im Journal, nie als Fehler.

`scheduled`: Wochenbrief, Top-15-Bewegungen und fehlende Z-Berichte, als
Notiz ins Journal.

## 4.5 · Tabellen

`person`, `anmeldeversuch`, `vorgang`, `ereignis`, `fassungsliste`,
`fassungszeile`, `mapping`, `stamm`, `_cf_KV`.

**`schema.sql` ist veraltet und weicht an mehreren Stellen ab.** Nie
ausführen. Der wahre Stand:

```sql
SELECT name, sql FROM sqlite_master WHERE type='table';
```

**Ungenutzt, am 16.09. versehentlich angelegt:** Tabellen `idem` und
`zbericht`, Spalten `schluessel`, `zaehlnr`, `geraet` auf `vorgang`.
Stammen aus einem Entwurf, bevor klar war, dass der Worker Idempotenz
über die `id` und Z-Berichte über `fassungsliste` löst. Harmlos.

---

# 5 · `public/leitung.html` — das Backoffice

Zwölf Ansichten, Navigation links:

```
Täglich       Mittagsblick · Verkauf ↔ Fassung · Z-Bericht
Bestand       Kellerbestand · Nachbestellen · Getränke · Zählliste
Nachschlagen  Speicher · Zuordnung · Rezepturen
Verwaltung    Mitarbeiter · Einstellungen
```

**Drei Quellen, in dieser Reihenfolge:** `/api/vorgaenge` → localStorage
derselben Herkunft → JSON-Datei per Knopf. Der Chip oben rechts zeigt,
welche gerade greift. **Steht dort „Lokal", antwortet der Server nicht.**

`normVorgang()` macht aus dem Vorgangs-Blob ein flaches Ergebnis
(`wein`, `getr`, `zaehlung`, `gzaehlung`, `eingang`). `bestand()` und
`verbrauch()` rechnen daraus. `zParse()` zerlegt Z-Berichte mit vier
eingebauten Fallen (Doppelnamen summieren, Nullpreiszeilen zählen,
Größe im Namen, Positionsblock ohne Warengruppe).

**Die Leitung hat keine eigene Anmeldung.** Sie lebt vom Cookie, das
`index.html` setzt. Ohne Sitzung zeigt sie die Tür („Zum Fassungstool").

**Unter 900 px** wird die Navigation zu einem Sheet, Tabellen scrollen
waagrecht mit fixierter erster Spalte.

---

# 6 · `public/sw.js`

Zwei Regeln:

1. Das Gerüst (beide HTML, Symbol, Schriften) wird vorgehalten. **Erst
   das Netz, dann die Kopie** — damit ein Deploy sofort ankommt.
2. **Alles unter `/api/` wird NIE zwischengespeichert.** Ein alter
   Bestand aus dem Cache wäre schlimmer als gar keiner, und die App hat
   für den Ausfall ihren eigenen Ausgang.

`VERSION` bei jeder Änderung erhöhen. Einträge werden einzeln gecacht,
damit eine fehlende Schriftdatei nicht die ganze Installation scheitern
lässt.

---

# 7 · Gestaltungssystem

## 7.1 · Der geteilte Block

Oben in **beiden** HTML-Dateien steht wortgleich derselbe CSS-Block:
Token, Knopf, Eingabe, Karte, Hinweis, Pille, Fokus, Hauszeichen. Mit
einem Kasten obendrauf, der darauf hinweist.

**Warum nicht ausgelagert?** Es gab kurz `tokens.css` und `leitung.css`.
Ohne Bauschritt muss eine ausgelagerte CSS-Datei von Hand mitgeliefert
werden — und fehlt sie, fällt **jeder** Wert im seiteneigenen Stylesheet
auf den Browser-Standard zurück, weil dort durchgehend `var(--…)` steht.
Die Seite bricht dann nicht ein bisschen, sondern vollständig. Das ist
der Grund für die Doppelung.

**Wer den Block ändert, ändert ihn in beiden Dateien.**

## 7.2 · Token

```
--bg #ECE9E2   --surface #FFFFFF   --accent #004947 (Haus-Hirt-Teal)
--marke #462500 (Hauszeichen)      --fg #1C2220
--danger #B4471F  --success #3E7A3E  --warn #E0B200  --info #004947
--space-1..8 (4px-Basis)  --radius-*  --tap-min 44px  --control-h 44/36/52
--font Barlow  --font-display Cormorant Garamond
```

**Kein Hex-Literal außerhalb der Tokenebene.** Ausnahmen, die geprüft
sind: `theme-color`-Meta, die Produktfarben in `GETR.col`, `#00605D` als
gedrückter Zustand.

`[data-dichte="maus"]` am `<html>` der Leitung schaltet auf 36 px
Steuerhöhen. Unter 900 px springt es zurück auf 44 px.

## 7.3 · Regeln, die aus Fehlern entstanden sind

- **Eine linke Kante.** Alles fluchtet auf die 16 px von `#main`. Es gab
  einen Zustand, in dem Stationsüberschriften bei 32 px und Zeilen bei
  18 px standen.
- **Drei Knopfstufen.** Gefüllt (Hauptsache), gerahmt (Nebensache),
  Text ohne Rahmen (Ausweichmöglichkeit). „Überspringen" sah einmal
  genauso aus wie „Zurück".
- **`.finishbtn.blocked` statt `disabled`.** Der Knopf bleibt bedienbar
  und nennt beim Antippen den Grund.
- **Trefferflächen nie unter 44 px**, auch wenn der Punkt kleiner ist.
- **`tabular-nums`** überall, wo Zahlen untereinander stehen.
- **Rot wird nur, was fehlt.** Nicht die ganze Zeile.

---

# 8 · Fallen — die Dinge, die wirklich gebissen haben

**1 · Zwei Komponenten, ein Name.** `.kpi` existierte in beiden Dateien
mit verschiedener Bedeutung (Kennzahlkarte vs. Zahlenreihe im
Protokoll). Als die Tokenebene geteilt wurde, bekam die Protokollreihe
Kartenrahmen und Versalien. Vor jedem neuen Klassennamen in der
geteilten Schicht: in beiden Dateien greppen.

**2 · Textersetzung ohne Prüfung.** Der Zusammenbau setzte das
Hauszeichen über eine Textsuche ein. Als „Bad Gastein" aus dem
Untertitel verschwand, fand die Suche die Stelle nicht mehr — das
Zeichen verschwand **still**. Jede Ersetzung muss die Trefferzahl
prüfen und abbrechen, wenn sie nicht stimmt.

**3 · Zwei Stellen, ein Verhalten.** Der Versatz einer Ladensäule wird
an zwei Orten gesetzt: beim Aufbau und in `gFit`. Eine davon zu ändern
sieht aus, als hätte die Änderung nicht gewirkt.

**4 · Doppeltes `const`.** Eine zweite Deklaration von `GMAX` ließ das
gesamte Skript still sterben — die Seite lud, aber nichts reagierte.
Bei „nichts passiert mehr": erst die Konsole, dann denken.

**5 · Layout vor dem Messen.** `gFit` beim ersten Lauf misst oft eine
Breite, die noch nicht die endgültige ist. Deshalb der zweite Lauf in
`requestAnimationFrame`.

**6 · Das Raster, das keiner sah.** Im Bar-Schritt steht eine einzige
Lade auf dem Schirm — sie bekam trotzdem nur eine von zwei
Rasterspalten und war auf dem iPad halb so breit wie ihr Platz.
`.gladen--einzeln` behebt es.

**7 · `overflow:hidden` gegen `position:sticky`.** In der Leitung hob
`.tabhuelle{overflow:hidden}` das Kleben der Tabellenköpfe auf. Bei 53
Zeilen Kellerbestand scrollte man ohne Spaltenüberschriften.

**8 · Eine Regel, zu breit gefasst.** `table{min-width:560px}` traf auch
eine Tabelle ohne Scrollfläche und schob die ganze Seite auf 597 px.

**9 · Die Sperre zählt pro IP.** Im Haus teilen sich alle Geräte eine.
Fünf Fehlversuche waren nicht fünf pro Person, sondern fünf für alle —
und wer danach den richtigen Code eingab, kam auch nicht mehr hinein.

**10 · Error 1101 ist keine Diagnose.** Zwei Wochen gingen 2026 mit der
Hypothese „CPU-Limit des Free-Plans" verloren. Es waren
Schema-Abweichungen. Observability → Logs → Live → Aufruf wiederholen →
Klartext lesen.

---

# 9 · Offene Arbeit

## 9.1 · Im Worker — vier Änderungen

Ausformuliert in `WORKER-ANPASSUNG.md` und `ANMELDESPERRE.md`.

**⚑ A · `ANLAGE_OFFEN` löschen.** `/api/hash` und `/api/anlage` geben
jedem, der die Adresse kennt, ein Konto mit beliebiger Rolle. Steht seit
01.09. offen.

**B · 409-Guard in `vorgangSchreiben`.** ~~Der Upsert überschreibt
bedingungslos.~~ **ERLEDIGT, war schon vor Runde 1 im Code.** Der Guard
liest vor dem Upsert die gespeicherte `zaehlnr` und gibt bei höherem Wert
`409 {konflikt:true, server}` zurück. Nachgeprüft am 17.09.2026 gegen
`src/index.js`.

**C · Anmeldesperre.** `SPERRE.versuche` auf 10, `uebrig` bei 401 und
`wartenBis` bei 429 mitgeben, und bei erfolgreicher Anmeldung
`DELETE FROM anmeldeversuch WHERE ip = ?1 AND ok = 0`. Die App ist schon
darauf eingestellt.

**D · Zwei Indizes.** `ereignis(artikel, ts)` und `ereignis(tag)`.
`bestand()` liest heute die ganze Tabelle; die D1-Leselimits sind seit
01.09. hart.

**Später:** `RUNDEN` von 1000 auf 100000 — heißt alle vier Personen neu
anlegen, weil die Prüfsummen nicht mehr passen. Also vor dem Start.

## 9.2 · In der App — drei Stücke

**A · Verwaltung ins Backoffice.** Der Editor für Glasweine und
Soll-Mengen (`renderAdmin`, `openAdmin`, hinter einer PIN, `hh_cfg_v9`)
war in `index.html` und ist dort aus dem Menü entfernt. In der Leitung
noch nicht nachgebaut — **Glasweine und Soll-Mengen lassen sich derzeit
nicht ändern.** Der Code steht noch in `index.html` und ist als Vorlage
brauchbar. Zielort: eine neue Ansicht in `leitung.html`, Daten künftig
in D1 (`stamm`) statt `localStorage`, damit sie für alle Geräte gilt.

**B · „Leer" ankreuzen.** Ein Häkchen je Position: setzt den Bestand auf
0 **und** merkt sich „ausgegangen". Beides ist nötig — die Null allein
sagt nicht, ob jemand nachgeschaut hat. Daraus entsteht in der Leitung
eine eigene Zeile „unbedingt nachbestellen". Semantik vom Betreiber
bestätigt: „5 statt 7, dann leer ankreuzen" heißt 5 genommen und jetzt
leer; nur leer ankreuzen heißt alles leer.

**C · Fassungsliste raus, Vortagsabgleich rein.** Der Fotoschritt
(`rFotos`, `fotobtn`, IndexedDB-Teil ab Zeile ~3862) fällt weg, auch der
Kacheltext „Liste fotografieren". An seine Stelle kommt im Abschluss der
Tagesfassung ein Fenster mit den Zeilen, bei denen die Entnahme von
gestern und der verkaufte Ausschank um mindestens eine Flasche
auseinanderliegen. **Die Datenquelle liegt bereit:**
`GET /api/fassungsliste?tag=<gestern>` liefert `positionen` mit
`kassenname`, `anzahl`, `artikel`, `ml`. Umrechnung in Flaschen:
`anzahl * ml / gebinde`, Gebinde 750 für Wein, sonst aus dem Namen
(`mlAusText`). Damit fällt auch das Protokoll weg — das Mitspeichern
läuft ohnehin laufend über den Server.

## 9.3 · Kleinkram

- Vier `woff2`-Dateien unter `public/fonts/` fehlen (Barlow 500/600/700,
  Cormorant 600). Ohne sie greift die Systemschrift, alles funktioniert.
  Beide Schriften sind SIL OFL, also frei.
- `GETR.kurz` fehlen Kürzel für Tomate, Grapefruit, Cranberry, Ananas,
  Johannisbeere, Mango, Maracuja, Cola, Hell, Dunkel.
- `schema.sql` nachziehen oder umbenennen.
- Keine Sicherung der D1. Kein Papierkorb, ein falsches `DELETE` genügt.
- Sechs Produkte ohne Stammdaten, Storno-Behandlung,
  Cocktail-Rezepturen, Kistengröße Ott (`w003`, angenommen 12).

---

# 10 · Wie man prüft

Ohne Browsertest ist an diesem Projekt nichts verifiziert. Die
Rückmeldeschleife über das Handy des Betreibers ist zu langsam und zu
ungenau.

## 10.1 · Prüfserver

Ein lokaler Nachbau des Workers. **Wichtig: er muss den echten Vertrag
spiegeln** — PUT auf `/api/vorgang/<id>`, flache Antwort bei
`/api/vorgaenge`. Ein Mock, der den eigenen Entwurf spiegelt, prüft gar
nichts.

```python
# pruefserver.py — Kern
# GET  /api/ping         {"ok":true,"personen":n}
# POST /api/anmelden     {code} → {name,rolle} + Set-Cookie hh_sitz
# GET  /api/ich          → {name,rolle} | 401
# GET  /api/vorgaenge    → {"vorgaenge":[ {...daten, id, tag, mode,
#                                          name, finished, archiviert} ]}
# PUT  /api/vorgang/<id> Körper = der Vorgang; 409 bei niedrigerer zaehlnr
# Statische Dateien aus public/ ausliefern.
```

Chromium im Container braucht `args=["--no-proxy-server"]`, sonst
erreicht er `127.0.0.1` nicht.

## 10.2 · Zwei Testläufe

**Mehrgerätelauf, 18 Prüfungen.** Vier Browsersitzungen als vier Geräte:
Anmeldung über Server, falscher Code, Vorgang übertragen, Ausgang leer,
zweites Gerät sieht „Läuft gerade woanders", Leitung liest Server,
Übernahmedialog, fremder Stand übernommen, Flugmodus wartet, Rückkehr
überträgt, doppelte Sendung erzeugt keinen zweiten Vorgang, fremdes Gerät
ohne Netz abgewiesen, keine Codes im Quelltext, bekanntes Gerät offline
angemeldet, Fassen ohne Netz, keine JS-Fehler.

**Gestaltungslauf.** Fünf Modi mit allen Schritten, zwölf
Backoffice-Ansichten, bei 390 px und 1280 px. Geprüft wird:
`document.documentElement.scrollWidth > viewport` (waagrechter Überlauf)
und `pageerror`.

**Zusätzlich sinnvoll:** Punktgrößen aller sechs Laden auf drei
Gerätebreiten messen. Sie müssen mit dem Schirm wachsen und dürfen
zwischen den Laden nicht springen.

## 10.3 · Diagnose am laufenden System

```
/api/ping         HTML statt JSON → run_worker_first fehlt
                  "D1-Binding fehlt" → Bindung nicht in wrangler.jsonc
                  "personen":0 → niemand kann sich anmelden
/api/ich          {"fehler":"nicht angemeldet"} → erst index.html
/tokens.css       404 ist RICHTIG — die Datei gibt es nicht mehr
Leitung-Chip      „Lokal" statt „Server" → /api/vorgaenge antwortet nicht
Seite nackt       alte Fassung, die noch auf tokens.css verweist
ausgesperrt       DELETE FROM anmeldeversuch WHERE ok = 0;
```

---

# 11 · Konventionen

- **Sprache: Deutsch.** Klassennamen, Funktionsnamen, Kommentare,
  Oberfläche. `schluessel`, nicht `key`. Das ist keine Marotte, sondern
  hält den Abstand zwischen Code und Betrieb klein.
- **Kommentare erklären das Warum, nicht das Was.** Vorhandene
  Kommentare sind Wissen aus dem Betrieb — nicht wegräumen.
- **Kein Framework, keine Abhängigkeit im Frontend.** Zwei HTML-Dateien
  und eine API. Das Projekt soll portabel bleiben.
- **Kein Hex außerhalb der Tokenebene.**
- **Jede Textersetzung prüft ihre Trefferzahl.**
- **Ereignisjournal ist append-only.** Korrekturen sind neue Zeilen.
- **Offline ist der Normalfall.**
- **`/api/` wird nie zwischengespeichert.**
- **Automatische Zuordnung von Getränken bleibt aus.** Bei Weinen über
  Rebsorten-Kürzel trifft sie 14 von 14; bei Getränken liefert die
  Ähnlichkeitssuche überzeugend falsche Treffer, die den Bestand
  stillschweigend verderben würden. Absicht, keine Lücke.
- **Bei zwei Geräten am selben Vorgang: fragen, nicht mischen.**

---

# 12 · Glossar

| Begriff | Bedeutung |
|---|---|
| **Fassung** | der tägliche Durchgang: prüfen, holen, einräumen |
| **Lade** | eine Schublade in der Bar, 1–6 |
| **Fach** | ein Abteil innerhalb einer Lade |
| **Station** | ein Schritt im Bar-Durchgang (R, 1–6) |
| **Schrank** | Kühlschrank im Restaurant, 1–4 |
| **Soll** | wie viele Flaschen an den Platz gehören |
| **Ist** | wie viele gerade da sind |
| **Fehlmenge** | Soll − Ist, das ist, was aus dem Keller geholt wird |
| **Zwischenstand** | laufender Vorgang, `status: "laeuft"` |
| **Z-Bericht** | Tagesabschluss der Kasse (gastronovi) |
| **Fassungsliste** | der zerlegte Z-Bericht in D1 |
| **Ausgang** | die Warteschlange zum Server im Gerät |
| **Vorgangsschlüssel** | `<modus>_<tag>`, z. B. `tag_2026-09-16` |
