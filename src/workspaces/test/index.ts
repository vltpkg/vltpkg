import { mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { DepResults } from 'graph-run'
import t from 'tap'
import {
  assertWSConfig,
  asWSConfig,
  Monorepo,
  Workspace,
} from '../src/index.js'

t.test('load some workspaces', t => {
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify({
      packages: ['./src/*'],
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
  const m = Monorepo.load(dir)
  //console.error([...m.keys()])
  t.strictSame(
    new Set([...m.keys()]),
    new Set([
      'src/foo',
      'foo',
      'src/bar',
      '@company/bar',
      'src/noname',
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
      // name is path if not set in manifest
      'src/noname',
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
      // name is path if not set in manifest
      { name: 'src/noname' },
    ]),
  )

  const walkOrder: string[] = []
  m.runSync(ws => walkOrder.push(ws.path))
  t.strictSame(walkOrder, ['src/noname', 'src/bar', 'src/foo'])

  t.throws(() => new Monorepo(dir).runSync(() => {}), {
    message: 'No workspaces loaded',
  })
  t.rejects(
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
  t.resolveMatch(
    m.run(ws => ws.name),
    new Map([
      [{ name: 'foo' }, 'foo'],
      [{ name: '@company/bar' }, '@company/bar'],
      [{ name: 'src/noname' }, 'src/noname'],
    ]),
  )
  t.end()
})

t.test('cyclic intra-project ws deps are handled', async t => {
  // TODO: there needs to be some kind of process logging that
  // goes into Monorepo.onCycle, but for now just load a cyclic
  // monorepo and verify with coverage.
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify({
      utils: 'utils/*',
      // use ** so that we exercise the 'remove child ws' path
      apps: ['app/bar/*', 'app/*'],
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
      if (!res) {
        t.equal(
          sawMissingDep,
          false,
          'should not see missing dep >1 time',
        )
        sawMissingDep = true
      }
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
    [...m],
    [m.get('utils/is-even'), m.get('utils/is-odd')],
  )
  const asyncWalk: Workspace[] = []
  for await (const ws of m) {
    asyncWalk.push(ws)
  }
  t.strictSame(asyncWalk, [
    m.get('utils/is-even'),
    m.get('utils/is-odd'),
  ])

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
  t.strictSame(n.getDeps(n.get('utils/is-odd') as Workspace), [])
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
  t.end()
})

t.test('missing/invalid vlt-workspaces.json file', t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'just a package',
      version: 'nomono',
    }),
  })
  const m = new Monorepo(dir)
  t.equal(Monorepo.maybeLoad(m.cwd), undefined)
  t.throws(() => m.load(), {
    message: 'Not in a monorepo, no vlt-workspaces.json found',
  })

  mkdirSync(dir + '/vlt-workspaces.json')
  t.equal(Monorepo.maybeLoad(m.cwd), undefined)
  t.throws(() => m.load(), {
    message: 'Not in a monorepo, no vlt-workspaces.json found',
  })

  rmdirSync(dir + '/vlt-workspaces.json')

  writeFileSync(dir + '/vlt-workspaces.json', 'hello, world')
  t.throws(() => Monorepo.maybeLoad(m.cwd), {
    message: 'Invalid vlt-workspaces.json file',
  })
  t.throws(() => m.load(), {
    message: 'Invalid vlt-workspaces.json file',
  })
  writeFileSync(
    dir + '/vlt-workspaces.json',
    JSON.stringify({
      hello: { world: true },
    }),
  )
  t.throws(() => Monorepo.maybeLoad(m.cwd), {
    message: 'Invalid workspace definition',
    cause: {
      path: dir,
      found: { world: true },
      wanted: 'string',
    },
  })
  t.throws(() => m.load(), {
    message: 'Invalid workspace definition',
    cause: {
      path: dir,
      found: { world: true },
      wanted: 'string',
    },
  })
  // other type assertions
  t.throws(() => assertWSConfig(123))
  t.throws(() => assertWSConfig([1, 2, 3]))
  t.throws(() => assertWSConfig(true))
  t.throws(() => assertWSConfig(undefined))
  t.throws(() => assertWSConfig({ hello: ['world', true] }), {
    cause: {
      name: 'hello',
      found: true,
      wanted: 'string',
    },
  })
  assertWSConfig(['src/x', 'src/y'])
  t.strictSame(asWSConfig('hello'), { packages: ['hello'] })
  t.strictSame(asWSConfig(['hello']), { packages: ['hello'] })
  t.end()
})

t.test('iterating empty monorepo is no-op', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify('utils'),
  })

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
    'vlt-workspaces.json': JSON.stringify('src/*'),
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
  const m = new Monorepo(dir).load()
  t.strictSame(m.getDeps(m.get('src/ws') as Workspace), [])
  t.strictSame(m.getDeps(m.get('src/ws') as Workspace, true), [])
  t.end()
})
