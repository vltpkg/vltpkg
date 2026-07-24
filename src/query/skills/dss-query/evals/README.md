# dss-query skill evals

How we evaluate the [dss-query](../SKILL.md) agent skill:

Claude's skill-creator plugin "Evaluate a skill" decomposes into three
different measurements with different levels of rigor

| Layer                  | Question                                                | Method                                                                                      | LLM involved?         | CI-gateable?                                |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------- |
| 1. Content correctness | Are the skill's documented selectors valid and current? | Extract selectors from SKILL.md/REFERENCE.md, parse + execute against the real query engine | No                    | Yes — deterministic                         |
| 2. Content efficacy    | Does the skill make model output measurably better?     | With-skill vs baseline differential, graded deterministically                               | As subject, not judge | Not as a hard gate (single-sample variance) |
| 3. Trigger efficacy    | Does the skill activate when it should?                 | Repeated trigger-rate sampling on the production model                                      | Yes, unavoidably      | No — probabilistic, monitor only            |

Two principles behind this split, learned the hard way:

- **Never use an LLM as the judge of a skill written for that LLM** —
  grade with deterministic checks (parse, execute, regex). The LLM may
  be the _subject_ of an eval, never its grader.
- **A skill's value is its lift over baseline.** A strong model may
  already know the domain (correctness lift ≈ 0) while the skill still
  earns its keep on response style, concision, and latency. Only a
  with/without differential reveals which.

## Layer 2: the efficacy differential (primary loop)

Lives in [`../../dss-query-workspace/`](../../dss-query-workspace/)
(gitignored). Test prompts + deterministic assertions are defined in
[evals.json](evals.json). Each iteration:

1. For every eval, spawn two subagents in the same turn: one told to
   read and follow the live SKILL.md (**force-loaded** — this removes
   the trigger confound, see below), one baseline (no skill, or a
   snapshot of the pre-edit skill when iterating).
2. Grade every answer with [grade.mjs](grade.mjs) (run from
   `src/query`:
   `node skills/dss-query/evals/grade.mjs <iteration-dir>`) — no LLM:
   - extract selectors from the answer (`vlt query '…'` and bare
     code-block selectors);
   - every selector must **parse** via `@vltpkg/dss-parser`;
   - structural selectors must **execute** via `Query.search()`
     against the in-memory fixture graph
     (`src/query/test/fixtures/graph.ts`). Selectors using `:outdated`
     (registry fetch) or security pseudo-selectors (need the Socket
     archive) are parse-checked only, so grading stays offline.
     Comma-separated selectors are split at the top level first —
     multi-selector lists enable the engine's loose mode, which
     silently swallows invalid segments;
   - per-eval regex assertions (expected shape, style contract,
     required caveats).
3. Aggregate with skill-creator's `aggregate_benchmark` and review
   outputs in its eval viewer; human feedback drives the next skill
   edit, then re-run with the pre-edit snapshot as baseline.

Read the benchmark honestly: pass-rate delta is the skill's
correctness lift; time/token deltas are its efficiency cost/benefit;
assertions that pass in **both** configs are non-discriminating — they
can't detect skill regressions on that model (but may on weaker ones).

## Layer 1: doc-selector validation

Machinery exists in [grade.mjs](grade.mjs) (parse + offline execute);
a standalone sweep that extracts every selector from
SKILL.md/REFERENCE.md and validates it the same way is the natural CI
gate — it catches the regression that actually bites: the query engine
changes and the skill's documented examples silently go stale.

## Adding cases

Add to [evals.json](evals.json). Prefer deterministic assertions
(selector parses, executes, matches shape) over prose matching; make
prompts realistic (casual phrasing, a wrong attempt to correct,
project context) rather than textbook questions; and verify any
factual claim an assertion encodes against the engine source first —
e.g. `:license()` takes only category kinds, so an eval expecting
`:license(mit)` would grade correct answers as failures.

This directory is excluded from the published `@vltpkg/query` package
(see the `files` field in `package.json`) — it's repo tooling, not
part of the skill consumers receive.
