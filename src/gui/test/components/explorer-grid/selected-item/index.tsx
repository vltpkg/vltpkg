import { inspect } from 'node:util'
import {
  test,
  expect,
  vi,
  describe,
  beforeEach,
  afterEach,
} from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import {
  SelectedItem,
  dependencyClick,
  getDependentItems,
} from '@/components/explorer-grid/selected-item/index.tsx'
import { joinDepIDTuple } from '@vltpkg/dep-id/browser'
import { Spec } from '@vltpkg/spec/browser'
import { SELECTED_ITEM } from './__fixtures__/item.ts'

import type { QueryResponseNode } from '@vltpkg/query'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

vi.mock('@/components/explorer-grid/selected-item/item.tsx', () => ({
  Item: 'gui-selected-item',
}))

vi.mock('@/components/explorer-grid/header.tsx', () => ({
  GridHeader: 'gui-grid-header',
}))

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/index.tsx',
  () => ({
    DependencySideBar: 'gui-dependency-sidebar',
  }),
)

vi.mock('@/components/ui/jelly-spinner.tsx', () => ({
  JellyTriangleSpinner: 'gui-jelly-triangle-spinner',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/partial-errors-indicator.tsx',
  () => ({
    PartialErrorsIndicator: 'gui-partial-errors-indicator',
  }),
)

vi.mock(
  '@/components/explorer-grid/overview-sidebar/index.tsx',
  () => ({
    OverviewSidebar: 'gui-overview-sidebar',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/focused-view/index.tsx',
  () => ({
    FocusedView: 'gui-focused-view',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/focused-button.tsx',
  () => ({
    FocusButton: 'gui-focused-button',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx',
  () => ({
    useFocusState: () => ({
      focused: false,
      setFocused: vi.fn(),
    }),
  }),
)

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/context.tsx',
  () => ({
    DependencySidebarProvider: 'gui-dependency-sidebar-provider',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/item-header.tsx',
  () => ({
    ItemBreadcrumbs: 'gui-item-breadcrumbs',
  }),
)

vi.mock('@/components/ui/cross.tsx', () => ({
  Cross: 'gui-cross',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('SelectedItem renders default', () => {
  const Container = () => {
    return <SelectedItem item={SELECTED_ITEM} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('getDependentItems', () => {
  const mockNode = {
    id: joinDepIDTuple(['registry', '', 'item@1.0.0']),
    edgesIn: new Set([
      {
        name: 'dependent',
        type: 'prod',
        spec: Spec.parse('dependent', '^1.0.0'),
        from: {
          id: joinDepIDTuple(['registry', '', 'dependent@1.0.0']),
          name: 'dependent',
          version: '1.0.0',
          edgesIn: new Set(),
        } as unknown as QueryResponseNode,
      },
      {
        name: 'foo',
        type: 'dev',
        spec: Spec.parse('foo', '^1.0.0'),
        from: {
          id: joinDepIDTuple(['registry', '', 'foo@1.0.0']),
          name: 'foo',
          version: '1.0.0',
          edgesIn: new Set([
            {
              name: 'foo',
              type: 'dev',
              spec: Spec.parse('foo', '^1.0.0'),
              from: {
                id: joinDepIDTuple(['file', '.']),
                name: 'root',
                version: '1.0.0',
                edgesIn: new Set(),
              } as unknown as QueryResponseNode,
            },
            {
              name: 'foo',
              type: 'dev',
              spec: Spec.parse('foo', '^1.0.0'),
              from: {
                id: joinDepIDTuple(['workspace', 'a']),
                name: 'a',
                version: '1.0.0',
                edgesIn: new Set(),
              } as unknown as QueryResponseNode,
            },
          ]),
        } as unknown as QueryResponseNode,
      },
      {
        name: 'bar',
        type: 'prod',
        spec: Spec.parse('bar', '^1.0.0'),
        from: {
          id: joinDepIDTuple(['registry', '', 'bar@1.0.0']),
          name: 'bar',
          version: '1.0.0',
          edgesIn: new Set(),
        } as unknown as QueryResponseNode,
      },
      {
        name: 'bar',
        type: 'prod',
        spec: Spec.parse('bar', '^1.0.0'),
        from: {
          id: joinDepIDTuple([
            'registry',
            '',
            'bar@1.0.0',
            '#modifier',
          ]),
          name: 'bar',
          version: '2.0.0',
          edgesIn: new Set(),
        } as unknown as QueryResponseNode,
      },
    ]),
    edgesOut: new Set(),
  } as unknown as QueryResponseNode

  const dependents = getDependentItems(mockNode)

  expect(inspect(dependents, { depth: 10 })).toMatchSnapshot()
})

describe('dependencyClick', () => {
  test('item is d, navigates: #a > #b > #c > #d', () => {
    let query = '#a > #b > #c'
    const updateQuery = vi.fn((newQuery: string) => {
      query = newQuery
    })
    const item = {
      to: {},
      name: 'd',
    } as unknown as GridItemData

    const onClick = dependencyClick({ item, query, updateQuery })
    onClick()

    expect(query).toBe('#a > #b > #c > #d')
  })

  test('item #socks appends after #socks-proxy-agent, not truncate', () => {
    let query = ':root > #socks-proxy-agent'

    const updateQuery = vi.fn((newQuery: string) => {
      query = newQuery
    })

    const item = {
      to: {},
      name: 'socks',
    } as unknown as GridItemData

    const onClick = dependencyClick({ item, query, updateQuery })
    onClick()

    expect(query).toBe(':root > #socks-proxy-agent > #socks')
  })

  test('clicking an existing middle segment goes back to that segment', () => {
    let query = '#a > #b > #c > #d'

    const updateQuery = vi.fn((newQuery: string) => {
      query = newQuery
    })

    const item = {
      to: {},
      name: 'b', // "#b" already in the path
    } as unknown as GridItemData

    const onClick = dependencyClick({ item, query, updateQuery })
    onClick()

    expect(query).toBe('#a > #b')
  })

  test('clicking the last segment keeps query the same (no duplicate)', () => {
    let query = '#a > #b > #c'

    const updateQuery = vi.fn((newQuery: string) => {
      query = newQuery
    })

    const item = {
      to: {},
      name: 'c', // last segment
    } as unknown as GridItemData

    const onClick = dependencyClick({ item, query, updateQuery })
    onClick()

    expect(query).toBe('#a > #b > #c')
  })

  test('empty query starts with the clicked item', () => {
    let query = ''

    const updateQuery = vi.fn((newQuery: string) => {
      query = newQuery
    })

    const item = {
      to: {},
      name: 'root',
    } as unknown as GridItemData

    const onClick = dependencyClick({ item, query, updateQuery })
    onClick()

    expect(query).toBe('#root')
  })

  test('handles repeated segments by jumping back to the last occurrence', () => {
    let query = '#a > #b > #c > #b > #d'

    const updateQuery = vi.fn((newQuery: string) => {
      query = newQuery
    })

    const item = {
      to: {},
      name: 'b', // matches last "#b"
    } as unknown as GridItemData

    const onClick = dependencyClick({ item, query, updateQuery })
    onClick()

    // drops the trailing "#d"
    expect(query).toBe('#a > #b > #c > #b')
  })
})
