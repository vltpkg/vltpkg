import { Range } from '@vltpkg/semver'
import * as os from 'node:os'
import { posix, win32 } from 'node:path'
import t from 'tap'
import {
  kCustomInspect,
  type Spec as SpecType,
} from '../src/index.js'

const { Spec } = await t.mockImport<typeof import('../src/index.js')>(
  '../src/index.js',
  {
    'node:path': { ...posix, posix, win32 },
    'node:os': { ...os, homedir: () => '/mock/home' },
  },
)
// import { kCustomInspect, Spec } from '../src/index.js'

t.compareOptions = { sort: false }
const formatSnapshot = (obj: any): any =>
  !obj ? obj
  : obj instanceof Range ? `SemVer Range '${obj}'`
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
    'x@./foo',
    'x@foo/bar/baz',
    'x@/path/to/foo',
    'x@/path/to/foo.tar',
    'x@/path/to/foo.tgz',
    'x@file:path/to/foo',
    'x@file:path/to/foo.tar.gz',
    'x@file:~/path/to/foo',
    'x@file:/~/path/to/foo',
    'x@file://~/path/to/foo',
    'x@file:///~/path/to/foo',
    'x@file:/.path/to/foo',
    'x@file:./path/to/foo',
    'x@file:/./path/to/foo',
    'x@file://./path/to/foo',
    'x@file:../path/to/foo',
    'x@file:/../path/to/foo',
    'x@file://../path/to/foo',
    'x@file:///path/to/foo',
    'x@file:/path/to/foo',
    'x@file:////path/to/foo',
    'x@file:',
    'x@file:/.',
    'x@file://',
    'x@file://.',
    'x@file:/..',
    'x@file://..',
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
    'x@workspace:',
    'x@workspace:*',
    'x@workspace:~',
    'x@workspace:^',
    'x@workspace:1.x',
    'x@workspace:y@',
    'x@workspace:y@*',
    'x@workspace:y@~',
    'x@workspace:y@^',
    'x@workspace:y@1.x',
  ]

  t.plan(versions.length)
  for (const v of versions) {
    t.test(v, t => {
      const s = Spec.parse(v)
      t.matchSnapshot(s[kCustomInspect](), 'inspect')
      t.matchSnapshot(String(s), 'toString')
      t.end()
    })
  }
})

t.throws(() => Spec.parse('x@github:a/b#dead::semver:1.x'))
t.throws(() => Spec.parse('x@registry:https://a.com'))
t.throws(() => Spec.parse('x@workspace:wat'))
t.throws(() => Spec.parse('x@github:a/b#semver:invalid'))

t.test('get final subspec in chain', t => {
  const subby = Spec.parse('x@npm:y@npm:z@latest')
  const final = subby.final
  t.not(subby, final, 'final is not the alias spec')
  t.not(subby.subspec, final, 'final is not the first alias value')
  t.equal(subby.subspec?.subspec, final, 'final is 2 levels deep')
  t.equal(final, final.final, 'final is its own finality')
  t.end()
})

t.test('simplify in the toString result', t => {
  const spec = Spec.parse('x@npm:y@npm:z@npm:a@npm:b@latest')
  t.equal(spec.toString(), 'x@npm:b@latest')
  // test the memoization
  t.equal(spec.toString(), 'x@npm:b@latest')
  t.end()
})

t.test('parse argument options', t => {
  const nameAndBare = Spec.parse('foo', 'latest')
  const full = Spec.parse('foo@latest')
  t.matchOnly(full, nameAndBare)
  t.equal(full, Spec.parse(full, { registry: 'https://vlt.sh' }))
  t.end()
})

t.test('constructor argument options', t => {
  const nameAndBare = new Spec('foo', 'latest')
  const full = new Spec('foo@latest')
  t.matchOnly(full, nameAndBare)
  t.end()
})

t.test('reverse-lookup registry: specifiers if named', t => {
  // verify that it works regardless of slashiness
  const specs = [
    'x@registry:http://vlt.sh#x@latest',
    'x@registry:http://vlt.sh/#x@latest',
  ]
  const urls = ['http://vlt.sh', 'http://vlt.sh/']
  const found: SpecType[] = []
  for (const s of specs) {
    for (const vlt of urls) {
      found.push(Spec.parse(s, { registries: { vlt } }))
    }
  }
  for (const spec of found) {
    t.equal(spec.namedRegistry, 'vlt')
    t.equal(spec.registry, 'http://vlt.sh/')
    t.equal(spec.options.registries.vlt, 'http://vlt.sh/')
  }
  t.matchSnapshot(found.map(s => String(s)))
  t.end()
})

t.test('named git host must have something after the name', t => {
  t.throws(() => Spec.parse('x', 'github:'))
  t.end()
})

t.test('invalid file: URIs', t => {
  const nogood = [
    'file://x\0y/',
    // npm incorrectly treats this as `file:///host/share`
    // `file://host/share` is `/share` on the server `host`, not
    // `/host/share` on `localhost`. Do not allow.
    'file://host/share',
    'file://~user/home',
    'file:/~user/home',
    'file:~user/home',
  ]
  for (const s of nogood) {
    t.throws(() => {
      const spec = Spec.parse('x', s)
      t.equal(spec, undefined, 'should not parse properly')
    }, `${s} should throw`)
  }

  t.end()
})

t.test('try to guess the conventional tarball URL', t => {
  const guesses: [spec: string, path?: string, r?: boolean][] = [
    ['x@1.2.3', '/x/-/x-1.2.3.tgz'],
    ['x@=1.2.3', '/x/-/x-1.2.3.tgz'],
    ['x@npm:y@2.4.5', '/y/-/y-2.4.5.tgz'],
    ['x@npm:y@=2.4.5', '/y/-/y-2.4.5.tgz'],
    ['x@npm:y@v2.4.5', '/y/-/y-2.4.5.tgz'],
    ['x@vlt:z@6.5.4', '/z/-/z-6.5.4.tgz', true],
    ['@scope/pkg@1.2.3', '/@scope/pkg/-/pkg-1.2.3.tgz'],
    ['@scope/pkg@npm:x@1.2.3', '/x/-/x-1.2.3.tgz'],
    ['@scope/pkg@vlt:x@1.2.3', '/x/-/x-1.2.3.tgz', true],

    [
      'x@registry:https://registry.npmjs.org#x@1.2.3',
      '/x/-/x-1.2.3.tgz',
    ],
    [
      'x@registry:https://registry.npmjs.org#x@=1.2.3',
      '/x/-/x-1.2.3.tgz',
    ],
    [
      'x@registry:https://registry.npmjs.org#x@npm:y@2.4.5',
      '/y/-/y-2.4.5.tgz',
    ],
    [
      'x@registry:https://registry.npmjs.org#x@npm:y@=2.4.5',
      '/y/-/y-2.4.5.tgz',
    ],
    [
      'x@registry:https://registry.npmjs.org#x@npm:y@v2.4.5',
      '/y/-/y-2.4.5.tgz',
    ],
    [
      'x@registry:https://registry.npmjs.org#x@vlt:z@6.5.4',
      '/z/-/z-6.5.4.tgz',
      true,
    ],
    [
      'x@registry:https://registry.npmjs.org#@scope/pkg@1.2.3',
      '/@scope/pkg/-/pkg-1.2.3.tgz',
    ],
    [
      'x@registry:https://registry.npmjs.org#@scope/pkg@npm:x@1.2.3',
      '/x/-/x-1.2.3.tgz',
    ],
    [
      'x@registry:https://registry.npmjs.org#@scope/pkg@vlt:x@1.2.3',
      '/x/-/x-1.2.3.tgz',
      true,
    ],

    // not guessable
    ['x@1.x'],
    ['x@>1.2.3'],
    ['x@npm:y@3.4'],
    ['x@npm:z@latest'],
  ]
  const options = {
    registries: {
      vlt: 'https://registry.vlt.sh',
    },
  }
  for (const [spec, path, r] of guesses) {
    const s = Spec.parse(spec, options)
    if (path === undefined) {
      t.equal(
        s.conventionalRegistryTarball,
        undefined,
        'should not try to guess',
      )
    } else {
      const host =
        r ? 'https://registry.vlt.sh' : 'https://registry.npmjs.org'
      const expect = String(new URL(path, host))
      t.equal(s.conventionalRegistryTarball, expect)
    }
  }
  t.end()
})

t.test('git path selector must be relative', async t => {
  const nogood = [
    'git+ssh://user@host/repo#main::path:/x',
    'git+ssh://user@host/repo#main::path:../x',
    'git+ssh://user@host/repo#main::path:x/../x',
    'git+ssh://user@host/repo#main::path:x/..',
    'git+ssh://user@host/repo#main::path:..\\x',
    'git+ssh://user@host/repo#main::path:x\\..\\x',
    'git+ssh://user@host/repo#main::path:x\\..',
  ]
  for (const bad of nogood) {
    t.throws(
      () => Spec.parse(bad),
      {
        message: 'Invalid path in git selector',
        cause: { spec: Spec },
      },
      bad,
    )
  }
})
