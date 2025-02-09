import t, { type Test } from 'tap'
import { join, parse } from 'path'
import { tmpdir } from 'os'
import { find, type FindOpts } from '../src/find.ts'
import { type GitOptions } from '../src/index.ts'

t.test('find the git dir many folders up', t => {
  const root = t.testdir({
    '.git': { index: 'hello' },
    a: { b: { c: { d: { e: {} } } } },
  })
  return t.resolveMatch(find({ cwd: join(root, 'a/b/c/d/e') }), root)
})

t.test('stop before root dir', t => {
  const root = t.testdir({
    '.git': { index: 'hello' },
    a: { b: { c: { d: { e: {} } } } },
  })
  return t.resolveMatch(
    find({ cwd: join(root, 'a/b/c/d/e'), root: join(root, 'a') }),
    null,
  )
})

t.test('stop at root dir', t => {
  const root = t.testdir({
    '.git': { index: 'hello' },
    a: { b: { c: { d: { e: {} } } } },
  })
  return t.resolveMatch(
    find({ cwd: join(root, 'a/b/c/d/e'), root }),
    root,
  )
})

t.test('find the git dir at current level', t => {
  const cwd = t.testdir({
    '.git': { index: 'hello' },
  })
  return t.resolveMatch(find({ cwd }), cwd)
})

t.test('no git dir to find', t => {
  // this will fail if your tmpdir is in a git repo, I suppose
  return t.resolveMatch(find({ cwd: tmpdir() }), null)
})

t.test('default to cwd', t => {
  const dir = process.cwd()
  t.teardown(() => process.chdir(dir))
  process.chdir(tmpdir())
  return t.resolveMatch(find(), null)
})

t.test('mock is', async t => {
  const cwd = tmpdir()
  const { root } = parse(cwd)

  const mockFind = async (t: Test, opts?: GitOptions) => {
    const seen: (string | undefined)[] = []
    const { find: mocked } = await t.mockImport('../src/find.ts', {
      '../src/is.js': {
        is: async (o: GitOptions) => {
          seen.push(o.cwd)
          return false
        },
      },
    })
    const res = await mocked({ cwd, ...opts })
    t.strictSame(res, undefined)
    t.strictSame(
      seen,
      [...new Set(seen)],
      'no directory checked more than once',
    )
    t.equal(seen[seen.length - 1], root, 'last dir is root')
  }

  const cases: (FindOpts | undefined)[] = [
    undefined,
    { root },
    { root: '1' },
  ]
  for (const tCase of cases) {
    await t.test(`root: ${JSON.stringify(tCase)}`, t =>
      mockFind(t, tCase),
    )
  }
})
