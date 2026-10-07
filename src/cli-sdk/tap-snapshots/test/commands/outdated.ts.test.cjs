/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/outdated.ts > TAP > checks whatever a --target query selects > result 1`] = `
Array [
  Object {
    "action": "vlt install foo@^2.0.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "major",
    "latest": "2.0.0",
    "location": ".",
    "name": "foo",
    "requires": Object {
      "node": ">=99",
      "peers": Object {
        "react": "^19.0.0",
      },
    },
    "security": Object {
      "current": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "cve-1",
            "severity": "high",
            "type": "cve",
          },
        ],
        "score": 90,
      },
      "latest": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "mal-1",
            "severity": "critical",
            "type": "malware",
          },
        ],
        "score": 30,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 90,
      },
    },
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.2.0",
  },
  Object {
    "current": "1.0.0",
    "dependent": "foo@1.0.0",
    "heldBy": Array [
      Object {
        "dependent": "bar@1.0.0",
        "spec": "~1.0.0",
      },
    ],
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": "./node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo",
    "name": "lodash",
    "security": Object {
      "current": Object {
        "alerts": Array [],
        "score": 50,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 50,
      },
    },
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "current": "1.0.0",
    "dependent": "bar@1.0.0",
    "heldBy": Array [
      Object {
        "dependent": "foo@1.0.0",
        "spec": "^1.0.0",
      },
    ],
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": "./node_modules/.vlt/~npm~bar@1.0.0/node_modules/bar",
    "name": "lodash",
    "security": Object {
      "current": Object {
        "alerts": Array [],
        "score": 50,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 50,
      },
    },
    "spec": "~1.0.0",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "action": "vlt install",
    "current": undefined,
    "dependent": "my-project",
    "inRange": true,
    "kind": "missing",
    "latest": "1.0.0",
    "location": ".",
    "name": "missing",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "action": "vlt update",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "minor",
    "latest": "1.5.0",
    "location": ".",
    "name": "notag",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.5.0",
  },
  Object {
    "action": "vlt install foo-two@npm:foo@^2.0.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "major",
    "latest": "2.0.0",
    "location": ".",
    "name": "foo-two",
    "requires": Object {
      "node": ">=99",
      "peers": Object {
        "react": "^19.0.0",
      },
    },
    "security": Object {
      "current": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "cve-1",
            "severity": "high",
            "type": "cve",
          },
        ],
        "score": 90,
      },
      "latest": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "mal-1",
            "severity": "critical",
            "type": "malware",
          },
        ],
        "score": 30,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 90,
      },
    },
    "spec": "npm:foo@^1.0.0",
    "type": "prod",
    "wanted": "1.2.0",
  },
  Object {
    "action": "vlt update",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "minor",
    "latest": "1.1.0",
    "location": ".",
    "name": "baz",
    "security": Object {
      "current": Object {
        "alerts": Array [],
        "score": 70,
      },
      "latest": Object {
        "alerts": Array [],
        "score": 70,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 70,
      },
    },
    "spec": "custom:baz@^1.0.0",
    "type": "prod",
    "wanted": "1.1.0",
  },
  Object {
    "action": "set the catalog entry for cat in vlt.json to ^2.0.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": ".",
    "name": "cat",
    "spec": "catalog:",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "action": "set the \\"tools\\" catalog entry for tool in vlt.json to ^2.0.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": ".",
    "name": "tool",
    "spec": "catalog:tools",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "action": "vlt update",
    "current": "2.0.0-beta.1",
    "dependent": "my-project",
    "inRange": true,
    "kind": "prerelease",
    "latest": "2.0.0",
    "location": ".",
    "name": "pre",
    "spec": "^2.0.0-beta.0",
    "type": "prod",
    "wanted": "2.0.0",
  },
  Object {
    "action": "vlt update",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "minor",
    "latest": "1.0.0",
    "location": ".",
    "name": "tagged",
    "spec": "next",
    "type": "prod",
    "wanted": "1.1.0",
  },
  Object {
    "action": "vlt update",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "patch",
    "latest": "1.0.1",
    "location": ".",
    "name": "patchy",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.0.1",
  },
  Object {
    "action": "vlt install unsat@^1.5.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": false,
    "kind": "minor",
    "latest": "1.5.0",
    "location": ".",
    "name": "unsat",
    "spec": "^5.0.0",
    "type": "prod",
    "wanted": undefined,
  },
  Object {
    "action": "vlt install gone@^9.9.9",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "major",
    "latest": "9.9.9",
    "location": ".",
    "name": "gone",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.1.0",
  },
  Object {
    "action": "vlt install pinned@^1.1.0 --save-dev",
    "current": "1.0.0",
    "dependent": "my-project",
    "deprecated": "use 1.1.0",
    "inRange": false,
    "kind": "minor",
    "latest": "1.1.0",
    "location": ".",
    "name": "pinned",
    "security": Object {
      "current": Object {
        "alerts": Array [],
        "score": 80,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 80,
      },
    },
    "spec": "1.0.0",
    "type": "dev",
    "wanted": "1.0.0",
  },
  Object {
    "action": "vlt install foo@^2.0.0 --workspace=packages/a",
    "current": "1.0.0",
    "dependent": "a",
    "inRange": true,
    "kind": "major",
    "latest": "2.0.0",
    "location": "./packages/a",
    "name": "foo",
    "requires": Object {
      "node": ">=99",
    },
    "security": Object {
      "current": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "cve-1",
            "severity": "high",
            "type": "cve",
          },
        ],
        "score": 90,
      },
      "latest": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "mal-1",
            "severity": "critical",
            "type": "malware",
          },
        ],
        "score": 30,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 90,
      },
    },
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.2.0",
  },
  Object {
    "action": "set the catalog entry for cat in vlt.json to ^2.0.0",
    "current": "1.0.0",
    "dependent": "a",
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": "./packages/a",
    "name": "cat",
    "spec": "catalog:",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "action": "set the \\"tools\\" catalog entry for tool in vlt.json to ^2.0.0",
    "current": "1.0.0",
    "dependent": "a",
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": "./packages/a",
    "name": "tool",
    "spec": "catalog:tools",
    "type": "prod",
    "wanted": "1.0.0",
  },
]
`

exports[`test/commands/outdated.ts > TAP > must match snapshot 1`] = `
Usage:

\`\`\`
vlt outdated
vlt outdated [package-names...]
vlt outdated [--target=<query>] [--workspace=<path>]
vlt outdated [--view=human | json | count]
\`\`\`

List dependencies that have newer versions available, and what is keeping them from being upgraded.

For every registry dependency, compare the installed version against the highest version that satisfies the declared range (wanted) and against the registry's \`latest\` dist-tag (latest). Only dependencies that are missing or behind on either count are reported.

Each report goes beyond the version numbers:

- the size of the jump (major, minor, patch)
- whether the installed version is deprecated
- security scores and alerts for the installed, wanted and latest versions, so an upgrade that fixes a vulnerability or one that introduces a flagged version stands out
- other dependents whose ranges hold the package back
- engine and peer dependency requirements of the latest version that this project does not meet
- the command that performs the upgrade

By default the direct dependencies of the project root and its workspaces are checked; --workspace and --workspace-group narrow that to the given workspaces. The --target option accepts a DSS query selector instead, which can reach any dependency in the graph. Package names given as positional arguments filter either selection.

The installed versions come from the graph built by \`vlt install\`, so the project must be installed by vlt first. Dependencies that do not resolve against a registry (git, file, remote tarball or workspace specs) are not checked. Catalog specs are checked against the range the catalog resolves them to.

## Examples

Report outdated direct dependencies of the project and all its workspaces

\`\`\`
vlt outdated
\`\`\`

Only check the dependencies named 'react' and 'react-dom'

\`\`\`
vlt outdated react react-dom
\`\`\`

Only check the dependencies of a single workspace

\`\`\`
vlt outdated --workspace=packages/app
\`\`\`

Check every dependency in the graph, transitive ones included

\`\`\`
vlt outdated --target="*"
\`\`\`

Only check the dev dependencies of the project root

\`\`\`
vlt outdated --target=":root > *:dev"
\`\`\`

Only check dependencies with known vulnerabilities

\`\`\`
vlt outdated --target="*:vuln"
\`\`\`

Print the report as JSON

\`\`\`
vlt outdated --view=json
\`\`\`

## Options

### target

DSS query selector choosing the dependencies to check, in place of the direct dependencies of the selected importers.

\`\`\`
--target=<query>
\`\`\`

### workspace

Limit the report to the dependencies of the given workspace(s).

\`\`\`
--workspace=<path>
\`\`\`

### workspace-group

Limit the report to the dependencies of the workspaces in the given group(s).

\`\`\`
--workspace-group=<name>
\`\`\`

### view

Output format. Defaults to human-readable or json if no tty. Count outputs the number of outdated dependencies.

\`\`\`
--view=[human | json | count]
\`\`\`

`

exports[`test/commands/outdated.ts > TAP > reports outdated direct dependencies > result 1`] = `
Array [
  Object {
    "action": "vlt install foo@^2.0.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "major",
    "latest": "2.0.0",
    "location": ".",
    "name": "foo",
    "requires": Object {
      "node": ">=99",
      "peers": Object {
        "react": "^19.0.0",
      },
    },
    "security": Object {
      "current": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "cve-1",
            "severity": "high",
            "type": "cve",
          },
        ],
        "score": 90,
      },
      "latest": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "mal-1",
            "severity": "critical",
            "type": "malware",
          },
        ],
        "score": 30,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 90,
      },
    },
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.2.0",
  },
  Object {
    "action": "vlt install",
    "current": undefined,
    "dependent": "my-project",
    "inRange": true,
    "kind": "missing",
    "latest": "1.0.0",
    "location": ".",
    "name": "missing",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "action": "vlt update",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "minor",
    "latest": "1.5.0",
    "location": ".",
    "name": "notag",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.5.0",
  },
  Object {
    "action": "vlt install foo-two@npm:foo@^2.0.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "major",
    "latest": "2.0.0",
    "location": ".",
    "name": "foo-two",
    "requires": Object {
      "node": ">=99",
      "peers": Object {
        "react": "^19.0.0",
      },
    },
    "security": Object {
      "current": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "cve-1",
            "severity": "high",
            "type": "cve",
          },
        ],
        "score": 90,
      },
      "latest": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "mal-1",
            "severity": "critical",
            "type": "malware",
          },
        ],
        "score": 30,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 90,
      },
    },
    "spec": "npm:foo@^1.0.0",
    "type": "prod",
    "wanted": "1.2.0",
  },
  Object {
    "action": "vlt update",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "minor",
    "latest": "1.1.0",
    "location": ".",
    "name": "baz",
    "security": Object {
      "current": Object {
        "alerts": Array [],
        "score": 70,
      },
      "latest": Object {
        "alerts": Array [],
        "score": 70,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 70,
      },
    },
    "spec": "custom:baz@^1.0.0",
    "type": "prod",
    "wanted": "1.1.0",
  },
  Object {
    "action": "set the catalog entry for cat in vlt.json to ^2.0.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": ".",
    "name": "cat",
    "spec": "catalog:",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "action": "set the \\"tools\\" catalog entry for tool in vlt.json to ^2.0.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": ".",
    "name": "tool",
    "spec": "catalog:tools",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "action": "vlt update",
    "current": "2.0.0-beta.1",
    "dependent": "my-project",
    "inRange": true,
    "kind": "prerelease",
    "latest": "2.0.0",
    "location": ".",
    "name": "pre",
    "spec": "^2.0.0-beta.0",
    "type": "prod",
    "wanted": "2.0.0",
  },
  Object {
    "action": "vlt update",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "minor",
    "latest": "1.0.0",
    "location": ".",
    "name": "tagged",
    "spec": "next",
    "type": "prod",
    "wanted": "1.1.0",
  },
  Object {
    "action": "vlt update",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "patch",
    "latest": "1.0.1",
    "location": ".",
    "name": "patchy",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.0.1",
  },
  Object {
    "action": "vlt install unsat@^1.5.0",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": false,
    "kind": "minor",
    "latest": "1.5.0",
    "location": ".",
    "name": "unsat",
    "spec": "^5.0.0",
    "type": "prod",
    "wanted": undefined,
  },
  Object {
    "action": "vlt install gone@^9.9.9",
    "current": "1.0.0",
    "dependent": "my-project",
    "inRange": true,
    "kind": "major",
    "latest": "9.9.9",
    "location": ".",
    "name": "gone",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.1.0",
  },
  Object {
    "action": "vlt install pinned@^1.1.0 --save-dev",
    "current": "1.0.0",
    "dependent": "my-project",
    "deprecated": "use 1.1.0",
    "inRange": false,
    "kind": "minor",
    "latest": "1.1.0",
    "location": ".",
    "name": "pinned",
    "security": Object {
      "current": Object {
        "alerts": Array [],
        "score": 80,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 80,
      },
    },
    "spec": "1.0.0",
    "type": "dev",
    "wanted": "1.0.0",
  },
  Object {
    "action": "vlt install foo@^2.0.0 --workspace=packages/a",
    "current": "1.0.0",
    "dependent": "a",
    "inRange": true,
    "kind": "major",
    "latest": "2.0.0",
    "location": "./packages/a",
    "name": "foo",
    "requires": Object {
      "node": ">=99",
    },
    "security": Object {
      "current": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "cve-1",
            "severity": "high",
            "type": "cve",
          },
        ],
        "score": 90,
      },
      "latest": Object {
        "alerts": Array [
          Object {
            "category": "security",
            "key": "mal-1",
            "severity": "critical",
            "type": "malware",
          },
        ],
        "score": 30,
      },
      "wanted": Object {
        "alerts": Array [],
        "score": 90,
      },
    },
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.2.0",
  },
  Object {
    "action": "set the catalog entry for cat in vlt.json to ^2.0.0",
    "current": "1.0.0",
    "dependent": "a",
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": "./packages/a",
    "name": "cat",
    "spec": "catalog:",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "action": "set the \\"tools\\" catalog entry for tool in vlt.json to ^2.0.0",
    "current": "1.0.0",
    "dependent": "a",
    "inRange": false,
    "kind": "major",
    "latest": "2.0.0",
    "location": "./packages/a",
    "name": "tool",
    "spec": "catalog:tools",
    "type": "prod",
    "wanted": "1.0.0",
  },
]
`

exports[`test/commands/outdated.ts > TAP > views > human view of the full report 1`] = `
Package  Current       Wanted   Latest  Type  Dependent   Why
foo      1.0.0         1.2.0    2.0.0   prod  my-project  major, wanted fixes 1 serious alert, latest fixes 1 serious alert, latest adds 1 serious alert, latest score 30 (from 90), latest needs node >=99, latest needs react@^19.0.0
missing  missing       1.0.0    1.0.0   prod  my-project
notag    1.0.0         1.5.0    1.5.0   prod  my-project  minor
foo-two  1.0.0         1.2.0    2.0.0   prod  my-project  major, wanted fixes 1 serious alert, latest fixes 1 serious alert, latest adds 1 serious alert, latest score 30 (from 90), latest needs node >=99, latest needs react@^19.0.0
baz      1.0.0         1.1.0    1.1.0   prod  my-project  minor
cat      1.0.0         1.0.0    2.0.0   prod  my-project  major
tool     1.0.0         1.0.0    2.0.0   prod  my-project  major
pre      2.0.0-beta.1  2.0.0    2.0.0   prod  my-project  prerelease
tagged   1.0.0         1.1.0    1.0.0   prod  my-project  minor
patchy   1.0.0         1.0.1    1.0.1   prod  my-project  patch
unsat    1.0.0         missing  1.5.0   prod  my-project  minor
gone     1.0.0         1.1.0    9.9.9   prod  my-project  major
pinned   1.0.0         1.0.0    1.1.0   dev   my-project  minor, deprecated
foo      1.0.0         1.2.0    2.0.0   prod  a           major, wanted fixes 1 serious alert, latest fixes 1 serious alert, latest adds 1 serious alert, latest score 30 (from 90), latest needs node >=99
cat      1.0.0         1.0.0    2.0.0   prod  a           major
tool     1.0.0         1.0.0    2.0.0   prod  a           major

Run \`vlt update\` to pick up 10 in-range updates.
Run \`vlt install foo@^2.0.0 foo-two@npm:foo@^2.0.0 unsat@^1.5.0 gone@^9.9.9\` to move to latest.
Run \`vlt install pinned@^1.1.0 --save-dev\` to move to latest.
Run \`vlt install foo@^2.0.0 --workspace=packages/a\` to move to latest.
Set the catalog entry for cat in vlt.json to ^2.0.0.
Set the "tools" catalog entry for tool in vlt.json to ^2.0.0.
`

exports[`test/commands/outdated.ts > TAP > views > human view of transitive dependencies 1`] = `
Package  Current  Wanted  Latest  Type  Dependent  Why
lodash   1.0.0    1.0.0   2.0.0   prod  foo@1.0.0  major, held by bar@1.0.0
lodash   1.0.0    1.0.0   2.0.0   prod  bar@1.0.0  major, held by foo@1.0.0
`

exports[`test/commands/outdated.ts > TAP > views > human view with a single dependent and no actions 1`] = `
Package  Current  Wanted  Latest  Type  Why
foo      1.0.0    1.2.0   2.0.0   prod  major, latest score 70 (from 90)
bar      1.0.0    1.2.0   2.0.0   prod  minor, latest adds 1 serious alert

Run \`vlt update\` to pick up 1 in-range update.
`

exports[`test/commands/outdated.ts > TAP > views > human view with nothing outdated 1`] = `
All dependencies are up to date.
`
