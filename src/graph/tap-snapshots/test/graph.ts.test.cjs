/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/graph.ts > TAP > Graph > should print with special tag name 1`] = `
@vltpkg/graph.Graph { lockfileVersion: 0, options: [Object], nodes: {}, edges: {} }
`

exports[`test/graph.ts > TAP > using placePackage > should add a type=git package 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 0,
  options: { registries: {} },
  nodes: {
    '··bar@1.0.0': [
      0,
      'bar',
      <3 empty items>,
      { name: 'bar', version: '1.0.0', dependencies: [Object] }
    ],
    '··foo@1.0.0': [
      0,
      'foo',
      <3 empty items>,
      { name: 'foo', version: '1.0.0', bin: [Object] },
      <2 empty items>,
      { foo: './bin.js' }
    ],
    'file·a': [ 0, 'a', <3 empty items>, { name: 'a', version: '1.0.0' } ],
    'git·github%3Afoo§bar·': [ 0, 'bar', <3 empty items>, { name: 'bar', version: '1.0.0' } ]
  },
  edges: {
    'file·. missing': 'prod ^1.0.0 MISSING',
    'file·. foo': 'prod ^1.0.0 ··foo@1.0.0',
    'file·. a': 'prod file:./a file·a',
    'file·. bar': 'prod github:foo/bar git·github%3Afoo§bar·'
  }
}
`

exports[`test/graph.ts > TAP > using placePackage > should find and fix nameless spec packages 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 0,
  options: { registries: {} },
  nodes: {
    '··bar@1.0.0': [
      0,
      'bar',
      <3 empty items>,
      { name: 'bar', version: '1.0.0', dependencies: [Object] }
    ],
    '··foo@1.0.0': [
      0,
      'foo',
      <3 empty items>,
      { name: 'foo', version: '1.0.0', bin: [Object] },
      <2 empty items>,
      { foo: './bin.js' }
    ],
    'file·a': [ 0, 'a', <3 empty items>, { name: 'a', version: '1.0.0' } ]
  },
  edges: {
    'file·. missing': 'prod ^1.0.0 MISSING',
    'file·. bar': 'prod ^1.0.0 ··bar@1.0.0',
    'file·. foo': 'prod ^1.0.0 ··foo@1.0.0',
    'file·. a': 'prod file:./a file·a'
  }
}
`

exports[`test/graph.ts > TAP > using placePackage > should have removed baz from the graph 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 0,
  options: { registries: {} },
  nodes: {
    '··bar@1.0.0': [
      0,
      'bar',
      <3 empty items>,
      { name: 'bar', version: '1.0.0', dependencies: [Object] }
    ],
    '··foo@1.0.0': [
      0,
      'foo',
      <3 empty items>,
      { name: 'foo', version: '1.0.0', bin: [Object] },
      <2 empty items>,
      { foo: './bin.js' }
    ]
  },
  edges: {
    'file·. missing': 'prod ^1.0.0 MISSING',
    'file·. bar': 'prod ^1.0.0 ··bar@1.0.0',
    'file·. foo': 'prod ^1.0.0 ··foo@1.0.0'
  }
}
`

exports[`test/graph.ts > TAP > using placePackage > the graph 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 0,
  options: { registries: {} },
  nodes: {
    '··bar@1.0.0': [
      0,
      'bar',
      <3 empty items>,
      { name: 'bar', version: '1.0.0', dependencies: [Object] }
    ],
    '··baz@1.0.0': [
      0,
      'baz',
      <3 empty items>,
      { name: 'baz', version: '1.0.0', dist: [Object] }
    ],
    '··foo@1.0.0': [
      0,
      'foo',
      <3 empty items>,
      { name: 'foo', version: '1.0.0', bin: [Object] },
      <2 empty items>,
      { foo: './bin.js' }
    ]
  },
  edges: {
    'file·. missing': 'prod ^1.0.0 MISSING',
    'file·. bar': 'prod ^1.0.0 ··bar@1.0.0',
    'file·. foo': 'prod ^1.0.0 ··foo@1.0.0',
    '··bar@1.0.0 baz': 'prod ^1.0.0 ··baz@1.0.0',
    '··baz@1.0.0 foo': 'prod ^1.0.0 ··foo@1.0.0'
  }
}
`

exports[`test/graph.ts > TAP > workspaces > should have root and workspaces as importers 1`] = `
Set {
  &ref_1 Node {
    "bins": undefined,
    "buildState": "none",
    "built": false,
    "confused": false,
    "detached": false,
    "edgesIn": Set {},
    "edgesOut": Map {},
    "extracted": false,
    "graph": "Graph {}",
    "id": "file·.",
    "importer": true,
    "integrity": undefined,
    "mainImporter": true,
    "manifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "peerSetHash": undefined,
    "platform": undefined,
    "projectRoot": #
    "registry": undefined,
    "resolved": undefined,
    "version": "1.0.0",
    "workspaces": Map {
      "b" => Edge {
        "from": <*ref_1>,
        "spec": Spec {
          "bareSpec": "workspace:*",
          "catalog": undefined,
          "conventionalRegistryTarball": undefined,
          "distTag": undefined,
          "file": undefined,
          "gitCommittish": undefined,
          "gitRemote": undefined,
          "gitSelector": undefined,
          "gitSelectorParsed": undefined,
          "name": "b",
          "namedGitHost": undefined,
          "namedGitHostPath": undefined,
          "namedJsrRegistry": undefined,
          "namedRegistry": undefined,
          "options": Object {
            "catalog": Object {},
            "catalogs": Object {},
            "git-host-archives": Object {
              "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
              "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
              "github": "https://api.github.com/repos/$1/$2/tarball/$committish",
              "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish",
            },
            "git-hosts": Object {
              "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
              "gist": "git+ssh://git@gist.github.com/$1.git",
              "github": "git+ssh://git@github.com:$1/$2.git",
              "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
            },
            "jsr-registries": Object {
              "jsr": "https://npm.jsr.io/",
            },
            "mainManifest": Object {
              "name": "my-project",
              "version": "1.0.0",
            },
            "monorepo": Monorepo [
              Workspace {
                "fullpath": #
                "groups": Array [
                  "packages",
                ],
                "id": "workspace·packages§b",
                "manifest": Object {
                  "name": "b",
                  [Symbol.for(indent)]: "",
                  [Symbol.for(newline)]: "",
                  "version": "1.0.0",
                },
                "name": "b",
                "path": "packages/b",
              },
              Workspace {
                "fullpath": #
                "groups": Array [
                  "packages",
                ],
                "id": "workspace·packages§a",
                "manifest": Object {
                  "name": "a",
                  [Symbol.for(indent)]: "",
                  [Symbol.for(newline)]: "",
                  "version": "1.0.0",
                },
                "name": "a",
                "path": "packages/a",
              },
            ],
            "projectRoot": #
            "registries": Object {
              "npm": "https://registry.npmjs.org/",
            },
            "registry": "https://registry.npmjs.org/",
            "scope-registries": Object {},
          },
          "overridden": false,
          "range": undefined,
          "registry": undefined,
          "registrySpec": undefined,
          "remoteURL": undefined,
          "scope": undefined,
          "scopeRegistry": undefined,
          "semver": undefined,
          "spec": "b@workspace:*",
          "subspec": undefined,
          "type": "workspace",
          "workspace": "b",
          "workspaceSpec": "*",
        },
        "to": Node {
          "bins": undefined,
          "buildState": "none",
          "built": false,
          "confused": false,
          "detached": false,
          "edgesIn": Set {},
          "edgesOut": Map {},
          "extracted": false,
          "graph": "Graph {}",
          "id": "workspace·packages§b",
          "importer": true,
          "integrity": undefined,
          "mainImporter": false,
          "manifest": Object {
            "name": "b",
            [Symbol.for(indent)]: "",
            [Symbol.for(newline)]: "",
            "version": "1.0.0",
          },
          "modifier": undefined,
          "peerSetHash": undefined,
          "platform": undefined,
          "projectRoot": #
          "registry": undefined,
          "resolved": undefined,
          "version": "1.0.0",
          "workspaces": undefined,
        },
        "type": "prod",
      },
      "a" => Edge {
        "from": <*ref_1>,
        "spec": Spec {
          "bareSpec": "workspace:*",
          "catalog": undefined,
          "conventionalRegistryTarball": undefined,
          "distTag": undefined,
          "file": undefined,
          "gitCommittish": undefined,
          "gitRemote": undefined,
          "gitSelector": undefined,
          "gitSelectorParsed": undefined,
          "name": "a",
          "namedGitHost": undefined,
          "namedGitHostPath": undefined,
          "namedJsrRegistry": undefined,
          "namedRegistry": undefined,
          "options": Object {
            "catalog": Object {},
            "catalogs": Object {},
            "git-host-archives": Object {
              "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
              "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
              "github": "https://api.github.com/repos/$1/$2/tarball/$committish",
              "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish",
            },
            "git-hosts": Object {
              "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
              "gist": "git+ssh://git@gist.github.com/$1.git",
              "github": "git+ssh://git@github.com:$1/$2.git",
              "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
            },
            "jsr-registries": Object {
              "jsr": "https://npm.jsr.io/",
            },
            "mainManifest": Object {
              "name": "my-project",
              "version": "1.0.0",
            },
            "monorepo": Monorepo [
              Workspace {
                "fullpath": #
                "groups": Array [
                  "packages",
                ],
                "id": "workspace·packages§b",
                "manifest": Object {
                  "name": "b",
                  [Symbol.for(indent)]: "",
                  [Symbol.for(newline)]: "",
                  "version": "1.0.0",
                },
                "name": "b",
                "path": "packages/b",
              },
              Workspace {
                "fullpath": #
                "groups": Array [
                  "packages",
                ],
                "id": "workspace·packages§a",
                "manifest": Object {
                  "name": "a",
                  [Symbol.for(indent)]: "",
                  [Symbol.for(newline)]: "",
                  "version": "1.0.0",
                },
                "name": "a",
                "path": "packages/a",
              },
            ],
            "projectRoot": #
            "registries": Object {
              "npm": "https://registry.npmjs.org/",
            },
            "registry": "https://registry.npmjs.org/",
            "scope-registries": Object {},
          },
          "overridden": false,
          "range": undefined,
          "registry": undefined,
          "registrySpec": undefined,
          "remoteURL": undefined,
          "scope": undefined,
          "scopeRegistry": undefined,
          "semver": undefined,
          "spec": "a@workspace:*",
          "subspec": undefined,
          "type": "workspace",
          "workspace": "a",
          "workspaceSpec": "*",
        },
        "to": Node {
          "bins": undefined,
          "buildState": "none",
          "built": false,
          "confused": false,
          "detached": false,
          "edgesIn": Set {},
          "edgesOut": Map {},
          "extracted": false,
          "graph": "Graph {}",
          "id": "workspace·packages§a",
          "importer": true,
          "integrity": undefined,
          "mainImporter": false,
          "manifest": Object {
            "name": "a",
            [Symbol.for(indent)]: "",
            [Symbol.for(newline)]: "",
            "version": "1.0.0",
          },
          "modifier": undefined,
          "peerSetHash": undefined,
          "platform": undefined,
          "projectRoot": #
          "registry": undefined,
          "resolved": undefined,
          "version": "1.0.0",
          "workspaces": undefined,
        },
        "type": "prod",
      },
    },
  },
  Node {
    "bins": undefined,
    "buildState": "none",
    "built": false,
    "confused": false,
    "detached": false,
    "edgesIn": Set {},
    "edgesOut": Map {},
    "extracted": false,
    "graph": "Graph {}",
    "id": "workspace·packages§b",
    "importer": true,
    "integrity": undefined,
    "mainImporter": false,
    "manifest": Object {
      "name": "b",
      [Symbol.for(indent)]: "",
      [Symbol.for(newline)]: "",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "peerSetHash": undefined,
    "platform": undefined,
    "projectRoot": #
    "registry": undefined,
    "resolved": undefined,
    "version": "1.0.0",
    "workspaces": undefined,
  },
  Node {
    "bins": undefined,
    "buildState": "none",
    "built": false,
    "confused": false,
    "detached": false,
    "edgesIn": Set {},
    "edgesOut": Map {},
    "extracted": false,
    "graph": "Graph {}",
    "id": "workspace·packages§a",
    "importer": true,
    "integrity": undefined,
    "mainImporter": false,
    "manifest": Object {
      "name": "a",
      [Symbol.for(indent)]: "",
      [Symbol.for(newline)]: "",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "peerSetHash": undefined,
    "platform": undefined,
    "projectRoot": #
    "registry": undefined,
    "resolved": undefined,
    "version": "1.0.0",
    "workspaces": undefined,
  },
}
`
