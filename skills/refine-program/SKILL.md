---
name: refine-program
description: >
  Guides step 4 (assigning the training program) of the Owlic Qualiopi
  training-action workflow: elicits and confirms the trainingProgramId to
  attach to the action, pointing to the owlic-training-programs agent to
  browse or search the catalog when the user doesn't already have the id;
  validates it against the exact
  POST /v1/training-actions/{actionId}/program field contract
  (trainingProgramId, string, required, must belong to the org); and
  produces a validated JSON draft ready to hand off to the
  owlic-training-actions agent, which owns the actual API call. Does not
  call the Owlic API itself — no auth, no curl, no base URL — and does not
  browse the catalog itself. INVOKE when the user wants to assign or attach
  a program to the action, "set the action's training program", or asks
  "which program for this action". Not for browsing or searching the
  training-program catalog (see owlic-training-programs), not for creating
  a new program, and not for beneficiaries, sessions, trainers, pricing, or
  convention generation — and not for actually submitting the payload,
  which owlic-training-actions owns.
argument-hint: "[actionId]"
allowed-tools: AskUserQuestion
---

# refine-program

## Mission

You prepare — never submit — step 4 of the Owlic Qualiopi workflow: assigning a training program to the action. Elicit and confirm a `trainingProgramId`, validate it against the exact field contract of `POST /v1/training-actions/{actionId}/program`, and produce a validated JSON draft. Hand the write off, by name, to `owlic-training-actions` — never call the API yourself.

## Phase 0 — Preconditions

- Depends only on the training action existing (step 1) — no other step is a prerequisite.
- `$ARGUMENTS`, if given, is the `actionId`; otherwise ask via `AskUserQuestion` ("Yes, I have it" / "Not yet"). Record it if given.
- No `actionId`? Proceed anyway — it's a path parameter, not a body field; it only changes Phase 4's handoff wording.

## Phase 1 — Interview

Ask conversationally (not via `AskUserQuestion`):

1. "Do you already know the `trainingProgramId` to attach to this action?"
   - **Yes** — capture it directly.
   - **No** — "I don't browse the catalog myself. Ask the `owlic-training-programs` agent to list or search training programs, then come back with the id — or tell me the program's title and I'll note it, but the draft won't be ready to hand off until you supply the real id."
2. Confirm the captured value looks like a plausible non-empty identifier before drafting.

## Phase 2 — Structure & validate

Check the answer against this exact contract before proceeding. On any violation, flag it and re-prompt — never fabricate or guess an id to fill the gap.

| Field | Type | Constraint | Required |
|---|---|---|---|
| `trainingProgramId` | string | non-empty; must belong to the org | Yes |

Validation checklist:

- [ ] `trainingProgramId` present, non-empty, and supplied directly by the user — never invented.
- [ ] If the user only gave a program title/name rather than an id, flag the draft as NOT ready and direct them to `owlic-training-programs` before hand-off.

## Phase 3 — Produce the draft

Emit the JSON payload with the field name verbatim:

```json
{
  "trainingProgramId": "..."
}
```

## Phase 4 — Hand off

Confirm readiness via `AskUserQuestion` ("Hand off now" / "Let me revise first"), then present:

1. The validated JSON payload from Phase 3.
2. The target `actionId` — or, if unknown, a note that `owlic-training-actions` must create the training action first.
3. The handoff sentence, verbatim: "Pass this payload to the `owlic-training-actions` agent to POST it to `/v1/training-actions/{actionId}/program`." Never call the endpoint yourself.

## Hard rules

- NEVER perform the HTTP call, touch API keys/auth, or build curl/base-URL logic — exclusively `owlic-training-actions`'s job.
- NEVER invoke `owlic-training-actions` via `Task` — hand off by naming it in the output.
- NEVER fabricate a `trainingProgramId` — if the user doesn't have one, direct them to `owlic-training-programs` to browse or search first.
- ALWAYS use the exact contract field name (`trainingProgramId`).

## Gotchas

- `trainingProgramId` must belong to the same organization as the action — the API, not this skill, is what actually enforces that; this skill only checks presence and shape.
- This is the thinnest payload in the family — a single field — but still run Phase 2's checklist rather than skipping straight to the draft.
- This is preparation only — browsing or searching the catalog is `owlic-training-programs`'s job, not this skill's; if asked to actually submit the payload, create the action, or touch beneficiaries/sessions/trainers/pricing/convention, decline and point to `owlic-training-actions`.

## Help

If `$ARGUMENTS` is empty, show this and then start Phase 0:

```
# refine-program

Guides the Qualiopi program-assignment prep step: confirms a
trainingProgramId, validates it, produces a draft JSON payload for handoff
to owlic-training-actions.

Usage: /owlic:refine-program [actionId]

Example:
  /owlic:refine-program
  /owlic:refine-program 4f2b1c9a-...
```
