import { joinDepIDTuple } from '@vltpkg/dep-id'
import { resolve } from 'node:path'
import t from 'tap'
import { command, usage } from '../../src/commands/run.ts'
import { setupEnv } from '../fixtures/util.ts'

setupEnv(t)

const pass = 'node -e "process.exit(0)"'
const fail = 'node -e "process.exit(1)"'

if (process.argv[1] === import.meta.filename) {
  t.matchSnapshot(usage().usage(), 'usage')
}

t.test('run script in a project', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      scripts: {
        hello: pass,
      },
    }),
    'vlt.json': JSON.stringify({}),
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const conf = await Config.load(t.testdirName, ['hello'])
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
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
            hello: pass,
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
  const conf = await Config.load(t.testdirName, ['hello'])
  conf.values.workspace = ['src/ws']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
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
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
          },
        }),
      },
      b: {
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
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
  const conf = await Config.load(t.testdirName, ['hello'])
  conf.values.workspace = ['src/a', 'src/b']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.strictSame(result, {
    'src/a': {
      command: pass,
      args: [],
      cwd: resolve(dir, 'src/a'),
      status: 0,
      signal: null,
      stdout: '',
      stderr: '',
      pre: undefined,
    },
    'src/b': {
      command: pass,
      args: [],
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
    new Set([['src/b hello'], ['src/a hello']]),
  )
})

t.test('run script across no workspaces', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify('src/*'),
    src: {
      a: {
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
          },
        }),
      },
      b: {
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
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
  const conf = await Config.load(t.testdirName, ['hello'])
  conf.values.workspace = ['src/c']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  await t.rejects(command(conf), {
    message: 'no matching workspaces found',
    cause: {
      validOptions: new Set(['src/a', 'src/b']),
    },
  })
  t.strictSame(logs(), [])
  t.strictSame(errs(), [])
})

t.test('one ws fails, with bail', async t => {
  const { exitCode } = process
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify('src/*'),
    src: {
      a: {
        'package.json': JSON.stringify({
          scripts: {
            hello: fail,
          },
        }),
      },
      b: {
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
          },
        }),
      },
    },
    'vlt.json': JSON.stringify({
      recursive: true,
      bail: true,
    }),
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const conf = await Config.load(t.testdirName, ['hello'])
  conf.values['workspace-group'] = ['packages']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  await t.rejects(command(conf), {
    message: 'failed graph traversal',
    cause: {
      node: {
        id: joinDepIDTuple(['workspace', 'src/a']),
        path: 'src/a',
        fullpath: resolve(dir, 'src/a'),
        manifest: {
          scripts: {
            hello: fail,
          },
        },
        groups: ['packages'],
        name: 'src/a',
      },
      path: [],
      cause: {
        message: 'command failed',
        cause: {
          command: 'node -e "process.exit(1)"',
          args: [],
          cwd: resolve(dir, 'src/a'),
          status: 1,
          signal: null,
          stdout: '',
          stderr: '',
        },
      },
    },
  })

  t.match(
    new Set(logs()),
    new Set([
      [
        'src/a failure',
        {
          status: 1,
        },
      ],
    ]),
  )
  t.strictSame(
    new Set(errs()),
    new Set([['src/b hello'], ['src/a hello']]),
  )
  t.equal(process.exitCode, exitCode || 1)
  process.exitCode = exitCode
})

t.test('one ws fails, without bail', async t => {
  const { exitCode } = process
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify('src/*'),
    src: {
      a: {
        'package.json': JSON.stringify({
          scripts: {
            hello: fail,
          },
        }),
      },
      b: {
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
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
  const conf = await Config.load(t.testdirName, ['hello'])
  conf.values.bail = false
  conf.values.recursive = true
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.strictSame(result, {
    'src/b': {
      command: pass,
      args: [],
      cwd: resolve(dir, 'src/b'),
      status: 0,
      signal: null,
      stdout: '',
      stderr: '',
      pre: undefined,
    },
    'src/a': {
      command: fail,
      args: [],
      cwd: resolve(dir, 'src/a'),
      status: 1,
      signal: null,
      stdout: '',
      stderr: '',
      pre: undefined,
    },
  })
  t.match(
    new Set(logs()),
    new Set([
      [
        'src/a failure',
        {
          status: 1,
        },
      ],
    ]),
  )
  t.strictSame(
    new Set(errs()),
    new Set([['src/b hello'], ['src/a hello']]),
  )
  t.equal(process.exitCode, exitCode || 1)
  process.exitCode = exitCode
})

t.test('show scripts if no event specified', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      scripts: {
        hello: pass,
      },
    }),
    'vlt.json': JSON.stringify({}),
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const conf = await Config.load(t.testdirName, [])
  conf.projectRoot = dir
  conf.values.recursive = false
  conf.values.workspace = undefined
  conf.values['workspace-group'] = undefined
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.equal(result, undefined)
  t.strictSame(logs(), [
    ['Scripts available:', { hello: 'node -e "process.exit(0)"' }],
  ])
  t.strictSame(errs(), [])
})

t.test('show scripts if no event specified, single ws', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify('src/ws'),
    src: {
      ws: {
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
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
  const conf = await Config.load(t.testdirName, [])
  conf.projectRoot = dir
  conf.values.workspace = ['src/ws']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.equal(result, undefined)
  t.strictSame(logs(), [
    ['Scripts available:', { hello: 'node -e "process.exit(0)"' }],
  ])
  t.strictSame(errs(), [])
})

t.test('show scripts across several workspaces', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': JSON.stringify('src/*'),
    src: {
      a: {
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
          },
        }),
      },
      b: {
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
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
  const conf = await Config.load(t.testdirName, [])
  conf.values.workspace = ['src/a', 'src/b']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.strictSame(result, undefined)
  t.strictSame(
    new Set(logs()),
    new Set([
      ['Scripts available:'],
      ['src/b', { hello: 'node -e "process.exit(0)"' }],
      ['src/a', { hello: 'node -e "process.exit(0)"' }],
    ]),
  )
  t.strictSame(errs(), [])
})
