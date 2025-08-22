import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, act } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore } from '@/state/index.ts'
import { QueryBuilder } from '@/components/query-builder/index.tsx'
import { QUERY_BAR_ID } from '@/components/query-bar/index.tsx'

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipPortal: 'gui-tooltip-portal',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
}))

vi.mock('lucide-react', () => ({
  UnfoldVertical: 'gui-unfold-vertical',
}))

vi.mock('@/components/query-builder/builder.tsx', () => ({
  BuilderCombobox: () => 'gui-builder-combobox',
}))

vi.mock('@/components/query-builder/item.tsx', () => ({
  Item: () => 'gui-item',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useGraphStore(state => state.reset)(), '')
  render(<CleanUp />)
  const mount = document.getElementById(QUERY_BAR_ID)
  if (mount) mount.remove()
  cleanup()
})

describe('QueryBuilder', () => {
  const ensureMount = () => {
    let mount = document.getElementById(QUERY_BAR_ID)
    if (!mount) {
      mount = document.createElement('div')
      mount.id = QUERY_BAR_ID
      document.body.appendChild(mount)
    }
    return mount
  }

  it('renders toggle button (closed state)', () => {
    ensureMount()
    const { container } = render(<QueryBuilder />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('opens UI when store flag is set', async () => {
    ensureMount()
    const { container } = render(<QueryBuilder />)
    // open the UI
    await act(async () => {
      useGraphStore.getState().updateQueryBuilderOpen(true)
      useGraphStore.getState().updateQueryBuilderDisplay(true)
    })
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders nodes for a simple query', async () => {
    ensureMount()
    const { container } = render(<QueryBuilder />)
    await act(async () => {
      useGraphStore.getState().updateQuery(':dev a,b')
      useGraphStore.getState().updateQueryBuilderOpen(true)
      useGraphStore.getState().updateQueryBuilderDisplay(true)
    })
    // allow parse debounce to run
    await act(async () => {
      await new Promise(r => setTimeout(r, 80))
    })
    expect(container.innerHTML).toMatchSnapshot()
  })
})
