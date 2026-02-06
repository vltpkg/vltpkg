# Agent Guide to the vltpkg Monorepo

pnpm monorepo. Workspaces in `src/*`, `infra/*`, `www/*`. Workspaces published as `@vltpkg/*`, the built vlt CLI itself is published as `vlt`.

## Workspaces

- **Graph (core install engine):** `src/graph` — See `.cursor/rules/graph/index.mdc` and sub-rules: `data-structure`, `ideal`, `ideal-append-nodes`, `load-actual`, `modifiers`, `lockfiles`, `reify`, `peers`
- **Core:** `src/cache`, `src/cache-unzip`, `src/types`, `src/dep-id` (node IDs), `src/spec` (specifier parsing), `src/satisfies` (DepID↔Spec)
- **DSS Query:** `src/dss-parser`, `src/dss-breadcrumb`, `src/query` — See `.cursor/rules/query-pseudo-selector-creation.mdc`
- **Package Mgmt:** `src/package-info`, `src/package-json`, `src/registry-client`, `src/tar`, `src/workspaces`
- **CLI:** `src/cli-sdk` (framework — see `.cursor/rules/cli-sdk-workspace.mdc`), `src/init`, `src/vlx`, `src/run`
- **Utilities:** `src/keychain`, `src/security-archive`, `src/semver`, `src/git`, `src/error-cause`, `src/output`, `src/xdg`, `src/url-open`, `src/promise-spawn`, `src/cmd-shim`, `src/rollback-remove`, `src/dot-prop`, `src/fast-split`, `src/pick-manifest`, `src/vlt-json`, `src/which`
- **Infra:** `infra/benchmark`, `infra/cli`, `infra/cli-compiled`, `infra/cli-{platform}`, `infra/smoke-test`
- **Docs:** `www/docs` → https://docs.vlt.sh

## Development

- `cd` into workspace dir before running commands (e.g., `cd src/semver`)
- Each workspace has own `package.json`, `test/` folder
- 100% test coverage required. Use pnpm. Strict TypeScript.

## Steps (run in order, stop on failure)

1. **Format:** `pnpm format`
2. **Lint:** `pnpm lint` — see `.cursor/rules/linting-error-handler.mdc` for common fixes
3. **Test:** `pnpm test -Rtap --disable-coverage` (single file: append `test/foo.ts`)
4. **Coverage:** `pnpm test -Rsilent --coverage-report=text-lcov` (single file: append `test/foo.ts`)
5. **Types:** `pnpm posttest`

## Snapshots

Update only when changes are intentional: `pnpm snap -Rtap --disable-coverage test/foo.ts`

## Test Quality

- Never use `as any` to bypass types in tests — respect type contracts
- Use existing test fixtures from `test/` dirs
- Study similar tests in the module for patterns
- Ensure 100% coverage
