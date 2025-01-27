import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { DependencySideBar } from '@/components/explorer-grid/dependency-side-bar.jsx'
import { type GridItemData } from '@/components/explorer-grid/types.js'

vi.mock('lucide-react', () => ({
  GitFork: 'gui-git-fork-icon',
  Plus: 'gui-plus-icon',
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/explore-grid/header.jsx', () => ({
  Header: 'gui-header',
}))

vi.mock('@/components/explorer-grid/side-item.jsx', () => ({
  SideItem: 'gui-side-item',
}))

vi.mock('@/components/explorer-grid/types.js', () => ({
  GridItemData: 'gui-grid-item-data',
}))

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
}))

vi.mock('@/components/ui/popover.jsx', () => ({
  Popover: 'gui-popover',
  PopoverContent: 'gui-popover-content',
  PopoverTrigger: 'gui-popover-trigger',
}))

vi.mock('@/components/explorer-grid/manage-dependencies.jsx', () => ({
  ManageDependencies: 'gui-manage-dependencies',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

const getGridItemData = (
  name: string,
  id: string,
  depIndex: number,
) =>
  ({
    name,
    id,
    depIndex,
    toString: () => `GridItemData { ${name} }`,
  }) as GridItemData

test('dependency-side-bar', async () => {
  const dependencies = [
    getGridItemData('simple-output', '1', 0),
    getGridItemData('abbrev', '2', 1),
    getGridItemData('@vltpkg/semver', '3', 2),
  ]
  render(
    <DependencySideBar
      dependencies={dependencies}
      uninstalledDependencies={[]}
      onDependencyClick={() => () => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('dependency-side-bar no items', async () => {
  const dependencies: GridItemData[] = []
  render(
    <DependencySideBar
      dependencies={dependencies}
      uninstalledDependencies={[]}
      onDependencyClick={() => () => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('dependency-side-bar has uninstalled deps only', async () => {
  const dependencies = [
    getGridItemData('simple-output', '1', 0),
    getGridItemData('abbrev', '2', 1),
    getGridItemData('@vltpkg/semver', '3', 2),
  ]
  render(
    <DependencySideBar
      dependencies={[]}
      uninstalledDependencies={dependencies}
      onDependencyClick={() => () => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('dependency-side-bar has both installed and uninstalled deps', async () => {
  const dependencies = [
    getGridItemData('simple-output', '1', 0),
    getGridItemData('abbrev', '2', 1),
    getGridItemData('@vltpkg/semver', '3', 2),
  ]
  const uninstalledDependencies = [
    getGridItemData('@ruyadorno/redact', '4', 3),
    getGridItemData('ntl', '1', 4),
  ]
  render(
    <DependencySideBar
      dependencies={dependencies}
      uninstalledDependencies={uninstalledDependencies}
      onDependencyClick={() => () => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
