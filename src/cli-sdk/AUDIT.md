# `vlt audit`

Check installed dependencies for security issues — malware, vulnerable
packages, and typosquats.

```bash
vlt audit
vlt audit --audit-level=high
vlt audit --view=json
```

| option          | values                                              | default |
| --------------- | --------------------------------------------------- | ------- |
| `--audit-level` | `low`, `medium` (or `moderate`), `high`, `critical` | `low`   |
| `--view`        | `human`, `json`, `count`                            | `human` |

Exits `1` when any finding is reported, `0` when none is, matching
npm/pnpm so it can gate CI directly.

## Output

```
high  nanoid@3.3.16
        vulnerability: high  CVE-2026-67213  GHSA-2v37-7h3g-55p8  CVSS 8.2
          nanoid: custom generators can loop indefinitely when size is zero
          affects < 3.3.18 -- patched in 3.3.18
        via @vltpkg/docs > @astrojs/tailwind > postcss > nanoid

3 packages with security issues        (a)
1 malware, 2 vulnerable                (b)
1 critical, 2 high                     (c)
1 actively exploited                   (d)

1 direct dependency, 2 transitive      (e)
238 of 240 installed versions scanned  (f)
```

A header line per package with its worst severity, then one line per
distinct finding, then where it sits in the graph. Every summary line
counts **packages** except (f), which counts installed versions.

- **(a)** packages with at least one finding, post-filtering
- **(b)** packages per category; a package with both a CVE and a
  malware alert adds to each, so (b) can exceed (a)
- **(c)** packages at their worst severity — mutually exclusive, so
  (c) always sums to (a)
- **(d)** packages with an actively exploited finding, a subset of (a)
- **(e)** direct vs transitive, summing to (a)
- **(f)** scan coverage over the whole graph

## Requirements

- Report malware, vulnerabilities, and typosquats across the installed
  graph, with a severity floor for CI use.
- Every finding must carry an actionable next step, or say plainly
  that there isn't one.
- Never let a severe finding disappear because of a filter, a spelling
  mismatch, or a default.
- Never claim more confidence than the data supports — including about
  how much of the tree was actually scanned.
- Terminal output is untrusted third-party text and must be safe to
  render.

## Decisions

### Severity

**Severity comes from each alert's own `severity` field**, and a
package is filed at its worst. The wire scale spells the middle level
`middle`; left untranslated it matched no rank, so a package whose
worst finding was `middle` was filed under `low`.

**An unrecognized severity is not defaulted to `low`.** Malware is
treated as `critical`, everything else `low`, and a warning is emitted
either way. The default would have been silent data loss: a feed
spelling a malware severity `moderate` would vanish under
`--audit-level=high` and the command would exit `0`.

**`moderate` is an npm-compatible alias for `medium`, normalized in
`commands/audit.ts`, not `definition.ts`.** jackspeak offers a
`validate` hook but no `normalize`, so the value arrives as typed;
`definition.ts` only accepts it. Left unresolved it fell through to
the `low` default, reporting every low-severity finding under
`--audit-level=moderate`.

### Filtering

**Alerts the feed marks `action: "ignore"` are never surfaced** — no
row, no count. They are the large majority (capability signals like
`envVars` on ordinary packages) and bury real findings. Filtered in
`getPackageAlerts`, the single point alerts enter, so bucketing,
counts, and rendered rows cannot disagree about which alerts exist. A
package whose every alert is ignored drops out entirely.

**CISA KEV findings are exempt from `--audit-level`.** They keep the
severity the feed assigned — we don't second-guess it — but are
reported, badged, and counted below the threshold, so a gate on
`--audit-level=critical` can't silently discard something being
exploited right now. It is also called out in the summary, since a
badge on one detail line is easily scrolled past.

**Discovery is narrower than reporting.** The query matches only
malware, vulnerability, and squat selectors; every other alert on a
matched package is then reported in full. `:scripts` was deliberately
excluded — nothing consumes lifecycle-script findings, so matching
them did work for no visible output. Not widened to `:obfuscated`,
`:unmaintained`, or `:deprecated`: a package whose only issue is one
of those does not appear at all.

### Counting

**Counts are per package, never per alert.** They render directly
above a line that counts packages, and adjacent count lines read as
the same unit. Counting alerts also multiplied single findings — one
CVE sets both `insights.severity` and `insights.vuln`, so the
synthetic path emits two alerts for it.

**The summary prints after the findings**, since the counts are the
conclusion you read once the detail has scrolled past.

**Scan coverage is measured over the whole graph, not the results.**
Every result matched a security selector and so by definition had feed
data; counting results would claim near-total coverage whatever the
truth. It survives `--audit-level` filtering, because it describes the
graph rather than the findings. Always printed — "no issues found"
means much less if a tenth of the tree was never looked at.

### Presentation

**Path counts, not path lists.** One route prints inline as
`via a > b > c`; beyond that, `reached by N paths`. Listing forty
routes buries the finding, and showing one arbitrary route understates
it, since acting on that route alone leaves the version installed via
the rest. A truncated count renders `N+`, never a bare `N`.

**Advisory output is title, CVSS score, advisory link, and
affected/patched versions — not the description**, which runs to
paragraphs and belongs on the linked page. The feed's
`fix.description` is also dropped: it reads "run `npx socket fix`",
pointing at another package manager.

**Only direct dependencies get a copy-pasteable install command**,
pinned to the exact patched version. A transitive package's version is
chosen by its dependents, and we have not verified a release of the
dependent exists whose range admits the patch, so `reachable:` /
`blocked:` reports what the local graph does establish and leaves the
call to the reader. A suggested version must parse as semver before it
reaches a command line.

**Findings describe mechanism, not impact.** There is no "remote code
execution" category. `shell access` + `network access` +
`install script` is equally the shape of a malicious postinstall and
of a legitimate native build, so audit reports the capability and
infers nothing about its use.

**Findings group and collapse by alert `type`, not `category`.**
Category is the coarse grouping — every supply-chain finding is
`supplyChainRisk` — so grouping by it rendered distinct alerts as
identical lines that collapsed into a meaningless count. Malware is
likewise matched on `type`: filed under a supply-chain category, it
counted nowhere, so detail rows read "malware: critical" while the
headline said zero.

**Alert types are relabeled for humans.** `urlStrings` and
`gptDidYouMean` are API vocabulary. Unknown types fall back to the raw
type, so a newly added upstream alert still reports rather than
vanishing.

**Links are gated on colors, not terminal detection.** With colors
off, the URL is printed beside the id, since a hidden hyperlink is
useless in piped output.

## Implementation

[`src/audit-helpers.ts`](./src/audit-helpers.ts),
[`src/commands/audit.ts`](./src/commands/audit.ts), and the
`audit-level` option in
[`src/config/definition.ts`](./src/config/definition.ts).

`vlt query`'s security-summary footer shares the same aggregator and
calls it _without_ a security archive, so the synthetic-alert fallback
in `getPackageAlerts` is load-bearing, not dead code.

Advisory text, package names, and versions are third-party input
rendered to a terminal, where control bytes are instructions rather
than characters. All of it passes through `safeText`/`safeUrl` in
[`src/safe-text.ts`](./src/safe-text.ts); `node:util`'s
`stripVTControlCharacters` is not sufficient alone, as it leaves a
bare `ESC`, `BEL`, `\r`, and `\n` intact.
