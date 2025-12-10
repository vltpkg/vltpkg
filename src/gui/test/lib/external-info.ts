import { test, expect, describe, vi, beforeEach } from 'vitest'
import { Effect } from 'effect'
import { FetchHttpClient } from '@effect/platform'
import type { HttpClient } from '@effect/platform'
import { Spec } from '@vltpkg/spec/browser'
import { normalizeManifest } from '@vltpkg/types'
import {
  // Individual Effects
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
  // Utility functions
  readAuthor,
  readRepository,
  parseAriaLabelFromSVG,
  // Composed function (for integration tests)
  fetchDetails,
} from '@/lib/external-info.ts'

// ============================================
// Mock Fetch Setup
// ============================================
type MockResponse = {
  status?: number
  body?: unknown
  isText?: boolean
}

// MockResponses can be either a full MockResponse object or just the body data directly
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type MockResponses = Record<string, MockResponse | unknown>

const createMockFetch = (mockResponses: MockResponses) =>
  vi.fn(async (url: string | URL | Request) => {
    const urlStr = url instanceof Request ? url.url : String(url)

    // Find a matching mock response
    for (const [pattern, response] of Object.entries(mockResponses)) {
      if (urlStr.includes(pattern) || urlStr === pattern) {
        // Handle both full MockResponse objects and shorthand body-only values
        const isMockResponse =
          typeof response === 'object' &&
          response !== null &&
          ('body' in response ||
            'status' in response ||
            'isText' in response)
        const mockResp: MockResponse =
          isMockResponse ?
            (response as MockResponse)
          : { body: response }

        const status = mockResp.status ?? 200

        if (status >= 400) {
          return {
            ok: false,
            status,
            json: async () => mockResp.body,
            text: async () =>
              mockResp.isText ?
                (mockResp.body as string)
              : JSON.stringify(mockResp.body),
          }
        }

        return {
          ok: true,
          status,
          json: async () => mockResp.body,
          text: async () =>
            mockResp.isText ?
              (mockResp.body as string)
            : JSON.stringify(mockResp.body),
        }
      }
    }

    // No match found - return error response
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: `No mock for URL: ${urlStr}` }),
      text: async () => `No mock for URL: ${urlStr}`,
    }
  }) as unknown as typeof fetch

// Helper to run an Effect with mocked fetch
const runWithMock = <A, E>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
  mocks: MockResponses,
) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = createMockFetch(mocks)

  return Effect.runPromise(
    effect.pipe(Effect.provide(HttpClientNoTracing)),
  ).finally(() => {
    globalThis.fetch = originalFetch
  })
}

// ============================================
// Unit Tests: Utility Functions
// ============================================
describe('readAuthor', () => {
  test('parses author string with all fields', () => {
    const author =
      'Ruy Adorno <ruyadorno@example.com> (https://ruyadorno.com)'
    expect(readAuthor(author)).toEqual({
      name: 'Ruy Adorno',
      email: 'ruyadorno@example.com',
      url: 'https://ruyadorno.com',
    })
  })

  test('parses author string missing url', () => {
    const author = 'Ruy Adorno <ruyadorno@example.com>'
    expect(readAuthor(author)).toEqual({
      name: 'Ruy Adorno',
      email: 'ruyadorno@example.com',
    })
  })

  test('parses author string missing email', () => {
    const author = 'Ruy Adorno (https://ruyadorno.com)'
    expect(readAuthor(author)).toEqual({
      name: 'Ruy Adorno',
      url: 'https://ruyadorno.com',
    })
  })

  test('parses author string name-only', () => {
    const author = 'Ruy Adorno'
    expect(readAuthor(author)).toEqual({
      name: 'Ruy Adorno',
    })
  })

  test('parses author object', () => {
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

  test('parses author object with alternative web field', () => {
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

  test('parses author object with alternative mail field', () => {
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

  test('parses author object name-only', () => {
    const author = { name: 'Ruy Adorno' }
    expect(readAuthor(author)).toEqual({
      name: 'Ruy Adorno',
    })
  })

  test('returns undefined for empty name', () => {
    expect(readAuthor({ name: '' })).toBeUndefined()
  })
})

describe('readRepository', () => {
  test('returns string repository as-is', () => {
    const repository = 'git+ssh://github.com/org/repo.git'
    expect(readRepository(repository)).toBe(
      'git+ssh://github.com/org/repo.git',
    )
  })

  test('extracts url from repository object', () => {
    const repository = {
      type: 'git',
      url: 'git+ssh://github.com/org/repo.git',
    }
    expect(readRepository(repository)).toBe(
      'git+ssh://github.com/org/repo.git',
    )
  })

  test('returns undefined for object without url', () => {
    const repository = { type: 'git' } as unknown as {
      type: string
      url: string
    }
    expect(readRepository(repository)).toBeUndefined()
  })
})

describe('parseAriaLabelFromSVG', () => {
  test('extracts number with k suffix', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="issues: 2.5k open">Test SVG</svg>',
      ),
    ).toBe('2.5k')
  })

  test('extracts number with m suffix', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="issues: 2.5m open">Test SVG</svg>',
      ),
    ).toBe('2.5m')
  })

  test('extracts number with b suffix', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="issues: 2b open">Test SVG</svg>',
      ),
    ).toBe('2b')
  })

  test('extracts plain number', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="issues: 737 open">Test SVG</svg>',
      ),
    ).toBe('737')
  })

  test('handles capital letter suffix', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="downloads: 4.2K per week">Test SVG</svg>',
      ),
    ).toBe('4.2K')
  })

  test('handles decimal number without suffix', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="rating: 4.7 stars">Test SVG</svg>',
      ),
    ).toBe('4.7')
  })

  test('extracts number from different text format', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="contributors: 42 people">Test SVG</svg>',
      ),
    ).toBe('42')
  })

  test('extracts number at the beginning', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="123 stars on GitHub">Test SVG</svg>',
      ),
    ).toBe('123')
  })

  test('returns first match when multiple numbers present', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="200 stars and 50 forks">Test SVG</svg>',
      ),
    ).toBe('200')
  })

  test('returns undefined for missing aria-label', () => {
    expect(
      parseAriaLabelFromSVG('<svg>No aria label</svg>'),
    ).toBeUndefined()
  })

  test('returns undefined for aria-label without numbers', () => {
    expect(
      parseAriaLabelFromSVG(
        '<svg aria-label="No numbers here">Test SVG</svg>',
      ),
    ).toBeUndefined()
  })
})

// ============================================
// Unit Tests: Individual Effects
// ============================================
describe('fetchPackument', () => {
  test('fetches and parses packument successfully', async () => {
    const mockPackument = {
      name: 'my-package',
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': {
          version: '1.0.0',
          dist: {
            integrity: 'sha512-abc123',
            tarball:
              'https://registry.npmjs.org/my-package/-/my-package-1.0.0.tgz',
          },
        },
      },
      time: { '1.0.0': '2023-01-01T00:00:00.000Z' },
    }

    const spec = Spec.parse('my-package', '1.0.0')
    const result = await runWithMock(
      fetchPackument({ spec: spec.final }),
      {
        'registry.npmjs.org/my-package': mockPackument,
      },
    )

    expect(result).toMatchObject({
      name: 'my-package',
      'dist-tags': { latest: '1.0.0' },
    })
  })

  test('returns undefined on parse error', async () => {
    // Mock an invalid packument response that fails schema validation
    const spec = Spec.parse('my-package', '1.0.0')
    const result = await runWithMock(
      fetchPackument({ spec: spec.final }),
      {
        'registry.npmjs.org/my-package': { invalid: 'data' },
      },
    )

    expect(result).toBeUndefined()
  })

  test('returns undefined on network error', async () => {
    const spec = Spec.parse('my-package', '1.0.0')
    const result = await runWithMock(
      fetchPackument({ spec: spec.final }),
      {
        'registry.npmjs.org/my-package': { status: 500, body: {} },
      },
    )

    expect(result).toBeUndefined()
  })
})

describe('fetchRegistryManifest', () => {
  test('fetches and normalizes manifest', async () => {
    const mockManifest = {
      name: 'my-package',
      version: '1.0.0',
      _npmUser: {
        name: 'Ruy Adorno',
        email: 'ruyadorno@example.com',
      },
    }

    const spec = Spec.parse('my-package', '1.0.0')
    const result = await runWithMock(
      fetchRegistryManifest({ spec: spec.final }),
      {
        'registry.npmjs.org/my-package/1.0.0': mockManifest,
      },
    )

    expect(result).toMatchObject({
      name: 'my-package',
      version: '1.0.0',
      _npmUser: {
        name: 'Ruy Adorno',
        email: 'ruyadorno@example.com',
      },
    })
  })

  test('returns normalized manifest data', async () => {
    // The schema is permissive and normalizeManifest handles various inputs
    const spec = Spec.parse('my-package', '1.0.0')
    const result = await runWithMock(
      fetchRegistryManifest({ spec: spec.final }),
      {
        'registry.npmjs.org/my-package/1.0.0': {
          name: 'test',
          version: '1.0.0',
        },
      },
    )

    expect(result).toMatchObject({ name: 'test', version: '1.0.0' })
  })
})

describe('fetchOpenIssueCount', () => {
  test('parses issue count from shields.io SVG', async () => {
    const result = await runWithMock(
      fetchOpenIssueCount({
        org: 'ruyadorno',
        repo: 'github-repo-info',
      }),
      {
        'img.shields.io/github/issues/ruyadorno/github-repo-info': {
          body: '<svg aria-label="issues: 5 open">Test SVG</svg>',
          isText: true,
        },
      },
    )

    expect(result).toBe('5')
  })

  test('returns undefined on error', async () => {
    const result = await runWithMock(
      fetchOpenIssueCount({ org: 'ruyadorno', repo: 'nonexistent' }),
      {
        'img.shields.io/github/issues/ruyadorno/nonexistent': {
          status: 404,
          body: '',
        },
      },
    )

    expect(result).toBeUndefined()
  })
})

describe('fetchOpenPullRequestCount', () => {
  test('parses PR count from shields.io SVG', async () => {
    const result = await runWithMock(
      fetchOpenPullRequestCount({
        org: 'ruyadorno',
        repo: 'github-repo-info',
      }),
      {
        'img.shields.io/github/issues-pr/ruyadorno/github-repo-info':
          {
            body: '<svg aria-label="pull requests: 3 open">Test SVG</svg>',
            isText: true,
          },
      },
    )

    expect(result).toBe('3')
  })
})

describe('fetchDownloadsLastYear', () => {
  test('fetches and parses download data', async () => {
    const mockDownloads = {
      start: '2023-01-01',
      end: '2023-12-31',
      package: 'my-package',
      downloads: [
        { downloads: 100, day: '2023-01-01' },
        { downloads: 150, day: '2023-01-02' },
      ],
    }

    const spec = Spec.parse('my-package', '1.0.0')
    const result = await runWithMock(
      fetchDownloadsLastYear({ spec: spec.final }),
      {
        'api.npmjs.org/downloads/range/last-year/my-package':
          mockDownloads,
      },
    )

    expect(result).toEqual({
      downloadsLastYear: {
        start: '2023-01-01',
        end: '2023-12-31',
        downloads: [
          { downloads: 100, day: '2023-01-01' },
          { downloads: 150, day: '2023-01-02' },
        ],
      },
    })
  })

  test('returns undefined on parse error', async () => {
    // Mock an invalid downloads response that fails schema validation
    const spec = Spec.parse('my-package', '1.0.0')
    const result = await runWithMock(
      fetchDownloadsLastYear({ spec: spec.final }),
      {
        'api.npmjs.org/downloads/range/last-year/my-package': {
          invalid: 'data',
        },
      },
    )

    expect(result).toBeUndefined()
  })
})

describe('fetchDownloadsPerVersion', () => {
  test('fetches and parses per-version download data', async () => {
    const mockDownloads = {
      package: 'my-package',
      downloads: { '1.0.0': 100, '1.0.1': 200 },
    }

    const spec = Spec.parse('my-package', '1.0.0')
    const result = await runWithMock(
      fetchDownloadsPerVersion({ spec: spec.final }),
      {
        'api.npmjs.org/versions/my-package/last-week': mockDownloads,
      },
    )

    expect(result).toEqual({
      downloadsPerVersion: { '1.0.0': 100, '1.0.1': 200 },
    })
  })
})

describe('fetchGitHubRepo', () => {
  test('fetches repository info', async () => {
    const mockRepo = {
      stargazers_count: '1000',
      organization: { login: 'vltpkg' },
      name: 'vlt',
      default_branch: 'main',
    }

    const result = await runWithMock(
      fetchGitHubRepo({
        gitHubApi: 'https://api.github.com/repos/vltpkg/vlt',
      }),
      {
        'api.github.com/repos/vltpkg/vlt': mockRepo,
      },
    )

    expect(result).toMatchObject({
      stargazers_count: '1000',
      name: 'vlt',
    })
  })

  test('returns partial data for incomplete response', async () => {
    // The schema is permissive - only extracts what matches
    const result = await runWithMock(
      fetchGitHubRepo({
        gitHubApi: 'https://api.github.com/repos/org/repo',
      }),
      {
        'api.github.com/repos/org/repo': { stargazers_count: '500' },
      },
    )

    expect(result).toMatchObject({ stargazers_count: '500' })
  })
})

describe('fetchFavIcon', () => {
  test('constructs favicon from manifest repository', () => {
    const manifest = normalizeManifest({
      name: 'my-package',
      version: '1.0.0',
      repository: {
        type: 'git',
        url: 'https://github.com/ruyadorno/my-package.git',
      },
    })

    const result = fetchFavIcon({ manifest })

    expect(result).toEqual({
      favicon: {
        src: 'https://www.github.com/ruyadorno.png',
        alt: 'ruyadorno avatar',
      },
    })
  })

  test('returns undefined when no repository', () => {
    const manifest = normalizeManifest({
      name: 'my-package',
      version: '1.0.0',
    })

    const result = fetchFavIcon({ manifest })

    expect(result).toBeUndefined()
  })

  test('returns undefined when manifest is undefined', () => {
    const result = fetchFavIcon({ manifest: undefined })

    expect(result).toBeUndefined()
  })
})

describe('fetchContributorAvatars', () => {
  test('fetches avatars for all contributors', async () => {
    const manifest = normalizeManifest({
      name: 'my-package',
      version: '1.0.0',
      contributors: [
        { name: 'Contributor One', email: 'contrib1@example.com' },
        { name: 'Contributor Two', email: 'contrib2@example.com' },
      ],
    })

    const result = await runWithMock(
      fetchContributorAvatars({ manifest }),
      {},
    )

    expect(result).toHaveLength(2)
    expect(result?.[0]).toMatchObject({
      name: 'Contributor One',
      email: 'contrib1@example.com',
    })
    expect(result?.[0]?.avatar).toContain('gravatar.com/avatar/')
  })

  test('returns undefined when no contributors', async () => {
    const manifest = normalizeManifest({
      name: 'my-package',
      version: '1.0.0',
    })

    const result = await runWithMock(
      fetchContributorAvatars({ manifest }),
      {},
    )

    expect(result).toBeUndefined()
  })

  test('returns undefined when manifest is undefined', async () => {
    const result = await runWithMock(
      fetchContributorAvatars({ manifest: undefined }),
      {},
    )

    expect(result).toBeUndefined()
  })
})

describe('fetchPublisherAvatar', () => {
  test('fetches gravatar for email', async () => {
    const result = await Effect.runPromise(
      fetchPublisherAvatar({ email: 'test@example.com' }).pipe(
        Effect.provide(FetchHttpClient.layer),
      ),
    )

    expect(result).toMatchObject({
      src: expect.stringContaining('gravatar.com/avatar/'),
      alt: 'avatar',
    })
  })
})

describe('processPackumentVersions', () => {
  test('processes versions from packument', async () => {
    const packument = {
      name: 'my-package',
      'dist-tags': { latest: '1.0.2' },
      versions: {
        '1.0.0': {
          version: '1.0.0',
          dist: {
            unpackedSize: 1000,
            integrity: 'sha512-abc123',
            tarball:
              'https://registry.npmjs.org/my-package/-/my-package-1.0.0.tgz',
          },
          gitHead: 'abc123',
        },
        '1.0.1': {
          version: '1.0.1',
          dist: {
            unpackedSize: 1100,
            integrity: 'sha512-def456',
            tarball:
              'https://registry.npmjs.org/my-package/-/my-package-1.0.1.tgz',
          },
          gitHead: 'def456',
        },
      },
      time: {
        '1.0.0': '2023-01-01T00:00:00.000Z',
        '1.0.1': '2023-01-02T00:00:00.000Z',
      },
    }

    const manifest = { name: 'my-package', version: '1.0.0' }

    const result = await processPackumentVersions({
      packument: packument as any,
      manifest: manifest as any,
    })

    expect(result?.versions).toHaveLength(2)
    // Versions should be sorted in descending order
    expect(result?.versions[0]?.version).toBe('1.0.1')
    expect(result?.versions[1]?.version).toBe('1.0.0')

    // greaterVersions should contain versions greater than current
    expect(result?.greaterVersions).toHaveLength(1)
    expect(result?.greaterVersions?.[0]?.version).toBe('1.0.1')
  })

  test('returns undefined on error', async () => {
    const result = await processPackumentVersions({
      packument: null as any,
      manifest: null as any,
    })

    expect(result).toBeUndefined()
  })
})

// ============================================
// Unit Tests: Error Tracking
// ============================================
describe('withErrorTracking', () => {
  test('returns data on success', async () => {
    const successEffect = Effect.succeed('test-data')
    const tracked = withErrorTracking(
      successEffect as Effect.Effect<
        string,
        unknown,
        HttpClient.HttpClient
      >,
      'npm-packument',
    )

    const result = await Effect.runPromise(
      tracked.pipe(Effect.provide(FetchHttpClient.layer)),
    )

    expect(result).toEqual({ data: 'test-data', error: undefined })
  })

  test('captures error on failure', async () => {
    const failEffect = Effect.fail(new Error('Network error'))
    const tracked = withErrorTracking(
      failEffect as Effect.Effect<
        never,
        Error,
        HttpClient.HttpClient
      >,
      'github-repo',
    )

    const result = await Effect.runPromise(
      tracked.pipe(Effect.provide(FetchHttpClient.layer)),
    )

    expect(result).toEqual({
      data: undefined,
      error: { source: 'github-repo', message: 'Network error' },
    })
  })

  test('handles non-Error objects', async () => {
    const failEffect = Effect.fail({ message: 'Custom error' })
    const tracked = withErrorTracking(
      failEffect as Effect.Effect<
        never,
        { message: string },
        HttpClient.HttpClient
      >,
      'npm-downloads',
    )

    const result = await Effect.runPromise(
      tracked.pipe(Effect.provide(FetchHttpClient.layer)),
    )

    expect(result).toEqual({
      data: undefined,
      error: { source: 'npm-downloads', message: 'Custom error' },
    })
  })

  test('handles unknown error types', async () => {
    const failEffect = Effect.fail('string error')
    const tracked = withErrorTracking(
      failEffect as Effect.Effect<
        never,
        string,
        HttpClient.HttpClient
      >,
      'readme',
    )

    const result = await Effect.runPromise(
      tracked.pipe(Effect.provide(FetchHttpClient.layer)),
    )

    expect(result).toEqual({
      data: undefined,
      error: { source: 'readme', message: 'Unknown error' },
    })
  })
})

// ============================================
// Integration Tests: fetchDetailsEffect
// ============================================
describe('fetchDetailsEffect', () => {
  test('uses author from provided manifest', async () => {
    // Mock fetch to return 404 for all external calls
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
      text: async () => '',
    })) as unknown as typeof fetch

    try {
      const spec = Spec.parse('mypkg', '1.0.0')
      const manifest = normalizeManifest({
        name: 'mypkg',
        version: '1.0.0',
        author: 'Ruy Adorno',
      })

      const result = await Effect.runPromise(
        fetchDetailsEffect({ spec, manifest }).pipe(
          Effect.provide(HttpClientNoTracing),
        ),
      )

      // Author should come from the provided manifest
      expect(result.author).toEqual({ name: 'Ruy Adorno' })
      // Manifest should be passed through
      expect(result.manifest).toBeDefined()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('processes packument versions when available', async () => {
    const packumentData = {
      name: 'mypkg',
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': {
          version: '1.0.0',
          dist: {
            unpackedSize: 1000,
            integrity: 'sha512-abc123',
            tarball:
              'https://registry.npmjs.org/mypkg/-/mypkg-1.0.0.tgz',
          },
        },
      },
      time: { '1.0.0': '2023-01-01T00:00:00.000Z' },
    }

    // Mock fetch - only packument succeeds
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = url instanceof Request ? url.url : url.toString()

      // Only packument succeeds (base URL without version)
      if (
        urlStr.includes('registry.npmjs.org') &&
        !urlStr.includes('/1.0.0')
      ) {
        return {
          ok: true,
          status: 200,
          json: async () => packumentData,
          text: async () => JSON.stringify(packumentData),
        }
      }

      // Everything else fails with 404
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => '',
      }
    }) as unknown as typeof fetch

    try {
      const spec = Spec.parse('mypkg', '1.0.0')
      const manifest = normalizeManifest({
        name: 'mypkg',
        version: '1.0.0',
      })

      const result = await Effect.runPromise(
        fetchDetailsEffect({ spec, manifest }).pipe(
          Effect.provide(HttpClientNoTracing),
        ),
      )

      // Should have versions from packument
      expect(result.versions).toBeDefined()
      expect(result.versions?.length).toBeGreaterThan(0)
      expect(result.versions?.[0]?.version).toBe('1.0.0')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('fetches registry manifest and versions for external packages (no manifest provided)', async () => {
    const packumentData = {
      name: 'react',
      'dist-tags': { latest: '18.2.0' },
      versions: {
        '18.2.0': {
          name: 'react',
          version: '18.2.0',
          description: 'React library',
          author: { name: 'Meta' },
          dist: {
            unpackedSize: 2000,
            integrity: 'sha512-abc123',
            tarball:
              'https://registry.npmjs.org/react/-/react-18.2.0.tgz',
          },
          _npmUser: { name: 'meta-bot', email: 'meta@example.com' },
        },
      },
      time: {
        '18.2.0': '2023-06-01T00:00:00.000Z',
      },
    }

    const registryManifest = {
      name: 'react',
      version: '18.2.0',
      description: 'React library',
      author: { name: 'Meta' },
      _npmUser: { name: 'meta-bot', email: 'meta@example.com' },
    }

    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async (url: string | Request | URL) => {
      const urlStr = url instanceof Request ? url.url : String(url)
      // Packument endpoint
      if (urlStr === 'https://registry.npmjs.org/react') {
        return {
          ok: true,
          status: 200,
          json: async () => packumentData,
          text: async () => JSON.stringify(packumentData),
        } as Response
      }
      // Registry manifest endpoint (latest)
      if (urlStr === 'https://registry.npmjs.org/react/latest') {
        return {
          ok: true,
          status: 200,
          json: async () => registryManifest,
          text: async () => JSON.stringify(registryManifest),
        } as Response
      }
      // Default 404 for other endpoints
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => '',
      } as Response
    }) as unknown as typeof fetch

    try {
      // Parse spec without version (like external packages)
      const spec = Spec.parseArgs('react')

      // Call without manifest (external package scenario)
      const result = await Effect.runPromise(
        fetchDetailsEffect({ spec }).pipe(
          Effect.provide(HttpClientNoTracing),
        ),
      )

      // Should have fetched manifest from registry
      expect(result.manifest).toBeDefined()
      expect(
        (result.manifest as { version?: string } | undefined)
          ?.version,
      ).toBe('18.2.0')

      // Should have versions from packument
      expect(result.versions).toBeDefined()
      expect(result.versions?.length).toBeGreaterThan(0)
      expect(result.versions?.[0]?.version).toBe('18.2.0')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ============================================
// Integration Tests: fetchDetails (Promise API)
// ============================================
describe('fetchDetails', () => {
  // These tests use the real fetch API via vi.mock
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('returns author from provided manifest', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => '',
      })),
    )

    const spec = Spec.parse('mypkg', '1.0.0')
    const manifest = normalizeManifest({
      name: 'mypkg',
      version: '1.0.0',
      author: 'Ruy Adorno <ruy@example.com>',
    })

    const result = await fetchDetails({ spec, manifest })

    expect(result.author).toEqual({
      name: 'Ruy Adorno',
      email: 'ruy@example.com',
    })
    expect(result.manifest).toBeDefined()
  })
})
