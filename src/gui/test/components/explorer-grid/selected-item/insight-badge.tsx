import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { InsightBadge } from '@/components/explorer-grid/selected-item/insight-badge.tsx'

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipContent: 'gui-tooltip-content',
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

test('InsightBadge renders default', () => {
  const Container = () => {
    return (
      <InsightBadge variant="default" color="red">
        :mock-selector
      </InsightBadge>
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightBadge renders as a marker', () => {
  const Container = () => {
    return <InsightBadge variant="marker" color="red" />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
