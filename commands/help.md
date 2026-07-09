---
description: Show Owlic plugin usage — the available domains and example commands. Thin launcher that asks the owlic-router agent for its help output, the single source of truth for what the plugin can do.
argument-hint: "(no arguments — prints usage)"
allowed-tools: Task
---

# /owlic:help

Invoke the `owlic-router` agent via the `Task` tool to print the Owlic usage help.

Do **not** inline or duplicate the help text here — it lives in `owlic-router` (the single source of truth for the available domains). This command is a thin launcher.

## Execute

```
Task(subagent_type="owlic-router", prompt="help")
```

Return the agent's help output verbatim.
