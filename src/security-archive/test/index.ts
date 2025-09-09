import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import t from 'tap'
import { joinDepIDTuple, baseDepID } from '@vltpkg/dep-id'
import { SecurityArchive } from '../src/index.ts'
import {
  getSimpleReportGraph,
  newGraph,
  newNode,
} from './fixtures/graph.ts'
import type { PackageReportData } from '../src/types.ts'

const fooReport = {
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
    overall: 0.93,
    quality: 0.83,
    supplyChain: 0.99,
    vulnerability: 1,
  },
  alerts: [],
  batchIndex: 1,
}

const fooNewReport = {
  id: '99923218963',
  author: ['ruyadorno'],
  size: 13013,
  type: 'npm',
  namespace: '@ruyadorno',
  name: 'foo',
  version: '1.0.1',
  license: 'MIT',
  licenseDetails: [],
  score: {
    license: 1,
    maintenance: 0.84,
    overall: 0.93,
    quality: 0.83,
    supplyChain: 0.99,
    vulnerability: 1,
  },
  alerts: [],
  batchIndex: 1,
}

const englishDaysReport = {
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
    overall: 0.78,
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
      props: { lastPublish: '2016-02-17T02:52:33.918Z' },
    },
    {
      key: 'Q2JOM20TNSY962_q6c1goNPMN46sXiFfk0X_8YrIplsU',
      type: 'trivialPackage',
      severity: 'middle',
      category: 'supplyChainRisk',
      props: { linesOfCode: 9 },
    },
    {
      key: 'Q1hdrp66HKyFF0sBwU7tGypHUBcwpNViZKOQHEKyvIMo',
      type: 'unpopularPackage',
      severity: 'middle',
      category: 'quality',
    },
  ],
  batchIndex: 0,
}

// New updated version of englishDaysReport for testing stale-while-revalidate
const englishDaysUpdatedReport = {
  ...englishDaysReport,
  id: '15713076834',
  score: {
    ...englishDaysReport.score,
    maintenance: 0.85,
    overall: 0.65,
  },
  alerts: [...englishDaysReport.alerts.slice(1)],
}

t.test('map-like', async t => {
  const archive = new SecurityArchive()
  const id = joinDepIDTuple(['registry', '', 'bar'])
  archive.set(id, { name: 'bar' } as PackageReportData)
  t.strictSame(archive.has(id), true)
  t.strictSame(archive.get(id), { name: 'bar' })
  archive.delete(id)
  t.strictSame(archive.get(id), undefined)
})

t.test('SecurityArchive.refresh', async t => {
  t.capture(console, 'warn').args
  const dir = t.testdir()
  const graph = getSimpleReportGraph()
  const nodes = [...graph.nodes.values()]
  t.intercept(global, 'fetch', {
    value: async () =>
      ({
        ok: true,
        status: 200,
        text: async () => `${JSON.stringify(fooReport)}
${JSON.stringify(englishDaysReport)}
`,
      }) as unknown as Response,
  })
  const path = resolve(dir, 'test.db')
  const archive = await SecurityArchive.start({
    nodes,
    path,
  })

  t.strictSame(
    archive.get(
      joinDepIDTuple(['registry', '', '@ruyadorno/foo@1.0.0']),
    ),
    fooReport,
    'should have loaded API response into the in-memory archive',
  )

  const db = new DatabaseSync(path)
  const dbRead = db.prepare('SELECT depID, report FROM cache')
  const dbDump: Record<string, any> = {}
  const readData = dbRead.all() as { depID: string; report: any }[]
  for (const { depID, report } of readData) {
    dbDump[depID] = JSON.parse(report)
  }
  t.matchSnapshot(
    dbDump,
    'should have persisted the API response into the database',
  )

  t.matchSnapshot(
    archive.toJSON(),
    'should output a JSON representation of the current archive',
  )

  // Updates the fetch mock to return a new version of foo
  t.intercept(global, 'fetch', {
    value: async () =>
      ({
        ok: true,
        status: 200,
        text: async () => `${JSON.stringify(fooNewReport)}
${JSON.stringify(englishDaysReport)}
`,
      }) as unknown as Response,
  })

  await archive.refresh({ nodes })

  // here we test that retrieving data for foo still returns the old
  // version, since that was loaded from the db instead and is still valid
  t.strictSame(
    archive.get(
      joinDepIDTuple(['registry', '', '@ruyadorno/foo@1.0.0']),
    ),
    fooReport,
    'should have loaded API response from db',
  )

  // check pruning bad entries from the db
  t.intercept(global, 'fetch', {
    value: async () =>
      ({
        ok: true,
        status: 200,
        text: async () => '',
      }) as unknown as Response,
  })

  const dbWrite = db.prepare(
    'INSERT OR REPLACE INTO cache (depID, report, start, ttl) ' +
      'VALUES (?, ?, ?, ?)',
  )
  dbWrite.run(
    joinDepIDTuple(['registry', '', '@ruyadorno/foo@1.0.0']),
    'borked data',
    Date.now(),
    SecurityArchive.defaultTtl,
  )

  await archive.refresh({ nodes })

  const readBorked = db.prepare('SELECT depID, report FROM cache')
  const dumpBorked: Record<string, any> = {}
  const borkedData = readBorked.all() as {
    depID: string
    report: any
  }[]
  for (const { depID, report } of borkedData) {
    dumpBorked[depID] = JSON.parse(report)
  }
  t.matchSnapshot(
    dumpBorked,
    'should have removed the borked entry from the database',
  )

  db.close()

  await t.test('extraneous package in API response', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'missing.db')

    // fetch mock returns a response with an extraneous pkg report
    t.intercept(global, 'fetch', {
      value: async () =>
        ({
          ok: true,
          status: 200,
          text: async () => `${JSON.stringify(fooReport)}
${JSON.stringify(englishDaysReport)}
${JSON.stringify({
  id: '99923218964',
  type: 'npm',
  name: 'extraneous',
  version: '1.0.0',
})}
`,
        }) as unknown as Response,
    })

    const warn = t.capture(console, 'warn').args
    const archive = new SecurityArchive({ path })
    await archive.refresh({ nodes })

    t.strictSame(
      warn(),
      [
        [
          'security-archive: failed to find node for extraneous@1.0.0 found in the response.',
        ],
      ],
      'should warn about the extraneous package',
    )
  })

  await t.test('missing cache folder', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'missing-folder/new.db')

    const archive = new SecurityArchive({ path })
    await archive.refresh({ nodes })
    t.ok('cache folder created')
  })

  await t.test('bad api response', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'missing.db')

    // Updates the fetch mock to return a new version of foo
    t.intercept(global, 'fetch', {
      value: async () =>
        ({
          ok: false,
          status: 500,
          text: async () => '',
        }) as unknown as Response,
    })

    const archive = new SecurityArchive({ path, retries: 0 })
    await t.rejects(
      archive.refresh({ nodes }),
      /Failed to fetch security data/,
      'should throw an error when the API response is invalid',
    )
  })

  await t.test('missing api response', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'missing.db')

    // Updates the fetch mock to return a new version of foo
    t.intercept(global, 'fetch', {
      value: async () =>
        ({
          ok: false,
          status: 404,
          text: async () => 'Missing API',
        }) as unknown as Response,
    })

    const archive = new SecurityArchive({ path })
    await t.rejects(
      archive.refresh({ nodes }),
      /Missing API/,
      'should abort retries',
    )
  })

  await t.test('stale-while-revalidate cache', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'stale-revalidate.db')
    const graph = getSimpleReportGraph()
    const nodes = [...graph.nodes.values()]

    // Initial fetch response
    t.intercept(global, 'fetch', {
      value: async () =>
        ({
          ok: true,
          status: 200,
          text: async () => `${JSON.stringify(fooReport)}
${JSON.stringify(englishDaysReport)}
`,
        }) as unknown as Response,
    })

    // Create an initial archive and populate it
    await SecurityArchive.start({
      nodes,
      path,
    })

    // Open the database directly to manipulate entries for testing
    const db = new DatabaseSync(path)

    // Manually mark the englishDays entry as expired by setting its TTL to be in the past
    const englishDaysId = joinDepIDTuple([
      'registry',
      '',
      'english-days@1.0.0',
    ])
    const currentTime = Date.now()
    const expiredStart =
      currentTime - SecurityArchive.defaultTtl - 1000 // 1 second past expiration

    const dbWrite = db.prepare(
      'UPDATE cache SET start = ? WHERE depID = ?',
    )
    dbWrite.run(expiredStart, englishDaysId)

    // Setup the fetch mock to return updated data for the background refresh
    let fetchCallCount = 0
    t.intercept(global, 'fetch', {
      value: async () => {
        fetchCallCount++
        return {
          ok: true,
          status: 200,
          text: async () => `${JSON.stringify(englishDaysUpdatedReport)}
`,
        } as unknown as Response
      },
    })

    // Create a new archive that should load the expired entry and trigger revalidation
    const refreshedArchive = new SecurityArchive({ path })
    await refreshedArchive.refresh({ nodes })

    // Initially, we should get the stale data while revalidation happens in background
    const initialData = refreshedArchive.get(englishDaysId)
    t.strictSame(
      initialData,
      englishDaysReport,
      'should initially return the stale data while revalidating',
    )

    // Wait for the background revalidation to complete
    // This is a bit hacky but allows us to wait for the background promise to complete
    await new Promise(resolve => setTimeout(resolve, 200))

    // Verify fetch was called to revalidate the expired entry
    t.equal(
      fetchCallCount,
      1,
      'should have made a fetch request to revalidate expired entry',
    )

    // Query the database directly to verify the update happened
    const dbRead = db.prepare(
      'SELECT report FROM cache WHERE depID = ?',
    )
    const { report } = dbRead.get(englishDaysId) as { report: string }
    const updatedEntry = JSON.parse(report)

    t.strictSame(
      updatedEntry.score.maintenance,
      englishDaysUpdatedReport.score.maintenance,
      'should have updated the entry in the database with new data',
    )

    t.equal(
      updatedEntry.alerts.length,
      englishDaysUpdatedReport.alerts.length,
      'should have updated the alerts in the database with new data',
    )

    // Create another new archive to verify it loads the updated entry
    const finalArchive = new SecurityArchive({ path })
    await finalArchive.refresh({ nodes })

    const finalData = finalArchive.get(englishDaysId)
    t.strictSame(
      finalData?.score.maintenance,
      englishDaysUpdatedReport.score.maintenance,
      'should load the updated data from database after revalidation',
    )

    db.close()
  })

  await t.test('average score calculation', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'average-score.db')
    const graph = getSimpleReportGraph()
    const nodes = [...graph.nodes.values()]

    // Mock response with scores that will result in a specific average
    const testReport = {
      ...fooReport,
      score: {
        license: 0.75,
        maintenance: 0.85,
        quality: 0.9,
        supplyChain: 0.95,
        vulnerability: 0.7,
      },
    }

    t.intercept(global, 'fetch', {
      value: async () =>
        ({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(testReport) + '\n',
        }) as unknown as Response,
    })

    const archive = await SecurityArchive.start({
      nodes,
      path,
    })

    const storedData = archive.get(
      joinDepIDTuple(['registry', '', '@ruyadorno/foo@1.0.0']),
    )

    // Verify the average score is calculated correctly (0.75 + 0.85 + 0.90 + 0.95 + 0.70) / 5 = 0.83
    t.ok(storedData, 'should have stored data')
    t.equal(
      storedData!.score.overall,
      0.83,
      'should calculate average score correctly with 2 decimal places',
    )
  })
})

t.test('DepID normalization', async t => {
  const dir = t.testdir()
  const path = resolve(dir, 'normalization.db')

  // Create a proper graph with a node that has extra information in its DepID
  const graph = newGraph('test-project')
  const addNode = newNode(graph)

  const depIDWithExtra = joinDepIDTuple([
    'registry',
    '',
    '@ruyadorno/foo@1.0.0',
    'extra-peer-dep-info',
  ])
  const baseDepIDValue = baseDepID(depIDWithExtra)

  const fooNode = addNode('@ruyadorno/foo')
  fooNode.id = depIDWithExtra // Node itself can have extra info
  // But graph stores nodes using normalized DepID keys
  graph.nodes.set(baseDepIDValue, fooNode)
  const nodes = [...graph.nodes.values()]

  // Mock fetch response
  t.intercept(global, 'fetch', {
    value: async () =>
      ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(fooReport) + '\n',
      }) as unknown as Response,
  })

  const archive = await SecurityArchive.start({
    nodes,
    path,
  })

  t.test('should normalize DepID in cache', async t => {
    // The cache should store the normalized (base) DepID, not the one with extra info
    t.strictSame(
      archive.has(baseDepIDValue),
      true,
      'should find the normalized DepID in cache',
    )

    t.strictSame(
      archive.has(depIDWithExtra),
      false,
      'should not find the non-normalized DepID in cache',
    )

    t.strictSame(
      archive.get(baseDepIDValue),
      fooReport,
      'should retrieve data using normalized DepID',
    )

    t.strictSame(
      archive.get(depIDWithExtra),
      undefined,
      'should not retrieve data using non-normalized DepID',
    )
  })

  t.test('should normalize DepID in database', async t => {
    // Check that the database stores the normalized DepID
    const db = new DatabaseSync(path)
    const dbRead = db.prepare('SELECT depID, report FROM cache')
    const dbData = dbRead.all() as { depID: string; report: string }[]

    t.equal(dbData.length, 1, 'should have one entry in database')
    t.ok(dbData[0], 'should have a database entry')
    t.equal(
      dbData[0]!.depID,
      baseDepIDValue,
      'should store normalized DepID in database',
    )

    // Verify the stored data is correct
    const storedData = JSON.parse(dbData[0]!.report)
    t.strictSame(
      storedData,
      fooReport,
      'should store correct data for normalized DepID',
    )

    db.close()
  })

  t.test('should handle lookup with mixed DepID formats', async t => {
    // Create a fresh archive to test loading from database
    const freshArchive = new SecurityArchive({ path })
    await freshArchive.refresh({ nodes })

    // Should find the data using the normalized DepID
    t.strictSame(
      freshArchive.has(baseDepIDValue),
      true,
      'should find normalized DepID after loading from database',
    )

    t.strictSame(
      freshArchive.get(baseDepIDValue),
      fooReport,
      'should retrieve data using normalized DepID after loading from database',
    )
  })

  t.test('should normalize different DepID types', async t => {
    // Test git DepID normalization
    const gitDepIDWithExtra = joinDepIDTuple([
      'git',
      'github:user/repo',
      'branch-name',
      'git-extra-info',
    ])
    const gitBaseDepID = baseDepID(gitDepIDWithExtra)

    t.not(
      gitDepIDWithExtra,
      gitBaseDepID,
      'git DepID with extra should differ from base',
    )

    // Test remote DepID normalization
    const remoteDepIDWithExtra = joinDepIDTuple([
      'remote',
      'https://example.com/package.tgz',
      'remote-extra-info',
    ])
    const remoteBaseDepID = baseDepID(remoteDepIDWithExtra)

    t.not(
      remoteDepIDWithExtra,
      remoteBaseDepID,
      'remote DepID with extra should differ from base',
    )

    // Test that registry DepID normalization works as expected
    const registryDepIDWithExtra = joinDepIDTuple([
      'registry',
      'npm',
      'package@1.0.0',
      'registry-extra-info',
    ])
    const registryBaseDepID = baseDepID(registryDepIDWithExtra)

    t.not(
      registryDepIDWithExtra,
      registryBaseDepID,
      'registry DepID with extra should differ from base',
    )
  })

  t.test(
    'should handle nodes with non-normalized IDs but normalized keys',
    async t => {
      // Test that the system works when the node.id has extra info but graph key is normalized
      const nodeFromGraph = graph.nodes.get(baseDepIDValue)
      t.ok(nodeFromGraph, 'should find node using normalized key')
      t.equal(
        nodeFromGraph!.id,
        depIDWithExtra,
        'node.id should retain extra information',
      )
      t.equal(
        baseDepID(nodeFromGraph!.id),
        baseDepIDValue,
        'baseDepID of node.id should equal the normalized key',
      )
    },
  )
})
