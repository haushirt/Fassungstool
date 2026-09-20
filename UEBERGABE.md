# Übergabe 20.09.2026 · Runde 18 (Backoffice)

## Erledigt
- **Kacheln im Mittagsblick sind Knöpfe** und führen an die Stelle, die ihre
  Zahl erklärt — Tagesfassung, Z-Bericht, Differenzen, Nachbestellen. Keine
  davon endet in einer Sackgasse.
- **Neue Ansicht „Eingänge"** unter Nachschlagen: jeder Vorgang mit allen
  Mengen (auch Wareneingang, auch gezählte Getränke), Notiz in der Liste,
  Detail am Handy lesbar, zwei getrennte leere Zustände, ein eigener Abschnitt
  für das, was nur im Browser liegt.
- **Wisch von links** öffnet die Seitenleiste, statt im Browser zurückzuspringen.
- **Druckblätter** je Vorgang und für „was nicht aufgeht" — ohne neue
  Abhängigkeit; das PDF macht der Druckdialog.
- Runde-Dokument mit Datei:Zeile und Prüfplan: `review/RUNDE-18-BACKOFFICE.md`.
  PR-Beschreibung: `review/ERGEBNIS.md`. Backlog abgeglichen.
- **Vier Jagden, jede mit einem A-Fund — alle behoben.** Es war viermal
  derselbe: Vier Stellen deuten dieselbe Differenz, und behoben wurde immer nur
  die, die gerade genannt war. Der Anlass: Das Blatt für die WhatsApp-Gruppe
  nannte „Schwund", wo der Verkauf gar nicht in der Rechnung stand — mit dem
  Mapping, wie es live steht, sind das in einem echten Z-Bericht 136 von 145
  Stück. Das Wort steht jetzt nirgends mehr, und ein Kasten sagt, was fehlt.
- `npm test` 444/444 grün. `node tests/ui-runde18.cjs` 51 Urteile grün.

## Blockaden
- **Eine Entscheidung steht aus, kein Fehler.** Eine Zeile, deren Verkauf über
  „Ignorieren" aus der Rechnung fällt, trägt weiter die grüne Plakette
  „stimmt". Gemessen: neun Flaschen verkauft, drei geholt — gezeigt „stimmt".
  Behoben ist, dass Bildschirm, CSV, Kachel und Blatt die ignorierten Namen
  jetzt alle benennen; was die EINZELNE Zeile sagen soll, hängt daran, was
  „Ignorieren" bedeuten soll. Zwei Wege stehen ausgearbeitet in
  `review/BACKLOG.md` ganz oben.
- Sonst **keine.** Zwei Dinge kann kein Prüfstand beantworten, sie brauchen das Gerät:
  1. Blättert Safari am iPad nach dem Wisch wirklich nicht mehr zurück?
  2. Einmal wirklich drucken und als PDF sichern — der Prüfstand misst das
     Blatt, nicht den Drucker.
- Offen aus früheren Runden, unverändert und bewusst nicht angefasst:
  Sonderentnahme Getränke ohne Weg zum Grund, Gasteiner 0,25 l auf Soll 8
  (Antwort von Casimir nötig), der Tagesversatz zwischen Betriebstag und
  Abgleich, `/api/code` räumt die Anmeldesperre nicht auf.

## Prompt für die nächste Runde

```
Backoffice, Runde 19. Stand lesen: STAND.md, dann review/RUNDE-18-BACKOFFICE.md.

Zuerst nachsehen, ob Runde 18 am Gerät hält:
  1. iPad: Wisch von links — öffnet die Seitenleiste oder springt Safari zurück?
  2. MacBook: ein Vorgang und ein Differenzblatt wirklich als PDF sichern.
     Sieht das Blatt aus, wie es soll? Fehlt etwas, das in die Gruppe gehört?

Zuerst entscheiden (steht ganz oben in review/BACKLOG.md unter „Hoch"):
  Was soll „Ignorieren" bedeuten? Heute nimmt es den Verkauf aus der Rechnung,
  und die betroffene Zeile sagt trotzdem „stimmt" in Grün. Zwei Wege stehen
  dort ausgearbeitet.

Danach in dieser Reihenfolge:
  A. vSpeicher trägt die alten Mängel weiter (zwei Striche, ein leerer Satz,
     gzaehlung ungezeigt). Entweder mit den fertigen Bausteinen aus Runde 18
     nachziehen (vgBloecke, vgMengen, .tabhuelle.schmal) — oder den Speicher
     streichen, wenn sich „Eingänge" bewährt hat. Vorher fragen, was lieber ist.
  B. Der Weg ZURÜCK für Vorgänge, die nur im Browser liegen (Backlog, mittel).
     Er gehört in public/index.html, nicht ins Backoffice.
  C. Ein Sammelblatt über mehrere Vorgänge (eine Woche auf ein Blatt).

Regeln wie immer: claude/…-Zweig, sw.js VERSION erhöhen, Gestaltungsschicht
wortgleich in beiden Dateien, keine neuen Abhängigkeiten, Live-D1 nur lesen.
Am Ende: Runde-Dokument mit Datei:Zeile und Prüfplan, wie in Runde 18.
```
