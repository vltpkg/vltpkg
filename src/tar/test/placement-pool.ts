import t from 'tap'
import type { Test } from 'tap'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_HELD_BYTES,
  DEFAULT_PLACEMENT_MIN_JOBS,
  PlacementPool,
  placementThreads,
} from '../src/placement-pool.ts'
import { makeTar } from './fixtures/make-tar.ts'

const makePkg = (name: string, version = '1.0.0'): Buffer => {
  const json = JSON.stringify({ name, version })
  return makeTar([
    { path: 'package/package.json', size: json.length, type: 'File' },
    json,
  ])
}

const version = (dir: string): string =>
  (
    JSON.parse(
      readFileSync(resolve(dir, 'package.json'), 'utf8'),
    ) as {
      version: string
    }
  ).version

t.test('placementThreads reads VLT_PLACEMENT_THREADS', t => {
  const prev = process.env.VLT_PLACEMENT_THREADS
  t.teardown(() => {
    if (prev === undefined) delete process.env.VLT_PLACEMENT_THREADS
    else process.env.VLT_PLACEMENT_THREADS = prev
  })
  process.env.VLT_PLACEMENT_THREADS = '4'
  t.equal(placementThreads(), 4, 'an explicit count')
  process.env.VLT_PLACEMENT_THREADS = '1'
  t.equal(placementThreads(), 1, 'one means inline')
  process.env.VLT_PLACEMENT_THREADS = 'nope'
  t.equal(placementThreads(), 1, 'a non-number falls back to inline')
  process.env.VLT_PLACEMENT_THREADS = '2.5'
  t.equal(placementThreads(), 1, 'a non-integer falls back to inline')
  process.env.VLT_PLACEMENT_THREADS = ''
  t.ok(
    placementThreads() >= 1,
    'empty is treated as unset: the default',
  )
  delete process.env.VLT_PLACEMENT_THREADS
  t.ok(placementThreads() >= 1, 'unset: at least one')
  t.end()
})

t.test('inline when size is below 2', async t => {
  const d = t.testdir()
  const pool = new PlacementPool(1)
  t.equal(pool.inline, true)
  await pool.warm(1000)
  t.equal(pool.workerCount, 0, 'warm starts nothing when inline')
  t.equal(pool.threaded, false)
  await pool.unpack(makePkg('u', '4.0.0'), resolve(d, 'nm/u'))
  t.equal(version(resolve(d, 'nm/u')), '4.0.0')
  t.equal(pool.heldBytes, 0, 'inline unpacks hold nothing')
  await pool.close() // a no-op with no workers
})

t.test('below the minimum, warm starts nothing', async t => {
  const d = t.testdir()
  const pool = new PlacementPool(2)
  await pool.warm(DEFAULT_PLACEMENT_MIN_JOBS - 1)
  t.equal(pool.workerCount, 0, 'a small install stays inline')
  await pool.unpack(makePkg('s', '1.1.1'), resolve(d, 'nm/s'))
  t.equal(
    version(resolve(d, 'nm/s')),
    '1.1.1',
    'still unpacked, inline',
  )
  await pool.close()
})

t.test('warm starts the workers; unpacking uses them', async t => {
  const d = t.testdir()
  const pool = new PlacementPool(2, 1)
  t.teardown(() => pool.close())
  t.equal(pool.inline, false)
  await pool.warm(5)
  t.equal(pool.threaded, true)
  t.equal(pool.workerCount, 2, 'every worker started')
  t.equal(pool.readyCount, 2, 'and warm waited for them to boot')
  await pool.warm(5)
  t.equal(pool.workerCount, 2, 'a second warm is a no-op')
  // more jobs than workers: the extras queue and are handed to a
  // worker as each reply comes back
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      pool.unpack(
        makePkg(`p${i}`, `${i}.0.0`),
        resolve(d, `nm/p${i}`),
      ),
    ),
  )
  for (let i = 0; i < 5; i++) {
    t.equal(version(resolve(d, `nm/p${i}`)), `${i}.0.0`)
  }
  // bytes are copied, or transferred when the caller owns them
  const owned = makePkg('owned', '5.0.0')
  const ownedCopy = new Uint8Array(owned.byteLength)
  ownedCopy.set(owned)
  const exclusive = Buffer.from(ownedCopy.buffer)
  await Promise.all([
    pool.unpack(makePkg('copied', '6.0.0'), resolve(d, 'nm/copied')),
    pool.unpack(exclusive, resolve(d, 'nm/owned'), undefined, {
      owned: true,
    }),
    // owned but a slice of a larger buffer: copied after all
    pool.unpack(
      Buffer.concat([
        Buffer.alloc(3),
        makePkg('slice', '7.0.0'),
      ]).subarray(3),
      resolve(d, 'nm/slice'),
      undefined,
      { owned: true },
    ),
  ])
  t.equal(version(resolve(d, 'nm/copied')), '6.0.0')
  t.equal(version(resolve(d, 'nm/owned')), '5.0.0')
  t.equal(version(resolve(d, 'nm/slice')), '7.0.0')
  t.equal(exclusive.byteLength, 0, 'the owned buffer was transferred')
  t.equal(pool.heldBytes, 0, 'nothing held once unpacked')
  // a later job reuses an idle worker
  await pool.unpack(makePkg('again', '8.0.0'), resolve(d, 'nm/again'))
  t.equal(version(resolve(d, 'nm/again')), '8.0.0')
  t.equal(pool.workerCount, 2)
})

t.test(
  'a pool nobody warmed starts itself at the minimum',
  async t => {
    const d = t.testdir()
    const pool = new PlacementPool(2, 3)
    t.teardown(() => pool.close())
    await pool.unpack(makePkg('a'), resolve(d, 'nm/a'))
    await pool.unpack(makePkg('b'), resolve(d, 'nm/b'))
    t.equal(pool.threaded, false, 'two placements: still inline')
    await pool.unpack(makePkg('c'), resolve(d, 'nm/c'))
    t.equal(pool.threaded, true, 'the third started the workers')
    t.equal(pool.workerCount, 2)
    // and the next one waits for them
    await pool.unpack(makePkg('d', '8.0.0'), resolve(d, 'nm/d'))
    t.equal(version(resolve(d, 'nm/d')), '8.0.0')
    t.ok(pool.readyCount >= 1, 'a worker booted and took it')
  },
)

t.test('held bytes gate downloads behind the unpackers', async t => {
  const d = t.testdir()
  const tarball = makePkg('held')
  // room for one tarball at a time
  const pool = new PlacementPool(2, 1, tarball.byteLength + 1)
  t.teardown(() => pool.close())
  await pool.warm(1)
  const order: string[] = []
  const p1 = pool
    .unpack(makePkg('h1'), resolve(d, 'nm/h1'))
    .then(() => order.push('h1'))
  // this one cannot be held alongside the first: it waits
  const p2 = pool
    .unpack(makePkg('h2'), resolve(d, 'nm/h2'))
    .then(() => order.push('h2'))
  t.ok(pool.heldBytes > 0, 'one tarball held')
  t.ok(pool.heldBytes <= tarball.byteLength + 1, 'not two')
  await Promise.all([p1, p2])
  t.strictSame(order, ['h1', 'h2'])
  t.equal(pool.heldBytes, 0)
  // one tarball larger than the whole cap still goes, alone
  const big = new PlacementPool(2, 1, 1)
  t.teardown(() => big.close())
  await big.warm(1)
  await big.unpack(makePkg('big', '9.0.0'), resolve(d, 'nm/big'))
  t.equal(version(resolve(d, 'nm/big')), '9.0.0')
  t.ok(DEFAULT_HELD_BYTES > 0)
})

t.test('unpacking runs inline once closed', async t => {
  const d = t.testdir()
  const pool = new PlacementPool(2, 1)
  await pool.warm(1)
  await pool.unpack(
    makePkg('before', '1.0.0'),
    resolve(d, 'nm/before'),
  )
  t.equal(version(resolve(d, 'nm/before')), '1.0.0')
  await pool.close()
  await pool.close() // idempotent
  await pool.warm(1000)
  t.equal(pool.workerCount, 0, 'warm starts nothing once closed')
  await pool.unpack(makePkg('after', '2.0.0'), resolve(d, 'nm/u'))
  t.equal(
    version(resolve(d, 'nm/u')),
    '2.0.0',
    'still unpacked, inline',
  )
})

// A pool backed by the stub worker, whose behaviour is chosen per job
// by its target (see fixtures/stub-worker.ts). Warmed with a minimum
// of one job; `ready` false hands back before the boot is done.
const stubPool = async (t: Test, size: number, ready = true) => {
  const { PlacementPool } = await t.mockImport<
    typeof import('../src/placement-pool.ts')
  >('../src/placement-pool.ts', {
    '../src/placement-worker.ts': {
      __CODE_SPLIT_SCRIPT_NAME: resolve(
        import.meta.dirname,
        'fixtures/stub-worker.ts',
      ),
    },
  })
  const pool = new PlacementPool(size, 1)
  t.teardown(() => pool.close())
  const warmed = pool.warm(1)
  if (ready) await warmed
  return { pool, warmed }
}

t.test(
  'jobs that arrive while the workers boot wait for them',
  async t => {
    const { pool, warmed } = await stubPool(t, 2, false)
    t.equal(pool.readyCount, 0, 'nothing is ready yet')
    // these queue, and the workers take them as they finish booting
    await Promise.all([
      t.rejects(pool.unpack(makePkg('a'), 'boom'), {
        message: 'boom',
      }),
      t.rejects(pool.unpack(makePkg('b'), 'bare'), {
        message: 'bare',
      }),
      t.resolves(pool.unpack(makePkg('c'), 'ok')),
    ])
    // one worker may drain everything before the other finishes booting
    await warmed
    t.equal(pool.readyCount, 2)
    t.equal(pool.heldBytes, 0)
  },
)

t.test(
  'a worker lost during boot does not leave warm waiting',
  async t => {
    process.env.STUB_WORKER_BOOT = 'exit'
    t.teardown(() => delete process.env.STUB_WORKER_BOOT)
    const d = t.testdir()
    const { pool, warmed } = await stubPool(t, 2, false)
    await warmed
    t.equal(pool.workerCount, 0, 'every worker exited at boot')
    t.equal(pool.readyCount, 0)
    // with no workers left the pool has fallen back to inline, and does
    // not start the workers again
    await pool.unpack(makePkg('inline', '1.0.0'), resolve(d, 'nm/i'))
    t.equal(version(resolve(d, 'nm/i')), '1.0.0')
    t.equal(pool.workerCount, 0)
  },
)

t.test('close while warm is waiting releases it', async t => {
  const { pool, warmed } = await stubPool(t, 2, false)
  await pool.close()
  await warmed
  t.equal(pool.workerCount, 0)
})

t.test('a worker error reply rejects as that error', async t => {
  const { pool } = await stubPool(t, 2)
  await t.rejects(
    pool.unpack(makePkg('x'), 'whatever'),
    { message: 'boom', code: 'EBOOM' },
    'message and errno code carried across the boundary',
  )
  await t.rejects(
    pool.unpack(makePkg('x'), 'bare'),
    { message: 'bare' },
    'an error with no stack or code still rejects',
  )
})

t.test('a worker that crashes rejects its in-flight job', async t => {
  const { pool } = await stubPool(t, 2)
  // 'crash' throws in the worker: an uncaught 'error' event, followed
  // by an 'exit' the pool must ignore
  await t.rejects(pool.unpack(makePkg('c'), 'crash'), {
    message: 'worker boom',
  })
  t.equal(pool.heldBytes, 0, 'the lost job released its bytes')
})

t.test('a worker that exits rejects its in-flight job', async t => {
  const { pool } = await stubPool(t, 2)
  await t.rejects(pool.unpack(makePkg('x'), 'exit'), {
    message: 'placement worker exited',
  })
})

t.test(
  'a surviving worker drains the queue after a death',
  async t => {
    const { pool } = await stubPool(t, 2)
    // two workers: one dies on 'crash', the other replies to 'boom' and
    // then has to pick the queued 'bare' up, rather than let it hang.
    // attach all assertions synchronously (via Promise.all) so a
    // rejection is never momentarily unhandled
    await Promise.all([
      t.rejects(pool.unpack(makePkg('a'), 'crash'), {
        message: 'worker boom',
      }),
      t.rejects(pool.unpack(makePkg('b'), 'boom'), {
        message: 'boom',
      }),
      t.rejects(
        pool.unpack(makePkg('c'), 'bare'),
        { message: 'bare' },
        'drained, not stuck',
      ),
    ])
  },
)

t.test('queued jobs are rejected when every worker dies', async t => {
  const { pool } = await stubPool(t, 2)
  // both workers die; the queued job can never run, so it must reject
  await Promise.all([
    t.rejects(pool.unpack(makePkg('a'), 'crash'), {
      message: 'worker boom',
    }),
    t.rejects(pool.unpack(makePkg('b'), 'crash'), {
      message: 'worker boom',
    }),
    t.rejects(
      pool.unpack(makePkg('c'), 'boom'),
      { message: 'worker boom' },
      'not left hanging',
    ),
  ])
  t.equal(pool.workerCount, 0)
  t.equal(pool.heldBytes, 0)
})

t.test('close settles jobs still in flight or queued', async t => {
  const d = t.testdir()
  const { pool } = await stubPool(t, 2)
  // 'hang' never replies: two jobs occupy both workers, a third queues.
  // attach the assertions before close() rejects them. an unpack still
  // waiting for its turn when the pool closes runs inline instead.
  const settled = Promise.all([
    t.rejects(pool.unpack(makePkg('a'), 'hang'), {
      message: 'placement pool closed',
    }),
    t.rejects(pool.unpack(makePkg('b'), 'hang'), {
      message: 'placement pool closed',
    }),
    t.rejects(pool.unpack(makePkg('c'), 'hang'), {
      message: 'placement pool closed',
    }),
  ])
  // give the three a tick to reach the workers and the queue
  await new Promise(r => setImmediate(r))
  const late = pool.unpack(
    makePkg('late', '1.2.3'),
    resolve(d, 'late'),
  )
  await pool.close()
  await settled
  await late
  t.equal(version(resolve(d, 'late')), '1.2.3', 'placed inline')
  t.equal(pool.heldBytes, 0)
})

t.test(
  'an unpack waiting for room places inline once every worker died',
  async t => {
    const d = t.testdir()
    const { PlacementPool } = await t.mockImport<
      typeof import('../src/placement-pool.ts')
    >('../src/placement-pool.ts', {
      '../src/placement-worker.ts': {
        __CODE_SPLIT_SCRIPT_NAME: resolve(
          import.meta.dirname,
          'fixtures/stub-worker.ts',
        ),
      },
    })
    const tarball = makePkg('room')
    // room for one tarball: the first two unpacks hold it in turn and
    // crash their workers, the third waits for room and finds no pool
    const pool = new PlacementPool(2, 1, tarball.byteLength + 1)
    t.teardown(() => pool.close())
    await pool.warm(1)
    await Promise.all([
      t.rejects(pool.unpack(makePkg('r1'), 'crash'), {
        message: 'worker boom',
      }),
      t.rejects(pool.unpack(makePkg('r2'), 'crash'), {
        message: 'worker boom',
      }),
      t.resolves(
        pool.unpack(makePkg('r3', '3.2.1'), resolve(d, 'r3')),
      ),
    ])
    t.equal(pool.workerCount, 0)
    t.equal(pool.threaded, false)
    t.equal(version(resolve(d, 'r3')), '3.2.1', 'placed inline')
    t.equal(pool.heldBytes, 0)
  },
)
