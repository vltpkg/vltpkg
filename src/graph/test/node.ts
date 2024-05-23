import { getId } from '@vltpkg/dep-id'
import { inspect } from 'node:util'
import t from 'tap'
import { Spec } from '@vltpkg/spec'
import { Node } from '../src/node.js'

t.test('Node', async t => {
  // Create an importer node that behaves like the root project node
  const rootMani = {
    name: 'root',
    version: '1.0.0',
  }
  const rootSpec = Spec.parse('root', 'file:///path/to/root')
  const root = new Node(rootMani, undefined, rootSpec)
  root.setImporterLocation('/path/to/root')
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
    '/path/to/root',
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
  const foo = new Node(fooMani, undefined, fooSpec)
  t.ok(
    foo.location
      .replace(/\\/g, '/')
      .endsWith(
        'node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo',
      ),
    'should return the expected location value',
  )
  const barMani = {
    name: 'bar',
    version: '1.0.0',
  }
  const barSpec = Spec.parse('bar@1.0.0')
  const barId = getId(barSpec, barMani)
  const bar = new Node(barMani, barId)

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
    () => new Node({ name: 'ipsum', version: '1.0.0' }),
    /A new Node needs either a spec or an id parameter/,
    'should throw a type error',
  )

  const unnamedMani = {
    version: '0.0.0',
  }
  const unnamedSpec = Spec.parse('', '0.0.0')
  const unnamed = new Node(unnamedMani, undefined, unnamedSpec)
  t.ok(
    unnamed.location
      .replace(/\\/g, '/')
      .endsWith(
        'node_modules/.vlt/registry;;@0.0.0/node_modules/registry;;@0.0.0',
      ),
    'should have a location for unnamed manifests',
  )
})
