import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id/browser'
import type { DepID } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/types'
import type { SpecOptions } from '@vltpkg/spec/browser'
import { SecurityArchive, usesNpmRegistry } from '../src/browser.ts'

const json = {
  [joinDepIDTuple(['registry', 'npm', 'english-days@1.0.0'])]: {
    id: '15713076833',
    author: ['wesleytodd'],
    size: 1632,
    type: 'npm',
    name: 'english-days',
    version: '1.0.0',
    license: 'ISC',
    licenseDetails: [],
    score: {
      license: 1,
      maintenance: 0.75,
      overall: 0.55,
      quality: 0.55,
      supplyChain: 0.6,
      vulnerability: 1,
      average: 0.77,
    },
    alerts: [
      {
        key: 'QG35N0uHm_B_BG4Bc_OlJW3rR2XiTPlFZMNZjm-G1Ufg',
        type: 'unmaintained',
        severity: 'low',
        category: 'maintenance',
        props: {
          lastPublish: '2016-02-17T02:52:33.918Z',
        },
      },
      {
        key: 'Q2JOM20TNSY962_q6c1goNPMN46sXiFfk0X_8YrIplsU',
        type: 'trivialPackage',
        severity: 'middle',
        category: 'supplyChainRisk',
        props: {
          linesOfCode: 9,
        },
      },
      {
        key: 'Q1hdrp66HKyFF0sBwU7tGypHUBcwpNViZKOQHEKyvIMo',
        type: 'unpopularPackage',
        severity: 'middle',
        category: 'quality',
      },
    ],
    batchIndex: 0,
  },
  '~~@ruyadorno+foo@1.0.0': {
    id: '99923218962',
    author: ['ruyadorno'],
    size: 13003,
    type: 'npm',
    namespace: '@ruyadorno',
    name: 'foo',
    version: '1.0.0',
    license: 'MIT',
    licenseDetails: [],
    score: {
      license: 1,
      maintenance: 0.84,
      overall: 0.83,
      quality: 0.83,
      supplyChain: 0.99,
      vulnerability: 1,
      average: 0.93,
    },
    alerts: [],
    batchIndex: 1,
  },
}

t.test('SecurityArchive.load', async t => {
  const archive = SecurityArchive.load(json)
  if (!archive) {
    throw new Error('expected archive to be loaded')
  }
  t.strictSame(
    archive.get(
      joinDepIDTuple(['registry', 'npm', 'english-days@1.0.0']),
    )!.name,
    'english-days',
    'should load have loaded security data',
  )

  const extraId = joinDepIDTuple([
    'registry',
    'npm',
    'english-days@1.0.0',
    'peer.0123456789abcdef',
  ])
  t.equal(
    archive.has(extraId),
    true,
    'has() matches a peer-suffixed DepID',
  )
  t.equal(
    archive.get(extraId)?.name,
    'english-days',
    'get() matches a peer-suffixed DepID',
  )
  const stored = archive.get(extraId)
  t.ok(stored)
  archive.delete(extraId)
  t.equal(archive.has(extraId), false)
  archive.set(extraId, stored!)
  t.equal(
    archive.has(
      joinDepIDTuple(['registry', 'npm', 'english-days@1.0.0']),
    ),
    true,
  )

  await t.test('empty archive', async t => {
    const archive = SecurityArchive.load({})
    if (!archive) {
      throw new Error('expected archive to be loaded')
    }
    t.strictSame(archive.size, 0, 'should have an empty archive')
  })
})

t.test('no archive', async t => {
  const archive = SecurityArchive.load(undefined)
  t.strictSame(archive, undefined, 'should return undefined')
})

t.test('load bad data', async t => {
  t.throws(
    () => SecurityArchive.load('borked data'),
    /Invalid security archive JSON/,
    'should throw on invalid data',
  )

  t.throws(
    () => SecurityArchive.load({ also: 'borked data' }),
    /Invalid security archive JSON/,
    'should throw on invalid data obj',
  )
})

const nodeWith = (id: DepID, options: SpecOptions = {}): NodeLike =>
  ({
    id,
    options,
  }) as NodeLike

t.test('usesNpmRegistry', async t => {
  t.equal(
    usesNpmRegistry(
      nodeWith(joinDepIDTuple(['git', 'github:user/repo', 'main'])),
    ),
    false,
    'git DepID is ineligible',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(joinDepIDTuple(['registry', 'npm', 'foo@1.0.0']), {
        registries: { npm: 'https://registry.npmjs.org/' },
      }),
    ),
    true,
    'npm alias pointing at registry.npmjs.org is eligible',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(joinDepIDTuple(['registry', 'unknown', 'foo@1.0.0']), {
        registries: { npm: 'https://registry.npmjs.org/' },
      }),
    ),
    false,
    'unknown alias is ineligible',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(joinDepIDTuple(['registry', 'npm', 'foo@1.0.0']), {
        registries: {
          npm: 'https://registry.vlt.io/acct/npm/',
        },
      }),
    ),
    true,
    'npm alias matching a configured mirror is eligible',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(joinDepIDTuple(['registry', 'custom', 'foo@1.0.0']), {
        registries: {
          npm: 'https://registry.npmjs.org/',
          custom: 'http://example.com',
        },
      }),
    ),
    false,
    'alias pointing at an unrelated URL is ineligible',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(
        joinDepIDTuple([
          'registry',
          'https://registry.npmjs.org/',
          'foo@1.0.0',
        ]),
      ),
    ),
    true,
    'URL-form DepID for registry.npmjs.org is eligible',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(
        joinDepIDTuple([
          'registry',
          'https://registry.vlt.io/acct/npm/',
          'foo@1.0.0',
        ]),
        {
          registries: {
            npm: 'https://registry.vlt.io/acct/npm/',
          },
        },
      ),
    ),
    true,
    'URL-form DepID matching registries.npm is eligible',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(joinDepIDTuple(['registry', 'npm', 'foo@1.0.0']), {
        registries: { npm: 'https://registry.vlt.io/acct/npm' },
      }),
    ),
    true,
    'registries.npm without a trailing slash still matches',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(
        joinDepIDTuple([
          'registry',
          'https://registry.npmjs.org',
          'foo@1.0.0',
        ]),
      ),
    ),
    true,
    'URL-form DepID for registry.npmjs.org without trailing slash is eligible',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(
        joinDepIDTuple([
          'registry',
          'https://registry.vlt.io/acct/npm/',
          'foo@1.0.0',
        ]),
      ),
    ),
    false,
    'URL-form mirror DepID with no registries.npm is ineligible',
  )
  t.equal(
    usesNpmRegistry(
      nodeWith(joinDepIDTuple(['registry', 'npm', 'foo@1.0.0']), {
        registries: { npm: '' },
      }),
    ),
    false,
    'empty registries.npm URL is ineligible',
  )
})
