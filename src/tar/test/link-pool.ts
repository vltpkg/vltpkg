import t from 'tap'
import { resolve } from 'node:path'
import { statSync, writeFileSync, renameSync } from 'node:fs'
import { LinkPool, linkThreads } from '../src/link-pool.ts'
import { Pool } from '../src/pool.ts'
import { storeIndexPath } from '../src/store-index.ts'
import { makeTar } from './fixtures/make-tar.ts'

const makePkg = (name: string): Buffer => {
  const json = JSON.stringify({ name, version: '1.0.0' })
  return makeTar([
    { path: 'package/package.json', size: json.length, type: 'File' },
    json,
  ])
}

// Build a real global store entry in `d` and return its path.
const makeEntry = async (
  d: string,
  name: string,
): Promise<string> => {
  const { index } = await new Pool().unpackToStore(
    makePkg(name),
    resolve(d, name + '.tmp'),
  )
  const entry = resolve(d, name)
  writeFileSync(storeIndexPath(entry), JSON.stringify(index))
  renameSync(resolve(d, name + '.tmp'), entry)
  return entry
}

t.test('linkThreads reads VLT_LINK_THREADS', t => {
  const prev = process.env.VLT_LINK_THREADS
  t.teardown(() => {
    if (prev === undefined) delete process.env.VLT_LINK_THREADS
    else process.env.VLT_LINK_THREADS = prev
  })
  process.env.VLT_LINK_THREADS = '4'
  t.equal(linkThreads(), 4, 'an explicit count')
  process.env.VLT_LINK_THREADS = '1'
  t.equal(linkThreads(), 1, 'one means inline')
  process.env.VLT_LINK_THREADS = 'nope'
  t.equal(linkThreads(), 1, 'a non-number falls back to inline')
  process.env.VLT_LINK_THREADS = '2.5'
  t.equal(linkThreads(), 1, 'a non-integer falls back to inline')
  process.env.VLT_LINK_THREADS = ''
  t.ok(linkThreads() >= 1, 'empty is treated as unset: the default')
  delete process.env.VLT_LINK_THREADS
  t.ok(linkThreads() >= 1, 'unset: at least one')
  t.end()
})

t.test('inline when size is below 2', async t => {
  const d = t.testdir()
  const entry = await makeEntry(d, 'inline')
  const pool = new LinkPool(1)
  t.equal(pool.inline, true)
  const result = await pool.linkFromStore(entry, resolve(d, 'nm/a'))
  t.match(result, { how: 'link' })
  t.equal(pool.workerCount, 0, 'no workers were started')
  t.equal(statSync(resolve(d, 'nm/a/package.json')).nlink, 2)
  await pool.close() // a no-op with no workers
})

t.test('threaded placement with a queue', async t => {
  const d = t.testdir()
  const entry = await makeEntry(d, 'pooled')
  const pool = new LinkPool(2)
  t.teardown(() => pool.close())
  t.equal(pool.inline, false)
  // more jobs than workers: the extras queue and are handed to a
  // worker as each reply comes back
  const first = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      pool.linkFromStore(entry, resolve(d, `nm/p${i}`)),
    ),
  )
  t.equal(
    first.filter(r => r && r.how === 'link').length,
    5,
    'all five placed',
  )
  t.equal(pool.workerCount, 2, 'never more workers than the size')
  for (let i = 0; i < 5; i++)
    t.ok(statSync(resolve(d, `nm/p${i}/package.json`)).nlink >= 2)
  // a later job reuses an idle worker rather than spawning
  const again = await pool.linkFromStore(
    entry,
    resolve(d, 'nm/again'),
  )
  t.match(again, { how: 'link' })
  t.equal(pool.workerCount, 2)
})

t.test('placement runs inline once closed', async t => {
  const d = t.testdir()
  const entry = await makeEntry(d, 'afterclose')
  const pool = new LinkPool(2)
  await pool.linkFromStore(entry, resolve(d, 'nm/before'))
  await pool.close()
  await pool.close() // idempotent
  const result = await pool.linkFromStore(
    entry,
    resolve(d, 'nm/after'),
  )
  t.match(result, { how: 'link' }, 'still placed, on the main thread')
})

t.test('a worker error rejects as that error', async t => {
  const { LinkPool } = await t.mockImport<
    typeof import('../src/link-pool.ts')
  >('../src/link-pool.ts', {
    '../src/link-worker.ts': {
      __CODE_SPLIT_SCRIPT_NAME: resolve(
        import.meta.dirname,
        'fixtures/error-worker.ts',
      ),
    },
  })
  const pool = new LinkPool(2)
  t.teardown(() => pool.close())
  await t.rejects(
    pool.linkFromStore('whatever', 'target'),
    { message: 'boom', code: 'EBOOM' },
    'message and errno code carried across the boundary',
  )
  await t.rejects(
    pool.linkFromStore('bare', 'target'),
    { message: 'bare' },
    'an error with no stack or code still rejects',
  )
})
