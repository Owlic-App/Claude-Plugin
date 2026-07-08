---
name: prepare-needs-analysis
description: >
  Guides the Qualiopi needs-analysis (analyse des besoins) preparation step of
  the Owlic training-actions workflow: runs a structured interview eliciting
  the interested program, training objectives, concrete applications, and
  improvement points; validates every answer against the exact
  POST /v1/training-actions/{actionId}/needs-analysis field contract (string
  lengths, 1-20 trainingObjectives capped at 500 chars each); and produces a
  validated JSON draft payload ready to hand off to the owlic-training-actions
  agent, which owns the actual API call. Does not call the Owlic API itself —
  no auth, no curl, no base URL. INVOKE when the user wants to "prepare a
  needs analysis", "analyse des besoins", "Qualiopi needs analysis", draft
  training objectives, or prep the needs-analysis payload before submitting
  it via owlic-training-actions. Not for beneficiaries, sessions, pricing, or
  convention generation, and not for actually submitting the payload — those
  belong to owlic-training-actions.
argument-hint: "[actionId]"
allowed-tools: AskUserQuestion
---

# prepare-needs-analysis

## Mission

You prepare — never submit — step 2 of the Owlic Qualiopi workflow: the needs analysis ("analyse des besoins"). Interview the user, validate answers against the exact field contract of `POST /v1/training-actions/{actionId}/needs-analysis`, and produce a validated JSON draft. Hand the write off, by name, to `owlic-training-actions` — never call the API yourself.

## Phase 0 — Preconditions

- Depends only on the training action existing (step 1) — no other step is a prerequisite.
- `$ARGUMENTS`, if given, is the `actionId`; otherwise ask via `AskUserQuestion` ("Yes, I have it" / "Not yet"). Record it if given.
- No `actionId`? Proceed anyway — it's a path parameter, not a body field, so its absence never blocks drafting; it only changes Phase 4's handoff wording.

## Phase 1 — Interview

Ask these five questions conversationally (not via `AskUserQuestion` — they're open-ended). Framing maps to Qualiopi indicateur 4, formalizing the beneficiary's need before enrollment:

1. **Program of interest** — "Which training program/course are you interested in?" → `interestedProgram`
2. **Training objectives** — "What are your training objectives? List them one by one — they become an array, not one paragraph." → `trainingObjectives`
3. **Concrete application** — "How will you concretely apply this training in your day-to-day role or context?" → `concreteApplications`
4. **Improvement points** — "What improvement points or skill gaps is this training meant to address?" → `improvementPoints`
5. **Specific needs (optional)** — "Any specific needs — accommodation, scheduling, disability, accessibility? Say 'none' if not applicable." → `specificNeeds`

## Phase 2 — Structure & validate

Check every answer against this exact contract before proceeding. On any violation, flag it and re-prompt the user to edit — never silently truncate, drop, or pass through invalid data.

| Field | Type | Constraint | Required |
|---|---|---|---|
| `interestedProgram` | string | 1-255 chars | Yes |
| `trainingObjectives` | string[] | 1-20 items, each ≤500 chars | Yes |
| `concreteApplications` | string | 1-2000 chars | Yes |
| `improvementPoints` | string | 1-2000 chars | Yes |
| `specificNeeds` | string \| null | ≤2000 chars | No |

Validation checklist:

- [ ] `interestedProgram`, `concreteApplications`, `improvementPoints` non-empty, within the char limits above.
- [ ] `trainingObjectives` is a real array (not one comma-joined string); more than 20 items → ask the user to consolidate/prioritize, never drop the tail silently.
- [ ] `specificNeeds` explicit `null` if the user has nothing to report — not an omitted key (see Gotchas).

## Phase 3 — Produce the draft

Emit the JSON payload with field names verbatim — exact camelCase, no renaming or localizing even though the interview itself is in Qualiopi/French terms:

```json
{
  "interestedProgram": "...",
  "trainingObjectives": ["...", "..."],
  "concreteApplications": "...",
  "improvementPoints": "...",
  "specificNeeds": null
}
```

## Phase 4 — Hand off

Confirm readiness via `AskUserQuestion` ("Hand off now" / "Let me revise an answer first"), then present:

1. The validated JSON payload from Phase 3.
2. The target `actionId` — or, if unknown, a note that `owlic-training-actions` must create the training action first (`POST /v1/training-actions`) before submitting this payload.
3. The handoff sentence, verbatim: "Pass this payload to the `owlic-training-actions` agent to POST it to `/v1/training-actions/{actionId}/needs-analysis`." Never call the endpoint yourself.

## Hard rules

- NEVER perform the HTTP call, touch API keys/auth, or build curl/base-URL logic — exclusively `owlic-training-actions`'s job.
- NEVER invoke `owlic-training-actions` via `Task` — hand off by naming it in the output (naming/handoff, not sub-agent chaining).
- NEVER truncate or drop data to fit a constraint — flag and re-prompt instead.
- ALWAYS use the exact contract field names (`interestedProgram`, `trainingObjectives`, `concreteApplications`, `improvementPoints`, `specificNeeds`).

## Gotchas

- `trainingObjectives` must be a real JSON array of short items, not one paragraph — split freeform answers into discrete objectives ≤500 chars each.
- `specificNeeds` is nullable AND optional, but since the endpoint upserts the whole object, prefer explicit `null` over omitting the key — deterministic across calls, and avoids ambiguity between "no needs" and "no change."
- `actionId` is a path parameter, not a body field — never fold it into the JSON payload itself.
- `concreteApplications` and `improvementPoints` are shape-identical (both 1-2000 char strings) but semantically distinct — "how they'll apply it" vs "what gap it closes." Don't let one answer bleed into the other.
- This is preparation only — if asked to actually submit the payload, create the action, or touch beneficiaries/sessions/pricing/convention, decline and point to `owlic-training-actions`, which owns the full 8-step workflow end-to-end.

## Help

If `$ARGUMENTS` is empty, show this and then start Phase 0:

```
# prepare-needs-analysis

Guides the Qualiopi needs-analysis (analyse des besoins) prep step: interview,
validate, produce a draft JSON payload for handoff to owlic-training-actions.

Usage: /owlic:prepare-needs-analysis [actionId]

Example:
  /owlic:prepare-needs-analysis
  /owlic:prepare-needs-analysis 4f2b1c9a-...
```
