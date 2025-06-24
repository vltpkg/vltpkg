/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/list.ts > TAP > list > colors > should use colors when set in human readable format 1`] = `
[0m[33mmy-project[39m
├── [33m@foo/bazz@1.0.0[39m
├─┬ [33mbar@1.0.0[39m
│ └─┬ [33mbaz (custom:baz@1.0.0)[39m
│   └── [33m@foo/bazz@1.0.0[39m
└── [33mmissing@^1.0.0[39m [31m(missing)[39m
[0m
`

exports[`test/commands/list.ts > TAP > list > should have usage 1`] = `
Usage:
  vlt ls
  vlt ls [query | specs] [--view=human | json | mermaid | gui]

List installed dependencies matching given package names or resulting packages
from matching a given Dependency Selector Syntax query if one is provided.

The vlt Dependency Selector Syntax is a CSS-like query language that allows you
to filter installed dependencies using a variety of metadata in the form of
CSS-like attributes, pseudo selectors & combinators.

Defaults to listing direct dependencies of a project and any configured
workspace.

  Examples

    List direct dependencies of the current project / workspace

    ​vlt ls

    List all dependencies for the current project / workspace

    ​vlt ls "*"

    List all dependencies named 'foo', 'bar', or 'baz'

    ​vlt ls foo bar baz

    Lists direct dependencies of a specific package

    ​vlt ls '[name="@scoped/package"] > *'

    List all peer dependencies of all workspaces

    ​vlt ls '*:workspace > *:peer'

  Options

    view
      Output format. Defaults to human-readable or json if no tty.

      ​--view=[human | json | mermaid | gui]

`

exports[`test/commands/list.ts > TAP > list > should list all pkgs in human format 1`] = `
my-project
├── @foo/bazz@1.0.0
└─┬ bar@1.0.0
  └─┬ baz (custom:baz@1.0.0)
    └── @foo/bazz@1.0.0

`

exports[`test/commands/list.ts > TAP > list > should list all pkgs in human readable format 1`] = `
my-project
├── @foo/bazz@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── @foo/bazz@1.0.0
└── missing@^1.0.0 (missing)

`

exports[`test/commands/list.ts > TAP > list > should list all pkgs in json format 1`] = `
[
  {
    "name": "my-project",
    "to": {
      "id": "file·.",
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
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "@foo/bazz",
    "fromID": "file·.",
    "spec": "@foo/bazz@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··@foo§bazz@1.0.0",
      "name": "@foo/bazz",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··@foo§bazz@1.0.0/node_modules/@foo/bazz",
      "importer": false,
      "manifest": {
        "name": "@foo/bazz",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "bar",
    "fromID": "file·.",
    "spec": "bar@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··bar@1.0.0",
      "name": "bar",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··bar@1.0.0/node_modules/bar",
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
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "baz",
    "fromID": "··bar@1.0.0",
    "spec": "baz@custom:baz@^1.0.0",
    "type": "prod",
    "to": {
      "id": "·custom·baz@1.0.0",
      "name": "baz",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/·custom·baz@1.0.0/node_modules/baz",
      "importer": false,
      "manifest": {
        "name": "baz",
        "version": "1.0.0",
        "dist": {
          "tarball": "https://registry.vlt.sh/baz"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "missing",
    "fromID": "file·.",
    "spec": "missing@^1.0.0",
    "type": "prod",
    "overridden": false
  },
  {
    "name": "@foo/bazz",
    "fromID": "·custom·baz@1.0.0",
    "spec": "@foo/bazz@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··@foo§bazz@1.0.0",
      "name": "@foo/bazz",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··@foo§bazz@1.0.0/node_modules/@foo/bazz",
      "importer": false,
      "manifest": {
        "name": "@foo/bazz",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  }
]
`

exports[`test/commands/list.ts > TAP > list > should list all pkgs in mermaid format 1`] = `
flowchart TD
a("root:my-project")
a("root:my-project") -->|"#64;foo/bazz#64;^1.0.0"| b("npm:#64;foo/bazz#64;1.0.0")
b("npm:#64;foo/bazz#64;1.0.0")
a("root:my-project") -->|"bar#64;^1.0.0"| c("npm:bar#64;1.0.0")
c("npm:bar#64;1.0.0")
c("npm:bar#64;1.0.0") -->|"baz#64;custom:baz#64;^1.0.0"| d("custom:baz#64;1.0.0")
d("custom:baz#64;1.0.0")
d("custom:baz#64;1.0.0") -->|"#64;foo/bazz#64;^1.0.0"| b("npm:#64;foo/bazz#64;1.0.0")

a("root:my-project") -->|"missing#64;^1.0.0"| missing-0(Missing)

`

exports[`test/commands/list.ts > TAP > list > should list mermaid in json format 1`] = `
flowchart TD
a("root:my-project")
a("root:my-project") -->|"#64;foo/bazz#64;^1.0.0"| b("npm:#64;foo/bazz#64;1.0.0")
b("npm:#64;foo/bazz#64;1.0.0")
a("root:my-project") -->|"bar#64;^1.0.0"| c("npm:bar#64;1.0.0")
c("npm:bar#64;1.0.0")
c("npm:bar#64;1.0.0") -->|"baz#64;custom:baz#64;^1.0.0"| d("custom:baz#64;1.0.0")
d("custom:baz#64;1.0.0")
d("custom:baz#64;1.0.0") -->|"#64;foo/bazz#64;^1.0.0"| b("npm:#64;foo/bazz#64;1.0.0")

`

exports[`test/commands/list.ts > TAP > list > should list pkgs in human readable format 1`] = `
my-project
├── @foo/bazz@1.0.0
└── bar@1.0.0

`

exports[`test/commands/list.ts > TAP > list > should list pkgs in json format 1`] = `
[
  {
    "name": "my-project",
    "to": {
      "id": "file·.",
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
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "@foo/bazz",
    "fromID": "file·.",
    "spec": "@foo/bazz@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··@foo§bazz@1.0.0",
      "name": "@foo/bazz",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··@foo§bazz@1.0.0/node_modules/@foo/bazz",
      "importer": false,
      "manifest": {
        "name": "@foo/bazz",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "bar",
    "fromID": "file·.",
    "spec": "bar@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··bar@1.0.0",
      "name": "bar",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··bar@1.0.0/node_modules/bar",
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
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  }
]
`

exports[`test/commands/list.ts > TAP > list > workspaces > should list single workspace 1`] = `
a

`

exports[`test/commands/list.ts > TAP > list > workspaces > should list workspaces in human readable format 1`] = `
my-project
b
a

`

exports[`test/commands/list.ts > TAP > list > workspaces > should list workspaces in json format 1`] = `
[
  {
    "name": "my-project",
    "to": {
      "id": "file·.",
      "name": "my-project",
      "version": "1.0.0",
      "location": ".",
      "importer": true,
      "manifest": {
        "name": "my-project",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false,
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "b",
    "to": {
      "id": "workspace·packages§b",
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
      "insights": {
        "scanned": false
      }
    },
    "overridden": false
  },
  {
    "name": "a",
    "to": {
      "id": "workspace·packages§a",
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
