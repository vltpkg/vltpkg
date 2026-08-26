import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Source } from '@vltpkg/graph-diff/sources'

const FOO = joinDepIDTuple(['registry', '', 'foo@1.0.0'])
const ROOT = joinDepIDTuple(['file', '.'])

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

/** Load the command with the two sides of the diff canned. */
const mockCommand = (
  t: Test,
  read: (source: Source) => unknown = () => EMPTY,
) =>
  t.mockImport<typeof import('../../src/commands/diff.ts')>(
    '../../src/commands/diff.ts',
    {
      '@vltpkg/graph-diff/sources': {
        readSource: async (source: Source) => read(source),
      },
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

  const human = views.human(result, {})
  t.match(human, /LOCKFILE DIFF/)
  t.match(human, /foo/)
  t.notMatch(human, /\[/, 'no color unless asked')
  t.match(
    views.human(result, { colors: true }),
    /\[/,
    'colors when asked',
  )
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
