/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/json-output.ts > TAP > actual graph > selected packages > should print selected packages 1`] = `
[
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
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true
    }
  }
]
`

exports[`test/visualization/json-output.ts > TAP > actual graph > should print from an actual loaded graph 1`] = `
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
          "@scoped/a": "^1.0.0",
          "@scoped/b": "^1.0.0",
          "foo": "^1.0.0",
          "bar": "^1.0.0",
          "link": "file:./linked",
          "missing": "^1.0.0"
        },
        "bundleDependencies": [
          "bundled"
        ],
        "optionalDependencies": {
          "bar": "^1.0.0"
        },
        "devDependencies": {
          "aliased": "custom:foo@^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "workspace-b",
    "to": {
      "id": "workspace·packages§workspace-b",
      "name": "workspace-b",
      "version": "1.0.0",
      "location": "./packages/workspace-b",
      "importer": true,
      "manifest": {
        "name": "workspace-b",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "workspace-a",
    "to": {
      "id": "workspace·packages§workspace-a",
      "name": "workspace-a",
      "version": "1.0.0",
      "location": "./packages/workspace-a",
      "importer": true,
      "manifest": {
        "name": "workspace-a",
        "version": "1.0.0",
        "devDependencies": {
          "foo": "^1.0.0",
          "ipsum": "^1.0.0",
          "workspace-b": "workspace:*"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "link",
    "fromID": "file·.",
    "spec": "link@file:./linked",
    "type": "prod",
    "to": {
      "id": "file·linked",
      "name": "linked",
      "version": "1.0.0",
      "location": "./linked",
      "importer": false,
      "manifest": {
        "name": "linked",
        "version": "1.0.0"
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
    "name": "extraneous",
    "fromID": "file·.",
    "spec": "extraneous@*",
    "type": "prod",
    "to": {
      "id": "··extraneous@1.0.0",
      "name": "extraneous",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··extraneous@1.0.0/node_modules/extraneous",
      "importer": false,
      "manifest": {
        "name": "extraneous",
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
    "type": "optional",
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
          "baz": "custom:baz@^1.0.0",
          "blooo": "1"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true
    }
  },
  {
    "name": "aliased",
    "fromID": "file·.",
    "spec": "aliased@custom:foo@^1.0.0",
    "type": "dev",
    "to": {
      "id": "·custom·foo@1.0.0",
      "name": "foo",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/·custom·foo@1.0.0/node_modules/foo",
      "importer": false,
      "manifest": {
        "name": "foo",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": true,
      "optional": false
    }
  },
  {
    "name": "@scoped/b",
    "fromID": "file·.",
    "spec": "@scoped/b@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··@scoped§b@1.0.0",
      "name": "@scoped/b",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··@scoped§b@1.0.0/node_modules/@scoped/b",
      "importer": false,
      "manifest": {
        "name": "@scoped/b",
        "version": "1.0.0",
        "dependencies": {
          "@scoped/c": "^1.0.0"
        },
        "bundleDependencies": [
          "not",
          "string array",
          {
            "so": "this is ignored"
          }
        ]
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "@scoped/a",
    "fromID": "file·.",
    "spec": "@scoped/a@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··@scoped§a@1.0.0",
      "name": "@scoped/a",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··@scoped§a@1.0.0/node_modules/@scoped/a",
      "importer": false,
      "manifest": {
        "name": "@scoped/a",
        "version": "1.0.0",
        "dependencies": {
          "bundled": "2.3.4"
        },
        "bundleDependencies": [
          "bundled"
        ]
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
    "name": "workspace-b",
    "fromID": "workspace·packages§workspace-a",
    "spec": "workspace-b@workspace:*",
    "type": "dev",
    "to": {
      "id": "workspace·packages§workspace-b",
      "name": "workspace-b",
      "version": "1.0.0",
      "location": "./packages/workspace-b",
      "importer": true,
      "manifest": {
        "name": "workspace-b",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "ipsum",
    "fromID": "workspace·packages§workspace-a",
    "spec": "ipsum@^1.0.0",
    "type": "dev",
    "to": {
      "id": "··ipsum@1.0.0",
      "name": "ipsum",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··ipsum@1.0.0/node_modules/ipsum",
      "importer": false,
      "manifest": {
        "name": "ipsum",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": true,
      "optional": false
    }
  },
  {
    "name": "foo",
    "fromID": "workspace·packages§workspace-a",
    "spec": "foo@^1.0.0",
    "type": "dev",
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
    "name": "blooo",
    "fromID": "··bar@1.0.0",
    "spec": "blooo@1",
    "type": "prod",
    "to": {
      "id": "··blooo@1.0.0",
      "name": "blooo",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··blooo@1.0.0/node_modules/blooo",
      "importer": false,
      "manifest": {
        "name": "blooo",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true
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
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true
    }
  },
  {
    "name": "@scoped/c",
    "fromID": "··@scoped§b@1.0.0",
    "spec": "@scoped/c@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··@scoped§c@1.0.0",
      "name": "@scoped/c",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··@scoped§c@1.0.0/node_modules/@scoped/c",
      "importer": false,
      "manifest": {
        "name": "@scoped/c",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  }
]
`

exports[`test/visualization/json-output.ts > TAP > aliased package > should print both edge and node names 1`] = `
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
          "a": "^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "a",
    "fromID": "file·.",
    "spec": "a@^1.0.0",
    "type": "optional",
    "to": {
      "id": "··@myscope§foo@1.0.0",
      "name": "@myscope/foo",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··@myscope§foo@1.0.0/node_modules/@myscope/foo",
      "importer": false,
      "manifest": {
        "name": "@myscope/foo",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true
    }
  }
]
`

exports[`test/visualization/json-output.ts > TAP > cycle > should print cycle json output 1`] = `
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
          "a": "^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "a",
    "fromID": "file·.",
    "spec": "a@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··a@1.0.0",
      "name": "a",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··a@1.0.0/node_modules/a",
      "importer": false,
      "manifest": {
        "name": "a",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "b",
    "fromID": "··a@1.0.0",
    "spec": "b@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··b@1.0.0",
      "name": "b",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··b@1.0.0/node_modules/b",
      "importer": false,
      "manifest": {
        "name": "b",
        "version": "1.0.0",
        "dependencies": {
          "a": "^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "a",
    "fromID": "··b@1.0.0",
    "spec": "a@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··a@1.0.0",
      "name": "a",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··a@1.0.0/node_modules/a",
      "importer": false,
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

exports[`test/visualization/json-output.ts > TAP > json-output > should print json output 1`] = `
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
    "type": "dev",
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
      "dev": true,
      "optional": false
    }
  },
  {
    "name": "bar",
    "fromID": "file·.",
    "spec": "bar@^1.0.0",
    "type": "optional",
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
          "baz": "custom:baz@^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true
    }
  },
  {
    "name": "baz",
    "fromID": "··bar@1.0.0",
    "spec": "baz@custom:bar@^1.0.0",
    "type": "dev",
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
          "tarball": "http://example.com/baz",
          "integrity": "sha512-deadbeef"
        }
      },
      "projectRoot": "{ROOT}",
      "integrity": "sha512-deadbeef",
      "resolved": "http://example.com/baz",
      "dev": true,
      "optional": true
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
      "dev": true,
      "optional": false
    }
  },
  {
    "name": "extraneous",
    "fromID": "··bar@1.0.0",
    "spec": "extraneous@extraneous@^1.0.0",
    "type": "prod",
    "to": {
      "id": "··extraneous@1.0.0",
      "name": "extraneous",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/··extraneous@1.0.0/node_modules/extraneous",
      "importer": false,
      "manifest": {
        "name": "extraneous",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true
    }
  }
]
`

exports[`test/visualization/json-output.ts > TAP > missing optional > should print missing optional package 1`] = `
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
        "optionalDependencies": {
          "a": "^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "a",
    "fromID": "file·.",
    "spec": "a@^1.0.0",
    "type": "optional"
  }
]
`

exports[`test/visualization/json-output.ts > TAP > nameless package > should fallback to printing package id if name is missing 1`] = `
[
  {
    "name": "file·.",
    "to": {
      "id": "file·.",
      "name": "file·.",
      "location": ".",
      "importer": true,
      "manifest": {},
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  }
]
`

exports[`test/visualization/json-output.ts > TAP > versionless package > should skip printing version number 1`] = `
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
          "a": "^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  },
  {
    "name": "a",
    "fromID": "file·.",
    "spec": "a@^1.0.0",
    "type": "optional",
    "to": {
      "id": "··a@%5E1.0.0",
      "name": "a",
      "location": "./node_modules/.vlt/··a@%5E1.0.0/node_modules/a",
      "importer": false,
      "manifest": {
        "name": "a"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true
    }
  }
]
`

exports[`test/visualization/json-output.ts > TAP > workspaces > should print json workspaces output 1`] = `
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
