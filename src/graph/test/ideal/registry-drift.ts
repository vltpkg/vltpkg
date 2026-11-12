import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import {
  assertNoRegistryDrift,
  collectRegistryPins,
  withParentRegistryHint,
} from '../../src/ideal/registry-drift.ts'

const npm = 'https://registry.npmjs.org/'
const corp = 'https://corp.example.com/'
const other = 'https://other.example.com/'
const options = {
  registries: { npm, corp },
  catalog: { b: 'corp:b@^1', cat: '^1' },
} satisfies SpecOptions

const registryId = (registry: string, nameVersion: string) =>
  joinDepIDTuple(['registry', registry, nameVersion])

/** A graph with `edges` as `[fromId, name, bareSpec, toId?]` */
const graphWith = (
  edges: [DepID | 'root', string, string, DepID?][],
  mainManifest: { name: string; version?: string } = {
    name: 'app',
    version: '1.0.0',
  },
) => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    mainManifest,
    ...options,
  })
  const node = (id: DepID | 'root') => {
    if (id === 'root') return graph.mainImporter
    const found = graph.nodes.get(id)
    if (found) return found
    const [, , nameVersion = ''] = id.split('~')
    const at = nameVersion.lastIndexOf('@')
    return graph.addNode(
      id,
      undefined,
      undefined,
      nameVersion.slice(0, at).replace('+', '/'),
      nameVersion.slice(at + 1),
    )
  }
  for (const [from, name, bareSpec, to] of edges) {
    graph.addEdge(
      'prod',
      Spec.parse(name, bareSpec, options),
      node(from),
      to && node(to),
    )
  }
  return graph
}

const lib = registryId('corp', 'internal-lib@1.0.0')
const corpUtils = registryId('corp', 'utils@1.2.0')

t.test('collectRegistryPins', async t => {
  t.equal(
    collectRegistryPins(
      graphWith([['root', 'lib', 'corp:internal-lib@^1', lib]]),
    ),
    undefined,
    'none',
  )

  const ws = joinDepIDTuple(['workspace', 'packages/utils'])
  const git = joinDepIDTuple(['git', 'github:a/utils', 'main'])
  t.equal(
    collectRegistryPins(
      graphWith([
        ['root', 'lib', 'corp:internal-lib@^1', lib],
        // consistent with its own spec
        [
          lib,
          'npm-utils',
          '^1',
          registryId('npm', 'npm-utils@1.0.0'),
        ],
        // dangling
        [lib, 'missing', '^1'],
        // explicit prefix
        [lib, 'a', 'corp:a@^1', registryId('corp', 'a@1.0.0')],
        [lib, 'b', 'catalog:', registryId('corp', 'b@1.0.0')],
        // not a registry target
        [lib, 'c', '^1', ws],
        [lib, 'd', '^1', git],
        // another name
        [lib, 'e', '^1', registryId('corp', 'x@1.0.0')],
      ]),
    ),
    undefined,
    'nothing inherited',
  )

  const pins = collectRegistryPins(
    graphWith([
      ['root', 'lib', 'corp:internal-lib@^1', lib],
      [lib, 'utils', '^1', corpUtils],
      [lib, 'cat', 'catalog:', registryId('corp', 'cat@1.0.0')],
      ['root', 'top', '^1', registryId('corp', 'top@1.0.0')],
    ]),
  )
  t.strictSame(
    [...(pins?.values() ?? [])],
    [
      { id: corpUtils, registry: 'corp' },
      { id: registryId('corp', 'cat@1.0.0'), registry: 'corp' },
      { id: registryId('corp', 'top@1.0.0'), registry: 'corp' },
    ],
  )
})

t.test('assertNoRegistryDrift', async t => {
  const locked = graphWith([
    ['root', 'lib', 'corp:internal-lib@^1', lib],
    [lib, 'utils', '^1', corpUtils],
    [lib, '@acme/ui', '^1', registryId('corp', '@acme/ui@1.0.0')],
    [lib, 'far', '^1', registryId(other, 'far@1.0.0')],
    [lib, 'jsry', '^1', registryId('jsr', 'jsry@1.0.0')],
  ])
  const graph = graphWith([])
  const parent = graph.addNode(
    // a later version of the same package
    registryId('corp', 'internal-lib@2.0.0'),
    undefined,
    undefined,
    'internal-lib',
    '2.0.0',
  )
  const spec = (name: string, bareSpec = '^1') =>
    Spec.parse(name, bareSpec, options)
  const drift = (s: Spec) => () =>
    assertNoRegistryDrift(graph, parent, s, '/project')

  t.doesNotThrow(drift(spec('utils')), 'no pins')
  const pins = collectRegistryPins(locked)
  graph.registryPins = pins

  t.doesNotThrow(drift(spec('other')), 'not pinned')
  t.doesNotThrow(drift(spec('utils', 'corp:utils@^1')), 'prefixed')
  t.doesNotThrow(
    drift(
      Spec.parse('utils', '^1', {
        ...options,
        'default-registry-alias': 'corp',
      }),
    ),
    'same registry',
  )

  t.throws(drift(spec('utils')), {
    message:
      'utils@^1 is locked to corp but now resolves from npm.\n' +
      'internal-lib@2.0.0 declares it with no registry prefix, and ' +
      "unprefixed dependencies no longer use their parent's registry.\n" +
      'To keep corp, add "#internal-lib > #utils": "corp:utils@^1" to ' +
      '"modifiers" in vlt.json.\n' +
      'To use npm, add "#internal-lib > #utils": "npm:utils@^1" ' +
      'instead, or delete vlt-lock.json and node_modules and run ' +
      'vlt install.',
    cause: {
      code: 'ERESOLVE',
      from: '/project',
      found: 'npm',
      wanted: 'corp',
    },
  })
  t.throws(drift(spec('@acme/ui')), {
    message: new RegExp(
      '\nTo keep corp, map @acme to https://corp\\.example\\.com/ in ' +
        'scoped-registries, or add "#internal-lib > #@acme/ui": ' +
        '"corp:@acme/ui@\\^1" to "modifiers" in vlt\\.json\\.\n',
    ),
  })
  t.throws(drift(spec('far')), {
    message: new RegExp(
      `add "#internal-lib > #far": "registry:${other}#far@\\^1"`,
    ),
  })
  t.throws(drift(spec('jsry')), {
    message:
      /add "#internal-lib > #jsry": "registry:https:\/\/npm\.jsr\.io\/#jsry@\^1"/,
  })

  const root = graphWith([['root', 'utils', '^1', corpUtils]], {
    name: 'app',
  })
  root.registryPins = collectRegistryPins(root)
  t.throws(
    () =>
      assertNoRegistryDrift(
        root,
        root.mainImporter,
        spec('utils'),
        '/project',
      ),
    {
      message: new RegExp(
        '\napp declares it with no registry prefix, .*\n' +
          'To keep corp, add ":root > #utils": "corp:utils@\\^1"',
      ),
    },
    'an importer parent',
  )
})

t.test('withParentRegistryHint', async t => {
  const graph = graphWith([])
  const parent = graph.addNode(
    lib,
    undefined,
    undefined,
    'internal-lib',
    '1.0.0',
  )
  const notFound = (spec: Spec, statusCode = 404) =>
    error('failed to fetch packument: 404 Not Found', {
      code: 'ERESOLVE',
      spec,
      url: `${npm}${spec.name}`,
      response: { statusCode },
    })
  const utils = Spec.parse('utils', '^1', options)

  t.test('unchanged', async t => {
    const plain = new Error('nope')
    t.equal(withParentRegistryHint(plain, utils, parent), plain)
    const notObject = new Error('nope', { cause: new Error('x') })
    t.equal(
      withParentRegistryHint(notObject, utils, parent),
      notObject,
    )
    const config = error('nope', { code: 'ECONFIG' })
    t.equal(withParentRegistryHint(config, utils, parent), config)
    const noResponse = error('nope', { code: 'ERESOLVE' })
    t.equal(
      withParentRegistryHint(noResponse, utils, parent),
      noResponse,
    )
    const forbidden = notFound(utils, 403)
    t.equal(
      withParentRegistryHint(forbidden, utils, parent),
      forbidden,
    )

    const er = notFound(utils)
    t.equal(
      withParentRegistryHint(er, utils, graph.mainImporter),
      er,
      'importer parent',
    )
    const prefixed = Spec.parse('utils', 'npm:utils@^1', options)
    t.equal(
      withParentRegistryHint(er, prefixed, parent),
      er,
      'prefixed',
    )
    const scoped = Spec.parse('@acme/x', '^1', {
      ...options,
      'scoped-registries': { '@acme': other },
    })
    t.equal(
      withParentRegistryHint(er, scoped, parent),
      er,
      'routed by scoped-registries',
    )
    const jsrParent = graph.addNode(
      registryId('jsr', '@jsr/a__b@1.0.0'),
      undefined,
      undefined,
      '@jsr/a__b',
      '1.0.0',
    )
    t.equal(withParentRegistryHint(er, utils, jsrParent), er, 'jsr')
    const sameRegistry = Spec.parse('utils', '^1', {
      ...options,
      'default-registry-alias': 'corp',
    })
    t.equal(
      withParentRegistryHint(er, sameRegistry, parent),
      er,
      'same registry',
    )
  })

  t.test('unscoped', async t => {
    const er = notFound(utils)
    const hinted = withParentRegistryHint(er, utils, parent)
    t.match(hinted, {
      message:
        'failed to fetch packument: 404 Not Found\n' +
        'utils has no registry prefix, so it was requested from npm, ' +
        'but its parent internal-lib@1.0.0 came from corp. To install ' +
        'it from corp, add "#internal-lib > #utils": "corp:utils@^1" ' +
        'to "modifiers" in vlt.json.',
      cause: {
        code: 'ERESOLVE',
        spec: utils,
        url: `${npm}utils`,
        response: { statusCode: 404 },
        cause: er,
      },
    })
  })

  t.test('scoped', async t => {
    const scoped = Spec.parse('@acme/x', '^1', options)
    t.match(
      withParentRegistryHint(notFound(scoped), scoped, parent),
      {
        message: new RegExp(
          'To install it from corp, map @acme to ' +
            'https://corp\\.example\\.com/ in scoped-registries, or add ' +
            '"#internal-lib > #@acme/x": "corp:@acme/x@\\^1" to ' +
            '"modifiers" in vlt\\.json\\.$',
        ),
      },
    )
  })
})
