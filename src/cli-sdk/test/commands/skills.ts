import { joinDepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import type { Skill } from '@vltpkg/graph'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { SkillsResult } from '../../src/commands/skills.ts'

type Call = { fn: string; target?: string; projectRoot?: string }
let calls: Call[] = []
t.beforeEach(() => (calls = []))

const result = {
  linked: [],
  unchanged: [],
  removed: [],
  conflicts: [],
}

const Command = await t.mockImport<
  typeof import('../../src/commands/skills.ts')
>('../../src/commands/skills.ts', {
  '@vltpkg/graph': {
    listSkills: async ({ target, projectRoot }: Call) => {
      calls.push({ fn: 'list', target, projectRoot })
      return []
    },
    linkSkills: async ({ target, projectRoot }: Call) => {
      calls.push({ fn: 'link', target, projectRoot })
      return result
    },
    unlinkSkills: async ({ target, projectRoot }: Call) => {
      calls.push({ fn: 'unlink', target, projectRoot })
      return { removed: [] }
    },
  },
})

const run = (positionals: string[], target?: string) =>
  Command.command({
    projectRoot: '/project',
    positionals,
    values: {},
    options: {},
    get: (k: string) => (k === 'target' ? target : undefined),
  } as unknown as LoadedConfig)

t.test('usage', async t => {
  t.matchSnapshot(Command.usage().usage(), 'usage')
})

t.test('command', async t => {
  t.strictSame(await run([]), { action: 'list', skills: [] })
  t.strictSame(await run(['ls', '#foo']), {
    action: 'list',
    skills: [],
  })
  t.strictSame(await run(['link']), { action: 'link', ...result })
  await run(['link', '#foo'])
  await run(['link', '#foo'], '#bar')
  t.strictSame(await run(['unlink']), {
    action: 'unlink',
    removed: [],
  })
  await run(['unlink', '#foo'])
  await run(['list'], '#bar')
  t.strictSame(calls, [
    { fn: 'list', target: undefined, projectRoot: '/project' },
    { fn: 'list', target: '#foo', projectRoot: '/project' },
    { fn: 'link', target: ':not(:malware)', projectRoot: '/project' },
    { fn: 'link', target: '#foo', projectRoot: '/project' },
    { fn: 'link', target: '#bar', projectRoot: '/project' },
    { fn: 'unlink', target: undefined, projectRoot: '/project' },
    { fn: 'unlink', target: '#foo', projectRoot: '/project' },
    { fn: 'list', target: '#bar', projectRoot: '/project' },
  ])
  await t.rejects(run(['#foo']), {
    message: 'Unknown skills subcommand',
    cause: { code: 'EUSAGE', found: '#foo' },
  })
})

t.test('views', async t => {
  const skill = (s: Partial<Skill>): Skill => ({
    name: 'foo',
    version: '1.0.0',
    id: joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    skill: 'a',
    path: '/project/node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/skills/a',
    mount: 'skills/foo/a',
    linked: false,
    ...s,
  })
  const { human, json } = Command.views
  const cases: [string, SkillsResult][] = [
    ['list empty', { action: 'list', skills: [] }],
    [
      'list one',
      { action: 'list', skills: [skill({ description: 'does a' })] },
    ],
    [
      'list many',
      {
        action: 'list',
        skills: [
          skill({ linked: true }),
          skill({
            name: '@s/bar',
            version: undefined,
            skill: 'bar',
            mount: 'skills/@s/bar/bar',
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
        linked: [skill({ linked: true })],
      },
    ],
    [
      'link all',
      {
        action: 'link',
        linked: [
          skill({ linked: true }),
          skill({ skill: 'b', mount: 'skills/foo/b', linked: true }),
        ],
        unchanged: [skill({ linked: true })],
        removed: ['skills/gone/x'],
        conflicts: ['skills/bar/b', 'skills/bar/c'],
      },
    ],
    [
      'link unchanged',
      {
        action: 'link',
        ...result,
        unchanged: [skill({ linked: true })],
        conflicts: ['skills/bar/b'],
      },
    ],
    [
      'link removed only',
      {
        action: 'link',
        ...result,
        removed: ['skills/gone/x', 'skills/gone/y'],
      },
    ],
    ['unlink nothing', { action: 'unlink', removed: [] }],
    ['unlink one', { action: 'unlink', removed: ['skills/foo/a'] }],
    [
      'unlink many',
      { action: 'unlink', removed: ['skills/foo/a', 'skills/foo/b'] },
    ],
  ]
  for (const [name, r] of cases) {
    t.matchSnapshot(human(r), `human ${name}`)
    t.equal(json(r), r, `json ${name}`)
  }
})
