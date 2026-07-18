---
name: dss-query
description: Explain and compose vlt Dependency Selector Syntax (DSS) queries — CSS-selector-like strings for filtering packages in a dependency graph. Use when the user asks about DSS, `vlt query`, dependency selectors, or wants to find/filter packages (e.g. "find outdated deps", "which packages have CVEs", "select all workspaces").
---

# DSS Query Helper

Run DSS queries via `vlt query '<selector>'`.

## Response style

**Be concise and brief.** Give the query first, then a one-line explanation.
No long preambles, no exhaustive alternatives. Example answer shape:

> ```
> vlt query ':root > :outdated(major)'
> ```
> Direct dependencies with a newer major version available.

## Workflow

1. **Clarify intent first** if the goal is ambiguous — ask 1–2 short
   questions, never a survey. Pin down:
   - **What to match**: which packages? Whole graph or just direct deps?
     Everywhere, or only under a specific workspace/package?
   - **Expected outcome**: what does the result set look like if the query
     works — a handful of known offenders, every workspace, one package?
     What will they do with it (audit, remove, report)?
   Skip this when the request is already specific — don't interrogate
   someone who said "direct deps of root with an MIT license".
2. **Compose the query** with the steps below. Then:
   - Show the query.
   - Explain each piece in one short sentence.
   - State what the results should look like, so the user can tell whether
     it worked.
3. **"What does this query do?"**: decompose left to right, one line per
   segment.
4. **Uncertain match?** Offer to run it: `vlt query '<selector>'` (always
   single-quote the selector in the shell).
5. **Iterate**: compare results against the expected outcome from step 1 —
   too broad/narrow means refine one piece at a time (add a combinator, a
   pseudo-state, or `:not()`).

## Composing a query from a goal

Build left to right, in this order — each step is optional:

1. **Anchor** — where in the graph? `:root` (top level), `:workspace`,
   `:project`, `#pkg-name`, or nothing (whole graph).
2. **Traverse** — what relationship? `>` direct deps, ` ` (space) anything
   beneath, `~` siblings. Skip to filter the anchor itself.
3. **Filter** — chain conditions with no space = AND: attribute
   (`[license=MIT]`), state (`:dev`), functional (`:outdated(major)`),
   negation (`:not(...)`).
4. **Union** — need OR? Join complete selectors with commas.
5. **Invert direction** — "what depends on X?" flips traversal: use
   `:has(> #x)` (dependents of x), not `#x > *` (dependencies of x).

Worked example — "prod deps of my workspaces with a copyleft license":
`:workspace` (anchor) + `>` (direct) + `:prod:license(copyleft)` (filters)
→ `vlt query ':workspace > :prod:license(copyleft)'`

## Core syntax (mental model: CSS, but nodes are packages)

| Piece | Meaning | Example |
| --- | --- | --- |
| `[name=foo]` / `#foo` | match by package.json field / name shortcut | `[version^=2]`, `#react` |
| `>` | direct dependency | `:root > *` |
| ` ` (space) | any transitive dependency | `:root [name=js-tokens]` |
| `~` | sibling (shares a parent) | `[name=react] ~ *` |
| `:root` `:project` `:workspace` | graph anchors | `:workspace > :dev` |
| `:prod` `:dev` `:optional` `:peer` | dependency type | `:dev:outdated` |
| `:has()` `:not()` `:is()` | structural filters | `:has(> :cve(*))` |
| `:outdated()` `:semver()` `:type()` | functional filters | `:outdated(major)` |
| `:malware` `:cve()` `:license()` | security (Socket data, network call) | `:license(copyleft)` |
| `,` | OR — union of selectors | `:dev, :optional` |

Chaining without spaces is AND: `:workspace:private` = workspace AND private.

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

## Gotchas

- `:missing` matches edges (declarations), not nodes — no package output.
- Security selectors (`:cve`, `:malware`, `:score`, …) fetch Socket data over
  the network; expect latency.
- Quote values with special chars: `[name^="@vltpkg"]`.

## Full reference

Selector-by-selector detail (all pseudo-classes, security insights, operators):
see [REFERENCE.md](REFERENCE.md). Canonical docs: https://docs.vlt.io/cli/selectors/
