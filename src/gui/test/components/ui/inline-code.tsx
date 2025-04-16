import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { InlineCode } from '@/components/ui/inline-code.jsx'

vi.mock('@/components/ui/tooltip.jsx', () => ({
  TooltipProvider: 'gui-tooltip-provider',
  Tooltip: 'gui-tooltip',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipContent: 'gui-tooltip-content',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('inline-code default', () => {
  const Container = () => {
    return <InlineCode>node_modules</InlineCode>
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('inline-code renders with tooltip', () => {
  const Container = () => {
    return (
      <InlineCode tooltip="Tooltip text" tooltipDuration={1000}>
        node_modules
      </InlineCode>
    )
  }
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})
