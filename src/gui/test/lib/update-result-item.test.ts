import { describe, it, expect, vi } from 'vitest'
import { updateResultItem } from '@/lib/update-result-item.ts'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { QueryResponseNode } from '@vltpkg/query'
import { joinDepIDTuple } from '@vltpkg/dep-id'

// Helper function to create a mock QueryResponseNode
const createMockNode = (
  name: string,
  version: string,
  importer = false,
  id?: string,
): QueryResponseNode =>
  ({
    name,
    version,
    importer,
    id: id || joinDepIDTuple(['registry', '', `${name}@${version}`]),
    graph: {
      nodes: new Map([
        [
          joinDepIDTuple(['registry', '', `${name}@${version}`]),
          { name, version },
        ],
      ]),
    } as any,
    edgesIn: new Set(),
    edgesOut: new Map(),
    insights: {
      scanned: false,
    },
    toJSON: () => ({}) as any,
  }) as QueryResponseNode

// Helper function to create a mock QueryResponseNode with multiple versions
const createNodeWithMultipleVersions = (
  name: string,
  version: string,
  otherVersions: string[],
): QueryResponseNode => {
  const nodes = new Map()
  nodes.set(joinDepIDTuple(['registry', '', `${name}@${version}`]), {
    name,
    version,
  })
  otherVersions.forEach(v => {
    nodes.set(joinDepIDTuple(['registry', '', `${name}@${v}`]), {
      name,
      version: v,
    })
  })

  return {
    name,
    version,
    id: joinDepIDTuple(['registry', '', `${name}@${version}`]),
    graph: { nodes } as any,
    edgesIn: new Set(),
    edgesOut: new Map(),
    insights: {
      scanned: false,
    },
    toJSON: () => ({}) as any,
  } as QueryResponseNode
}

// Helper function to create GridItemData
const createGridItemData = (
  overrides: Partial<GridItemData> = {},
): GridItemData => ({
  id: 'test-id',
  title: 'Test Item',
  version: '1.0.0',
  size: 1,
  stacked: false,
  name: 'test-package',
  ...overrides,
})

describe('updateResultItem', () => {
  describe('early return cases', () => {
    it('should return early when item.to is missing', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: undefined,
      })

      const handler = updateResultItem({
        item,
        query: 'test query',
        updateQuery: mockUpdateQuery,
      })

      const result = handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })

  describe('stacked items', () => {
    it('should handle stacked item with name', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        stacked: true,
        to: createMockNode('stacked-package', '1.0.0'),
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('#stacked-package')
    })

    it('should handle stacked item without name', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        stacked: true,
        to: createMockNode('', '1.0.0'),
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('')
    })

    it('should append to existing query for stacked item', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        stacked: true,
        to: createMockNode('stacked-package', '1.0.0'),
      })

      const handler = updateResultItem({
        item,
        query: 'existing query',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        'existing query#stacked-package',
      )
    })

    it('should not duplicate query for stacked item', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        stacked: true,
        to: createMockNode('stacked-package', '1.0.0'),
      })

      const handler = updateResultItem({
        item,
        query: '#stacked-package',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('#stacked-package')
    })
  })

  describe('importer items (project root)', () => {
    it('should handle importer with name', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('project-name', '1.0.0', true),
        from: undefined,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':project#project-name',
      )
    })

    it('should handle importer without name', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('', '1.0.0', true),
        from: undefined,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(':project#')
    })
  })

  describe('items with from node', () => {
    it('should handle item with from node and single version', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('parent-package', '2.0.0')
      const toNode = createMockNode('child-package', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-package > #child-package',
      )
    })

    it('should handle item with from node and multiple versions (include version)', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createNodeWithMultipleVersions(
        'parent-package',
        '2.0.0',
        ['1.0.0', '3.0.0'],
      )
      const toNode = createMockNode('child-package', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-package:v(2.0.0) > #child-package',
      )
    })

    it('should handle item with from node but no from version', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createNodeWithMultipleVersions(
        'parent-package',
        '2.0.0',
        ['1.0.0', '3.0.0'],
      )
      fromNode.version = undefined as any
      const toNode = createMockNode('child-package', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-package > #child-package',
      )
    })

    it('should handle :root query modification', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('parent-package', '2.0.0')
      const toNode = createMockNode('child-package', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: ':root some-other-query',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root #parent-package > some-other-query',
      )
    })

    it('should handle :root query modification with version', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createNodeWithMultipleVersions(
        'parent-package',
        '2.0.0',
        ['1.0.0'],
      )
      const toNode = createMockNode('child-package', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: ':root existing-query final-part',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root existing-query #parent-package:v(2.0.0) > final-part',
      )
    })

    it('should handle sameItems true (no suffix)', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('parent-package', '2.0.0')
      const toNode = createMockNode('child-package', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: true,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-package > ',
      )
    })
  })

  describe('default cases (no from, no importer, not stacked)', () => {
    it('should handle simple case with name', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('simple-package', '1.0.0'),
        from: undefined,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('#simple-package')
    })

    it('should handle simple case without name', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('', '1.0.0'),
        from: undefined,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('')
    })

    it('should handle sameItems true (no suffix)', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('simple-package', '1.0.0'),
        from: undefined,
        sameItems: true,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('')
    })

    it('should append to existing query', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('simple-package', '1.0.0'),
        from: undefined,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: 'existing query',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        'existing query#simple-package',
      )
    })

    it('should not duplicate query', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('simple-package', '1.0.0'),
        from: undefined,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '#simple-package',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('#simple-package')
    })
  })

  describe('edge cases and complex scenarios', () => {
    it('should handle whitespace in query', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('package', '1.0.0'),
        from: undefined,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '   trimmed query   ',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        'trimmed query#package',
      )
    })

    it('should handle empty query with whitespace', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('package', '1.0.0'),
        from: undefined,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '   ',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('#package')
    })

    it('should handle complex :root query with multiple parts', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('parent', '1.0.0')
      const toNode = createMockNode('child', '2.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: ':root part1 part2 part3 final',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root part1 part2 part3 #parent > final',
      )
    })

    it('should handle from node with no graph', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = {
        name: 'parent',
        version: '1.0.0',
        graph: { nodes: new Map() },
        edgesIn: new Set(),
        edgesOut: new Map(),
        insights: {
          scanned: false,
        },
        toJSON: () => ({}) as any,
      } as QueryResponseNode
      const toNode = createMockNode('child', '2.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('#parent > #child')
    })

    it('should handle from node with empty name', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('', '1.0.0')
      const toNode = createMockNode('child', '2.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('# > #child')
    })

    it('should handle multiple scenarios combined', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      // Test case: from node with multiple versions, complex query, and specific naming
      const fromNode = createNodeWithMultipleVersions(
        'my-parent-pkg',
        '3.1.4',
        ['1.0.0', '2.0.0', '3.0.0'],
      )
      const toNode = createMockNode('@scoped/child-pkg', '1.2.3')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })

      const handler = updateResultItem({
        item,
        query: ':root existing complex query with spaces',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root existing complex query with #my-parent-pkg:v(3.1.4) > spaces',
      )
    })
  })

  describe('return value', () => {
    it('should always return undefined', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('package', '1.0.0'),
      })

      const handler = updateResultItem({
        item,
        query: 'test',
        updateQuery: mockUpdateQuery,
      })

      const result = handler(mockEvent)
      expect(result).toBeUndefined()
    })
  })
})
