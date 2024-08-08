import t from 'tap'
import {
  parseAddArgs,
  parseRemoveArgs,
} from '../src/parse-add-remove-args.js'
import { LoadedConfig } from '../src/index.js'
import { Spec, kCustomInspect } from '@vltpkg/spec'
import { inspect } from 'util'

class MockConfig {
  values: Record<string, any> = {}
  positionals: string[] = []
}

Object.assign(Spec.prototype, {
  [kCustomInspect]() {
    return `Spec {${this as unknown as Spec}}`
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
    }
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
    }
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
    }
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
    }
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
    }
    conf.positionals = ['foo@latest']
    t.matchSnapshot(
      inspect(parseAddArgs(conf), { depth: Infinity }),
      'should return dependency as type=prod',
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
})
