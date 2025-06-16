/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/query.ts > TAP > query > should have usage 1`] = `
Usage:
  vlt query
  vlt query <query> --view=<human | json | mermaid | gui>
  vlt query <query> --expect-results=<comparison string>

List installed dependencies matching the provided query.

The vlt Dependency Selector Syntax is a CSS-like query language that allows you
to filter installed dependencies using a variety of metadata in the form of
CSS-like attributes, pseudo selectors & combinators.

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
    }
  },
  {
    "name": "foo",
    "fromID": "file·.",
    "spec": "foo@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "foo@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "registry": "https://registry.npmjs.org/",
        "registries": {
          "npm": "https://registry.npmjs.org/",
          "custom": "https://example.com"
        },
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "git-host-archives": {
          "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
          "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
          "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
          "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish"
        }
      },
      "name": "foo",
      "bareSpec": "^1.0.0",
      "registry": "https://registry.npmjs.org/",
      "registrySpec": "^1.0.0",
      "semver": "^1.0.0",
      "range": {
        "raw": "^1.0.0",
        "isAny": false,
        "isSingle": false,
        "set": [
          {
            "includePrerelease": false,
            "raw": "^1.0.0",
            "tokens": [
              "^1.0.0"
            ],
            "tuples": [
              [
                ">=",
                {
                  "raw": "1.0.0",
                  "major": 1,
                  "minor": 0,
                  "patch": 0
                }
              ],
              [
                "<",
                {
                  "raw": "1.0.0",
                  "major": 2,
                  "minor": 0,
                  "patch": 0,
                  "prerelease": [
                    0
                  ]
                }
              ]
            ],
            "isNone": false,
            "isAny": false
          }
        ],
        "includePrerelease": false
      }
    },
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
    }
  },
  {
    "name": "bar",
    "fromID": "file·.",
    "spec": "bar@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "bar@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "registry": "https://registry.npmjs.org/",
        "registries": {
          "npm": "https://registry.npmjs.org/",
          "custom": "https://example.com"
        },
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "git-host-archives": {
          "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
          "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
          "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
          "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish"
        }
      },
      "name": "bar",
      "bareSpec": "^1.0.0",
      "registry": "https://registry.npmjs.org/",
      "registrySpec": "^1.0.0",
      "semver": "^1.0.0",
      "range": {
        "raw": "^1.0.0",
        "isAny": false,
        "isSingle": false,
        "set": [
          {
            "includePrerelease": false,
            "raw": "^1.0.0",
            "tokens": [
              "^1.0.0"
            ],
            "tuples": [
              [
                ">=",
                {
                  "raw": "1.0.0",
                  "major": 1,
                  "minor": 0,
                  "patch": 0
                }
              ],
              [
                "<",
                {
                  "raw": "1.0.0",
                  "major": 2,
                  "minor": 0,
                  "patch": 0,
                  "prerelease": [
                    0
                  ]
                }
              ]
            ],
            "isNone": false,
            "isAny": false
          }
        ],
        "includePrerelease": false
      }
    },
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
    }
  },
  {
    "name": "baz",
    "fromID": "··bar@1.0.0",
    "spec": "baz@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "baz@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "registry": "https://example.com",
        "registries": {
          "npm": "https://registry.npmjs.org/",
          "custom": "https://example.com"
        },
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "git-host-archives": {
          "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
          "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
          "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
          "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish"
        }
      },
      "name": "baz",
      "bareSpec": "^1.0.0",
      "namedRegistry": "custom",
      "registry": "https://example.com",
      "registrySpec": "^1.0.0",
      "semver": "^1.0.0",
      "range": {
        "raw": "^1.0.0",
        "isAny": false,
        "isSingle": false,
        "set": [
          {
            "includePrerelease": false,
            "raw": "^1.0.0",
            "tokens": [
              "^1.0.0"
            ],
            "tuples": [
              [
                ">=",
                {
                  "raw": "1.0.0",
                  "major": 1,
                  "minor": 0,
                  "patch": 0
                }
              ],
              [
                "<",
                {
                  "raw": "1.0.0",
                  "major": 2,
                  "minor": 0,
                  "patch": 0,
                  "prerelease": [
                    0
                  ]
                }
              ]
            ],
            "isNone": false,
            "isAny": false
          }
        ],
        "includePrerelease": false
      }
    },
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
    "type": {
      "type": "registry",
      "spec": "foo@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "registry": "https://registry.npmjs.org/",
        "registries": {
          "npm": "https://registry.npmjs.org/",
          "custom": "https://example.com"
        },
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "git-host-archives": {
          "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
          "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
          "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
          "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish"
        }
      },
      "name": "foo",
      "bareSpec": "^1.0.0",
      "registry": "https://registry.npmjs.org/",
      "registrySpec": "^1.0.0",
      "semver": "^1.0.0",
      "range": {
        "raw": "^1.0.0",
        "isAny": false,
        "isSingle": false,
        "set": [
          {
            "includePrerelease": false,
            "raw": "^1.0.0",
            "tokens": [
              "^1.0.0"
            ],
            "tuples": [
              [
                ">=",
                {
                  "raw": "1.0.0",
                  "major": 1,
                  "minor": 0,
                  "patch": 0
                }
              ],
              [
                "<",
                {
                  "raw": "1.0.0",
                  "major": 2,
                  "minor": 0,
                  "patch": 0,
                  "prerelease": [
                    0
                  ]
                }
              ]
            ],
            "isNone": false,
            "isAny": false
          }
        ],
        "includePrerelease": false
      }
    },
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
    }
  }
]
`
