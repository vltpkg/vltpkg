import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { BuildCommandResult } from '../../src/commands/build.ts'
import type { EditQueryOptions } from '../../src/skills-prompt.ts'
import type { BuildResult, Node } from '@vltpkg/graph'

let buildCalled = false
let buildOptions: any = null
let mockError: Error | null = null

// scripted prompts and recorded side effects
type State = {
  tty: boolean
  confirms: (boolean | undefined)[]
  answers: (string | undefined)[]
  questions: string[]
  editors: Pick<EditQueryOptions, 'key' | 'current' | 'prefill'>[]
  writes: [string, unknown][]
  asserts: unknown[][]
  invalid: string[]
  built: string[]
}
let st: State

// Reset state before each test
t.beforeEach(() => {
  buildCalled = false
  buildOptions = null
  mockError = null
  st = {
    tty: false,
    confirms: [],
    answers: [],
    questions: [],
    editors: [],
    writes: [],
    asserts: [],
    invalid: [],
    built: [],
  }
})

const Command = await t.mockImport<
  typeof import('../../src/commands/build.ts')
>('../../src/commands/build.ts', {
  '@vltpkg/graph': {
    assertQuery: async (...args: unknown[]) => {
      st.asserts.push(args)
      if (st.invalid.includes(args[0] as string)) {
        throw new Error(`bad query ${String(args[0])}`)
      }
    },
    build: async (options: any) => {
      buildCalled = true
      buildOptions = options
      st.built.push(options.target)
      if (mockError) throw mockError
      return { success: [], failure: [] }
    },
  },
  '../../src/skills-prompt.ts': {
    interactive: () => st.tty,
    confirm: async (q: string) => {
      st.questions.push(q)
      return st.confirms.length ? st.confirms.shift() : false
    },
    editQuery: async ({ check, ...o }: EditQueryOptions) => {
      st.editors.push(o)
      const a = st.answers.shift()
      if (a !== undefined) await check(a)
      return a
    },
  },
})

const makeTestConfig = (
  options = {},
  values: Record<string, unknown> = {},
  positionals: string[] = [],
  {
    explicit = {},
    layers = {},
  }: {
    explicit?: Record<string, unknown>
    layers?: Record<string, unknown>
  } = {},
): LoadedConfig =>
  ({
    projectRoot: '/test/project',
    options: {
      packageJson: {},
      monorepo: null,
      scurry: {
        cwd: {
          resolve: (path: string) => ({ fullpath: () => path }),
        },
        lstat: async (path: string) => ({
          isDirectory: () => true,
          fullpath: () => path,
        }),
      },
      ...options,
    },
    values,
    positionals,
    explicit,
    layers,
    get: (key: string) => values[key],
    addConfigToFile: async (which: string, v: unknown) => {
      st.writes.push([which, v])
    },
  }) as unknown as LoadedConfig

t.test('usage', async t => {
  t.matchSnapshot(
    Command.usage().usage(),
    'should return usage information',
  )
})

t.test('views', async t => {
  const mockResult = {
    success: [
      { id: 'node1', name: 'package1', version: '1.0.0' },
      { id: 'node2', name: 'package2', version: '2.0.0' },
    ],
    failure: [],
  } as any

  t.test('human view - build', async t => {
    const output = Command.views.human(mockResult)
    t.matchSnapshot(
      output,
      'should return human-readable success message for build',
    )
  })

  t.test('json view - build', async t => {
    const output = Command.views.json(mockResult)
    t.matchSnapshot(
      output,
      'should return json success object for build',
    )
  })

  t.test('human view - with failures', async t => {
    const resultWithFailures = {
      success: [{ id: 'node1', name: 'package1', version: '1.0.0' }],
      failure: [
        { id: 'node2', name: 'optional-pkg', version: '1.0.0' },
      ],
    } as any
    const output = Command.views.human(resultWithFailures)
    t.matchSnapshot(
      output,
      'should show both success and failure messages',
    )
  })

  t.test('json view - with failures', async t => {
    const resultWithFailures = {
      success: [{ id: 'node1', name: 'package1', version: '1.0.0' }],
      failure: [
        { id: 'node2', name: 'optional-pkg', version: '1.0.0' },
      ],
    } as any
    const output = Command.views.json(resultWithFailures)
    t.matchSnapshot(
      output,
      'should show both success and failure json message',
    )
  })

  t.test('human view - no packages built', async t => {
    const emptyResult = { success: [], failure: [] } as any
    const output = Command.views.human(emptyResult)
    t.matchSnapshot(output, 'should show no packages message')
  })

  t.test('skipped for missing security data', async t => {
    const node = (name: string) =>
      ({
        id: `··${name}@1.0.0`,
        name,
        version: '1.0.0',
      }) as unknown as Node
    t.equal(
      Command.views.human({
        success: [],
        failure: [],
        skipped: [node('a'), node('b')],
        skippedReason: 'timeout',
      }),
      '⏳ 2 packages not built, security data timed out. Run "vlt build" again later.',
      'should not claim all built',
    )
    t.equal(
      Command.views.human({
        success: [],
        failure: [],
        skipped: [node('a'), node('b')],
        skippedReason: 'unscanned',
      }),
      '⏳ 2 packages not built, Socket has not scanned them yet. Run "vlt build" again later.',
      'should explain pkgs not scanned yet',
    )
    t.equal(
      Command.views.human({
        success: [node('a')],
        failure: [],
        skipped: [node('b')],
        skippedReason: 'timeout',
      }),
      '🔨 Built 1 package successfully.\n' +
        '⏳ 1 package not built, security data timed out. Run "vlt build" again later.',
      'should list built and skipped',
    )
    t.strictSame(
      Command.views.json({
        success: [],
        failure: [],
        skipped: [node('a')],
        skippedReason: 'timeout',
      }),
      {
        success: [],
        failure: [],
        skipped: [{ id: '··a@1.0.0', name: 'a', version: '1.0.0' }],
        skippedReason: 'timeout',
        message:
          '1 package not built, security data timed out. Run "vlt build" again later.',
      },
      'should list skipped in json',
    )
    t.strictSame(
      Command.views.json({
        success: [],
        failure: [],
        skipped: [node('a')],
        skippedReason: 'unscanned',
      }),
      {
        success: [],
        failure: [],
        skipped: [{ id: '··a@1.0.0', name: 'a', version: '1.0.0' }],
        skippedReason: 'unscanned',
        message:
          '1 package not built, Socket has not scanned them yet. Run "vlt build" again later.',
      },
      'should list unscanned in json',
    )
  })
})

t.test('command execution', async t => {
  t.test('successful build', async t => {
    const config = makeTestConfig({
      packageJson: { name: 'test-package' },
      monorepo: { name: 'test-mono' },
      scurry: { name: 'test-scurry' },
    })

    const result = await Command.command(config)

    t.ok(buildCalled, 'should call build function')
    t.ok(result, 'should return result object')
    t.ok('success' in result, 'should have success array')
    t.ok('failure' in result, 'should have failure array')
    t.strictSame(
      buildOptions,
      {
        packageJson: { name: 'test-package' },
        monorepo: { name: 'test-mono' },
        scurry: { name: 'test-scurry' },
        projectRoot: '/test/project',
        target: ':scripts:not(:built):not(:malware)',
      },
      'should pass correct options to build function',
    )

    // Test views with the actual result
    t.matchSnapshot(
      Command.views.human(result),
      'should format human output for successful build',
    )
    t.matchSnapshot(
      Command.views.json(result),
      'should format json output for successful build',
    )
  })

  t.test('build fails with GRAPHRUN_TRAVERSAL error', async t => {
    const mockNode = {
      name: 'failing-package',
      version: '1.2.3',
    } as Node

    const graphRunError = Object.assign(
      new Error('Graph traversal failed'),
      {
        code: 'GRAPHRUN_TRAVERSAL',
        node: mockNode,
        cause: new Error('Inner error'),
      },
    )

    const buildError = Object.assign(
      new Error('Build process failed'),
      {
        cause: graphRunError,
      },
    )

    mockError = buildError

    const config = makeTestConfig()

    await t.rejects(
      Command.command(config),
      {
        message:
          'Build failed:\n  Failed to build package: failing-package@1.2.3',
        cause: {
          cause: buildError,
        },
      },
      'should throw error with specific package information',
    )
  })

  t.test('build fails with generic error', async t => {
    const buildError = new Error('Generic build failure')
    mockError = buildError

    const config = makeTestConfig()

    await t.rejects(
      Command.command(config),
      {
        message: 'Build failed',
        cause: {
          cause: buildError,
        },
      },
      'should throw generic build failed error',
    )
  })

  t.test('build fails with nested error without node', async t => {
    const innerError = Object.assign(new Error('Some other error'), {
      code: 'SOME_OTHER_ERROR',
    })

    const buildError = Object.assign(
      new Error('Build process failed'),
      {
        cause: innerError,
      },
    )

    mockError = buildError

    const config = makeTestConfig()

    await t.rejects(
      Command.command(config),
      {
        message: 'Build failed',
        cause: {
          cause: buildError,
        },
      },
      'should throw generic build failed error for non-GRAPHRUN_TRAVERSAL errors',
    )
  })

  t.test(
    'build fails with malformed GRAPHRUN_TRAVERSAL error',
    async t => {
      const graphRunError = Object.assign(
        new Error('Graph traversal failed'),
        {
          code: 'GRAPHRUN_TRAVERSAL',
          // Missing node property
        },
      )

      const buildError = Object.assign(
        new Error('Build process failed'),
        {
          cause: graphRunError,
        },
      )

      mockError = buildError

      const config = makeTestConfig()

      await t.rejects(
        Command.command(config),
        {
          message: 'Build failed',
          cause: {
            cause: buildError,
          },
        },
        'should throw generic error for malformed GRAPHRUN_TRAVERSAL error',
      )
    },
  )

  t.test('build with --target option', async t => {
    const config = makeTestConfig(
      {
        packageJson: { name: 'test-package' },
        monorepo: { name: 'test-mono' },
        scurry: { name: 'test-scurry' },
      },
      { target: '#dep1' },
    )

    const result = await Command.command(config)

    t.ok(buildCalled, 'should call build function')
    t.ok(result, 'should return result object')
    t.ok('success' in result, 'should have success array')
    t.ok('failure' in result, 'should have failure array')
    t.equal(
      buildOptions.target,
      '#dep1',
      'should pass target to build function',
    )
  })

  t.test('build with positional query', async t => {
    const config = makeTestConfig(
      {
        packageJson: { name: 'test-package' },
        monorepo: { name: 'test-mono' },
        scurry: { name: 'test-scurry' },
      },
      {},
      ['#my-package'],
    )

    const result = await Command.command(config)

    t.ok(buildCalled, 'should call build function')
    t.ok(result, 'should return result object')
    t.ok('success' in result, 'should have success array')
    t.ok('failure' in result, 'should have failure array')
    t.equal(
      buildOptions.target,
      '#my-package',
      'should use positional as target',
    )
  })

  t.test(
    'build with --target option overrides positional',
    async t => {
      const config = makeTestConfig(
        {
          packageJson: { name: 'test-package' },
          monorepo: { name: 'test-mono' },
          scurry: { name: 'test-scurry' },
        },
        { target: '#from-option' },
        ['#from-positional'],
      )

      const result = await Command.command(config)

      t.ok(buildCalled, 'should call build function')
      t.ok(result, 'should return result object')
      t.ok('success' in result, 'should have success array')
      t.ok('failure' in result, 'should have failure array')
      t.equal(
        buildOptions.target,
        '#from-option',
        'should prefer --target option over positional',
      )
    },
  )

  t.end()
})

t.test('allow-scripts: set, save and apply', async t => {
  const D = ':scripts:not(:built):not(:malware)'
  const S = ':root > *'
  const project = { 'allow-scripts': S }
  const user = { 'allow-scripts': S }
  type RunOptions = {
    target?: string
    explicit?: string
    yes?: boolean
    config?: string
    project?: Record<string, unknown>
    user?: Record<string, unknown>
  }
  const run = (positionals: string[], o: RunOptions = {}) =>
    Command.command(
      makeTestConfig(
        {},
        { target: o.target, yes: o.yes, config: o.config },
        positionals,
        {
          explicit: o.explicit ? { 'allow-scripts': o.explicit } : {},
          layers: {
            ...(o.project && { project: o.project }),
            ...(o.user && { user: o.user }),
          },
        },
      ),
    )
  // what was built, written and asked
  const go = async (positionals: string[], o: RunOptions = {}) => {
    const res = await run(positionals, o)
    return {
      res,
      built: st.built,
      writes: st.writes,
      questions: st.questions,
      editors: st.editors,
    }
  }
  const saved = (q: string, which = 'project') => [
    [which, { 'allow-scripts': q }],
  ]
  const replaceQ = `allow-scripts is already set for this project (vlt.json): "${S}". Replace it? [y/N] `
  const editQ = `allow-scripts is set for this project (vlt.json): "${S}". Edit it? [y/N] `
  const unchanged = { action: 'unchanged' }

  t.test('1. q, nothing stored: build q, save it', async t => {
    for (const tty of [true, false]) {
      for (const yes of [true, false]) {
        st = { ...st, tty, writes: [], built: [] }
        const r = await go(['#a'], { yes })
        t.strictSame(r.built, ['#a'])
        t.strictSame(r.writes, saved('#a'))
        t.strictSame(r.questions, [])
        t.match(r.res, { query: '#a', saved: 'project' })
      }
    }
    t.strictSame(st.asserts.at(-1), ['#a', 'allow-scripts'])
    st.writes = []
    const r = await go(['#a'], { config: 'user' })
    t.strictSame(r.writes, saved('#a', 'user'), '--config=user')
    t.match(r.res, { saved: 'user' })
  })

  t.test('2. q, stored, TTY: Replace?', async t => {
    st.tty = true
    st.confirms = [false, undefined]
    for (const how of ['N', 'ctrl+C/D']) {
      t.strictSame(await run(['#a'], { project }), unchanged, how)
    }
    t.strictSame(st.built, [])
    t.strictSame(st.writes, [])
    t.strictSame(st.questions, [replaceQ, replaceQ])

    st.confirms = [true]
    st.answers = ['#b']
    const y = await go(['#a'], { project })
    t.strictSame(y.editors, [
      { key: 'allow-scripts', current: S, prefill: '#a' },
    ])
    t.strictSame(y.built, ['#b'])
    t.strictSame(y.writes, saved('#b'))
    t.equal(st.asserts.at(-1)?.[0], '#b', 'editor checks the answer')
  })

  t.test('2. q, stored, TTY: editor cancel or same', async t => {
    st.tty = true
    st.confirms = [true, true]
    st.answers = [undefined, S]
    t.strictSame(await run(['#a'], { project }), unchanged)
    const same = await go(['#a'], { project })
    t.strictSame(same.built, [S])
    t.strictSame(same.writes, [], 'same as stored: no write')
    t.notOk('saved' in same.res)
  })

  t.test('3. q, stored, -y: build q, save it', async t => {
    for (const tty of [true, false]) {
      st = { ...st, tty, writes: [], built: [] }
      const r = await go(['#a'], { project, yes: true })
      t.strictSame(r.built, ['#a'])
      t.strictSame(r.writes, saved('#a'))
      t.strictSame(r.questions, [])
    }
  })

  t.test('4. q, stored, no TTY: EUSAGE', async t => {
    await t.rejects(run(['#a'], { project }), {
      message: `allow-scripts is already set (vlt.json): "${S}"; pass -y to replace it`,
      cause: { code: 'EUSAGE', found: '#a', wanted: S },
    })
    t.strictSame(st.built, [])
    t.strictSame(st.writes, [])
  })

  t.test('5. no q, stored, TTY: Edit?', async t => {
    st.tty = true
    st.confirms = [true]
    st.answers = ['#b']
    const y = await go([], { project })
    t.strictSame(y.questions, [editQ])
    t.strictSame(y.editors, [
      { key: 'allow-scripts', current: S, prefill: S },
    ])
    t.strictSame(y.built, ['#b'])
    t.strictSame(y.writes, saved('#b'))

    st = {
      ...st,
      confirms: [false],
      writes: [],
      editors: [],
      built: [],
    }
    const n = await go([], { project })
    t.strictSame(n.built, [S])
    t.strictSame(n.writes, [])
    t.strictSame(n.editors, [])

    st = { ...st, confirms: [undefined], built: [] }
    t.strictSame(
      await run([], { project }),
      unchanged,
      'ctrl+C/D: cancel',
    )
    t.strictSame(st.built, [])
    t.strictSame(st.editors, [])
  })

  t.test('6. no q, stored, -y: build it', async t => {
    for (const tty of [true, false]) {
      st = { ...st, tty, built: [] }
      const r = await go([], { project, yes: true })
      t.strictSame(r.built, [S])
      t.strictSame(r.writes, [])
      t.strictSame(r.questions, [])
      t.match(r.res, { query: S })
      t.notOk('saved' in r.res)
    }
  })

  t.test('7. no q, stored, no TTY: build it', async t => {
    const r = await go([], { project })
    t.strictSame(r.built, [S])
    t.strictSame(r.writes, [])
  })

  t.test('8. no q, nothing stored, TTY: editor', async t => {
    st.tty = true
    st.answers = ['#b', undefined]
    const r = await go([])
    t.strictSame(r.editors, [{ key: 'allow-scripts', prefill: D }])
    t.notOk('current' in r.editors[0]!, 'nothing stored: no current')
    t.strictSame(r.built, ['#b'])
    t.strictSame(r.writes, saved('#b'))
    t.strictSame(await run([]), unchanged, 'empty: cancel')
    t.strictSame(st.built, ['#b'])
  })

  t.test(
    '9. no q, nothing stored, -y: build default, save',
    async t => {
      for (const tty of [true, false]) {
        st = { ...st, tty, writes: [], built: [] }
        const r = await go([], { yes: true })
        t.strictSame(r.built, [D])
        t.strictSame(r.writes, saved(D))
        t.strictSame(r.editors, [])
      }
    },
  )

  t.test(
    '10. no q, nothing stored, no TTY: build default, no save',
    async t => {
      const r = await go([])
      t.strictSame(r.built, [D])
      t.strictSame(r.writes, [])
      t.strictSame(r.questions, [])
      t.notOk('saved' in r.res)
    },
  )

  t.test('q equal to stored: no prompt, no write', async t => {
    st.tty = true
    const r = await go([S], { project })
    t.strictSame(r.built, [S])
    t.strictSame(r.questions, [])
    t.strictSame(r.writes, [])
  })

  t.test('stored in the user file', async t => {
    st.tty = true
    st.confirms = [false, false]
    await run(['#a'], { user })
    await run([], { user })
    t.strictSame(st.questions, [
      `allow-scripts is already set in the user vlt.json: "${S}". Replace it? [y/N] `,
      `allow-scripts is set in the user vlt.json: "${S}". Edit it? [y/N] `,
    ])
    st.tty = false
    await t.rejects(run(['#a'], { user }), {
      message: `allow-scripts is already set (user vlt.json): "${S}"; pass -y to replace it`,
    })
    const r = await go(['#a'], { user, yes: true })
    t.strictSame(r.writes, saved('#a'), 'saved to the project')
  })

  t.test('--allow-scripts or env: a given query', async t => {
    const r = await go([], { explicit: '#a' })
    t.strictSame(r.built, ['#a'])
    t.strictSame(r.writes, saved('#a'))
    await t.rejects(run([], { explicit: '#a', project }), {
      message: /pass -y to replace it/,
    })
    st.writes = []
    st.built = []
    const p = await go(['#p'], { explicit: '#a' })
    t.strictSame(p.built, ['#p'], 'the positional wins')
    t.strictSame(p.writes, saved('#p'))
  })

  t.test('--target: built as is, no prompt, never saved', async t => {
    st.tty = true
    for (const o of [
      {},
      { project },
      { project, explicit: '#a' },
      { user, yes: true },
    ]) {
      st.built = []
      const r = await go(['#p'], { ...o, target: '#t' })
      t.strictSame(r.built, ['#t'])
      t.match(r.res, { query: '#t' })
      t.notOk('saved' in r.res)
    }
    t.strictSame(st.questions, [])
    t.strictSame(st.editors, [])
    t.strictSame(st.writes, [])
    t.strictSame(st.asserts, [], 'not checked: built as is')
  })

  t.test('invalid q: no prompt, no build', async t => {
    st.tty = true
    st.invalid = ['#bad']
    await t.rejects(run(['#bad'], { project }), /bad query/)
    t.strictSame(st.built, [])
    t.strictSame(st.questions, [])
  })

  t.test('build failure: nothing saved', async t => {
    mockError = new Error('nope')
    await t.rejects(run(['#a']), { message: 'Build failed' })
    t.strictSame(st.built, ['#a'])
    t.strictSame(st.writes, [])
  })
})

t.test('views: allow-scripts', async t => {
  const r: BuildResult = { success: [], failure: [] }
  const { human, json } = Command.views
  t.equal(
    human({ ...r, query: '#a', saved: 'project' }),
    '📦 All packages are already built.\nSaved allow-scripts="#a" to vlt.json',
  )
  t.equal(
    human({ ...r, query: '#a', saved: 'user' }),
    '📦 All packages are already built.\nSaved allow-scripts="#a" to user vlt.json',
  )
  t.equal(
    human({ ...r, query: '#a' }),
    '📦 All packages are already built.',
    'not saved',
  )
  t.strictSame(json({ ...r, query: '#a', saved: 'user' }), {
    success: [],
    failure: [],
    message: 'No packages needed building.',
    query: '#a',
    saved: 'user',
  })
  const unchanged: BuildCommandResult = { action: 'unchanged' }
  t.equal(human(unchanged), 'No changes made.')
  t.equal(json(unchanged), unchanged)
})
