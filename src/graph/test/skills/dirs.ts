import * as fs from 'node:fs'
import { existsSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import {
  AGENT_ROOTS,
  assertSkillsDirs,
  skillsDirs,
} from '../../src/skills/dirs.ts'
import type { SkillsDirsOptions } from '../../src/skills/dirs.ts'
import { norm } from '../../src/skills/mounts.ts'

type Dir = NonNullable<Parameters<typeof t.testdir>[0]>

// project under a dir w/ `outside/`
const project = (t: Test, files: Record<string, Dir> = {}) =>
  resolve(
    t.testdir({
      outside: { skills: {} },
      p: { 'vlt.json': '{}', ...files },
    }),
    'p',
  )

const dirs = (
  projectRoot: string,
  o: Omit<SkillsDirsOptions, 'projectRoot'> = {},
) => skillsDirs({ projectRoot, env: {}, ...o })

const targets = (projectRoot: string, o = {}) =>
  dirs(projectRoot, o).targets.map(d => d.dir)

t.test('AGENT_ROOTS', async t => {
  t.equal(AGENT_ROOTS.length, 49)
  t.strictSame(
    AGENT_ROOTS.map(([m]) => m),
    AGENT_ROOTS.map(([m]) => m).sort(),
    'sorted',
  )
  for (const [m, d] of AGENT_ROOTS) t.ok(d.startsWith(`${m}/`), m)
})

t.test('detect', async t => {
  t.test('no marker: .agents/skills', async t => {
    const dir = project(t)
    t.strictSame(targets(dir), ['.agents/skills'])
    t.notOk(existsSync(resolve(dir, '.agents')), 'not created')
    const r = dirs(dir, { create: true })
    t.strictSame(
      r.targets.map(d => d.dir),
      ['.agents/skills'],
    )
    t.ok(existsSync(resolve(dir, '.agents/skills')), 'created')
    t.match(r.targets[0]?.id, /^\d+:\d+$/)
    t.equal(
      r.targets[0]?.real,
      resolve(realpathSync(dir), '.agents/skills'),
    )
  })

  t.test('agent folders', async t => {
    t.strictSame(targets(project(t, { '.claude': {} })), [
      '.agents/skills',
      '.claude/skills',
    ])
    t.strictSame(
      targets(project(t, { '.kiro': {}, '.claude': {} })),
      ['.agents/skills', '.claude/skills', '.kiro/skills'],
      'sorted after .agents/skills',
    )
    t.strictSame(
      targets(
        project(t, {
          real: {},
          '.claude': t.fixture('symlink', './real'),
        }),
      ),
      ['.agents/skills', '.claude/skills'],
      'symlinked marker',
    )
    t.strictSame(
      targets(
        project(t, { '.tabnine': {}, '.posit': { assistant: {} } }),
      ),
      [
        '.agents/skills',
        '.posit/assistant/skills',
        '.tabnine/agent/skills',
      ],
      'nested',
    )
    t.strictSame(
      targets(project(t, { '.posit': {}, '.qoder': {} })),
      ['.agents/skills', '.qoder/skills'],
      '.posit alone: nothing; shared row once',
    )
  })

  t.test('not markers', async t => {
    const dir = project(t, {
      '.claude': 'a file',
      '.github': {},
      '.cursor': {},
      skills: {},
      data: {},
      agent: {},
    })
    t.strictSame(targets(dir), ['.agents/skills'])
  })

  t.test('env', async t => {
    const dir = project(t)
    const env = (env: Record<string, string>) => targets(dir, { env })
    t.strictSame(env({ CLAUDECODE: '1' }), [
      '.agents/skills',
      '.claude/skills',
    ])
    t.strictSame(env({ CLAUDE_CODE: '1' }), [
      '.agents/skills',
      '.claude/skills',
    ])
    t.strictSame(env({ CLAUDECODE: '' }), ['.agents/skills'])
    t.strictSame(env({ AI_AGENT: 'claude-code_1_agent' }), [
      '.agents/skills',
    ])
  })

  t.test('default env: process.env', async t => {
    const dir = project(t)
    const { CLAUDECODE: _, CLAUDE_CODE: __, ...env } = process.env
    t.intercept(process, 'env', { value: env })
    const detect = () =>
      skillsDirs({ projectRoot: dir }).targets.map(d => d.dir)
    t.strictSame(detect(), ['.agents/skills'])
    t.intercept(process, 'env', {
      value: { ...env, CLAUDECODE: '1' },
    })
    t.strictSame(detect(), ['.agents/skills', '.claude/skills'])
  })

  t.test('existing .<name>/skills dirs', async t => {
    const dir = project(t, {
      '.foo': { skills: {} },
      '.github': { skills: {} },
      '.bar': {},
      '.agents': { skills: {} },
    })
    t.strictSame(targets(dir, { create: true }), [
      '.agents/skills',
      '.foo/skills',
      '.github/skills',
    ])
    t.notOk(existsSync(resolve(dir, '.bar/skills')), 'never created')
  })
})

t.test('scan', async t => {
  const dir = project(t, {
    '.tabnine': { agent: { skills: {} } },
    '.claude': { skills: {} },
    '.kiro': {},
    skills: {},
  })
  const r = dirs(dir, { configured: ['x/skills'], create: true })
  t.strictSame(
    r.targets.map(d => d.dir),
    ['x/skills'],
  )
  t.strictSame(
    r.scan.map(d => d.dir),
    ['x/skills', '.claude/skills', '.tabnine/agent/skills'],
    'targets first, then existing dirs; ./skills not scanned',
  )
  t.notOk(existsSync(resolve(dir, '.kiro/skills')), 'not created')
  t.strictSame(
    dirs(dir, { configured: ['skills'] }).scan.map(d => d.dir),
    ['skills', '.claude/skills', '.tabnine/agent/skills'],
    './skills when configured',
  )
  t.strictSame(
    dirs(dir).scan.map(d => d.dir),
    ['.claude/skills', '.tabnine/agent/skills'],
    'missing targets not scanned',
  )
})

t.test('configured', async t => {
  const dir = project(t, { '.claude': {} })
  t.strictSame(
    targets(dir, {
      configured: ['b/skills', './a/', resolve(dir, 'c'), 'b/skills'],
      env: { CLAUDECODE: '1' },
    }),
    ['b/skills', 'a', 'c'],
    'replaces detection, order kept',
  )
  t.strictSame(targets(dir, { configured: [] }), [])
  t.strictSame(targets(dir, { configured: [''] }), [])
  for (const bad of [
    '../x',
    resolve(dir, '../outside'),
    '.',
    'node_modules',
    'a/node_modules/b',
    resolve(dir, 'node_modules/x'),
  ]) {
    t.throws(() => targets(dir, { configured: ['a', bad] }), {
      message:
        'Invalid --skills-dir: must be a dir inside the project, not in node_modules',
      cause: { code: 'EUSAGE', found: bad },
    })
    t.throws(() => assertSkillsDirs(dir, [bad]), {
      cause: { code: 'EUSAGE', found: bad },
    })
  }
  t.doesNotThrow(() => assertSkillsDirs(dir, undefined))
  t.doesNotThrow(() => assertSkillsDirs(dir, ['', 'a/b']))
})

t.test('symlinks', async t => {
  t.test('same dir once', async t => {
    const dir = project(t, {
      '.agents': { skills: {} },
      '.claude': {
        skills: t.fixture('symlink', '../.agents/skills'),
      },
    })
    const r = dirs(dir, { create: true })
    t.strictSame(
      r.targets.map(d => d.dir),
      ['.agents/skills'],
    )
    t.strictSame(
      r.scan.map(d => d.dir),
      ['.agents/skills'],
    )
    t.strictSame(r.skipped, [])
  })

  t.test('symlinked dir: real path', async t => {
    const dir = project(t, {
      real: {},
      '.agents': { skills: t.fixture('symlink', '../real') },
    })
    t.equal(
      dirs(dir).targets[0]?.real,
      resolve(realpathSync(dir), 'real'),
    )
  })

  t.test('outside the project', async t => {
    const dir = project(t, {
      '.claude': t.fixture('symlink', '../outside'),
      '.kiro': {
        skills: t.fixture('symlink', '../../outside/skills'),
      },
    })
    const r = dirs(dir, { create: true })
    t.strictSame(
      r.targets.map(d => d.dir),
      ['.agents/skills'],
    )
    t.strictSame(r.skipped, [
      '.claude/skills (outside the project)',
      '.kiro/skills (outside the project)',
    ])
    t.strictSame(
      r.scan.map(d => d.dir),
      ['.agents/skills'],
      'dropped from scan too',
    )
    t.strictSame(
      fs.readdirSync(resolve(dir, '../outside/skills')),
      [],
      'nothing created outside',
    )
  })

  t.test('marker symlinked outside: no skills dir made', async t => {
    const dir = resolve(
      t.testdir({
        outside: {},
        p: {
          'vlt.json': '{}',
          '.claude': t.fixture('symlink', '../outside'),
        },
      }),
      'p',
    )
    const r = dirs(dir, { create: true })
    t.strictSame(r.skipped, ['.claude/skills (outside the project)'])
    t.notOk(existsSync(resolve(dir, '../outside/skills')))
  })

  t.test('into node_modules', async t => {
    const dir = project(t, {
      node_modules: { skills: {} },
      '.claude': t.fixture('symlink', './node_modules'),
      '.kiro': { skills: t.fixture('symlink', '../node_modules') },
    })
    const r = dirs(dir, { create: true })
    t.strictSame(r.skipped, [
      '.claude/skills (inside node_modules)',
      '.kiro/skills (inside node_modules)',
    ])
    t.strictSame(
      r.scan.map(d => d.dir),
      ['.agents/skills'],
    )
    t.strictSame(fs.readdirSync(resolve(dir, 'node_modules')), [
      'skills',
    ])
  })

  t.test('symlink to the project root', async t => {
    const dir = project(t, {
      '.agents': { skills: t.fixture('symlink', '../') },
    })
    t.strictSame(dirs(dir).skipped, [
      '.agents/skills (outside the project)',
    ])
  })
})

t.test('not a directory', async t => {
  const dir = project(t, { '.agents': 'a file' })
  t.strictSame(dirs(dir, { create: true }).skipped, [
    '.agents/skills (not a directory)',
  ])
  const dangling = project(t, {
    '.agents': t.fixture('symlink', './missing'),
  })
  t.strictSame(dirs(dangling, { create: true }).skipped, [
    '.agents/skills (not a directory)',
  ])
  const toFile = project(t, {
    '.agents': t.fixture('symlink', './vlt.json'),
  })
  t.strictSame(dirs(toFile).skipped, [
    '.agents/skills (not a directory)',
  ])
})

t.test('case variants', async t => {
  const dir = project(t, { '.claude': { skills: {} } })
  const insensitive = existsSync(resolve(dir, '.CLAUDE'))
  t.strictSame(
    targets(dir, {
      configured: ['.claude/skills', '.Claude/skills'],
      create: true,
    }),
    insensitive ?
      ['.claude/skills']
    : ['.claude/skills', '.Claude/skills'],
  )
})

t.test('create false', async t => {
  const dir = project(t, { '.claude': {} })
  const r = dirs(dir)
  t.strictSame(r.targets, [
    {
      dir: '.agents/skills',
      real: resolve(realpathSync(dir), '.agents/skills'),
    },
    {
      dir: '.claude/skills',
      real: resolve(realpathSync(dir), '.claude/skills'),
    },
  ])
  t.strictSame(r.scan, [])
  t.notOk(existsSync(resolve(dir, '.agents')))
  t.notOk(existsSync(resolve(dir, '.claude/skills')))
})

t.test('mkdir errors', async t => {
  t.test('EEXIST race: ok', async t => {
    const { skillsDirs } = await t.mockImport<
      typeof import('../../src/skills/dirs.ts')
    >('../../src/skills/dirs.ts', {
      'node:fs': {
        ...fs,
        mkdirSync: (p: string) => {
          fs.mkdirSync(p)
          throw Object.assign(new Error('exists'), { code: 'EEXIST' })
        },
      },
    })
    const dir = project(t)
    t.strictSame(
      skillsDirs({
        projectRoot: dir,
        env: {},
        create: true,
      }).targets.map(d => d.dir),
      ['.agents/skills'],
    )
  })

  t.test('other errors: skipped', async t => {
    const { skillsDirs } = await t.mockImport<
      typeof import('../../src/skills/dirs.ts')
    >('../../src/skills/dirs.ts', {
      'node:fs': {
        ...fs,
        mkdirSync: () => {
          throw Object.assign(new Error('nope'), { code: 'EACCES' })
        },
      },
    })
    const dir = project(t)
    t.strictSame(
      skillsDirs({ projectRoot: dir, env: {}, create: true }),
      { targets: [], scan: [], skipped: ['.agents/skills (EACCES)'] },
    )
  })
})

t.test('unreadable dir: skipped', async t => {
  const { skillsDirs } = await t.mockImport<
    typeof import('../../src/skills/dirs.ts')
  >('../../src/skills/dirs.ts', {
    'node:fs': {
      ...fs,
      lstatSync: (p: string, o?: fs.StatOptions) => {
        if (p.includes('.pgdata')) {
          throw Object.assign(new Error('nope'), { code: 'EACCES' })
        }
        return fs.lstatSync(p, o)
      },
    },
  })
  const dir = project(t, { '.pgdata': {}, '.agents': { skills: {} } })
  const r = skillsDirs({ projectRoot: dir, env: {} })
  t.strictSame(
    r.scan.map(d => d.dir),
    ['.agents/skills'],
    'scan: silent',
  )
  t.strictSame(
    skillsDirs({
      projectRoot: dir,
      configured: ['.pgdata/skills'],
      create: true,
    }).skipped,
    ['.pgdata/skills (EACCES)'],
  )
})

t.test('no inode: compared by path', async t => {
  const { skillsDirs } = await t.mockImport<
    typeof import('../../src/skills/dirs.ts')
  >('../../src/skills/dirs.ts', {
    'node:fs': {
      ...fs,
      statSync: (p: string, o?: fs.StatOptions) =>
        o?.bigint ?
          { ...fs.statSync(p, { bigint: true }), ino: 0n }
        : fs.statSync(p, o),
    },
  })
  const dir = project(t, {
    '.agents': { skills: {} },
    '.kiro': { skills: {} },
    '.claude': { skills: t.fixture('symlink', '../.agents/skills') },
  })
  const { targets } = skillsDirs({ projectRoot: dir, env: {} })
  t.strictSame(
    targets.map(d => [d.dir, d.id]),
    [
      [
        '.agents/skills',
        norm(resolve(realpathSync(dir), '.agents/skills')),
      ],
      [
        '.kiro/skills',
        norm(resolve(realpathSync(dir), '.kiro/skills')),
      ],
    ],
  )
})
