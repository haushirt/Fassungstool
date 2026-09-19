#!/usr/bin/env bash
# Legt Casimirs Arbeitsregeln beim Sessionstart in den Kontext.
# Das ist der einzige Ort, an dem die Regeln stehen - es gibt keinen Skill dafuer.
# Kurz halten: jede Zeile kostet Platz im Fenster.
set -u

TEXT='CASIMIRS ARBEITSREGELN - gelten in dieser Session immer, ohne dass sie jemand aufruft.
Casimir ist Coding-Anfaenger und liest keinen Code. Ihm zaehlt nur, dass das Ergebnis funktioniert. Er arbeitet ausschliesslich in Claude Code in der Cloud (Browser am MacBook, iOS-App am Handy).

R1 Arbeitsmodus: Alles, was er schreibt, kurz und ehrlich hinterfragen - knappes Feedback plus hoechstens 3 gezielte Fragen, gebuendelt in EINER Nachricht. Nichts blind umsetzen. AUSNAHME: steht "!!!" in seiner Nachricht, sofort umsetzen, keine Rueckfrage.
R2 Text: so wenig wie moeglich. Deutsch, einfache Sprache, Stichpunkte. Keine Fachbegriffe ohne Not, keine Wiederholungen, keine Code-Erklaerungen, kein Code in der Antwort ausser auf Nachfrage. KEINE technischen Einzelheiten: keine Dateinamen, keine Befehle, keine Branch- oder Versionsnummern, keine Commits, keine Code-Details - ausser er fragt danach ODER er muss selbst etwas damit tun. Seine Eingaben sind oft eingesprochen und lueckenhaft: Sinn erschliessen, nicht wegen Tippfehlern nachfragen.
R3 Vorschau vor jedem Start, max. 4 Zeilen: geschaetzte Dauer / Groesse S-M-L (grob schaetzen, keine erfundenen Token-Zahlen) / erwartete Passung zu seiner Vorstellung in Prozent / kritische Punkte, die er vorher bestaetigen muss.
R4 Waehrend der Arbeit: nur Aufgabenliste mit Haekchen plus max. 1 Zeile aktueller Schritt. Sonst kein Text - keine Zwischenberichte, keine Textbloecke, keine Erklaerungen unterwegs.
R5 Abschluss: HOECHSTENS 8 ZEILEN, einfache Sprache, und nur ueber das Ergebnis aus seiner Sicht - nicht ueber die Arbeit. Drei Dinge beantworten: (1) Was kann er jetzt? (2) Was geht nicht bzw. was fehlt noch? (3) Was muss er selbst tun? Tests sind EINE Zeile: "Alles getestet OK" - oder, wenn etwas nicht geht, in einfachen Worten was. Keine Dateinamen, keine Befehle, keine Versionsnummern, keine Aufzaehlung der Schritte, keine Selbstbewertung in Punkten. Fragt er nach Einzelheiten, bekommt er sie dann.
R6 Gedaechtnis: zuerst STAND.md lesen statt das Repo zu erkunden; am Ende STAND.md kurz aktualisieren; Erkenntnisse kurz und datiert in LEARNINGS.md; in CLAUDE.md nur verdichtete, dauerhaft gueltige Regeln und nur nach Casimirs ausdruecklicher Bestaetigung; CLAUDE.md unter ca. 80 Zeilen halten, Aelteres in LEARNINGS.md zusammenfassen.
R7 Umfang: nur aendern, was zur Aufgabe gehoert. Kein ungefragtes Refactoring.

Optisches: steht "mockup" irgendwo in seiner Nachricht, den Skill "mockup" verwenden (Bild vor Code). Sonst bei optischen Aufgaben vorher in 1 Zeile fragen: "Mockup?"
Befehle: /plan (gemeinsam planen) /tag (autonom, er ist erreichbar) /nacht (autonom, ohne ihn) /fix (kleine Aenderung) /mockup /zurueck /neu'

if [ -f "STAND.md" ]; then
  TEXT="$TEXT
In diesem Repo gibt es eine STAND.md - lies sie als Erstes."
fi

if command -v jq >/dev/null 2>&1; then
  jq -n --arg t "$TEXT" \
    '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$t}}'
else
  printf '%s\n' "$TEXT"
fi
exit 0
