#!/usr/bin/env bash
# SessionStart-Hook: sorgt dafür, dass das Plugin "c" aus der Marketplace
# "casimir" (haushirt/casimir-claude) vorhanden ist.
#
# Grund: In Claude Code auf dem Web startet jede Sitzung in einem frischen
# Container mit leerem ~/.claude. Der Eintrag "extraKnownMarketplaces" in
# .claude/settings.json wird dort NICHT ausgewertet – gelesen wird nur die
# Benutzerebene (~/.claude/settings.json). Die Marketplace bleibt damit
# unregistriert und "enabledPlugins: c@casimir" wird als verwaister Eintrag
# übersprungen ("marketplace not registered").
#
# Dieser Hook registriert die Quelle und installiert das Plugin. Er schreibt
# die Marketplace dabei in die Benutzerebene. Plugins werden vor den Hooks
# geladen, die /c:-Befehle stehen also ab der nächsten Sitzung bereit.
#
# Idempotent, ohne Rückfragen, schlägt nie fehl.
set -u

command -v claude >/dev/null 2>&1 || exit 0

if claude plugin list 2>/dev/null | grep -q 'c@casimir'; then
  exit 0
fi

timeout 120 claude plugin marketplace add haushirt/casimir-claude >/dev/null 2>&1
timeout 120 claude plugin install c@casimir >/dev/null 2>&1

exit 0
