import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import {
  isLazyView,
  isViewClass,
  loadLazyView,
} from '../../src/view.ts'
import type { Source } from '@vltpkg/graph-diff/sources'

const FOO = joinDepIDTuple(['registry', '', 'foo@1.0.0'])
const ROOT = joinDepIDTuple(['file', '.'])
const BAR = joinDepIDTuple(['registry', '', 'foo@2.0.0'])

const LOCKFILE = {
  lockfileVersion: 1,
  options: {},
  nodes: { [FOO]: [0, 'foo'] },
  edges: { [`${ROOT} foo`]: `prod ^1 ${FOO}` },
}

const EMPTY = {
  lockfileVersion: 1,
  options: {},
  nodes: {},
  edges: {},
}

type FoundAlert = {
  type: string
  severity: string
  props?: { cveId?: string }
}

/** Load the command with the two sides of the diff canned. */
const mockCommand = (
  t: Test,
  read: (source: Source) => unknown = () => EMPTY,
  alerts?: Record<string, FoundAlert[]>,
) =>
  t.mockImport<typeof import('../../src/commands/diff.ts')>(
    '../../src/commands/diff.ts',
    {
      '@vltpkg/graph-diff/sources': {
        readSource: async (source: Source) => read(source),
        describeSource: (source: Source) =>
          source.kind === 'git' ? source.ref
          : source.kind === 'file' ? source.path
          : 'working tree',
      },
      ...(alerts ?
        {
          '@vltpkg/security-archive': {
            SecurityArchive: {
              start: async () => ({
                get: (id: string) =>
                  alerts[id] ? { alerts: alerts[id] } : undefined,
              }),
            },
          },
        }
      : {}),
    },
  )

const conf = (
  positionals: string[],
  values: Record<string, unknown> = {},
) =>
  ({
    positionals,
    options: { projectRoot: '/project' },
    get: (k: string) => values[k],
  }) as unknown as LoadedConfig

t.test('usage', async t => {
  const { usage } = await mockCommand(t)
  t.matchSnapshot(usage().usage(), 'usage')
  t.matchSnapshot(usage().usageMarkdown(), 'usage markdown')
})

t.test('bare `vlt diff` names the reserved grammar', async t => {
  const { command } = await mockCommand(t)
  await t.rejects(command(conf([])), {
    message: 'Unrecognized diff command',
    cause: { code: 'EUSAGE', validOptions: ['lockfile'] },
  })
  await t.rejects(command(conf(['contents'])), {
    cause: { found: 'contents' },
  })
})

t.test('ref resolution', async t => {
  const seen: Source[] = []
  const { command } = await mockCommand(t, source => {
    seen.push(source)
    return EMPTY
  })
  const run = async (
    positionals: string[],
    values?: Record<string, unknown>,
  ) => {
    seen.length = 0
    const result = await command(
      conf(['lockfile', ...positionals], values),
    )
    return [result.base, result.head]
  }

  t.strictSame(
    await run([]),
    [{ kind: 'git', ref: 'HEAD' }, { kind: 'worktree' }],
    'no args compares the working tree against HEAD',
  )
  t.strictSame(
    await run(['main']),
    [{ kind: 'git', ref: 'main' }, { kind: 'worktree' }],
    'one arg is the base',
  )
  t.strictSame(
    await run(['main', 'feat/x']),
    [
      { kind: 'git', ref: 'main' },
      { kind: 'git', ref: 'feat/x' },
    ],
    'two args are base and head',
  )
  t.strictSame(
    await run(['main..feat/x']),
    [
      { kind: 'git', ref: 'main' },
      { kind: 'git', ref: 'feat/x' },
    ],
    '`a..b` means the same as `a b`',
  )
  t.strictSame(
    await run(['a..b', 'c']),
    [
      { kind: 'git', ref: 'a..b' },
      { kind: 'git', ref: 'c' },
    ],
    'a second positional means the first is taken literally',
  )
  t.strictSame(
    await run([], { base: 'x', head: 'y' }),
    [
      { kind: 'git', ref: 'x' },
      { kind: 'git', ref: 'y' },
    ],
    'flags stand in for positionals',
  )
  t.strictSame(
    await run(['x'], { base: 'x' }),
    [{ kind: 'git', ref: 'x' }, { kind: 'worktree' }],
    'a flag agreeing with its positional is fine',
  )
  t.strictSame(
    await run(['./old/vlt-lock.json']),
    [
      { kind: 'file', path: './old/vlt-lock.json' },
      { kind: 'worktree' },
    ],
    'a .json suffix means a path on disk',
  )
  t.strictSame(seen, [
    { kind: 'file', path: './old/vlt-lock.json' },
    { kind: 'worktree' },
  ])
})

t.test('conflicting and excessive arguments', async t => {
  const { command } = await mockCommand(t)
  await t.rejects(command(conf(['lockfile', 'a'], { base: 'b' })), {
    message: /Conflicting base/,
    cause: { code: 'EUSAGE', found: 'a', wanted: 'b' },
  })
  await t.rejects(
    command(conf(['lockfile', 'a', 'b'], { head: 'c' })),
    {
      message: /Conflicting head/,
    },
  )
  await t.rejects(command(conf(['lockfile', 'a', 'b', 'c'])), {
    message: /Too many arguments/,
    cause: { code: 'EUSAGE' },
  })
})

t.test(
  'a ref that git would read as an option is rejected',
  async t => {
    const { command, classify } = await mockCommand(t)
    await t.rejects(
      command(conf(['lockfile', '--upload-pack=evil'])),
      {
        message: 'Invalid commitish argument for --base',
      },
    )
    t.throws(() => classify('a;rm -rf /', '--head'), {
      message: 'Invalid commitish argument for --head',
    })
  },
)

t.test('views', async t => {
  const { command, views } = await mockCommand(t, source =>
    source.kind === 'worktree' ? LOCKFILE : EMPTY,
  )
  const result = await command(conf(['lockfile']))

  t.equal(views.json(result), result.diff, 'json is the model itself')
  t.equal(
    result.diff.summary.counts['node-added'],
    1,
    'the two sides really were diffed',
  )

  t.ok(isLazyView(views.human), 'human view is lazy')

  // markdown is the view a code review can actually carry
  const md = views.markdown(result)
  t.match(md, /^## Lockfile diff/)
  t.match(md, /`HEAD` → `working tree`/, 'names both sides')
  t.match(md, /\*\*\+1\*\* packages/, 'as a delta')
  t.match(md, /<details>/)
})

t.test('the human view loads the interactive viewer', async t => {
  // imported unmocked, so the ViewClass the viewer extends is the same
  // one this test compares against
  const { views } = await import('../../src/commands/diff.ts')
  t.ok(
    isLazyView(views.human),
    'ink and react stay off the load path until it is selected',
  )
  const DiffViewer = await loadLazyView(views.human)
  t.ok(isViewClass(DiffViewer), 'and it resolves to a view class')
})

t.test('--exit-code', async t => {
  const changed = (source: Source) =>
    source.kind === 'worktree' ? LOCKFILE : EMPTY

  for (const [name, read, values, expected] of [
    ['changes with the flag', changed, { 'exit-code': true }, 1],
    ['changes without the flag', changed, {}, undefined],
    [
      'no changes with the flag',
      () => EMPTY,
      { 'exit-code': true },
      undefined,
    ],
  ] as const) {
    const { command } = await mockCommand(t, read)
    process.exitCode = undefined
    await command(conf(['lockfile'], values))
    t.equal(process.exitCode, expected, name)
    process.exitCode = undefined
  }
})

t.test(
  '--security is opt-in and reports only what is actionable',
  async t => {
    const found = {
      [FOO]: [
        // kept: code that runs, and one graded above the threshold
        { type: 'installScripts', severity: 'middle' },
        {
          type: 'malware',
          severity: 'critical',
          props: { cveId: 'CVE-1' },
        },
        { type: 'shellAccess', severity: 'low' },
        // dropped: true of half the registry, and repeated per call site
        { type: 'envVars', severity: 'low' },
        { type: 'networkAccess', severity: 'low' },
        { type: 'networkAccess', severity: 'low' },
        { type: 'installScripts', severity: 'middle' },
        // kept on grade alone, whatever its kind
        { type: 'somethingNew', severity: 'high' },
      ],
    }
    const read = (s: Source) =>
      s.kind === 'worktree' ? LOCKFILE : EMPTY

    const off = await mockCommand(t, read, found)
    const quiet = await off.command(conf(['lockfile']))
    t.equal(
      quiet.diff.alerts,
      undefined,
      'nothing is fetched without the flag: it is the only network call',
    )

    const on = await mockCommand(t, read, found)
    const loud = await on.command(
      conf(['lockfile'], { security: true }),
    )
    t.strictSame(
      loud.diff.alerts?.[FOO],
      [
        { type: 'installScripts', severity: 'medium' },
        { type: 'malware', severity: 'critical', cve: 'CVE-1' },
        { type: 'shellAccess', severity: 'low' },
        { type: 'somethingNew', severity: 'high' },
      ],
      'filtered, deduped by kind, and `middle` graded as `medium`',
    )
    t.match(on.views.markdown(loud), /### ⚠️ Security/)
  },
)

t.test('only what entered or moved is asked about', async t => {
  // an edge change touches no new package, so there is nothing to look
  // up for it -- asking about all 1374 would be a slower question
  const asked: string[] = []
  const withEdge = {
    ...LOCKFILE,
    edges: {
      ...LOCKFILE.edges,
      [`${ROOT} other`]: `prod ^2 ${FOO}`,
    },
  }
  const { command } = await t.mockImport<
    typeof import('../../src/commands/diff.ts')
  >('../../src/commands/diff.ts', {
    '@vltpkg/graph-diff/sources': {
      readSource: async (s: Source) =>
        s.kind === 'worktree' ? withEdge : LOCKFILE,
      describeSource: () => 'working tree',
    },
    '@vltpkg/security-archive': {
      SecurityArchive: {
        start: async ({ nodes }: { nodes: { id: string }[] }) => {
          asked.push(...nodes.map(n => n.id))
          return { get: () => undefined }
        },
      },
    },
  })
  await command(conf(['lockfile'], { security: true }))
  t.strictSame(asked, [], 'an added edge introduces no package')
})

t.test('a bump is asked about, and a CVE always counts', async t => {
  const bumped = {
    ...LOCKFILE,
    nodes: { [BAR]: [0, 'foo'] },
    edges: { [`${ROOT} foo`]: `prod ^1 ${BAR}` },
  }
  const found = {
    [BAR]: [
      // envVars alone is noise; envVars with a CVE is not
      { type: 'envVars', severity: 'low', props: { cveId: 'CVE-9' } },
    ],
  }
  const { command } = await mockCommand(
    t,
    s => (s.kind === 'worktree' ? bumped : LOCKFILE),
    found,
  )
  const result = await command(conf(['lockfile'], { security: true }))
  t.strictSame(
    result.diff.alerts?.[BAR],
    [{ type: 'envVars', severity: 'low', cve: 'CVE-9' }],
    'a resolution feeds the lookup, and a reference outweighs the kind',
  )
})

t.test('no alerts, nothing to say', async t => {
  const read = (s: Source) =>
    s.kind === 'worktree' ? LOCKFILE : EMPTY
  const { command, views } = await mockCommand(t, read, {})
  const result = await command(conf(['lockfile'], { security: true }))
  t.equal(result.diff.alerts, undefined, 'no empty section')
  t.notMatch(views.markdown(result), /Security/)
})

t.test('a diff with nothing versioned asks nothing', async t => {
  let asked = false
  const { command } = await t.mockImport<
    typeof import('../../src/commands/diff.ts')
  >('../../src/commands/diff.ts', {
    '@vltpkg/graph-diff/sources': {
      readSource: async () => EMPTY,
      describeSource: () => 'working tree',
    },
    '@vltpkg/security-archive': {
      SecurityArchive: {
        start: async () => {
          asked = true
          return { get: () => undefined }
        },
      },
    },
  })
  const result = await command(conf(['lockfile'], { security: true }))
  t.equal(result.diff.alerts, undefined)
  t.equal(asked, false, 'an empty diff has nothing to ask about')
})
