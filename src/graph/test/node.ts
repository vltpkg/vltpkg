import { inspect } from 'node:util'
import t from 'tap'
import { getId } from '@vltpkg/dep-id'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Node } from '../src/node.js'

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    npm: 'https://registry.npmjs.org',
  },
} satisfies SpecOptions

t.test('Node', async t => {
  // Create an importer node that behaves like the root project node
  const rootMani = {
    name: 'root',
    version: '1.0.0',
  }
  const rootSpec = Spec.parse('root', 'file:///path/to/root')
  const root = new Node(configData, undefined, rootMani, rootSpec)
  root.setImporterLocation('./path/to/importer')
  t.strictSame(
    root.edgesIn.size,
    0,
    'should have an empty list of edgesIn',
  )
  t.strictSame(
    root.edgesOut.size,
    0,
    'should have an empty list of edgesOut',
  )
  t.strictSame(
    root.location,
    './path/to/importer',
    'should return the expected location value for importers',
  )
  t.matchSnapshot(
    inspect(root, { depth: 0 }),
    'should print with special tag name',
  )

  const fooMani = {
    name: 'foo',
    version: '1.0.0',
  }
  const fooSpec = Spec.parse('foo@1.0.0')
  const foo = new Node(configData, undefined, fooMani, fooSpec)
  t.strictSame(
    foo.location,
    './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo',
    'should return the expected location value',
  )
  foo.location = './arbitrary'
  t.strictSame(
    foo.location,
    './arbitrary',
    'should be able to set arbitrary locations',
  )
  const barMani = {
    name: 'bar',
    version: '1.0.0',
  }
  const barSpec = Spec.parse('bar@1.0.0')
  const barId = getId(barSpec, barMani)
  const bar = new Node(configData, barId, barMani)

  root.addEdgesTo('dependencies', new Spec('foo', '^1.0.0'), foo)
  root.addEdgesTo('dependencies', new Spec('bar', '^1.0.0'), bar)

  t.strictSame(
    root.edgesOut.size,
    2,
    'should have a list of edgesOut',
  )
  t.strictSame(foo.edgesIn.size, 1, 'should have an edge')
  t.strictSame(
    [root.edgesOut.get('foo')?.to, root.edgesOut.get('bar')?.to],
    [foo, bar],
    'should have edges out properly set up',
  )
  t.strictSame(
    [...foo.edgesIn][0]?.from,
    root,
    'should have edges in to root',
  )
  t.strictSame(
    [...bar.edgesIn][0]?.from,
    root,
    'should have edges in to root',
  )

  t.throws(
    () =>
      new Node(configData, undefined, {
        name: 'ipsum',
        version: '1.0.0',
      }),
    /A new Node needs either a manifest & spec or an id parameter/,
    'should throw a type error',
  )

  const barNoMani = new Node(
    configData,
    'registry;;bar@1.0.0',
    undefined,
    undefined,
    'bar',
  )
  t.strictSame(
    barNoMani.location,
    './node_modules/.vlt/registry;;bar@1.0.0/node_modules/bar',
    'should infer location url from id',
  )

  const unnamedMani = {
    version: '0.0.0',
  }
  const unnamedSpec = Spec.parse('', '0.0.0')
  const unnamed = new Node(
    configData,
    undefined,
    unnamedMani,
    unnamedSpec,
  )
  t.strictSame(
    unnamed.location,
    './node_modules/.vlt/registry;;@0.0.0/node_modules/registry;;@0.0.0',
    'should have a location for unnamed manifests',
  )

  // different resolved values inferred from id
  const file = new Node(configData, 'file;.%2Fmy-package')
  file.setResolved()
  t.strictSame(
    file.resolved,
    './my-package',
    'should set expected resolved value for a file id type',
  )
  const git = new Node(configData, 'git;github%3Avltpkg%2Ffoo;')
  git.setResolved()
  t.strictSame(
    git.resolved,
    'github:vltpkg/foo',
    'should set expected resolved value for a git id type',
  )
  const reg = new Node(configData, 'registry;;foo@1.0.0', {
    dist: {
      tarball: '<path-to-tarball>',
      integrity: 'sha512-deadbeef',
    },
  })
  reg.setResolved()
  t.strictSame(
    reg.resolved,
    '<path-to-tarball>',
    'should set expected resolved value for a registry id type',
  )
  const regNoManifest = new Node(configData, 'registry;;foo@1.0.0')
  regNoManifest.setResolved()
  t.strictSame(
    regNoManifest.resolved,
    'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
    'should set expected conventional registry value if no manifest',
  )
  const remote = new Node(
    configData,
    'remote;https%3A%2F%2Fx.com%2Fx.tgz',
  )
  remote.setResolved()
  t.strictSame(
    remote.resolved,
    'https://x.com/x.tgz',
    'should set expected resolved value for a remote id type',
  )
})
