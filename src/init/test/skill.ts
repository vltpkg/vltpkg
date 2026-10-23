import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { initSkill, isSkillName } from '../src/skill.ts'

const pj = (o: Record<string, unknown>, indent = 2) =>
  JSON.stringify(o, null, indent) + '\n'

t.test('isSkillName', async t => {
  for (const n of ['a', '1', 'my-skill-2', 'a'.repeat(64)]) {
    t.equal(isSkillName(n), true, n)
  }
  for (const n of [
    '',
    'A',
    'a--b',
    '-a',
    'a-',
    'a_b',
    'a.b',
    '../x',
    'a'.repeat(65),
  ]) {
    t.equal(isSkillName(n), false, n)
  }
})

t.test('named', async t => {
  const manifest = pj({ name: 'my-tool', version: '1.0.0' })
  const dir = t.testdir({ 'package.json': manifest })
  const path = resolve(dir, 'skills/my-skill/SKILL.md')
  t.strictSame(initSkill({ cwd: dir, name: 'my-skill' }), {
    skill: { name: 'my-skill', path },
    package: 'my-tool',
  })
  t.matchSnapshot(readFileSync(path, 'utf8'), 'template')
  t.equal(
    readFileSync(resolve(dir, 'package.json'), 'utf8'),
    manifest,
    'no files: package.json untouched',
  )
})

t.test('root', async t => {
  for (const name of ['my-tool', '@s/my-tool']) {
    t.test(name, async t => {
      const dir = t.testdir({ 'package.json': pj({ name }) })
      const path = resolve(dir, 'SKILL.md')
      t.strictSame(initSkill({ cwd: dir }), {
        skill: { name: 'my-tool', path },
        package: name,
      })
      t.match(readFileSync(path, 'utf8'), /^---\nname: my-tool\n/)
    })
  }

  for (const [label, files] of [
    ['no package.json', {}],
    ['no name', { 'package.json': pj({}) }],
  ] as const) {
    t.test(label, async t => {
      const dir = t.testdir(files)
      t.throws(() => initSkill({ cwd: dir }), {
        message:
          'No package name to name the skill after: pass a <name>',
        cause: { code: 'EUSAGE' },
      })
      t.equal(existsSync(resolve(dir, 'SKILL.md')), false)
    })
  }

  for (const name of ['lodash.merge', 'MyTool']) {
    t.test(`not a skill name: ${name}`, async t => {
      const dir = t.testdir({ 'package.json': pj({ name }) })
      t.throws(() => initSkill({ cwd: dir }), {
        message:
          'Package name is not a valid skill name: pass a <name>',
        cause: { code: 'EUSAGE', found: name },
      })
      t.equal(existsSync(resolve(dir, 'SKILL.md')), false)
    })
  }
})

t.test('invalid name', async t => {
  const dir = t.testdir({ 'package.json': pj({ name: 'x' }) })
  for (const name of ['', 'My-Skill', '../x', 'a--b']) {
    t.throws(() => initSkill({ cwd: dir, name }), {
      message:
        'Invalid skill name: use 1-64 lowercase letters, digits and single hyphens, no leading or trailing hyphen',
      cause: { code: 'EUSAGE', found: name },
    })
  }
  t.equal(existsSync(resolve(dir, 'skills')), false)
})

t.test('invalid package.json', async t => {
  const dir = t.testdir({ 'package.json': '{' })
  t.throws(() => initSkill({ cwd: dir, name: 'x' }), {
    message: 'Could not read package.json file',
  })
  t.equal(existsSync(resolve(dir, 'skills')), false)
  t.throws(
    () => initSkill({ cwd: dir, name: 'X' }),
    { cause: { code: 'EUSAGE' } },
    'name checked first',
  )
})

t.test('not a directory on the way', async t => {
  t.test('skills is a file', async t => {
    const dir = t.testdir({ skills: 'x' })
    t.throws(() => initSkill({ cwd: dir, name: 'x' }), {
      message:
        'Cannot create skill: not a directory (symlinks are not followed)',
      cause: { code: 'EUSAGE', found: resolve(dir, 'skills') },
    })
    t.equal(readFileSync(resolve(dir, 'skills'), 'utf8'), 'x')
  })

  t.test('skills/<name> is a file', async t => {
    const dir = t.testdir({ skills: { x: 'x' } })
    t.throws(() => initSkill({ cwd: dir, name: 'x' }), {
      cause: { code: 'EUSAGE', found: resolve(dir, 'skills/x') },
    })
  })

  t.test(
    'symlinks',
    { skip: process.platform === 'win32' && 'posix symlinks' },
    async t => {
      t.test('skills', async t => {
        const dir = t.testdir({
          real: {},
          skills: t.fixture('symlink', 'real'),
        })
        t.throws(() => initSkill({ cwd: dir, name: 'x' }), {
          cause: { code: 'EUSAGE', found: resolve(dir, 'skills') },
        })
        t.equal(existsSync(resolve(dir, 'real/x')), false)
      })
      t.test('skills/<name>', async t => {
        const dir = t.testdir({
          real: {},
          skills: { x: t.fixture('symlink', '../real') },
        })
        t.throws(() => initSkill({ cwd: dir, name: 'x' }), {
          cause: { code: 'EUSAGE', found: resolve(dir, 'skills/x') },
        })
        t.equal(existsSync(resolve(dir, 'real/SKILL.md')), false)
      })
    },
  )
})

t.test('exists: nothing changed', async t => {
  const manifest = pj({ name: 'my-tool', files: ['dist'] })
  const cases: [
    string,
    NonNullable<Parameters<typeof t.testdir>[0]>,
  ][] = [
    ['file', { 'SKILL.md': 'mine' }],
    ['dir', { 'SKILL.md': {} }],
  ]
  if (process.platform !== 'win32') {
    cases.push([
      'dangling symlink',
      { 'SKILL.md': t.fixture('symlink', 'nope') },
    ])
  }
  for (const [label, skill] of cases) {
    t.test(label, async t => {
      const dir = t.testdir({
        'package.json': manifest,
        skills: { x: skill },
      })
      const path = resolve(dir, 'skills/x/SKILL.md')
      t.strictSame(initSkill({ cwd: dir, name: 'x' }), {
        skill: { name: 'x', path },
        package: 'my-tool',
        exists: true,
      })
      t.equal(
        readFileSync(resolve(dir, 'package.json'), 'utf8'),
        manifest,
      )
    })
  }

  t.test('root', async t => {
    const dir = t.testdir({
      'package.json': manifest,
      'SKILL.md': 'mine',
    })
    t.match(initSkill({ cwd: dir }), { exists: true })
    t.equal(readFileSync(resolve(dir, 'SKILL.md'), 'utf8'), 'mine')
  })
})

t.test('files', async t => {
  const covered = [
    'skills',
    'skills/',
    'skills/**',
    'skills/*/SKILL.md',
    '**',
    '*',
  ]
  for (const entry of covered) {
    t.test(`covered: ${entry}`, async t => {
      const manifest = pj({ name: 'my-tool', files: [entry] })
      const dir = t.testdir({ 'package.json': manifest })
      t.equal(initSkill({ cwd: dir, name: 'x' }).manifest, undefined)
      t.equal(
        readFileSync(resolve(dir, 'package.json'), 'utf8'),
        manifest,
      )
    })
  }

  const added: unknown[][] = [
    ['dist'],
    ['./skills'],
    ['skills/other'],
    ['!skills'],
    [],
    [1],
  ]
  for (const files of added) {
    t.test(`added: ${JSON.stringify(files)}`, async t => {
      const dir = t.testdir({
        'package.json': pj({ name: 'my-tool', files }),
      })
      t.strictSame(initSkill({ cwd: dir, name: 'x' }).manifest, {
        path: resolve(dir, 'package.json'),
        added: 'skills',
      })
      t.strictSame(
        JSON.parse(
          readFileSync(resolve(dir, 'package.json'), 'utf8'),
        ),
        { name: 'my-tool', files: [...files, 'skills'] },
      )
    })
  }

  t.test('root', async t => {
    const dir = t.testdir({
      a: { 'package.json': pj({ name: 'a', files: ['*.md'] }) },
      b: { 'package.json': pj({ name: 'b', files: ['dist'] }, 4) },
    })
    t.equal(initSkill({ cwd: resolve(dir, 'a') }).manifest, undefined)
    t.strictSame(initSkill({ cwd: resolve(dir, 'b') }).manifest, {
      path: resolve(dir, 'b/package.json'),
      added: 'SKILL.md',
    })
    t.equal(
      readFileSync(resolve(dir, 'b/package.json'), 'utf8'),
      pj({ name: 'b', files: ['dist', 'SKILL.md'] }, 4),
      'indent kept',
    )
  })
})

t.test('default cwd', async t => {
  const dir = t.testdir({})
  t.chdir(dir)
  t.strictSame(initSkill({ name: 'x' }), {
    skill: { name: 'x', path: resolve(dir, 'skills/x/SKILL.md') },
  })
  t.throws(() => initSkill(), { cause: { code: 'EUSAGE' } })
})
