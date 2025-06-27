import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPackagePackument } from '../src/routes/packages.ts'

// Mock config
vi.mock('../../config.js', () => ({
  DOMAIN: 'https://registry.example.com',
  PROXY: true,
  PROXY_URL: 'https://registry.npmjs.org'
}))

// Mock slimManifest function
vi.mock('../src/utils/packages.js', () => ({
  slimManifest: (manifest) => {
    // Simple implementation to use in tests
    if (!manifest) return {}

    const parsed = typeof manifest === 'string' ? JSON.parse(manifest) : manifest

    // Create a simplified version with only essential fields
    const slimmed = {
      name: parsed.name,
      version: parsed.version,
      description: parsed.description,
      dependencies: parsed.dependencies || {},
      peerDependencies: parsed.peerDependencies || {},
      peerDependenciesMeta: parsed.peerDependenciesMeta || {},
      dist: {
        ...(parsed.dist || {}),
        tarball: parsed.dist?.tarball || ''
      }
    }

    // Remove undefined values
    Object.keys(slimmed).forEach(key => {
      if (key !== 'dist' && slimmed[key] === undefined) {
        delete slimmed[key]
      }
    })

    return slimmed
  },
  createVersion: ({ pkg, version, manifest }) => manifest
}))

describe('Packument Response Format', () => {
  // Set up mock data and context
  const setupTest = () => {
    // Mock package data
    const mockPublishedPackage = {
      name: 'local-package',
      tags: { latest: '1.0.0', beta: '1.1.0-beta.1' },
      lastUpdated: '2023-01-01T00:00:00.000Z'
    }

    // Mock version data with JSON strings
    const mockVersions = [
      {
        spec: 'local-package@1.0.0',
        version: '1.0.0',
        manifest: JSON.stringify({
          name: 'local-package',
          version: '1.0.0',
          description: 'A locally published package',
          dependencies: { 'some-dep': '^1.0.0' },
          _id: 'local-package@1.0.0',
          _npmUser: { name: 'testuser' },
          readme: 'Very long readme content...',
          dist: {
            shasum: '1234567890abcdef',
            integrity: 'sha512-abcdefghijklmnopqrstuvwxyz0123456789',
            tarball: 'https://registry.example.com/local-package/-/local-package-1.0.0.tgz'
          }
        }),
        published_at: '2023-01-01T00:00:00.000Z'
      },
      {
        spec: 'local-package@1.1.0-beta.1',
        version: '1.1.0-beta.1',
        manifest: JSON.stringify({
          name: 'local-package',
          version: '1.1.0-beta.1',
          description: 'A locally published package (beta)',
          dependencies: {
            'some-dep': '^1.0.0',
            'another-dep': '^2.0.0'
          },
          _id: 'local-package@1.1.0-beta.1',
          _npmUser: { name: 'testuser' },
          readme: 'Very long readme content for beta...',
          dist: {
            shasum: '0987654321fedcba',
            integrity: 'sha512-zyxwvutsrqponmlkjihgfedcba0987654321',
            tarball: 'https://registry.example.com/local-package/-/local-package-1.1.0-beta.1.tgz'
          }
        }),
        published_at: '2023-01-15T00:00:00.000Z'
      }
    ]

    // Set up mock context
    const mockContext = {
      req: {
        param: vi.fn((name) => {
          if (name === 'pkg') {
            return 'local-package'
          }
          return undefined
        }),
        query: vi.fn((name) => {
          return null; // Return null for any query param
        }),
        url: 'https://registry.example.com/local-package'
      },
      db: {
        getPackage: vi.fn(async (name) => {
          if (name === 'local-package') {
            return { ...mockPublishedPackage }
          }
          return null
        }),
        getVersionsByPackage: vi.fn(async (name) => {
          if (name === 'local-package') {
            return [...mockVersions]
          }
          return []
        }),
        getVersion: vi.fn(async (spec) => {
          return mockVersions.find(v => v.spec === spec)
        }),
        upsertPackage: vi.fn(async () => true),
        upsertVersion: vi.fn(async () => true)
      },
      json: vi.fn((data, status = 200) => ({ body: data, status })),
      header: vi.fn(),
      executionCtx: { waitUntil: vi.fn() },
      env: {}
    }

    // Mock upstream data
    const mockUpstreamData = {
      name: 'proxied-package',
      _id: 'proxied-package',
      _rev: '123-abc',
      _attachments: {},
      _npmUser: { name: 'upstream-user' },
      maintainers: [{ name: 'upstream-user', email: 'user@example.com' }],
      'dist-tags': { latest: '2.0.0', next: '2.1.0-rc.1' },
      versions: {
        '2.0.0': {
          name: 'proxied-package',
          version: '2.0.0',
          description: 'A proxied package',
          dependencies: { 'dep1': '^1.0.0' },
          _id: 'proxied-package@2.0.0',
          _npmUser: { name: 'upstream-user' },
          readme: 'Very long readme content...',
          dist: {
            shasum: 'abcdef1234567890',
            integrity: 'sha512-abcdefghijklmnopqrstuvwxyz0123456789',
            tarball: 'https://registry.npmjs.org/proxied-package/-/proxied-package-2.0.0.tgz'
          }
        },
        '2.1.0-rc.1': {
          name: 'proxied-package',
          version: '2.1.0-rc.1',
          description: 'A proxied package (RC)',
          dependencies: { 'dep1': '^1.0.0', 'dep2': '^3.0.0' },
          _id: 'proxied-package@2.1.0-rc.1',
          _npmUser: { name: 'upstream-user' },
          readme: 'Very long readme content for RC...',
          dist: {
            shasum: 'fedcba0987654321',
            integrity: 'sha512-zyxwvutsrqponmlkjihgfedcba0987654321',
            tarball: 'https://registry.npmjs.org/proxied-package/-/proxied-package-2.1.0-rc.1.tgz'
          }
        }
      },
      time: {
        modified: '2023-02-01T00:00:00.000Z',
        created: '2023-01-01T00:00:00.000Z',
        '2.0.0': '2023-01-15T00:00:00.000Z',
        '2.1.0-rc.1': '2023-02-01T00:00:00.000Z'
      }
    }

    // Mock fetch for proxied package
    global.fetch = vi.fn(async (url) => {
      if (url.includes('proxied-package')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...mockUpstreamData })
        }
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      }
    })

    return {
      mockContext,
      mockUpstreamData,
      mockPublishedPackage,
      mockVersions
    }
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return consistent packument for local packages with only required fields', async () => {
    const { mockContext } = setupTest()

    await getPackagePackument(mockContext)

    expect(mockContext.json).toHaveBeenCalled()
    const responseData = mockContext.json.mock.calls[0][0]

    // Verify structure
    expect(responseData).toHaveProperty('name', 'local-package')
    expect(responseData).toHaveProperty('dist-tags')
    expect(responseData).toHaveProperty('versions')
    expect(responseData).toHaveProperty('time')

    // Verify dist-tags
    expect(responseData['dist-tags']).toEqual({
      latest: '1.0.0',
      beta: '1.1.0-beta.1'
    })

    // Verify versions exist
    expect(responseData.versions).toHaveProperty('1.0.0')
    expect(responseData.versions).toHaveProperty('1.1.0-beta.1')

    // Check slimming of sensitive data
    const version = responseData.versions['1.0.0']
    expect(version).toBeDefined()
    expect(version).not.toHaveProperty('_id')
    expect(version).not.toHaveProperty('_npmUser')
    expect(version).not.toHaveProperty('readme')

    // Verify contains required fields
    expect(version).toHaveProperty('name', 'local-package')
    expect(version).toHaveProperty('version', '1.0.0')
    expect(version).toHaveProperty('dist')

    // Verify status
    expect(mockContext.json.mock.calls[0][1]).toBe(200)
  })

  it('should return consistent packument for proxied packages with only required fields', async () => {
    const { mockContext } = setupTest()

    // Change request to fetch proxied package
    mockContext.req.param = vi.fn((name) => {
      if (name === 'pkg') {
        return 'proxied-package'
      }
      return undefined
    })

    // Capture dist-tags for verification
    let capturedTags = null
    mockContext.db.upsertPackage = vi.fn(async (name, tags) => {
      capturedTags = tags
      return true
    })

    await getPackagePackument(mockContext)

    // Verify response
    expect(mockContext.json).toHaveBeenCalled()
    const responseData = mockContext.json.mock.calls[0][0]

    // Verify structure
    expect(responseData).toHaveProperty('name', 'proxied-package')
    expect(responseData).toHaveProperty('dist-tags')
    expect(responseData).toHaveProperty('versions')
    expect(responseData).toHaveProperty('time')

    // Check that tags were properly stored
    expect(capturedTags).toEqual({
      latest: '2.0.0',
      next: '2.1.0-rc.1'
    })

    // Verify no extra fields
    expect(responseData).not.toHaveProperty('_id')
    expect(responseData).not.toHaveProperty('_rev')
    expect(responseData).not.toHaveProperty('_attachments')

    // Verify versions exist
    expect(Object.keys(responseData.versions)).toContain('2.0.0')
    expect(Object.keys(responseData.versions)).toContain('2.1.0-rc.1')

    // Check version format
    const version = responseData.versions['2.0.0']
    expect(version).toBeDefined()
    expect(version).toHaveProperty('name', 'proxied-package')
    expect(version).toHaveProperty('version', '2.0.0')
    expect(version).not.toHaveProperty('_id')
    expect(version).not.toHaveProperty('_npmUser')
    expect(version).not.toHaveProperty('readme')

    // Verify status
    expect(mockContext.json.mock.calls[0][1]).toBe(200)
  })

  it('should handle background refresh while maintaining consistent response format', async () => {
    const { mockContext } = setupTest()

    // Setup stale timestamp
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 10)

    // Mock stale package data
    mockContext.db.getPackage = vi.fn(async (name) => {
      if (name === 'local-package') {
        return {
          name: 'local-package',
          tags: { latest: '1.0.0', beta: '1.1.0-beta.1' },
          lastUpdated: oldDate.toISOString()
        }
      }
      return null
    })

    await getPackagePackument(mockContext)

    // Verify background refresh was triggered
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled()

    // Verify response
    expect(mockContext.json).toHaveBeenCalled()
    const responseData = mockContext.json.mock.calls[0][0]

    // Verify structure
    expect(responseData).toEqual(expect.objectContaining({
      name: 'local-package',
      'dist-tags': expect.any(Object),
      versions: expect.any(Object),
      time: expect.any(Object)
    }))

    // Verify status
    expect(mockContext.json.mock.calls[0][1]).toBe(200)
  })
})
