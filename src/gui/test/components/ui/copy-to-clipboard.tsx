import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { CopyToClipboard } from '@/components/ui/copy-to-clipboard.jsx'

vi.mock('lucide-react', () => ({
  Copy: 'gui-copy-icon',
  Check: 'gui-check-icon',
}))

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

test('copy-to-clipboard default', () => {
  const Container = () => {
    return <CopyToClipboard value={'copy'}>copy</CopyToClipboard>
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})
