/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/lockfile/save.ts > TAP > custom git hosts > must match snapshot 1`] = `
{
  "options": {
    "git-hosts": {
      "example": "git+ssh://example.com/$1/$2.git"
    },
    "git-host-archives": {
      "example": "https://example.com/$1/$2/archive/$3.tar.gz"
    }
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

exports[`test/lockfile/save.ts > TAP > missing registries > must match snapshot 1`] = `
{
  "options": {
    "registry": "http://example.com"
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/save.ts > TAP > overrides default registries > must match snapshot 1`] = `
{
  "options": {
    "registry": "http://example.com",
    "registries": {
      "npm": "http://example.com"
    }
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/save.ts > TAP > save > must match snapshot 1`] = `
{
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
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
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
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
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
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

exports[`test/lockfile/save.ts > TAP > scope-registries > must match snapshot 1`] = `
{
  "options": {
    "scope-registries": {
      "@myscope": "https://example.com/"
    }
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

exports[`test/lockfile/save.ts > TAP > workspaces > save manifests > must match snapshot 1`] = `
{
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
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
  "options": {
    "registries": {
      "custom": "http://example.com"
    }
  },
  "nodes": {
    "··c@1.0.0": [0,"c","sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="]
  },
  "edges": {
    "workspace·packages§b c": "prod * ··c@1.0.0"
  }
}

`
