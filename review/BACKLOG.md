# Backlog

Gesammelte Punkte aus allen Rollen. Erledigtes nicht löschen, sondern nach „Erledigt" verschieben – so bleibt nachvollziehbar, wer was wann behoben hat.

Spalten: Priorität · Rolle (wer hat es gemeldet) · Runde · Punkt · Datei:Zeile

## Hoch

| Rolle | Runde | Punkt | Datei:Zeile |
|---|---|---|---|
| Setup | – | **Verwaltungscode steht im Klartext in der ausgelieferten App** (`const PIN="…"`). Jeder, der die Seite öffnet, liest ihn im Quelltext. Verstößt gegen Regel 9. | `public/index.html:1833` |
| Setup | – | Der Verwaltungs-Editor ist über `openAdmin()` weiter erreichbar, obwohl Projektanleitung §8 A ihn als aus `index.html` entfernt beschreibt. Doku und Code widersprechen sich. | `public/index.html:1842` |
| Setup | – | Mit demselben Klartext-Code lässt sich die Abschluss-Freigabe übersteuern, ohne angemeldet zu sein. | `public/index.html:3715` |
| Setup | – | `ANLAGE_OFFEN` im Dashboard steht seit 01.09. offen – Selbstanlage eines Kontos mit beliebiger Rolle. Nur von dir lösbar (Regel 13). | Dashboard |
| Setup | – | Keine Sicherung der D1. Ein falsches `DELETE` in der Console löscht den Kellerbestand unwiederbringlich (Projektanleitung §8). | Dashboard |
| Setup | – | `docs/live-schema.sql` fehlt im Repo. Ohne die Datei ist harte Regel 3 nicht erfüllbar (lokale Test-DB, Abgleich aller SQL-Stellen). | – |
| Setup | – | `tests/fixtures/` fehlt. QA und Controller können ohne die anonymisierten Z-Berichte und Zählungen nicht rechnerisch prüfen. | – |
| Setup | – | `WORKER-ANPASSUNG.md` und `ANMELDESPERRE.md` fehlen, obwohl Projektanleitung §8 die vier Worker-Änderungen als „dort ausformuliert" bezeichnet. | – |

## Mittel

| Rolle | Runde | Punkt | Datei:Zeile |
|---|---|---|---|
| Setup | – | `review/INPUT-TEAM.md` ist noch leer. Team-Anliegen haben laut `CLAUDE.md` Vorrang vor eigenen Ideen. | `review/INPUT-TEAM.md` |

## Niedrig

| Rolle | Runde | Punkt | Datei:Zeile |
|---|---|---|---|
| | | | |

## Erledigt

| Rolle | Runde | Punkt | Erledigt in |
|---|---|---|---|
| | | | |
