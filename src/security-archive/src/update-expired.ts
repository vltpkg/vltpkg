import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import pRetry, { AbortError } from 'p-retry'
import { asDepID, baseDepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { loadPackageJson } from 'package-json-from-dist'
import { asPackageReportData } from './types.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { JSONItemResponse } from './index.ts'
import type EventEmitter from 'node:events'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

const SOCKET_API_V0_URL = 'https://api.socket.dev/v0/purl?alerts=true'
const SOCKET_PUBLIC_API_TOKEN =
  'sktsec_t_--RAN5U4ivauy4w37-6aoKyYPDt5ZbaT5JBVMqiwKo_api'

export const { version } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON,
) as {
  version: string
}

/**
 * Serialized payload sent to the detached process via stdin.
 */
export type UpdateExpiredPayload = {
  /** Path to the sqlite database */
  dbPath: string
  /** Number of retries for fetching remote data */
  retries: number
  /** TTL in ms to use for new entries */
  ttl: number
  /** Expired entries to revalidate */
  expired: ExpiredEntry[]
}

/**
 * Minimal serialized information for each expired entry.
 * Only carries what's needed for the API call + DB write.
 */
export type ExpiredEntry = {
  depID: DepID
  name: string
  version: string
}

/* c8 ignore start */
const isMain = (path?: string) =>
  path === __CODE_SPLIT_SCRIPT_NAME ||
  path === pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).toString()
/* c8 ignore stop */

/**
 * Fetches security information from the socket.dev API.
 */
const retrieveRemoteData = async (
  queue: Set<Record<'purl', string>>,
  retries: number,
): Promise<string> => {
  return pRetry(
    async () => {
      const req = await fetch(SOCKET_API_V0_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${SOCKET_PUBLIC_API_TOKEN}:`).toString('base64url')}`,
          'User-Agent': `@vltpkg/security-archive/${version}`,
        },
        body: JSON.stringify({
          components: Array.from(queue),
        }),
      })
      if (req.status === 404) {
        throw new AbortError('Missing API')
      }
      if (!req.ok || !(req.status >= 200 && req.status <= 299)) {
        throw error('Failed to fetch security data', {
          response: req,
        })
      }
      const str = await req.text()
      return str.trim() + '\n'
    },
    { retries },
  )
}

/**
 * Main entrypoint for the detached process.
 * Reads a JSON payload from stdin, fetches updated security data,
 * and writes it back to the SQLite database.
 */
export const main = async (
  input: EventEmitter = process.stdin,
): Promise<boolean> => {
  const payload = await new Promise<UpdateExpiredPayload>(
    (resolve, reject) => {
      const chunks: Buffer[] = []
      let chunkLen = 0
      input.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        chunkLen += chunk.length
      })
      input.on('end', () => {
        try {
          const raw = Buffer.concat(chunks, chunkLen).toString()
          resolve(JSON.parse(raw) as UpdateExpiredPayload)
        /* c8 ignore start */
        } catch (err) {
          reject(err)
        }
        /* c8 ignore stop */
      })
      /* c8 ignore next */
      input.on('error', reject)
    },
  )

  const { dbPath, retries, ttl, expired } = payload
  if (!expired.length) {
    return false
  }

  // Build purl queue from expired entries
  const expiredQueue = new Set<Record<'purl', string>>()
  // Build a lookup map: name@version -> depID
  const entryByNameVersion = new Map<string, ExpiredEntry>()
  for (const entry of expired) {
    const purl = `pkg:npm/${entry.name}@${entry.version}`
    expiredQueue.add({ purl })
    entryByNameVersion.set(`${entry.name}@${entry.version}`, entry)
  }

  // Fetch updated data
  const res = await retrieveRemoteData(expiredQueue, retries)

  // Parse NDJSON response and collect results
  const now = Date.now()
  const results: {
    depID: string
    report: string
    start: number
    ttl: number
  }[] = []

  const json = res.split('}\n')
  for (const line of json) {
    if (!line.trim()) continue
    const data = JSON.parse(line + '}') as JSONItemResponse
    const scope = data.namespace ? `${data.namespace}/` : ''
    const name = `${scope}${data.name}`
    const key = `${name}@${data.version}`
    const entry = entryByNameVersion.get(key)

    if (!entry) {
      // eslint-disable-next-line no-console
      console.warn(
        `security-archive: failed to find entry for ${key} found in the response.`,
      )
      continue
    }

    // Calculate average score from all score components
    const scoreComponents = [
      data.score.license,
      data.score.maintenance,
      data.score.quality,
      data.score.supplyChain,
      data.score.vulnerability,
    ]
    const newAverageScore = Number(
      (
        scoreComponents.reduce((sum, score) => sum + score, 0) /
        scoreComponents.length
      ).toFixed(2),
    )

    const reportData = asPackageReportData({
      ...data,
      score: { ...data.score, overall: newAverageScore },
    })

    results.push({
      depID: baseDepID(asDepID(entry.depID)),
      report: JSON.stringify(reportData),
      start: now,
      ttl,
    })
  }

  if (!results.length) {
    return false
  }

  // Write to database
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec(
    'CREATE TABLE IF NOT EXISTS cache ' +
      '(depID TEXT PRIMARY KEY, report TEXT, ttl INTEGER, start INTEGER) ' +
      'WITHOUT ROWID',
  )
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA synchronous = NORMAL')

  const dbWrite = db.prepare(
    'INSERT OR REPLACE INTO cache (depID, report, start, ttl) ' +
      'VALUES (?, ?, ?, ?)',
  )
  for (const { depID, report, start, ttl: entryTtl } of results) {
    dbWrite.run(depID, report, start, entryTtl)
  }

  db.exec('PRAGMA optimize')
  db.close()
  return true
}

/* c8 ignore start */
if (isMain(process.argv[1])) {
  process.title = 'vlt-security-archive-update'
  const res = await main(process.stdin)
  if (!res) {
    process.exit(1)
  }
}
/* c8 ignore stop */
