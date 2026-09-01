import t from 'tap'
import { describeSource, LOCKFILE_NAME } from '../src/sources.ts'
import type { Source } from '../src/sources.ts'

const EMPTY_LOCKFILE = {
  lockfileVersion: 1,
  options: {},
  nodes: {},
  edges: {},
}

/** Load `sources.ts` with `@vltpkg/git`'s spawn stubbed out. */
const withGit = async (
  spawn: (args: string[]) => Promise<{ stdout: string }>,
) =>
  t.mockImport<typeof import('../src/sources.ts')>(
    '../src/sources.ts',
    { '@vltpkg/git': { spawn } },
  )

t.test(
  'describeSource names the side for error messages',
  async t => {
    t.equal(describeSource({ kind: 'git', ref: 'main' }), 'main')
    t.equal(
      describeSource({ kind: 'file', path: '/a.json' }),
      '/a.json',
    )
    t.equal(describeSource({ kind: 'worktree' }), 'working tree')
  },
)

t.test(
  'git ref, with the project root below the git root',
  async t => {
    const seen: string[][] = []
    const { readSource } = await withGit(async args => {
      seen.push(args)
      return args[0] === 'rev-parse' ?
          { stdout: 'sub/dir/\n' }
        : { stdout: JSON.stringify(EMPTY_LOCKFILE) }
    })
    const data = await readSource(
      { kind: 'git', ref: 'main' },
      '/repo/sub/dir',
    )
    t.strictSame(data, EMPTY_LOCKFILE)
    t.strictSame(seen[0], ['rev-parse', '--show-prefix'])
    t.strictSame(
      seen[1],
      ['show', `main:sub/dir/${LOCKFILE_NAME}`],
      'the prefix is asked for, not assumed',
    )
  },
)

t.test(
  'a ref with no lockfile diffs as empty, not an error',
  async t => {
    const { readSource } = await withGit(async args => {
      if (args[0] === 'rev-parse') return { stdout: '' }
      throw new Error('The git reference could not be found')
    })
    t.strictSame(
      await readSource({ kind: 'git', ref: 'old' }, '/repo'),
      EMPTY_LOCKFILE,
      'so "the lockfile was introduced here" renders as a diff',
    )
  },
)

t.test('version and JSON errors name which side failed', async t => {
  const bad = async (stdout: string) => {
    const { readSource } = await withGit(async args =>
      args[0] === 'rev-parse' ? { stdout: '' } : { stdout },
    )
    return readSource({ kind: 'git', ref: 'v0' }, '/repo')
  }
  await t.rejects(bad('{ not json'), {
    message: /invalid lockfile JSON/,
    cause: { found: 'v0' },
  })
  await t.rejects(
    bad(JSON.stringify({ ...EMPTY_LOCKFILE, lockfileVersion: 99 })),
    {
      message: /unsupported lockfile version/,
      cause: { name: 'v0' },
    },
    'a ref predating a format bump is an ordinary thing to hit',
  )
})

t.test('worktree and file', async t => {
  const dir = t.testdir({
    [LOCKFILE_NAME]: JSON.stringify(EMPTY_LOCKFILE),
    'other.json': JSON.stringify(EMPTY_LOCKFILE),
  })
  const { readSource } = await import('../src/sources.ts')
  t.strictSame(
    await readSource({ kind: 'worktree' }, dir),
    EMPTY_LOCKFILE,
  )
  t.strictSame(
    await readSource(
      { kind: 'file', path: `${dir}/other.json` },
      dir,
    ),
    EMPTY_LOCKFILE,
  )
  t.strictSame(
    await readSource({ kind: 'worktree' }, `${dir}/nope`),
    EMPTY_LOCKFILE,
    'no lockfile yet is an empty diff, not a failure',
  )
  await t.rejects(
    readSource({ kind: 'file', path: `${dir}/nope.json` }, dir),
    /lockfile not found/,
    'but an explicitly named file that is missing is an error',
  )
})

t.test('Source covers every input kind', async t => {
  const kinds: Source['kind'][] = ['worktree', 'git', 'file']
  t.equal(kinds.length, 3)
})
