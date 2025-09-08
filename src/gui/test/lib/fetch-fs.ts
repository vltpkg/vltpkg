import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { fetchFsLs, fetchHomedir } from '@/lib/fetch-fs.ts'

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
  global.fetch = vi.fn(async (_url, init) => {
    const body =
      init && typeof init.body === 'string' ?
        JSON.parse(init.body)
      : {}
    const path = body.path as string | undefined

    switch (path) {
      case 'bad-status': {
        return {
          ok: false,
          json: async () => 'Bad status',
        } as MockResponse
      }
      case 'has-error': {
        return {
          ok: true,
          json: async () => ({ error: 'Server-side error' }),
        } as MockResponse
      }
      case 'empty': {
        return {
          ok: true,
          json: async () => JSON.stringify([]),
        } as MockResponse
      }
      default: {
        return {
          ok: true,
          json: async () =>
            JSON.stringify([
              {
                name: 'file.txt',
                path: '/some/dir/file.txt',
                type: 'file',
                size: 123,
                mtime: '2024-11-01T00:00:00.000Z',
              },
              {
                name: 'nested',
                path: '/some/dir/nested',
                type: 'directory',
                size: 0,
                mtime: '2024-11-02T00:00:00.000Z',
              },
            ]),
        } as MockResponse
      }
    }
  }) as unknown as typeof global.fetch
})

test('lists directory contents for provided path', async () => {
  const items = await fetchFsLs({ path: '/some/dir' })
  expect(items).toMatchSnapshot('should list items for path')
})

test('lists directory contents when no path provided', async () => {
  const items = await fetchFsLs({})
  expect(items).toMatchSnapshot(
    'should default to listing current dir',
  )
})

test('returns empty list', async () => {
  const items = await fetchFsLs({ path: 'empty' })
  expect(items).toEqual([])
})

test('throws on non-ok response', async () => {
  await expect(fetchFsLs({ path: 'bad-status' })).rejects.toThrow(
    'Failed to fetch fs ls:',
  )
})

test('throws when server returns error field', async () => {
  await expect(fetchFsLs({ path: 'has-error' })).rejects.toThrow(
    'Failed to fetch fs ls:',
  )
})

test('returns homedir path string', async () => {
  const prevFetch = global.fetch
  global.fetch = vi.fn(async url => {
    const endpoint =
      typeof url === 'string' ? new URL(`file://${url}`).pathname : ''
    if (endpoint === '/fs/homedir') {
      return {
        ok: true,
        json: async () => JSON.stringify('/home/user'),
      } as MockResponse
    }
    return prevFetch(
      url as RequestInfo,
      { method: 'POST', body: '{}' } as RequestInit,
    ) as unknown as MockResponse
  }) as unknown as typeof global.fetch

  const home = await fetchHomedir()
  expect(home).toBe('/home/user')
})

test('throws on non-ok response for homedir', async () => {
  const prevFetch = global.fetch
  global.fetch = vi.fn(async url => {
    const endpoint =
      typeof url === 'string' ? new URL(`file://${url}`).pathname : ''
    if (endpoint === '/fs/homedir') {
      return {
        ok: false,
        json: async () => 'Bad status',
      } as MockResponse
    }
    return prevFetch(
      url as RequestInfo,
      { method: 'POST', body: '{}' } as RequestInit,
    ) as unknown as MockResponse
  }) as unknown as typeof global.fetch

  await expect(fetchHomedir()).rejects.toThrow(
    'Failed to fetch homedir:',
  )
})

test('throws when server returns error field for homedir', async () => {
  const prevFetch = global.fetch
  global.fetch = vi.fn(async url => {
    const endpoint =
      typeof url === 'string' ? new URL(`file://${url}`).pathname : ''
    if (endpoint === '/fs/homedir') {
      return {
        ok: true,
        json: async () => ({ error: 'Server-side error' }),
      } as MockResponse
    }
    return prevFetch(
      url as RequestInfo,
      { method: 'POST', body: '{}' } as RequestInit,
    ) as unknown as MockResponse
  }) as unknown as typeof global.fetch

  await expect(fetchHomedir()).rejects.toThrow(
    'Failed to fetch homedir:',
  )
})
