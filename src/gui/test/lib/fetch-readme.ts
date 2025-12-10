import { test, expect, describe, vi, beforeEach } from 'vitest'
import { Effect } from 'effect'
import { HttpClientNoTracing } from '@/lib/external-info.ts'
import {
  fetchReadme,
  fetchReadmeLocal,
  fetchReadmeExternal,
} from '@/lib/fetch-readme.ts'

import type { HttpClient } from '@effect/platform'
import type { Spec } from '@vltpkg/spec/browser'

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

describe('fetchReadmeExternal', () => {
  test('fetches and parses README from unpkg', async () => {
    const result = await runWithMock(
      fetchReadmeExternal({
        packageName: 'my-package',
        packageVersion: '1.0.0',
        repository: { org: 'ruyadorno', repo: 'my-package' },
        reference: 'v1.0.0',
      }),
      {
        'unpkg.com/my-package@1.0.0/README.md': {
          body: '# My Package\n\nThis is a test README.',
          isText: true,
        },
      },
    )

    expect(result).toContain('# My Package')
  })

  test('returns undefined when reference is missing', async () => {
    const result = await runWithMock(
      fetchReadmeExternal({
        packageName: 'my-package',
        packageVersion: '1.0.0',
        repository: { org: 'ruyadorno', repo: 'my-package' },
        reference: undefined,
      }),
      {},
    )

    expect(result).toBeUndefined()
  })

  test('returns undefined for empty README content', async () => {
    const result = await runWithMock(
      fetchReadmeExternal({
        packageName: 'my-package',
        packageVersion: '1.0.0',
        repository: { org: 'ruyadorno', repo: 'my-package' },
        reference: 'v1.0.0',
      }),
      {
        'unpkg.com/my-package@1.0.0/README.md': {
          body: '', // Empty string
          isText: true,
        },
      },
    )

    // Empty content is considered as undefined/falsy
    expect(result).toBeUndefined()
  })
})

describe('fetchReadmeLocal', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('fetches README from local server /fs/read endpoint', async () => {
    // Mock the /fs/ls call to find the README filename
    // Then mock the /fs/read call to read the file
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { name: 'package.json', type: 'file' },
          { name: 'ReadMe.md', type: 'file' }, // Case variation
          { name: 'index.js', type: 'file' },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: '# Local README\n\nLocal content',
        }),
      })

    const result = await Effect.runPromise(
      fetchReadmeLocal({
        packageLocation: './node_modules/my-package',
        projectRoot: '/Users/test/project',
      }),
    )

    expect(result).toBe('# Local README\n\nLocal content')
    expect(global.fetch).toHaveBeenCalledTimes(2)
    // First call should be /fs/ls to find the README filename
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/fs/ls',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          path: '/Users/test/project/node_modules/my-package',
        }),
      }),
    )
    // Second call should be /fs/read with the actual filename found
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/fs/read',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          path: '/Users/test/project/node_modules/my-package/ReadMe.md',
          encoding: 'utf8',
        }),
      }),
    )

    global.fetch = originalFetch
  })

  test('handles different README extensions (txt, markdown, etc.)', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { name: 'package.json', type: 'file' },
          { name: 'readme.txt', type: 'file' },
          { name: 'README.md', type: 'file' },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: '# README from txt file' }),
      })

    const result = await Effect.runPromise(
      fetchReadmeLocal({
        packageLocation: './node_modules/my-package',
        projectRoot: '/Users/test/project',
      }),
    )

    // Should find readme.txt (first match in order)
    expect(result).toBe('# README from txt file')
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/fs/read',
      expect.objectContaining({
        body: JSON.stringify({
          path: '/Users/test/project/node_modules/my-package/readme.txt',
          encoding: 'utf8',
        }),
      }),
    )

    global.fetch = originalFetch
  })

  test('returns undefined when no README file found', async () => {
    // Mock /fs/ls returning no README file
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { name: 'package.json', type: 'file' },
        { name: 'index.js', type: 'file' },
      ],
    })

    const result = await Effect.runPromise(
      fetchReadmeLocal({
        packageLocation: './node_modules/my-package',
        projectRoot: '/Users/test/project',
      }),
    )

    expect(result).toBeUndefined()
    expect(global.fetch).toHaveBeenCalledTimes(1) // Only /fs/ls, no /fs/read

    global.fetch = originalFetch
  })

  test('returns undefined when /fs/ls returns error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })

    const result = await Effect.runPromise(
      fetchReadmeLocal({
        packageLocation: './node_modules/my-package',
        projectRoot: '/Users/test/project',
      }),
    )

    expect(result).toBeUndefined()

    global.fetch = originalFetch
  })

  test('returns undefined when /fs/read returns error', async () => {
    // Mock /fs/ls finding README, but /fs/read fails
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'README.md', type: 'file' }],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

    const result = await Effect.runPromise(
      fetchReadmeLocal({
        packageLocation: './node_modules/my-package',
        projectRoot: '/Users/test/project',
      }),
    )

    expect(result).toBeUndefined()

    global.fetch = originalFetch
  })

  test('returns undefined when response has no content', async () => {
    // Mock /fs/ls finding README, but /fs/read returns no content
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'README.md', type: 'file' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    const result = await Effect.runPromise(
      fetchReadmeLocal({
        packageLocation: './node_modules/my-package',
        projectRoot: '/Users/test/project',
      }),
    )

    expect(result).toBeUndefined()

    global.fetch = originalFetch
  })
})

describe('fetchReadme', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('uses local fetch when packageLocation and projectRoot are provided', async () => {
    // Mock the two-step process: /fs/ls to find README, then /fs/read to read it
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'README.md', type: 'file' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: '# Local README' }),
      })

    // When packageLocation is provided, fetchReadme uses fetchReadmeLocal
    // which uses native fetch, not Effect's HttpClient, but we still need to
    // provide the layer since the function's type requires it
    const { readme } = await fetchReadme({
      spec: {} as unknown as Spec,
      manifest: {},
      packageLocation: './node_modules/my-package',
      projectRoot: '/Users/test/project',
    })

    expect(readme).toBe('# Local README')
    expect(global.fetch).toHaveBeenCalledTimes(2)

    global.fetch = originalFetch
  })
})
