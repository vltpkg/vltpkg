/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/lockfile/load.ts > TAP > load > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(linked@file:./linked) -prod-> to: Node {
        id: 'file·linked',
        location: './node_modules/.vlt/file·linked/node_modules/linked',
        resolved: 'linked'
      },
      Edge spec(foo@^1.0.0 || 1.2.3 ||  2.3.4) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      },
      Edge spec(bar@^1.0.0) -prod-> to: Node {
        id: '··bar@1.0.0',
        location: './node_modules/.vlt/··bar@1.0.0/node_modules/bar',
        resolved: 'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        integrity: 'sha512-6/deadbeef==',
        edgesOut: [
          Edge spec(baz@^1.0.0) -prod-> to: Node {
            id: '··baz@1.0.0',
            location: './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
            resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
          }
        ]
      },
      Edge spec(missing@^1.0.0) -prod-> to: [missing package]: <missing@^1.0.0>
    ]
  }
]
`

exports[`test/lockfile/load.ts > TAP > load with custom git hosts > should build specs with custom git hosts 1`] = `
Spec {
  "bareSpec": "example:foo/bar",
  "conventionalRegistryTarball": undefined,
  "distTag": undefined,
  "file": undefined,
  "gitCommittish": undefined,
  "gitRemote": "git+ssh://example.com/foo/bar.git",
  "gitSelector": undefined,
  "gitSelectorParsed": undefined,
  "name": "foo",
  "namedGitHost": "example",
  "namedGitHostPath": "foo/bar",
  "namedRegistry": undefined,
  "options": Object {
    "git-host-archives": Object {
      "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
      "example": "git+ssh://example.com/$1/$2/archive/$3.tar.gz",
      "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
      "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
      "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish",
    },
    "git-hosts": Object {
      "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
      "example": "git+ssh://example.com/$1/$2.git",
      "gist": "git+ssh://git@gist.github.com/$1.git",
      "github": "git+ssh://git@github.com:$1/$2.git",
      "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
    },
    "mainManifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "projectRoot": "{ROOT}",
    "registries": Object {
      "custom": "http://example.com",
      "npm": "https://registry.npmjs.org/",
    },
    "registry": "https://registry.npmjs.org/",
    "scope-registries": Object {},
  },
  "range": undefined,
  "registry": undefined,
  "registrySpec": undefined,
  "remoteURL": undefined,
  "scope": undefined,
  "scopeRegistry": undefined,
  "semver": undefined,
  "spec": "foo@example:foo/bar",
  "subspec": undefined,
  "type": "git",
  "workspace": undefined,
  "workspaceSpec": undefined,
}
`

exports[`test/lockfile/load.ts > TAP > load with custom git hosts > should load custom git hosts graph 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(foo@example:foo/bar) -prod-> to: Node {
        id: 'git·example%3Afoo§bar·',
        location: './node_modules/.vlt/git·example%3Afoo§bar·/node_modules/foo',
        resolved: 'example:foo/bar'
      }
    ]
  }
]
`

exports[`test/lockfile/load.ts > TAP > load with custom scope registry > should build specs with custom scope registry 1`] = `
Spec {
  "bareSpec": "^1.0.0",
  "conventionalRegistryTarball": undefined,
  "distTag": undefined,
  "file": undefined,
  "gitCommittish": undefined,
  "gitRemote": undefined,
  "gitSelector": undefined,
  "gitSelectorParsed": undefined,
  "name": "@myscope/foo",
  "namedGitHost": undefined,
  "namedGitHostPath": undefined,
  "namedRegistry": undefined,
  "options": Object {
    "git-host-archives": Object {
      "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
      "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
      "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
      "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish",
    },
    "git-hosts": Object {
      "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
      "gist": "git+ssh://git@gist.github.com/$1.git",
      "github": "git+ssh://git@github.com:$1/$2.git",
      "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
    },
    "mainManifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "projectRoot": "{ROOT}",
    "registries": Object {
      "custom": "http://example.com",
      "npm": "https://registry.npmjs.org/",
    },
    "registry": "https://registry.npmjs.org/",
    "scope-registries": Object {
      "@myscope": "http://example.com",
    },
  },
  "range": Range {
    "includePrerelease": false,
    "isAny": false,
    "isSingle": false,
    "raw": "^1.0.0",
    "set": Array [
      Comparator {
        "includePrerelease": false,
        "isAny": false,
        "isNone": false,
        "raw": "^1.0.0",
        "tokens": Array [
          "^1.0.0",
        ],
        "tuples": Array [
          Array [
            ">=",
            Version {
              "build": undefined,
              "major": 1,
              "minor": 0,
              "patch": 0,
              "prerelease": undefined,
              "raw": "1.0.0",
            },
          ],
          Array [
            "<",
            Version {
              "build": undefined,
              "major": 2,
              "minor": 0,
              "patch": 0,
              "prerelease": Array [
                0,
              ],
              "raw": "1.0.0",
            },
          ],
        ],
      },
    ],
  },
  "registry": "http://example.com",
  "registrySpec": "^1.0.0",
  "remoteURL": undefined,
  "scope": "@myscope",
  "scopeRegistry": "http://example.com",
  "semver": "^1.0.0",
  "spec": "@myscope/foo@^1.0.0",
  "subspec": undefined,
  "type": "registry",
  "workspace": undefined,
  "workspaceSpec": undefined,
}
`

exports[`test/lockfile/load.ts > TAP > load with custom scope registry > should load custom scope registry graph 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(@myscope/foo@^1.0.0) -prod-> to: Node {
        id: '··@myscope§foo@1.0.0',
        location: './node_modules/.vlt/··@myscope§foo@1.0.0/node_modules/@myscope/foo',
        resolved: 'https://registry.npmjs.org/@myscope/foo/-/foo-1.0.0.tgz'
      }
    ]
  }
]
`

exports[`test/lockfile/load.ts > TAP > loadHidden > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(linked@file:./linked) -prod-> to: Node {
        id: 'file·linked',
        location: './node_modules/.vlt/file·linked/node_modules/linked',
        resolved: 'linked'
      },
      Edge spec(foo@^1.0.0 || 1.2.3 ||  2.3.4) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      },
      Edge spec(bar@^1.0.0) -prod-> to: Node {
        id: '··bar@1.0.0',
        location: './node_modules/.vlt/··bar@1.0.0/node_modules/bar',
        resolved: 'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        integrity: 'sha512-6/deadbeef==',
        edgesOut: [
          Edge spec(baz@^1.0.0) -prod-> to: Node {
            id: '··baz@1.0.0',
            location: './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
            resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
          }
        ]
      },
      Edge spec(missing@^1.0.0) -prod-> to: [missing package]: <missing@^1.0.0>
    ]
  }
]
`

exports[`test/lockfile/load.ts > TAP > missing options object > should be able to parse lockfile without options object 1`] = `
{
  "options": {
    "registries": {
      "example": "http://foo"
    }
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/load.ts > TAP > option-defined values should overwrite lockfile values > should overwrite lockfile values with option-defined values 1`] = `
{
  "options": {
    "registry": "http://example.com",
    "registries": {
      "example": "http://bar",
      "lorem": "http://lorem"
    }
  },
  "nodes": {},
  "edges": {}
}
`

exports[`test/lockfile/load.ts > TAP > workspaces > must match snapshot 1`] = `
[
  Node { id: 'file·.', location: '.', importer: true },
  Node {
    id: 'workspace·packages§b',
    location: './packages/b',
    importer: true,
    edgesOut: [
      Edge spec(c@^1.0.0) -prod-> to: Node {
        id: '··c@1.0.0',
        location: './node_modules/.vlt/··c@1.0.0/node_modules/c',
        resolved: 'https://registry.npmjs.org/c/-/c-1.0.0.tgz',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      }
    ]
  },
  Node {
    id: 'workspace·packages§a',
    location: './packages/a',
    importer: true
  }
]
`
