import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { startDashboardData } from '@/lib/start-dashboard-data.js'

const stderr = console.error

afterEach(() => {
  console.error = stderr
  vi.clearAllMocks()
})

beforeEach(() => {
  global.fetch = vi.fn(async url => ({
    json: async () => {
      switch (new URL(`file://${url}`).searchParams.get('random')) {
        case 'standard': {
          return {
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
        }
        default: {
          throw Object.assign({ status: 404 }, new Error('Not found'))
        }
      }
    },
  })) as unknown as typeof global.fetch
})

test('standard dashboard response', async () => {
  await new Promise<void>((res, rej) => {
    try {
      startDashboardData({
        updateActiveRoute: vi.fn(),
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
        updateActiveRoute: route => {
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
