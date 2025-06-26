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
  mainImporter = false,
): QueryResponseNode =>
  ({
    name,
    version,
    importer,
    mainImporter,
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
      item.name = 'missing-package'

      const handler = updateResultItem({
        item,
        query: '#test-query',
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
      item.name = 'stacked-package'

      const handler = updateResultItem({
        item,
        query: '*',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '*[name="stacked-package"]:v(1.0.0)',
      )
    })

    it('should handle stacked item with name (using id)', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        stacked: true,
        to: createMockNode('stacked-package', '1.0.0'),
      })
      item.name = 'stacked-package'

      const handler = updateResultItem({
        item,
        query: '#stacked-package',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#stacked-package[name="stacked-package"]:v(1.0.0)',
      )
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
      // simulate an aliased package
      item.name = 'foo'

      const handler = updateResultItem({
        item,
        query: ':root > #foo',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root > #foo[name="stacked-package"]:v(1.0.0)',
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
      item.name = 'stacked-package'

      const handler = updateResultItem({
        item,
        query: '#stacked-package',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#stacked-package[name="stacked-package"]:v(1.0.0)',
      )
    })
  })

  describe('importer items (project root)', () => {
    it('should handle workspaces', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('project-name', '1.0.0', true),
      })
      item.name = 'project-name'

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#project-name:workspace',
      )
    })

    it('should handle selecting the root', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode(
          'my-project',
          '1.0.0',
          true,
          undefined,
          true,
        ),
        from: undefined,
      })
      item.name = 'my-project'

      const handler = updateResultItem({
        item,
        query: '',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(':root')
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
      item.name = 'child-package'

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
      item.name = 'child-package'

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
      item.name = 'child-package'

      const handler = updateResultItem({
        item,
        query: ':fs',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-package > :fs#child-package',
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
      item.name = 'child-package'

      const handler = updateResultItem({
        item,
        query: ':root :fs',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root :fs:is(#parent-package > #child-package)',
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
      item.name = 'child-package'

      const handler = updateResultItem({
        item,
        query: ':root :dev :unknown',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root :dev :unknown:is(#parent-package:v(2.0.0) > #child-package)',
      )
    })

    it('should handle sameItems true (from single id selector)', () => {
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
      item.name = 'child-package'

      const handler = updateResultItem({
        item,
        query: '#foo',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-package > #foo',
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
      item.name = 'simple-package'

      const handler = updateResultItem({
        item,
        query: ':fs',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':fs#simple-package',
      )
    })

    it('should handle sameItems true (from multiple selectors)', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('simple-package', '1.0.0'),
        from: createMockNode('parent-package', '2.0.0'),
        sameItems: true,
      })
      item.name = 'simple-package'

      const handler = updateResultItem({
        item,
        query: '#parent-package > #simple-package:fs',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-package > #simple-package:fs:v(1.0.0)',
      )
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
      item.name = 'simple-package'

      const handler = updateResultItem({
        item,
        query: ':semver(^1.0.0) :dev',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':semver(^1.0.0) :dev#simple-package',
      )
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
        from: createMockNode('parent', '2.0.0'),
        sameItems: false,
      })
      item.name = 'package'

      const handler = updateResultItem({
        item,
        query: '   :root > *   ',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root > *:is(#parent > #package)',
      )
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
      item.name = 'child'

      const handler = updateResultItem({
        item,
        query: ':root #foo #bar #baz',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root #foo #bar #baz:is(#parent > #child)',
      )
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
      item.name = '@scoped/child-pkg'

      const handler = updateResultItem({
        item,
        query: ':root :dev #foo > :fs',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root :dev #foo > :fs:is(#my-parent-pkg:v(3.1.4) > #@scoped/child-pkg)',
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
      item.name = 'package'

      const handler = updateResultItem({
        item,
        query: 'test',
        updateQuery: mockUpdateQuery,
      })

      const result = handler(mockEvent)
      expect(result).toBeUndefined()
    })
  })

  describe('additional edge cases and complex scenarios', () => {
    it('should handle workspace importer as from node', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('workspace-pkg', '1.0.0', true)
      const toNode = createMockNode('child-package', '2.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })
      item.name = 'child-package'

      const handler = updateResultItem({
        item,
        query: ':dev',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#workspace-pkg:workspace > #child-package',
      )
    })

    it('should handle prefix match when query starts with parent name', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('parent-pkg', '1.0.0')
      const toNode = createMockNode('child-pkg', '2.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })
      item.name = 'child-pkg'

      const handler = updateResultItem({
        item,
        query: '#parent-pkg ~ *',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-pkg ~ *#child-pkg:v(2.0.0)',
      )
    })

    it('should handle attribute selectors in query', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('test-package', '1.0.0'),
        from: undefined,
        sameItems: false,
      })
      item.name = 'test-package'

      const handler = updateResultItem({
        item,
        query: '[name^="test"]',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '[name^="test"]#test-package',
      )
    })

    it('should handle pseudo-class selectors', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('outdated-pkg', '1.0.0'),
        from: createMockNode('parent-pkg', '2.0.0'),
        sameItems: false,
      })
      item.name = 'outdated-pkg'

      const handler = updateResultItem({
        item,
        query: ':outdated(major)',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-pkg > :outdated(major)#outdated-pkg',
      )
    })

    it('should handle complex pseudo-selectors with parameters', () => {
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
      item.name = 'child'

      const handler = updateResultItem({
        item,
        query: ':semver(^1.0.0)',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent > :semver(^1.0.0)#child',
      )
    })

    it('should handle insights selectors', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('vulnerable-pkg', '1.0.0'),
        from: undefined,
        sameItems: false,
      })
      item.name = 'vulnerable-pkg'

      const handler = updateResultItem({
        item,
        query: ':cve(CVE-2023-1234)',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':cve(CVE-2023-1234)#vulnerable-pkg',
      )
    })

    it('should handle path selectors', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('workspace-root', '1.0.0')
      const toNode = createMockNode('local-pkg', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })
      item.name = 'local-pkg'

      const handler = updateResultItem({
        item,
        query: ':path("packages/*")',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#workspace-root > :path("packages/*")#local-pkg',
      )
    })

    it('should handle type selectors', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('git-dependency', '1.0.0'),
        from: undefined,
        sameItems: false,
      })
      item.name = 'git-dependency'

      const handler = updateResultItem({
        item,
        query: ':type(git)',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':type(git)#git-dependency',
      )
    })

    it('should handle license selectors', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('parent-pkg', '1.0.0')
      const toNode = createMockNode('unlicensed-pkg', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })
      item.name = 'unlicensed-pkg'

      const handler = updateResultItem({
        item,
        query: ':license(unlicensed)',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-pkg > :license(unlicensed)#unlicensed-pkg',
      )
    })

    it('should handle score selectors with comparators', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('low-score-pkg', '1.0.0'),
        from: undefined,
        sameItems: false,
      })
      item.name = 'low-score-pkg'

      const handler = updateResultItem({
        item,
        query: ':score("<=0.5")',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':score("<=0.5")#low-score-pkg',
      )
    })

    it('should handle malware selectors', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('parent', '1.0.0')
      const toNode = createMockNode('suspicious-pkg', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })
      item.name = 'suspicious-pkg'

      const handler = updateResultItem({
        item,
        query: ':malware(critical)',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent > :malware(critical)#suspicious-pkg',
      )
    })

    it('should handle published date selectors', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('old-pkg', '1.0.0'),
        from: undefined,
        sameItems: false,
      })
      item.name = 'old-pkg'

      const handler = updateResultItem({
        item,
        query: ':published("<=2020-01-01")',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':published("<=2020-01-01")#old-pkg',
      )
    })

    it('should handle has() pseudo-class selector', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('react-app', '1.0.0')
      const toNode = createMockNode('react-component', '17.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })
      item.name = 'react-component'

      const handler = updateResultItem({
        item,
        query: ':has(:attr(peerDependencies, [react]))',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#react-app > :has(:attr(peerDependencies, [react]))#react-component',
      )
    })

    it('should handle not() pseudo-class selector', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('normal-pkg', '1.0.0'),
        from: undefined,
        sameItems: false,
      })
      item.name = 'normal-pkg'

      const handler = updateResultItem({
        item,
        query: ':not(:deprecated)',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':not(:deprecated)#normal-pkg',
      )
    })

    it('should handle combined pseudo-element selectors', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('main-pkg', '1.0.0')
      const toNode = createMockNode('dev-dep', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })
      item.name = 'dev-dep'

      const handler = updateResultItem({
        item,
        query: ':dev :optional',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#main-pkg > :dev :optional#dev-dep',
      )
    })

    it('should handle attr() pseudo-class with nested properties', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        to: createMockNode('peer-optional', '1.0.0'),
        from: undefined,
        sameItems: false,
      })
      item.name = 'peer-optional'

      const handler = updateResultItem({
        item,
        query: ':attr(peerDependenciesMeta, foo, [optional=true])',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':attr(peerDependenciesMeta, foo, [optional=true])#peer-optional',
      )
    })

    it('should handle complex combinators with sibling selector', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const fromNode = createMockNode('sibling-parent', '1.0.0')
      const toNode = createMockNode('sibling-pkg', '1.0.0')

      const item = createGridItemData({
        from: fromNode,
        to: toNode,
        sameItems: false,
      })
      item.name = 'sibling-pkg'

      const handler = updateResultItem({
        item,
        query: '#first-sibling ~ *',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#sibling-parent > #first-sibling ~ *#sibling-pkg',
      )
    })

    it('should handle sameItems with stacked items scenario', () => {
      const mockUpdateQuery = vi.fn()
      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as MouseEvent

      const item = createGridItemData({
        stacked: true,
        sameItems: true,
        to: createMockNode('multi-version-pkg', '2.0.0'),
      })
      item.name = 'multi-version-pkg'

      const handler = updateResultItem({
        item,
        query: ':dev',
        updateQuery: mockUpdateQuery,
      })

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':dev[name="multi-version-pkg"]:v(2.0.0)',
      )
    })
  })
})
