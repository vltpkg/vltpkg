/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/install.ts > TAP > should call reify with expected options 1`] = `
Object {
  "actual": "actual.load result",
  "add": Map {
    "file·." => Map {},
  },
  "graph": "buildideal result adds 0 new package(s)",
  "loadManifests": true,
  "monorepo": undefined,
  "packageInfo": PackageInfoClient {
    "monorepo": undefined,
    "options": Object {
      "packageJson": PackageJson {},
      projectRoot: #
      "scurry": PathScurry {},
    },
    "packageJson": PackageJson {},
  },
  "packageJson": PackageJson {},
  projectRoot: #
  "scurry": PathScurry {},
}
`

exports[`test/commands/install.ts > TAP > should reify installing a new dependency 1`] = `
Object {
  "actual": "actual.load result",
  "add": Map {
    "file·." => Map {
      "abbrev" => Object {
        "spec": Spec {
          "bareSpec": "2",
          "conventionalRegistryTarball": undefined,
          "distTag": undefined,
          "file": undefined,
          "gitCommittish": undefined,
          "gitRemote": undefined,
          "gitSelector": undefined,
          "gitSelectorParsed": undefined,
          "name": "abbrev",
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
            "packageJson": PackageJson {},
            projectRoot: #
            "registries": Object {
              "npm": "https://registry.npmjs.org/",
            },
            "registry": "https://registry.npmjs.org/",
            "scope-registries": Object {},
            "scurry": PathScurry {},
          },
          "range": Range {
            "includePrerelease": false,
            "isAny": false,
            "isSingle": false,
            "raw": "2",
            "set": Array [
              Comparator {
                "includePrerelease": false,
                "isAny": false,
                "isNone": false,
                "raw": "2",
                "tokens": Array [
                  "2",
                ],
                "tuples": Array [
                  Array [
                    ">=",
                    Version {
                      "build": undefined,
                      "major": 2,
                      "minor": 0,
                      "patch": 0,
                      "prerelease": undefined,
                      "raw": "2",
                    },
                  ],
                  Array [
                    "<",
                    Version {
                      "build": undefined,
                      "major": 3,
                      "minor": 0,
                      "patch": 0,
                      "prerelease": Array [
                        0,
                      ],
                      "raw": "2",
                    },
                  ],
                ],
              },
            ],
          },
          "registry": "https://registry.npmjs.org/",
          "registrySpec": "2",
          "remoteURL": undefined,
          "scope": undefined,
          "scopeRegistry": undefined,
          "semver": "2",
          "spec": "abbrev@2",
          "subspec": undefined,
          "type": "registry",
          "workspace": undefined,
          "workspaceSpec": undefined,
        },
        "type": "dev",
      },
    },
  },
  "graph": "buildideal result adds 1 new package(s)",
  "loadManifests": true,
  "monorepo": undefined,
  "packageInfo": PackageInfoClient {
    "monorepo": undefined,
    "options": Object {
      "packageJson": PackageJson {},
      projectRoot: #
      "scurry": PathScurry {},
    },
    "packageJson": PackageJson {},
  },
  "packageJson": PackageJson {},
  projectRoot: #
  "scurry": PathScurry {},
}
`

exports[`test/commands/install.ts > TAP > usage 1`] = `
Usage:
  vlt install [package ...]

Install the specified package, updating dependencies appropriately

`
