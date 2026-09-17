# Backlog

Gesammelte Punkte aus allen Rollen. Erledigtes nicht löschen, sondern nach „Erledigt" verschieben – so bleibt nachvollziehbar, wer was wann behoben hat.

Spalten: Priorität · Rolle (wer hat es gemeldet) · Runde · Punkt · Datei:Zeile

## Hoch

| Rolle | Runde | Punkt | Datei:Zeile |
|---|---|---|---|
| Setup | – | Der Verwaltungs-Editor ist über den Menüknopf „Verwaltung" weiter erreichbar, obwohl Projektanleitung §8 A ihn als aus `index.html` entfernt beschreibt. Doku und Code widersprechen sich. Der Klartext-Code ist seit Runde 1 weg, der Editor selbst nicht. | `public/index.html:1782`, `:1842` |
| software-engineer | 1 | Verwaltungs-Editor nach `leitung.html` umziehen (§9.2 A) und `hh_cfg_v9` von localStorage nach D1 `stamm` heben, damit Glasweine und Soll-Mengen für alle Geräte gelten. Wartet auf `docs/live-schema.sql`. | `public/index.html:1862` → `public/leitung.html` |
| Setup | – | `ANLAGE_OFFEN` im Dashboard steht seit 01.09. offen – Selbstanlage eines Kontos mit beliebiger Rolle. Nur von dir lösbar (Regel 13). | Dashboard |
| Setup | – | Keine Sicherung der D1. Ein falsches `DELETE` in der Console löscht den Kellerbestand unwiederbringlich (Projektanleitung §8). | Dashboard |
| Setup | – | `docs/live-schema.sql` fehlt im Repo. Ohne die Datei ist harte Regel 3 nicht erfüllbar (lokale Test-DB, Abgleich aller SQL-Stellen). | – |
| Setup | – | `tests/fixtures/` fehlt. QA und Controller können ohne die anonymisierten Z-Berichte und Zählungen nicht rechnerisch prüfen. | – |

## Mittel

| Rolle | Runde | Punkt | Datei:Zeile |
|---|---|---|---|
| Setup | – | `review/INPUT-TEAM.md` ist noch leer. Team-Anliegen haben laut `CLAUDE.md` Vorrang vor eigenen Ideen. | `review/INPUT-TEAM.md` |
| software-engineer | 1 | Die Offline-Queue bleibt bei einem dauerhaften 4xx stehen: Ein Paket, das der Server immer wieder mit 400/422 ablehnt, hält alle nachfolgenden Vorgänge auf und meldet nur „Server antwortet nicht". Stilles Verwerfen verbietet Regel 6 – also Sackfach plus sichtbarer Hinweis. Entscheidung nötig. | `public/index.html:1494` |
| software-engineer | 1 | `vorgangSchreiben` prüft nicht, ob der Pfad-Schlüssel zu `daten.mode`/`daten.tag` passt. Bei einer Abweichung stehen Spalte `tag` und Kennung auseinander – die Datumsfilter der Leitung und der Wochenbrief rechnen dann am falschen Tag. Erst nach dem Punkt darüber umsetzbar (422 würde die Queue blockieren). | `src/index.js:170` |
| software-engineer | 1 | Kein Testgerüst im Repo (§10: Prüfserver, Mehrgeräte- und Gestaltungslauf). `node_modules` fehlt, `src/index.js` lässt sich lokal nur mit einer `postal-mime`-Attrappe importieren. | – |

## Niedrig

| Rolle | Runde | Punkt | Datei:Zeile |
|---|---|---|---|
| software-engineer | 1 | `versuche: 0` im Ausgangseintrag wird nie hochgezählt und nie gelesen – toter Code. Entweder Zählung führen und im Netz-Chip zeigen oder Feld streichen. | `public/index.html:1470` |
| software-engineer | 1 | Verwaltung und Freigabe hängen jetzt an `hh_bekannt_v1`. Wird der Speicher des Geräts geleert, sind beide bis zur nächsten Anmeldung mit Netz gesperrt. Im Keller ohne Netz fällt das auf. | `public/index.html:1291` |

## Erledigt

| Rolle | Runde | Punkt | Erledigt in |
|---|---|---|---|
| Setup | 1 | Verwaltungscode `const PIN` im Klartext in der ausgelieferten App (Regel 9). Konstante und Erwähnung im Kommentar entfernt; Verwaltung prüft jetzt `bekannterCode()`. | `public/index.html:1842` |
| Setup | 1 | Abschluss-Freigabe über den Klartext-Code übersteuerbar. Es zählt nur noch ein Zugangscode, der auf diesem Gerät schon einmal angemeldet war. | `public/index.html:3726` |
| software-engineer | 1 | Anmeldesperre nach §9.1 C: 10 Versuche, `uebrig` bei 401, `wartenBis` bei 429, Erfolg räumt die Fehlversuche der IP weg. | `src/index.js:99`, `:131`, `:137` |
