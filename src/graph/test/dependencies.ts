import t from 'tap'
import {
  asDependency,
  asDependencyTypeShort,
  getDependencies,
  getRawDependencies,
  isDependency,
  isDependencyTypeShort,
  isDependencySaveType,
  shorten,
} from '../src/dependencies.ts'
import { Spec } from '@vltpkg/spec'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DependencyTypeLong, Manifest } from '@vltpkg/types'
import type { NodeLike } from '../src/types.ts'

t.test('shorten', async t => {
  t.strictSame(
    shorten('dependencies'),
    'prod',
    'should retrieve prod dep',
  )
  t.strictSame(
    shorten('devDependencies'),
    'dev',
    'should retrieve dev dep',
  )
  t.strictSame(
    shorten('optionalDependencies'),
    'optional',
    'should retrieve optional dep',
  )
  t.strictSame(
    shorten('peerDependencies'),
    'peer',
    'should retrieve peer dep',
  )
  t.strictSame(
    shorten('peerDependencies', 'foo', {
      peerDependenciesMeta: { foo: { optional: true } },
    }),
    'peerOptional',
    'should retrieve peerOptional dep',
  )
  t.strictSame(
    shorten('peerDependencies', undefined, {
      peerDependenciesMeta: { foo: { optional: true } },
    }),
    'peer',
    'should retrieve peer dep if there is no name to look up key on meta object',
  )
  t.throws(
    () => shorten('unknown' as DependencyTypeLong),
    /Invalid dependency type name/,
    'should throw if trying to retrieve from an unkown type',
  )
})

t.test('isDependency', async t => {
  const spec = Spec.parse('foo', '^1.0.0')
  t.ok(
    isDependency({
      spec,
      type: 'prod',
    }),
    'should be ok if object is a valid dependency shaped obj',
  )
  t.notOk(
    isDependency({
      spec,
      type: 'unkown',
    }),
    'should not be ok if object does not have a valid obj',
  )
  t.notOk(
    isDependency({}),
    'should not be ok if object is missing expected properties',
  )
})

t.test('asDependency', async t => {
  const spec = Spec.parse('foo', '^1.0.0')
  t.ok(
    asDependency({
      spec,
      type: 'prod',
    }),
    'should return typed object if a valid dependency shaped obj is found',
  )
  t.throws(
    () =>
      asDependency({
        spec,
        type: 'unkown',
      }),
    /Invalid dependency/,
    'should throw if object does not have a valid obj',
  )
  t.throws(
    () => asDependency({}),
    /Invalid dependency/,
    'should throw if object is missing expected properties',
  )
})

t.test('isDependencyTypeShort', async t => {
  t.ok(
    isDependencyTypeShort('prod'),
    'should be ok if type is a valid short type',
  )
  t.notOk(
    isDependencyTypeShort('unknown'),
    'should not be ok if type is not a valid short type',
  )
})

t.test('isDependencySaveType', async t => {
  t.ok(
    isDependencySaveType('prod'),
    'should be ok if type is a valid save type',
  )
  t.ok(
    isDependencySaveType('implicit'),
    'should be ok if type is a valid save type',
  )
  t.notOk(
    isDependencySaveType('unknown'),
    'should not be ok if type is not a valid short type',
  )
})

t.test('asDependencyTypeShort', async t => {
  const type = asDependencyTypeShort('prod')
  t.strictSame(type, 'prod', 'valid short type')

  t.throws(
    () => asDependencyTypeShort('unknown'),
    /Invalid dependency type/,
    'should throw if type is not a valid short type',
  )
})

// Helper function to create mock NodeLike objects for testing
const createMockNode = (
  overrides: Partial<NodeLike> = {},
  manifest?: Pick<Manifest, 'peerDependenciesMeta'> | null,
): NodeLike => ({
  id: joinDepIDTuple(['registry', 'npm', 'test-pkg@1.0.0']),
  confused: false,
  edgesIn: new Set(),
  edgesOut: new Map(),
  manifest,
  rawManifest: manifest,
  name: 'test-pkg',
  version: '1.0.0',
  integrity: null,
  resolved: null,
  importer: false,
  graph: {} as any,
  mainImporter: false,
  projectRoot: '/test',
  dev: false,
  optional: false,
  registry: 'https://registry.npmjs.org/',
  toJSON: () => ({}) as any,
  toString: () => 'test-node',
  setResolved: () => {},
  setConfusedManifest: () => {},
  maybeSetConfusedManifest: () => {},
  ...overrides,
})

t.test('getRawDependencies', async t => {
  t.test(
    'should return empty map for node with no manifest',
    async t => {
      const node = createMockNode()
      const result = getRawDependencies(node)
      t.strictSame(result.size, 0, 'should return empty map')
    },
  )

  t.test(
    'should return empty map for node with empty manifest',
    async t => {
      const node = createMockNode({}, {})
      const result = getRawDependencies(node)
      t.strictSame(result.size, 0, 'should return empty map')
    },
  )

  t.test('should parse basic dependencies', async t => {
    const manifest: Manifest = {
      dependencies: {
        lodash: '^4.17.21',
        express: '^4.18.0',
      },
      devDependencies: {
        jest: '^29.0.0',
      },
      optionalDependencies: {
        fsevents: '^2.3.0',
      },
      peerDependencies: {
        react: '^18.0.0',
      },
    }
    const node = createMockNode({ importer: true }, manifest)
    const result = getRawDependencies(node)

    t.strictSame(result.size, 5, 'should return all dependencies')

    const lodash = result.get('lodash')
    t.strictSame(lodash?.name, 'lodash')
    t.strictSame(lodash?.bareSpec, '^4.17.21')
    t.strictSame(lodash?.type, 'dependencies')
    t.strictSame(lodash?.registry, 'https://registry.npmjs.org/')

    const jest = result.get('jest')
    t.strictSame(jest?.name, 'jest')
    t.strictSame(jest?.type, 'devDependencies')

    const fsevents = result.get('fsevents')
    t.strictSame(fsevents?.type, 'optionalDependencies')

    const react = result.get('react')
    t.strictSame(react?.type, 'peerDependencies')
  })

  t.test(
    'should skip devDependencies for non-importer, non-git, non-file deps',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          lodash: '^4.17.21',
        },
        devDependencies: {
          jest: '^29.0.0',
        },
      }
      const node = createMockNode(
        {
          importer: false,
          id: joinDepIDTuple(['registry', '', 'some-pkg@1.0.0']),
        },
        manifest,
      )
      const result = getRawDependencies(node)

      t.strictSame(
        result.size,
        1,
        'should only include prod dependencies',
      )
      t.ok(result.has('lodash'), 'should include prod dependency')
      t.notOk(result.has('jest'), 'should skip dev dependency')
    },
  )

  t.test(
    'should include devDependencies for importer nodes',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          lodash: '^4.17.21',
        },
        devDependencies: {
          jest: '^29.0.0',
        },
      }
      const node = createMockNode({ importer: true }, manifest)
      const result = getRawDependencies(node)

      t.strictSame(
        result.size,
        2,
        'should include both prod and dev dependencies',
      )
      t.ok(result.has('lodash'), 'should include prod dependency')
      t.ok(result.has('jest'), 'should include dev dependency')
    },
  )

  t.test(
    'should include devDependencies for git dependencies',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          lodash: '^4.17.21',
        },
        devDependencies: {
          jest: '^29.0.0',
        },
      }
      const node = createMockNode(
        {
          importer: false,
          id: joinDepIDTuple([
            'git',
            'https://github.com/user/repo.git',
            'main',
          ]),
        },
        manifest,
      )
      const result = getRawDependencies(node)

      t.strictSame(
        result.size,
        2,
        'should include both prod and dev dependencies',
      )
      t.ok(result.has('lodash'), 'should include prod dependency')
      t.ok(
        result.has('jest'),
        'should include dev dependency for git deps',
      )
    },
  )

  t.test(
    'should include devDependencies for file dependencies',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          lodash: '^4.17.21',
        },
        devDependencies: {
          jest: '^29.0.0',
        },
      }
      const node = createMockNode(
        {
          importer: false,
          id: joinDepIDTuple(['file', 'local-pkg']),
        },
        manifest,
      )
      const result = getRawDependencies(node)

      t.strictSame(
        result.size,
        2,
        'should include both prod and dev dependencies',
      )
      t.ok(result.has('lodash'), 'should include prod dependency')
      t.ok(
        result.has('jest'),
        'should include dev dependency for file deps',
      )
    },
  )

  t.test(
    'should handle bundleDependencies for non-importer, non-git nodes',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          lodash: '^4.17.21',
          express: '^4.18.0',
          bundled: '^1.0.0',
        },
        bundleDependencies: ['bundled'],
      }
      const node = createMockNode(
        {
          importer: false,
          id: joinDepIDTuple(['registry', '', 'some-pkg@1.0.0']),
        },
        manifest,
      )
      const result = getRawDependencies(node)

      t.strictSame(
        result.size,
        2,
        'should exclude bundled dependencies',
      )
      t.ok(
        result.has('lodash'),
        'should include non-bundled dependency',
      )
      t.ok(
        result.has('express'),
        'should include non-bundled dependency',
      )
      t.notOk(
        result.has('bundled'),
        'should exclude bundled dependency',
      )
    },
  )

  t.test(
    'should include bundleDependencies for importer nodes',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          lodash: '^4.17.21',
          bundled: '^1.0.0',
        },
        bundleDependencies: ['bundled'],
      }
      const node = createMockNode({ importer: true }, manifest)
      const result = getRawDependencies(node)

      t.strictSame(
        result.size,
        2,
        'should include all dependencies for importers',
      )
      t.ok(result.has('lodash'), 'should include dependency')
      t.ok(
        result.has('bundled'),
        'should include bundled dependency for importers',
      )
    },
  )

  t.test(
    'should include bundleDependencies for git nodes',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          lodash: '^4.17.21',
          bundled: '^1.0.0',
        },
        bundleDependencies: ['bundled'],
      }
      const node = createMockNode(
        {
          importer: false,
          id: joinDepIDTuple([
            'git',
            'https://github.com/user/repo.git',
            'main',
          ]),
        },
        manifest,
      )
      const result = getRawDependencies(node)

      t.strictSame(
        result.size,
        2,
        'should include all dependencies for git deps',
      )
      t.ok(result.has('lodash'), 'should include dependency')
      t.ok(
        result.has('bundled'),
        'should include bundled dependency for git deps',
      )
    },
  )

  t.test('should handle bundleDependencies as array', async t => {
    const manifest: Manifest = {
      dependencies: {
        lodash: '^4.17.21',
        bundled1: '^1.0.0',
        bundled2: '^2.0.0',
      },
      bundleDependencies: ['bundled1', 'bundled2'],
    }
    const node = createMockNode(
      {
        importer: false,
        id: joinDepIDTuple(['registry', '', 'some-pkg@1.0.0']),
      },
      manifest,
    )
    const result = getRawDependencies(node)

    t.strictSame(
      result.size,
      1,
      'should exclude multiple bundled dependencies',
    )
    t.ok(
      result.has('lodash'),
      'should include non-bundled dependency',
    )
    t.notOk(
      result.has('bundled1'),
      'should exclude bundled dependency',
    )
    t.notOk(
      result.has('bundled2'),
      'should exclude bundled dependency',
    )
  })

  t.test('should handle invalid bundleDependencies', async t => {
    const manifest: Manifest = {
      dependencies: {
        lodash: '^4.17.21',
      },
      bundleDependencies: 'not-an-array' as any,
    }
    const node = createMockNode(
      {
        importer: false,
        id: joinDepIDTuple(['registry', '', 'some-pkg@1.0.0']),
      },
      manifest,
    )
    const result = getRawDependencies(node)

    t.strictSame(
      result.size,
      1,
      'should handle invalid bundleDependencies gracefully',
    )
    t.ok(result.has('lodash'), 'should include dependency')
  })

  t.test('should use node registry in dependencies', async t => {
    const manifest: Manifest = {
      dependencies: {
        lodash: '^4.17.21',
      },
    }
    const customRegistry = 'https://custom.registry.com/'
    const node = createMockNode(
      { registry: customRegistry },
      manifest,
    )
    const result = getRawDependencies(node)

    const lodash = result.get('lodash')
    t.strictSame(
      lodash?.registry,
      customRegistry,
      'should use node registry',
    )
  })
})

t.test('getDependencies', async t => {
  t.test(
    'should return empty map for node with no dependencies',
    async t => {
      const node = createMockNode({}, {})
      const result = getDependencies(node, {})

      t.strictSame(result.size, 0, 'should return empty map')
    },
  )

  t.test('should parse dependencies with specs', async t => {
    const manifest: Manifest = {
      dependencies: {
        lodash: '^4.17.21',
        express: '~4.18.0',
      },
      devDependencies: {
        jest: '^29.0.0',
      },
      optionalDependencies: {
        fsevents: '^2.3.0',
      },
      peerDependencies: {
        react: '^18.0.0',
      },
    }
    const node = createMockNode({ importer: true }, manifest)
    const result = getDependencies(node, {})

    t.strictSame(result.size, 5, 'should return all dependencies')

    const lodash = result.get('lodash')
    t.ok(lodash?.spec, 'should have parsed spec')
    t.strictSame(
      lodash?.spec.name,
      'lodash',
      'should parse spec name',
    )
    t.strictSame(
      lodash?.spec.bareSpec,
      '^4.17.21',
      'should parse spec version',
    )
    t.strictSame(
      lodash?.type,
      'prod',
      'should convert type to short form',
    )

    const jest = result.get('jest')
    t.strictSame(jest?.type, 'dev', 'should convert dev type')

    const fsevents = result.get('fsevents')
    t.strictSame(
      fsevents?.type,
      'optional',
      'should convert optional type',
    )

    const react = result.get('react')
    t.strictSame(react?.type, 'peer', 'should convert peer type')
  })

  t.test('should handle peerOptional dependencies', async t => {
    const manifest: Manifest = {
      peerDependencies: {
        react: '^18.0.0',
        'optional-peer': '^1.0.0',
      },
      peerDependenciesMeta: {
        'optional-peer': { optional: true },
      },
    }
    const node = createMockNode({ importer: true }, manifest)
    const result = getDependencies(node, {})

    const react = result.get('react')
    t.strictSame(react?.type, 'peer', 'should be peer dependency')

    const optionalPeer = result.get('optional-peer')
    t.strictSame(
      optionalPeer?.type,
      'peerOptional',
      'should be peerOptional dependency',
    )
  })

  t.test(
    'should pass registry from node to spec parsing',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          'scoped-pkg': '^1.0.0',
        },
      }
      const customRegistry = 'https://custom.registry.com/'
      const node = createMockNode(
        { registry: customRegistry },
        manifest,
      )
      const result = getDependencies(node, {})

      const scopedPkg = result.get('scoped-pkg')
      t.ok(scopedPkg?.spec, 'should have parsed spec')
      // The spec should have been created with the custom registry
      t.strictSame(
        scopedPkg?.spec.name,
        'scoped-pkg',
        'should parse name correctly',
      )
    },
  )

  t.test('should pass options to spec parsing', async t => {
    const manifest: Manifest = {
      dependencies: {
        lodash: '^4.17.21',
      },
    }
    const node = createMockNode({}, manifest)
    const options = {
      registry: 'https://test.registry.com/',
    }
    const result = getDependencies(node, options)

    const lodash = result.get('lodash')
    t.ok(lodash?.spec, 'should have parsed spec with options')
    t.strictSame(
      lodash?.spec.name,
      'lodash',
      'should parse name correctly',
    )
  })

  t.test(
    'should skip bundled dependencies based on getRawDependencies logic',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          lodash: '^4.17.21',
          bundled: '^1.0.0',
        },
        bundleDependencies: ['bundled'],
      }
      const node = createMockNode(
        {
          importer: false,
          id: joinDepIDTuple(['registry', '', 'some-pkg@1.0.0']),
        },
        manifest,
      )
      const result = getDependencies(node, {})

      t.strictSame(
        result.size,
        1,
        'should exclude bundled dependencies',
      )
      t.ok(
        result.has('lodash'),
        'should include non-bundled dependency',
      )
      t.notOk(
        result.has('bundled'),
        'should exclude bundled dependency',
      )
    },
  )

  t.test(
    'should skip devDependencies for non-importer nodes',
    async t => {
      const manifest: Manifest = {
        dependencies: {
          lodash: '^4.17.21',
        },
        devDependencies: {
          jest: '^29.0.0',
        },
      }
      const node = createMockNode(
        {
          importer: false,
          id: joinDepIDTuple(['registry', '', 'some-pkg@1.0.0']),
        },
        manifest,
      )
      const result = getDependencies(node, {})

      t.strictSame(
        result.size,
        1,
        'should only include prod dependencies',
      )
      t.ok(result.has('lodash'), 'should include prod dependency')
      t.notOk(result.has('jest'), 'should skip dev dependency')
    },
  )
})
