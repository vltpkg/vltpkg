import { resolve } from 'node:path'
import t from 'tap'
import {
  command,
  usage,
  views,
} from '../../src/commands/exec-local.ts'
import type { ExecResult } from '../../src/exec-command.ts'
import { setupEnv } from '../fixtures/util.ts'

setupEnv(t)

const pass = 'node -e "process.exit(0)"'

if (process.argv[1] === import.meta.filename) {
  t.matchSnapshot(usage().usage(), 'usage')
}

t.test('views are mostly silent', async t => {
  const ok = {
    status: 0,
    signal: null,
    stdout: '',
    stderr: '',
  } as unknown as ExecResult
  const status = { status: 1, signal: null } as unknown as ExecResult
  const signal = {
    status: null,
    signal: 'SIGINT',
  } as unknown as ExecResult
  t.equal(views.human(ok), undefined)
  t.equal(views.human(status), undefined)
  t.equal(views.human(signal), undefined)
  t.equal(views.json(ok), undefined)
  t.equal(views.json(status), status)
  t.equal(views.json(signal), signal)
})

t.test('run script in a project', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      scripts: {
        echo: pass,
      },
    }),
    'vlt.json': JSON.stringify({ config: {} }),
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
  t.strictSame(logs(), [])
  t.strictSame(errs(), [])
})

t.test('run script in a single workspace', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/ws' }),
    src: {
      ws: {
        'package.json': JSON.stringify({
          scripts: {
            echo: pass,
          },
        }),
      },
    },
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
  t.strictSame(logs(), [])
  t.strictSame(errs(), [])
})

t.test('run script across several workspaces', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
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
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const conf = await Config.load(t.testdirName, ['echo', 'ok'])
  conf.values.workspace = ['src/a', 'src/b']
  conf.values.view = 'human'
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
  t.strictSame(new Set(errs()), new Set())
})
