# Die Jagd

Funde des Jägers (`.claude/agents/jaeger.md`). Er baut nichts, er sucht nur.
Läuft nach jeder Runde, liest den Diff UND den Gesamtzustand.

Klassen:
* **A** – falsche Zahl, Datenverlust, Funktion kaputt, Sicherheitsloch
* **B** – sichtbarer Fehler oder Fehlbedienung wahrscheinlich
* **C** – Kosmetik (ab Runde 5 grundsätzlich nach `review/BACKLOG.md`)

Erledigtes wird nicht gelöscht, sondern in der Spalte „Stand" auf
„behoben in Runde N" gesetzt.

| Klasse | Runde | Fund | Datei:Zeile | Wie nachgestellt | Nächste Rolle | Stand |
|---|---|---|---|---|---|---|
