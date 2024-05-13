import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Graph } from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'
import { inspect } from 'util'
import t from 'tap'
import { save } from '../src/save.js'

t.test('save', async t => {
  const graph = new Graph({
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  })
  const foo = graph.placePackage(
    graph.root,
    'dependencies',
    Spec.parse('foo@^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
    './node_modules/foo',
  )
  const dir = t.testdir()
  save({ graph, dir })
  t.matchSnapshot(
    readFileSync(resolve(dir, 'vltlock.json'), { encoding: 'utf8' }),
  )
})
