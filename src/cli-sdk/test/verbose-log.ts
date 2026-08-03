import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'
import t from 'tap'
import {
  formatRequestEvent,
  isVerbose,
  startRequestLog,
} from '../src/verbose-log.ts'

// A visible style wrapper so we can assert coloring was applied.
const style = (f: string, s: string) => `<${f}>${s}`

t.test('isVerbose', async t => {
  t.equal(isVerbose('silent'), false)
  t.equal(isVerbose('error'), false)
  t.equal(isVerbose('warn'), false)
  t.equal(isVerbose('info'), false)
  t.equal(isVerbose('verbose'), true)
  t.equal(isVerbose('debug'), true)
})

t.test('formatRequestEvent', async t => {
  const cases: [Events['request'], RegExp][] = [
    [
      { url: 'https://x/', state: 'cache' },
      /^cache\s+GET https:\/\/x\/$/,
    ],
    [{ url: 'https://x/', state: 'stale' }, /^stale\s+GET/],
    [{ url: 'https://x/', state: '304' }, /^304\s+GET/],
    [{ url: 'https://x/', state: 'start' }, /^start\s+GET/],
    [
      {
        url: 'https://x/',
        state: 'complete',
        method: 'HEAD',
        statusCode: 200,
        durationMs: 12,
      },
      /^200\s+HEAD https:\/\/x\/ \(12ms\)$/,
    ],
    [
      { url: 'https://x/', state: 'complete', statusCode: 404 },
      /^404\s+GET/,
    ],
    [{ url: 'https://x/', state: 'complete' }, /GET https:\/\/x\/$/],
  ]
  for (const [event, re] of cases) {
    t.match(formatRequestEvent(event), re, event.state)
  }

  // with a style function, error statuses use red, others green/gray
  t.match(
    formatRequestEvent(
      { url: 'https://x/', state: 'complete', statusCode: 500 },
      style,
    ),
    /<red>/,
    '5xx status colored red',
  )
  t.match(
    formatRequestEvent(
      { url: 'https://x/', state: 'complete', statusCode: 200 },
      style,
    ),
    /<green>/,
    '2xx status colored green',
  )
  t.match(
    formatRequestEvent({ url: 'https://x/', state: 'start' }, style),
    /<gray>/,
    'start colored gray',
  )
  t.match(
    formatRequestEvent(
      {
        url: 'https://x/',
        state: 'complete',
        statusCode: 200,
        durationMs: 5,
      },
      style,
    ),
    /<gray> \(5ms\)/,
    'duration colored gray',
  )
})

t.test('startRequestLog below verbose is a no-op', async t => {
  const lines: string[] = []
  const stop = startRequestLog('info', l => lines.push(l))
  emitter.emit('request', { url: 'https://x/', state: 'cache' })
  stop()
  t.strictSame(lines, [], 'nothing logged when loglevel < verbose')
})

t.test('startRequestLog at verbose skips start events', async t => {
  const lines: string[] = []
  const stop = startRequestLog('verbose', l => lines.push(l))
  emitter.emit('request', { url: 'https://x/', state: 'start' })
  emitter.emit('request', { url: 'https://x/', state: 'cache' })
  emitter.emit('request', {
    url: 'https://x/',
    state: 'complete',
    statusCode: 200,
    durationMs: 3,
  })
  stop()
  // start is skipped at verbose level
  t.equal(lines.length, 2)
  t.match(lines[0], /^cache/)
  t.match(lines[1], /^200/)

  // after stop(), no more logging
  emitter.emit('request', { url: 'https://x/', state: 'cache' })
  t.equal(lines.length, 2, 'cleanup detaches the subscription')
})

t.test('startRequestLog at debug includes start events', async t => {
  const lines: string[] = []
  const stop = startRequestLog('debug', l => lines.push(l), style)
  emitter.emit('request', {
    url: 'https://x/',
    state: 'start',
    method: 'GET',
  })
  stop()
  t.equal(lines.length, 1, 'start is logged at debug level')
  t.match(lines[0], /start/)
})
