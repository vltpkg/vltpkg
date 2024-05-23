import { readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import * as OS from 'os'
import { resolve } from 'path'
import t from 'tap'

import { Config } from '../src/index.js'

const clearEnv = () => {
  for (const k of Object.keys(process.env)) {
    if (
      k.startsWith('VLT_') ||
      k === 'FORCE_COLOR' ||
      k === 'NO_COLOR'
    ) {
      delete process.env[k]
    }
  }
}
t.afterEach(() => clearEnv())

t.test('read and write a project config', async t => {
  const dir = t.testdir({
    'vlt.json':
      JSON.stringify(
        {
          registry: 'https://registry.vlt.sh/',
        },
        null,
        '\t',
      ) + '\n',
    a: { b: {} },
  })
  const conf = await Config.load(dir + '/a/b')
  t.equal(conf, await Config.load(dir + '/a/b'), 'load is memoized')
  t.equal(conf.parse(), conf, 'parsing a second time is no-op')
  t.equal(conf.get('registry'), 'https://registry.vlt.sh/')
  t.equal(conf.cwd, dir)
  await conf.addProjectConfig({ cache: dir + '/cache' })
  clearEnv()
  const c2 = await Config.load(dir + '/a/b', undefined, true)
  t.equal(c2.get('cache'), dir + '/cache')
  t.match(
    readFileSync(dir + '/vlt.json', 'utf8'),
    /^\{\n\t"/,
    'preserved indentation',
  )
  unlinkSync(dir + '/vlt.json')
  await conf.addProjectConfig({ cache: 'hello' })
  t.strictSame(
    JSON.parse(readFileSync(dir + '/vlt.json', 'utf8')),
    {
      cache: 'hello',
    },
    'wrote without merging if not already data present',
  )
})

t.test('read and write a user config', async t => {
  const dir = t.testdir({
    xdg: {
      'vlt.json':
        JSON.stringify(
          {
            registry: 'https://registry.vlt.sh/',
          },
          null,
          '\t',
        ) + '\n',
    },
    'vlt-workspaces.json': JSON.stringify({}),
    '.git': {},
    a: { b: {} },
  })
  const { Config } = await t.mockImport<
    typeof import('../src/index.js')
  >('../src/index.js', {
    '@vltpkg/xdg': {
      XDG: class XDG {
        config() {
          return dir + '/xdg/vlt.json'
        }
        cache() {
          dir + '/default/cache'
        }
      },
    },
  })
  const conf = await Config.load(dir + '/a/b')
  t.equal(conf.get('registry'), 'https://registry.vlt.sh/')
  t.equal(conf.cwd, dir)
  await conf.addUserConfig({ cache: dir + '/cache' })
  clearEnv()
  const c2 = await Config.load(dir + '/a/b', undefined, true)
  t.equal(c2.get('cache'), dir + '/cache')
  t.match(
    readFileSync(dir + '/xdg/vlt.json', 'utf8'),
    /^\{\n\t"/,
    'preserved indentation',
  )
  unlinkSync(dir + '/xdg/vlt.json')
  await conf.addUserConfig({ cache: 'hello' })
  t.strictSame(
    JSON.parse(readFileSync(dir + '/xdg/vlt.json', 'utf8')),
    {
      cache: 'hello',
    },
    'wrote without merging if not already data present',
  )
})

t.test(
  'load both configs, project writes over userconfig',
  async t => {
    const dir = t.testdir({
      'vlt.json':
        JSON.stringify(
          {
            tag: 'beta',
            'node-version': '1.2.3',
            registries: {
              example: 'https://example.com',
              foo: 'https://registry.foo',
            },
          },
          null,
          '\t',
        ) + '\n',
      xdg: {
        'vlt.json':
          JSON.stringify(
            {
              registry: 'https://registry.vlt.sh/',
              tag: 'latest',
              registries: {
                example: 'https://nope.com',
                bar: 'https://registry.bar',
              },
            },
            null,
            '\t',
          ) + '\n',
      },
      'vlt-workspaces.json': JSON.stringify({}),
      '.git': {},
      a: { b: {} },
    })
    const { Config } = await t.mockImport<
      typeof import('../src/index.js')
    >('../src/index.js', {
      '@vltpkg/xdg': {
        XDG: class XDG {
          config() {
            return dir + '/xdg/vlt.json'
          }
          cache() {
            dir + '/default/cache'
          }
        },
      },
    })
    const conf = await Config.load(dir + '/a/b')
    t.equal(conf.get('registry'), 'https://registry.vlt.sh/')
    t.equal(conf.get('tag'), 'beta')
    t.equal(conf.get('node-version'), '1.2.3')
    const regs = conf.getRecord('registries')
    t.strictSame(regs, {
      example: 'https://example.com',
      foo: 'https://registry.foo',
    })
    t.equal(conf.getRecord('registries'), regs, 'memoized')
    t.strictSame(
      conf.getRecord('git-hosts'),
      {},
      'empty object for unset key',
    )
    conf.values['git-hosts'] = ['github=https://github', 'asdfasdfas']
    t.strictSame(
      conf.getRecord('git-hosts'),
      {
        github: 'https://github',
      },
      'invalid kv pair omitted',
    )
    await conf.writeProjectConfig({
      'git-hosts': ['asdfasdf', 'github=https://github'],
    })
    t.strictSame(
      JSON.parse(readFileSync(dir + '/vlt.json', 'utf8')),
      {
        'git-hosts': { asdfasdf: '', github: 'https://github' },
      },
      'invalid k=v are set to ""',
    )

    conf.values = {
      'git-hosts': [
        'asdfasdf=https://example.com',
        'github=https://github',
      ],
    }
    const opts = conf.options
    t.strictSame(opts, {
      'git-hosts': {
        asdfasdf: 'https://example.com',
        github: 'https://github',
      },
    })
    t.equal(conf.options, opts, 'memoized')

    await conf.writeProjectConfig({
      'git-hosts': [
        'asdfasdf=https://example.com',
        'github=https://github',
      ],
    })
    t.strictSame(
      JSON.parse(readFileSync(dir + '/vlt.json', 'utf8')),
      {
        'git-hosts': {
          asdfasdf: 'https://example.com',
          github: 'https://github',
        },
      },
      'converted to record if all k=v values',
    )
  },
)

t.test('enable/disable color output', async t => {
  const dir = t.testdir({
    '.git': {},
  })
  const mockXDG = {
    XDG: class XDG {
      config() {
        return resolve(dir, 'xdg/vlt.json')
      }
      cache() {
        return resolve(dir, 'default/cache')
      }
    },
  }

  t.test('enable colors when chalk says to', async t => {
    const env: Record<string, string> = { NO_COLOR: '0' }
    t.intercept(process, 'env', { value: env })
    const chalk = { default: { level: 3 } }
    const { Config } = await t.mockImport('../src/index.js', {
      chalk,
      '@vltpkg/xdg': mockXDG,
    })
    const c = await Config.load(dir)
    t.equal(c.get('color'), true)
    t.equal(env.FORCE_COLOR, '3')
    t.equal(env.NO_COLOR, undefined)
    t.equal(chalk.default.level, 3)
  })

  t.test('disable when NO_COLOR=1', async t => {
    const env: Record<string, string> = { NO_COLOR: '1' }
    t.intercept(process, 'env', { value: env })
    const chalk = { default: { level: 3 } }
    const { Config } = await t.mockImport('../src/index.js', {
      chalk,
      '@vltpkg/xdg': mockXDG,
    })
    const c = await Config.load(dir)
    t.equal(c.get('color'), false)
    t.equal(env.FORCE_COLOR, '0')
    t.equal(env.NO_COLOR, '1')
    t.equal(chalk.default.level, 0)
  })

  t.test('enable color if config says to', async t => {
    writeFileSync(dir + '/vlt.json', JSON.stringify({ color: true }))
    const env: Record<string, string> = {}
    t.intercept(process, 'env', { value: env })
    const chalk = { default: { level: 0 } }
    const { Config } = await t.mockImport('../src/index.js', {
      chalk,
      '@vltpkg/xdg': mockXDG,
    })
    const c = await Config.load(dir)
    t.equal(c.get('color'), true)
    t.equal(env.FORCE_COLOR, '1')
    t.equal(env.NO_COLOR, undefined)
    t.equal(chalk.default.level, 1)
  })

  t.test('disable colors when config says to', async t => {
    writeFileSync(dir + '/vlt.json', JSON.stringify({ color: false }))
    const env: Record<string, string> = { NO_COLOR: '0' }
    t.intercept(process, 'env', { value: env })
    const chalk = { default: { level: 3 } }
    const { Config } = await t.mockImport('../src/index.js', {
      chalk,
      '@vltpkg/xdg': mockXDG,
    })
    const c = await Config.load(dir)
    t.equal(c.get('color'), false)
    t.equal(env.FORCE_COLOR, '0')
    t.equal(env.NO_COLOR, '1')
    t.equal(chalk.default.level, 0)

    t.test('enable colors when cli says to', async t => {
      t.intercept(process, 'argv', {
        value: process.argv.slice(0, 2).concat('--color'),
      })
      rmSync(dir + '/vlt.json', { force: true })
      const env: Record<string, string> = { NO_COLOR: '0' }
      t.intercept(process, 'env', { value: env })
      const chalk = { default: { level: 0 } }
      const { Config } = await t.mockImport('../src/index.js', {
        chalk,
        '@vltpkg/xdg': mockXDG,
      })
      const c = await Config.load(dir)
      t.equal(c.get('color'), true)
      t.equal(env.FORCE_COLOR, '1')
      t.equal(env.NO_COLOR, undefined)
      t.equal(chalk.default.level, 1)
    })
  })

  t.end()
})

t.test('invalid config', async t => {
  t.test('invalid json', async t => {
    const dir = t.testdir({
      'vlt.json': 'this is not valid json',
      '.git': '',
    })
    await t.rejects(Config.load(dir, undefined, true), {
      cause: {
        path: resolve(dir, 'vlt.json'),
        cause: {
          name: 'JSONParseError',
          code: 'EJSONPARSE',
        },
      },
    })
  })

  t.test('valid json, invalid data', async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({ color: 'not a boolean' }),
      '.git': '',
    })
    await t.rejects(Config.load(dir, undefined, true), {
      cause: {
        path: resolve(dir, 'vlt.json'),
        cause: {
          message: 'Invalid value string for color, expected boolean',
          cause: {
            name: 'color',
            found: 'not a boolean',
            wanted: 'boolean',
          },
        },
      },
    })
  })
})

t.test('command-specific configs', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      command: {
        publish: {
          color: true,
        },
      },
      color: false,
    }),
    '.git': '',
  })
  const c = await Config.load(dir, undefined, true)
  t.equal(c.command, undefined)
  t.equal(c.get('color'), false)
  clearEnv()
  const p = await Config.load(dir, 'publish', true)
  t.equal(p.command, 'publish')
  t.equal(p.get('color'), true)
})

t.test('kv string[] stored as Record<string, string>', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      registries: {
        npm: 'https://registry.npmjs.org',
        vlt: 'https://vlt.sh',
      },
    }),
    '.git': '',
  })
  const c = await Config.load(dir, undefined, true)
  t.strictSame(c.get('registries'), [
    'npm=https://registry.npmjs.org',
    'vlt=https://vlt.sh',
  ])
  t.strictSame(c.getRecord('registries'), {
    npm: 'https://registry.npmjs.org',
    vlt: 'https://vlt.sh',
  })
  await c.writeProjectConfig({
    registries: {
      example: 'https://example.com',
    },
  })
  t.equal(
    readFileSync(dir + '/vlt.json', 'utf8'),
    JSON.stringify({
      registries: { example: 'https://example.com' },
    }),
  )
  await c.writeProjectConfig({
    registries: ['example=https://another.example.com'],
  })
  t.equal(
    readFileSync(dir + '/vlt.json', 'utf8'),
    JSON.stringify({
      registries: { example: 'https://another.example.com' },
    }),
  )

  await c.writeProjectConfig({
    registries: {
      example: 'https://another.example.com',
      bar: 'https://registry.bar',
    },
    command: {
      update: {
        registries: [
          'example=https://update.example.com',
          'foo=https://registry.foo',
        ],
        'git-hosts': {
          github: 'git+https://github.com/$1/$2',
        },
      },
    },
  })

  t.equal(
    readFileSync(dir + '/vlt.json', 'utf8'),
    JSON.stringify({
      registries: {
        example: 'https://another.example.com',
        bar: 'https://registry.bar',
      },
      command: {
        update: {
          registries: {
            example: 'https://update.example.com',
            foo: 'https://registry.foo',
          },
          'git-hosts': {
            github: 'git+https://github.com/$1/$2',
          },
        },
      },
    }),
  )

  clearEnv()
  const d = await Config.load(dir, 'update', true)
  t.strictSame(d.getRecord('registries'), {
    example: 'https://update.example.com',
    bar: 'https://registry.bar',
    foo: 'https://registry.foo',
  })
})

t.test('do not walk to home dir', async t => {
  const dir = t.testdir({
    // take the first likely root, not this one, because it's ~
    node_modules: {},
    a: { b: { node_modules: {} } },
  })
  const { Config } = await t.mockImport<
    typeof import('../src/index.js')
  >('../src/index.js', {
    os: {
      ...OS,
      homedir: () => dir,
    },
  })
  const c = await Config.load(dir + '/a/b')
  t.equal(c.cwd, resolve(dir, 'a/b'))
})

t.test('do not walk past xdg config dir', async t => {
  const dir = t.testdir({
    // take the first likely root, not this one, because it's xdg
    node_modules: {},
    a: { b: { node_modules: {} } },
  })
  const mockXDG = {
    XDG: class XDG {
      config() {
        return resolve(dir, 'vlt.json')
      }
      cache() {
        return resolve(dir, 'default/cache')
      }
    },
  }
  const { Config } = await t.mockImport<
    typeof import('../src/index.js')
  >('../src/index.js', {
    '@vltpkg/xdg': mockXDG,
  })
  const c = await Config.load(dir + '/a/b')
  t.equal(c.cwd, resolve(dir, 'a/b'))
})
