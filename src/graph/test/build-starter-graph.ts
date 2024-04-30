import t from 'tap'
import { buildStarterGraph } from '../src/build-starter-graph.js'

t.test('build empty starter graph', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
  })
  const graph = await buildStarterGraph({
    dir,
  })
  t.strictSame(
    graph.root.pkg.name,
    'my-project',
    'should have created a root folder with expected properties',
  )
})

t.test('build starter graph with missing dep', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }),
  })
  const { buildStarterGraph } = await t.mockImport<
    typeof import('../src/build-starter-graph.js')
  >('../src/build-starter-graph.js', {
    '../src/append-registry-nodes.js': {
      appendRegistryNodes: async (
        graph,
        fromNode,
        specs,
        depType,
      ) => {
        const [item] = specs
        t.strictSame(
          { name: 'foo', spec: 'foo@^1.0.0' },
          { name: item.name, spec: item.spec },
          'should have missing dependency listed',
        )
      },
    },
  })
  const graph = await buildStarterGraph({
    dir,
  })
})
