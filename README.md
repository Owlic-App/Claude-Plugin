# Owlic plugin for Claude Code

Drive the [Owlic](https://www.owlic.fr) training management platform from Claude Code, in plain language: browse your training programs, create training actions and walk them through the Qualiopi workflow, all through the Owlic API (`https://api.owlic.fr`).

## Installation

At the Claude Code prompt:

```
/plugin install owlic --marketplace Owlic-App/Claude-Plugin
```

Answer `y` to add the marketplace, then pick a scope.

## Configuration

The plugin needs your organization's Owlic API key (`owlic_sk_...`). It looks for it in this order:

1. The `OWLIC_API_KEY` environment variable
2. A `.env` file containing `OWLIC_API_KEY=owlic_sk_...`
3. A `.owlic/config.json` file with an `apiKey` field

Never commit your key: `.env` and `.owlic/` belong in your `.gitignore`.

## Usage

```
/owlic:owlic <what you want to do in Owlic>
/owlic:help
```

Examples:

```
/owlic:owlic list the training programs
/owlic:owlic create a Qualiopi training action "Cybersécurité PME"
/owlic:owlic plan the sessions for the action "Cybersécurité PME"
```

`/owlic:owlic` routes each request to the right specialist agent.

## What's inside

**Agents**

| Agent | Role |
|---|---|
| `owlic-router` | Classifies a request and delegates it to the matching specialist |
| `owlic-training-programs` | Training program catalogue (read-only) |
| `owlic-training-actions` | Creates training actions and runs their Qualiopi workflow |

**The Qualiopi workflow** of a training action, one step at a time:

| # | Step | Prep skill |
|---|---|---|
| 1 | Create the action | — |
| 2 | Needs analysis | `analyze-needs` |
| 3 | Beneficiaries | `identify-beneficiaries` |
| 4 | Assign the training program | `refine-program` |
| 5 | Plan sessions | `schedule-sessions` |
| 6 | Assign trainers | `invite-trainers` |
| 7 | Set pricing | `define-pricing` |
| 8 | Generate the convention | `generate-convention` |

Each prep skill interviews you and drafts that step's data without sending anything; the `owlic-training-actions` agent then saves it through the API. The `call-owlic-api` skill handles authentication and error handling for every call.

## License

[MIT](LICENSE)
