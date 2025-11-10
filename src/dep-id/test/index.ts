import { Spec } from '@vltpkg/spec'
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
    'y@registry:https://registry.npmjs.org#x@1',
    'y@registry:https://registry.npmjs.org/#x@1',
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
    'x@registry:https://c.example.com/#asfd@1.2.3',
  ]
  const registries = {
    a: 'https://a.example.com/',
    b: 'https://b.example.com/',
  }

  for (const s of specs) {
    t.test(s, t => {
      const spec = Spec.parse(s, { registries })
      const tuple = getTuple(spec, mani)
      const id = getId(spec, mani)
      const idWithExtra = getId(spec, mani, ':root > #extra')
      const base = baseDepID(idWithExtra)
      t.matchSnapshot([id, tuple, idWithExtra, base])
      t.equal(joinDepIDTuple(tuple), id)
      t.strictSame(splitDepID(id), tuple)
      const h = hydrate(id, 'x', { registries })
      const ht = hydrateTuple(tuple, 'x', { registries })
      t.strictSame(h, ht, 'same in both hydrations')
      t.matchSnapshot(String(h), 'hydrated')
      const hunknown = hydrate(id, undefined, { registries })
      t.matchSnapshot(String(hunknown), 'hydrated with name unknown')
      const hasdf = hydrate(id, 'asdf', { registries })
      t.matchSnapshot(String(hasdf), 'hydrated with name asdf')
      const hy = hydrate(id, 'y', { registries })
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
    `file${delimiter}~/x.tgz`,
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
  const options = {}
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

t.test('getId when manifest empty, fields just blank', t => {
  t.strictSame(getTuple(Spec.parse('x@1.2.3'), {}), [
    'registry',
    '',
    'x@1.2.3',
    undefined,
  ])
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

const validDepIDs: DepID[] = [
  `${delimiter}${delimiter}foo@1.0.0`,
  `git${delimiter}github%3Aa§b${delimiter}branch`,
  `remote${delimiter}https%3A§§x.com§x.tgz`,
  `file${delimiter}.§x.tgz`,
  `workspace${delimiter}a`,
  `${delimiter}${delimiter}foo@1.0.0${delimiter}extra`,
  `git${delimiter}github%3Aa§b${delimiter}branch${delimiter}extra`,
  `remote${delimiter}https%3A§§x.com§x.tgz${delimiter}extra`,
  `file${delimiter}.§x.tgz${delimiter}extra`,
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
      'should default to final spec name if mani name is missing',
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
    'ṗ:151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067'
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
    'ṗ:151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067'
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
      'ṗ:151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067',
      'ṗ:af175b2a75b7612b979fa268e54ab4e553f506c79c46ead5075b606ea61a5dbb',
      'ṗ:3c1154d8e6f8e8dbac3311715107ec117ab29c2b9b74dc2cfe297fec9c44133a',
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
        'ṗ:151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067',
      modifier: '/* mini */:root > #eslint > #minimatch',
    },
    {
      peerSetHash:
        'ṗ:af175b2a75b7612b979fa268e54ab4e553f506c79c46ead5075b606ea61a5dbb',
      modifier: '#@types/react-dom > #@types/react',
    },
    {
      peerSetHash:
        'ṗ:3c1154d8e6f8e8dbac3311715107ec117ab29c2b9b74dc2cfe297fec9c44133a',
      modifier: '#underscore',
    },
    {
      peerSetHash:
        'ṗ:151156689c700feee6aa5a3cb30051bd9289356b2212cbfdc0a172d14cc6a067',
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
