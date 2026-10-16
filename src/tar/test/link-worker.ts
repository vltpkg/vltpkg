import t from 'tap'
import { resolve } from 'node:path'
import { statSync, writeFileSync, renameSync } from 'node:fs'
import { Worker } from 'node:worker_threads'
import {
  handleJob,
  __CODE_SPLIT_SCRIPT_NAME,
} from '../src/link-worker.ts'
import type { LinkReply } from '../src/link-worker.ts'
import { Pool } from '../src/pool.ts'
import { storeIndexPath } from '../src/store-index.ts'
import { makeTar } from './fixtures/make-tar.ts'

const makePkg = (name: string, version: string): Buffer => {
  const json = JSON.stringify({ name, version })
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
  const pool = new Pool()
  const { index } = await pool.unpackToStore(
    makePkg(name, '1.0.0'),
    resolve(d, 'tmp'),
  )
  const entry = resolve(d, 'entry')
  writeFileSync(storeIndexPath(entry), JSON.stringify(index))
  renameSync(resolve(d, 'tmp'), entry)
  return entry
}

t.test('handleJob posts the result of a placement', async t => {
  const d = t.testdir()
  const entry = await makeEntry(d, 'handle-ok')
  const replies: LinkReply[] = []
  const port = { postMessage: (r: LinkReply) => replies.push(r) }
  handleJob(port, {
    id: 7,
    storeEntry: entry,
    target: resolve(d, 'nm/a'),
  })
  t.match(replies, [{ id: 7, result: { how: 'link' } }])
  t.equal(statSync(resolve(d, 'nm/a/package.json')).nlink, 2)
})

t.test('handleJob posts a store miss as a false result', async t => {
  const replies: LinkReply[] = []
  const port = { postMessage: (r: LinkReply) => replies.push(r) }
  handleJob(port, {
    id: 1,
    storeEntry: resolve(t.testdir(), 'missing'),
    target: resolve(t.testdir(), 'nm/a'),
  })
  t.strictSame(replies, [{ id: 1, result: false }])
})

t.test('handleJob reports a thrown error', async t => {
  // mock linkFromStore to throw, so the catch branch is covered
  const { handleJob } = await t.mockImport<
    typeof import('../src/link-worker.ts')
  >('../src/link-worker.ts', {
    '../src/link-tree.ts': {
      linkFromStore: () => {
        const er: NodeJS.ErrnoException = new Error('nope')
        er.code = 'ETEST'
        throw er
      },
    },
  })
  const replies: LinkReply[] = []
  handleJob(
    { postMessage: (r: LinkReply) => replies.push(r) },
    { id: 3, storeEntry: 'x', target: 'y' },
  )
  t.match(replies, [{ id: 3, error: 'nope', code: 'ETEST' }])
})

t.test('handleJob reports a thrown non-error', async t => {
  // something with no .message falls back to stringifying it whole
  const { handleJob } = await t.mockImport<
    typeof import('../src/link-worker.ts')
  >('../src/link-worker.ts', {
    '../src/link-tree.ts': {
      linkFromStore: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'just a string'
      },
    },
  })
  const replies: LinkReply[] = []
  handleJob(
    { postMessage: (r: LinkReply) => replies.push(r) },
    { id: 4, storeEntry: 'x', target: 'y' },
  )
  t.match(replies, [{ id: 4, error: 'just a string' }])
})

t.test(
  'the module runs as a worker and places a package',
  async t => {
    const d = t.testdir()
    const entry = await makeEntry(d, 'as-worker')
    const target = resolve(d, 'nm/worker')
    const worker = new Worker(__CODE_SPLIT_SCRIPT_NAME)
    t.teardown(() => worker.terminate())
    const result = await new Promise<LinkReply>((res, rej) => {
      worker.on('message', res)
      worker.on('error', rej)
      worker.postMessage({ id: 42, storeEntry: entry, target })
    })
    t.match(result, { id: 42, result: { how: 'link' } })
    t.equal(statSync(resolve(target, 'package.json')).nlink, 2)
  },
)
