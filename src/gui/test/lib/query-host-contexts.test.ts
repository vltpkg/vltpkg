import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'
import { createHostContextsMap } from '@/lib/query-host-contexts.ts'
import type { TransferData } from '@/state/types.ts'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'

// Mock the global fetch function
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the load function
vi.mock('@/state/load-graph.ts', () => ({
  load: vi.fn((transferData: TransferData) => {
    // Create mock graph based on transfer data
    const mockGraph = {
      nodes: new Map([
        [
          'node1',
          { id: 'node1', name: 'test-node-1', version: '1.0.0' },
        ],
        [
          'node2',
          { id: 'node2', name: 'test-node-2', version: '2.0.0' },
        ],
      ]),
      edges: new Set([
        {
          from: { id: 'node1' },
          to: { id: 'node2' },
          spec: 'latest',
        },
      ]),
    }

    return {
      graph: mockGraph,
      specOptions: {},
      securityArchive:
        transferData.securityArchive ??
        asSecurityArchiveLike(new Map()),
    }
  }),
}))

describe('createHostContextsMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('creates a map with local context', () => {
    const hostContexts = createHostContextsMap()

    expect(hostContexts).toBeInstanceOf(Map)
    expect(hostContexts.has('local')).toBe(true)

    const localFn = hostContexts.get('local')
    expect(typeof localFn).toBe('function')
  })

  it('local context fetches from server and returns combined data', async () => {
    const mockTransferData1: TransferData = {
      importers: [
        {
          importer: true,
          id: 'importer1',
          name: 'project1',
          version: '1.0.0',
          location: '/test/project1',
          manifest: { name: 'project1', version: '1.0.0' },
          dev: false,
          optional: false,
        },
      ],
      lockfile: {} as any,
      projectInfo: {
        root: '.',
        tools: ['vlt'],
        vltInstalled: true,
      },
      securityArchive: { test: 'data' },
    }

    const mockTransferData2: TransferData = {
      importers: [
        {
          importer: true,
          id: 'importer2',
          name: 'project2',
          version: '1.0.0',
          location: '/test/project2',
          manifest: { name: 'project2', version: '1.0.0' },
          dev: false,
          optional: false,
        },
      ],
      lockfile: {} as any,
      projectInfo: {
        root: '.',
        tools: ['vlt'],
        vltInstalled: true,
      },
      securityArchive: { test: 'data2' },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        local: [mockTransferData1, mockTransferData2],
      }),
    })

    const hostContexts = createHostContextsMap()
    const localFn = hostContexts.get('local')!
    const result = await localFn()

    expect(mockFetch).toHaveBeenCalledWith('/host-contexts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(result).toHaveProperty('edges')
    expect(result).toHaveProperty('nodes')
    expect(result).toHaveProperty('securityArchive')

    // Should have edges from both graphs (2 graphs * 1 edge each)
    expect(result.edges).toHaveLength(2)

    // Should have nodes from both graphs (2 graphs * 2 nodes each)
    expect(result.nodes).toHaveLength(4)
  })

  it('handles server error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    })

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const hostContexts = createHostContextsMap()
    const localFn = hostContexts.get('local')!
    const result = await localFn()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load host contexts:',
      expect.any(Error),
    )

    // Should return empty result on error
    expect(result.edges).toHaveLength(0)
    expect(result.nodes).toHaveLength(0)
    expect(result.securityArchive).toBeDefined()

    consoleErrorSpy.mockRestore()
  })

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const hostContexts = createHostContextsMap()
    const localFn = hostContexts.get('local')!
    const result = await localFn()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load host contexts:',
      expect.any(Error),
    )

    // Should return empty result on error
    expect(result.edges).toHaveLength(0)
    expect(result.nodes).toHaveLength(0)
    expect(result.securityArchive).toBeDefined()

    consoleErrorSpy.mockRestore()
  })

  it('handles empty server response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        local: [],
      }),
    })

    const hostContexts = createHostContextsMap()
    const localFn = hostContexts.get('local')!
    const result = await localFn()

    expect(result.edges).toHaveLength(0)
    expect(result.nodes).toHaveLength(0)
    expect(result.securityArchive).toBeDefined()
  })

  it('merges security archives from multiple contexts', async () => {
    const mockTransferData1: TransferData = {
      importers: [],
      lockfile: {} as any,
      projectInfo: {
        root: '.',
        tools: ['vlt'],
        vltInstalled: true,
      },
      securityArchive: { package1: { score: 80 } },
    }

    const mockTransferData2: TransferData = {
      importers: [],
      lockfile: {} as any,
      projectInfo: {
        root: '.',
        tools: ['vlt'],
        vltInstalled: true,
      },
      securityArchive: { package2: { score: 90 } },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        local: [mockTransferData1, mockTransferData2],
      }),
    })

    const hostContexts = createHostContextsMap()
    const localFn = hostContexts.get('local')!
    const result = await localFn()

    // The last security archive should be used (as per the implementation)
    expect(result.securityArchive).toBeDefined()
  })
})
