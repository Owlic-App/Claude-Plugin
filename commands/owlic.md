---
description: Front door for the Owlic domain-agent family. Classifies the request and delegates to the matching specialist (training programs catalogue, training actions / Qualiopi workflow, and more domains as they ship). Delegates entirely to the owlic-router agent.
argument-hint: "<what you want to do in Owlic> (empty or 'help' for usage)"
allowed-tools: Task
---

# /owlic:owlic

Invoke the `owlic-router` agent via the `Task` tool, passing `$ARGUMENTS` verbatim.

Do **not** re-implement any classification or routing logic here — that lives entirely in `owlic-router`. This command is a single-line launcher.

## Execute

```
Task(subagent_type="owlic-router", prompt=$ARGUMENTS)
```

When `$ARGUMENTS` is empty or `help`, the agent returns usage help listing the available Owlic domains instead of delegating further.

Return the agent's report verbatim.
