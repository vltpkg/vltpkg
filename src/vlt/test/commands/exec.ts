import { resolve } from 'path'
import t from 'tap'

import { command, usage } from '../../src/commands/exec.js'

t.type(usage, 'string')

const pass = 'node -e "process.exit(0)"'

// fresh process.env on every test
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !/^VLT_/i.test(k)),
)
// not sure why this is required, but Windows tests fail without it.
cleanEnv.PATH = process.env.PATH
t.beforeEach(t =>
  t.intercept(process, 'env', { value: { ...cleanEnv } }),
)

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
    typeof import('../../src/config/index.js')
  >('../../src/config/index.js')
  const conf = await Config.load(t.testdirName, ['echo'])
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.strictSame(result, {
    command: 'echo',
    args: [],
    cwd: dir,
    stdout: null,
    stderr: null,
    status: 0,
    signal: null,
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
    typeof import('../../src/config/index.js')
  >('../../src/config/index.js')
  const conf = await Config.load(t.testdirName, ['echo'])
  conf.values.workspace = ['src/ws']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.strictSame(result, {
    command: 'echo',
    args: [],
    cwd: resolve(dir, 'src/ws'),
    stdout: null,
    stderr: null,
    status: 0,
    signal: null,
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
    typeof import('../../src/config/index.js')
  >('../../src/config/index.js')
  const conf = await Config.load(t.testdirName, ['echo', 'ok'])
  conf.values.workspace = ['src/a', 'src/b']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
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
      command: 'echo',
      args: ['ok'],
      cwd: resolve(dir, 'src/b'),
      status: 0,
      signal: null,
      stdout: '',
      stderr: '',
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
