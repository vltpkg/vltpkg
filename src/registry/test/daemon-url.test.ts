import { describe, it, expect, vi } from 'vitest'
import { app } from '../src/index.ts'
import { env } from 'cloudflare:test'

describe('Daemon URL Configuration', () => {
  describe('Dashboard endpoint with custom DAEMON_URL', () => {
    it('should use DAEMON_URL from environment when fetching dashboard data', async () => {
      // Create a custom environment with DAEMON_URL
      const customEnv = {
        ...env,
        DAEMON_ENABLED: true,
        DAEMON_URL: 'http://localhost:9999',
      }

      // Mock fetch to verify the URL being called
      const originalFetch = global.fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          registry: { url: 'test', name: 'test' },
          features: { search: true, publish: true, access: true },
        }),
      })
      global.fetch = mockFetch

      try {
        const res = await app.request(
          '/dashboard.json',
          {},
          customEnv,
        )

        // Verify fetch was called with the custom DAEMON_URL
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:9999/dashboard.json',
        )
        expect(res.status).toBe(200)
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should use DAEMON_URL from environment when fetching app data', async () => {
      // Create a custom environment with DAEMON_URL
      const customEnv = {
        ...env,
        DAEMON_ENABLED: true,
        DAEMON_URL: 'http://localhost:9999',
      }

      // Mock fetch to verify the URL being called
      const originalFetch = global.fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          graph: {},
          projects: [],
        }),
      })
      global.fetch = mockFetch

      try {
        const res = await app.request('/app-data.json', {}, customEnv)

        // Verify fetch was called with the custom DAEMON_URL
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:9999/app-data.json',
        )
        expect(res.status).toBe(200)
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should fall back to standalone mode when DAEMON_URL is unreachable', async () => {
      const customEnv = {
        ...env,
        DAEMON_ENABLED: true,
        DAEMON_URL: 'http://localhost:9999',
      }

      // Mock fetch to simulate unreachable daemon
      const originalFetch = global.fetch
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error('Connection refused'))
      global.fetch = mockFetch

      try {
        const res = await app.request(
          '/dashboard.json',
          {},
          customEnv,
        )

        // Should fall back to standalone mode
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.registry).toBeDefined()
        expect(data.features).toBeDefined()
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  describe('Environment variable propagation', () => {
    it('should propagate DAEMON_PORT and DAEMON_URL through environment', async () => {
      const customEnv = {
        ...env,
        ARG_DAEMON: 'true',
        DAEMON_PORT: '8888',
        DAEMON_URL: 'http://custom-host:8888',
      }

      // Mock fetch to capture the request
      const originalFetch = global.fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ registry: {}, features: {} }),
      })
      global.fetch = mockFetch

      try {
        await app.request('/dashboard.json', {}, customEnv)

        // Verify custom URL was used
        expect(mockFetch).toHaveBeenCalledWith(
          'http://custom-host:8888/dashboard.json',
        )
      } finally {
        global.fetch = originalFetch
      }
    })
  })
})
