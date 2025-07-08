/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/query.ts > TAP > query > --target option > should accept attribute selector 1`] = `
my-project
├── foo@1.0.0
└─┬ bar@1.0.0
  └─┬ baz (custom:baz@1.0.0)
    └── foo@1.0.0

`

exports[`test/commands/query.ts > TAP > query > --target option > should accept combinator selectors 1`] = `
my-project
├── foo@1.0.0
└── bar@1.0.0

`

exports[`test/commands/query.ts > TAP > query > --target option > should accept ID selector 1`] = `
my-project
├── foo@1.0.0
└─┬ bar@1.0.0
  └─┬ baz (custom:baz@1.0.0)
    └── foo@1.0.0

`

exports[`test/commands/query.ts > TAP > query > --target option > should accept pseudo-element selectors 1`] = `
my-project
├── foo@1.0.0
└── bar@1.0.0

`

exports[`test/commands/query.ts > TAP > query > --target option > should accept wildcard selector 1`] = `
my-project
├── foo@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── foo@1.0.0
└── missing@^1.0.0 (missing)

`

exports[`test/commands/query.ts > TAP > query > --target option > should handle complex query string 1`] = `
my-project
├── foo@1.0.0
└── bar@1.0.0

`

exports[`test/commands/query.ts > TAP > query > --target option > should use --target over positional arguments 1`] = `
my-project
├── foo@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── foo@1.0.0
└── missing@^1.0.0 (missing)

`

exports[`test/commands/query.ts > TAP > query > --target option > should work with json output 1`] = `
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
          "foo": "^1.0.0",
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
  }
]
`

exports[`test/commands/query.ts > TAP > query > colors > should use colors when set in human readable format 1`] = `
[0mmy-project
├── foo@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── foo@1.0.0
└── missing@^1.0.0 [31m(missing)[39m
[0m
`

exports[`test/commands/query.ts > TAP > query > default query string selection logic > should select the correct workspace based on default query logic 1`] = `
a

`

exports[`test/commands/query.ts > TAP > query > expect-results option > should return items when expect-results check passes 1`] = `
my-project
├── foo@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── foo@1.0.0
└── missing@^1.0.0 (missing)

`

exports[`test/commands/query.ts > TAP > query > scope with a transitive dependency > should handle scope with a transitive dependency 1`] = `
foo
└── bar@1.0.0

`

exports[`test/commands/query.ts > TAP > query > scope with workspaces > should handle scope with workspaces correctly 1`] = `
workspace-a

`

exports[`test/commands/query.ts > TAP > query > should have usage 1`] = `
Usage:
  vlt query
  vlt query <query> --view=<human | json | mermaid | gui>
  vlt query <query> --expect-results=<comparison string>
  vlt query --target=<query> --view=<human | json | mermaid | gui>

List installed dependencies matching the provided query.

The vlt Dependency Selector Syntax is a CSS-like query language that allows you
to filter installed dependencies using a variety of metadata in the form of
CSS-like attributes, pseudo selectors & combinators.

The --scope and --target options accepts DSS query selectors to filter packages.
Using --scope, you can specify which packages to treat as the top-level items in
the output graph. The --target option can be used as an alternative to
positional arguments, it allows you to filter what dependencies to include in
the output. Using both options allows you to render subgraphs of the dependency
graph.

Defaults to listing all dependencies of the project root and workspaces.

  Examples

    Query dependencies declared as "foo"

    ​vlt query '#foo'

    Query all peer dependencies of workspaces

    ​vlt query '*:workspace > *:peer'

    Query all direct project dependencies with a "build" script

    ​vlt query ':project > *:attr(scripts, [build])'

    Query packages with names starting with "@vltpkg"

    ​vlt query '[name^="@vltpkg"]'

    Errors if a copyleft licensed package is found

    ​vlt query '*:license(copyleft) --expect-results=0'

    Defines a direct dependency as the output top-level scope

    ​vlt query --scope=":root > #dependency-name"

    Query all dependencies using the target option

    ​vlt query '--target="*"'

    Query all peer dependencies of workspaces using target option

    ​vlt query '--target=":workspace > *:peer"'

  Options

    expect-results
      Sets an expected number of resulting items. Errors if the number of
      resulting items does not match the set value. Accepts a specific numeric
      value or a string value starting with either ">", "<", ">=" or "<="
      followed by a numeric value to be compared.

      ​--expect-results=[number | string]

    scope
      Query selector to select top-level packages using the DSS query language
      syntax.

      ​--scope=<query>

    target
      Query selector to filter packages using DSS syntax.

      ​--target=<query>

    view
      Output format. Defaults to human-readable or json if no tty.

      ​--view=[human | json | mermaid | gui]

`

exports[`test/commands/query.ts > TAP > query > should list mermaid in json format 1`] = `
flowchart TD
a("root:my-project")
a("root:my-project") -->|"foo#64;^1.0.0"| b("npm:foo#64;1.0.0")
b("npm:foo#64;1.0.0")
a("root:my-project") -->|"bar#64;^1.0.0"| c("npm:bar#64;1.0.0")
c("npm:bar#64;1.0.0")
c("npm:bar#64;1.0.0") -->|"baz#64;custom:baz#64;^1.0.0"| d("custom:baz#64;1.0.0")
d("custom:baz#64;1.0.0")
d("custom:baz#64;1.0.0") -->|"foo#64;^1.0.0"| b("npm:foo#64;1.0.0")

a("root:my-project") -->|"missing#64;^1.0.0"| missing-0(Missing)

`

exports[`test/commands/query.ts > TAP > query > should list pkgs in human readable format 1`] = `
my-project
├── foo@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── foo@1.0.0
└── missing@^1.0.0 (missing)

`

exports[`test/commands/query.ts > TAP > query > should list pkgs in json format 1`] = `
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
          "foo": "^1.0.0",
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
    "name": "foo",
    "fromID": "file·.",
    "spec": "foo@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··foo@1.0.0",
      "name": "foo",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··foo@1.0.0/node_modules/foo",
      "importer": false,
      "manifest": {
        "name": "foo",
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
    "name": "foo",
    "fromID": "·custom·baz@1.0.0",
    "spec": "foo@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··foo@1.0.0",
      "name": "foo",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··foo@1.0.0/node_modules/foo",
      "importer": false,
      "manifest": {
        "name": "foo",
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

exports[`test/commands/query.ts > TAP > query > workspaces > should add all scope nodes as importers 1`] = `
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

exports[`test/commands/query.ts > TAP > query > workspaces > should add scope nodes as importers 1`] = `
a

`

exports[`test/commands/query.ts > TAP > query > workspaces > should list single workspace 1`] = `
a

`

exports[`test/commands/query.ts > TAP > query > workspaces > should list workspaces in human readable format 1`] = `
my-project
b
a

`

exports[`test/commands/query.ts > TAP > query > workspaces > should list workspaces in json format 1`] = `
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

exports[`test/commands/query.ts > TAP > query > workspaces > should use specified workspace as scope selector 1`] = `
a

`
