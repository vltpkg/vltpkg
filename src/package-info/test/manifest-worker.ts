import type { Spec } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import { createServer } from 'node:http'
import { Worker } from 'node:worker_threads'
import t from 'tap'
import {
  handleJob,
  __CODE_SPLIT_SCRIPT_NAME,
} from '../src/manifest-worker.ts'
import type {
  ManifestReply,
  ManifestWorkerClient,
} from '../src/manifest-worker.ts'

const specOptions = { registry: 'https://registry.example.com/' }

const fakeClient = (
  manifest: (spec: Spec) => Promise<Manifest>,
  vlt = false,
): ManifestWorkerClient => ({
  options: specOptions,
  manifest: (spec: Spec) => manifest(spec),
  isVltPackument: () => vlt,
})

t.test('handleJob posts the manifest', async t => {
  const replies: ManifestReply[] = []
  const port = { postMessage: (r: ManifestReply) => replies.push(r) }
  const seen: [string, unknown][] = []
  const client: ManifestWorkerClient = {
    options: specOptions,
    manifest: async (spec, options) => {
      seen.push([String(spec), options])
      return { name: spec.name, version: '1.2.3' }
    },
    isVltPackument: () => true,
  }
  await handleJob(client, port, {
    id: 7,
    spec: 'foo@^1.0.0',
    from: '/x',
    backgroundRevalidate: true,
  })
  t.strictSame(replies, [
    { id: 7, manifest: { name: 'foo', version: '1.2.3' }, vlt: true },
  ])
  t.strictSame(seen, [
    ['foo@^1.0.0', { from: '/x', backgroundRevalidate: true }],
  ])
})

t.test('handleJob reports errors with their code', async t => {
  const replies: ManifestReply[] = []
  const port = { postMessage: (r: ManifestReply) => replies.push(r) }
  // a code on the cause, as the client's resolve errors carry it
  await handleJob(
    fakeClient(async () => {
      throw Object.assign(new Error('not found'), {
        cause: { code: 'ERESOLVE' },
      })
    }),
    port,
    { id: 1, spec: 'a@1' },
  )
  // a code on the error itself
  await handleJob(
    fakeClient(async () => {
      const er: NodeJS.ErrnoException = new Error('refused')
      er.code = 'ECONNREFUSED'
      throw er
    }),
    port,
    { id: 2, spec: 'b@1' },
  )
  // no code at all
  await handleJob(
    fakeClient(async () => {
      throw new Error('plain')
    }),
    port,
    { id: 3, spec: 'c@1' },
  )
  // not even an Error
  await handleJob(
    fakeClient(async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'just a string'
    }),
    port,
    { id: 4, spec: 'd@1' },
  )
  t.strictSame(replies, [
    { id: 1, error: 'not found', code: 'ERESOLVE' },
    { id: 2, error: 'refused', code: 'ECONNREFUSED' },
    { id: 3, error: 'plain' },
    { id: 4, error: 'just a string' },
  ])
})

t.test(
  'the module runs as a worker: boots a client and resolves',
  async t => {
    // a one-packument registry for the worker's own client to fetch from
    const packument = {
      name: 'abbrev',
      'dist-tags': { latest: '2.0.0' },
      versions: {
        '2.0.0': {
          name: 'abbrev',
          version: '2.0.0',
          dist: { tarball: 'https://x.example/abbrev-2.0.0.tgz' },
        },
      },
    }
    const server = createServer((req, res) => {
      // the client asks for `?stable` until it has the capabilities
      if (req.url?.replace(/\?.*$/, '') === '/abbrev') {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(packument))
      } else {
        res.statusCode = 404
        res.end('{}')
      }
    })
    await new Promise<void>(r => server.listen(0, r))
    t.teardown(() => server.close())
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('no port')
    const registry = `http://localhost:${address.port}/`
    const cache = t.testdir()
    const worker = new Worker(__CODE_SPLIT_SCRIPT_NAME, {
      workerData: { options: { registry, cache } },
      env: { ...process.env, VLT_MANIFEST_THREADS: '0' },
    })
    t.teardown(() => worker.terminate())
    let sawReady = false
    const replies = await new Promise<ManifestReply[]>((res, rej) => {
      const got: ManifestReply[] = []
      worker.on('message', (m: ManifestReply) => {
        if ('ready' in m) {
          sawReady = true
          worker.postMessage({ id: 1, spec: 'abbrev@^2.0.0' })
          worker.postMessage({ id: 2, spec: 'missing@^1.0.0' })
        } else {
          got.push(m)
          if (got.length === 2) res(got)
        }
      })
      worker.on('error', rej)
    })
    t.equal(sawReady, true, 'the worker reported ready first')
    const byId = new Map(
      replies.map(r => [('id' in r && r.id) || 0, r]),
    )
    t.match(byId.get(1), {
      id: 1,
      manifest: { name: 'abbrev', version: '2.0.0' },
      vlt: false,
    })
    t.match(byId.get(2), {
      id: 2,
      error: /404/,
      code: 'ERESOLVE',
    })
  },
)
