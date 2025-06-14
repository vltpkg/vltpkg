import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'

import type { GridItemData } from '@/components/explorer-grid/types.ts'

vi.mock('@/components/explorer-grid/header.tsx', () => ({
  GridHeader: 'gui-grid-header',
}))

vi.mock(
  '@/components/explorer-grid/overview-sidebar/suggested-queries.tsx',
  () => ({
    SuggestedQueries: 'gui-suggested-queries',
  }),
)

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
  vi.doUnmock('@/components/explorer-grid/side-item.tsx')
})

test('OverviewSidebar renders with a parent', async () => {
  vi.doMock('@/components/explorer-grid/side-item.tsx', () => ({
    SideItem: 'gui-side-item',
  }))
  const { OverviewSidebar } = await import(
    '@/components/explorer-grid/overview-sidebar/index.tsx'
  )

  const mockOnWorkspaceClick = vi.fn()
  const mockOnDependentClick = vi.fn()

  const mockParentItem = {
    id: '1',
    name: 'Mock Parent',
    spec: '^1.0.0',
    version: '1.0.0',
  } as unknown as GridItemData

  const Container = () => (
    <OverviewSidebar
      dependencies={[]}
      parentItem={mockParentItem}
      workspaces={[]}
      dependents={[]}
      onWorkspaceClick={mockOnWorkspaceClick}
      onDependentClick={mockOnDependentClick}
    />
  )

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('OverviewSidebar renders with a parent and workspaces', async () => {
  vi.doMock('@/components/explorer-grid/side-item.tsx', () => ({
    SideItem: 'gui-side-item',
  }))
  const { OverviewSidebar } = await import(
    '@/components/explorer-grid/overview-sidebar/index.tsx'
  )

  const mockOnWorkspaceClick = vi.fn()
  const mockOnDependentClick = vi.fn()

  const mockWorkspace = {
    id: '2',
    name: 'Mock Workspace',
    version: '1.0.0',
  } as unknown as GridItemData

  const mockParentItem = {
    id: '1',
    name: 'Mock Parent',
    spec: '^1.0.0',
    version: '1.0.0',
  } as unknown as GridItemData

  const Container = () => (
    <OverviewSidebar
      dependencies={[]}
      parentItem={mockParentItem}
      workspaces={[mockWorkspace, mockWorkspace]}
      dependents={[]}
      onWorkspaceClick={mockOnWorkspaceClick}
      onDependentClick={mockOnDependentClick}
    />
  )

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('OverviewSidebar renders with a parent, workspaces, and dependents', async () => {
  vi.doMock('@/components/explorer-grid/side-item.tsx', () => ({
    SideItem: 'gui-side-item',
  }))
  const { OverviewSidebar } = await import(
    '@/components/explorer-grid/overview-sidebar/index.tsx'
  )

  const mockOnWorkspaceClick = vi.fn()
  const mockOnDependentClick = vi.fn()

  const mockDependent = {
    id: '1',
    name: 'Mock Dependent',
    spec: '^1.0.0',
    version: '1.0.0',
  } as unknown as GridItemData

  const mockWorkspace = {
    id: '2',
    name: 'Mock Workspace',
    version: '1.0.0',
  } as unknown as GridItemData

  const mockParentItem = {
    id: '3',
    name: 'Mock Parent',
    spec: '^1.0.0',
    version: '1.0.0',
  } as unknown as GridItemData

  const Container = () => (
    <OverviewSidebar
      dependencies={[]}
      parentItem={mockParentItem}
      workspaces={[mockWorkspace, mockWorkspace]}
      dependents={[mockDependent, mockDependent]}
      onWorkspaceClick={mockOnWorkspaceClick}
      onDependentClick={mockOnDependentClick}
    />
  )

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('OverviewSidebar clicks on workspace items change the query correctly', async () => {
  const { OverviewSidebar } = await import(
    '@/components/explorer-grid/overview-sidebar/index.tsx'
  )
  const mockOnWorkspaceClick = vi.fn()
  const mockOnDependentClick = vi.fn()

  const mockWorkspace = {
    id: '1',
    labels: ['workspace'],
    name: 'workspace-item',
    title: 'workspace-item',
    version: '1.0.0',
    stacked: false,
    size: 1,
  } satisfies GridItemData

  const Container = () => (
    <OverviewSidebar
      dependencies={[]}
      onWorkspaceClick={mockOnWorkspaceClick}
      onDependentClick={mockOnDependentClick}
      parentItem={undefined}
      dependents={[]}
      workspaces={[mockWorkspace]}
    />
  )

  const { container, getByText } = render(<Container />)

  const item = getByText('workspace-item')
  fireEvent.click(item)

  expect(container.innerHTML).toMatchSnapshot()
  expect(mockOnWorkspaceClick).toHaveBeenCalledWith(mockWorkspace)
})

test('OverviewSidebar contains SuggestedQueries when dependencies are present', async () => {
  const { OverviewSidebar } = await import(
    '@/components/explorer-grid/overview-sidebar/index.tsx'
  )
  const mockOnWorkspaceClick = vi.fn()
  const mockOnDependentClick = vi.fn()

  const mockDependency = {
    id: '1',
    labels: ['workspace'],
    name: 'workspace-item',
    title: 'workspace-item',
    version: '1.0.0',
    stacked: false,
    size: 1,
  } satisfies GridItemData

  const Container = () => (
    <OverviewSidebar
      dependencies={[mockDependency]}
      onWorkspaceClick={mockOnWorkspaceClick}
      onDependentClick={mockOnDependentClick}
      parentItem={undefined}
      dependents={[]}
      workspaces={[]}
    />
  )

  const { container } = render(<Container />)
  const suggestedQueries = container.querySelector(
    'gui-suggested-queries',
  )
  expect(container.innerHTML).toMatchSnapshot()
  expect(suggestedQueries).toBeDefined()
})
