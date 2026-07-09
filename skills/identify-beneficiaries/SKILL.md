---
name: identify-beneficiaries
description: >
  Guides step 3 (beneficiaries / bénéficiaires) of the Owlic Qualiopi
  training-action workflow: first branches B2B (company-sponsored) vs B2C
  (individual) intake, then runs a structured interview collecting each
  beneficiary's identity and, for B2B, their linked company by SIRET;
  validates every answer against the exact
  POST /v1/training-actions/{actionId}/beneficiaries field contract
  (required firstName/lastName/email, companySiret cross-referenced against
  companies[], DESTRUCTIVE replaceExisting flag); and produces a validated
  JSON draft carrying a B2B|B2C marker, ready to hand off to the
  owlic-training-actions agent, which owns the actual API call. Does not
  call the Owlic API itself — no auth, no curl, no base URL. INVOKE when the
  user wants to identify or list "beneficiaries", "bénéficiaires",
  "trainees", "participants", "stagiaires", or answer "who's attending" a
  training action. Not for trainers/formateurs (see invite-trainers),
  sessions, pricing, program assignment, or convention generation, and not
  for actually submitting the payload — those belong to invite-trainers or
  owlic-training-actions.
argument-hint: "[actionId]"
allowed-tools: AskUserQuestion
---

# identify-beneficiaries

## Mission

You prepare — never submit — step 3 of the Owlic Qualiopi workflow: beneficiaries (bénéficiaires). Branch B2B vs B2C, interview the user, validate answers against the exact field contract of `POST /v1/training-actions/{actionId}/beneficiaries`, and produce a validated JSON draft carrying a `B2B|B2C` marker. Hand the write off, by name, to `owlic-training-actions` — never call the API yourself.

## Phase 0 — Preconditions

- Depends only on the training action existing (step 1) — no other step is a prerequisite.
- `$ARGUMENTS`, if given, is the `actionId`; otherwise ask via `AskUserQuestion` ("Yes, I have it" / "Not yet"). Record it if given.
- No `actionId`? Proceed anyway — it's a path parameter, not a body field, so its absence never blocks drafting; it only changes Phase 4's handoff wording.

## Phase 1 — Interview

FIRST, ask via `AskUserQuestion`: "Are these beneficiaries sponsored by a company (B2B), or are they individuals enrolling themselves (B2C)?" — options "B2B (company-sponsored)" / "B2C (individuals)". This branches everything below; record the answer as the `B2B|B2C` marker.

Then, conversationally (not via `AskUserQuestion`):

1. **B2B only — companies** — for each company involved: "What's the company's SIRET, legal name (dénomination sociale), city, and postal code?" → `companies[]` (`siret`, `denominationSociale`, `ville`, `codePostal`).
2. **Beneficiaries** — for each person: first name, last name, email (required); birth date, birth place, phone, specific needs (optional); if B2B, "Which company (by SIRET) are they linked to?" → `companySiret`. B2C beneficiaries skip this entirely.
3. **Destructive replace** — "Should this replace ALL existing beneficiaries on the action, or add to them?" If replace, flag it explicitly as DESTRUCTIVE (wipes every current beneficiary) and get an explicit confirmation via `AskUserQuestion` before setting `replaceExisting: true`.

## Phase 2 — Structure & validate

Check every answer against this exact contract before proceeding. On any violation, flag it and re-prompt the user to edit — never silently truncate, drop, or pass through invalid data.

| Field | Type | Constraint | Required |
|---|---|---|---|
| `companies[]` | `CompanyInput[]` | B2B only | No |
| `companies[].siret` / `.denominationSociale` / `.ville` / `.codePostal` | string | all required if `companies[]` present | Yes (within entry) |
| `beneficiaries[]` | `BeneficiaryInput[]` | 1+ items | Yes |
| `beneficiaries[].firstName` / `.lastName` | string | non-empty | Yes |
| `beneficiaries[].email` | string | valid email shape | Yes |
| `beneficiaries[].birthDate`, `.birthPlace`, `.phone`, `.hasSpecificNeeds`, `.specificNeeds` | mixed | — | No |
| `beneficiaries[].companySiret` | string | must match a `companies[].siret` in this same draft | No (B2B only) |
| `replaceExisting` | boolean | DESTRUCTIVE — wipes existing beneficiaries first | No |

Validation checklist:

- [ ] `B2B|B2C` marker is consistent with the draft: B2C carries no `companies[]` and no beneficiary sets `companySiret`; B2B includes `companies[]` whenever any beneficiary sets `companySiret`.
- [ ] Every `beneficiaries[].companySiret` has a matching `companies[].siret` in the same draft — a mismatch is rejected by the API with 400; flag and fix, never guess or drop the link.
- [ ] `firstName`, `lastName`, `email` present and non-empty for every beneficiary.
- [ ] `replaceExisting: true` only appears after the user's explicit destructive-wipe confirmation from Phase 1.

## Phase 3 — Produce the draft

Emit the JSON payload with field names verbatim, plus the marker as a comment for the handoff (not part of the payload itself):

```json
// B2B example
{
  "beneficiaries": [
    { "firstName": "...", "lastName": "...", "email": "...", "companySiret": "..." }
  ],
  "companies": [
    { "siret": "...", "denominationSociale": "...", "ville": "...", "codePostal": "..." }
  ],
  "replaceExisting": false
}
```

```json
// B2C example — no companies[], no companySiret
{
  "beneficiaries": [
    { "firstName": "...", "lastName": "...", "email": "..." }
  ]
}
```

## Phase 4 — Hand off

Confirm readiness via `AskUserQuestion` ("Hand off now" / "Let me revise an answer first"), then present:

1. The `B2B|B2C` marker.
2. The validated JSON payload from Phase 3.
3. The target `actionId` — or, if unknown, a note that `owlic-training-actions` must create the training action first before submitting this payload.
4. The handoff sentence, verbatim: "Pass this payload to the `owlic-training-actions` agent to POST it to `/v1/training-actions/{actionId}/beneficiaries`." Never call the endpoint yourself.

## Hard rules

- NEVER perform the HTTP call, touch API keys/auth, or build curl/base-URL logic — exclusively `owlic-training-actions`'s job.
- NEVER invoke `owlic-training-actions` via `Task` — hand off by naming it in the output.
- NEVER set `replaceExisting: true` without the user's explicit confirmation of the destructive wipe.
- NEVER let a beneficiary's `companySiret` reference a company absent from `companies[]` — flag and fix before drafting further.
- ALWAYS use the exact contract field names (`beneficiaries`, `companies`, `companySiret`, `replaceExisting`, etc.).

## Gotchas

- Linking a beneficiary to a company is by SIRET, not array order — the same SIRET must appear in both `companies[].siret` and the beneficiary's `companySiret`.
- `replaceExisting: true` wipes ALL current beneficiaries of the action before saving the new ones; companies are matched (never duplicated) by SIRET regardless.
- A B2C draft must omit `companies[]` entirely and must never set `companySiret` on any beneficiary — don't send an empty `companies[]` array either, just leave the key out.
- This is preparation only — if asked to actually submit the payload, create the action, or touch trainers/sessions/pricing/program/convention, decline and point to the owning skill or to `owlic-training-actions`, which owns the full 8-step workflow end-to-end.

## Help

If `$ARGUMENTS` is empty, show this and then start Phase 0:

```
# identify-beneficiaries

Guides the Qualiopi beneficiaries (bénéficiaires) prep step: branches
B2B/B2C, interviews, validates, produces a draft JSON payload for handoff
to owlic-training-actions.

Usage: /owlic:identify-beneficiaries [actionId]

Example:
  /owlic:identify-beneficiaries
  /owlic:identify-beneficiaries 4f2b1c9a-...
```
