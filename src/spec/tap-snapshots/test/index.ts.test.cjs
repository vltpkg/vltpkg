/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@ > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "@foo/bar@",
  "name": "@foo/bar",
  "bareSpec": "",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "",
  "semver": "",
  "range": "SemVer Range '*'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@ > toString 1`] = `
[object @vltpkg/spec.Spec {@foo/bar@}]
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@* > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "@foo/bar@*",
  "name": "@foo/bar",
  "bareSpec": "*",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "*",
  "semver": "*",
  "range": "SemVer Range '*'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@* > toString 1`] = `
[object @vltpkg/spec.Spec {@foo/bar@*}]
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@baz > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "@foo/bar@baz",
  "name": "@foo/bar",
  "bareSpec": "baz",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "baz",
  "distTag": "baz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@baz > toString 1`] = `
[object @vltpkg/spec.Spec {@foo/bar@baz}]
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://bitbucket.org/user/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "@foo/bar@git+ssh://bitbucket.org/user/foo",
  "name": "@foo/bar",
  "bareSpec": "git+ssh://bitbucket.org/user/foo",
  "gitRemote": "git+ssh://bitbucket.org/user/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://bitbucket.org/user/foo > toString 1`] = `
[object @vltpkg/spec.Spec {@foo/bar@git+ssh://bitbucket.org/user/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://github.com/user/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "@foo/bar@git+ssh://github.com/user/foo",
  "name": "@foo/bar",
  "bareSpec": "git+ssh://github.com/user/foo",
  "gitRemote": "git+ssh://github.com/user/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://github.com/user/foo > toString 1`] = `
[object @vltpkg/spec.Spec {@foo/bar@git+ssh://github.com/user/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://gitlab.com/user/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "@foo/bar@git+ssh://gitlab.com/user/foo",
  "name": "@foo/bar",
  "bareSpec": "git+ssh://gitlab.com/user/foo",
  "gitRemote": "git+ssh://gitlab.com/user/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://gitlab.com/user/foo > toString 1`] = `
[object @vltpkg/spec.Spec {@foo/bar@git+ssh://gitlab.com/user/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://notgithub.com/user/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "@foo/bar@git+ssh://notgithub.com/user/foo",
  "name": "@foo/bar",
  "bareSpec": "git+ssh://notgithub.com/user/foo",
  "gitRemote": "git+ssh://notgithub.com/user/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > @foo/bar@git+ssh://notgithub.com/user/foo > toString 1`] = `
[object @vltpkg/spec.Spec {@foo/bar@git+ssh://notgithub.com/user/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo",
  "name": "foo",
  "bareSpec": "",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "",
  "semver": "",
  "range": "SemVer Range '*'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo > toString 1`] = `
[object @vltpkg/spec.Spec {foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo@",
  "name": "foo",
  "bareSpec": "",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "",
  "semver": "",
  "range": "SemVer Range '*'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ > toString 1`] = `
[object @vltpkg/spec.Spec {foo@}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2 > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo@ 1.2 ",
  "name": "foo",
  "bareSpec": " 1.2 ",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": " 1.2 ",
  "semver": "1.2",
  "range": "SemVer Range '>=1.2.0 <1.3.0-0'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2 > toString 1`] = `
[object @vltpkg/spec.Spec {foo@ 1.2 }]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo@ 1.2.3 ",
  "name": "foo",
  "bareSpec": " 1.2.3 ",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": " 1.2.3 ",
  "semver": "1.2.3",
  "range": "SemVer Range '1.2.3'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2.3 > inspect 2`] = `
Object {
  "type": "registry",
  "spec": "foo@ 1.2.3",
  "name": "foo",
  "bareSpec": " 1.2.3",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": " 1.2.3",
  "semver": "1.2.3",
  "range": "SemVer Range '1.2.3'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {foo@ 1.2.3 }]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@ 1.2.3 > toString 2`] = `
[object @vltpkg/spec.Spec {foo@ 1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@=v1.2.3 > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo@=v1.2.3",
  "name": "foo",
  "bareSpec": "=v1.2.3",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "=v1.2.3",
  "semver": "=v1.2.3",
  "range": "SemVer Range '1.2.3'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@=v1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {foo@=v1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@~1.2 > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo@~1.2",
  "name": "foo",
  "bareSpec": "~1.2",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "~1.2",
  "semver": "~1.2",
  "range": "SemVer Range '>=1.2.0 <1.3.0-0'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@~1.2 > toString 1`] = `
[object @vltpkg/spec.Spec {foo@~1.2}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2 > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo@1.2",
  "name": "foo",
  "bareSpec": "1.2",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "1.2",
  "semver": "1.2",
  "range": "SemVer Range '>=1.2.0 <1.3.0-0'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2 > toString 1`] = `
[object @vltpkg/spec.Spec {foo@1.2}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2.3 > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo@1.2.3",
  "name": "foo",
  "bareSpec": "1.2.3",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "1.2.3",
  "semver": "1.2.3",
  "range": "SemVer Range '1.2.3'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2.3 > inspect 2`] = `
Object {
  "type": "registry",
  "spec": "foo@1.2.3 ",
  "name": "foo",
  "bareSpec": "1.2.3 ",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "1.2.3 ",
  "semver": "1.2.3",
  "range": "SemVer Range '1.2.3'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {foo@1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@1.2.3 > toString 2`] = `
[object @vltpkg/spec.Spec {foo@1.2.3 }]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@bar/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "foo@github:bar/foo",
  "name": "foo",
  "bareSpec": "github:bar/foo",
  "gitRemote": "git+ssh://git@github.com:bar/foo.git",
  "namedGitHost": "github",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@bar/foo > toString 1`] = `
[object @vltpkg/spec.Spec {foo@github:bar/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@bitbucket:user/foo-js > inspect 1`] = `
Object {
  "type": "git",
  "spec": "foo@bitbucket:user/foo-js",
  "name": "foo",
  "bareSpec": "bitbucket:user/foo-js",
  "gitRemote": "git+ssh://git@bitbucket.org:user/foo-js.git",
  "namedGitHost": "bitbucket",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@bitbucket:user/foo-js > toString 1`] = `
[object @vltpkg/spec.Spec {foo@bitbucket:user/foo-js}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@gitlab:user/foo-js > inspect 1`] = `
Object {
  "type": "git",
  "spec": "foo@gitlab:user/foo-js",
  "name": "foo",
  "bareSpec": "gitlab:user/foo-js",
  "gitRemote": "git+ssh://git@gitlab.com:user/foo-js.git",
  "namedGitHost": "gitlab",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@gitlab:user/foo-js > toString 1`] = `
[object @vltpkg/spec.Spec {foo@gitlab:user/foo-js}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@latest > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo@latest",
  "name": "foo",
  "bareSpec": "latest",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "latest",
  "distTag": "latest",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@latest > toString 1`] = `
[object @vltpkg/spec.Spec {foo@latest}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@npm:bar@ > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "foo@npm:bar@",
  "name": "foo",
  "bareSpec": "npm:bar@",
  "namedRegistry": "npm",
  "registry": "https://registry.npmjs.org/",
  "subspec": Object {
    "type": "registry",
    "spec": "bar@",
    "name": "bar",
    "bareSpec": "",
    "registry": "https://registry.npmjs.org/",
    "registrySpec": "",
    "semver": "",
    "range": "SemVer Range '*'",
  },
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@npm:bar@ > toString 1`] = `
[object @vltpkg/spec.Spec {foo@npm:bar@}]
`

exports[`test/index.ts > TAP > basic parsing tests > foo@user/foo-js > inspect 1`] = `
Object {
  "type": "git",
  "spec": "foo@github:user/foo-js",
  "name": "foo",
  "bareSpec": "github:user/foo-js",
  "gitRemote": "git+ssh://git@github.com:user/foo-js.git",
  "namedGitHost": "github",
}
`

exports[`test/index.ts > TAP > basic parsing tests > foo@user/foo-js > toString 1`] = `
[object @vltpkg/spec.Spec {foo@github:user/foo-js}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@/path/to/foo",
  "name": "x",
  "bareSpec": "/path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "/path/to/foo",
  "distTag": "/path/to/foo",
  "file": "/path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@/path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo.tar > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@/path/to/foo.tar",
  "name": "x",
  "bareSpec": "/path/to/foo.tar",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "/path/to/foo.tar",
  "distTag": "/path/to/foo.tar",
  "file": "/path/to/foo.tar",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo.tar > toString 1`] = `
[object @vltpkg/spec.Spec {x@/path/to/foo.tar}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo.tgz > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@/path/to/foo.tgz",
  "name": "x",
  "bareSpec": "/path/to/foo.tgz",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "/path/to/foo.tgz",
  "distTag": "/path/to/foo.tgz",
  "file": "/path/to/foo.tgz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@/path/to/foo.tgz > toString 1`] = `
[object @vltpkg/spec.Spec {x@/path/to/foo.tgz}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /",
  "name": "x",
  "bareSpec": "bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /",
  "gitRemote": "git+ssh://git@bitbucket.org:user..blerg--/..foo-js.git",
  "gitSelector": " . . . . . some . tags / / /",
  "gitSelectorParsed": Object {},
  "gitCommittish": " . . . . . some . tags / / /",
  "namedGitHost": "bitbucket",
  "remoteURL": "https://bitbucket.org/user..blerg--/..foo-js/get/ . . . . . some . tags / / /.tar.gz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / / > toString 1`] = `
[object @vltpkg/spec.Spec {x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@bitbucket:user/foo-js",
  "name": "x",
  "bareSpec": "bitbucket:user/foo-js",
  "gitRemote": "git+ssh://git@bitbucket.org:user/foo-js.git",
  "namedGitHost": "bitbucket",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js > toString 1`] = `
[object @vltpkg/spec.Spec {x@bitbucket:user/foo-js}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@bitbucket:user/foo-js#bar/baz",
  "name": "x",
  "bareSpec": "bitbucket:user/foo-js#bar/baz",
  "gitRemote": "git+ssh://git@bitbucket.org:user/foo-js.git",
  "gitSelector": "bar/baz",
  "gitSelectorParsed": Object {},
  "gitCommittish": "bar/baz",
  "namedGitHost": "bitbucket",
  "remoteURL": "https://bitbucket.org/user/foo-js/get/bar/baz.tar.gz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz > toString 1`] = `
[object @vltpkg/spec.Spec {x@bitbucket:user/foo-js#bar/baz}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz/bin > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@bitbucket:user/foo-js#bar/baz/bin",
  "name": "x",
  "bareSpec": "bitbucket:user/foo-js#bar/baz/bin",
  "gitRemote": "git+ssh://git@bitbucket.org:user/foo-js.git",
  "gitSelector": "bar/baz/bin",
  "gitSelectorParsed": Object {},
  "gitCommittish": "bar/baz/bin",
  "namedGitHost": "bitbucket",
  "remoteURL": "https://bitbucket.org/user/foo-js/get/bar/baz/bin.tar.gz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@bitbucket:user/foo-js#bar/baz/bin > toString 1`] = `
[object @vltpkg/spec.Spec {x@bitbucket:user/foo-js#bar/baz/bin}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@f fo o al/ a d s ;f > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@github:f fo o al/ a d s ;f",
  "name": "x",
  "bareSpec": "github:f fo o al/ a d s ;f",
  "gitRemote": "git+ssh://git@github.com:f fo o al/ a d s ;f.git",
  "namedGitHost": "github",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@f fo o al/ a d s ;f > toString 1`] = `
[object @vltpkg/spec.Spec {x@github:f fo o al/ a d s ;f}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:../path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:../path/to/foo",
  "name": "x",
  "bareSpec": "file:../path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:../path/to/foo",
  "distTag": "file:../path/to/foo",
  "file": "file:../path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:../path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:../path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:./path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:./path/to/foo",
  "name": "x",
  "bareSpec": "file:./path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:./path/to/foo",
  "distTag": "file:./path/to/foo",
  "file": "file:./path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:./path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:./path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/../path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:/../path/to/foo",
  "name": "x",
  "bareSpec": "file:/../path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:/../path/to/foo",
  "distTag": "file:/../path/to/foo",
  "file": "file:/../path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/../path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:/../path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/./path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:/./path/to/foo",
  "name": "x",
  "bareSpec": "file:/./path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:/./path/to/foo",
  "distTag": "file:/./path/to/foo",
  "file": "file:/./path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/./path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:/./path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/.path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:/.path/to/foo",
  "name": "x",
  "bareSpec": "file:/.path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:/.path/to/foo",
  "distTag": "file:/.path/to/foo",
  "file": "file:/.path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/.path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:/.path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://. > inspect 1`] = `
Object {
  "type": "file",
  "spec": "x@file://.",
  "name": "x",
  "bareSpec": "file://.",
  "file": "//.",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://. > toString 1`] = `
[object @vltpkg/spec.Spec {x@file://.}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://../path/to/foo > inspect 1`] = `
Object {
  "type": "file",
  "spec": "x@file://../path/to/foo",
  "name": "x",
  "bareSpec": "file://../path/to/foo",
  "file": "//../path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://../path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file://../path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://./path/to/foo > inspect 1`] = `
Object {
  "type": "file",
  "spec": "x@file://./path/to/foo",
  "name": "x",
  "bareSpec": "file://./path/to/foo",
  "file": "//./path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://./path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file://./path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:////path/to/foo > inspect 1`] = `
Object {
  "type": "file",
  "spec": "x@file:////path/to/foo",
  "name": "x",
  "bareSpec": "file:////path/to/foo",
  "file": "////path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:////path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:////path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:///path/to/foo > inspect 1`] = `
Object {
  "type": "file",
  "spec": "x@file:///path/to/foo",
  "name": "x",
  "bareSpec": "file:///path/to/foo",
  "file": "///path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:///path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:///path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://path/to/foo > inspect 1`] = `
Object {
  "type": "file",
  "spec": "x@file://path/to/foo",
  "name": "x",
  "bareSpec": "file://path/to/foo",
  "file": "//path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file://path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file://path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/~/path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:/~/path/to/foo",
  "name": "x",
  "bareSpec": "file:/~/path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:/~/path/to/foo",
  "distTag": "file:/~/path/to/foo",
  "file": "file:/~/path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/~/path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:/~/path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/~path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:/~path/to/foo",
  "name": "x",
  "bareSpec": "file:/~path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:/~path/to/foo",
  "distTag": "file:/~path/to/foo",
  "file": "file:/~path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/~path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:/~path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:/path/to/foo",
  "name": "x",
  "bareSpec": "file:/path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:/path/to/foo",
  "distTag": "file:/path/to/foo",
  "file": "file:/path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:/path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:/path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:~/path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:~/path/to/foo",
  "name": "x",
  "bareSpec": "file:~/path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:~/path/to/foo",
  "distTag": "file:~/path/to/foo",
  "file": "file:~/path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:~/path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:~/path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:path/to/foo > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:path/to/foo",
  "name": "x",
  "bareSpec": "file:path/to/foo",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:path/to/foo",
  "distTag": "file:path/to/foo",
  "file": "file:path/to/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:path/to/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:path/to/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:path/to/foo.tar.gz > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@file:path/to/foo.tar.gz",
  "name": "x",
  "bareSpec": "file:path/to/foo.tar.gz",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "file:path/to/foo.tar.gz",
  "distTag": "file:path/to/foo.tar.gz",
  "file": "file:path/to/foo.tar.gz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@file:path/to/foo.tar.gz > toString 1`] = `
[object @vltpkg/spec.Spec {x@file:path/to/foo.tar.gz}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git://github.com/user/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git://github.com/user/foo",
  "name": "x",
  "bareSpec": "git://github.com/user/foo",
  "gitRemote": "git://github.com/user/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git://github.com/user/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@git://github.com/user/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git://notgithub.com/user/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git://notgithub.com/user/foo",
  "name": "x",
  "bareSpec": "git://notgithub.com/user/foo",
  "gitRemote": "git://notgithub.com/user/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git://notgithub.com/user/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@git://notgithub.com/user/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git@github.com:12345/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@github.com:12345/foo",
  "name": "x",
  "bareSpec": "git+ssh://git@github.com:12345/foo",
  "gitRemote": "git+ssh://git@github.com:12345/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git@github.com:12345/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@github.com:12345/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git@npm:not-git > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@git@npm:not-git",
  "name": "x",
  "bareSpec": "git@npm:not-git",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "git@npm:not-git",
  "distTag": "git@npm:not-git",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git@npm:not-git > toString 1`] = `
[object @vltpkg/spec.Spec {x@git@npm:not-git}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+file://path/to/repo#1.2.3 > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@git+file://path/to/repo#1.2.3",
  "name": "x",
  "bareSpec": "git+file://path/to/repo#1.2.3",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "git+file://path/to/repo#1.2.3",
  "distTag": "git+file://path/to/repo#1.2.3",
  "file": "git+file://path/to/repo#1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+file://path/to/repo#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+file://path/to/repo#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@bitbucket.org/user/foo#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@bitbucket.org/user/foo#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@bitbucket.org/user/foo#1.2.3",
  "gitRemote": "git+ssh://git@bitbucket.org/user/foo",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@bitbucket.org/user/foo#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@bitbucket.org/user/foo#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@github.com:user/foo#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@github.com:user/foo#1.2.3",
  "gitRemote": "git+ssh://git@github.com:user/foo",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@github.com:user/foo#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#semver:^1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@github.com:user/foo#semver:^1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@github.com:user/foo#semver:^1.2.3",
  "gitRemote": "git+ssh://git@github.com:user/foo",
  "gitSelector": "semver:^1.2.3",
  "gitSelectorParsed": Object {
    "semver": "^1.2.3",
  },
  "range": "SemVer Range '>=1.2.3 <2.0.0-0'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com:user/foo#semver:^1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@github.com:user/foo#semver:^1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@github.com/user/foo#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@github.com/user/foo#1.2.3",
  "gitRemote": "git+ssh://git@github.com/user/foo",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@github.com/user/foo#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#semver:^1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@github.com/user/foo#semver:^1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@github.com/user/foo#semver:^1.2.3",
  "gitRemote": "git+ssh://git@github.com/user/foo",
  "gitSelector": "semver:^1.2.3",
  "gitSelectorParsed": Object {
    "semver": "^1.2.3",
  },
  "range": "SemVer Range '>=1.2.3 <2.0.0-0'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@github.com/user/foo#semver:^1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@github.com/user/foo#semver:^1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@gitlab.com/user/foo#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@gitlab.com/user/foo#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@gitlab.com/user/foo#1.2.3",
  "gitRemote": "git+ssh://git@gitlab.com/user/foo",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@gitlab.com/user/foo#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@gitlab.com/user/foo#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@notgithub.com:user/foo",
  "name": "x",
  "bareSpec": "git+ssh://git@notgithub.com:user/foo",
  "gitRemote": "git+ssh://git@notgithub.com:user/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@notgithub.com:user/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@notgithub.com:user/foo#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@notgithub.com:user/foo#1.2.3",
  "gitRemote": "git+ssh://git@notgithub.com:user/foo",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@notgithub.com:user/foo#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@notgithub.com:user/foo#semver:^1.2.3",
  "gitRemote": "git+ssh://git@notgithub.com:user/foo",
  "gitSelector": "semver:^1.2.3",
  "gitSelectorParsed": Object {
    "semver": "^1.2.3",
  },
  "range": "SemVer Range '>=1.2.3 <2.0.0-0'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@notgithub.com/user/foo",
  "name": "x",
  "bareSpec": "git+ssh://git@notgithub.com/user/foo",
  "gitRemote": "git+ssh://git@notgithub.com/user/foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@notgithub.com/user/foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@notgithub.com/user/foo#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@notgithub.com/user/foo#1.2.3",
  "gitRemote": "git+ssh://git@notgithub.com/user/foo",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@notgithub.com/user/foo#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://git@notgithub.com/user/foo#semver:^1.2.3",
  "gitRemote": "git+ssh://git@notgithub.com/user/foo",
  "gitSelector": "semver:^1.2.3",
  "gitSelectorParsed": Object {
    "semver": "^1.2.3",
  },
  "range": "SemVer Range '>=1.2.3 <2.0.0-0'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://mydomain.com:1234/hey",
  "name": "x",
  "bareSpec": "git+ssh://mydomain.com:1234/hey",
  "gitRemote": "git+ssh://mydomain.com:1234/hey",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://mydomain.com:1234/hey}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://mydomain.com:1234/hey#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://mydomain.com:1234/hey#1.2.3",
  "gitRemote": "git+ssh://mydomain.com:1234/hey",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234/hey#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://mydomain.com:1234/hey#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://mydomain.com:1234#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://mydomain.com:1234#1.2.3",
  "gitRemote": "git+ssh://mydomain.com:1234",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:1234#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://mydomain.com:1234#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://mydomain.com:foo",
  "name": "x",
  "bareSpec": "git+ssh://mydomain.com:foo",
  "gitRemote": "git+ssh://mydomain.com:foo",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://mydomain.com:foo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo/bar#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://mydomain.com:foo/bar#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://mydomain.com:foo/bar#1.2.3",
  "gitRemote": "git+ssh://mydomain.com:foo/bar",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo/bar#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://mydomain.com:foo/bar#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://mydomain.com:foo#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://mydomain.com:foo#1.2.3",
  "gitRemote": "git+ssh://mydomain.com:foo",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://mydomain.com:foo#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://mydomain.com:foo#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3",
  "name": "x",
  "bareSpec": "git+ssh://username:password@mydomain.com:1234/hey#1.2.3",
  "gitRemote": "git+ssh://username:password@mydomain.com:1234/hey",
  "gitSelector": "1.2.3",
  "gitSelectorParsed": Object {},
  "gitCommittish": "1.2.3",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@github:user/foo-js > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@github:user/foo-js",
  "name": "x",
  "bareSpec": "github:user/foo-js",
  "gitRemote": "git+ssh://git@github.com:user/foo-js.git",
  "namedGitHost": "github",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@github:user/foo-js > toString 1`] = `
[object @vltpkg/spec.Spec {x@github:user/foo-js}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / / > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /",
  "name": "x",
  "bareSpec": "gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /",
  "gitRemote": "git+ssh://git@gitlab.com:user..blerg--/..foo-js.git",
  "gitSelector": " . . . . . some . tags / / /",
  "gitSelectorParsed": Object {},
  "gitCommittish": " . . . . . some . tags / / /",
  "namedGitHost": "gitlab",
  "remoteURL": "https://gitlab.com/user..blerg--/..foo-js/repository/archive.tar.gz?ref= . . . . . some . tags / / /",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / / > toString 1`] = `
[object @vltpkg/spec.Spec {x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@gitlab:user/foo-js",
  "name": "x",
  "bareSpec": "gitlab:user/foo-js",
  "gitRemote": "git+ssh://git@gitlab.com:user/foo-js.git",
  "namedGitHost": "gitlab",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js > toString 1`] = `
[object @vltpkg/spec.Spec {x@gitlab:user/foo-js}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@gitlab:user/foo-js#bar/baz",
  "name": "x",
  "bareSpec": "gitlab:user/foo-js#bar/baz",
  "gitRemote": "git+ssh://git@gitlab.com:user/foo-js.git",
  "gitSelector": "bar/baz",
  "gitSelectorParsed": Object {},
  "gitCommittish": "bar/baz",
  "namedGitHost": "gitlab",
  "remoteURL": "https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz > toString 1`] = `
[object @vltpkg/spec.Spec {x@gitlab:user/foo-js#bar/baz}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz/bin > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@gitlab:user/foo-js#bar/baz/bin",
  "name": "x",
  "bareSpec": "gitlab:user/foo-js#bar/baz/bin",
  "gitRemote": "git+ssh://git@gitlab.com:user/foo-js.git",
  "gitSelector": "bar/baz/bin",
  "gitSelectorParsed": Object {},
  "gitCommittish": "bar/baz/bin",
  "namedGitHost": "gitlab",
  "remoteURL": "https://gitlab.com/user/foo-js/repository/archive.tar.gz?ref=bar/baz/bin",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@gitlab:user/foo-js#bar/baz/bin > toString 1`] = `
[object @vltpkg/spec.Spec {x@gitlab:user/foo-js#bar/baz/bin}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@http://insecure.com/foo.tgz > inspect 1`] = `
Object {
  "type": "remote",
  "spec": "x@http://insecure.com/foo.tgz",
  "name": "x",
  "bareSpec": "http://insecure.com/foo.tgz",
  "remoteURL": "http://insecure.com/foo.tgz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@http://insecure.com/foo.tgz > toString 1`] = `
[object @vltpkg/spec.Spec {x@http://insecure.com/foo.tgz}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://bitbucket.org/user/foo.git > inspect 1`] = `
Object {
  "type": "remote",
  "spec": "x@https://bitbucket.org/user/foo.git",
  "name": "x",
  "bareSpec": "https://bitbucket.org/user/foo.git",
  "remoteURL": "https://bitbucket.org/user/foo.git",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://bitbucket.org/user/foo.git > toString 1`] = `
[object @vltpkg/spec.Spec {x@https://bitbucket.org/user/foo.git}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://github.com/user/foo.git > inspect 1`] = `
Object {
  "type": "remote",
  "spec": "x@https://github.com/user/foo.git",
  "name": "x",
  "bareSpec": "https://github.com/user/foo.git",
  "remoteURL": "https://github.com/user/foo.git",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://github.com/user/foo.git > toString 1`] = `
[object @vltpkg/spec.Spec {x@https://github.com/user/foo.git}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://gitlab.com/user/foo.git > inspect 1`] = `
Object {
  "type": "remote",
  "spec": "x@https://gitlab.com/user/foo.git",
  "name": "x",
  "bareSpec": "https://gitlab.com/user/foo.git",
  "remoteURL": "https://gitlab.com/user/foo.git",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://gitlab.com/user/foo.git > toString 1`] = `
[object @vltpkg/spec.Spec {x@https://gitlab.com/user/foo.git}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://server.com/foo.tgz > inspect 1`] = `
Object {
  "type": "remote",
  "spec": "x@https://server.com/foo.tgz",
  "name": "x",
  "bareSpec": "https://server.com/foo.tgz",
  "remoteURL": "https://server.com/foo.tgz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@https://server.com/foo.tgz > toString 1`] = `
[object @vltpkg/spec.Spec {x@https://server.com/foo.tgz}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@not-git@hostname.com:some/repo > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@github:not-git@hostname.com:some/repo",
  "name": "x",
  "bareSpec": "github:not-git@hostname.com:some/repo",
  "gitRemote": "git+ssh://git@github.com:not-git@hostname.com:some/repo.git",
  "namedGitHost": "github",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@not-git@hostname.com:some/repo > toString 1`] = `
[object @vltpkg/spec.Spec {x@github:not-git@hostname.com:some/repo}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@npm:foo@npm:bar@npm:baz@1 > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@npm:foo@npm:bar@npm:baz@1",
  "name": "x",
  "bareSpec": "npm:foo@npm:bar@npm:baz@1",
  "namedRegistry": "npm",
  "registry": "https://registry.npmjs.org/",
  "subspec": Object {
    "type": "registry",
    "spec": "foo@npm:bar@npm:baz@1",
    "name": "foo",
    "bareSpec": "npm:bar@npm:baz@1",
    "namedRegistry": "npm",
    "registry": "https://registry.npmjs.org/",
    "subspec": Object {
      "type": "registry",
      "spec": "bar@npm:baz@1",
      "name": "bar",
      "bareSpec": "npm:baz@1",
      "namedRegistry": "npm",
      "registry": "https://registry.npmjs.org/",
      "subspec": Object {
        "type": "registry",
        "spec": "baz@1",
        "name": "baz",
        "bareSpec": "1",
        "registry": "https://registry.npmjs.org/",
        "registrySpec": "1",
        "semver": "1",
        "range": "SemVer Range '>=1.0.0 <2.0.0-0'",
      },
    },
  },
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@npm:foo@npm:bar@npm:baz@1 > toString 1`] = `
[object @vltpkg/spec.Spec {x@npm:foo@npm:bar@npm:baz@1}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@npm:y@npm:z@github:a/x#branch > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@npm:y@npm:z@github:a/x#branch",
  "name": "x",
  "bareSpec": "npm:y@npm:z@github:a/x#branch",
  "namedRegistry": "npm",
  "registry": "https://registry.npmjs.org/",
  "subspec": Object {
    "type": "registry",
    "spec": "y@npm:z@github:a/x#branch",
    "name": "y",
    "bareSpec": "npm:z@github:a/x#branch",
    "namedRegistry": "npm",
    "registry": "https://registry.npmjs.org/",
    "subspec": Object {
      "type": "git",
      "spec": "z@github:a/x#branch",
      "name": "z",
      "bareSpec": "github:a/x#branch",
      "gitRemote": "git+ssh://git@github.com:a/x.git",
      "gitSelector": "branch",
      "gitSelectorParsed": Object {},
      "gitCommittish": "branch",
      "namedGitHost": "github",
      "remoteURL": "https://codeload.github.com/a/x/tar.gz/branch",
    },
  },
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@npm:y@npm:z@github:a/x#branch > toString 1`] = `
[object @vltpkg/spec.Spec {x@npm:y@npm:z@github:a/x#branch}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@registry:https://example.com/npm#@org/pkg@latest > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@registry:https://example.com/npm#@org/pkg@latest",
  "name": "x",
  "bareSpec": "registry:https://example.com/npm#@org/pkg@latest",
  "registry": "https://example.com/npm",
  "subspec": Object {
    "type": "registry",
    "spec": "@org/pkg@latest",
    "name": "@org/pkg",
    "bareSpec": "latest",
    "registry": "https://example.com/npm",
    "registrySpec": "latest",
    "distTag": "latest",
  },
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@registry:https://example.com/npm#@org/pkg@latest > toString 1`] = `
[object @vltpkg/spec.Spec {x@registry:https://example.com/npm#@org/pkg@latest}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@user..blerg--/..foo-js# . . . . . some . tags / / / > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@user..blerg--/..foo-js# . . . . . some . tags / / /",
  "name": "x",
  "bareSpec": "user..blerg--/..foo-js# . . . . . some . tags / / /",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "user..blerg--/..foo-js# . . . . . some . tags / / /",
  "distTag": "user..blerg--/..foo-js# . . . . . some . tags / / /",
  "file": "user..blerg--/..foo-js# . . . . . some . tags / / /",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user..blerg--/..foo-js# . . . . . some . tags / / / > toString 1`] = `
[object @vltpkg/spec.Spec {x@user..blerg--/..foo-js# . . . . . some . tags / / /}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@github:user/foo-js",
  "name": "x",
  "bareSpec": "github:user/foo-js",
  "gitRemote": "git+ssh://git@github.com:user/foo-js.git",
  "namedGitHost": "github",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js > toString 1`] = `
[object @vltpkg/spec.Spec {x@github:user/foo-js}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@user/foo-js#bar/baz",
  "name": "x",
  "bareSpec": "user/foo-js#bar/baz",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "user/foo-js#bar/baz",
  "distTag": "user/foo-js#bar/baz",
  "file": "user/foo-js#bar/baz",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz > toString 1`] = `
[object @vltpkg/spec.Spec {x@user/foo-js#bar/baz}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz/bin > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@user/foo-js#bar/baz/bin",
  "name": "x",
  "bareSpec": "user/foo-js#bar/baz/bin",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "user/foo-js#bar/baz/bin",
  "distTag": "user/foo-js#bar/baz/bin",
  "file": "user/foo-js#bar/baz/bin",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo-js#bar/baz/bin > toString 1`] = `
[object @vltpkg/spec.Spec {x@user/foo-js#bar/baz/bin}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#1234::path:dist > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@github:user/foo#1234::path:dist",
  "name": "x",
  "bareSpec": "github:user/foo#1234::path:dist",
  "gitRemote": "git+ssh://git@github.com:user/foo.git",
  "gitSelector": "1234::path:dist",
  "gitSelectorParsed": Object {
    "path": "dist",
  },
  "gitCommittish": "1234",
  "namedGitHost": "github",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#1234::path:dist > toString 1`] = `
[object @vltpkg/spec.Spec {x@github:user/foo#1234::path:dist}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#notimplemented:value > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@github:user/foo#notimplemented:value",
  "name": "x",
  "bareSpec": "github:user/foo#notimplemented:value",
  "gitRemote": "git+ssh://git@github.com:user/foo.git",
  "gitSelector": "notimplemented:value",
  "gitSelectorParsed": Object {},
  "namedGitHost": "github",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#notimplemented:value > toString 1`] = `
[object @vltpkg/spec.Spec {x@github:user/foo#notimplemented:value}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#path:dist > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@github:user/foo#path:dist",
  "name": "x",
  "bareSpec": "github:user/foo#path:dist",
  "gitRemote": "git+ssh://git@github.com:user/foo.git",
  "gitSelector": "path:dist",
  "gitSelectorParsed": Object {
    "path": "dist",
  },
  "namedGitHost": "github",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#path:dist > toString 1`] = `
[object @vltpkg/spec.Spec {x@github:user/foo#path:dist}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#semver:^1.2.3 > inspect 1`] = `
Object {
  "type": "git",
  "spec": "x@github:user/foo#semver:^1.2.3",
  "name": "x",
  "bareSpec": "github:user/foo#semver:^1.2.3",
  "gitRemote": "git+ssh://git@github.com:user/foo.git",
  "gitSelector": "semver:^1.2.3",
  "gitSelectorParsed": Object {
    "semver": "^1.2.3",
  },
  "namedGitHost": "github",
  "range": "SemVer Range '>=1.2.3 <2.0.0-0'",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@user/foo#semver:^1.2.3 > toString 1`] = `
[object @vltpkg/spec.Spec {x@github:user/foo#semver:^1.2.3}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:* > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@workspace:*",
  "name": "x",
  "bareSpec": "workspace:*",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "workspace:*",
  "semver": "*",
  "range": "SemVer Range '*'",
  "distTag": "workspace:*",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:* > toString 1`] = `
[object @vltpkg/spec.Spec {x@workspace:*}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:^ > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@workspace:^",
  "name": "x",
  "bareSpec": "workspace:^",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "workspace:^",
  "distTag": "workspace:^",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:^ > toString 1`] = `
[object @vltpkg/spec.Spec {x@workspace:^}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:~ > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@workspace:~",
  "name": "x",
  "bareSpec": "workspace:~",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "workspace:~",
  "distTag": "workspace:~",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:~ > toString 1`] = `
[object @vltpkg/spec.Spec {x@workspace:~}]
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:1.x > inspect 1`] = `
Object {
  "type": "registry",
  "spec": "x@workspace:1.x",
  "name": "x",
  "bareSpec": "workspace:1.x",
  "registry": "https://registry.npmjs.org/",
  "registrySpec": "workspace:1.x",
  "semver": "1.x",
  "range": "SemVer Range '>=1.0.0 <2.0.0-0'",
  "distTag": "workspace:1.x",
}
`

exports[`test/index.ts > TAP > basic parsing tests > x@workspace:1.x > toString 1`] = `
[object @vltpkg/spec.Spec {x@workspace:1.x}]
`
