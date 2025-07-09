import { normalizeManifest } from '@vltpkg/types'
import { compare, gt, prerelease } from '@vltpkg/semver'
import {
  getRepoOrigin,
  getRepositoryApiUrl,
} from '@/utils/get-repo-url.ts'
import type { Spec } from '@vltpkg/spec/browser'
import type {
  Repository,
  Manifest,
  Packument,
  NormalizedContributor,
} from '@vltpkg/types'

export type Semver = `${number}.${number}.${number}`

export const publicRegistry = 'https://registry.npmjs.org/'

export const isSemver = (s: string): s is Semver =>
  /^\d+\.\d+\.\d+$/.test(s)

export const asSemver = (s: string): Semver => {
  if (isSemver(s)) {
    return s
  }
  throw new Error(`Invalid Semver: ${s}`)
}

export type GitHubRepo = {
  owner?: {
    avatar_url?: string
    login?: string
  }
  updated_at?: string
  stargazers_count?: number
  organization?: {
    login?: string
  }
  name?: string
  default_branch?: string
  commits_url?: string
  contributors_url?: string
}

export type DownloadsRange = {
  start: string
  end: string
  downloads: { downloads: number; day: string }[]
}

export type AuthorInfo = {
  name: string
  mail?: string
  email?: string
  url?: string
  web?: string
}

export type ImageInfo = {
  src: string
  alt: string
}

export type Version = {
  version: Semver
  publishedDate?: string
  publishedAuthor?: {
    name?: string
    email?: string
    avatar?: string
  }
  unpackedSize?: number
  integrity?: string
  tarball?: string
  gitHead?: string
}

export type Contributor = NormalizedContributor & {
  avatar?: string
}

export type DetailsInfo = {
  author?: AuthorInfo
  downloadsPerVersion?: Record<Semver, number>
  downloadsLastYear?: DownloadsRange
  favicon?: ImageInfo
  publisher?: AuthorInfo
  publisherAvatar?: ImageInfo
  versions?: Version[]
  greaterVersions?: Version[]
  contributors?: Contributor[]
  stargazersCount?: GitHubRepo['stargazers_count']
  openIssueCount?: string
  openPullRequestCount?: string
}

export const NAME_PATTERN = /^([^(<]+)/
export const URL_PATTERN = /\(([^()]+)\)/
export const EMAIL_PATTERN = /<([^<>]+)>/

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

const getContributorAvatars = async (
  mani: Manifest,
): Promise<Contributor[] | undefined> => {
  if (!mani.contributors || mani.contributors.length === 0)
    return undefined
  const contributors = await Promise.all(
    mani.contributors.map(async contributor => ({
      ...contributor,
      avatar: await retrieveAvatar(contributor.email || ''),
    })),
  )
  return contributors
}

export const retrieveAvatar = async (
  email: string,
): Promise<string> => {
  const cleaned = email.trim().toLowerCase()
  const encoder = new TextEncoder()
  const data = encoder.encode(cleaned)
  const compute = await window.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(compute))
  const hash = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `https://gravatar.com/avatar/${hash}?d=retro`
}

export const parseAriaLabelFromSVG = (
  svg: string,
): string | undefined => {
  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(svg, 'image/svg+xml')
  const ariaLabel = svgDoc
    .querySelector('svg')
    ?.getAttribute('aria-label')
  if (!ariaLabel) return undefined
  const match = /[\d.]+\s*[kmb]?/i.exec(ariaLabel)
  return match?.[0].trim()
}

export async function* fetchDetails(
  s: Spec,
  signal: AbortSignal,
  manifest?: Manifest,
): AsyncGenerator<DetailsInfo> {
  const spec = s.final
  const promisesQueue: Promise<DetailsInfo>[] = []
  const fulfilledPromises: Promise<DetailsInfo>[] = []
  let githubAPI: string | undefined
  let maniAuthor: AuthorInfo | undefined

  // helper function to make sure that the yield-as-soon-as-ready
  // pattern works with concurrent requests as intended
  function trackPromise(p: Promise<DetailsInfo>) {
    void p.then(() => {
      void promisesQueue.splice(promisesQueue.indexOf(p), 1)
      fulfilledPromises.push(p)
    })
    promisesQueue.push(p)
  }

  const fetchGithubRepo = async (
    githubAPI: string,
  ): Promise<GitHubRepo> =>
    fetch(githubAPI, { signal })
      .then(res => res.json())
      .then((repo: GitHubRepo) => {
        return repo
      })
      .catch(() => ({}))

  const fetchStargazerCount = (
    repo: GitHubRepo,
  ): Promise<DetailsInfo> => {
    return Promise.resolve({
      stargazersCount: repo.stargazers_count,
    })
  }

  const fetchOpenIssuesCount = async (
    org: string,
    repo: string,
  ): Promise<DetailsInfo> => {
    return fetch(
      `https://img.shields.io/github/issues/${org}/${repo}`,
      { signal },
    )
      .then(res => res.text())
      .then((res: string) => {
        const count = parseAriaLabelFromSVG(res)
        if (count === undefined) return {}
        return { openIssueCount: count }
      })
      .catch(() => ({}))
  }

  const fetchOpenPullRequestCount = (
    org: string,
    repo: string,
  ): Promise<DetailsInfo> =>
    fetch(`https://img.shields.io/github/issues-pr/${org}/${repo}`, {
      signal,
    })
      .then(res => res.text())
      .then((res: string) => {
        const count = parseAriaLabelFromSVG(res)
        if (count === undefined) return {}
        return { openPullRequestCount: count }
      })
      .catch(() => ({}))

  const fetchDownloadsLastYear = (): Promise<DetailsInfo> =>
    fetch(
      `https://api.npmjs.org/downloads/range/last-year/${encodeURIComponent(spec.name)}`,
      {
        signal,
      },
    )
      .then(res => res.json())
      .then(
        (data: {
          start: string
          end: string
          downloads: { downloads: number; day: string }[]
        }) => ({
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
        }),
      )
      .catch(() => ({}))

  const fetchDownloadsPerVersion = (): Promise<DetailsInfo> =>
    fetch(
      `https://api.npmjs.org/versions/${encodeURIComponent(spec.name)}/last-week`,
      { signal },
    )
      .then(res => res.json())
      .then((res: { downloads: Record<Semver, number> }) => {
        return {
          downloadsPerVersion: res.downloads,
        }
      })
      .catch(() => ({}))

  // favicon requests have a guard against duplicate requests
  // since we retry once we fetch the manifest from the registry
  const seenFavIconRequests = new Set<string>()
  const fetchFavIcon = async (
    githubAPI: string,
  ): Promise<DetailsInfo> => {
    if (!manifest?.repository || seenFavIconRequests.has(githubAPI))
      return Promise.resolve({})

    const repo = getRepoOrigin(manifest.repository)
    if (repo) {
      return {
        favicon: {
          src: `https://www.github.com/${repo.org}.png`,
          alt: `${repo.org} avatar`,
        },
      }
    }

    return Promise.resolve({})
  }

  // tries to retrieve author info from the in-memory manifest
  if (manifest?.author) {
    maniAuthor = readAuthor(manifest.author)
    if (maniAuthor) {
      trackPromise(Promise.resolve({ author: maniAuthor }))
    }
  }

  // fetch contributor avatars from the in-memory manifest
  if (manifest) {
    trackPromise(
      getContributorAvatars(manifest).then(contributors => ({
        ...(contributors && { contributors }),
      })),
    )
  }

  // if the spec is a git spec, use its remote as the repository url reference
  if (spec.gitRemote) {
    githubAPI = getRepositoryApiUrl(spec.gitRemote)
  }

  // lookup manifest for a repository field
  if (!githubAPI && manifest?.repository) {
    const repo = readRepository(manifest.repository)
    if (repo) {
      githubAPI = getRepositoryApiUrl(repo)
    }
  }

  // if a value was found, fetch the repository info from the GitHub API
  if (githubAPI) {
    const api = githubAPI
    if (api) {
      trackPromise(fetchFavIcon(api))
      void fetchGithubRepo(api).then(repo => {
        trackPromise(fetchStargazerCount(repo))
      })
    }
  }

  // if the local manifest doesn't have author info,
  // tries to retrieve it from the registry manifest
  if (spec.registry === publicRegistry) {
    const url = new URL(spec.registry)
    url.pathname = `${spec.name}/${spec.bareSpec}`
    trackPromise(
      fetch(String(url), { signal })
        .then(res => res.json())
        .then((mani: Manifest & { _npmUser?: AuthorInfo }) => {
          mani = normalizeManifest(mani)
          // retries favicon retrieval in case it wasn't found before
          if (!githubAPI && mani.repository) {
            const repo = readRepository(mani.repository)
            if (repo) {
              githubAPI = getRepositoryApiUrl(repo)
            }
            if (githubAPI) {
              const api = githubAPI
              // Only make this call if it wasn't already made earlier
              if (!seenFavIconRequests.has(api)) {
                trackPromise(fetchFavIcon(api))
              }
            }
          }
          const remoteAuthor: AuthorInfo | undefined =
            mani._npmUser ? readAuthor(mani._npmUser) : undefined
          // if the remote response has publisher email info
          // then retrieve the user avatar from gravatar
          if (remoteAuthor?.email) {
            trackPromise(
              retrieveAvatar(remoteAuthor.email || '')
                .then(src => ({
                  publisherAvatar: {
                    src,
                    alt:
                      remoteAuthor.name ?
                        `${remoteAuthor.name}'s avatar`
                      : 'avatar',
                  },
                }))
                .catch(() => ({})),
            )
          }
          return {
            ...(!maniAuthor &&
              mani.author && { author: remoteAuthor }),
            ...(mani._npmUser && {
              publisher: readAuthor(mani._npmUser),
            }),
          }
        })
        .catch(() => ({})),
    )

    const packumentURL = new URL(spec.registry)
    packumentURL.pathname = spec.name
    trackPromise(
      fetch(String(packumentURL), {
        headers: {},
        signal,
      })
        .then(res => res.json())
        .then(async (packu: Packument) => {
          const versions = Object.entries(packu.versions)
            .sort((a, b) => compare(b[0], a[0]))
            .map(async ([version, mani]) => {
              mani = normalizeManifest(mani)
              const email = (
                mani as Manifest & {
                  _npmUser?: {
                    name?: string
                    email?: string
                  }
                }
              )._npmUser?.email
              const avatar =
                email ? await retrieveAvatar(email) : undefined

              const npmUser = (
                mani as Manifest & {
                  _npmUser?: {
                    name?: string
                    email?: string
                  }
                }
              )._npmUser

              return {
                version,
                publishedDate: packu.time?.[version],
                unpackedSize:
                  packu.versions[version]?.dist?.unpackedSize,
                integrity: packu.versions[version]?.dist?.integrity,
                tarball: packu.versions[version]?.dist?.tarball,
                gitHead: packu.versions[version]?.gitHead,
                publishedAuthor: {
                  name: npmUser?.name,
                  email: npmUser?.email,
                  avatar,
                },
              } as Version
            })

          const resolvedVersions = await Promise.all(versions)

          return {
            versions: resolvedVersions,
            greaterVersions:
              manifest?.version ?
                resolvedVersions.filter(
                  v =>
                    manifest.version &&
                    gt(v.version, manifest.version) &&
                    !prerelease(v.version)?.length,
                )
              : undefined,
          }
        })
        .catch(() => ({})),
    )

    // retrieve download info from the registry per version
    trackPromise(fetchDownloadsPerVersion())

    // retrieve download range for the last year from the registry
    trackPromise(fetchDownloadsLastYear())
  }

  const repo =
    manifest?.repository && readRepository(manifest.repository)
  const repoDetails = repo && getRepoOrigin(repo)

  if (repoDetails) {
    const { org, repo: repoName } = repoDetails
    trackPromise(fetchOpenIssuesCount(org, repoName))
    trackPromise(fetchOpenPullRequestCount(org, repoName))
  }

  // asynchronously yield results from promisesQueue as soon as they're ready
  while (true) {
    // when we reach the end of the promises queue, we have this extra logic
    // here to ensure that we yield all final results, including edge cases
    // such as when multiple promises fulfill at the same time.
    if (promisesQueue.length === 0) {
      let res: DetailsInfo = {}
      for (const p of await Promise.all(fulfilledPromises)) {
        for (const key of Object.keys(p)) {
          res = { ...res, [key]: p[key as keyof DetailsInfo] }
        }
      }
      yield res
      break
    }
    // yield results as soon as they're ready
    yield await Promise.race(promisesQueue)
  }
}
