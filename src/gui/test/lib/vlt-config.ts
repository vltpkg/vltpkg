import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest'
import {
  deleteFromConfig,
  getFromConfig,
  setToConfig,
  removeDashboardRoot,
  setDefaultDashboardRoot,
} from '@/lib/vlt-config.ts'
import * as fsLib from '@/lib/fetch-fs.ts'

type MockResponse = {
  ok: boolean
  json: () => Promise<unknown>
  text?: () => Promise<string>
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
        JSON.parse(init.body)
      : {}
    const which = body.which as 'user' | 'project' | undefined
    const pairs = (body.pairs ?? []) as Array<{
      key: string
      value?: string
    }>

    if (endpoint === '/config' && !pairs.length) {
      const entire = { alpha: 'a', beta: 'b' }
      return {
        ok: true,
        json: async () => JSON.stringify(entire),
      } as MockResponse
    }

    if (endpoint === '/config') {
      const out: Record<string, unknown> = {}
      for (const p of pairs) out[p.key] = p.key.toUpperCase()
      return {
        ok: true,
        json: async () => JSON.stringify(out),
      } as MockResponse
    }

    if (endpoint === '/config/set') {
      if (!which || (which !== 'user' && which !== 'project')) {
        return {
          ok: false,
          json: async () =>
            'Bad request\nwhich must be "user" or "project"',
          text: async () =>
            'Bad request\nwhich must be "user" or "project"',
        } as MockResponse
      }
      if (!Array.isArray(pairs) || pairs.length === 0) {
        return {
          ok: false,
          json: async () =>
            'Bad request\nConfig set requires a non-empty pairs array',
          text: async () =>
            'Bad request\nConfig set requires a non-empty pairs array',
        } as MockResponse
      }
      return {
        ok: true,
        json: async () => 'Config values set successfully',
      } as MockResponse
    }

    if (endpoint === '/config/delete') {
      if (!which || (which !== 'user' && which !== 'project')) {
        return {
          ok: false,
          json: async () =>
            'Bad request\nwhich must be "user" or "project"',
          text: async () =>
            'Bad request\nwhich must be "user" or "project"',
        } as MockResponse
      }
      if (!Array.isArray(pairs) || pairs.length === 0) {
        return {
          ok: false,
          json: async () =>
            'Bad request\nConfig delete requires a non-empty keys array',
          text: async () =>
            'Bad request\nConfig delete requires a non-empty keys array',
        } as MockResponse
      }
      return {
        ok: true,
        json: async () => 'Config values deleted successfully',
      } as MockResponse
    }

    return {
      ok: false,
      json: async () => 'Unhandled',
    } as MockResponse
  }) as unknown as typeof global.fetch
})

test('get entire config for project by default', async () => {
  const data = await getFromConfig({ which: 'project' })
  expect(data).toMatchSnapshot('should return entire config object')
})

test('get selected keys returns object map', async () => {
  const selected = await getFromConfig({
    which: 'user',
    pairs: [{ key: 'alpha' }, { key: 'beta' }],
  })
  expect(selected).toEqual({ alpha: 'ALPHA', beta: 'BETA' })
})

test('setToConfig returns success message', async () => {
  const msg = await setToConfig({
    which: 'user',
    pairs: [
      { key: 'alpha', value: 'a' },
      { key: 'beta', value: 'b' },
    ],
  })
  expect(msg).toBe('Config values set successfully')
})

test('deleteFromConfig returns success message', async () => {
  const msg = await deleteFromConfig({
    which: 'project',
    pairs: [{ key: 'alpha' }, { key: 'beta' }],
  })
  expect(msg).toBe('Config values deleted successfully')
})

test('errors surface as ConfigError with clean message', async () => {
  await expect(
    setToConfig({ which: 'error' as unknown as 'user', pairs: [] }),
  ).rejects.toThrow('which must be "user" or "project"')
})

test('removeDashboardRoot removes matching path from array and updates config', async () => {
  const prevFetch = global.fetch
  global.fetch = vi.fn(async (url, init) => {
    const endpoint =
      typeof url === 'string' ? new URL(`file://${url}`).pathname : ''
    if (endpoint === '/config') {
      return {
        ok: true,
        json: async () => JSON.stringify({ 'dashboard-root': ['/a', '/b'] }),
      } as unknown as MockResponse
    }
    return prevFetch(url as RequestInfo, init as RequestInit) as unknown as MockResponse
  }) as unknown as typeof global.fetch

  const updated = await removeDashboardRoot('/a')
  expect(updated).toEqual(['/b'])
})

test('removeDashboardRoot handles string value and returns empty when removed', async () => {
  const prevFetch = global.fetch
  global.fetch = vi.fn(async (url, init) => {
    const endpoint =
      typeof url === 'string' ? new URL(`file://${url}`).pathname : ''
    if (endpoint === '/config') {
      return {
        ok: true,
        json: async () => JSON.stringify({ 'dashboard-root': '/a' }),
      } as unknown as MockResponse
    }
    return prevFetch(url as RequestInfo, init as RequestInit) as unknown as MockResponse
  }) as unknown as typeof global.fetch

  const updated = await removeDashboardRoot('/a')
  expect(updated).toEqual([])
})

test('removeDashboardRoot ignores non-string values in current array', async () => {
  const prevFetch = global.fetch
  global.fetch = vi.fn(async (url, init) => {
    const endpoint =
      typeof url === 'string' ? new URL(`file://${url}`).pathname : ''
    if (endpoint === '/config') {
      return {
        ok: true,
        json: async () =>
          JSON.stringify({ 'dashboard-root': ['/a', 123, { x: 1 }, '/b'] }),
      } as unknown as MockResponse
    }
    return prevFetch(url as RequestInfo, init as RequestInit) as unknown as MockResponse
  }) as unknown as typeof global.fetch

  const updated = await removeDashboardRoot('/a')
  expect(updated).toEqual(['/b'])
})

test('removeDashboardRoot leaves array unchanged when path not found', async () => {
  const prevFetch = global.fetch
  global.fetch = vi.fn(async (url, init) => {
    const endpoint =
      typeof url === 'string' ? new URL(`file://${url}`).pathname : ''
    if (endpoint === '/config') {
      return {
        ok: true,
        json: async () => JSON.stringify({ 'dashboard-root': ['/a'] }),
      } as unknown as MockResponse
    }
    return prevFetch(url as RequestInfo, init as RequestInit) as unknown as MockResponse
  }) as unknown as typeof global.fetch

  const updated = await removeDashboardRoot('/x')
  expect(updated).toEqual(['/a'])
})

test('setDefaultDashboardRoot sets homedir in dashboard-root array', async () => {
  vi.spyOn(fsLib, 'fetchHomedir').mockResolvedValue('/home/user')

  await setDefaultDashboardRoot()

  const calls = (global.fetch as unknown as Mock).mock.calls
  const setCall = calls.find((args: any[]) => {
    const url = args[0]
    return (
      typeof url === 'string' &&
      new URL(`file://${url}`).pathname === '/config/set'
    )
  })
  expect(setCall).toBeTruthy()
  const body = setCall?.[1]?.body as string
  const parsed = JSON.parse(body)
  const pair = parsed.pairs.find((p: any) => p.key === 'dashboard-root')
  expect(pair.value).toBe(JSON.stringify(['/home/user']))
})

test('setDefaultDashboardRoot logs and does not throw on error', async () => {
  vi.spyOn(fsLib, 'fetchHomedir').mockRejectedValue(new Error('nope'))
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  await expect(setDefaultDashboardRoot()).resolves.toBeUndefined()
  expect(errSpy).toHaveBeenCalled()
})
