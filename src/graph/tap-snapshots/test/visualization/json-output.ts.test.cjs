/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
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
          "a": "npm:@myscope/foo@^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false,
      "confused": false
    }
  },
  {
    "name": "@myscope/foo",
    "fromID": "file·.",
    "spec": "@myscope/foo@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "@myscope/foo@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "registry": "https://registry.npmjs.org/",
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "registries": {},
        "git-host-archives": {
          "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
          "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
          "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
          "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish"
        }
      },
      "name": "@myscope/foo",
      "scope": "@myscope",
      "bareSpec": "^1.0.0",
      "namedRegistry": "npm",
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
      "id": "·npm·@myscope§foo@1.0.0",
      "name": "@myscope/foo",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/·npm·@myscope§foo@1.0.0/node_modules/@myscope/foo",
      "importer": false,
      "manifest": {
        "name": "@myscope/foo",
        "version": "1.0.0"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true,
      "confused": false
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
      "optional": false,
      "confused": false
    }
  },
  {
    "name": "a",
    "fromID": "file·.",
    "spec": "a@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "a@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "registry": "https://registry.npmjs.org/",
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "registries": {},
        "git-host-archives": {
          "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
          "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
          "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
          "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish"
        }
      },
      "name": "a",
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
      "optional": false,
      "confused": false
    }
  },
  {
    "name": "b",
    "fromID": "··a@1.0.0",
    "spec": "b@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "b@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "registry": "https://registry.npmjs.org/",
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "registries": {},
        "git-host-archives": {
          "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
          "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
          "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
          "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish"
        }
      },
      "name": "b",
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
      "optional": false,
      "confused": false
    }
  },
  {
    "name": "a",
    "fromID": "··b@1.0.0",
    "spec": "a@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "a@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "registry": "https://registry.npmjs.org/",
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "registries": {},
        "git-host-archives": {
          "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
          "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
          "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
          "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish"
        }
      },
      "name": "a",
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
      "optional": false,
      "confused": false
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
      "optional": false,
      "confused": false
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
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "registry": "https://registry.npmjs.org/",
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "registries": {},
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
      "dev": true,
      "optional": false,
      "confused": false
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
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "registry": "https://registry.npmjs.org/",
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "registries": {},
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
          "baz": "custom:baz@^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true,
      "confused": false
    }
  },
  {
    "name": "bar",
    "fromID": "··bar@1.0.0",
    "spec": "bar@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "bar@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "registry": "http://example.com",
        "registries": {
          "custom": "http://example.com",
          "npm": "https://registry.npmjs.org/"
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
      "namedRegistry": "custom",
      "registry": "http://example.com",
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
      "name": "bar",
      "version": "1.0.0",
      "location": "./node_modules/.vlt/·custom·baz@1.0.0/node_modules/bar",
      "importer": false,
      "manifest": {
        "name": "bar",
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
      "optional": true,
      "confused": true,
      "rawManifest": {
        "name": "baz",
        "version": "1.0.0",
        "dist": {
          "tarball": "http://example.com/baz",
          "integrity": "sha512-deadbeef"
        }
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
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "registry": "https://registry.npmjs.org/",
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "registries": {},
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
      "dev": true,
      "optional": false,
      "confused": false
    }
  },
  {
    "name": "extraneous",
    "fromID": "··bar@1.0.0",
    "spec": "extraneous@extraneous@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "extraneous@extraneous@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "registry": "https://registry.npmjs.org/",
        "registries": {
          "custom": "http://example.com",
          "npm": "https://registry.npmjs.org/"
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
      "name": "extraneous",
      "bareSpec": "extraneous@^1.0.0",
      "registry": "https://registry.npmjs.org/",
      "registrySpec": "extraneous@^1.0.0",
      "distTag": "extraneous@^1.0.0"
    },
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
      "optional": true,
      "confused": false
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
      "optional": false,
      "confused": false
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
      "optional": false,
      "confused": false
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
      "optional": false,
      "confused": false
    }
  },
  {
    "name": "a",
    "fromID": "file·.",
    "spec": "a@^1.0.0",
    "type": {
      "type": "registry",
      "spec": "a@^1.0.0",
      "options": {
        "catalog": {},
        "catalogs": {},
        "jsr-registries": {
          "jsr": "https://npm.jsr.io/"
        },
        "registry": "https://registry.npmjs.org/",
        "scope-registries": {},
        "git-hosts": {
          "github": "git+ssh://git@github.com:$1/$2.git",
          "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
          "gitlab": "git+ssh://git@gitlab.com:$1/$2.git",
          "gist": "git+ssh://git@gist.github.com/$1.git"
        },
        "registries": {},
        "git-host-archives": {
          "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
          "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
          "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
          "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish"
        }
      },
      "name": "a",
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
      "id": "··a@%5E1.0.0",
      "name": "a",
      "location": "./node_modules/.vlt/··a@%5E1.0.0/node_modules/a",
      "importer": false,
      "manifest": {
        "name": "a"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": true,
      "confused": false
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
      "optional": false,
      "confused": false
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
      "optional": false,
      "confused": false
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
      "optional": false,
      "confused": false
    }
  }
]
`
