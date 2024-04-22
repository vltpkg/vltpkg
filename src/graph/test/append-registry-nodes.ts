import { resolve } from 'node:path'
import t from 'tap'
import { Graph } from '../src/graph.js'

t.test('append a new node to a graph from a registry', async t => {
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
  const { appendRegistryNodes } = await t.mockImport<
    typeof import('../src/append-registry-nodes.js')
  >('../src/append-registry-nodes.js', {
    '@vltpkg/registry-client': {
      RegistryClient: class {
        async request(url) {
          switch (url) {
            case 'https://registry.npmjs.com/foo/latest':
              return { body: fooManifest }
            case 'https://registry.npmjs.com/bar/latest':
              return { body: barManifest }
            case 'https://registry.npmjs.com/borked/latest':
              return { body: null }
            default:
              return null
          }
        }
      },
    },
  })
  const rootPkg = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(rootPkg),
  })
  const graph = new Graph(rootPkg)
  t.strictSame(
    graph.root.edgesOut.size,
    0,
    'has no direct dependency yet',
  )
  await appendRegistryNodes(
    graph,
    graph.root,
    [['foo', '^1.0.0']],
    'dependencies',
  )
  t.strictSame(
    [...graph.root.edgesOut.values()].map(e => e.to.pkg.name),
    ['foo'],
    'should have a direct dependency on foo',
  )
  t.strictSame(
    graph.packages.get('bar@1.0.0').name,
    'bar',
    'should have added to inventory transitive dependencies',
  )

  await appendRegistryNodes(
    graph,
    graph.root,
    [['bar']],
    'dependencies',
  )
  t.strictSame(
    graph.root.edgesOut.get('bar').spec,
    'latest',
    'should add a direct dependency on latest bar',
  )

  await t.rejects(
    appendRegistryNodes(
      graph,
      graph.root,
      [['borked']],
      'dependencies',
    ),
    /Failed to retrieve package metadata/,
    'should throw an error if finding broken manifests',
  )

  await t.rejects(
    appendRegistryNodes(
      graph,
      graph.root,
      [[undefined, '^1.0.0']],
      'dependencies',
    ),
    /Trying to add a package but no name was found/,
    'should throw an error if using addSpec with no name',
  )
})
