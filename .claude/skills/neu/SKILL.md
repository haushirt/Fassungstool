---
name: neu
description: Neues Repo fuer Casimirs Arbeitsweise einrichten - Befehle, Regeln und Hooks aus casimir-claude kopieren, dazu CLAUDE.md, STAND.md, LEARNINGS.md.
argument-hint: "[optional: worum geht das Projekt]"
disable-model-invocation: true
---

# /neu - Repo einrichten

Projekt: $ARGUMENTS

Stelle zuerst **hoechstens 3 Fragen** zum Projekt, gebuendelt in einer Nachricht,
am besten als Auswahl mit Vorschlag. Sinnvolle Fragen sind:
- Worum geht es, in einem Satz?
- Was ist die Technik (z. B. Cloudflare Worker, Webseite, Skript)?
- Gibt es etwas, das Claude niemals tun darf (z. B. Deploy, Push auf main)?

Danach Schritt 1 bis 5. Nichts anderes anfassen.

## 1. Arbeitsweise hineinkopieren (kein Plugin)

Die Befehle, Regeln und Hooks werden **als Dateien kopiert**, nicht als Plugin
eingebunden. Grund: ein Plugin aus einem zweiten Repo wird in den Cloud-Sessions
nicht geladen, wenn nur dieses eine Repo angehaengt ist.

Quelle ist immer das Verzeichnis `.claude/` im Repo `haushirt/casimir-claude`:

```
.claude/settings.json              Hooks: Regeln beim Start, Check vor fertig
.claude/skills/plan/SKILL.md
.claude/skills/tag/SKILL.md
.claude/skills/nacht/SKILL.md
.claude/skills/fix/SKILL.md
.claude/skills/mockup/SKILL.md
.claude/skills/zurueck/SKILL.md
.claude/skills/neu/SKILL.md
.claude/scripts/regeln.sh
.claude/scripts/fertig-check.sh
.claude/scripts/mockup-shot.cjs
```

So kopieren:

```bash
TMP="$(mktemp -d)"
git clone --depth 1 https://github.com/haushirt/casimir-claude "$TMP/cc"
mkdir -p .claude
cp -R "$TMP/cc/.claude/skills" "$TMP/cc/.claude/scripts" .claude/
chmod +x .claude/scripts/*.sh
rm -rf "$TMP"
```

Geht das Klonen nicht (kein Zugang), hole dieselben Dateien einzeln ueber die
GitHub-Werkzeuge aus `haushirt/casimir-claude`, Zweig `main`, und lege sie unter
denselben Pfaden an.

`.claude/settings.json`: gibt es die Datei noch nicht, kopiere sie mit. Gibt es
sie schon, **nur den Schluessel `hooks` ergaenzen** und alles andere stehen
lassen:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/scripts/regeln.sh\"",
            "timeout": 15
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/scripts/fertig-check.sh\"",
            "timeout": 240
          }
        ]
      }
    ]
  }
}
```

Stehen in der vorhandenen `settings.json` noch `extraKnownMarketplaces` oder
`enabledPlugins` mit `c@casimir`, nimm beide heraus - sie werden nicht mehr
gebraucht.

Danach kurz pruefen: die sieben Ordner unter `.claude/skills/` sind da, die drei
Skripte unter `.claude/scripts/` auch, und `bash .claude/scripts/regeln.sh` gibt
Text aus.

## 2. `CLAUDE.md`
Nur **projektspezifisches** Wissen, unter 80 Zeilen. Die Arbeitsweise steht
schon in den kopierten Dateien und gehoert hier NICHT hinein. Geruest:

```markdown
# <Projektname>

## Worum es geht
<ein bis drei Saetze>

## Technik
<Stack, wichtigste Dateien>

## Harte Regeln
1. <was nie passieren darf>

## Sprache
UI-Texte Deutsch. Commits: kurze Beschreibung auf Deutsch.
```

## 3. `STAND.md`
```markdown
# Stand

**Letzte Aktualisierung:** <Datum>

## Wo wir stehen
- <Stichpunkte>

## Was als Naechstes ansteht
- <Stichpunkte>

## Bekannte Baustellen
- <Stichpunkte>
```

## 4. `LEARNINGS.md`
```markdown
# Learnings

<!-- Kurz und datiert. Neueste oben. -->
```

## 5. Abschluss
1 Zeile, dass das Repo eingerichtet ist, plus der Hinweis, dass die Befehle und
die Regeln beim Start erst in einer **neuen** Session greifen.
