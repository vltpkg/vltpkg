import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import type { PromptFn, VlxOptions } from '@vltpkg/vlx'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { ExecResult } from '../../src/exec-command.ts'

t.test('prettyPath', async t => {
  const { prettyPath } = await t.mockImport<
    typeof import('../../src/commands/create.ts')
  >('../../src/commands/create.ts', {
    'node:os': t.createMock(await import('node:os'), {
      homedir: () => '/a/b/c',
    }),
  })
  unload()
  t.equal(prettyPath('/a/b/c/d/e/f'), '~/d/e/f')
  t.equal(prettyPath('/b/c/d/e/f'), '/b/c/d/e/f')
})

t.test('promptFn', async t => {
  let askedQuestion = false
  const { promptFn } = await t.mockImport<
    typeof import('../../src/commands/create.ts')
  >('../../src/commands/create.ts', {
    'node:readline/promises': {
      createInterface: (stdin: unknown, stdout: unknown) => {
        t.equal(stdin, process.stdin)
        t.equal(stdout, process.stdout)
        return {
          question: async (prompt: unknown) => {
            askedQuestion = true
            t.matchSnapshot(prompt)
            return 'yes'
          },
        }
      },
    },
  })
  unload()

  const pauses = t.capture(process.stdin, 'pause').args
  t.equal(
    await promptFn(
      Spec.parse('a@1.2.3'),
      '/some/path',
      'https://registry.npmjs.org/a/a-1.2.3.tgz',
    ),
    'yes',
  )
  t.strictSame(pauses(), [[]])
  t.equal(askedQuestion, true)
})

t.test('usage', async t => {
  const { usage } = await t.mockImport<
    typeof import('../../src/commands/create.ts')
  >('../../src/commands/create.ts')
  unload()
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
})

t.test('command', async t => {
  t.test('basic package transformation', async t => {
    let calledResolve = false
    const mockOptions = { 'script-shell': 'this will be deleted' }
    const result = {
      status: 0,
      signal: null,
    } as unknown as ExecResult
    const { command } = await t.mockImport<
      typeof import('../../src/commands/create.ts')
    >('../../src/commands/create.ts', {
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run() {
            return result
          }
        },
      },
      '@vltpkg/vlx': {
        resolve: async (
          args: string[],
          options: VlxOptions,
          _promptFn?: PromptFn,
        ) => {
          calledResolve = true
          t.strictSame(args, ['my-app'])
          t.strictSame(options, {
            ...mockOptions,
            package: 'create-react-app',
            query: undefined,
            allowScripts: ':not(*)',
          })
          return 'arg0'
        },
      },
    })
    unload()
    const conf = {
      positionals: ['react-app', 'my-app'],
      options: mockOptions,
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig
    t.strictSame(await command(conf), result)
    t.equal(calledResolve, true)
    t.strictSame(conf.positionals, ['arg0', 'my-app'])
  })

  t.test('scoped package transformation', async t => {
    let calledResolve = false
    const mockOptions = {}
    const result = {
      status: 0,
      signal: null,
    } as unknown as ExecResult
    const { command } = await t.mockImport<
      typeof import('../../src/commands/create.ts')
    >('../../src/commands/create.ts', {
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run() {
            return result
          }
        },
      },
      '@vltpkg/vlx': {
        resolve: async (
          args: string[],
          options: VlxOptions,
          _promptFn?: PromptFn,
        ) => {
          calledResolve = true
          t.strictSame(args, ['my-project'])
          t.strictSame(options.package, '@scope/create-template')
          return 'arg0'
        },
      },
    })
    unload()
    const conf = {
      positionals: ['@scope/template', 'my-project'],
      options: mockOptions,
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig
    t.strictSame(await command(conf), result)
    t.equal(calledResolve, true)
  })

  t.test('missing initializer argument', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/create.ts')
    >('../../src/commands/create.ts')
    unload()
    const conf = {
      positionals: [],
      options: {},
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig
    await t.rejects(
      command(conf),
      /Missing required argument: <initializer>/,
    )
  })

  t.test('scoped package without name', async t => {
    let calledResolve = false
    const mockOptions = {}
    const result = {
      status: 0,
      signal: null,
    } as unknown as ExecResult
    const { command } = await t.mockImport<
      typeof import('../../src/commands/create.ts')
    >('../../src/commands/create.ts', {
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run() {
            return result
          }
        },
      },
      '@vltpkg/vlx': {
        resolve: async (
          args: string[],
          options: VlxOptions,
          _promptFn?: PromptFn,
        ) => {
          calledResolve = true
          t.strictSame(args, ['my-project'])
          t.strictSame(options.package, '@scope/create')
          return 'arg0'
        },
      },
    })
    unload()
    const conf = {
      positionals: ['@scope', 'my-project'],
      options: mockOptions,
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig
    t.strictSame(await command(conf), result)
    t.equal(calledResolve, true)
  })

  t.test('with allow-scripts option', async t => {
    const mockOptions = {}
    const result = {
      status: 0,
      signal: null,
    } as unknown as ExecResult
    const { command } = await t.mockImport<
      typeof import('../../src/commands/create.ts')
    >('../../src/commands/create.ts', {
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run() {
            return result
          }
        },
      },
      '@vltpkg/vlx': {
        resolve: async (
          _args: string[],
          options: VlxOptions,
          _promptFn?: PromptFn,
        ) => {
          t.strictSame(options.allowScripts, 'create-*')
          return 'arg0'
        },
      },
    })
    unload()
    const conf = {
      positionals: ['vite', 'my-app'],
      options: mockOptions,
      get: (key: string) =>
        key === 'allow-scripts' ? 'create-*' : undefined,
    } as unknown as LoadedConfig
    await command(conf)
  })

  t.test('when vlx.resolve returns undefined', async t => {
    const mockOptions = {}
    const result = {
      status: 0,
      signal: null,
    } as unknown as ExecResult
    const { command } = await t.mockImport<
      typeof import('../../src/commands/create.ts')
    >('../../src/commands/create.ts', {
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run() {
            return result
          }
        },
      },
      '@vltpkg/vlx': {
        resolve: async (
          _args: string[],
          _options: VlxOptions,
          _promptFn?: PromptFn,
        ) => {
          return undefined
        },
      },
    })
    unload()
    const conf = {
      positionals: ['vite', 'my-app'],
      options: mockOptions,
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig
    t.strictSame(await command(conf), result)
    t.strictSame(conf.positionals, ['my-app'])
  })
})
