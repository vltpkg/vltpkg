/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/browser.ts > TAP > basic parsing tests > @a/b@npm:@y/z@1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@a/b@npm:@y/z@1.2.3',
  name: '@a/b',
  scope: '@a',
  bareSpec: 'npm:@y/z@1.2.3',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  conventionalRegistryTarball: 'https://registry.npmjs.org/@y/z/-/z-1.2.3.tgz',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@y/z@1.2.3',
    name: '@y/z',
    scope: '@y',
    bareSpec: '1.2.3',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    registrySpec: '1.2.3',
    conventionalRegistryTarball: 'https://registry.npmjs.org/@y/z/-/z-1.2.3.tgz',
    semver: '1.2.3',
    range: Range {
      raw: '1.2.3',
      isAny: false,
      isSingle: true,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '1.2.3',
          tokens: [ '1.2.3' ],
          tuples: [
            [
              '',
              Version {
                raw: '1.2.3',
                major: 1,
                minor: 2,
                patch: 3,
                prerelease: undefined,
                build: undefined
              }
            ]
          ],
          isNone: false,
          isAny: false
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @a/b@npm:@y/z@1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@a/b@npm:@y/z@1.2.3',
  name: '@a/b',
  scope: '@a',
  bareSpec: 'npm:@y/z@1.2.3',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  conventionalRegistryTarball: 'https://registry.npmjs.org/@y/z/-/z-1.2.3.tgz',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@y/z@1.2.3',
    name: '@y/z',
    scope: '@y',
    bareSpec: '1.2.3',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    registrySpec: '1.2.3',
    conventionalRegistryTarball: 'https://registry.npmjs.org/@y/z/-/z-1.2.3.tgz',
    semver: '1.2.3',
    range: Range {
      raw: '1.2.3',
      isAny: false,
      isSingle: true,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @a/b@npm:@y/z@1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@a/b@npm:@y/z@1.2.3'[39m,
  name: [32m'@a/b'[39m,
  scope: [32m'@a'[39m,
  bareSpec: [32m'npm:@y/z@1.2.3'[39m,
  namedRegistry: [32m'npm'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  conventionalRegistryTarball: [32m'https://registry.npmjs.org/@y/z/-/z-1.2.3.tgz'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@y/z@1.2.3'[39m,
    name: [32m'@y/z'[39m,
    scope: [32m'@y'[39m,
    bareSpec: [32m'1.2.3'[39m,
    namedRegistry: [32m'npm'[39m,
    registry: [32m'https://registry.npmjs.org/'[39m,
    registrySpec: [32m'1.2.3'[39m,
    conventionalRegistryTarball: [32m'https://registry.npmjs.org/@y/z/-/z-1.2.3.tgz'[39m,
    semver: [32m'1.2.3'[39m,
    range: Range {
      raw: [32m'1.2.3'[39m,
      isAny: [33mfalse[39m,
      isSingle: [33mtrue[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @a/b@npm:@y/z@1.2.3 > toString 1`] = `
@a/b@npm:@y/z@1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '',
        tokens: [],
        tuples: [
          {
            isAny: true,
            toString: [Function: toString],
            includePrerelease: false,
            test: [Function: test]
          }
        ],
        isNone: false,
        isAny: true
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@foo/bar@'[39m,
  name: [32m'@foo/bar'[39m,
  scope: [32m'@foo'[39m,
  bareSpec: [32m''[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m''[39m,
  semver: [32m''[39m,
  range: Range {
    raw: [32m''[39m,
    isAny: [33mtrue[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@ > toString 1`] = `
@foo/bar@
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@* > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@*',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: '*',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '*',
  semver: '*',
  range: Range {
    raw: '*',
    isAny: true,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '*',
        tokens: [ '*' ],
        tuples: [
          {
            isAny: true,
            toString: [Function: toString],
            includePrerelease: false,
            test: [Function: test]
          }
        ],
        isNone: false,
        isAny: true
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@* > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@*',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: '*',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '*',
  semver: '*',
  range: Range {
    raw: '*',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@* > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@foo/bar@*'[39m,
  name: [32m'@foo/bar'[39m,
  scope: [32m'@foo'[39m,
  bareSpec: [32m'*'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m'*'[39m,
  semver: [32m'*'[39m,
  range: Range {
    raw: [32m'*'[39m,
    isAny: [33mtrue[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@* > toString 1`] = `
@foo/bar@*
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@baz > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@baz',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'baz',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'baz',
  distTag: 'baz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@baz',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'baz',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'baz',
  distTag: 'baz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@baz > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@foo/bar@baz'[39m,
  name: [32m'@foo/bar'[39m,
  scope: [32m'@foo'[39m,
  bareSpec: [32m'baz'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m'baz'[39m,
  distTag: [32m'baz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@baz > toString 1`] = `
@foo/bar@baz
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://bitbucket.org/user/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://bitbucket.org/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://bitbucket.org/user/foo',
  gitRemote: 'git+ssh://bitbucket.org/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://bitbucket.org/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://bitbucket.org/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://bitbucket.org/user/foo',
  gitRemote: 'git+ssh://bitbucket.org/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://bitbucket.org/user/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'@foo/bar@git+ssh://bitbucket.org/user/foo'[39m,
  name: [32m'@foo/bar'[39m,
  scope: [32m'@foo'[39m,
  bareSpec: [32m'git+ssh://bitbucket.org/user/foo'[39m,
  gitRemote: [32m'git+ssh://bitbucket.org/user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://bitbucket.org/user/foo > toString 1`] = `
@foo/bar@git+ssh://bitbucket.org/user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://github.com/user/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://github.com/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://github.com/user/foo',
  gitRemote: 'git+ssh://github.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://github.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://github.com/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://github.com/user/foo',
  gitRemote: 'git+ssh://github.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://github.com/user/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'@foo/bar@git+ssh://github.com/user/foo'[39m,
  name: [32m'@foo/bar'[39m,
  scope: [32m'@foo'[39m,
  bareSpec: [32m'git+ssh://github.com/user/foo'[39m,
  gitRemote: [32m'git+ssh://github.com/user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://github.com/user/foo > toString 1`] = `
@foo/bar@git+ssh://github.com/user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://gitlab.com/user/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://gitlab.com/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://gitlab.com/user/foo',
  gitRemote: 'git+ssh://gitlab.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://gitlab.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://gitlab.com/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://gitlab.com/user/foo',
  gitRemote: 'git+ssh://gitlab.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://gitlab.com/user/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'@foo/bar@git+ssh://gitlab.com/user/foo'[39m,
  name: [32m'@foo/bar'[39m,
  scope: [32m'@foo'[39m,
  bareSpec: [32m'git+ssh://gitlab.com/user/foo'[39m,
  gitRemote: [32m'git+ssh://gitlab.com/user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://gitlab.com/user/foo > toString 1`] = `
@foo/bar@git+ssh://gitlab.com/user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://notgithub.com/user/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://notgithub.com/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://notgithub.com/user/foo',
  gitRemote: 'git+ssh://notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://notgithub.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://notgithub.com/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://notgithub.com/user/foo',
  gitRemote: 'git+ssh://notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://notgithub.com/user/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'@foo/bar@git+ssh://notgithub.com/user/foo'[39m,
  name: [32m'@foo/bar'[39m,
  scope: [32m'@foo'[39m,
  bareSpec: [32m'git+ssh://notgithub.com/user/foo'[39m,
  gitRemote: [32m'git+ssh://notgithub.com/user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @foo/bar@git+ssh://notgithub.com/user/foo > toString 1`] = `
@foo/bar@git+ssh://notgithub.com/user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr: > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '',
          tokens: [],
          tuples: [
            {
              isAny: true,
              toString: [Function: toString],
              includePrerelease: false,
              test: [Function: test]
            }
          ],
          isNone: false,
          isAny: true
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr: > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr: > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@luca/cases@jsr:'[39m,
  name: [32m'@luca/cases'[39m,
  scope: [32m'@luca'[39m,
  bareSpec: [32m'jsr:'[39m,
  namedJsrRegistry: [32m'jsr'[39m,
  registry: [32m'https://npm.jsr.io/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@jsr/luca__cases@'[39m,
    name: [32m'@jsr/luca__cases'[39m,
    scope: [32m'@jsr'[39m,
    scopeRegistry: [32m'https://npm.jsr.io/'[39m,
    bareSpec: [32m''[39m,
    namedJsrRegistry: [32m'jsr'[39m,
    registry: [32m'https://npm.jsr.io/'[39m,
    registrySpec: [32m''[39m,
    semver: [32m''[39m,
    range: Range {
      raw: [32m''[39m,
      isAny: [33mtrue[39m,
      isSingle: [33mfalse[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr: > toString 1`] = `
@luca/cases@jsr:
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:@luca/cases > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '',
          tokens: [],
          tuples: [
            {
              isAny: true,
              toString: [Function: toString],
              includePrerelease: false,
              test: [Function: test]
            }
          ],
          isNone: false,
          isAny: true
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:@luca/cases > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:@luca/cases > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@luca/cases@jsr:'[39m,
  name: [32m'@luca/cases'[39m,
  scope: [32m'@luca'[39m,
  bareSpec: [32m'jsr:'[39m,
  namedJsrRegistry: [32m'jsr'[39m,
  registry: [32m'https://npm.jsr.io/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@jsr/luca__cases'[39m,
    name: [32m'@jsr/luca__cases'[39m,
    scope: [32m'@jsr'[39m,
    scopeRegistry: [32m'https://npm.jsr.io/'[39m,
    bareSpec: [32m''[39m,
    namedJsrRegistry: [32m'jsr'[39m,
    registry: [32m'https://npm.jsr.io/'[39m,
    registrySpec: [32m''[39m,
    semver: [32m''[39m,
    range: Range {
      raw: [32m''[39m,
      isAny: [33mtrue[39m,
      isSingle: [33mfalse[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:@luca/cases > toString 1`] = `
@luca/cases@jsr:
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:@luca/cases@1 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:1',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '1',
          tokens: [ '1' ],
          tuples: [
            [
              '>=',
              Version {
                raw: '1',
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: undefined,
                build: undefined
              }
            ],
            [
              '<',
              Version {
                raw: '1',
                major: 2,
                minor: 0,
                patch: 0,
                prerelease: [ 0 ],
                build: undefined
              }
            ]
          ],
          isNone: false,
          isAny: false
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:@luca/cases@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:1',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:@luca/cases@1 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@luca/cases@jsr:1'[39m,
  name: [32m'@luca/cases'[39m,
  scope: [32m'@luca'[39m,
  bareSpec: [32m'jsr:1'[39m,
  namedJsrRegistry: [32m'jsr'[39m,
  registry: [32m'https://npm.jsr.io/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@jsr/luca__cases@1'[39m,
    name: [32m'@jsr/luca__cases'[39m,
    scope: [32m'@jsr'[39m,
    scopeRegistry: [32m'https://npm.jsr.io/'[39m,
    bareSpec: [32m'1'[39m,
    namedJsrRegistry: [32m'jsr'[39m,
    registry: [32m'https://npm.jsr.io/'[39m,
    registrySpec: [32m'1'[39m,
    semver: [32m'1'[39m,
    range: Range {
      raw: [32m'1'[39m,
      isAny: [33mfalse[39m,
      isSingle: [33mfalse[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:@luca/cases@1 > toString 1`] = `
@luca/cases@jsr:1
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:1 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:1',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '1',
          tokens: [ '1' ],
          tuples: [
            [
              '>=',
              Version {
                raw: '1',
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: undefined,
                build: undefined
              }
            ],
            [
              '<',
              Version {
                raw: '1',
                major: 2,
                minor: 0,
                patch: 0,
                prerelease: [ 0 ],
                build: undefined
              }
            ]
          ],
          isNone: false,
          isAny: false
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:1',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:1 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@luca/cases@jsr:1'[39m,
  name: [32m'@luca/cases'[39m,
  scope: [32m'@luca'[39m,
  bareSpec: [32m'jsr:1'[39m,
  namedJsrRegistry: [32m'jsr'[39m,
  registry: [32m'https://npm.jsr.io/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@jsr/luca__cases@1'[39m,
    name: [32m'@jsr/luca__cases'[39m,
    scope: [32m'@jsr'[39m,
    scopeRegistry: [32m'https://npm.jsr.io/'[39m,
    bareSpec: [32m'1'[39m,
    namedJsrRegistry: [32m'jsr'[39m,
    registry: [32m'https://npm.jsr.io/'[39m,
    registrySpec: [32m'1'[39m,
    semver: [32m'1'[39m,
    range: Range {
      raw: [32m'1'[39m,
      isAny: [33mfalse[39m,
      isSingle: [33mfalse[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @luca/cases@jsr:1 > toString 1`] = `
@luca/cases@jsr:1
`

exports[`test/browser.ts > TAP > basic parsing tests > @other/xyz@jsr:@luca/cases > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@other/xyz@jsr:@luca/cases',
  name: '@other/xyz',
  scope: '@other',
  bareSpec: 'jsr:@luca/cases',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '',
          tokens: [],
          tuples: [
            {
              isAny: true,
              toString: [Function: toString],
              includePrerelease: false,
              test: [Function: test]
            }
          ],
          isNone: false,
          isAny: true
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @other/xyz@jsr:@luca/cases > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@other/xyz@jsr:@luca/cases',
  name: '@other/xyz',
  scope: '@other',
  bareSpec: 'jsr:@luca/cases',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @other/xyz@jsr:@luca/cases > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@other/xyz@jsr:@luca/cases'[39m,
  name: [32m'@other/xyz'[39m,
  scope: [32m'@other'[39m,
  bareSpec: [32m'jsr:@luca/cases'[39m,
  namedJsrRegistry: [32m'jsr'[39m,
  registry: [32m'https://npm.jsr.io/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@jsr/luca__cases'[39m,
    name: [32m'@jsr/luca__cases'[39m,
    scope: [32m'@jsr'[39m,
    scopeRegistry: [32m'https://npm.jsr.io/'[39m,
    bareSpec: [32m''[39m,
    namedJsrRegistry: [32m'jsr'[39m,
    registry: [32m'https://npm.jsr.io/'[39m,
    registrySpec: [32m''[39m,
    semver: [32m''[39m,
    range: Range {
      raw: [32m''[39m,
      isAny: [33mtrue[39m,
      isSingle: [33mfalse[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @other/xyz@jsr:@luca/cases > toString 1`] = `
@other/xyz@jsr:@luca/cases
`

exports[`test/browser.ts > TAP > basic parsing tests > @other/xyz@jsr:@luca/cases@1 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@other/xyz@jsr:@luca/cases@1',
  name: '@other/xyz',
  scope: '@other',
  bareSpec: 'jsr:@luca/cases@1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '1',
          tokens: [ '1' ],
          tuples: [
            [
              '>=',
              Version {
                raw: '1',
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: undefined,
                build: undefined
              }
            ],
            [
              '<',
              Version {
                raw: '1',
                major: 2,
                minor: 0,
                patch: 0,
                prerelease: [ 0 ],
                build: undefined
              }
            ]
          ],
          isNone: false,
          isAny: false
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @other/xyz@jsr:@luca/cases@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@other/xyz@jsr:@luca/cases@1',
  name: '@other/xyz',
  scope: '@other',
  bareSpec: 'jsr:@luca/cases@1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @other/xyz@jsr:@luca/cases@1 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@other/xyz@jsr:@luca/cases@1'[39m,
  name: [32m'@other/xyz'[39m,
  scope: [32m'@other'[39m,
  bareSpec: [32m'jsr:@luca/cases@1'[39m,
  namedJsrRegistry: [32m'jsr'[39m,
  registry: [32m'https://npm.jsr.io/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@jsr/luca__cases@1'[39m,
    name: [32m'@jsr/luca__cases'[39m,
    scope: [32m'@jsr'[39m,
    scopeRegistry: [32m'https://npm.jsr.io/'[39m,
    bareSpec: [32m'1'[39m,
    namedJsrRegistry: [32m'jsr'[39m,
    registry: [32m'https://npm.jsr.io/'[39m,
    registrySpec: [32m'1'[39m,
    semver: [32m'1'[39m,
    range: Range {
      raw: [32m'1'[39m,
      isAny: [33mfalse[39m,
      isSingle: [33mfalse[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @other/xyz@jsr:@luca/cases@1 > toString 1`] = `
@other/xyz@jsr:@luca/cases@1
`

exports[`test/browser.ts > TAP > basic parsing tests > @x/y@workspace:@a/b@ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '@x/y@workspace:@a/b@',
  name: '@x/y',
  scope: '@x',
  bareSpec: 'workspace:@a/b@',
  workspaceSpec: '*',
  workspace: '@a/b'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @x/y@workspace:@a/b@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '@x/y@workspace:@a/b@',
  name: '@x/y',
  scope: '@x',
  bareSpec: 'workspace:@a/b@',
  workspaceSpec: '*',
  workspace: '@a/b'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @x/y@workspace:@a/b@ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'@x/y@workspace:@a/b@'[39m,
  name: [32m'@x/y'[39m,
  scope: [32m'@x'[39m,
  bareSpec: [32m'workspace:@a/b@'[39m,
  workspaceSpec: [32m'*'[39m,
  workspace: [32m'@a/b'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > @x/y@workspace:@a/b@ > toString 1`] = `
@x/y@workspace:@a/b@
`

exports[`test/browser.ts > TAP > basic parsing tests > cases@jsr:@luca/cases > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'cases@jsr:@luca/cases',
  name: 'cases',
  bareSpec: 'jsr:@luca/cases',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '',
          tokens: [],
          tuples: [
            {
              isAny: true,
              toString: [Function: toString],
              includePrerelease: false,
              test: [Function: test]
            }
          ],
          isNone: false,
          isAny: true
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > cases@jsr:@luca/cases > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'cases@jsr:@luca/cases',
  name: 'cases',
  bareSpec: 'jsr:@luca/cases',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > cases@jsr:@luca/cases > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'cases@jsr:@luca/cases'[39m,
  name: [32m'cases'[39m,
  bareSpec: [32m'jsr:@luca/cases'[39m,
  namedJsrRegistry: [32m'jsr'[39m,
  registry: [32m'https://npm.jsr.io/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@jsr/luca__cases'[39m,
    name: [32m'@jsr/luca__cases'[39m,
    scope: [32m'@jsr'[39m,
    scopeRegistry: [32m'https://npm.jsr.io/'[39m,
    bareSpec: [32m''[39m,
    namedJsrRegistry: [32m'jsr'[39m,
    registry: [32m'https://npm.jsr.io/'[39m,
    registrySpec: [32m''[39m,
    semver: [32m''[39m,
    range: Range {
      raw: [32m''[39m,
      isAny: [33mtrue[39m,
      isSingle: [33mfalse[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > cases@jsr:@luca/cases > toString 1`] = `
cases@jsr:@luca/cases
`

exports[`test/browser.ts > TAP > basic parsing tests > cases@jsr:@luca/cases@1 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'cases@jsr:@luca/cases@1',
  name: 'cases',
  bareSpec: 'jsr:@luca/cases@1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '1',
          tokens: [ '1' ],
          tuples: [
            [
              '>=',
              Version {
                raw: '1',
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: undefined,
                build: undefined
              }
            ],
            [
              '<',
              Version {
                raw: '1',
                major: 2,
                minor: 0,
                patch: 0,
                prerelease: [ 0 ],
                build: undefined
              }
            ]
          ],
          isNone: false,
          isAny: false
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > cases@jsr:@luca/cases@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'cases@jsr:@luca/cases@1',
  name: 'cases',
  bareSpec: 'jsr:@luca/cases@1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > cases@jsr:@luca/cases@1 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'cases@jsr:@luca/cases@1'[39m,
  name: [32m'cases'[39m,
  bareSpec: [32m'jsr:@luca/cases@1'[39m,
  namedJsrRegistry: [32m'jsr'[39m,
  registry: [32m'https://npm.jsr.io/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@jsr/luca__cases@1'[39m,
    name: [32m'@jsr/luca__cases'[39m,
    scope: [32m'@jsr'[39m,
    scopeRegistry: [32m'https://npm.jsr.io/'[39m,
    bareSpec: [32m'1'[39m,
    namedJsrRegistry: [32m'jsr'[39m,
    registry: [32m'https://npm.jsr.io/'[39m,
    registrySpec: [32m'1'[39m,
    semver: [32m'1'[39m,
    range: Range {
      raw: [32m'1'[39m,
      isAny: [33mfalse[39m,
      isSingle: [33mfalse[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > cases@jsr:@luca/cases@1 > toString 1`] = `
cases@jsr:@luca/cases@1
`

exports[`test/browser.ts > TAP > basic parsing tests > foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo',
  name: 'foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '',
        tokens: [],
        tuples: [
          {
            isAny: true,
            toString: [Function: toString],
            includePrerelease: false,
            test: [Function: test]
          }
        ],
        isNone: false,
        isAny: true
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo',
  name: 'foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m''[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m''[39m,
  semver: [32m''[39m,
  range: Range {
    raw: [32m''[39m,
    isAny: [33mtrue[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo > toString 1`] = `
foo@
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@',
  name: 'foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '',
        tokens: [],
        tuples: [
          {
            isAny: true,
            toString: [Function: toString],
            includePrerelease: false,
            test: [Function: test]
          }
        ],
        isNone: false,
        isAny: true
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@',
  name: 'foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m''[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m''[39m,
  semver: [32m''[39m,
  range: Range {
    raw: [32m''[39m,
    isAny: [33mtrue[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ > toString 1`] = `
foo@
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2 ',
  name: 'foo',
  bareSpec: ' 1.2 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2 ',
  semver: '1.2',
  range: Range {
    raw: ' 1.2 ',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '1.2',
        tokens: [ '1.2' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.2',
              major: 1,
              minor: 2,
              patch: 0,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.2',
              major: 1,
              minor: 3,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2 ',
  name: 'foo',
  bareSpec: ' 1.2 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2 ',
  semver: '1.2',
  range: Range {
    raw: ' 1.2 ',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@ 1.2 '[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m' 1.2 '[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m' 1.2 '[39m,
  semver: [32m'1.2'[39m,
  range: Range {
    raw: [32m' 1.2 '[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2 > toString 1`] = `
foo@ 1.2 
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2.3 ',
  name: 'foo',
  bareSpec: ' 1.2.3 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2.3 ',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: ' 1.2.3 ',
    isAny: false,
    isSingle: true,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '1.2.3',
        tokens: [ '1.2.3' ],
        tuples: [
          [
            '',
            Version {
              raw: '1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect deep 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2.3',
  name: 'foo',
  bareSpec: ' 1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2.3',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: ' 1.2.3',
    isAny: false,
    isSingle: true,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '1.2.3',
        tokens: [ '1.2.3' ],
        tuples: [
          [
            '',
            Version {
              raw: '1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2.3 ',
  name: 'foo',
  bareSpec: ' 1.2.3 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2.3 ',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: ' 1.2.3 ',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect default 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2.3',
  name: 'foo',
  bareSpec: ' 1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2.3',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: ' 1.2.3',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@ 1.2.3 '[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m' 1.2.3 '[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m' 1.2.3 '[39m,
  conventionalRegistryTarball: [32m'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz'[39m,
  semver: [32m'1.2.3'[39m,
  range: Range {
    raw: [32m' 1.2.3 '[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mtrue[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect with color 2`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@ 1.2.3'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m' 1.2.3'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m' 1.2.3'[39m,
  conventionalRegistryTarball: [32m'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz'[39m,
  semver: [32m'1.2.3'[39m,
  range: Range {
    raw: [32m' 1.2.3'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mtrue[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2.3 > toString 1`] = `
foo@ 1.2.3 
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@ 1.2.3 > toString 2`] = `
foo@ 1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@=v1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@=v1.2.3',
  name: 'foo',
  bareSpec: '=v1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '=v1.2.3',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '=v1.2.3',
  range: Range {
    raw: '=v1.2.3',
    isAny: false,
    isSingle: true,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '=v1.2.3',
        tokens: [ '=v1.2.3' ],
        tuples: [
          [
            '',
            Version {
              raw: '=v1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@=v1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@=v1.2.3',
  name: 'foo',
  bareSpec: '=v1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '=v1.2.3',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '=v1.2.3',
  range: Range {
    raw: '=v1.2.3',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@=v1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@=v1.2.3'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'=v1.2.3'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m'=v1.2.3'[39m,
  conventionalRegistryTarball: [32m'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz'[39m,
  semver: [32m'=v1.2.3'[39m,
  range: Range {
    raw: [32m'=v1.2.3'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mtrue[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@=v1.2.3 > toString 1`] = `
foo@=v1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@~1.2 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@~1.2',
  name: 'foo',
  bareSpec: '~1.2',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '~1.2',
  semver: '~1.2',
  range: Range {
    raw: '~1.2',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '~1.2',
        tokens: [ '~1.2' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.2',
              major: 1,
              minor: 2,
              patch: 0,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.2',
              major: 1,
              minor: 3,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@~1.2 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@~1.2',
  name: 'foo',
  bareSpec: '~1.2',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '~1.2',
  semver: '~1.2',
  range: Range {
    raw: '~1.2',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@~1.2 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@~1.2'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'~1.2'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m'~1.2'[39m,
  semver: [32m'~1.2'[39m,
  range: Range {
    raw: [32m'~1.2'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@~1.2 > toString 1`] = `
foo@~1.2
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2',
  name: 'foo',
  bareSpec: '1.2',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2',
  semver: '1.2',
  range: Range {
    raw: '1.2',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '1.2',
        tokens: [ '1.2' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.2',
              major: 1,
              minor: 2,
              patch: 0,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.2',
              major: 1,
              minor: 3,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2',
  name: 'foo',
  bareSpec: '1.2',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2',
  semver: '1.2',
  range: Range {
    raw: '1.2',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@1.2'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'1.2'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m'1.2'[39m,
  semver: [32m'1.2'[39m,
  range: Range {
    raw: [32m'1.2'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2 > toString 1`] = `
foo@1.2
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2.3',
  name: 'foo',
  bareSpec: '1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2.3',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: '1.2.3',
    isAny: false,
    isSingle: true,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '1.2.3',
        tokens: [ '1.2.3' ],
        tuples: [
          [
            '',
            Version {
              raw: '1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2.3 > inspect deep 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2.3 ',
  name: 'foo',
  bareSpec: '1.2.3 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2.3 ',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: '1.2.3 ',
    isAny: false,
    isSingle: true,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '1.2.3',
        tokens: [ '1.2.3' ],
        tuples: [
          [
            '',
            Version {
              raw: '1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2.3',
  name: 'foo',
  bareSpec: '1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2.3',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: '1.2.3',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2.3 > inspect default 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2.3 ',
  name: 'foo',
  bareSpec: '1.2.3 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2.3 ',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: '1.2.3 ',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@1.2.3'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'1.2.3'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m'1.2.3'[39m,
  conventionalRegistryTarball: [32m'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz'[39m,
  semver: [32m'1.2.3'[39m,
  range: Range {
    raw: [32m'1.2.3'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mtrue[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2.3 > inspect with color 2`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@1.2.3 '[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'1.2.3 '[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m'1.2.3 '[39m,
  conventionalRegistryTarball: [32m'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz'[39m,
  semver: [32m'1.2.3'[39m,
  range: Range {
    raw: [32m'1.2.3 '[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mtrue[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2.3 > toString 1`] = `
foo@1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@1.2.3 > toString 2`] = `
foo@1.2.3 
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@bar/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@github:bar/foo',
  name: 'foo',
  bareSpec: 'github:bar/foo',
  gitRemote: 'git+ssh://git@github.com:bar/foo.git',
  namedGitHost: 'github',
  namedGitHostPath: 'bar/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@bar/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@github:bar/foo',
  name: 'foo',
  bareSpec: 'github:bar/foo',
  gitRemote: 'git+ssh://git@github.com:bar/foo.git',
  namedGitHost: 'github',
  namedGitHostPath: 'bar/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@bar/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'foo@github:bar/foo'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'github:bar/foo'[39m,
  gitRemote: [32m'git+ssh://git@github.com:bar/foo.git'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'bar/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@bar/foo > toString 1`] = `
foo@github:bar/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@bitbucket:user/foo-js > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@bitbucket:user/foo-js',
  name: 'foo',
  bareSpec: 'bitbucket:user/foo-js',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@bitbucket:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@bitbucket:user/foo-js',
  name: 'foo',
  bareSpec: 'bitbucket:user/foo-js',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@bitbucket:user/foo-js > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'foo@bitbucket:user/foo-js'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'bitbucket:user/foo-js'[39m,
  gitRemote: [32m'git+ssh://git@bitbucket.org:user/foo-js.git'[39m,
  namedGitHost: [32m'bitbucket'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@bitbucket:user/foo-js > toString 1`] = `
foo@bitbucket:user/foo-js
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@gitlab:user/foo-js > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@gitlab:user/foo-js',
  name: 'foo',
  bareSpec: 'gitlab:user/foo-js',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@gitlab:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@gitlab:user/foo-js',
  name: 'foo',
  bareSpec: 'gitlab:user/foo-js',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@gitlab:user/foo-js > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'foo@gitlab:user/foo-js'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'gitlab:user/foo-js'[39m,
  gitRemote: [32m'git+ssh://git@gitlab.com:user/foo-js.git'[39m,
  namedGitHost: [32m'gitlab'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@gitlab:user/foo-js > toString 1`] = `
foo@gitlab:user/foo-js
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@https://bitbucket.org/user/project/a/s/d/f/#semver:1.x::path:src/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@bitbucket:user/project#semver:1.x::path:src/foo',
  name: 'foo',
  bareSpec: 'bitbucket:user/project#semver:1.x::path:src/foo',
  gitRemote: 'git+ssh://git@bitbucket.org:user/project.git',
  gitSelector: 'semver:1.x::path:src/foo',
  gitSelectorParsed: { semver: '1.x', path: 'src/foo' },
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/project',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '1.x',
        tokens: [ '1.x' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.x',
              major: 1,
              minor: 0,
              patch: 0,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.x',
              major: 2,
              minor: 0,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@https://bitbucket.org/user/project/a/s/d/f/#semver:1.x::path:src/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@bitbucket:user/project#semver:1.x::path:src/foo',
  name: 'foo',
  bareSpec: 'bitbucket:user/project#semver:1.x::path:src/foo',
  gitRemote: 'git+ssh://git@bitbucket.org:user/project.git',
  gitSelector: 'semver:1.x::path:src/foo',
  gitSelectorParsed: { semver: '1.x', path: 'src/foo' },
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/project',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@https://bitbucket.org/user/project/a/s/d/f/#semver:1.x::path:src/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'foo@bitbucket:user/project#semver:1.x::path:src/foo'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'bitbucket:user/project#semver:1.x::path:src/foo'[39m,
  gitRemote: [32m'git+ssh://git@bitbucket.org:user/project.git'[39m,
  gitSelector: [32m'semver:1.x::path:src/foo'[39m,
  gitSelectorParsed: { semver: [32m'1.x'[39m, path: [32m'src/foo'[39m },
  namedGitHost: [32m'bitbucket'[39m,
  namedGitHostPath: [32m'user/project'[39m,
  range: Range {
    raw: [32m'1.x'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@https://bitbucket.org/user/project/a/s/d/f/#semver:1.x::path:src/foo > toString 1`] = `
foo@bitbucket:user/project#semver:1.x::path:src/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@latest > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@latest',
  name: 'foo',
  bareSpec: 'latest',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'latest',
  distTag: 'latest'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@latest > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@latest',
  name: 'foo',
  bareSpec: 'latest',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'latest',
  distTag: 'latest'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@latest > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@latest'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'latest'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m'latest'[39m,
  distTag: [32m'latest'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@latest > toString 1`] = `
foo@latest
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@npm:@luca/cases@jsr:1 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@npm:@luca/cases@jsr:1',
  name: 'foo',
  bareSpec: 'npm:@luca/cases@jsr:1',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@luca/cases@jsr:1',
    name: '@luca/cases',
    scope: '@luca',
    bareSpec: 'jsr:1',
    namedRegistry: 'npm',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: '@jsr/luca__cases@1',
      name: '@jsr/luca__cases',
      scope: '@jsr',
      scopeRegistry: 'https://npm.jsr.io/',
      bareSpec: '1',
      namedJsrRegistry: 'jsr',
      registry: 'https://npm.jsr.io/',
      registrySpec: '1',
      semver: '1',
      range: Range {
        raw: '1',
        isAny: false,
        isSingle: false,
        set: [
          Comparator {
            includePrerelease: false,
            raw: '1',
            tokens: [ '1' ],
            tuples: [
              [
                '>=',
                Version {
                  raw: '1',
                  major: 1,
                  minor: 0,
                  patch: 0,
                  prerelease: undefined,
                  build: undefined
                }
              ],
              [
                '<',
                Version {
                  raw: '1',
                  major: 2,
                  minor: 0,
                  patch: 0,
                  prerelease: [ 0 ],
                  build: undefined
                }
              ]
            ],
            isNone: false,
            isAny: false
          }
        ],
        includePrerelease: false
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@npm:@luca/cases@jsr:1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@npm:@luca/cases@jsr:1',
  name: 'foo',
  bareSpec: 'npm:@luca/cases@jsr:1',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@luca/cases@jsr:1',
    name: '@luca/cases',
    scope: '@luca',
    bareSpec: 'jsr:1',
    namedRegistry: 'npm',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: '@jsr/luca__cases@1',
      name: '@jsr/luca__cases',
      scope: '@jsr',
      scopeRegistry: 'https://npm.jsr.io/',
      bareSpec: '1',
      namedJsrRegistry: 'jsr',
      registry: 'https://npm.jsr.io/',
      registrySpec: '1',
      semver: '1',
      range: Range {
        raw: '1',
        isAny: false,
        isSingle: false,
        set: [ [Comparator] ],
        includePrerelease: false
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@npm:@luca/cases@jsr:1 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@npm:@luca/cases@jsr:1'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'npm:@luca/cases@jsr:1'[39m,
  namedRegistry: [32m'npm'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@luca/cases@jsr:1'[39m,
    name: [32m'@luca/cases'[39m,
    scope: [32m'@luca'[39m,
    bareSpec: [32m'jsr:1'[39m,
    namedRegistry: [32m'npm'[39m,
    namedJsrRegistry: [32m'jsr'[39m,
    registry: [32m'https://npm.jsr.io/'[39m,
    subspec: @vltpkg/spec.Spec {
      type: [32m'registry'[39m,
      spec: [32m'@jsr/luca__cases@1'[39m,
      name: [32m'@jsr/luca__cases'[39m,
      scope: [32m'@jsr'[39m,
      scopeRegistry: [32m'https://npm.jsr.io/'[39m,
      bareSpec: [32m'1'[39m,
      namedJsrRegistry: [32m'jsr'[39m,
      registry: [32m'https://npm.jsr.io/'[39m,
      registrySpec: [32m'1'[39m,
      semver: [32m'1'[39m,
      range: Range {
        raw: [32m'1'[39m,
        isAny: [33mfalse[39m,
        isSingle: [33mfalse[39m,
        set: [ [36m[Comparator][39m ],
        includePrerelease: [33mfalse[39m
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@npm:@luca/cases@jsr:1 > toString 1`] = `
foo@jsr:1
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@npm:bar@ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@npm:bar@',
  name: 'foo',
  bareSpec: 'npm:bar@',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'bar@',
    name: 'bar',
    bareSpec: '',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '',
          tokens: [],
          tuples: [
            {
              isAny: true,
              toString: [Function: toString],
              includePrerelease: false,
              test: [Function: test]
            }
          ],
          isNone: false,
          isAny: true
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@npm:bar@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@npm:bar@',
  name: 'foo',
  bareSpec: 'npm:bar@',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'bar@',
    name: 'bar',
    bareSpec: '',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@npm:bar@ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'foo@npm:bar@'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'npm:bar@'[39m,
  namedRegistry: [32m'npm'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'bar@'[39m,
    name: [32m'bar'[39m,
    bareSpec: [32m''[39m,
    namedRegistry: [32m'npm'[39m,
    registry: [32m'https://registry.npmjs.org/'[39m,
    registrySpec: [32m''[39m,
    semver: [32m''[39m,
    range: Range {
      raw: [32m''[39m,
      isAny: [33mtrue[39m,
      isSingle: [33mfalse[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@npm:bar@ > toString 1`] = `
foo@npm:bar@
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@user/foo-js > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@github:user/foo-js',
  name: 'foo',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@github:user/foo-js',
  name: 'foo',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@user/foo-js > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'foo@github:user/foo-js'[39m,
  name: [32m'foo'[39m,
  bareSpec: [32m'github:user/foo-js'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo-js.git'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > foo@user/foo-js > toString 1`] = `
foo@github:user/foo-js
`

exports[`test/browser.ts > TAP > basic parsing tests > gh:@octocat/hello-world@1.0.0 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@octocat/hello-world@gh:@octocat/hello-world@1.0.0',
  name: '@octocat/hello-world',
  bareSpec: 'gh:@octocat/hello-world@1.0.0',
  namedRegistry: 'gh',
  registry: 'https://npm.pkg.github.com/',
  conventionalRegistryTarball: 'https://npm.pkg.github.com/@octocat/hello-world/-/hello-world-1.0.0.tgz',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@octocat/hello-world@1.0.0',
    name: '@octocat/hello-world',
    scope: '@octocat',
    bareSpec: '1.0.0',
    namedRegistry: 'gh',
    registry: 'https://npm.pkg.github.com/',
    registrySpec: '1.0.0',
    conventionalRegistryTarball: 'https://npm.pkg.github.com/@octocat/hello-world/-/hello-world-1.0.0.tgz',
    semver: '1.0.0',
    range: Range {
      raw: '1.0.0',
      isAny: false,
      isSingle: true,
      set: [
        Comparator {
          includePrerelease: false,
          raw: '1.0.0',
          tokens: [ '1.0.0' ],
          tuples: [
            [
              '',
              Version {
                raw: '1.0.0',
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: undefined,
                build: undefined
              }
            ]
          ],
          isNone: false,
          isAny: false
        }
      ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > gh:@octocat/hello-world@1.0.0 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@octocat/hello-world@gh:@octocat/hello-world@1.0.0',
  name: '@octocat/hello-world',
  bareSpec: 'gh:@octocat/hello-world@1.0.0',
  namedRegistry: 'gh',
  registry: 'https://npm.pkg.github.com/',
  conventionalRegistryTarball: 'https://npm.pkg.github.com/@octocat/hello-world/-/hello-world-1.0.0.tgz',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@octocat/hello-world@1.0.0',
    name: '@octocat/hello-world',
    scope: '@octocat',
    bareSpec: '1.0.0',
    namedRegistry: 'gh',
    registry: 'https://npm.pkg.github.com/',
    registrySpec: '1.0.0',
    conventionalRegistryTarball: 'https://npm.pkg.github.com/@octocat/hello-world/-/hello-world-1.0.0.tgz',
    semver: '1.0.0',
    range: Range {
      raw: '1.0.0',
      isAny: false,
      isSingle: true,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > gh:@octocat/hello-world@1.0.0 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'@octocat/hello-world@gh:@octocat/hello-world@1.0.0'[39m,
  name: [32m'@octocat/hello-world'[39m,
  bareSpec: [32m'gh:@octocat/hello-world@1.0.0'[39m,
  namedRegistry: [32m'gh'[39m,
  registry: [32m'https://npm.pkg.github.com/'[39m,
  conventionalRegistryTarball: [32m'https://npm.pkg.github.com/@octocat/hello-world/-/hello-world-1.0.0.tgz'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@octocat/hello-world@1.0.0'[39m,
    name: [32m'@octocat/hello-world'[39m,
    scope: [32m'@octocat'[39m,
    bareSpec: [32m'1.0.0'[39m,
    namedRegistry: [32m'gh'[39m,
    registry: [32m'https://npm.pkg.github.com/'[39m,
    registrySpec: [32m'1.0.0'[39m,
    conventionalRegistryTarball: [32m'https://npm.pkg.github.com/@octocat/hello-world/-/hello-world-1.0.0.tgz'[39m,
    semver: [32m'1.0.0'[39m,
    range: Range {
      raw: [32m'1.0.0'[39m,
      isAny: [33mfalse[39m,
      isSingle: [33mtrue[39m,
      set: [ [36m[Comparator][39m ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > gh:@octocat/hello-world@1.0.0 > toString 1`] = `
@octocat/hello-world@gh:@octocat/hello-world@1.0.0
`

exports[`test/browser.ts > TAP > basic parsing tests > x@./foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./foo',
  name: 'x',
  bareSpec: 'file:./foo',
  file: './foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@./foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./foo',
  name: 'x',
  bareSpec: 'file:./foo',
  file: './foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@./foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:./foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:./foo'[39m,
  file: [32m'./foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@./foo > toString 1`] = `
x@file:./foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo',
  name: 'x',
  bareSpec: 'file:.//path/to/foo',
  file: './/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo',
  name: 'x',
  bareSpec: 'file:.//path/to/foo',
  file: './/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:.//path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:.//path/to/foo'[39m,
  file: [32m'.//path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo > toString 1`] = `
x@file:.//path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo.tar > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo.tar',
  name: 'x',
  bareSpec: 'file:.//path/to/foo.tar',
  file: './/path/to/foo.tar'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo.tar > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo.tar',
  name: 'x',
  bareSpec: 'file:.//path/to/foo.tar',
  file: './/path/to/foo.tar'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo.tar > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:.//path/to/foo.tar'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:.//path/to/foo.tar'[39m,
  file: [32m'.//path/to/foo.tar'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo.tar > toString 1`] = `
x@file:.//path/to/foo.tar
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo.tgz > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo.tgz',
  name: 'x',
  bareSpec: 'file:.//path/to/foo.tgz',
  file: './/path/to/foo.tgz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo.tgz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo.tgz',
  name: 'x',
  bareSpec: 'file:.//path/to/foo.tgz',
  file: './/path/to/foo.tgz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo.tgz > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:.//path/to/foo.tgz'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:.//path/to/foo.tgz'[39m,
  file: [32m'.//path/to/foo.tgz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@/path/to/foo.tgz > toString 1`] = `
x@file:.//path/to/foo.tgz
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /',
  gitRemote: 'git+ssh://git@bitbucket.org:user..blerg--/..foo-js.git',
  gitSelector: ' . . . . . some . tags / / /',
  gitSelectorParsed: {},
  gitCommittish: ' . . . . . some . tags / / /',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user..blerg--/..foo-js',
  remoteURL: 'https://bitbucket.org/user..blerg--/..foo-js/get/ . . . . . some . tags / / /.tar.gz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /',
  gitRemote: 'git+ssh://git@bitbucket.org:user..blerg--/..foo-js.git',
  gitSelector: ' . . . . . some . tags / / /',
  gitSelectorParsed: {},
  gitCommittish: ' . . . . . some . tags / / /',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user..blerg--/..foo-js',
  remoteURL: 'https://bitbucket.org/user..blerg--/..foo-js/get/ . . . . . some . tags / / /.tar.gz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /'[39m,
  gitRemote: [32m'git+ssh://git@bitbucket.org:user..blerg--/..foo-js.git'[39m,
  gitSelector: [32m' . . . . . some . tags / / /'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m' . . . . . some . tags / / /'[39m,
  namedGitHost: [32m'bitbucket'[39m,
  namedGitHostPath: [32m'user..blerg--/..foo-js'[39m,
  remoteURL: [32m'https://bitbucket.org/user..blerg--/..foo-js/get/ . . . . . some . tags / / /.tar.gz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / / > toString 1`] = `
x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@bitbucket:user/foo-js'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'bitbucket:user/foo-js'[39m,
  gitRemote: [32m'git+ssh://git@bitbucket.org:user/foo-js.git'[39m,
  namedGitHost: [32m'bitbucket'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js > toString 1`] = `
x@bitbucket:user/foo-js
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js#bar/baz',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  gitSelector: 'bar/baz',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://bitbucket.org/user/foo-js/get/bar/baz.tar.gz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js#bar/baz',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  gitSelector: 'bar/baz',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://bitbucket.org/user/foo-js/get/bar/baz.tar.gz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@bitbucket:user/foo-js#bar/baz'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'bitbucket:user/foo-js#bar/baz'[39m,
  gitRemote: [32m'git+ssh://git@bitbucket.org:user/foo-js.git'[39m,
  gitSelector: [32m'bar/baz'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'bar/baz'[39m,
  namedGitHost: [32m'bitbucket'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m,
  remoteURL: [32m'https://bitbucket.org/user/foo-js/get/bar/baz.tar.gz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz > toString 1`] = `
x@bitbucket:user/foo-js#bar/baz
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz/bin > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js#bar/baz/bin',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  gitSelector: 'bar/baz/bin',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz/bin',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://bitbucket.org/user/foo-js/get/bar/baz/bin.tar.gz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz/bin > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js#bar/baz/bin',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  gitSelector: 'bar/baz/bin',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz/bin',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://bitbucket.org/user/foo-js/get/bar/baz/bin.tar.gz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz/bin > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@bitbucket:user/foo-js#bar/baz/bin'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'bitbucket:user/foo-js#bar/baz/bin'[39m,
  gitRemote: [32m'git+ssh://git@bitbucket.org:user/foo-js.git'[39m,
  gitSelector: [32m'bar/baz/bin'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'bar/baz/bin'[39m,
  namedGitHost: [32m'bitbucket'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m,
  remoteURL: [32m'https://bitbucket.org/user/foo-js/get/bar/baz/bin.tar.gz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz/bin > toString 1`] = `
x@bitbucket:user/foo-js#bar/baz/bin
`

exports[`test/browser.ts > TAP > basic parsing tests > x@f fo o al/ a d s ;f > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:f fo o al/ a d s ;f',
  name: 'x',
  bareSpec: 'github:f fo o al/ a d s ;f',
  gitRemote: 'git+ssh://git@github.com:f fo o al/ a d s ;f.git',
  namedGitHost: 'github',
  namedGitHostPath: 'f fo o al/ a d s ;f'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@f fo o al/ a d s ;f > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:f fo o al/ a d s ;f',
  name: 'x',
  bareSpec: 'github:f fo o al/ a d s ;f',
  gitRemote: 'git+ssh://git@github.com:f fo o al/ a d s ;f.git',
  namedGitHost: 'github',
  namedGitHostPath: 'f fo o al/ a d s ;f'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@f fo o al/ a d s ;f > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:f fo o al/ a d s ;f'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:f fo o al/ a d s ;f'[39m,
  gitRemote: [32m'git+ssh://git@github.com:f fo o al/ a d s ;f.git'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'f fo o al/ a d s ;f'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@f fo o al/ a d s ;f > toString 1`] = `
x@github:f fo o al/ a d s ;f
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file: > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file: > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file: > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:.'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:.'[39m,
  file: [32m'.'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file: > toString 1`] = `
x@file:.
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:../path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:../path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:../path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:../path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:../path/to/foo'[39m,
  file: [32m'../path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:../path/to/foo > toString 1`] = `
x@file:../path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:./path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:./path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:./path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:./path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:./path/to/foo'[39m,
  file: [32m'./path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:./path/to/foo > toString 1`] = `
x@file:./path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/. > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/. > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:.'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:.'[39m,
  file: [32m'.'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/. > toString 1`] = `
x@file:.
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/.. > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:..',
  name: 'x',
  bareSpec: 'file:..',
  file: '..'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/.. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:..',
  name: 'x',
  bareSpec: 'file:..',
  file: '..'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/.. > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:..'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:..'[39m,
  file: [32m'..'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/.. > toString 1`] = `
x@file:..
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/../path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/../path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/../path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:../path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:../path/to/foo'[39m,
  file: [32m'../path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/../path/to/foo > toString 1`] = `
x@file:../path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/./path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/./path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/./path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:./path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:./path/to/foo'[39m,
  file: [32m'./path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/./path/to/foo > toString 1`] = `
x@file:./path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/.path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//.path/to/foo',
  name: 'x',
  bareSpec: 'file:.//.path/to/foo',
  file: './/.path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/.path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//.path/to/foo',
  name: 'x',
  bareSpec: 'file:.//.path/to/foo',
  file: './/.path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/.path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:.//.path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:.//.path/to/foo'[39m,
  file: [32m'.//.path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/.path/to/foo > toString 1`] = `
x@file:.//.path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:// > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:// > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:// > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:.'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:.'[39m,
  file: [32m'.'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:// > toString 1`] = `
x@file:.
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://. > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://. > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:.'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:.'[39m,
  file: [32m'.'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://. > toString 1`] = `
x@file:.
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://.. > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:..',
  name: 'x',
  bareSpec: 'file:..',
  file: '..'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://.. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:..',
  name: 'x',
  bareSpec: 'file:..',
  file: '..'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://.. > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:..'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:..'[39m,
  file: [32m'..'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://.. > toString 1`] = `
x@file:..
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://../path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://../path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://../path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:../path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:../path/to/foo'[39m,
  file: [32m'../path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://../path/to/foo > toString 1`] = `
x@file:../path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://./path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://./path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://./path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:./path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:./path/to/foo'[39m,
  file: [32m'./path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://./path/to/foo > toString 1`] = `
x@file:./path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:////path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:////path/to/foo',
  name: 'x',
  bareSpec: 'file:////path/to/foo',
  file: '//path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:////path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:////path/to/foo',
  name: 'x',
  bareSpec: 'file:////path/to/foo',
  file: '//path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:////path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:////path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:////path/to/foo'[39m,
  file: [32m'//path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:////path/to/foo > toString 1`] = `
x@file:////path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:///~/path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:///~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:///~/path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:~/path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:~/path/to/foo'[39m,
  file: [32m'~/path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:///~/path/to/foo > toString 1`] = `
x@file:~/path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:///path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:///path/to/foo',
  name: 'x',
  bareSpec: 'file:///path/to/foo',
  file: '/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:///path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:///path/to/foo',
  name: 'x',
  bareSpec: 'file:///path/to/foo',
  file: '/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:///path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:///path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:///path/to/foo'[39m,
  file: [32m'/path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:///path/to/foo > toString 1`] = `
x@file:///path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://~/path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://~/path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:~/path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:~/path/to/foo'[39m,
  file: [32m'~/path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file://~/path/to/foo > toString 1`] = `
x@file:~/path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/~/path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/~/path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:~/path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:~/path/to/foo'[39m,
  file: [32m'~/path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/~/path/to/foo > toString 1`] = `
x@file:~/path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo',
  name: 'x',
  bareSpec: 'file:.//path/to/foo',
  file: './/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo',
  name: 'x',
  bareSpec: 'file:.//path/to/foo',
  file: './/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:.//path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:.//path/to/foo'[39m,
  file: [32m'.//path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:/path/to/foo > toString 1`] = `
x@file:.//path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:~/path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:~/path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:~/path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:~/path/to/foo'[39m,
  file: [32m'~/path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:~/path/to/foo > toString 1`] = `
x@file:~/path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:path/to/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:path/to/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:./path/to/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:./path/to/foo'[39m,
  file: [32m'./path/to/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:path/to/foo > toString 1`] = `
x@file:./path/to/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:path/to/foo.tar.gz > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo.tar.gz',
  name: 'x',
  bareSpec: 'file:./path/to/foo.tar.gz',
  file: './path/to/foo.tar.gz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:path/to/foo.tar.gz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo.tar.gz',
  name: 'x',
  bareSpec: 'file:./path/to/foo.tar.gz',
  file: './path/to/foo.tar.gz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:path/to/foo.tar.gz > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:./path/to/foo.tar.gz'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:./path/to/foo.tar.gz'[39m,
  file: [32m'./path/to/foo.tar.gz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@file:path/to/foo.tar.gz > toString 1`] = `
x@file:./path/to/foo.tar.gz
`

exports[`test/browser.ts > TAP > basic parsing tests > x@foo/bar/baz > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./foo/bar/baz',
  name: 'x',
  bareSpec: 'file:./foo/bar/baz',
  file: './foo/bar/baz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@foo/bar/baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./foo/bar/baz',
  name: 'x',
  bareSpec: 'file:./foo/bar/baz',
  file: './foo/bar/baz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@foo/bar/baz > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'file'[39m,
  spec: [32m'x@file:./foo/bar/baz'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'file:./foo/bar/baz'[39m,
  file: [32m'./foo/bar/baz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@foo/bar/baz > toString 1`] = `
x@file:./foo/bar/baz
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git://github.com/user/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git://github.com/user/foo',
  name: 'x',
  bareSpec: 'git://github.com/user/foo',
  gitRemote: 'git://github.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git://github.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git://github.com/user/foo',
  name: 'x',
  bareSpec: 'git://github.com/user/foo',
  gitRemote: 'git://github.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git://github.com/user/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git://github.com/user/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git://github.com/user/foo'[39m,
  gitRemote: [32m'git://github.com/user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git://github.com/user/foo > toString 1`] = `
x@git://github.com/user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git://notgithub.com/user/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git://notgithub.com/user/foo',
  name: 'x',
  bareSpec: 'git://notgithub.com/user/foo',
  gitRemote: 'git://notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git://notgithub.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git://notgithub.com/user/foo',
  name: 'x',
  bareSpec: 'git://notgithub.com/user/foo',
  gitRemote: 'git://notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git://notgithub.com/user/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git://notgithub.com/user/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git://notgithub.com/user/foo'[39m,
  gitRemote: [32m'git://notgithub.com/user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git://notgithub.com/user/foo > toString 1`] = `
x@git://notgithub.com/user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git@github.com:12345/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:12345/foo',
  name: 'x',
  bareSpec: 'github:12345/foo',
  gitRemote: 'git+ssh://git@github.com:12345/foo.git',
  namedGitHost: 'github',
  namedGitHostPath: '12345/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git@github.com:12345/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:12345/foo',
  name: 'x',
  bareSpec: 'github:12345/foo',
  gitRemote: 'git+ssh://git@github.com:12345/foo.git',
  namedGitHost: 'github',
  namedGitHostPath: '12345/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git@github.com:12345/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:12345/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:12345/foo'[39m,
  gitRemote: [32m'git+ssh://git@github.com:12345/foo.git'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'12345/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git@github.com:12345/foo > toString 1`] = `
x@github:12345/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git@npm:not-git > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@git@npm:not-git',
  name: 'x',
  bareSpec: 'git@npm:not-git',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'git@npm:not-git',
  distTag: 'git@npm:not-git'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git@npm:not-git > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@git@npm:not-git',
  name: 'x',
  bareSpec: 'git@npm:not-git',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'git@npm:not-git',
  distTag: 'git@npm:not-git'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git@npm:not-git > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'x@git@npm:not-git'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git@npm:not-git'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  registrySpec: [32m'git@npm:not-git'[39m,
  distTag: [32m'git@npm:not-git'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git@npm:not-git > toString 1`] = `
x@git@npm:not-git
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+file://path/to/repo#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+file://path/to/repo#1.2.3',
  name: 'x',
  bareSpec: 'git+file://path/to/repo#1.2.3',
  gitRemote: 'git+file://path/to/repo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+file://path/to/repo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+file://path/to/repo#1.2.3',
  name: 'x',
  bareSpec: 'git+file://path/to/repo#1.2.3',
  gitRemote: 'git+file://path/to/repo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+file://path/to/repo#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+file://path/to/repo#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+file://path/to/repo#1.2.3'[39m,
  gitRemote: [32m'git+file://path/to/repo'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+file://path/to/repo#1.2.3 > toString 1`] = `
x@git+file://path/to/repo#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@bitbucket.org/user/foo#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@bitbucket.org/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@bitbucket.org/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@bitbucket.org/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@bitbucket.org/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@bitbucket.org/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@bitbucket.org/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@bitbucket.org/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@bitbucket.org/user/foo#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@bitbucket.org/user/foo#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@bitbucket.org/user/foo#1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@bitbucket.org/user/foo'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@bitbucket.org/user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@bitbucket.org/user/foo#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  remoteURL: 'https://codeload.github.com/user/foo/tar.gz/1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  remoteURL: 'https://codeload.github.com/user/foo/tar.gz/1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo#1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo.git'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo'[39m,
  remoteURL: [32m'https://codeload.github.com/user/foo/tar.gz/1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#1.2.3 > toString 1`] = `
x@github:user/foo#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#semver:^1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '^1.2.3',
        tokens: [ '^1.2.3' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.2.3',
              major: 2,
              minor: 0,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#semver:^1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo#semver:^1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo#semver:^1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo.git'[39m,
  gitSelector: [32m'semver:^1.2.3'[39m,
  gitSelectorParsed: { semver: [32m'^1.2.3'[39m },
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo'[39m,
  range: Range {
    raw: [32m'^1.2.3'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#semver:^1.2.3 > toString 1`] = `
x@github:user/foo#semver:^1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@github.com/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@github.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@github.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@github.com/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@github.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@github.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@github.com/user/foo#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@github.com/user/foo#1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@github.com/user/foo'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@github.com/user/foo#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#semver:^1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@github.com/user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@github.com/user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com/user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '^1.2.3',
        tokens: [ '^1.2.3' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.2.3',
              major: 2,
              minor: 0,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@github.com/user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@github.com/user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com/user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#semver:^1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@github.com/user/foo#semver:^1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@github.com/user/foo#semver:^1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@github.com/user/foo'[39m,
  gitSelector: [32m'semver:^1.2.3'[39m,
  gitSelectorParsed: { semver: [32m'^1.2.3'[39m },
  range: Range {
    raw: [32m'^1.2.3'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#semver:^1.2.3 > toString 1`] = `
x@git+ssh://git@github.com/user/foo#semver:^1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@gitlab.com/user/foo#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@gitlab.com/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@gitlab.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@gitlab.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@gitlab.com/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@gitlab.com/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@gitlab.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@gitlab.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@gitlab.com/user/foo#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@gitlab.com/user/foo#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@gitlab.com/user/foo#1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@gitlab.com/user/foo'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@gitlab.com/user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@gitlab.com/user/foo#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@notgithub.com:user/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@notgithub.com:user/foo'[39m,
  gitRemote: [32m'git+ssh://git@notgithub.com:user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo > toString 1`] = `
x@git+ssh://git@notgithub.com:user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo#1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo#1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@notgithub.com:user/foo#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@notgithub.com:user/foo#1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@notgithub.com:user/foo'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@notgithub.com:user/foo#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '^1.2.3',
        tokens: [ '^1.2.3' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.2.3',
              major: 2,
              minor: 0,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@notgithub.com:user/foo#semver:^1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@notgithub.com:user/foo'[39m,
  gitSelector: [32m'semver:^1.2.3'[39m,
  gitSelectorParsed: { semver: [32m'^1.2.3'[39m },
  range: Range {
    raw: [32m'^1.2.3'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > toString 1`] = `
x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@notgithub.com/user/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@notgithub.com/user/foo'[39m,
  gitRemote: [32m'git+ssh://git@notgithub.com/user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo > toString 1`] = `
x@git+ssh://git@notgithub.com/user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@notgithub.com/user/foo#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@notgithub.com/user/foo#1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@notgithub.com/user/foo'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@notgithub.com/user/foo#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '^1.2.3',
        tokens: [ '^1.2.3' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.2.3',
              major: 2,
              minor: 0,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://git@notgithub.com/user/foo#semver:^1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@notgithub.com/user/foo'[39m,
  gitSelector: [32m'semver:^1.2.3'[39m,
  gitSelectorParsed: { semver: [32m'^1.2.3'[39m },
  range: Range {
    raw: [32m'^1.2.3'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > toString 1`] = `
x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234/hey',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234/hey',
  gitRemote: 'git+ssh://mydomain.com:1234/hey'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234/hey',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234/hey',
  gitRemote: 'git+ssh://mydomain.com:1234/hey'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://mydomain.com:1234/hey'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://mydomain.com:1234/hey'[39m,
  gitRemote: [32m'git+ssh://mydomain.com:1234/hey'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey > toString 1`] = `
x@git+ssh://mydomain.com:1234/hey
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234/hey#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234/hey#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:1234/hey',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234/hey#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234/hey#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:1234/hey',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://mydomain.com:1234/hey#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://mydomain.com:1234/hey#1.2.3'[39m,
  gitRemote: [32m'git+ssh://mydomain.com:1234/hey'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey#1.2.3 > toString 1`] = `
x@git+ssh://mydomain.com:1234/hey#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:1234',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:1234',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://mydomain.com:1234#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://mydomain.com:1234#1.2.3'[39m,
  gitRemote: [32m'git+ssh://mydomain.com:1234'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234#1.2.3 > toString 1`] = `
x@git+ssh://mydomain.com:1234#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo',
  gitRemote: 'git+ssh://mydomain.com:foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo',
  gitRemote: 'git+ssh://mydomain.com:foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://mydomain.com:foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://mydomain.com:foo'[39m,
  gitRemote: [32m'git+ssh://mydomain.com:foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo > toString 1`] = `
x@git+ssh://mydomain.com:foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo/bar#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo/bar#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo/bar#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:foo/bar',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo/bar#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo/bar#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo/bar#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:foo/bar',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo/bar#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://mydomain.com:foo/bar#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://mydomain.com:foo/bar#1.2.3'[39m,
  gitRemote: [32m'git+ssh://mydomain.com:foo/bar'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo/bar#1.2.3 > toString 1`] = `
x@git+ssh://mydomain.com:foo/bar#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://mydomain.com:foo#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://mydomain.com:foo#1.2.3'[39m,
  gitRemote: [32m'git+ssh://mydomain.com:foo'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo#1.2.3 > toString 1`] = `
x@git+ssh://mydomain.com:foo#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
  gitRemote: 'git+ssh://username:password@mydomain.com:1234/hey',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
  gitRemote: 'git+ssh://username:password@mydomain.com:1234/hey',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'git+ssh://username:password@mydomain.com:1234/hey#1.2.3'[39m,
  gitRemote: [32m'git+ssh://username:password@mydomain.com:1234/hey'[39m,
  gitSelector: [32m'1.2.3'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'1.2.3'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > toString 1`] = `
x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@github:user/foo-js > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js',
  name: 'x',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@github:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js',
  name: 'x',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@github:user/foo-js > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo-js'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo-js'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo-js.git'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@github:user/foo-js > toString 1`] = `
x@github:user/foo-js
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /',
  gitRemote: 'git+ssh://git@gitlab.com:user..blerg--/..foo-js.git',
  gitSelector: ' . . . . . some . tags / / /',
  gitSelectorParsed: {},
  gitCommittish: ' . . . . . some . tags / / /',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user..blerg--/..foo-js',
  remoteURL: 'https://gitlab.com/user..blerg--/..foo-js/repository/archive.tar.gz?ref= . . . . . some . tags / / /'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /',
  gitRemote: 'git+ssh://git@gitlab.com:user..blerg--/..foo-js.git',
  gitSelector: ' . . . . . some . tags / / /',
  gitSelectorParsed: {},
  gitCommittish: ' . . . . . some . tags / / /',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user..blerg--/..foo-js',
  remoteURL: 'https://gitlab.com/user..blerg--/..foo-js/repository/archive.tar.gz?ref= . . . . . some . tags / / /'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /'[39m,
  gitRemote: [32m'git+ssh://git@gitlab.com:user..blerg--/..foo-js.git'[39m,
  gitSelector: [32m' . . . . . some . tags / / /'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m' . . . . . some . tags / / /'[39m,
  namedGitHost: [32m'gitlab'[39m,
  namedGitHostPath: [32m'user..blerg--/..foo-js'[39m,
  remoteURL: [32m'https://gitlab.com/user..blerg--/..foo-js/repository/archive.tar.gz?ref= . . . . . some . tags / / /'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / / > toString 1`] = `
x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@gitlab:user/foo-js'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'gitlab:user/foo-js'[39m,
  gitRemote: [32m'git+ssh://git@gitlab.com:user/foo-js.git'[39m,
  namedGitHost: [32m'gitlab'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js > toString 1`] = `
x@gitlab:user/foo-js
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js#bar/baz',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  gitSelector: 'bar/baz',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js#bar/baz',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  gitSelector: 'bar/baz',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@gitlab:user/foo-js#bar/baz'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'gitlab:user/foo-js#bar/baz'[39m,
  gitRemote: [32m'git+ssh://git@gitlab.com:user/foo-js.git'[39m,
  gitSelector: [32m'bar/baz'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'bar/baz'[39m,
  namedGitHost: [32m'gitlab'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m,
  remoteURL: [32m'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz > toString 1`] = `
x@gitlab:user/foo-js#bar/baz
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz/bin > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js#bar/baz/bin',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  gitSelector: 'bar/baz/bin',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz/bin',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz/bin'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz/bin > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js#bar/baz/bin',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  gitSelector: 'bar/baz/bin',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz/bin',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz/bin'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz/bin > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@gitlab:user/foo-js#bar/baz/bin'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'gitlab:user/foo-js#bar/baz/bin'[39m,
  gitRemote: [32m'git+ssh://git@gitlab.com:user/foo-js.git'[39m,
  gitSelector: [32m'bar/baz/bin'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'bar/baz/bin'[39m,
  namedGitHost: [32m'gitlab'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m,
  remoteURL: [32m'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz/bin'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz/bin > toString 1`] = `
x@gitlab:user/foo-js#bar/baz/bin
`

exports[`test/browser.ts > TAP > basic parsing tests > x@http://insecure.com/foo.tgz > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@http://insecure.com/foo.tgz',
  name: 'x',
  bareSpec: 'http://insecure.com/foo.tgz',
  remoteURL: 'http://insecure.com/foo.tgz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@http://insecure.com/foo.tgz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@http://insecure.com/foo.tgz',
  name: 'x',
  bareSpec: 'http://insecure.com/foo.tgz',
  remoteURL: 'http://insecure.com/foo.tgz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@http://insecure.com/foo.tgz > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'remote'[39m,
  spec: [32m'x@http://insecure.com/foo.tgz'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'http://insecure.com/foo.tgz'[39m,
  remoteURL: [32m'http://insecure.com/foo.tgz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@http://insecure.com/foo.tgz > toString 1`] = `
x@http://insecure.com/foo.tgz
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://bitbucket.org/user/foo.git > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo',
  name: 'x',
  bareSpec: 'bitbucket:user/foo',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://bitbucket.org/user/foo.git > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo',
  name: 'x',
  bareSpec: 'bitbucket:user/foo',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://bitbucket.org/user/foo.git > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@bitbucket:user/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'bitbucket:user/foo'[39m,
  gitRemote: [32m'git+ssh://git@bitbucket.org:user/foo.git'[39m,
  namedGitHost: [32m'bitbucket'[39m,
  namedGitHostPath: [32m'user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://bitbucket.org/user/foo.git > toString 1`] = `
x@bitbucket:user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://github.com/user/foo.git > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo',
  name: 'x',
  bareSpec: 'github:user/foo',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://github.com/user/foo.git > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo',
  name: 'x',
  bareSpec: 'github:user/foo',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://github.com/user/foo.git > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo.git'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://github.com/user/foo.git > toString 1`] = `
x@github:user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://github.com/user/project > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/project',
  name: 'x',
  bareSpec: 'github:user/project',
  gitRemote: 'git+ssh://git@github.com:user/project.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/project'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://github.com/user/project > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/project',
  name: 'x',
  bareSpec: 'github:user/project',
  gitRemote: 'git+ssh://git@github.com:user/project.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/project'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://github.com/user/project > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/project'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/project'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/project.git'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/project'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://github.com/user/project > toString 1`] = `
x@github:user/project
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://gitlab.com/user/foo.git > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo',
  name: 'x',
  bareSpec: 'gitlab:user/foo',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo.git',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://gitlab.com/user/foo.git > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo',
  name: 'x',
  bareSpec: 'gitlab:user/foo',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo.git',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://gitlab.com/user/foo.git > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@gitlab:user/foo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'gitlab:user/foo'[39m,
  gitRemote: [32m'git+ssh://git@gitlab.com:user/foo.git'[39m,
  namedGitHost: [32m'gitlab'[39m,
  namedGitHostPath: [32m'user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://gitlab.com/user/foo.git > toString 1`] = `
x@gitlab:user/foo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://server.com/foo.tgz > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@https://server.com/foo.tgz',
  name: 'x',
  bareSpec: 'https://server.com/foo.tgz',
  remoteURL: 'https://server.com/foo.tgz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://server.com/foo.tgz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@https://server.com/foo.tgz',
  name: 'x',
  bareSpec: 'https://server.com/foo.tgz',
  remoteURL: 'https://server.com/foo.tgz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://server.com/foo.tgz > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'remote'[39m,
  spec: [32m'x@https://server.com/foo.tgz'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'https://server.com/foo.tgz'[39m,
  remoteURL: [32m'https://server.com/foo.tgz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@https://server.com/foo.tgz > toString 1`] = `
x@https://server.com/foo.tgz
`

exports[`test/browser.ts > TAP > basic parsing tests > x@not-git@hostname.com:some/repo > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:not-git@hostname.com:some/repo',
  name: 'x',
  bareSpec: 'github:not-git@hostname.com:some/repo',
  gitRemote: 'git+ssh://git@github.com:not-git@hostname.com:some/repo.git',
  namedGitHost: 'github',
  namedGitHostPath: 'not-git@hostname.com:some/repo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@not-git@hostname.com:some/repo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:not-git@hostname.com:some/repo',
  name: 'x',
  bareSpec: 'github:not-git@hostname.com:some/repo',
  gitRemote: 'git+ssh://git@github.com:not-git@hostname.com:some/repo.git',
  namedGitHost: 'github',
  namedGitHostPath: 'not-git@hostname.com:some/repo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@not-git@hostname.com:some/repo > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:not-git@hostname.com:some/repo'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:not-git@hostname.com:some/repo'[39m,
  gitRemote: [32m'git+ssh://git@github.com:not-git@hostname.com:some/repo.git'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'not-git@hostname.com:some/repo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@not-git@hostname.com:some/repo > toString 1`] = `
x@github:not-git@hostname.com:some/repo
`

exports[`test/browser.ts > TAP > basic parsing tests > x@npm:foo@npm:bar@npm:baz@1 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@npm:foo@npm:bar@npm:baz@1',
  name: 'x',
  bareSpec: 'npm:foo@npm:bar@npm:baz@1',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'foo@npm:bar@npm:baz@1',
    name: 'foo',
    bareSpec: 'npm:bar@npm:baz@1',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: 'bar@npm:baz@1',
      name: 'bar',
      bareSpec: 'npm:baz@1',
      namedRegistry: 'npm',
      registry: 'https://registry.npmjs.org/',
      subspec: @vltpkg/spec.Spec {
        type: 'registry',
        spec: 'baz@1',
        name: 'baz',
        bareSpec: '1',
        namedRegistry: 'npm',
        registry: 'https://registry.npmjs.org/',
        registrySpec: '1',
        semver: '1',
        range: Range {
          raw: '1',
          isAny: false,
          isSingle: false,
          set: [
            Comparator {
              includePrerelease: false,
              raw: '1',
              tokens: [ '1' ],
              tuples: [
                [
                  '>=',
                  Version {
                    raw: '1',
                    major: 1,
                    minor: 0,
                    patch: 0,
                    prerelease: undefined,
                    build: undefined
                  }
                ],
                [
                  '<',
                  Version {
                    raw: '1',
                    major: 2,
                    minor: 0,
                    patch: 0,
                    prerelease: [ 0 ],
                    build: undefined
                  }
                ]
              ],
              isNone: false,
              isAny: false
            }
          ],
          includePrerelease: false
        }
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@npm:foo@npm:bar@npm:baz@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@npm:foo@npm:bar@npm:baz@1',
  name: 'x',
  bareSpec: 'npm:foo@npm:bar@npm:baz@1',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'foo@npm:bar@npm:baz@1',
    name: 'foo',
    bareSpec: 'npm:bar@npm:baz@1',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: 'bar@npm:baz@1',
      name: 'bar',
      bareSpec: 'npm:baz@1',
      namedRegistry: 'npm',
      registry: 'https://registry.npmjs.org/',
      subspec: @vltpkg/spec.Spec {
        type: 'registry',
        spec: 'baz@1',
        name: 'baz',
        bareSpec: '1',
        namedRegistry: 'npm',
        registry: 'https://registry.npmjs.org/',
        registrySpec: '1',
        semver: '1',
        range: Range {
          raw: '1',
          isAny: false,
          isSingle: false,
          set: [ [Comparator] ],
          includePrerelease: false
        }
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@npm:foo@npm:bar@npm:baz@1 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'x@npm:foo@npm:bar@npm:baz@1'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'npm:foo@npm:bar@npm:baz@1'[39m,
  namedRegistry: [32m'npm'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'foo@npm:bar@npm:baz@1'[39m,
    name: [32m'foo'[39m,
    bareSpec: [32m'npm:bar@npm:baz@1'[39m,
    namedRegistry: [32m'npm'[39m,
    registry: [32m'https://registry.npmjs.org/'[39m,
    subspec: @vltpkg/spec.Spec {
      type: [32m'registry'[39m,
      spec: [32m'bar@npm:baz@1'[39m,
      name: [32m'bar'[39m,
      bareSpec: [32m'npm:baz@1'[39m,
      namedRegistry: [32m'npm'[39m,
      registry: [32m'https://registry.npmjs.org/'[39m,
      subspec: @vltpkg/spec.Spec {
        type: [32m'registry'[39m,
        spec: [32m'baz@1'[39m,
        name: [32m'baz'[39m,
        bareSpec: [32m'1'[39m,
        namedRegistry: [32m'npm'[39m,
        registry: [32m'https://registry.npmjs.org/'[39m,
        registrySpec: [32m'1'[39m,
        semver: [32m'1'[39m,
        range: Range {
          raw: [32m'1'[39m,
          isAny: [33mfalse[39m,
          isSingle: [33mfalse[39m,
          set: [ [36m[Comparator][39m ],
          includePrerelease: [33mfalse[39m
        }
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@npm:foo@npm:bar@npm:baz@1 > toString 1`] = `
x@npm:baz@1
`

exports[`test/browser.ts > TAP > basic parsing tests > x@npm:y@npm:z@github:a/x#branch > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@npm:y@npm:z@github:a/x#branch',
  name: 'x',
  bareSpec: 'npm:y@npm:z@github:a/x#branch',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'y@npm:z@github:a/x#branch',
    name: 'y',
    bareSpec: 'npm:z@github:a/x#branch',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    subspec: @vltpkg/spec.Spec {
      type: 'git',
      spec: 'z@github:a/x#branch',
      name: 'z',
      bareSpec: 'github:a/x#branch',
      gitRemote: 'git+ssh://git@github.com:a/x.git',
      gitSelector: 'branch',
      gitSelectorParsed: {},
      gitCommittish: 'branch',
      namedGitHost: 'github',
      namedGitHostPath: 'a/x',
      namedRegistry: 'npm',
      remoteURL: 'https://codeload.github.com/a/x/tar.gz/branch'
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@npm:y@npm:z@github:a/x#branch > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@npm:y@npm:z@github:a/x#branch',
  name: 'x',
  bareSpec: 'npm:y@npm:z@github:a/x#branch',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'y@npm:z@github:a/x#branch',
    name: 'y',
    bareSpec: 'npm:z@github:a/x#branch',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    subspec: @vltpkg/spec.Spec {
      type: 'git',
      spec: 'z@github:a/x#branch',
      name: 'z',
      bareSpec: 'github:a/x#branch',
      gitRemote: 'git+ssh://git@github.com:a/x.git',
      gitSelector: 'branch',
      gitSelectorParsed: {},
      gitCommittish: 'branch',
      namedGitHost: 'github',
      namedGitHostPath: 'a/x',
      namedRegistry: 'npm',
      remoteURL: 'https://codeload.github.com/a/x/tar.gz/branch'
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@npm:y@npm:z@github:a/x#branch > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'x@npm:y@npm:z@github:a/x#branch'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'npm:y@npm:z@github:a/x#branch'[39m,
  namedRegistry: [32m'npm'[39m,
  registry: [32m'https://registry.npmjs.org/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'y@npm:z@github:a/x#branch'[39m,
    name: [32m'y'[39m,
    bareSpec: [32m'npm:z@github:a/x#branch'[39m,
    namedRegistry: [32m'npm'[39m,
    registry: [32m'https://registry.npmjs.org/'[39m,
    subspec: @vltpkg/spec.Spec {
      type: [32m'git'[39m,
      spec: [32m'z@github:a/x#branch'[39m,
      name: [32m'z'[39m,
      bareSpec: [32m'github:a/x#branch'[39m,
      gitRemote: [32m'git+ssh://git@github.com:a/x.git'[39m,
      gitSelector: [32m'branch'[39m,
      gitSelectorParsed: {},
      gitCommittish: [32m'branch'[39m,
      namedGitHost: [32m'github'[39m,
      namedGitHostPath: [32m'a/x'[39m,
      namedRegistry: [32m'npm'[39m,
      remoteURL: [32m'https://codeload.github.com/a/x/tar.gz/branch'[39m
    }
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@npm:y@npm:z@github:a/x#branch > toString 1`] = `
x@github:a/x#branch
`

exports[`test/browser.ts > TAP > basic parsing tests > x@registry:https://example.com/npm#@org/pkg@latest > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@registry:https://example.com/npm#@org/pkg@latest',
  name: 'x',
  bareSpec: 'registry:https://example.com/npm#@org/pkg@latest',
  registry: 'https://example.com/npm/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@org/pkg@latest',
    name: '@org/pkg',
    scope: '@org',
    bareSpec: 'latest',
    registry: 'https://example.com/npm/',
    registrySpec: 'latest',
    distTag: 'latest'
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@registry:https://example.com/npm#@org/pkg@latest > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@registry:https://example.com/npm#@org/pkg@latest',
  name: 'x',
  bareSpec: 'registry:https://example.com/npm#@org/pkg@latest',
  registry: 'https://example.com/npm/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@org/pkg@latest',
    name: '@org/pkg',
    scope: '@org',
    bareSpec: 'latest',
    registry: 'https://example.com/npm/',
    registrySpec: 'latest',
    distTag: 'latest'
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@registry:https://example.com/npm#@org/pkg@latest > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'registry'[39m,
  spec: [32m'x@registry:https://example.com/npm#@org/pkg@latest'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'registry:https://example.com/npm#@org/pkg@latest'[39m,
  registry: [32m'https://example.com/npm/'[39m,
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@org/pkg@latest'[39m,
    name: [32m'@org/pkg'[39m,
    scope: [32m'@org'[39m,
    bareSpec: [32m'latest'[39m,
    registry: [32m'https://example.com/npm/'[39m,
    registrySpec: [32m'latest'[39m,
    distTag: [32m'latest'[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@registry:https://example.com/npm#@org/pkg@latest > toString 1`] = `
x@registry:https://example.com/npm#@org/pkg@latest
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user..blerg--/..foo-js# . . . . . some . tags / / / > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'github:user..blerg--/..foo-js# . . . . . some . tags / / /',
  gitRemote: 'git+ssh://git@github.com:user..blerg--/..foo-js.git',
  gitSelector: ' . . . . . some . tags / / /',
  gitSelectorParsed: {},
  gitCommittish: ' . . . . . some . tags / / /',
  namedGitHost: 'github',
  namedGitHostPath: 'user..blerg--/..foo-js',
  remoteURL: 'https://codeload.github.com/user..blerg--/..foo-js/tar.gz/ . . . . . some . tags / / /'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user..blerg--/..foo-js# . . . . . some . tags / / / > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'github:user..blerg--/..foo-js# . . . . . some . tags / / /',
  gitRemote: 'git+ssh://git@github.com:user..blerg--/..foo-js.git',
  gitSelector: ' . . . . . some . tags / / /',
  gitSelectorParsed: {},
  gitCommittish: ' . . . . . some . tags / / /',
  namedGitHost: 'github',
  namedGitHostPath: 'user..blerg--/..foo-js',
  remoteURL: 'https://codeload.github.com/user..blerg--/..foo-js/tar.gz/ . . . . . some . tags / / /'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user..blerg--/..foo-js# . . . . . some . tags / / / > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user..blerg--/..foo-js# . . . . . some . tags / / /'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user..blerg--/..foo-js# . . . . . some . tags / / /'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user..blerg--/..foo-js.git'[39m,
  gitSelector: [32m' . . . . . some . tags / / /'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m' . . . . . some . tags / / /'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user..blerg--/..foo-js'[39m,
  remoteURL: [32m'https://codeload.github.com/user..blerg--/..foo-js/tar.gz/ . . . . . some . tags / / /'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user..blerg--/..foo-js# . . . . . some . tags / / / > toString 1`] = `
x@github:user..blerg--/..foo-js# . . . . . some . tags / / /
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js',
  name: 'x',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js',
  name: 'x',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo-js'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo-js'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo-js.git'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js > toString 1`] = `
x@github:user/foo-js
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'github:user/foo-js#bar/baz',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  gitSelector: 'bar/baz',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://codeload.github.com/user/foo-js/tar.gz/bar/baz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'github:user/foo-js#bar/baz',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  gitSelector: 'bar/baz',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://codeload.github.com/user/foo-js/tar.gz/bar/baz'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo-js#bar/baz'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo-js#bar/baz'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo-js.git'[39m,
  gitSelector: [32m'bar/baz'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'bar/baz'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m,
  remoteURL: [32m'https://codeload.github.com/user/foo-js/tar.gz/bar/baz'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz > toString 1`] = `
x@github:user/foo-js#bar/baz
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz/bin > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'github:user/foo-js#bar/baz/bin',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  gitSelector: 'bar/baz/bin',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz/bin',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://codeload.github.com/user/foo-js/tar.gz/bar/baz/bin'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz/bin > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'github:user/foo-js#bar/baz/bin',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  gitSelector: 'bar/baz/bin',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz/bin',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://codeload.github.com/user/foo-js/tar.gz/bar/baz/bin'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz/bin > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo-js#bar/baz/bin'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo-js#bar/baz/bin'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo-js.git'[39m,
  gitSelector: [32m'bar/baz/bin'[39m,
  gitSelectorParsed: {},
  gitCommittish: [32m'bar/baz/bin'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo-js'[39m,
  remoteURL: [32m'https://codeload.github.com/user/foo-js/tar.gz/bar/baz/bin'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz/bin > toString 1`] = `
x@github:user/foo-js#bar/baz/bin
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#1234::path:dist > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#1234::path:dist',
  name: 'x',
  bareSpec: 'github:user/foo#1234::path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: '1234::path:dist',
  gitSelectorParsed: { path: 'dist' },
  gitCommittish: '1234',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#1234::path:dist > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#1234::path:dist',
  name: 'x',
  bareSpec: 'github:user/foo#1234::path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: '1234::path:dist',
  gitSelectorParsed: { path: 'dist' },
  gitCommittish: '1234',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#1234::path:dist > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo#1234::path:dist'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo#1234::path:dist'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo.git'[39m,
  gitSelector: [32m'1234::path:dist'[39m,
  gitSelectorParsed: { path: [32m'dist'[39m },
  gitCommittish: [32m'1234'[39m,
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#1234::path:dist > toString 1`] = `
x@github:user/foo#1234::path:dist
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#notimplemented:value > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#notimplemented:value',
  name: 'x',
  bareSpec: 'github:user/foo#notimplemented:value',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'notimplemented:value',
  gitSelectorParsed: {},
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#notimplemented:value > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#notimplemented:value',
  name: 'x',
  bareSpec: 'github:user/foo#notimplemented:value',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'notimplemented:value',
  gitSelectorParsed: {},
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#notimplemented:value > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo#notimplemented:value'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo#notimplemented:value'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo.git'[39m,
  gitSelector: [32m'notimplemented:value'[39m,
  gitSelectorParsed: {},
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#notimplemented:value > toString 1`] = `
x@github:user/foo#notimplemented:value
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#path:dist > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#path:dist',
  name: 'x',
  bareSpec: 'github:user/foo#path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'path:dist',
  gitSelectorParsed: { path: 'dist' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#path:dist > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#path:dist',
  name: 'x',
  bareSpec: 'github:user/foo#path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'path:dist',
  gitSelectorParsed: { path: 'dist' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#path:dist > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo#path:dist'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo#path:dist'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo.git'[39m,
  gitSelector: [32m'path:dist'[39m,
  gitSelectorParsed: { path: [32m'dist'[39m },
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#path:dist > toString 1`] = `
x@github:user/foo#path:dist
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#semver:^1.2.3 > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '^1.2.3',
        tokens: [ '^1.2.3' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.2.3',
              major: 1,
              minor: 2,
              patch: 3,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.2.3',
              major: 2,
              minor: 0,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#semver:^1.2.3 > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'git'[39m,
  spec: [32m'x@github:user/foo#semver:^1.2.3'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'github:user/foo#semver:^1.2.3'[39m,
  gitRemote: [32m'git+ssh://git@github.com:user/foo.git'[39m,
  gitSelector: [32m'semver:^1.2.3'[39m,
  gitSelectorParsed: { semver: [32m'^1.2.3'[39m },
  namedGitHost: [32m'github'[39m,
  namedGitHostPath: [32m'user/foo'[39m,
  range: Range {
    raw: [32m'^1.2.3'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@user/foo#semver:^1.2.3 > toString 1`] = `
x@github:user/foo#semver:^1.2.3
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace: > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:',
  name: 'x',
  bareSpec: 'workspace:',
  workspaceSpec: '',
  workspace: 'x',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '',
        tokens: [],
        tuples: [
          {
            isAny: true,
            toString: [Function: toString],
            includePrerelease: false,
            test: [Function: test]
          }
        ],
        isNone: false,
        isAny: true
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace: > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:',
  name: 'x',
  bareSpec: 'workspace:',
  workspaceSpec: '',
  workspace: 'x',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace: > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:'[39m,
  workspaceSpec: [32m''[39m,
  workspace: [32m'x'[39m,
  semver: [32m''[39m,
  range: Range {
    raw: [32m''[39m,
    isAny: [33mtrue[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace: > toString 1`] = `
x@workspace:
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:@a/b@ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:@a/b@',
  name: 'x',
  bareSpec: 'workspace:@a/b@',
  workspaceSpec: '*',
  workspace: '@a/b'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:@a/b@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:@a/b@',
  name: 'x',
  bareSpec: 'workspace:@a/b@',
  workspaceSpec: '*',
  workspace: '@a/b'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:@a/b@ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:@a/b@'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:@a/b@'[39m,
  workspaceSpec: [32m'*'[39m,
  workspace: [32m'@a/b'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:@a/b@ > toString 1`] = `
x@workspace:@a/b@
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:* > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:*',
  name: 'x',
  bareSpec: 'workspace:*',
  workspaceSpec: '*',
  workspace: 'x'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:* > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:*',
  name: 'x',
  bareSpec: 'workspace:*',
  workspaceSpec: '*',
  workspace: 'x'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:* > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:*'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:*'[39m,
  workspaceSpec: [32m'*'[39m,
  workspace: [32m'x'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:* > toString 1`] = `
x@workspace:*
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:^ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:^',
  name: 'x',
  bareSpec: 'workspace:^',
  workspaceSpec: '^',
  workspace: 'x'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:^ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:^',
  name: 'x',
  bareSpec: 'workspace:^',
  workspaceSpec: '^',
  workspace: 'x'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:^ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:^'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:^'[39m,
  workspaceSpec: [32m'^'[39m,
  workspace: [32m'x'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:^ > toString 1`] = `
x@workspace:^
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:~ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:~',
  name: 'x',
  bareSpec: 'workspace:~',
  workspaceSpec: '~',
  workspace: 'x'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:~ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:~',
  name: 'x',
  bareSpec: 'workspace:~',
  workspaceSpec: '~',
  workspace: 'x'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:~ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:~'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:~'[39m,
  workspaceSpec: [32m'~'[39m,
  workspace: [32m'x'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:~ > toString 1`] = `
x@workspace:~
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:1.x > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:1.x',
  name: 'x',
  bareSpec: 'workspace:1.x',
  workspaceSpec: '1.x',
  workspace: 'x',
  semver: '1.x',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '1.x',
        tokens: [ '1.x' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.x',
              major: 1,
              minor: 0,
              patch: 0,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.x',
              major: 2,
              minor: 0,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:1.x > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:1.x',
  name: 'x',
  bareSpec: 'workspace:1.x',
  workspaceSpec: '1.x',
  workspace: 'x',
  semver: '1.x',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:1.x > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:1.x'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:1.x'[39m,
  workspaceSpec: [32m'1.x'[39m,
  workspace: [32m'x'[39m,
  semver: [32m'1.x'[39m,
  range: Range {
    raw: [32m'1.x'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:1.x > toString 1`] = `
x@workspace:1.x
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@',
  name: 'x',
  bareSpec: 'workspace:y@',
  workspaceSpec: '*',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@',
  name: 'x',
  bareSpec: 'workspace:y@',
  workspaceSpec: '*',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:y@'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:y@'[39m,
  workspaceSpec: [32m'*'[39m,
  workspace: [32m'y'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@ > toString 1`] = `
x@workspace:y@
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@* > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@*',
  name: 'x',
  bareSpec: 'workspace:y@*',
  workspaceSpec: '*',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@* > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@*',
  name: 'x',
  bareSpec: 'workspace:y@*',
  workspaceSpec: '*',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@* > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:y@*'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:y@*'[39m,
  workspaceSpec: [32m'*'[39m,
  workspace: [32m'y'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@* > toString 1`] = `
x@workspace:y@*
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@^ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@^',
  name: 'x',
  bareSpec: 'workspace:y@^',
  workspaceSpec: '^',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@^ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@^',
  name: 'x',
  bareSpec: 'workspace:y@^',
  workspaceSpec: '^',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@^ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:y@^'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:y@^'[39m,
  workspaceSpec: [32m'^'[39m,
  workspace: [32m'y'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@^ > toString 1`] = `
x@workspace:y@^
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@~ > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@~',
  name: 'x',
  bareSpec: 'workspace:y@~',
  workspaceSpec: '~',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@~ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@~',
  name: 'x',
  bareSpec: 'workspace:y@~',
  workspaceSpec: '~',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@~ > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:y@~'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:y@~'[39m,
  workspaceSpec: [32m'~'[39m,
  workspace: [32m'y'[39m
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@~ > toString 1`] = `
x@workspace:y@~
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@1.x > inspect deep 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@1.x',
  name: 'x',
  bareSpec: 'workspace:y@1.x',
  workspaceSpec: '1.x',
  workspace: 'y',
  semver: '1.x',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [
      Comparator {
        includePrerelease: false,
        raw: '1.x',
        tokens: [ '1.x' ],
        tuples: [
          [
            '>=',
            Version {
              raw: '1.x',
              major: 1,
              minor: 0,
              patch: 0,
              prerelease: undefined,
              build: undefined
            }
          ],
          [
            '<',
            Version {
              raw: '1.x',
              major: 2,
              minor: 0,
              patch: 0,
              prerelease: [ 0 ],
              build: undefined
            }
          ]
        ],
        isNone: false,
        isAny: false
      }
    ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@1.x > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@1.x',
  name: 'x',
  bareSpec: 'workspace:y@1.x',
  workspaceSpec: '1.x',
  workspace: 'y',
  semver: '1.x',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@1.x > inspect with color 1`] = `
@vltpkg/spec.Spec {
  type: [32m'workspace'[39m,
  spec: [32m'x@workspace:y@1.x'[39m,
  name: [32m'x'[39m,
  bareSpec: [32m'workspace:y@1.x'[39m,
  workspaceSpec: [32m'1.x'[39m,
  workspace: [32m'y'[39m,
  semver: [32m'1.x'[39m,
  range: Range {
    raw: [32m'1.x'[39m,
    isAny: [33mfalse[39m,
    isSingle: [33mfalse[39m,
    set: [ [36m[Comparator][39m ],
    includePrerelease: [33mfalse[39m
  }
}
`

exports[`test/browser.ts > TAP > basic parsing tests > x@workspace:y@1.x > toString 1`] = `
x@workspace:y@1.x
`

exports[`test/browser.ts > TAP > mixing scopes and names > scopes: @a 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@a/b@x:@y/z@i:@j/k@1.2.3',
  name: '@a/b',
  scope: '@a',
  scopeRegistry: 'https://a.com/',
  bareSpec: 'x:@y/z@i:@j/k@1.2.3',
  namedRegistry: 'x',
  registry: 'https://x.com/',
  conventionalRegistryTarball: 'https://i.com/@j/k/-/k-1.2.3.tgz',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@y/z@i:@j/k@1.2.3',
    name: '@y/z',
    scope: '@y',
    bareSpec: 'i:@j/k@1.2.3',
    namedRegistry: 'i',
    registry: 'https://i.com/',
    conventionalRegistryTarball: 'https://i.com/@j/k/-/k-1.2.3.tgz',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: '@j/k@1.2.3',
      name: '@j/k',
      scope: '@j',
      bareSpec: '1.2.3',
      namedRegistry: 'i',
      registry: 'https://i.com/',
      registrySpec: '1.2.3',
      conventionalRegistryTarball: 'https://i.com/@j/k/-/k-1.2.3.tgz',
      semver: '1.2.3',
      range: Range {
        raw: '1.2.3',
        isAny: false,
        isSingle: true,
        set: [ [Comparator] ],
        includePrerelease: false
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > mixing scopes and names > scopes: @a, @y 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@a/b@x:@y/z@i:@j/k@1.2.3',
  name: '@a/b',
  scope: '@a',
  scopeRegistry: 'https://a.com/',
  bareSpec: 'x:@y/z@i:@j/k@1.2.3',
  namedRegistry: 'x',
  registry: 'https://x.com/',
  conventionalRegistryTarball: 'https://i.com/@j/k/-/k-1.2.3.tgz',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@y/z@i:@j/k@1.2.3',
    name: '@y/z',
    scope: '@y',
    scopeRegistry: 'https://y.com/',
    bareSpec: 'i:@j/k@1.2.3',
    namedRegistry: 'i',
    registry: 'https://i.com/',
    conventionalRegistryTarball: 'https://i.com/@j/k/-/k-1.2.3.tgz',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: '@j/k@1.2.3',
      name: '@j/k',
      scope: '@j',
      bareSpec: '1.2.3',
      namedRegistry: 'i',
      registry: 'https://i.com/',
      registrySpec: '1.2.3',
      conventionalRegistryTarball: 'https://i.com/@j/k/-/k-1.2.3.tgz',
      semver: '1.2.3',
      range: Range {
        raw: '1.2.3',
        isAny: false,
        isSingle: true,
        set: [ [Comparator] ],
        includePrerelease: false
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > mixing scopes and names > scopes: @a, @y, @j 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@a/b@x:@y/z@i:@j/k@1.2.3',
  name: '@a/b',
  scope: '@a',
  scopeRegistry: 'https://a.com/',
  bareSpec: 'x:@y/z@i:@j/k@1.2.3',
  namedRegistry: 'x',
  registry: 'https://x.com/',
  conventionalRegistryTarball: 'https://j.com/@j/k/-/k-1.2.3.tgz',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@y/z@i:@j/k@1.2.3',
    name: '@y/z',
    scope: '@y',
    scopeRegistry: 'https://y.com/',
    bareSpec: 'i:@j/k@1.2.3',
    namedRegistry: 'i',
    registry: 'https://i.com/',
    conventionalRegistryTarball: 'https://j.com/@j/k/-/k-1.2.3.tgz',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: '@j/k@1.2.3',
      name: '@j/k',
      scope: '@j',
      scopeRegistry: 'https://j.com/',
      bareSpec: '1.2.3',
      namedRegistry: 'i',
      registry: 'https://j.com/',
      registrySpec: '1.2.3',
      conventionalRegistryTarball: 'https://j.com/@j/k/-/k-1.2.3.tgz',
      semver: '1.2.3',
      range: Range {
        raw: '1.2.3',
        isAny: false,
        isSingle: true,
        set: [ [Comparator] ],
        includePrerelease: false
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > ./foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:./foo',
  name: '(unknown)',
  bareSpec: 'file:./foo',
  file: './foo'
}
`

exports[`test/browser.ts > TAP > parse args > @a/b@bitbucket:a/b > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@a/b@bitbucket:a/b',
  name: '@a/b',
  scope: '@a',
  bareSpec: 'bitbucket:a/b',
  gitRemote: 'git+ssh://git@bitbucket.org:a/b.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'a/b'
}
`

exports[`test/browser.ts > TAP > parse args > @a/b@npm:@y/z@1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@a/b@npm:@y/z@1.2.3',
  name: '@a/b',
  scope: '@a',
  bareSpec: 'npm:@y/z@1.2.3',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  conventionalRegistryTarball: 'https://registry.npmjs.org/@y/z/-/z-1.2.3.tgz',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@y/z@1.2.3',
    name: '@y/z',
    scope: '@y',
    bareSpec: '1.2.3',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    registrySpec: '1.2.3',
    conventionalRegistryTarball: 'https://registry.npmjs.org/@y/z/-/z-1.2.3.tgz',
    semver: '1.2.3',
    range: Range {
      raw: '1.2.3',
      isAny: false,
      isSingle: true,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > @foo/bar > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > @foo/bar@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > @foo/bar@* > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@*',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: '*',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '*',
  semver: '*',
  range: Range {
    raw: '*',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > @foo/bar@baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@baz',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'baz',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'baz',
  distTag: 'baz'
}
`

exports[`test/browser.ts > TAP > parse args > @foo/bar@git+ssh://bitbucket.org/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://bitbucket.org/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://bitbucket.org/user/foo',
  gitRemote: 'git+ssh://bitbucket.org/user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > @foo/bar@git+ssh://github.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://github.com/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://github.com/user/foo',
  gitRemote: 'git+ssh://github.com/user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > @foo/bar@git+ssh://gitlab.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://gitlab.com/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://gitlab.com/user/foo',
  gitRemote: 'git+ssh://gitlab.com/user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > @foo/bar@git+ssh://notgithub.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://notgithub.com/user/foo',
  name: '@foo/bar',
  scope: '@foo',
  bareSpec: 'git+ssh://notgithub.com/user/foo',
  gitRemote: 'git+ssh://notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > @luca/cases@jsr: > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > @luca/cases@jsr:@a/b@jsr:1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:@a/b@jsr:1',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:@a/b@jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/a__b@jsr:1',
    name: '@jsr/a__b',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: 'jsr:1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: '@jsr/jsr__a__b@1',
      name: '@jsr/jsr__a__b',
      scope: '@jsr',
      scopeRegistry: 'https://npm.jsr.io/',
      bareSpec: '1',
      namedJsrRegistry: 'jsr',
      registry: 'https://npm.jsr.io/',
      registrySpec: '1',
      semver: '1',
      range: Range {
        raw: '1',
        isAny: false,
        isSingle: false,
        set: [ [Comparator] ],
        includePrerelease: false
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > @luca/cases@jsr:@luca/cases@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:1',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > @luca/cases@jsr:@luca/cases@jsr:@x/y@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:jsr:@x/y@1',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:jsr:@x/y@1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@jsr:@x/y@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: 'jsr:@x/y@1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: '@jsr/x__y@1',
      name: '@jsr/x__y',
      scope: '@jsr',
      scopeRegistry: 'https://npm.jsr.io/',
      bareSpec: '1',
      namedJsrRegistry: 'jsr',
      registry: 'https://npm.jsr.io/',
      registrySpec: '1',
      semver: '1',
      range: Range {
        raw: '1',
        isAny: false,
        isSingle: false,
        set: [ [Comparator] ],
        includePrerelease: false
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > @luca/cases@jsr:1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:1',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > @luca/cases@jsr:1 > inspect default 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:1',
  name: '@luca/cases',
  scope: '@luca',
  bareSpec: 'jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > @x/y@workspace:@a/b@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '@x/y@workspace:@a/b@',
  name: '@x/y',
  scope: '@x',
  bareSpec: 'workspace:@a/b@',
  workspaceSpec: '*',
  workspace: '@a/b'
}
`

exports[`test/browser.ts > TAP > parse args > /path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:.//path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:.//path/to/foo',
  file: './/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > /path/to/foo.tar > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:.//path/to/foo.tar',
  name: '(unknown)',
  bareSpec: 'file:.//path/to/foo.tar',
  file: './/path/to/foo.tar'
}
`

exports[`test/browser.ts > TAP > parse args > /path/to/foo.tgz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:.//path/to/foo.tgz',
  name: '(unknown)',
  bareSpec: 'file:.//path/to/foo.tgz',
  file: './/path/to/foo.tgz'
}
`

exports[`test/browser.ts > TAP > parse args > cases@jsr:@luca/cases > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'cases@jsr:@luca/cases',
  name: 'cases',
  bareSpec: 'jsr:@luca/cases',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > cases@jsr:@luca/cases@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'cases@jsr:@luca/cases@1',
  name: 'cases',
  bareSpec: 'jsr:@luca/cases@1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > custom:foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@custom:foo',
  name: 'foo',
  bareSpec: 'custom:foo',
  namedRegistry: 'custom',
  registry: 'http://example.com',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'foo',
    name: 'foo',
    bareSpec: '',
    namedRegistry: 'custom',
    registry: 'http://example.com',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > custom:foo@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@custom:foo@1',
  name: 'foo',
  bareSpec: 'custom:foo@1',
  namedRegistry: 'custom',
  registry: 'http://example.com',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'foo@1',
    name: 'foo',
    bareSpec: '1',
    namedRegistry: 'custom',
    registry: 'http://example.com',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > file: > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:.',
  name: '(unknown)',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > parse args > file:../path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:../path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:./path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:./path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:/. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:.',
  name: '(unknown)',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > parse args > file:/.. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:..',
  name: '(unknown)',
  bareSpec: 'file:..',
  file: '..'
}
`

exports[`test/browser.ts > TAP > parse args > file:/../path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:../path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:/./path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:./path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:/.path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:.//.path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:.//.path/to/foo',
  file: './/.path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:// > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:.',
  name: '(unknown)',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > parse args > file://. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:.',
  name: '(unknown)',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > parse args > file://.. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:..',
  name: '(unknown)',
  bareSpec: 'file:..',
  file: '..'
}
`

exports[`test/browser.ts > TAP > parse args > file://../path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:../path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file://./path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:./path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:////path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:////path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:////path/to/foo',
  file: '//path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:///~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:~/path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:///path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:///path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:///path/to/foo',
  file: '/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file://~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:~/path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:/~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:~/path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:.//path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:.//path/to/foo',
  file: './/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:~/path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:./path/to/foo',
  name: '(unknown)',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > file:path/to/foo.tar.gz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:./path/to/foo.tar.gz',
  name: '(unknown)',
  bareSpec: 'file:./path/to/foo.tar.gz',
  file: './path/to/foo.tar.gz'
}
`

exports[`test/browser.ts > TAP > parse args > foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@',
  name: 'foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@',
  name: 'foo',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@ 1.2 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2 ',
  name: 'foo',
  bareSpec: ' 1.2 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2 ',
  semver: '1.2',
  range: Range {
    raw: ' 1.2 ',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@ 1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2.3 ',
  name: 'foo',
  bareSpec: ' 1.2.3 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2.3 ',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: ' 1.2.3 ',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@ 1.2.3 > inspect default 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2.3',
  name: 'foo',
  bareSpec: ' 1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2.3',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: ' 1.2.3',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@=v1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@=v1.2.3',
  name: 'foo',
  bareSpec: '=v1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '=v1.2.3',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '=v1.2.3',
  range: Range {
    raw: '=v1.2.3',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@~1.2 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@~1.2',
  name: 'foo',
  bareSpec: '~1.2',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '~1.2',
  semver: '~1.2',
  range: Range {
    raw: '~1.2',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@1.2 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2',
  name: 'foo',
  bareSpec: '1.2',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2',
  semver: '1.2',
  range: Range {
    raw: '1.2',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2.3',
  name: 'foo',
  bareSpec: '1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2.3',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: '1.2.3',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@1.2.3 > inspect default 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2.3 ',
  name: 'foo',
  bareSpec: '1.2.3 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2.3 ',
  conventionalRegistryTarball: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  semver: '1.2.3',
  range: Range {
    raw: '1.2.3 ',
    isAny: false,
    isSingle: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@bar/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@github:bar/foo',
  name: 'foo',
  bareSpec: 'github:bar/foo',
  gitRemote: 'git+ssh://git@github.com:bar/foo.git',
  namedGitHost: 'github',
  namedGitHostPath: 'bar/foo'
}
`

exports[`test/browser.ts > TAP > parse args > foo@bitbucket:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@bitbucket:user/foo-js',
  name: 'foo',
  bareSpec: 'bitbucket:user/foo-js',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > parse args > foo@gitlab:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@gitlab:user/foo-js',
  name: 'foo',
  bareSpec: 'gitlab:user/foo-js',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > parse args > foo@https://bitbucket.org/user/project/a/s/d/f/#semver:1.x::path:src/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@bitbucket:user/project#semver:1.x::path:src/foo',
  name: 'foo',
  bareSpec: 'bitbucket:user/project#semver:1.x::path:src/foo',
  gitRemote: 'git+ssh://git@bitbucket.org:user/project.git',
  gitSelector: 'semver:1.x::path:src/foo',
  gitSelectorParsed: { semver: '1.x', path: 'src/foo' },
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/project',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@latest > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@latest',
  name: 'foo',
  bareSpec: 'latest',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'latest',
  distTag: 'latest'
}
`

exports[`test/browser.ts > TAP > parse args > foo@npm:@luca/cases@jsr:1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@npm:@luca/cases@jsr:1',
  name: 'foo',
  bareSpec: 'npm:@luca/cases@jsr:1',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@luca/cases@jsr:1',
    name: '@luca/cases',
    scope: '@luca',
    bareSpec: 'jsr:1',
    namedRegistry: 'npm',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: '@jsr/luca__cases@1',
      name: '@jsr/luca__cases',
      scope: '@jsr',
      scopeRegistry: 'https://npm.jsr.io/',
      bareSpec: '1',
      namedJsrRegistry: 'jsr',
      registry: 'https://npm.jsr.io/',
      registrySpec: '1',
      semver: '1',
      range: Range {
        raw: '1',
        isAny: false,
        isSingle: false,
        set: [ [Comparator] ],
        includePrerelease: false
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@npm:bar@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@npm:bar@',
  name: 'foo',
  bareSpec: 'npm:bar@',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'bar@',
    name: 'bar',
    bareSpec: '',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > foo@user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@github:user/foo-js',
  name: 'foo',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > parse args > foo/bar/baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: '(unknown)@file:./foo/bar/baz',
  name: '(unknown)',
  bareSpec: 'file:./foo/bar/baz',
  file: './foo/bar/baz'
}
`

exports[`test/browser.ts > TAP > parse args > gh:@octocat/hello-world@1.0.0 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@octocat/hello-world@gh:@octocat/hello-world@1.0.0',
  name: '@octocat/hello-world',
  bareSpec: 'gh:@octocat/hello-world@1.0.0',
  namedRegistry: 'gh',
  registry: 'https://npm.pkg.github.com/',
  conventionalRegistryTarball: 'https://npm.pkg.github.com/@octocat/hello-world/-/hello-world-1.0.0.tgz',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@octocat/hello-world@1.0.0',
    name: '@octocat/hello-world',
    scope: '@octocat',
    bareSpec: '1.0.0',
    namedRegistry: 'gh',
    registry: 'https://npm.pkg.github.com/',
    registrySpec: '1.0.0',
    conventionalRegistryTarball: 'https://npm.pkg.github.com/@octocat/hello-world/-/hello-world-1.0.0.tgz',
    semver: '1.0.0',
    range: Range {
      raw: '1.0.0',
      isAny: false,
      isSingle: true,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > git://notgithub.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git://notgithub.com/user/foo',
  name: '(unknown)',
  bareSpec: 'git://notgithub.com/user/foo',
  gitRemote: 'git://notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > git+file://path/to/repo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+file://path/to/repo#1.2.3',
  name: '(unknown)',
  bareSpec: 'git+file://path/to/repo#1.2.3',
  gitRemote: 'git+file://path/to/repo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://git@github.com:user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@github:user/foo#semver:^1.2.3',
  name: '(unknown)',
  bareSpec: 'github:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://git@github.com/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://git@github.com/user/foo#1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://git@github.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@github.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://git@github.com/user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://git@github.com/user/foo#semver:^1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://git@github.com/user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com/user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://git@notgithub.com:user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://git@notgithub.com:user/foo',
  name: '(unknown)',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://git@notgithub.com:user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://git@notgithub.com:user/foo#1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo#1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://git@notgithub.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://git@notgithub.com/user/foo',
  name: '(unknown)',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://git@notgithub.com/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://git@notgithub.com/user/foo#1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://mydomain.com:1234/hey > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://mydomain.com:1234/hey',
  name: '(unknown)',
  bareSpec: 'git+ssh://mydomain.com:1234/hey',
  gitRemote: 'git+ssh://mydomain.com:1234/hey'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://mydomain.com:1234/hey#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://mydomain.com:1234/hey#1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://mydomain.com:1234/hey#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:1234/hey',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://mydomain.com:1234#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://mydomain.com:1234#1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://mydomain.com:1234#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:1234',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://mydomain.com:foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://mydomain.com:foo',
  name: '(unknown)',
  bareSpec: 'git+ssh://mydomain.com:foo',
  gitRemote: 'git+ssh://mydomain.com:foo'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://mydomain.com:foo/bar#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://mydomain.com:foo/bar#1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://mydomain.com:foo/bar#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:foo/bar',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://mydomain.com:foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://mydomain.com:foo#1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://mydomain.com:foo#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
  name: '(unknown)',
  bareSpec: 'git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
  gitRemote: 'git+ssh://username:password@mydomain.com:1234/hey',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > github:a/b > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@github:a/b',
  name: '(unknown)',
  bareSpec: 'github:a/b',
  gitRemote: 'git+ssh://git@github.com:a/b.git',
  namedGitHost: 'github',
  namedGitHostPath: 'a/b'
}
`

exports[`test/browser.ts > TAP > parse args > jsr:@luca/cases > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:',
  name: '@luca/cases',
  bareSpec: 'jsr:',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > jsr:@luca/cases@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:1',
  name: '@luca/cases',
  bareSpec: 'jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > jsr:@luca/cases@1 > inspect default 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@jsr:1',
  name: '@luca/cases',
  bareSpec: 'jsr:1',
  namedJsrRegistry: 'jsr',
  registry: 'https://npm.jsr.io/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@jsr/luca__cases@1',
    name: '@jsr/luca__cases',
    scope: '@jsr',
    scopeRegistry: 'https://npm.jsr.io/',
    bareSpec: '1',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > no options > no options 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@^1.0.0',
  name: 'foo',
  bareSpec: '^1.0.0',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '^1.0.0',
  semver: '^1.0.0',
  range: Range {
    raw: '^1.0.0',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > npm:@luca/cases@jsr:1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@luca/cases@npm:@luca/cases@jsr:1',
  name: '@luca/cases',
  bareSpec: 'npm:@luca/cases@jsr:1',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@luca/cases@jsr:1',
    name: '@luca/cases',
    scope: '@luca',
    bareSpec: 'jsr:1',
    namedRegistry: 'npm',
    namedJsrRegistry: 'jsr',
    registry: 'https://npm.jsr.io/',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: '@jsr/luca__cases@1',
      name: '@jsr/luca__cases',
      scope: '@jsr',
      scopeRegistry: 'https://npm.jsr.io/',
      bareSpec: '1',
      namedJsrRegistry: 'jsr',
      registry: 'https://npm.jsr.io/',
      registrySpec: '1',
      semver: '1',
      range: Range {
        raw: '1',
        isAny: false,
        isSingle: false,
        set: [ [Comparator] ],
        includePrerelease: false
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > npm:abbrev > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'abbrev@npm:abbrev',
  name: 'abbrev',
  bareSpec: 'npm:abbrev',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'abbrev',
    name: 'abbrev',
    bareSpec: '',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > npm:abbrev@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'abbrev@npm:abbrev@1',
  name: 'abbrev',
  bareSpec: 'npm:abbrev@1',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'abbrev@1',
    name: 'abbrev',
    bareSpec: '1',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    registrySpec: '1',
    semver: '1',
    range: Range {
      raw: '1',
      isAny: false,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > npm:foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@npm:foo',
  name: 'foo',
  bareSpec: 'npm:foo',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'foo',
    name: 'foo',
    bareSpec: '',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    registrySpec: '',
    semver: '',
    range: Range {
      raw: '',
      isAny: true,
      isSingle: false,
      set: [ [Comparator] ],
      includePrerelease: false
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > user/foo#1234::path:dist > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@github:user/foo#1234::path:dist',
  name: '(unknown)',
  bareSpec: 'github:user/foo#1234::path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: '1234::path:dist',
  gitSelectorParsed: { path: 'dist' },
  gitCommittish: '1234',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > user/foo#notimplemented:value > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@github:user/foo#notimplemented:value',
  name: '(unknown)',
  bareSpec: 'github:user/foo#notimplemented:value',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'notimplemented:value',
  gitSelectorParsed: {},
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > user/foo#path:dist > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@github:user/foo#path:dist',
  name: '(unknown)',
  bareSpec: 'github:user/foo#path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'path:dist',
  gitSelectorParsed: { path: 'dist' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '(unknown)@github:user/foo#semver:^1.2.3',
  name: '(unknown)',
  bareSpec: 'github:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > workspace: > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:',
  name: '(unknown)',
  bareSpec: 'workspace:',
  workspaceSpec: '',
  workspace: '(unknown)',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > workspace:@a/b@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:@a/b@',
  name: '(unknown)',
  bareSpec: 'workspace:@a/b@',
  workspaceSpec: '*',
  workspace: '@a/b'
}
`

exports[`test/browser.ts > TAP > parse args > workspace:@a/b@ > inspect default 2`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:@a/b@',
  name: '(unknown)',
  bareSpec: 'workspace:@a/b@',
  workspaceSpec: '*',
  workspace: '@a/b'
}
`

exports[`test/browser.ts > TAP > parse args > workspace:* > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:*',
  name: '(unknown)',
  bareSpec: 'workspace:*',
  workspaceSpec: '*',
  workspace: '(unknown)'
}
`

exports[`test/browser.ts > TAP > parse args > workspace:^ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:^',
  name: '(unknown)',
  bareSpec: 'workspace:^',
  workspaceSpec: '^',
  workspace: '(unknown)'
}
`

exports[`test/browser.ts > TAP > parse args > workspace:~ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:~',
  name: '(unknown)',
  bareSpec: 'workspace:~',
  workspaceSpec: '~',
  workspace: '(unknown)'
}
`

exports[`test/browser.ts > TAP > parse args > workspace:1.x > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:1.x',
  name: '(unknown)',
  bareSpec: 'workspace:1.x',
  workspaceSpec: '1.x',
  workspace: '(unknown)',
  semver: '1.x',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > workspace:y@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:y@',
  name: '(unknown)',
  bareSpec: 'workspace:y@',
  workspaceSpec: '*',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > parse args > workspace:y@* > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:y@*',
  name: '(unknown)',
  bareSpec: 'workspace:y@*',
  workspaceSpec: '*',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > parse args > workspace:y@^ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:y@^',
  name: '(unknown)',
  bareSpec: 'workspace:y@^',
  workspaceSpec: '^',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > parse args > workspace:y@~ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:y@~',
  name: '(unknown)',
  bareSpec: 'workspace:y@~',
  workspaceSpec: '~',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > parse args > workspace:y@1.x > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: '(unknown)@workspace:y@1.x',
  name: '(unknown)',
  bareSpec: 'workspace:y@1.x',
  workspaceSpec: '1.x',
  workspace: 'y',
  semver: '1.x',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@./foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./foo',
  name: 'x',
  bareSpec: 'file:./foo',
  file: './foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo',
  name: 'x',
  bareSpec: 'file:.//path/to/foo',
  file: './/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@/path/to/foo.tar > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo.tar',
  name: 'x',
  bareSpec: 'file:.//path/to/foo.tar',
  file: './/path/to/foo.tar'
}
`

exports[`test/browser.ts > TAP > parse args > x@/path/to/foo.tgz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo.tgz',
  name: 'x',
  bareSpec: 'file:.//path/to/foo.tgz',
  file: './/path/to/foo.tgz'
}
`

exports[`test/browser.ts > TAP > parse args > x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /',
  gitRemote: 'git+ssh://git@bitbucket.org:user..blerg--/..foo-js.git',
  gitSelector: ' . . . . . some . tags / / /',
  gitSelectorParsed: {},
  gitCommittish: ' . . . . . some . tags / / /',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user..blerg--/..foo-js',
  remoteURL: 'https://bitbucket.org/user..blerg--/..foo-js/get/ . . . . . some . tags / / /.tar.gz'
}
`

exports[`test/browser.ts > TAP > parse args > x@bitbucket:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > parse args > x@bitbucket:user/foo-js#bar/baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js#bar/baz',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  gitSelector: 'bar/baz',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://bitbucket.org/user/foo-js/get/bar/baz.tar.gz'
}
`

exports[`test/browser.ts > TAP > parse args > x@bitbucket:user/foo-js#bar/baz/bin > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js#bar/baz/bin',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  gitSelector: 'bar/baz/bin',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz/bin',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://bitbucket.org/user/foo-js/get/bar/baz/bin.tar.gz'
}
`

exports[`test/browser.ts > TAP > parse args > x@f fo o al/ a d s ;f > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:f fo o al/ a d s ;f',
  name: 'x',
  bareSpec: 'github:f fo o al/ a d s ;f',
  gitRemote: 'git+ssh://git@github.com:f fo o al/ a d s ;f.git',
  namedGitHost: 'github',
  namedGitHostPath: 'f fo o al/ a d s ;f'
}
`

exports[`test/browser.ts > TAP > parse args > x@file: > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:../path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:./path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:/. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:/.. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:..',
  name: 'x',
  bareSpec: 'file:..',
  file: '..'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:/../path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:/./path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:/.path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//.path/to/foo',
  name: 'x',
  bareSpec: 'file:.//.path/to/foo',
  file: './/.path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:// > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > parse args > x@file://. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.',
  name: 'x',
  bareSpec: 'file:.',
  file: '.'
}
`

exports[`test/browser.ts > TAP > parse args > x@file://.. > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:..',
  name: 'x',
  bareSpec: 'file:..',
  file: '..'
}
`

exports[`test/browser.ts > TAP > parse args > x@file://../path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file://./path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:////path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:////path/to/foo',
  name: 'x',
  bareSpec: 'file:////path/to/foo',
  file: '//path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:///~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:///path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:///path/to/foo',
  name: 'x',
  bareSpec: 'file:///path/to/foo',
  file: '/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file://~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:/~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:.//path/to/foo',
  name: 'x',
  bareSpec: 'file:.//path/to/foo',
  file: './/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:~/path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  file: '~/path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:path/to/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@file:path/to/foo.tar.gz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./path/to/foo.tar.gz',
  name: 'x',
  bareSpec: 'file:./path/to/foo.tar.gz',
  file: './path/to/foo.tar.gz'
}
`

exports[`test/browser.ts > TAP > parse args > x@foo/bar/baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:./foo/bar/baz',
  name: 'x',
  bareSpec: 'file:./foo/bar/baz',
  file: './foo/bar/baz'
}
`

exports[`test/browser.ts > TAP > parse args > x@git://github.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git://github.com/user/foo',
  name: 'x',
  bareSpec: 'git://github.com/user/foo',
  gitRemote: 'git://github.com/user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@git://notgithub.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git://notgithub.com/user/foo',
  name: 'x',
  bareSpec: 'git://notgithub.com/user/foo',
  gitRemote: 'git://notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@git@github.com:12345/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:12345/foo',
  name: 'x',
  bareSpec: 'github:12345/foo',
  gitRemote: 'git+ssh://git@github.com:12345/foo.git',
  namedGitHost: 'github',
  namedGitHostPath: '12345/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@git@npm:not-git > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@git@npm:not-git',
  name: 'x',
  bareSpec: 'git@npm:not-git',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'git@npm:not-git',
  distTag: 'git@npm:not-git'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+file://path/to/repo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+file://path/to/repo#1.2.3',
  name: 'x',
  bareSpec: 'git+file://path/to/repo#1.2.3',
  gitRemote: 'git+file://path/to/repo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@bitbucket.org/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@bitbucket.org/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@bitbucket.org/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@bitbucket.org/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@github.com:user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  remoteURL: 'https://codeload.github.com/user/foo/tar.gz/1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@github.com:user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@github.com/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@github.com/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@github.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@github.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@github.com/user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@github.com/user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@github.com/user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com/user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@gitlab.com/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@gitlab.com/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@gitlab.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@gitlab.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@notgithub.com:user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@notgithub.com:user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo#1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@notgithub.com/user/foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@notgithub.com/user/foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo#1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://mydomain.com:1234/hey > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234/hey',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234/hey',
  gitRemote: 'git+ssh://mydomain.com:1234/hey'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://mydomain.com:1234/hey#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234/hey#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234/hey#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:1234/hey',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://mydomain.com:1234#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:1234',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://mydomain.com:foo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo',
  gitRemote: 'git+ssh://mydomain.com:foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://mydomain.com:foo/bar#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo/bar#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo/bar#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:foo/bar',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://mydomain.com:foo#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo#1.2.3',
  gitRemote: 'git+ssh://mydomain.com:foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
  gitRemote: 'git+ssh://username:password@mydomain.com:1234/hey',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/browser.ts > TAP > parse args > x@github:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js',
  name: 'x',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > parse args > x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /',
  gitRemote: 'git+ssh://git@gitlab.com:user..blerg--/..foo-js.git',
  gitSelector: ' . . . . . some . tags / / /',
  gitSelectorParsed: {},
  gitCommittish: ' . . . . . some . tags / / /',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user..blerg--/..foo-js',
  remoteURL: 'https://gitlab.com/user..blerg--/..foo-js/repository/archive.tar.gz?ref= . . . . . some . tags / / /'
}
`

exports[`test/browser.ts > TAP > parse args > x@gitlab:user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > parse args > x@gitlab:user/foo-js#bar/baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js#bar/baz',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  gitSelector: 'bar/baz',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz'
}
`

exports[`test/browser.ts > TAP > parse args > x@gitlab:user/foo-js#bar/baz/bin > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js#bar/baz/bin',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  gitSelector: 'bar/baz/bin',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz/bin',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz/bin'
}
`

exports[`test/browser.ts > TAP > parse args > x@http://insecure.com/foo.tgz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@http://insecure.com/foo.tgz',
  name: 'x',
  bareSpec: 'http://insecure.com/foo.tgz',
  remoteURL: 'http://insecure.com/foo.tgz'
}
`

exports[`test/browser.ts > TAP > parse args > x@https://bitbucket.org/user/foo.git > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo',
  name: 'x',
  bareSpec: 'bitbucket:user/foo',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo.git',
  namedGitHost: 'bitbucket',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@https://github.com/user/foo.git > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo',
  name: 'x',
  bareSpec: 'github:user/foo',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@https://github.com/user/project > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/project',
  name: 'x',
  bareSpec: 'github:user/project',
  gitRemote: 'git+ssh://git@github.com:user/project.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/project'
}
`

exports[`test/browser.ts > TAP > parse args > x@https://gitlab.com/user/foo.git > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo',
  name: 'x',
  bareSpec: 'gitlab:user/foo',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo.git',
  namedGitHost: 'gitlab',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@https://server.com/foo.tgz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@https://server.com/foo.tgz',
  name: 'x',
  bareSpec: 'https://server.com/foo.tgz',
  remoteURL: 'https://server.com/foo.tgz'
}
`

exports[`test/browser.ts > TAP > parse args > x@not-git@hostname.com:some/repo > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:not-git@hostname.com:some/repo',
  name: 'x',
  bareSpec: 'github:not-git@hostname.com:some/repo',
  gitRemote: 'git+ssh://git@github.com:not-git@hostname.com:some/repo.git',
  namedGitHost: 'github',
  namedGitHostPath: 'not-git@hostname.com:some/repo'
}
`

exports[`test/browser.ts > TAP > parse args > x@npm:foo@npm:bar@npm:baz@1 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@npm:foo@npm:bar@npm:baz@1',
  name: 'x',
  bareSpec: 'npm:foo@npm:bar@npm:baz@1',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'foo@npm:bar@npm:baz@1',
    name: 'foo',
    bareSpec: 'npm:bar@npm:baz@1',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    subspec: @vltpkg/spec.Spec {
      type: 'registry',
      spec: 'bar@npm:baz@1',
      name: 'bar',
      bareSpec: 'npm:baz@1',
      namedRegistry: 'npm',
      registry: 'https://registry.npmjs.org/',
      subspec: @vltpkg/spec.Spec {
        type: 'registry',
        spec: 'baz@1',
        name: 'baz',
        bareSpec: '1',
        namedRegistry: 'npm',
        registry: 'https://registry.npmjs.org/',
        registrySpec: '1',
        semver: '1',
        range: Range {
          raw: '1',
          isAny: false,
          isSingle: false,
          set: [ [Comparator] ],
          includePrerelease: false
        }
      }
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@npm:y@npm:z@github:a/x#branch > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@npm:y@npm:z@github:a/x#branch',
  name: 'x',
  bareSpec: 'npm:y@npm:z@github:a/x#branch',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: 'y@npm:z@github:a/x#branch',
    name: 'y',
    bareSpec: 'npm:z@github:a/x#branch',
    namedRegistry: 'npm',
    registry: 'https://registry.npmjs.org/',
    subspec: @vltpkg/spec.Spec {
      type: 'git',
      spec: 'z@github:a/x#branch',
      name: 'z',
      bareSpec: 'github:a/x#branch',
      gitRemote: 'git+ssh://git@github.com:a/x.git',
      gitSelector: 'branch',
      gitSelectorParsed: {},
      gitCommittish: 'branch',
      namedGitHost: 'github',
      namedGitHostPath: 'a/x',
      namedRegistry: 'npm',
      remoteURL: 'https://codeload.github.com/a/x/tar.gz/branch'
    }
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@registry:https://example.com/npm#@org/pkg@latest > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@registry:https://example.com/npm#@org/pkg@latest',
  name: 'x',
  bareSpec: 'registry:https://example.com/npm#@org/pkg@latest',
  registry: 'https://example.com/npm/',
  subspec: @vltpkg/spec.Spec {
    type: 'registry',
    spec: '@org/pkg@latest',
    name: '@org/pkg',
    scope: '@org',
    bareSpec: 'latest',
    registry: 'https://example.com/npm/',
    registrySpec: 'latest',
    distTag: 'latest'
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@user..blerg--/..foo-js# . . . . . some . tags / / / > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'github:user..blerg--/..foo-js# . . . . . some . tags / / /',
  gitRemote: 'git+ssh://git@github.com:user..blerg--/..foo-js.git',
  gitSelector: ' . . . . . some . tags / / /',
  gitSelectorParsed: {},
  gitCommittish: ' . . . . . some . tags / / /',
  namedGitHost: 'github',
  namedGitHostPath: 'user..blerg--/..foo-js',
  remoteURL: 'https://codeload.github.com/user..blerg--/..foo-js/tar.gz/ . . . . . some . tags / / /'
}
`

exports[`test/browser.ts > TAP > parse args > x@user/foo-js > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js',
  name: 'x',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js'
}
`

exports[`test/browser.ts > TAP > parse args > x@user/foo-js#bar/baz > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'github:user/foo-js#bar/baz',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  gitSelector: 'bar/baz',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://codeload.github.com/user/foo-js/tar.gz/bar/baz'
}
`

exports[`test/browser.ts > TAP > parse args > x@user/foo-js#bar/baz/bin > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'github:user/foo-js#bar/baz/bin',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  gitSelector: 'bar/baz/bin',
  gitSelectorParsed: {},
  gitCommittish: 'bar/baz/bin',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo-js',
  remoteURL: 'https://codeload.github.com/user/foo-js/tar.gz/bar/baz/bin'
}
`

exports[`test/browser.ts > TAP > parse args > x@user/foo#1234::path:dist > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#1234::path:dist',
  name: 'x',
  bareSpec: 'github:user/foo#1234::path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: '1234::path:dist',
  gitSelectorParsed: { path: 'dist' },
  gitCommittish: '1234',
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@user/foo#notimplemented:value > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#notimplemented:value',
  name: 'x',
  bareSpec: 'github:user/foo#notimplemented:value',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'notimplemented:value',
  gitSelectorParsed: {},
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@user/foo#path:dist > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#path:dist',
  name: 'x',
  bareSpec: 'github:user/foo#path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'path:dist',
  gitSelectorParsed: { path: 'dist' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo'
}
`

exports[`test/browser.ts > TAP > parse args > x@user/foo#semver:^1.2.3 > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  namedGitHost: 'github',
  namedGitHostPath: 'user/foo',
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace: > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:',
  name: 'x',
  bareSpec: 'workspace:',
  workspaceSpec: '',
  workspace: 'x',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:@a/b@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:@a/b@',
  name: 'x',
  bareSpec: 'workspace:@a/b@',
  workspaceSpec: '*',
  workspace: '@a/b'
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:* > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:*',
  name: 'x',
  bareSpec: 'workspace:*',
  workspaceSpec: '*',
  workspace: 'x'
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:^ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:^',
  name: 'x',
  bareSpec: 'workspace:^',
  workspaceSpec: '^',
  workspace: 'x'
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:~ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:~',
  name: 'x',
  bareSpec: 'workspace:~',
  workspaceSpec: '~',
  workspace: 'x'
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:1.x > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:1.x',
  name: 'x',
  bareSpec: 'workspace:1.x',
  workspaceSpec: '1.x',
  workspace: 'x',
  semver: '1.x',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:y@ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@',
  name: 'x',
  bareSpec: 'workspace:y@',
  workspaceSpec: '*',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:y@* > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@*',
  name: 'x',
  bareSpec: 'workspace:y@*',
  workspaceSpec: '*',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:y@^ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@^',
  name: 'x',
  bareSpec: 'workspace:y@^',
  workspaceSpec: '^',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:y@~ > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@~',
  name: 'x',
  bareSpec: 'workspace:y@~',
  workspaceSpec: '~',
  workspace: 'y'
}
`

exports[`test/browser.ts > TAP > parse args > x@workspace:y@1.x > inspect default 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:y@1.x',
  name: 'x',
  bareSpec: 'workspace:y@1.x',
  workspaceSpec: '1.x',
  workspace: 'y',
  semver: '1.x',
  range: Range {
    raw: '1.x',
    isAny: false,
    isSingle: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/browser.ts > TAP > reverse-lookup registry: specifiers if named > must match snapshot 1`] = `
Array [
  "x@registry:http://vlt.sh#x@latest",
  "x@registry:http://vlt.sh#x@latest",
  "x@registry:http://vlt.sh/#x@latest",
  "x@registry:http://vlt.sh/#x@latest",
]
`
