import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Graph, mermaidOutput } from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import t from 'tap'
import type { Node, Skill, SkillRow } from '@vltpkg/graph'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { SkillsResult } from '../../src/commands/skills.ts'
import type { EditQueryOptions } from '../../src/skills-prompt.ts'

type Call = {
  fn: string
  target?: string
  projectRoot?: string
  skillsDirs?: string[]
  apply?: boolean
}
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
  linkError?: Error
}
let calls: Call[] = []
let st: State
t.beforeEach(() => {
  calls = []
  st = {
    tty: false,
    confirms: [],
    answers: [],
    questions: [],
    editors: [],
    writes: [],
    asserts: [],
    invalid: [],
  }
})

const result = {
  linked: [],
  unchanged: [],
  removed: [],
  conflicts: [],
  dirs: ['.agents/skills'],
}

const Command = await t.mockImport<
  typeof import('../../src/commands/skills.ts')
>('../../src/commands/skills.ts', {
  '@vltpkg/graph': {
    mermaidOutput,
    assertQuery: async (...args: unknown[]) => {
      st.asserts.push(args)
      if (st.invalid.includes(args[0] as string)) {
        throw new Error(`bad query ${String(args[0])}`)
      }
    },
    listSkills: async ({ target, projectRoot, skillsDirs }: Call) => {
      calls.push({ fn: 'list', target, projectRoot, skillsDirs })
      return {
        project: 'my-project',
        skills: [],
        dirs: ['.agents/skills'],
      }
    },
    linkSkills: async ({
      target,
      projectRoot,
      skillsDirs,
      apply,
    }: Call) => {
      calls.push({
        fn: 'link',
        target,
        projectRoot,
        skillsDirs,
        apply,
      })
      if (st.linkError) throw st.linkError
      return result
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

type RunOptions = {
  target?: string
  skillsDir?: string[]
  yes?: boolean
  config?: string
  project?: Record<string, unknown>
  user?: Record<string, unknown>
}
const run = (positionals: string[], o: RunOptions = {}) =>
  Command.command({
    projectRoot: '/project',
    positionals,
    values: {},
    options: {},
    layers: {
      ...(o.project && { project: o.project }),
      ...(o.user && { user: o.user }),
    },
    get: (k: string) =>
      ({
        target: o.target,
        'skills-dir': o.skillsDir,
        yes: o.yes,
        config: o.config,
      })[k],
    addConfigToFile: async (which: string, values: unknown) => {
      st.writes.push([which, values])
    },
  } as unknown as LoadedConfig)

t.test('usage', async t => {
  t.matchSnapshot(Command.usage().usage(), 'usage')
})

t.test('command', async t => {
  const list = {
    action: 'list',
    project: 'my-project',
    skills: [],
    dirs: ['.agents/skills'],
  }
  t.strictSame(await run([]), list)
  t.strictSame(await run(['ls', '#foo']), list)
  t.strictSame(await run(['link']), {
    action: 'link',
    query: ':not(:malware)',
    saved: 'project',
    ...result,
  })
  await run(['link', '#foo'])
  await run(['link', '#foo'], {
    target: '#bar',
    skillsDir: ['.claude/skills'],
  })
  await run(['list'], { target: '#bar', skillsDir: [] })
  await run(['list', '#a:skill(x)'])
  const p = '/project'
  t.strictSame(calls, [
    {
      fn: 'list',
      target: undefined,
      projectRoot: p,
      skillsDirs: undefined,
    },
    {
      fn: 'list',
      target: '#foo',
      projectRoot: p,
      skillsDirs: undefined,
    },
    {
      fn: 'link',
      target: ':not(:malware)',
      projectRoot: p,
      skillsDirs: undefined,
      apply: true,
    },
    {
      fn: 'link',
      target: '#foo',
      projectRoot: p,
      skillsDirs: undefined,
      apply: true,
    },
    {
      fn: 'link',
      target: '#bar',
      projectRoot: p,
      skillsDirs: ['.claude/skills'],
      apply: true,
    },
    { fn: 'list', target: '#bar', projectRoot: p, skillsDirs: [] },
    {
      fn: 'list',
      target: '#a:skill(x)',
      projectRoot: p,
      skillsDirs: undefined,
    },
  ])
  t.strictSame(st.asserts, [
    ['#foo', 'allow-skills', ['skill']],
    ['#bar', 'allow-skills', ['skill']],
  ])
  for (const sub of ['#foo', 'unlink']) {
    await t.rejects(run([sub]), {
      message: 'Unknown skills subcommand',
      cause: {
        code: 'EUSAGE',
        found: sub,
        validOptions: ['list', 'ls', 'link'],
      },
    })
  }
})

t.test('link: set, save and apply allow-skills', async t => {
  const S = ':root > *'
  const project = { 'allow-skills': S }
  const user = { 'allow-skills': S }
  const replaceQ = `allow-skills is already set for this project (vlt.json): "${S}". Replace it? [y/N] `
  const editQ = `allow-skills is set for this project (vlt.json): "${S}". Edit it? [y/N] `
  // what was linked, written and asked
  const link = async (positionals: string[], o: RunOptions = {}) => {
    const res = await run(['link', ...positionals], o)
    return {
      res,
      linked: calls.map(c => c.target),
      writes: st.writes,
      questions: st.questions,
      editors: st.editors,
    }
  }
  const saved = (q: string, which = 'project') => [
    [which, { 'allow-skills': q }],
  ]

  t.test('1. q, nothing stored: link q, save it', async t => {
    for (const tty of [true, false]) {
      for (const yes of [true, false]) {
        st = { ...st, tty, writes: [] }
        calls = []
        const r = await link(['#a'], { yes })
        t.strictSame(r.linked, ['#a'])
        t.strictSame(r.writes, saved('#a'))
        t.strictSame(r.questions, [])
        t.match(r.res, {
          action: 'link',
          query: '#a',
          saved: 'project',
        })
      }
    }
    st.writes = []
    const r = await link(['#a'], { config: 'user' })
    t.strictSame(r.writes, saved('#a', 'user'), '--config=user')
    t.match(r.res, { saved: 'user' })
  })

  t.test('2. q, stored, TTY: Replace?', async t => {
    st.tty = true
    st.confirms = [false, undefined]
    for (const how of ['N', 'ctrl+C/D']) {
      t.strictSame(
        await run(['link', '#a'], { project }),
        { action: 'unchanged' },
        how,
      )
    }
    t.strictSame(calls, [])
    t.strictSame(st.writes, [])
    t.strictSame(st.questions, [replaceQ, replaceQ])

    st.confirms = [true]
    st.answers = ['#b']
    const y = await link(['#a'], { project })
    t.strictSame(y.editors, [
      { key: 'allow-skills', current: S, prefill: '#a' },
    ])
    t.strictSame(y.linked, ['#b'])
    t.strictSame(y.writes, saved('#b'))
    t.equal(st.asserts.at(-1)?.[0], '#b', 'editor checks the answer')
  })

  t.test('2. q, stored, TTY: editor cancel or same', async t => {
    st.tty = true
    st.confirms = [true, true]
    st.answers = [undefined, S]
    t.strictSame(await run(['link', '#a'], { project }), {
      action: 'unchanged',
    })
    const same = await link(['#a'], { project })
    t.strictSame(same.linked, [S])
    t.strictSame(same.writes, [], 'same as stored: no write')
    t.notOk('saved' in same.res)
  })

  t.test('3. q, stored, -y: link q, save it', async t => {
    for (const tty of [true, false]) {
      st = { ...st, tty, writes: [] }
      calls = []
      const r = await link(['#a'], { project, yes: true })
      t.strictSame(r.linked, ['#a'])
      t.strictSame(r.writes, saved('#a'))
      t.strictSame(r.questions, [])
    }
  })

  t.test('4. no q, stored, TTY: Edit?', async t => {
    st.tty = true
    st.confirms = [true]
    st.answers = ['#b']
    const y = await link([], { project })
    t.strictSame(y.questions, [editQ])
    t.strictSame(y.editors, [
      { key: 'allow-skills', current: S, prefill: S },
    ])
    t.strictSame(y.linked, ['#b'])
    t.strictSame(y.writes, saved('#b'))

    st = { ...st, confirms: [false], writes: [], editors: [] }
    calls = []
    const n = await link([], { project })
    t.strictSame(n.linked, [S])
    t.strictSame(n.writes, [])
    t.strictSame(n.editors, [])

    st.confirms = [undefined]
    calls = []
    t.strictSame(
      await run(['link'], { project }),
      { action: 'unchanged' },
      'ctrl+C/D: cancel',
    )
    t.strictSame(calls, [])
    t.strictSame(st.editors, [])
  })

  t.test('5. no q, stored, -y: link it', async t => {
    st.tty = true
    const r = await link([], { project, yes: true })
    t.strictSame(r.linked, [S])
    t.strictSame(r.writes, [])
    t.strictSame(r.questions, [])
  })

  t.test('6. no q, nothing stored, TTY: editor', async t => {
    st.tty = true
    st.answers = [':not(:malware)', undefined]
    const r = await link([])
    t.strictSame(r.editors, [
      { key: 'allow-skills', prefill: ':not(:malware)' },
    ])
    t.notOk('current' in r.editors[0]!, 'nothing stored: no current')
    t.strictSame(r.linked, [':not(:malware)'])
    t.strictSame(r.writes, saved(':not(:malware)'))
    t.strictSame(await run(['link']), { action: 'unchanged' })
  })

  t.test('7. no q, nothing stored, -y: link the default', async t => {
    st.tty = true
    const r = await link([], { yes: true })
    t.strictSame(r.linked, [':not(:malware)'])
    t.strictSame(r.writes, saved(':not(:malware)'))
  })

  t.test('8. q, stored, no TTY: EUSAGE', async t => {
    await t.rejects(run(['link', '#a'], { project }), {
      message: `allow-skills is already set (vlt.json): "${S}"; pass -y to replace it`,
      cause: { code: 'EUSAGE', found: '#a', wanted: S },
    })
    t.strictSame(calls, [])
    t.strictSame(st.writes, [])
  })

  t.test('9. no q, stored, no TTY: link it', async t => {
    const r = await link([], { project })
    t.strictSame(r.linked, [S])
    t.strictSame(r.writes, [])
  })

  t.test(
    '10. no q, nothing stored, no TTY: link default',
    async t => {
      const r = await link([])
      t.strictSame(r.linked, [':not(:malware)'])
      t.strictSame(r.writes, saved(':not(:malware)'))
    },
  )

  t.test('q equal to stored: no prompt, no write', async t => {
    st.tty = true
    const r = await link([S], { project })
    t.strictSame(r.linked, [S])
    t.strictSame(r.questions, [])
    t.strictSame(r.writes, [])
  })

  t.test('stored in the user file', async t => {
    st.tty = true
    st.confirms = [false, false]
    await run(['link', '#a'], { user })
    await run(['link'], { user })
    t.strictSame(st.questions, [
      `allow-skills is already set in the user vlt.json: "${S}". Replace it? [y/N] `,
      `allow-skills is set in the user vlt.json: "${S}". Edit it? [y/N] `,
    ])
    st.tty = false
    await t.rejects(run(['link', '#a'], { user }), {
      message: `allow-skills is already set (user vlt.json): "${S}"; pass -y to replace it`,
    })
    // a project `null` drops the user's
    const r = await link(['#a'], {
      user,
      project: { 'allow-skills': null },
    })
    t.strictSame(r.linked, [S, '#a'])
    t.strictSame(r.writes, saved('#a'))
  })

  t.test('invalid q: no prompt, no link', async t => {
    st.tty = true
    st.invalid = ['#bad']
    await t.rejects(run(['link', '#bad'], { project }), /bad query/)
    t.strictSame(calls, [])
    t.strictSame(st.questions, [])
  })

  t.test('link failure: nothing saved', async t => {
    st.linkError = new Error('link failed')
    await t.rejects(run(['link', '#a']), /link failed/)
    t.strictSame(st.writes, [])
  })
})

t.test('views', async t => {
  const skill = (s: Partial<Skill>): Skill => ({
    name: 'foo',
    version: '1.0.0',
    id: joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    skill: 'a',
    path: '/project/node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/skills/a',
    linked: [],
    ...s,
  })
  const row = (dir: string, s: Partial<Skill> = {}): SkillRow => {
    const r = skill(s)
    return { ...r, dir, mount: `${dir}/${r.skill}` }
  }
  const dirs = ['.agents/skills', '.claude/skills']
  const project = 'my-project'
  const specOptions = {
    registry: 'https://registry.npmjs.org/',
    registries: { npm: 'https://registry.npmjs.org/' },
  }
  const graph = new Graph({
    ...specOptions,
    projectRoot: '/project',
    mainManifest: { name: project, version: '1.0.0' },
  })
  const place = (from: Node, spec: string, name: string) => {
    const node = graph.placePackage(
      from,
      'prod',
      Spec.parse(spec, specOptions),
      { name, version: name === 'skills' ? '1.7.2' : '1.0.0' },
    )
    if (!node) throw new Error('failed to place ' + spec)
    return node
  }
  const foo = place(graph.mainImporter, 'foo@1', 'foo')
  const bar = place(foo, '@s/bar@1', '@s/bar')
  const vs = place(
    graph.mainImporter,
    'vercelskills@npm:skills@1',
    'skills',
  )
  const mine = place(
    graph.mainImporter,
    'mine@npm:theirs@1',
    'theirs',
  )
  place(graph.mainImporter, 'none@1', 'none')
  const { human, json, mermaid } = Command.views
  const cases: [string, SkillsResult][] = [
    [
      'list empty',
      { action: 'list', project, graph, skills: [], dirs },
    ],
    [
      'list no dirs',
      {
        action: 'list',
        project,
        graph,
        skills: [skill({ linked: ['.agents/skills'] })],
        dirs: [],
      },
    ],
    [
      'list skipped',
      {
        action: 'list',
        project,
        graph,
        skills: [],
        dirs: [],
        skipped: ['.claude/skills (outside the project)'],
      },
    ],
    [
      'list unscanned',
      {
        action: 'list',
        project,
        graph,
        skills: [],
        dirs,
        unscanned: ['a (foo@1.0.0)'],
        unscannedReason: 'timeout',
      },
    ],
    [
      'list one',
      {
        action: 'list',
        project,
        graph,
        skills: [skill({ description: 'does a' })],
        dirs,
      },
    ],
    [
      'list many',
      {
        action: 'list',
        project,
        graph,
        dirs,
        skills: [
          skill({ linked: dirs }),
          skill({ skill: 'b', linked: ['.claude/skills'] }),
          skill({
            name: '@s/bar',
            version: undefined,
            id: bar.id,
            skill: 'bar',
          }),
        ],
      },
    ],
    [
      'list aliased',
      {
        action: 'list',
        project,
        graph,
        dirs: ['.agents/skills'],
        skills: [
          skill({
            alias: 'vercelskills',
            name: 'skills',
            version: '1.7.2',
            id: vs.id,
            skill: 'find-skills',
            linked: ['.agents/skills'],
          }),
          skill({
            alias: 'mine',
            name: 'theirs',
            version: undefined,
            id: mine.id,
            skill: 'x',
          }),
        ],
      },
    ],
    ['link nothing', { action: 'link', query: '#a', ...result }],
    [
      'link one',
      {
        action: 'link',
        query: '#a',
        ...result,
        linked: [row('.agents/skills')],
      },
    ],
    [
      'link saved project',
      {
        action: 'link',
        query: '#a:skill(x)',
        saved: 'project',
        ...result,
        linked: [row('.agents/skills')],
      },
    ],
    [
      'link saved user',
      {
        action: 'link',
        query: '#a',
        saved: 'user',
        ...result,
        linked: [row('.agents/skills')],
      },
    ],
    [
      'link unmatched',
      {
        action: 'link',
        query: '#a:skill(nope, x*), #b:skill(y)',
        saved: 'project',
        ...result,
        unmatched: [
          { pattern: 'nope', skills: ['a', 'b'] },
          { pattern: 'x*', skills: ['a', 'b'] },
          { pattern: 'y', skills: [] },
        ],
      },
    ],
    [
      'link unscanned',
      {
        action: 'link',
        query: ':not(:malware)',
        ...result,
        removed: ['.agents/skills/a'],
        unscanned: ['a (foo@1.0.0)', 'b (foo@1.0.0)'],
        unscannedReason: 'unscanned',
      },
    ],
    ['unchanged', { action: 'unchanged' }],
    [
      'link all',
      {
        action: 'link',
        query: '*',
        linked: [
          row('.agents/skills'),
          row('.claude/skills'),
          row('.agents/skills', { skill: 'b' }),
        ],
        unchanged: [row('.claude/skills', { skill: 'c' })],
        removed: ['.agents/skills/x'],
        conflicts: [
          '.claude/skills/b',
          '.agents/skills/c (bar@1.0.0)',
        ],
        dirs,
        skipped: ['.kiro/skills (not a directory)'],
        gitignore: ['.claude/skills/.gitignore'],
      },
    ],
    [
      'link unchanged',
      {
        action: 'link',
        query: '#a',
        ...result,
        unchanged: [row('.agents/skills'), row('.claude/skills')],
        conflicts: ['.agents/skills/b'],
      },
    ],
    [
      'link removed only',
      {
        action: 'link',
        query: '#a',
        ...result,
        removed: ['.agents/skills/x', '.claude/skills/y'],
      },
    ],
  ]
  for (const [name, r] of cases) {
    t.matchSnapshot(human(r), `human ${name}`)
    if (r.action === 'list') {
      t.matchSnapshot(
        human(r, { colors: true }),
        `human colors ${name}`,
      )
      t.matchSnapshot(mermaid(r), `mermaid ${name}`)
      t.matchSnapshot(json(r), `json ${name}`)
    } else {
      t.equal(mermaid(r), human(r), `mermaid ${name}`)
      t.equal(json(r), r, `json ${name}`)
    }
  }
})

t.test('human colors', async t => {
  const { human } = Command.views
  const skill = (n: string, linked: string[]): Skill => ({
    name: 'foo',
    version: '1.0.0',
    id: joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    skill: n,
    path: `/s/${n}`,
    linked,
  })
  const r: SkillsResult = {
    action: 'list',
    project: 'my-project',
    // not read by the human view
    graph: {} as Graph,
    dirs: ['.agents/skills', '.claude/skills'],
    skills: [
      skill('a', ['.agents/skills', '.claude/skills']),
      skill('b', ['.claude/skills']),
      skill('c', []),
    ],
  }
  const out = human(r, { colors: true }).split('\n')
  t.equal(out[0], '\x1b[0mmy-project', 'reset, like vlt ls')
  t.equal(
    out[1],
    '├── \x1b[33ma (foo@1.0.0) (linked)\x1b[39m',
    'linked: yellow',
  )
  t.equal(
    out[2],
    '├── \x1b[33mb (foo@1.0.0) (linked in .claude/skills)\x1b[39m',
    'linked in some dirs: yellow',
  )
  t.equal(out[3], '└── c (foo@1.0.0)\x1b[0m', 'not linked: plain')
  t.notMatch(human(r), '\x1b', 'no colors')
})

t.test('json keys', async t => {
  const r: SkillsResult = {
    action: 'list',
    project: 'my-project',
    graph: {} as Graph,
    dirs: ['.agents/skills'],
    skills: [
      {
        name: 'skills',
        alias: 'vercelskills',
        version: '1.7.2',
        id: joinDepIDTuple(['registry', '', 'skills@1.7.2']),
        skill: 'find-skills',
        description: 'd',
        path: '/s',
        linked: [],
      },
    ],
  }
  const { skills } = Command.views.json(r) as {
    skills: Record<string, unknown>[]
  }
  t.strictSame(skills[0], {
    name: 'find-skills',
    description: 'd',
    'dependency-name': 'vercelskills',
    'package-id': joinDepIDTuple(['registry', '', 'skills@1.7.2']),
    path: '/s',
    linked: [],
  })
  t.strictSame(Object.keys(skills[0] ?? {}), [
    'name',
    'description',
    'dependency-name',
    'package-id',
    'path',
    'linked',
  ])
})

t.test('mermaid workspaces', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({ name: 'my-project' }),
    'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
    packages: {
      a: { 'package.json': JSON.stringify({ name: 'a' }) },
    },
  })
  t.chdir(dir)
  unload('project')
  t.teardown(() => unload('project'))
  const specOptions = {
    registry: 'https://registry.npmjs.org/',
    registries: { npm: 'https://registry.npmjs.org/' },
  }
  const graph = new Graph({
    ...specOptions,
    projectRoot: dir,
    mainManifest: { name: 'my-project', version: '1.0.0' },
    monorepo: Monorepo.load(dir),
  })
  const [ws] = [...graph.importers].filter(n => !n.mainImporter)
  if (!ws) throw new Error('no workspace')
  const x = graph.placePackage(
    ws,
    'prod',
    Spec.parse('x@1', specOptions),
    {
      name: 'x',
      version: '1.0.0',
    },
  )
  if (!x) throw new Error('failed to place x')
  const out = Command.views.mermaid({
    action: 'list',
    project: 'my-project',
    graph,
    dirs: ['.agents/skills'],
    skills: [
      {
        name: 'x',
        version: '1.0.0',
        id: x.id,
        skill: 's',
        path: '/s',
        linked: [],
      },
    ],
  })
  t.matchSnapshot(out, 'workspace under the project')
  t.match(out, /^a -->.*workspace:a/m, 'project to workspace edge')
})
