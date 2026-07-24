# DSS Reference

Compiled from https://docs.vlt.io/cli/selectors/ (source:
`www/docs/src/content/docs/cli/selectors/`). When in doubt, check
those docs — they are canonical.

## Attribute selectors

Match against `package.json` fields.

| Selector         | Meaning                                          |
| ---------------- | ------------------------------------------------ |
| `[attr]`         | has the property                                 |
| `[attr=value]`   | equals                                           |
| `[attr^=value]`  | starts with                                      |
| `[attr$=value]`  | ends with                                        |
| `[attr*=value]`  | contains                                         |
| `[attr~=value]`  | whitespace-separated list contains               |
| `[attr\|=value]` | equals value or starts with `value-`             |
| `[attr=value i]` | case-insensitive (`s` = case-sensitive, default) |

Nested fields (e.g. `engines.node`) need `:attr()`:
`:attr(engines, [node])`,
`:attr(peerDependenciesMeta, foo, [optional=true])`.

`#foo` is shorthand for `[name=foo]`.

## Combinators

| Combinator | Meaning                                                              |
| ---------- | -------------------------------------------------------------------- |
| `A > B`    | B is a **direct** dependency of A (chain for depth: `:root > * > *`) |
| `A B`      | B is a direct **or transitive** dependency of A                      |
| `A ~ B`    | B shares a parent with A (sibling)                                   |

## Pseudo-states (no arguments)

Graph structure:

| Selector     | Matches                                 |
| ------------ | --------------------------------------- |
| `:root`      | top-level package.json node             |
| `:project`   | root + all workspaces ("your code")     |
| `:workspace` | workspaces from vlt.json                |
| `:scope`     | current selector scope (with `--scope`) |

Dependency type:

| Selector                                 | Matches                                                |
| ---------------------------------------- | ------------------------------------------------------ |
| `:prod` / `:dev` / `:optional` / `:peer` | by dependency type                                     |
| `:missing`                               | declared but not installed (**edges only, not nodes**) |
| `:overridden`                            | has an override applied                                |

Package properties:

| Selector      | Matches                                      |
| ------------- | -------------------------------------------- |
| `:private`    | `"private": true`                            |
| `:empty`      | no dependencies                              |
| `:link`       | linked packages                              |
| `:prerelease` | version has prerelease part (`1.0.0-beta.1`) |
| `:built`      | built during reify                           |
| `:scanned`    | has Socket security metadata                 |

## Pseudo-classes (take arguments)

| Selector            | Meaning                                 | Example                                        |
| ------------------- | --------------------------------------- | ---------------------------------------------- |
| `:attr(...)`        | nested package.json property            | `:attr(engines, [node])`                       |
| `:dist(tag)`        | registry dist-tag                       | `:dist(latest)`                                |
| `:has(sel)`         | has matching descendant                 | `:has(.peer[name=react])`                      |
| `:host(name)`       | switch graph context to another project | `:host(local) :malware`                        |
| `:is(a, b)`         | any of (forgiving list)                 | `:is([name=a], [name=b])`                      |
| `:not(sel)`         | negation                                | `:not([license=MIT])`                          |
| `:outdated(kind?)`  | newer version exists                    | `:outdated(major)`                             |
| `:published(range)` | by publish date                         | `:published(">2024")`                          |
| `:semver(range)`    | semver comparison on installed version  | `:semver(^1.0.0)`                              |
| `:spec(spec)`       | by declared specifier (edge)            | `:spec(^1.0.0)`                                |
| `:path(glob)`       | workspace/file packages by path         | `:path("packages/**")`                         |
| `:type(kind)`       | package type                            | `:type(git)`, `:type(registry)`, `:type(file)` |
| `:diff(ref)`        | files changed vs git ref                | `:diff(main)`                                  |
| `:hostname(host)`   | upstream hostname                       | `:hostname(github.com)`                        |
| `:registry(name)`   | configured registry name                | `:registry(npm)`                               |

## Security insights (Socket-powered, network call)

Severity args accept names or numbers (`critical`/`0`, `high`/`1`,
`medium`/`2`, `low`/`3`) and comparators: `:severity(">=medium")`.

Threats: `:malware(sev?)`, `:squat(sev?)`, `:suspicious`, `:confused`.

Vulnerabilities: `:vulnerable` (alias `:vuln`), `:cve(CVE-2023-1234)`,
`:cve(*)`, `:cwe(CWE-79)`, `:severity(level)`.

Licensing: `:license(type)` — types: `unlicensed`, `misc`,
`restricted`, `ambiguous`, `copyleft`, `unknown`, `none`, `exception`.

Code behavior: `:eval`, `:network`, `:fs`, `:env`, `:shell`,
`:scripts` (install scripts), `:debug`, `:dynamic`.

Obfuscation: `:obfuscated`, `:minified`, `:entropic`, `:native`,
`:shrinkwrap`.

Health: `:deprecated`, `:unmaintained` (5+ years stale), `:unpopular`,
`:trivial` (<10 LOC), `:abandoned`, `:unknown`, `:unstable`.

Other: `:tracker` (telemetry), `:undesirable`, `:score(rate, kind?)` —
kinds: `overall` (default), `license`, `maintenance`, `quality`,
`supplyChain`, `vulnerability`; e.g. `:score("<=0.5", "maintenance")`.

## Audit query starters

```bash
vlt query ':malware(critical), :cve(*), :obfuscated'   # critical issues
vlt query ':abandoned, :unmaintained, :unknown'        # supply chain risk
vlt query ':license(copyleft), :license(unlicensed)'   # license compliance
vlt query ':eval, :shell, :network, :fs'               # behavior audit
```
