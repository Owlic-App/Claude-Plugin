---
name: schedule-sessions
description: >
  Guides step 5 (session planning / planning des séances) of the Owlic
  Qualiopi training-action workflow: runs a structured interview collecting
  one or more session dates, delivery mode, and morning/afternoon time
  slots; validates every answer against the exact
  POST /v1/training-actions/{actionId}/sessions field contract (date,
  trainingType enum presentiel|distance|hybride, morning+afternoon TimeSlot
  objects with all three fields required even when unused, optional
  address); and produces a validated JSON draft ready to hand off to the
  owlic-training-actions agent, which owns the actual API call. Does not
  call the Owlic API itself — no auth, no curl, no base URL. INVOKE when
  the user wants to schedule or plan sessions, set "session dates",
  "planning des séances", choose "présentiel/distanciel/hybride" delivery,
  or define "morning/afternoon" time slots. Not for trainers, beneficiaries,
  pricing, program assignment, or convention generation, and not for
  actually submitting the payload — those belong to owlic-training-actions.
argument-hint: "[actionId]"
allowed-tools: AskUserQuestion
---

# schedule-sessions

## Mission

You prepare — never submit — step 5 of the Owlic Qualiopi workflow: session planning (planning des séances). Interview the user, validate answers against the exact field contract of `POST /v1/training-actions/{actionId}/sessions`, and produce a validated JSON draft. Hand the write off, by name, to `owlic-training-actions` — never call the API yourself.

## Phase 0 — Preconditions

- Depends only on the training action existing (step 1) — no other step is a prerequisite.
- `$ARGUMENTS`, if given, is the `actionId`; otherwise ask via `AskUserQuestion` ("Yes, I have it" / "Not yet"). Record it if given.
- No `actionId`? Proceed anyway — it's a path parameter, not a body field; it only changes Phase 4's handoff wording.

## Phase 1 — Interview

For each session (loop conversationally until the user says they're done):

1. **Date** — "What date is this session?" (e.g. `"2026-07-01"`) → `date`.
2. **Delivery mode** — "présentiel, distance, or hybride?" → `trainingType`.
3. **Morning slot** — "Is there a morning session? If so, start and end time (e.g. `09:00`/`12:30`)." If unused, still record `enabled: false` plus placeholder `startTime`/`endTime` (e.g. `"00:00"`) — never drop the object.
4. **Afternoon slot** — same pattern → `afternoon`.
5. **Address** (optional) — "Where does this take place?" Typically only meaningful for présentiel/hybride.

## Phase 2 — Structure & validate

Check every answer against this exact contract before proceeding. On any violation, flag it and re-prompt — never silently drop or reinterpret a value.

| Field | Type | Constraint | Required |
|---|---|---|---|
| `sessions[]` | `SessionInput[]` | 1+ items | Yes |
| `sessions[].date` | string | e.g. `"2026-07-01"` | Yes |
| `sessions[].trainingType` | enum | `presentiel`\|`distance`\|`hybride` | Yes |
| `sessions[].morning` / `.afternoon` | `TimeSlot` | `enabled`, `startTime`, `endTime` — all three required | Yes |
| `sessions[].address` | string | — | No |

Validation checklist:

- [ ] Every session has `date`, `trainingType`, `morning`, `afternoon`.
- [ ] `morning`/`afternoon` each carry `enabled`, `startTime`, `endTime` — never a partial `TimeSlot`, even when `enabled: false`.
- [ ] `trainingType` is exactly one of the three literal enum values — flag and correct any synonym or accented variant (e.g. "hybrid" → `hybride`).

## Phase 3 — Produce the draft

Emit the JSON payload with field names verbatim:

```json
{
  "sessions": [
    {
      "date": "2026-07-01",
      "trainingType": "presentiel",
      "morning": { "enabled": true, "startTime": "09:00", "endTime": "12:30" },
      "afternoon": { "enabled": false, "startTime": "00:00", "endTime": "00:00" },
      "address": "..."
    }
  ]
}
```

## Phase 4 — Hand off

Confirm readiness via `AskUserQuestion` ("Hand off now" / "Let me revise an answer first"), then present:

1. The validated JSON payload from Phase 3.
2. The target `actionId` — or, if unknown, a note that `owlic-training-actions` must create the training action first.
3. The handoff sentence, verbatim: "Pass this payload to the `owlic-training-actions` agent to POST it to `/v1/training-actions/{actionId}/sessions`." Never call the endpoint yourself.

## Hard rules

- NEVER perform the HTTP call, touch API keys/auth, or build curl/base-URL logic — exclusively `owlic-training-actions`'s job.
- NEVER invoke `owlic-training-actions` via `Task` — hand off by naming it in the output.
- NEVER omit `startTime`/`endTime` on a disabled `TimeSlot` — all three fields are required regardless of `enabled`.
- ALWAYS use the exact enum values (`presentiel`|`distance`|`hybride`) — never a synonym or translation.

## Gotchas

- `TimeSlot`'s `enabled`/`startTime`/`endTime` trio is required even for a slot the user isn't using — set `enabled: false` and still supply placeholder times, never drop the object.
- `trainingType` only accepts the three literal enum strings — no accents, no synonyms, no English translations.
- `address` is optional and typically only meaningful for présentiel/hybride sessions — fine to leave unset for a fully distance session.
- This is preparation only — if asked to actually submit the payload, create the action, or touch beneficiaries/trainers/pricing/program/convention, decline and point to the owning skill or to `owlic-training-actions`.

## Help

If `$ARGUMENTS` is empty, show this and then start Phase 0:

```
# schedule-sessions

Guides the Qualiopi session-planning prep step: interview, validate,
produce a draft JSON payload for handoff to owlic-training-actions.

Usage: /owlic:schedule-sessions [actionId]

Example:
  /owlic:schedule-sessions
  /owlic:schedule-sessions 4f2b1c9a-...
```
