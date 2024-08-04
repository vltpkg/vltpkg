import { PackageJson } from '@vltpkg/package-json'
import { RunOptions } from '@vltpkg/run'
import { Spec } from '@vltpkg/spec'
import { Manifest } from '@vltpkg/types'
import t from 'tap'
import { Diff } from '../../src/diff.js'
import { Edge } from '../../src/edge.js'
import { Node } from '../../src/node.js'

const runs: RunOptions[] = []
t.beforeEach(() => (runs.length = 0))

const mockRun = async (options: RunOptions) => {
  runs.push(options)
}

const { lifecycleAdds } = await t.mockImport<
  typeof import('../../src/reify/lifecycle-adds.js')
>('../../src/reify/lifecycle-adds.js', {
  '@vltpkg/run': { run: mockRun },
})

const mockEmptyDiff = { nodes: { add: new Set() } } as unknown as Diff

const projectRoot = t.testdirName
const fooMani: Manifest = {
  name: 'foo',
  version: '1.2.3',
  dependencies: { bar: '1' },
}
const fooNode = new Node(
  { projectRoot },
  ';;foo@1.2.3',
  fooMani,
  Spec.parse('foo@1'),
  'foo',
  '1.2.3',
)

const barMani: Manifest = {
  name: 'bar',
  version: '1.2.3',
  optionalDependencies: { baz: '1' },
}
const barNode = new Node(
  { projectRoot },
  ';;bar@1.2.3',
  barMani,
  Spec.parse('bar@1'),
  'bar',
  '1.2.3',
)
const barbazEdge = new Edge('optional', Spec.parse('baz@1'), barNode)
barNode.edgesOut.set('baz', barbazEdge)

const foobarEdge = new Edge(
  'prod',
  Spec.parse('bar@1'),
  fooNode,
  barNode,
)
fooNode.edgesOut.set('bar', foobarEdge)
barNode.edgesIn.add(foobarEdge)

const mockDiff = {
  nodes: {
    add: new Set([fooNode, barNode]),
  },
} as unknown as Diff

const gitNode = new Node(
  { projectRoot },
  'git;github:a/b;deadbeefcafebad',
  {},
  Spec.parse('github:a/b'),
  'bbb',
  '1.2.3',
)

const outNode = new Node(
  { projectRoot },
  'file;./outside',
  {},
  Spec.parse('file:./outside'),
  'outside',
  '1.2.3',
)
outNode.location = './outside'

const mockDiffWithPreps = {
  nodes: {
    add: new Set([fooNode, barNode, gitNode, outNode]),
  },
} as unknown as Diff

const packageJson = new PackageJson()

t.test('nothing to do if nothing added', async t => {
  await lifecycleAdds(mockEmptyDiff, packageJson, projectRoot)
  t.equal(runs.length, 0, 'nothing was run')
})

t.test('stuff got run', async t => {
  await lifecycleAdds(mockDiff, packageJson, projectRoot)
  t.equal(runs.length, 2, 'two scripts run')
  t.match(
    new Set(runs),
    new Set([
      {
        arg0: 'install',
        cwd: './node_modules/.vlt/;;bar@1.2.3/node_modules/bar',
      },
      {
        arg0: 'install',
        cwd: './node_modules/.vlt/;;foo@1.2.3/node_modules/foo',
      },
    ]),
  )
})

t.test('stuff got run, with a git node', async t => {
  await lifecycleAdds(mockDiffWithPreps, packageJson, projectRoot)
  t.equal(runs.length, 6)
  t.match(
    new Set(runs),
    new Set([
      {
        arg0: 'install',
        cwd: './node_modules/.vlt/;;bar@1.2.3/node_modules/bar',
      },
      {
        arg0: 'install',
        cwd: './node_modules/.vlt/git;github:a/b;deadbeefcafebad/node_modules/bbb',
      },
      {
        arg0: 'install',
        cwd: './outside',
      },
      {
        arg0: 'prepare',
        cwd: './node_modules/.vlt/git;github:a/b;deadbeefcafebad/node_modules/bbb',
      },
      {
        arg0: 'prepare',
        cwd: './outside',
      },
      {
        arg0: 'install',
        cwd: './node_modules/.vlt/;;foo@1.2.3/node_modules/foo',
      },
    ]),
  )
})
