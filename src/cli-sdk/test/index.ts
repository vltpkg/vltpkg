import { unload } from '@vltpkg/vlt-json'
import { join } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'
import { setupEnv } from './fixtures/util.ts'

setupEnv(t)

// normalize paths on windows
t.cleanSnapshot = s => s.replace(/\\/g, '/')

export const run = async (
  t: Test,
  {
    argv = [],
    cwd = process.cwd(),
  }: {
    argv?: string[]
    cwd?: string
  } = {},
) => {
  // Do not pick up user configs in the home directory
  process.env.XDG_CONFIG_HOME = t.testdirName
  t.intercept(process, 'argv', {
    value: [process.execPath, 'index.ts', ...argv],
  })
  const state = {
    logs: [] as string[],
    config: {} as LoadedConfig,
    error: null as unknown,
  }
  t.chdir(cwd)
  const index = await t.mockImport<typeof import('../src/index.ts')>(
    '../src/index.ts',
    {
      '../src/output.ts': {
        stdout: (v: string) => state.logs.push(v),
        stderr: (v: string) => state.logs.push(v),
        outputCommand: (_: unknown, conf: LoadedConfig) =>
          (state.config = conf),
        flushAndExit: (code?: number) => process.exit(code),
      },
    },
  )
  unload()
  try {
    await index.default()
  } catch (e) {
    state.error = e
  }
  return state
}

t.test('infer workspace', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/foo' }),
    src: {
      foo: {
        'package.json': JSON.stringify({ name: '@acme/foo' }),
      },
    },
  })
  t.chdir(join(dir, 'src/foo'))
  const { config } = await run(t)
  t.strictSame(config.get('workspace'), ['src/foo'])
})

t.test('infer workspace from package.json workspaces', async t => {
  // an ordinary npm monorepo: no vlt.json at all. The `.git` entry stops
  // vlt-json's find() from walking up out of the fixture.
  const dir = t.testdir({
    '.git': {},
    'package.json': JSON.stringify({
      name: '@acme/root',
      private: true,
      workspaces: ['packages/*', '!packages/legacy'],
    }),
    packages: {
      foo: { 'package.json': JSON.stringify({ name: '@acme/foo' }) },
      legacy: {
        'package.json': JSON.stringify({ name: '@acme/legacy' }),
      },
    },
  })
  t.chdir(join(dir, 'packages/foo'))
  const { config } = await run(t)
  t.strictSame(config.get('workspace'), ['packages/foo'])
  t.strictSame(
    new Set([...(config.options.monorepo?.names() ?? [])]),
    new Set(['@acme/foo']),
    'the negated workspace is not loaded',
  )
})

t.test('no workspace inferred for the global project', async t => {
  const dir = t.testdir({
    g: {
      packages: {
        'x-global-ws': {
          'package.json': JSON.stringify({ name: 'x-global-ws' }),
        },
      },
    },
  })
  const g = join(dir, 'g')
  const { config } = await run(t, {
    argv: ['install', '-g', `--global-dir=${g}`],
    cwd: join(g, 'packages/x-global-ws'),
  })
  t.equal(config.globalRoot, g)
  t.equal(config.get('workspace'), undefined)
  t.ok(config.options.monorepo?.get('x-global-ws'))
})

t.test('print version', async t => {
  const { logs } = await run(t, { argv: ['-v'] })
  t.matchOnly(logs[0], /^\d\.\d\.\d/)
})

t.test('unknown config', async t => {
  let exitCode = 0
  // intercept process.exit to throw so that the test will finish
  // but the run will not continue
  t.intercept(process, 'exit', {
    value: (code: number) => {
      exitCode = code
      if (code !== 0) {
        throw new Error()
      }
    },
  })
  const { error, logs } = await run(t, { argv: ['--unknown'] })
  t.type(error, Error, 'error should be Error')
  t.equal(exitCode, 1, 'exit code')
  t.matchSnapshot(logs.join('\n'))
})

t.test('unknown config in file', async t => {
  let exitCode = 0
  const cwd = t.testdir({
    'vlt.json': JSON.stringify({
      config: {
        asdf: 'foo',
      },
    }),
  })

  // intercept process.exit to throw so that the test will finish
  // but the run will not continue
  t.intercept(process, 'exit', {
    value: (code: number) => {
      exitCode = code
      if (code !== 0) {
        throw new Error()
      }
    },
  })
  const { error, logs } = await run(t, { argv: [], cwd })
  t.ok(error instanceof Error)
  t.equal(exitCode, 1)
  t.matchSnapshot(logs.join('\n'))
})

t.test('invalid config in file', async t => {
  let exitCode = 0
  const cwd = t.testdir({
    'vlt.json': JSON.stringify({
      config: {
        color: 'foo',
      },
    }),
  })

  // intercept process.exit to throw so that the test will finish
  // but the run will not continue
  t.intercept(process, 'exit', {
    value: (code: number) => {
      exitCode = code
      if (code !== 0) {
        throw new Error()
      }
    },
  })
  const { error, logs } = await run(t, { argv: [], cwd })
  t.ok(error instanceof Error)
  t.equal(exitCode, 1)
  t.matchSnapshot(logs.join('\n'))
})

t.test('config errors', async t => {
  const exit = (t: Test) => {
    const codes: number[] = []
    t.intercept(process, 'exit', {
      value: (code: number) => {
        codes.push(code)
        throw new Error()
      },
    })
    return codes
  }

  t.test('global project cannot be created', async t => {
    const codes = exit(t)
    const cwd = t.testdir({ file: '' })
    const g = join(cwd, 'file', 'g')
    const { logs } = await run(t, {
      argv: ['ls', '-g', `--global-dir=${g}`],
      cwd,
    })
    t.strictSame(codes, [1])
    t.equal(
      logs[0],
      'Config Error: Could not create the global project',
    )
    t.equal(logs[1], `  Found: ${g}`)
    t.match(logs[2], /^ {2}Cause: /)
    t.equal(logs.length, 3)
  })

  t.test('in a config file', async t => {
    const codes = exit(t)
    const cwd = t.testdir({
      'vlt.json': JSON.stringify({
        config: { registries: { '': 'https://x.example/' } },
      }),
    })
    const { logs } = await run(t, { cwd })
    t.strictSame(codes, [1])
    t.strictSame(logs, [
      'Config Error: Reserved character found in registries name',
      `  File: ${join(cwd, 'vlt.json')}`,
    ])
  })
})

t.test('valid workspace', async t => {
  const cwd = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: ['src/foo'],
    }),
    'package.json': JSON.stringify({ name: '@acme/root' }),
    src: {
      foo: {
        'package.json': JSON.stringify({ name: '@acme/foo' }),
      },
    },
  })
  await t.resolves(
    run(t, {
      argv: ['--workspace', 'src/foo'],
      cwd,
    }),
  )
})

t.test('invalid workspace', async t => {
  let exitCode = 0
  const cwd = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: ['src/foo'],
    }),
    'package.json': JSON.stringify({ name: '@acme/root' }),
    src: {
      foo: {
        'package.json': JSON.stringify({ name: '@acme/foo' }),
      },
    },
  })

  // intercept process.exit to throw so that the test will finish
  // but the run will not continue
  t.intercept(process, 'exit', {
    value: (code: number) => {
      exitCode = code
      if (code !== 0) {
        throw new Error()
      }
    },
  })

  const { error, logs } = await run(t, {
    argv: ['--workspace', 'src/bar'],
    cwd,
  })
  t.ok(error instanceof Error)
  t.equal(exitCode, 1)
  t.matchSnapshot(logs.join('\n'))
})

t.test('invalid workspace - no vlt.json', async t => {
  let exitCode = 0
  const cwd = t.testdir({
    '.git': {},
    'package.json': JSON.stringify({ name: '@acme/root' }),
  })

  // intercept process.exit to throw so that the test will finish
  // but the run will not continue
  t.intercept(process, 'exit', {
    value: (code: number) => {
      exitCode = code
      if (code !== 0) {
        throw new Error()
      }
    },
  })

  const { error, logs } = await run(t, {
    argv: ['--workspace', 'src/bar'],
    cwd,
  })
  t.ok(error instanceof Error)
  t.equal(exitCode, 1)
  t.matchSnapshot(logs.join('\n'))
})

t.test('invalid workspace-group', async t => {
  let exitCode = 0
  const cwd = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: ['src/foo'],
    }),
  })

  // intercept process.exit to throw so that the test will finish
  // but the run will not continue
  t.intercept(process, 'exit', {
    value: (code: number) => {
      exitCode = code
      if (code !== 0) {
        throw new Error()
      }
    },
  })

  const { error, logs } = await run(t, {
    argv: ['--workspace-group', 'a'],
    cwd,
  })
  t.ok(error instanceof Error)
  t.equal(exitCode, 1)
  t.matchSnapshot(logs.join('\n'))
})

// the `needsRegistry` / `needsNpmRegistry` gates live in
// outputCommand, which is mocked out here. these cover the config
// plumbing that feeds them.
t.test('registry config resolution', async t => {
  t.test('undefined when nothing is configured', async t => {
    const cwd = t.testdir({
      'vlt.json': '{}',
      'package.json': JSON.stringify({ name: 'x', version: '1.0.0' }),
    })
    const { error, config } = await run(t, {
      argv: ['ls', '--view=json'],
      cwd,
    })
    t.equal(error, null)
    t.equal(config.options.registry, undefined)
  })

  t.test('--registry', async t => {
    const cwd = t.testdir({
      'vlt.json': '{}',
      'package.json': JSON.stringify({ name: 'x', version: '1.0.0' }),
    })
    const { error, config } = await run(t, {
      argv: [
        'ls',
        '--registry=https://registry.npmjs.org/',
        '--view=json',
      ],
      cwd,
    })
    t.equal(error, null)
    t.equal(config.options.registry, 'https://registry.npmjs.org/')
  })

  t.test('vlt.json', async t => {
    const cwd = t.testdir({
      'vlt.json': JSON.stringify({
        config: { registry: 'https://registry.npmjs.org/' },
      }),
      'package.json': JSON.stringify({ name: 'x', version: '1.0.0' }),
    })
    const { error, config } = await run(t, {
      argv: ['ls', '--view=json'],
      cwd,
    })
    t.equal(error, null)
    t.equal(config.options.registry, 'https://registry.npmjs.org/')
  })
})

t.test('vlt registry <alias> <cmd> dispatch', async t => {
  const cwd = t.testdir({
    'vlt.json': JSON.stringify({
      config: { registries: { npm: 'https://npm.example/' } },
    }),
    'package.json': JSON.stringify({ name: 'x', version: '1.0.0' }),
  })
  const { error, config } = await run(t, {
    argv: ['registry', 'npm', 'whoami'],
    cwd,
  })
  t.equal(error, null)
  t.equal(config.command, 'whoami', 'rewrote command to whoami')
  t.strictSame(config.positionals, [], 'consumed alias + subcommand')
  t.equal(
    config.options.registry,
    'https://npm.example/',
    'injected resolved registry',
  )
})
