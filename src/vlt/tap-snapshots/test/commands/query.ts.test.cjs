/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/query.ts > TAP > query > colors > should use colors when set in human readable format 1`] = `
Array [
  String(
    \\u001b[0mmy-project\\u001b[0m
    \\u001b[0m├── foo@1.0.0\\u001b[0m
    \\u001b[0m├─┬ bar@1.0.0\\u001b[0m
    \\u001b[0m│ └─┬ custom:baz@1.0.0\\u001b[0m
    \\u001b[0m│   └── foo@1.0.0 \\u001b[2m(deduped)\\u001b[22m\\u001b[0m
    \\u001b[0m└── missing@^1.0.0 \\u001b[31m(missing)\\u001b[39m\\u001b[0m
    \\u001b[0m\\u001b[0m
  ),
]
`

exports[`test/commands/query.ts > TAP > query > should have usage 1`] = `
Usage:
  vlt query
  vlt query <query> --view=[human | json | mermaid]

List installed dependencies matching the provided query.

Examples:

  vlt query '#foo'
          Query packages with the name "foo"
  vlt query '*.workspace > *.peer'
          Query all peer dependencies of workspaces
  vlt query ':project > *:attr(scripts, [build])'
          Query all direct project dependencies with a "build" script
  vlt query '[name^="@vltpkg"]'
          Query packages with names starting with "@vltpkg"

Options:

  --view=[human | json | mermaid]
          Output format. Defaults to human-readable or json if no tty.

`

exports[`test/commands/query.ts > TAP > query > should list mermaid in json format 1`] = `
Array [
  String(
    flowchart TD
    file%C2%B7.("file(.):my-project#64;1.0.0")
    file%C2%B7.("file(.):my-project#64;1.0.0") -->|"foo#64;^1.0.0 (prod)"| %C2%B7%C2%B7foo%401.0.0("foo#64;1.0.0")
    %C2%B7%C2%B7foo%401.0.0("foo#64;1.0.0")
    file%C2%B7.("file(.):my-project#64;1.0.0") -->|"bar#64;^1.0.0 (prod)"| %C2%B7%C2%B7bar%401.0.0("bar#64;1.0.0")
    %C2%B7%C2%B7bar%401.0.0("bar#64;1.0.0")
    %C2%B7%C2%B7bar%401.0.0("bar#64;1.0.0") -->|"baz#64;custom:baz#64;^1.0.0 (prod)"| %C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0")
    %C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0")
    %C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0") -->|"foo#64;^1.0.0 (prod)"| %C2%B7%C2%B7foo%401.0.0("foo#64;1.0.0")
    
    file%C2%B7.("file(.):my-project#64;1.0.0") -->|"missing#64;^1.0.0 (prod)"| missing-0(Missing)
    
  ),
]
`

exports[`test/commands/query.ts > TAP > query > should list pkgs in human readable format 1`] = `
Array [
  String(
    my-project
    ├── foo@1.0.0
    ├─┬ bar@1.0.0
    │ └─┬ custom:baz@1.0.0
    │   └── foo@1.0.0 (deduped)
    └── missing@^1.0.0 (missing)
    
  ),
]
`

exports[`test/commands/query.ts > TAP > query > should list pkgs in json format 1`] = `
Array [
  String(
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
          "projectRoot": "{ROOT}"
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
          "projectRoot": "{ROOT}"
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
          "projectRoot": "{ROOT}"
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
          "projectRoot": "{ROOT}"
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
          "projectRoot": "{ROOT}"
        }
      }
    ]
  ),
]
`

exports[`test/commands/query.ts > TAP > query > workspaces > should list single workspace 1`] = `
Array [
  "a\\n",
]
`

exports[`test/commands/query.ts > TAP > query > workspaces > should list workspaces in human readable format 1`] = `
Array [
  "my-project\\n",
]
`

exports[`test/commands/query.ts > TAP > query > workspaces > should list workspaces in json format 1`] = `
Array [
  String(
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
          "projectRoot": "{ROOT}"
        }
      },
      {
        "name": "b",
        "to": {
          "id": "workspace·packages%2Fb",
          "name": "b",
          "version": "1.0.0",
          "location": "./packages/b",
          "importer": true,
          "manifest": {
            "name": "b",
            "version": "1.0.0"
          },
          "projectRoot": "{ROOT}"
        }
      },
      {
        "name": "a",
        "to": {
          "id": "workspace·packages%2Fa",
          "name": "a",
          "version": "1.0.0",
          "location": "./packages/a",
          "importer": true,
          "manifest": {
            "name": "a",
            "version": "1.0.0"
          },
          "projectRoot": "{ROOT}"
        }
      }
    ]
  ),
]
`
