---
name: define-pricing
description: >
  Guides step 7 (pricing / tarification) of the Owlic Qualiopi
  training-action workflow: runs a structured interview collecting training
  expenses (label, type, amount) plus optional totals and program-price
  overrides; validates every answer against the exact
  POST /v1/training-actions/{actionId}/pricing field contract
  (pricingData.expenses[] required with at least one type:"training" entry,
  optional totalAmount nested under pricingData, optional top-level
  trainingProgramPrice/trainingProgramTitle); and produces a validated JSON
  draft ready to hand off to the owlic-training-actions agent, which owns
  the actual API call. Does not call the Owlic API itself — no auth, no
  curl, no base URL. INVOKE when the user wants to set "pricing", "tarif",
  "tarification", list "training expenses", define a "budget" or "cost", or
  set the "prix de la formation". Not for beneficiaries, sessions,
  trainers, program assignment, or convention generation, and not for
  actually submitting the payload — those belong to owlic-training-actions.
argument-hint: "[actionId]"
allowed-tools: AskUserQuestion
---

# define-pricing

## Mission

You prepare — never submit — step 7 of the Owlic Qualiopi workflow: pricing (tarification). Interview the user, validate answers against the exact field contract of `POST /v1/training-actions/{actionId}/pricing`, and produce a validated JSON draft. Hand the write off, by name, to `owlic-training-actions` — never call the API yourself.

## Phase 0 — Preconditions

- Depends only on the training action existing (step 1) — no other step is a prerequisite.
- `$ARGUMENTS`, if given, is the `actionId`; otherwise ask via `AskUserQuestion` ("Yes, I have it" / "Not yet"). Record it if given.
- No `actionId`? Proceed anyway — it's a path parameter, not a body field; it only changes Phase 4's handoff wording.

## Phase 1 — Interview

Ask these conversationally (not via `AskUserQuestion`):

1. **Expenses** — for each expense (loop until the user is done): "Label, type (training/travel/accommodation/meal/other), and amount?" → `pricingData.expenses[]`. Remind the user at least one expense must be `type: "training"`.
2. **Total amount** (optional) — "Do you want to state an explicit overall total, or leave it derived?" → `pricingData.totalAmount`.
3. **Program price override** (optional) — "Any specific price for the training program on this action?" → `trainingProgramPrice`.
4. **Program title** (optional) — "A title to display for the program on pricing documents?" → `trainingProgramTitle`.

## Phase 2 — Structure & validate

Check every answer against this exact contract before proceeding. On any violation, flag it and re-prompt — never silently drop an expense or clamp a negative amount to zero.

| Field | Type | Constraint | Required |
|---|---|---|---|
| `pricingData.expenses[]` | `Expense[]` | 1+ items, ≥1 with `type:"training"` | Yes |
| `pricingData.expenses[].label` | string | non-empty | Yes |
| `pricingData.expenses[].type` | enum | `training`\|`travel`\|`accommodation`\|`meal`\|`other` | Yes |
| `pricingData.expenses[].amount` | number | ≥0 | Yes |
| `pricingData.totalAmount` | number | nested under `pricingData` | No |
| `trainingProgramPrice` | number | top-level, sibling of `pricingData` | No |
| `trainingProgramTitle` | string | top-level, sibling of `pricingData` | No |

Validation checklist:

- [ ] `expenses[]` has at least one entry with `type: "training"` — this cross-field rule is hard; if missing, flag it and ask the user to add one before drafting further.
- [ ] Every expense has `label`, a valid `type`, and `amount` ≥ 0.
- [ ] `totalAmount` is nested INSIDE `pricingData`; `trainingProgramPrice`/`trainingProgramTitle` sit at the TOP LEVEL, siblings of `pricingData` — don't misplace them.

## Phase 3 — Produce the draft

Emit the JSON payload with field names verbatim:

```json
{
  "pricingData": {
    "expenses": [
      { "label": "...", "type": "training", "amount": 0 }
    ],
    "totalAmount": 0
  },
  "trainingProgramPrice": 0,
  "trainingProgramTitle": "..."
}
```

## Phase 4 — Hand off

Confirm readiness via `AskUserQuestion` ("Hand off now" / "Let me revise an answer first"), then present:

1. The validated JSON payload from Phase 3.
2. The target `actionId` — or, if unknown, a note that `owlic-training-actions` must create the training action first.
3. The handoff sentence, verbatim: "Pass this payload to the `owlic-training-actions` agent to POST it to `/v1/training-actions/{actionId}/pricing`." Never call the endpoint yourself.

## Hard rules

- NEVER perform the HTTP call, touch API keys/auth, or build curl/base-URL logic — exclusively `owlic-training-actions`'s job.
- NEVER invoke `owlic-training-actions` via `Task` — hand off by naming it in the output.
- NEVER draft `expenses[]` without at least one `type: "training"` entry — flag and re-prompt instead of drafting an incomplete payload.
- ALWAYS nest `totalAmount` under `pricingData`, and keep `trainingProgramPrice`/`trainingProgramTitle` at the top level.

## Gotchas

- The "at least one training-type expense" rule is enforced by this skill client-side (the API also rejects its absence) — don't let the user skip it.
- `totalAmount` lives inside `pricingData`; `trainingProgramPrice`/`trainingProgramTitle` are top-level siblings of `pricingData`, not nested inside it — a common misplacement worth double-checking before hand-off.
- `amount` must be ≥ 0 — flag a negative value and ask the user to correct it, never silently take the absolute value.
- This is preparation only — if asked to actually submit the payload, create the action, or touch beneficiaries/sessions/trainers/program/convention, decline and point to the owning skill or to `owlic-training-actions`.

## Help

If `$ARGUMENTS` is empty, show this and then start Phase 0:

```
# define-pricing

Guides the Qualiopi pricing (tarification) prep step: interview, validate,
produce a draft JSON payload for handoff to owlic-training-actions.

Usage: /owlic:define-pricing [actionId]

Example:
  /owlic:define-pricing
  /owlic:define-pricing 4f2b1c9a-...
```
