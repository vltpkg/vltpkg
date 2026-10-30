import t from 'tap'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { Worker } from 'node:worker_threads'
import {
  handleJob,
  __CODE_SPLIT_SCRIPT_NAME,
} from '../src/placement-worker.ts'
import type {
  PlacementReply,
  UnpackJob,
} from '../src/placement-worker.ts'
import { makeTar } from './fixtures/make-tar.ts'

const makePkg = (name: string, version: string): Buffer => {
  const json = JSON.stringify({ name, version })
  return makeTar([
    { path: 'package/package.json', size: json.length, type: 'File' },
    json,
  ])
}

// an unpack job over a copy of the tarball in its own ArrayBuffer
const unpackJob = (
  id: number,
  tarData: Buffer,
  target: string,
): UnpackJob => {
  const copy = new Uint8Array(tarData.byteLength)
  copy.set(tarData)
  return {
    kind: 'unpack',
    id,
    buffer: copy.buffer,
    byteOffset: 0,
    byteLength: copy.byteLength,
    target,
  }
}

const version = (dir: string): string =>
  (
    JSON.parse(
      readFileSync(resolve(dir, 'package.json'), 'utf8'),
    ) as {
      version: string
    }
  ).version

t.test('handleJob unpacks a tarball from a transferred buffer', t => {
  const d = t.testdir()
  const replies: PlacementReply[] = []
  const port = { postMessage: (r: PlacementReply) => replies.push(r) }
  const target = resolve(d, 'nm/u')
  handleJob(port, unpackJob(9, makePkg('unpacked', '2.0.0'), target))
  t.strictSame(replies, [{ id: 9, result: true }])
  t.equal(version(target), '2.0.0')
  t.end()
})

t.test('handleJob reports a thrown error', async t => {
  // mock unpackSync to throw, so the catch branch is covered
  const { handleJob } = await t.mockImport<
    typeof import('../src/placement-worker.ts')
  >('../src/placement-worker.ts', {
    '../src/unpack.ts': {
      unpackSync: () => {
        const er: NodeJS.ErrnoException = new Error('nope')
        er.code = 'ETEST'
        throw er
      },
    },
  })
  const replies: PlacementReply[] = []
  handleJob(
    { postMessage: (r: PlacementReply) => replies.push(r) },
    unpackJob(3, makePkg('x', '1.0.0'), 'y'),
  )
  t.match(replies, [{ id: 3, error: 'nope', code: 'ETEST' }])
})

t.test('handleJob reports a thrown non-error', async t => {
  // something with no .message falls back to stringifying it whole
  const { handleJob } = await t.mockImport<
    typeof import('../src/placement-worker.ts')
  >('../src/placement-worker.ts', {
    '../src/unpack.ts': {
      unpackSync: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'just a string'
      },
    },
  })
  const replies: PlacementReply[] = []
  handleJob(
    { postMessage: (r: PlacementReply) => replies.push(r) },
    unpackJob(4, makePkg('x', '1.0.0'), 'y'),
  )
  t.match(replies, [{ id: 4, error: 'just a string' }])
})

t.test(
  'the module runs as a worker: reports ready, then unpacks',
  async t => {
    const d = t.testdir()
    const unpacked = resolve(d, 'nm/unpacked')
    const worker = new Worker(__CODE_SPLIT_SCRIPT_NAME)
    t.teardown(() => worker.terminate())
    // the first message is the ready handshake; only then post a job
    let sawReady = false
    const result = await new Promise<PlacementReply>((res, rej) => {
      worker.on('message', (m: PlacementReply) => {
        if ('ready' in m) {
          sawReady = true
          const job = unpackJob(
            43,
            makePkg('via-worker', '3.0.0'),
            unpacked,
          )
          worker.postMessage(job, [job.buffer])
        } else res(m)
      })
      worker.on('error', rej)
    })
    t.equal(sawReady, true, 'the worker reported ready first')
    t.match(result, { id: 43, result: true })
    t.equal(version(unpacked), '3.0.0')
  },
)
