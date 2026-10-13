---
description: Show Owlic plugin usage — the available commands, domains and examples. Answers directly, without spawning an agent.
argument-hint: "(no arguments — prints usage)"
---

# /owlic:help

Print the help block below verbatim, as your whole reply. No tool call, no agent, nothing added before or after.

```
# Owlic — commands

/owlic:owlic <request>   Do something in Owlic, in plain language; routed to the right specialist
/owlic:suivi [actionId]  Follow-up pane: your training actions, then the 8 workflow steps of one
/owlic:help              This help

Domains behind /owlic:owlic:
- Training Programs (browse/look up the catalog, read-only)
- Training Actions (create + drive the Qualiopi workflow)

Examples:
  /owlic:owlic list the training programs on cybersecurity
  /owlic:owlic create a training action for SIRET 12345678900012 and start the needs analysis
  /owlic:suivi

Not yet covered: trainers directory.
```
