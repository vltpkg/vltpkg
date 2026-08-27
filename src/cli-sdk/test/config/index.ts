import { unload } from '@vltpkg/vlt-json'
import type { OptionsResults } from 'jackspeak'
import {
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import * as OS from 'node:os'
import { resolve } from 'node:path'
import { format } from 'node:util'
import t from 'tap'
import type { Test } from 'tap'
import type { ConfigDefinitions } from '../../src/config/index.ts'

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

process.env.XDG_CONFIG_HOME = t.testdir()

t.beforeEach(() => clearEnv())

t.cleanSnapshot = (str: string) => str.replaceAll(/\\+/g, '/')

t.test('read and write a project config', async t => {
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const dir = t.testdir({
    'vlt.json':
      JSON.stringify(
        { config: { registry: 'https://registry.vlt.sh/' } },
        null,
        '\t',
      ) + '\n',
    a: { b: {} },
  })
  t.chdir(dir + '/a/b')

  const conf = await Config.load(dir + '/a/b')

  t.equal(conf, await Config.load(dir + '/a/b'), 'load is memoized')
  t.equal(conf.parse(), conf, 'parsing a second time is no-op')
  t.equal(conf.get('registry'), 'https://registry.vlt.sh/')
  t.equal(conf.projectRoot, dir)
  await conf.addConfigToFile('project', { cache: dir + '/cache' })
  clearEnv()
  const c2 = await Config.load(dir + '/a/b', undefined, true)
  t.equal(c2.get('cache'), dir + '/cache')
  t.match(
    readFileSync(dir + '/vlt.json', 'utf8'),
    /^\{\n\t"/,
    'preserved indentation',
  )
  unlinkSync(dir + '/vlt.json')
  await conf.addConfigToFile('project', { cache: 'hello' })
  t.strictSame(
    JSON.parse(readFileSync(dir + '/vlt.json', 'utf8')),
    {
      config: {
        cache: 'hello',
        registry: 'https://registry.vlt.sh/',
      },
    },
    'wrote without merging if not already data present',
  )

  await t.test(
    'reset options relative to a new project root',
    async t => {
      conf.resetOptions(dir + '/a')
      t.strictSame(conf.projectRoot, dir + '/a')
    },
  )
})

t.test('add to empty config adds a config file', async t => {
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const dir = t.testdir({ '.git': {}, node_modules: {} })
  const conf = await Config.load(dir)
  t.equal(conf.projectRoot, dir)
  await conf.addConfigToFile('project', { cache: 'cache' })
  t.strictSame(JSON.parse(readFileSync(dir + '/vlt.json', 'utf8')), {
    config: { cache: 'cache' },
  })
})

t.test('read and write a user config', async t => {
  const dir = t.testdir({
    xdg: {
      'vlt.json':
        JSON.stringify(
          { config: { registry: 'https://registry.vlt.sh/' } },
          null,
          '\t',
        ) + '\n',
    },
    'vlt.json': JSON.stringify({}),
    '.git': {},
    a: { b: {} },
  })
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts', {
    '@vltpkg/xdg': {
      XDG: class XDG {
        config() {
          return dir + '/xdg/vlt.json'
        }
        cache() {
          return dir + '/default/cache'
        }
      },
    },
  })
  const conf = await Config.load(dir + '/a/b')
  t.equal(conf.get('registry'), 'https://registry.vlt.sh/')
  t.equal(conf.projectRoot, dir)
  await conf.addConfigToFile('user', { cache: dir + '/cache' })
  clearEnv()
  const c2 = await Config.load(dir + '/a/b', undefined, true)
  t.equal(c2.get('cache'), dir + '/cache')
  t.match(
    readFileSync(dir + '/xdg/vlt.json', 'utf8'),
    /^\{\n\t"/,
    'preserved indentation',
  )
  unlinkSync(dir + '/xdg/vlt.json')
  await conf.addConfigToFile('user', { cache: 'hello' })
  t.strictSame(
    JSON.parse(readFileSync(dir + '/xdg/vlt.json', 'utf8')),
    {
      config: {
        registry: 'https://registry.vlt.sh/',
        cache: 'hello',
      },
    },
    'wrote without merging if not already data present',
  )
})

t.test(
  'load both configs, layers merge with project taking precedence',
  async t => {
    const dir = t.testdir({
      'vlt.json':
        JSON.stringify(
          {
            config: {
              tag: 'beta',
              'node-version': '1.2.3',
              registries: {
                example: 'https://example.com',
                foo: 'https://registry.foo',
              },
            },
          },
          null,
          '\t',
        ) + '\n',
      xdg: {
        'vlt.json':
          JSON.stringify(
            {
              config: {
                registry: 'https://registry.vlt.sh/',
                tag: 'latest',
                registries: {
                  example: 'https://nope.com',
                  bar: 'https://registry.bar',
                },
              },
            },
            null,
            '\t',
          ) + '\n',
      },
      '.git': {},
      a: { b: {} },
    })
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts', {
      '@vltpkg/xdg': {
        XDG: class XDG {
          config() {
            return dir + '/xdg/vlt.json'
          }
          cache() {
            return dir + '/default/cache'
          }
        },
      },
    })
    const conf = await Config.load(dir + '/a/b')
    t.equal(
      conf.get('registry'),
      undefined,
      'project sets registries, so it owns registry selection and the ' +
        'user-level registry no longer applies',
    )
    t.equal(conf.get('tag'), 'beta')
    t.equal(conf.get('node-version'), '1.2.3')
    const regs = conf.getRecord('registries')
    t.strictSame(
      regs,
      {
        example: 'https://example.com',
        bar: 'https://registry.bar',
        foo: 'https://registry.foo',
      },
      'record fields merge per key, project wins on conflict',
    )
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
    await conf.writeConfigFile('project', {
      'git-hosts': ['asdfasdf', 'github=https://github'],
    })
    t.strictSame(
      JSON.parse(readFileSync(dir + '/vlt.json', 'utf8')),
      {
        config: {
          'git-hosts': { asdfasdf: '', github: 'https://github' },
        },
      },
      'invalid k=v are set to ""',
    )

    conf.values = {
      'git-hosts': [
        'asdfasdf=https://example.com',
        'github=https://github',
      ],
    } as OptionsResults<ConfigDefinitions>

    const opts = conf.options
    const { packageInfo, scurry, packageJson, monorepo, ...o } = opts
    t.matchStrict(o, {
      projectRoot: t.testdirName,
      'git-hosts': {
        asdfasdf: 'https://example.com',
        github: 'https://github',
      },
    })
    t.matchSnapshot(
      format(opts),
      'formatted options uses custom inspect',
    )
    // can't check the type, because it came in via a mockImport,
    // so tap sees a different class.
    t.ok(scurry, 'always includes a scurry')
    t.ok(packageJson, 'always includes a packageJson')
    t.ok(packageInfo, 'always includes a packageInfo')
    t.equal(conf.options, opts, 'memoized')

    await conf.writeConfigFile('project', {
      'git-hosts': [
        'asdfasdf=https://example.com',
        'github=https://github',
      ],
    })
    t.strictSame(
      JSON.parse(readFileSync(dir + '/vlt.json', 'utf8')),
      {
        config: {
          'git-hosts': {
            asdfasdf: 'https://example.com',
            github: 'https://github',
          },
        },
      },
      'converted to record if all k=v values',
    )
  },
)

t.test('invalid config', async t => {
  t.test('invalid json', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
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
  t.test('invalid object', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify('this is not valid json'),
      '.git': '',
    })
    // does not throw, just doesn't get any data
    await Config.load(dir, undefined, true)
  })
  t.test('invalid config field', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: 'this is not valid json',
      }),
      '.git': '',
    })
    await t.rejects(Config.load(dir, undefined, true), {
      cause: {
        found: 'this is not valid json',
        wanted: 'ConfigFileData',
      },
    })
  })
  t.test('invalid registries with ~ character', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: {
            'foo~bar': 'https://registry.foo.bar',
          },
        },
      }),
      '.git': '',
    })
    await t.rejects(Config.load(dir, undefined, true), {
      message: 'Reserved character found in registries name',
      cause: {
        found: 'foo~bar',
      },
    })
  })
  t.test('invalid registries with ~ at start', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: {
            '~foo': 'https://registry.foo',
          },
        },
      }),
      '.git': '',
    })
    await t.rejects(Config.load(dir, undefined, true), {
      message: 'Reserved character found in registries name',
      cause: {
        found: '~foo',
      },
    })
  })
  t.test('invalid registries with ~ at end', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: {
            'foo~': 'https://registry.foo',
          },
        },
      }),
      '.git': '',
    })
    await t.rejects(Config.load(dir, undefined, true), {
      message: 'Reserved character found in registries name',
      cause: {
        found: 'foo~',
      },
    })
  })
  t.test('invalid registries with only ~', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: {
            '~': 'https://registry.foo',
          },
        },
      }),
      '.git': '',
    })
    await t.rejects(Config.load(dir, undefined, true), {
      message: 'Reserved character found in registries name',
      cause: {
        found: '~',
      },
    })
  })
  t.test('invalid registries with empty string', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: {
            '': 'https://registry.foo',
          },
        },
      }),
      '.git': '',
    })
    await t.rejects(Config.load(dir, undefined, true), {
      message: 'Reserved character found in registries name',
      cause: {
        found: '',
      },
    })
  })
  t.test('invalid registries in command config', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          command: {
            install: {
              registries: {
                'foo~bar': 'https://registry.foo.bar',
              },
            },
          },
        },
      }),
      '.git': '',
    })
    await t.rejects(Config.load(dir, undefined, true), {
      message: 'Reserved character found in registries name',
      cause: {
        found: 'foo~bar',
      },
    })
  })
  t.test(
    'invalid registries in command config (array format)',
    async t => {
      const { Config } = await t.mockImport<
        typeof import('../../src/config/index.ts')
      >('../../src/config/index.ts')
      const dir = t.testdir({
        'vlt.json': JSON.stringify({
          config: {
            command: {
              install: {
                registries: ['foo~bar=https://registry.foo.bar'],
              },
            },
          },
        }),
        '.git': '',
      })
      await t.rejects(Config.load(dir, undefined, true), {
        message: 'Reserved character found in registries name',
        cause: {
          found: 'foo~bar',
        },
      })
    },
  )
  t.test('valid registries', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: {
            npm: 'https://registry.npmjs.org',
            vlt: 'https://vlt.sh',
            custom: 'https://custom.registry',
            'foo+bar': 'https://foo.bar',
            'foo...bar': 'https://foo.bar',
          },
        },
      }),
      '.git': '',
    })
    const conf = await Config.load(dir, undefined, true)
    t.ok(conf)
  })
})

t.test('command-specific configs', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      config: {
        command: {
          install: {
            color: true,
          },
        },
        color: false,
      },
    }),
    '.git': '',
  })
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const c = await Config.load(dir, [], true)
  t.equal(c.command, 'help')
  t.equal(c.get('color'), false)
  clearEnv()
  const p = await Config.load(dir, ['i'], true)
  t.equal(p.command, 'install')
  t.equal(p.get('color'), true)
})

t.test('kv string[] stored as Record<string, string>', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      config: {
        registries: {
          npm: 'https://registry.npmjs.org/',
          vlt: 'https://vlt.sh',
        },
      },
    }),
    '.git': '',
  })
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const c = await Config.load(dir, undefined, true)
  t.strictSame(c.get('registries'), [
    'npm=https://registry.npmjs.org/',
    'vlt=https://vlt.sh',
  ])
  t.strictSame(c.getRecord('registries'), {
    npm: 'https://registry.npmjs.org/',
    vlt: 'https://vlt.sh',
  })
  await c.writeConfigFile('project', {
    registries: {
      example: 'https://example.com',
    },
  })
  t.equal(
    readFileSync(dir + '/vlt.json', 'utf8'),
    JSON.stringify(
      {
        config: {
          registries: { example: 'https://example.com' },
        },
      },
      null,
      2,
    ) + '\n',
  )
  await c.writeConfigFile('project', {
    registries: ['example=https://another.example.com'],
  })
  t.equal(
    readFileSync(dir + '/vlt.json', 'utf8'),
    JSON.stringify(
      {
        config: {
          registries: { example: 'https://another.example.com' },
        },
      },
      null,
      2,
    ) + '\n',
  )

  await c.writeConfigFile('project', {
    registries: {
      example: 'https://another.example.com',
      bar: 'https://registry.bar',
    },
    command: {
      install: {
        registries: [
          'example=https://install.example.com',
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
    JSON.stringify(
      {
        config: {
          registries: {
            example: 'https://another.example.com',
            bar: 'https://registry.bar',
          },
          command: {
            install: {
              registries: {
                example: 'https://install.example.com',
                foo: 'https://registry.foo',
              },
              'git-hosts': {
                github: 'git+https://github.com/$1/$2',
              },
            },
          },
        },
      },
      null,
      2,
    ) + '\n',
  )

  clearEnv()
  const d = await Config.load(dir, ['install'], true)
  t.strictSame(d.getRecord('registries'), {
    example: 'https://install.example.com',
    foo: 'https://registry.foo',
  })
})

t.test('.git is treated as a backstop', async t => {
  const dir = t.testdir({
    '.git': {},
    a: {},
  })
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const c = await Config.load(dir + '/a', undefined, true)
  t.equal(c.projectRoot, resolve(dir, 'a'))
})

t.test('root resolution finds last known good location', async t => {
  const dir = t.testdir({
    '.git': {},
    a: {
      b: {},
      'package.json': {},
    },
  })
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const c = await Config.load(dir + '/a/b', undefined, true)
  t.equal(c.projectRoot, resolve(dir, 'a'))
})

t.test('do not walk to home dir', async t => {
  const dir = t.testdir({
    // take the first likely root, not this one, because it's ~
    node_modules: {},
    a: { b: { node_modules: {} } },
  })
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts', {
    os: {
      ...OS,
      homedir: () => dir,
    },
  })
  const c = await Config.load(dir + '/a/b')
  t.equal(c.projectRoot, resolve(dir, 'a/b'))
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
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts', {
    '@vltpkg/xdg': mockXDG,
  })
  const c = await Config.load(dir + '/a/b')
  t.equal(c.projectRoot, resolve(dir, 'a/b'))
})

t.test('delete config values from file', async t => {
  t.test('empty config file, nothing to do', async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({ 'vlt.json': '{}' })
    const emptyConf = await Config.load(dir, [], true)
    t.equal(
      await emptyConf.deleteConfigKeys('project', ['color']),
      false,
      'nothing to do, no config found',
    )
    clearEnv()
  })

  t.test('delete non-record field', async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          cache: './deleteme',
          color: true,
        },
      }),
    })
    const f = resolve(dir, 'vlt.json')
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const conf = await Config.load(dir, [], true)
    await conf.deleteConfigKeys('project', ['cache', 'registry'])
    t.equal(
      readFileSync(f, 'utf8'),
      JSON.stringify(
        {
          config: {
            color: true,
          },
        },
        null,
        2,
      ) + '\n',
    )
    await conf.deleteConfigKeys('project', ['color'])
    t.equal(
      readFileSync(f, 'utf8'),
      JSON.stringify({ config: {} }, null, 2) + '\n',
      'deleted color config',
    )
  })

  t.test('delete record field', async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: {
            npm: 'https://registry.npmjs.org/',
            acme: 'https://registry.acme.internal/',
            foo: 'https://example.com',
          },
        },
      }),
    })
    const f = resolve(dir, 'vlt.json')
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const conf = await Config.load(dir, [], true)
    await conf.deleteConfigKeys('project', ['registries.foo'])
    t.strictSame(JSON.parse(readFileSync(f, 'utf8')), {
      config: {
        registries: {
          npm: 'https://registry.npmjs.org/',
          acme: 'https://registry.acme.internal/',
        },
      },
    })
    await conf.deleteConfigKeys('project', [
      'registries.npm',
      'registries.acme',
    ])
    t.equal(
      readFileSync(f, 'utf8'),
      JSON.stringify({ config: {} }, null, 2) + '\n',
      'deleted named registries',
    )
  })

  t.test('delete record field as array', async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: [
            'foo=https://example.com',
            'npm=https://registry.npmjs.org/',
            'acme=https://registry.acme.internal/',
          ],
        },
      }),
    })
    const f = resolve(dir, 'vlt.json')
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const conf = await Config.load(dir, [], true)
    await conf.deleteConfigKeys('project', ['registries.foo'])
    t.strictSame(
      JSON.parse(readFileSync(f, 'utf8')),
      {
        config: {
          registries: {
            npm: 'https://registry.npmjs.org/',
            acme: 'https://registry.acme.internal/',
          },
        },
      },
      'converted to Record<string,string> in the file',
    )
  })

  t.test('delete all record field as array', async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: [
            'foo=https://example.com',
            'npm=https://registry.npmjs.org/',
            'acme=https://registry.acme.internal/',
          ],
        },
      }),
    })
    const f = resolve(dir, 'vlt.json')
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const conf = await Config.load(dir, [], true)
    await conf.deleteConfigKeys('project', [
      'registries.foo',
      'registries.npm',
      'registries.acme',
    ])
    t.equal(
      readFileSync(f, 'utf8'),
      JSON.stringify({ config: {} }, null, 2) + '\n',
      'deleted all registries',
    )
  })
})

t.test('edit config file', async t => {
  const dir = t.testdir({
    '.git': {},
  })
  const f = resolve(dir, 'vlt.json')
  let editCalled = false

  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')

  t.chdir(dir)
  const conf = await Config.load(dir, [], true)
  await conf.editConfigFile('project', filename => {
    editCalled = true
    t.equal(filename, f)
    t.equal(readFileSync(f, 'utf8'), '{\n  "config": {}\n}\n')
    writeFileSync(
      f,
      JSON.stringify(
        {
          config: {
            registry: 'my happy regas try',
          },
        },
        null,
        2,
      ) + '\n',
    )
  })
  t.equal(editCalled, true)

  editCalled = false
  await t.rejects(
    conf.editConfigFile('project', () => {
      editCalled = true
      t.equal(
        readFileSync(f, 'utf8'),
        JSON.stringify(
          {
            config: {
              registry: 'my happy regas try',
            },
          },
          null,
          2,
        ) + '\n',
      )
      writeFileSync(f, '{"config":{"color":true}}')
      throw new Error()
    }),
  )
  t.equal(editCalled, true)
  t.equal(
    readFileSync(f, 'utf8'),
    JSON.stringify(
      {
        config: {
          registry: 'my happy regas try',
        },
      },
      null,
      2,
    ) + '\n',
    'edit threw, file reverted',
  )

  await t.rejects(
    conf.editConfigFile('project', filename => {
      writeFileSync(filename, '"just a string"')
    }),
    'Invalid configuration, expected object',
  )

  await conf.writeConfigFile('project', { color: true })
  t.strictSame(
    JSON.parse(readFileSync(f, 'utf8')),
    { config: { color: true } },
    'gut check, wrote what we expected',
  )
  await t.rejects(
    conf.editConfigFile('project', filename => {
      writeFileSync(filename, '"just a string"')
    }),
    'Invalid configuration, expected object',
  )
  t.strictSame(
    JSON.parse(readFileSync(f, 'utf8')),
    { config: { color: true } },
    'preserved original config when edit failed',
  )
})

t.test('write invalid config with no backup', async t => {
  const dir = t.testdir({
    '.git': {},
  })
  const f = resolve(dir, 'vlt.json')
  t.chdir(dir)
  let editCalled = false
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const conf = await Config.load(dir, [], true)
  await t.rejects(
    conf.editConfigFile('project', filename => {
      editCalled = true
      t.equal(filename, f)
      writeFileSync(filename, '"just a string"')
    }),
    'Invalid configuration, expected object',
  )
  t.equal(editCalled, true)
  t.throws(() => statSync(f), 'file was removed')
})

t.test(
  'deleting fields works if the config file has array records somehow',
  async t => {
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts')
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        config: {
          registries: [
            'vlt=https://registry.vlt.sh/',
            'npm=https://registry.npmjs.org/',
            'acme=https://registry.acme.local/',
          ],
        },
      }),
    })
    t.chdir(dir)
    const c = await Config.load(dir)
    t.equal(
      await c.deleteConfigKeys('project', ['registries.npm']),
      true,
    )
    t.strictSame(
      JSON.parse(readFileSync(dir + '/vlt.json', 'utf8')),
      {
        config: {
          registries: {
            vlt: 'https://registry.vlt.sh/',
            acme: 'https://registry.acme.local/',
          },
        },
      },
    )
  },
)

t.test('read catalogs from config file', async t => {
  const projectRoot = t.testdir({
    'vlt.json': JSON.stringify({
      catalogs: {
        x: { a: '1.2.3' },
        y: { a: '2.3.4' },
      },
      catalog: { a: '6.7.8' },
    }),
  })
  t.chdir(projectRoot)
  unload()
  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const { options } = await Config.load(projectRoot)
  const { catalog, catalogs } = options
  t.strictSame(
    { catalog, catalogs },
    {
      catalogs: {
        x: { a: '1.2.3' },
        y: { a: '2.3.4' },
      },
      catalog: { a: '6.7.8' },
    },
  )
})

t.test('--verbose is shorthand for --loglevel=verbose', async t => {
  const dir = t.testdir({ 'vlt.json': '{}', '.git': {} })
  t.chdir(dir)

  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')

  clearEnv()
  const def = await Config.load(dir, ['install'], true)
  t.equal(def.get('loglevel'), 'info', 'defaults to info')
  t.equal(def.get('verbose'), undefined, 'verbose unset by default')

  clearEnv()
  const verbose = await Config.load(
    dir,
    ['install', '--verbose'],
    true,
  )
  t.equal(verbose.get('verbose'), true)
  t.equal(
    verbose.get('loglevel'),
    'verbose',
    '--verbose bumps loglevel to verbose',
  )

  clearEnv()
  const explicit = await Config.load(
    dir,
    ['install', '--verbose', '--loglevel', 'debug'],
    true,
  )
  t.equal(
    explicit.get('loglevel'),
    'debug',
    'explicit --loglevel wins over --verbose',
  )
})

t.test('reloadFromDisk method', async t => {
  const projectDir = t.testdir({
    'vlt.json': JSON.stringify({
      config: { cache: './initial-cache' },
    }),
    '.git': {},
  })

  const { Config } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')

  t.chdir(projectDir)
  const conf = await Config.load(projectDir, ['test'], true)

  // Verify the method exists and can be called without error
  // This is primarily to ensure the uncovered lines get executed
  t.type(
    conf.reloadFromDisk,
    'function',
    'reloadFromDisk method exists',
  )

  // Call the method to cover the uncovered lines
  await t.resolves(
    conf.reloadFromDisk(),
    'reloadFromDisk completes without error',
  )

  // Verify config is still functional after reload
  t.ok(conf.projectRoot, 'projectRoot still available after reload')
  t.type(conf.get, 'function', 'get method still works after reload')

  // Test a second reload to ensure it can be called multiple times
  await t.resolves(
    conf.reloadFromDisk(),
    'second reloadFromDisk call completes',
  )
})

t.test('config layers', async t => {
  // Loading a Config mutates the module-level jack definition, so each case
  // gets its own import of the module, and a cleared env, since parse()
  // writes the values it resolved back out as VLT_* vars.
  const layered = async (
    t: Test,
    user: Record<string, unknown>,
    project: Record<string, unknown>,
    argv: string[] = ['whoami'],
  ) => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({ config: project }),
      xdg: { 'vlt.json': JSON.stringify({ config: user }) },
      '.git': {},
    })
    const { Config } = await t.mockImport<
      typeof import('../../src/config/index.ts')
    >('../../src/config/index.ts', {
      '@vltpkg/xdg': {
        XDG: class XDG {
          config() {
            return dir + '/xdg/vlt.json'
          }
          cache() {
            return dir + '/default/cache'
          }
        },
      },
    })
    clearEnv()
    const conf = await Config.load(dir, argv, true)
    return { conf, dir }
  }

  await t.test(
    'a project registries alias beats a user registry',
    async t => {
      const { conf } = await layered(
        t,
        { registry: 'https://user/' },
        { registries: { npm: 'https://project/' } },
      )
      t.equal(conf.options.registry, undefined)
      const { requireRegistry } = await t.mockImport<
        typeof import('../../src/require-registry.ts')
      >('../../src/require-registry.ts')
      t.equal(requireRegistry(conf), 'https://project/')
    },
  )

  await t.test(
    'a user default-registry-alias does not leak',
    async t => {
      const { conf } = await layered(
        t,
        {
          'default-registry-alias': 'main',
          registries: { main: 'https://user-main/' },
        },
        { registries: { npm: 'https://project/' } },
      )
      t.equal(conf.options['default-registry-alias'], 'npm')
      const { hasNpmRegistry } = await t.mockImport<
        typeof import('../../src/require-registry.ts')
      >('../../src/require-registry.ts')
      t.equal(
        hasNpmRegistry(conf),
        true,
        'install commands are configured',
      )
      t.equal(
        conf.options.registries.main,
        'https://user-main/',
        'the user alias is still addressable by name',
      )
    },
  )

  await t.test(
    'a project alias adds to the user aliases',
    async t => {
      const { conf } = await layered(
        t,
        {
          registries: {
            npm: 'https://user-npm/',
            main: 'https://user-main/',
          },
        },
        { registries: { internal: 'https://internal/' } },
      )
      t.strictSame(conf.options.registries, {
        gh: 'https://npm.pkg.github.com/',
        npm: 'https://user-npm/',
        main: 'https://user-main/',
        internal: 'https://internal/',
      })
    },
  )

  await t.test('null removes a field', async t => {
    const { conf } = await layered(
      t,
      { registry: 'https://user/', tag: 'beta' },
      { registry: null },
    )
    t.equal(conf.options.registry, undefined)
    t.equal(conf.get('tag'), 'beta', 'unrelated fields are untouched')
  })

  await t.test('null removes a single record key', async t => {
    const { conf } = await layered(
      t,
      {
        registries: {
          npm: 'https://user-npm/',
          main: 'https://user-main/',
        },
      },
      { registries: { npm: null } },
    )
    t.strictSame(conf.options.registries, {
      gh: 'https://npm.pkg.github.com/',
      main: 'https://user-main/',
    })
  })

  await t.test('command blocks are layered too', async t => {
    const { conf } = await layered(
      t,
      { command: { publish: { registry: 'https://user/' } } },
      {
        command: {
          publish: { registries: { npm: 'https://project/' } },
        },
      },
      ['publish'],
    )
    t.equal(
      conf.get('registry'),
      undefined,
      'the project command block owns registry selection',
    )
    t.strictSame(conf.getRecord('registries'), {
      npm: 'https://project/',
    })
  })

  await t.test('re-reading a config file is idempotent', async t => {
    const { conf } = await layered(
      t,
      { registry: 'https://user/' },
      { registries: { npm: 'https://project/' } },
    )
    // both of these re-run the user config validator
    await conf.addConfigToFile('user', { tag: 'beta' })
    await conf.deleteConfigKeys('user', ['tag'])
    t.equal(
      conf.options.registry,
      undefined,
      'the user layer did not get stacked back on top',
    )
    t.strictSame(
      conf.options.registries,
      { gh: 'https://npm.pkg.github.com/', npm: 'https://project/' },
      'and neither did its registries',
    )
  })

  await t.test('layers are exposed, and track writes', async t => {
    const { conf } = await layered(
      t,
      { registries: { npm: 'https://user/', main: 'https://main/' } },
      { tag: 'beta' },
    )
    t.strictSame(conf.layers.project, { tag: 'beta' })
    t.strictSame(conf.layers.user?.registries, {
      npm: 'https://user/',
      main: 'https://main/',
    })
    await conf.deleteConfigKeys('user', ['registries.npm'])
    t.strictSame(
      conf.layers.user?.registries,
      { main: 'https://main/' },
      'a write to a file updates its layer',
    )
  })

  await t.test('a vanished layer is dropped', async t => {
    const { conf, dir } = await layered(
      t,
      { registry: 'https://user/' },
      { registry: 'https://project/' },
    )
    t.equal(conf.options.registry, 'https://project/')
    t.chdir(dir)
    writeFileSync(dir + '/vlt.json', JSON.stringify({}))
    // parse() round-trips the resolved values through VLT_* env vars, and
    // env beats both config files.
    clearEnv()
    await conf.reloadFromDisk()
    t.equal(conf.layers.project, undefined)
    t.equal(
      conf.options.registry,
      'https://user/',
      'falls back to the user config',
    )
  })

  await t.test(
    'an invalid value is blamed on its own file',
    async t => {
      const dir = t.testdir({
        'vlt.json': JSON.stringify({ config: { tag: 'beta' } }),
        xdg: {
          'vlt.json': JSON.stringify({
            config: { 'fetch-retries': 'not a number' },
          }),
        },
        '.git': {},
      })
      const { Config } = await t.mockImport<
        typeof import('../../src/config/index.ts')
      >('../../src/config/index.ts', {
        '@vltpkg/xdg': {
          XDG: class XDG {
            config() {
              return dir + '/xdg/vlt.json'
            }
            cache() {
              return dir + '/default/cache'
            }
          },
        },
      })
      clearEnv()
      await t.rejects(Config.load(dir, ['vlt'], true), {
        cause: { path: dir + '/xdg/vlt.json', name: 'fetch-retries' },
      })
    },
  )
})

t.test('configWriteTarget', async t => {
  const { configWriteTarget } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const conf = (config: string) =>
    ({ get: () => config }) as unknown as Parameters<
      typeof configWriteTarget
    >[0]
  t.equal(configWriteTarget(conf('user'), 'project'), 'user')
  t.equal(configWriteTarget(conf('project'), 'user'), 'project')
  t.equal(configWriteTarget(conf('all'), 'user'), 'user')
})

t.test('pairsToRecords/recordsToPairs round-trip', async t => {
  const { pairsToRecords, recordsToPairs } = await t.mockImport<
    typeof import('../../src/config/index.ts')
  >('../../src/config/index.ts')
  const records = {
    tag: 'beta',
    registries: { npm: 'https://npm/' },
    command: {
      publish: { registries: { npm: 'https://publish/' } },
    },
  }
  const pairs = recordsToPairs(records)
  t.strictSame(pairs, {
    tag: 'beta',
    registries: ['npm=https://npm/'],
    command: { publish: { registries: ['npm=https://publish/'] } },
  })
  t.strictSame(
    pairsToRecords(pairs as Parameters<typeof pairsToRecords>[0]),
    records,
  )
})
