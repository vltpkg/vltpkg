import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import type { PromptFn, VlxOptions } from '@vltpkg/vlx'
import { resolve } from 'node:path'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { ExecResult } from '../../src/exec-command.ts'

const NPM_REGISTRY_OPTIONS = {
  registries: { npm: 'https://registry.npmjs.org' },
}

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

t.test('views', async t => {
  const { views } = await t.mockImport<
    typeof import('../../src/commands/create.ts')
  >('../../src/commands/create.ts')
  unload()

  t.test('pkg-example result', async t => {
    const logs = t.capture(console, 'log').args
    const result = { targetDir: '/some/path/my-package' }
    t.equal(views.human(result), undefined)
    t.strictSame(logs(), [
      ['Created package in /some/path/my-package'],
    ])
    t.strictSame(views.json(result), result)
  })

  t.test('exec result delegates to exec-command views', async t => {
    const result = {
      status: 0,
      signal: null,
      stdout: '',
      stderr: '',
    } as unknown as ExecResult
    t.equal(views.human(result), undefined)
    t.equal(views.json(result), undefined)
  })
})

t.test('command', async t => {
  t.test(
    'throws missing-registry error when no registry configured',
    async t => {
      const { command } = await t.mockImport<
        typeof import('../../src/commands/create.ts')
      >('../../src/commands/create.ts')
      unload()
      const conf = {
        positionals: ['react-app', 'my-app'],
        options: { registries: {} },
        get: (_key: string) => undefined,
      } as unknown as LoadedConfig
      await t.rejects(command(conf), /Missing registry configuration/)
    },
  )

  t.test('basic package transformation', async t => {
    let calledResolve = false
    const mockOptions = {
      'script-shell': 'this will be deleted',
      ...NPM_REGISTRY_OPTIONS,
    }
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
          // vlx receives the package name as a positional (not user args)
          t.strictSame(args, ['create-react-app'])
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
    const mockOptions = { ...NPM_REGISTRY_OPTIONS }
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
          _options: VlxOptions,
          _promptFn?: PromptFn,
        ) => {
          calledResolve = true
          t.strictSame(args, ['@scope/create-template'])
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
    const mockOptions = { ...NPM_REGISTRY_OPTIONS }
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
          _options: VlxOptions,
          _promptFn?: PromptFn,
        ) => {
          calledResolve = true
          t.strictSame(args, ['@scope/create'])
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
    const mockOptions = { ...NPM_REGISTRY_OPTIONS }
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
          t.strictSame(args, ['create-vite'])
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

  t.test('--yes flag auto-accepts prompts', async t => {
    let promptUsed: PromptFn | undefined
    const mockOptions = { ...NPM_REGISTRY_OPTIONS }
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
          prompt?: PromptFn,
        ) => {
          promptUsed = prompt
          return 'arg0'
        },
      },
    })
    unload()
    const conf = {
      positionals: ['next', 'app'],
      options: mockOptions,
      get: (key: string) => (key === 'yes' ? true : undefined),
    } as unknown as LoadedConfig
    await command(conf)
    t.ok(promptUsed, 'promptFn was provided')
    // When --yes is set, promptFn should auto-accept
    const answer = await promptUsed!(
      Spec.parse('a@1'),
      '/some/path',
      'https://example.com',
    )
    t.equal(answer, 'y', '--yes auto-accepts prompts')
  })

  t.test('pkg-example', async t => {
    let calledWith: string | undefined
    const { command } = await t.mockImport<
      typeof import('../../src/commands/create.ts')
    >('../../src/commands/create.ts', {
      '../../src/pkg-example.ts': {
        createPkgExample: async (targetDir: string) => {
          calledWith = targetDir
        },
      },
      '@vltpkg/vlx': {
        resolve: async () => {
          throw new Error('vlx.resolve should not be called')
        },
      },
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run(): Promise<never> {
            throw new Error('ExecCommand should not be used')
          }
        },
      },
    })
    unload()
    const conf = {
      positionals: ['pkg-example', 'my-package'],
      options: {},
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig
    const result = await command(conf)
    t.equal(calledWith, resolve('my-package'))
    t.strictSame(result, { targetDir: resolve('my-package') })
  })

  t.test('pkg-example defaults target dir to cwd', async t => {
    let calledWith: string | undefined
    const { command } = await t.mockImport<
      typeof import('../../src/commands/create.ts')
    >('../../src/commands/create.ts', {
      '../../src/pkg-example.ts': {
        createPkgExample: async (targetDir: string) => {
          calledWith = targetDir
        },
      },
    })
    unload()
    const conf = {
      positionals: ['pkg-example'],
      options: {},
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig
    const result = await command(conf)
    t.equal(calledWith, resolve('.'))
    t.strictSame(result, { targetDir: resolve('.') })
  })

  t.test('when vlx.resolve returns undefined', async t => {
    const mockOptions = { ...NPM_REGISTRY_OPTIONS }
    const { command } = await t.mockImport<
      typeof import('../../src/commands/create.ts')
    >('../../src/commands/create.ts', {
      '../../src/exec-command.ts': {
        views: {},
        ExecCommand: class {
          async run() {
            return { status: 0, signal: null }
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
    await t.rejects(
      command(conf),
      /Could not resolve executable for package/,
    )
  })
})
