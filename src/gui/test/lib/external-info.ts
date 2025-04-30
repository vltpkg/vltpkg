import { test, expect, vi } from 'vitest'
import { Spec } from '@vltpkg/spec/browser'
import {
  fetchDetails,
  readAuthor,
  readRepository,
  retrieveGitHubAPIUrl,
} from '@/lib/external-info.js'
import type { DetailsInfo } from '@/lib/external-info.js'

const sleep = (time: number) =>
  new Promise<void>(resolve => {
    setTimeout(() => resolve(), time)
  })

global.fetch = vi.fn(async url => ({
  json: async () => {
    switch (url) {
      case 'https://api.npmjs.org/versions/my-package/last-week': {
        return {
          package: 'my-package',
          downloads: { '1.0.0': 100 },
        }
      }
      case 'https://registry.npmjs.org/my-package/1.0.0': {
        return {
          _npmUser: {
            name: 'Ruy Adorno',
            email: 'ruyadorno@example.com',
          },
        }
      }
      case 'https://api.npmjs.org/versions/async-request/last-week': {
        await sleep(Math.random() * 100)
        return {
          package: 'my-package',
          downloads: { '1.0.0': 100 },
        }
      }
      case 'https://registry.npmjs.org/async-request/1.0.0': {
        await sleep(Math.random() * 100)
        return {
          author: {
            name: 'Ruy Adorno',
            email: 'ruyadorno@example.com',
          },
          _npmUser: {
            name: 'Ruy Adorno',
            email: 'ruyadorno@example.com',
          },
        }
      }
      case 'https://registry.npmjs.org/missing-downloads/1.0.0': {
        return {
          _npmUser: {
            name: 'Foo',
            email: 'foo@bar.ca',
          },
        }
      }
      case 'https://registry.npmjs.org/favicon-repo-in-local-manifest/1.0.0': {
        return {
          _npmUser: {
            name: 'Ruy Adorno',
            email: 'ruyadorno@example.com',
          },
        }
      }
      case 'https://api.github.com/repos/ruyadorno/favicon-repo-in-local-manifest': {
        return {
          owner: {
            avatar_url:
              'https//example.com/favicon-repo-in-local-manifest.jpg',
            login: 'ruyadorno',
          },
        }
      }
      case 'https://registry.npmjs.org/favicon-repo-in-remote-manifest/1.0.0': {
        return {
          repository:
            'git+ssh://github.com/ruyadorno/favicon-repo-in-remote-manifest.git',
        }
      }
      case 'https://api.github.com/repos/ruyadorno/favicon-repo-in-remote-manifest': {
        return {
          owner: {
            avatar_url:
              'https//example.com/favicon-repo-in-remote-manifest.jpg',
            login: 'ruyadorno',
          },
        }
      }
      case 'https://registry.npmjs.org/package-with-githead/1.0.0': {
        return {
          _gitHead: 'abc123def456',
          version: '1.0.0',
        }
      }
      case 'https://registry.npmjs.org/package-with-githead': {
        return {
          versions: {
            '1.0.0': {
              version: '1.0.0',
              gitHead: 'abc123def456',
              dist: {
                unpackedSize: 1000,
                integrity: 'sha512-abc123',
                tarball:
                  'https://registry.npmjs.org/package-with-githead/-/package-with-githead-1.0.0.tgz',
              },
            },
          },
          time: {
            '1.0.0': '2023-01-01T00:00:00.000Z',
          },
        }
      }
      case 'https://registry.npmjs.org/package-with-versions': {
        return {
          versions: {
            '1.0.0': {
              version: '1.0.0',
              gitHead: 'abc123def456',
              dist: {
                unpackedSize: 1000,
                integrity: 'sha512-abc123',
                tarball:
                  'https://registry.npmjs.org/package-with-versions/-/package-with-versions-1.0.0.tgz',
              },
            },
            '1.0.1': {
              version: '1.0.1',
              gitHead: 'def456abc123',
              dist: {
                unpackedSize: 1000,
                integrity: 'sha512-def456',
                tarball:
                  'https://registry.npmjs.org/package-with-versions/-/package-with-versions-1.0.1.tgz',
              },
            },
            '1.0.2': {
              version: '1.0.2',
              gitHead: 'ghi789def456',
              dist: {
                unpackedSize: 1000,
                integrity: 'sha512-ghi789',
                tarball:
                  'https://registry.npmjs.org/package-with-versions/-/package-with-versions-1.0.2.tgz',
              },
            },
          },
          time: {
            '1.0.0': '2023-01-01T00:00:00.000Z',
            '1.0.1': '2023-01-02T00:00:00.000Z',
            '1.0.2': '2023-01-03T00:00:00.000Z',
          },
        }
      }
      case 'https://api.npmjs.org/downloads/range/last-year/my-package': {
        return {
          start: '2023-01-01',
          end: '2023-01-31',
          downloads: [
            { downloads: 100, day: '2023-01-01' },
            { downloads: 150, day: '2023-01-02' },
          ],
        }
      }
      default: {
        throw new Error('unexpected url')
      }
    }
  },
})) as unknown as typeof global.fetch

test('readAuthor from author string pattern', () => {
  const author =
    'Ruy Adorno <ruyadorno@example.com> (https://ruyadorno.com)'
  expect(readAuthor(author)).toEqual({
    name: 'Ruy Adorno',
    email: 'ruyadorno@example.com',
    url: 'https://ruyadorno.com',
  })
})

test('readAuthor from author string pattern missing url', () => {
  const author = 'Ruy Adorno <ruyadorno@example.com>'
  expect(readAuthor(author)).toEqual({
    name: 'Ruy Adorno',
    email: 'ruyadorno@example.com',
  })
})

test('readAuthor from author string pattern missing email', () => {
  const author = 'Ruy Adorno (https://ruyadorno.com)'
  expect(readAuthor(author)).toEqual({
    name: 'Ruy Adorno',
    url: 'https://ruyadorno.com',
  })
})

test('readAuthor from author string pattern name-only', () => {
  const author = 'Ruy Adorno'
  expect(readAuthor(author)).toEqual({
    name: 'Ruy Adorno',
  })
})

test('readAuthor from author object pattern', () => {
  const author = {
    name: 'Ruy Adorno',
    email: 'ruyadorno@example.com',
    url: 'https://ruyadorno.com',
  }
  expect(readAuthor(author)).toEqual({
    name: 'Ruy Adorno',
    email: 'ruyadorno@example.com',
    url: 'https://ruyadorno.com',
  })
})

test('readAuthor from author object pattern alternative web field', () => {
  const author = {
    name: 'Ruy Adorno',
    email: 'ruyadorno@example.com',
    web: 'https://ruyadorno.com',
  }
  expect(readAuthor(author)).toEqual({
    name: 'Ruy Adorno',
    email: 'ruyadorno@example.com',
    url: 'https://ruyadorno.com',
  })
})

test('readAuthor from author object pattern alternative mail field', () => {
  const author = {
    name: 'Ruy Adorno',
    mail: 'ruyadorno@example.com',
    web: 'https://ruyadorno.com',
  }
  expect(readAuthor(author)).toEqual({
    name: 'Ruy Adorno',
    email: 'ruyadorno@example.com',
    url: 'https://ruyadorno.com',
  })
})

test('readAuthor from author object pattern name-only', () => {
  const author = {
    name: 'Ruy Adorno',
  }
  expect(readAuthor(author)).toEqual({
    name: 'Ruy Adorno',
  })
})

test('readRepository from string pattern', () => {
  const repository = 'git+ssh://github.com/org/repo.git'
  expect(readRepository(repository)).toEqual(
    'git+ssh://github.com/org/repo.git',
  )
})

test('readRepository from object pattern', () => {
  const repository = {
    type: 'git',
    url: 'git+ssh://github.com/org/repo.git',
  }
  expect(readRepository(repository)).toEqual(
    'git+ssh://github.com/org/repo.git',
  )
})

test('retrieveGitHubAPIUrl from git-style url', () => {
  expect(
    retrieveGitHubAPIUrl('git+ssh://github.com/org/repo.git'),
  ).toEqual('https://api.github.com/repos/org/repo')
})

test('retrieveGitHubAPIUrl from github shortener path', () => {
  expect(retrieveGitHubAPIUrl('org/repo')).toEqual(
    'https://api.github.com/repos/org/repo',
  )
})

test('retrieveGitHubAPIUrl from full github url', () => {
  expect(retrieveGitHubAPIUrl('https://github.com/org/repo')).toEqual(
    'https://api.github.com/repos/org/repo',
  )
})

test('retrieveGitHubAPIUrl from https-git-style url', () => {
  expect(retrieveGitHubAPIUrl('https://github.com/org/repo')).toEqual(
    'https://api.github.com/repos/org/repo',
  )
})

test('fetchDetails returns the correct details including downloadsRange', async () => {
  const mani = {
    name: 'my-package',
    version: '1.0.0',
    description: 'my-package description',
    license: 'MIT',
    author: 'Ruy Adorno',
  }
  const spec = Spec.parse('my-package', '1.0.0')
  const res: any = {}
  const abortController = new AbortController()
  const signal = abortController.signal
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res).toEqual({
    author: {
      name: 'Ruy Adorno',
    },
    downloadsPerVersion: { '1.0.0': 100 },
    downloadsLastYear: {
      start: '2023-01-01',
      end: '2023-01-31',
      downloads: [
        { downloads: 100, day: '2023-01-01' },
        { downloads: 150, day: '2023-01-02' },
      ],
    },
    publisher: {
      name: 'Ruy Adorno',
      email: 'ruyadorno@example.com',
    },
    publisherAvatar: {
      src: 'https://gravatar.com/avatar/1f87aae035b22253b6f4051f68ade60229308d26c514816de0046566cdebe8fa?d=404',
      alt: "Ruy Adorno's avatar",
    },
  })
})

test('fetchDetails from various async requests', async () => {
  const mani = { name: 'async-request', version: '1.0.0' }
  const spec = Spec.parse('async-request', '1.0.0')
  const abortController = new AbortController()
  const signal = abortController.signal
  const res: any = {}
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res).toEqual({
    author: {
      name: 'Ruy Adorno',
      email: 'ruyadorno@example.com',
    },
    downloadsPerVersion: { '1.0.0': 100 },
    publisher: {
      name: 'Ruy Adorno',
      email: 'ruyadorno@example.com',
    },
    publisherAvatar: {
      src: 'https://gravatar.com/avatar/1f87aae035b22253b6f4051f68ade60229308d26c514816de0046566cdebe8fa?d=404',
      alt: "Ruy Adorno's avatar",
    },
  })
})

test('unable to fetch remote details', async () => {
  const mani = {
    name: 'missing-info',
    version: '1.0.0',
    author: 'Ruy',
  }
  const spec = Spec.parse('missing-info', '1.0.0')
  const abortController = new AbortController()
  const signal = abortController.signal
  const res: any = {}
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res).toEqual({
    author: { name: 'Ruy' },
  })
})

test('no info to retrieve from details', async () => {
  const mani = { name: 'missing-info', version: '1.0.0' }
  const spec = Spec.parse('missing-info', '1.0.0')
  const abortController = new AbortController()
  const signal = abortController.signal
  const res: any = {}
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res).toEqual({})
})

test('fetchDetails with missing downloads', async () => {
  const mani = { name: 'missing-downloads', version: '1.0.0' }
  const spec = Spec.parse('missing-downloads', '1.0.0')
  const abortController = new AbortController()
  const signal = abortController.signal
  const res: any = {}
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res).toEqual({
    publisher: {
      name: 'Foo',
      email: 'foo@bar.ca',
    },
    publisherAvatar: {
      src: 'https://gravatar.com/avatar/9d3c411537fa65b330e063d79b17e5568a0df4cd8a4174985aa94f4c35ceba20?d=404',
      alt: "Foo's avatar",
    },
  })
})

test('fetchDetails with repository info in local manifest', async () => {
  const mani = {
    name: 'favicon-repo-in-local-manifest',
    version: '1.0.0',
    repository: {
      type: 'git',
      url: 'git+ssh://github.com/ruyadorno/favicon-repo-in-local-manifest.git',
    },
  }
  const spec = Spec.parse('favicon-repo-in-local-manifest', '1.0.0')
  const abortController = new AbortController()
  const signal = abortController.signal
  const res: any = {}
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res).toEqual({
    favicon: {
      src: 'https//example.com/favicon-repo-in-local-manifest.jpg',
      alt: "ruyadorno's avatar",
    },
    publisher: {
      name: 'Ruy Adorno',
      email: 'ruyadorno@example.com',
    },
    publisherAvatar: {
      src: 'https://gravatar.com/avatar/1f87aae035b22253b6f4051f68ade60229308d26c514816de0046566cdebe8fa?d=404',
      alt: "Ruy Adorno's avatar",
    },
  })
})

test('fetchDetails with repository info in remote manifest', async () => {
  const mani = {
    name: 'favicon-repo-in-remote-manifest',
    version: '1.0.0',
  }
  const spec = Spec.parse('favicon-repo-in-remote-manifest', '1.0.0')
  const abortController = new AbortController()
  const signal = abortController.signal
  const res: any = {}
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res).toEqual({
    favicon: {
      src: 'https//example.com/favicon-repo-in-remote-manifest.jpg',
      alt: "ruyadorno's avatar",
    },
  })
})

test('fetchDetails with gitHead information', async () => {
  const mani = {
    name: 'package-with-githead',
    version: '1.0.0',
  }
  const spec = Spec.parse('package-with-githead', '1.0.0')
  const abortController = new AbortController()
  const signal = abortController.signal
  const res: any = {}
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res.versions?.[0]).toEqual({
    version: '1.0.0',
    gitHead: 'abc123def456',
    publishedDate: '2023-01-01T00:00:00.000Z',
    unpackedSize: 1000,
    integrity: 'sha512-abc123',
    tarball:
      'https://registry.npmjs.org/package-with-githead/-/package-with-githead-1.0.0.tgz',
    publishedAuthor: {
      name: undefined,
      email: undefined,
      avatar: undefined,
    },
  })
})

test('fetchDetails with multiple versions', async () => {
  const mani = {
    name: 'package-with-versions',
    version: '1.0.0',
  }
  const spec = Spec.parse('package-with-versions', '1.0.0')
  const abortController = new AbortController()
  const signal = abortController.signal
  const res: any = {}
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res.versions).toHaveLength(3)
  expect(res.versions?.[0]).toEqual({
    version: '1.0.2',
    gitHead: 'ghi789def456',
    publishedDate: '2023-01-03T00:00:00.000Z',
    unpackedSize: 1000,
    integrity: 'sha512-ghi789',
    tarball:
      'https://registry.npmjs.org/package-with-versions/-/package-with-versions-1.0.2.tgz',
    publishedAuthor: {
      name: undefined,
      email: undefined,
      avatar: undefined,
    },
  })
  expect(res.versions?.[1]).toEqual({
    version: '1.0.1',
    gitHead: 'def456abc123',
    publishedDate: '2023-01-02T00:00:00.000Z',
    unpackedSize: 1000,
    integrity: 'sha512-def456',
    tarball:
      'https://registry.npmjs.org/package-with-versions/-/package-with-versions-1.0.1.tgz',
    publishedAuthor: {
      name: undefined,
      email: undefined,
      avatar: undefined,
    },
  })
  expect(res.versions?.[2]).toEqual({
    version: '1.0.0',
    gitHead: 'abc123def456',
    publishedDate: '2023-01-01T00:00:00.000Z',
    unpackedSize: 1000,
    integrity: 'sha512-abc123',
    tarball:
      'https://registry.npmjs.org/package-with-versions/-/package-with-versions-1.0.0.tgz',
    publishedAuthor: {
      name: undefined,
      email: undefined,
      avatar: undefined,
    },
  })
})

test('fetchDetails favicon defaults to img shortcut', async () => {
  const mani = {
    name: 'favicon-fallback',
    version: '1.0.0',
    repository: {
      type: 'git',
      url: 'git+ssh://github.com/ruyadorno/favicon-fallback.git',
    },
  }
  const spec = Spec.parse('favicon-fallback', '1.0.0')
  const abortController = new AbortController()
  const signal = abortController.signal
  const res: any = {}
  for await (const details of fetchDetails(spec, signal, mani)) {
    for (const key of Object.keys(details)) {
      res[key] = details[key as keyof DetailsInfo]
    }
  }
  expect(res).toEqual({
    favicon: {
      src: 'https://github.com/ruyadorno.png?size=128',
      alt: 'avatar',
    },
  })
})
