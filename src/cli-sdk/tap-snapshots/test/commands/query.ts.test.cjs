/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/query.ts > TAP > query > colors > should use colors when set in human readable format 1`] = `
[0mmy-project[0m
[0m├── foo@1.0.0[0m
[0m├─┬ bar@1.0.0[0m
[0m│ └─┬ baz (custom:baz@1.0.0)[0m
[0m│   └── foo@1.0.0 [2m(deduped)[22m[0m
[0m└── missing@^1.0.0 [31m(missing)[39m[0m
[0m[0m
`

exports[`test/commands/query.ts > TAP > query > expect-results option > should return items when expect-results check passes 1`] = `
my-project
├── foo@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── foo@1.0.0 (deduped)
└── missing@^1.0.0 (missing)

`

exports[`test/commands/query.ts > TAP > query > should have usage 1`] = `
Usage:
  vlt query
  vlt query <query> --view=<human | json | mermaid | gui>
  vlt query <query> --expect-results=<comparison string>

List installed dependencies matching the provided query.

  Examples

    Query packages with the name "foo"

    ​vlt query '#foo'

    Query all peer dependencies of workspaces

    ​vlt query '*.workspace > *.peer'

    Query all direct project dependencies with a "build" script

    ​vlt query ':project > *:attr(scripts, [build])'

    Query packages with names starting with "@vltpkg"

    ​vlt query '[name^="@vltpkg"]'

    Errors if a copyleft licensed package is found

    ​vlt query '*:license(copyleft) --expect-results=0'

  Options

    expect-results
      Sets an expected number of resulting items. Errors if the number of
      resulting items does not match the set value. Accepts a specific numeric
      value or a string value starting with either ">", "<", ">=" or "<="
      followed by a numeric value to be compared.

      ​--expect-results=[number | string]

    view
      Output format. Defaults to human-readable or json if no tty.

      ​--view=[human | json | mermaid | gui]

`

exports[`test/commands/query.ts > TAP > query > should list mermaid in json format 1`] = `
flowchart TD
file%C2%B7.("root:my-project")
file%C2%B7.("root:my-project") -->|"foo#64;^1.0.0 (prod)"| %C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")
%C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")
file%C2%B7.("root:my-project") -->|"bar#64;^1.0.0 (prod)"| %C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0")
%C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0")
%C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0") -->|"baz#64;custom:baz#64;^1.0.0 (prod)"| %C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0")
%C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0")
%C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0") -->|"foo#64;^1.0.0 (prod)"| %C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")

file%C2%B7.("root:my-project") -->|"missing#64;^1.0.0 (prod)"| missing-0(Missing)

`

exports[`test/commands/query.ts > TAP > query > should list pkgs in human readable format 1`] = `
my-project
├── foo@1.0.0
├─┬ bar@1.0.0
│ └─┬ baz (custom:baz@1.0.0)
│   └── foo@1.0.0 (deduped)
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
      "optional": false
    }
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
      "optional": false
    }
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
      "optional": false
    }
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
      "optional": false
    }
  },
  {
    "name": "missing",
    "fromID": "file·.",
    "spec": "missing@^1.0.0",
    "type": "prod"
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
      "optional": false
    }
  }
]
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
      "optional": false
    }
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
      "optional": false
    }
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
      "optional": false
    }
  }
]
`
