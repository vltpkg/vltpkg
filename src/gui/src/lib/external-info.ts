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
}

export type DetailsResponse = DetailsInfo | void

export const readAuthor = (
  author: string | AuthorInfo | undefined,
): AuthorInfo | undefined => {
  const { name, url, email } =
    typeof author === 'string' ?
      {
        name: /^([^(<]+)/.exec(author)?.[0].trim(),
        url: /\(([^()]+)\)/.exec(author)?.[1],
        email: /<([^<>]+)>/.exec(author)?.[1],
      }
    : {
        name: author?.name,
        url: author?.web || author?.url,
        email: author?.mail || author?.email,
      }

  if (!name) return

  return {
    name,
    ...(email ? { email } : undefined),
    ...(url ? { url } : undefined),
  }
}

export const readRepository = (
  repository: string | Repository | undefined,
): string | undefined => {
  if (typeof repository === 'string') {
    return repository
  }
  if (repository?.url) {
    return repository.url
  }
}

export const retrieveGitHubAPIUrl = (
  maybeGitHubURL: string | undefined,
): URL | undefined => {
  if (!maybeGitHubURL) return

  // try to retrieve the url host from a potentially valid url
  let url =
    URL.canParse(maybeGitHubURL) ? new URL(maybeGitHubURL) : null

  if (!url) {
    const parsed = Spec.parse('name', maybeGitHubURL)
    if (
      parsed.type === 'git' &&
      parsed.namedGitHost === 'github' &&
      parsed.namedGitHostPath
    ) {
      url = new URL(parsed.namedGitHostPath, 'https://github.com')
    }
  }

  if (url?.hostname !== 'github.com') return

  return new URL(
    `/repos${url.pathname.replace(/\.git$/, '')}`,
    'https://api.github.com',
  )
}

export const retrieveAvatar = async (email: string): Promise<URL> => {
  const cleaned = email.trim().toLowerCase()
  const encoder = new TextEncoder()
  const data = encoder.encode(cleaned)
  const compute = await window.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(compute))
  const hash = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return new URL(`avatar/${hash}?d=404`, 'https://gravatar.com')
}

export async function* fetchDetails(
  s: Spec,
  manifest?: Manifest,
): AsyncGenerator<DetailsResponse> {
  const spec = s.final
  const promisesQueue: Promise<DetailsResponse>[] = []
  const fulfilledPromises: Promise<DetailsResponse>[] = []
  // let githubAPI: URL | undefined
  let maniAuthor: AuthorInfo | undefined

  // helper function to make sure that the yield-as-soon-as-ready
  // pattern works with concurrent requests as intended
  function trackPromise(p: Promise<DetailsResponse> | undefined) {
    if (!p) return
    void p
      .catch(() => {})
      .then(() => {
        void promisesQueue.splice(promisesQueue.indexOf(p), 1)
        fulfilledPromises.push(p)
      })
    promisesQueue.push(p)
  }

  // favicon requests have a guard against duplicate requests
  // since we retry once we fetch the manifest from the registry
  const seenFavIconRequests = new Set<string>()
  const fetchFavIcon = (
    url: URL | undefined,
  ): Promise<DetailsResponse> | undefined => {
    if (!url || seenFavIconRequests.has(String(url))) return

    return fetch(url)
      .then(
        res =>
          res.json() as {
            owner?: { avatar_url?: string; login?: string }
          },
      )
      .then(repo => {
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
        }
      })
      .catch(() => ({
        // fallback to a generic org avatar if the api request fails
        favicon: {
          src: new URL(
            `/${url.pathname.split('/')[1]}.png?size=128`,
            'https://github.com',
          ).toString(),
          alt: 'avatar',
        },
      }))
  }

  // tries to retrieve author info from the in-memory manifest
  const author = readAuthor(manifest?.author)
  trackPromise(author ? Promise.resolve({ author }) : undefined)

  // if the spec is a git spec, use its remote as the repository url reference
  // lookup manifest for a repository field
  let githubAPI =
    retrieveGitHubAPIUrl(spec.gitRemote) ??
    retrieveGitHubAPIUrl(readRepository(manifest?.repository))

  // if a value was found, fetch the repository info from the GitHub API
  trackPromise(fetchFavIcon(githubAPI))

  // if the local manifest doesn't have author info,
  // tries to retrieve it from the registry manifest
  if (spec.registry) {
    trackPromise(
      fetch(new URL(`${spec.name}/${spec.bareSpec}`, spec.registry))
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
              retrieveAvatar(remoteAuthor.email || '').then(src => ({
                publisherAvatar: {
                  src: src.toString(),
                  alt:
                    remoteAuthor.name ?
                      `${remoteAuthor.name}'s avatar`
                    : 'avatar',
                },
              })),
            )
          }
          return {
            ...(!maniAuthor &&
              mani.author && { author: remoteAuthor }),
            ...(mani._npmUser && {
              publisher: readAuthor(mani._npmUser),
            }),
          }
        }),
    )

    trackPromise(
      fetch(new URL(spec.name, spec.registry), {
        headers: {
          Accept: 'application/vnd.npm.install-v1+json',
        },
      })
        .then(res => res.json())
        .then((packu: Packument) => {
          const versions = Object.keys(packu.versions).sort(compare)
          if (manifest?.version && versions.length) {
            return {
              versions,
              greaterVersions: versions.filter(
                (version: string) =>
                  manifest.version && gt(version, manifest.version),
              ),
            }
          }
        }),
    )
  }

  // retrieve download info from the registry
  trackPromise(
    fetch(
      `https://api.npmjs.org/versions/${encodeURIComponent(spec.name)}/last-week`,
    )
      .then(res => res.json())
      .then((res: { downloads: Record<Semver, number> }) => {
        const version = asSemver(spec.bareSpec)
        const weekly = res.downloads[version]
        if (weekly != null) {
          return { downloads: { weekly } }
        }
      }),
  )

  // asynchronously yield results from promisesQueue as soon as they're ready
  while (true) {
    // when we reach the end of the promises queue, we have this extra logic
    // here to ensure that we yield all final results, including edge cases
    // such as when multiple promises fulfill at the same time.
    if (promisesQueue.length === 0) {
      let res: DetailsInfo = {}
      for (const p of await Promise.all(fulfilledPromises)) {
        if (!p) continue
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
