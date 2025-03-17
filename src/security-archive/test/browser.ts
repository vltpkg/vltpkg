import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id/browser'
import { SecurityArchive } from '../src/browser.ts'

const json = {
  '··english-days@1.0.0': {
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
  '··@ruyadorno§foo@1.0.0': {
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
    },
    alerts: [],
    batchIndex: 1,
  },
}

t.test('SecurityArchive.load', async t => {
  const archive = SecurityArchive.load(json)
  t.strictSame(
    archive.get(
      joinDepIDTuple(['registry', '', 'english-days@1.0.0']),
    )!.name,
    'english-days',
    'should load have loaded security data',
  )

  await t.test('empty archive', async t => {
    const archive = SecurityArchive.load({})
    t.strictSame(archive.size, 0, 'should have an empty archive')
  })
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
