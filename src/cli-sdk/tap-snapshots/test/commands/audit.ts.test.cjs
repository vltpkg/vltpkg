/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/audit.ts > TAP > command - default audit > human view (colors) 1`] = `
[1mSecurity Audit[22m

[2mSEVERITY  PACKAGE    TYPE           ISSUE[22m
[31m[1mcritical[22m[39m  foo@1.0.0  [36mmalware      [39m  known malware
[31mhigh    [39m  foo@1.0.0  [36mvulnerability[39m  high severity CVE (CVE-2023-1)
[33mmedium  [39m  bar@1.0.0  [36mmaintenance  [39m  deprecated
[33mmedium  [39m  baz@1.0.0  [36mlicense      [39m  copyleft license

[1mSummary:[22m [31m[1m1 critical[22m[39m, [31m1 high[39m, [33m2 moderate[39m across 3 packages (4 scanned).
[2mRun with --all to include low-severity capability findings.[22m
`

exports[`test/commands/audit.ts > TAP > command - default audit > human view (default opts) 1`] = `
Security Audit

SEVERITY  PACKAGE    TYPE           ISSUE
critical  foo@1.0.0  malware        known malware
high      foo@1.0.0  vulnerability  high severity CVE (CVE-2023-1)
medium    bar@1.0.0  maintenance    deprecated
medium    baz@1.0.0  license        copyleft license

Summary: 1 critical, 1 high, 2 moderate across 3 packages (4 scanned).
Run with --all to include low-severity capability findings.
`

exports[`test/commands/audit.ts > TAP > command - default audit > human view (no colors) 1`] = `
Security Audit

SEVERITY  PACKAGE    TYPE           ISSUE
critical  foo@1.0.0  malware        known malware
high      foo@1.0.0  vulnerability  high severity CVE (CVE-2023-1)
medium    bar@1.0.0  maintenance    deprecated
medium    baz@1.0.0  license        copyleft license

Summary: 1 critical, 1 high, 2 moderate across 3 packages (4 scanned).
Run with --all to include low-severity capability findings.
`

exports[`test/commands/audit.ts > TAP > command - default audit > json view 1`] = `
Object {
  "packagesAffected": 3,
  "packagesScanned": 4,
  "reports": Array [
    Object {
      "findings": Array [
        Object {
          "category": "malware",
          "description": "known malware",
          "severity": "critical",
        },
        Object {
          "category": "vulnerability",
          "description": "high severity CVE (CVE-2023-1)",
          "severity": "high",
        },
      ],
      "id": "~npm~foo@1.0.0",
      "location": "{LOC}",
      "name": "foo",
      "version": "1.0.0",
      "worst": "critical",
    },
    Object {
      "findings": Array [
        Object {
          "category": "maintenance",
          "description": "deprecated",
          "severity": "medium",
        },
      ],
      "id": "~npm~bar@1.0.0",
      "location": "{LOC}",
      "name": "bar",
      "version": "1.0.0",
      "worst": "medium",
    },
    Object {
      "findings": Array [
        Object {
          "category": "license",
          "description": "copyleft license",
          "severity": "medium",
        },
      ],
      "id": "~npm~baz@1.0.0",
      "location": "{LOC}",
      "name": "baz",
      "version": "1.0.0",
      "worst": "medium",
    },
  ],
  "summary": Object {
    "critical": 1,
    "high": 1,
    "low": 0,
    "medium": 2,
    "total": 4,
  },
}
`

exports[`test/commands/audit.ts > TAP > command - include low severity with --all > human view with low severity findings 1`] = `
Security Audit

SEVERITY  PACKAGE    TYPE           ISSUE
critical  foo@1.0.0  malware        known malware
high      foo@1.0.0  vulnerability  high severity CVE (CVE-2023-1)
medium    bar@1.0.0  maintenance    deprecated
medium    baz@1.0.0  license        copyleft license
low       qux@1.0.0  capability     uses eval

Summary: 1 critical, 1 high, 2 moderate, 1 low across 4 packages (4 scanned).
`

exports[`test/commands/audit.ts > TAP > human view - all severities, no version > renders every severity level without a version 1`] = `
[1mSecurity Audit[22m

[2mSEVERITY  PACKAGE  TYPE  ISSUE[22m
[31m[1mcritical[22m[39m  sole     [36mtest[39m  critical issue
[31mhigh    [39m  sole     [36mtest[39m  high issue
[33mmedium  [39m  sole     [36mtest[39m  medium issue
[2mlow     [22m  sole     [36mtest[39m  low issue

[1mSummary:[22m [31m[1m1 critical[22m[39m, [31m1 high[39m, [33m1 moderate[39m, [2m1 low[22m across 1 package (1 scanned).
`

exports[`test/commands/audit.ts > TAP > human view - no findings > no issues, one package scanned 1`] = `
Security Audit

✓ No security issues found across 1 scanned package.
`

exports[`test/commands/audit.ts > TAP > human view - no findings > no issues, zero packages scanned 1`] = `
[1mSecurity Audit[22m

[32m✓ No security issues found[39m across 0 scanned packages.
`

exports[`test/commands/audit.ts > TAP > insightsToFindings > covers every finding branch 1`] = `
Array [
  Object {
    "category": "malware",
    "description": "known malware",
    "severity": "critical",
  },
  Object {
    "category": "malware",
    "description": "AI-detected malware",
    "severity": "high",
  },
  Object {
    "category": "malware",
    "description": "AI-flagged security issue",
    "severity": "medium",
  },
  Object {
    "category": "malware",
    "description": "AI-flagged anomaly",
    "severity": "low",
  },
  Object {
    "category": "vulnerability",
    "description": "critical severity CVE (CVE-2020-1)",
    "severity": "critical",
  },
  Object {
    "category": "typosquat",
    "description": "likely typosquat",
    "severity": "high",
  },
  Object {
    "category": "integrity",
    "description": "manifest confusion",
    "severity": "high",
  },
  Object {
    "category": "code",
    "description": "obfuscated code",
    "severity": "medium",
  },
  Object {
    "category": "trust",
    "description": "suspicious activity",
    "severity": "medium",
  },
  Object {
    "category": "trust",
    "description": "flagged as undesirable",
    "severity": "medium",
  },
  Object {
    "category": "code",
    "description": "high-entropy strings",
    "severity": "low",
  },
  Object {
    "category": "code",
    "description": "minified, no source",
    "severity": "low",
  },
  Object {
    "category": "license",
    "description": "copyleft license",
    "severity": "medium",
  },
  Object {
    "category": "license",
    "description": "non-permissive license",
    "severity": "medium",
  },
  Object {
    "category": "license",
    "description": "unlicensed",
    "severity": "medium",
  },
  Object {
    "category": "license",
    "description": "no license found",
    "severity": "medium",
  },
  Object {
    "category": "license",
    "description": "license issues",
    "severity": "low",
  },
  Object {
    "category": "license",
    "description": "ambiguous license",
    "severity": "low",
  },
  Object {
    "category": "license",
    "description": "unidentified license",
    "severity": "low",
  },
  Object {
    "category": "maintenance",
    "description": "deprecated",
    "severity": "medium",
  },
  Object {
    "category": "maintenance",
    "description": "abandoned (missing author)",
    "severity": "medium",
  },
  Object {
    "category": "maintenance",
    "description": "unmaintained (5+ years)",
    "severity": "medium",
  },
  Object {
    "category": "maintenance",
    "description": "unpopular",
    "severity": "low",
  },
  Object {
    "category": "maintenance",
    "description": "unstable ownership",
    "severity": "low",
  },
  Object {
    "category": "maintenance",
    "description": "new / unknown author",
    "severity": "low",
  },
  Object {
    "category": "maintenance",
    "description": "trivial package",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "uses eval",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "shell access",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "network access",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "filesystem access",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "reads env vars",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "dynamic require",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "debug access",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "native code",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "telemetry",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "install scripts",
    "severity": "low",
  },
  Object {
    "category": "capability",
    "description": "bundles a shrinkwrap",
    "severity": "low",
  },
]
`

exports[`test/commands/audit.ts > TAP > usage > should have usage 1`] = `
Usage:
  vlt audit
  vlt audit <query> --view=<human | json>

Run a security audit of the installed dependency graph.

Uses the vlt Dependency Selector Syntax (the same engine that powers \`vlt
query\`) together with the Socket security database to surface packages that may
need attention: known malware, published vulnerabilities (CVEs), typosquats,
license problems, unmaintained or deprecated packages, and more.

By default it scans every package that has security metadata and reports any
finding with a severity of moderate or higher. Provide a DSS query as a
positional argument to audit a specific subset of the graph (for example
':workspace > *' to only audit your workspaces' direct dependencies).

  Examples

    Audit all installed dependencies

    ​vlt audit

    Only audit direct dependencies of your workspaces

    ​vlt audit ':workspace > *'

    Emit the audit report as JSON for tooling / CI

    ​vlt audit --view=json

    Include low-severity findings such as behavioral capabilities

    ​vlt audit --all

  Options

    all
      Include low-severity findings (behavioral capabilities, minor hygiene
      issues).

      ​--all

    view
      Output format. Defaults to human-readable, or json if there is no tty.

      ​--view=[human | json]

`
