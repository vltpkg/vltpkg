import t from 'tap'

import { error } from '@vltpkg/error-cause'
import type { Codes } from '@vltpkg/error-cause'
import type { CommandUsage } from '../src/index.ts'
import { printErr } from '../src/print-err.ts'

const printed: string[] = []
const stderr = (...a: string[]) => {
  printed.push(a.join(' '))
}
const formatter = { colors: false }

t.beforeEach(() => (printed.length = 0))

const usage = (() => ({
  usage: () => 'usage',
})) as CommandUsage

t.test('not an error', t => {
  printErr(false, usage, stderr, formatter)
  t.strictSame(printed, ['Unknown Error: false'])
  t.end()
})

t.test('regular error with weird cause', t => {
  printErr(
    new Error('foo bar', { cause: false }),
    usage,
    stderr,
    formatter,
  )
  t.match(printed, [
    'Error: foo bar',
    'Cause:',
    '  false',
    'Stack:',
    /^\s{2}/,
  ])
  t.end()
})

t.test('regular error with no cause', t => {
  printErr(new Error('foo bar'), usage, stderr, formatter)
  t.match(printed, ['Error: foo bar', 'Stack:', /^\s{2}/])
  t.end()
})

t.test('regular error with cause', t => {
  printErr(
    new Error('foo bar', { cause: { this_is_why_i_errored: true } }),
    usage,
    stderr,
    formatter,
  )
  t.match(printed, [
    'Error: foo bar',
    'Cause:',
    '  this_is_why_i_errored: true',
    'Stack:',
    /^\s{2}/,
  ])
  t.end()
})

t.test('regular error with regular error cause', t => {
  printErr(
    new Error('foo bar', {
      cause: new Error('this_is_why_i_errored'),
    }),
    usage,
    stderr,
    formatter,
  )
  t.match(printed, [
    'Error: foo bar',
    'Cause:',
    'Error: this_is_why_i_errored',
    'Stack:',
    /^\s{2}/,
  ])
  t.end()
})

t.test('EUSAGE', t => {
  const er = error('bloopy doop', { code: 'EUSAGE' })
  printErr(er, usage, stderr, formatter)
  t.strictSame(printed, ['usage', 'Usage Error: bloopy doop'])
  printed.length = 0
  er.cause.validOptions = ['a', 'b']
  er.cause.found = 'x'
  printErr(er, usage, stderr, formatter)
  t.strictSame(printed, [
    'usage',
    'Usage Error: bloopy doop',
    '  Found: x',
    '  Valid options: a, b',
  ])
  t.end()
})

t.test('ERESOLVE', t => {
  const er = error('bloopy doop', { code: 'ERESOLVE' })
  printErr(er, usage, stderr, formatter)
  t.strictSame(printed, ['Resolve Error: bloopy doop'])
  printed.length = 0
  er.cause.url = new URL('https://x.y/')
  er.cause.spec = 'x@1.x'
  er.cause.from = '/home/base'
  er.cause.response = {
    statusCode: 200,
  } as unknown as Response
  printErr(er, usage, stderr, formatter)
  t.strictSame(printed, [
    'Resolve Error: bloopy doop',
    '  While fetching: https://x.y/',
    '  To satisfy: x@1.x',
    '  From: /home/base',
    '  Response: { statusCode: 200 }',
  ])
  t.end()
})

t.test('ECONFIG', async t => {
  t.test('with cause', async t => {
    const er = error('Invalid config keys', {
      code: 'ECONFIG',
      found: ['garbage'],
      wanted: ['wanted'],
    })
    printErr(er, usage, stderr, formatter)
    t.matchSnapshot(printed)
  })

  t.test('no cause', async t => {
    const er = error('Invalid config keys', {
      code: 'ECONFIG',
    })
    printErr(er, usage, stderr, formatter)
    t.matchSnapshot(printed)
  })
})

t.test('EREQUEST', async t => {
  t.test('with cause', async t => {
    printErr(
      error('oh no! my request!', {
        code: 'EREQUEST',
        url: new URL('https://x.y/'),
        method: 'GET',
        cause: Object.assign(new Error('some internal thing'), {
          code: 'ECONNRESET',
          syscall: 'read',
        }),
      }),
      usage,
      stderr,
      formatter,
    )
    t.matchSnapshot(printed)
  })

  t.test('no cause', async t => {
    printErr(
      error('oh no! my request!', {
        code: 'EREQUEST',
        url: new URL('https://x.y/'),
        method: 'GET',
      }),
      usage,
      stderr,
      formatter,
    )
    t.matchSnapshot(printed)
  })
})

t.test('error with an unknown code', t => {
  const er = error('this is an error', {
    code: 'ENOTACODEWEKNOWABOUT' as Codes,
    wanted: Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [`__${i}__`, i]),
    ),
  })
  printErr(er, usage, stderr, {
    ...formatter,
    maxLines: 5,
  })
  t.matchStrict(printed, [
    'Error: this is an error',
    'Cause:',
    `  code: ENOTACODEWEKNOWABOUT`,
    `  wanted: {
    __0__: 0,
    __1__: 1,
    __2__: 2,
    __3__: 3,
  ... 97 lines hidden ...`,
    'Stack:',
    /^\s{2}/,
  ])
  t.end()
})

t.test('error with a missing code', t => {
  const er = error('this is an error', { found: 'wat' })
  printErr(er, usage, stderr, formatter)
  t.matchStrict(printed, [
    'Error: this is an error',
    'Cause:',
    '  found: wat',
    'Stack:',
    /^\s{2}/,
  ])
  t.end()
})
