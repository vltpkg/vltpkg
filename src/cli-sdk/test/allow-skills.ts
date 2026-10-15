import t from 'tap'
import {
  configLabel,
  keptLine,
  saveAllowSkills,
  savedLine,
  storedAllowSkills,
  unmatchedLines,
  unscannedLines,
} from '../src/allow-skills.ts'
import type { LoadedConfig } from '../src/config/index.ts'

type Layers = Record<string, Record<string, unknown> | undefined>
const conf = (
  layers: Layers,
  explicit: Record<string, unknown> = {},
) => {
  const writes: unknown[][] = []
  const c = {
    layers,
    explicit,
    addConfigToFile: async (...args: unknown[]) => {
      writes.push(args)
    },
  } as unknown as LoadedConfig
  return { c, writes }
}

t.test('storedAllowSkills', async t => {
  const s = (layers: Layers) => storedAllowSkills(conf(layers).c)
  t.strictSame(s({ project: { 'allow-skills': '#p' } }), {
    query: '#p',
    which: 'project',
  })
  t.strictSame(s({ user: { 'allow-skills': '#u' } }), {
    query: '#u',
    which: 'user',
  })
  t.strictSame(
    s({
      project: { 'allow-skills': '#p' },
      user: { 'allow-skills': '#u' },
    }),
    { query: '#p', which: 'project' },
    'project wins',
  )
  for (const v of [null, '']) {
    t.equal(
      s({
        project: { 'allow-skills': v },
        user: { 'allow-skills': '#u' },
      }),
      undefined,
      `project ${JSON.stringify(v)} drops the user's`,
    )
  }
  t.strictSame(
    s({ project: { other: 1 }, user: { 'allow-skills': '#u' } }),
    { query: '#u', which: 'user' },
  )
  t.equal(s({ project: {}, user: {} }), undefined)
  t.equal(s({}), undefined, 'no files')
})

t.test('configLabel', async t => {
  t.equal(configLabel('project'), 'vlt.json')
  t.equal(configLabel('user'), 'user vlt.json')
})

t.test('saveAllowSkills', async t => {
  const save = async (
    layers: Layers,
    explicit: Record<string, unknown> = {},
  ) => {
    const { c, writes } = conf(layers, explicit)
    return { res: await saveAllowSkills(c), writes }
  }
  const q = { 'allow-skills': '#a' }
  t.strictSame(await save({}), { res: undefined, writes: [] })
  t.strictSame(await save({}, { 'allow-skills': ':not(*)' }), {
    res: undefined,
    writes: [],
  })
  t.strictSame(await save({}, q), {
    res: { query: '#a' },
    writes: [['project', q]],
  })
  for (const which of ['project', 'user']) {
    t.strictSame(
      await save({ [which]: q }, q),
      { res: undefined, writes: [] },
      `same in ${which}: no write`,
    )
    t.strictSame(
      await save({ [which]: { 'allow-skills': '#b' } }, q),
      {
        res: { query: '#a', stored: { query: '#b', which } },
        writes: [],
      },
      `differs in ${which}: kept`,
    )
  }
})

t.test('lines', async t => {
  t.strictSame(unmatchedLines(), [])
  t.strictSame(
    unmatchedLines([
      { pattern: 'x*', skills: ['a', 'b'] },
      { pattern: 'y', skills: [] },
      { pattern: 'z' },
    ]),
    [
      '⚠️ No skill matches "x*"; the selected packages ship: a, b',
      '⚠️ No skill matches "y"; the selected packages ship no skills',
      '⚠️ No skill matches "z"; no installed package matches its selector',
    ],
  )
  t.strictSame(unscannedLines({}), [])
  t.strictSame(
    unscannedLines({
      unscanned: ['a (foo@1.0.0)'],
      unscannedReason: 'timeout',
    }),
    [
      '⏳ 1 skill left out, security data timed out: a (foo@1.0.0). Try again later.',
    ],
  )
  t.strictSame(
    unscannedLines({
      unscanned: ['a (foo@1.0.0)', 'b (foo@1.0.0)'],
      unscannedReason: 'unscanned',
    }),
    [
      '⏳ 2 skills left out, Socket has not scanned their packages yet: a (foo@1.0.0), b (foo@1.0.0). Try again later.',
    ],
  )
  t.equal(
    savedLine('#a', 'project'),
    'Saved allow-skills="#a" to vlt.json',
  )
  t.equal(
    savedLine('#a', 'user'),
    'Saved allow-skills="#a" to user vlt.json',
  )
  t.equal(
    keptLine({ query: '#b', which: 'project' }),
    'allow-skills is already set (vlt.json): "#b"; not replaced. Run vlt skills link to change it, or edit vlt.json',
  )
  t.equal(
    keptLine({ query: '#b', which: 'user' }),
    'allow-skills is already set (user vlt.json): "#b"; not replaced. Run vlt skills link to change it, or edit user vlt.json',
  )
})
