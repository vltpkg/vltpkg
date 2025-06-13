/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/parse-install-options.ts > TAP > multiple item added to root and workspace 1`] = `
Array [
  Object {},
  AddImportersDependenciesMapImpl {
    "file·." => Map {
      "abbrev" => Object {
        "spec": Spec {
          "bareSpec": "latest",
          "catalog": undefined,
          "conventionalRegistryTarball": undefined,
          "distTag": "latest",
          "file": undefined,
          "gitCommittish": undefined,
          "gitRemote": undefined,
          "gitSelector": undefined,
          "gitSelectorParsed": undefined,
          "name": "abbrev",
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
              "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
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
            "registries": Object {},
            "registry": "https://registry.npmjs.org/",
            "scope-registries": Object {},
          },
          "range": undefined,
          "registry": "https://registry.npmjs.org/",
          "registrySpec": "latest",
          "remoteURL": undefined,
          "scope": undefined,
          "scopeRegistry": undefined,
          "semver": undefined,
          "spec": "abbrev@latest",
          "subspec": undefined,
          "type": "registry",
          "workspace": undefined,
          "workspaceSpec": undefined,
        },
        "type": "dev",
      },
    },
    "workspace·packages§a" => Map {
      "english-days" => Object {
        "spec": Spec {
          "bareSpec": "latest",
          "catalog": undefined,
          "conventionalRegistryTarball": undefined,
          "distTag": "latest",
          "file": undefined,
          "gitCommittish": undefined,
          "gitRemote": undefined,
          "gitSelector": undefined,
          "gitSelectorParsed": undefined,
          "name": "english-days",
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
              "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
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
            "registries": Object {},
            "registry": "https://registry.npmjs.org/",
            "scope-registries": Object {},
          },
          "range": undefined,
          "registry": "https://registry.npmjs.org/",
          "registrySpec": "latest",
          "remoteURL": undefined,
          "scope": undefined,
          "scopeRegistry": undefined,
          "semver": undefined,
          "spec": "english-days@latest",
          "subspec": undefined,
          "type": "registry",
          "workspace": undefined,
          "workspaceSpec": undefined,
        },
        "type": "prod",
      },
      "simple-output" => Object {
        "spec": Spec {
          "bareSpec": "latest",
          "catalog": undefined,
          "conventionalRegistryTarball": undefined,
          "distTag": "latest",
          "file": undefined,
          "gitCommittish": undefined,
          "gitRemote": undefined,
          "gitSelector": undefined,
          "gitSelectorParsed": undefined,
          "name": "simple-output",
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
              "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
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
            "registries": Object {},
            "registry": "https://registry.npmjs.org/",
            "scope-registries": Object {},
          },
          "range": undefined,
          "registry": "https://registry.npmjs.org/",
          "registrySpec": "latest",
          "remoteURL": undefined,
          "scope": undefined,
          "scopeRegistry": undefined,
          "semver": undefined,
          "spec": "simple-output@latest",
          "subspec": undefined,
          "type": "registry",
          "workspace": undefined,
          "workspaceSpec": undefined,
        },
        "type": "prod",
      },
    },
  },
]
`

exports[`test/parse-install-options.ts > TAP > no item added to root 1`] = `
Array [
  Object {},
  AddImportersDependenciesMapImpl {
    "file·." => Map {},
  },
]
`

exports[`test/parse-install-options.ts > TAP > single item added to root 1`] = `
Array [
  Object {},
  AddImportersDependenciesMapImpl {
    "file·." => Map {
      "abbrev" => Object {
        "spec": Spec {
          "bareSpec": "latest",
          "catalog": undefined,
          "conventionalRegistryTarball": undefined,
          "distTag": "latest",
          "file": undefined,
          "gitCommittish": undefined,
          "gitRemote": undefined,
          "gitSelector": undefined,
          "gitSelectorParsed": undefined,
          "name": "abbrev",
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
              "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
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
            "registries": Object {},
            "registry": "https://registry.npmjs.org/",
            "scope-registries": Object {},
          },
          "range": undefined,
          "registry": "https://registry.npmjs.org/",
          "registrySpec": "latest",
          "remoteURL": undefined,
          "scope": undefined,
          "scopeRegistry": undefined,
          "semver": undefined,
          "spec": "abbrev@latest",
          "subspec": undefined,
          "type": "registry",
          "workspace": undefined,
          "workspaceSpec": undefined,
        },
        "type": "dev",
      },
    },
  },
]
`

exports[`test/parse-install-options.ts > TAP > single item added to workspace 1`] = `
Array [
  Object {},
  AddImportersDependenciesMapImpl {
    "workspace·packages§a" => Map {
      "abbrev" => Object {
        "spec": Spec {
          "bareSpec": "latest",
          "catalog": undefined,
          "conventionalRegistryTarball": undefined,
          "distTag": "latest",
          "file": undefined,
          "gitCommittish": undefined,
          "gitRemote": undefined,
          "gitSelector": undefined,
          "gitSelectorParsed": undefined,
          "name": "abbrev",
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
              "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
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
            "registries": Object {},
            "registry": "https://registry.npmjs.org/",
            "scope-registries": Object {},
          },
          "range": undefined,
          "registry": "https://registry.npmjs.org/",
          "registrySpec": "latest",
          "remoteURL": undefined,
          "scope": undefined,
          "scopeRegistry": undefined,
          "semver": undefined,
          "spec": "abbrev@latest",
          "subspec": undefined,
          "type": "registry",
          "workspace": undefined,
          "workspaceSpec": undefined,
        },
        "type": "optional",
      },
    },
  },
]
`
