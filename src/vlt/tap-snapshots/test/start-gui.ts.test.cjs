/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/start-gui.ts > TAP > e2e server test > /create-project > should log the server start message 1`] = `
Array [
  "⚡️ vlt GUI running at http://localhost:8017",
  "⚡️ vlt GUI running at http://localhost:8022",
]
`

exports[`test/start-gui.ts > TAP > e2e server test > /create-project > standard request > should update graph.json with new project data 1`] = `
{
  "hasDashboard": true,
  "importers": [
    {
      "id": "file·.",
      "name": "new-project",
      "version": "1.0.0",
      "location": ".",
      "importer": true,
      "manifest": {
        "name": "new-project",
        "version": "1.0.0",
        "description": "",
        "main": "index.js",
        "author": "Ruy Adorno"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  ],
  "lockfile": {
    "options": {},
    "nodes": {},
    "edges": {}
  },
  "projectInfo": {
    "tools": [
      "js"
    ],
    "vltInstalled": false
  }
}
`

exports[`test/start-gui.ts > TAP > e2e server test > /install > should install dependencies 1`] = `
install

`

exports[`test/start-gui.ts > TAP > e2e server test > /select-project > should log the server start message 1`] = `
Array [
  "⚡️ vlt GUI running at http://localhost:8017",
]
`

exports[`test/start-gui.ts > TAP > e2e server test > /select-project > should update graph.json with new data 1`] = `
{
  "hasDashboard": true,
  "importers": [
    {
      "id": "file·.",
      "name": "other-project",
      "location": ".",
      "importer": true,
      "manifest": {
        "name": "other-project"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  ],
  "lockfile": {
    "options": {},
    "nodes": {},
    "edges": {}
  },
  "projectInfo": {
    "tools": [
      "pnpm"
    ],
    "vltInstalled": false
  }
}
`

exports[`test/start-gui.ts > TAP > e2e server test > /select-project > should write graph.json with data from the current project 1`] = `
{
  "hasDashboard": true,
  "importers": [
    {
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
  ],
  "lockfile": {
    "options": {},
    "nodes": {},
    "edges": {
      "file·. aliased": "dev custom:foo@^1.0.0 MISSING",
      "file·. bar": "optional ^1.0.0 MISSING",
      "file·. @scoped/a": "prod ^1.0.0 MISSING",
      "file·. @scoped/b": "prod ^1.0.0 MISSING",
      "file·. foo": "prod ^1.0.0 MISSING",
      "file·. link": "prod file:./linked MISSING",
      "file·. missing": "prod ^1.0.0 MISSING"
    }
  },
  "projectInfo": {
    "tools": [
      "vlt"
    ],
    "vltInstalled": true
  }
}
`

exports[`test/start-gui.ts > TAP > formatDashboardJson dashboardProjectLocations > should return the expected dashboard project locations 1`] = `
Array [
  Object {
    "path": "{CWD}/.tap/fixtures/test-start-gui.ts-formatDashboardJson-dashboardProjectLocations",
    "readablePath": "~",
  },
  Object {
    "path": "{CWD}/.tap/fixtures/test-start-gui.ts-formatDashboardJson-dashboardProjectLocations/projects",
    "readablePath": "~/projects",
  },
  Object {
    "path": "{CWD}/.tap/fixtures/test-start-gui.ts-formatDashboardJson-dashboardProjectLocations/drafts/more",
    "readablePath": "~/drafts/more",
  },
  Object {
    "path": "{CWD}/.tap/fixtures/test-start-gui.ts-formatDashboardJson-dashboardProjectLocations/drafts/recent",
    "readablePath": "~/drafts/recent",
  },
  Object {
    "path": "{CWD}/.tap/fixtures/test-start-gui.ts-formatDashboardJson-dashboardProjectLocations/drafts/previous",
    "readablePath": "~/drafts/previous",
  },
  Object {
    "path": "{CWD}/.tap/fixtures/test-start-gui.ts-formatDashboardJson-dashboardProjectLocations/drafts/more/util/extra",
    "readablePath": "~/drafts/more/util/extra",
  },
]
`

exports[`test/start-gui.ts > TAP > parseInstallArgs > multiple item added to root and workspace 1`] = `
Object {
  "add": AddImportersDependenciesMapImpl {
    "file·." => Map {
      "abbrev" => Object {
        "spec": Spec {
          "bareSpec": "latest",
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
            "registries": Object {
              "npm": "https://registry.npmjs.org/",
            },
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
            "registries": Object {
              "npm": "https://registry.npmjs.org/",
            },
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
            "registries": Object {
              "npm": "https://registry.npmjs.org/",
            },
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
  "conf": Object {},
}
`

exports[`test/start-gui.ts > TAP > parseInstallArgs > no item added to root 1`] = `
Object {
  "add": AddImportersDependenciesMapImpl {
    "file·." => Map {},
  },
  "conf": Object {},
}
`

exports[`test/start-gui.ts > TAP > parseInstallArgs > single item added to root 1`] = `
Object {
  "add": AddImportersDependenciesMapImpl {
    "file·." => Map {
      "abbrev" => Object {
        "spec": Spec {
          "bareSpec": "latest",
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
            "registries": Object {
              "npm": "https://registry.npmjs.org/",
            },
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
  "conf": Object {},
}
`

exports[`test/start-gui.ts > TAP > parseInstallArgs > single item added to workspace 1`] = `
Object {
  "add": AddImportersDependenciesMapImpl {
    "workspace·packages§a" => Map {
      "abbrev" => Object {
        "spec": Spec {
          "bareSpec": "latest",
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
            "registries": Object {
              "npm": "https://registry.npmjs.org/",
            },
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
  "conf": Object {},
}
`

exports[`test/start-gui.ts > TAP > starts gui data and server > should copy all files to tmp directory 1`] = `
Array [
  "dashboard.json",
  "favicon.ico",
  "fonts",
  "graph.json",
  "index.html",
  "index.js",
  "index.js.map",
  "main.css",
]
`

exports[`test/start-gui.ts > TAP > starts gui data and server > should log the server start message 1`] = `
Array [
  "⚡️ vlt GUI running at http://localhost:7017",
]
`

exports[`test/start-gui.ts > TAP > starts gui data and server > should write empty graph.json used in tests 1`] = `
Object {
  "hasDashboard": true,
  "importers": Array [],
  "lockfile": Object {
    "edges": Object {},
    "importers": Array [],
    "nodes": Object {},
    "options": Object {},
  },
  "projectInfo": Object {
    "tools": Array [
      "js",
    ],
    "vltInstalled": false,
  },
}
`
