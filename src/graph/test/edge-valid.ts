import t from 'tap'
import { Node } from '../src/node.js'
import { edgeValid } from '../src/edge-valid.js'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { getId, joinDepIDTuple } from '@vltpkg/dep-id'
import { Edge } from '../src/edge.js'
import { asDependency } from '../src/dependencies.js'

const specOptions = {
  registry: 'https://registry.npmjs.org',
  registries: {
    custom: 'http://example.com',
    npm: 'https://registry.npmjs.org',
  },
} satisfies SpecOptions

const rootMani = { name: 'my-project', version: '1.0.0' }
const root = new Node(specOptions, 'file;.', rootMani)
root.setImporterLocation('.')

t.test('edge-valid', async t => {
  await t.test('missing edge.to node', async t => {
    // edge represents a currently missing node
    const spec = Spec.parse('a', '^1.0.0', specOptions)
    const missing = new Edge('prod', spec, root)
    t.notOk(edgeValid(missing), 'invalid if missing node')
    const optional = new Edge('optional', spec, root)
    t.ok(edgeValid(optional), 'valid if dep type is optional')
  })

  await t.test('changes type', async t => {
    // dependency defines a different type from current edge
    const spec = Spec.parse('a', '^1.0.0', specOptions)
    const optional = new Edge('optional', spec, root)
    t.notOk(
      edgeValid(optional, asDependency({ type: 'prod', spec })),
      'invalid if dep type changed',
    )
  })

  await t.test('registry type', async t => {
    const mani = { name: 'a', version: '1.0.0' }

    await t.test('wrong node type', async t => {
      // id and edge are of a file type instead
      // of registry type that the dependency expects
      const spec = Spec.parse('a', './a', specOptions)
      const to = new Node(
        specOptions,
        joinDepIDTuple(['file', './a']),
        mani,
      )
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', '^1.0.0', specOptions)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid if node type is not the same expected by the dependency',
      )
    })

    await t.test('mismatching default registry', async t => {
      // id definition uses default registry but the edge definition
      // uses a custom registry definition
      const idSpec = Spec.parse('a', '^1.0.0', specOptions)
      const id = getId(idSpec, mani)
      const to = new Node(specOptions, id, mani)
      const spec = Spec.parse('a', 'custom:a@^1.0.0', specOptions)
      const edge = new Edge('prod', spec, root, to)
      t.notOk(
        edgeValid(edge),
        'invalid if node uses default registry and edge points to a custom registry',
      )
    })

    await t.test('mismatching named custom registry', async t => {
      // current edge has a mismatching named custom registry
      const spec = Spec.parse('a', 'custom:a@^1.0.0', specOptions)
      const id = getId(spec, mani)
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', 'custom:a@^1.0.0', {
        ...specOptions,
        registries: {
          custom: 'http://different.hostname',
        },
      })
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid when custom registry names mismatch',
      )
    })

    await t.test('mismatching custom registry', async t => {
      // id uses a custom registry definition but the edge uses
      // a mismatching default registry value
      const idSpec = Spec.parse('a', 'custom:a@^1.0.0', specOptions)
      const id = getId(idSpec, mani)
      const to = new Node(specOptions, id, mani)
      const spec = Spec.parse('a', '^1.0.0', specOptions)
      const edge = new Edge('prod', spec, root, to)
      t.notOk(edgeValid(edge))
    })

    await t.test('mismatching registry url', async t => {
      // id uses a custom registry definition but the edge uses
      // a mismatching default registry value
      const idSpec = Spec.parse(
        'a',
        'registry:http://example.com#@^1.0.0',
        specOptions,
      )
      const id = getId(idSpec, mani)
      const to = new Node(specOptions, id, mani)
      const spec = Spec.parse('a', '^1.0.0', specOptions)
      const edge = new Edge('prod', spec, root, to)
      t.notOk(edgeValid(edge))
    })

    await t.test('using dist-tags', async t => {
      // using dist-tags as spec range
      const spec = Spec.parse('a', 'latest', specOptions)
      const id = getId(spec, mani)
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      t.ok(edgeValid(edge), 'valid when using any dist-tags')
    })

    await t.test('invalid major bump', async t => {
      // dependency defines a major bump on its spec range
      const spec = Spec.parse('a', '^1.0.0', specOptions)
      const id = getId(spec, mani)
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', '^2.0.0', specOptions)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid on unsatisfied major bump',
      )
    })

    await t.test('valid major bump', async t => {
      // the new defined dependency spec uses a range
      // that allows for major bumps
      const spec = Spec.parse('a', '^1.0.0', specOptions)
      const id = getId(spec, mani)
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', '*', specOptions)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.ok(
        edgeValid(edge, dep),
        'valid when using a spec that allows for a major bump range',
      )
    })

    await t.test('invalid minor bump ~ range', async t => {
      // dependency defines a strict minor bump on its spec range
      const spec = Spec.parse('a', '~1.0.0', specOptions)
      const id = getId(spec, mani)
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', '~1.1.0', specOptions)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid on unsatisfied minor bump',
      )
    })

    await t.test('invalid minor bump ^ range', async t => {
      // dependency defines a strict minor bump on its spec range
      const spec = Spec.parse('a', '^1.0.0', specOptions)
      const id = getId(spec, mani)
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', '^1.1.0', specOptions)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid on unsatisfied minor bump',
      )
    })

    await t.test('valid minor bump', async t => {
      // dependency defines a strict minor bump on its spec range
      const mani = { name: 'a', version: '1.1.0' }
      const spec = Spec.parse('a', '^1.0.0', specOptions)
      const id = getId(spec, mani)
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', '^1.0.0', specOptions)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.ok(edgeValid(edge, dep), 'invalid on unsatisfied minor bump')
    })

    await t.test('invalid exact version change', async t => {
      // dependency defines an unsatisfied exact version
      const spec = Spec.parse('a', '=1.0.0', specOptions)
      const id = getId(spec, mani)
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', '=1.1.0', specOptions)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid on unsatisfied strict version change',
      )
    })

    await t.test('testing node missing version', async t => {
      // edge.to node is missing version info
      const mani = { name: 'a' }
      const spec = Spec.parse('a', '^1.0.0', specOptions)
      const id = getId(spec, mani)
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', '^1.0.0', specOptions)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid if there is no version to check against',
      )
    })
  })

  await t.test('file type', async t => {
    const mani = { name: 'a', version: '1.0.0' }

    await t.test('wrong node type', async t => {
      // id and edge are of a registry type instead
      // of the file type that the dependency expects
      const spec = Spec.parse('a', 'a@1.0.0', specOptions)
      const to = new Node(specOptions, getId(spec, mani), mani)
      const edge = new Edge('prod', spec, root, to)
      const depPath = './a'
      const depSpec = Spec.parse('a', `file:${depPath}`)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid if node type is not the same expected by the dependency',
      )
    })

    await t.test('invalid file type', async t => {
      // spec is of file type missing file property
      const path = './a'
      const spec = Spec.parse('a', path, specOptions)
      const id = joinDepIDTuple(['file', path])
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      delete spec.file
      t.notOk(
        edgeValid(edge),
        'invalid if the spec is missing its file property',
      )
    })

    await t.test('changing file path', async t => {
      // existing edge spec points to a different
      // path than the testing dependency
      const path = './a'
      const spec = Spec.parse('a', path, specOptions)
      const id = joinDepIDTuple(['file', path])
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', './another-a', specOptions)
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid if the file path has changed',
      )
    })

    await t.test('id file path has expected value', async t => {
      // the file path in the id matches the expected resolved value
      const path = './a'
      const spec = Spec.parse('a', path, specOptions)
      const id = joinDepIDTuple(['file', path])
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      t.ok(
        edgeValid(edge),
        'valid if path found on id matches expected resolved value',
      )
    })

    await t.test(
      'destination node has expected location',
      async t => {
        // transitive dependency: root -> foo -> file:./a
        // checks the ability of a transitive dependency of file type
        // to validate its path against its parent node location
        const fromSpec = Spec.parse('foo', '^1.0.0')
        const fromMani = {
          name: 'foo',
          version: '1.0.0',
          dependencies: {
            a: './a',
          },
        }
        const fromId = getId(fromSpec, fromMani)
        const from = new Node(specOptions, fromId, fromMani)
        from.location =
          './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo'
        new Edge('prod', fromSpec, root, from) // from dep edge
        const path =
          './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo/a'
        const spec = Spec.parse('a', './a', specOptions)
        const id = joinDepIDTuple(['file', path])
        const to = new Node(specOptions, id, mani)
        to.location = path
        const edge = new Edge('prod', spec, from, to)
        t.ok(
          edgeValid(edge),
          'valid if resolved path matches expected value',
        )
      },
    )

    await t.test('mismatching path value', async t => {
      // the file path in the id does not matches the expected resolved value
      const path = './a'
      const spec = Spec.parse('a', path, specOptions)
      const id = joinDepIDTuple(['file', './different'])
      const to = new Node(specOptions, id, mani)
      const edge = new Edge('prod', spec, root, to)
      t.notOk(
        edgeValid(edge),
        'invalid if resolved path does not match id value',
      )
    })
  })

  await t.test('remote type', async t => {
    const mani = { name: 'a', version: '1.0.0' }

    await t.test('wrong node type', async t => {
      // id and edge are of a registry type instead
      // of the remote type that the dependency expects
      const spec = Spec.parse('a', 'a@1.0.0', specOptions)
      const to = new Node(specOptions, getId(spec, mani), mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', 'http://example.com/a.tgz')
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid if node type is not the same expected by the dependency',
      )
    })

    await t.test('remote url matches', async t => {
      // id remote url matches that of the dependency spec
      const spec = Spec.parse('a', 'http://example.com/a.tgz')
      const to = new Node(specOptions, getId(spec, mani), mani)
      const edge = new Edge('prod', spec, root, to)
      t.ok(
        edgeValid(edge),
        'valid if remote url matches between id and spec',
      )
    })

    await t.test('remote url differs', async t => {
      // id remote url does not match that of the dependency spec
      const spec = Spec.parse('a', 'http://example.com/a.tgz')
      const to = new Node(specOptions, getId(spec, mani), mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse(
        'a',
        'http://example.com/different.tgz',
      )
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid if remote url does not match between id and spec',
      )
    })
  })

  await t.test('workspace type', async t => {
    const mani = { name: 'a', version: '1.0.0' }

    await t.test('wrong node type', async t => {
      // id and edge are of a registry type instead
      // of the workspace type that the dependency expects
      const spec = Spec.parse('a', 'a@1.0.0', specOptions)
      const to = new Node(specOptions, getId(spec, mani), mani)
      const edge = new Edge('prod', spec, root, to)
      const depSpec = Spec.parse('a', 'workspace:*')
      const dep = asDependency({ type: 'prod', spec: depSpec })
      t.notOk(
        edgeValid(edge, dep),
        'invalid if node type is not the same expected by the dependency',
      )
    })

    await t.test('changed location', async t => {
      // id points to a path but the node
      // location points to a different path
      const path = 'packages/a'
      const id = joinDepIDTuple(['workspace', path])
      const to = new Node(specOptions, id, mani)
      to.location = 'packages/DIFFERENT'
      const spec = Spec.parse('a', 'workspace:*')
      const edge = new Edge('prod', spec, root, to)
      t.notOk(
        edgeValid(edge),
        'invalid if path from id does not match path from node.location',
      )
    })

    await t.test('no range to compare', async t => {
      // defined spec does not define a valid workspace range
      const path = 'packages/a'
      const id = joinDepIDTuple(['workspace', path])
      const to = new Node(specOptions, id, mani)
      to.location = 'packages/a'
      const spec = Spec.parse('a', 'workspace:*')
      const edge = new Edge('prod', spec, root, to)
      t.ok(edgeValid(edge), 'valid if there are no range to compare')
    })

    await t.test('unmatched range', async t => {
      // defined spec does not define a valid workspace range
      const path = 'packages/a'
      const id = joinDepIDTuple(['workspace', path])
      const to = new Node(specOptions, id, mani)
      to.location = 'packages/a'
      const spec = Spec.parse('a', 'workspace:^2.0.0')
      const edge = new Edge('prod', spec, root, to)
      t.notOk(
        edgeValid(edge),
        'invalid if declared range does not satisfy current node version',
      )
    })

    await t.test('valid range', async t => {
      // defined spec does not define a valid workspace range
      const path = 'packages/a'
      const id = joinDepIDTuple(['workspace', path])
      const to = new Node(specOptions, id, mani)
      to.location = 'packages/a'
      const spec = Spec.parse('a', 'workspace:^1.0.0')
      const edge = new Edge('prod', spec, root, to)
      t.ok(
        edgeValid(edge),
        'valid if edge range satisfies current found version',
      )
    })

    await t.test('missing version', async t => {
      // edge.to node is missing a version to test
      const mani = { name: 'a' }
      const path = 'packages/a'
      const id = joinDepIDTuple(['workspace', path])
      const to = new Node(specOptions, id, mani)
      to.location = 'packages/a'
      const spec = Spec.parse('a', 'workspace:^1.0.0')
      const edge = new Edge('prod', spec, root, to)
      t.notOk(
        edgeValid(edge),
        'invalid if there is no version to check against',
      )
    })
  })

  await t.test('unknown spec type', async t => {
    const mani = { name: 'a', version: '1.0.0' }
    const spec = Spec.parse('a', '^1.0.0', specOptions)
    const id = getId(spec, mani)
    const to = new Node(specOptions, id, mani)
    const edge = new Edge('prod', spec, root, to)

    // tweaks the spec to set a borked type
    spec.type = 'unknown' as 'registry'

    t.throws(
      () => edgeValid(edge),
      /Invalid spec type found/,
      'should throw an error if using an unknown type',
    )
  })
})
