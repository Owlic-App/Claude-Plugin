---
name: invite-trainers
description: >
  Guides step 6 (trainer assignment / formateurs / intervenants) of the
  Owlic Qualiopi training-action workflow: runs a structured interview
  collecting the full trainer roster (internal or external, up to 100) plus
  invitation settings; validates every answer against the exact
  POST /v1/training-actions/{actionId}/trainers field contract (required
  firstName/lastName/type, optional id/email/specialties/certifications,
  sendInvitationEmails default false, responseDeadlineDays default 7);
  flags the call as an ATOMIC REPLACE — not additive — so an existing
  roster must be fetched and resent in full to add one trainer; and
  produces a validated JSON draft ready to hand off to the
  owlic-training-actions agent, which owns the actual API call. Does not
  call the Owlic API itself — no auth, no curl, no base URL. INVOKE when
  the user wants to invite or assign trainers, "formateurs", "intervenants",
  or set up internal/external trainers. Not for beneficiaries (see
  identify-beneficiaries) or a standalone trainer directory (no agent owns
  that yet), and not for actually submitting the payload — those belong to
  owlic-training-actions.
argument-hint: "[actionId]"
allowed-tools: AskUserQuestion
---

# invite-trainers

## Mission

You prepare — never submit — step 6 of the Owlic Qualiopi workflow: trainer assignment (formateurs / intervenants). Interview the user, validate answers against the exact field contract of `POST /v1/training-actions/{actionId}/trainers`, and produce a validated JSON draft. Hand the write off, by name, to `owlic-training-actions` — never call the API yourself.

## Phase 0 — Preconditions

- Depends only on the training action existing (step 1) — no other step is a prerequisite.
- `$ARGUMENTS`, if given, is the `actionId`; otherwise ask via `AskUserQuestion` ("Yes, I have it" / "Not yet"). Record it if given.
- GOTCHA upfront: this call is an **ATOMIC REPLACE**, not additive. Ask the user directly: "Is this the full/fresh trainer roster, or are you adding to trainers already assigned?" If adding, the draft must include the existing trainers too — direct the user to have `owlic-training-actions` fetch the current roster first if they don't already have it.

## Phase 1 — Interview

For each trainer (loop conversationally until the user says they're done, cap at 100):

1. **firstName**, **lastName** (required).
2. **type** — "internal or external?" (required).
3. **id** (optional) — "If this trainer already exists in Owlic and you want to reuse them instead of creating a duplicate, do you have their id?"
4. **email**, **specialties**, **certifications** (all optional).

Then invitation settings:

5. **sendInvitationEmails** — "Send invitation emails now?" (default false if unanswered).
6. **responseDeadlineDays** — "Response deadline, in days?" (default 7 if unanswered).

## Phase 2 — Structure & validate

Check every answer against this exact contract before proceeding. On any violation, flag it and re-prompt — never silently drop an entry to fit the cap.

| Field | Type | Constraint | Required |
|---|---|---|---|
| `trainers[]` | `TrainerInput[]` | max 100 items | Yes |
| `trainers[].firstName` / `.lastName` | string | non-empty | Yes |
| `trainers[].type` | enum | `internal`\|`external` | Yes |
| `trainers[].id`, `.email`, `.specialties`, `.certifications` | mixed | — | No |
| `sendInvitationEmails` | boolean | default false | No |
| `responseDeadlineDays` | integer | default 7 | No |

Validation checklist:

- [ ] Every trainer has `firstName`, `lastName`, and a valid `type`.
- [ ] `trainers[]` has at most 100 entries — if more, ask the user to split or prioritize, never silently truncate the tail.
- [ ] If this draft is meant to ADD to an existing roster, confirm it actually includes the pre-existing trainers too, not just the new ones — restate that this call replaces the whole list.

## Phase 3 — Produce the draft

Emit the JSON payload with field names verbatim:

```json
{
  "trainers": [
    { "firstName": "...", "lastName": "...", "type": "internal" }
  ],
  "sendInvitationEmails": false,
  "responseDeadlineDays": 7
}
```

## Phase 4 — Hand off

Confirm readiness via `AskUserQuestion` ("Hand off now" / "Let me revise an answer first"), then present:

1. The validated JSON payload from Phase 3.
2. The target `actionId` — or, if unknown, a note that `owlic-training-actions` must create the training action first.
3. A restated reminder if this is an addition: "This draft includes N pre-existing trainers plus the new ones — confirm nothing was missed, since the call replaces the whole roster."
4. The handoff sentence, verbatim: "Pass this payload to the `owlic-training-actions` agent to POST it to `/v1/training-actions/{actionId}/trainers`." Never call the endpoint yourself.

## Hard rules

- NEVER perform the HTTP call, touch API keys/auth, or build curl/base-URL logic — exclusively `owlic-training-actions`'s job.
- NEVER invoke `owlic-training-actions` via `Task` — hand off by naming it in the output.
- NEVER assume this call is additive — always confirm whether the draft should include previously-assigned trainers.
- ALWAYS cap `trainers[]` at 100; never silently drop the tail.

## Gotchas

- ATOMIC REPLACE: sending this payload replaces the ENTIRE trainer list — any existing trainer not included in `trainers[]` is silently dropped. To add one trainer to 5 already assigned, this draft must contain all 6.
- `id` is optional and only for reusing an EXISTING trainer record — omit it to create a new trainer inline.
- `sendInvitationEmails` defaults to false — the API will not email trainers unless it's explicitly set true.
- This is preparation only — beneficiaries have their own skill (`identify-beneficiaries`); no agent yet owns a standalone trainer directory beyond what this call itself accepts inline — say so rather than guessing at endpoints that don't exist in scope.

## Help

If `$ARGUMENTS` is empty, show this and then start Phase 0:

```
# invite-trainers

Guides the Qualiopi trainer-assignment prep step: interview, validate
(atomic-replace aware), produce a draft JSON payload for handoff to
owlic-training-actions.

Usage: /owlic:invite-trainers [actionId]

Example:
  /owlic:invite-trainers
  /owlic:invite-trainers 4f2b1c9a-...
```
