import { mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { type DepResults } from 'graph-run'
import t from 'tap'
import {
  assertWSConfig,
  asWSConfig,
  Monorepo,
  type Workspace,
} from '../src/index.ts'
import { resolve } from 'node:path'

t.test('load some workspaces', async t => {
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
  t.equal(m.size, 3)
  t.equal(m.get('foo'), m.get('src/foo'))
  t.equal(m.get('@company/bar'), m.get('src/bar'))
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
      [{ name: 'src/noname' }, 'src/noname'],
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
    ['src/noname', '@company/bar', 'foo'],
    'should return the selected workspace from a glob pattern match',
  )

  // filters many workspaces using a matching glob pattern
  const otherGlobResult: string[] = []
  for (const ws of m.filter({ workspace: ['./**'] })) {
    otherGlobResult.push(ws.name)
  }
  t.strictSame(
    otherGlobResult,
    ['src/noname', '@company/bar', 'foo'],
    'should return the selected workspace from a glob pattern match',
  )
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
    ['is-even', 'is-odd', 'app/noname', '@company/bar', 'foo'],
    'should return the group workspaces',
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
  t.equal(Monorepo.maybeLoad(m.projectRoot), undefined)
  t.throws(() => m.load(), {
    message: 'Not in a monorepo, no vlt-workspaces.json found',
  })

  mkdirSync(dir + '/vlt-workspaces.json')
  t.equal(Monorepo.maybeLoad(m.projectRoot), undefined)
  t.throws(() => m.load(), {
    message: 'Not in a monorepo, no vlt-workspaces.json found',
  })

  rmdirSync(dir + '/vlt-workspaces.json')

  writeFileSync(dir + '/vlt-workspaces.json', 'hello, world')
  t.throws(() => Monorepo.maybeLoad(m.projectRoot), {
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
  t.throws(() => Monorepo.maybeLoad(m.projectRoot), {
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
  t.strictSame(m.getDeps(m.get('src/ws')!), [])
  t.strictSame(m.getDeps(m.get('src/ws')!, true), [])
  t.end()
})
