---
description: Suivi des actions de formation Owlic — liste les actions, ou montre l'avancement d'une action dans ses 8 étapes. Ouvre un panneau quand Claude Code prend en charge les mods.
argument-hint: "[actionId]"
allowed-tools: Task
---

# /owlic:suivi

This command normally opens the follow-up pane drawn by this plugin's `hooks/` module. You are reading this because the pane is unavailable (a Claude Code version without mod support), so give the same follow-up as text.

## Execute

Invoke the `owlic-training-actions` agent via the `Task` tool, read-only:

- `$ARGUMENTS` empty → list the training actions (`GET /v1/training-actions`): title, status, last update, most recent first.
- `$ARGUMENTS` is an action id → get that action (`GET /v1/training-actions/{id}`) and report each of the 8 workflow steps as done or not, with its key detail: needs analysis, beneficiaries count, program title, session dates, trainer names, pricing total, conventions and pending signatures.

Never call a mutating endpoint from this command. Return the agent's report verbatim.
