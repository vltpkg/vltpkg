import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { RootButton } from '@/components/explorer-grid/root-button.tsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  House: 'gui-house-icon',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipContent: 'gui-tooltip-content',
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

describe('root-button', () => {
  it('should render correctly', () => {
    const Container = () => {
      return <RootButton />
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
