import { delimiter, getId, joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { inspect } from 'node:util'
import t from 'tap'
import { Edge } from '../src/edge.js'
import { Node } from '../src/node.js'
import { GraphLike } from '../src/types.js'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)projectRoot: .*$/gm, '$1projectRoot: #')

const options = {
  registry: 'https://registry.npmjs.org',
  registries: {
    npm: 'https://registry.npmjs.org',
  },
} satisfies SpecOptions

t.test('Node', async t => {
  const opts = {
    ...options,
    projectRoot: t.testdirName,
    graph: {} as GraphLike,
  }
  // Create an importer node that behaves like the root project node
  const rootMani = {
    name: 'root',
    version: '1.0.0',
  }
  const root = new Node(opts, joinDepIDTuple(['file', '.']), rootMani)
  root.mainImporter = true // signal the main importer node
  root.setImporterLocation('./path/to/importer')
  t.equal(root.location, './path/to/importer')
  // should have no effect, because it's an importer
  root.setDefaultLocation()
  t.equal(root.location, './path/to/importer')
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
  const foo = new Node(opts, undefined, fooMani, fooSpec)
  t.strictSame(
    foo.location,
    './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'foo@1.0.0']) +
      '/node_modules/foo',
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
  const bar = new Node(opts, barId, barMani)
  const defaultBarLoc = bar.location
  bar.location = './node_modules/some/node_modules/path'
  t.equal(bar.location, './node_modules/some/node_modules/path')
  bar.setDefaultLocation()
  t.equal(bar.location, defaultBarLoc)

  const otherBar = new Node(opts, barId, barMani)
  t.equal(bar.equals(otherBar), true)
  t.equal(otherBar.equals(bar), true)
  otherBar.location = './other/location'
  t.equal(bar.equals(otherBar), false)
  t.equal(otherBar.equals(bar), false)

  root.addEdgesTo('prod', new Spec('foo', '^1.0.0'), foo)
  root.addEdgesTo('prod', new Spec('bar', '^1.0.0'), bar)

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
      new Node(opts, undefined, {
        name: 'ipsum',
        version: '1.0.0',
      }),
    /A new Node needs either a manifest & spec or an id parameter/,
    'should throw a type error',
  )

  const barNoMani = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'bar@1.0.0']),
    undefined,
    undefined,
    'bar',
  )
  t.strictSame(
    barNoMani.location,
    './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'bar@1.0.0']) +
      '/node_modules/bar',
    'should infer location url from id',
  )

  const unnamedMani = {
    version: '0.0.0',
  }
  const unnamedSpec = Spec.parse('', '0.0.0')
  const unnamed = new Node(opts, undefined, unnamedMani, unnamedSpec)
  t.strictSame(
    unnamed.location,
    `./node_modules/.vlt/${delimiter}${delimiter}@0.0.0/node_modules/${delimiter}${delimiter}@0.0.0`,
    'should have a location for unnamed manifests',
  )

  // different resolved values inferred from id

  // file type node with no parent
  const file = new Node(opts, joinDepIDTuple(['file', 'my-package']))
  file.setResolved()
  t.strictSame(
    file.resolved,
    'my-package',
    'should set expected resolved value for a file id type',
  )

  const git = new Node(
    opts,
    joinDepIDTuple(['git', 'github:vltpkg/foo', '']),
  )
  git.setResolved()
  t.strictSame(
    git.resolved,
    'github:vltpkg/foo',
    'should set expected resolved value for a git id type',
  )
  const reg = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    {
      dist: {
        tarball: '<path-to-tarball>',
        integrity: 'sha512-deadbeef',
      },
    },
  )
  reg.setResolved()
  t.strictSame(
    reg.resolved,
    '<path-to-tarball>',
    'should set expected resolved value for a registry id type',
  )
  const regNoManifest = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'foo@1.0.0']),
  )
  regNoManifest.setResolved()
  t.strictSame(
    regNoManifest.resolved,
    'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
    'should set expected conventional registry value if no manifest',
  )

  const remote = new Node(
    opts,
    joinDepIDTuple(['remote', 'https://x.com/x.tgz']),
  )
  remote.setResolved()
  t.strictSame(
    remote.resolved,
    'https://x.com/x.tgz',
    'should set expected resolved value for a remote id type',
  )
})

t.test('nodeModules path and inVltStore flag', t => {
  const opts = {
    ...options,
    projectRoot: t.testdirName,
    graph: {} as GraphLike,
  }
  const rootMani = { name: 'root' }
  const root = new Node(opts, joinDepIDTuple(['file', '.']), rootMani)
  root.location = '.'
  t.equal(root.nodeModules, './node_modules')
  const foo = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'foo@1.2.3']),
    { name: 'foo', version: '1.2.3' },
  )
  t.equal(
    foo.location,
    './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
      '/node_modules/foo',
  )
  t.equal(foo.inVltStore(), true)
  t.equal(foo.inVltStore(), true, 'test twice for caching')
  t.equal(
    foo.nodeModules,
    './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
      '/node_modules',
  )
  const bar = new Node(
    opts,
    joinDepIDTuple(['registry', '', '@bar/bloo@1.2.3']),
    { name: '@bar/bloo', version: '1.2.3' },
  )
  t.equal(bar.inVltStore(), true)
  t.equal(bar.inVltStore(), true, 'test twice for caching')
  t.equal(
    bar.location,
    './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', '@bar/bloo@1.2.3']) +
      '/node_modules/@bar/bloo',
  )
  t.equal(
    bar.nodeModules,
    './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', '@bar/bloo@1.2.3']) +
      '/node_modules',
  )
  const outside = new Node(
    opts,
    joinDepIDTuple(['file', 'some/path']),
    { name: 'foo', version: '1.2.3' },
  )
  t.equal(outside.isOptional(), false)
  outside.optional = true
  t.equal(outside.isOptional(), true)
  outside.optional = false
  t.equal(outside.isOptional(), false)
  outside.location = './some/path'
  t.equal(outside.nodeModules, './some/path/node_modules')
  t.end()
})

t.test('optional flag is contagious', t => {
  const opts = {
    ...options,
    projectRoot: t.testdirName,
    graph: {} as GraphLike,
  }
  const rootMani = {
    name: 'root',
    optionalDependencies: { o: '' },
  }
  const root = new Node(opts, joinDepIDTuple(['file', '.']), rootMani)

  const oMani = {
    name: 'o',
    version: '1.0.0',
    dependencies: {
      oo: '',
    },
  }
  const o = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'o@1.0.0']),
    oMani,
  )
  o.optional = true
  const rootoEdge = new Edge('optional', Spec.parse('o@'), root, o)
  root.edgesOut.set('o', rootoEdge)
  o.edgesIn.add(rootoEdge)

  const ooMani = { name: 'oo', version: '1.0.0' }
  const oo = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'oo@1.0.0']),
    ooMani,
  )
  oo.optional = true
  const oooEdge = new Edge('prod', Spec.parse('oo@'), o, oo)
  o.edgesOut.set('oo', oooEdge)
  oo.edgesIn.add(oooEdge)

  // now if o becomes non-optional, oo does as well
  o.optional = false
  t.equal(oo.isOptional(), false)

  t.end()
})
t.test('dev flag is contagious', t => {
  const opts = {
    ...options,
    projectRoot: t.testdirName,
    graph: {} as GraphLike,
  }
  const rootMani = {
    name: 'root',
    devDependencies: { o: '' },
  }
  const root = new Node(opts, joinDepIDTuple(['file', '.']), rootMani)

  const dMani = {
    name: 'd',
    version: '1.0.0',
    dependencies: {
      dd: '',
    },
  }
  const d = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'd@1.0.0']),
    dMani,
  )
  d.dev = true
  const rootoEdge = new Edge('dev', Spec.parse('d@'), root, d)
  root.edgesOut.set('d', rootoEdge)
  d.edgesIn.add(rootoEdge)

  const ddMani = { name: 'dd', version: '1.0.0' }
  const dd = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'dd@1.0.0']),
    ddMani,
  )
  dd.dev = true
  const dddEdge = new Edge('prod', Spec.parse('dd@'), d, dd)
  d.edgesOut.set('dd', dddEdge)
  dd.edgesIn.add(dddEdge)

  // now if d becomes non-optional, oo does as well
  d.dev = false
  t.equal(dd.isDev(), false)

  t.end()
})
