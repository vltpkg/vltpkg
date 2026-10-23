import * as fs from 'node:fs'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import {
  editGitignore,
  GITIGNORE_BEGIN as B,
  GITIGNORE_END as E,
  gitignoreNames,
} from '../../src/skills/gitignore.ts'

const read = (dir: string) =>
  readFileSync(resolve(dir, '.gitignore'), 'utf8')

t.test('creates the block', async t => {
  const dir = t.testdir({})
  t.equal(editGitignore(dir, { add: [], remove: ['x'] }), 'ok')
  t.notOk(existsSync(resolve(dir, '.gitignore')), 'nothing to add')
  t.equal(editGitignore(dir, { add: ['b', 'a'], remove: [] }), 'ok')
  t.equal(read(dir), `${B}\n/a\n/b\n${E}\n`)
})

t.test('merges w/ user lines', async t => {
  const dir = t.testdir({ '.gitignore': 'mine\n/tmp' })
  editGitignore(dir, { add: ['a'], remove: [] })
  t.equal(read(dir), `mine\n/tmp\n${B}\n/a\n${E}\n`, 'eol added')
  editGitignore(dir, { add: ['b'], remove: ['a'] })
  t.equal(read(dir), `mine\n/tmp\n${B}\n/b\n${E}\n`)
  editGitignore(dir, { add: [], remove: ['b'] })
  t.equal(read(dir), `mine\n/tmp\n${B}\n${E}\n`, 'emptied block kept')
})

t.test('writes only on change', async t => {
  const dir = t.testdir({ '.gitignore': `${B}\n/a\n${E}\n` })
  const writes: string[] = []
  const { editGitignore } = await t.mockImport<
    typeof import('../../src/skills/gitignore.ts')
  >('../../src/skills/gitignore.ts', {
    'node:fs': {
      ...fs,
      writeFileSync: (f: string) => writes.push(f),
    },
  })
  editGitignore(dir, { add: ['a'], remove: ['gone'] })
  editGitignore(dir, { add: [], remove: [] })
  t.strictSame(writes, [])
})

t.test('keeps CRLF', async t => {
  const dir = t.testdir({
    '.gitignore': `x\r\n${B}\r\n/a\r\n${E}\r\n`,
  })
  editGitignore(dir, { add: ['b'], remove: [] })
  t.equal(read(dir), `x\r\n${B}\r\n/a\r\n/b\r\n${E}\r\n`)
  const fresh = t.testdir({ '.gitignore': 'x\r\n' })
  editGitignore(fresh, { add: ['a'], remove: [] })
  t.equal(read(fresh), `x\r\n${B}\r\n/a\r\n${E}\r\n`)
})

t.test('block in the middle', async t => {
  const dir = t.testdir({
    '.gitignore': `top\n  ${B}  \n# note\n/a\n/c\n${E}\nafter\n`,
  })
  editGitignore(dir, { add: ['b', 'c'], remove: ['a'] })
  t.equal(
    read(dir),
    `top\n  ${B}  \n# note\n/c\n/b\n${E}\nafter\n`,
    'trimmed markers, other lines kept, new lines at the end',
  )
})

t.test('begin w/o end: new block', async t => {
  const dir = t.testdir({ '.gitignore': `${B}\n/a\n` })
  editGitignore(dir, { add: ['a'], remove: [] })
  t.equal(read(dir), `${B}\n/a\n${B}\n/a\n${E}\n`)
})

t.test('refuses a non-file .gitignore', async t => {
  const dir = t.testdir({
    link: { '.gitignore': t.fixture('symlink', '../real') },
    real: 'x',
    dir: { '.gitignore': {} },
  })
  t.equal(
    editGitignore(resolve(dir, 'link'), { add: ['a'], remove: [] }),
    'refused',
  )
  t.equal(
    readFileSync(resolve(dir, 'real'), 'utf8'),
    'x',
    'untouched',
  )
  t.equal(
    editGitignore(resolve(dir, 'dir'), { add: ['a'], remove: [] }),
    'refused',
  )
})

t.test('fs errors: refused', async t => {
  const dir = t.testdir({ '.gitignore': 'x' })
  const eacces = () => {
    throw Object.assign(new Error('nope'), { code: 'EACCES' })
  }
  for (const fn of ['readFileSync', 'writeFileSync']) {
    const { editGitignore } = await t.mockImport<
      typeof import('../../src/skills/gitignore.ts')
    >('../../src/skills/gitignore.ts', {
      'node:fs': { ...fs, [fn]: eacces },
    })
    t.equal(
      editGitignore(dir, { add: ['a'], remove: [] }),
      'refused',
      fn,
    )
  }
  t.equal(read(dir), 'x', 'untouched')
})

t.test('gitignoreNames', async t => {
  const cases: [
    string,
    Parameters<typeof t.testdir>[0] | undefined,
    string[],
  ][] = [
    ['missing', undefined, []],
    ['no block', '/a\n', []],
    ['unterminated', `${B}\n/a\n`, []],
    ['not a file', {}, []],
    [
      'CRLF, trimmed, block only, non-/ lines skipped',
      `/x\r\n  ${B}  \r\n/b\r\n# note\r\n /a \r\n${E}\r\n/y\r\n`,
      ['a', 'b'],
    ],
  ]
  for (const [name, gitignore, expect] of cases) {
    t.test(name, async t => {
      const dir = t.testdir(
        gitignore === undefined ? {} : { '.gitignore': gitignore },
      )
      t.strictSame([...gitignoreNames(dir)].sort(), expect)
    })
  }

  t.test('fs error: empty', async t => {
    const dir = t.testdir({ '.gitignore': `${B}\n/a\n${E}\n` })
    const { gitignoreNames } = await t.mockImport<
      typeof import('../../src/skills/gitignore.ts')
    >('../../src/skills/gitignore.ts', {
      'node:fs': {
        ...fs,
        readFileSync: () => {
          throw Object.assign(new Error('nope'), { code: 'EACCES' })
        },
      },
    })
    t.strictSame([...gitignoreNames(dir)], [])
  })
})
