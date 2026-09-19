#!/usr/bin/env bash
# Check vor "fertig": laesst Lint/Typecheck/Tests des Projekts laufen, bevor
# Claude eine Aufgabe als erledigt meldet. Blockt hoechstens EINMAL je Anfrage,
# danach laesst der Hook durch - keine Endlosschleife.
set -u

INPUT="$(cat 2>/dev/null || true)"
have_jq() { command -v jq >/dev/null 2>&1; }
feld() { have_jq && printf '%s' "$INPUT" | jq -r "$1 // empty" 2>/dev/null || true; }

durch() { exit 0; }

# 1. Laeuft bereits eine Blockade? Dann nicht noch einmal.
[ "$(feld '.stop_hook_active')" = "true" ] && durch

SESSION="$(feld '.session_id')"; PROMPT="$(feld '.prompt_id')"
CWD="$(feld '.cwd')"; [ -n "$CWD" ] || CWD="$PWD"
cd "$CWD" 2>/dev/null || durch

# 2. Marke: je Anfrage hoechstens eine Blockade.
MARKE="${TMPDIR:-/tmp}/c-fertig-${SESSION:-x}-${PROMPT:-x}"
[ -f "$MARKE" ] && durch

# 3. Projektwurzel suchen (naechste package.json nach oben).
WURZEL=""
D="$PWD"
for _ in 1 2 3 4 5 6; do
  [ -f "$D/package.json" ] && { WURZEL="$D"; break; }
  [ "$D" = "/" ] && break
  D="$(dirname "$D")"
done
[ -n "$WURZEL" ] || durch
cd "$WURZEL" || durch

# 4. Gibt es ueberhaupt etwas zu pruefen? Reine Fragen sollen nichts ausloesen.
GEAENDERT=0
if git rev-parse --git-dir >/dev/null 2>&1; then
  [ -n "$(git status --porcelain 2>/dev/null)" ] && GEAENDERT=1
  if [ "$GEAENDERT" = "0" ]; then
    UP="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
    [ -n "$UP" ] && [ -n "$(git log --oneline "$UP..HEAD" 2>/dev/null)" ] && GEAENDERT=1
  fi
else
  GEAENDERT=1
fi
[ "$GEAENDERT" = "1" ] || durch

# 5. Welche npm-Skripte laufen? Ueberschreibbar mit C_CHECK_SCRIPTS.
SKRIPTE="${C_CHECK_SCRIPTS:-lint typecheck test}"
have_jq || durch

AUSGABE=""; ROT=""
for S in $SKRIPTE; do
  printf '%s' "$(cat package.json)" | jq -e --arg s "$S" '.scripts[$s] // empty' >/dev/null 2>&1 || continue
  LOG="$(timeout 200 npm run --silent "$S" 2>&1)" && continue
  ROT="$ROT $S"
  AUSGABE="$AUSGABE
--- npm run $S ---
$(printf '%s' "$LOG" | tail -n 25)"
done

[ -n "$ROT" ] || durch

: > "$MARKE"
GRUND="Check vor fertig ist ROT:$ROT. Melde noch nicht fertig. Behebe die Fehler und pruefe erneut. Ausgabe (gekuerzt):$AUSGABE"

jq -n --arg g "$GRUND" --arg k "Check vor fertig: rot ->$ROT" '{
  decision: "block",
  reason: $g,
  hookSpecificOutput: {
    hookEventName: "Stop",
    permissionDecision: "deny",
    permissionDecisionReason: $g,
    systemMessage: $k
  }
}'
exit 0
