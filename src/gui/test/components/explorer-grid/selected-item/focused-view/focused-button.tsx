import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { FocusButton } from '@/components/explorer-grid/selected-item/focused-view/focused-button.tsx'

vi.mock('lucide-react', () => ({
  Fullscreen: 'gui-fullscreen-icon',
  Minimize: 'gui-minimize-icon',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
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

test('FocusButton renders default', () => {
  const mockFocused = false
  const mockSetFocused = vi.fn()

  const Container = () => {
    return (
      <FocusButton
        focused={mockFocused}
        setFocused={mockSetFocused}
      />
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
