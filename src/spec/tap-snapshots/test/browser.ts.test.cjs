/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/browser.ts > TAP > spec @foo/bar@ of type  registry 1`] = `
Object {
  "bareSpec": "",
  "name": "@foo/bar",
  "spec": "@foo/bar@",
  "type": " registry",
}
`

exports[`test/browser.ts > TAP > spec @foo/bar@* of type registry 1`] = `
Object {
  "bareSpec": "*",
  "name": "@foo/bar",
  "spec": "@foo/bar@*",
  "type": "registry",
}
`

exports[`test/browser.ts > TAP > spec @foo/bar@baz of type registry 1`] = `
Object {
  "bareSpec": "baz",
  "name": "@foo/bar",
  "spec": "@foo/bar@baz",
  "type": "registry",
}
`

exports[`test/browser.ts > TAP > spec foo@ 1.2  of type registry 1`] = `
Object {
  "bareSpec": " 1.2 ",
  "name": "foo",
  "spec": "foo@ 1.2 ",
  "type": "registry",
}
`

exports[`test/browser.ts > TAP > spec foo@ of type registry 1`] = `
Object {
  "bareSpec": "",
  "name": "foo",
  "spec": "foo@",
  "type": "registry",
}
`

exports[`test/browser.ts > TAP > spec foo@~1.2 of type registry 1`] = `
Object {
  "bareSpec": "~1.2",
  "name": "foo",
  "spec": "foo@~1.2",
  "type": "registry",
}
`

exports[`test/browser.ts > TAP > spec foo@1.2 of type registry 1`] = `
Object {
  "bareSpec": "1.2",
  "name": "foo",
  "spec": "foo@1.2",
  "type": "registry",
}
`

exports[`test/browser.ts > TAP > spec foo@bar/foo of type file 1`] = `
Object {
  "bareSpec": "bar/foo",
  "name": "foo",
  "spec": "foo@bar/foo",
  "type": "file",
}
`

exports[`test/browser.ts > TAP > spec foo@example:foo/bar of type git with git options 1`] = `
Object {
  "bareSpec": "example:foo/bar",
  "name": "foo",
  "options": Object {
    "git-host-archives": Object {
      "bitbucket": "https://bitbucket.org/$1/$2/get/$committish.tar.gz",
      "example": "https://example.com/$1/$2/archive/$committish.tar.gz",
      "gist": "https://codeload.github.com/gist/$1/tar.gz/$committish",
      "github": "https://codeload.github.com/$1/$2/tar.gz/$committish",
      "gitlab": "https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish",
    },
    "git-hosts": Object {
      "bitbucket": "git+ssh://git@bitbucket.org:$1/$2.git",
      "example": "git+ssh://git@example.com/$1/$2.git",
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
  "spec": "foo@example:foo/bar",
  "type": "git",
}
`

exports[`test/browser.ts > TAP > spec foo@latest of type registry 1`] = `
Object {
  "bareSpec": "latest",
  "name": "foo",
  "spec": "foo@latest",
  "type": "registry",
}
`

exports[`test/browser.ts > TAP > spec foo@npm:bar@ of type registry 1`] = `
Object {
  "bareSpec": "npm:bar@",
  "name": "foo",
  "spec": "foo@npm:bar@",
  "type": "registry",
}
`

exports[`test/browser.ts > TAP > spec x@./foo of type file 1`] = `
Object {
  "bareSpec": "./foo",
  "name": "x",
  "spec": "x@./foo",
  "type": "file",
}
`

exports[`test/browser.ts > TAP > spec x@f fo o al/ a d s ;f of type registry 1`] = `
Object {
  "bareSpec": "f fo o al/ a d s ;f",
  "name": "x",
  "spec": "x@f fo o al/ a d s ;f",
  "type": "registry",
}
`

exports[`test/browser.ts > TAP > spec x@file:path/to/foo of type file 1`] = `
Object {
  "bareSpec": "file:path/to/foo",
  "name": "x",
  "spec": "x@file:path/to/foo",
  "type": "file",
}
`

exports[`test/browser.ts > TAP > spec x@git+ssh://git@notgithub.com/user/foo#1.2.3 of type git 1`] = `
Object {
  "bareSpec": "git+ssh://git@notgithub.com/user/foo#1.2.3",
  "name": "x",
  "spec": "x@git+ssh://git@notgithub.com/user/foo#1.2.3",
  "type": "git",
}
`

exports[`test/browser.ts > TAP > spec x@user/foo#semver:^1.2.3 of type git 1`] = `
Object {
  "bareSpec": "user/foo#semver:^1.2.3",
  "name": "x",
  "spec": "x@user/foo#semver:^1.2.3",
  "type": "git",
}
`

exports[`test/browser.ts > TAP > spec x@workspace:* of type workspace 1`] = `
Object {
  "bareSpec": "workspace:*",
  "name": "x",
  "spec": "x@workspace:*",
  "type": "workspace",
}
`
