import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { Integrity } from '@vltpkg/types'
import type {
  LockfileData,
  LockfileNode,
  LockfileNodeFlags,
  LockfileEdges,
  LockfileEdgeKey,
  LockfileEdgeValue,
} from '../../src/lockfile/types.ts'
import {
  getFlagNumFromNode,
  getBooleanFlagsFromNum,
  LockfileNodeFlagNone,
  LockfileNodeFlagOptional,
  LockfileNodeFlagDev,
  LockfileNodeFlagDevOptional,
} from '../../src/lockfile/types.ts'

t.test('lockfile type checks', t => {
  // LockfileData type checks
  //@ts-expect-error - missing required properties
  let ld: LockfileData = {}
  ld
  //@ts-expect-error - options must be an object
  ld = { options: null, nodes: {}, edges: {} }
  //@ts-expect-error - nodes must be a record
  ld = { options: {}, nodes: null, edges: {} }
  //@ts-expect-error - edges must be a record
  ld = { options: {}, nodes: {}, edges: null }

  // Valid LockfileData
  ld = {
    lockfileVersion: 0,
    options: {},
    nodes: {},
    edges: {},
  }

  const validDepId = joinDepIDTuple([
    'registry',
    '',
    'test-pkg@1.0.0',
  ])
  const otherDepId = joinDepIDTuple(['registry', '', 'dep@1.0.0'])
  const validEdgeKey = `${validDepId} dep-name` as LockfileEdgeKey
  const validEdgeValue =
    `prod ^1.0.0 ${otherDepId}` as LockfileEdgeValue

  ld = {
    lockfileVersion: 0,
    options: {
      registries: { npm: 'https://registry.npmjs.org/' },
      modifiers: { ':root > #foo': '2.0.0' },
    },
    nodes: {
      [validDepId]: [
        0,
        'test-pkg',
        null,
        null,
        null,
        null,
        null,
      ] as LockfileNode,
    },
    edges: {
      [validEdgeKey]: validEdgeValue,
    },
  }

  // LockfileNode type checks
  //@ts-expect-error - must be a tuple with at least flags
  let ln: LockfileNode = {}
  ln
  //@ts-expect-error - flags must be a number
  ln = ['invalid']
  //@ts-expect-error - flags must be 0-3
  ln = [5]

  // Valid LockfileNode variations
  ln = [0] // minimal
  ln = [1, 'pkg-name'] // with name
  ln = [2, 'pkg-name', 'sha512-abc==' as Integrity] // with integrity
  ln = [
    3,
    'pkg-name',
    'sha512-abc==' as Integrity,
    'https://example.com/pkg.tgz',
  ] // with resolved
  ln = [0, 'pkg-name', null, null, '/path/to/pkg'] // with location
  ln = [
    1,
    'pkg-name',
    null,
    null,
    null,
    { name: 'pkg', version: '1.0.0' },
  ] // with manifest
  ln = [
    2,
    'pkg-name',
    null,
    null,
    null,
    null,
    { name: 'pkg', version: '1.0.0' },
  ] // with rawManifest
  ln = [
    3,
    'pkg-name',
    'sha512-abc==' as Integrity,
    'https://example.com/pkg.tgz',
    '/path',
    { name: 'pkg', version: '1.0.0' },
    { name: 'pkg', version: '1.0.0' },
  ] // complete

  // LockfileNodeFlags type checks
  //@ts-expect-error - must be 0, 1, 2, or 3
  let lnf: LockfileNodeFlags = 4
  lnf
  //@ts-expect-error - must be a number
  lnf = 'invalid'

  // Valid LockfileNodeFlags
  lnf = 0
  lnf = 1
  lnf = 2
  lnf = 3

  // LockfileEdges type checks
  let le: LockfileEdges = {}
  le
  //@ts-expect-error - values must be LockfileEdgeValue format
  le = {
    [`${validDepId} dep-name` as LockfileEdgeKey]: 'invalid-value',
  }

  // Valid LockfileEdges
  le = {}
  const fromDepId = joinDepIDTuple(['registry', '', 'from@1.0.0'])
  const toDepId = joinDepIDTuple(['registry', '', 'to@1.0.0'])
  const edgeKey1 = `${fromDepId} dep-name` as LockfileEdgeKey
  const edgeKey2 = `${fromDepId} other-dep` as LockfileEdgeKey
  const edgeValue1 = `prod ^1.0.0 ${toDepId}` as LockfileEdgeValue
  const edgeValue2 = 'dev ^2.0.0 MISSING' as LockfileEdgeValue
  le = {
    [edgeKey1]: edgeValue1,
    [edgeKey2]: edgeValue2,
  }

  // LockfileEdgeKey type checks
  //@ts-expect-error - must be in format "${DepID} ${string}"
  let lek: LockfileEdgeKey = 'invalid-format'
  lek
  //@ts-expect-error - must be a string
  lek = 123

  // Valid LockfileEdgeKey (template literal type)
  lek = `${fromDepId} dep-name` as LockfileEdgeKey

  // LockfileEdgeValue type checks
  //@ts-expect-error - must be in format "${DependencyTypeShort} ${Spec['bareSpec']} ${DepID | 'MISSING'}"
  let lev: LockfileEdgeValue = 'invalid-format'
  lev
  //@ts-expect-error - must be a string
  lev = 123

  // Valid LockfileEdgeValue (template literal type)
  lev = `prod ^1.0.0 ${toDepId}` as LockfileEdgeValue
  lev = 'dev ^2.0.0 MISSING' as LockfileEdgeValue
  lev = `opt ~1.5.0 ${toDepId}` as LockfileEdgeValue

  t.pass('all lockfile type checks passed')
  t.end()
})

t.test('lockfile flag utilities', t => {
  t.test('getFlagNumFromNode', async t => {
    t.equal(getFlagNumFromNode({}), LockfileNodeFlagNone, 'no flags')
    t.equal(
      getFlagNumFromNode({ dev: false, optional: false }),
      LockfileNodeFlagNone,
      'explicit false flags',
    )
    t.equal(
      getFlagNumFromNode({ optional: true }),
      LockfileNodeFlagOptional,
      'optional only',
    )
    t.equal(
      getFlagNumFromNode({ dev: true }),
      LockfileNodeFlagDev,
      'dev only',
    )
    t.equal(
      getFlagNumFromNode({ dev: true, optional: true }),
      LockfileNodeFlagDevOptional,
      'dev and optional',
    )
    t.equal(
      getFlagNumFromNode({ dev: false, optional: true }),
      LockfileNodeFlagOptional,
      'optional with explicit dev false',
    )
    t.equal(
      getFlagNumFromNode({ dev: true, optional: false }),
      LockfileNodeFlagDev,
      'dev with explicit optional false',
    )
  })

  t.test('getBooleanFlagsFromNum', async t => {
    t.strictSame(
      getBooleanFlagsFromNum(LockfileNodeFlagNone),
      { dev: false, optional: false },
      'no flags',
    )
    t.strictSame(
      getBooleanFlagsFromNum(LockfileNodeFlagOptional),
      { dev: false, optional: true },
      'optional only',
    )
    t.strictSame(
      getBooleanFlagsFromNum(LockfileNodeFlagDev),
      { dev: true, optional: false },
      'dev only',
    )
    t.strictSame(
      getBooleanFlagsFromNum(LockfileNodeFlagDevOptional),
      { dev: true, optional: true },
      'dev and optional',
    )
  })

  t.test('flag constants', async t => {
    t.equal(LockfileNodeFlagNone, 0, 'none flag value')
    t.equal(LockfileNodeFlagOptional, 1, 'optional flag value')
    t.equal(LockfileNodeFlagDev, 2, 'dev flag value')
    t.equal(LockfileNodeFlagDevOptional, 3, 'dev optional flag value')
  })

  t.test('roundtrip flag conversion', async t => {
    const testCases = [
      { dev: false, optional: false },
      { dev: true, optional: false },
      { dev: false, optional: true },
      { dev: true, optional: true },
    ]

    for (const testCase of testCases) {
      const flagNum = getFlagNumFromNode(testCase)
      const roundtrip = getBooleanFlagsFromNum(flagNum)
      t.strictSame(
        roundtrip,
        testCase,
        `roundtrip for ${JSON.stringify(testCase)}`,
      )
    }
  })

  t.end()
})

t.test('lockfile type constraints', t => {
  // Test that LockfileNode tuple has correct constraints
  const validNode: LockfileNode = [
    1, // flags: LockfileNodeFlags
    'test-pkg', // name: string | null
    'sha512-abc==' as Integrity, // integrity: Integrity | null
    'https://example.com/pkg.tgz', // resolved: string | null
    '/path/to/pkg', // location: string | null
    { name: 'test-pkg', version: '1.0.0' }, // manifest: Manifest | null
    { name: 'test-pkg', version: '1.0.0' }, // rawManifest: Manifest | null
  ]

  // Test accessing tuple elements
  const [
    flags,
    name,
    integrity,
    resolved,
    location,
    manifest,
    rawManifest,
  ] = validNode
  t.equal(typeof flags, 'number', 'flags is number')
  t.ok(flags >= 0 && flags <= 3, 'flags in valid range')
  t.equal(typeof name, 'string', 'name is string')
  t.equal(typeof integrity, 'string', 'integrity is string')
  t.equal(typeof resolved, 'string', 'resolved is string')
  t.equal(typeof location, 'string', 'location is string')
  t.equal(typeof manifest, 'object', 'manifest is object')
  t.equal(typeof rawManifest, 'object', 'rawManifest is object')

  // Test minimal node
  const minimalNode: LockfileNode = [0]
  const [minFlags] = minimalNode
  t.equal(minFlags, 0, 'minimal node has flags')

  // Test that LockfileData options can include modifiers
  const lockfileWithModifiers: LockfileData = {
    lockfileVersion: 0,
    options: {
      registries: { npm: 'https://registry.npmjs.org/' },
      modifiers: {
        ':root > #foo': '2.0.0',
        ':root > #bar': '1.5.0',
      },
    },
    nodes: {},
    edges: {},
  }
  t.ok(
    lockfileWithModifiers.options.modifiers,
    'modifiers can be included in options',
  )
  t.equal(
    typeof lockfileWithModifiers.options.modifiers,
    'object',
    'modifiers is object',
  )

  // Test that LockfileData options modifiers can be undefined
  const lockfileWithoutModifiers: LockfileData = {
    lockfileVersion: 0,
    options: {
      registries: { npm2: 'https://registry.npmjs.org/' },
      modifiers: undefined,
    },
    nodes: {},
    edges: {},
  }
  t.equal(
    lockfileWithoutModifiers.options.modifiers,
    undefined,
    'modifiers can be undefined',
  )

  t.end()
})
