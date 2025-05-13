import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { startDashboardData, startAppData } from '@/lib/start-data.js'
import type { State } from '@/state/types.js'

const stderr = console.error

afterEach(() => {
  console.error = stderr
  vi.clearAllMocks()
})

beforeEach(() => {
  global.fetch = vi.fn(async url => {
    const urlObj = new URL(`file://${url}`)
    const stamp = urlObj.searchParams.get('random')
    const path = urlObj.pathname

    let data: State['dashboard'] | State['appData'] | undefined
    let status = 200

    if (path.endsWith('dashboard.json')) {
      if (stamp === 'standard') {
        data = {
          buildVersion: '1.0.0',
          cwd: '/path/to/cwd',
          projects: [
            {
              name: 'project-foo',
              readablePath: '~/project-foo',
              path: '/home/user/project-foo',
              manifest: { name: 'project-foo', version: '1.0.0' },
              tools: ['node', 'vlt'],
              mtime: 1730498483044,
            },
            {
              name: 'project-bar',
              readablePath: '~/project-foo',
              path: '/home/user/project-bar',
              manifest: { name: 'project-bar', version: '1.0.0' },
              tools: ['pnpm'],
              mtime: 1730498491029,
            },
          ],
        }
      } else {
        status = 404
      }
    } else if (path.endsWith('app-data.json')) {
      if (stamp === 'standard') {
        data = {
          buildVersion: '1.0.0',
        }
      } else {
        status = 404
      }
    } else {
      status = 404
    }

    if (status === 404) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => {
          throw new Error('Not found')
        },
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => data,
    }
  }) as unknown as typeof global.fetch
})

test('standard dashboard response', async () => {
  await new Promise<void>((res, rej) => {
    try {
      startDashboardData({
        navigate: vi.fn(),
        updateDashboard: dashboardData => {
          expect(dashboardData).toMatchSnapshot(
            'should return standard dashboard data',
          )
          res()
        },
        updateErrorCause: rej,
        stamp: 'standard',
      })
    } catch (err) {
      rej(err as Error)
    }
  })
})

test('missing dashboard response', async () => {
  console.error = vi.fn()
  await new Promise<void>((res, rej) => {
    try {
      startDashboardData({
        navigate: route => {
          expect(route).toBe('/error')
          res()
        },
        updateDashboard: () => {
          throw new Error('Should not have dashboard data')
        },
        updateErrorCause: vi.fn(),
        stamp: 'missing',
      })
    } catch (err) {
      rej(err as Error)
    }
  })
})

test('standard app data response', async () => {
  await new Promise<void>((res, rej) => {
    try {
      startAppData({
        navigate: vi.fn(),
        updateAppData: appData => {
          expect(appData).toMatchSnapshot(
            'should return standard app data',
          )
          res()
        },
        updateErrorCause: rej,
        stamp: 'standard',
      })
    } catch (err) {
      rej(err as Error)
    }
  })
})

test('missing app data response', async () => {
  console.error = vi.fn()
  await new Promise<void>((res, rej) => {
    try {
      startAppData({
        navigate: route => {
          expect(route).toBe('/error')
          res()
        },
        updateAppData: () => {
          throw new Error('Should not have app data')
        },
        updateErrorCause: vi.fn(),
        stamp: 'missing',
      })
    } catch (err) {
      rej(err as Error)
    }
  })
})
