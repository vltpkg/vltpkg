import t from 'tap'
import type { Test } from 'tap'
import * as fs from 'node:fs'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import type { LoadedConfig } from '../src/config/index.ts'
import {
  readUpdateState,
  writeUpdateState,
} from '../src/update-state.ts'

const version = '1.0.0'
const registry = 'https://registry.npmjs.org/'
const now = 2 * 86_400_000
const setup = async (t: Test, overrides: Partial<typeof fs> = {}) => {
  const dir = t.testdir()
  const file = join(dir, 'update-check.json')
  const messages: string[] = []
  const spawned: {
    args: string[]
    options: {
      detached: boolean
      stdio: string
      env: NodeJS.ProcessEnv
    }
  }[] = []
  const runtime = {
    unrefs: 0,
    failSpawn: false,
    cache: '/compile-cache' as string | undefined,
    ci: false,
    executable: '/usr/local/lib/node_modules/vlt/bin/vlt.js',
  }
  const child = new EventEmitter() as EventEmitter & {
    unref: () => void
  }
  child.unref = () => {
    runtime.unrefs++
  }
  t.intercept(process, 'env', {
    value: {
      PATH: process.env.PATH,
      __VLT_INTERNAL_CLI_PACKAGE_JSON: 'cli-package.json',
    },
  })
  t.intercept(process.stderr, 'isTTY', { value: true })
  const exitCode = process.exitCode
  process.exitCode = undefined
  t.teardown(() => {
    process.exitCode = exitCode
  })
  t.intercept(Date, 'now', { value: () => now })
  const module = await t.mockImport<
    typeof import('../src/update-notifier.ts')
  >('../src/update-notifier.ts', {
    'node:child_process': {
      spawn: (
        _: string,
        args: string[],
        options: (typeof spawned)[number]['options'],
      ) => {
        if (runtime.failSpawn) throw new Error('spawn failed')
        spawned.push({ args, options })
        return child
      },
    },
    'node:fs': t.createMock(fs, {
      realpathSync: (path: fs.PathLike) => {
        if (!path) throw new Error('no executable')
        return runtime.executable
      },
      ...overrides,
    }),
    'node:module': { getCompileCacheDir: () => runtime.cache },
    '@vltpkg/xdg': {
      XDG: class {
        name: string
        constructor(name: string) {
          this.name = name
        }
        state = (path: string) => join(dir, path)
        data = (path = '') => join(dir, this.name, 'data', path)
        cache = (path = '') => join(dir, this.name, 'cache', path)
      },
    },
    '../src/output.ts': {
      isCI: () => runtime.ci,
      stderr: (line: string) => messages.push(line),
    },
    '../src/update-check.ts': {
      __CODE_SPLIT_SCRIPT_NAME: '/worker.js',
    },
    '../src/update-state.ts': { readUpdateState, writeUpdateState },
  })
  const conf = {
    command: 'install',
    values: {
      view: 'human',
      'update-notifier': true,
      'update-check-interval': 86_400,
    },
    options: { registry },
  } as LoadedConfig
  return {
    ...module,
    version,
    conf,
    dir,
    file,
    messages,
    spawned,
    child,
    runtime,
  }
}

t.test(
  'checks are detached and throttled across commands',
  async t => {
    const s = await setup(t)
    s.notifyUpdate(s.conf, version)
    t.strictSame(readUpdateState(s.file), {
      registry,
      version,
      lastCheck: now,
    })
    t.equal(s.spawned.length, 1)
    t.match(s.spawned[0], {
      args: ['/worker.js', s.file],
      options: {
        detached: true,
        stdio: 'ignore',
        env: { NODE_COMPILE_CACHE: '/compile-cache' },
      },
    })
    t.equal(s.runtime.unrefs, 1)
    t.strictSame(s.messages, [])
    s.notifyUpdate(s.conf, version)
    t.equal(s.spawned.length, 1)
    writeUpdateState(s.file, {
      registry,
      version,
      lastCheck: 0,
    })
    s.notifyUpdate(s.conf, version)
    t.equal(s.spawned.length, 1, 'another process holds the lock')
    fs.utimesSync(`${s.file}.lock`, 0, 0)
    s.notifyUpdate(s.conf, version)
    t.equal(s.spawned.length, 2, 'an abandoned lock expires')
    s.child.emit('error', new Error('worker failed'))
    t.notOk(fs.existsSync(`${s.file}.lock`))
  },
)

t.test(
  'cached notices are rate limited and newer notices can be shown',
  async t => {
    const s = await setup(t)
    const state = {
      registry,
      version,
      lastCheck: now,
      latest: '2.0.0',
    }
    writeUpdateState(s.file, state)
    s.notifyUpdate(s.conf, version)
    t.strictSame(s.messages, [
      'Update available: vlt 1.0.0 -> 2.0.0\nnpm install -g vlt@latest',
    ])
    s.notifyUpdate(s.conf, version)
    t.equal(s.messages.length, 1)
    writeUpdateState(s.file, {
      ...readUpdateState(s.file)!,
      latest: '3.0.0',
    })
    s.notifyUpdate(s.conf, version)
    t.equal(s.messages.length, 2)
    writeUpdateState(s.file, {
      ...state,
      notifiedVersion: '2.0.0',
      notifiedAt: 0,
    })
    s.notifyUpdate(s.conf, version)
    t.equal(s.messages.length, 3)
    writeUpdateState(s.file, { ...state, notifiedVersion: '2.0.0' })
    s.notifyUpdate(s.conf, version)
    for (const latest of ['0.9.0', '1.0.0', 'bad']) {
      writeUpdateState(s.file, { ...state, latest })
      s.notifyUpdate(s.conf, version)
    }
    t.equal(s.messages.length, 4)
    t.equal(s.spawned.length, 0)
  },
)

t.test(
  'silent contexts do not touch the cache or start a worker',
  async t => {
    const contexts: Record<
      string,
      (s: Awaited<ReturnType<typeof setup>>, t: Test) => void
    > = {
      'no-argv': (_, t) => {
        t.intercept(process, 'argv', { value: [] })
      },
      'invalid-registry': s => {
        s.conf.options.registry = 'invalid'
      },
      tty: (_, t) => {
        t.intercept(process.stderr, 'isTTY', { value: false })
      },
      ci: s => {
        s.runtime.ci = true
      },
      exit: () => {
        process.exitCode = 1
      },
      view: s => {
        s.conf.values.view = 'json'
      },
      help: s => {
        s.conf.values.help = true
      },
      disabled: s => {
        s.conf.values['update-notifier'] = false
      },
      development: () => {
        delete process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON
      },
      'ci-command': s => {
        s.conf.command = 'ci'
      },
      'exec-command': s => {
        s.conf.command = 'exec'
      },
      'invalid-version': s => {
        s.version = 'dev'
      },
      'no-registry': s => {
        s.conf.options.registry = undefined
      },
      npx: s => {
        s.runtime.executable =
          '/cache/_npx/123/node_modules/vlt/vlt.js'
      },
      vlx: s => {
        s.runtime.executable = join(s.dir, 'vlt/vlx/data/123/vlt.js')
      },
      'vlx-local': s => {
        s.runtime.executable = join(
          s.dir,
          'vlt/vlx-local/cache/123/vlt.js',
        )
      },
      protocol: s => {
        s.conf.options.registry = 'file:///tmp/'
      },
      username: s => {
        s.conf.options.registry = 'https://user@registry.test/'
      },
      password: s => {
        s.conf.options.registry = 'https://:secret@registry.test/'
      },
    }
    for (const [key, value] of [
      ['VLT_NO_UPDATE_NOTIFIER', '1'],
      ['NO_UPDATE_NOTIFIER', '1'],
      ['VLT_OFFLINE', '1'],
      ['VLT_OFFLINE', 'true'],
      ['npm_config_offline', 'true'],
      ['npm_command', 'exec'],
    ] as const) {
      contexts[`${key}=${value}`] = () => {
        process.env[key] = value
      }
    }
    for (const [context, configure] of Object.entries(contexts)) {
      await t.test(context, async t => {
        const s = await setup(t)
        configure(s, t)
        s.notifyUpdate(s.conf, s.version)
        t.strictSame(s.spawned, [])
        t.strictSame(s.messages, [])
        t.notOk(fs.existsSync(s.file))
      })
    }
  },
)

t.test(
  'registry and installed version changes discard cached notices',
  async t => {
    const s = await setup(t)
    for (const state of [
      {
        registry: 'https://other.test/',
        version,
        lastCheck: now,
        latest: '9.0.0',
      },
      { registry, version: '0.9.0', lastCheck: now, latest: '9.0.0' },
    ]) {
      fs.rmSync(`${s.file}.lock`, { force: true })
      writeUpdateState(s.file, state)
      s.notifyUpdate(s.conf, version)
    }
    t.equal(s.spawned.length, 2)
    t.strictSame(s.messages, [])
  },
)

t.test('installation-specific upgrade hints', async t => {
  const s = await setup(t)
  for (const [path, hint] of [
    ['/opt/homebrew/Cellar/vlt/1/bin/vlt', 'brew upgrade vlt'],
    [
      '/home/user/.volta/tools/image/packages/vlt/bin/vlt',
      'volta install vlt@latest',
    ],
    [
      '/usr/lib/node_modules/vlt/bin/vlt',
      'npm install -g vlt@latest',
    ],
    [
      'C:\\Users\\name\\AppData\\Roaming\\npm\\node_modules\\vlt\\vlt.js',
      'npm install -g vlt@latest',
    ],
    ['/usr/bin/vlt', 'https://github.com/vltpkg/vltpkg/releases'],
  ] as const) {
    s.runtime.executable = path
    writeUpdateState(s.file, {
      registry,
      version,
      lastCheck: now,
      latest: '2.0.0',
    })
    s.notifyUpdate(s.conf, version)
    t.equal(
      s.messages.pop(),
      `Update available: vlt 1.0.0 -> 2.0.0\n${hint}`,
    )
  }
})

t.test(
  'worker and filesystem failures do not affect the command',
  async t => {
    for (const fail of [
      'spawn',
      'mkdirSync',
      'realpathSync',
      'writeFileSync',
      'rmSync',
    ] as const) {
      await t.test(fail, async t => {
        const s = await setup(
          t,
          fail === 'spawn' ?
            {}
          : {
              [fail]: () => {
                throw new Error('read only')
              },
            },
        )
        if (fail === 'spawn') s.runtime.failSpawn = true
        if (fail === 'rmSync') {
          fs.writeFileSync(`${s.file}.lock`, '')
          fs.utimesSync(`${s.file}.lock`, 0, 0)
        }
        t.doesNotThrow(() => s.notifyUpdate(s.conf, version))
        t.equal(process.exitCode, undefined)
        if (fail === 'spawn') t.notOk(fs.existsSync(`${s.file}.lock`))
      })
    }
  },
)

t.test(
  'worker cleanup failures stay silent and compile cache settings are preserved',
  async t => {
    const s = await setup(t, {
      rmSync: () => {
        throw new Error('read only')
      },
    })
    s.runtime.cache = undefined
    s.notifyUpdate(s.conf, version)
    t.equal(s.spawned[0]?.options.env.NODE_COMPILE_CACHE, undefined)
    t.doesNotThrow(() =>
      s.child.emit('error', new Error('worker failed')),
    )
    fs.rmSync(`${s.file}.lock`)
    writeUpdateState(s.file, { registry, version, lastCheck: 0 })
    process.env.NODE_COMPILE_CACHE = '/existing-cache'
    s.runtime.cache = '/new-cache'
    s.notifyUpdate(s.conf, version)
    t.equal(
      s.spawned[1]?.options.env.NODE_COMPILE_CACHE,
      '/existing-cache',
    )
    fs.rmSync(`${s.file}.lock`)
    writeUpdateState(s.file, { registry, version, lastCheck: 0 })
    s.runtime.failSpawn = true
    t.doesNotThrow(() => s.notifyUpdate(s.conf, version))
  },
)

t.test('rechecks state after acquiring the lock', async t => {
  let file = ''
  const s = await setup(t, {
    writeFileSync: (path, data, options) => {
      fs.writeFileSync(path, data, options)
      if (String(path).endsWith('.lock'))
        writeUpdateState(file, {
          registry,
          version,
          lastCheck: now,
          latest: '2.0.0',
          notifiedVersion: '2.0.0',
          notifiedAt: now,
        })
    },
  })
  file = s.file
  s.notifyUpdate(s.conf, version)
  t.strictSame(s.spawned, [])
  t.strictSame(s.messages, [])
  t.notOk(fs.existsSync(`${s.file}.lock`))
})
