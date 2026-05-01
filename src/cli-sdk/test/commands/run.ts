import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { command, usage, views } from '../../src/commands/run.ts'
import { setupEnv } from '../fixtures/util.ts'
import { unload } from '@vltpkg/vlt-json'

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
    'vlt.json': JSON.stringify({ config: {} }),
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  unload()
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
            hello: pass,
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
  unload()
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
  })
  t.strictSame(logs(), [])
  t.strictSame(errs(), [])
})

t.test('run script across several workspaces', async t => {
  const runTest = async (t: Test, { args }: { args: string[] }) => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
      'package.json': '{}',
      src: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            scripts: {
              hello: pass,
            },
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
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
    unload()
    const conf = await Config.load(t.testdirName, [
      'hello',
      ...args,
      '--view=human',
    ])
    t.equal(conf.projectRoot, dir)
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
      },
      'src/b': {
        command: pass,
        args: [],
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
  }

  t.test('with workspaces', async t => {
    await runTest(t, { args: ['-w', 'src/a', '-w', 'src/b'] })
  })

  t.test('with scope', async t => {
    await runTest(t, {
      args: ['--scope', ':workspace#a, :workspace#b'],
    })
  })
})

t.test('run script across workspaces with some missing', async t => {
  const runTest = async (t: Test, { args }: { args: string[] }) => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
      'package.json': '{}',
      src: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            scripts: {
              hello: pass,
            },
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
            scripts: {
              missing: pass,
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
    unload()
    const conf = await Config.load(t.testdirName, [
      'hello',
      ...args,
      '--view=human',
    ])
    t.equal(conf.projectRoot, dir)
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
      },
    })
    t.strictSame(new Set(logs()), new Set([['src/a', 'ok']]))
    t.strictSame(new Set(errs()), new Set())
  }

  t.test('with workspaces', async t => {
    await runTest(t, { args: ['-w', 'src/a', '-w', 'src/b'] })
  })

  t.test('with scope', async t => {
    await runTest(t, {
      args: ['--scope', ':workspace#a, :workspace#b'],
    })
  })
})

t.test('run script across no workspaces', async t => {
  const runTest = async (t: Test, { args }: { args: string[] }) => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
      'package.json': '{}',
      src: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            scripts: {
              hello: pass,
            },
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
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
    unload()
    const conf = await Config.load(t.testdirName, ['hello', ...args])
    conf.projectRoot = dir
    const logs = t.capture(console, 'log').args
    const errs = t.capture(console, 'error').args
    if (args.includes('--scope')) {
      await t.rejects(command(conf), {
        message: 'no matching nodes found for query',
        cause: { found: ':workspace#c' },
      })
    } else {
      await t.rejects(command(conf), {
        message: 'no matching workspaces found',
      })
    }
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
  }

  t.test('with workspaces', async t => {
    await runTest(t, { args: ['-w', 'src/c'] })
  })

  t.test('with scope', async t => {
    await runTest(t, { args: ['--scope', ':workspace#c'] })
  })
})

t.test('one ws fails, with bail', async t => {
  const { exitCode } = process
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: 'src/*',
      config: {
        recursive: true,
        bail: true,
      },
    }),
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
  unload()
  const conf = await Config.load(t.testdirName, ['hello'])
  conf.values['workspace-group'] = ['packages']
  conf.values.view = 'human'
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  await t.rejects(command(conf), {
    message: 'failed graph traversal',
    cause: {
      code: 'GRAPHRUN_TRAVERSAL',
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
  t.strictSame(new Set(errs()), new Set())
  t.equal(process.exitCode, exitCode || 1)
  process.exitCode = exitCode
})

t.test('one ws fails, without bail', async t => {
  const { exitCode } = process
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
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
  unload()
  const conf = await Config.load(t.testdirName, ['hello'])
  conf.values.bail = false
  conf.values.view = 'human'
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
    },
    'src/a': {
      command: fail,
      args: [],
      cwd: resolve(dir, 'src/a'),
      status: 1,
      signal: null,
      stdout: '',
      stderr: '',
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
  t.strictSame(new Set(errs()), new Set())
  t.equal(process.exitCode, exitCode || 1)
  process.exitCode = exitCode
})

t.test(
  'if-present with missing script in single project',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        scripts: {
          hello: pass,
        },
      }),
      'vlt.json': JSON.stringify({ config: {} }),
      '.git': {},
    })
    t.chdir(dir)
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    unload()
    const conf = await Config.load(t.testdirName, [
      'goodbye',
      '--if-present',
    ])
    conf.projectRoot = dir
    const logs = t.capture(console, 'log').args
    const errs = t.capture(console, 'error').args
    const result = await command(conf)
    t.strictSame(result, {
      command: '',
      args: [],
      cwd: dir,
      status: 0,
      signal: null,
      stdout: null,
      stderr: null,
    })
    t.strictSame(logs(), [])
    t.strictSame(errs(), [])
  },
)

t.test(
  'if-present with no matching scripts across workspaces',
  async t => {
    const runTest = async (t: Test, { args }: { args: string[] }) => {
      const dir = t.testdir({
        'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
        'package.json': '{}',
        src: {
          a: {
            'package.json': JSON.stringify({
              name: 'a',
              scripts: {
                hello: pass,
              },
            }),
          },
          b: {
            'package.json': JSON.stringify({
              name: 'b',
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
      unload()
      const conf = await Config.load(t.testdirName, [
        'goodbye',
        ...args,
        '--view=human',
      ])
      t.equal(conf.projectRoot, dir)
      const logs = t.capture(console, 'log').args
      const errs = t.capture(console, 'error').args

      const result = await command(conf)
      t.strictSame(result, {})
      t.strictSame(logs(), [])
      t.strictSame(errs(), [])
    }

    t.test('with workspaces', async t => {
      await runTest(t, {
        args: ['-w', 'src/a', '-w', 'src/b'],
      })
    })

    t.test('with scope', async t => {
      await runTest(t, {
        args: ['--scope', ':workspace#a, :workspace#b'],
      })
    })
  },
)

t.test('show scripts if no event specified', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      scripts: {
        hello: pass,
      },
    }),
    'vlt.json': JSON.stringify({ config: {} }),
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  unload()
  const conf = await Config.load(t.testdirName, [])
  conf.projectRoot = dir
  conf.values.recursive = false
  conf.values.workspace = undefined
  conf.values.view = 'human'
  conf.values['workspace-group'] = undefined
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.strictSame(result, {
    hello: 'node -e "process.exit(0)"',
  })
  t.strictSame(logs(), [])
  t.strictSame(errs(), [])
})

t.test('show scripts if no event specified, single ws', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/ws' }),
    src: {
      ws: {
        'package.json': JSON.stringify({
          scripts: {
            hello: pass,
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
  unload()
  const conf = await Config.load(t.testdirName, [])
  conf.projectRoot = dir
  conf.values.workspace = ['src/ws']
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.strictSame(result, {
    hello: 'node -e "process.exit(0)"',
  })
  t.strictSame(logs(), [])
  views.human(result)
  t.strictSame(logs(), [
    ['Scripts available:', { hello: 'node -e "process.exit(0)"' }],
  ])
  t.strictSame(errs(), [])
})

t.test('show scripts across several workspaces', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
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
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  unload()
  const conf = await Config.load(t.testdirName, [])
  conf.values.workspace = ['src/a', 'src/b']
  conf.values.view = 'human'
  conf.projectRoot = dir
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  const result = await command(conf)
  t.strictSame(result, {
    'src/b': { hello: 'node -e "process.exit(0)"' },
    'src/a': { hello: 'node -e "process.exit(0)"' },
  })
  t.strictSame(logs(), [])
  views.human(result)
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

t.test(
  'options after script name are extracted (CLI-style args)',
  async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      src: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
            scripts: {
              hello: pass,
            },
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
            version: '1.0.0',
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
    unload()

    // Simulate: vlt run hello --scope ":workspace#a, :workspace#b"
    const conf = await Config.load(t.testdirName, [
      'run',
      'hello',
      '--scope',
      ':workspace#a, :workspace#b',
      '--view=human',
    ])
    t.equal(conf.command, 'run')
    t.equal(conf.positionals[0], 'hello')

    const logs = t.capture(console, 'log').args
    const errs = t.capture(console, 'error').args
    const result = await command(conf)

    // Should have run in both workspaces
    t.strictSame(result, {
      'src/a': {
        command: pass,
        args: [],
        cwd: resolve(dir, 'src/a'),
        status: 0,
        signal: null,
        stdout: '',
        stderr: '',
      },
      'src/b': {
        command: pass,
        args: [],
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
  },
)

t.test(
  'workspace option after script name (CLI-style args)',
  async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      src: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
            scripts: {
              hello: pass,
            },
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
            version: '1.0.0',
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
    unload()

    // Simulate: vlt run hello -w src/a
    const conf = await Config.load(t.testdirName, [
      'run',
      'hello',
      '-w',
      'src/a',
      '--view=human',
    ])
    t.equal(conf.command, 'run')

    const logs = t.capture(console, 'log').args
    const result = await command(conf)

    // Should only run in workspace 'a'
    t.strictSame(result, {
      command: pass,
      args: [],
      cwd: resolve(dir, 'src/a'),
      stdout: null,
      stderr: null,
      status: 0,
      signal: null,
    })
    t.strictSame(logs(), [])
  },
)

t.test(
  'root script missing but workspace has it with --scope',
  async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      src: {
        myapp: {
          'package.json': JSON.stringify({
            name: 'myapp',
            version: '1.0.0',
            scripts: {
              test: pass,
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
    unload()

    // Simulate: vlt run test --scope=":workspace"
    const conf = await Config.load(t.testdirName, [
      'run',
      'test',
      '--scope=:workspace',
      '--view=human',
    ])
    t.equal(conf.command, 'run')

    const logs = t.capture(console, 'log').args
    const result = await command(conf)

    t.strictSame(result, {
      command: pass,
      args: [],
      cwd: resolve(dir, 'src/myapp'),
      stdout: null,
      stderr: null,
      status: 0,
      signal: null,
    })
    t.strictSame(logs(), [])
  },
)

t.test('boolean option after script name (--recursive)', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
    'package.json': JSON.stringify({
      name: 'root',
      version: '1.0.0',
    }),
    src: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
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
  unload()

  // Simulate: vlt run hello --recursive --view=human
  const conf = await Config.load(t.testdirName, [
    'run',
    'hello',
    '--recursive',
    '--view=human',
  ])
  t.equal(conf.command, 'run')

  const logs = t.capture(console, 'log').args
  const result = await command(conf)

  // Should run in workspace 'a' (recursive across all workspaces)
  t.strictSame(result, {
    command: pass,
    args: [],
    cwd: resolve(dir, 'src/a'),
    stdout: null,
    stderr: null,
    status: 0,
    signal: null,
  })
  t.strictSame(logs(), [])
})

t.test(
  'string option at end without value stays as script arg',
  async t => {
    // Use a script that accepts arbitrary args without failing
    const passWithArgs = 'node -e "process.exitCode = 0" --'
    const dir = t.testdir({
      'vlt.json': JSON.stringify({}),
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
        scripts: {
          hello: passWithArgs,
        },
      }),
      '.git': {},
    })
    t.chdir(dir)

    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    unload()

    // Simulate: vlt run hello --view=human --scope (no value)
    // --scope at the very end with no value should be kept as
    // a script arg since there is no next arg to consume.
    const conf = await Config.load(t.testdirName, [
      'run',
      'hello',
      '--view=human',
      '--scope',
    ])
    t.equal(conf.command, 'run')

    const logs = t.capture(console, 'log').args
    const result = await command(conf)

    // --scope with no value is kept as a script arg, not extracted
    t.strictSame(result, {
      command: passWithArgs,
      args: ['--scope'],
      cwd: dir,
      stdout: null,
      stderr: null,
      status: 0,
      signal: null,
    })
    t.strictSame(logs(), [])
  },
)
