/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@ > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@',
  name: '@foo/bar',
  bareSpec: '',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '',
  semver: '',
  range: Range {
    raw: '',
    isAny: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@ > toString 1`] = `
@foo/bar@
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@* > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@*',
  name: '@foo/bar',
  bareSpec: '*',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '*',
  semver: '*',
  range: Range {
    raw: '*',
    isAny: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@* > toString 1`] = `
@foo/bar@*
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@baz > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: '@foo/bar@baz',
  name: '@foo/bar',
  bareSpec: 'baz',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'baz',
  distTag: 'baz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@baz > toString 1`] = `
@foo/bar@baz
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://bitbucket.org/user/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://bitbucket.org/user/foo',
  name: '@foo/bar',
  bareSpec: 'git+ssh://bitbucket.org/user/foo',
  gitRemote: 'git+ssh://bitbucket.org/user/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://bitbucket.org/user/foo > toString 1`] = `
@foo/bar@git+ssh://bitbucket.org/user/foo
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://github.com/user/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://github.com/user/foo',
  name: '@foo/bar',
  bareSpec: 'git+ssh://github.com/user/foo',
  gitRemote: 'git+ssh://github.com/user/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://github.com/user/foo > toString 1`] = `
@foo/bar@git+ssh://github.com/user/foo
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://gitlab.com/user/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://gitlab.com/user/foo',
  name: '@foo/bar',
  bareSpec: 'git+ssh://gitlab.com/user/foo',
  gitRemote: 'git+ssh://gitlab.com/user/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://gitlab.com/user/foo > toString 1`] = `
@foo/bar@git+ssh://gitlab.com/user/foo
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://notgithub.com/user/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: '@foo/bar@git+ssh://notgithub.com/user/foo',
  name: '@foo/bar',
  bareSpec: 'git+ssh://notgithub.com/user/foo',
  gitRemote: 'git+ssh://notgithub.com/user/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://notgithub.com/user/foo > toString 1`] = `
@foo/bar@git+ssh://notgithub.com/user/foo
`

exports[`test/index.ts > TAP > basic parsing tests > foo > inspect 1`] = `
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
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo > toString 1`] = `
foo@
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ > inspect 1`] = `
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
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ > toString 1`] = `
foo@
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2 > inspect 1`] = `
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
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2 > toString 1`] = `
foo@ 1.2 
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2.3 ',
  name: 'foo',
  bareSpec: ' 1.2.3 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2.3 ',
  semver: '1.2.3',
  range: Range {
    raw: ' 1.2.3 ',
    isAny: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@ 1.2.3',
  name: 'foo',
  bareSpec: ' 1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: ' 1.2.3',
  semver: '1.2.3',
  range: Range {
    raw: ' 1.2.3',
    isAny: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2.3 > toString 1`] = `
foo@ 1.2.3 
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2.3 > toString 2`] = `
foo@ 1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > foo@=v1.2.3 > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@=v1.2.3',
  name: 'foo',
  bareSpec: '=v1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '=v1.2.3',
  semver: '=v1.2.3',
  range: Range {
    raw: '=v1.2.3',
    isAny: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@=v1.2.3 > toString 1`] = `
foo@=v1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > foo@~1.2 > inspect 1`] = `
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
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@~1.2 > toString 1`] = `
foo@~1.2
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2 > inspect 1`] = `
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
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2 > toString 1`] = `
foo@1.2
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2.3 > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2.3',
  name: 'foo',
  bareSpec: '1.2.3',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2.3',
  semver: '1.2.3',
  range: Range {
    raw: '1.2.3',
    isAny: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2.3 > inspect 2`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@1.2.3 ',
  name: 'foo',
  bareSpec: '1.2.3 ',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '1.2.3 ',
  semver: '1.2.3',
  range: Range {
    raw: '1.2.3 ',
    isAny: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2.3 > toString 1`] = `
foo@1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2.3 > toString 2`] = `
foo@1.2.3 
`

exports[`test/index.ts > TAP > basic parsing tests > foo@bar/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@github:bar/foo',
  name: 'foo',
  bareSpec: 'github:bar/foo',
  gitRemote: 'git+ssh://git@github.com:bar/foo.git',
  namedGitHost: 'github'
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@bar/foo > toString 1`] = `
foo@github:bar/foo
`

exports[`test/index.ts > TAP > basic parsing tests > foo@bitbucket:user/foo-js > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@bitbucket:user/foo-js',
  name: 'foo',
  bareSpec: 'bitbucket:user/foo-js',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  namedGitHost: 'bitbucket'
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@bitbucket:user/foo-js > toString 1`] = `
foo@bitbucket:user/foo-js
`

exports[`test/index.ts > TAP > basic parsing tests > foo@gitlab:user/foo-js > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@gitlab:user/foo-js',
  name: 'foo',
  bareSpec: 'gitlab:user/foo-js',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  namedGitHost: 'gitlab'
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@gitlab:user/foo-js > toString 1`] = `
foo@gitlab:user/foo-js
`

exports[`test/index.ts > TAP > basic parsing tests > foo@latest > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > foo@latest > toString 1`] = `
foo@latest
`

exports[`test/index.ts > TAP > basic parsing tests > foo@npm:bar@ > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'foo@npm:bar@',
  name: 'foo',
  bareSpec: 'npm:bar@',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'bar@'[39m,
    name: [32m'bar'[39m,
    bareSpec: [32m''[39m,
    registry: [32m'https://registry.npmjs.org/'[39m,
    registrySpec: [32m''[39m,
    semver: [32m''[39m,
    range: Range {
      raw: [32m''[39m,
      isAny: [33mtrue[39m,
      set: [
        Comparator {
          includePrerelease: [33mfalse[39m,
          raw: [32m''[39m,
          tokens: [],
          tuples: [
            {
              isAny: [33mtrue[39m,
              toString: [36m[Function: toString][39m,
              includePrerelease: [33mfalse[39m,
              test: [36m[Function: test][39m
            }
          ],
          isNone: [33mfalse[39m,
          isAny: [33mtrue[39m
        }
      ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@npm:bar@ > toString 1`] = `
foo@npm:bar@
`

exports[`test/index.ts > TAP > basic parsing tests > foo@user/foo-js > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'foo@github:user/foo-js',
  name: 'foo',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github'
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@user/foo-js > toString 1`] = `
foo@github:user/foo-js
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@/path/to/foo',
  name: 'x',
  bareSpec: '/path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '/path/to/foo',
  distTag: '/path/to/foo',
  file: '/path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo > toString 1`] = `
x@/path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo.tar > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@/path/to/foo.tar',
  name: 'x',
  bareSpec: '/path/to/foo.tar',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '/path/to/foo.tar',
  distTag: '/path/to/foo.tar',
  file: '/path/to/foo.tar'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo.tar > toString 1`] = `
x@/path/to/foo.tar
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo.tgz > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@/path/to/foo.tgz',
  name: 'x',
  bareSpec: '/path/to/foo.tgz',
  registry: 'https://registry.npmjs.org/',
  registrySpec: '/path/to/foo.tgz',
  distTag: '/path/to/foo.tgz',
  file: '/path/to/foo.tgz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo.tgz > toString 1`] = `
x@/path/to/foo.tgz
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect 1`] = `
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
  remoteURL: 'https://bitbucket.org/user..blerg--/..foo-js/get/ . . . . . some . tags / / /.tar.gz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / / > toString 1`] = `
x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@bitbucket:user/foo-js',
  name: 'x',
  bareSpec: 'bitbucket:user/foo-js',
  gitRemote: 'git+ssh://git@bitbucket.org:user/foo-js.git',
  namedGitHost: 'bitbucket'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js > toString 1`] = `
x@bitbucket:user/foo-js
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz > inspect 1`] = `
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
  remoteURL: 'https://bitbucket.org/user/foo-js/get/bar/baz.tar.gz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz > toString 1`] = `
x@bitbucket:user/foo-js#bar/baz
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz/bin > inspect 1`] = `
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
  remoteURL: 'https://bitbucket.org/user/foo-js/get/bar/baz/bin.tar.gz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz/bin > toString 1`] = `
x@bitbucket:user/foo-js#bar/baz/bin
`

exports[`test/index.ts > TAP > basic parsing tests > x@f fo o al/ a d s ;f > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:f fo o al/ a d s ;f',
  name: 'x',
  bareSpec: 'github:f fo o al/ a d s ;f',
  gitRemote: 'git+ssh://git@github.com:f fo o al/ a d s ;f.git',
  namedGitHost: 'github'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@f fo o al/ a d s ;f > toString 1`] = `
x@github:f fo o al/ a d s ;f
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:../path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:../path/to/foo',
  name: 'x',
  bareSpec: 'file:../path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:../path/to/foo',
  distTag: 'file:../path/to/foo',
  file: 'file:../path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:../path/to/foo > toString 1`] = `
x@file:../path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:./path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:./path/to/foo',
  name: 'x',
  bareSpec: 'file:./path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:./path/to/foo',
  distTag: 'file:./path/to/foo',
  file: 'file:./path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:./path/to/foo > toString 1`] = `
x@file:./path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/../path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:/../path/to/foo',
  name: 'x',
  bareSpec: 'file:/../path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:/../path/to/foo',
  distTag: 'file:/../path/to/foo',
  file: 'file:/../path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/../path/to/foo > toString 1`] = `
x@file:/../path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/./path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:/./path/to/foo',
  name: 'x',
  bareSpec: 'file:/./path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:/./path/to/foo',
  distTag: 'file:/./path/to/foo',
  file: 'file:/./path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/./path/to/foo > toString 1`] = `
x@file:/./path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/.path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:/.path/to/foo',
  name: 'x',
  bareSpec: 'file:/.path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:/.path/to/foo',
  distTag: 'file:/.path/to/foo',
  file: 'file:/.path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/.path/to/foo > toString 1`] = `
x@file:/.path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://. > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file://.',
  name: 'x',
  bareSpec: 'file://.',
  file: '.'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://. > toString 1`] = `
x@file://.
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://../path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file://../path/to/foo',
  name: 'x',
  bareSpec: 'file://../path/to/foo',
  file: '../path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://../path/to/foo > toString 1`] = `
x@file://../path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://./path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file://./path/to/foo',
  name: 'x',
  bareSpec: 'file://./path/to/foo',
  file: './path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://./path/to/foo > toString 1`] = `
x@file://./path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:////path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:////path/to/foo',
  name: 'x',
  bareSpec: 'file:////path/to/foo',
  file: '//path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:////path/to/foo > toString 1`] = `
x@file:////path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:///path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file:///path/to/foo',
  name: 'x',
  bareSpec: 'file:///path/to/foo',
  file: '/path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:///path/to/foo > toString 1`] = `
x@file:///path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'file',
  spec: 'x@file://path/to/foo',
  name: 'x',
  bareSpec: 'file://path/to/foo',
  file: 'path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://path/to/foo > toString 1`] = `
x@file://path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/~/path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:/~/path/to/foo',
  name: 'x',
  bareSpec: 'file:/~/path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:/~/path/to/foo',
  distTag: 'file:/~/path/to/foo',
  file: 'file:/~/path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/~/path/to/foo > toString 1`] = `
x@file:/~/path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/~path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:/~path/to/foo',
  name: 'x',
  bareSpec: 'file:/~path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:/~path/to/foo',
  distTag: 'file:/~path/to/foo',
  file: 'file:/~path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/~path/to/foo > toString 1`] = `
x@file:/~path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:/path/to/foo',
  name: 'x',
  bareSpec: 'file:/path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:/path/to/foo',
  distTag: 'file:/path/to/foo',
  file: 'file:/path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/path/to/foo > toString 1`] = `
x@file:/path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:~/path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:~/path/to/foo',
  name: 'x',
  bareSpec: 'file:~/path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:~/path/to/foo',
  distTag: 'file:~/path/to/foo',
  file: 'file:~/path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:~/path/to/foo > toString 1`] = `
x@file:~/path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:path/to/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:path/to/foo',
  name: 'x',
  bareSpec: 'file:path/to/foo',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:path/to/foo',
  distTag: 'file:path/to/foo',
  file: 'file:path/to/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:path/to/foo > toString 1`] = `
x@file:path/to/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:path/to/foo.tar.gz > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@file:path/to/foo.tar.gz',
  name: 'x',
  bareSpec: 'file:path/to/foo.tar.gz',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'file:path/to/foo.tar.gz',
  distTag: 'file:path/to/foo.tar.gz',
  file: 'file:path/to/foo.tar.gz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:path/to/foo.tar.gz > toString 1`] = `
x@file:path/to/foo.tar.gz
`

exports[`test/index.ts > TAP > basic parsing tests > x@git://github.com/user/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git://github.com/user/foo',
  name: 'x',
  bareSpec: 'git://github.com/user/foo',
  gitRemote: 'git://github.com/user/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git://github.com/user/foo > toString 1`] = `
x@git://github.com/user/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@git://notgithub.com/user/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git://notgithub.com/user/foo',
  name: 'x',
  bareSpec: 'git://notgithub.com/user/foo',
  gitRemote: 'git://notgithub.com/user/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git://notgithub.com/user/foo > toString 1`] = `
x@git://notgithub.com/user/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@git@github.com:12345/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@github.com:12345/foo',
  name: 'x',
  bareSpec: 'git+ssh://git@github.com:12345/foo',
  gitRemote: 'git+ssh://git@github.com:12345/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git@github.com:12345/foo > toString 1`] = `
x@git+ssh://git@github.com:12345/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@git@npm:not-git > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git@npm:not-git > toString 1`] = `
x@git@npm:not-git
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+file://path/to/repo#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+file://path/to/repo#1.2.3 > toString 1`] = `
x@git+file://path/to/repo#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@bitbucket.org/user/foo#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@bitbucket.org/user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@bitbucket.org/user/foo#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#1.2.3 > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@github.com:user/foo#1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@github.com:user/foo#1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo',
  gitSelector: '1.2.3',
  gitSelectorParsed: {},
  gitCommittish: '1.2.3'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@github.com:user/foo#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#semver:^1.2.3 > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@github.com:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'git+ssh://git@github.com:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#semver:^1.2.3 > toString 1`] = `
x@git+ssh://git@github.com:user/foo#semver:^1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@github.com/user/foo#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#semver:^1.2.3 > inspect 1`] = `
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
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#semver:^1.2.3 > toString 1`] = `
x@git+ssh://git@github.com/user/foo#semver:^1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@gitlab.com/user/foo#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@gitlab.com/user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@gitlab.com/user/foo#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com:user/foo',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com:user/foo',
  gitRemote: 'git+ssh://git@notgithub.com:user/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo > toString 1`] = `
x@git+ssh://git@notgithub.com:user/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@notgithub.com:user/foo#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > inspect 1`] = `
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
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > toString 1`] = `
x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://git@notgithub.com/user/foo',
  name: 'x',
  bareSpec: 'git+ssh://git@notgithub.com/user/foo',
  gitRemote: 'git+ssh://git@notgithub.com/user/foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo > toString 1`] = `
x@git+ssh://git@notgithub.com/user/foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#1.2.3 > toString 1`] = `
x@git+ssh://git@notgithub.com/user/foo#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > inspect 1`] = `
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
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > toString 1`] = `
x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:1234/hey',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:1234/hey',
  gitRemote: 'git+ssh://mydomain.com:1234/hey'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey > toString 1`] = `
x@git+ssh://mydomain.com:1234/hey
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey#1.2.3 > toString 1`] = `
x@git+ssh://mydomain.com:1234/hey#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234#1.2.3 > toString 1`] = `
x@git+ssh://mydomain.com:1234#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@git+ssh://mydomain.com:foo',
  name: 'x',
  bareSpec: 'git+ssh://mydomain.com:foo',
  gitRemote: 'git+ssh://mydomain.com:foo'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo > toString 1`] = `
x@git+ssh://mydomain.com:foo
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo/bar#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo/bar#1.2.3 > toString 1`] = `
x@git+ssh://mydomain.com:foo/bar#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo#1.2.3 > toString 1`] = `
x@git+ssh://mydomain.com:foo#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > inspect 1`] = `
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

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > toString 1`] = `
x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@github:user/foo-js > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js',
  name: 'x',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@github:user/foo-js > toString 1`] = `
x@github:user/foo-js
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect 1`] = `
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
  remoteURL: 'https://gitlab.com/user..blerg--/..foo-js/repository/archive.tar.gz?ref= . . . . . some . tags / / /'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / / > toString 1`] = `
x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@gitlab:user/foo-js',
  name: 'x',
  bareSpec: 'gitlab:user/foo-js',
  gitRemote: 'git+ssh://git@gitlab.com:user/foo-js.git',
  namedGitHost: 'gitlab'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js > toString 1`] = `
x@gitlab:user/foo-js
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz > inspect 1`] = `
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
  remoteURL: 'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz > toString 1`] = `
x@gitlab:user/foo-js#bar/baz
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz/bin > inspect 1`] = `
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
  remoteURL: 'https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz/bin'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz/bin > toString 1`] = `
x@gitlab:user/foo-js#bar/baz/bin
`

exports[`test/index.ts > TAP > basic parsing tests > x@http://insecure.com/foo.tgz > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@http://insecure.com/foo.tgz',
  name: 'x',
  bareSpec: 'http://insecure.com/foo.tgz',
  remoteURL: 'http://insecure.com/foo.tgz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@http://insecure.com/foo.tgz > toString 1`] = `
x@http://insecure.com/foo.tgz
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://bitbucket.org/user/foo.git > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@https://bitbucket.org/user/foo.git',
  name: 'x',
  bareSpec: 'https://bitbucket.org/user/foo.git',
  remoteURL: 'https://bitbucket.org/user/foo.git'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://bitbucket.org/user/foo.git > toString 1`] = `
x@https://bitbucket.org/user/foo.git
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://github.com/user/foo.git > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@https://github.com/user/foo.git',
  name: 'x',
  bareSpec: 'https://github.com/user/foo.git',
  remoteURL: 'https://github.com/user/foo.git'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://github.com/user/foo.git > toString 1`] = `
x@https://github.com/user/foo.git
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://gitlab.com/user/foo.git > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@https://gitlab.com/user/foo.git',
  name: 'x',
  bareSpec: 'https://gitlab.com/user/foo.git',
  remoteURL: 'https://gitlab.com/user/foo.git'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://gitlab.com/user/foo.git > toString 1`] = `
x@https://gitlab.com/user/foo.git
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://server.com/foo.tgz > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'remote',
  spec: 'x@https://server.com/foo.tgz',
  name: 'x',
  bareSpec: 'https://server.com/foo.tgz',
  remoteURL: 'https://server.com/foo.tgz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://server.com/foo.tgz > toString 1`] = `
x@https://server.com/foo.tgz
`

exports[`test/index.ts > TAP > basic parsing tests > x@not-git@hostname.com:some/repo > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:not-git@hostname.com:some/repo',
  name: 'x',
  bareSpec: 'github:not-git@hostname.com:some/repo',
  gitRemote: 'git+ssh://git@github.com:not-git@hostname.com:some/repo.git',
  namedGitHost: 'github'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@not-git@hostname.com:some/repo > toString 1`] = `
x@github:not-git@hostname.com:some/repo
`

exports[`test/index.ts > TAP > basic parsing tests > x@npm:foo@npm:bar@npm:baz@1 > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@npm:foo@npm:bar@npm:baz@1',
  name: 'x',
  bareSpec: 'npm:foo@npm:bar@npm:baz@1',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
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
        registry: [32m'https://registry.npmjs.org/'[39m,
        registrySpec: [32m'1'[39m,
        semver: [32m'1'[39m,
        range: Range {
          raw: [32m'1'[39m,
          isAny: [33mfalse[39m,
          set: [
            Comparator {
              includePrerelease: [33mfalse[39m,
              raw: [32m'1'[39m,
              tokens: [ [32m'1'[39m ],
              tuples: [
                [
                  [32m'>='[39m,
                  Version {
                    raw: [32m'1'[39m,
                    major: [33m1[39m,
                    minor: [33m0[39m,
                    patch: [33m0[39m,
                    prerelease: [90mundefined[39m,
                    build: [90mundefined[39m
                  }
                ],
                [
                  [32m'<'[39m,
                  Version {
                    raw: [32m'1'[39m,
                    major: [33m2[39m,
                    minor: [33m0[39m,
                    patch: [33m0[39m,
                    prerelease: [ [33m0[39m ],
                    build: [90mundefined[39m
                  }
                ]
              ],
              isNone: [33mfalse[39m,
              isAny: [33mfalse[39m
            }
          ],
          includePrerelease: [33mfalse[39m
        }
      }
    }
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@npm:foo@npm:bar@npm:baz@1 > toString 1`] = `
x@npm:baz@1
`

exports[`test/index.ts > TAP > basic parsing tests > x@npm:y@npm:z@github:a/x#branch > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@npm:y@npm:z@github:a/x#branch',
  name: 'x',
  bareSpec: 'npm:y@npm:z@github:a/x#branch',
  namedRegistry: 'npm',
  registry: 'https://registry.npmjs.org/',
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
      remoteURL: [32m'https://codeload.github.com/a/x/tar.gz/branch'[39m
    }
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@npm:y@npm:z@github:a/x#branch > toString 1`] = `
x@npm:z@github:a/x#branch
`

exports[`test/index.ts > TAP > basic parsing tests > x@registry:https://example.com/npm#@org/pkg@latest > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@registry:https://example.com/npm#@org/pkg@latest',
  name: 'x',
  bareSpec: 'registry:https://example.com/npm#@org/pkg@latest',
  registry: 'https://example.com/npm',
  subspec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'@org/pkg@latest'[39m,
    name: [32m'@org/pkg'[39m,
    bareSpec: [32m'latest'[39m,
    registry: [32m'https://example.com/npm'[39m,
    registrySpec: [32m'latest'[39m,
    distTag: [32m'latest'[39m
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@registry:https://example.com/npm#@org/pkg@latest > toString 1`] = `
x@registry:https://example.com/npm#@org/pkg@latest
`

exports[`test/index.ts > TAP > basic parsing tests > x@user..blerg--/..foo-js# . . . . . some . tags / / / > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@user..blerg--/..foo-js# . . . . . some . tags / / /',
  name: 'x',
  bareSpec: 'user..blerg--/..foo-js# . . . . . some . tags / / /',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'user..blerg--/..foo-js# . . . . . some . tags / / /',
  distTag: 'user..blerg--/..foo-js# . . . . . some . tags / / /',
  file: 'user..blerg--/..foo-js# . . . . . some . tags / / /'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user..blerg--/..foo-js# . . . . . some . tags / / / > toString 1`] = `
x@user..blerg--/..foo-js# . . . . . some . tags / / /
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo-js',
  name: 'x',
  bareSpec: 'github:user/foo-js',
  gitRemote: 'git+ssh://git@github.com:user/foo-js.git',
  namedGitHost: 'github'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js > toString 1`] = `
x@github:user/foo-js
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@user/foo-js#bar/baz',
  name: 'x',
  bareSpec: 'user/foo-js#bar/baz',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'user/foo-js#bar/baz',
  distTag: 'user/foo-js#bar/baz',
  file: 'user/foo-js#bar/baz'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz > toString 1`] = `
x@user/foo-js#bar/baz
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz/bin > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'registry',
  spec: 'x@user/foo-js#bar/baz/bin',
  name: 'x',
  bareSpec: 'user/foo-js#bar/baz/bin',
  registry: 'https://registry.npmjs.org/',
  registrySpec: 'user/foo-js#bar/baz/bin',
  distTag: 'user/foo-js#bar/baz/bin',
  file: 'user/foo-js#bar/baz/bin'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz/bin > toString 1`] = `
x@user/foo-js#bar/baz/bin
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#1234::path:dist > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#1234::path:dist',
  name: 'x',
  bareSpec: 'github:user/foo#1234::path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: '1234::path:dist',
  gitSelectorParsed: { path: 'dist' },
  gitCommittish: '1234',
  namedGitHost: 'github'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#1234::path:dist > toString 1`] = `
x@github:user/foo#1234::path:dist
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#notimplemented:value > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#notimplemented:value',
  name: 'x',
  bareSpec: 'github:user/foo#notimplemented:value',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'notimplemented:value',
  gitSelectorParsed: {},
  namedGitHost: 'github'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#notimplemented:value > toString 1`] = `
x@github:user/foo#notimplemented:value
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#path:dist > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#path:dist',
  name: 'x',
  bareSpec: 'github:user/foo#path:dist',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'path:dist',
  gitSelectorParsed: { path: 'dist' },
  namedGitHost: 'github'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#path:dist > toString 1`] = `
x@github:user/foo#path:dist
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#semver:^1.2.3 > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'git',
  spec: 'x@github:user/foo#semver:^1.2.3',
  name: 'x',
  bareSpec: 'github:user/foo#semver:^1.2.3',
  gitRemote: 'git+ssh://git@github.com:user/foo.git',
  gitSelector: 'semver:^1.2.3',
  gitSelectorParsed: { semver: '^1.2.3' },
  namedGitHost: 'github',
  range: Range {
    raw: '^1.2.3',
    isAny: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#semver:^1.2.3 > toString 1`] = `
x@github:user/foo#semver:^1.2.3
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:* > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:*',
  name: 'x',
  bareSpec: 'workspace:*',
  semver: '*',
  range: Range {
    raw: '*',
    isAny: true,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:* > toString 1`] = `
x@workspace:*
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:^ > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:^',
  name: 'x',
  bareSpec: 'workspace:^'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:^ > toString 1`] = `
x@workspace:^
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:~ > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:~',
  name: 'x',
  bareSpec: 'workspace:~'
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:~ > toString 1`] = `
x@workspace:~
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:1.x > inspect 1`] = `
@vltpkg/spec.Spec {
  type: 'workspace',
  spec: 'x@workspace:1.x',
  name: 'x',
  bareSpec: 'workspace:1.x',
  semver: '1.x',
  range: Range {
    raw: '1.x',
    isAny: false,
    set: [ [Comparator] ],
    includePrerelease: false
  }
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:1.x > toString 1`] = `
x@workspace:1.x
`
