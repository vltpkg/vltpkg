# dss-query skill evals

Regression tests for the [dss-query](../SKILL.md) agent skill. Each
case runs a real headless Claude Code session (`claude -p`) from the
repo root — the same way users hit the skill — and grades the
transcript deterministically (no LLM judge):

| Check                                                                | How                                                        |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| Skill triggers when it should (and stays quiet when it shouldn't)    | Skill `tool_use` events in the stream-json transcript      |
| Generated selectors are valid DSS                                    | `@vltpkg/dss-parser` `parse()` throws on invalid selectors |
| Query has the expected shape / explanation covers the right concepts | regex over extracted selectors / response text             |

## Run

```bash
cd src/query/skills/dss-query/evals
node run.ts
```

Requirements: `claude` CLI on PATH with working auth, Node ≥22.18
(built-in TypeScript type stripping). Each case is a live agent run —
expect ~30–60s and normal API cost per case. For cheaper sweeps:

```bash
CLAUDE_EVAL_MODEL=haiku node run.ts
```

## Adding cases

Add to [cases.ts](cases.ts). Prefer `expectSelector` (deterministic)
over `expectText`; when a trigger phrase is added to the skill's
frontmatter description, add a matching trigger case here — the
description is the contract these evals test.

This directory is excluded from the published `@vltpkg/query` package
(see the `files` field in `package.json`) — it's repo tooling, not
part of the skill consumers receive.
