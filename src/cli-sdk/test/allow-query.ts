import t from 'tap'
import {
  configLabel,
  keptLine,
  saveAllow,
  savedLine,
  storedAllow,
  writeAllow,
} from '../src/allow-query.ts'
import type { AllowKey } from '../src/allow-query.ts'
import type { LoadedConfig } from '../src/config/index.ts'

type Layers = Record<string, Record<string, unknown> | undefined>
const conf = (
  layers: Layers,
  explicit: Record<string, unknown> = {},
  get: Record<string, unknown> = {},
) => {
  const writes: unknown[][] = []
  const c = {
    layers,
    explicit,
    get: (k: string) => get[k],
    addConfigToFile: async (...args: unknown[]) => {
      writes.push(args)
    },
  } as unknown as LoadedConfig
  return { c, writes }
}

const keys: AllowKey[] = ['allow-skills', 'allow-scripts']

t.test('storedAllow', async t => {
  for (const key of keys) {
    const s = (layers: Layers) => storedAllow(conf(layers).c, key)
    t.strictSame(s({ project: { [key]: '#p' } }), {
      query: '#p',
      which: 'project',
    })
    t.strictSame(s({ user: { [key]: '#u' } }), {
      query: '#u',
      which: 'user',
    })
    t.strictSame(
      s({ project: { [key]: '#p' }, user: { [key]: '#u' } }),
      { query: '#p', which: 'project' },
      'project wins',
    )
    for (const v of [null, '']) {
      t.equal(
        s({ project: { [key]: v }, user: { [key]: '#u' } }),
        undefined,
        `project ${JSON.stringify(v)} drops the user's`,
      )
    }
    t.strictSame(
      s({ project: { other: 1 }, user: { [key]: '#u' } }),
      { query: '#u', which: 'user' },
    )
    t.equal(s({ project: {}, user: {} }), undefined)
    t.equal(s({}), undefined, 'no files')
  }
  t.equal(
    storedAllow(
      conf({ project: { 'allow-skills': '#p' } }).c,
      'allow-scripts',
    ),
    undefined,
    'per key',
  )
})

t.test('configLabel', async t => {
  t.equal(configLabel('project'), 'vlt.json')
  t.equal(configLabel('user'), 'user vlt.json')
})

t.test('saveAllow', async t => {
  for (const key of keys) {
    const save = async (
      layers: Layers,
      explicit: Record<string, unknown> = {},
    ) => {
      const { c, writes } = conf(layers, explicit)
      return { res: await saveAllow(c, key), writes }
    }
    const q = { [key]: '#a' }
    t.strictSame(await save({}), { res: undefined, writes: [] })
    t.strictSame(await save({}, { [key]: ':not(*)' }), {
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
        await save({ [which]: { [key]: '#b' } }, q),
        {
          res: { query: '#a', stored: { query: '#b', which } },
          writes: [],
        },
        `differs in ${which}: kept`,
      )
    }
  }
})

t.test('writeAllow', async t => {
  for (const [config, which] of [
    [undefined, 'project'],
    ['all', 'project'],
    ['user', 'user'],
  ] as const) {
    const { c, writes } = conf({}, {}, { config })
    t.equal(await writeAllow(c, 'allow-scripts', '#a'), which)
    t.strictSame(writes, [[which, { 'allow-scripts': '#a' }]])
  }
})

t.test('lines', async t => {
  t.equal(
    savedLine('allow-skills', '#a', 'project'),
    'Saved allow-skills="#a" to vlt.json',
  )
  t.equal(
    savedLine('allow-scripts', '#a', 'user'),
    'Saved allow-scripts="#a" to user vlt.json',
  )
  t.equal(
    keptLine('allow-skills', { query: '#b', which: 'project' }),
    'allow-skills is already set (vlt.json): "#b"; not replaced. Run vlt skills link to change it, or edit vlt.json',
  )
  t.equal(
    keptLine('allow-skills', { query: '#b', which: 'user' }),
    'allow-skills is already set (user vlt.json): "#b"; not replaced. Run vlt skills link to change it, or edit user vlt.json',
  )
  t.equal(
    keptLine('allow-scripts', { query: '#b', which: 'project' }),
    'allow-scripts is already set (vlt.json): "#b"; not replaced. Run vlt build to change it, or edit vlt.json',
  )
})
