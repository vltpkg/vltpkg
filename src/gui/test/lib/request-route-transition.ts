import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { requestRouteTransition } from '@/lib/request-route-transition.ts'

const stderr = console.error

afterEach(() => {
  console.error = stderr
  vi.clearAllMocks()
})

beforeEach(() => {
  global.fetch = (async (url: string) => {
    if (url === '/throw') {
      throw new Error('ERR')
    }

    return {
      json: async () => {
        switch (url) {
          case '/ok': {
            return 'ok'
          }
          case '/error': {
            return 'error'
          }
          default: {
            throw Object.assign(
              { status: 404 },
              new Error('Not found'),
            )
          }
        }
      },
    }
  }) as unknown as typeof global.fetch
})

test('requestRouteTransition success', async () => {
  const navigate = vi.fn()
  const updateErrorCause = vi.fn()
  const updateQuery = vi.fn()
  const updateStamp = vi.fn()
  await requestRouteTransition({
    navigate,
    updateErrorCause,
    updateQuery,
    updateStamp,
    body: {},
    url: '/ok',
    destinationRoute: '/next-route',
    errorMessage: 'Unexpected error.',
  })
  expect(updateErrorCause).not.toHaveBeenCalled()
  expect(navigate).toHaveBeenCalledWith('/next-route')
  expect(updateStamp).toHaveBeenCalled()
})

test('requestRouteTransition failure', async () => {
  const navigate = vi.fn()
  const updateErrorCause = vi.fn()
  const updateQuery = vi.fn()
  const updateStamp = vi.fn()
  await requestRouteTransition({
    navigate,
    updateErrorCause,
    updateQuery,
    updateStamp,
    body: {},
    url: '/error',
    destinationRoute: '/next-route',
    errorMessage: 'Failed.',
  })
  expect(navigate).toHaveBeenCalledWith('/error')
  expect(updateErrorCause).toHaveBeenCalledWith('Failed.')
  expect(updateStamp).not.toHaveBeenCalled()
})

test('requestRouteTransition 404', async () => {
  console.error = vi.fn()
  const navigate = vi.fn()
  const updateErrorCause = vi.fn()
  const updateQuery = vi.fn()
  const updateStamp = vi.fn()
  await requestRouteTransition({
    navigate,
    updateErrorCause,
    updateQuery,
    updateStamp,
    body: {},
    url: '/missing',
    destinationRoute: '/next-route',
    errorMessage: 'Failed.',
  })
  expect(console.error).toHaveBeenCalled()
  expect(navigate).toHaveBeenCalledWith('/error')
  expect(updateErrorCause).toHaveBeenCalledWith('Failed.')
  expect(updateStamp).not.toHaveBeenCalled()
})

test('requestRouteTransition throw', async () => {
  console.error = vi.fn()
  const navigate = vi.fn()
  const updateErrorCause = vi.fn()
  const updateQuery = vi.fn()
  const updateStamp = vi.fn()
  await requestRouteTransition({
    navigate,
    updateErrorCause,
    updateQuery,
    updateStamp,
    body: {},
    url: '/throw',
    destinationRoute: '/next-route',
    errorMessage: 'Failed.',
  })
  expect(console.error).toHaveBeenCalled()
  expect(navigate).toHaveBeenCalledWith('/error')
  expect(updateErrorCause).toHaveBeenCalledWith(
    'Failed to submit request.',
  )
  expect(updateStamp).not.toHaveBeenCalled()
})
