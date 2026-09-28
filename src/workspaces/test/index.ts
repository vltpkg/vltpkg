import { unload } from '@vltpkg/vlt-json'
import type { DepResults } from '@vltpkg/graph-run'
import { resolve } from 'node:path'
import t from 'tap'
import type { Workspace } from '../src/index.ts'
import {
  asManifestWSConfig,
  asWSConfig,
  Monorepo,
  resolveWSConfig,
  splitNegatedPatterns,
} from '../src/index.ts'

t.test('load some workspaces', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: { packages: ['./src/*'] },
    }),
    src: {
      foo: {
        'package.json': JSON.stringify({
          name: 'foo',
          version: '1.2.3',
          dependencies: {
            '@company/bar': 'workspace:*',
          },
        }),
      },
      bar: {
        'package.json': JSON.stringify({
          name: '@company/bar',
          version: '1.2.3',
          devDependencies: {
            '@company/bar': 'workspace:*',
          },
        }),
        thisisignored: {
          'package.json': JSON.stringify({
            name: 'not a workspace!',
            description: 'because it is contained in one',
          }),
        },
      },
      noname: {
        'package.json': JSON.stringify({}),
      },
    },
  })
  t.chdir(dir)
  unload()
  const m = Monorepo.load(dir)
  t.equal(m.size, 3)
  t.equal(m.get('foo'), m.get('src/foo'))
  t.equal(m.get('@company/bar'), m.get('src/bar'))
  t.strictSame(
    new Set([...m.keys()]),
    new Set([
      'src/foo',
      'foo',
      'src/bar',
      '@company/bar',
      'src/noname',
      'noname',
    ]),
  )

  t.strictSame(
    new Set([...m.paths()]),
    new Set(['src/foo', 'src/bar', 'src/noname']),
  )

  t.strictSame(
    new Set([...m.names()]),
    new Set([
      'foo',
      '@company/bar',
      // name is the directory name if not set in manifest
      'noname',
    ]),
  )
  t.equal(
    m.get('@company/bar'),
    m.get('src/bar'),
    'same object both keys',
  )
  t.strictSame(m.group('packages'), new Set([...m.values()]))
  t.equal(m.group('unknown'), undefined)

  t.match(
    new Set([...m.values()]),
    new Set([
      { name: 'foo' },
      { name: '@company/bar' },
      { name: 'noname' },
    ]),
  )

  const walkOrder: string[] = []
  m.runSync(ws => walkOrder.push(ws.path))
  t.strictSame(walkOrder, ['src/noname', 'src/bar', 'src/foo'])

  t.throws(() => new Monorepo(dir).runSync(() => {}), {
    message: 'No workspaces loaded',
  })
  await t.rejects(
    new Monorepo(dir).run(() => {}),
    {
      message: 'No workspaces loaded',
    },
  )
  for (const ws of m.values()) {
    t.equal(m.get(ws.fullpath), ws)
    t.equal(m.get(ws.path), ws)
    t.equal(m.get(ws.name), ws)
  }
  await t.resolveMatch(
    m.run(ws => ws.name),
    new Map([
      [{ name: 'foo' }, 'foo'],
      [{ name: '@company/bar' }, '@company/bar'],
      [{ name: 'noname' }, 'noname'],
    ]),
  )

  // filters a single workspace
  const singleResult: string[] = []
  for (const ws of m.filter({ workspace: ['foo'] })) {
    singleResult.push(ws.name)
  }
  t.strictSame(
    singleResult,
    ['foo'],
    'should return the selected workspace',
  )

  // filters a single workspace using leading dot relative path notation
  const dottedResult: string[] = []
  for (const ws of m.filter({ workspace: ['./src/foo'] })) {
    dottedResult.push(ws.name)
  }
  t.strictSame(
    dottedResult,
    ['foo'],
    'should return the selected workspace from a dot relative path',
  )

  // filters multiple workspaces
  const multiResult: string[] = []
  for (const ws of m.filter({
    workspace: ['src/foo', resolve(dir, 'src/bar')],
  })) {
    multiResult.push(ws.name)
  }
  t.strictSame(
    multiResult,
    ['@company/bar', 'foo'],
    'should return the selected workspaces',
  )

  // filters a single workspace using a matching glob pattern
  const singleGlobResult: string[] = []
  for (const ws of m.filter({ workspace: ['./*/foo'] })) {
    singleGlobResult.push(ws.name)
  }
  t.strictSame(
    singleGlobResult,
    ['foo'],
    'should return the selected workspace from a glob pattern match',
  )

  // filters many workspaces using a matching glob pattern
  const globResult: string[] = []
  for (const ws of m.filter({ workspace: ['./src/*'] })) {
    globResult.push(ws.name)
  }
  t.strictSame(
    globResult,
    ['noname', '@company/bar', 'foo'],
    'should return the selected workspace from a glob pattern match',
  )

  // filters many workspaces using a matching glob pattern
  const otherGlobResult: string[] = []
  for (const ws of m.filter({ workspace: ['./**'] })) {
    otherGlobResult.push(ws.name)
  }
  t.strictSame(
    otherGlobResult,
    ['noname', '@company/bar', 'foo'],
    'should return the selected workspace from a glob pattern match',
  )
})

t.test('cyclic intra-project ws deps are handled', async t => {
  // TODO: there needs to be some kind of process logging that
  // goes into Monorepo.onCycle, but for now just load a cyclic
  // monorepo and verify with coverage.
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: {
        utils: 'utils/*',
        // use ** so that we exercise the 'remove child ws' path
        apps: ['app/bar/*', 'app/*'],
      },
    }),
    utils: {
      // this if course still an actual problem for the app 😅
      // but vlt can't know whether it's actually an issue,
      // and there are reasonable use cases for cyclic deps.
      'is-even': {
        'package.json': JSON.stringify({
          name: 'is-even',
          version: '1.2.3',
          dependencies: {
            'is-odd': 'workspace:*',
          },
        }),
        'index.js': `import { isOdd } from 'is-odd'
export const isEven = (n) => !isOdd(n)
`,
      },
      'is-odd': {
        'package.json': JSON.stringify({
          name: 'is-odd',
          version: '1.2.3',
          dependencies: {
            'is-even': 'workspace:*',
          },
        }),
        'index.js': `import { isEven } from 'is-even'
export const isOdd = (n) => !isEven(n)
`,
      },
    },
    app: {
      foo: {
        'package.json': JSON.stringify({
          name: 'foo',
          version: '1.2.3',
          dependencies: {
            '@company/bar': 'workspace:*',
          },
        }),
      },
      bar: {
        'package.json': JSON.stringify({
          name: '@company/bar',
          version: '1.2.3',
          devDependencies: {
            '@company/bar': 'workspace:*',
          },
        }),
        thisisignored: {
          'package.json': JSON.stringify({
            name: 'not a workspace!',
            description: 'because it is contained in one',
          }),
        },
        badjson: {
          'package.json': 'hello, this is not a manifest',
        },
      },
      noname: {
        'package.json': JSON.stringify({}),
      },
    },
  })
  t.chdir(dir)
  unload()

  const m = new Monorepo(dir, {
    load: { groups: 'utils', paths: './{utils,app}/**' },
  })
  const seen: string[] = []
  let sawMissingDep = false
  const r = await m.run(
    (ws, signal, depRes: DepResults<Workspace, Workspace>) => {
      t.type(signal, AbortSignal, 'got an AbortSignal')
      if (seen.includes(ws.name)) {
        throw new Error('dep visited more than one time')
      }
      seen.push(ws.name)
      const depName = ws.name === 'is-even' ? 'is-odd' : 'is-even'
      const dep = m.get(depName)
      if (!dep) throw new Error('dep not loaded??')
      const res = depRes.get(dep)
      if (!res) sawMissingDep = true
      return ws
    },
  )
  t.equal(sawMissingDep, true, 'saw missing dep')
  t.strictSame(
    r,
    new Map([
      [m.get('utils/is-even'), m.get('is-even')],
      [m.get('utils/is-odd'), m.get('is-odd')],
    ]),
  )
  t.strictSame(
    new Set([...m]),
    new Set([m.get('utils/is-even'), m.get('utils/is-odd')]),
  )
  const asyncWalk: Workspace[] = []
  for await (const ws of m) {
    asyncWalk.push(ws)
  }
  t.strictSame(
    new Set(asyncWalk),
    new Set([m.get('utils/is-even'), m.get('utils/is-odd')]),
  )

  // force a full load, even if it wasn't in the initial filter
  // useful in cases where we need to build internal deps first
  const n = new Monorepo(dir, {
    load: {
      paths: [
        'utils/is-odd',
        'app/bar/thisisignored',
        '.',
        'app/bar/**',
      ],
      groups: ['utils'],
    },
  })
  t.equal(n.get('utils/is-even'), undefined)
  t.equal(n.get('app/bar/thisisignored'), undefined)
  t.equal(n.get(''), undefined)
  t.strictSame(n.getDeps(n.get('utils/is-odd')!), [])
  n.runSync(() => {}, true)
  t.strictSame(
    [...n.paths()],
    [
      'utils/is-odd',
      'utils/is-even',
      'app/noname',
      'app/foo',
      'app/bar',
    ],
  )

  const o = new Monorepo(dir, { load: {} })

  // filters single group
  const singleResult: string[] = []
  for (const ws of o.filter({ 'workspace-group': ['utils'] })) {
    singleResult.push(ws.name)
  }
  t.strictSame(
    singleResult,
    ['is-even', 'is-odd'],
    'should return the group workspaces',
  )

  // filters multiple groups
  const multiResult: string[] = []
  for (const ws of o.filter({
    'workspace-group': ['utils', 'apps'],
  })) {
    multiResult.push(ws.name)
  }
  t.strictSame(
    multiResult,
    ['is-even', 'is-odd', 'noname', '@company/bar', 'foo'],
    'should return the group workspaces',
  )

  t.end()
})

t.test('iterating empty monorepo is no-op', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'utils' }),
  })
  t.chdir(dir)
  unload()

  const m = new Monorepo(dir)
  for (const _ of m) {
    t.fail('should not iterate over anything')
  }
  for await (const _ of m) {
    t.fail('should not iterate over anything (async)')
  }
  if (t.passing()) {
    t.pass('good')
  }
  m.load({ paths: 'some/path/that/does/not/exist' })
  t.equal(m.size, 0)
})

t.test('force a full load, but still not found', t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
    src: {
      ws: {
        'package.json': JSON.stringify({
          optionalDependencies: {
            // two missing to exercise "only force load once" path
            x: 'workspace:*',
            y: 'workspace:*',
          },
        }),
      },
    },
  })
  t.chdir(dir)
  unload()
  const m = Monorepo.maybeLoad(dir)
  if (!m) throw new Error('failed to maybeLoad')
  t.strictSame(m.getDeps(m.get('src/ws')!), [])
  t.strictSame(m.getDeps(m.get('src/ws')!, true), [])
  t.end()
})

t.test('various asWSConfig failures', async t => {
  t.throws(() => asWSConfig(null), {
    message: 'Invalid workspace definition',
  })
  t.throws(() => asWSConfig({ a: 1 }), {
    message: 'Invalid workspace definition',
  })
  t.throws(() => asWSConfig({ a: [1] }), {
    message: 'Invalid workspace definition',
  })
  t.throws(() => asWSConfig([1]), {
    message: 'Invalid workspace definition',
  })
  t.strictSame(asWSConfig(['a']), {
    packages: ['a'],
  })
})

t.test(
  'maybeLoad in a folder with no workspaces, no load',
  async t => {
    const dir = t.testdir({ 'vlt.json': JSON.stringify({}) })
    t.chdir(dir)
    unload()
    const m = Monorepo.maybeLoad(dir)
    t.equal(m, undefined)
    const mm = new Monorepo(dir)
    t.strictSame(mm.load().config, {})
  },
)

t.test('syntax error in workspace package.json throws', t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: { packages: ['./src/*'] },
    }),
    src: {
      valid: {
        'package.json': JSON.stringify({
          name: 'valid',
          version: '1.0.0',
        }),
      },
      invalid: {
        // Missing comma - intentional JSON syntax error
        'package.json': '{ "name": "invalid" "version": "1.0.0" }',
      },
    },
  })
  t.chdir(dir)
  unload()

  t.throws(() => Monorepo.load(dir), {
    message: /Failed to parse package\.json in workspace/,
  })

  t.end()
})

t.test('duplicate workspace names are not allowed', t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: { packages: ['./src/*'] },
    }),
    src: {
      foo: {
        'package.json': JSON.stringify({
          name: 'foo',
          version: '1.2.3',
        }),
      },
      foo1: {
        'package.json': JSON.stringify({
          name: 'foo', // Same name as foo
          version: '1.2.3',
        }),
      },
    },
  })
  t.chdir(dir)
  unload()

  t.throws(() => Monorepo.load(dir), {
    message: 'Duplicate workspace name found',
    cause: {
      name: 'foo',
      wanted: resolve(dir, 'src/foo'),
      found: resolve(dir, 'src/foo1'),
    },
  })

  t.end()
})

// NOTE: every fixture below needs a `.git` entry. Without it,
// @vltpkg/vlt-json's find() walks up out of the tap fixture dir and
// lands on this repo's own vlt.json, so `load('workspaces')` would
// return vltpkg's workspaces and the package.json fallback would never
// be exercised.
const pkg = (name: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ name, version: '1.0.0', ...extra })

t.test('splitNegatedPatterns', t => {
  t.strictSame(splitNegatedPatterns(['a/*']), {
    patterns: ['a/*'],
    ignore: [],
  })
  t.strictSame(splitNegatedPatterns(['a/*', '!a/b']), {
    patterns: ['a/*'],
    ignore: ['a/b'],
  })
  t.strictSame(
    splitNegatedPatterns(['!!a/*']),
    { patterns: ['a/*'], ignore: [] },
    'even number of ! is a positive pattern',
  )
  t.strictSame(
    splitNegatedPatterns(['./a/*', '/b/*']),
    { patterns: ['a/*', 'b/*'], ignore: [] },
    'leading ./ and / are stripped',
  )
  t.strictSame(
    splitNegatedPatterns(['a/**', '!a/b/**', 'a/b/c']),
    { patterns: ['a/**', 'a/b/c'], ignore: [] },
    'a later positive pattern un-negates an earlier negation',
  )
  t.strictSame(splitNegatedPatterns(['!a']), {
    patterns: [],
    ignore: ['a'],
  })
  t.end()
})

t.test('asManifestWSConfig', t => {
  const p = '/x/package.json'
  t.strictSame(asManifestWSConfig(['p/*'], p), { packages: ['p/*'] })
  t.strictSame(asManifestWSConfig('p/*', p), { packages: ['p/*'] })
  t.strictSame(asManifestWSConfig({ packages: ['p/*'] }, p), {
    packages: ['p/*'],
  })
  t.strictSame(asManifestWSConfig({ packages: 'p/*' }, p), {
    packages: ['p/*'],
  })
  t.strictSame(
    asManifestWSConfig({ packages: ['p/*'], nohoist: ['**/x'] }, p),
    { packages: ['p/*'] },
    'yarn-classic nohoist is parsed and ignored',
  )
  t.strictSame(
    asManifestWSConfig({ nohoist: ['**/x'] }, p),
    {},
    'nohoist alone declares no workspaces',
  )
  t.throws(
    () => asManifestWSConfig({ apps: ['a/*'] }, p),
    { message: /Named workspace groups are not supported/ },
    'vlt named groups are rejected in package.json',
  )
  t.throws(
    () => asManifestWSConfig({ packages: ['a'], apps: [] }, p),
    {
      message: /Named workspace groups are not supported/,
    },
  )
  t.throws(() => asManifestWSConfig(null, p), {
    message: /Invalid workspace definition/,
  })
  t.throws(() => asManifestWSConfig({ packages: 1 }, p), {
    message: /Invalid workspace definition/,
  })
  t.end()
})

t.test('package.json array form, no vlt.json', async t => {
  const dir = t.testdir({
    '.git': {},
    'package.json': JSON.stringify({
      name: 'root',
      private: true,
      workspaces: ['packages/*'],
    }),
    packages: {
      a: {
        'package.json': pkg('a', { dependencies: { b: '^1.0.0' } }),
      },
      b: { 'package.json': pkg('b') },
    },
  })
  t.chdir(dir)
  unload()
  const m = Monorepo.maybeLoad(dir)
  t.ok(m, 'an npm monorepo is recognized as a monorepo')
  t.equal(m?.size, 2)
  t.strictSame(new Set([...(m?.names() ?? [])]), new Set(['a', 'b']))
})

t.test('package.json {packages} and bare string forms', async t => {
  for (const [name, workspaces] of [
    ['yarn-classic object', { packages: ['packages/*'] }],
    ['bare string', 'packages/*'],
  ] as const) {
    t.test(name, async t => {
      const dir = t.testdir({
        '.git': {},
        'package.json': JSON.stringify({ name: 'root', workspaces }),
        packages: {
          a: { 'package.json': pkg('a') },
          b: { 'package.json': pkg('b') },
        },
      })
      t.chdir(dir)
      unload()
      t.equal(Monorepo.maybeLoad(dir)?.size, 2)
    })
  }
})

t.test('vlt.json wins over package.json', async t => {
  const dir = t.testdir({
    '.git': {},
    'vlt.json': JSON.stringify({ workspaces: ['apps/*'] }),
    'package.json': JSON.stringify({
      name: 'root',
      workspaces: ['packages/*'],
    }),
    apps: { web: { 'package.json': pkg('web') } },
    packages: { a: { 'package.json': pkg('a') } },
  })
  t.chdir(dir)
  unload()
  const m = Monorepo.maybeLoad(dir)
  t.strictSame(new Set([...(m?.names() ?? [])]), new Set(['web']))
  t.equal(resolveWSConfig(dir).source, 'vlt.json')
})

t.test(
  'vlt.json without a workspaces field falls through',
  async t => {
    const dir = t.testdir({
      '.git': {},
      'vlt.json': JSON.stringify({ config: { registry: 'x' } }),
      'package.json': JSON.stringify({
        name: 'root',
        workspaces: ['packages/*'],
      }),
      packages: { a: { 'package.json': pkg('a') } },
    })
    t.chdir(dir)
    unload()
    t.equal(Monorepo.maybeLoad(dir)?.size, 1)
    t.equal(resolveWSConfig(dir).source, 'package.json')
  },
)

t.test('not a monorepo', async t => {
  await t.test('root package.json has no workspaces', async t => {
    const dir = t.testdir({
      '.git': {},
      'package.json': pkg('solo'),
    })
    t.chdir(dir)
    unload()
    t.equal(Monorepo.maybeLoad(dir), undefined)
    t.strictSame(resolveWSConfig(dir), { config: {} })
  })

  await t.test('root package.json is unreadable', async t => {
    const dir = t.testdir({
      '.git': {},
      'package.json': '{ not json',
    })
    t.chdir(dir)
    unload()
    t.equal(Monorepo.maybeLoad(dir), undefined)
  })
})

t.test('maybeLoad honors a supplied config', async t => {
  const dir = t.testdir({
    '.git': {},
    'package.json': pkg('solo'),
    packages: { a: { 'package.json': pkg('a') } },
  })
  t.chdir(dir)
  unload()
  const m = Monorepo.maybeLoad(dir, {
    config: { packages: ['packages/*'] },
    load: {},
  })
  t.equal(m?.size, 1, 'short-circuits both files')
})

t.test('negation', async t => {
  const tree = {
    '.git': {},
    packages: {
      a: { 'package.json': pkg('a') },
      legacy: {
        'package.json': pkg('legacy'),
        inner: { 'package.json': pkg('inner') },
      },
    },
  }

  await t.test('declared in the root manifest', async t => {
    const dir = t.testdir({
      ...tree,
      'package.json': JSON.stringify({
        name: 'root',
        workspaces: ['packages/*', '!packages/legacy'],
      }),
    })
    t.chdir(dir)
    unload()
    t.strictSame(
      new Set([...(Monorepo.maybeLoad(dir)?.names() ?? [])]),
      new Set(['a']),
    )
  })

  await t.test('from vlt.json', async t => {
    const dir = t.testdir({
      ...tree,
      'vlt.json': JSON.stringify({
        workspaces: { apps: ['packages/*', '!packages/legacy'] },
      }),
    })
    t.chdir(dir)
    unload()
    t.strictSame(
      new Set([...(Monorepo.maybeLoad(dir)?.names() ?? [])]),
      new Set(['a']),
    )
  })

  await t.test('bare negation still walks into the dir', async t => {
    const dir = t.testdir({
      ...tree,
      'vlt.json': JSON.stringify({
        workspaces: ['packages/**', '!packages/legacy'],
      }),
    })
    t.chdir(dir)
    unload()
    t.strictSame(
      new Set([...(Monorepo.maybeLoad(dir)?.names() ?? [])]),
      new Set(['a', 'inner']),
      'packages/legacy is excluded but its children are still found',
    )
  })

  await t.test('/** negation prunes the subtree', async t => {
    const dir = t.testdir({
      ...tree,
      'vlt.json': JSON.stringify({
        workspaces: ['packages/**', '!packages/legacy/**'],
      }),
    })
    t.chdir(dir)
    unload()
    t.strictSame(
      new Set([...(Monorepo.maybeLoad(dir)?.names() ?? [])]),
      new Set(['a']),
    )
  })

  await t.test(
    'all-negative pattern list matches nothing',
    async t => {
      const dir = t.testdir({
        ...tree,
        'vlt.json': JSON.stringify({ workspaces: ['!packages/a'] }),
      })
      t.chdir(dir)
      unload()
      t.equal(Monorepo.maybeLoad(dir)?.size, 0)
    },
  )

  await t.test('negation in the workspace path filter', async t => {
    const dir = t.testdir({
      ...tree,
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
    })
    t.chdir(dir)
    unload()
    const m = Monorepo.load(dir, {
      load: { paths: ['packages/*', '!packages/a'] },
    })
    t.strictSame(
      new Set([...m.names()]),
      new Set(['legacy']),
      '-w packages/* -w !packages/a excludes a',
    )

    // a filter of *only* negations has no positive pattern to match,
    // so it selects nothing -- the same as any other non-matching -w
    const none = Monorepo.load(dir, {
      load: { paths: ['!packages/a'] },
    })
    t.equal(none.size, 0)
  })
})

t.test('getDeps follows bare semver workspace deps', async t => {
  const dir = t.testdir({
    '.git': {},
    'package.json': JSON.stringify({
      name: 'root',
      workspaces: ['packages/*'],
    }),
    packages: {
      a: {
        'package.json': pkg('a', {
          dependencies: {
            b: '^1.0.0',
            // not a local workspace: aliases a different package
            c: 'npm:other@1',
            d: 'file:../elsewhere',
          },
        }),
      },
      b: { 'package.json': pkg('b') },
      c: { 'package.json': pkg('c') },
      d: { 'package.json': pkg('d') },
    },
  })
  t.chdir(dir)
  unload()
  const m = Monorepo.load(dir)
  const a = m.get('a')
  t.ok(a)
  t.strictSame(
    m.getDeps(a!).map(w => w.name),
    ['b'],
    'bare semver links, other protocols do not',
  )
  // b must be visited before a
  const order = [...m].map(w => w.name)
  t.ok(
    order.indexOf('b') < order.indexOf('a'),
    'topological order respects the bare semver dep',
  )
})

t.test(
  'a workspace path matching a dep name is not a dep',
  async t => {
    const dir = t.testdir({
      '.git': {},
      'package.json': JSON.stringify({
        name: 'root',
        workspaces: ['packages/*'],
      }),
      packages: {
        // path is `packages/thing`, package name is `renamed`
        thing: { 'package.json': pkg('renamed') },
        a: {
          'package.json': pkg('a', {
            dependencies: { 'packages/thing': '^1.0.0' },
          }),
        },
      },
    })
    t.chdir(dir)
    unload()
    const m = Monorepo.load(dir)
    t.strictSame(m.getDeps(m.get('a')!), [], 'matched by name only')
  },
)
