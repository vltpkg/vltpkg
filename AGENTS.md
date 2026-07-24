# Agent Guide to the vltpkg Monorepo

vlt monorepo. Workspaces in `src/*`, `infra/*`, `www/*`. Workspaces
published as `@vltpkg/*`, the built vlt CLI itself is published as
`vlt`.

## Workspaces

- **Graph (core install engine):** `src/graph` — See
  `.cursor/rules/graph/index.mdc` and sub-rules: `data-structure`,
  `ideal`, `ideal-append-nodes`, `load-actual`, `modifiers`,
  `lockfiles`, `reify`, `peers`, `src/graph-run` (parallel graph
  operations)
- **Core:** `src/cache`, `src/cache-unzip`, `src/config`, `src/types`,
  `src/dep-id` (node IDs), `src/spec` (specifier parsing),
  `src/satisfies` (DepID↔Spec)
- **DSS Query:** `src/dss-parser`, `src/dss-breadcrumb`, `src/query` —
  See `.cursor/rules/query-pseudo-selector-creation.mdc`
- **Package Mgmt:** `src/package-info`, `src/package-json`,
  `src/registry-client`, `src/tar`, `src/workspaces`
- **CLI:** `src/cli-sdk` (framework — see
  `.cursor/rules/cli-sdk-workspace.mdc`), `src/init`, `src/vlx`,
  `src/run`
- **Utilities:** `src/keychain`, `src/security-archive`, `src/semver`,
  `src/git`, `src/git-scp-url`, `src/error-cause`, `src/output`,
  `src/xdg`, `src/url-open`, `src/promise-spawn`, `src/cmd-shim`,
  `src/rollback-remove`, `src/dot-prop`, `src/fast-split`,
  `src/pick-manifest`, `src/vlt-json`, `src/which`
- **Infra:** `infra/benchmark`, `infra/cli`, `infra/cli-js`,
  `infra/smoke-test`
- **Docs:** `www/docs` → https://docs.vlt.sh

## Development

- `cd` into workspace dir before running commands (e.g.,
  `cd src/semver`)
- Each workspace has own `package.json`, `test/` folder
- 100% test coverage required. Use vlt. Strict TypeScript.

## Steps (run in order, stop on failure)

1. **Format:** `vlr format`
2. **Lint:** `vlr lint` — see
   `.cursor/rules/linting-error-handler.mdc` for common fixes
3. **Test:** `vlr test -Rtap --disable-coverage` (single file: append
   `test/foo.ts`)
4. **Coverage:** `vlr test -Rsilent --coverage-report=text-lcov`
   (single file: append `test/foo.ts`)
5. **Types:** `vlr posttest`

## Snapshots

Update only when changes are intentional:
`vlr snap -Rtap --disable-coverage test/foo.ts`

## Test Quality

- Never use `as any` to bypass types in tests — respect type contracts
- Use existing test fixtures from `test/` dirs
- Study similar tests in the module for patterns
- Ensure 100% coverage

## Skill Evals

Agent skills (e.g. `src/query/skills/dss-query`) are evaluated in
three layers — see `src/query/skills/dss-query/evals/README.md` for
the full approach:

1. **Content correctness** (deterministic, CI-safe): selectors/claims
   in the skill docs must parse (`@vltpkg/dss-parser`) and execute
   against the real engine (`Query.search()` + in-memory fixture
   graph). No LLM involved.
2. **Efficacy differential**: with-skill vs baseline subagent runs on
   the same prompts, graded deterministically (parse/execute/regex —
   never LLM-as-judge). The skill's value is the _lift_ over baseline
   (pass rate, style, time, tokens), not its pass rate alone.
3. **Trigger efficacy**: whether the skill activates from its
   frontmatter description. Probabilistic — sample repeatedly,
   monitor, never hard-gate. Headless `claude -p` cannot force skill
   invocation, so force-load the skill (subagent reads SKILL.md) when
   measuring layers 1–2.

Rules of thumb:

- Grade with deterministic checks only.
- Always run a no-skill (or pre-edit snapshot) baseline.
- Verify any factual claim an assertion encodes against engine source
  first.
