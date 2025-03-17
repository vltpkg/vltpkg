// eslint-disable-next-line import/no-unresolved
import { DatabaseSync } from 'node:sqlite'
import { LRUCache } from 'lru-cache'
import pRetry, { AbortError } from 'p-retry'
import { loadPackageJson } from 'package-json-from-dist'
import { asDepID, splitDepID, joinDepIDTuple } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { XDG } from '@vltpkg/xdg'
import { asPackageReportData } from './types.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { GraphLike } from '@vltpkg/graph'
import type { SpecOptions } from '@vltpkg/spec'
import type {
  PackageReportData,
  SecurityArchiveLike,
  SecurityArchiveRefreshOptions,
} from './types.ts'

export type * from './types.ts'

const SOCKET_API_V0_URL = 'https://api.socket.dev/v0/purl?alerts=true'
const SOCKET_PUBLIC_API_TOKEN =
  'sktsec_t_--RAN5U4ivauy4w37-6aoKyYPDt5ZbaT5JBVMqiwKo_api'

export const targetSecurityRegisty = 'https://registry.npmjs.org/'

export type JSONItemResponse = {
  namespace?: `@{string}`
  name: string
  version: string
}

export type DBReadEntry = {
  depID: string
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
const usesTargetRegistry = (
  depID: DepID,
  specOptions: SpecOptions,
): boolean => {
  const [nodeType, nodeRegistry] = splitDepID(depID)

  if (nodeType !== 'registry') {
    return false
  }

  const reg =
    nodeRegistry === '' ?
      specOptions.registry
    : specOptions.registries?.[nodeRegistry]
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
 * A database of security information for given packages in a graph.
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
  #fetchedDepIDs = new Set<DepID>()
  #path: string
  #retries: number

  /**
   * True if the refresh process was successful and report data
   * is available for all public registry packages in the graph.
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
    })

    this.#path =
      options.path ?? new XDG('vlt').cache('security-archive.db')
    this.#retries = options.retries ?? 3
  }

  /**
   * Opens a connection to the database at the given path.
   */
  #openDatabase(): DatabaseSync {
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
    db.exec('PRAGMA journal_mode = TRUNCATE')
    db.exec('PRAGMA synchronous = NORMAL')
    return db
  }

  /**
   * Loads all valid items found in the database into the in-memory cache.
   */
  #loadItemsFromDatabase(db: DatabaseSync, graph: GraphLike): void {
    const depIDs: string[] = []
    for (const node of graph.nodes.values()) {
      depIDs.push(`'${node.id}'`)
    }
    // retrieves from the db packages using their dep-id reference
    // and only include entries that have a valid TTL value
    const dbRead = db.prepare(
      'SELECT depID, report, start, ttl, ' +
        `(SELECT UNIXEPOCH('subsecond')) as now ` +
        'FROM cache ' +
        `WHERE depID IN (${depIDs.join(',')}) ` +
        'GROUP BY depID HAVING SUM(start + ttl) > now',
    )
    for (const entry of dbRead.all() as DBReadEntry[]) {
      const { depID, report, start, ttl } = entry
      try {
        this.set(
          asDepID(depID),
          asPackageReportData(JSON.parse(report)),
          {
            ttl,
            start,
          },
        )
      } catch {
        // prune any invalid entries from the database
        db.prepare('DELETE FROM cache WHERE depID = ?').run(depID)
      }
    }
  }

  /**
   * Queues up all required packages that are missing from the archive.
   */
  #queueUpRequiredPackages(
    graph: GraphLike,
    specOptions: SpecOptions,
  ): Set<Record<'purl', string>> {
    const queue = new Set<Record<'purl', string>>()
    const nodes = graph.nodes.values()
    for (const node of nodes) {
      // only queue up valid public registry
      // references that are missing from the archive
      if (
        usesTargetRegistry(node.id, specOptions) &&
        !this.has(node.id)
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
   */
  #loadFromNDJSON(str: string, graph: GraphLike): void {
    const json = str.split('}\n')
    for (const line of json) {
      if (!line.trim()) continue
      const data = JSON.parse(line + '}') as JSONItemResponse
      const scope = data.namespace ? `${data.namespace}/` : ''
      const depID = joinDepIDTuple([
        'registry',
        '',
        `${scope}${data.name}@${data.version}`,
      ])
      const aliasedDepID = joinDepIDTuple([
        'registry',
        'npm',
        `${scope}${data.name}@${data.version}`,
      ])
      const node =
        graph.nodes.get(depID) ?? graph.nodes.get(aliasedDepID)
      if (node) {
        this.#fetchedDepIDs.add(node.id)
        this.set(node.id, asPackageReportData(data))
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `security-archive: failed to find node for ${scope}${data.name}@${data.version} found in the response.`,
        )
      }
    }
  }

  /**
   * Store new in-memory items to the database.
   */
  #storeNewItemsToDatabase(db: DatabaseSync): void {
    const insertData: DBWriteEntry[] = []
    for (const depID of this.#fetchedDepIDs) {
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
   * Validates that all public-registry packages in the graph
   * have a valid report data in the current in-memory cache.
   */
  #validateReportData(graph: GraphLike, specOptions: SpecOptions) {
    for (const node of graph.nodes.values()) {
      if (usesTargetRegistry(node.id, specOptions)) {
        if (!this.has(node.id)) {
          this.ok = false
          return
        }
      }
    }
    this.ok = true
  }

  /**
   * Starts the security archive by providing a {@link GraphLike} instance,
   * its registry-based nodes are going to be used as valid potential entries.
   *
   * Any entry that is missing from the persisted cached values are going
   * to be requested in a batch-request to the remote socket.dev API.
   */
  async refresh({
    graph,
    specOptions,
  }: SecurityArchiveRefreshOptions) {
    // should start by clearing the current in-memory cache
    this.clear()

    const db = this.#openDatabase()

    try {
      this.#loadItemsFromDatabase(db, graph)

      const queue = this.#queueUpRequiredPackages(graph, specOptions)
      // only reach for the remote API if there are packages queued up
      if (queue.size > 0) {
        // Parse the response data
        const res = await pRetry(
          () => this.#retrieveRemoteData(queue),
          { retries: this.#retries },
        )
        this.#loadFromNDJSON(res, graph)
        this.#storeNewItemsToDatabase(db)
      }

      // validates the refresh process was successful
      this.#validateReportData(graph, specOptions)
    } finally {
      db.exec('PRAGMA optimize')
      db.close()
      // TODO: at this point we could spawn a deref process to
      // remove entries with expired ttl values and vaccum the db
    }
  }

  /**
   * Outputs the current in-memory cache as a JSON object.
   */
  toJSON() {
    if (!this.ok) return undefined

    const obj: Record<DepID, PackageReportData> = {}
    for (const [key, value] of this.dump()) {
      obj[key] = value.value
    }
    return obj
  }
}
