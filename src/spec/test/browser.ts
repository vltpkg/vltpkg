import { Range } from '@vltpkg/semver'
import type { InspectOptions } from 'node:util'
import { inspect } from 'node:util'
import t from 'tap'
import type { Scope, SpecOptions } from '../src/browser.ts'
import { kCustomInspect, Spec, isSpec } from '../src/browser.ts'

Object.assign(Spec.prototype, {
  [kCustomInspect](
    _depth?: number,
    options?: InspectOptions,
  ): string {
    const str = inspect(
      Object.fromEntries(
        Object.entries(this).filter(([k, v]) => {
          return k !== 'options' && v !== undefined
        }),
      ),
      options,
    )
    return `@vltpkg/spec.Spec ${str}`
  },
})

t.strictSame(Spec.parseGitSelector(''), [{}])

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
  // make sure we're in non-TTY mode, in case this test is run directly
  t.intercept(process.stdout, 'isTTY', { value: false })
  t.intercept(process.stderr, 'isTTY', { value: false })
  const specs = [
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
    'x@workspace:@a/b@',
    '@x/y@workspace:@a/b@',
    'x@https://github.com/user/project',
    'foo@https://bitbucket.org/user/project/a/s/d/f/#semver:1.x::path:src/foo',
    '@a/b@npm:@y/z@1.2.3',
    '@luca/cases@jsr:@luca/cases@1',
    '@luca/cases@jsr:1',
    '@luca/cases@jsr:@luca/cases',
    '@luca/cases@jsr:',
    'cases@jsr:@luca/cases',
    'cases@jsr:@luca/cases@1',
    '@other/xyz@jsr:@luca/cases',
    '@other/xyz@jsr:@luca/cases@1',
    // little bit confusing, but worth testing
    'foo@npm:@luca/cases@jsr:1',
    // GitHub registry support
    'package@gh:@octocat/hello-world@1.0.0',
    'gh:@octocat/hello-world@1.0.0',
    '@mycompany/package@gh:@octocat/hello-world@latest',
    'gh:@octocat/hello-world',
  ]

  t.plan(specs.length)
  for (const v of specs) {
    t.test(v, t => {
      const s = Spec.parse(v)
      t.matchSnapshot(inspect(s), 'inspect default')
      t.matchSnapshot(
        inspect(s, { colors: true }),
        'inspect with color',
      )
      t.matchSnapshot(inspect(s, { depth: Infinity }), 'inspect deep')
      t.matchSnapshot(String(s), 'toString')
      t.end()
    })
  }
})

t.test('parse args', t => {
  // make sure we're in non-TTY mode, in case this test is run directly
  t.intercept(process.stdout, 'isTTY', { value: false })
  t.intercept(process.stderr, 'isTTY', { value: false })
  const specs = [
    'foo',
    'foo@1.2',
    'foo@~1.2',
    '@foo/bar',
    '@foo/bar@*',
    '@foo/bar@',
    '@foo/bar@baz',
    'x@f fo o al/ a d s ;f',
    'foo@1.2.3',
    'foo@=v1.2.3',
    'foo@npm:bar@',
    'npm:foo',
    'custom:foo',
    'custom:foo@1',
    'github:a/b',
    '@a/b@bitbucket:a/b',
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
    'git+ssh://git@notgithub.com/user/foo#1.2.3',
    'git+ssh://git@notgithub.com/user/foo',
    'git+ssh://git@notgithub.com:user/foo',
    'git+ssh://mydomain.com:foo',
    'git+ssh://git@notgithub.com:user/foo#1.2.3',
    'git+ssh://mydomain.com:foo#1.2.3',
    'git+ssh://mydomain.com:foo/bar#1.2.3',
    'git+ssh://mydomain.com:1234#1.2.3',
    'git+ssh://mydomain.com:1234/hey#1.2.3',
    'git+ssh://mydomain.com:1234/hey',
    'git+ssh://username:password@mydomain.com:1234/hey#1.2.3',
    'git+ssh://git@github.com/user/foo#1.2.3',
    'git+ssh://git@notgithub.com/user/foo#semver:^1.2.3',
    'git+ssh://git@notgithub.com:user/foo#semver:^1.2.3',
    'git+ssh://git@github.com/user/foo#semver:^1.2.3',
    'git+ssh://git@github.com:user/foo#semver:^1.2.3',
    'x@user/foo#semver:^1.2.3',
    'x@user/foo#path:dist',
    'x@user/foo#1234::path:dist',
    'x@user/foo#notimplemented:value',
    'x@git+file://path/to/repo#1.2.3',
    'x@git://notgithub.com/user/foo',
    'user/foo#semver:^1.2.3',
    'user/foo#path:dist',
    'user/foo#1234::path:dist',
    'user/foo#notimplemented:value',
    'git+file://path/to/repo#1.2.3',
    'git://notgithub.com/user/foo',
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
    './foo',
    'foo/bar/baz',
    '/path/to/foo',
    '/path/to/foo.tar',
    '/path/to/foo.tgz',
    'file:path/to/foo',
    'file:path/to/foo.tar.gz',
    'file:~/path/to/foo',
    'file:/~/path/to/foo',
    'file://~/path/to/foo',
    'file:///~/path/to/foo',
    'file:/.path/to/foo',
    'file:./path/to/foo',
    'file:/./path/to/foo',
    'file://./path/to/foo',
    'file:../path/to/foo',
    'file:/../path/to/foo',
    'file://../path/to/foo',
    'file:///path/to/foo',
    'file:/path/to/foo',
    'file:////path/to/foo',
    'file:',
    'file:/.',
    'file://',
    'file://.',
    'file:/..',
    'file://..',
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
    'x@workspace:@a/b@',
    '@x/y@workspace:@a/b@',
    'workspace:',
    'workspace:*',
    'workspace:~',
    'workspace:^',
    'workspace:1.x',
    'workspace:y@',
    'workspace:y@*',
    'workspace:y@~',
    'workspace:y@^',
    'workspace:y@1.x',
    'workspace:@a/b@',
    'workspace:@a/b@',
    'x@https://github.com/user/project',
    'foo@https://bitbucket.org/user/project/a/s/d/f/#semver:1.x::path:src/foo',
    '@a/b@npm:@y/z@1.2.3',
    'jsr:@luca/cases@1',
    'jsr:@luca/cases',
    '@luca/cases@jsr:1',
    '@luca/cases@jsr:',
    'cases@jsr:@luca/cases@1',
    'cases@jsr:@luca/cases',
    'foo@npm:@luca/cases@jsr:1',
    // little bit confusing, but worth testing
    'npm:@luca/cases@jsr:1',
    'jsr:@luca/cases@1',
    '@luca/cases@jsr:@luca/cases@1',
    '@luca/cases@jsr:1',
    '@luca/cases@jsr:@a/b@jsr:1',
    '@luca/cases@jsr:@luca/cases@jsr:@x/y@1',
    'npm:abbrev',
    'npm:abbrev@1',
    // GitHub registry support
    'gh:@octocat/hello-world@1.0.0',
    'gh:@octocat/hello-world',
  ]

  const specOptions: SpecOptions = {
    registry: 'https://registry.npmjs.org/',
    registries: {
      npm: 'https://registry.npmjs.org/',
      custom: 'http://example.com',
    },
  } satisfies SpecOptions

  t.plan(specs.length + 1)
  for (const v of specs) {
    t.test(v, t => {
      const s = Spec.parseArgs(v, specOptions)
      t.matchSnapshot(inspect(s), 'inspect default')
      t.end()
    })
  }

  t.test('no options', t => {
    const s = Spec.parseArgs('foo@^1.0.0')
    t.matchSnapshot(inspect(s), 'no options')
    t.end()
  })
})

t.test('setting default registry sets npm: alias', async t => {
  const s = Spec.parse('a@npm:a@1', { registry: 'https://a.com/' })
  t.matchStrict(s, {
    type: 'registry',
    spec: 'a@npm:a@1',
    name: 'a',
    bareSpec: 'npm:a@1',
    namedRegistry: 'npm',
    registry: 'https://a.com/',
    subspec: {
      type: 'registry',
      spec: 'a@1',
      name: 'a',
      bareSpec: '1',
      namedRegistry: 'npm',
      registry: 'https://a.com/',
      registrySpec: '1',
      semver: '1',
      range: { raw: '1' },
    },
  })
})

t.test('mixing scopes and names', t => {
  const spec = '@a/b@x:@y/z@i:@j/k@1.2.3'
  const scopeRegs: [Scope, string][] = [
    ['@a', 'https://a.com/'],
    ['@y', 'https://y.com/'],
    ['@j', 'https://j.com/'],
  ]

  const scopeRegistries: Record<Scope, string> = {}

  const options: SpecOptions = {
    registries: {
      x: 'https://x.com/',
      i: 'https://i.com/',
    },
    'scope-registries': scopeRegistries,
  }
  for (const [scope, reg] of scopeRegs) {
    scopeRegistries[scope] = reg
    t.matchSnapshot(
      Spec.parse(spec, options)[kCustomInspect](),
      `scopes: ${Object.keys(scopeRegistries).join(', ')}`,
    )
  }

  t.end()
})

t.throws(() => Spec.parse('x@github:a/b#dead::semver:1.x'))
t.throws(() => Spec.parse('x@registry:https://a.com'))
t.throws(() => Spec.parse('x@workspace:wat'))
t.throws(() => Spec.parse('x@github:a/b#semver:invalid'))

t.test('invalid workspace specs', t => {
  const badSpecs = [
    'x@workspace:@',
    'x@workspace:@*',
    'x@workspace:@~',
    'x@workspace:@^',
    'x@workspace:*@',
    'x@workspace:~@',
    'x@workspace:^@',
    'x@workspace:@1.x',
    'x@workspace:@y',
    'x@workspace:@y@*',
    'x@workspace:@y@~',
    'x@workspace:@y@^',
    'x@workspace:@y@1.x',
    'x@workspace:@a/b',
    '@x/y@workspace:@a/b',
  ]
  for (const s of badSpecs) {
    t.throws(() => Spec.parse(s), s)
  }
  t.end()
})

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
  const found: Spec[] = []
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
    //can't clean up absolute in browser 'git+ssh://user@host/repo#main::path:/x',
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

t.test(
  'spec with registry:undefined uses default registry',
  async t => {
    const s = Spec.parse('foo@1.x', { registry: undefined })
    t.equal(s.registry, 'https://registry.npmjs.org/')
  },
)

t.test('gh: registry support', async t => {
  const spec1 = Spec.parse('test@gh:@octocat/hello-world@1.0.0')
  t.equal(spec1.type, 'registry', 'should be registry type')
  t.equal(spec1.namedRegistry, 'gh', 'should use gh registry')
  t.equal(spec1.registry, 'https://npm.pkg.github.com/', 'should map to GitHub registry URL')
  t.equal(spec1.name, 'test', 'should preserve package name')
  
  const spec2 = Spec.parse('gh:@octocat/hello-world@1.0.0')
  t.equal(spec2.type, 'registry', 'should be registry type')
  t.equal(spec2.namedRegistry, 'gh', 'should use gh registry')
  t.equal(spec2.registry, 'https://npm.pkg.github.com/', 'should map to GitHub registry URL')
  t.equal(spec2.name, '@octocat/hello-world', 'should infer package name from subspec')
  
  // Test that it works with user-provided registries too
  const spec3 = Spec.parse('test@gh:@octocat/hello-world@1.0.0', {
    registries: { custom: 'https://custom.registry.com/' }
  })
  t.equal(spec3.registry, 'https://npm.pkg.github.com/', 'should still use default gh registry')
  
  t.end()
})

t.test('catalogs', async t => {
  const catalog = { a: '1.2.3' }
  const catalogs = { x: { a: '1.2.3' }, y: { a: '2.3.4' } }
  const opts = { catalog, catalogs }

  t.match(Spec.parse('a@catalog:', opts), {
    name: 'a',
    type: 'catalog',
    catalog: '',
    subspec: {
      name: 'a',
      bareSpec: '1.2.3',
    },
  })

  t.match(Spec.parse('a@catalog:x', opts), {
    name: 'a',
    type: 'catalog',
    catalog: 'x',
    subspec: {
      name: 'a',
      bareSpec: '1.2.3',
    },
  })

  t.match(Spec.parse('b@npm:a@catalog:x', opts), {
    name: 'b',
    namedRegistry: 'npm',
    subspec: {
      name: 'a',
      type: 'catalog',
      catalog: 'x',
      subspec: {
        name: 'a',
        bareSpec: '1.2.3',
      },
    },
  })

  t.throws(() => Spec.parse('b@catalog:', opts), {
    message: 'Name not found in catalog',
    cause: {
      name: 'b',
      validOptions: ['a'],
      spec: 'b@catalog:',
    },
  })
  t.throws(() => Spec.parse('b@catalog:z', opts), {
    message: 'Named catalog not found',
    cause: {
      name: 'z',
      validOptions: ['x', 'y'],
      spec: 'b@catalog:z',
    },
  })
})

t.test('isSpec', async t => {
  // Valid Spec instance
  const validSpec = Spec.parse('foo@1.2.3')
  t.equal(
    isSpec(validSpec),
    true,
    'should identify a valid Spec instance',
  )

  // Invalid values
  t.equal(isSpec(null), false, 'null is not a Spec')
  t.equal(isSpec(undefined), false, 'undefined is not a Spec')
  t.equal(isSpec('foo@1.2.3'), false, 'string is not a Spec')
  t.equal(isSpec(123), false, 'number is not a Spec')
  t.equal(isSpec([]), false, 'array is not a Spec')
  t.equal(isSpec({}), false, 'empty object is not a Spec')

  // Object with missing properties
  t.equal(
    isSpec({ spec: 'foo@1.2.3', bareSpec: '1.2.3', name: 'foo' }),
    false,
    'missing type and options',
  )

  // Object with incorrect property types
  t.equal(
    isSpec({
      spec: 123,
      bareSpec: '1.2.3',
      name: 'foo',
      type: 'registry',
      options: {},
    }),
    false,
    'spec property is not a string',
  )

  t.equal(
    isSpec({
      spec: 'foo@1.2.3',
      bareSpec: 123,
      name: 'foo',
      type: 'registry',
      options: {},
    }),
    false,
    'bareSpec property is not a string',
  )

  t.equal(
    isSpec({
      spec: 'foo@1.2.3',
      bareSpec: '1.2.3',
      name: 123,
      type: 'registry',
      options: {},
    }),
    false,
    'name property is not a string',
  )

  // An object that looks and behaves like a Spec
  t.equal(
    isSpec({
      spec: 'foo@1.2.3',
      bareSpec: '1.2.3',
      name: 'foo',
      type: 'registry',
      options: {},
    }),
    true,
    'object with all required properties should pass the type guard',
  )
})
