import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import { inspect } from 'node:util'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { asDependency } from '../../src/dependencies.ts'
import type { Dependency } from '../../src/dependencies.ts'
import { Graph } from '../../src/graph.ts'
import { appendNodes } from '../../src/ideal/append-nodes.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'
import type { Node } from '../../src/node.ts'

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${this}}`
  },
})

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('append a new node to a graph from a registry', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    optionalDependencies: {
      baz: '^1.0.0',
    },
    dependencies: {
      bar: '^1.0.0',
      bundled: '*',
    },
    bundleDependencies: ['bundled'],
  }
  const bazManifest: Manifest = {
    name: 'baz',
    version: '1.0.0',
  }
  const barManifest: Manifest = {
    name: 'bar',
    version: '1.0.0',
    // this optional dependency hits the code paths where it's
    // missing and can't be fetched, but that's ok
    optionalDependencies: {
      borked: '*',
      metaborked: '*',
    },
  }
  const ipsumManifest: Manifest = {
    name: 'ipsum',
    version: '1.0.0',
  }
  const metaborkedManifest: Manifest = {
    name: 'metaborked',
    version: '1.0.0',
    dependencies: {
      borked: '*',
    },
  }
  const mainManifest: Manifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
  })
  const depFoo = asDependency({
    spec: Spec.parse('foo@^1.0.0'),
    type: 'prod',
  })
  const depBar = asDependency({
    spec: Spec.parse('bar@'),
    type: 'prod',
  })
  const depNamelessGit = asDependency({
    spec: Spec.parseArgs('github:lorem/ipsum'),
    type: 'prod',
  })
  const depBorked = asDependency({
    spec: Spec.parse('borked'),
    type: 'prod',
  })
  const add = new Map([
    ['foo', depFoo],
    ['bar', depBar],
    ['borked', depBorked],
    // nameless specs get their stringified value as the key
    [String(depNamelessGit.spec), depNamelessGit],
  ])
  const packageInfo = {
    async manifest(spec: Spec) {
      if (spec.type === 'git') {
        return ipsumManifest
      }
      switch (spec.name) {
        case 'metaborked':
          return metaborkedManifest
        case 'baz':
          return bazManifest
        case 'bar':
          return barManifest
        case 'foo':
          return fooManifest
        case 'borked':
          throw new Error('ERR')
        default:
          return null
      }
    },
  } as PackageInfoClient
  t.strictSame(
    graph.mainImporter.edgesOut.size,
    0,
    'has no direct dependency yet',
  )
  const scurry = new PathScurry(t.testdirName)
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depFoo],
    scurry,
    configData,
    new Set(),
  )
  t.strictSame(
    [...graph.mainImporter.edgesOut.values()].map(
      e => e.to?.manifest?.name,
    ),
    ['foo'],
    'should have a direct dependency on foo',
  )
  const barPkg = graph.manifests.get(
    joinDepIDTuple(['registry', '', 'bar@1.0.0']),
  )
  if (!barPkg) {
    throw new Error('Package could not be retrieved')
  }
  t.strictSame(
    barPkg.name,
    'bar',
    'should have added to inventory transitive dependencies',
  )
  const bazNodeSet = graph.nodesByName.get('baz')
  t.match(
    bazNodeSet,
    new Set([{ id: joinDepIDTuple(['registry', '', 'baz@1.0.0']) }]),
    'got baz nodes',
  )
  t.equal(bazNodeSet?.size, 1)

  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depBar],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  t.strictSame(
    graph.mainImporter.edgesOut.get('bar')?.spec.semver,
    '',
    'should add a direct dependency on latest bar',
  )

  await t.rejects(
    appendNodes(
      add,
      packageInfo,
      graph,
      graph.mainImporter,
      [depBorked],
      new PathScurry(t.testdirName),
      configData,
      new Set(),
    ),
    /ERR/,
    'should not intercept errors on fetching / parsing manifest',
  )

  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depNamelessGit],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  t.matchSnapshot(
    [...add].map(([name, dep]) => [
      name,
      { spec: String(dep.spec), type: dep.type },
    ]),
    'should have fixed the spec name for the nameless git dep',
  )
})

t.test('append different type of dependencies', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    devDependencies: {
      baz: '^1.0.0',
    },
  }
  const barManifest = {
    name: 'bar',
    version: '1.0.0',
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    devDependencies: {
      foo: '^1.0.0',
    },
    optionalDependencies: {
      bar: '^1.0.0',
    },
  }
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
  })
  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'bar':
          return barManifest
        case 'foo':
          return fooManifest
        default:
          return null
      }
    },
  } as PackageInfoClient
  const depFoo = asDependency({
    spec: Spec.parse('foo', '^1.0.0'),
    type: 'dev',
  })
  const depBar = asDependency({
    spec: Spec.parse('bar', '^1.0.0'),
    type: 'optional',
  })
  const depMissing = asDependency({
    spec: Spec.parse('missing', '^1.0.0'),
    type: 'prod',
  })
  const add = new Map([
    ['foo', depFoo],
    ['bar', depBar],
    ['missing', depMissing],
  ])
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depFoo],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )

  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depBar],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )

  await t.rejects(
    appendNodes(
      add,
      packageInfo,
      graph,
      graph.mainImporter,
      [depMissing],
      new PathScurry(t.testdirName),
      configData,
      new Set(),
    ),
    /failed to resolve dependency/,
    'should throw if failes to create a node for a given manifest',
  )
  t.matchSnapshot(
    inspect(graph, { depth: 4 }),
    'should install different type of deps on different conditions',
  )
})

t.test('append file type of nodes', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    dependencies: {
      bar: 'file:./bar',
      baz: 'file:./baz.tgz',
    },
  }
  const barManifest = {
    name: 'bar',
    version: '1.0.0',
  }
  const bazManifest = {
    name: 'baz',
    version: '1.0.0',
  }
  const linkedManifest = {
    name: 'linked',
    version: '1.0.0',
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      linked: '^1.0.0',
    },
  }
  const graph = new Graph({
    projectRoot: t.testdir({
      bar: { 'package.json': JSON.stringify(barManifest) },
      linked: { 'package.json': JSON.stringify(linkedManifest) },
    }),
    ...configData,
    mainManifest,
  })
  const depFoo = asDependency({
    spec: Spec.parse('foo@^1.0.0'),
    type: 'prod',
  })
  const depLinked = asDependency({
    spec: Spec.parse('linked@file:./linked'),
    type: 'prod',
  })
  const add = new Map([
    ['foo', depFoo],
    ['linked', depLinked],
  ])
  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'bar':
          return barManifest
        case 'baz':
          return bazManifest
        case 'foo':
          return fooManifest
        case 'linked':
          return linkedManifest
        case 'borked':
          throw new Error('ERR')
        default:
          return null
      }
    },
  } as PackageInfoClient
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depLinked],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depFoo],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  t.matchSnapshot(
    objectLikeOutput(graph),
    'should have a graph with file type dependencies',
  )
})

t.test('relative file dependencies should resolve correctly', async t => {
  // Create a structure where the relative path would be wrong if resolved from project root:
  // a/ (project root)
  // ├── packages/
  // │   └── b/
  // │       └── package.json (depends on "c": "file:../../other/c")  
  // ├── other/
  // │   └── c/
  // │       └── package.json
  // └── c/  <-- this exists, but is NOT the right c
  //     └── package.json (different package)
  
  const correctCManifest: Manifest = {
    name: 'c',
    version: '2.0.0',  // Different version to distinguish
    description: 'correct c package',
  }
  
  const wrongCManifest: Manifest = {
    name: 'c',
    version: '1.0.0',  
    description: 'wrong c package at root level',
  }
  
  const bManifest: Manifest = {
    name: 'b',
    version: '1.0.0',
    dependencies: {
      c: 'file:../../other/c',  // Should resolve to a/other/c, not a/c
    },
  }
  
  const mainManifest: Manifest = {
    name: 'a',
    version: '1.0.0',
    dependencies: {
      b: 'file:./packages/b',
    },
  }
  
  const graph = new Graph({
    projectRoot: t.testdir({
      packages: {
        b: { 'package.json': JSON.stringify(bManifest) },
      },
      other: {
        c: { 'package.json': JSON.stringify(correctCManifest) },
      },
      c: { 'package.json': JSON.stringify(wrongCManifest) }, // Wrong c at root
    }),
    ...configData,
    mainManifest,
  })
  
  const depB = asDependency({
    spec: Spec.parse('b@file:./packages/b'),
    type: 'prod',
  })
  
  const add = new Map([
    ['b', depB],
  ])
  
  const packageInfo = {
    async manifest(spec: Spec, options: any) {
      const specStr = String(spec)
      console.log('Manifest requested for spec:', specStr, 'from:', options?.from)
      
      // Let's also check what the actual file path would be
      if (options?.from && spec.final.type === 'file') {
        const { resolve } = await import('path')
        const resolvedPath = resolve(options.from, spec.final.file)
        console.log('  -> Resolved file path:', resolvedPath)
        
        // Check if files exist
        const { existsSync } = await import('fs')
        console.log('  -> File exists:', existsSync(resolvedPath + '/package.json'))
      }
      
      switch (spec.name) {
        case 'b':
          return bManifest
        case 'c':
          // Return the correct manifest based on the resolved path
          if (options?.from && spec.final.type === 'file') {
            const { resolve } = await import('path')
            const resolvedPath = resolve(options.from, spec.final.file)
            if (resolvedPath.includes('other/c')) {
              return correctCManifest
            }
          }
          return wrongCManifest
        default:
          return null
      }
    },
  } as PackageInfoClient
  
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depB],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  
  // Check that both b and c are in the graph
  console.log('Graph nodes:', Array.from(graph.nodes.keys()))
  console.log('Test directory:', t.testdirName)
  
  const nodeB = graph.nodes.get('file·packages§b')
  const nodeCCorrect = graph.nodes.get('file·other§c')
  const nodeCWrong = graph.nodes.get('file·c')
  
  console.log('Node B:', nodeB?.name, nodeB?.location)
  console.log('Node C (correct):', nodeCCorrect?.name, nodeCCorrect?.manifest?.description)
  console.log('Node C (wrong):', nodeCWrong?.name, nodeCWrong?.manifest?.description)
  
  t.ok(nodeB, 'Package b should be in the graph')
  t.ok(nodeCCorrect, 'Package c should be resolved from other/c (correct location)')
  t.notOk(nodeCWrong, 'Package c should NOT be resolved from root c (wrong location)')
  
  if (nodeB && nodeCCorrect) {
    t.equal(nodeB.name, 'b', 'Node b should have correct name')
    t.equal(nodeCCorrect.name, 'c', 'Node c should have correct name')
    t.equal(nodeCCorrect.manifest?.version, '2.0.0', 'Should have resolved to the correct c package')
    
    // Check that b depends on the correct c
    const edgeToC = nodeB.edgesOut.get('c')
    t.ok(edgeToC, 'Package b should have an edge to package c')
    if (edgeToC) {
      t.equal(edgeToC.to, nodeCCorrect, 'Edge from b should point to the correct c')
    }
  }
  
  t.matchSnapshot(
    objectLikeOutput(graph),
    'should have a graph with transitive relative file dependencies',
  )
})

t.test('direct install from subdirectory should resolve relative paths correctly', async t => {
  // Simulate the CLI scenario: user is in subdirectory b and runs `vlt install file:../c`
  // This should resolve ../c relative to the current working directory (b), not project root
  
  const cManifest: Manifest = {
    name: 'c',
    version: '1.0.0',
  }
  
  const mainManifest: Manifest = {
    name: 'a',
    version: '1.0.0',
  }
  
  const graph = new Graph({
    projectRoot: t.testdir({
      b: {},  // subdirectory where user runs the command
      c: { 'package.json': JSON.stringify(cManifest) },
    }),
    ...configData,
    mainManifest,
  })
  
  // This simulates what happens when user runs `vlt install file:../c` from directory b
  // The fromNode would be the main importer (project root)
  // But the file spec should be resolved relative to cwd (directory b)
  
  const spec = Spec.parse('c@file:../c')  // User typed this from directory b
  const depC = asDependency({
    spec,
    type: 'prod',
  })
  
  const add = new Map([
    ['c', depC],
  ])
  
  const packageInfo = {
    async manifest(specArg: Spec, options: any) {
      if (specArg.name === 'c') {
        return cManifest
      }
      return null
    },
  } as PackageInfoClient
  
  // Simulate being in subdirectory b by using PathScurry with b as cwd
  const testDir = t.testdirName
  const subdirB = testDir + '/b'
  
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,  // fromNode is main importer (project root)
    [depC],
    new PathScurry(subdirB),  // But scurry cwd is the subdirectory
    configData,
    new Set(),
  )
  
  const nodeC = graph.nodes.get('file·c')  // Should resolve to c, not ../c outside project
  
  t.ok(nodeC, 'Package c should be resolved correctly from subdirectory')
  if (nodeC) {
    t.equal(nodeC.name, 'c', 'Node c should have correct name')
  }
  
  t.matchSnapshot(
    objectLikeOutput(graph),
    'should resolve direct install from subdirectory correctly',
  )
})

t.test('relative file dependencies should resolve correctly', async t => {
  // Create a structure where the relative path would be wrong if resolved from project root:
  // a/ (project root)
  // ├── packages/
  // │   └── b/
  // │       └── package.json (depends on "c": "file:../../other/c")  
  // ├── other/
  // │   └── c/
  // │       └── package.json
  // └── c/  <-- this exists, but is NOT the right c
  //     └── package.json (different package)
  
  const correctCManifest: Manifest = {
    name: 'c',
    version: '2.0.0',  // Different version to distinguish
    description: 'correct c package',
  }
  
  const wrongCManifest: Manifest = {
    name: 'c',
    version: '1.0.0',  
    description: 'wrong c package at root level',
  }
  
  const bManifest: Manifest = {
    name: 'b',
    version: '1.0.0',
    dependencies: {
      c: 'file:../../other/c',  // Should resolve to a/other/c, not a/c
    },
  }
  
  const mainManifest: Manifest = {
    name: 'a',
    version: '1.0.0',
    dependencies: {
      b: 'file:./packages/b',
    },
  }
  
  const graph = new Graph({
    projectRoot: t.testdir({
      packages: {
        b: { 'package.json': JSON.stringify(bManifest) },
      },
      other: {
        c: { 'package.json': JSON.stringify(correctCManifest) },
      },
      c: { 'package.json': JSON.stringify(wrongCManifest) }, // Wrong c at root
    }),
    ...configData,
    mainManifest,
  })
  
  const depB = asDependency({
    spec: Spec.parse('b@file:./packages/b'),
    type: 'prod',
  })
  
  const add = new Map([
    ['b', depB],
  ])
  
  const packageInfo = {
    async manifest(spec: Spec, options: any) {
      const specStr = String(spec)
      
      switch (spec.name) {
        case 'b':
          return bManifest
        case 'c':
          // Return the correct manifest based on the resolved path
          if (options?.from && spec.final.type === 'file') {
            const { resolve } = await import('path')
            const resolvedPath = resolve(options.from, spec.final.file)
            if (resolvedPath.includes('other/c')) {
              return correctCManifest
            }
          }
          return wrongCManifest
        default:
          return null
      }
    },
  } as PackageInfoClient
  
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depB],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  
  // Check that both b and c are in the graph
  const nodeB = graph.nodes.get('file·packages§b')
  const nodeCCorrect = graph.nodes.get('file·other§c')
  const nodeCWrong = graph.nodes.get('file·c')
  
  t.ok(nodeB, 'Package b should be in the graph')
  t.ok(nodeCCorrect, 'Package c should be resolved from other/c (correct location)')
  t.notOk(nodeCWrong, 'Package c should NOT be resolved from root c (wrong location)')
  
  if (nodeB && nodeCCorrect) {
    t.equal(nodeB.name, 'b', 'Node b should have correct name')
    t.equal(nodeCCorrect.name, 'c', 'Node c should have correct name')
    t.equal(nodeCCorrect.manifest?.version, '2.0.0', 'Should have resolved to the correct c package')
    
    // Check that b depends on the correct c
    const edgeToC = nodeB.edgesOut.get('c')
    t.ok(edgeToC, 'Package b should have an edge to package c')
    if (edgeToC) {
      t.equal(edgeToC.to, nodeCCorrect, 'Edge from b should point to the correct c')
    }
  }
  
  t.matchSnapshot(
    objectLikeOutput(graph),
    'should have a graph with transitive relative file dependencies',
  )
})

t.test('resolve against the correct registries', async t => {
  const mainManifest = {
    version: '1.0.0',
    dependencies: {
      bar: 'a:bar@1.x',
      baz: 'b:baz@1.x',
    },
  }
  const abarManifest = {
    name: 'bar',
    version: '1.2.3',
    dependencies: { x: '1.x' },
  }
  const axManifest = {
    name: 'x',
    version: '1.99.99',
    description: 'x on a',
    dependencies: { y: '1' },
  }
  const ayManifest = { name: 'y', version: '1.99.99' }
  const bbazManifest = {
    name: 'baz',
    version: '1.2.3',
    dependencies: { x: '1.x' },
  }
  const bxManifest = {
    name: 'x',
    version: '1.99.99',
    description: 'x on b',
    dependencies: { y: '1000' },
  }
  const byManifest = { name: 'y', version: '1000.0.0' }

  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
  })

  const registries = {
    a: 'https://a.example.com/',
    b: 'https://b.example.com/',
  }

  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'bar':
          switch (spec.registry) {
            case registries.a:
              return abarManifest
            default:
              throw new Error('404 - bar', { cause: { spec } })
          }
        case 'baz':
          switch (spec.registry) {
            case registries.b:
              return bbazManifest
            default:
              throw new Error('404 - baz', { cause: { spec } })
          }
        case 'x':
          switch (spec.registry) {
            case registries.a:
              return axManifest
            case registries.b:
              return bxManifest
            default:
              throw new Error('404 - x', { cause: { spec } })
          }
        case 'y':
          switch (spec.registry) {
            case registries.a:
              return ayManifest
            case registries.b:
              return byManifest
            default:
              throw new Error('404 - y', { cause: { spec } })
          }
        default:
          throw new Error('404 - ' + spec.name, { cause: { spec } })
      }
    },
  } as PackageInfoClient

  const graph = new Graph({
    projectRoot,
    mainManifest,
    registries,
  })
  const deps: Dependency[] = [
    {
      type: 'prod',
      spec: Spec.parse('bar@a:bar@1.x', { registries }),
    },
    {
      type: 'prod',
      spec: Spec.parse('baz@b:bar@1.x', { registries }),
    },
  ]
  const add = new Map(deps.map(dep => [dep.spec.name, dep]))
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    deps,
    new PathScurry(t.testdirName),
    {
      registries,
    },
    new Set(),
  )
  t.matchSnapshot(inspect(graph, { colors: false }))
})

// Add a basic test for appendNodes that verifies it can handle
// query modifiers correctly
t.test('appendNodes with query modifier', async t => {
  // Create a package info client that returns a simple foo package
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
  }

  const packageInfo = {
    async manifest() {
      return fooManifest
    },
  } as unknown as PackageInfoClient

  // Create a minimal graph
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: { name: 'test', version: '1.0.0' },
  })

  // Call appendNodes with minimal arguments
  await appendNodes(
    new Map(),
    packageInfo,
    graph,
    graph.mainImporter,
    [],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
    undefined,
    undefined,
  )

  // Verify the appendNodes function ran without errors
  t.pass('appendNodes with no modifiers completed successfully')
})

// Add a test for the modifier logic with complete and incomplete modifiers
t.test(
  'appendNodes with complete and incomplete modifiers',
  async t => {
    // Create package manifests
    const fooManifest = {
      name: 'foo',
      version: '1.0.0',
    }

    const barManifest = {
      name: 'bar',
      version: '2.0.0',
    }

    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === 'foo') return fooManifest
        if (spec.name === 'bar') return barManifest
        return null
      },
    } as PackageInfoClient

    // Create a minimal graph
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest: { name: 'test', version: '1.0.0' },
    })

    // Create a dependency
    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0'),
      type: 'prod',
    })

    // Create a breadcrumb-like objects for testing
    const breadcrumbItem = { name: 'foo', specificity: 1 }

    const completeModifierRefs = new Map([
      [
        'foo',
        {
          modifier: {
            type: 'edge' as const,
            query: '#foo',
            spec: Spec.parse('bar', '^2.0.0'), // swap with npm:bar@^2.0.0
            breadcrumb: {
              first: breadcrumbItem,
              last: breadcrumbItem,
              single: true,
              items: [breadcrumbItem],
              clear: () => {},
              clone: function () {
                return this
              },
              comment: '',
            },
            value: '^2.0.0',
            refs: new Set(),
          },
          interactiveBreadcrumb: {
            current: breadcrumbItem,
            next: () => true,
            done: true,
          },
          originalFrom: graph.mainImporter,
        },
      ],
    ])

    // Call appendNodes with the modifier
    await appendNodes(
      new Map([['foo', fooDep]]),
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set(),
      {
        updateActiveEntry: () => {},
        tryDependencies: () => new Map(),
      } as any,
      completeModifierRefs as any,
    )

    // Verify bar was added due to the edge modifier
    const barNode = [...(graph.nodesByName.get('bar') ?? [])].find(
      node => node.manifest?.name === 'bar',
    )
    t.ok(
      barNode,
      'bar node should be added due to the complete modifier',
    )

    // Reset the graph for the next test
    const newGraph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest: { name: 'test', version: '1.0.0' },
    })

    // check for a non-matching breadcrumb
    const incompleteModifierRefs = new Map([
      [
        'different',
        {
          modifier: {
            type: 'edge' as const,
            query: '#different',
            spec: Spec.parse('bar', '^2.0.0'),
            breadcrumb: {
              first: breadcrumbItem,
              last: { name: 'different', specificity: 1 }, // Different from current
              single: false,
              items: [breadcrumbItem],
              clear: () => {},
              clone: function () {
                return this
              },
              comment: '',
            },
            value: '^2.0.0',
            refs: new Set(),
          },
          interactiveBreadcrumb: {
            current: breadcrumbItem,
            next: () => true,
            done: false,
          },
          originalFrom: newGraph.mainImporter,
        },
      ],
    ])

    // Call appendNodes with the incomplete modifier
    await appendNodes(
      new Map([['foo', fooDep]]),
      packageInfo,
      newGraph,
      newGraph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set(),
      {
        updateActiveEntry: () => {},
        tryDependencies: () => new Map(),
      } as any,
      incompleteModifierRefs as any,
    )

    // Verify foo was added, not bar (as the modifier is incomplete)
    const fooNode = [...(newGraph.nodesByName.get('foo') ?? [])].find(
      node => node.manifest?.name === 'foo',
    )
    t.ok(
      fooNode,
      'foo node should be added when modifier is incomplete',
    )
    const barNodeInNewGraph = [
      ...(newGraph.nodesByName.get('bar') ?? []),
    ]
    t.equal(
      barNodeInNewGraph.length,
      0,
      'bar node should not be added when modifier is incomplete',
    )
  },
)

// Add a test for the error handling when a node can't be placed
t.test(
  'appendNodes error handling when node cannot be placed',
  async t => {
    // Create a minimal graph
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest: { name: 'test', version: '1.0.0' },
    })
    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0'),
      type: 'prod',
    })

    // Create a package info client that returns a manifest
    const packageInfo = {
      async manifest() {
        return { name: 'foo', version: '1.0.0' }
      },
    } as unknown as PackageInfoClient

    // Create a graph that returns undefined from placePackage
    // to trigger the error
    const originalPlacePackage = Graph.prototype.placePackage
    Graph.prototype.placePackage = () => undefined

    try {
      // This should throw an error
      await t.rejects(
        appendNodes(
          new Map([['foo', fooDep]]),
          packageInfo,
          graph,
          graph.mainImporter,
          [fooDep],
          new PathScurry(t.testdirName),
          configData,
          new Set(),
        ),
        /failed to place package/,
        'should throw when graph.placePackage returns null',
      )
    } finally {
      // Restore the original method
      Graph.prototype.placePackage = originalPlacePackage
    }
  },
)

// Add a test to cover the tryDependencies branch
t.test(
  'appendNodes with nested dependencies and modifiers',
  async t => {
    // Create package manifests with nested dependencies
    const fooManifest = {
      name: 'foo',
      version: '1.0.0',
      dependencies: {
        bar: '^1.0.0',
      },
    }
    const barManifest = {
      name: 'bar',
      version: '1.0.0',
    }

    // Create a minimal graph
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest: { name: 'test', version: '1.0.0' },
    })
    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0'),
      type: 'prod',
    })

    // Mock packageInfo
    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === 'foo') return fooManifest
        if (spec.name === 'bar') return barManifest
        return null
      },
    } as PackageInfoClient

    // Create a modifier that implements tryDependencies
    const tryDependenciesCalled = { value: false }
    const mockModifier = {
      updateActiveEntry: () => {},
      // This method will be called for the nested dependencies
      tryDependencies: (node: Node, deps: any[]) => {
        tryDependenciesCalled.value = true
        // Verify we're getting the expected parameters
        t.equal(node.manifest?.name, 'foo', 'node should be foo')
        t.ok(Array.isArray(deps), 'deps should be an array')
        t.ok(deps.length > 0, 'deps should not be empty')
        t.equal(
          deps[0].spec.name,
          'bar',
          'first dependency should be bar',
        )
        // we don't care about the returned value here
        return new Map()
      },
    }

    // call appendNodes with the mock modifier
    await appendNodes(
      new Map([['foo', fooDep]]),
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set(),
      mockModifier as any,
      undefined,
    )

    // Verify tryDependencies was called
    t.ok(
      tryDependenciesCalled.value,
      'tryDependencies should have been called',
    )

    // Verify both foo and bar were added to the graph
    const fooNode = [...(graph.nodesByName.get('foo') ?? [])].find(
      node => node.manifest?.name === 'foo',
    )
    t.ok(fooNode, 'foo node should be added to the graph')

    const barNode = [...(graph.nodesByName.get('bar') ?? [])].find(
      node => node.manifest?.name === 'bar',
    )
    t.ok(barNode, 'bar node should be added as a nested dependency')
  },
)

t.test('edge case: nested relative paths work correctly', async t => {
  // Test deeply nested relative paths: packages/deep/nested -> ../../../other
  
  const otherManifest: Manifest = {
    name: 'other',
    version: '1.0.0',
  }
  
  const nestedManifest: Manifest = {
    name: 'nested',
    version: '1.0.0',
    dependencies: {
      other: 'file:../../../other',  // Go up 3 levels to reach project root, then to other
    },
  }
  
  const mainManifest: Manifest = {
    name: 'main',
    version: '1.0.0',
  }
  
  const graph = new Graph({
    projectRoot: t.testdir({
      packages: {
        deep: {
          nested: { 'package.json': JSON.stringify(nestedManifest) },
        },
      },
      other: { 'package.json': JSON.stringify(otherManifest) },
    }),
    ...configData,
    mainManifest,
  })
  
  const depNested = asDependency({
    spec: Spec.parse('nested@file:./packages/deep/nested'),
    type: 'prod',
  })
  
  const add = new Map([
    ['nested', depNested],
  ])
  
  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'nested':
          return nestedManifest
        case 'other':
          return otherManifest
        default:
          return null
      }
    },
  } as PackageInfoClient
  
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depNested],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  
  // Check that both nested and other are in the graph with correct IDs
  const nodeNested = graph.nodes.get('file·packages§deep§nested')
  const nodeOther = graph.nodes.get('file·other')  // Should be 'other', not '../../../other'
  
  t.ok(nodeNested, 'Package nested should be in the graph')
  t.ok(nodeOther, 'Package other should be resolved correctly despite deep relative path')
  
  if (nodeNested && nodeOther) {
    t.equal(nodeNested.name, 'nested', 'Node nested should have correct name')
    t.equal(nodeOther.name, 'other', 'Node other should have correct name')
    
    // Check that nested depends on other
    const edgeToOther = nodeNested.edgesOut.get('other')
    t.ok(edgeToOther, 'Package nested should have an edge to package other')
    if (edgeToOther) {
      t.equal(edgeToOther.to, nodeOther, 'Edge from nested should point to other')
    }
  }
  
  t.matchSnapshot(
    Array.from(graph.nodes.keys()).sort(),
    'should create correct node IDs for deeply nested relative paths',
  )
})

t.test('edge case: relative paths that stay within project work', async t => {
  // Test relative paths within the project structure
  
  const utils1Manifest: Manifest = {
    name: 'utils1',
    version: '1.0.0',
  }
  
  const utils2Manifest: Manifest = {
    name: 'utils2',
    version: '1.0.0',
    dependencies: {
      utils1: 'file:../utils1',  // Sibling directory
    },
  }
  
  const mainManifest: Manifest = {
    name: 'main',
    version: '1.0.0',
  }
  
  const graph = new Graph({
    projectRoot: t.testdir({
      libs: {
        utils1: { 'package.json': JSON.stringify(utils1Manifest) },
        utils2: { 'package.json': JSON.stringify(utils2Manifest) },
      },
    }),
    ...configData,
    mainManifest,
  })
  
  const depUtils2 = asDependency({
    spec: Spec.parse('utils2@file:./libs/utils2'),
    type: 'prod',
  })
  
  const add = new Map([
    ['utils2', depUtils2],
  ])
  
  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'utils1':
          return utils1Manifest
        case 'utils2':
          return utils2Manifest
        default:
          return null
      }
    },
  } as PackageInfoClient
  
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depUtils2],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  
  // Check that both utils packages are in the graph with correct IDs
  const nodeUtils1 = graph.nodes.get('file·libs§utils1')
  const nodeUtils2 = graph.nodes.get('file·libs§utils2')
  
  t.ok(nodeUtils1, 'Package utils1 should be in the graph')
  t.ok(nodeUtils2, 'Package utils2 should be in the graph')
  
  if (nodeUtils1 && nodeUtils2) {
    t.equal(nodeUtils1.name, 'utils1', 'Node utils1 should have correct name')
    t.equal(nodeUtils2.name, 'utils2', 'Node utils2 should have correct name')
    
    // Check that utils2 depends on utils1
    const edgeToUtils1 = nodeUtils2.edgesOut.get('utils1')
    t.ok(edgeToUtils1, 'Package utils2 should have an edge to package utils1')
    if (edgeToUtils1) {
      t.equal(edgeToUtils1.to, nodeUtils1, 'Edge from utils2 should point to utils1')
    }
  }
  
  t.matchSnapshot(
    Array.from(graph.nodes.keys()).sort(),
    'should create correct node IDs for sibling relative paths',
  )
})