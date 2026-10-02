import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import { error } from '@vltpkg/error-cause'
import { clone, resolve as gitResolve, revs } from '@vltpkg/git'
import { logRequest } from '@vltpkg/output'
import { PackageJson } from '@vltpkg/package-json'
import type { PickManifestOptions } from '@vltpkg/pick-manifest'
import { pickManifest } from '@vltpkg/pick-manifest'
import type {
  CacheEntry,
  RegistryClient,
  RegistryClientOptions,
  RegistryClientRequestOptions,
} from '@vltpkg/registry-client'
// subpath import: keeps the lazy `import('@vltpkg/registry-client')`
// below from becoming an eager dependency on the whole client.
import {
  registryErrorMessage,
  tokenRefusalAdvice,
} from '@vltpkg/registry-client/registry-error'
import { storeRoot } from '@vltpkg/registry-client/store-root'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import type { Pool, StoreLinker } from '@vltpkg/tar'
import type {
  BrotliAlternate,
  Integrity,
  Manifest,
  Packument,
} from '@vltpkg/types'
import {
  asPackument,
  brotliTarballUrl,
  integrityHex,
  tarballFormat,
} from '@vltpkg/types'
import { fetchResolve } from './resolve-batch.ts'
import type { ResolveRequest } from './resolve-batch.ts'
export type { ResolveRequest } from './resolve-batch.ts'
import { Monorepo } from '@vltpkg/workspaces'
import { XDG } from '@vltpkg/xdg'
import { createHash, randomBytes } from 'node:crypto'
import {
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import {
  basename,
  dirname,
  resolve as pathResolve,
  relative,
} from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { debuglog } from 'node:util'
import { create as tarC } from 'tar'
import type { Capabilities } from './capabilities.ts'
import { getCapabilities, peekCapabilities } from './capabilities.ts'
import { rename } from './rename.ts'

export type { Capabilities } from './capabilities.ts'
export {
  getCapabilities,
  peekCapabilities,
  resetCapabilities,
} from './capabilities.ts'

const debug = debuglog('vlt')

const xdg = new XDG('vlt')
export const delimiter = '~'

/**
 * vlt's abbreviated packument: corgi plus the fields the graph relies on
 * (`license`, `time`, `hasInstallScript`), minus `dist.integrity` (the
 * tarball response carries a `Repr-Digest` instead) and with
 * `dist.tarball` relative to the registry base.
 */
export const VLT_PACKUMENT_MIME =
  'application/vnd.vlt.packument-v1+json'

/**
 * {@link VLT_PACKUMENT_MIME} with each `dist.tarball` reduced to the
 * tarball's basename (`foo-1.0.0.tgz`), which resolves against the
 * package's `{registry}{name}/-/` directory.
 */
export const VLT_PACKUMENT_V2_MIME =
  'application/vnd.vlt.packument-v2+json'

/**
 * Accept header for packument requests. Prefers vlt's abbreviated
 * packument, v2 over v1, and falls back to the full one on registries
 * that know neither. See `PackageInfoClient.#fetchPackument`.
 *
 * The trailing wildcard range carries an explicit `q=0.1` so that it stays
 * below `application/json`. A media range with no `q` defaults to `q=1.0`
 * (RFC 9110 12.5.1), which on a registry that negotiates strictly by
 * quality would let an unrelated representation — npm's corgi among them
 * — outrank the full packument and drop `license`. The wildcard is kept
 * only so a registry that rejects what it cannot satisfy exactly still
 * has something to match.
 */
export const PACKUMENT_ACCEPT = `${VLT_PACKUMENT_V2_MIME}; q=1.0, ${VLT_PACKUMENT_MIME}; q=0.9, application/json; q=0.8, */*; q=0.1`

export type Resolution = {
  resolved: string
  integrity?: Integrity
  signatures?: Exclude<Manifest['dist'], undefined>['signatures']
  spec: Spec
  /**
   * The manifest came from a vlt packument, which carries no
   * `dist.integrity`: the tarball response must carry a `Repr-Digest`.
   */
  digestRequired?: boolean
}

/**
 * {@link PackageInfoClient.extract} result. A global store link also
 * carries what its index knows, so reify need not read it from disk.
 */
export type ExtractResolution = Resolution & {
  /** the package.json as JSON text, if the index has it */
  manifest?: string
  /** true if the package has a root binding.gyp */
  bindingGyp?: boolean
}

export type PackageInfoClientOptions = RegistryClientOptions &
  SpecOptions & {
    /** root of the project. Defaults to process.cwd() */
    projectRoot?: string
    /** PackageJson object */
    packageJson?: PackageJson

    monorepo?: Monorepo

    /** workspace groups to load, irrelevant if Monorepo provided */
    'workspace-group'?: string[]

    /** workspace paths to load, irrelevant if Monorepo provided */
    workspace?: string[]

    /**
     * How registry packages are placed: `unpack` (default) unpacks the
     * tarball, anything else goes through the global store first.
     */
    'store-linker'?: StoreLinker

    /**
     * Resolve to the registry's Brotli (`.tar.br`) tarball when it
     * advertises one in `dist.alternates`. Defaults to true; set false to
     * always resolve to the gzip `.tgz`.
     */
    'brotli-tarballs'?: boolean
  }

export type PackageInfoClientRequestOptions = PickManifestOptions &
  RegistryClientRequestOptions & {
    /** dir to resolve `file://` specifiers against. Defaults to projectRoot. */
    from?: string
    /**
     * Fetch the full packument (readme, maintainers, `dist.integrity`)
     * rather than the abbreviated one. Bypasses the disk cache, which is
     * keyed by URL alone, so the two representations never mix.
     */
    full?: boolean
    /**
     * A moving selector whose packument is still within max-age is
     * served from it and revalidated after exit, not before use. Pinned
     * specs are unaffected.
     */
    backgroundRevalidate?: boolean
  }

/**
 * How long `manifest()` waits on an in-flight resolve that is not delivering
 * anything before fetching the packument itself. A stream that keeps
 * delivering records is waited on for as long as it does; one that goes
 * quiet for this long is left to finish on its own.
 */
const resolveWaitMs = (): number => {
  const configured = Number(process.env.VLT_BATCH_RESOLVE_WAIT_MS)
  return Number.isFinite(configured) && configured >= 0 ?
      configured
    : 1000
}

// what a resolve wait's timer resolves to, so it cannot be mistaken for a
// manifest
const stalled = Symbol('stalled')

// request options that change which manifest is picked, or how; a batch
// entry never went through pickManifest under them, so they bypass it
const SELECTION_OPTIONS = [
  'before',
  'os',
  'arch',
  'libc',
  'node-version',
] as const

export type PackageInfoClientExtractOptions =
  PackageInfoClientRequestOptions & {
    integrity?: Integrity
    resolved?: string
    /**
     * When true, indicates that integrity + resolved came from a
     * lockfile (i.e. they were already verified on first install).
     * Skips re-hashing a refetched body of an already verified url.
     * Other network bodies are always checked.
     */
    fromLockfile?: boolean
  }

// the maximum duration of a manifest cache file
const manifestCacheMaxAge = 5 * 60 * 1000

/**
 * There is no default registry. Anything that needs to build a registry
 * URL fails with a `ECONFIG` error when none has been configured.
 */
const noRegistryError = (spec: Spec) =>
  error(
    'No registry configured to resolve this spec. Set "registry" in ' +
      'vlt.json, pass --registry, or run `vlt login --registry=<url>`. ' +
      'See https://docs.vlt.sh/cli',
    { code: 'ECONFIG', spec },
  )

/**
 * A selector that can point at a different version tomorrow: a dist tag,
 * or a range matching anything (`*`, empty string). Manifest results for
 * these are not cached to disk, and packument requests for them force a
 * revalidation of the registry client's cache entry, in the background
 * with the `backgroundRevalidate` option.
 *
 * Takes a *final* spec (`spec.final`), same as `pickManifest` sees.
 */
const isMovingSelector = (f: Spec) => !!(f.distTag || f.range?.isAny)

/** The registry client's `forceRevalidate` for a packument request. */
const revalidateMode = (
  f: Spec,
  options: PackageInfoClientRequestOptions,
) =>
  !isMovingSelector(f) ? undefined
  : options.backgroundRevalidate ? ('background' as const)
  : true

/**
 * A selector that cannot land on a prerelease, and so can be answered from
 * the registry's `?stable` packument.
 *
 * A dist tag has no range, and is out either way: it can point at a
 * prerelease, which the stable packument drops along with the tag. `*` and
 * an empty range are out for the same reason -- they resolve through
 * `latest`. What is left is a range that names no prerelease of its own,
 * which standard semver never matches against one.
 *
 * Takes a *final* spec (`spec.final`), same as `isMovingSelector`.
 */
const isStableSelector = (f: Spec) => {
  const { range } = f
  if (!range) return false
  // A prerelease comparator always carries a `-`, and so does a hyphen
  // range; reading that as "might be a prerelease" only ever gives up the
  // smaller packument.
  return !range.isAny && !range.raw.includes('-')
}

// anything else, eg an unvalidated env value, means `unpack`
const storeLinkers = new Set<string>(['auto', 'hardlink', 'copy'])

// the hash a response answers for. a network body's is the hash of its
// bytes: the registry client already checked it against the expected
// hash, or recorded it when there was none, and memoized it, so this
// is no second pass.
//
// a cache hit answers with the hash the entry was stored under, never
// a fresh one: cache-unzip rewrites cached bodies un-gzipped in place,
// so hashing one again would pin a hash of bytes no other machine has.
// an entry stored before that hash was recorded can still be hashed
// while its body is the bytes that came off the wire, i.e. still
// gzipped; once rewritten it cannot be verified at all.
//
// nor can an entry with no content-type. request() labels a body
// served without one as it stores it under the hash it checked or
// recorded, so an entry with none was not stored that way. it may be
// from v1.2.0 to v1.3.3, which un-gzipped a gzipped one in memory and
// only then hashed it: its stored hash may be of that copy, which no
// cold cache reproduces. a body served un-gzipped hashes the same
// either way, so there is no telling which, and none is trusted.
const storedIntegrity = (
  response: CacheEntry,
): Integrity | undefined =>
  !response.fromCache ? response.integrityActual
  : !response.contentType ? undefined
  : (response.integrity ??
    (response.isGzip ? response.integrityActual : undefined))

export class PackageInfoClient {
  #registryClient?: RegistryClient
  #projectRoot: string
  #tarPool?: Pool
  options: PackageInfoClientOptions
  #resolutions = new Map<string, Resolution>()
  packageJson: PackageJson
  monorepo?: Monorepo
  #trustedIntegrities = new Map<string, Integrity>()
  // `${registry}${name}` of every packument served as a vlt packument type
  #vltPackuments = new Set<string>()
  #manifestCacheMinAge = Date.now() - manifestCacheMaxAge
  #cachePath: string
  #storeRoot: string
  #storeLinker: StoreLinker
  #storeHits = { link: 0, copy: 0 }
  #storeMisses = 0
  #storeHitRateLogged = false
  #logStoreHitRate = () => {
    const { link, copy } = this.#storeHits
    const n = Math.max(1, link + copy + this.#storeMisses)
    debug(
      'global store: linked=%d copied=%d missed=%d hit rate=%s%%',
      link,
      copy,
      this.#storeMisses,
      (((link + copy) / n) * 100).toFixed(1),
    )
  }
  // In-flight coalescing key is `${registry}${name}` — no representation
  // component. Safe only because every caller requests the same full
  // packument (see #fetchPackument). The one thing that does vary per
  // caller is forceRevalidate, so record how hard it revalidates and
  // never let a request ride a weaker one (see #packument()).
  #packumentPromises = new Map<
    string,
    { promise: Promise<Packument>; rank: number }
  >()
  // unique temp file names for atomic manifest cache writes
  #manifestWriteRandom = randomBytes(6).toString('hex')
  #manifestWriteCount = 0
  // cache paths already written this run. manifest() is called many
  // times for the same cache key per install and content for a given
  // path is deterministic within a run, so only the first write is
  // needed. entries are removed when the on-disk file is invalidated
  // so the refreshed manifest can be written again.
  #manifestWritePaths = new Set<string>()

  // Manifests a resolve batch delivered, keyed both as
  // `${registry}${name}@${range}` for every spec that chose a version and
  // `${registry}${name}@${version}` for the version itself.
  #resolvedManifests = new Map<string, Manifest>()
  // The resolves still streaming, per registry, each settling when its
  // stream ends. The requests overlap whatever the graph build does before
  // it asks for its first manifest.
  #resolveInflight = new Map<string, Set<Promise<void>>>()
  /**
   * each request in flight, by its `#resolveSent` key: its controller and
   * how many builds are still reading it. a request that settled on its
   * own stays in `#resolveSent`, since its records are still here
   */
  #resolveOwners = new Map<
    string,
    { controller: AbortController; readers: number }
  >()
  // Requests already sent, so the same ask is not repeated. Keyed on the
  // request rather than the registry: a later step asking for a different
  // root set is a different question.
  #resolveSent = new Set<string>()
  // Keys `manifest()` is waiting for, each woken by the record that carries
  // it. Waiting per key rather than on the whole response is what lets a
  // build place level N while the server still walks level N+1.
  #resolveWaiters = new Map<
    string,
    Set<(manifest: Manifest) => void>
  >()
  // When each registry's resolve last delivered a record, which is what a
  // waiter checks to tell a stream that is still coming from one that has
  // stalled.
  #resolveLastRecordAt = new Map<string, number>()

  #registryClientPromise?: Promise<RegistryClient>
  #tarPoolPromise?: Promise<Pool>

  async getRegistryClient() {
    if (this.#registryClient) return this.#registryClient
    this.#registryClientPromise ??=
      import('@vltpkg/registry-client').then(({ RegistryClient }) => {
        this.#registryClient = new RegistryClient(this.options)
        return this.#registryClient
      })
    return this.#registryClientPromise
  }

  /**
   * The vlt extensions `registry` serves, from its
   * `GET /-/vlt/capabilities` document. A registry that does not answer
   * one reads as an empty document, so a missing key means unsupported.
   */
  async capabilities(registry: string): Promise<Capabilities> {
    return getCapabilities(await this.getRegistryClient(), registry)
  }

  /**
   * Whether the packument for `f` can be fetched with `?stable`: the
   * selector has to be one a prerelease cannot answer, and the registry
   * must not have told us it does not serve the filter.
   *
   * Never waits on the capability document, which would put a round trip in
   * front of the first packument of every cold install. Until that document
   * arrives the answer is yes: a registry that does not know `?stable`
   * ignores the parameter and serves the full packument, which resolution
   * reads just as well. Once the document does arrive it is authoritative,
   * so a registry that does not serve the filter stops being asked with it.
   */
  #stable(f: Spec): boolean {
    const { registry } = f
    if (!registry || !isStableSelector(f)) return false
    const client = this.#registryClient
    if (!client) {
      // the registry client is built lazily, so the first caller starts it
      // and the document along with it, and asks optimistically meanwhile
      void this.capabilities(registry).catch(() => {})
      return true
    }
    const caps = peekCapabilities(client, registry)
    return !caps || !!caps['stable-filter']
  }

  async getTarPool() {
    if (this.#tarPool) return this.#tarPool
    this.#tarPoolPromise ??= import('@vltpkg/tar').then(
      ({ Pool }) => {
        this.#tarPool = new Pool()
        return this.#tarPool
      },
    )
    return this.#tarPoolPromise
  }

  /**
   * A version's Brotli (`.tar.br`) alternate: its absolute URL, plus its
   * hash if the registry sent one. Returns undefined if the version has no
   * alternate, if it has one this client does not use (see
   * {@link brotliTarballUrl}), or if `--no-brotli-tarballs` is set.
   * `dist.tarball` is already absolute by this point; see
   * `absolutizeTarballs`.
   */
  #brotliTarball(
    tarball: string,
    alternates: Exclude<Manifest['dist'], undefined>['alternates'],
  ): BrotliAlternate | undefined {
    if (this.options['brotli-tarballs'] === false) return undefined
    return brotliTarballUrl(tarball, alternates)
  }

  constructor(options: PackageInfoClientOptions = {}) {
    this.options = options
    this.#projectRoot = options.projectRoot || process.cwd()
    this.packageJson = options.packageJson ?? new PackageJson()
    const wsLoad = {
      ...(options.workspace?.length && { paths: options.workspace }),
      ...(options['workspace-group']?.length && {
        groups: options['workspace-group'],
      }),
    }
    this.monorepo =
      options.monorepo ??
      Monorepo.maybeLoad(this.#projectRoot, {
        load: wsLoad,
        packageJson: this.packageJson,
      })
    this.#cachePath = options.cache ?? xdg.cache()
    this.#storeRoot = options.storeRoot ?? storeRoot(this.#cachePath)
    const linker = options['store-linker']
    this.#storeLinker =
      linker && storeLinkers.has(linker) ? linker : 'unpack'
    // optionally create its cache directory if it doesn't exist
    void mkdir(pathResolve(this.#cachePath, 'package-info'), {
      recursive: true,
    }).catch(() => {})
  }

  async extract(
    spec: Spec | string,
    target: string,
    options: PackageInfoClientExtractOptions = {},
  ): Promise<ExtractResolution> {
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const {
      from = this.#projectRoot,
      integrity,
      resolved,
      fromLockfile = false,
    } = options
    const f = spec.final
    // If the caller already provides both integrity and resolved
    // (from lockfile or prior resolution), skip re-resolving. A
    // `.tar.br` needs only the URL: its hash is not knowable before the
    // download, so the graph can never hand one over, and `Repr-Digest`
    // is what pins it -- `required`, so a registry that serves the
    // alternate unlabelled is rejected rather than trusted.
    const brotli = !!resolved && tarballFormat(resolved) === 'brotli'
    const r: Resolution =
      resolved && (integrity || brotli) ?
        {
          resolved,
          integrity,
          spec,
          ...(brotli && !integrity ? { digestRequired: true } : {}),
        }
      : await this.resolve(spec, options)

    switch (f.type) {
      case 'git': {
        const {
          gitRemote,
          gitCommittish,
          remoteURL,
          gitSelectorParsed,
        } = f
        if (!remoteURL) {
          /* c8 ignore start - Impossible, would throw on the resolve */
          if (!gitRemote)
            throw this.#resolveError(
              spec,
              options,
              'no remote on git: specifier',
            )
          /* c8 ignore stop */
          const { path } = gitSelectorParsed ?? {}
          if (path !== undefined) {
            // use obvious name because it's in node_modules
            const tmp = pathResolve(
              dirname(target),
              `.TEMP.${basename(target)}-${randomBytes(6).toString('hex')}`,
            )
            await clone(gitRemote, gitCommittish, tmp, { spec })
            const src = pathResolve(tmp, path)
            await rename(src, target)
            // intentionally not awaited
            void rm(tmp, { recursive: true, force: true })
          } else {
            await clone(gitRemote, gitCommittish, target, { spec })
            // intentionally not awaited
            void rm(target + '/.git', { recursive: true })
          }
          return r
        }
        // fallthrough if a remote tarball url present
      }

      case 'registry': {
        const pool = await this.getTarPool()
        // brotli bytes carry no signature of their own, so every unpack
        // below has to be told; gzip and raw tar are sniffed.
        const format = tarballFormat(r.resolved)
        // git tarballs keep the unpack path
        const storeOn =
          f.type === 'registry' && this.#storeLinker !== 'unpack'
        const copy = this.#storeLinker === 'copy'
        // If we already have a hash, that is the store key. Some
        // tarballs arrive without one: a `.tar.br`, or anything a
        // registry serves with no `dist.integrity`. For those, read the
        // hash off the cache entry, which recorded it when the bytes
        // were verified. Installs that do have a hash skip all of this,
        // so a store hit still never builds a registry client.
        const hex =
          !storeOn ? undefined
          : r.integrity ? integrityHex(r.integrity)
          : integrityHex(
              (await this.getRegistryClient()).cachedIntegrity(
                r.resolved,
              ),
            )
        if (hex) {
          if (debug.enabled && !this.#storeHitRateLogged) {
            this.#storeHitRateLogged = true
            process.once('beforeExit', this.#logStoreHitRate)
          }
          const linked = await pool.linkFromStore(
            pathResolve(this.#storeRoot, hex),
            target,
            { copy },
          )
          if (linked) {
            const { how, index } = linked
            this.#storeHits[how]++
            // a copy is no link: report it as a cache hit
            logRequest(r.resolved, how === 'link' ? 'store' : 'cache')
            return {
              ...r,
              manifest: index.manifest,
              // implies scripts, so most packages skip the scan
              bindingGyp:
                index.scripts &&
                index.files.some(f => f[0] === 'binding.gyp'),
            }
          }
          this.#storeMisses++
        }

        // if the tarball is already on disk, unpack it straight from
        // the cache file: it never has to be held in the client's
        // in-memory cache. anything unexpected falls through to the
        // fetch path, which throws its own error if the body is
        // genuinely bad.
        const rc = await this.getRegistryClient()
        const cached = rc.cachedBody(r.resolved, {
          integrity: r.integrity,
        })
        if (cached) {
          try {
            await pool.unpack(cached.body, target, format)
            logRequest(r.resolved, 'cache')
            r.integrity ??= cached.integrity
            // A warm install writes nothing to the cache, so queue the
            // store miss here. Without this an existing cache would
            // never catch up. Also queue a gzipped body that did not
            // come from the store, so it gets un-gzipped. A brotli body
            // is left alone: cache-unzip only handles gzip, and keeping
            // it compressed keeps the cache small.
            if (storeOn || cached.gzip) {
              rc.queueForStore(cached.key, r.integrity)
            }
            return r
          } catch (er) {
            // a systematically failing fast path (every entry still
            // gzipped, EACCES, ENOSPC...) doubles the IO of the fetch
            // path, so leave a trace behind. NODE_DEBUG=vlt to see it.
            debug(
              'cached tarball unpack failed: %s: %s',
              cached.path,
              er,
            )
          }
        }

        const fetchTarball = async (useCache?: false) => {
          const trustIntegrity =
            this.#trustedIntegrities.get(r.resolved) === r.integrity

          const response = await (
            await this.getRegistryClient()
          ).request(r.resolved, {
            integrity: r.integrity,
            trustIntegrity,
            verifyDigest: r.digestRequired ? 'required' : true,
            ...(useCache === false ? { useCache } : {}),
          })

          if (response.statusCode !== 200) {
            throw this.#resolveError(
              spec,
              options,
              `${registryErrorMessage(response)} when ` +
                `fetching the tarball for ${spec}. The resolved version ` +
                `may have been unpublished, or the registry may be ` +
                `misconfigured or unreachable.`,
              {
                url: r.resolved,
                response,
              },
            )
          }

          // checkIntegrity() hashes the body unless its url is trusted
          const verified =
            !trustIntegrity &&
            response.checkIntegrity({ spec, url: resolved })
          // if it's not trusted already, but valid, start trusting
          if (verified) {
            this.#trustedIntegrities.set(
              r.resolved,
              response.integrity,
            )
          }

          const buf = response.buffer()

          if (r.integrity) {
            // hash only network bytes checkIntegrity() skipped (trusted
            // url). cache bodies were verified when cached.
            if (!verified && !fromLockfile && !response.fromCache) {
              const hash = createHash('sha512')
              hash.update(buf)
              const computed: Integrity = `sha512-${hash.digest('base64')}`
              if (computed !== r.integrity) {
                throw error('Tarball integrity check failed', {
                  code: 'EINTEGRITY',
                  spec,
                  url: r.resolved,
                  wanted: r.integrity,
                  found: computed,
                })
              }
            }
          } else if (response.fromCache) {
            // the hash the body was stored under
            r.integrity = response.integrity
          } else {
            // no dist.integrity: the registry client checked the body
            // against the digest the registry sent with it (verifyDigest
            // above). hand the hash back so the lockfile pins it from
            // now on
            r.integrity = response.integrityActual
          }

          return buf
        }

        let buf: Buffer
        try {
          buf = await fetchTarball()
        } catch (er) {
          // On EINTEGRITY, retry once bypassing cache. This handles
          // transient issues such as corrupted downloads or CDN
          // inconsistencies that cause the cached tarball to not
          // match the expected integrity hash.
          if (
            er instanceof Error &&
            'cause' in er &&
            (er.cause as Record<string, unknown> | undefined)
              ?.code === 'EINTEGRITY'
          ) {
            buf = await fetchTarball(false)
          } else {
            throw er
          }
        }

        try {
          await pool.unpack(buf, target, format)
        } catch (er) {
          throw this.#resolveError(
            spec,
            options,
            'tar unpack failed',
            { cause: er },
          )
        }
        return r
      }

      case 'remote': {
        const rc = await this.getRegistryClient()
        // lazy for the same reason getRegistryClient() is
        const { CacheEntry: Entry, cacheKey } =
          await import('@vltpkg/registry-client')
        const key = cacheKey('GET', new URL(r.resolved))
        // v1.2.0 to v1.3.3 hashed a remote tarball after the registry
        // client had un-gzipped it: always, for one served with no
        // content-type, and on a cache hit once cache-unzip had
        // rewritten the entry, so a lockfile they wrote may pin that
        // hash. it pins the same tar: a body that un-gzips to it is
        // accepted, and r.integrity re-pinned to the hash the body is
        // stored under, the one reported. the graph keeps the hash a
        // node was locked with, so the lockfile is never rewritten and
        // every install from it takes this path. a body that will not
        // un-gzip is no match.
        const unzipped = (entry: CacheEntry) => {
          try {
            return entry.unzippedIntegrity() === r.integrity
          } catch {
            return false
          }
        }
        const fetchTarball = async (readCache?: false) => {
          let response: CacheEntry
          try {
            response = await rc.request(r.resolved, {
              integrity: r.integrity,
              ...(readCache === false ? { readCache } : {}),
            })
          } catch (er) {
            // the registry client rejects a network body that does not
            // hash to r.integrity before anything is written. store one
            // that un-gzips to it the way the client would have: under
            // the hash of its bytes it recorded for the check, labelled
            // like one it stores (see storedIntegrity), and for a url
            // that redirects, under the url the lockfile names only,
            // all a cache hit needs.
            const cause = (er as { cause?: ErrorCauseOptions }).cause
            if (
              cause?.code !== 'EINTEGRITY' ||
              !(cause.response instanceof Entry) ||
              !unzipped(cause.response)
            ) {
              throw er
            }
            response = cause.response
            r.integrity = response.integrityActual
            response.labelArtifact()
            rc.cache.set(key, response.encode(), {
              integrity: r.integrity,
            })
          }
          if (response.statusCode !== 200) {
            throw this.#resolveError(
              spec,
              options,
              `failed to fetch remote tarball: ${registryErrorMessage(response)}`,
              {
                url: r.resolved,
                response,
              },
            )
          }
          return response
        }

        let response = await fetchTarball()
        let found = storedIntegrity(response)
        // a cache hit that un-gzips to the lockfile hash, see above
        if (
          response.fromCache &&
          found &&
          r.integrity &&
          r.integrity !== found &&
          unzipped(response)
        ) {
          r.integrity = found
        }
        // a cached entry that does not match the lockfile, or that
        // cannot be verified any more: evict it and fetch again, once,
        // so the cache converges on an entry that carries its hash.
        // the link under r.integrity goes too: the lookup by it links
        // the value file there when nothing was, and the disk write
        // trusts an integrity file it finds, so it would link the old
        // bytes back over the new ones. the refetch reads nothing from
        // the cache, on this url or any it redirects to: a url that
        // redirects has an entry under the final url too, stored by
        // the same fetch and out of the eviction's reach.
        if (
          response.fromCache &&
          (!found || (r.integrity && r.integrity !== found))
        ) {
          rc.cache.delete(key, true, found)
          if (r.integrity) rc.cache.delete(key, true, r.integrity)
          await rc.cache.promise()
          response = await fetchTarball(false)
          found = storedIntegrity(response)
        }
        /* c8 ignore start - defense in depth: anything but a cache hit
         * that matched is a network body, the refetch included, since
         * it reads nothing from the cache on any redirect hop. the
         * registry client checks every network body against
         * r.integrity before anything is written, and records the hash
         * of one it had no expectation for; one it rejected is only
         * here with r.integrity re-pinned to its hash. */
        if (!found || (r.integrity && r.integrity !== found)) {
          throw error('Integrity check failure', {
            code: 'EINTEGRITY',
            spec,
            url: r.resolved,
            wanted: r.integrity,
            found,
          })
        }
        /* c8 ignore stop */
        r.integrity = found
        const buf = response.buffer()

        try {
          await (await this.getTarPool()).unpack(buf, target)
        } catch (er) {
          throw this.#resolveError(
            spec,
            options,
            'remote tar unpack failed',
            { cause: er },
          )
        }
        return r
      }
      case 'file': {
        // if it's a directory, then "extract" means "symlink"
        const { file } = f
        /* c8 ignore start - asserted in resolve() */
        if (file === undefined)
          throw this.#resolveError(spec, options, 'no file path')
        /* c8 ignore stop */
        const path = pathResolve(from, file)
        const st = await stat(path)
        if (st.isFile()) {
          try {
            await (await this.getTarPool()).unpackFile(path, target)
          } catch (er) {
            throw this.#resolveError(
              spec,
              options,
              'tar unpack failed',
              { cause: er },
            )
          }
        } else if (st.isDirectory()) {
          const rel = relative(dirname(target), path)
          await symlink(rel, target, 'dir')
          /* c8 ignore start */
        } else {
          throw this.#resolveError(
            spec,
            options,
            'file: specifier does not resolve to directory or tarball',
          )
        }
        /* c8 ignore stop */
        return r
      }
      case 'workspace': {
        const ws = this.#getWS(spec, options)
        const rel = relative(dirname(target), ws.fullpath)
        await symlink(rel, target, 'dir')
        return r
      }
    }
  }

  #getWS(spec: Spec, options: PackageInfoClientRequestOptions) {
    const { workspace } = spec
    /* c8 ignore start - asserted in resolve() */
    if (workspace === undefined)
      throw this.#resolveError(spec, options, 'no workspace ID')
    /* c8 ignore stop */
    if (!this.monorepo) {
      throw this.#resolveError(
        spec,
        options,
        'Not in a monorepo, cannot resolve workspace spec',
      )
    }
    const ws = this.monorepo.get(workspace)
    if (!ws) {
      throw this.#resolveError(spec, options, 'workspace not found', {
        wanted: workspace,
      })
    }
    return ws
  }

  /**
   * Return the manifest cache key for a spec and the current options.
   */
  #manifestCacheKey(
    spec: Spec,
    options: PackageInfoClientRequestOptions,
  ): string {
    let extra = ''
    if (options['node-version']) {
      extra += `${delimiter}node-version:${options['node-version']}`
    }
    if (options.os) {
      extra += `${delimiter}os:${options.os}`
    }
    if (options.arch) {
      extra += `${delimiter}arch:${options.arch}`
    }
    return encodeURIComponent(
      `${spec.registry ?? ''}${delimiter}${spec}${extra}`,
    )
  }

  /**
   * Conditionally return the path to the manifest cache file. The logic
   * to determine if caching should be skipped aligns with `pickManifest`
   * and is used to avoid caching manifest results that can be variable.
   */
  _manifestCachePath(
    spec: Spec,
    options: PackageInfoClientRequestOptions,
  ): string | undefined {
    if (options.before) {
      return
    }
    // a moving selector's result is variable, so don't cache it
    const f = spec.final
    if (isMovingSelector(f)) {
      return
    }
    const key = this.#manifestCacheKey(f, options)
    return pathResolve(this.#cachePath, 'package-info', key)
  }

  /**
   * Write a manifest cache file atomically (write to a temp file in
   * the same directory, then rename over the destination) so that
   * concurrent readers never observe a partially written manifest.
   * Freshness is tracked via the resulting file's mtime.
   */
  async #writeManifestCache(cachePath: string, json: string) {
    const tmp = `${cachePath}.${this.#manifestWriteRandom}.${this.#manifestWriteCount++}`
    try {
      try {
        await writeFile(tmp, json, 'utf8')
      } catch (err) {
        // in case the cache directory doesn't exist
        // just create it and retry
        if (!(
          err instanceof Error &&
          'code' in err &&
          err.code === 'ENOENT'
        )) {
          throw err
        }
        await mkdir(dirname(cachePath), { recursive: true })
        await writeFile(tmp, json, 'utf8')
      }
      await rename(tmp, cachePath)
    } catch {
      // failing to write the manifest cache is not an install failure
    }
  }

  async tarball(
    spec: Spec | string,
    options: PackageInfoClientExtractOptions = {},
  ): Promise<Buffer> {
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const f = spec.final

    switch (f.type) {
      case 'registry': {
        const { dist } = await this.manifest(spec, options)
        if (!dist)
          throw this.#resolveError(
            spec,
            options,
            `The registry manifest for ${spec} has no "dist" section, ` +
              `so no tarball can be resolved. The package version may be ` +
              `malformed or unpublished.`,
          )

        const { tarball, integrity } = dist
        if (!tarball) {
          throw this.#resolveError(
            spec,
            options,
            `The registry manifest for ${spec} is missing a tarball URL ` +
              `(dist.tarball). The package version may be malformed or ` +
              `unpublished in this registry.`,
          )
        }

        const fetchTarball = async (useCache?: false) => {
          const trustIntegrity =
            this.#trustedIntegrities.get(tarball) === integrity

          const response = await (
            await this.getRegistryClient()
          ).request(tarball, {
            ...options,
            integrity,
            trustIntegrity,
            // no dist.integrity: checked against the digest the registry
            // sent with it instead, before the client caches it
            verifyDigest:
              this.#vltPackuments.has(`${f.registry}${f.name}`) ?
                'required'
              : true,
            ...(useCache === false ? { useCache } : {}),
          })
          if (response.statusCode !== 200) {
            throw this.#resolveError(
              spec,
              options,
              `${registryErrorMessage(response)} when ` +
                `fetching the tarball for ${spec} at ${tarball}. The ` +
                `version may have been unpublished, or the registry may ` +
                `be misconfigured or unreachable.`,
              { response, url: tarball },
            )
          }

          const verified =
            !trustIntegrity &&
            response.checkIntegrity({ spec, url: tarball })
          // if we don't already trust it, but it's valid, start
          // trusting it
          if (verified) {
            this.#trustedIntegrities.set(tarball, response.integrity)
          }

          const buf = response.buffer()

          // Same as extract()
          if (integrity && !verified && !response.fromCache) {
            const hash = createHash('sha512')
            hash.update(buf)
            const computed: Integrity = `sha512-${hash.digest('base64')}`
            if (computed !== integrity) {
              throw error('Tarball integrity check failed', {
                code: 'EINTEGRITY',
                spec,
                url: tarball,
                wanted: integrity,
                found: computed,
              })
            }
          }

          return buf
        }

        try {
          return await fetchTarball()
        } catch (er) {
          if (
            er instanceof Error &&
            'cause' in er &&
            (er.cause as Record<string, unknown> | undefined)
              ?.code === 'EINTEGRITY'
          ) {
            return await fetchTarball(false)
          }
          throw er
        }
      }

      case 'git': {
        const {
          remoteURL,
          gitRemote,
          gitCommittish,
          gitSelectorParsed,
        } = f
        const s: Spec = spec
        if (!remoteURL) {
          if (!gitRemote) {
            throw this.#resolveError(
              spec,
              options,
              'no remote on git: specifier',
            )
          }
          const { path } = gitSelectorParsed ?? {}
          return await this.#tmpdir(async dir => {
            await clone(gitRemote, gitCommittish, dir + '/package', {
              spec: s,
            })
            let cwd = dir
            if (path !== undefined) {
              const src = pathResolve(dir, 'package', path)
              cwd = dirname(src)
              const pkg = pathResolve(cwd, 'package')
              if (src !== pkg) {
                const rand = randomBytes(6).toString('hex')
                // faster than deleting
                await rename(pkg, pkg + rand).catch(() => {})
                await rename(src, pkg)
              }
            }
            return tarC({ cwd, gzip: true }, ['package']).concat()
          })
        }
        // fallthrough if remoteURL set
      }

      case 'remote': {
        const { remoteURL } = f
        if (!remoteURL) {
          throw this.#resolveError(spec, options)
        }
        const response = await (
          await this.getRegistryClient()
        ).request(remoteURL)
        if (response.statusCode !== 200) {
          throw this.#resolveError(
            spec,
            options,
            `failed to fetch URL: ${registryErrorMessage(response)}`,
            { response, url: remoteURL },
          )
        }
        return response.buffer()
      }

      case 'file': {
        const { file } = f
        if (file === undefined)
          throw this.#resolveError(spec, options, 'no file path')
        const { from = this.#projectRoot } = options
        const path = pathResolve(from, file)
        const st = await stat(path)
        if (st.isDirectory()) {
          const p = dirname(path)
          const b = basename(path)
          // TODO: Pack properly, ignore stuff, bundleDeps, etc
          return tarC({ cwd: p, gzip: true }, [b]).concat()
        }
        return readFile(path)
      }

      case 'workspace': {
        // TODO: Pack properly, ignore stuff, bundleDeps, etc
        const ws = this.#getWS(spec, options)
        const p = dirname(ws.fullpath)
        const b = basename(ws.fullpath)
        return tarC({ cwd: p, gzip: true }, [b]).concat()
      }
    }
  }

  /**
   * Start a server-side resolve for `request` against `registry` and
   * return without waiting. `manifest()` answers from what has arrived,
   * and blocks on the request only when it needs a key that has not.
   *
   * A no-op unless the registry says it serves the endpoint. Anything it
   * does not deliver is left to `manifest()`.
   *
   * Returns the function that releases the request. A build calls it once
   * it has placed its last node; when the last build reading a request has
   * released it, the stream is ended, so an install never waits on a
   * stream nothing will read. The records it delivered stay answerable.
   */
  prefetchResolve(
    registry: string,
    request: ResolveRequest,
  ): () => void {
    if (!request.roots.length) return () => {}
    // keyed the way a spec names its registry, with the trailing slash
    if (!registry.endsWith('/')) registry += '/'
    const sent = `${registry} ${JSON.stringify(request)}`
    // the same question already in flight is read, not asked again
    const owned = this.#resolveOwners.get(sent)
    if (owned) {
      owned.readers++
      return () => this.#releaseResolve(sent, owned)
    }
    if (this.#resolveSent.has(sent)) return () => {}
    this.#resolveSent.add(sent)

    const owner = { controller: new AbortController(), readers: 1 }
    this.#resolveOwners.set(sent, owner)
    const promise = this.#runResolve(
      registry,
      request,
      owner.controller.signal,
    )
    let inflight = this.#resolveInflight.get(registry)
    if (!inflight)
      this.#resolveInflight.set(registry, (inflight = new Set()))
    inflight.add(promise)
    // dropped once settled, so manifest() stops waiting on a request that
    // has already delivered everything it is going to
    const clear = () => {
      inflight.delete(promise)
      // a request released and asked again is a new owner by now
      if (this.#resolveOwners.get(sent) === owner)
        this.#resolveOwners.delete(sent)
    }
    promise.then(clear, clear)
    return () => this.#releaseResolve(sent, owner)
  }

  /**
   * One build is done reading the request; the last one out ends it, and
   * the same question can then be asked again.
   */
  #releaseResolve(
    sent: string,
    owner: { controller: AbortController; readers: number },
  ): void {
    if (--owner.readers > 0) return
    if (this.#resolveOwners.get(sent) === owner) {
      this.#resolveOwners.delete(sent)
      this.#resolveSent.delete(sent)
    }
    owner.controller.abort()
  }

  /** Never rejects: a resolve that fails leaves every spec to manifest(). */
  async #runResolve(
    registry: string,
    request: ResolveRequest,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      if ((await this.capabilities(registry)).resolve === undefined)
        return
      const client = await this.getRegistryClient()
      this.#resolveLastRecordAt.set(registry, Date.now())
      await fetchResolve(
        client,
        registry,
        request,
        record => {
          this.#resolveLastRecordAt.set(registry, Date.now())
          // A resolve record is a vlt manifest: `dist.tarball` is the
          // tarball's basename, resolved against the package's `/-/`
          // directory like a v2 packument's, and a tarball without a hash
          // must carry a Repr-Digest.
          absolutizeTarball(
            record.manifest,
            `${registry}${record.name}/-/`,
          )
          this.#vltPackuments.add(`${registry}${record.name}`)
          // Indexed both ways: by the ranges that chose the version, which
          // is what the graph build asks for, and by the exact version, for
          // a lookup that already knows it.
          for (const spec of record.requested) {
            this.#deliverResolved(
              `${registry}${record.name}@${spec}`,
              record.manifest,
            )
          }
          this.#deliverResolved(
            `${registry}${record.name}@${record.version}`,
            record.manifest,
          )
        },
        signal,
      )
    } catch {
      // The per-name path still has every spec.
    }
  }

  /** Record an arrived manifest and wake whoever was waiting for it. */
  #deliverResolved(key: string, manifest: Manifest): void {
    debug('resolve delivered %s', key)
    this.#resolvedManifests.set(key, manifest)
    const waiters = this.#resolveWaiters.get(key)
    if (waiters) {
      this.#resolveWaiters.delete(key)
      for (const wake of waiters) wake(manifest)
    }
  }

  /**
   * The manifest an in-flight resolve is expected to carry for `key`, or
   * undefined once waiting stopped being worth it: every request settled
   * without the key, or no record of any kind arrived for a whole wait.
   *
   * A stream that is still delivering is worth waiting on, since its records
   * come in the order the build needs them; one that has stalled is not, and
   * the packument fetch was the alternative anyway.
   */
  async #awaitResolved(
    registry: string,
    key: string,
  ): Promise<Manifest | undefined> {
    const inflight = this.#resolveInflight.get(registry)
    if (!inflight?.size) return undefined

    let wake!: (manifest: Manifest) => void
    const arrival = new Promise<Manifest | undefined>(res => {
      wake = res
    })
    let waiters = this.#resolveWaiters.get(key)
    if (!waiters) this.#resolveWaiters.set(key, (waiters = new Set()))
    waiters.add(wake)

    const settled = Promise.all([...inflight]).then(() =>
      this.#resolvedManifests.get(key),
    )
    const waitMs = resolveWaitMs()
    try {
      for (;;) {
        const outcome = await Promise.race([
          arrival,
          settled,
          // unref'd: a pending wait must never be what keeps the process up
          setTimeout(waitMs, stalled, { ref: false }),
        ])
        if (outcome !== stalled) return outcome
        const lastRecordAt =
          this.#resolveLastRecordAt.get(registry) ?? 0
        if (Date.now() - lastRecordAt >= waitMs) return undefined
      }
    } finally {
      waiters.delete(wake)
      if (!waiters.size) this.#resolveWaiters.delete(key)
    }
  }

  /** How many manifests resolve batches have delivered. For tests. */
  get resolvedManifestCount(): number {
    return this.#resolvedManifests.size
  }

  async manifest(
    spec: Spec | string,
    options: PackageInfoClientRequestOptions = {},
  ) {
    const { from = this.#projectRoot } = options
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const f = spec.final

    switch (f.type) {
      case 'registry': {
        // a resolve entry never went through pickManifest under any
        // selection option, so those take the packument path
        const selecting = SELECTION_OPTIONS.some(
          k => options[k] !== undefined,
        )
        const resolveKey = `${f.registry ?? ''}${f.name}@${f.bareSpec}`
        if (!selecting) {
          const resolved = this.#resolvedManifests.get(resolveKey)
          if (resolved) return resolved
        }

        // Check if manifest is cached, if so just return it earlier
        const cachePath = this._manifestCachePath(spec, options)
        if (cachePath) {
          try {
            // Cache file exists, read and return it. Freshness is
            // tracked via the file's mtime, so the file content is
            // the manifest, plus a marker when it came from a vlt
            // packument, and can be returned as parsed.
            const [st, cached] = await Promise.all([
              stat(cachePath),
              readFile(cachePath, 'utf8'),
            ])
            const json = JSON.parse(cached) as Manifest & {
              __VLT_MANIFEST_CACHE_TIMESTAMP?: number
              __VLT_PACKUMENT?: boolean
            }
            // removes the cache file if older than its maximum age.
            // entries written by older clients embed a timestamp in
            // the manifest itself; treat those as expired so they get
            // rewritten in the mtime-tracked format.
            if (
              st.mtimeMs < this.#manifestCacheMinAge ||
              json.__VLT_MANIFEST_CACHE_TIMESTAMP !== undefined
            ) {
              this.#manifestWritePaths.delete(cachePath)
              void unlink(cachePath).catch(() => {})
              throw new Error('manifest cache expired')
            }
            // the tarball digest stays required across processes
            if (json.__VLT_PACKUMENT) {
              this.#vltPackuments.add(`${f.registry}${f.name}`)
              delete json.__VLT_PACKUMENT
            }
            return json
          } catch {
            // Cache miss, fetch from packument
          }
        }

        // Nothing local: give the in-flight resolve a bounded moment to
        // deliver this one key rather than fetching a packument for a
        // manifest that is probably already on its way.
        if (!selecting && f.registry) {
          const arrived = await this.#awaitResolved(
            f.registry,
            resolveKey,
          )
          if (arrived) return arrived
          debug('resolve miss %s', resolveKey)
        }

        const mani = pickManifest(
          await this.#packument(f, options, this.#stable(f)),
          spec,
          options,
        )
        if (!mani) throw this.#resolveError(spec, options)

        // Cache the manifest data. Skip paths already written this
        // run — first writer wins, avoiding duplicate serialization
        // and racing writers for the same path.
        if (cachePath && !this.#manifestWritePaths.has(cachePath)) {
          this.#manifestWritePaths.add(cachePath)
          const vlt = this.#vltPackuments.has(
            `${f.registry}${f.name}`,
          )
          void this.#writeManifestCache(
            cachePath,
            JSON.stringify(
              vlt ? { ...mani, __VLT_PACKUMENT: true } : mani,
            ),
          )
        }

        return mani
      }

      case 'git': {
        const {
          gitRemote,
          gitCommittish,
          remoteURL,
          gitSelectorParsed,
        } = f
        if (!remoteURL) {
          const s = spec
          if (!gitRemote)
            throw this.#resolveError(spec, options, 'no git remote')
          return await this.#tmpdir(async dir => {
            await clone(gitRemote, gitCommittish, dir, { spec: s })
            const { path } = gitSelectorParsed ?? {}
            const pkgDir =
              path !== undefined ? pathResolve(dir, path) : dir
            return this.#readExtracted(pkgDir, s, options)
          })
        }
        // fallthrough to remote
      }

      case 'remote': {
        const { remoteURL } = f
        if (!remoteURL) {
          throw this.#resolveError(
            spec,
            options,
            'no remoteURL on remote specifier',
          )
        }
        const s = spec
        return await this.#tmpdir(async dir => {
          const response = await (
            await this.getRegistryClient()
          ).request(remoteURL)
          if (response.statusCode !== 200) {
            throw this.#resolveError(
              s,
              options,
              `failed to fetch URL: ${registryErrorMessage(response)}`,
              { response, url: remoteURL },
            )
          }
          const buf = response.buffer()
          // the graph hands this back to extract() as the lockfile
          // hash: the hash the entry is stored under, or none for an
          // entry that cannot be verified, which extract() then
          // fetches again and records
          const integrity = storedIntegrity(response)

          try {
            await (await this.getTarPool()).unpack(buf, dir)
          } catch (er) {
            throw this.#resolveError(
              s,
              options,
              'tar unpack failed',
              { cause: er },
            )
          }

          const mani = this.#readExtracted(dir, s, options)
          if (integrity) mani.dist = { integrity }
          return mani
        })
      }

      case 'file': {
        const { file } = f
        if (file === undefined)
          throw this.#resolveError(spec, options, 'no file path')
        const path = pathResolve(from, file)
        const st = await stat(path)
        if (st.isDirectory()) {
          return this.packageJson.read(path)
        }
        const s = spec
        return await this.#tmpdir(async dir => {
          try {
            await (await this.getTarPool()).unpackFile(path, dir)
          } catch (er) {
            throw this.#resolveError(
              s,
              options,
              'tar unpack failed',
              { cause: er },
            )
          }
          return this.#readExtracted(dir, s, options)
        })
      }

      case 'workspace': {
        return this.#getWS(spec, options).manifest
      }
    }
  }

  /**
   * The packument for `spec`, with every version the registry has. Callers
   * that only pick a manifest out of it go through `#packument` instead,
   * which can ask for the prerelease-free one.
   */
  async packument(
    spec: Spec | string,
    options: PackageInfoClientRequestOptions = {},
  ): Promise<Packument> {
    return this.#packument(spec, options, false)
  }

  async #packument(
    spec: Spec | string,
    options: PackageInfoClientRequestOptions,
    stable: boolean,
  ): Promise<Packument> {
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const f = spec.final
    switch (f.type) {
      // RevDoc is the equivalent of a packument for a git repo
      case 'git': {
        const { gitRemote } = f
        if (!gitRemote) {
          throw this.#resolveError(
            spec,
            options,
            'git remote could not be determined',
          )
        }
        const revDoc = await revs(gitRemote, {
          cwd: this.options.projectRoot,
        })
        if (!revDoc) throw this.#resolveError(spec, options)
        return asPackument(revDoc)
      }

      // these are all faked packuments
      case 'file':
      case 'workspace':
      case 'remote': {
        const manifest = await this.manifest(f, options)
        return {
          name: manifest.name ?? '',
          'dist-tags': {
            latest: manifest.version ?? '',
          },
          versions: {
            [manifest.version ?? '']: manifest as Manifest,
          },
        }
      }

      case 'registry': {
        const { registry, name } = f
        if (!registry) throw noRegistryError(spec)
        // a full representation neither reads nor feeds the coalescing
        // map, which holds the abbreviated one
        if (options.full)
          return this.#fetchPackument(
            spec,
            options,
            new URL(name, registry),
          )
        // The only representation component of the coalescing key is
        // `?stable`; everything else about the request is fixed (see
        // #fetchPackument).
        const fullKey = `${registry}${name}`
        const packumentKey = stable ? `${fullKey}?stable` : fullKey
        // 0 pinned, 1 background, 2 forced
        const mode = revalidateMode(f, options)
        const rank =
          mode === true ? 2
          : mode ? 1
          : 0
        const inflight =
          this.#packumentPromises.get(packumentKey) ??
          // the full packument is a superset of the stable one, so an
          // in-flight full request answers a stable ask too, and a package
          // wanted both ways is still fetched once
          (stable ? this.#packumentPromises.get(fullKey) : undefined)
        // a request must not ride along on a weaker one: that can settle
        // to a fresh-but-stale cache hit, which is exactly what
        // forceRevalidate exists to avoid. the other direction is fine --
        // a stronger result is never staler.
        // costs at most one extra concurrent GET per stronger shape
        // asked for at once.
        if (inflight && inflight.rank >= rank) return inflight.promise
        // `?stable` is a distinct URL, so it gets its own disk cache entry
        const pakuURL = new URL(
          stable ? `${name}?stable` : name,
          registry,
        )
        const promise = this.#fetchPackument(spec, options, pakuURL)
        const record = { promise, rank }
        this.#packumentPromises.set(packumentKey, record)
        // Clean up once settled so we don't leak memory, unless a stronger
        // request has since taken the slot over.
        // Use .then/.catch instead of .finally to avoid creating
        // an unhandled rejection from the derived promise.
        const clear = () => {
          if (this.#packumentPromises.get(packumentKey) === record) {
            this.#packumentPromises.delete(packumentKey)
          }
        }
        promise.then(clear, clear)
        return promise
      }
    }
  }

  async #fetchPackument(
    spec: Spec,
    options: PackageInfoClientRequestOptions,
    pakuURL: URL,
    useCache?: false,
  ): Promise<Packument> {
    // Request vlt's abbreviated packument, falling back to the full one:
    //   accept: application/vnd.vlt.packument-v2+json; q=1.0,
    //           application/vnd.vlt.packument-v1+json; q=0.9,
    //           application/json; q=0.8, */*; q=0.1
    //
    // npm's corgi (`application/vnd.npm.install-v1+json`) is never
    // requested. The version entry returned here becomes `node.manifest`
    // and is persisted to the hidden lockfile, and corgi drops `license`
    // and `time`, so graph queries like `[license=MPL-2.0]` could not
    // match a field that was never stored (shipped in 1.0.0-rc.33 via
    // #1692, reverted in #1707). The vlt type guarantees both, and a
    // registry that does not know it ignores it and serves the full
    // packument, so the graph gets every field it relies on either way.
    // The one shape difference is `scripts`, which the vlt type replaces
    // with `hasInstallScript`; reify reads the extracted package.json in
    // that case.
    //
    // The RegistryClient disk cache key is method + URL only, so every
    // packument request must use this same accept header, and the SWR
    // revalidation child re-requests the representation it was given.
    const mode = revalidateMode(spec.final, options)
    const response = await (
      await this.getRegistryClient()
    ).request(pakuURL, {
      headers: {
        accept: options.full ? 'application/json' : PACKUMENT_ACCEPT,
      },
      ...(useCache === false || options.full ?
        { useCache: false }
      : {}),
      // a moving selector pays a conditional GET before use, so a moved
      // dist tag is seen at once (#1656). with backgroundRevalidate a
      // packument still within max-age is served and revalidated after
      // exit instead.
      ...(mode === undefined ? {} : { forceRevalidate: mode }),
    })
    if (response.statusCode !== 200) {
      throw this.#resolveError(
        spec,
        options,
        `failed to fetch packument: ${registryErrorMessage(response)}`,
        {
          url: pakuURL,
          response,
        },
      )
    }
    let paku: Packument
    try {
      paku = response.json() as Packument
    } catch (er) {
      if (useCache !== false) {
        return this.#fetchPackument(spec, options, pakuURL, false)
      }
      throw er
    }
    const { registry, name } = spec.final
    const { contentType } = response
    const v2 = contentType.startsWith(VLT_PACKUMENT_V2_MIME)
    if (v2 || contentType.startsWith(VLT_PACKUMENT_MIME)) {
      this.#vltPackuments.add(`${registry}${name}`)
    }
    /* c8 ignore next - registry specs always have a registry */
    if (registry) {
      const base = registry.endsWith('/') ? registry : registry + '/'
      absolutizeTarballs(paku, v2 ? `${base}${name}/-/` : base)
    }
    return paku
  }

  async resolve(
    spec: Spec | string,
    options: PackageInfoClientRequestOptions = {},
  ): Promise<Resolution> {
    const memoKey = String(spec)
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)

    const memo = this.#resolutions.get(memoKey)
    if (memo) return memo
    const f = spec.final

    switch (f.type) {
      case 'file': {
        const { file } = f
        if (!file || !f.file) {
          throw this.#resolveError(
            spec,
            options,
            'no path on file: specifier',
          )
        }
        const { from = this.#projectRoot } = options
        const resolved = pathResolve(from, f.file)
        const r = { resolved, spec }
        this.#resolutions.set(memoKey, r)
        return r
      }

      case 'remote': {
        const { remoteURL } = f
        if (!remoteURL)
          throw this.#resolveError(
            spec,
            options,
            'no URL in remote specifier',
          )
        const r = { resolved: remoteURL, spec }
        this.#resolutions.set(memoKey, r)
        return r
      }

      case 'workspace': {
        const ws = this.#getWS(spec, options)
        return {
          resolved: ws.fullpath,
          spec,
        }
      }

      case 'registry': {
        const mani = await this.manifest(spec, options)
        if (mani.dist) {
          const { integrity, tarball, signatures, alternates } =
            mani.dist
          if (tarball) {
            // A `.tar.br` is a distinct artifact, not a re-encoding of the
            // `.tgz`: it hashes differently, so `dist.integrity` and the
            // signatures over it describe the wrong bytes and are dropped.
            // What pins it instead is its own `Repr-Digest`, which the
            // registry that advertised it always sends -- hence `required`.
            const brotli = this.#brotliTarball(tarball, alternates)
            const r: Resolution =
              brotli ?
                {
                  resolved: brotli.tarball,
                  spec,
                  // Pin the alternate's own hash if the registry sent
                  // one. That also means we can look the package up in
                  // the global store before downloading it. If there is
                  // no hash, the Repr-Digest header is the only check we
                  // get, so require it instead of treating it as
                  // optional.
                  ...(brotli.integrity ?
                    { integrity: brotli.integrity }
                  : { digestRequired: true }),
                }
              : { resolved: tarball, integrity, signatures, spec }
            if (
              !brotli &&
              !integrity &&
              this.#vltPackuments.has(`${f.registry}${f.name}`)
            ) {
              r.digestRequired = true
            }
            this.#resolutions.set(memoKey, r)
            return r
          }
        }
        throw this.#resolveError(spec, options)
      }

      case 'git': {
        const { gitRemote, remoteURL, gitSelectorParsed } = f
        if (remoteURL && gitSelectorParsed?.path === undefined) {
          // known git host with a tarball download endpoint
          const r = { resolved: remoteURL, spec }
          this.#resolutions.set(memoKey, r)
          return r
        }
        if (!gitRemote) {
          throw this.#resolveError(
            spec,
            options,
            'no remote on git specifier',
          )
        }
        const rev = await gitResolve(gitRemote, f.gitCommittish, {
          spec,
        })
        if (rev) {
          const r = {
            resolved: `${gitRemote}#${rev.sha}`,
            spec,
          }
          if (gitSelectorParsed) {
            r.resolved += Object.entries(gitSelectorParsed)
              .filter(([_, v]) => v)
              .map(([k, v]) => `::${k}:${v}`)
              .join('')
          }
          this.#resolutions.set(memoKey, r)
          return r
        }
        // have to actually clone somewhere
        const s: Spec = spec
        return this.#tmpdir(async tmpdir => {
          const sha = await clone(
            gitRemote,
            s.gitCommittish,
            tmpdir,
            {
              spec: s,
            },
          )
          const r = {
            resolved: `${gitRemote}#${sha}`,
            spec: s,
          }
          this.#resolutions.set(memoKey, r)
          return r
        })
      }
    }
  }

  /**
   * Read the manifest out of a directory we cloned or unpacked. Failures are
   * labeled with the spec, because the internal directory says nothing about
   * which dependency is at fault.
   */
  #readExtracted(
    dir: string,
    spec: Spec,
    options: PackageInfoClientRequestOptions,
  ) {
    try {
      return this.packageJson.read(dir)
    } catch (er) {
      throw this.#resolveError(
        spec,
        options,
        'invalid package manifest',
        { cause: er },
      )
    }
  }

  async #tmpdir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const p = `package-info/${randomBytes(6).toString('hex')}`
    const dir = xdg.runtime(p)
    try {
      return await fn(dir)
    } finally {
      // intentionally do not await
      void rm(dir, { recursive: true, force: true })
    }
  }

  // error resolving
  #resolveError(
    spec?: Spec,
    options: PackageInfoClientRequestOptions = {},
    message = 'Could not resolve',
    extra: ErrorCauseOptions = {},
  ) {
    const { from = this.#projectRoot } = options
    // Every registry failure here carries its response, so the advice is
    // attached once rather than at each throw site. The cast is because
    // `response` is typed loosely enough to include a `fetch` Response.
    const advice =
      spec?.final.type === 'registry' ?
        tokenRefusalAdvice(extra.response, extra.url)
      : undefined
    const er = error(
      advice ? `${message}\n⚠️ ${advice}` : message,
      {
        code: 'ERESOLVE',
        spec,
        from,
        ...extra,
      },
      this.#resolveError,
    )
    return er
  }
}

// vlt packuments carry dist.tarball relative to `base`: the registry base
// for v1 (`foo/-/foo-1.0.0.tgz`, the form conventionalRegistryTarball
// builds), the package's `/-/` directory for v2 (`foo-1.0.0.tgz`).
// Nothing downstream sees a relative URL: the manifest cache, the graph
// and the lockfile all get the absolute one.
const absolutizeTarballs = (paku: Packument, base: string) => {
  for (const manifest of Object.values(paku.versions)) {
    absolutizeTarball(manifest, base)
  }
}

/** Resolve a relative `dist.tarball` against `base`; an absolute one stays. */
const absolutizeTarball = (manifest: Manifest, base: string) => {
  const dist = manifest.dist
  if (dist?.tarball && !/^[a-z][a-z0-9+.-]*:/i.test(dist.tarball)) {
    dist.tarball = String(new URL(dist.tarball, base))
  }
}
