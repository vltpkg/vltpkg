import t from 'tap'
import {
  cloneLayer,
  mergeLayers,
  registrySelectionFields,
  registrySelectors,
} from '../../src/config/merge-layers.ts'

t.test('scalars come from the innermost layer that sets them', t => {
  t.strictSame(
    mergeLayers([
      { tag: 'latest', 'node-version': '1.2.3' },
      { tag: 'beta' },
    ]),
    { tag: 'beta', 'node-version': '1.2.3' },
  )
  t.end()
})

t.test('missing and non-object layers are skipped', t => {
  t.strictSame(mergeLayers([]), {})
  t.strictSame(mergeLayers([undefined, { tag: 'beta' }]), {
    tag: 'beta',
  })
  t.strictSame(
    mergeLayers([
      // a layer that isn't an object at all has nothing to contribute
      'nope' as unknown as Record<string, unknown>,
      { tag: 'beta' },
    ]),
    { tag: 'beta' },
  )
  t.end()
})

t.test('record fields merge key by key', t => {
  t.strictSame(
    mergeLayers([
      { registries: { npm: 'user-npm', main: 'user-main' } },
      { registries: { npm: 'project-npm', extra: 'project-extra' } },
    ]).registries,
    {
      npm: 'project-npm',
      main: 'user-main',
      extra: 'project-extra',
    },
    'project wins on conflict, user-only keys survive',
  )
  t.strictSame(
    mergeLayers([{ 'git-hosts': { a: 'A' } }, { tag: 'beta' }])[
      'git-hosts'
    ],
    { a: 'A' },
    'inherited when the inner layer says nothing',
  )
  t.strictSame(
    mergeLayers([
      // not an object: treated as an ordinary value, so that jack gets to
      // be the thing that complains about it
      { registries: 'nope' },
    ]).registries,
    'nope',
  )
  t.end()
})

t.test('null removes things', t => {
  t.strictSame(
    mergeLayers([
      { registry: 'user', tag: 'beta' },
      { registry: null },
    ]),
    { tag: 'beta' },
    'a null scalar removes the field',
  )
  t.strictSame(
    mergeLayers([{ registry: null }]),
    {},
    'null with nothing to remove',
  )
  t.strictSame(
    mergeLayers([
      { registries: { npm: 'user-npm', main: 'user-main' } },
      { registries: { npm: null } },
    ]).registries,
    { main: 'user-main' },
    'a null record key removes just that key',
  )
  t.strictSame(
    mergeLayers([
      { registries: { npm: 'user-npm' } },
      { registries: { npm: null } },
    ]),
    {},
    'removing the last key drops the field, rather than applying an empty record',
  )
  t.strictSame(
    mergeLayers([
      { registries: { npm: 'user-npm' } },
      { registries: null },
    ]),
    {},
    'a null record field removes the whole thing',
  )
  t.end()
})

t.test('registry selection belongs to one layer', t => {
  t.strictSame(
    mergeLayers([
      { registry: 'user', registries: { main: 'user-main' } },
      { registries: { npm: 'project-npm' } },
    ]),
    { registries: { main: 'user-main', npm: 'project-npm' } },
    'a project `registries` shadows the user `registry`',
  )
  t.strictSame(
    mergeLayers([
      { 'default-registry-alias': 'main', registries: { main: 'u' } },
      { registry: 'project' },
    ]),
    { registry: 'project', registries: { main: 'u' } },
    'a project `registry` shadows the user `default-registry-alias`',
  )
  t.strictSame(
    mergeLayers([
      { registry: 'user', 'default-registry-alias': 'main' },
      {
        registries: { npm: 'p' },
        'default-registry-alias': 'npm',
      },
    ]),
    {
      registries: { npm: 'p' },
      'default-registry-alias': 'npm',
    },
    'selectors the inner layer does set are kept',
  )
  t.strictSame(
    mergeLayers([
      { registry: 'user' },
      { 'scoped-registries': { '@acme': 'a' } },
    ]),
    { registry: 'user', 'scoped-registries': { '@acme': 'a' } },
    'purely additive registry fields do not take over selection',
  )
  t.strictSame(
    mergeLayers([{ registry: 'user' }, { tag: 'beta' }]),
    { registry: 'user', tag: 'beta' },
    'a layer with no registry config inherits the selectors',
  )
  t.strictSame(
    registrySelectors.filter(
      f => !registrySelectionFields.includes(f),
    ),
    [],
    'every selector is also a trigger',
  )
  t.end()
})

t.test('command blocks merge with the same rules', t => {
  t.strictSame(
    mergeLayers([
      {
        command: {
          publish: { registry: 'user', tag: 'latest' },
          install: { bail: false },
        },
      },
      {
        command: {
          publish: { registries: { npm: 'project-npm' } },
        },
      },
    ]).command,
    {
      publish: { tag: 'latest', registries: { npm: 'project-npm' } },
      install: { bail: false },
    },
  )
  t.strictSame(
    mergeLayers([
      { command: { publish: { tag: 'latest' } } },
      { command: { publish: null } },
    ]),
    {},
    'a null command block is removed, and an empty command object dropped',
  )
  t.strictSame(
    mergeLayers([
      { command: { publish: { tag: 'latest' } } },
      { command: null },
    ]),
    {},
    'a null command field removes them all',
  )
  t.strictSame(
    mergeLayers([{ command: { publish: 'nope' } }]),
    {},
    'a non-object command block is ignored',
  )
  t.end()
})

t.test('layers are not mutated', t => {
  const user = {
    registries: { npm: 'user-npm' },
    command: { publish: { tag: 'latest' } },
  }
  const project = { registries: { npm: 'project-npm' } }
  const merged = mergeLayers([user, project])
  t.strictSame(user.registries, { npm: 'user-npm' })
  t.not(merged.registries, user.registries)
  t.not(merged.command, user.command)
  t.end()
})

t.test('cloneLayer', t => {
  const layer = {
    registries: { npm: 'u', gone: null },
    workspace: ['a', 'b'],
    command: { publish: { registries: { npm: 'p' } } },
    tag: 'latest',
  }
  const clone = cloneLayer(layer)
  t.strictSame(clone, layer, 'same shape, nulls preserved')
  t.not(clone.registries, layer.registries)
  t.not(clone.workspace, layer.workspace)
  t.not(
    clone.command.publish.registries,
    layer.command.publish.registries,
  )
  t.end()
})
