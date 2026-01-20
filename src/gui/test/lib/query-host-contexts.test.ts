import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'
import { createHostContextsMap } from '@/lib/query-host-contexts.ts'
import type { TransferData, RawNode } from '@/state/types.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import type {
  LockfileEdgeKey,
  LockfileEdges,
  LockfileEdgeValue,
  LockfileNode,
} from '@vltpkg/graph'

// Mock the global fetch function
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('createHostContextsMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('local context fetches from server and returns combined data', async () => {
    const mockTransferData1: TransferData = {
      importers: [
        {
          importer: true,
          id: joinDepIDTuple(['file', '.']),
          name: 'project1',
          version: '1.0.0',
          location: '/test/project1',
          mainImporter: true,
          manifest: { name: 'project1', version: '1.0.0' },
          projectRoot: '/test/project1',
          dev: false,
          optional: false,
        } as unknown as RawNode,
      ],
      lockfile: {
        lockfileVersion: 1,
        options: {
          registries: {
            custom: 'https://registry.example.com',
          },
        },
        nodes: {
          [joinDepIDTuple(['registry', '', 'test-node-1@1.0.0'])]: [
            0,
            'test-node-1',
            null,
            null,
            '/test/node1',
            { name: 'test-node-1', version: '1.0.0' },
          ] as LockfileNode,
          [joinDepIDTuple(['registry', '', 'test-node-2@2.0.0'])]: [
            0,
            'test-node-2',
            null,
            null,
            '/test/node2',
            { name: 'test-node-2', version: '2.0.0' },
          ] as LockfileNode,
        } as Record<DepID, LockfileNode>,
        edges: {
          [`${joinDepIDTuple(['file', '.'])} test-node-1` as LockfileEdgeKey]:
            `prod ^1.0.0 ${joinDepIDTuple(['registry', '', 'test-node-1@1.0.0'])}` as LockfileEdgeValue,
          [`${joinDepIDTuple(['registry', '', 'test-node-1@1.0.0'])} test-node-2` as LockfileEdgeKey]:
            `prod ^1.0.0 ${joinDepIDTuple(['registry', '', 'test-node-2@2.0.0'])}` as LockfileEdgeValue,
        } as LockfileEdges,
      },
      projectInfo: {
        root: '/test/project1',
        homedirRelativeRoot: 'test/project1',
        tools: ['vlt'],
        vltInstalled: true,
      },
      securityArchive: undefined,
    }

    const mockTransferData2: TransferData = {
      importers: [
        {
          importer: true,
          id: joinDepIDTuple(['file', '.']),
          name: 'project2',
          version: '1.0.0',
          location: '/test/project2',
          mainImporter: true,
          manifest: { name: 'project2', version: '1.0.0' },
          projectRoot: '/test/project2',
          dev: false,
          optional: false,
        } as RawNode,
      ],
      lockfile: {
        lockfileVersion: 1,
        options: {
          registries: {
            custom: 'https://registry.example.com',
          },
        },
        nodes: {
          [joinDepIDTuple(['registry', '', 'test-node-1@1.0.0'])]: [
            0,
            'test-node-1',
            null,
            null,
            '/test/node1',
            { name: 'test-node-1', version: '1.0.0' },
          ] as LockfileNode,
          [joinDepIDTuple(['registry', '', 'test-node-2@2.0.0'])]: [
            0,
            'test-node-2',
            null,
            null,
            '/test/node2',
            { name: 'test-node-2', version: '2.0.0' },
          ] as LockfileNode,
        } as Record<DepID, LockfileNode>,
        edges: {
          [`${joinDepIDTuple(['file', '.'])} test-node-1` as LockfileEdgeKey]:
            `prod ^1.0.0 ${joinDepIDTuple(['registry', '', 'test-node-1@1.0.0'])}` as LockfileEdgeValue,
          [`${joinDepIDTuple(['registry', '', 'test-node-1@1.0.0'])} test-node-2` as LockfileEdgeKey]:
            `prod ^1.0.0 ${joinDepIDTuple(['registry', '', 'test-node-2@2.0.0'])}` as LockfileEdgeValue,
        } as LockfileEdges,
      },
      projectInfo: {
        root: '/test/project2',
        homedirRelativeRoot: 'test/project2',
        tools: ['vlt'],
        vltInstalled: true,
      },
      securityArchive: undefined,
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        local: [mockTransferData1, mockTransferData2],
        securityArchive: undefined,
      }),
    })

    const hostContexts = await createHostContextsMap()
    expect(mockFetch).toHaveBeenCalledWith('/host-contexts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const localFn = hostContexts.get('local')!
    const result = await localFn()
    expect(result).toHaveProperty('initialEdges')
    expect(result).toHaveProperty('initialNodes')
    expect(result).toHaveProperty('securityArchive')

    // Should have edges from both graphs (2 graphs * 2 edges each)
    expect(result.initialEdges).toHaveLength(4)

    // Should have nodes from both graphs (2 graphs * 3 nodes each)
    expect(result.initialNodes).toHaveLength(6)

    const projectFn = hostContexts.get('file:/test/project1')!
    const projectResult = await projectFn()
    expect(projectResult).toHaveProperty('initialEdges')
    expect(projectResult).toHaveProperty('initialNodes')
    expect(projectResult).toHaveProperty('securityArchive')
    // single project, so 2 edges and 3 nodes
    expect(projectResult.initialEdges).toHaveLength(2)
    expect(projectResult.initialNodes).toHaveLength(3)
  })
})
