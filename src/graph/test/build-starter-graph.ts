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
