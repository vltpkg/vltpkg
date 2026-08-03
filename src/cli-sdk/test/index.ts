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

// the `needsRegistry` gate itself lives in outputCommand, which is
// mocked out here. these cover the config plumbing that feeds it.
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
