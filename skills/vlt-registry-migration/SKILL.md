---
name: vlt-registry-migration
description:
  Moves a JavaScript repository (single package or monorepo) onto a
  vlt.io registry. Routes installs through the account's npm mirror
  and private `main` registry, handles the lockfile, and sets up auth
  for npm, pnpm, yarn, bun, deno and the vlt CLI on laptops, CI,
  Vercel and coding-agent sandboxes. Use when the user wants to switch
  a repo or pipeline to registry.vlt.io, set up vlt.io tokens, or fix
  401s or missing auth after switching.
---

# Migrate a repository to the vlt registry

Docs index: [llms.txt](https://docs.vlt.sh/llms.txt). Every docs page
is Markdown at its URL + `.md`; read the linked page before editing
config. Examples use the account slug `acme`; replace it with the
user's.

## Rules

- Confirm with the user before creating or revoking tokens, changing
  access, or publishing.
- Never commit or print a literal token, and never write one into a
  project config file.
- Change only registry routing and auth. Keep scripts, dependencies
  and `packageManager` unless the user agrees.
- Confirm before deleting or regenerating a lockfile.

## 1. Gather

- Account slug and private scope(s), e.g. `@acme`.
- Package manager and version (`packageManager`, lockfile); Turborepo?
  (see [Known limitations](#known-limitations)).
- Where installs run: laptops, CI provider, Vercel, coding-agent
  sandboxes.

Each account has two registries:

- `https://registry.vlt.io/acme/npm/`: npm mirror. Make it the default
  registry. Always needs a token, even for public packages.
- `https://registry.vlt.io/acme/main/`: the account's own packages.
  Map the scope to it.

Accounts ([sign up](https://docs.vlt.sh/registry.md#sign-up),
[tokens](https://docs.vlt.sh/registry/tokens.md#personal-and-service-tokens)):
invite each developer, who logs in (or creates a personal token). CI,
Vercel and each agent sandbox get their own `package:read` service
token, created by an owner or admin (add `package:write` only to
publish).

## 2. Route installs

Commit the routing (auth is step 4):

| Tool            | File          | Default → mirror              | `@acme` → `main`                   |
| --------------- | ------------- | ----------------------------- | ---------------------------------- |
| npm, pnpm, deno | `.npmrc`      | `registry=`                   | `@acme:registry=`                  |
| yarn 2+         | `.yarnrc.yml` | `npmRegistryServer`           | `npmScopes.acme.npmRegistryServer` |
| bun             | `bunfig.toml` | `[install] registry`          | `[install.scopes] acme`            |
| vlt             | `vlt.json`    | `registry` + `registries.npm` | `scoped-registries` `"@acme"`      |

Full config:
[vlt](https://docs.vlt.sh/registry/publishing/vlt.md#manual-configuration),
[npm](https://docs.vlt.sh/registry/publishing/npm.md#the-config-file),
[pnpm](https://docs.vlt.sh/registry/publishing/pnpm.md#the-config-file),
[yarn](https://docs.vlt.sh/registry/publishing/yarn.md#the-config-file),
[bun](https://docs.vlt.sh/registry/publishing/bun.md#quick-start),
[deno](https://docs.vlt.sh/registry/publishing/deno.md#quick-start).

- yarn: `npmScopes` keys drop the `@`; Classic 1.x uses `.npmrc`.
- vlt: write `vlt.json` with `vlt config set` (vlt guide).
  `vlt setup acme` only writes the `npm` / `main` aliases to user
  config.
- pnpm ≤ 10 ignores `registry` in `pnpm-workspace.yaml`: keep
  `registry` and `@acme:registry` in `.npmrc`
  (`pnpm config set … --location=project` writes it).
  `pnpm-workspace.yaml` can't hold auth either.

## 3. Lockfile

- npm: keep `package-lock.json`; `npm install` fetches its
  `registry.npmjs.org` entries from the mirror (other hosts aren't
  rewritten).
- pnpm: keep `pnpm-lock.yaml` (no tarball URLs); `pnpm install`.
- vlt: a kept `vlt-lock.json` still fetches from the old registry
  ([#1579](https://github.com/vltpkg/vltpkg/issues/1579)):
  `rm -rf vlt-lock.json node_modules && vlt install`.
- yarn, bun, deno: regenerate `yarn.lock` / `bun.lock` / `deno.lock`
  per their guide.

## 4. Auth: who reads what

Only the vlt CLI reads `VLT_TOKEN` itself. Other tools see the secret
only through an auth line that references it, so setting the secret
alone sends no credentials.

| Tool          | Auth from                                            | Token reference in committed project file |
| ------------- | ---------------------------------------------------- | ----------------------------------------- |
| vlt           | keychain or env vars (below)                         | n/a, `.npmrc` not read                    |
| npm, npx      | `.npmrc`                                             | expanded                                  |
| pnpm          | `pnpm login`, `~/.npmrc`, or `pnpm_config_…` env var | **ignored** (11.5.3+)                     |
| yarn          | `.yarnrc.yml` (Classic: `.npmrc`)                    | expanded                                  |
| bun           | `bunfig.toml` (`$VLT_TOKEN`) or `.npmrc`             | expanded                                  |
| deno          | `.npmrc`                                             | expanded                                  |
| Vercel builds | `.npmrc` written from `NPM_RC`                       | see step 5                                |

- Laptops: personal token per developer. Export `VLT_TOKEN` where
  committed files reference it; pnpm: `pnpm login --registry=<url>`
  per registry URL (`--scope=@acme` for `main`); vlt:
  `vlt setup acme`.
- npm, yarn, bun, deno: commit auth lines for both registry URLs
  referencing `${VLT_TOKEN}` (`$VLT_TOKEN` in `bunfig.toml`; yarn also
  `npmAlwaysAuth: true`). npm, bun and deno send an unset var
  literally, which fails like a bad token.
- pnpm: commit routing only. In CI use one of
  ([pnpm in CI](https://docs.vlt.sh/registry/publishing/ci.md#pnpm-needs-a-different-approach)):
  - `env "pnpm_config_//registry.vlt.io/acme/npm/:_authToken=$VLT_TOKEN" pnpm install --frozen-lockfile`
    (pnpm 11.6.0+; one var per registry URL);
  - a step appending
    `//registry.vlt.io/acme/npm/:_authToken=${VLT_TOKEN}` and the same
    `main` line to user-level `~/.npmrc` with a quoted heredoc
    (`<<'EOF'` keeps `${VLT_TOKEN}` literal; pnpm expands it there);
  - `PNPM_CONFIG_NPMRC_AUTH_FILE=<auth file outside the repo>`.
- vlt: per-registry
  `VLT_TOKEN_<registry URL, trailing / dropped, each run of non-alphanumerics → _>`,
  e.g. `VLT_TOKEN_https_registry_vlt_io_acme_npm` and
  `VLT_TOKEN_https_registry_vlt_io_acme_main`.
  See [Authentication](https://docs.vlt.sh/client/auth.md#ci-and-other-headless-environments).

## 5. CI and hosted environments

Details:
[CI & automation](https://docs.vlt.sh/registry/publishing/ci.md#who-reads-what).

- [GitHub Actions](https://docs.vlt.sh/registry/publishing/ci.md#github-actions):
  secret `VLT_TOKEN` in the job `env` (plus pnpm / vlt auth from step
  4); install with the frozen-lockfile flag.
- [Vercel](https://docs.vlt.sh/registry/publishing/ci.md#vercel):
  ignores `VLT_TOKEN`. Set `NPM_RC` (not `NPM_TOKEN`) to the routing
  and auth lines with a `package:read` service token, and keep a
  `registry.npmjs.org` line: Vercel installs its runtimes from it. Set
  multi-line values with the Vercel CLI.
- [Coding-agent sandboxes](https://docs.vlt.sh/registry/publishing/ci.md#coding-agent-sandboxes)
  (Cursor, Claude Code, Devin, Codespaces, …): treat each like a CI
  runner. Own service token in that environment's secrets, committed
  routing, auth for both registry URLs as in step 4.
- [Publishing from CI](https://docs.vlt.sh/registry/publishing/ci.md#publishing-from-ci):
  service token with `package:write`; a personal token fails with
  `EOTP`.

## Known limitations

- Turborepo doesn't support vlt as a package manager:
  `"packageManager": "vlt@…"` fails with
  `Invalid packageManager field`, and turbo requires `packageManager`
  or `devEngines.packageManager` (seen on turbo 2.10). In Turborepo
  repos keep npm, pnpm, yarn or bun as `packageManager` and use the
  vlt registry through that tool's config
  ([#1851](https://github.com/vltpkg/vltpkg/issues/1851)).

## Verify

- `npm config get registry` / `pnpm config get registry` print the
  mirror. pnpm ≤ 10 printing `registry.npmjs.org`: move `registry`
  from `pnpm-workspace.yaml` to `.npmrc`.
- `vlt ping` checks the default registry and `registries` aliases (not
  `scoped-registries`). Read its output: it exits 0 even when a ping
  fails.
- Clean frozen-lockfile install, locally and in CI: no `401`.

## Troubleshooting

| Symptom                                                     | Cause                                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `401` / `No authorization header was set`                   | token not reaching the tool (step 4): pnpm `${VLT_TOKEN}` in a project `.npmrc`, or secret unset in that job             |
| `EOTP` when publishing from CI                              | personal token; use a service token                                                                                      |
| vlt still fetches from `registry.npmjs.org`                 | kept `vlt-lock.json` (step 3)                                                                                            |
| pnpm 12 `no version found for the latest tag` on the mirror | mirror bug on pnpm 12: [pnpm guide](https://docs.vlt.sh/registry/publishing/pnpm.md) pins `pnpm@11.26.0` (confirm first) |
