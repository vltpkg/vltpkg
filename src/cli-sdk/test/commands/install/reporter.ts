import { joinDepIDTuple } from '@vltpkg/dep-id'
import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'
import * as ink from 'ink'
import { PassThrough } from 'node:stream'
import { setTimeout } from 'node:timers/promises'
import t from 'tap'
import type { InstallResult } from '../../../src/commands/install.ts'
import type { LoadedConfig } from '../../../src/config/index.ts'

let out = ''
const stdout = Object.assign(new PassThrough(), { columns: 200 })
stdout.on('data', (c: Buffer) => (out = c.toString()))

const { InstallReporter } = await t.mockImport<
  typeof import('../../../src/commands/install/reporter.ts')
>('../../../src/commands/install/reporter.ts', {
  '@vltpkg/output': await import('@vltpkg/output'),
  react: await import('react'),
  ink: {
    ...ink,
    render: (el: Parameters<typeof ink.render>[0]) =>
      ink.render(el, {
        stdout: stdout as unknown as NodeJS.WriteStream,
        debug: true,
        patchConsole: false,
      }),
  },
})

const reporter = () => new InstallReporter({}, {} as LoadedConfig)
const request = (state: Events['request']['state']) =>
  emitter.emit('request', { url: 'https://x/', state })

t.test('steps, requests and trailer', async t => {
  const r = reporter()
  r.start()
  await setTimeout(50)
  t.match(out, 'resolving dependencies')
  emitter.emit('graphStep', { step: 'build', state: 'start' })
  request('start')
  await setTimeout(50)
  t.match(out, /1 request$/m)
  request('start')
  request('cache')
  await setTimeout(50)
  t.match(out, '2 requests')
  t.match(out, '1 cache hit')
  emitter.emit('graphStep', { step: 'build', state: 'stop' })
  request('stale')
  request('complete')
  await setTimeout(50)
  t.match(out, 'resolving dependencies ✓')
  t.match(out, '2 cache hits')
  request('store')
  request('store')
  await setTimeout(50)
  t.match(out, '4 cache hits', 'store links count as cache hits')
  t.notMatch(out, 'store')
  await r.done(
    {
      buildQueue: [joinDepIDTuple(['registry', '', 'a@1.0.0'])],
      persistedConfig: {
        which: 'project',
        values: { registries: { loc: 'http://u:t@loc/' } },
      },
      migratedWorkspaces: {
        source: 'pnpm-workspace.yaml',
        workspaces: ['packages/*'],
      },
    } as unknown as InstallResult,
    { time: 5 },
  )
  await setTimeout(50)
  t.match(out, 'Done in 5ms')
  t.match(out, '1 packages have install scripts')
  t.match(
    out,
    'Saved registries.loc=http://***@loc/ to project vlt.json',
  )
  t.match(
    out,
    'Saved workspaces from pnpm-workspace.yaml to vlt.json',
  )
  r.error(new Error('x'))
})

t.test('skills', async t => {
  type Row = { id: string; skill: string; dir: string }
  const row = (skill: string, dir = '.agents/skills'): Row => ({
    id: joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    skill,
    dir,
  })
  const done = async (
    linked: Row[],
    conflicts: string[],
    removed: string[] = [],
    notes: {
      skipped?: string[]
      gitignore?: string[]
      unmatched?: { pattern: string; skills: string[] }[]
      unscanned?: string[]
      unscannedReason?: 'timeout' | 'unscanned'
    } = {},
  ) => {
    const r = reporter()
    r.start()
    await r.done(
      {
        skills: {
          linked,
          unchanged: [],
          removed,
          conflicts,
          dirs: [],
          ...notes,
        },
      } as unknown as InstallResult,
      { time: 1 },
    )
    await setTimeout(50)
    // ink in CI writes a bare newline on unmount
    const res = out
    r.error(new Error('x'))
    return res
  }
  const one = await done([row('a')], ['.agents/skills/y'])
  t.match(one, 'Linked 1 agent skill into .agents/skills')
  t.match(
    one,
    '1 skill link skipped, path in use or taken by another package: .agents/skills/y',
  )
  const two = await done(
    [
      row('a'),
      row('a', '.claude/skills'),
      row('b'),
      row('b', '.claude/skills'),
    ],
    ['.agents/skills/y', '.claude/skills/z (bar@1.0.0)'],
  )
  t.match(
    two,
    'Linked 2 agent skills into .agents/skills, .claude/skills',
    'distinct skills, distinct dirs',
  )
  t.match(
    two,
    '2 skill links skipped, path in use or taken by another package: .agents/skills/y, .claude/skills/z (bar@1.0.0)',
  )
  const conflictOnly = await done([], ['.agents/skills/y'])
  t.match(
    conflictOnly,
    /Done in 1ms\n⚠️ 1 skill link skipped/,
    'own line when nothing linked',
  )
  t.notMatch(conflictOnly, 'Linked')
  const none = await done([], [])
  t.notMatch(none, 'skill')
  const pruned = await done([], [], ['.agents/skills/y'])
  t.match(pruned, '🧹 Removed 1 stale skill link: .agents/skills/y')
  t.notMatch(pruned, 'link again')
  t.match(
    await done([], [], ['.agents/skills/y', '.claude/skills/z']),
    'Removed 2 stale skill links: .agents/skills/y, .claude/skills/z',
  )
  const notes = await done([], [], [], {
    skipped: [
      '.claude/skills (outside the project)',
      '.kiro/skills (not a directory)',
    ],
    gitignore: ['.agents/skills/.gitignore'],
  })
  t.match(
    notes,
    '⚠️ Skipped .claude/skills (outside the project), .kiro/skills (not a directory)',
  )
  t.match(notes, '⚠️ Could not update .agents/skills/.gitignore')
  const unmatched = await done([], [], [], {
    unmatched: [
      { pattern: 'nope', skills: ['a', 'b'] },
      { pattern: 'x*', skills: [] },
    ],
  })
  t.match(
    unmatched,
    '⚠️ No skill matches "nope"; the selected packages ship: a, b\n' +
      '⚠️ No skill matches "x*"; the selected packages ship no skills',
  )
  t.match(
    await done([], [], [], {
      unscanned: ['a (foo@1.0.0)'],
      unscannedReason: 'timeout',
    }),
    '⏳ 1 skill left out, security data timed out: a (foo@1.0.0). Try again later.',
  )
})

t.test('allow-skills saved or kept', async t => {
  const done = async (allowSkills: InstallResult['allowSkills']) => {
    const r = reporter()
    r.start()
    await r.done({ allowSkills } as InstallResult, { time: 1 })
    await setTimeout(50)
    const res = out
    r.error(new Error('x'))
    return res
  }
  t.match(
    await done({ query: '#foo' }),
    'Saved allow-skills="#foo" to vlt.json',
  )
  for (const [which, label] of [
    ['project', 'vlt.json'],
    ['user', 'user vlt.json'],
  ] as const) {
    const kept = await done({
      query: '#foo',
      stored: { query: '#bar', which },
    })
    t.match(
      kept,
      `allow-skills is already set (${label}): "#bar"; not replaced. Run vlt skills link to change it, or edit ${label}`,
    )
    t.notMatch(kept, 'Saved')
  }
})

t.test('no start, no persisted config', async t => {
  const r = reporter()
  t.equal(await r.done({} as InstallResult, { time: 1 }), undefined)
  r.error(new Error('x'))
})

t.test('a non-TTY stdout is given a width before render', async t => {
  // without one, Ink spawns tput on every render
  const real = process.stdout as unknown as {
    isTTY?: boolean
    columns?: number
  }
  const prev = {
    isTTY: real.isTTY,
    columns: real.columns,
    COLUMNS: process.env.COLUMNS,
  }
  t.teardown(() => {
    real.isTTY = prev.isTTY
    real.columns = prev.columns
    if (prev.COLUMNS === undefined) delete process.env.COLUMNS
    else process.env.COLUMNS = prev.COLUMNS
  })
  const start = () => {
    const r = reporter()
    r.start()
    r.error(new Error('x'))
  }

  real.isTTY = false
  real.columns = undefined
  delete process.env.COLUMNS
  start()
  t.equal(
    real.columns,
    80,
    "Ink's own fallback, so output is unchanged",
  )

  real.columns = undefined
  process.env.COLUMNS = '120'
  start()
  t.equal(real.columns, 120, 'COLUMNS in the environment wins')

  real.columns = undefined
  process.env.COLUMNS = '-1'
  start()
  t.equal(real.columns, 80, 'a non-positive COLUMNS falls back')

  real.columns = undefined
  process.env.COLUMNS = 'Infinity'
  start()
  t.equal(real.columns, 80, 'a non-integer COLUMNS falls back')

  real.columns = 33
  start()
  t.equal(real.columns, 33, 'a width already present is left alone')

  real.isTTY = true
  real.columns = undefined
  start()
  t.equal(real.columns, undefined, 'a real terminal is left alone')
})

t.test('global', async t => {
  const r = reporter()
  r.start()
  await r.done(
    {
      buildQueue: [joinDepIDTuple(['registry', '', 'a@1.0.0'])],
      global: {
        binDir: '/g/bin',
        bins: ['a', 'b'],
        conflicts: ['c'],
        inPath: false,
      },
    } as unknown as InstallResult,
    { time: 5 },
  )
  await setTimeout(50)
  t.match(out, 'vlt query -g :scripts')
  t.match(out, 'vlt build -g')
  t.match(out, 'Linked a, b in /g/bin')
  t.match(out, 'Skipped c: already linked by another global package')
  t.match(out, 'Add /g/bin to your PATH')
  r.error(new Error('x'))

  const r2 = reporter()
  r2.start()
  await r2.done(
    {
      global: {
        binDir: '/g/bin',
        bins: [],
        conflicts: [],
        inPath: true,
      },
    } as unknown as InstallResult,
    { time: 6 },
  )
  await setTimeout(50)
  t.match(out, 'Done in 6ms')
  t.notMatch(out, 'Linked')
  t.notMatch(out, 'Skipped')
  t.notMatch(out, 'PATH')
  r2.error(new Error('x'))

  // PATH hint only when there are bins
  for (const [conflicts, hint] of [
    [[], false],
    [['c'], true],
  ] as const) {
    const r = reporter()
    r.start()
    await r.done(
      {
        global: {
          binDir: '/g/bin',
          bins: [],
          conflicts,
          inPath: false,
        },
      } as unknown as InstallResult,
      { time: 7 },
    )
    await setTimeout(50)
    t.match(out, 'Done in 7ms')
    t.equal(out.includes('PATH'), hint, `hint: ${hint}`)
    r.error(new Error('x'))
  }
})
