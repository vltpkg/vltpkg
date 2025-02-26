import type { Repository, Manifest, Packument } from '@vltpkg/types'
import { compare, gt } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec/browser'

export type Semver = `${number}.${number}.${number}`

const isSemver = (s: string): s is Semver => /^\d+\.\d+\.\d+$/.test(s)

const asSemver = (s: string): Semver => {
  if (isSemver(s)) {
    return s
  }
  throw new Error(`Invalid Semver: ${s}`)
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

export type DownloadsInfo = {
  weekly: number
}

export type ImageInfo = {
  src: string
  alt: string
}

export type DetailsInfo = {
  author?: AuthorInfo
  downloads?: DownloadsInfo
  favicon?: ImageInfo
  publisher?: AuthorInfo
  publisherAvatar?: ImageInfo
  versions?: string[]
  greaterVersions?: string[]
  downloadsRange?: DownloadsRange
}

export const readAuthor = (
  author: string | AuthorInfo,
): AuthorInfo | undefined => {
  if (typeof author === 'string') {
    const name = /^([^(<]+)/.exec(author)?.[0].trim() || ''
    const url = /\(([^()]+)\)/.exec(author)?.[1] || ''
    const email = /<([^<>]+)>/.exec(author)?.[1] || ''
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

export const retrieveGitHubAPIUrl = (
  maybeGitHubURL: string,
): string | undefined => {
  let url: URL
  try {
    // try to retrieve the url host from a potentially valid url
    url = new URL(maybeGitHubURL)
  } catch {
    const parsed = Spec.parse('name', maybeGitHubURL)
    if (
      parsed.type === 'git' &&
      parsed.namedGitHost === 'github' &&
      parsed.namedGitHostPath
    ) {
      url = new URL(`https://github.com/${parsed.namedGitHostPath}`)
    } else {
      return
    }
  }
  if (url.hostname === 'github.com') {
    const api = new URL('https://api.github.com')
    const pathname = url.pathname.replace(/\.git$/, '')
    api.pathname = `/repos${pathname}`
    return String(api)
  }
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

  return `https://gravatar.com/avatar/${hash}?d=404`
}

export async function* fetchDetails(
  s: Spec,
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

  const fetchDownloadsRange = (): Promise<DetailsInfo> =>
    fetch(
      `https://api.npmjs.org/downloads/range/last-year/${encodeURIComponent(spec.name)}`,
    )
      .then(res => res.json())
      .then(
        (data: {
          start: string
          end: string
          downloads: { downloads: number; day: string }[]
        }) => ({
          downloadsRange: {
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

  const fetchDownloads = (): Promise<DetailsInfo> =>
    fetch(
      `https://api.npmjs.org/versions/${encodeURIComponent(spec.name)}/last-week`,
    )
      .then(res => res.json())
      .then((res: { downloads: Record<Semver, number> }) => {
        const version = asSemver(spec.bareSpec)
        const weekly = res.downloads[version]
        if (weekly != null) {
          return { downloads: { weekly } }
        } else {
          return {}
        }
      })
      .catch(() => ({}))

  // favicon requests have a guard against duplicate requests
  // since we retry once we fetch the manifest from the registry
  const seenFavIconRequests = new Set<string>()
  const fetchFavIcon = (
    githubAPI: string,
  ): Promise<DetailsInfo> | undefined => {
    if (seenFavIconRequests.has(githubAPI)) return

    return fetch(githubAPI)
      .then(res => res.json())
      .then(
        (repo: {
          owner?: { avatar_url?: string; login?: string }
        }) => {
          if (repo.owner?.avatar_url) {
            return {
              favicon: {
                src: repo.owner.avatar_url,
                alt:
                  repo.owner.login ?
                    `${repo.owner.login}'s avatar`
                  : 'avatar',
              },
            }
          } else {
            return {}
          }
        },
      )
      .catch(() => {
        // fallback to a generic org avatar if the api request fails
        const orgName = githubAPI.split('/').slice(-2)[0]
        const avatarFallbackURL = new URL('https://github.com')
        avatarFallbackURL.pathname = `/${orgName}.png`
        avatarFallbackURL.search = 'size=128'
        return {
          favicon: {
            src: String(avatarFallbackURL),
            alt: 'avatar',
          },
        }
      })
  }

  // tries to retrieve author info from the in-memory manifest
  if (manifest?.author) {
    maniAuthor = readAuthor(manifest.author)
    if (maniAuthor) {
      trackPromise(Promise.resolve({ author: maniAuthor }))
    }
  }

  // if the spec is a git spec, use its remote as the repository url reference
  if (spec.gitRemote) {
    githubAPI = retrieveGitHubAPIUrl(spec.gitRemote)
  }

  // lookup manifest for a repository field
  if (!githubAPI && manifest?.repository) {
    const repo = readRepository(manifest.repository)
    if (repo) {
      githubAPI = retrieveGitHubAPIUrl(repo)
    }
  }

  // if a value was found, fetch the repository info from the GitHub API
  if (githubAPI) {
    const faviconPromise = fetchFavIcon(githubAPI)
    if (faviconPromise) {
      trackPromise(faviconPromise)
    }
  }

  // if the local manifest doesn't have author info,
  // tries to retrieve it from the registry manifest
  if (spec.registry) {
    const url = new URL(spec.registry)
    url.pathname = `${spec.name}/${spec.bareSpec}`
    trackPromise(
      fetch(String(url))
        .then(res => res.json())
        .then((mani: Manifest & { _npmUser?: AuthorInfo }) => {
          // retries favicon retrieval in case it wasn't found before
          if (!githubAPI && mani.repository) {
            const repo = readRepository(mani.repository)
            if (repo) {
              githubAPI = retrieveGitHubAPIUrl(repo)
            }
            if (githubAPI) {
              const faviconPromise = fetchFavIcon(githubAPI)
              if (faviconPromise) {
                trackPromise(faviconPromise)
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
        headers: {
          Accept: 'application/vnd.npm.install-v1+json',
        },
      })
        .then(res => res.json())
        .then((packu: Packument) => {
          const versions = Object.keys(packu.versions).sort(compare)
          return {
            ...(manifest?.version && versions.length ?
              {
                versions,
                greaterVersions: versions.filter(
                  (version: string) =>
                    manifest.version && gt(version, manifest.version),
                ),
              }
            : {}),
          }
        })
        .catch(() => ({})),
    )
  }

  // retrieve download info from the registry
  trackPromise(fetchDownloads())

  // retrieve download range info from the registry
  trackPromise(fetchDownloadsRange())

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
