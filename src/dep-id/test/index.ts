import { defaultRegistry, getOptions, Spec } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import t from 'tap'
import {
  asDepID,
  delimiter,
  getId,
  getTuple,
  hydrate,
  hydrateTuple,
  isDepID,
  isPackageNameConfused,
  joinDepIDTuple,
  splitDepID,
  baseDepID,
  resetCaches,
  joinExtra,
  splitExtra,
} from '../src/index.ts'
import type { DepID } from '../src/index.ts'

const mani: Manifest = { name: 'manifest-name', version: '1.2.3' }
t.test('valid specs', t => {
  const specs = [
    'x@1.2.3',
    'x@1',
    'y@1.2.3',
    'y@npm:x@1.2.3',
    'y@npm:x@1',
    'y@npm:x@github:a/b#branch',
    'y@registry:https://x.com#x@1',
    `y@registry:${defaultRegistry.slice(0, -1)}#x@1`,
    `y@registry:${defaultRegistry}#x@1`,
    'x@git+ssh://host.com/x.git',
    'x@git+ssh://host.com/x.git#branch',
    'x@git+ssh://host.com/x.git#semver:1',
    'x@github:a/b',
    'x@github:a/b#branch',
    'x@github:a/b#semver:1',
    'x@https://x.com/x.tgz',
    'x@a:asfd@1.2.3',
    'x@b:asfd@1.2.3',
    'x@registry:https://a.example.com/#asfd@1.2.3',
    'x@registry:https://b.example.com/#asfd@1.2.3',
    'x@registry:https://c.example.com/#asfd@1.2.3', // <- not configured
  ]
  const registries = {
    a: 'https://a.example.com/',
    b: 'https://b.example.com/',
  }
  const options = getOptions({ registries })

  for (const s of specs) {
    t.test(s, t => {
      const spec = Spec.parse(s, options)
      const tuple = getTuple(spec, mani)
      const id = getId(spec, mani)
      const idWithExtra = getId(spec, mani, ':root > #extra')
      const base = baseDepID(idWithExtra)
      t.matchSnapshot([id, tuple, idWithExtra, base])
      t.equal(joinDepIDTuple(tuple), id)
      t.strictSame(splitDepID(id), tuple)
      const h = hydrate(id, 'x', options)
      const ht = hydrateTuple(tuple, 'x', options)
      t.strictSame(h, ht, 'same in both hydrations')
      t.matchSnapshot(String(h), 'hydrated')
      const hunknown = hydrate(id, undefined, options)
      t.matchSnapshot(String(hunknown), 'hydrated with name unknown')
      const hasdf = hydrate(id, 'asdf', options)
      t.matchSnapshot(String(hasdf), 'hydrated with name asdf')
      const hy = hydrate(id, 'y', options)
      t.matchSnapshot(String(hy), 'hydrated with name y')
      t.end()
    })
  }

  const scopedMani: Manifest = {
    name: '@scoped/manifest-name',
    version: '1.2.3',
  }
  const scopedSpecs = [
    '@scoped/x@1.2.3',
    '@scoped/x@npm:@scoped/x@1.2.3',
    'y@npm:@scoped/x@1.2.3',
    '@scoped/y@npm:@scoped/x@1.2.3',
    '@scoped/x@github:a/b',
  ]
  for (const s of scopedSpecs) {
    t.test(s, t => {
      const spec = Spec.parse(s)
      const tuple = getTuple(spec, scopedMani)
      const id = getId(spec, scopedMani)
      t.matchSnapshot([id, tuple])
      t.equal(joinDepIDTuple(tuple), id)
      t.strictSame(splitDepID(id), tuple)
      const hscoped = hydrate(id, '@scoped/x', options)
      t.matchSnapshot(String(hscoped), 'hydrated with scoped name')
      const hunknown = hydrate(id, undefined, options)
      t.matchSnapshot(String(hunknown), 'hydrated with name unknown')
      const hasdf = hydrate(id, 'asdf', options)
      t.matchSnapshot(String(hasdf), 'hydrated with name asdf')
      const hy = hydrate(id, 'y', options)
      t.matchSnapshot(String(hy), 'hydrated with name y')
      t.end()
    })
  }

  const prefixedVersionManifest = {
    name: 'manifest-name',
    version: 'v1.2.3',
  }
  const pSpec = Spec.parse('manifest-name@^1.0.0')
  const pTuple = getTuple(pSpec, prefixedVersionManifest)
  const pId = getId(pSpec, prefixedVersionManifest)
  t.matchSnapshot([pId, pTuple])

  t.end()
})

t.test('hydrate only', t => {
  const hydrateOnlyDepIDs: DepID[] = [
    `file${delimiter}x.tgz`,
    `file${delimiter}./x.tgz`,
    `file${delimiter}///x.tgz`,
    `workspace${delimiter}./a`,
    `workspace${delimiter}a`,
  ]
  for (const id of hydrateOnlyDepIDs) {
    t.test(id, t => {
      const hscoped = hydrate(id, '@scoped/x')
      t.matchSnapshot(String(hscoped), 'hydrated with scoped name')
      const hunknown = hydrate(id)
      t.matchSnapshot(String(hunknown), 'hydrated with name unknown')
      const hasdf = hydrate(id, 'asdf')
      t.matchSnapshot(String(hasdf), 'hydrated with name asdf')
      const hy = hydrate(id, 'y')
      t.matchSnapshot(String(hy), 'hydrated with name y')
      t.end()
    })
  }

  t.end()
})

t.test('hydrate from memoized entry', t => {
  resetCaches()
  const options = getOptions({})
  const id = `${delimiter}${delimiter}x@1.2.3` as DepID
  t.equal(String(hydrate(id, 'x', options)), 'x@1.2.3')
  t.equal(String(hydrate(id, 'x', options)), 'x@1.2.3')
  t.end()
})

t.test('named registry', t => {
  const options = { registries: { vlt: 'http://vlt.sh' } }
  t.equal(
    String(
      hydrate(`${delimiter}vlt${delimiter}x@1.2.3`, 'x', options),
    ),
    'x@vlt:x@1.2.3',
  )
  t.end()
})

t.test('unnamed registry', t => {
  t.equal(
    String(
      hydrate(
        `${delimiter}http://vlt.sh${delimiter}x@1.2.3` as DepID,
        'x',
      ),
    ),
    'x@registry:http://vlt.sh#x@1.2.3',
  )
  t.equal(
    String(
      hydrate(
        `${delimiter}http://vlt.sh${delimiter}x@1.2.3` as DepID,
      ),
    ),
    'x@registry:http://vlt.sh#x@1.2.3',
  )
  t.end()
})

t.test('default registry name', t => {
  t.equal(
    String(
      splitDepID(`${delimiter}npm${delimiter}foo@1.0.0` as DepID),
    ),
    String(splitDepID(`${delimiter}${delimiter}foo@1.0.0` as DepID)),
  )
  t.end()
})

t.test('getId when manifest empty, fields just blank', t => {
  t.strictSame(getTuple(Spec.parse('x@1.2.3'), {}), [
    'registry',
    'npm',
    'x@1.2.3',
    undefined,
  ])
  t.end()
})

t.test('use shorten registry name whenever possible', t => {
  const mani = {
    name: 'pkg',
    version: '1.0.0',
  }
  const registries = {
    custom: 'http://custom.example.com',
    another: 'https://another.example.com/',
  }
  const customExpectedValue = [
    'registry',
    'custom',
    'pkg@1.0.0',
    undefined,
  ]
  const anotherExpectedValue = [
    'registry',
    'another',
    'pkg@1.0.0',
    undefined,
  ]
  const options = { registries }
  // test variations of using slashes at the end of the registry URL
  // and long form URL being normalized to the shorten known reg name
  const optionHasNoSlashButSpecHas = Spec.parse(
    'pkg',
    'registry:http://custom.example.com/#pkg@1.0.0',
    options,
  )
  t.strictSame(
    getTuple(optionHasNoSlashButSpecHas, mani),
    customExpectedValue,
  )
  const optionHasNoSlashLikeSpec = Spec.parse(
    'pkg',
    'registry:http://custom.example.com#pkg@1.0.0',
    options,
  )
  t.strictSame(
    getTuple(optionHasNoSlashLikeSpec, mani),
    customExpectedValue,
  )
  const optionsHasSlashButSpecHasNoSlash = Spec.parse(
    'pkg',
    'registry:https://another.example.com#pkg@1.0.0',
    options,
  )
  t.strictSame(
    getTuple(optionsHasSlashButSpecHasNoSlash, mani),
    anotherExpectedValue,
  )
  const optionHasSlashLikeSpec = Spec.parse(
    'pkg',
    'registry:https://another.example.com/#pkg@1.0.0',
    options,
  )
  t.strictSame(
    getTuple(optionHasSlashLikeSpec, mani),
    anotherExpectedValue,
  )
  const useShortenRegistryNameInSpec = Spec.parse(
    'pkg',
    'custom:pkg@1.0.0',
    options,
  )
  t.strictSame(
    getTuple(useShortenRegistryNameInSpec, mani),
    customExpectedValue,
  )
  const useShortenRegistryNameInSpecAnother = Spec.parse(
    'pkg',
    'another:pkg@1.0.0',
    options,
  )
  t.strictSame(
    getTuple(useShortenRegistryNameInSpecAnother, mani),
    anotherExpectedValue,
  )
  // Now here we check that even though the custom registries are not directly
  // present in the spec, the DepID should have the same result if it's using
  // that same custom value set as the default registry, this is a common
  // occurrence when transitive packages are inheriting the registry values
  // from their parents / ancestors
  const optionsWithCustomAsDefault = {
    ...options,
    registry: 'http://custom.example.com',
  }
  const specWithCustomDefaultRegistry = Spec.parse(
    'pkg',
    '1.0.0',
    optionsWithCustomAsDefault,
  )
  t.strictSame(
    getTuple(specWithCustomDefaultRegistry, mani),
    customExpectedValue,
  )
  const optionsWithCustomWithExtraSlashAsDefault = {
    ...options,
    registry: 'http://custom.example.com/',
  }
  const specWithCustomWithExtraSlashAsDefault = Spec.parse(
    'pkg',
    '1.0.0',
    optionsWithCustomWithExtraSlashAsDefault,
  )
  t.strictSame(
    getTuple(specWithCustomWithExtraSlashAsDefault, mani),
    customExpectedValue,
  )
  const specWithAnotherDefaultRegistry = Spec.parse('pkg', '1.0.0', {
    ...options,
    registry: 'https://another.example.com/',
  })
  t.strictSame(
    getTuple(specWithAnotherDefaultRegistry, mani),
    anotherExpectedValue,
  )
  const specWithAnotherWithoutExtraSlashDefaultRegistry = Spec.parse(
    'pkg',
    '1.0.0',
    { ...options, registry: 'https://another.example.com' },
  )
  t.strictSame(
    getTuple(specWithAnotherWithoutExtraSlashDefaultRegistry, mani),
    anotherExpectedValue,
  )
  resetCaches()
  // finally let's sanity check usage of scope-registries to make sure
  // they interact well with custom registries and that the default resolution
  // logic does not interfere with them
  const specWithUnknownScopeRegistry = Spec.parse(
    '@myscope/pkg',
    '1.0.0',
    {
      ...options,
      'scope-registries': {
        '@myscope': 'http://myscope.example.com',
      },
    },
  )
  t.strictSame(
    getTuple(specWithUnknownScopeRegistry, {
      name: '@myscope/pkg',
      version: '1.0.0',
    }),
    [
      'registry',
      'http://myscope.example.com',
      '@myscope/pkg@1.0.0',
      undefined,
    ],
  )
  resetCaches()
  // now test with a known registry in the scope-registries
  const specWithScopeRegistry = Spec.parse('@myscope/pkg', '1.0.0', {
    ...options,
    'scope-registries': {
      '@myscope': 'http://custom.example.com',
    },
  })
  t.strictSame(
    getTuple(specWithScopeRegistry, {
      name: '@myscope/pkg',
      version: '1.0.0',
    }),
    ['registry', 'custom', '@myscope/pkg@1.0.0', undefined],
  )
  resetCaches()
  const specWithScopeRegistryWithExtraSlash = Spec.parse(
    '@myscope/pkg',
    '1.0.0',
    {
      ...options,
      'scope-registries': {
        '@myscope': 'http://custom.example.com/',
      },
    },
  )
  t.strictSame(
    getTuple(specWithScopeRegistryWithExtraSlash, {
      name: '@myscope/pkg',
      version: '1.0.0',
    }),
    ['registry', 'custom', '@myscope/pkg@1.0.0', undefined],
  )
  t.end()
})

t.test('invalid values', t => {
  //@ts-expect-error
  t.throws(() => hydrateTuple(['workspace']))
  //@ts-expect-error
  t.throws(() => hydrate('workspace'))
  t.throws(() => hydrate(`workspace${delimiter}`))
  t.throws(() =>
    getId({ final: { type: 'workspace' } } as Spec, mani),
  )
  t.throws(() =>
    getTuple({ final: { type: 'workspace' } } as Spec, mani),
  )
  t.throws(() =>
    hydrate(`git${delimiter}github:${delimiter}branch`, 'x'),
  )
  t.throws(() =>
    hydrate(`git${delimiter}github:${delimiter}branch`, 'x'),
  )
  t.throws(() =>
    getId(
      { final: { type: 'git', namedGitHost: 'github' } } as Spec,
      mani,
    ),
  )
  t.throws(() =>
    getTuple(
      {
        final: {
          type: 'git',
          gitRemote: 'x',
          namedGitHost: 'github',
        },
      } as Spec,
      mani,
    ),
  )
  t.throws(() => hydrateTuple(['git', '', ''], 'x'))
  //@ts-expect-error
  t.throws(() => hydrate(`git${delimiter}x`, 'x'))
  t.throws(() => getId({ final: { type: 'remote' } } as Spec, mani))
  t.throws(() =>
    getTuple({ final: { type: 'remote' } } as Spec, mani),
  )
  t.throws(() => getTuple({ final: { type: 'file' } } as Spec, mani))
  t.throws(() => hydrate(`${delimiter}xyz${delimiter}x@1.2.1`, 'x'))
  t.throws(() => hydrate(`${delimiter}${delimiter}`, 'x'))
  //@ts-expect-error
  t.throws(() => hydrate(delimiter, 'x'))
  //@ts-expect-error
  t.throws(() => hydrateTuple(['registry'], 'x'))
  //@ts-expect-error
  t.throws(() => hydrateTuple(['registry', ''], 'x'))
  t.throws(() => hydrate(`file${delimiter}`, 'x'))
  t.throws(() => hydrate(`remote${delimiter}`, 'x'))
  t.throws(() =>
    splitDepID(`xyz${delimiter}a${delimiter}b${delimiter}c`),
  )
  t.end()
})

t.test('hydrate edge cases', t => {
  // uses a custom default registry with no short name
  t.equal(
    String(
      hydrate(
        `${delimiter}https://custom.registry.com${delimiter}pkg@1.0.0` as DepID,
        'pkg',
        getOptions({
          registry: 'https://custom.registry.com',
        }),
      ),
    ),
    'pkg@1.0.0',
  )
  // uses a custom default registry with no short name extra slash variation
  t.equal(
    String(
      hydrate(
        `${delimiter}https://custom.registry.com/${delimiter}pkg@1.0.0` as DepID,
        'pkg',
        getOptions({
          registry: 'https://custom.registry.com',
        }),
      ),
    ),
    'pkg@1.0.0',
  )
  // uses a custom default registry thas also has a custom short name
  t.equal(
    String(
      hydrate(
        `${delimiter}custom${delimiter}pkg@1.0.0` as DepID,
        'pkg',
        getOptions({
          registry: 'https://custom.registry.com',
          registries: {
            custom: 'https://custom.registry.com',
          },
        }),
      ),
    ),
    'pkg@1.0.0',
  )
  t.end()
})

const validDepIDs: DepID[] = [
  `${delimiter}npm${delimiter}foo@1.0.0`,
  `git${delimiter}github%3Aa+b${delimiter}branch`,
  `remote${delimiter}https%3A++x.com+x.tgz`,
  `file${delimiter}.+x.tgz`,
  `workspace${delimiter}a`,
  `${delimiter}npm${delimiter}foo@1.0.0${delimiter}extra`,
  `git${delimiter}github%3Aa+b${delimiter}branch${delimiter}extra`,
  `remote${delimiter}https%3A++x.com+x.tgz${delimiter}extra`,
  `file${delimiter}.+x.tgz${delimiter}extra`,
  `workspace${delimiter}a${delimiter}extra`,
]
const invalidDepIDs = ['', 'git', 'abobrinha', 'https://example.com']
t.test('asDepID', t => {
  const typeCheckDepID = (id: DepID) => id
  for (const id of validDepIDs) {
    t.ok(typeCheckDepID(asDepID(id)), id)
    t.equal(joinDepIDTuple(splitDepID(id)), id)
  }
  for (const id of invalidDepIDs) {
    t.throws(() => asDepID(id), id)
  }
  t.end()
})

t.test('isDepID', t => {
  for (const id of validDepIDs) {
    t.ok(isDepID(id), id)
  }
  for (const id of invalidDepIDs) {
    t.notOk(isDepID(id), id)
  }
  t.end()
})

t.test('isPackageNameConfused', t => {
  t.equal(
    isPackageNameConfused(),
    false,
    'should return false when missing args',
  )

  // Test registry type with matching names
  const matchingSpec = Spec.parse('foo', '^1.0.0')
  t.equal(
    isPackageNameConfused(matchingSpec, 'foo'),
    false,
    'should return false when names match',
  )

  // Test registry type with different names
  const differentSpec = Spec.parse('foo', '^1.0.0')
  t.equal(
    isPackageNameConfused(differentSpec, 'bar'),
    true,
    'should return true when names differ',
  )

  // Test with undefined name
  t.equal(
    isPackageNameConfused(differentSpec),
    true,
    'should return true when name is undefined',
  )

  // Test with nameless spec
  const namelessSpec = Spec.parse('', 'file:./local-package')
  t.equal(
    isPackageNameConfused(namelessSpec, 'local-package'),
    false,
    'should return false for non-registry types',
  )

  // Test with non-registry type
  const fileSpec = Spec.parse('local-package', 'file:./local-package')
  t.equal(
    isPackageNameConfused(fileSpec, 'confused-package'),
    false,
    'should return false for non-registry types',
  )

  // Test with subspec (aliased package)
  const aliasedSpec = Spec.parse('bar', 'npm:foo@1.0.0')
  t.equal(
    isPackageNameConfused(aliasedSpec, 'bar'),
    false,
    'should return false for aliased packages',
  )

  t.test('getTuple', t => {
    t.strictSame(
      getTuple(Spec.parse('bar', 'npm:foo@^1.0.0'), {
        version: '1.0.0',
      }),
      ['registry', 'npm', 'foo@1.0.0', undefined],
      'should normalize npm named registry to empty string',
    )
    t.end()
  })

  t.test('aliased and non-aliased generate same DepID', t => {
    const manifest = { name: 'abbrev', version: '4.0.0' }
    const direct = Spec.parse('abbrev', '^4.0.0')
    const aliased = Spec.parse('foo', 'npm:abbrev@^4.0.0')

    t.equal(
      getId(direct, manifest),
      getId(aliased, manifest),
      'both should generate same DepID',
    )
    t.end()
  })

  t.end()
})

t.test('resetCaches', t => {
  const spec = Spec.parse('test-package@1.2.3')
  const manifest = { name: 'test-package', version: '1.2.3' }
  const options = {
    registries: { custom: 'https://custom.registry.com/' },
  }

  // First, populate caches by calling functions that use them
  const id1 = getId(spec, manifest)
  const tuple1 = getTuple(spec, manifest)
  const hydrated1 = hydrate(id1, 'test-package', options)
  const hydratedTuple1 = hydrateTuple(tuple1, 'test-package', options)
  const split1 = splitDepID(id1)

  // Call resetCaches - should not throw
  t.doesNotThrow(() => resetCaches(), 'resetCaches should not throw')

  // Verify functions still work correctly after cache reset
  const id2 = getId(spec, manifest)
  const tuple2 = getTuple(spec, manifest)
  const hydrated2 = hydrate(id1, 'test-package', options)
  const hydratedTuple2 = hydrateTuple(tuple1, 'test-package', options)
  const split2 = splitDepID(id1)

  // Results should be the same even after cache reset
  t.equal(
    id1,
    id2,
    'getId should return same result after resetCaches',
  )
  t.strictSame(
    tuple1,
    tuple2,
    'getTuple should return same result after resetCaches',
  )
  t.strictSame(
    hydrated1,
    hydrated2,
    'hydrate should return same result after resetCaches',
  )
  t.strictSame(
    hydratedTuple1,
    hydratedTuple2,
    'hydrateTuple should return same result after resetCaches',
  )
  t.strictSame(
    split1,
    split2,
    'splitDepID should return same result after resetCaches',
  )

  // Test calling resetCaches multiple times doesn't cause issues
  t.doesNotThrow(() => {
    resetCaches()
    resetCaches()
    resetCaches()
  }, 'multiple resetCaches calls should not throw')

  // Verify functions still work after multiple resets
  const id3 = getId(spec, manifest)
  const hydrated3 = hydrate(id1, 'test-package', options)
  t.equal(
    id1,
    id3,
    'getId should work after multiple resetCaches calls',
  )
  t.strictSame(
    hydrated1,
    hydrated3,
    'hydrate should work after multiple resetCaches calls',
  )

  t.end()
})

t.test('joinExtra', t => {
  const peerSetHash =
    'peer.151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067'
  const modifier = '/* mini */:root > #eslint > #minimatch'

  t.test('both modifier and peerSetHash', t => {
    const result = joinExtra({ peerSetHash, modifier })
    t.equal(
      result,
      `${modifier}${peerSetHash}`,
      'should join without separator',
    )
    t.end()
  })

  t.test('only modifier', t => {
    const result = joinExtra({ modifier })
    t.equal(result, modifier, 'should return just modifier')
    t.end()
  })

  t.test('only peerSetHash', t => {
    const result = joinExtra({ peerSetHash })
    t.equal(result, peerSetHash, 'should return just peerSetHash')
    t.end()
  })

  t.test('neither modifier nor peerSetHash', t => {
    const result = joinExtra({})
    t.equal(result, undefined, 'should return undefined')
    t.end()
  })

  t.test('empty strings', t => {
    t.equal(
      joinExtra({ peerSetHash: '', modifier: '' }),
      undefined,
      'both empty returns undefined',
    )
    t.equal(
      joinExtra({ peerSetHash: '', modifier: 'mod' }),
      'mod',
      'empty peerSetHash returns modifier',
    )
    t.equal(
      joinExtra({ peerSetHash: 'peer', modifier: '' }),
      'peer',
      'empty modifier returns peerSetHash',
    )
    t.end()
  })

  t.end()
})

t.test('splitExtra', t => {
  const peerSetHash =
    'peer.151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067'
  const modifier = '#@types/react-dom > #@types/react'

  t.test('only peerSetHash (starts with delimiter)', t => {
    const result = splitExtra(peerSetHash)
    t.strictSame(
      result,
      { peerSetHash },
      'should return only peerSetHash',
    )
    t.end()
  })

  t.test('only modifier (no delimiter)', t => {
    const result = splitExtra(modifier)
    t.strictSame(result, { modifier }, 'should return only modifier')
    t.end()
  })

  t.test('both modifier and peerSetHash', t => {
    const combined = `${modifier}${peerSetHash}`
    const result = splitExtra(combined)
    t.strictSame(
      result,
      { modifier, peerSetHash },
      'should split into both parts',
    )
    t.end()
  })

  t.test('empty string', t => {
    const result = splitExtra('')
    t.strictSame(result, {}, 'should return empty object')
    t.end()
  })

  t.test('various peerSetHash formats', t => {
    const hashes = [
      'peer.151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067',
      'peer.af175b2a75b7612b979fa268e54ab4e553f506c79c46ead5075b606ea61a5dbb',
      'peer.3c1154d8e6f8e8dbac3311715107ec117ab29c2b9b74dc2cfe297fec9c44133a',
    ]
    for (const hash of hashes) {
      t.strictSame(
        splitExtra(hash),
        { peerSetHash: hash },
        `should handle ${hash}`,
      )
    }
    t.end()
  })

  t.test('various modifier formats', t => {
    const modifiers = [
      '/* mini */:root > #eslint > #minimatch',
      '#@types/react-dom > #@types/react',
      '#underscore',
    ]
    for (const mod of modifiers) {
      t.strictSame(
        splitExtra(mod),
        { modifier: mod },
        `should handle ${mod}`,
      )
    }
    t.end()
  })

  t.end()
})

t.test('joinExtra and splitExtra round-trip', t => {
  const testCases = [
    {
      peerSetHash:
        'peer.151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067',
      modifier: '/* mini */:root > #eslint > #minimatch',
    },
    {
      peerSetHash:
        'peer.af175b2a75b7612b979fa268e54ab4e553f506c79c46ead5075b606ea61a5dbb',
      modifier: '#@types/react-dom > #@types/react',
    },
    {
      peerSetHash:
        'peer.3c1154d8e6f8e8dbac3311715107ec117ab29c2b9b74dc2cfe297fec9c44133a',
      modifier: '#underscore',
    },
    {
      peerSetHash:
        'peer.151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067',
      modifier: undefined,
    },
    {
      peerSetHash: undefined,
      modifier: '#underscore',
    },
  ]

  for (const { peerSetHash, modifier } of testCases) {
    t.test(
      `${modifier || 'no modifier'} + ${peerSetHash || 'no peerSetHash'}`,
      t => {
        const joined = joinExtra({ peerSetHash, modifier })
        if (!joined) {
          t.equal(peerSetHash, undefined)
          t.equal(modifier, undefined)
        } else {
          const split = splitExtra(joined)
          t.equal(
            split.modifier,
            modifier,
            'modifier matches after round-trip',
          )
          t.equal(
            split.peerSetHash,
            peerSetHash,
            'peerSetHash matches after round-trip',
          )
        }
        t.end()
      },
    )
  }

  t.end()
})
