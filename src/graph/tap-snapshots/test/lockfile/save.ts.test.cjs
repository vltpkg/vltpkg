/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/lockfile/save.ts > TAP > confused manifest > should save lockfile with confused manifest 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··foo@1.0.0": [
      0,
      "foo",
      null,
      null,
      "node_modules/.pnpm/foo@1.0.0/node_modules/foo",
      {
        "name": "foo",
        "version": "1.0.0"
      },
      {
        "name": "test",
        "version": "1.0.0"
      }
    ]
  },
  "edges": {
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0"
  }
}
`

exports[`test/lockfile/save.ts > TAP > custom git hosts and catalogs > must match snapshot 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "catalog": {
      "x": "1.2.3"
    },
    "catalogs": {
      "a": {
        "x": "2.3.4"
      }
    },
    "git-hosts": {
      "example": "git+ssh://example.com/$1/$2.git"
    },
    "git-host-archives": {
      "example": "https://example.com/$1/$2/archive/$3.tar.gz"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "git·example%3Afoo§bar·": [
      0,
      "foo"
    ]
  },
  "edges": {
    "file·. foo": "prod example:foo/bar git·example%3Afoo§bar·"
  }
}
`

exports[`test/lockfile/save.ts > TAP > jsr-registries > must match snapshot 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "scope-registries": {
      "@myscope": "https://example.com/"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··foo@1.0.0": [
      0,
      "foo"
    ]
  },
  "edges": {
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0"
  }
}
`

exports[`test/lockfile/save.ts > TAP > jsr-registries > must match snapshot 2`] = `
{
  "lockfileVersion": 0,
  "options": {
    "jsr-registries": {
      "intl": "https://jsr.example.com/"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "·https%3A§§jsr.example.com§·@foo§bar@1.0.0": [
      0,
      "@foo/bar"
    ]
  },
  "edges": {
    "file·. @foo/bar": "prod intl:1 ·https%3A§§jsr.example.com§·@foo§bar@1.0.0"
  }
}
`

exports[`test/lockfile/save.ts > TAP > missing registries > must match snapshot 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registry": "http://example.com"
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/save.ts > TAP > overrides default registries > must match snapshot 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registry": "http://example.com",
    "registries": {
      "npm": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/save.ts > TAP > save > must match snapshot 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··bar@1.0.0": [3,"bar"],
    "··foo@1.0.0": [2,"foo","sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",null,"node_modules/.pnpm/foo@1.0.0/node_modules/foo"],
    "·custom·baz@1.0.0": [1,"baz",null,"http://example.com/baz.tgz"]
  },
  "edges": {
    "file·. foo": "prod ^1.0.0 || 1.2.3 || 2 ··foo@1.0.0",
    "file·. baz": "prod custom:baz@^1.0.0 ·custom·baz@1.0.0",
    "··foo@1.0.0 bar": "prod ^1.0.0 ··bar@1.0.0"
  }
}

`

exports[`test/lockfile/save.ts > TAP > save > save hidden (yes manifests) > must match snapshot 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··bar@1.0.0": [
      3,
      "bar",
      null,
      null,
      null,
      {
        "name": "bar",
        "version": "1.0.0"
      }
    ],
    "··foo@1.0.0": [
      2,
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
      null,
      "node_modules/.pnpm/foo@1.0.0/node_modules/foo",
      {
        "name": "foo",
        "version": "1.0.0",
        "dist": {
          "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="
        }
      }
    ],
    "·custom·baz@1.0.0": [
      1,
      "baz",
      null,
      "http://example.com/baz.tgz",
      null,
      {
        "name": "baz",
        "version": "1.0.0",
        "dist": {
          "tarball": "http://example.com/baz.tgz"
        }
      }
    ]
  },
  "edges": {
    "file·. foo": "prod ^1.0.0 || 1.2.3 || 2 ··foo@1.0.0",
    "file·. baz": "prod custom:baz@^1.0.0 ·custom·baz@1.0.0",
    "··foo@1.0.0 bar": "prod ^1.0.0 ··bar@1.0.0"
  }
}
`

exports[`test/lockfile/save.ts > TAP > save > save normal (no manifests) > must match snapshot 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··bar@1.0.0": [3,"bar"],
    "··foo@1.0.0": [2,"foo","sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",null,"node_modules/.pnpm/foo@1.0.0/node_modules/foo"],
    "·custom·baz@1.0.0": [1,"baz",null,"http://example.com/baz.tgz"]
  },
  "edges": {
    "file·. foo": "prod ^1.0.0 || 1.2.3 || 2 ··foo@1.0.0",
    "file·. baz": "prod custom:baz@^1.0.0 ·custom·baz@1.0.0",
    "··foo@1.0.0 bar": "prod ^1.0.0 ··bar@1.0.0"
  }
}

`

exports[`test/lockfile/save.ts > TAP > save build data > save build data undefined > lockfile with undefined build data 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/save.ts > TAP > save build data > save empty build data > lockfile with empty build data 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/save.ts > TAP > save build data > save with build data provided > lockfile with build data provided 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {
      "https://registry.npmjs.org/": [
        "foo",
        "bar"
      ]
    },
    "blocked": {
      "https://registry.npmjs.org/": [
        "baz"
      ]
    }
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/save.ts > TAP > save build data > save without build data (defaults) > lockfile with no build data 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/save.ts > TAP > save build data > save() and saveHidden() functions with build data > save() with build data 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {
      "https://registry.npmjs.org/": [
        "foo"
      ]
    },
    "blocked": {
      "https://registry.npmjs.org/": [
        "blocked"
      ]
    }
  },
  "nodes": {
    "··foo@1.0.0": [
      0,
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="
    ]
  },
  "edges": {
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0"
  }
}
`

exports[`test/lockfile/save.ts > TAP > save build data > save() and saveHidden() functions with build data > saveHidden() with build data 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {
      "https://registry.npmjs.org/": [
        "foo"
      ]
    },
    "blocked": {
      "https://registry.npmjs.org/": [
        "blocked"
      ]
    }
  },
  "nodes": {
    "··foo@1.0.0": [
      0,
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
      null,
      null,
      {
        "name": "foo",
        "version": "1.0.0",
        "dist": {
          "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="
        }
      }
    ]
  },
  "edges": {
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0"
  }
}
`

exports[`test/lockfile/save.ts > TAP > save platform data for optional dependencies > lockfile with platform data for optional dependencies 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··bar@1.0.0": [
      1,
      "bar",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
      null,
      null,
      null,
      null,
      {
        "engines": {
          "node": ">=16"
        },
        "os": [
          "linux"
        ],
        "cpu": [
          "x64"
        ]
      }
    ],
    "··baz@1.0.0": [
      1,
      "baz",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="
    ],
    "··foo@1.0.0": [
      0,
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="
    ]
  },
  "edges": {
    "file·. bar": "optional ^1.0.0 ··bar@1.0.0",
    "file·. baz": "optional ^1.0.0 ··baz@1.0.0",
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0"
  }
}
`

exports[`test/lockfile/save.ts > TAP > saveManifests with normalized author and contributors > should save hidden lockfile with normalized manifest containing author and contributors 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··foo@1.0.0": [
      0,
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
      null,
      null,
      {
        "name": "foo",
        "version": "1.0.0",
        "author": {
          "name": "John Doe",
          "email": "john@example.com",
          "writeAccess": false,
          "isPublisher": false
        },
        "contributors": [
          {
            "name": "Jane Smith",
            "email": "jane@example.com",
            "writeAccess": false,
            "isPublisher": false
          },
          {
            "name": "Bob Wilson",
            "email": "bob@example.com",
            "writeAccess": false,
            "isPublisher": false
          }
        ],
        "dist": {
          "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="
        }
      }
    ]
  },
  "edges": {
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0"
  }
}
`

exports[`test/lockfile/save.ts > TAP > store modifiers > with empty modifiers config > should save lockfile without modifiers when config is empty 1`] = `
Object {
  "build": Object {
    "allowed": Object {},
    "blocked": Object {},
  },
  "edges": Object {
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0",
  },
  "lockfileVersion": 0,
  "nodes": Object {
    "··foo@1.0.0": Array [
      0,
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
    ],
  },
  "options": Object {
    "registries": Object {
      "custom": "http://example.com",
    },
  },
}
`

exports[`test/lockfile/save.ts > TAP > store modifiers > with invalid scope registries > should save lockfile without scope registries when invalid type 1`] = `
Object {
  "build": Object {
    "allowed": Object {},
    "blocked": Object {},
  },
  "edges": Object {
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0",
  },
  "lockfileVersion": 0,
  "nodes": Object {
    "··foo@1.0.0": Array [
      0,
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
    ],
  },
  "options": Object {
    "registries": Object {
      "custom": "http://example.com",
    },
  },
}
`

exports[`test/lockfile/save.ts > TAP > store modifiers > with missing modifiers > should save lockfile without modifiers when undefined 1`] = `
Object {
  "build": Object {
    "allowed": Object {},
    "blocked": Object {},
  },
  "edges": Object {
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0",
  },
  "lockfileVersion": 0,
  "nodes": Object {
    "··foo@1.0.0": Array [
      0,
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
    ],
  },
  "options": Object {
    "registries": Object {
      "custom": "http://example.com",
    },
  },
}
`

exports[`test/lockfile/save.ts > TAP > store modifiers > with undefined scope registries > should save lockfile without scope registries when undefined 1`] = `
Object {
  "build": Object {
    "allowed": Object {},
    "blocked": Object {},
  },
  "edges": Object {
    "file·. foo": "prod ^1.0.0 ··foo@1.0.0",
  },
  "lockfileVersion": 0,
  "nodes": Object {
    "··foo@1.0.0": Array [
      0,
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
    ],
  },
  "options": Object {
    "registries": Object {
      "custom": "http://example.com",
    },
  },
}
`

exports[`test/lockfile/save.ts > TAP > store modifiers > with valid modifiers > should save lockfile with modifiers 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "modifiers": {
      ":root > #foo": "2"
    },
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··foo@2.0.0·%3Aroot%20%3E%20%23foo": [0,"foo","sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="]
  },
  "edges": {
    "file·. foo": "prod ^1.0.0 ··foo@2.0.0·%3Aroot%20%3E%20%23foo"
  }
}

`

exports[`test/lockfile/save.ts > TAP > workspaces > save manifests > must match snapshot 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··c@1.0.0": [0,"c","sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="]
  },
  "edges": {
    "workspace·packages§b c": "prod * ··c@1.0.0"
  }
}

`

exports[`test/lockfile/save.ts > TAP > workspaces > should save lockfile with workspaces nodes 1`] = `
{
  "lockfileVersion": 0,
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "build": {
    "allowed": {},
    "blocked": {}
  },
  "nodes": {
    "··c@1.0.0": [0,"c","sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="]
  },
  "edges": {
    "workspace·packages§b c": "prod * ··c@1.0.0"
  }
}

`
