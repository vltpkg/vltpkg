import { Range } from '@vltpkg/semver'
import t from 'tap'
import { kCustomInspect, Spec } from '../src/index.js'

t.compareOptions = { sort: false }
const formatSnapshot = (obj: any): any =>
  !!obj && obj instanceof Range ? `SemVer Range '${obj}'`
  : Array.isArray(obj) ? obj.map(o => formatSnapshot(o))
  : typeof obj === 'object' ?
    Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, formatSnapshot(v)]),
    )
  : obj
t.formatSnapshot = formatSnapshot

t.test('basic parsing tests', t => {
  const versions = [
    'foo',
    'foo@1.2',
    'foo@~1.2',
    '@foo/bar@*',
    '@foo/bar@',
    '@foo/bar@baz',
    'x@f fo o al/ a d s ;f',
    'foo@1.2.3',
    'foo@=v1.2.3',
    'foo@npm:bar@',
    'x@git+ssh://git@notgithub.com/user/foo#1.2.3',
    'x@git+ssh://git@notgithub.com/user/foo',
    'x@git+ssh://git@notgithub.com:user/foo',
    'x@git+ssh://mydomain.com:foo',
    'x@git+ssh://git@notgithub.com:user/foo#1.2.3',
    'x@git+ssh://mydomain.com:foo#1.2.3',
    'x@git+ssh://mydomain.com:foo/bar#1.2.3',
    'x@git+ssh://mydomain.com:1234#1.2.3',
    'x@git+ssh://mydomain.com:1234/hey#1.2.3',
    'x@git+ssh://mydomain.com:1234/hey',
    'x@git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
    'x@git+ssh://git@github.com/user/foo#1.2.3',
    'x@git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
    'x@git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
    'x@git+ssh://git@github.com/user/foo#semver:^1.2.3',
    'x@git+ssh://git@github.com:user/foo#semver:^1.2.3',
    'x@user/foo#semver:^1.2.3',
    'x@user/foo#path:dist',
    'x@user/foo#1234::path:dist',
    'x@user/foo#notimplemented:value',
    'x@git+file://path/to/repo#1.2.3',
    'x@git://notgithub.com/user/foo',
    '@foo/bar@git+ssh://notgithub.com/user/foo',
    'x@git@npm:not-git',
    'x@not-git@hostname.com:some/repo',
    'x@/path/to/foo',
    'x@/path/to/foo.tar',
    'x@/path/to/foo.tgz',
    'x@file:path/to/foo',
    'x@file:path/to/foo.tar.gz',
    'x@file:~/path/to/foo',
    'x@file:/~/path/to/foo',
    'x@file:/~path/to/foo',
    'x@file:/.path/to/foo',
    'x@file:./path/to/foo',
    'x@file:/./path/to/foo',
    'x@file://./path/to/foo',
    'x@file:../path/to/foo',
    'x@file:/../path/to/foo',
    'x@file://../path/to/foo',
    'x@file:///path/to/foo',
    'x@file:/path/to/foo',
    'x@file://path/to/foo',
    'x@file:////path/to/foo',
    'x@file://.',
    'x@http://insecure.com/foo.tgz',
    'x@https://server.com/foo.tgz',
    'foo@latest',
    'foo@',
    'foo@ 1.2 ',
    'foo@ 1.2.3 ',
    'foo@1.2.3 ',
    'foo@ 1.2.3',
    'x@user/foo-js',
    'x@user/foo-js#bar/baz',
    'x@user..blerg--/..foo-js# . . . . . some . tags / / /',
    'x@user/foo-js#bar/baz/bin',
    'foo@user/foo-js',
    'x@github:user/foo-js',
    'x@git+ssh://git@github.com:user/foo#1.2.3',
    'x@git://github.com/user/foo',
    'x@https://github.com/user/foo.git',
    '@foo/bar@git+ssh://github.com/user/foo',
    'foo@bar/foo',
    'x@git@github.com:12345/foo',
    'x@bitbucket:user/foo-js',
    'x@bitbucket:user/foo-js#bar/baz',
    'x@bitbucket:user..blerg--/..foo-js# . . . . . some . tags / / /',
    'x@bitbucket:user/foo-js#bar/baz/bin',
    'foo@bitbucket:user/foo-js',
    'x@git+ssh://git@bitbucket.org/user/foo#1.2.3',
    'x@https://bitbucket.org/user/foo.git',
    '@foo/bar@git+ssh://bitbucket.org/user/foo',
    'x@gitlab:user/foo-js',
    'x@gitlab:user/foo-js#bar/baz',
    'x@gitlab:user..blerg--/..foo-js# . . . . . some . tags / / /',
    'x@gitlab:user/foo-js#bar/baz/bin',
    'foo@gitlab:user/foo-js',
    'x@git+ssh://git@gitlab.com/user/foo#1.2.3',
    'x@https://gitlab.com/user/foo.git',
    '@foo/bar@git+ssh://gitlab.com/user/foo',
    'x@npm:y@npm:z@github:a/x#branch',
    'x@registry:https://example.com/npm#@org/pkg@latest',
    'x@npm:foo@npm:bar@npm:baz@1',
    'x@workspace:*',
    'x@workspace:~',
    'x@workspace:^',
    'x@workspace:1.x',
  ]

  t.plan(versions.length)
  for (const v of versions) {
    t.test(v, t => {
      const s = Spec.parse(v)
      t.matchSnapshot(s[kCustomInspect](), 'inspect')
      t.matchSnapshot(s.toString(), 'toString')
      t.end()
    })
  }
})

t.throws(() => Spec.parse('x@github:a/b#dead::semver:1.x'))
t.throws(() => Spec.parse('x@registry:https://a.com'))
t.throws(() => Spec.parse('x@workspace:wat'))
t.throws(() => Spec.parse('x@github:a/b#semver:invalid'))
