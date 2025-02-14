import t from 'tap'

import { error } from '@vltpkg/error-cause'
import { type CommandUsage } from '../src/index.ts'
import { printErr } from '../src/print-err.ts'

const printed: unknown[][] = []
const stderr = (...a: unknown[]) => {
  printed.push(a)
}

t.beforeEach(() => (printed.length = 0))

const usage = (() => ({
  usage: () => 'usage',
})) as unknown as CommandUsage

t.test('if not root error, print nothing', t => {
  printErr(false, usage, stderr)
  t.strictSame(printed, [])
  t.end()
})

t.test('print usage if a usage error', t => {
  const er = error('bloopy doop', { code: 'EUSAGE' })
  printErr(er, usage, stderr)
  t.strictSame(printed, [['usage'], ['Error: bloopy doop']])
  printed.length = 0
  er.cause.validOptions = ['a', 'b']
  er.cause.found = 'x'
  printErr(er, usage, stderr)
  t.strictSame(printed, [
    ['usage'],
    ['Error: bloopy doop'],
    ['  Found: x'],
    ['  Valid options: a, b'],
  ])
  t.end()
})

t.test('print helpful info for ERESOLVE', t => {
  const er = error('bloopy doop', { code: 'ERESOLVE' })
  printErr(er, usage, stderr)
  t.strictSame(printed, [['Resolve Error: bloopy doop']])
  printed.length = 0
  er.cause.url = new URL('https://x.y/')
  er.cause.spec = 'x@1.x'
  er.cause.from = '/home/base'
  er.cause.response = {
    statusCode: 200,
  } as unknown as Response
  printErr(er, usage, stderr)
  t.strictSame(printed, [
    ['Resolve Error: bloopy doop'],
    ['  While fetching: https://x.y/'],
    ['  To satisfy: x@1.x'],
    ['  From: /home/base'],
    ['Response:', er.cause.response],
  ])
  t.end()
})

t.test('unknown error', t => {
  const er = error('unknown', { found: 'wat' })
  printErr(er, usage, stderr)
  t.strictSame(printed, [[er]])
  t.end()
})
