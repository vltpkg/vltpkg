import { Effect, Layer, Schema } from 'effect'
import { FetchHttpClient, HttpClient } from '@effect/platform'
import { compare, gt, prerelease } from '@vltpkg/semver'
import { normalizeManifest } from '@vltpkg/types'
import { parseAriaLabelFromSVG } from '@/utils/parse-aria-label-from-svg.ts'
import {
  getRepoOrigin,
  getRepositoryApiUrl,
} from '@/utils/get-repo-url.ts'
import { retrieveGravatar } from '@/utils/retrieve-gravatar.ts'

// Re-export utilities
export { retrieveGravatar as retrieveAvatar } from '@/utils/retrieve-gravatar.ts'
export { parseAriaLabelFromSVG } from '@/utils/parse-aria-label-from-svg.ts'

import type { Spec } from '@vltpkg/spec/browser'
import type { DataSource } from '@/components/explorer-grid/selected-item/context.tsx'
import type { NormalizedManifest, Repository } from '@vltpkg/types'

/**
 * HttpClient layer with tracing propagation disabled to avoid CORS issues
 * with the traceparent header on third-party APIs.
 */
const HttpClientNoTracing = Layer.effect(
  HttpClient.HttpClient,
  Effect.map(HttpClient.HttpClient, client =>
    HttpClient.withTracerPropagation(client, false),
  ),
).pipe(Layer.provide(FetchHttpClient.layer))

export const NAME_PATTERN = /^([^(<]+)/
export const URL_PATTERN = /\(([^()]+)\)/
export const EMAIL_PATTERN = /<([^<>]+)>/

/**
 * Schema extension that preserves unknown/excess properties in structs.
 * Use with Schema.extend() to allow additional properties beyond those defined.
 */
const ExcessProperties = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
})

const AuthorInfoSchema = Schema.Struct({
  name: Schema.String,
  mail: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
  web: Schema.optional(Schema.String),
})

export type AuthorInfo = Schema.Schema.Type<typeof AuthorInfoSchema>

/**
 * A Schema of partial errors in order to track the
 * external network requests that may fail.
 */
export const PartialErrorSchema = Schema.Struct({
  source: Schema.String,
  message: Schema.String,
})

/**
 * Partial errors which may occur as a result of failing
 * external network requests.
 */
export type PartialError = Schema.Schema.Type<
  typeof PartialErrorSchema
>

export const readAuthor = (
  author: string | AuthorInfo,
): AuthorInfo | undefined => {
  if (typeof author === 'string') {
    const name = NAME_PATTERN.exec(author)?.[0].trim() || ''
    const url = URL_PATTERN.exec(author)?.[1] || ''
    const email = EMAIL_PATTERN.exec(author)?.[1] || ''
    const res = {
      name,
      ...(email ? { email } : undefined),
      ...(url ? { url } : undefined),
    }
    return res.name ? res : undefined
  } else {
    if (!author.name) return
    const url = author.web || author.url || ''
    const email = author.mail || author.email || ''
    return {
      name: author.name,
      ...(email ? { email } : undefined),
      ...(url ? { url } : undefined),
    }
  }
}

export const readRepository = (
  repository: string | Repository,
): string | undefined => {
  if (typeof repository === 'string') {
    return repository
  }
  if (repository.url) {
    return repository.url
  }
}

/**
 * Fetches a full (not corgi) packument for version history, etc.
 */

// ConditionalValue is recursive, so we need to define it using Schema.suspend
const ConditionalValueSchema: Schema.Schema<any> = Schema.suspend(
  () =>
    Schema.Union(
      Schema.String,
      Schema.Null,
      Schema.Array(ConditionalValueSchema),
      Schema.Record({
        key: Schema.String,
        value: ConditionalValueSchema,
      }),
    ),
)

const PersonSchema = Schema.Union(
  Schema.String,
  Schema.Undefined,
  Schema.Struct({
    name: Schema.String,
    url: Schema.optional(Schema.String),
    email: Schema.optional(Schema.String),
  }),
  Schema.Array(
    Schema.Struct({
      name: Schema.String,
      url: Schema.optional(Schema.String),
      email: Schema.optional(Schema.String),
    }),
  ),
)

// Simplified ManifestSchema - only defines fields we actually use,
// everything else is captured by ExcessProperties as Schema.Unknown
const ManifestSchema = Schema.extend(
  Schema.Struct({
    // Fields we actually use for version processing
    name: Schema.optional(Schema.String),
    version: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    author: Schema.optional(PersonSchema),
    license: Schema.optional(Schema.String),
    homepage: Schema.optional(Schema.String),
    gitHead: Schema.optional(Schema.String),
    // Repository can be string or object
    repository: Schema.optional(Schema.Unknown),
    // Dist info for tarball, size, integrity
    dist: Schema.optional(
      Schema.extend(
        Schema.Struct({
          integrity: Schema.optional(Schema.String),
          shasum: Schema.optional(Schema.String),
          tarball: Schema.optional(Schema.String),
          fileCount: Schema.optional(Schema.Number),
          unpackedSize: Schema.optional(Schema.Number),
        }),
        ExcessProperties,
      ),
    ),
    // npmUser for publisher info
    _npmUser: Schema.optional(
      Schema.extend(
        Schema.Struct({
          name: Schema.optional(Schema.String),
          email: Schema.optional(Schema.String),
        }),
        ExcessProperties,
      ),
    ),
    // Contributors for contributor avatars
    contributors: Schema.optional(Schema.Unknown),
  }),
  ExcessProperties,
)

type Manifest = Schema.Schema.Type<typeof ManifestSchema>

const PackumentSchema = Schema.extend(
  Schema.Struct({
    name: Schema.String,
    'dist-tags': Schema.Record({
      key: Schema.String,
      value: Schema.String,
    }),
    versions: Schema.Record({
      key: Schema.String,
      value: ManifestSchema,
    }),
    modified: Schema.optional(Schema.String),
    time: Schema.optional(
      Schema.Record({
        key: Schema.String,
        value: Schema.String,
      }),
    ),
    readme: Schema.optional(Schema.String),
    contributors: Schema.optional(PersonSchema),
    maintainers: Schema.optional(PersonSchema),
  }),
  ExcessProperties,
)

type Packument = Schema.Schema.Type<typeof PackumentSchema>

/**
 * Fetches a full (not corgi) packument for version history, etc.
 */
const fetchPackument = ({ spec }: { spec: Spec }) =>
  Effect.gen(function* () {
    // Just bail out early if we can't resolve a registry
    if (!spec.registry) return undefined

    const packumentURL = new URL(spec.registry)
    packumentURL.pathname = spec.name

    const httpClient = yield* HttpClient.HttpClient

    const res = yield* httpClient.get(packumentURL).pipe(
      Effect.catchTags({
        RequestError: () => Effect.succeed(undefined),
        ResponseError: () => Effect.succeed(undefined),
      }),
    )

    if (!res) return undefined

    const raw = yield* res.json

    const data = yield* Schema.decodeUnknown(PackumentSchema)(
      raw,
    ).pipe(
      Effect.catchTag('ParseError', () => Effect.succeed(undefined)),
    )

    return data
  })

/**
 * Uses a packument and the parent manifest to process
 * versions and greater version information about the dependency
 */
const processPackumentVersions = async ({
  packument,
  manifest,
}: {
  packument: Packument
  manifest: Manifest
}) => {
  try {
    const versions = Object.entries(packument.versions)
      .sort((a, b) => compare(b[0], a[0]))
      .map(async ([version, manifest]) => {
        const npmUser = manifest._npmUser

        const avatar =
          npmUser?.email ?
            await retrieveGravatar(npmUser.email)
          : undefined

        return {
          version,
          publishedDate: packument.time?.[version],
          unpackedSize:
            packument.versions[version]?.dist?.unpackedSize,
          integrity: packument.versions[version]?.dist?.integrity,
          tarball: packument.versions[version]?.dist?.tarball,
          gitHead: packument.versions[version]?.gitHead,
          publishedAuthor: {
            name: npmUser?.name,
            email: npmUser?.email,
            avatar,
          },
        }
      })

    const resolvedVersions = await Promise.all(versions)

    return {
      versions: resolvedVersions,
      greaterVersions:
        manifest.version ?
          resolvedVersions.filter(
            v =>
              manifest.version &&
              gt(v.version, manifest.version) &&
              !prerelease(v.version)?.length,
          )
        : undefined,
    }
  } catch (_e: unknown) {
    return undefined
  }
}

/**
 * Constructs a favicon for the repository
 * if a manifest is loaded.
 */

const FaviconSchema = Schema.Struct({
  src: Schema.String,
  alt: Schema.String,
})

const fetchFavIcon = ({
  manifest,
}: {
  manifest?: NormalizedManifest
}) => {
  if (!manifest?.repository) return undefined
  const repo = getRepoOrigin(manifest.repository)
  if (!repo) return undefined
  return {
    favicon: {
      src: `https://www.github.com/${repo.org}.png`,
      alt: `${repo.org} avatar`,
    },
  }
}

/**
 * Fetches the open issue count of an orgs repo
 * using a shield, by parsing out its aria-label.
 */
const fetchOpenIssueCount = ({
  org,
  repo,
}: {
  org: string
  repo: string
}) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    const res = yield* httpClient
      .get(`https://img.shields.io/github/issues/${org}/${repo}`)
      .pipe(
        Effect.catchTags({
          RequestError: () => Effect.succeed(undefined),
          ResponseError: () => Effect.succeed(undefined),
        }),
      )

    if (!res) return undefined

    const raw = yield* res.text

    const text = yield* Schema.decodeUnknown(Schema.String)(raw).pipe(
      Effect.catchTag('ParseError', () => Effect.succeed(undefined)),
    )

    if (!text) return undefined

    const result = yield* Effect.try({
      try: () => parseAriaLabelFromSVG(text),
      catch: () => new Error('Failed to parse SVG'),
    }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))

    return result
  }).pipe(
    Effect.timeoutFail({
      duration: API_TIMEOUT_MS,
      onTimeout: () => new Error('GitHub issues count timed out'),
    }),
  )

/**
 * Fetches the open pull request count of an orgs repo
 * using a shield, by parsing out its aria-label.
 */
const fetchOpenPullRequestCount = ({
  org,
  repo,
}: {
  org: string
  repo: string
}) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    const res = yield* httpClient
      .get(`https://img.shields.io/github/issues-pr/${org}/${repo}`)
      .pipe(
        Effect.catchTags({
          RequestError: () => Effect.succeed(undefined),
          ResponseError: () => Effect.succeed(undefined),
        }),
      )

    if (!res) return undefined

    const raw = yield* res.text

    const text = yield* Schema.decodeUnknown(Schema.String)(raw).pipe(
      Effect.catchTag('ParseError', () => Effect.succeed(undefined)),
    )

    if (!text) return undefined

    const result = yield* Effect.try({
      try: () => parseAriaLabelFromSVG(text),
      catch: () => new Error('Failed to parse SVG'),
    }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))

    return result
  }).pipe(
    Effect.timeoutFail({
      duration: API_TIMEOUT_MS,
      onTimeout: () => new Error('GitHub PRs count timed out'),
    }),
  )

/**
 * Fetches the `README.md` of an orgs repo using `unpkg`
 * and parses it using `parseReadme` to resolve gfm and relative
 * references of images and links.
 */

/** Timeout for external API requests in milliseconds (15s for slow services like unpkg) */
const API_TIMEOUT_MS = 15000

/**
 * Fetches the last 365 days of downloads
 * for a specified package
 */

const DownloadsDataSchema = Schema.Array(
  Schema.Struct({
    downloads: Schema.Number,
    day: Schema.String,
  }),
)

const DownloadsRangeSchema = Schema.Struct({
  start: Schema.String,
  end: Schema.String,
  downloads: DownloadsDataSchema,
})

const YearlyDownloadsSchema = Schema.Struct({
  start: Schema.String,
  end: Schema.String,
  package: Schema.String,
  downloads: DownloadsDataSchema,
})

const VersionSchema = Schema.Struct({
  version: Schema.String,
  publishedDate: Schema.optional(Schema.String),
  publishedAuthor: Schema.optional(
    Schema.Struct({
      name: Schema.optional(Schema.String),
      email: Schema.optional(Schema.String),
      avatar: Schema.optional(Schema.String),
    }),
  ),
  unpackedSize: Schema.optional(Schema.Number),
  integrity: Schema.optional(Schema.String),
  tarball: Schema.optional(Schema.String),
  gitHead: Schema.optional(Schema.String),
})

export type Version = Schema.Schema.Type<typeof VersionSchema>

/**
 * Fetches the last 365 days of downloads for a specified package.
 */
const fetchDownloadsLastYear = ({ spec }: { spec: Spec }) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    const res = yield* httpClient
      .get(
        `https://api.npmjs.org/downloads/range/last-year/${encodeURIComponent(spec.name)}`,
      )
      .pipe(
        Effect.catchTags({
          RequestError: () => Effect.succeed(undefined),
          ResponseError: () => Effect.succeed(undefined),
        }),
      )

    if (!res) return undefined

    const raw = yield* res.json

    const data = yield* Schema.decodeUnknown(YearlyDownloadsSchema)(
      raw,
    ).pipe(
      Effect.catchTag('ParseError', () => Effect.succeed(undefined)),
    )

    if (!data) return undefined

    return {
      downloadsLastYear: {
        start: data.start,
        end: data.end,
        downloads: data.downloads.map(
          (download: { downloads: number; day: string }) => ({
            downloads: download.downloads,
            day: download.day,
          }),
        ),
      },
    }
  })

/**
 * Fetches the last 7 days of downloads
 * for a specified package of a specified version
 */

const WeeklyDownloadsDataSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Number,
})

const WeeklyDownloadsSchema = Schema.Struct({
  package: Schema.String,
  downloads: WeeklyDownloadsDataSchema,
})

/**
 * Fetches the last 7 days of downloads per version.
 */
const fetchDownloadsPerVersion = ({ spec }: { spec: Spec }) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    const res = yield* httpClient
      .get(
        `https://api.npmjs.org/versions/${encodeURIComponent(spec.name)}/last-week`,
      )
      .pipe(
        Effect.catchTags({
          RequestError: () => Effect.succeed(undefined),
          ResponseError: () => Effect.succeed(undefined),
        }),
      )

    if (!res) return undefined

    const raw = yield* res.json

    const data = yield* Schema.decodeUnknown(WeeklyDownloadsSchema)(
      raw,
    ).pipe(
      Effect.catchTag('ParseError', () => Effect.succeed(undefined)),
    )

    if (!data) return undefined

    return {
      downloadsPerVersion: data.downloads,
    }
  })

/**
 * Fetches the GitHub Repository for a specified package
 */

const RepositorySchema = Schema.extend(
  Schema.Struct({
    owner: Schema.optional(
      Schema.extend(
        Schema.Struct({
          avatar_url: Schema.optional(Schema.String),
          login: Schema.optional(Schema.String),
        }),
        ExcessProperties,
      ),
    ),
    updated_at: Schema.optional(Schema.String),
    stargazers_count: Schema.optional(Schema.String),
    organization: Schema.optional(
      Schema.extend(
        Schema.Struct({
          login: Schema.optional(Schema.String),
        }),
        ExcessProperties,
      ),
    ),
    name: Schema.optional(Schema.String),
    default_branch: Schema.optional(Schema.String),
    commits_url: Schema.optional(Schema.String),
    contributors_url: Schema.optional(Schema.String),
  }),
  ExcessProperties,
)

/**
 * Fetches the GitHub Repository for a specified package.
 */
const fetchGitHubRepo = ({ gitHubApi }: { gitHubApi: string }) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    const res = yield* httpClient.get(gitHubApi).pipe(
      Effect.catchTags({
        RequestError: () => Effect.succeed(undefined),
        ResponseError: () => Effect.succeed(undefined),
      }),
    )

    if (!res) return undefined

    const raw = yield* res.json

    const data = yield* Schema.decodeUnknown(RepositorySchema)(
      raw,
    ).pipe(
      Effect.catchTag('ParseError', () => Effect.succeed(undefined)),
    )

    if (!data) return undefined

    return data
  }).pipe(
    Effect.timeoutFail({
      duration: API_TIMEOUT_MS,
      onTimeout: () => new Error('GitHub API timed out'),
    }),
  )

/**
 * Fetches the registry manifest for a specific version
 * to get publisher info and potentially fill in missing data.
 */
const fetchRegistryManifest = ({ spec }: { spec: Spec }) =>
  Effect.gen(function* () {
    if (!spec.registry) return undefined

    const httpClient = yield* HttpClient.HttpClient

    const url = new URL(spec.registry)
    /**
     * We assume that because `fetchRegistryManifest` is only called
     * for external packages, that it will always contain a semver value
     */
    url.pathname = `${spec.name}/${spec.semver || 'latest'}`

    const res = yield* httpClient.get(url).pipe(
      Effect.catchTags({
        RequestError: () => Effect.succeed(undefined),
        ResponseError: () => Effect.succeed(undefined),
      }),
    )

    if (!res) return undefined

    const raw = yield* res.json

    const data = yield* Schema.decodeUnknown(ManifestSchema)(
      raw,
    ).pipe(
      Effect.catchTag('ParseError', () => Effect.succeed(undefined)),
    )

    if (!data) return undefined

    // Cast to Manifest type for normalizeManifest (Schema produces readonly)
    return normalizeManifest(
      data as unknown as Parameters<typeof normalizeManifest>[0],
    ) as NormalizedManifest & {
      _npmUser?: { name?: string; email?: string }
    }
  })

/**
 * Fetches contributor avatars from manifest contributors
 */
const ContributorSchema = Schema.extend(
  Schema.Struct({
    email: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
    avatar: Schema.optional(Schema.String),
    writeAccess: Schema.optional(Schema.Boolean),
    isPublisher: Schema.optional(Schema.Boolean),
  }),
  ExcessProperties,
)

export type Contributor = Schema.Schema.Type<typeof ContributorSchema>

const fetchContributorAvatars = ({
  manifest,
}: {
  manifest?: NormalizedManifest
}) =>
  Effect.gen(function* () {
    if (!manifest?.contributors || manifest.contributors.length === 0)
      return undefined

    const contributors = yield* Effect.all(
      manifest.contributors.map(contributor =>
        Effect.tryPromise({
          try: async () => ({
            ...contributor,
            avatar: await retrieveGravatar(contributor.email || ''),
          }),
          catch: () =>
            new Error('Failed to fetch contributor avatar'),
        }).pipe(
          Effect.catchAll(() =>
            Effect.succeed({ ...contributor, avatar: undefined }),
          ),
        ),
      ),
      { concurrency: 'unbounded' },
    )

    return contributors as Contributor[]
  })

/**
 * Fetches publisher avatar from gravatar
 */
const fetchPublisherAvatar = ({ email }: { email: string }) =>
  Effect.tryPromise({
    try: async () => {
      const src = await retrieveGravatar(email)
      return { src, alt: 'avatar' }
    },
    catch: () => new Error('Failed to fetch publisher avatar'),
  }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))

export const publicRegistry = 'https://registry.npmjs.org/'

/**
 * Wraps an Effect to track errors by data source.
 * Returns { data, error } where error is set if the fetch failed.
 */
const withErrorTracking = <A>(
  effect: Effect.Effect<A, unknown, HttpClient.HttpClient>,
  source: DataSource,
): Effect.Effect<
  { data: A | undefined; error: PartialError | undefined },
  never,
  HttpClient.HttpClient
> =>
  effect.pipe(
    Effect.map(data => ({ data, error: undefined })),
    Effect.catchAll(err => {
      const message =
        err instanceof Error ? err.message
        : (
          typeof err === 'object' && err !== null && 'message' in err
        ) ?
          String((err as { message: unknown }).message)
        : 'Unknown error'
      return Effect.succeed({
        data: undefined,
        error: { source, message },
      })
    }),
  )

const _DetailsInfoSchema = Schema.Struct({
  author: Schema.optional(AuthorInfoSchema),
  downloadsPerVersion: Schema.optional(WeeklyDownloadsDataSchema),
  downloadsLastYear: Schema.optional(DownloadsRangeSchema),
  favicon: Schema.optional(FaviconSchema),
  publisher: Schema.optional(AuthorInfoSchema),
  publisherAvatar: Schema.optional(FaviconSchema),
  versions: Schema.optional(Schema.Array(VersionSchema)),
  greaterVersions: Schema.optional(Schema.Array(VersionSchema)),
  contributors: Schema.optional(Schema.Array(ContributorSchema)),
  stargazersCount: Schema.optional(Schema.String),
  openIssueCount: Schema.optional(Schema.String),
  openPullRequestCount: Schema.optional(Schema.String),
  // The fetched/resolved manifest (useful for callers who need it)
  manifest: Schema.optional(Schema.Unknown),
  // Partial errors from individual data sources
  partialErrors: Schema.optional(Schema.Array(PartialErrorSchema)),
})

export type DetailsInfo = Schema.Schema.Type<
  typeof _DetailsInfoSchema
>

/**
 * Internal Effect that fetches all details for a package spec,
 * combining multiple Effect-based fetchers running concurrently.
 * For local packages, pass packageLocation and projectRoot to fetch README from node_modules.
 */
const fetchDetailsEffect = ({
  spec,
  manifest,
}: {
  spec: Spec
  manifest?: NormalizedManifest
}): Effect.Effect<DetailsInfo, never, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const finalSpec = spec.final
    const isPublicRegistry = finalSpec.registry === publicRegistry

    // Determine GitHub API URL from spec or manifest
    const manifestRepoUrl =
      manifest?.repository ?
        readRepository(manifest.repository)
      : undefined
    const gitHubApi =
      finalSpec.gitRemote ? getRepositoryApiUrl(finalSpec.gitRemote)
      : manifestRepoUrl ? getRepositoryApiUrl(manifestRepoUrl)
      : undefined

    // Get repository details for issues/PRs/readme
    const repoDetails =
      manifest?.repository ?
        getRepoOrigin(manifest.repository)
      : undefined

    // Run all independent effects concurrently with error tracking
    const results = yield* Effect.all(
      {
        packument: withErrorTracking(
          fetchPackument({ spec: finalSpec }),
          'npm-packument',
        ),

        // Only fetch registry manifest if:
        // 1. It's a public registry package
        // 2. We don't already have a manifest (local packages have one)
        registryManifest:
          isPublicRegistry && !manifest ?
            withErrorTracking(
              fetchRegistryManifest({ spec: finalSpec }),
              'npm-manifest',
            )
          : Effect.succeed({ data: undefined, error: undefined }),

        downloadsLastYear:
          isPublicRegistry ?
            withErrorTracking(
              fetchDownloadsLastYear({ spec: finalSpec }),
              'npm-downloads',
            )
          : Effect.succeed({ data: undefined, error: undefined }),

        downloadsPerVersion:
          isPublicRegistry ?
            withErrorTracking(
              fetchDownloadsPerVersion({ spec: finalSpec }),
              'npm-downloads-versions',
            )
          : Effect.succeed({ data: undefined, error: undefined }),

        gitHubRepo:
          gitHubApi ?
            withErrorTracking(
              fetchGitHubRepo({ gitHubApi }),
              'github-repo',
            )
          : Effect.succeed({ data: undefined, error: undefined }),

        openIssueCount:
          repoDetails ?
            withErrorTracking(
              fetchOpenIssueCount({
                org: repoDetails.org,
                repo: repoDetails.repo,
              }),
              'github-issues',
            )
          : Effect.succeed({ data: undefined, error: undefined }),

        openPullRequestCount:
          repoDetails ?
            withErrorTracking(
              fetchOpenPullRequestCount({
                org: repoDetails.org,
                repo: repoDetails.repo,
              }),
              'github-prs',
            )
          : Effect.succeed({ data: undefined, error: undefined }),

        contributors: withErrorTracking(
          fetchContributorAvatars({ manifest }),
          'contributors',
        ),
      },
      { concurrency: 'unbounded' },
    )

    // Collect all partial errors
    const partialErrors: PartialError[] = [
      results.packument.error,
      results.registryManifest.error,
      results.downloadsLastYear.error,
      results.downloadsPerVersion.error,
      results.gitHubRepo.error,
      results.openIssueCount.error,
      results.openPullRequestCount.error,
      results.contributors.error,
    ].filter((e): e is PartialError => e !== undefined)

    // Extract publisher info from registry manifest (needed early for version processing)
    const registryManifest = results.registryManifest.data

    // Process packument versions if available
    // Use registryManifest as fallback for external packages where manifest is undefined
    const manifestForVersions = manifest ?? registryManifest
    const packumentData = results.packument.data
    const versionInfo = yield* (() => {
      if (
        packumentData === undefined ||
        manifestForVersions === undefined
      ) {
        return Effect.succeed(undefined)
      }
      return Effect.tryPromise({
        try: () =>
          processPackumentVersions({
            packument: packumentData,
            manifest: manifestForVersions as Manifest,
          }),
        catch: () => new Error('Failed to process versions'),
      }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
    })()
    const publisher =
      registryManifest?._npmUser ?
        readAuthor(registryManifest._npmUser as AuthorInfo)
      : undefined

    // Fetch publisher avatar if we have an email
    const publisherEmail = publisher?.email
    const publisherName = publisher?.name
    const publisherAvatar = yield* (() => {
      if (publisherEmail === undefined) {
        return Effect.succeed(undefined)
      }
      return fetchPublisherAvatar({ email: publisherEmail }).pipe(
        Effect.map(avatar =>
          avatar ?
            {
              src: avatar.src,
              alt:
                publisherName ?
                  `${publisherName}'s avatar`
                : 'avatar',
            }
          : undefined,
        ),
      )
    })()

    // Determine author - prefer local manifest, fall back to registry
    const localAuthor =
      manifest?.author ?
        readAuthor(manifest.author as string | AuthorInfo)
      : undefined
    const remoteAuthor =
      registryManifest?.author ?
        readAuthor(registryManifest.author as string | AuthorInfo)
      : undefined
    const author = localAuthor ?? remoteAuthor

    // Determine favicon - prefer local manifest repo, fall back to registry
    const faviconInfo =
      fetchFavIcon({ manifest }) ??
      (registryManifest ?
        fetchFavIcon({ manifest: registryManifest })
      : undefined)

    // Extract registry manifest repo details once (used for multiple fallbacks)
    const regRepoUrl =
      registryManifest?.repository ?
        readRepository(registryManifest.repository)
      : undefined
    const regRepoDetails =
      regRepoUrl ? getRepoOrigin(regRepoUrl) : undefined
    const regGitHubApi =
      regRepoUrl ? getRepositoryApiUrl(regRepoUrl) : undefined

    // Run all fallback fetches in parallel for better performance
    const fallbackResults = yield* Effect.all(
      {
        // Fallback for GitHub repo (stars)
        gitHubRepo:
          (
            results.gitHubRepo.data === undefined &&
            regGitHubApi !== undefined
          ) ?
            fetchGitHubRepo({ gitHubApi: regGitHubApi }).pipe(
              Effect.catchAll(() => Effect.succeed(undefined)),
            )
          : Effect.succeed(results.gitHubRepo.data),

        // Fallback for open issue count
        openIssueCount:
          (
            results.openIssueCount.data === undefined &&
            regRepoDetails !== undefined
          ) ?
            fetchOpenIssueCount({
              org: regRepoDetails.org,
              repo: regRepoDetails.repo,
            }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
          : Effect.succeed(results.openIssueCount.data),

        // Fallback for open PR count
        openPullRequestCount:
          (
            results.openPullRequestCount.data === undefined &&
            regRepoDetails !== undefined
          ) ?
            fetchOpenPullRequestCount({
              org: regRepoDetails.org,
              repo: regRepoDetails.repo,
            }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
          : Effect.succeed(results.openPullRequestCount.data),

        // Fallback for contributors (use registryManifest if manifest was undefined)
        contributors:
          (
            results.contributors.data === undefined &&
            registryManifest !== undefined
          ) ?
            fetchContributorAvatars({
              manifest: registryManifest,
            }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
          : Effect.succeed(results.contributors.data),
      },
      { concurrency: 'unbounded' },
    )

    // Determine the best manifest to return (prefer passed-in, fall back to fetched)
    const resolvedManifest = manifest ?? registryManifest

    // Assemble final DetailsInfo with spread-based optional fields
    return {
      ...(author && { author }),
      ...(publisher && { publisher }),
      ...(publisherAvatar && { publisherAvatar }),
      ...(faviconInfo?.favicon && { favicon: faviconInfo.favicon }),
      ...(results.downloadsLastYear.data?.downloadsLastYear && {
        downloadsLastYear:
          results.downloadsLastYear.data.downloadsLastYear,
      }),
      ...(results.downloadsPerVersion.data?.downloadsPerVersion && {
        downloadsPerVersion:
          results.downloadsPerVersion.data.downloadsPerVersion,
      }),
      ...(fallbackResults.gitHubRepo?.stargazers_count && {
        stargazersCount: fallbackResults.gitHubRepo.stargazers_count,
      }),
      ...(fallbackResults.openIssueCount && {
        openIssueCount: fallbackResults.openIssueCount,
      }),
      ...(fallbackResults.openPullRequestCount && {
        openPullRequestCount: fallbackResults.openPullRequestCount,
      }),
      ...(versionInfo?.versions && {
        versions: versionInfo.versions,
      }),
      ...(versionInfo?.greaterVersions && {
        greaterVersions: versionInfo.greaterVersions,
      }),
      ...(fallbackResults.contributors && {
        contributors: fallbackResults.contributors,
      }),
      ...(resolvedManifest && { manifest: resolvedManifest }),
      ...(partialErrors.length > 0 && { partialErrors }),
    } as DetailsInfo
  }).pipe(
    // Convert Effect errors to defects that will reject the promise
    Effect.catchAll((error: unknown) =>
      Effect.die(
        new Error(
          error instanceof Error ?
            error.message
          : 'Failed to fetch details',
        ),
      ),
    ),
  )

/**
 * Fetches all details for a package spec, combining multiple
 * concurrent fetchers. Returns a Promise that resolves to a
 * complete DetailsInfo object.
 * For local packages, pass packageLocation and projectRoot to fetch README from node_modules.
 */
export const fetchDetails = ({
  spec,
  manifest,
}: {
  spec: Spec
  manifest?: NormalizedManifest
}): Promise<DetailsInfo> =>
  Effect.runPromise(
    fetchDetailsEffect({
      spec,
      manifest,
    }).pipe(Effect.provide(HttpClientNoTracing)),
  )

export {
  fetchPackument,
  fetchRegistryManifest,
  fetchOpenIssueCount,
  fetchOpenPullRequestCount,
  fetchDownloadsLastYear,
  fetchDownloadsPerVersion,
  fetchGitHubRepo,
  fetchContributorAvatars,
  fetchPublisherAvatar,
  fetchFavIcon,
  processPackumentVersions,
  withErrorTracking,
  fetchDetailsEffect,
  HttpClientNoTracing,
  API_TIMEOUT_MS,
}
