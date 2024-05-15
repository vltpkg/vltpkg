import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Graph } from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'
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
  graph.placePackage(
    graph.root,
    'dependencies',
    Spec.parse('foo@^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
      dist: {
        integrity:
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        shasum: 'cf59829b8b4f03f89dda2771cb7f3653828c89bf',
        tarball:
          'https://registry.npmjs.org/abbrev/-/abbrev-2.0.0.tgz',
      },
    },
    './node_modules/foo',
  )
  const dir = t.testdir()
  save({ graph, dir })
  t.matchSnapshot(
    readFileSync(resolve(dir, 'vlt-lock.json'), { encoding: 'utf8' }),
  )
})

t.test('save to store using shasum', async t => {
  const graph = new Graph({
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  })
  graph.placePackage(
    graph.root,
    'dependencies',
    Spec.parse('foo@^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
      dist: {
        shasum: 'cf59829b8b4f03f89dda2771cb7f3653828c89bf',
        tarball:
          'https://registry.npmjs.org/abbrev/-/abbrev-2.0.0.tgz',
      },
    },
    './node_modules/foo',
  )
  const dir = t.testdir()
  save({ graph, dir })
  t.matchSnapshot(
    readFileSync(resolve(dir, 'vlt-lock.json'), { encoding: 'utf8' }),
  )
})
