import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateDependentsItem } from '@/lib/update-dependents-item.ts'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type {
  QueryResponseNode,
  QueryResponseEdge,
} from '@vltpkg/query'
import { Spec } from '@vltpkg/spec/browser'
import type { DepID } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/types'

// Mock QueryResponseNode for testing
const createMockNode = (
  id: string,
  name: string,
  version?: string,
  isMainImporter = false,
  isImporter = false,
): QueryResponseNode =>
  ({
    id,
    name,
    version,
    mainImporter: isMainImporter,
    importer: isMainImporter || isImporter,
    graph: {
      nodes: new Map([[id, { id, name, version }]]),
    },
  }) as unknown as QueryResponseNode

// Helper to create mock GridItemData
const createMockGridItem = (
  id: string,
  name: string,
  version: string,
  from?: QueryResponseNode,
  to?: QueryResponseNode,
): GridItemData => ({
  id,
  name,
  title: `${name}@${version}`,
  version,
  size: 1,
  stacked: false,
  from,
  to,
})

describe('updateDependentsItem', () => {
  const mockUpdateQuery = vi.fn()
  const mockEvent = {
    preventDefault: vi.fn(),
  } as unknown as React.MouseEvent

  beforeEach(() => {
    mockUpdateQuery.mockClear()
    vi.clearAllMocks()
  })

  describe('mainImporter navigation', () => {
    it('should navigate to :root when item.from has mainImporter', () => {
      const mainImporterNode = createMockNode(
        'root',
        'my-project',
        '1.0.0',
        true,
      )
      const testNode = createMockNode('test', 'test-package', '1.0.0')
      const edge = {
        name: 'test-package',
        type: 'prod',
        spec: Spec.parse('test-package', '^1.0.0'),
        from: mainImporterNode,
        to: testNode,
      } as QueryResponseEdge

      mainImporterNode.edgesOut = new Map([['test-package', edge]])
      testNode.edgesIn = new Set([edge])
      mainImporterNode.graph.edges = new Set([edge])
      mainImporterNode.graph.nodes = new Map([
        ['root', mainImporterNode],
        ['test', testNode],
      ]) as unknown as Map<DepID, NodeLike>
      mainImporterNode.graph.nodesByName = new Map([
        ['my-project', new Set([mainImporterNode])],
        ['test-package', new Set([testNode])],
      ])

      // item being clicked on is the root node
      const item = createMockGridItem(
        'root',
        'my-project',
        '1.0.0',
        mainImporterNode,
      )

      // should then result to :root
      const handler = updateDependentsItem({
        query: ':root > #test-package',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: false })
      handler(mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith(':root')
    })
  })

  describe('workspace navigation', () => {
    it('should navigate to :workspace', () => {
      const wsNode = createMockNode('ws', 'a', '1.0.0', false, true)
      const testNode = createMockNode('test', 'test-package', '1.0.0')
      const edge = {
        name: 'test-package',
        type: 'prod',
        spec: Spec.parse('test-package', '^1.0.0'),
        from: wsNode,
        to: testNode,
      } as QueryResponseEdge

      wsNode.edgesOut = new Map([['test-package', edge]])
      testNode.edgesIn = new Set([edge])
      wsNode.graph.edges = new Set([edge])
      wsNode.graph.nodes = new Map([
        ['ws', wsNode],
        ['test', testNode],
      ]) as unknown as Map<DepID, NodeLike>
      wsNode.graph.nodesByName = new Map([
        ['a', new Set([wsNode])],
        ['test-package', new Set([testNode])],
      ])

      // item being clicked on is a workspace node
      const item = createMockGridItem('ws', 'a', '1.0.0', wsNode)

      // should result in a query that anchors on the workspace
      const handler = updateDependentsItem({
        query: ':project > #test-package',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: false })
      handler(mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockUpdateQuery).toHaveBeenCalledWith('#a:workspace')
    })
  })

  describe('parent navigation', () => {
    it('should remove the last part when isParent=true and query ends with selected name and version', () => {
      const fromNode = createMockNode(
        'parent',
        'parent-package',
        '2.0.0',
      )
      const toNode = createMockNode('child', 'child-package', '1.5.0')
      const edge = {
        name: 'child-package',
        type: 'prod',
        spec: Spec.parse('child-package', '^1.5.0'),
        from: fromNode,
        to: toNode,
      } as QueryResponseEdge

      fromNode.edgesOut = new Map([['child-package', edge]])
      toNode.edgesIn = new Set([edge])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
        ['child', toNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['parent-package', new Set([fromNode])],
        ['child-package', new Set([toNode])],
      ])

      // item being clicked on is the parent package
      const item = createMockGridItem(
        'parent',
        'parent-package',
        '1.5.0',
        fromNode,
        toNode,
      )

      // should be able to return a new query that simply removes
      // the last part of the query that refers to the child package
      const handler = updateDependentsItem({
        query: ':root > #parent-package > #child-package:v(1.5.0)',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: true })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root > #parent-package',
      )
    })

    it('should remove the last part when isParent=true and query ends with selected name only', () => {
      const fromNode = createMockNode(
        'parent',
        'parent-package',
        '2.0.0',
      )
      const toNode = createMockNode(
        'target',
        'target-package',
        '1.5.0',
      )
      const edge = {
        name: 'target-package',
        type: 'prod',
        spec: Spec.parse('target-package', '^1.5.0'),
        from: fromNode,
        to: toNode,
      } as QueryResponseEdge
      fromNode.edgesOut = new Map([['target-package', edge]])
      toNode.edgesIn = new Set([edge])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
        ['target', toNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['parent-package', new Set([fromNode])],
        ['target-package', new Set([toNode])],
      ])

      // item being clicked on is the parent package
      const item = createMockGridItem(
        'test',
        'parent-package',
        '1.5.0',
        fromNode,
        toNode,
      )

      // should be able to return a new query that simply removes
      // the last part of the query that refers to the target package
      const handler = updateDependentsItem({
        query: ':root > #parent-package > #target-package',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: true })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root > #parent-package',
      )
    })

    it('should handle complex queries with pseudo-selectors', () => {
      const fromNode = createMockNode('parent', 'react', '18.0.0')
      const toNode = createMockNode('target', 'lodash', '4.17.21')
      const edge = {
        name: 'lodash',
        type: 'prod',
        spec: Spec.parse('lodash', '^4.17.21'),
        from: fromNode,
        to: toNode,
      } as QueryResponseEdge

      fromNode.edgesIn = new Set([
        { name: 'react' } as QueryResponseEdge,
      ])
      fromNode.edgesOut = new Map([['lodash', edge]])
      toNode.edgesIn = new Set([edge])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
        ['target', toNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['react', new Set([fromNode])],
        ['lodash', new Set([toNode])],
      ])

      // item being clicked on is the parent package
      const item = createMockGridItem(
        'parent',
        'react',
        '18.0.0',
        fromNode,
        toNode,
      )

      // should append the parent package name to a complex query
      const handler = updateDependentsItem({
        query: ':root > *:not(:fs) > #lodash',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: true })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root > *:not(:fs):is(#react)',
      )
    })

    it('should handle complex queries with pseudo-selectors with conflicting edge names', () => {
      const fromNode = createMockNode('parent', 'react', '18.0.0')
      const toNode = createMockNode('target', 'lodash', '4.17.21')
      const edge = {
        name: 'lodash',
        type: 'prod',
        spec: Spec.parse('lodash', '^4.17.21'),
        from: fromNode,
        to: toNode,
      } as QueryResponseEdge

      fromNode.edgesIn = new Set([
        { name: 'react' } as QueryResponseEdge,
        { name: 'react-ish' } as QueryResponseEdge,
      ])
      fromNode.edgesOut = new Map([['lodash', edge]])
      toNode.edgesIn = new Set([edge])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
        ['target', toNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['react', new Set([fromNode])],
        ['lodash', new Set([toNode])],
      ])

      // item being clicked on is the parent package
      const item = createMockGridItem(
        'parent',
        'react',
        '18.0.0',
        fromNode,
        toNode,
      )

      // should append the parent package name to a complex query
      const handler = updateDependentsItem({
        query: ':root > *:not(:fs) > #lodash',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: true })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root > *:not(:fs):is([name=react])',
      )
    })

    it('parent package is not part of the original query', () => {
      const fromNode = createMockNode(
        'parent',
        'parent-package',
        '2.0.0',
      )
      const toNode = createMockNode('child', 'child-package', '1.5.0')
      const edge = {
        name: 'child-package',
        type: 'prod',
        spec: Spec.parse('child-package', '^1.5.0'),
        from: fromNode,
        to: toNode,
      } as QueryResponseEdge
      fromNode.edgesIn = new Set([
        { name: 'parent-package' } as QueryResponseEdge,
      ])
      fromNode.edgesOut = new Map([['child-package', edge]])
      toNode.edgesIn = new Set([edge])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
        ['child', toNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['parent-package', new Set([fromNode])],
        ['child-package', new Set([toNode])],
      ])

      // item being clicked on is the parent package
      const item = createMockGridItem(
        'parent',
        'parent-package',
        '1.5.0',
        fromNode,
        toNode,
      )

      // should result in a query that appends the parent package name
      const handler = updateDependentsItem({
        query: ':root > * > #child-package',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: true })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root > *:is(#parent-package)',
      )
    })
  })

  describe('standard navigation', () => {
    it('anchor on root if it is a direct root dep', () => {
      const rootNode = createMockNode(
        'root',
        'my-project',
        '1.0.0',
        true,
      )
      const fromNode = createMockNode('parent', 'express', '4.18.0')
      const edge = {
        name: 'express',
        type: 'prod',
        spec: Spec.parse('express', '^4.0.0'),
        from: rootNode,
        to: fromNode,
      } as QueryResponseEdge
      fromNode.edgesIn = new Set([edge])
      rootNode.edgesOut = new Map([['express', edge]])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['root', rootNode],
        ['express', fromNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['my-project', new Set([rootNode])],
        ['express', new Set([fromNode])],
      ])

      // item being clicked on is a direct dependency of the root node
      const item = createMockGridItem(
        'parent',
        'express',
        '1.0.0',
        fromNode,
      )

      // should result in a query that anchors on the root node
      const handler = updateDependentsItem({
        query: '*',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: false })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(':root > #express')
    })

    it('anchor on workspace if it is a direct dep of one', () => {
      const wsNode = createMockNode('ws', 'a', '1.0.0', false, true)
      const fromNode = createMockNode('parent', 'express', '4.18.0')
      const edge = {
        name: 'express',
        type: 'prod',
        spec: Spec.parse('express', '^1.0.0'),
        from: wsNode,
        to: fromNode,
      } as QueryResponseEdge
      fromNode.edgesIn = new Set([edge])
      wsNode.edgesOut = new Map([['express', edge]])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['ws', wsNode],
        ['express', fromNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['a', new Set([wsNode])],
        ['express', new Set([fromNode])],
      ])

      // item being clicked on is a direct dependency of a workspace node
      const item = createMockGridItem(
        'parent',
        'express',
        '1.0.0',
        fromNode,
      )

      // should result in a query that anchors on the workspace node
      const handler = updateDependentsItem({
        query: '*',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: false })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#a:workspace > #express',
      )
    })

    it('should create query with package name only if possible', () => {
      // not a direct dependency of the root or workspace, otherwise this
      // should result in a query that anchors to either of the importers
      const fromNode = createMockNode('parent', 'express', '4.18.0')
      const edge = {
        name: 'express',
        type: 'prod',
        spec: Spec.parse('express', '^1.0.0'),
        from: fromNode,
        to: fromNode,
      } as QueryResponseEdge
      // if there's only a single edge using this name, and only
      // a single edge into that node, then it's safe to
      // use only "#express" as a query to anchor on
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['express', new Set([fromNode])],
      ])
      fromNode.edgesIn = new Set([edge])

      // item being clicked on is its parent node
      const item = createMockGridItem(
        'parent',
        'express',
        '1.0.0',
        fromNode,
      )

      // should result in a query that uses the package name only
      const handler = updateDependentsItem({
        query: '*',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: true })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith('#express')
    })

    it('should include version when multiple nodes have the same name', () => {
      const fromNode = createMockNode('parent', 'lodash', '4.17.21')
      const lodash2Node = createMockNode('parent', 'lodash', '3.10.1')
      const toNode = createMockNode('child', 'some-dep', '1.0.0')
      const edge1 = {
        name: 'lodash',
        type: 'prod',
        spec: Spec.parse('lodash', '^4.0.0'),
        from: createMockNode(
          'lodash-1-parent',
          'lodash-parent',
          '4.17.21',
        ),
        to: toNode,
      } as QueryResponseEdge
      const edge2 = {
        name: 'lodash',
        type: 'prod',
        spec: Spec.parse('lodash', '^3.0.0'),
        from: createMockNode(
          'lodash-2-parent',
          'lodash-parent',
          '3.10.1',
        ),
        to: toNode,
      } as QueryResponseEdge

      // there are only a single edge into each one of the nodes
      // but there are two lodash nodes in the graph
      fromNode.edgesIn = new Set([edge1])
      lodash2Node.edgesIn = new Set([edge2])
      fromNode.graph.edges = new Set([edge1, edge2])
      fromNode.graph.nodes = new Map([
        ['lodash-1', fromNode],
        ['lodash-2', lodash2Node],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['lodash', new Set([fromNode, lodash2Node])],
      ])

      // item being clicked on is one of the lodash nodes
      const item = createMockGridItem(
        'parent',
        'lodash',
        '1.0.0',
        fromNode,
      )

      // if there are multiple edges with the same name,
      // then we need to desambiguate by using the version
      const handler = updateDependentsItem({
        query: '',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: false })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#lodash:v(4.17.21)',
      )
    })

    it('should handle packages without from node', () => {
      // Create minimal graph structure even without from node
      const testNode = createMockNode('test', 'test-package', '1.0.0')
      testNode.graph.edges = new Set()
      testNode.graph.nodes = new Map([
        ['test', testNode],
      ]) as unknown as Map<DepID, NodeLike>
      testNode.graph.nodesByName = new Map([
        ['test-package', new Set([testNode])],
      ])

      // item being clicked on is a grid item without a from node
      const item = createMockGridItem('test', 'test-package', '1.0.0')
      item.to = testNode

      // should fallback to the item name only
      const handler = updateDependentsItem({
        query: ':fs',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: false })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(':has(:fs)')
    })
  })

  describe('edge cases', () => {
    it('should handle parent navigation with empty query result', () => {
      const fromNode = createMockNode(
        'parent',
        'parent-package',
        '1.0.0',
      )
      const toNode = createMockNode(
        'target',
        'target-package',
        '1.0.0',
      )
      const edge = {
        name: 'target-package',
        type: 'prod',
        spec: Spec.parse('target-package', '^1.0.0'),
        from: fromNode,
        to: toNode,
      } as QueryResponseEdge

      fromNode.edgesOut = new Map([['target-package', edge]])
      toNode.edgesIn = new Set([edge])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
        ['target', toNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['parent-package', new Set([fromNode])],
        ['target-package', new Set([toNode])],
      ])

      // item being clicked on is the parent package
      const item = createMockGridItem(
        'parent',
        'parent-package',
        '1.0.0',
        fromNode,
        toNode,
      )

      // should default to using the clicked item name
      const handler = updateDependentsItem({
        query: '> #target-package',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: true })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':is([name=parent-package])',
      )
    })

    it('should trim whitespace from query result', () => {
      const fromNode = createMockNode(
        'parent',
        'parent-package',
        '1.0.0',
      )
      const toNode = createMockNode('child', 'child-package', '1.0.0')
      const edge = {
        name: 'child-package',
        type: 'prod',
        spec: Spec.parse('child-package', '^1.0.0'),
        from: fromNode,
        to: toNode,
      } as QueryResponseEdge
      fromNode.edgesOut = new Map([['child-package', edge]])
      toNode.edgesIn = new Set([edge])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
        ['child', toNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['parent-package', new Set([fromNode])],
        ['child-package', new Set([toNode])],
      ])

      // item being clicked on is the parent package
      const item = createMockGridItem(
        'parent',
        'parent-package',
        '1.0.0',
        fromNode,
        toNode,
      )

      // should trim whitespace from the query result
      const handler = updateDependentsItem({
        query: '   :root > #parent-package > #child-package   ',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: true })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        ':root > #parent-package',
      )
    })

    it('should handle complex selector queries', () => {
      const fromNode = createMockNode(
        'parent',
        'webpack-parent',
        '5.0.0',
      )
      const testNode = createMockNode('test', 'webpack', '5.0.0')
      const edge = {
        name: 'webpack',
        type: 'prod',
        spec: Spec.parse('webpack', '^5.0.0'),
        from: fromNode,
        to: testNode,
      } as QueryResponseEdge

      fromNode.edgesIn = new Set([
        { name: 'webpack', from: {} } as QueryResponseEdge,
      ])
      fromNode.edgesOut = new Map([['webpack', edge]])
      testNode.edgesIn = new Set([edge])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
        ['test', testNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['webpack', new Set([fromNode, testNode])],
      ])

      // item being clicked on is the parent package
      const item = createMockGridItem(
        'parent',
        'webpack-parent',
        '5.0.0',
        fromNode,
      )

      // should fallback to the selected item name
      const handler = updateDependentsItem({
        query: ':root > [name^="babel"]:outdated(major)',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: true })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#webpack:v(5.0.0)',
      )
    })

    it('should handle security-related selectors', () => {
      const fromNode = createMockNode(
        'parent',
        'parent-package',
        '1.9.0',
      )
      const testNode = createMockNode('test', 'underscore', '1.9.0')
      const edge = {
        name: 'underscore',
        type: 'prod',
        spec: Spec.parse('underscore', '^1.9.0'),
        from: fromNode,
        to: testNode,
      } as QueryResponseEdge
      fromNode.edgesIn = new Set([
        { name: 'parent-package', from: {} } as QueryResponseEdge,
      ])
      fromNode.edgesOut = new Map([['underscore', edge]])
      testNode.edgesIn = new Set([edge])
      fromNode.graph.edges = new Set([edge])
      fromNode.graph.nodes = new Map([
        ['parent', fromNode],
        ['test', testNode],
      ]) as unknown as Map<DepID, NodeLike>
      fromNode.graph.nodesByName = new Map([
        ['underscore', new Set([fromNode, testNode])],
      ])

      // item being clicked on a descendent
      const item = createMockGridItem(
        'parent',
        'parent-package',
        '1.9.0',
        fromNode,
      )

      // should fallback to the selected item name
      const handler = updateDependentsItem({
        query: ':cve(CVE-2021-23337)',
        updateQuery: mockUpdateQuery,
      })({ item, isParent: false })
      handler(mockEvent)
      expect(mockUpdateQuery).toHaveBeenCalledWith(
        '#parent-package:v(1.9.0)',
      )
    })
  })
})
