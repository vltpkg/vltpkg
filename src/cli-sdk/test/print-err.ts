import type { Codes } from '@vltpkg/error-cause'
import { error } from '@vltpkg/error-cause'
import assert from 'node:assert'
import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'
import type { CommandUsage } from '../src/index.ts'
import type { ErrorFormatOptions } from '../src/print-err.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'

t.cleanSnapshot = (s: string) =>
  s
    .replaceAll(sep, '/')
    .replace(/(^\s+at)([^)]+\))/gm, '$1 {STACK_LINE}')

const testErr = async (
  t: Test,
  name: string,
  e: unknown,
  opts?: { formatter?: ErrorFormatOptions },
) =>
  t.test(name, async t => {
    const dir = t.testdir()
    t.intercept(process, 'env', {
      value: {
        ...process.env,
        XDG_DATA_HOME: dir,
      },
    })
    t.intercept(process, 'pid', {
      value: 123,
    })

    const formatOptions = { colors: false }

    const lines: string[] = []
    const { printErr } = await t.mockImport<
      typeof import('../src/print-err.ts')
    >('../src/print-err.ts')
    printErr(
      e,
      (() => ({ usage: () => 'usage' })) as CommandUsage,
      (...a: string[]) => void lines.push(...a.join(' ').split('\n')),
      { ...formatOptions, ...opts?.formatter },
    )

    const linesNoFile: string[] = []
    const { printErr: printErrNoFile } = await t.mockImport<
      typeof import('../src/print-err.ts')
    >('../src/print-err.ts', {
      'node:fs': {
        mkdirSync: () => {
          throw new Error('')
        },
        writeFileSync: () => {
          throw new Error('')
        },
        readFileSync: () => {
          throw new Error('')
        },
      },
    })
    printErrNoFile(
      e,
      (() => ({ usage: () => 'usage' })) as CommandUsage,
      (...a: string[]) =>
        void linesNoFile.push(...a.join(' ').split('\n')),
      { ...formatOptions, ...opts?.formatter },
    )

    let fileContents: string | null = null
    try {
      const file = readdirSync(join(dir, 'vlt/error-logs'), {
        withFileTypes: true,
      }).find(f => f.name.endsWith('.log'))
      assert(file)
      fileContents = readFileSync(
        join(file.parentPath, file.name),
        'utf-8',
      )
    } catch {}

    const output = lines.join('\n')
    t.matchSnapshot(output, 'output')

    if (fileContents) {
      t.matchSnapshot(fileContents, 'file')
      const outputNoFile = linesNoFile.join('\n')
      if (fileContents !== outputNoFile) {
        t.matchSnapshot(outputNoFile, 'output no file')
      }
    }
  })

t.test('snapshots', async t => {
  await testErr(t, 'not an error', false)
  await testErr(
    t,
    'regular error with weird cause',
    new Error('foo bar', { cause: false }),
  )
  await testErr(
    t,
    'regular error with no cause',
    new Error('foo bar'),
  )
  await testErr(
    t,
    'regular error with cause',
    new Error('foo bar', { cause: { this_is_why_i_errored: true } }),
  )
  await testErr(
    t,
    'regular error with regular error cause',
    new Error('foo bar', {
      cause: new Error('this_is_why_i_errored'),
    }),
  )
  t.test('EUSAGE', async t => {
    await testErr(
      t,
      'basic',
      error('bloopy doop', { code: 'EUSAGE' }),
    )
    await testErr(
      t,
      'validOptions',
      error('bloopy doop', {
        code: 'EUSAGE',
        validOptions: ['a', 'b'],
        found: 'x',
      }),
    )
  })

  t.test('ERESOLVE', async t => {
    await testErr(
      t,
      'basic',
      error('bloopy doop', { code: 'ERESOLVE' }),
    )
    await testErr(
      t,
      'url',
      error('bloopy doop', {
        code: 'ERESOLVE',
        url: new URL('https://x.y/'),
        spec: 'x@1.x',
        from: '/home/base',
        response: { statusCode: 200 },
      }),
    )
  })

  t.test('ECONFIG', async t => {
    await testErr(
      t,
      'code',
      error('Invalid config keys', {
        code: 'ECONFIG',
        found: ['garbage'],
        wanted: 'string[]',
        validOptions: ['wanted'],
      }),
    )
    await testErr(
      t,
      'no code',
      error('Invalid config keys', {
        code: 'ECONFIG',
      }),
    )
  })

  t.test('EREQUEST', async t => {
    await testErr(
      t,
      'with cause',
      error('oh no! my request!', { code: 'EREQUEST' }),
    )
    await testErr(
      t,
      'internal cause',
      error('oh no! my request!', {
        code: 'EREQUEST',
        url: new URL('https://x.y/'),
        method: 'GET',
        cause: Object.assign(new Error('some internal thing'), {
          code: 'ECONNRESET',
          syscall: 'read',
        }),
      }),
    )
    await testErr(
      t,
      'no cause',
      error('oh no! my request!', {
        code: 'EREQUEST',
        url: new URL('https://x.y/'),
        method: 'GET',
      }),
    )
  })

  await testErr(
    t,
    'unknown code and max lines',
    error('this is an error', {
      code: 'ENOTACODEWEKNOWABOUT' as Codes,
      wanted: Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [`__${i}__`, i]),
      ),
    }),
    { formatter: { maxLines: 5 } },
  )

  await testErr(
    t,
    'error with a missing code',
    error('this is an error', { found: 'wat' }),
  )

  await testErr(
    t,
    'error-cause',
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
  )

  await testErr(
    t,
    'native error causes',
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
  )

  await testErr(
    t,
    'graph-run error with stderr',
    new Error('failed graph traversal', {
      cause: {
        code: 'GRAPHRUN_TRAVERSAL',
        node: {
          id: joinDepIDTuple(['workspace', 'www/docs']),
        },
        path: [{ id: joinDepIDTuple(['registry', '', 'a@1.2.3']) }],
        cause: new Error('command failed', {
          cause: {
            command: 'astro sync',
            args: ['x'],
            stdout: '',
            stderr: 'error message',
            cwd: '/some/path/to/www/docs',
            status: 1,
            signal: null,
          },
        }),
      },
    }),
  )

  await testErr(
    t,
    'graph-run error with stdout',
    new Error('failed graph traversal', {
      cause: {
        code: 'GRAPHRUN_TRAVERSAL',
        node: {
          id: joinDepIDTuple(['workspace', 'www/docs']),
        },
        path: [{ id: joinDepIDTuple(['registry', '', 'a@1.2.3']) }],
        cause: new Error('command failed', {
          cause: {
            command: 'astro sync',
            args: ['x'],
            stdout: 'output message',
            stderr: '',
            cwd: '/some/path/to/www/docs',
            status: 1,
            signal: null,
          },
        }),
      },
    }),
  )

  await testErr(
    t,
    'graph-run error no stdio output',
    new Error('failed graph traversal', {
      cause: {
        code: 'GRAPHRUN_TRAVERSAL',
        node: {
          id: joinDepIDTuple(['workspace', 'www/docs']),
        },
        path: [],
        cause: new Error('command failed', {
          cause: {
            command: 'astro sync',
            args: [],
            stdout: '',
            stderr: '',
            cwd: '/some/path/to/www/docs',
            status: null,
            signal: 'SIGINT',
          },
        }),
      },
    }),
  )

  await testErr(
    t,
    'graph-run error without spawn error',
    new Error('failed graph traversal', {
      cause: {
        code: 'GRAPHRUN_TRAVERSAL',
        node: {
          id: joinDepIDTuple(['workspace', 'www/docs']),
        },
        path: [],
      },
    }),
  )
})

t.test('prints full error log contents to stderr in CI', async t => {
  const dir = t.testdir()
  t.intercept(process, 'env', {
    value: {
      ...process.env,
      CI: '1',
      XDG_DATA_HOME: dir,
    },
  })
  t.intercept(process, 'pid', {
    value: 123,
  })

  const lines: string[] = []
  const { printErr } = await t.mockImport<
    typeof import('../src/print-err.ts')
  >('../src/print-err.ts')
  printErr(
    { marker: 'ci-log-marker' },
    (() => ({ usage: () => 'usage' })) as CommandUsage,
    (...a: string[]) => void lines.push(...a.join(' ').split('\n')),
    { colors: false },
  )

  const output = lines.join('\n')
  t.match(output, /Full details written to:/)
  t.match(output, /Full details:/)
  t.match(output, /ci-log-marker/)
})

t.test(
  'does not print full error log contents outside CI',
  async t => {
    const dir = t.testdir()
    t.intercept(process, 'env', {
      value: {
        ...process.env,
        XDG_DATA_HOME: dir,
      },
    })
    t.intercept(process, 'pid', {
      value: 123,
    })

    const lines: string[] = []
    const { printErr } = await t.mockImport<
      typeof import('../src/print-err.ts')
    >('../src/print-err.ts')
    printErr(
      { marker: 'non-ci-log-marker' },
      (() => ({ usage: () => 'usage' })) as CommandUsage,
      (...a: string[]) => void lines.push(...a.join(' ').split('\n')),
      { colors: false },
    )

    const output = lines.join('\n')
    t.match(output, /Full details written to:/)
    t.notMatch(output, /Full details:/)
    t.notMatch(output, /non-ci-log-marker/)
  },
)

t.test('continues when reading CI error log fails', async t => {
  const dir = t.testdir()
  t.intercept(process, 'env', {
    value: {
      ...process.env,
      CI: '1',
      XDG_DATA_HOME: dir,
    },
  })
  t.intercept(process, 'pid', {
    value: 123,
  })

  const lines: string[] = []
  const { printErr } = await t.mockImport<
    typeof import('../src/print-err.ts')
  >('../src/print-err.ts', {
    'node:fs': {
      mkdirSync: () => {},
      writeFileSync: () => {},
      readFileSync: () => {
        throw new Error('')
      },
    },
  })
  printErr(
    { marker: 'ci-log-failed-read-marker' },
    (() => ({ usage: () => 'usage' })) as CommandUsage,
    (...a: string[]) => void lines.push(...a.join(' ').split('\n')),
    { colors: false },
  )

  const output = lines.join('\n')
  t.match(output, /Full details written to:/)
  t.notMatch(output, /Full details:/)
  t.notMatch(output, /ci-log-failed-read-marker/)
})
