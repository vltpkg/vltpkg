import { joinDepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import type { Skill, SkillRow } from '@vltpkg/graph'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { SkillsResult } from '../../src/commands/skills.ts'

type Call = {
  fn: string
  target?: string
  projectRoot?: string
  skillsDirs?: string[]
  apply?: boolean
}
let calls: Call[] = []
t.beforeEach(() => (calls = []))

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
    listSkills: async ({ target, projectRoot, skillsDirs }: Call) => {
      calls.push({ fn: 'list', target, projectRoot, skillsDirs })
      return { skills: [], dirs: ['.agents/skills'] }
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
      return result
    },
  },
})

const run = (
  positionals: string[],
  target?: string,
  skillsDir?: string[],
) =>
  Command.command({
    projectRoot: '/project',
    positionals,
    values: {},
    options: {},
    get: (k: string) =>
      k === 'target' ? target
      : k === 'skills-dir' ? skillsDir
      : undefined,
  } as unknown as LoadedConfig)

t.test('usage', async t => {
  t.matchSnapshot(Command.usage().usage(), 'usage')
})

t.test('command', async t => {
  const list = {
    action: 'list',
    skills: [],
    dirs: ['.agents/skills'],
  }
  t.strictSame(await run([]), list)
  t.strictSame(await run(['ls', '#foo']), list)
  t.strictSame(await run(['link']), { action: 'link', ...result })
  await run(['link', '#foo'])
  await run(['link', '#foo'], '#bar', ['.claude/skills'])
  await run(['list'], '#bar', [])
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
  const { human, json } = Command.views
  const cases: [string, SkillsResult][] = [
    ['list empty', { action: 'list', skills: [], dirs }],
    [
      'list no dirs',
      {
        action: 'list',
        skills: [skill({ linked: ['.agents/skills'] })],
        dirs: [],
      },
    ],
    [
      'list skipped',
      {
        action: 'list',
        skills: [],
        dirs: [],
        skipped: ['.claude/skills (outside the project)'],
      },
    ],
    [
      'list one',
      {
        action: 'list',
        skills: [skill({ description: 'does a' })],
        dirs,
      },
    ],
    [
      'list many',
      {
        action: 'list',
        dirs,
        skills: [
          skill({ linked: dirs }),
          skill({ skill: 'b', linked: ['.claude/skills'] }),
          skill({
            name: '@s/bar',
            version: undefined,
            skill: 'bar',
          }),
        ],
      },
    ],
    [
      'list aliased',
      {
        action: 'list',
        dirs: ['.agents/skills'],
        skills: [
          skill({
            alias: 'vercelskills',
            name: 'skills',
            version: '1.7.2',
            skill: 'find-skills',
            linked: ['.agents/skills'],
          }),
          skill({
            alias: 'mine',
            name: 'theirs',
            version: undefined,
            skill: 'x',
          }),
        ],
      },
    ],
    ['link nothing', { action: 'link', ...result }],
    [
      'link one',
      {
        action: 'link',
        ...result,
        linked: [row('.agents/skills')],
      },
    ],
    [
      'link all',
      {
        action: 'link',
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
        ...result,
        unchanged: [row('.agents/skills'), row('.claude/skills')],
        conflicts: ['.agents/skills/b'],
      },
    ],
    [
      'link removed only',
      {
        action: 'link',
        ...result,
        removed: ['.agents/skills/x', '.claude/skills/y'],
      },
    ],
  ]
  for (const [name, r] of cases) {
    t.matchSnapshot(human(r), `human ${name}`)
    t.equal(json(r), r, `json ${name}`)
  }
})
