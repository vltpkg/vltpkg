---
name: vlt-cli
description:
  Map of the vlt CLI for coding agents. Covers how to install, add,
  remove and update dependencies, run scripts and package bins,
  configure a registry (vlt has no default registry), work with
  vlt.json and vlt-lock.json, and pass Dependency Selector Syntax
  (DSS) queries to commands. Use when the user wants to use vlt in a
  project, add or update a dependency with vlt, fix "Missing registry
  configuration" (ECONFIG), set up registries or tokens for vlt, work
  with vlt workspaces, ship an agent skill from a package, or asks
  which vlt command or flag does something or what `vlr` and `vlx`
  are.
---

# Using the vlt CLI

A map of the CLI, one line per command. For anything deeper, defer to
`vlt help <cmd>` and the docs instead of guessing options.

## Help ladder

- `vlt -h` lists the common commands; `vlt -a` every command and bin
  plus the common flags; `vlt help <cmd>` (or `vlt <cmd> -h`) one
  command's usage, options and examples.
- Every docs page is Markdown at its URL plus `.md`; the index is
  <https://docs.vlt.io/llms.txt>. Commands:
  <https://docs.vlt.io/client/commands.md>. Config keys:
  <https://docs.vlt.io/client/configuring.md>.
- When stdout is not a TTY and `CI` is unset, the default `--view` is
  `json`, so in a sandbox `vlt help <cmd>` prints a JSON-encoded
  string: add `--view=human` (`vlt <cmd> -h` is unaffected).
  `--view=json` works on every command.
- Confirm with the user before publishing, unpublishing, deprecating,
  changing access, or creating or revoking tokens.

## Install management

- `vlt install [pkgs]` (`i`, `add`): install everything, or add
  packages to package.json and vlt-lock.json. `-D`/`--save-dev`,
  `-E`/`--save-exact`, `-w <path>` adds to that workspace,
  `--frozen-lockfile` fails if the lockfile is out of date.
- `vlt uninstall <pkgs>` (`rm`): remove dependencies, update both
  files.
- `vlt update` (`u`): raise dependencies to the latest in-range
  versions by resolving from scratch; `-w <path>` limits it.
- `vlt ci`: delete node_modules and install exactly from
  vlt-lock.json.
- `vlt build [query]` (`b`): run lifecycle scripts and link bins for
  installed packages. `install`, `ci`, `update` and `uninstall` run no
  dependency scripts unless `--allow-scripts=<query>` allows them.
- `vlt outdated [pkgs]`: dependencies with newer versions, and the
  command that upgrades each.
- `vlt pkg get|set|delete <key>` (`p`): read and edit package.json.
- `vlt run <script>` (`r`, bin `vlr`) runs package.json scripts;
  `vlt exec <bin>` (`x`, bin `vlx`) runs a package bin, installing it
  when needed.
- `vlt skills list|link [query]`: show or link the agent skills
  shipped by installed packages; `--allow-skills=<query>` on install
  links them automatically. `vlt skills init [<name>]` scaffolds a
  skill for the project to ship: `skills/<name>/SKILL.md`, or a root
  `SKILL.md` named after the package, added to package.json `files`
  when needed. It never overwrites and needs no registry.
- Everything else (`init`, `create`, publishing, account and token
  commands, `cache`, `bugs|docs|repo` openers): `vlt -a`.

## Project files

- `package.json`: dependencies and scripts, as with npm.
- `vlt.json` at the project root (commit it): `workspaces` and a
  `config` object (registries, allow-scripts, allow-skills, ...).
  Workspaces found in package.json or pnpm-workspace.yaml are saved
  here on install. A user-level vlt.json
  (`vlt config location --config=user`) applies to every project; the
  project file layers on top.
- `vlt-lock.json`: the lockfile; commit it. `vlt ci` and
  `--frozen-lockfile` install exactly what it records.
- `node_modules` is laid out by vlt: `vlt query` and `vlt ls` need a
  project installed by vlt (run `vlt install` first in a project
  installed by another client). Docs:
  <https://docs.vlt.io/client/configuring.md>,
  <https://docs.vlt.io/client/workspaces.md>.

## Registry setup

vlt has **no default registry**: until one is configured, commands
fail with `Missing registry configuration` (`ECONFIG`). Installs need
the `registries.npm` alias; a scalar `registry` is not enough.

- `vlt setup [<account>]`: vlt.io accounts. Authenticates and writes
  the account's `npm` (mirror) and `main` (private) aliases to the
  user vlt.json.
- `vlt config set registries.npm=https://registry.npmjs.org/`: plain
  npm, no login. Writes the project vlt.json; add `--config=user` for
  every project. Any `registries.<alias>=<url>` works the same, and
  `<alias>:pkg@range` specs fetch from that alias; `scoped-registries`
  maps an `@scope` to a URL instead.
- `vlt login --registry=<url>`: authenticate against a registry and
  save it as the fallback `registry` (project vlt.json, or
  `--config=user`) for auth and account commands; installs still need
  `registries.npm`.
- One run only: `vlt install --registries npm=<url>`; add
  `--save-config` (`install`, `update`) to persist it to vlt.json.
- Env and CI: every option is `VLT_<OPTION>`, lists newline-delimited
  (`VLT_REGISTRIES='npm=https://registry.npmjs.org/'`); tokens via
  `VLT_TOKEN` (the default registry) or per registry URL, trailing `/`
  dropped and non-alphanumerics replaced by `_`
  (`VLT_TOKEN_https_registry_npmjs_org`). `.npmrc` is not read. Never
  commit or print a token.
- Docs: <https://docs.vlt.io/client/registries.md>,
  <https://docs.vlt.io/client/auth.md>. Moving a repo and its CI onto
  vlt.io: the `vlt-registry-migration` skill.

## DSS queries

Dependency Selector Syntax is CSS selectors over the dependency graph.
Single-quote selectors in the shell.

| Selector                             | Matches                             |
| ------------------------------------ | ----------------------------------- |
| `:root` `:workspace` `:project`      | project root / a workspace / both   |
| `#name` `[name^="@scope"]`           | by name / by package.json field     |
| `:root > *` / `:root *` / `a, b`     | direct deps / transitive / OR       |
| `:dev` `:prod` `:optional` `:peer`   | dependency type                     |
| `:not(...)` `:has(> #x)`             | negate / packages that depend on x  |
| `:outdated(major)` `:semver(^1.0.0)` | version checks                      |
| `:skills`                            | packages that ship agent skills     |
| `:malware` `:cve` `:vuln(high)`      | Socket security data (network call) |

Where queries go:

- `--target=<query>` (which packages): `vlt query`, `vlt ls`,
  `vlt build`, `vlt outdated`, `vlt skills`, `vlt bugs|docs|repo`.
  Only `vlt query`, `vlt build` and `vlt skills list|link` also take
  the query positionally; `ls` and `outdated` positionals are package
  names, `bugs|docs|repo` take a spec.
- `--scope=<query>` (what counts as top level, or which workspaces
  run): `vlt query`, `vlt ls`, `vlt run`, `vlt exec`, `vlt run-exec`,
  `vlt pkg`, `vlt version`, `vlt pack`, `vlt publish`.
  `-w <path|glob>` picks workspaces by path instead.
- `--allow-scripts=<query>`, `--allow-skills=<query>`: `vlt install`,
  `vlt update`, `vlt uninstall`, `vlt ci`.
- `vlt query '<selector>' --expect-results='>=1'` exits non-zero when
  the count does not match: a CI gate. `--view=count|json|mermaid`.
- Deeper: the `dss-query` skill
  (`vlx skills add vltpkg/vltpkg -- --skill dss-query`),
  <https://docs.vlt.io/client/selectors.md> and
  <https://docs.vlt.io/client/security.md>.
