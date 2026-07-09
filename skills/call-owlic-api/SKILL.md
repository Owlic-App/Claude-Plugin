---
name: call-owlic-api
description: >
  Makes one authenticated call to the Owlic REST API (https://api.owlic.fr)
  and handles its response: sources the org API key in order from the
  OWLIC_API_KEY env var, a .env file, or .owlic/config.json; sends it as
  Authorization: Bearer <key> (X-Api-Key also accepted); builds the curl
  request for the caller's given HTTP method, path, body, and query params;
  captures the real HTTP status code; and branches on it against the
  standard {error:{code,message}} shape for 400/401/403/404/422/429/500,
  plus 503 on the unauthenticated /health probe, including self-diagnosis
  via GET /v1/whoami and GET /health. Owns ONLY the Owlic API calling
  convention (base URL, auth, key sourcing, status handling, generic
  errors) — never domain endpoints, fields, or workflow logic. INVOKE when
  the user or an invoking agent needs to make any Owlic API request ("call
  the Owlic API", "hit /v1/...", "GET/POST/PATCH/DELETE to Owlic",
  "check Owlic auth", "call /health"), or whenever a domain agent
  (owlic-training-programs, owlic-training-actions, or a future sibling)
  needs to execute an HTTP call against Owlic. Not for deciding which
  endpoint, fields, or workflow step to use — that judgment stays with the
  caller.
argument-hint: "<METHOD> <path> [json-body] [--query \"k=v&k2=v2\"]"
allowed-tools: Bash, Read, Grep, Glob
---

# call-owlic-api

## Mission

You make exactly one call to the Owlic REST API and hand back its outcome. You own the calling convention only: base URL, auth header, key sourcing, HTTP-status branching, the generic error shape, and self-diagnosis (`/v1/whoami`, `/health`). You never choose which endpoint to call, what fields belong in a body, or what a result means for a workflow — the caller (a domain agent or the user) supplies the method/path/body/params and interprets the domain meaning of the result.

## Phase 0 — Input contract

The caller supplies, via `$ARGUMENTS` when invoked directly or via instruction when invoked in-context by another agent:

- **method** — GET/POST/PUT/PATCH/DELETE (required)
- **path** — must be exactly `/health`, exactly `/v1/whoami`, or start with `/v1/` (required)
- **body** — JSON object, for POST/PUT/PATCH (optional)
- **query params** — key/value pairs to append to the URL (optional)

If method or path is missing, ask the caller for it — don't guess an endpoint. If path is outside the contract above (not `/health`, not `/v1/whoami`, doesn't start with `/v1/`), refuse and say so — that's out of scope for this skill regardless of who's asking.

## Phase 1 — Resolve the API key

Skip this phase entirely for `GET /health` — it needs no key. For every other call, resolve in order and stop at the first hit:

1. Env var `OWLIC_API_KEY`.
2. A `.env` file containing `OWLIC_API_KEY=owlic_sk_...` — locate it with Glob, read/extract the value with Grep or Read.
3. `.owlic/config.json` with an `apiKey` field — locate it with Glob, read it with Read.
4. **None found**: stop before making any authenticated call. Report exactly what's missing and how to fix it (name the three sources above). Never ask the user to paste the raw key into chat. Never invent, guess, or reuse a key seen elsewhere in the session.

Never print, log, or echo the full key. When you must reference it, mask to `owlic_sk_...`+last 4 characters.

## Phase 2 — Build and execute the request

- **Base URL**: `https://api.owlic.fr` (no trailing slash). Business endpoints live under `/v1`; `/health` is a top-level probe.
- **Auth header**: `Authorization: Bearer <key>` by default. `X-Api-Key: <key>` is also accepted — only switch to it if the caller explicitly asks for that header instead.
- **Template** — always capture the real HTTP status and never infer success from body shape:

  ```bash
  curl -sS -w '\n%{http_code}' \
    -H "Authorization: Bearer ${OWLIC_API_KEY}" \
    -H "Content-Type: application/json" \
    -X <METHOD> "https://api.owlic.fr<path>[?query]" \
    ${BODY:+-d "$BODY"}
  ```

  For `GET /health`, drop the `Authorization` header entirely — it's an open endpoint.
- Split the captured trailing status line from the response body before parsing either.

## Phase 3 — Branch on the real HTTP status

On any non-2xx, the body is the standard shape `{ "error": { "code": "...", "message": "..." } }`.

| Status | Meaning | Action |
|---|---|---|
| 400 | Invalid request body | Relay `error.message` verbatim — the caller owns fixing the payload against its own field contract |
| 401 | Missing/invalid API key | Relay `error.message`; confirm the key was actually sourced (non-empty) and carries the `owlic_sk_` prefix |
| 403 | Key disabled/expired, or the org's API-key feature is off | Relay `error.message` verbatim — it already states the cause. Do not retry |
| 404 | Not found | Relay `error.message`. If the id looked valid, self-diagnose with `GET /v1/whoami` (see Phase 4) and let the caller judge whether org-scoping explains it |
| 422 | Rejected by a domain rule | Relay `error.message` verbatim — it names the violated rule; don't guess a fix |
| 429 | Rate limit / usage quota exceeded | Don't retry immediately; report the limit and suggest spacing out requests |
| 500 | Internal server error | Call `GET /health` (Phase 4) to tell "Owlic is down" apart from "this one request failed," and report which |
| 503 | (from `/health` only) database unreachable | Distinct from a generic 500 — surface it as a database-specific outage |

On 2xx, parse the body — return `data` to the caller when the response is enveloped that way, or the raw parsed body otherwise. Never invent or reshape a field the response didn't actually include.

## Phase 4 — Self-diagnosis

Run these on demand (per the table above), never speculatively:

- `GET /v1/whoami` (auth required) → `{ authenticated, organizationId, userId, apiKeyId }`.
- `GET /health` (no auth) → `{ status, service, database, ... }`; a `503` here means the database specifically is unreachable, distinct from the API being generally down.

## Output contract

- **2xx**: return the parsed body/`data` to the caller, unmodified.
- **Non-2xx**: relay `error.code` + `error.message`, the self-diagnosis result if you ran one, and one concrete next step.

## Hard rules

- NEVER print, log, or echo the raw API key — mask to `owlic_sk_...`+last4 whenever you reference it.
- NEVER ask the user to paste the key into chat, and NEVER invent or reuse a key from elsewhere.
- NEVER infer success or failure from the response body's shape — always branch on the captured HTTP status code.
- NEVER attempt an authenticated call before Phase 1 completes — `GET /health` is the only exception.
- NEVER decide domain semantics — which endpoint to call, what a field means, what a workflow step requires. Relay status and error verbatim and let the caller decide.

## Gotchas

- `.env` and `.owlic/config.json` may both be absent in a fresh checkout — that's expected, not an error; proceed straight to "none found, here's how to fix it," don't retry the same source twice.
- A `.env` file may contain other, unrelated variables — grep specifically for the `OWLIC_API_KEY=` line rather than reading the whole file into a prompt.
- `owlic_sk_...` is the only valid key prefix — if a sourced value doesn't start with it, treat that as a configuration error worth flagging, not a silently-accepted key.
- The API accepts both `Authorization: Bearer` and `X-Api-Key` for the same key — default to `Authorization: Bearer` for consistency; don't mix headers mid-session without the caller asking.
- `/health` returns `503`, not `500`, specifically when the database is unreachable — don't collapse that distinction when reporting "Owlic is down" vs. "Owlic's database is down."
- A JSON body passed through `$ARGUMENTS` or shell interpolation can lose quoting — pass it to `curl -d` as a single quoted argument (or via `--data @file` for anything nontrivial) rather than re-splicing it into the command string.
- `/health` and `/v1/whoami` responses are flat objects, not `{ data: ... }`-enveloped like business endpoints — return them as-is rather than looking for a `data` key that isn't there.

## Help

If `$ARGUMENTS` is empty, show this:

```
# call-owlic-api

Makes one authenticated call to the Owlic REST API and handles the response
(auth, key sourcing, status branching, generic errors, self-diagnosis).

Usage: /owlic:call-owlic-api <METHOD> <path> [json-body] [--query "k=v"]

Examples:
  /owlic:call-owlic-api GET /v1/training-programs
  /owlic:call-owlic-api GET /health
  /owlic:call-owlic-api POST /v1/training-actions '{"title":"...","requiresQualiopiCompliance":true}'
```

## Deliverable

- **Input**: HTTP method, a path under `/v1` (or `/health`, `/v1/whoami`), optional JSON body, optional query params.
- **Output**: on 2xx, the parsed body/`data`; on error, `error.code`/`error.message` + self-diagnosis result (if run) + one concrete next step. Never domain-interpreted — that's the caller's job.
