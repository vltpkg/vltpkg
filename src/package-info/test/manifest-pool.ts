import { Spec } from '@vltpkg/spec'
import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import {
  EWORKERLOST,
  ManifestPool,
  manifestThreads,
} from '../src/manifest-pool.ts'

const specOptions = { registry: 'https://registry.example.com/' }
const spec = (s: string) => Spec.parse(s, specOptions)

t.test('manifestThreads reads VLT_MANIFEST_THREADS', t => {
  const prev = process.env.VLT_MANIFEST_THREADS
  t.teardown(() => {
    if (prev === undefined) delete process.env.VLT_MANIFEST_THREADS
    else process.env.VLT_MANIFEST_THREADS = prev
  })
  process.env.VLT_MANIFEST_THREADS = '2'
  t.equal(manifestThreads(), 2, 'an explicit count')
  process.env.VLT_MANIFEST_THREADS = '0'
  t.equal(manifestThreads(), 0, 'zero means none')
  process.env.VLT_MANIFEST_THREADS = 'nope'
  t.equal(manifestThreads(), 0, 'a non-number means none')
  process.env.VLT_MANIFEST_THREADS = '1.5'
  t.equal(manifestThreads(), 0, 'a non-integer means none')
  process.env.VLT_MANIFEST_THREADS = ''
  t.ok(
    manifestThreads() <= 3,
    'empty is treated as unset: the default',
  )
  delete process.env.VLT_MANIFEST_THREADS
  t.ok(manifestThreads() <= 3, 'unset: at most three')
  t.end()
})

// A pool backed by the stub worker (see fixtures/stub-manifest-worker.ts)
const stubPool = async (t: Test, size: number) => {
  const { ManifestPool } = await t.mockImport<
    typeof import('../src/manifest-pool.ts')
  >('../src/manifest-pool.ts', {
    '../src/manifest-worker.ts': {
      __CODE_SPLIT_SCRIPT_NAME: resolve(
        import.meta.dirname,
        'fixtures/stub-manifest-worker.ts',
      ),
    },
  })
  const pool = new ManifestPool(specOptions, size)
  t.teardown(() => pool.close())
  return pool
}

t.test('a pool of size 0 is disabled', async t => {
  const pool = new ManifestPool(specOptions, 0)
  t.equal(pool.enabled, false)
  await t.rejects(pool.manifest(spec('foo@^1.0.0')), {
    code: EWORKERLOST,
  })
  await pool.close()
})

t.test(
  'resolves on workers, routing a name to one worker',
  async t => {
    const pool = await stubPool(t, 3)
    t.equal(pool.enabled, true)
    t.equal(pool.workerCount, 0, 'spawned on demand')
    // jobs arriving while the worker boots queue for it
    const [a, b, c] = await Promise.all([
      pool.manifest(spec('foo@^1.0.0'), {
        from: '/x',
        backgroundRevalidate: true,
      }),
      pool.manifest(spec('foo@^2.0.0')),
      pool.manifest(spec('vltpkg@latest')),
    ])
    t.equal(a.manifest.name, 'foo')
    t.match(JSON.parse(a.manifest.description ?? ''), {
      from: '/x',
      backgroundRevalidate: true,
      registry: specOptions.registry,
      // a worker's own client never starts a pool
      threads: '0',
    })
    t.equal(a.vlt, false)
    t.equal(b.manifest.name, 'foo')
    t.equal(c.vlt, true, 'a vlt packument is reported')
    t.ok(
      pool.workerCount >= 1 && pool.workerCount <= 2,
      'one per name',
    )
    t.ok(pool.readyCount >= 1)
    // the same name again reuses its worker; a third name may start one
    const before = pool.workerCount
    await pool.manifest(spec('foo@^3.0.0'))
    t.equal(pool.workerCount, before, 'foo has a home')
  },
)

t.test('a worker error rejects as that error', async t => {
  const pool = await stubPool(t, 1)
  await t.rejects(
    pool.manifest(spec('boom@1')),
    { message: 'boom', code: 'EBOOM' },
    'message and code carried across',
  )
  await t.rejects(
    pool.manifest(spec('bare@1')),
    { message: 'bare' },
    'an error with no code still rejects',
  )
  t.equal(pool.enabled, true, 'a job error is not a lost worker')
})

t.test(
  'a lost worker rejects its jobs and is not restarted',
  async t => {
    const pool = await stubPool(t, 1)
    // the queued job behind the crash is rejected too, as lost
    await Promise.all([
      t.rejects(pool.manifest(spec('crash@1')), {
        message: 'worker boom',
      }),
      t.rejects(pool.manifest(spec('other@1')), {
        code: EWORKERLOST,
      }),
    ])
    t.equal(pool.workerCount, 0)
    t.equal(pool.enabled, false, 'the only worker is gone')
    await t.rejects(pool.manifest(spec('another@1')), {
      code: EWORKERLOST,
    })
  },
)

t.test('a worker that exits is lost the same way', async t => {
  const pool = await stubPool(t, 2)
  await t.rejects(pool.manifest(spec('exit@1')), {
    code: EWORKERLOST,
    message: 'manifest worker exited',
  })
  // the other slot still works
  const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  let answered = 0
  for (const n of names) {
    try {
      await pool.manifest(spec(`${n}@1`))
      answered++
    } catch (er) {
      t.equal((er as NodeJS.ErrnoException).code, EWORKERLOST)
    }
  }
  t.ok(answered > 0, 'the surviving worker answered its names')
  t.equal(pool.enabled, true)
})

t.test('a worker lost during boot', async t => {
  process.env.STUB_WORKER_BOOT = 'exit'
  t.teardown(() => delete process.env.STUB_WORKER_BOOT)
  const pool = await stubPool(t, 1)
  await t.rejects(pool.manifest(spec('foo@1')), { code: EWORKERLOST })
  t.equal(pool.enabled, false)
})

t.test('close settles jobs in flight or queued', async t => {
  const pool = await stubPool(t, 1)
  // boot the worker first so one job is in flight, one queued behind it
  await pool.manifest(spec('warm@1'))
  const settled = Promise.all([
    t.rejects(pool.manifest(spec('hang@1')), {
      code: EWORKERLOST,
      message: 'manifest pool closed',
    }),
    t.rejects(pool.manifest(spec('hang@2')), { code: EWORKERLOST }),
  ])
  await pool.close()
  await pool.close() // idempotent
  await settled
  t.equal(pool.enabled, false)
  await t.rejects(pool.manifest(spec('late@1')), {
    code: EWORKERLOST,
  })
})
