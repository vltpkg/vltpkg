import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import type { PromptFn, VlxOptions } from '@vltpkg/vlx'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { ExecResult } from '../../src/exec-command.ts'

t.test('prettpath', async t => {
  const { prettyPath } = await t.mockImport<
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts', {
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
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts', {
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
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts')
  unload()
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
})

t.test('command with --call (no package)', async t => {
  const result = { status: 0, signal: null } as unknown as ExecResult
  let resolveCallCount = 0
  const { command } = await t.mockImport<
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts', {
    '../../src/exec-command.ts': {
      views: {},
      ExecCommand: class {
        async run() {
          return result
        }
      },
    },
    '@vltpkg/vlx': {
      resolve: async () => {
        resolveCallCount++
        return undefined
      },
    },
  })
  unload()
  const conf = {
    positionals: [] as string[],
    options: {},
    get: (key: string) => {
      if (key === 'call') return 'echo $PWD'
      if (key === 'script-shell') return '/bin/sh'
      return undefined
    },
  } as unknown as LoadedConfig
  t.equal(await command(conf), result)
  t.equal(resolveCallCount, 0)
  t.strictSame(conf.positionals, ['/bin/sh', '-c', 'echo $PWD'])
})

t.test('command with --call and package in positionals', async t => {
  const result = { status: 0, signal: null } as unknown as ExecResult
  let resolveArgs: string[] | undefined
  let resolveOptions: (VlxOptions & { package?: string }) | undefined
  let resolvePromptFn: PromptFn | undefined = (() =>
    Promise.resolve('')) as PromptFn
  const { command } = await t.mockImport<
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts', {
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
        options: VlxOptions & { package?: string },
        pFn?: PromptFn,
      ) => {
        resolveArgs = args
        resolveOptions = options
        resolvePromptFn = pFn
        return undefined
      },
    },
  })
  unload()
  const conf = {
    positionals: ['create-react-app'] as string[],
    options: {},
    get: (key: string) => {
      if (key === 'call') return 'echo $PWD'
      if (key === 'script-shell') return '/bin/sh'
      return undefined
    },
  } as unknown as LoadedConfig
  t.equal(await command(conf), result)
  t.strictSame(resolveArgs, [])
  t.equal(resolveOptions?.package, 'create-react-app')
  t.equal(
    resolvePromptFn,
    undefined,
    'no promptFn passed when using --call',
  )
  t.strictSame(conf.positionals, ['/bin/sh', '-c', 'echo $PWD'])
})

t.test('command with --call and explicit --package', async t => {
  const result = { status: 0, signal: null } as unknown as ExecResult
  let resolveOptions: (VlxOptions & { package?: string }) | undefined
  let resolvePromptFn: PromptFn | undefined = (() =>
    Promise.resolve('')) as PromptFn
  const { command } = await t.mockImport<
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts', {
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
        options: VlxOptions & { package?: string },
        pFn?: PromptFn,
      ) => {
        resolveOptions = options
        resolvePromptFn = pFn
        return undefined
      },
    },
  })
  unload()
  const conf = {
    positionals: [] as string[],
    options: {},
    get: (key: string) => {
      if (key === 'call') return 'cowsay hello'
      if (key === 'package') return 'cowsay'
      if (key === 'script-shell') return '/bin/sh'
      return undefined
    },
  } as unknown as LoadedConfig
  t.equal(await command(conf), result)
  t.equal(resolveOptions?.package, 'cowsay')
  t.equal(
    resolvePromptFn,
    undefined,
    'no promptFn passed when using --call',
  )
  t.strictSame(conf.positionals, ['/bin/sh', '-c', 'cowsay hello'])
})

t.test(
  'command with --call falls back to /bin/sh when no SHELL env',
  async t => {
    const result = {
      status: 0,
      signal: null,
    } as unknown as ExecResult
    const { command } = await t.mockImport<
      typeof import('../../src/commands/exec.ts')
    >('../../src/commands/exec.ts', {
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run() {
            return result
          }
        },
      },
      '@vltpkg/vlx': {
        resolve: async () => undefined,
      },
      'node:process': t.createMock(await import('node:process'), {
        env: { ...process.env, SHELL: undefined },
        platform: 'linux',
      }),
    })
    unload()
    const conf = {
      positionals: [] as string[],
      options: {},
      get: (key: string) => (key === 'call' ? 'echo hi' : undefined),
    } as unknown as LoadedConfig
    t.equal(await command(conf), result)
    t.strictSame(conf.positionals, ['/bin/sh', '-c', 'echo hi'])
  },
)

t.test(
  'command with --call falls back to cmd.exe on win32',
  async t => {
    const result = {
      status: 0,
      signal: null,
    } as unknown as ExecResult
    const { command } = await t.mockImport<
      typeof import('../../src/commands/exec.ts')
    >('../../src/commands/exec.ts', {
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run() {
            return result
          }
        },
      },
      '@vltpkg/vlx': {
        resolve: async () => undefined,
      },
      'node:process': t.createMock(await import('node:process'), {
        env: { ...process.env, SHELL: undefined },
        platform: 'win32',
      }),
    })
    unload()
    const conf = {
      positionals: [] as string[],
      options: {},
      get: (key: string) => (key === 'call' ? 'echo hi' : undefined),
    } as unknown as LoadedConfig
    t.equal(await command(conf), result)
    t.strictSame(conf.positionals, ['cmd.exe', '/c', 'echo hi'])
  },
)

t.test(
  'command with --call uses script-shell if configured',
  async t => {
    const result = {
      status: 0,
      signal: null,
    } as unknown as ExecResult
    const { command } = await t.mockImport<
      typeof import('../../src/commands/exec.ts')
    >('../../src/commands/exec.ts', {
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run() {
            return result
          }
        },
      },
      '@vltpkg/vlx': {
        resolve: async () => undefined,
      },
    })
    unload()
    const conf = {
      positionals: [] as string[],
      options: {},
      get: (key: string) => {
        if (key === 'call') return 'echo hello'
        if (key === 'script-shell') return '/bin/zsh'
        return undefined
      },
    } as unknown as LoadedConfig
    t.equal(await command(conf), result)
    t.strictSame(conf.positionals, ['/bin/zsh', '-c', 'echo hello'])
  },
)

t.test('command', async t => {
  let calledResolve = false
  const mockOptions = { 'script-shell': 'this will be deleted' }
  const result = { status: 0, signal: null } as unknown as ExecResult
  const { command } = await t.mockImport<
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts', {
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
        t.strictSame(args, ['a', 'b', 'c'])
        t.strictSame(options, {
          ...mockOptions,
          query: undefined,
          allowScripts: ':not(*)',
        })
        return 'arg0'
      },
    },
  })
  unload()
  const conf = {
    positionals: ['a', 'b', 'c'],
    options: mockOptions,
    get: (_key: string) => undefined,
  } as unknown as LoadedConfig
  t.equal(await command(conf), result)
  t.equal(calledResolve, true)
  t.strictSame(mockOptions, {})
  t.strictSame(conf.positionals, ['arg0', 'b', 'c'])
})
