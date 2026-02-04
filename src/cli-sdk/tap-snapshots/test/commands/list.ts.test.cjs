/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/list.ts > TAP > list > --target option > should accept attribute selector 1`] = `
my-project
└── bar@1.0.0

`

exports[`test/commands/list.ts > TAP > list > --target option > should accept combinator selectors 1`] = `
my-project
├── @foo/bazz@1.0.0
└── bar@1.0.0

`

exports[`test/commands/list.ts > TAP > list > --target option > should accept ID selector 1`] = `
my-project
└── bar@1.0.0

`

exports[`test/commands/list.ts > TAP > list > --target option > should accept pseudo-element selectors 1`] = `
my-project
├── @foo/bazz@1.0.0
└── bar@1.0.0

`

exports[`test/commands/list.ts > TAP > list > --target option > should accept wildcard selector 1`] = `
my-project
├── @foo/bazz@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── @foo/bazz@1.0.0
└── missing@^1.0.0 (missing)

`

exports[`test/commands/list.ts > TAP > list > --target option > should handle complex query string 1`] = `
my-project
├── @foo/bazz@1.0.0
└── bar@1.0.0

`

exports[`test/commands/list.ts > TAP > list > --target option > should use --target over positional arguments 1`] = `
my-project
├── @foo/bazz@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── @foo/bazz@1.0.0
└── missing@^1.0.0 (missing)

`

exports[`test/commands/list.ts > TAP > list > --target option > should work with json output 1`] = `
[
  {
    "name": "my-project",
    "to": {
      "id": "file~_d",
      "name": "my-project",
      "version": "1.0.0",
      "location": ".",
      "importer": true,
      "manifest": {
        "name": "my-project",
        "version": "1.0.0",
        "dependencies": {
          "@foo/bazz": "^1.0.0",
          "bar": "^1.0.0",
          "missing": "^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "buildState": "none",
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  }
]
`

exports[`test/commands/list.ts > TAP > list > colors > should use colors when set in human readable format 1`] = `
[0mmy-project
├── @foo/bazz@1.0.0
└── bar@1.0.0
[0m
`

exports[`test/commands/list.ts > TAP > list > default query string selection logic > should select the correct workspace based on default query logic 1`] = `
a

`

exports[`test/commands/list.ts > TAP > list > package names as positionals > should accept package name starting with numbers 1`] = `

`

exports[`test/commands/list.ts > TAP > list > package names as positionals > should accept package name with dashes 1`] = `

`

exports[`test/commands/list.ts > TAP > list > package names as positionals > should accept scoped package name 1`] = `

`

exports[`test/commands/list.ts > TAP > list > package names as positionals > should accept simple package name 1`] = `

`

exports[`test/commands/list.ts > TAP > list > running from homedir > should list all projects deps 1`] = `
local
└── my-project@1.0.0

`

exports[`test/commands/list.ts > TAP > list > running from homedir > should read project from host context 1`] = `
my-project

`

exports[`test/commands/list.ts > TAP > list > scope with a transitive dependency > should handle scope with a transitive dependency 1`] = `
foo

`

exports[`test/commands/list.ts > TAP > list > scope with workspaces > should handle scope with workspaces correctly 1`] = `
workspace-a

`

exports[`test/commands/list.ts > TAP > list > should have usage 1`] = `
Usage:
  vlt ls
  vlt ls [package-names...] [--view=human | json | mermaid | count]
  vlt ls [--scope=<query>] [--target=<query>] [--view=human | json | mermaid |
  count]

List installed dependencies matching given package names or query selectors.

Package names provided as positional arguments will be used to filter the
results to show only dependencies with those names.

The --scope and --target options accepts DSS query selectors to filter packages.
Using --scope, you can specify which packages to treat as the top-level items in
the output graph. The --target option allows you to filter what dependencies to
include in the output. Using both options allows you to render subgraphs of the
dependency graph.

Defaults to listing direct dependencies of a project and any configured
workspace.

  Examples

    List direct dependencies of the current project / workspace

    ​vlt ls

    List all dependencies named 'foo', 'bar', or 'baz'

    ​vlt ls foo bar baz

    Defines a direct dependency as the output top-level scope

    ​vlt ls --scope=":root > #dependency-name"

    List all dependencies using a query selector

    ​vlt ls --target="*"

    List all peer dependencies of all workspaces

    ​vlt ls --target=":workspace > *:peer"

  Options

    scope
      Query selector to select top-level packages using the DSS query language
      syntax.

      ​--scope=<query>

    target
      Query selector to filter packages using the DSS query language syntax.

      ​--target=<query>

    view
      Output format. Defaults to human-readable or json if no tty. Count outputs
      the number of dependency relationships in the result.

      ​--view=[human | json | mermaid | count]

`

exports[`test/commands/list.ts > TAP > list > should list all pkgs in human format 1`] = `
my-project
├── @foo/bazz@1.0.0
└─┬ bar@1.0.0
  └─┬ baz (custom:baz@1.0.0)
    └── @foo/bazz@1.0.0

`

exports[`test/commands/list.ts > TAP > list > should list mermaid in json format 1`] = `
flowchart TD
a("root:my-project")
a -->|"#64;foo/bazz#64;^1.0.0"| b("npm:#64;foo/bazz#64;1.0.0")
a -->|"bar#64;^1.0.0"| c("npm:bar#64;1.0.0")
c -->|"baz#64;custom:baz#64;^1.0.0"| d("custom:baz#64;1.0.0")
d -->|"#64;foo/bazz#64;^1.0.0"| b
`

exports[`test/commands/list.ts > TAP > list > should list pkgs in human readable format 1`] = `
my-project
├── @foo/bazz@1.0.0
└── bar@1.0.0

`

exports[`test/commands/list.ts > TAP > list > should list pkgs in human readable format 2`] = `
my-project
├── @foo/bazz@1.0.0
└── bar@1.0.0

`

exports[`test/commands/list.ts > TAP > list > should list pkgs in json format 1`] = `
[
  {
    "name": "@foo/bazz",
    "fromID": "file~_d",
    "spec": "@foo/bazz@^1.0.0",
    "type": "prod",
    "to": {
      "id": "~npm~@foo+bazz@1.0.0",
      "name": "@foo/bazz",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/~npm~@foo+bazz@1.0.0/node_modules/@foo/bazz",
      "importer": false,
      "manifest": {
        "name": "@foo/bazz",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "buildState": "none",
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "bar",
    "fromID": "file~_d",
    "spec": "bar@^1.0.0",
    "type": "prod",
    "to": {
      "id": "~npm~bar@1.0.0",
      "name": "bar",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/~npm~bar@1.0.0/node_modules/bar",
      "importer": false,
      "manifest": {
        "name": "bar",
        "version": "1.0.0",
        "dependencies": {
          "baz": "^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "buildState": "none",
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  }
]
`

exports[`test/commands/list.ts > TAP > list > should list pkgs in json format 2`] = `
[
  {
    "name": "@foo/bazz",
    "fromID": "file~_d",
    "spec": "@foo/bazz@^1.0.0",
    "type": "prod",
    "to": {
      "id": "~npm~@foo+bazz@1.0.0",
      "name": "@foo/bazz",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/~npm~@foo+bazz@1.0.0/node_modules/@foo/bazz",
      "importer": false,
      "manifest": {
        "name": "@foo/bazz",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "buildState": "none",
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "bar",
    "fromID": "file~_d",
    "spec": "bar@^1.0.0",
    "type": "prod",
    "to": {
      "id": "~npm~bar@1.0.0",
      "name": "bar",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/~npm~bar@1.0.0/node_modules/bar",
      "importer": false,
      "manifest": {
        "name": "bar",
        "version": "1.0.0",
        "dependencies": {
          "baz": "^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "buildState": "none",
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  }
]
`

exports[`test/commands/list.ts > TAP > list > should list pkgs in mermaid format 1`] = `
flowchart TD
a("root:my-project")
a -->|"#64;foo/bazz#64;^1.0.0"| b("npm:#64;foo/bazz#64;1.0.0")
a -->|"bar#64;^1.0.0"| c("npm:bar#64;1.0.0")
c -->|"baz#64;custom:baz#64;^1.0.0"| d("custom:baz#64;1.0.0")
d -->|"#64;foo/bazz#64;^1.0.0"| b
`

exports[`test/commands/list.ts > TAP > list > workspaces > should add all scope nodes as importers 1`] = `
[
  {
    "name": "b",
    "fromID": "file~_d",
    "spec": "b@workspace:*",
    "type": "prod",
    "to": {
      "id": "workspace~packages+b",
      "name": "b",
      "version": "1.0.0",
      "location": "./packages/b",
      "importer": true,
      "manifest": {
        "name": "b",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "buildState": "none",
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "a",
    "fromID": "file~_d",
    "spec": "a@workspace:*",
    "type": "prod",
    "to": {
      "id": "workspace~packages+a",
      "name": "a",
      "version": "1.0.0",
      "location": "./packages/a",
      "importer": true,
      "manifest": {
        "name": "a",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "buildState": "none",
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  }
]
`

exports[`test/commands/list.ts > TAP > list > workspaces > should add scope nodes as importers 1`] = `
a

`

exports[`test/commands/list.ts > TAP > list > workspaces > should list single workspace 1`] = `
a

`

exports[`test/commands/list.ts > TAP > list > workspaces > should list workspaces in human readable format 1`] = `
my-project
├── a@1.0.0
└── b@1.0.0

`

exports[`test/commands/list.ts > TAP > list > workspaces > should list workspaces in json format 1`] = `
[
  {
    "name": "b",
    "fromID": "file~_d",
    "spec": "b@workspace:*",
    "type": "prod",
    "to": {
      "id": "workspace~packages+b",
      "name": "b",
      "version": "1.0.0",
      "location": "./packages/b",
      "importer": true,
      "manifest": {
        "name": "b",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "buildState": "none",
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "a",
    "fromID": "file~_d",
    "spec": "a@workspace:*",
    "type": "prod",
    "to": {
      "id": "workspace~packages+a",
      "name": "a",
      "version": "1.0.0",
      "location": "./packages/a",
      "importer": true,
      "manifest": {
        "name": "a",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "buildState": "none",
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  }
]
`

exports[`test/commands/list.ts > TAP > list > workspaces > should use specified workspace as scope selector 1`] = `
a

`
