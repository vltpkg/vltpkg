import { writeFileSync } from 'node:fs'
import { joinDepIDTuple, joinExtra } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import type { Manifest, NormalizedManifest } from '@vltpkg/types'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import { build } from '../../src/ideal/build.ts'
import {
  byteCompare,
  canonicalizePeerIds,
  isPeerScoped,
  peerEnvDigest,
  serializeNodeEnv,
} from '../../src/ideal/canonicalize-peer-ids.ts'
import { save } from '../../src/lockfile/save.ts'
import type { Node } from '../../src/node.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

const hex16 = /^peer\.[0-9a-f]{16}$/
const hex32 = /^peer\.[0-9a-f]{32}$/

const makeGraph = (t: { testdirName: string }) =>
  new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
  })

const place = (
  graph: Graph,
  from: Node,
  name: string,
  version: string,
  manifest: NormalizedManifest,
  extra?: string,
  type: 'prod' | 'peer' | 'peerOptional' | 'dev' = 'prod',
) => {
  const node = graph.placePackage(
    from,
    type,
    Spec.parse(name, version, configData),
    manifest,
    undefined,
    extra,
  )
  if (!node) throw new Error(`failed to place ${name}@${version}`)
  return node
}

t.test('byteCompare', async t => {
  t.equal(byteCompare('a', 'b'), -1)
  t.equal(byteCompare('b', 'a'), 1)
  t.equal(byteCompare('a', 'a'), 0)
})

t.test('isPeerScoped', async t => {
  const graph = makeGraph(t)
  t.notOk(isPeerScoped(graph.mainImporter, graph), 'importer')

  const file = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('file-pkg', 'file:./file-pkg', configData),
    {
      name: 'file-pkg',
      version: '1.0.0',
      peerDependencies: { x: '1' },
    },
    joinDepIDTuple(['file', './file-pkg']),
  )
  t.ok(file)
  if (!file) return
  t.notOk(isPeerScoped(file, graph), 'file type')

  const ws = graph.addNode(
    joinDepIDTuple(['workspace', 'packages/ws-pkg']),
    {
      name: 'ws-pkg',
      version: '1.0.0',
      peerDependencies: { x: '1' },
    },
  )
  t.notOk(isPeerScoped(ws, graph), 'workspace type')

  const plain = place(graph, graph.mainImporter, 'plain', '1.0.0', {
    name: 'plain',
    version: '1.0.0',
  })
  t.notOk(isPeerScoped(plain, graph), 'no peer signal')

  const suffixed = place(
    graph,
    graph.mainImporter,
    'suffixed',
    '1.0.0',
    { name: 'suffixed', version: '1.0.0' },
    'peer.7',
  )
  t.ok(isPeerScoped(suffixed, graph), 'legacy suffix')

  const declared = place(
    graph,
    graph.mainImporter,
    'declared',
    '1.0.0',
    {
      name: 'declared',
      version: '1.0.0',
      dependencies: { plain: '1.0.0' },
      peerDependencies: { react: '^18' },
    },
  )
  t.ok(isPeerScoped(declared, graph), 'manifest peerDependencies')

  const edgeOnly = place(
    graph,
    graph.mainImporter,
    'edge-only',
    '1.0.0',
    { name: 'edge-only', version: '1.0.0' },
  )
  graph.addEdge(
    'peerOptional',
    Spec.parse('missing', '*', configData),
    edgeOnly,
  )
  t.ok(isPeerScoped(edgeOnly, graph), 'peerOptional out-edge')

  const fromManifests = graph.addNode(
    joinDepIDTuple(['registry', '', 'from-mani@1.0.0']),
  )
  graph.manifests.set(fromManifests.id, {
    name: 'from-mani',
    version: '1.0.0',
    peerDependencies: { x: '1' },
  })
  t.ok(isPeerScoped(fromManifests, graph), 'graph.manifests fallback')
})

t.test('serializeNodeEnv', async t => {
  const graph = makeGraph(t)
  const foo = place(
    graph,
    graph.mainImporter,
    'foo',
    '1.0.0',
    {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { bar: '1', missing: '1' },
      dependencies: { zed: '1.0.0' },
    },
    'peer.1',
  )
  const zed = place(graph, foo, 'zed', '1.0.0', {
    name: 'zed',
    version: '1.0.0',
  })
  graph.addEdge('peer', Spec.parse('missing', '1', configData), foo)
  const bar = place(
    graph,
    foo,
    'bar',
    '1.0.0',
    { name: 'bar', version: '1.0.0' },
    undefined,
    'peer',
  )

  const ser = serializeNodeEnv(foo)
  const lines = ser.split('\n').sort(byteCompare)
  t.strictSame(lines, ser.split('\n'), 'already byte-sorted')
  t.ok(
    ser.includes(`bar\0peer\0${bar.id}`),
    'peer edge uses target id',
  )
  t.ok(ser.includes(`zed\0prod\0${zed.id}`), 'prod edge included')
  t.ok(ser.includes('missing\0peer\0MISSING'), 'MISSING marker')

  const intra = new Map<Node, number>([[foo, 0]])
  graph.addEdge(
    'peer',
    Spec.parse('foo', '1.0.0', configData),
    foo,
    foo,
  )
  t.equal(
    serializeNodeEnv(foo, { intraSccIndex: intra }).includes(
      'foo\0peer\0#0',
    ),
    true,
    'self-edge uses intra-SCC index',
  )

  const resolved = new Map<Node, DepID>([
    [zed, joinDepIDTuple(['registry', '', 'zed@9.9.9'])],
  ])
  t.ok(
    serializeNodeEnv(foo, { resolvedIds: resolved }).includes(
      joinDepIDTuple(['registry', '', 'zed@9.9.9']),
    ),
    'resolvedIds override current target id',
  )
})

t.test('rename legacy ordinal to content hash', async t => {
  const graph = makeGraph(t)
  const react = place(graph, graph.mainImporter, 'react', '18.0.0', {
    name: 'react',
    version: '18.0.0',
  })
  const ui = place(
    graph,
    graph.mainImporter,
    'ui',
    '1.0.0',
    {
      name: 'ui',
      version: '1.0.0',
      peerDependencies: { react: '^18' },
    },
    'peer.7',
  )
  graph.addEdge(
    'peer',
    Spec.parse('react', '^18', configData),
    ui,
    react,
  )

  canonicalizePeerIds(graph)

  t.match(ui.peerSetHash, hex16)
  t.ok(ui.id.endsWith(`~${ui.peerSetHash}`))
  t.notOk(
    graph.nodes.has(
      joinDepIDTuple(['registry', '', 'ui@1.0.0', 'peer.7']),
    ),
  )
  t.equal(graph.nodes.get(ui.id), ui)
  t.equal(graph.manifests.get(ui.id)?.name, 'ui')
  t.equal(ui.location, `./node_modules/.vlt/${ui.id}/node_modules/ui`)
})

t.test('idempotent on second pass', async t => {
  const graph = makeGraph(t)
  const ui = place(
    graph,
    graph.mainImporter,
    'ui',
    '1.0.0',
    {
      name: 'ui',
      version: '1.0.0',
      peerDependencies: { x: '1' },
    },
    'peer.1',
  )
  canonicalizePeerIds(graph)
  const id = ui.id
  const hash = ui.peerSetHash
  canonicalizePeerIds(graph)
  t.equal(ui.id, id)
  t.equal(ui.peerSetHash, hash)
})

t.test(
  'skips file, workspace, and graphs with no scoped nodes',
  async t => {
    const graph = makeGraph(t)
    t.strictSame(canonicalizePeerIds(graph), [])
    t.equal(graph.nodes.size, 1)

    const file = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('local', 'file:./local', configData),
      {
        name: 'local',
        version: '1.0.0',
        peerDependencies: { x: '1' },
      },
      joinDepIDTuple(['file', './local']),
    )
    const before = file?.id
    canonicalizePeerIds(graph)
    t.equal(file?.id, before)
  },
)

t.test('git and remote ids keep type and modifier', async t => {
  const graph = makeGraph(t)
  const gitId = joinDepIDTuple([
    'git',
    'github:user/proj',
    'main',
    joinExtra({ modifier: ':root > #gitpkg', peerSetHash: 'peer.3' }),
  ])
  const git = graph.addNode(gitId, {
    name: 'gitpkg',
    version: '1.0.0',
    peerDependencies: { x: '1' },
  })
  git.peerSetHash = 'peer.3'
  git.modifier = ':root > #gitpkg'
  graph.addEdge(
    'prod',
    Spec.parse('gitpkg', 'github:user/proj#main', configData),
    graph.mainImporter,
    git,
  )

  const remoteId = joinDepIDTuple([
    'remote',
    'https://example.com/r.tgz',
    'peer.4',
  ])
  const remote = graph.addNode(remoteId, {
    name: 'rempkg',
    version: '1.0.0',
    peerDependencies: { x: '1' },
  })
  remote.peerSetHash = 'peer.4'
  graph.addEdge(
    'prod',
    Spec.parse('rempkg', 'https://example.com/r.tgz', configData),
    graph.mainImporter,
    remote,
  )

  canonicalizePeerIds(graph)
  t.match(git.peerSetHash, hex16)
  t.equal(git.modifier, ':root > #gitpkg')
  t.match(git.id, /^git~/)
  t.match(remote.peerSetHash, hex16)
  t.match(remote.id, /^remote~/)
})

t.test('self-peer-edge hashes with #0', async t => {
  const graph = makeGraph(t)
  const foo = place(
    graph,
    graph.mainImporter,
    'foo',
    '1.0.0',
    {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { foo: '1.0.0' },
    },
    'peer.1',
  )
  graph.addEdge(
    'peer',
    Spec.parse('foo', '1.0.0', configData),
    foo,
    foo,
  )
  canonicalizePeerIds(graph)
  t.match(foo.peerSetHash, hex16)
  const expected = peerEnvDigest(`foo\0peer\0#0`)
  t.equal(foo.peerSetHash, `peer.${expected}`)
})

t.test('cycle SCC members share a unit hash', async t => {
  const graph = makeGraph(t)
  const a = place(
    graph,
    graph.mainImporter,
    'a',
    '1.0.0',
    {
      name: 'a',
      version: '1.0.0',
      peerDependencies: { b: '1.0.0' },
    },
    'peer.1',
  )
  const b = place(
    graph,
    a,
    'b',
    '1.0.0',
    {
      name: 'b',
      version: '1.0.0',
      peerDependencies: { a: '1.0.0' },
    },
    'peer.2',
    'peer',
  )
  graph.addEdge('peer', Spec.parse('a', '1.0.0', configData), b, a)
  graph.addEdge(
    'peerOptional',
    Spec.parse('missing', '1', configData),
    a,
  )

  canonicalizePeerIds(graph)
  t.match(a.peerSetHash, hex16)
  t.equal(a.peerSetHash, b.peerSetHash, 'shared SCC hash')
  t.not(a.id, b.id, 'distinguished by base id')
})

t.test(
  'symmetric same-base SCC twins merge without oscillating',
  async t => {
    const graph = makeGraph(t)
    const foo1 = place(
      graph,
      graph.mainImporter,
      'foo',
      '1.0.0',
      {
        name: 'foo',
        version: '1.0.0',
        peerDependencies: { foo: '1.0.0' },
      },
      'peer.1',
    )
    const foo2id = joinDepIDTuple([
      'registry',
      '',
      'foo@1.0.0',
      'peer.9',
    ])
    const foo2 = graph.addNode(foo2id, {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { foo: '1.0.0' },
    })
    foo2.peerSetHash = 'peer.9'
    graph.addEdge(
      'prod',
      Spec.parse('foo', '1.0.0', configData),
      graph.mainImporter,
      foo2,
    )
    graph.addEdge(
      'peer',
      Spec.parse('foo', '1.0.0', configData),
      foo1,
      foo2,
    )
    graph.addEdge(
      'peer',
      Spec.parse('foo', '1.0.0', configData),
      foo2,
      foo1,
    )

    canonicalizePeerIds(graph)
    const foos = [...graph.nodes.values()].filter(
      n => n.name === 'foo',
    )
    t.equal(foos.length, 1, 'automorphic twins merged')
    t.match(foos[0]?.peerSetHash, hex16)
    canonicalizePeerIds(graph)
    t.equal(
      [...graph.nodes.values()].filter(n => n.name === 'foo').length,
      1,
    )
    t.equal(
      foos[0]?.id,
      [...graph.nodes.values()].find(n => n.name === 'foo')?.id,
    )
  },
)

t.test('same-base different roles get .idx suffix', async t => {
  const graph = makeGraph(t)
  const foo1 = place(
    graph,
    graph.mainImporter,
    'foo',
    '1.0.0',
    {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { bar: '1' },
      dependencies: { 'leaf-a': '1.0.0' },
    },
    'peer.1',
  )
  const bar = place(
    graph,
    foo1,
    'bar',
    '1.0.0',
    {
      name: 'bar',
      version: '1.0.0',
      peerDependencies: { foo: '1' },
    },
    'peer.2',
    'peer',
  )
  const foo2id = joinDepIDTuple([
    'registry',
    '',
    'foo@1.0.0',
    'peer.3',
  ])
  const foo2 = graph.addNode(foo2id, {
    name: 'foo',
    version: '1.0.0',
    peerDependencies: { baz: '1' },
    dependencies: { 'leaf-b': '1.0.0' },
  })
  foo2.peerSetHash = 'peer.3'
  graph.addEdge('peer', Spec.parse('foo', '1', configData), bar, foo2)
  const baz = place(
    graph,
    foo2,
    'baz',
    '1.0.0',
    {
      name: 'baz',
      version: '1.0.0',
      peerDependencies: { foo: '1' },
    },
    'peer.4',
    'peer',
  )
  graph.addEdge('peer', Spec.parse('foo', '1', configData), baz, foo1)
  place(graph, foo1, 'leaf-a', '1.0.0', {
    name: 'leaf-a',
    version: '1.0.0',
  })
  place(graph, foo2, 'leaf-b', '1.0.0', {
    name: 'leaf-b',
    version: '1.0.0',
  })

  canonicalizePeerIds(graph)
  const h1 = foo1.peerSetHash
  const h2 = foo2.peerSetHash
  if (!h1 || !h2) throw new Error('expected idx suffixes')
  t.match(h1, /^peer\.[0-9a-f]{16}\.[01]$/)
  t.match(h2, /^peer\.[0-9a-f]{16}\.[01]$/)
  t.equal(h1.slice(0, 21), h2.slice(0, 21))
  t.not(h1, h2)
})

t.test('merge duplicate nodes with equal serializations', async t => {
  const graph = makeGraph(t)
  const react = place(graph, graph.mainImporter, 'react', '18.0.0', {
    name: 'react',
    version: '18.0.0',
  })
  const libA = place(graph, graph.mainImporter, 'lib-a', '1.0.0', {
    name: 'lib-a',
    version: '1.0.0',
  })
  const libB = place(graph, graph.mainImporter, 'lib-b', '1.0.0', {
    name: 'lib-b',
    version: '1.0.0',
  })
  const ui1 = place(
    graph,
    libA,
    'ui',
    '1.0.0',
    {
      name: 'ui',
      version: '1.0.0',
      peerDependencies: { react: '^18' },
    },
    'peer.12',
  )
  ui1.dev = true
  ui1.optional = true
  const ui2 = graph.addNode(
    joinDepIDTuple(['registry', '', 'ui@1.0.0', 'peer.13']),
  )
  ui2.peerSetHash = 'peer.13'
  ui2.dev = false
  ui2.optional = false
  graph.addEdge(
    'prod',
    Spec.parse('ui', '1.0.0', configData),
    libB,
    ui2,
  )
  graph.addEdge(
    'peer',
    Spec.parse('react', '^18', configData),
    ui1,
    react,
  )
  graph.addEdge(
    'peer',
    Spec.parse('react', '^18', configData),
    ui2,
    react,
  )
  graph.resolutions.set('ui-rev', ui2)
  graph.resolutionsReverse.set(ui2, new Set(['ui-rev']))

  const extra = graph.addNode(
    joinDepIDTuple(['registry', '', 'orphan-leaf@1.0.0']),
    { name: 'orphan-leaf', version: '1.0.0' },
  )
  graph.addEdge(
    'prod',
    Spec.parse('orphan-leaf', '1.0.0', configData),
    ui2,
    extra,
  )
  graph.addEdge(
    'prod',
    Spec.parse('orphan-leaf', '1.0.0', configData),
    ui1,
    extra,
  )
  const detached = graph.addNode(
    joinDepIDTuple(['registry', '', 'detached@1.0.0']),
    { name: 'detached', version: '1.0.0' },
  )

  canonicalizePeerIds(graph)

  const uis = [...graph.nodes.values()].filter(n => n.name === 'ui')
  t.equal(uis.length, 1, 'duplicates merged')
  const winner = uis[0]
  t.ok(winner)
  t.equal(winner?.dev, false, 'dev &&=')
  t.equal(winner?.optional, false, 'optional &&=')
  t.equal(libA.edgesOut.get('ui')?.to, winner)
  t.equal(libB.edgesOut.get('ui')?.to, winner)
  t.ok(winner?.edgesIn.size && winner.edgesIn.size >= 2)
  t.notOk(
    [...react.edgesIn].some(e => e.from === ui2),
    'loser out-edges scrubbed from target edgesIn',
  )
  t.notOk(
    graph.nodes.has(detached.id),
    'second gc collects unreachable nodes',
  )
})

t.test(
  'merge preserves lockfile metadata from the loser',
  async t => {
    const graph = makeGraph(t)
    const react = place(
      graph,
      graph.mainImporter,
      'react',
      '18.0.0',
      {
        name: 'react',
        version: '18.0.0',
      },
    )
    const libA = place(graph, graph.mainImporter, 'lib-a', '1.0.0', {
      name: 'lib-a',
      version: '1.0.0',
    })
    const libB = place(graph, graph.mainImporter, 'lib-b', '1.0.0', {
      name: 'lib-b',
      version: '1.0.0',
    })

    // winner-to-be: sorts first, carries no metadata and no manifest
    const bare = graph.addNode(
      joinDepIDTuple(['registry', '', 'ui@1.0.0', 'peer.aa']),
      undefined,
      undefined,
      'ui',
      '1.0.0',
    )
    bare.peerSetHash = 'peer.aa'

    // loser-to-be: carries lockfile metadata and the manifest
    const uiManifest = {
      name: 'ui',
      version: '1.0.0',
      peerDependencies: { react: '^18' },
    }
    const rich = graph.addNode(
      joinDepIDTuple(['registry', '', 'ui@1.0.0', 'peer.bb']),
      uiManifest,
    )
    rich.peerSetHash = 'peer.bb'
    rich.integrity = 'sha512-UI-LOCKFILE=='
    rich.resolved = 'https://registry.npmjs.org/ui/-/ui-1.0.0.tgz'
    rich.resolvedFromLockfile = true

    graph.addEdge(
      'prod',
      Spec.parse('ui', '1.0.0', configData),
      libA,
      bare,
    )
    graph.addEdge(
      'prod',
      Spec.parse('ui', '1.0.0', configData),
      libB,
      rich,
    )
    graph.addEdge(
      'peer',
      Spec.parse('react', '^18', configData),
      bare,
      react,
    )
    graph.addEdge(
      'peer',
      Spec.parse('react', '^18', configData),
      rich,
      react,
    )

    canonicalizePeerIds(graph)

    const uis = [...graph.nodes.values()].filter(n => n.name === 'ui')
    t.equal(uis.length, 1, 'duplicates merged')
    const winner = uis[0]!
    t.equal(winner, bare, 'first-sorted copy wins')
    t.equal(
      winner.integrity,
      'sha512-UI-LOCKFILE==',
      'integrity transferred from loser',
    )
    t.equal(
      winner.resolved,
      'https://registry.npmjs.org/ui/-/ui-1.0.0.tgz',
      'resolved transferred from loser',
    )
    t.equal(
      winner.resolvedFromLockfile,
      true,
      'lockfile verification flag transferred',
    )
    t.equal(winner.manifest, uiManifest, 'manifest transferred')
    t.equal(
      graph.manifests.get(winner.id),
      uiManifest,
      'manifest inventory updated for the canonical id',
    )
  },
)

t.test('verified-different collision extends to 32 hex', async t => {
  const graph = makeGraph(t)
  const a = place(
    graph,
    graph.mainImporter,
    'foo',
    '1.0.0',
    {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { x: '1' },
      dependencies: { 'leaf-a': '1.0.0' },
    },
    'peer.1',
  )
  const lib = place(graph, graph.mainImporter, 'lib', '1.0.0', {
    name: 'lib',
    version: '1.0.0',
  })
  const b = graph.addNode(
    joinDepIDTuple(['registry', '', 'foo@1.0.0', 'peer.2']),
    {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { x: '1' },
      dependencies: { 'leaf-b': '1.0.0' },
    },
  )
  b.peerSetHash = 'peer.2'
  graph.addEdge(
    'prod',
    Spec.parse('foo', '1.0.0', configData),
    lib,
    b,
  )
  place(graph, a, 'leaf-a', '1.0.0', {
    name: 'leaf-a',
    version: '1.0.0',
  })
  place(graph, b, 'leaf-b', '1.0.0', {
    name: 'leaf-b',
    version: '1.0.0',
  })

  canonicalizePeerIds(graph, {
    digest: (_input, length) =>
      length === 16 ?
        'bbbbbbbbbbbbbbbb'
      : peerEnvDigest(_input, length),
  })

  const foos = [...graph.nodes.values()].filter(n => n.name === 'foo')
  t.equal(foos.length, 2, 'not merged')
  const suffixes = foos.map(n => n.peerSetHash).sort()
  t.ok(suffixes.some(s => s && hex16.test(s)))
  t.ok(suffixes.some(s => s && hex32.test(s)))
})

t.test(
  'resets name fallback and preserves custom location',
  async t => {
    const graph = makeGraph(t)
    const nameless = graph.addNode(
      joinDepIDTuple(['registry', '', 'anon@1.0.0', 'peer.1']),
    )
    nameless.peerSetHash = 'peer.1'
    t.equal(nameless.name, nameless.id)
    graph.addEdge(
      'prod',
      Spec.parse('anon', '1.0.0', configData),
      graph.mainImporter,
      nameless,
    )

    const custom = place(
      graph,
      graph.mainImporter,
      'custom',
      '1.0.0',
      {
        name: 'custom',
        version: '1.0.0',
        peerDependencies: { x: '1' },
      },
      'peer.2',
    )
    custom.location = './somewhere/custom'

    canonicalizePeerIds(graph)
    t.equal(nameless.name, nameless.id)
    t.notMatch(nameless.name, /peer\.1$/)
    t.equal(custom.location, './somewhere/custom')
  },
)

t.test('two edges to the same scoped target', async t => {
  const graph = makeGraph(t)
  const foo = place(
    graph,
    graph.mainImporter,
    'foo',
    '1.0.0',
    {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { bar: '1' },
    },
    'peer.1',
  )
  const bar = place(
    graph,
    foo,
    'bar',
    '1.0.0',
    {
      name: 'bar',
      version: '1.0.0',
      peerDependencies: { foo: '1' },
    },
    'peer.2',
    'peer',
  )
  graph.addEdge(
    'prod',
    Spec.parse('bar-alias', '1.0.0', configData),
    foo,
    bar,
  )
  graph.addEdge('peer', Spec.parse('foo', '1', configData), bar, foo)
  canonicalizePeerIds(graph)
  t.match(foo.peerSetHash, hex16)
  t.equal(foo.peerSetHash, bar.peerSetHash)
})

t.test('move plan includes extracted renames only', async t => {
  const graph = makeGraph(t)
  const react = place(graph, graph.mainImporter, 'react', '18.0.0', {
    name: 'react',
    version: '18.0.0',
  })
  const ui = place(
    graph,
    graph.mainImporter,
    'ui',
    '1.0.0',
    {
      name: 'ui',
      version: '1.0.0',
      peerDependencies: { react: '^18' },
    },
    'peer.7',
  )
  graph.addEdge(
    'peer',
    Spec.parse('react', '^18', configData),
    ui,
    react,
  )
  const from = ui.id
  ui.extracted = true
  const moves = canonicalizePeerIds(graph)
  t.equal(moves.length, 1)
  t.equal(moves[0]?.from, from)
  t.equal(moves[0]?.to, ui.id)
  t.equal(moves[0]?.node, ui)
  t.not(from, ui.id, 'id changed')
})

t.test('move plan discards extracted merge losers', async t => {
  const graph = makeGraph(t)
  const react = place(graph, graph.mainImporter, 'react', '18.0.0', {
    name: 'react',
    version: '18.0.0',
  })
  const libA = place(graph, graph.mainImporter, 'lib-a', '1.0.0', {
    name: 'lib-a',
    version: '1.0.0',
  })
  const libB = place(graph, graph.mainImporter, 'lib-b', '1.0.0', {
    name: 'lib-b',
    version: '1.0.0',
  })
  const ui1 = place(
    graph,
    libA,
    'ui',
    '1.0.0',
    {
      name: 'ui',
      version: '1.0.0',
      peerDependencies: { react: '^18' },
    },
    'peer.12',
  )
  const ui2 = graph.addNode(
    joinDepIDTuple(['registry', '', 'ui@1.0.0', 'peer.13']),
  )
  ui2.peerSetHash = 'peer.13'
  ui2.extracted = true
  const loserId = ui2.id
  graph.addEdge(
    'prod',
    Spec.parse('ui', '1.0.0', configData),
    libB,
    ui2,
  )
  graph.addEdge(
    'peer',
    Spec.parse('react', '^18', configData),
    ui1,
    react,
  )
  graph.addEdge(
    'peer',
    Spec.parse('react', '^18', configData),
    ui2,
    react,
  )
  const moves = canonicalizePeerIds(graph)
  t.ok(
    moves.some(m => m.from === loserId && !m.to),
    'extracted loser is discarded',
  )
})

t.test('already-canonical node is a no-op rename', async t => {
  const graph = makeGraph(t)
  const ui = place(
    graph,
    graph.mainImporter,
    'ui',
    '1.0.0',
    {
      name: 'ui',
      version: '1.0.0',
      peerDependencies: { x: '1' },
    },
    'peer.1',
  )
  canonicalizePeerIds(graph)
  const id = ui.id
  ui.peerSetHash =
    id.includes('peer.') ? ui.peerSetHash : ui.peerSetHash
  canonicalizePeerIds(graph)
  t.equal(ui.id, id)
})

t.test('build() double-rebuild is a lockfile fixpoint', async t => {
  const manifests: Record<string, Manifest> = {
    foo: {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { react: '^18' },
      dependencies: { react: '^18' },
    },
    react: { name: 'react', version: '18.3.0' },
  }
  const packageInfo = {
    async manifest(spec: Spec) {
      return manifests[spec.final.name]
    },
  } as PackageInfoClient

  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: { foo: '^1.0.0', react: '^18.0.0' },
    }),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  const buildOnce = () =>
    build({
      ...configData,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      remover: new RollbackRemove(),
    })

  const first = await buildOnce()
  save({ ...configData, graph: first })
  const ids1 = [...first.nodes.keys()].sort()

  const second = await buildOnce()
  save({ ...configData, graph: second })
  const ids2 = [...second.nodes.keys()].sort()

  const third = await buildOnce()
  const ids3 = [...third.nodes.keys()].sort()

  t.strictSame(ids2, ids1, 'rebuild 1 matches')
  t.strictSame(ids3, ids2, 'rebuild 2 is a fixpoint')
  const foo = [...third.nodes.values()].find(n => n.name === 'foo')
  t.match(foo?.peerSetHash, hex16)
})

t.test(
  'unrelated add does not rename existing peer hashes',
  async t => {
    const manifests: Record<string, Manifest> = {
      ui: {
        name: 'ui',
        version: '1.0.0',
        peerDependencies: { react: '^18' },
      },
      react: { name: 'react', version: '18.3.0' },
      extra: { name: 'extra', version: '1.0.0' },
    }
    const packageInfo = {
      async manifest(spec: Spec) {
        return manifests[spec.final.name]
      },
    } as PackageInfoClient

    // a single fixture with one subdir per project: calling t.testdir()
    // again mid-test would rmdir the fixture while it is the cwd, which
    // fails with EBUSY on Windows
    const project = (deps: Record<string, string>) => ({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: deps,
      }),
      'vlt.json': '{}',
    })
    const root = t.testdir({
      base: project({ ui: '^1.0.0', react: '^18.0.0' }),
      'with-extra': project({
        ui: '^1.0.0',
        react: '^18.0.0',
        extra: '^1.0.0',
      }),
    })
    const mk = (dir: string) => {
      const projectRoot = `${root}/${dir}`
      t.chdir(projectRoot)
      unload('project')
      return build({
        ...configData,
        scurry: new PathScurry(projectRoot),
        monorepo: Monorepo.maybeLoad(projectRoot),
        packageJson: new PackageJson(),
        packageInfo,
        projectRoot,
        remover: new RollbackRemove(),
      })
    }

    const base = await mk('base')
    const ui1 = [...base.nodes.values()].find(n => n.name === 'ui')
    const withExtra = await mk('with-extra')
    const ui2 = [...withExtra.nodes.values()].find(
      n => n.name === 'ui',
    )
    t.equal(ui1?.id, ui2?.id, 'unrelated dep add keeps ui id')
  },
)

t.test(
  'removing an earlier-BFS peer fork does not rename later hashes',
  async t => {
    const manifests: Record<string, Manifest> = {
      wrapper: {
        name: 'wrapper',
        version: '1.0.0',
        dependencies: { 'late-plugin': '^1.0.0' },
      },
      'early-plugin': {
        name: 'early-plugin',
        version: '1.0.0',
        peerDependencies: { react: '^18' },
      },
      'late-plugin': {
        name: 'late-plugin',
        version: '1.0.0',
        peerDependencies: { react: '^18' },
      },
      react: { name: 'react', version: '18.3.0' },
    }
    const packageInfo = {
      async manifest(spec: Spec) {
        return manifests[spec.final.name]
      },
    } as PackageInfoClient

    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          'early-plugin': '^1.0.0',
          wrapper: '^1.0.0',
          react: '^18.0.0',
        },
      }),
      'vlt.json': '{}',
    })
    t.chdir(projectRoot)
    unload('project')

    const buildOnce = () =>
      build({
        ...configData,
        scurry: new PathScurry(projectRoot),
        monorepo: Monorepo.maybeLoad(projectRoot),
        packageJson: new PackageJson(),
        packageInfo,
        projectRoot,
        remover: new RollbackRemove(),
      })

    const first = await buildOnce()
    save({ ...configData, graph: first })
    const late1 = [...first.nodes.values()].find(
      n => n.name === 'late-plugin',
    )

    writeFileSync(
      `${projectRoot}/package.json`,
      JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          wrapper: '^1.0.0',
          react: '^18.0.0',
        },
      }),
    )
    unload('project')
    const second = await buildOnce()
    const late2 = [...second.nodes.values()].find(
      n => n.name === 'late-plugin',
    )
    t.equal(late1?.id, late2?.id, 'later peer id is stable')
    t.notOk(
      [...second.nodes.values()].some(n => n.name === 'early-plugin'),
      'early plugin removed',
    )
  },
)

t.test('workspace add keeps existing peer hashes', async t => {
  const manifests: Record<string, Manifest> = {
    ui: {
      name: 'ui',
      version: '1.0.0',
      peerDependencies: { react: '^18' },
    },
    react: { name: 'react', version: '18.3.0' },
  }
  const packageInfo = {
    async manifest(spec: Spec) {
      return manifests[spec.final.name]
    },
  } as PackageInfoClient

  // single fixture with one subdir per project: a second t.testdir()
  // call would rmdir the cwd and fail with EBUSY on Windows
  const project = (workspaces: string[]) => {
    const packages: Record<string, { 'package.json': string }> = {}
    for (const ws of workspaces) {
      packages[ws] = {
        'package.json': JSON.stringify({
          name: ws,
          version: '1.0.0',
          dependencies: { ui: '^1.0.0', react: '^18.0.0' },
        }),
      }
    }
    return {
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['packages/*'] },
      }),
      packages,
    }
  }
  const root = t.testdir({
    one: project(['wsa']),
    two: project(['wsa', 'wsb']),
  })
  const mk = (dir: string) => {
    const projectRoot = `${root}/${dir}`
    t.chdir(projectRoot)
    unload('project')
    return build({
      ...configData,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      remover: new RollbackRemove(),
    })
  }

  const one = await mk('one')
  const ui1 = [...one.nodes.values()].find(n => n.name === 'ui')
  const two = await mk('two')
  const ui2 = [...two.nodes.values()].find(n => n.name === 'ui')
  t.ok(ui1?.peerSetHash)
  t.equal(ui1?.peerSetHash, ui2?.peerSetHash)
})
