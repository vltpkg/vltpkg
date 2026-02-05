import t from 'tap'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { Graph } from '../../src/graph.ts'
import {
  mermaidOutput,
  generateShortId,
} from '../../src/visualization/mermaid-output.ts'
import { loadActualGraph } from '../fixtures/actual.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('human-readable-output', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
        bar: '^1.0.0',
        missing: '^1.0.0',
      },
    },
  })
  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  t.ok(foo)
  const bar = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('bar', '^1.0.0'),
    {
      name: 'bar',
      version: '1.0.0',
      dependencies: {
        baz: '^1.0.0',
      },
    },
  )
  if (!bar) throw new Error('failed to place bar')
  const baz = graph.placePackage(
    bar,
    'prod',
    Spec.parse('baz', '^1.0.0'),
    {
      name: 'baz',
      version: '1.0.0',
      dist: {
        tarball: 'https://registry.vlt.sh/baz',
      },
    },
  )
  if (!baz) throw new Error('failed to place baz')
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('missing', '^1.0.0'),
  )
  graph.placePackage(baz, 'prod', Spec.parse('foo', '^1.0.0'), {
    name: 'foo',
    version: '1.0.0',
  })
  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should print mermaid output',
  )
})

t.test('actual graph', async t => {
  const graph = loadActualGraph(t)
  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should print from an actual loaded graph',
  )

  await t.test('selected packages', async t => {
    const edges = [...graph.edges].filter(e => e.name === 'baz')
    const nodes = [
      graph.nodes.get(
        joinDepIDTuple(['registry', 'custom', 'baz@1.0.0']),
      )!,
    ]
    t.matchSnapshot(
      mermaidOutput({
        edges,
        importers: graph.importers,
        nodes,
      }),
      'should print selected packages',
    )
  })

  await t.test('highlight selection', async t => {
    const edges = [...graph.edges].filter(e => e.name === 'baz')
    const nodes = [
      graph.nodes.get(
        joinDepIDTuple(['registry', 'custom', 'baz@1.0.0']),
      )!,
    ]
    t.matchSnapshot(
      mermaidOutput({
        edges,
        importers: graph.importers,
        nodes,
        highlightSelection: true,
      }),
      'should print selected packages with highlight',
    )
  })
})

t.test('workspaces', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': JSON.stringify({
      workspaces: { packages: ['./packages/*'] },
    }),
    packages: {
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
  })
  const monorepo = Monorepo.load(dir)
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
    monorepo,
  })
  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should print workspaces mermaid output',
  )
})

t.test('workspaces with dependencies', async t => {
  const mainManifest = {
    name: 'test-workspaces',
    version: '1.0.0',
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': JSON.stringify({
      workspaces: { packages: ['./packages/*'] },
    }),
    packages: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
          dependencies: {
            which: '^6.0.0',
          },
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'b',
          version: '1.0.0',
        }),
      },
    },
  })
  const monorepo = Monorepo.load(dir)
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
    monorepo,
  })

  // Find workspace 'a' and add its dependencies
  const [wsA] = [...graph.importers].filter(
    n => n.name === 'a' && !n.mainImporter,
  )
  if (!wsA) throw new Error('missing workspace a')

  const which = graph.placePackage(
    wsA,
    'prod',
    Spec.parse('which', '^6.0.0'),
    {
      name: 'which',
      version: '6.0.0',
      dependencies: {
        isexe: '^3.1.1',
      },
    },
  )
  if (!which) throw new Error('failed to place which')

  graph.placePackage(which, 'prod', Spec.parse('isexe', '^3.1.1'), {
    name: 'isexe',
    version: '3.1.1',
  })

  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should print workspaces with dependencies',
  )

  await t.test('select only which package', async t => {
    const edges = [...graph.edges].filter(e => e.name === 'which')
    const nodes = [
      graph.nodes.get(
        joinDepIDTuple(['registry', '', 'which@6.0.0']),
      )!,
    ]
    t.matchSnapshot(
      mermaidOutput({
        edges,
        importers: graph.importers,
        nodes,
      }),
      'should exclude workspace b when only which is selected',
    )
  })
})

t.test('cycle', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        a: '^1.0.0',
      },
    },
  })
  const a = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('a', '^1.0.0'),
    {
      name: 'a',
      version: '1.0.0',
    },
  )
  if (!a) {
    throw new Error('missing package a')
  }
  const b = graph.placePackage(a, 'prod', Spec.parse('b', '^1.0.0'), {
    name: 'b',
    version: '1.0.0',
    dependencies: {
      a: '^1.0.0',
    },
  })
  if (!b) {
    throw new Error('missing package b')
  }
  graph.placePackage(b, 'prod', Spec.parse('a', '^1.0.0'), {
    name: 'a',
    version: '1.0.0',
  })
  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should print cycle mermaid output',
  )
})

t.test('large scale identifier generation', async t => {
  // Test basic single character cases
  t.equal(generateShortId(0), 'a', 'index 0 should be "a"')
  t.equal(generateShortId(25), 'z', 'index 25 should be "z"')
  t.equal(generateShortId(26), 'A', 'index 26 should be "A"')
  t.equal(generateShortId(51), 'Z', 'index 51 should be "Z"')

  // Test two character cases
  t.equal(generateShortId(52), 'aa', 'index 52 should be "aa"')
  t.equal(generateShortId(53), 'ab', 'index 53 should be "ab"')
  t.equal(generateShortId(77), 'az', 'index 77 should be "az"')
  t.equal(generateShortId(78), 'aA', 'index 78 should be "aA"')
  t.equal(generateShortId(103), 'aZ', 'index 103 should be "aZ"')
  t.equal(generateShortId(104), 'ba', 'index 104 should be "ba"')

  // Test boundary cases for two-character identifiers (corrected values)
  t.equal(generateShortId(2755), 'ZZ', 'index 2755 should be "ZZ"')

  // Test three character cases (corrected values)
  t.equal(generateShortId(2756), 'aaa', 'index 2756 should be "aaa"')
  t.equal(generateShortId(2757), 'aab', 'index 2757 should be "aab"')

  // Test a large number to ensure it works for 10,000+ cases
  const largeId = generateShortId(10000)
  t.type(
    largeId,
    'string',
    'should generate valid string for index 10000',
  )
  t.ok(
    largeId.length > 0,
    'should generate non-empty string for large index',
  )
  t.ok(
    /^[a-zA-Z]+$/.test(largeId),
    'should only contain letters for large index',
  )
})
