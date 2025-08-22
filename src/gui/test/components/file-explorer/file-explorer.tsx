import { vi, test, expect, afterEach, describe } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { FileExplorerDialog } from '@/components/file-explorer/file-explorer.tsx'

import type { FileExplorerItem } from '@/components/file-explorer/file-explorer.tsx'

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/dropdown-menu.tsx', () => ({
  DropdownMenu: (props: any) => (
    <div data-testid="dropdown-menu" {...props} />
  ),
  DropdownMenuContent: ({ onCloseAutoFocus, ...props }: any) => (
    <div data-testid="dropdown-menu-content" {...props} />
  ),
  DropdownMenuItem: ({ onSelect, ...props }: any) => (
    <div role="menuitem" onClick={onSelect} {...props} />
  ),
  DropdownMenuTrigger: ({ asChild, ...props }: any) => (
    <button data-testid="dropdown-menu-trigger" {...props} />
  ),
  DropdownMenuLabel: (props: any) => <div {...props} />,
  DropdownMenuGroup: (props: any) => <div {...props} />,
}))

vi.mock('@/components/ui/scroll-area.tsx', () => ({
  ScrollArea: 'gui-scroll-area',
  ScrollBar: 'gui-scroll-bar',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/icons/index.ts', () => ({
  Sidebar: 'gui-icon-sidebar',
  ViewOptions: 'gui-icon-view-options',
}))

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-icon-chevron-right',
  Folder: 'gui-icon-folder',
  FolderOpen: 'gui-icon-folder-open',
  FolderSearch: 'gui-icon-folder-search',
  File: 'gui-icon-file',
  Frown: 'gui-icon-frown',
  LayoutGrid: 'gui-icon-layout-grid',
  List: 'gui-icon-list',
  Search: 'gui-icon-search',
  Check: 'gui-icon-check',
  ChevronDown: 'gui-icon-chevron-down',
  ChevronUp: 'gui-icon-chevron-up',
}))

vi.mock('@/components/ui/table.tsx', () => ({
  Table: 'gui-table',
  TableBody: 'gui-table-body',
  TableCell: 'gui-table-cell',
  TableHead: 'gui-table-head',
  TableHeader: 'gui-table-header',
  TableRow: 'gui-table-row',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipPortal: 'gui-tooltip-portal',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipProvider: 'gui-tooltip-provider',
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

const makeItems = (): FileExplorerItem[] => [
  {
    name: 'src',
    path: '/repo/src',
    type: 'directory',
    size: 0,
    mtime: new Date().toISOString(),
  },
  {
    name: 'README.md',
    path: '/repo/README.md',
    type: 'file',
    size: 1024,
    mtime: new Date().toISOString(),
  },
]

describe('FileExplorerDialog', () => {
  test('renders open snapshot', () => {
    const { container } = render(
      <FileExplorerDialog
        isOpen={true}
        items={makeItems()}
        rootDirs={[]}
        currentPath={'/repo'}
      />,
    )
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('outside click closes via setIsOpen', async () => {
    const setIsOpen = vi.fn()
    const { baseElement } = render(
      <FileExplorerDialog
        isOpen={true}
        setIsOpen={setIsOpen}
        items={makeItems()}
        rootDirs={[]}
        currentPath={'/repo'}
      />,
    )
    const overlay = baseElement.querySelector('.fixed.inset-0')!
    fireEvent.click(overlay)
    expect(setIsOpen).toHaveBeenCalled()
  })

  test('double-clicking a directory row loads children (list view)', async () => {
    const loadChildren = vi.fn().mockResolvedValue([])
    const { container, baseElement } = render(
      <FileExplorerDialog
        isOpen={true}
        items={makeItems()}
        rootDirs={[]}
        currentPath={'/repo'}
        initialView={'list'}
        loadChildren={loadChildren}
      />,
    )
    // switch to list view via the view changer dropdown
    const triggers = Array.from(
      container.querySelectorAll(
        '[data-testid="dropdown-menu-trigger"]',
      ),
    )
    for (const t of triggers) fireEvent.click(t)
    const listItem = Array.from(
      container.querySelectorAll('[role="menuitem"]'),
    ).find(el => /\blist\b/i.test(el.textContent || '')) as
      | HTMLElement
      | undefined
    if (listItem) fireEvent.click(listItem)
    // wait for list view to render
    // double-click the first body row using data-test-id selectors
    const row = baseElement.querySelector(
      '[data-test-id="file-explorer-row"]',
    )!
    expect(row).toBeTruthy()
    fireEvent.doubleClick(row)
    expect(loadChildren).toHaveBeenCalled()
  })
})
