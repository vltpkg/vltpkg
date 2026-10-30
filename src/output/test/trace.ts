import t from 'tap'
import { readFileSync } from 'node:fs'
import { Tracer } from '../src/trace.ts'
import type { TraceEvent } from '../src/trace.ts'

const parse = (chunks: string[]): TraceEvent[] =>
  chunks
    .join('')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l) as TraceEvent)

t.test('disabled tracer costs nothing and records nothing', t => {
  const chunks: string[] = []
  const tracer = new Tracer({
    append: (_f, d) => chunks.push(d),
    write: () => t.fail('no summary when disabled'),
  })
  t.equal(tracer.enabled, false)
  tracer.trace('x')
  tracer.span('y')({ a: 1 })
  tracer.mark('m')
  tracer.lane('net', 1, 2)
  tracer.sample()
  tracer.flush()
  t.equal(tracer.summary(), undefined)
  tracer.close()
  t.strictSame(chunks, [])
  t.equal(Tracer.fromEnv({}).enabled, false)
  t.equal(Tracer.fromEnv({ VLT_PHASES: '0' }).enabled, false)
  t.end()
})

t.test('trace file: events, spans, marks, lanes, flush', t => {
  const chunks: string[] = []
  let now = 1000
  const tracer = new Tracer({
    file: '/dev/null/trace.jsonl',
    threadId: 7,
    main: false,
    now: () => now,
    append: (f, d) => {
      t.equal(f, '/dev/null/trace.jsonl')
      chunks.push(d)
    },
    flushLines: 4,
    flushMs: 1,
  })
  t.equal(tracer.enabled, true)
  // 'open' is buffered already
  tracer.trace('a', { n: 1, skip: undefined, s: 'x', b: true })
  now = 1001.25
  const end = tracer.span('fetch', { url: 'u' })
  now = 1003.5
  end({ bytes: 10 })
  // 4 lines: open, a, fetch:start, fetch:end -> flushed
  t.equal(chunks.length, 1)
  const events = parse(chunks)
  t.strictSame(
    events.map(e => e.ev),
    ['open', 'a', 'fetch:start', 'fetch:end'],
  )
  t.equal(events[0]?.tid, 7)
  t.equal(events[1]?.t, 1000)
  t.strictSame(events[1], {
    t: 1000,
    tid: 7,
    ev: 'a',
    n: 1,
    s: 'x',
    b: true,
  })
  t.equal(events[3]?.ms, 2.25)
  t.equal(events[3]?.url, 'u')
  t.equal(events[3]?.bytes, 10)

  tracer.mark('build', { nodes: 3 })
  tracer.lane('net', 2, 5)
  tracer.sample()
  t.equal(chunks.length, 1, 'buffered until the timer fires')
  return new Promise<void>(resolve => {
    setTimeout(() => {
      t.equal(chunks.length, 2, 'timer flushed')
      const more = parse([chunks[1] ?? ''])
      t.strictSame(
        more.map(e => e.ev),
        ['phase', 'lane', 'rss'],
      )
      t.strictSame(more[0], {
        t: 1003.5,
        tid: 7,
        ev: 'phase',
        nodes: 3,
        name: 'build',
      })
      t.strictSame(more[1], {
        t: 1003.5,
        tid: 7,
        ev: 'lane',
        name: 'net',
        busy: 2,
        queued: 5,
      })
      t.type(more[2]?.rss, 'number')
      // a second flush with nothing buffered is a no-op
      tracer.flush()
      t.equal(chunks.length, 2)
      tracer.close()
      tracer.close()
      tracer.trace('after close')
      tracer.flush()
      t.equal(chunks.length, 2, 'nothing recorded after close')
      resolve()
    }, 10)
  })
})

t.test('a failing append never throws', t => {
  // no `main` given: a non-zero thread id is not the main thread
  const tracer = new Tracer({
    file: 'x',
    threadId: 3,
    flushLines: 1,
    append: () => {
      throw new Error('ENOSPC')
    },
  })
  t.doesNotThrow(() => tracer.trace('a'))
  t.end()
})

t.test('phases summary on the main thread', t => {
  const lines: string[] = []
  const chunks: string[] = []
  let now = 5000
  const tracer = new Tracer({
    file: 'trace.jsonl',
    phases: true,
    main: true,
    threadId: 0,
    sampleMs: 1,
    now: () => now,
    append: (_f, d) => chunks.push(d),
    write: l => lines.push(l),
  })
  tracer.mark('actual')
  now = 5010
  tracer.mark('build')
  now = 5025
  tracer.mark('reify')
  now = 5100
  t.match(
    tracer.summary(),
    /^PHASES actual=10 build=15 reify=75 total=100 loop p50=\d+ p99=\d+ max=\d+ maxrss=\d+MB$/,
  )
  return new Promise<void>(resolve => {
    setTimeout(() => {
      tracer.close()
      t.equal(lines.length, 1)
      t.match(lines[0], /^PHASES actual=10 build=15 reify=\d+ total=/)
      const events = parse(chunks)
      t.ok(
        events.some(e => e.ev === 'rss'),
        'sampler recorded memory',
      )
      const exit = events.find(e => e.ev === 'exit')
      t.type(exit?.loopP50, 'number')
      t.type(exit?.maxrss, 'number')
      resolve()
    }, 20)
  })
})

t.test('phases without a trace file', t => {
  const lines: string[] = []
  const tracer = Tracer.fromEnv(
    { VLT_PHASES: '1' },
    { main: true, write: l => lines.push(l) },
  )
  t.equal(tracer.enabled, true)
  t.equal(tracer.file, undefined)
  tracer.trace('ignored')
  tracer.mark('a')
  tracer.close()
  t.match(lines[0], /^PHASES a=\d+ total=\d+ loop/)
  t.end()
})

t.test('module level helpers use the env tracer', async t => {
  const { trace, span, mark, lane, tracer } =
    await import('../src/trace.ts')
  t.equal(tracer.enabled, false)
  trace('a')
  span('b')()
  mark('c')
  lane('d', 0, 0)
  t.end()
})

t.test(
  'default append writes the file, default write hits stderr',
  t => {
    const dir = t.testdir()
    const file = `${dir}/trace.jsonl`
    const written: string[] = []
    const capture = t.capture(
      process.stderr,
      'write',
      (s: string) => {
        written.push(s)
        return true
      },
    )
    const tracer = new Tracer({ file, phases: true, main: true })
    tracer.trace('a')
    tracer.close()
    capture.restore()
    const lines = readFileSync(file, 'utf8').trim().split('\n')
    t.strictSame(
      lines.map(l => (JSON.parse(l) as TraceEvent).ev),
      ['open', 'a', 'exit'],
    )
    t.match(written[0], /^PHASES total=\d+ loop/)
    t.end()
  },
)
