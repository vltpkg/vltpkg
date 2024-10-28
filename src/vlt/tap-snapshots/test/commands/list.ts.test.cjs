/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/list.ts > TAP > list > colors > should use colors when set in human readable format 1`] = `
Array [
  String(
    \\u001b[0m\\u001b[33mmy-project\\u001b[39m\\u001b[0m
    \\u001b[0m├── \\u001b[33mfoo@1.0.0\\u001b[39m\\u001b[0m
    \\u001b[0m├─┬ \\u001b[33mbar@1.0.0\\u001b[39m\\u001b[0m
    \\u001b[0m│ └─┬ \\u001b[33mcustom:baz@1.0.0\\u001b[39m\\u001b[0m
    \\u001b[0m│   └── \\u001b[33mfoo@1.0.0\\u001b[39m \\u001b[2m(deduped)\\u001b[22m\\u001b[0m
    \\u001b[0m└── \\u001b[33mmissing@^1.0.0\\u001b[39m \\u001b[31m(missing)\\u001b[39m\\u001b[0m
    \\u001b[0m\\u001b[0m
  ),
]
`

exports[`test/commands/list.ts > TAP > list > should have usage 1`] = `
Usage:
  vlt ls
  vlt ls <query> --view=[human | json | mermaid]

List installed dependencies matching the provided query.
Defaults to listing direct dependencies of a project and
any configured workspace.

Examples:

  vlt ls
          List direct dependencies of the current project / workspace
  vlt ls *
          List all dependencies for the current project / workspace
  vlt ls foo bar baz
          List all dependencies named 'foo', 'bar', or 'baz'
  vlt ls '[name="@scoped/package"] > *'
          Lists direct dependencies of a specific package
  vlt ls '*.workspace > *.peer'
          List all peer dependencies of all workspaces

Options:

  --view=[human | json | mermaid]
          Output format. Defaults to human-readable or json if no tty.

`

exports[`test/commands/list.ts > TAP > list > should list all pkgs in human format 1`] = `
Array [
  String(
    my-project
    ├── foo@1.0.0
    └─┬ bar@1.0.0
      └─┬ custom:baz@1.0.0
        └── foo@1.0.0 (deduped)
    
  ),
]
`

exports[`test/commands/list.ts > TAP > list > should list all pkgs in human readable format 1`] = `
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

exports[`test/commands/list.ts > TAP > list > should list all pkgs in json format 1`] = `
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
  ),
]
`

exports[`test/commands/list.ts > TAP > list > should list all pkgs in mermaid format 1`] = `
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

exports[`test/commands/list.ts > TAP > list > should list mermaid in json format 1`] = `
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
    
  ),
]
`

exports[`test/commands/list.ts > TAP > list > should list pkgs in human readable format 1`] = `
Array [
  String(
    my-project
    ├── foo@1.0.0
    └── bar@1.0.0
    
  ),
]
`

exports[`test/commands/list.ts > TAP > list > should list pkgs in json format 1`] = `
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
      }
    ]
  ),
]
`

exports[`test/commands/list.ts > TAP > list > workspaces > should list single workspace 1`] = `
Array [
  "a\\n",
]
`

exports[`test/commands/list.ts > TAP > list > workspaces > should list workspaces in human readable format 1`] = `
Array [
  "my-project\\n",
]
`

exports[`test/commands/list.ts > TAP > list > workspaces > should list workspaces in json format 1`] = `
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
          "projectRoot": "{ROOT}",
          "dev": false,
          "optional": false
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
          "projectRoot": "{ROOT}",
          "dev": false,
          "optional": false
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
          "projectRoot": "{ROOT}",
          "dev": false,
          "optional": false
        }
      }
    ]
  ),
]
`
