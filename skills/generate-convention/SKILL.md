---
name: generate-convention
description: >
  Guides step 8 (convention generation / convention de formation), the
  TERMINAL and most consequential step of the Owlic Qualiopi
  training-action workflow: runs a structured interview collecting the
  convention template, the beneficiaries to include, the title, optional
  custom clauses, and PDF/notification flags; validates every answer
  against the exact POST /v1/training-actions/{actionId}/convention field
  contract (templateId uuid, beneficiaryIds 1-50 uuids drawn from
  beneficiaries already saved on the action, conventionTitle 1-200 chars,
  useCustomClauses + customClauses, generatePdf, sendNotifications,
  optional metadata); and produces a validated JSON draft, strongly
  confirmed before hand-off since the owlic-training-actions agent will
  issue an official document from it. Does not call the Owlic API itself —
  no auth, no curl, no base URL — and does not generate the document.
  INVOKE when the user wants a "convention", "convention de formation", a
  "training agreement" or "training contract", or a "convention PDF". Not
  for beneficiaries, sessions, trainers, pricing, or program assignment,
  and not for actually generating or submitting the convention — that
  belongs to owlic-training-actions.
argument-hint: "[actionId]"
allowed-tools: AskUserQuestion
---

# generate-convention

## Mission

You prepare — never generate or submit — step 8, the TERMINAL and most consequential step of the Owlic Qualiopi workflow: convention generation (convention de formation). Interview the user, validate answers against the exact field contract of `POST /v1/training-actions/{actionId}/convention`, and produce a validated JSON draft. Because this step produces an official document, get a strong explicit confirmation before hand-off. Hand the write off, by name, to `owlic-training-actions` — never call the API yourself, and never generate the document.

## Phase 0 — Preconditions

- Depends on the training action existing AND beneficiaries already saved on it (step 3) — `beneficiaryIds` must reference real, already-saved beneficiaries. This skill cannot create beneficiaries; see `identify-beneficiaries` if none exist yet.
- `$ARGUMENTS`, if given, is the `actionId`; otherwise ask via `AskUserQuestion` ("Yes, I have it" / "Not yet"). Record it if given.
- Confirm with the user that beneficiaries already exist on the action before proceeding; if not, point them to `identify-beneficiaries` first.

## Phase 1 — Interview

Ask these conversationally (not via `AskUserQuestion`):

1. **Template** — "What's the convention template id (uuid) to use?" → `templateId`.
2. **Beneficiaries** — "Which beneficiaries, by id, should this convention cover? Between 1 and 50." → `beneficiaryIds`.
3. **Title** — "What should the convention title be?" (1-200 chars) → `conventionTitle`.
4. **Custom clauses** — "Any custom clauses beyond the standard template?" → `useCustomClauses`. If yes, for each clause: title (1-255), content (1-5000), order (integer ≥0) → `customClauses[]`.
5. **PDF** — "Generate a PDF now?" → `generatePdf`.
6. **Notifications** — "Send notifications to beneficiaries/stakeholders?" → `sendNotifications`.
7. **Metadata** (optional) — "Any extra key/value metadata to attach?" → `metadata`.

## Phase 2 — Structure & validate

Check every answer against this exact contract before proceeding. On any violation, flag it and re-prompt — never fabricate an id or leave a required boolean implicit.

| Field | Type | Constraint | Required |
|---|---|---|---|
| `templateId` | string (uuid) | valid uuid shape | Yes |
| `beneficiaryIds[]` | string (uuid)[] | 1-50 items | Yes |
| `conventionTitle` | string | 1-200 chars | Yes |
| `useCustomClauses` | boolean | — | Yes |
| `customClauses[]` | `CustomClause[]` | relevant when `useCustomClauses: true` | No |
| `customClauses[].title` | string | 1-255 chars | Yes (within entry) |
| `customClauses[].content` | string | 1-5000 chars | Yes (within entry) |
| `customClauses[].order` | integer | ≥0 | Yes (within entry) |
| `generatePdf` | boolean | — | Yes |
| `sendNotifications` | boolean | — | Yes |
| `metadata` | object | — | No |

Validation checklist:

- [ ] `templateId` is a plausible uuid shape (8-4-4-4-12 hex) — flag anything that isn't.
- [ ] `beneficiaryIds` has 1-50 entries, each a uuid the user confirms is already saved on this action — never fabricate one.
- [ ] `conventionTitle` is 1-200 chars.
- [ ] `useCustomClauses`, `generatePdf`, `sendNotifications` are ALL explicitly set — three required booleans, none left implicit.
- [ ] If `useCustomClauses: true`, `customClauses[]` is populated with valid `title`/`content`/`order`; if `false`, `customClauses[]` is omitted or empty.

## Phase 3 — Produce the draft

Emit the JSON payload with field names verbatim:

```json
{
  "templateId": "...",
  "beneficiaryIds": ["..."],
  "conventionTitle": "...",
  "useCustomClauses": false,
  "generatePdf": true,
  "sendNotifications": true
}
```

## Phase 4 — Hand off

This is the most consequential handoff in the family. Before presenting anything, use `AskUserQuestion` with a strongly worded confirmation: "This will generate an official convention de formation document once submitted. Confirm all details are correct?" — options "Yes, generate" / "Let me revise first". Only after an explicit "Yes, generate" present:

1. The validated JSON payload from Phase 3.
2. The target `actionId`.
3. The handoff sentence, verbatim: "Pass this payload to the `owlic-training-actions` agent to POST it to `/v1/training-actions/{actionId}/convention`. This issues the official convention document — `owlic-training-actions`, not this skill, performs that call."

## Hard rules

- NEVER perform the HTTP call or generate any document yourself.
- NEVER invoke `owlic-training-actions` via `Task` — hand off by naming it in the output.
- NEVER fabricate `templateId` or `beneficiaryIds` — every beneficiary id must be one the user confirms already exists on the action.
- ALWAYS get an explicit strong confirmation via `AskUserQuestion` before presenting the final draft — this is the terminal, most consequential step.

## Gotchas

- `beneficiaryIds` must reference beneficiaries ALREADY SAVED on the action (step 3) — this skill has no API access to verify that itself; if the user is unsure, direct them to `owlic-training-actions` to list current beneficiaries, or to `identify-beneficiaries` if none exist yet.
- `useCustomClauses`, `generatePdf`, and `sendNotifications` are all required booleans — none has a safe implicit default here; ask explicitly for each.
- `customClauses[]` is only meaningful when `useCustomClauses: true` — keep it consistent with that flag rather than populating it (or leaving stray entries) when the flag says otherwise.
- This is preparation only, and the most consequential one in the family — generating the convention is an irreversible, official act. If asked to actually submit it, decline and point to `owlic-training-actions`.

## Help

If `$ARGUMENTS` is empty, show this and then start Phase 0:

```
# generate-convention

Guides the Qualiopi convention-generation prep step (terminal, most
consequential): interview, validate, produce a draft JSON payload for
handoff to owlic-training-actions.

Usage: /owlic:generate-convention [actionId]

Example:
  /owlic:generate-convention
  /owlic:generate-convention 4f2b1c9a-...
```
