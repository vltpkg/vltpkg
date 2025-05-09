import t from 'tap'
import { error } from '@vltpkg/error-cause'
import type { Codes } from '@vltpkg/error-cause'
import type { CommandUsage } from '../src/index.ts'
import { printErr as printErrBase } from '../src/print-err.ts'
import type { ErrorFormatOptions } from '../src/print-err.ts'

t.formatSnapshot = (v: unknown) => {
  if (Array.isArray(v)) {
    return v.join('\n')
  }
  return v
}

t.cleanSnapshot = (s: string) => {
  const cleaned: string[] = []
  let inStack = false
  let hasStackLine = false
  for (const line of s.split('\n')) {
    if (line.startsWith('Stack:')) {
      inStack = true
    } else if (inStack) {
      if (line.startsWith('  ')) {
        // stack traces are different on different platforms so
        // just verify that there is at least one line of the trace
        if (!hasStackLine) {
          cleaned.push(
            '  __STACK_TRACE__',
            '  __STACK_TRACE__',
            '  __STACK_TRACE__',
          )
        }
        hasStackLine = true
        continue
      } else {
        inStack = false
      }
    }
    cleaned.push(line)
  }
  return cleaned.join('\n')
}

const printErr = (
  e: unknown,
  opts?: { formatter?: ErrorFormatOptions },
) => {
  const lines: string[] = []
  printErrBase(
    e,
    (() => ({ usage: () => 'usage' })) as CommandUsage,
    (...a: string[]) => void lines.push(...a.join(' ').split('\n')),
    { colors: false, ...opts?.formatter },
  )
  return lines
}

t.test('not an error', async t => {
  t.matchSnapshot(printErr(false))
})

t.test('regular error with weird cause', async t => {
  t.matchSnapshot(printErr(new Error('foo bar', { cause: false })))
})

t.test('regular error with no cause', async t => {
  t.matchSnapshot(printErr(new Error('foo bar')))
})

t.test('regular error with cause', async t => {
  t.matchSnapshot(
    printErr(
      new Error('foo bar', {
        cause: { this_is_why_i_errored: true },
      }),
    ),
  )
})

t.test('regular error with regular error cause', async t => {
  t.matchSnapshot(
    printErr(
      new Error('foo bar', {
        cause: new Error('this_is_why_i_errored'),
      }),
    ),
  )
})

t.test('EUSAGE', async t => {
  t.matchSnapshot(printErr(error('bloopy doop', { code: 'EUSAGE' })))
  t.matchSnapshot(
    printErr(
      error('bloopy doop', {
        code: 'EUSAGE',
        validOptions: ['a', 'b'],
        found: 'x',
      }),
    ),
  )
})

t.test('ERESOLVE', async t => {
  t.matchSnapshot(
    printErr(error('bloopy doop', { code: 'ERESOLVE' })),
  )
  t.matchSnapshot(
    printErr(
      error('bloopy doop', {
        code: 'ERESOLVE',
        url: new URL('https://x.y/'),
        spec: 'x@1.x',
        from: '/home/base',
        response: { statusCode: 200 },
      }),
    ),
  )
})

t.test('ECONFIG', async t => {
  t.matchSnapshot(
    printErr(
      error('Invalid config keys', {
        code: 'ECONFIG',
        found: ['garbage'],
        wanted: 'string[]',
        validOptions: ['wanted'],
      }),
    ),
  )
  t.matchSnapshot(
    printErr(
      error('Invalid config keys', {
        code: 'ECONFIG',
      }),
    ),
  )
})

t.test('EREQUEST', async t => {
  t.test('with cause', async t => {
    t.matchSnapshot(
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
      ),
    )
  })
})

t.test('no cause', async t => {
  t.matchSnapshot(
    printErr(
      error('oh no! my request!', {
        code: 'EREQUEST',
        url: new URL('https://x.y/'),
        method: 'GET',
      }),
    ),
  )
})

t.test('unknown code and max lines', async t => {
  t.matchSnapshot(
    printErr(
      error('this is an error', {
        code: 'ENOTACODEWEKNOWABOUT' as Codes,
        wanted: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`__${i}__`, i]),
        ),
      }),
      { formatter: { maxLines: 5 } },
    ),
  )
})

t.test('error with a missing code', async t => {
  t.matchSnapshot(
    printErr(error('this is an error', { found: 'wat' })),
  )
})

t.test('chain', async t => {
  t.matchSnapshot(
    printErr(
      error('root error', {
        code: 'EUNKNOWN',
        name: 'root error name',
        cause: error('cause 1', {
          name: 'cause 1 name',
          min: 100,
          cause: error('cause 2', {
            name: 'cause 2 name',
            max: 200,
            cause: error('cause 3', {
              name: 'cause 3 name',
              wanted: 'what',
            }),
          }),
        }),
      }),
    ),
  )

  t.matchSnapshot(
    printErr(
      new Error('root error', {
        cause: new Error('cause 1', {
          cause: new Error('cause 2', {
            cause: new Error('cause 3', {
              cause: {
                arbitrary: 'thing',
              },
            }),
          }),
        }),
      }),
    ),
  )
})
