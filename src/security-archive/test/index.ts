import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { SecurityArchive } from '../src/index.ts'
import {
  specOptions,
  getSimpleReportGraph,
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
    overall: 0.83,
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
    maintenance: 0.94,
    overall: 0.93,
    quality: 0.93,
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
  global.fetch = async () =>
    ({
      ok: true,
      status: 200,
      text: async () => `${JSON.stringify(fooReport)}
${JSON.stringify(englishDaysReport)}
`,
    }) as unknown as Response
  const path = resolve(dir, 'test.db')
  const archive = await SecurityArchive.start({
    graph,
    path,
    specOptions,
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
  global.fetch = async () =>
    ({
      ok: true,
      status: 200,
      text: async () => `${JSON.stringify(fooNewReport)}
${JSON.stringify(englishDaysReport)}
`,
    }) as unknown as Response

  await archive.refresh({ graph, specOptions })

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
  global.fetch = async () =>
    ({
      ok: true,
      status: 200,
      text: async () => '',
    }) as unknown as Response

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

  await archive.refresh({ graph, specOptions })

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
    const _fetch = global.fetch
    t.teardown(() => {
      global.fetch = _fetch
    })

    // fetch mock returns a response with an extraneous pkg report
    global.fetch = async () =>
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
      }) as unknown as Response

    const warn = t.capture(console, 'warn').args
    const archive = new SecurityArchive({ path })
    await archive.refresh({ graph, specOptions })

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
    await archive.refresh({ graph, specOptions })
    t.ok('cache folder created')
  })

  await t.test('bad api response', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'missing.db')
    const _fetch = global.fetch
    t.teardown(() => {
      global.fetch = _fetch
    })

    // Updates the fetch mock to return a new version of foo
    global.fetch = async () =>
      ({
        ok: false,
        status: 500,
        text: async () => '',
      }) as unknown as Response

    const archive = new SecurityArchive({ path, retries: 0 })
    await t.rejects(
      archive.refresh({ graph, specOptions }),
      /Failed to fetch security data/,
      'should throw an error when the API response is invalid',
    )
  })

  await t.test('missing api response', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'missing.db')
    const _fetch = global.fetch
    t.teardown(() => {
      global.fetch = _fetch
    })

    // Updates the fetch mock to return a new version of foo
    global.fetch = async () =>
      ({
        ok: false,
        status: 404,
        text: async () => 'Missing API',
      }) as unknown as Response

    const archive = new SecurityArchive({ path })
    await t.rejects(
      archive.refresh({ graph, specOptions }),
      /Missing API/,
      'should abort retries',
    )
  })

  await t.test('stale-while-revalidate cache', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'stale-revalidate.db')
    const graph = getSimpleReportGraph()
    const _fetch = global.fetch
    t.teardown(() => {
      global.fetch = _fetch
    })

    // Initial fetch response
    global.fetch = async () =>
      ({
        ok: true,
        status: 200,
        text: async () => `${JSON.stringify(fooReport)}
${JSON.stringify(englishDaysReport)}
`,
      }) as unknown as Response

    // Create an initial archive and populate it
    await SecurityArchive.start({
      graph,
      path,
      specOptions,
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
    global.fetch = async () => {
      fetchCallCount++
      return {
        ok: true,
        status: 200,
        text: async () => `${JSON.stringify(englishDaysUpdatedReport)}
`,
      } as unknown as Response
    }

    // Create a new archive that should load the expired entry and trigger revalidation
    const refreshedArchive = new SecurityArchive({ path })
    await refreshedArchive.refresh({ graph, specOptions })

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
    await finalArchive.refresh({ graph, specOptions })

    const finalData = finalArchive.get(englishDaysId)
    t.strictSame(
      finalData?.score.maintenance,
      englishDaysUpdatedReport.score.maintenance,
      'should load the updated data from database after revalidation',
    )

    db.close()
  })
})
