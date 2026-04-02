import { DatabaseSync } from 'node:sqlite'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { LRUCache } from 'lru-cache'
import pRetry, { AbortError } from 'p-retry'
import { loadPackageJson } from 'package-json-from-dist'
import { asDepID, splitDepID, baseDepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { XDG } from '@vltpkg/xdg'
import { asPackageReportData } from './types.ts'
import { __CODE_SPLIT_SCRIPT_NAME } from './update-expired.ts'
import type { UpdateExpiredPayload } from './update-expired.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/types'
import type {
  PackageReportData,
  SecurityArchiveLike,
  SecurityArchiveRefreshOptions,
} from './types.ts'

export * from './types.ts'

const SOCKET_API_V0_URL = 'https://api.socket.dev/v0/purl?alerts=true'
const SOCKET_PUBLIC_API_TOKEN =
  'sktsec_t_--RAN5U4ivauy4w37-6aoKyYPDt5ZbaT5JBVMqiwKo_api'

export const targetSecurityRegisty = 'https://registry.npmjs.org/'

export type JSONItemResponse = {
  namespace?: `@{string}`
  name: string
  version: string
  score: {
    overall: number
    license: number
    maintenance: number
    quality: number
    supplyChain: number
    vulnerability: number
  }
}

export type DBReadEntry = {
  depID: string
  now: number
  report: string
  start: number
  ttl: number
}

export type DBWriteEntry = [string, string, number, number]

export type SecurityArchiveOptions = LRUCache.OptionsBase<
  DepID,
  PackageReportData,
  unknown
> & {
  /**
   * Security archive does not supports a fetch-on-demand model.
   */
  fetchMethod?: undefined
  /**
   * An optional value for the path in which to store the sqlite db.
   */
  path?: string
  /**
   * Number of retries attempts to reach the remote security API.
   */
  retries?: number
}

/**
 * Only the public npm registry has information available in the
 * socket.dev API. This function checks if a given depID is pointing
 * to the public npm registry and returns `true` if it does.
 */
const usesTargetRegistry = (node: NodeLike): boolean => {
  const depID = node.id
  const specOptions = node.options
  const [nodeType, nodeRegistry] = splitDepID(depID)

  if (nodeType !== 'registry') {
    return false
  }

  const reg = specOptions.registries?.[nodeRegistry]
  return reg === targetSecurityRegisty
}

// Loads the version number to be used in the User-Agent header
export const { version } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON,
) as {
  version: string
}

/**
 * A database of security information for given packages from a list of nodes.
 *
 * Using the SecurityArchive.refresh() method will update the local cache
 * with information from the socket.dev APIs or load from the local storage
 * if available. Information about package security is then available
 * using the SecurityArchive.get() method.
 */
export class SecurityArchive
  extends LRUCache<DepID, PackageReportData>
  implements SecurityArchiveLike
{
  #expired = new Set<DepID>()
  #path: string
  #retries: number
  #nodesByName = new Map<string, Set<NodeLike>>()
  #nodesByID = new Map<DepID, NodeLike>()

  /**
   * True if the refresh process was successful and report data is available
   * for all public registry packages from the initial list of nodes.
   */
  ok = false

  /**
   * Creates a new security archive instance and starts the refresh process.
   */
  static async start(
    options: SecurityArchiveOptions & SecurityArchiveRefreshOptions,
  ) {
    const archive = new SecurityArchive(options)
    await archive.refresh(options)
    return archive
  }

  /**
   * By default, limits to 100K entries in the in-memory archive.
   */
  static get defaultMax() {
    return 100_000
  }

  /**
   * By default, entries are cached for 3 hours.
   */
  static get defaultTtl() {
    return 1000 * 60 * 60 * 3
  }

  constructor(options: SecurityArchiveOptions = {}) {
    super({
      max: SecurityArchive.defaultMax,
      ttl: SecurityArchive.defaultTtl,
      ...options,
      allowStale: true,
    })

    this.#path =
      options.path ?? new XDG('vlt').cache('security-archive.db')
    this.#retries = options.retries ?? 3
  }

  /**
   * Retrieves a node using its name and version.
   */
  #retrieveNodeByNameVersion(
    name: string,
    version: string,
  ): NodeLike | undefined {
    for (const node of this.#nodesByName.get(name) ?? []) {
      if (node.version === version) {
        return node
      }
    }
  }

  /**
   * Opens a connection to the database at the given path.
   */
  #openDatabase(): DatabaseSync {
    mkdirSync(dirname(this.#path), { recursive: true })
    const db = new DatabaseSync(this.#path)
    db.exec(
      'CREATE TABLE IF NOT EXISTS cache ' +
        '(depID TEXT PRIMARY KEY, report TEXT, ttl INTEGER, start INTEGER) ' +
        // WITHOUT ROWID models a key=value storage,
        // enforcing depID must be unique and not null
        // while using less space and more efficient lookups
        // https://www.sqlite.org/withoutrowid.html
        'WITHOUT ROWID',
    )
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA synchronous = NORMAL')
    return db
  }

  /**
   * Loads all valid items found in the database into the in-memory cache.
   */
  #loadItemsFromDatabase(db: DatabaseSync, nodes: NodeLike[]): void {
    const depIDs: string[] = []
    for (const node of nodes) {
      depIDs.push(`'${baseDepID(node.id)}'`)
    }
    // retrieves from the db packages using their dep-id reference
    // and only include entries that have a valid TTL value
    const dbRead = db.prepare(
      'SELECT depID, report, start, ttl, ' +
        `(SELECT UNIXEPOCH('subsecond') * 1000) as now ` +
        'FROM cache ' +
        `WHERE depID IN (${depIDs.join(',')})`,
    )
    // reset the list of expired entries
    this.#expired.clear()
    for (const entry of dbRead.all() as DBReadEntry[]) {
      const { depID, now, report, start, ttl } = entry
      const id = baseDepID(asDepID(depID))
      try {
        this.set(id, asPackageReportData(JSON.parse(report)), {
          ttl,
          start,
        })
        // stale values are queued up as expired for revalidation
        if (start + ttl < now) {
          this.#expired.add(id)
        }
      } catch {
        // prune any invalid entries from the database
        db.prepare('DELETE FROM cache WHERE depID = ?').run(depID)
      }
    }
    // Spawn a detached process to revalidate expired entries in the
    // background so that cli commands (vlt ls, vlt query) don't hang
    // waiting for stale-while-revalidate requests to complete.
    this.#spawnUpdateExpired()
  }

  /**
   * Spawns a detached child process to revalidate expired entries.
   * The process runs independently — the main process does not wait for it.
   */
  #spawnUpdateExpired(): void {
    const expired: UpdateExpiredPayload['expired'] = []
    for (const depID of this.#expired) {
      const node = this.#nodesByID.get(baseDepID(depID))

      /* c8 ignore start */
      if (!node?.version || !node.name) {
        // skip any missing node or nodes without a version/name, this
        // should not happen, but some optional dependencies might
        // end up in this state when reading from the lockfile
        continue
      }
      /* c8 ignore stop */

      expired.push({
        depID: baseDepID(depID),
        name: node.name,
        version: node.version,
      })
    }

    if (!expired.length) {
      return
    }

    const isDeno =
      (globalThis as typeof globalThis & { Deno?: any }).Deno !=
      undefined

    const payload: UpdateExpiredPayload = {
      dbPath: this.#path,
      retries: this.#retries,
      ttl: SecurityArchive.defaultTtl,
      expired,
    }

    const args = []
    // Deno on Windows does not support detached processes
    /* c8 ignore next */
    const detached = !(isDeno && process.platform === 'win32')

    /* c8 ignore start */
    if (isDeno) {
      args.push(
        '--unstable-node-globals',
        '--unstable-bare-node-builtins',
      )
    }
    /* c8 ignore stop */

    args.push(__CODE_SPLIT_SCRIPT_NAME)

    const proc = spawn(process.execPath, args, {
      detached,
      stdio: ['pipe', 'ignore', 'ignore'],
      env: { ...process.env },
    })

    proc.stdin.write(JSON.stringify(payload))
    proc.stdin.end()

    /* c8 ignore start */
    if (detached) {
      proc.unref()
    }
    /* c8 ignore stop */
  }

  /**
   * Queues up all required packages that are missing from the archive.
   */
  #queueUpRequiredPackages(): Set<Record<'purl', string>> {
    const queue = new Set<Record<'purl', string>>()
    for (const node of this.#nodesByID.values()) {
      const normalizedId = baseDepID(node.id)
      // only queue up valid public registry
      // references that are missing from the archive
      // also skips any pkg marked as expired
      if (
        usesTargetRegistry(node) &&
        !this.has(normalizedId) &&
        !this.#expired.has(normalizedId)
      ) {
        const purl = `pkg:npm/${node.name}@${node.version}`
        queue.add({ purl })
      }
    }
    return queue
  }

  /**
   * Fetches security information from the socket.dev API.
   * Returns a string of NDJSON data.
   */
  async #retrieveRemoteData(
    queue: Set<Record<'purl', string>>,
  ): Promise<string> {
    // fetch information from the socket.dev API
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
    // on missing valid auth or API, it should abort the retry logic
    if (req.status === 404) {
      throw new AbortError('Missing API')
    }
    // on any other error throws an error that will trigger retry
    if (!req.ok || !(req.status >= 200 && req.status <= 299)) {
      throw error('Failed to fetch security data', { response: req })
    }

    const str = await req.text()
    return str.trim() + '\n'
  }

  /**
   * Parses and load NDJSON data into the in-memory cache.
   * Returns a set of dep ids that were successfully loaded.
   */
  #loadFromNDJSON(str: string): Set<DepID> {
    // builds a set of dep ids that were successfully fetched and loaded
    const fetchedDepIDs = new Set<DepID>()
    const json = str.split('}\n')
    for (const line of json) {
      if (!line.trim()) continue
      const data = JSON.parse(line + '}') as JSONItemResponse
      const scope = data.namespace ? `${data.namespace}/` : ''
      const name = `${scope}${data.name}`
      const node = this.#retrieveNodeByNameVersion(name, data.version)
      if (node) {
        const normalizedId = baseDepID(node.id)
        fetchedDepIDs.add(baseDepID(node.id))
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
        // Add average score to the score object
        const scoreWithNewAverage = {
          ...data.score,
          overall: newAverageScore,
        }
        this.set(
          normalizedId,
          asPackageReportData({
            ...data,
            score: scoreWithNewAverage,
          }),
        )
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `security-archive: failed to find node for ${scope}${data.name}@${data.version} found in the response.`,
        )
      }
    }
    return fetchedDepIDs
  }

  /**
   * Store new in-memory items to the database.
   */
  #storeNewItemsToDatabase(
    db: DatabaseSync,
    depIDs: Set<DepID>,
  ): void {
    const insertData: DBWriteEntry[] = []
    for (const depID of depIDs) {
      const entry = this.info(depID)
      if (entry?.start && entry.ttl) {
        insertData.push([
          depID,
          JSON.stringify(entry.value),
          entry.start,
          entry.ttl,
        ])
      }
    }
    const dbWrite = db.prepare(
      'INSERT OR REPLACE INTO cache (depID, report, start, ttl) ' +
        'VALUES (?, ?, ?, ?)',
    )
    for (const data of insertData) {
      dbWrite.run(...data)
    }
  }

  /**
   * Validates that all public-registry packages in the nodes
   * have a valid report data in the current in-memory cache.
   */
  #validateReportData() {
    for (const node of this.#nodesByID.values()) {
      if (usesTargetRegistry(node)) {
        if (!this.has(baseDepID(node.id))) {
          this.ok = false
          return
        }
      }
    }
    this.ok = true
  }

  /**
   * Starts the security archive by providing an array of {@link NodeLike} instances,
   * its registry-based nodes are going to be used as valid potential entries.
   *
   * Any entry that is missing from the persisted cached values are going
   * to be requested in a batch-request to the remote socket.dev API.
   */
  async refresh({ nodes }: SecurityArchiveRefreshOptions) {
    // should start by clearing the current in-memory cache
    this.clear()

    const db = this.#openDatabase()

    // indexes nodes by name and id for quick lookup
    this.#nodesByName.clear()
    this.#nodesByID.clear()
    for (const node of nodes) {
      /* c8 ignore start */
      const setByName =
        this.#nodesByName.get(node.name ?? '') ?? new Set()
      setByName.add(node)
      this.#nodesByName.set(node.name ?? '', setByName)
      /* c8 ignore stop */
      this.#nodesByID.set(baseDepID(node.id), node)
    }

    try {
      this.#loadItemsFromDatabase(db, nodes)

      const queue = this.#queueUpRequiredPackages()
      // only reach for the remote API if there are packages queued up
      if (queue.size > 0) {
        // Parse the response data
        const res = await pRetry(
          () => this.#retrieveRemoteData(queue),
          { retries: this.#retries },
        )
        const ids = this.#loadFromNDJSON(res)
        this.#storeNewItemsToDatabase(db, ids)
      }

      // validates the refresh process was successful
      this.#validateReportData()
    } finally {
      this.#close(db)
    }
  }

  /**
   * Closes the database connection and cleans up the internal state.
   */
  #close(db: DatabaseSync) {
    // close db connection
    db.exec('PRAGMA optimize')
    db.close()
    // clean up internal state
    this.#expired.clear()
  }

  /**
   * Outputs the current in-memory cache as a JSON object.
   */
  toJSON() {
    const obj: Record<DepID, PackageReportData> = {}
    for (const [key, value] of this.dump()) {
      obj[key] = value.value
    }
    return obj
  }
}
