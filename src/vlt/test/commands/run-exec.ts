import { resolve } from 'path'
import t from 'tap'
import { command, usage } from '../../src/commands/run-exec.ts'
import { setupEnv } from '../fixtures/run.ts'

setupEnv(t)

const pass = 'node -e "process.exit(0)"'

if (process.argv[1] === import.meta.filename) {
  t.matchSnapshot(usage().usage(), 'usage')
}

t.test('run script in a project', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      scripts: {
        echo: pass,
      },
    }),
    'vlt.json': JSON.stringify({}),
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const conf = await Config.load(t.testdirName, ['echo'])
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const { result } = await command(conf)
  t.strictSame(result, {
    command: pass,
    args: [],
    cwd: dir,
    stdout: null,
    stderr: null,
    status: 0,
    signal: null,
    pre: undefined,
  })
  t.strictSame(logs(), [[result]])
  t.strictSame(errs(), [])
})

t.test('run script in a single workspace', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify('src/ws'),
    src: {
      ws: {
        'package.json': JSON.stringify({
          scripts: {
            echo: pass,
          },
        }),
      },
    },
    'vlt.json': JSON.stringify({}),
    '.git': {},
  })
  t.chdir(dir + '/src/ws')
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const conf = await Config.load(t.testdirName, ['echo'])
  conf.values.workspace = ['src/ws']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const { result } = await command(conf)
  t.strictSame(result, {
    command: pass,
    args: [],
    cwd: resolve(dir, 'src/ws'),
    stdout: null,
    stderr: null,
    status: 0,
    signal: null,
    pre: undefined,
  })
  t.strictSame(logs(), [[result]])
  t.strictSame(errs(), [])
})

t.test('run script across several workspaces', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify('src/*'),
    src: {
      a: {
        'package.json': JSON.stringify({}),
      },
      b: {
        'package.json': JSON.stringify({
          scripts: {
            echo: 'echo pj script',
          },
        }),
      },
    },
    'vlt.json': JSON.stringify({}),
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const conf = await Config.load(t.testdirName, ['echo', 'ok'])
  conf.values.workspace = ['src/a', 'src/b']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const { result } = await command(conf)
  t.strictSame(result, {
    'src/a': {
      command: 'echo',
      args: ['ok'],
      cwd: resolve(dir, 'src/a'),
      status: 0,
      signal: null,
      stdout: '',
      stderr: '',
    },
    'src/b': {
      command: 'echo pj script',
      args: ['ok'],
      cwd: resolve(dir, 'src/b'),
      status: 0,
      signal: null,
      stdout: '',
      stderr: '',
      pre: undefined,
    },
  })
  t.strictSame(
    new Set(logs()),
    new Set([
      ['src/a', 'ok'],
      ['src/b', 'ok'],
    ]),
  )
  t.strictSame(
    new Set(errs()),
    new Set([['src/b echo'], ['src/a echo']]),
  )
})
