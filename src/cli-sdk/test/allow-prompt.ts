import t from 'tap'
import type { AllowKey } from '../src/allow-query.ts'
import type { LoadedConfig } from '../src/config/index.ts'
import type { EditQueryOptions } from '../src/skills-prompt.ts'

// scripted prompts and recorded side effects
type State = {
  tty: boolean
  confirms: (boolean | undefined)[]
  answers: (string | undefined)[]
  questions: string[]
  editors: Omit<EditQueryOptions, 'check'>[]
}
let st: State
t.beforeEach(() => {
  st = {
    tty: false,
    confirms: [],
    answers: [],
    questions: [],
    editors: [],
  }
})

const { pickQuery } = await t.mockImport<
  typeof import('../src/allow-prompt.ts')
>('../src/allow-prompt.ts', {
  '../src/skills-prompt.ts': {
    interactive: () => st.tty,
    confirm: async (q: string) => {
      st.questions.push(q)
      return st.confirms.shift()
    },
    editQuery: async ({ check, ...o }: EditQueryOptions) => {
      st.editors.push(o)
      const a = st.answers.shift()
      if (a !== undefined) await check(a)
      return a
    },
  },
})

type Layers = Record<string, Record<string, unknown> | undefined>
const conf = (layers: Layers, get: Record<string, unknown>) =>
  ({ layers, get: (k: string) => get[k] }) as unknown as LoadedConfig

t.test('pickQuery', async t => {
  const S = ':root > *'
  const D = ':default'
  const checked: string[] = []
  const pick = (
    given: string | undefined,
    o: {
      key?: AllowKey
      project?: string
      user?: string
      yes?: boolean
      saveDefault?: boolean
    } = {},
  ) => {
    const key = o.key ?? 'allow-scripts'
    const c = conf(
      {
        ...(o.project && { project: { [key]: o.project } }),
        ...(o.user && { user: { [key]: o.user } }),
      },
      { yes: o.yes },
    )
    return pickQuery(c, given, {
      key,
      defaultQuery: D,
      saveDefault: !!o.saveDefault,
      check: async q => {
        checked.push(q)
        if (q === '#bad') throw new Error('bad query')
      },
    })
  }
  const replaceQ = (key = 'allow-scripts') =>
    `${key} is already set for this project (vlt.json): "${S}". Replace it? [y/N] `
  const editQ = (key = 'allow-scripts') =>
    `${key} is set for this project (vlt.json): "${S}". Edit it? [y/N] `

  t.test('given, nothing stored: save it', async t => {
    for (const tty of [true, false]) {
      for (const yes of [true, false]) {
        st.tty = tty
        t.strictSame(await pick('#a', { yes }), {
          query: '#a',
          save: true,
        })
      }
    }
    t.strictSame(st.questions, [])
    t.equal(checked.at(-1), '#a', 'checked')
  })

  t.test('given equal to stored: no prompt, no save', async t => {
    st.tty = true
    t.strictSame(await pick(S, { project: S }), {
      query: S,
      save: false,
    })
    t.strictSame(st.questions, [])
  })

  t.test('given, stored, -y: save it', async t => {
    for (const tty of [true, false]) {
      st.tty = tty
      t.strictSame(await pick('#a', { project: S, yes: true }), {
        query: '#a',
        save: true,
      })
    }
    t.strictSame(st.questions, [])
  })

  t.test('given, stored, no TTY: EUSAGE', async t => {
    await t.rejects(pick('#a', { project: S }), {
      message: `allow-scripts is already set (vlt.json): "${S}"; pass -y to replace it`,
      cause: { code: 'EUSAGE', found: '#a', wanted: S },
    })
    await t.rejects(pick('#a', { user: S, key: 'allow-skills' }), {
      message: `allow-skills is already set (user vlt.json): "${S}"; pass -y to replace it`,
    })
  })

  t.test('given, stored, TTY: Replace?', async t => {
    st.tty = true
    st.confirms = [false, undefined, true, true, true]
    st.answers = [undefined, '#b', S]
    t.equal(await pick('#a', { project: S }), undefined, 'N')
    t.equal(await pick('#a', { project: S }), undefined, 'ctrl+C')
    t.equal(
      await pick('#a', { project: S }),
      undefined,
      'editor cancel',
    )
    t.strictSame(await pick('#a', { project: S }), {
      query: '#b',
      save: true,
    })
    t.strictSame(
      await pick('#a', { project: S }),
      { query: S, save: false },
      'answer equal to stored: no save',
    )
    t.strictSame(st.questions, Array(5).fill(replaceQ()))
    t.strictSame(
      st.editors,
      Array(3).fill({
        key: 'allow-scripts',
        current: S,
        prefill: '#a',
      }),
    )
    t.equal(checked.at(-1), S, 'editor checks the answer')
  })

  t.test('no given, stored, -y or no TTY: use it', async t => {
    for (const [tty, yes] of [
      [true, true],
      [false, true],
      [false, false],
    ] as const) {
      st.tty = tty
      t.strictSame(await pick(undefined, { project: S, yes }), {
        query: S,
        save: false,
      })
    }
    t.strictSame(st.questions, [])
  })

  t.test('no given, stored, TTY: Edit?', async t => {
    st.tty = true
    st.confirms = [true, false, undefined]
    st.answers = ['#b']
    t.strictSame(await pick(undefined, { project: S }), {
      query: '#b',
      save: true,
    })
    t.strictSame(
      await pick(undefined, { project: S }),
      { query: S, save: false },
      'N: use it',
    )
    t.equal(
      await pick(undefined, { project: S }),
      undefined,
      'ctrl+C: cancel',
    )
    t.strictSame(st.questions, Array(3).fill(editQ()))
    t.strictSame(st.editors, [
      { key: 'allow-scripts', current: S, prefill: S },
    ])
  })

  t.test('nothing stored, -y or no TTY: the default', async t => {
    for (const saveDefault of [true, false]) {
      st.tty = true
      t.strictSame(
        await pick(undefined, { yes: true, saveDefault }),
        {
          query: D,
          save: true,
        },
      )
      st.tty = false
      t.strictSame(await pick(undefined, { saveDefault }), {
        query: D,
        save: saveDefault,
      })
      t.strictSame(
        await pick(undefined, { yes: true, saveDefault }),
        {
          query: D,
          save: true,
        },
      )
    }
    t.strictSame(st.questions, [])
    t.strictSame(st.editors, [])
  })

  t.test('nothing stored, TTY: editor', async t => {
    st.tty = true
    st.answers = ['#b', undefined]
    t.strictSame(await pick(undefined), { query: '#b', save: true })
    t.equal(await pick(undefined), undefined, 'cancel')
    t.strictSame(st.editors, [
      { key: 'allow-scripts', prefill: D },
      { key: 'allow-scripts', prefill: D },
    ])
    t.notOk('current' in st.editors[0]!, 'nothing stored: no current')
  })

  t.test('questions per key and file', async t => {
    st.tty = true
    st.confirms = [false, false, false, false]
    await pick('#a', { project: S, key: 'allow-skills' })
    await pick(undefined, { project: S, key: 'allow-skills' })
    await pick('#a', { user: S })
    await pick(undefined, { user: S })
    t.strictSame(st.questions, [
      replaceQ('allow-skills'),
      editQ('allow-skills'),
      `allow-scripts is already set in the user vlt.json: "${S}". Replace it? [y/N] `,
      `allow-scripts is set in the user vlt.json: "${S}". Edit it? [y/N] `,
    ])
  })

  t.test('invalid given: no prompt', async t => {
    st.tty = true
    await t.rejects(pick('#bad', { project: S }), /bad query/)
    t.strictSame(st.questions, [])
  })
})
