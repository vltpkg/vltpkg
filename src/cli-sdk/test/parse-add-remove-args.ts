import { Spec, kCustomInspect } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { inspect } from 'node:util'
import t from 'tap'
import type { ConfigData, LoadedConfig } from '../src/config/index.ts'
import {
  parseAddArgs,
  parseRemoveArgs,
} from '../src/parse-add-remove-args.ts'

class MockConfig {
  values: Record<string, any> = {}
  positionals: string[] = []
}

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${this}}`
  },
})

t.test('parseAddArgs', async t => {
  await t.test('no item', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.positionals = []
    t.matchSnapshot(
      inspect(parseAddArgs(conf), { depth: Infinity }),
      'should return no dependency items',
    )
  })

  await t.test('single item', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.positionals = ['foo']
    t.matchSnapshot(
      inspect(parseAddArgs(conf), { depth: Infinity }),
      'should return a single dependency item',
    )
  })

  await t.test('multiple items', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.positionals = [
      'foo@^1',
      'bar@latest',
      'baz@1.0.0',
      'github:a/b',
      'file:./a',
    ]
    t.matchSnapshot(
      inspect(parseAddArgs(conf), { depth: Infinity }),
      'should return multiple dependency items',
    )
  })

  await t.test('define dev type dep', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.values = {
      'save-dev': true,
    } as ConfigData
    conf.positionals = ['foo@latest']
    t.matchSnapshot(
      inspect(parseAddArgs(conf), { depth: Infinity }),
      'should return dependency as type=dev',
    )
  })

  await t.test('define optional type dep', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.values = {
      'save-optional': true,
    } as ConfigData
    conf.positionals = ['foo@latest']
    t.matchSnapshot(
      inspect(parseAddArgs(conf), { depth: Infinity }),
      'should return dependency as type=optional',
    )
  })

  await t.test('define peer dep', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.values = {
      'save-peer': true,
    } as ConfigData
    conf.positionals = ['foo@latest']
    t.matchSnapshot(
      inspect(parseAddArgs(conf), { depth: Infinity }),
      'should return dependency as type=peer',
    )
  })

  await t.test('define optional peer dep', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.values = {
      'save-optional': true,
      'save-peer': true,
    } as ConfigData
    conf.positionals = ['foo@latest']
    t.matchSnapshot(
      inspect(parseAddArgs(conf), { depth: Infinity }),
      'should return dependency as type=peerOptional',
    )
  })

  await t.test('define as prod if explicitly defined', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.values = {
      'save-dev': true,
      'save-optional': true,
      'save-peer': true,
      'save-prod': true,
    } as ConfigData
    conf.positionals = ['foo@latest']
    t.matchSnapshot(
      inspect(parseAddArgs(conf), { depth: Infinity }),
      'should return dependency as type=prod',
    )
  })

  await t.test('workspaces', async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        workspaces: {
          app: ['./app/*'],
          utils: ['./utils/*'],
          other: ['foo', 'bar'],
        },
      }),
      app: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
            version: '1.0.0',
          }),
        },
      },
      utils: {
        c: {
          'package.json': JSON.stringify({
            name: 'c',
            version: '1.0.0',
          }),
        },
      },
      foo: {
        'package.json': JSON.stringify({
          name: 'foo',
          version: '1.0.0',
        }),
      },
      bar: {
        'package.json': JSON.stringify({
          name: 'bar',
          version: '1.0.0',
        }),
      },
    })

    await t.test(
      'define single dep of a single workspace',
      async t => {
        const monorepo = Monorepo.load(dir)
        const conf = new MockConfig() as LoadedConfig
        conf.positionals = ['foo']
        conf.values = { workspace: ['./app/a'] } as ConfigData
        t.matchSnapshot(
          inspect(parseAddArgs(conf, monorepo), { depth: Infinity }),
          'should return dependency of a workspace',
        )
      },
    )

    await t.test(
      'define root dep if no workspace config defined',
      async t => {
        const monorepo = Monorepo.load(dir)
        const conf = new MockConfig() as LoadedConfig
        conf.positionals = ['foo']
        t.matchSnapshot(
          inspect(parseAddArgs(conf, monorepo), { depth: Infinity }),
          'should return dependency of root',
        )
      },
    )

    await t.test(
      'define multiple deps of a single workspace',
      async t => {
        const monorepo = Monorepo.load(dir)
        const conf = new MockConfig() as LoadedConfig
        conf.positionals = [
          'foo@^1',
          'bar@latest',
          'baz@1.0.0',
          'github:a/b',
          'file:./a',
        ]
        conf.values = { workspace: ['c'] } as ConfigData
        t.matchSnapshot(
          inspect(parseAddArgs(conf, monorepo), { depth: Infinity }),
          'should return multiple deps of a workspace',
        )
      },
    )

    await t.test(
      'define multiple deps to multiple workspaces',
      async t => {
        const monorepo = Monorepo.load(dir)
        const conf = new MockConfig() as LoadedConfig
        conf.positionals = [
          'foo@^1',
          'bar@latest',
          'baz@1.0.0',
          'github:a/b',
          'file:./a',
        ]
        conf.values = { workspace: ['a', 'b', 'c'] } as ConfigData
        t.matchSnapshot(
          inspect(parseAddArgs(conf, monorepo), { depth: Infinity }),
          'should return multiple deps to multiple workspaces',
        )
      },
    )

    await t.test(
      'define single dep to a group of workspaces',
      async t => {
        const monorepo = Monorepo.load(dir)
        const conf = new MockConfig() as LoadedConfig
        conf.positionals = ['foo']
        conf.values = { 'workspace-group': ['other'] } as ConfigData
        t.matchSnapshot(
          inspect(parseAddArgs(conf, monorepo), { depth: Infinity }),
          'should return dependency to a group of workspaces',
        )
      },
    )

    await t.test(
      'define single dep to multiple groups of workspaces',
      async t => {
        const monorepo = Monorepo.load(dir)
        const conf = new MockConfig() as LoadedConfig
        conf.positionals = ['foo']
        conf.values = {
          'workspace-group': ['utils', 'other'],
        } as ConfigData
        t.matchSnapshot(
          inspect(parseAddArgs(conf, monorepo), { depth: Infinity }),
          'should return dependency to many groups of workspaces',
        )
      },
    )

    await t.test(
      'define multiple deps to multiple groups of workspaces',
      async t => {
        const monorepo = Monorepo.load(dir)
        const conf = new MockConfig() as LoadedConfig
        conf.positionals = [
          'foo@^1',
          'bar@latest',
          'baz@1.0.0',
          'github:a/b',
          'file:./a',
        ]
        conf.values = {
          'workspace-group': ['utils', 'other'],
        } as ConfigData
        t.matchSnapshot(
          inspect(parseAddArgs(conf, monorepo), { depth: Infinity }),
          'should return multiple deps to many groups of workspaces',
        )
      },
    )
  })
})

t.test('parseRemoveArgs', async t => {
  await t.test('single item', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.positionals = ['foo']
    t.matchSnapshot(
      inspect(parseRemoveArgs(conf)),
      'should return a single dependency item',
    )
  })

  await t.test('multiple items', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.positionals = ['foo@^1', 'bar@latest', 'baz@1.0.0']
    t.matchSnapshot(
      inspect(parseRemoveArgs(conf)),
      'should return multiple dependency item',
    )
  })

  await t.test('no items', async t => {
    const conf = new MockConfig() as LoadedConfig
    conf.positionals = []
    t.matchSnapshot(
      inspect(parseRemoveArgs(conf)),
      'should return no items',
    )
  })

  await t.test('workspaces', async t => {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({
        workspaces: {
          app: ['./app/*'],
          utils: ['./utils/*'],
          other: ['foo', 'bar'],
        },
      }),
      app: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
            version: '1.0.0',
          }),
        },
      },
      utils: {
        c: {
          'package.json': JSON.stringify({
            name: 'c',
            version: '1.0.0',
          }),
        },
      },
      foo: {
        'package.json': JSON.stringify({
          name: 'foo',
          version: '1.0.0',
        }),
      },
      bar: {
        'package.json': JSON.stringify({
          name: 'bar',
          version: '1.0.0',
        }),
      },
    })

    await t.test(
      'remove dep from root if no workspace defined',
      async t => {
        const monorepo = Monorepo.load(dir)
        const conf = new MockConfig() as LoadedConfig
        conf.positionals = ['foo']
        conf.values = {} as ConfigData
        t.matchSnapshot(
          inspect(parseRemoveArgs(conf, monorepo), {
            depth: Infinity,
          }),
          'should remove dep from root',
        )
      },
    )

    await t.test('single dep of a single workspace', async t => {
      const monorepo = Monorepo.load(dir)
      const conf = new MockConfig() as LoadedConfig
      conf.positionals = ['foo']
      conf.values = { workspace: ['./app/a'] } as ConfigData
      t.matchSnapshot(
        inspect(parseRemoveArgs(conf, monorepo), { depth: Infinity }),
        'should remove single dep of workspace',
      )
    })

    await t.test('multiple deps of a single workspace', async t => {
      const monorepo = Monorepo.load(dir)
      const conf = new MockConfig() as LoadedConfig
      conf.positionals = ['foo', 'bar']
      conf.values = { workspace: ['c'] } as ConfigData
      t.matchSnapshot(
        inspect(parseRemoveArgs(conf, monorepo), { depth: Infinity }),
        'should remove multiple deps of workspace',
      )
    })

    await t.test('single dep from a workspace group', async t => {
      const monorepo = Monorepo.load(dir)
      const conf = new MockConfig() as LoadedConfig
      conf.positionals = ['foo']
      conf.values = { 'workspace-group': ['app'] } as ConfigData
      t.matchSnapshot(
        inspect(parseRemoveArgs(conf, monorepo), { depth: Infinity }),
        'should remove single dep from a single workspace group',
      )
    })

    await t.test('multiple deps from a workspace group', async t => {
      const monorepo = Monorepo.load(dir)
      const conf = new MockConfig() as LoadedConfig
      conf.positionals = ['foo', 'bar']
      conf.values = { 'workspace-group': ['app'] } as ConfigData
      t.matchSnapshot(
        inspect(parseRemoveArgs(conf, monorepo), { depth: Infinity }),
        'should remove multiple dep from a single workspace group',
      )
    })

    await t.test(
      'multiple deps from multiple workspace groups',
      async t => {
        const monorepo = Monorepo.load(dir)
        const conf = new MockConfig() as LoadedConfig
        conf.positionals = ['foo', 'bar']
        conf.values = {
          'workspace-group': ['utils', 'other'],
        } as ConfigData
        t.matchSnapshot(
          inspect(parseRemoveArgs(conf, monorepo), {
            depth: Infinity,
          }),
          'should remove multiple dep from multiple workspace groups',
        )
      },
    )
  })
})
