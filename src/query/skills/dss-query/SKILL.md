---
name: dss-query
description:
  Explain and compose vlt Dependency Selector Syntax (DSS) queries —
  CSS-selector-like strings for filtering packages in a dependency
  graph, including Socket-powered security auditing. Use when the user
  asks about DSS, `vlt query`, dependency selectors, wants to
  find/filter packages (e.g. "find outdated deps", "select all
  workspaces"), or wants to security-audit dependencies ("which
  packages have CVEs", "check for malware/typosquats", "what can run
  shell commands or hit the network").
allowed-tools: [Read, Grep]
context: fork
---

# DSS Query Helper

Run DSS queries via `vlt query '<selector>'`.

## Response style

**Be concise, but teach one thing.** Give the query first, then a
one-line explanation. No long preambles, no exhaustive alternatives —
but don't dead-end either: close with a short **Examples** tail of 1–2
adjacent queries (one step broader, narrower, or a sibling concept).
Users learn DSS through adjacent examples, and each answer is a chance
to build that intuition cheaply. Keep the tail bare — a query plus a
few-word label, no surrounding prose; the whole answer should still
read in seconds.

Two more rules:

- **Gloss jargon in place.** Readers may not know DSS terms — on first
  use, give a 2–4 word parenthetical instead of assuming: "`:root`
  anchors the match (starts it) at your project root", "`>` (direct
  deps only)". Never a terminology lecture, just the aside.
- **End with a docs deep link** so the answer has a "learn more" exit.
  Use the verified map in [Full reference](#full-reference) below —
  link the section relevant to the query, not the docs homepage.

Example answer shape:

> ```
> vlt query ':root > :outdated(major)'
> ```
>
> Direct dependencies with a newer major version available.
>
> Examples:
>
> - `vlt query ':root > :outdated'` — any newer version, not just
>   major
> - `vlt query ':outdated(major)'` — whole graph, not just direct
>
> Add `--view=json` for machine-readable output. More:
> <https://docs.vlt.io/cli/selectors/>

## Workflow

1. **Clarify intent first** if the goal is ambiguous — ask 1–2 short
   questions, never a survey. Pin down:
   - **What to match**: which packages? Whole graph or just direct
     deps? Everywhere, or only under a specific workspace/package?
   - **Expected outcome**: what does the result set look like if the
     query works — a handful of known offenders, every workspace, one
     package? What will they do with it (audit, remove, report)? Skip
     this when the request is already specific — don't interrogate
     someone who said "direct deps of root with an MIT license".
2. **Compose the query** with the steps below. Then:
   - Show the query.
   - Explain each piece in one short sentence.
   - State what the results should look like, so the user can tell
     whether it worked.
   - Close with the **Examples** tail (1–2 adjacent queries).
3. **"What does this query do?"**: decompose left to right, one line
   per segment. Offer 1–2 example queries the user could try next.
4. **Correcting a mistaken query?** Add one line on _why_ it was
   wrong, not just the fix — e.g. combinators point from dependent to
   dependency (parent `>` child), so `#x > *` selects x's
   dependencies, not its dependents. The rule transfers; the fix alone
   doesn't.
5. **Uncertain match?** Offer to run it: `vlt query '<selector>'`
   (always single-quote the selector in the shell). Output format:
   `--view=human|json|mermaid|svg|png|count` — defaults to human (json
   when piped).
6. **Iterate**: compare results against the expected outcome from step
   1 — too broad/narrow means refine one piece at a time (add a
   combinator, a pseudo-state, or `:not()`).

## Composing a query from a goal

Build left to right, in this order — each step is optional:

1. **Anchor** — where in the graph? `:root` (top level), `:workspace`,
   `:project`, `#pkg-name`, or nothing (whole graph).
2. **Traverse** — what relationship? `>` direct deps, ` ` (space)
   anything beneath, `~` siblings. Skip to filter the anchor itself.
3. **Filter** — chain conditions with no space = AND: attribute
   (`[license=MIT]`), state (`:dev`), functional (`:outdated(major)`),
   negation (`:not(...)`).
4. **Union** — need OR? Join complete selectors with commas.
5. **Invert direction** — "what depends on X?" flips traversal: use
   `:has(> #x)` (dependents of x), not `#x > *` (dependencies of x).

Worked example — "prod deps of my workspaces with a copyleft license":
`:workspace` (anchor) + `>` (direct) + `:prod:license(copyleft)`
(filters) → `vlt query ':workspace > :prod:license(copyleft)'`

## Core syntax (mental model: CSS, but nodes are packages)

| Piece                               | Meaning                                     | Example                  |
| ----------------------------------- | ------------------------------------------- | ------------------------ |
| `[name=foo]` / `#foo`               | match by package.json field / name shortcut | `[version^=2]`, `#react` |
| `>`                                 | direct dependency                           | `:root > *`              |
| ` ` (space)                         | any transitive dependency                   | `:root [name=js-tokens]` |
| `~`                                 | sibling (shares a parent)                   | `[name=react] ~ *`       |
| `:root` `:project` `:workspace`     | graph anchors                               | `:workspace > :dev`      |
| `:prod` `:dev` `:optional` `:peer`  | dependency type                             | `:dev:outdated`          |
| `:has()` `:not()` `:is()`           | structural filters                          | `:has(> :cve(*))`        |
| `:outdated()` `:semver()` `:type()` | functional filters                          | `:outdated(major)`       |
| `:malware` `:cve()` `:license()`    | security (Socket data, network call)        | `:license(copyleft)`     |
| `,`                                 | OR — union of selectors                     | `:dev, :optional`        |

Chaining without spaces is AND: `:workspace:private` = workspace AND
private.

## Common recipes

```bash
vlt query ':root > *'                    # direct dependencies
vlt query ':workspace'                   # select all workspaces
vlt query ':root > :outdated'            # outdated direct deps
vlt query '[name=react] *'               # everything react pulls in
vlt query ':has(> #react)'               # packages that directly depend on react
vlt query ':dev:eval'                    # dev deps using eval()
vlt query ':malware, :cve(*)'            # malware or any CVE
```

## Security auditing (Socket-powered)

DSS's sharpest feature: nodes are enriched with Socket insight data,
so the dependency graph doubles as a security scanner. Selectors group
into four families — compose them with anchors and combinators like
any other filter:

| Family          | Selectors                                                                        | Ask                                    |
| --------------- | -------------------------------------------------------------------------------- | -------------------------------------- |
| Threats         | `:malware` `:squat` `:obfuscated` `:suspicious`                                  | is anything actively hostile?          |
| Vulnerabilities | `:vuln(critical)` `:cve(CVE-…)` `:cve(*)` `:cwe(CWE-79)` `:severity(">=medium")` | known CVEs / vulns, filter by severity |
| Capabilities    | `:eval` `:network` `:fs` `:shell` `:env`                                         | what _can_ this code do?               |
| Hygiene         | `:abandoned` `:unmaintained` `:deprecated` `:score("<=0.5", "maintenance")`      | will this rot on us?                   |

Audit recipes:

```bash
vlt query ':malware, :vuln(critical), :squat, :obfuscated'   # supply-chain sweep
vlt query ':workspace > :prod:severity(">=high")'     # release blockers
vlt query ':dev:shell, :dev:network'                  # dev deps that spawn/phone home
```

All of these fetch Socket data over the network — expect latency on
first run.

## Gotchas

- `:workspace` matches workspaces declared in `vlt.json` — yarn/pnpm/
  bun-style workspace configs aren't read unless mirrored there.
- `:license(x)` takes a category (`copyleft`, `unlicensed`, `none`,
  …), never a license ID — for a specific license use the attribute
  form `[license=MIT]`.
- `:missing` matches edges (declarations), not nodes — no package
  output.
- Quote values with special chars: `[name^="@vltpkg"]`.

## Full reference

Selector-by-selector detail (all pseudo-classes, security insights,
operators): see [REFERENCE.md](REFERENCE.md).

Canonical docs — deep-link the section that matches the query
(verified anchors; don't invent others):

| Query topic                               | Link                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| syntax, composition, anything structural  | <https://docs.vlt.io/cli/selectors/>                         |
| malware / typosquats / obfuscation        | <https://docs.vlt.io/cli/security#malware-detection>         |
| CVEs / CWEs / severity                    | <https://docs.vlt.io/cli/security#vulnerability-detection>   |
| capabilities (`:eval` `:network` `:fs` …) | <https://docs.vlt.io/cli/security#behavioral-security-risks> |
| license compliance                        | <https://docs.vlt.io/cli/security#license-compliance>        |
| security scores                           | <https://docs.vlt.io/cli/security#security-scoring>          |
