/**
 * Test suite for stale-while-revalidate cache strategy
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCachedPackageWithRefresh, getCachedVersionWithRefresh } from '../src/utils/cache.ts'

describe('Stale-while-revalidate cache strategy', () => {
  let mockContext
  let mockFetchUpstream
  let mockQueue

  beforeEach(() => {
    // Mock database operations
    const mockDb = {
      getCachedPackage: vi.fn(),
      upsertCachedPackage: vi.fn(),
      getCachedVersion: vi.fn(),
      upsertCachedVersion: vi.fn()
    }

    // Mock Cloudflare Queue
    mockQueue = {
      send: vi.fn().mockResolvedValue(true)
    }

    // Mock context
    mockContext = {
      db: mockDb,
      env: {
        CACHE_REFRESH_QUEUE: mockQueue
      },
      waitUntil: vi.fn()
    }

    // Mock upstream fetch function
    mockFetchUpstream = vi.fn().mockResolvedValue({
      'dist-tags': { latest: '1.0.0' },
      versions: { '1.0.0': { name: 'test-package', version: '1.0.0' } },
      time: { modified: new Date().toISOString() }
    })
  })

  describe('getCachedPackageWithRefresh', () => {
    it('should return fresh cache data immediately without queuing refresh', async () => {
      // Mock fresh cache data (within TTL)
      const freshCacheTime = new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      mockContext.db.getCachedPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' },
        origin: 'upstream',
        cachedAt: freshCacheTime.toISOString()
      })

      const result = await getCachedPackageWithRefresh(
        mockContext,
        'test-package',
        mockFetchUpstream,
        { packumentTtlMinutes: 5 }
      )

      expect(result.fromCache).toBe(true)
      expect(result.stale).toBe(false)
      expect(mockQueue.send).not.toHaveBeenCalled()
      expect(mockFetchUpstream).not.toHaveBeenCalled()
    })

    it('should return stale cache data and queue background refresh', async () => {
      // Mock stale cache data (beyond TTL but within stale window)
      const staleCacheTime = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      mockContext.db.getCachedPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' },
        origin: 'upstream',
        cachedAt: staleCacheTime.toISOString()
      })

      const result = await getCachedPackageWithRefresh(
        mockContext,
        'test-package',
        mockFetchUpstream,
        {
          packumentTtlMinutes: 5,
          staleWhileRevalidateMinutes: 60
        }
      )

      expect(result.fromCache).toBe(true)
      expect(result.stale).toBe(true)
      expect(mockQueue.send).toHaveBeenCalledWith({
        type: 'package_refresh',
        packageName: 'test-package',
        upstream: 'npm',
        timestamp: expect.any(Number),
        options: {
          packumentTtlMinutes: 5,
          upstream: 'npm'
        }
      })
      expect(mockFetchUpstream).not.toHaveBeenCalled()
    })

    it('should fetch upstream synchronously when no cache exists', async () => {
      // Mock no cache data
      mockContext.db.getCachedPackage.mockResolvedValue(null)

      const result = await getCachedPackageWithRefresh(
        mockContext,
        'test-package',
        mockFetchUpstream,
        { packumentTtlMinutes: 5 }
      )

      expect(result.fromCache).toBe(false)
      expect(result.stale).toBe(false)
      expect(mockFetchUpstream).toHaveBeenCalled()
      expect(mockContext.waitUntil).toHaveBeenCalled()
    })

    it('should fallback to waitUntil when queue is not available', async () => {
      // Remove queue from context
      mockContext.env.CACHE_REFRESH_QUEUE = null

      // Mock stale cache data
      const staleCacheTime = new Date(Date.now() - 10 * 60 * 1000)
      mockContext.db.getCachedPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' },
        origin: 'upstream',
        cachedAt: staleCacheTime.toISOString()
      })

      const result = await getCachedPackageWithRefresh(
        mockContext,
        'test-package',
        mockFetchUpstream,
        {
          packumentTtlMinutes: 5,
          staleWhileRevalidateMinutes: 60
        }
      )

      expect(result.fromCache).toBe(true)
      expect(result.stale).toBe(true)
      expect(mockContext.waitUntil).toHaveBeenCalled()
    })

    it('should handle very stale cache data (beyond stale window)', async () => {
      // Mock very stale cache data (beyond stale window)
      const veryOldCacheTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      mockContext.db.getCachedPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' },
        origin: 'upstream',
        cachedAt: veryOldCacheTime.toISOString()
      })

      const result = await getCachedPackageWithRefresh(
        mockContext,
        'test-package',
        mockFetchUpstream,
        {
          packumentTtlMinutes: 5,
          staleWhileRevalidateMinutes: 60 // 1 hour stale window
        }
      )

      // Should fetch fresh data since cache is beyond stale window
      expect(result.fromCache).toBe(false)
      expect(mockFetchUpstream).toHaveBeenCalled()
    })
  })

  describe('getCachedVersionWithRefresh', () => {
    it('should use longer TTL and stale windows for manifests', async () => {
      // Mock stale manifest data (1 year + 1 day old)
      const staleManifestTime = new Date(Date.now() - (365 + 1) * 24 * 60 * 60 * 1000)
      mockContext.db.getCachedVersion.mockResolvedValue({
        spec: 'test-package@1.0.0',
        manifest: { name: 'test-package', version: '1.0.0' },
        cachedAt: staleManifestTime.toISOString()
      })

      const mockFetchManifest = vi.fn().mockResolvedValue({
        manifest: { name: 'test-package', version: '1.0.0' },
        publishedAt: new Date().toISOString()
      })

      const result = await getCachedVersionWithRefresh(
        mockContext,
        'test-package@1.0.0',
        mockFetchManifest,
        {
          manifestTtlMinutes: 525600, // 1 year
          staleWhileRevalidateMinutes: 1051200 // 2 years
        }
      )

      expect(result.fromCache).toBe(true)
      expect(result.stale).toBe(true)
      expect(mockQueue.send).toHaveBeenCalledWith({
        type: 'version_refresh',
        spec: 'test-package@1.0.0',
        upstream: 'npm',
        timestamp: expect.any(Number),
        options: {
          manifestTtlMinutes: 525600,
          upstream: 'npm'
        }
      })
    })
  })

  describe('TTL and stale window calculations', () => {
    it('should correctly calculate cache validity based on age', async () => {
      const testCases = [
        {
          ageMinutes: 3,
          ttlMinutes: 5,
          staleMinutes: 60,
          expectedValid: true,
          expectedStale: false,
          description: 'fresh cache'
        },
        {
          ageMinutes: 10,
          ttlMinutes: 5,
          staleMinutes: 60,
          expectedValid: false,
          expectedStale: true,
          description: 'stale but within stale window'
        },
        {
          ageMinutes: 70,
          ttlMinutes: 5,
          staleMinutes: 60,
          expectedValid: false,
          expectedStale: false,
          description: 'beyond stale window'
        }
      ]

      for (const testCase of testCases) {
        const cacheTime = new Date(Date.now() - testCase.ageMinutes * 60 * 1000)
        mockContext.db.getCachedPackage.mockResolvedValue({
          name: 'test-package',
          tags: { latest: '1.0.0' },
          origin: 'upstream',
          cachedAt: cacheTime.toISOString()
        })

        const result = await getCachedPackageWithRefresh(
          mockContext,
          'test-package',
          mockFetchUpstream,
          {
            packumentTtlMinutes: testCase.ttlMinutes,
            staleWhileRevalidateMinutes: testCase.staleMinutes
          }
        )

        if (testCase.expectedValid) {
          expect(result.fromCache, testCase.description).toBe(true)
          expect(result.stale, testCase.description).toBe(false)
        } else if (testCase.expectedStale) {
          expect(result.fromCache, testCase.description).toBe(true)
          expect(result.stale, testCase.description).toBe(true)
        } else {
          expect(result.fromCache, testCase.description).toBe(false)
        }
      }
    })
  })
})
