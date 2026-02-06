---
description: Code validation workflow (format, lint, test, coverage, typecheck)
globs: src/*/src/**/*.ts,src/*/test/**/*.ts
alwaysApply: false
---
# Code Validation Workflow

Run from the workspace dir (e.g., `cd src/semver`). If `package.json` deps changed, run `vlt install` from repo root first.

## Steps (run in order, stop on failure)

1. **Format:** `vlr format`
2. **Lint:** `vlr lint` — see `@linting-error-handler.mdc` for common fixes
3. **Test:** `vlr test -Rtap --disable-coverage` (single file: append `test/foo.ts`)
4. **Coverage:** `vlr test -Rsilent --coverage-report=text-lcov` (single file: append `test/foo.ts`)
5. **Types:** `vlr posttest`

## Snapshots

Update only when changes are intentional: `vlr snap -Rtap --disable-coverage test/foo.ts`

## Test Quality

- Never use `as any` to bypass types in tests — respect type contracts
- Use existing test fixtures from `test/` dirs
- Study similar tests in the module for patterns
- Ensure 100% coverage
