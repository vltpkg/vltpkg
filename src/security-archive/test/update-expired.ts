import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Readable } from 'node:stream'
import t from 'tap'
import { joinDepIDTuple, baseDepID } from '@vltpkg/dep-id'
import { main } from '../src/update-expired.ts'
import type { UpdateExpiredPayload } from '../src/update-expired.ts'
import { SecurityArchive } from '../src/index.ts'

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

/** Create a Readable stream from a JSON payload */
const payloadStream = (payload: UpdateExpiredPayload): Readable => {
  const stream = new Readable()
  stream.push(JSON.stringify(payload))
  stream.push(null)
  return stream
}

/** Initialize a test database with the cache table and seed data */
const initDB = (
  dbPath: string,
  entries: {
    depID: string
    report: string
    start: number
    ttl: number
  }[],
): DatabaseSync => {
  const db = new DatabaseSync(dbPath)
  db.exec(
    'CREATE TABLE IF NOT EXISTS cache ' +
      '(depID TEXT PRIMARY KEY, report TEXT, ttl INTEGER, start INTEGER) ' +
      'WITHOUT ROWID',
  )
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA synchronous = NORMAL')
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO cache (depID, report, start, ttl) VALUES (?, ?, ?, ?)',
  )
  for (const entry of entries) {
    stmt.run(entry.depID, entry.report, entry.start, entry.ttl)
  }
  return db
}

t.test('update-expired main()', async t => {
  await t.test('updates expired entries in database', async t => {
    const dir = t.testdir()
    const dbPath = resolve(dir, 'test.db')
    const englishDaysId = joinDepIDTuple([
      'registry',
      'npm',
      'english-days@1.0.0',
    ])

    // Seed the database with an expired entry
    const expiredStart =
      Date.now() - SecurityArchive.defaultTtl - 1000
    const db = initDB(dbPath, [
      {
        depID: englishDaysId,
        report: JSON.stringify(englishDaysReport),
        start: expiredStart,
        ttl: SecurityArchive.defaultTtl,
      },
    ])

    // Mock fetch to return updated data
    t.intercept(global, 'fetch', {
      value: async () =>
        ({
          ok: true,
          status: 200,
          text: async () =>
            `${JSON.stringify(englishDaysUpdatedReport)}\n`,
        }) as unknown as Response,
    })

    const payload: UpdateExpiredPayload = {
      dbPath,
      retries: 3,
      ttl: SecurityArchive.defaultTtl,
      expired: [
        {
          depID: baseDepID(englishDaysId),
          name: 'english-days',
          version: '1.0.0',
        },
      ],
    }

    const result = await main(payloadStream(payload))
    t.equal(result, true, 'should return true on success')

    // Verify the database was updated
    const dbRead = db.prepare(
      'SELECT report FROM cache WHERE depID = ?',
    )
    const row = dbRead.get(englishDaysId) as { report: string }
    const updatedEntry = JSON.parse(row.report)

    t.equal(
      updatedEntry.score.maintenance,
      englishDaysUpdatedReport.score.maintenance,
      'should have updated maintenance score',
    )
    t.equal(
      updatedEntry.alerts.length,
      englishDaysUpdatedReport.alerts.length,
      'should have updated alerts count',
    )

    // Verify average score recalculation
    const expectedAvg = Number(
      (
        (englishDaysUpdatedReport.score.license +
          englishDaysUpdatedReport.score.maintenance +
          englishDaysUpdatedReport.score.quality +
          englishDaysUpdatedReport.score.supplyChain +
          englishDaysUpdatedReport.score.vulnerability) /
        5
      ).toFixed(2),
    )
    t.equal(
      updatedEntry.score.overall,
      expectedAvg,
      'should recalculate average score',
    )

    db.close()
  })

  await t.test(
    'handles multiple expired entries in a single batch',
    async t => {
      const dir = t.testdir()
      const dbPath = resolve(dir, 'test.db')
      const englishDaysId = joinDepIDTuple([
        'registry',
        'npm',
        'english-days@1.0.0',
      ])
      const fooId = joinDepIDTuple([
        'registry',
        'npm',
        '@ruyadorno/foo@1.0.0',
      ])

      const expiredStart =
        Date.now() - SecurityArchive.defaultTtl - 1000
      const db = initDB(dbPath, [
        {
          depID: englishDaysId,
          report: JSON.stringify(englishDaysReport),
          start: expiredStart,
          ttl: SecurityArchive.defaultTtl,
        },
        {
          depID: fooId,
          report: JSON.stringify(fooReport),
          start: expiredStart,
          ttl: SecurityArchive.defaultTtl,
        },
      ])

      t.intercept(global, 'fetch', {
        value: async () =>
          ({
            ok: true,
            status: 200,
            text: async () =>
              `${JSON.stringify(englishDaysUpdatedReport)}\n${JSON.stringify(fooReport)}\n`,
          }) as unknown as Response,
      })

      const payload: UpdateExpiredPayload = {
        dbPath,
        retries: 3,
        ttl: SecurityArchive.defaultTtl,
        expired: [
          {
            depID: baseDepID(englishDaysId),
            name: 'english-days',
            version: '1.0.0',
          },
          {
            depID: baseDepID(fooId),
            name: '@ruyadorno/foo',
            version: '1.0.0',
          },
        ],
      }

      const result = await main(payloadStream(payload))
      t.equal(result, true, 'should return true')

      // Verify both entries were updated
      const readEntry = db.prepare(
        'SELECT report, start FROM cache WHERE depID = ?',
      )
      const englishRow = readEntry.get(englishDaysId) as {
        report: string
        start: number
      }
      t.ok(
        englishRow.start > expiredStart,
        'english-days start should be refreshed',
      )

      const fooRow = readEntry.get(fooId) as {
        report: string
        start: number
      }
      t.ok(
        fooRow.start > expiredStart,
        'foo start should be refreshed',
      )

      db.close()
    },
  )

  await t.test('returns false for empty expired list', async t => {
    const payload: UpdateExpiredPayload = {
      dbPath: '/tmp/unused.db',
      retries: 3,
      ttl: SecurityArchive.defaultTtl,
      expired: [],
    }

    const result = await main(payloadStream(payload))
    t.equal(result, false, 'should return false for empty list')
  })

  await t.test(
    'returns false when API returns no matching data',
    async t => {
      const dir = t.testdir()
      const dbPath = resolve(dir, 'test.db')
      const englishDaysId = joinDepIDTuple([
        'registry',
        'npm',
        'english-days@1.0.0',
      ])

      const db = initDB(dbPath, [
        {
          depID: englishDaysId,
          report: JSON.stringify(englishDaysReport),
          start: Date.now() - SecurityArchive.defaultTtl - 1000,
          ttl: SecurityArchive.defaultTtl,
        },
      ])

      // API returns empty response
      t.intercept(global, 'fetch', {
        value: async () =>
          ({
            ok: true,
            status: 200,
            text: async () => '\n',
          }) as unknown as Response,
      })

      const payload: UpdateExpiredPayload = {
        dbPath,
        retries: 3,
        ttl: SecurityArchive.defaultTtl,
        expired: [
          {
            depID: baseDepID(englishDaysId),
            name: 'english-days',
            version: '1.0.0',
          },
        ],
      }

      const result = await main(payloadStream(payload))
      t.equal(result, false, 'should return false when no data')

      db.close()
    },
  )

  await t.test(
    'warns about extraneous packages in response',
    async t => {
      const dir = t.testdir()
      const dbPath = resolve(dir, 'test.db')
      const englishDaysId = joinDepIDTuple([
        'registry',
        'npm',
        'english-days@1.0.0',
      ])

      const db = initDB(dbPath, [
        {
          depID: englishDaysId,
          report: JSON.stringify(englishDaysReport),
          start: Date.now() - SecurityArchive.defaultTtl - 1000,
          ttl: SecurityArchive.defaultTtl,
        },
      ])

      // API returns extraneous data not in our expired list
      t.intercept(global, 'fetch', {
        value: async () =>
          ({
            ok: true,
            status: 200,
            text: async () =>
              `${JSON.stringify({ ...englishDaysUpdatedReport, name: 'unknown-pkg', version: '9.9.9' })}\n`,
          }) as unknown as Response,
      })

      const warn = t.capture(console, 'warn').args

      const payload: UpdateExpiredPayload = {
        dbPath,
        retries: 3,
        ttl: SecurityArchive.defaultTtl,
        expired: [
          {
            depID: baseDepID(englishDaysId),
            name: 'english-days',
            version: '1.0.0',
          },
        ],
      }

      const result = await main(payloadStream(payload))
      t.equal(result, false, 'should return false for no matching')

      const warnings = warn()
      t.equal(warnings.length, 1, 'should warn once')
      t.match(
        warnings[0]?.[0],
        /failed to find entry for unknown-pkg@9.9.9/,
        'should warn about extraneous package',
      )

      db.close()
    },
  )

  await t.test('propagates fetch errors', async t => {
    const dir = t.testdir()
    const dbPath = resolve(dir, 'test.db')
    const englishDaysId = joinDepIDTuple([
      'registry',
      'npm',
      'english-days@1.0.0',
    ])

    initDB(dbPath, [
      {
        depID: englishDaysId,
        report: JSON.stringify(englishDaysReport),
        start: Date.now() - SecurityArchive.defaultTtl - 1000,
        ttl: SecurityArchive.defaultTtl,
      },
    ])

    t.intercept(global, 'fetch', {
      value: async () =>
        ({
          ok: false,
          status: 500,
          text: async () => '',
        }) as unknown as Response,
    })

    const payload: UpdateExpiredPayload = {
      dbPath,
      retries: 0,
      ttl: SecurityArchive.defaultTtl,
      expired: [
        {
          depID: baseDepID(englishDaysId),
          name: 'english-days',
          version: '1.0.0',
        },
      ],
    }

    await t.rejects(
      main(payloadStream(payload)),
      /Failed to fetch security data/,
      'should propagate fetch errors',
    )
  })

  await t.test('creates missing directories for db', async t => {
    const dir = t.testdir()
    const dbPath = resolve(dir, 'nested', 'dir', 'test.db')
    const englishDaysId = joinDepIDTuple([
      'registry',
      'npm',
      'english-days@1.0.0',
    ])

    // Mock fetch
    t.intercept(global, 'fetch', {
      value: async () =>
        ({
          ok: true,
          status: 200,
          text: async () =>
            `${JSON.stringify(englishDaysUpdatedReport)}\n`,
        }) as unknown as Response,
    })

    const payload: UpdateExpiredPayload = {
      dbPath,
      retries: 3,
      ttl: SecurityArchive.defaultTtl,
      expired: [
        {
          depID: baseDepID(englishDaysId),
          name: 'english-days',
          version: '1.0.0',
        },
      ],
    }

    const result = await main(payloadStream(payload))
    t.equal(result, true, 'should succeed')

    // Verify DB was created
    const db = new DatabaseSync(dbPath)
    const rows = db.prepare('SELECT depID FROM cache').all() as {
      depID: string
    }[]
    t.equal(rows.length, 1, 'should have one entry')
    db.close()
  })
})
