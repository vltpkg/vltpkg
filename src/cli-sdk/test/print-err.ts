import t from 'tap'

import { error } from '@vltpkg/error-cause'
import type { Codes } from '@vltpkg/error-cause'
import type { CommandUsage } from '../src/index.ts'
import { printErr } from '../src/print-err.ts'

const printed: unknown[][] = []
const stderr = (...a: unknown[]) => {
  printed.push(a)
}

t.beforeEach(() => (printed.length = 0))

const usage = (() => ({
  usage: () => 'usage',
})) as unknown as CommandUsage

t.test('not an error', t => {
  printErr({ something: 'this is not an error' }, usage, stderr)
  t.strictSame(printed, [['Unknown Error']])
  t.end()
})

t.test('error with no cause', t => {
  printErr(new Error('foo bar'), usage, stderr)
  t.strictSame(printed, [['Unknown Error: foo bar']])
  t.end()
})

t.test('EUSAGE', t => {
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

t.test('ERESOLVE', t => {
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

t.test('error with an unknown code', t => {
  const er = error('this is an error', {
    found: 'wat',
    code: 'ENOTACODEWEKNOWABOUT' as Codes,
  })
  printErr(er, usage, stderr)
  t.strictSame(printed, [
    [`ENOTACODEWEKNOWABOUT Error: this is an error`],
  ])
  t.end()
})

t.test('error with a missing code', t => {
  const er = error('this is an error', { found: 'wat' })
  printErr(er, usage, stderr)
  t.strictSame(printed, [[`Error: this is an error`]])
  t.end()
})
