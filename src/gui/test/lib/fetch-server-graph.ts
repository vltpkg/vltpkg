import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  fetchNodeResolvedPath,
  GRAPH_ENDPOINTS,
} from '@/lib/fetch-server-graph.ts'

type MockResponse = {
  ok: boolean
  json: () => Promise<unknown>
}

const stderr = console.error

afterEach(() => {
  console.error = stderr
  vi.clearAllMocks()
})

beforeEach(() => {
  global.fetch = vi.fn(async (url, init) => {
    const endpoint =
      typeof url === 'string' ? new URL(`file://${url}`).pathname : ''
    const body =
      init && typeof init.body === 'string' ?
        JSON.parse(init.body as string)
      : {}

    if (endpoint === GRAPH_ENDPOINTS.nodeResolvedPath) {
      const depId = (body as { depId?: string }).depId
      switch (depId) {
        case 'bad-status':
          return {
            ok: false,
            json: async () => 'Bad status',
          } as MockResponse
        case 'stringified':
          return {
            ok: true,
            json: async () =>
              JSON.stringify({ path: '/resolved/string' }),
          } as MockResponse
        case 'abort':
          // Simulate fetch throwing; this branch not used here
          throw new DOMException('Aborted', 'AbortError')
        default:
          return {
            ok: true,
            json: async () => ({ path: '/resolved/object' }),
          } as MockResponse
      }
    }

    return { ok: true, json: async () => ({}) } as MockResponse
  }) as unknown as typeof global.fetch
})

test('fetchNodeResolvedPath returns parsed stringified JSON', async () => {
  const data = await fetchNodeResolvedPath({ depId: 'stringified' })
  expect(data).toEqual({ path: '/resolved/string' })
})

test('fetchNodeResolvedPath returns object JSON', async () => {
  const data = await fetchNodeResolvedPath({ depId: 'anything' })
  expect(data).toEqual({ path: '/resolved/object' })
})

test('fetchNodeResolvedPath rejects on non-ok response', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  await expect(
    fetchNodeResolvedPath({ depId: 'bad-status' }),
  ).rejects.toThrow('Failed to fetch graph')
  spy.mockRestore()
})

test('fetchNodeResolvedPath rethrows AbortError without logging', async () => {
  const prevFetch = global.fetch
  global.fetch = vi.fn(async () => {
    throw new DOMException('Aborted', 'AbortError')
  }) as unknown as typeof global.fetch

  // Spy on console.error to ensure it is NOT called for AbortError
  const spy = vi.spyOn(console, 'error')
  await expect(
    fetchNodeResolvedPath(
      { depId: 'any' },
      { signal: new AbortController().signal },
    ),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(spy).not.toHaveBeenCalled()
  global.fetch = prevFetch
})
