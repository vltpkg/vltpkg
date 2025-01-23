import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { LabelsEmptyState } from '@/components/labels/labels-empty-state.jsx'

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
}))

vi.mock('@/components/labels/create-label.jsx', () => ({
  CreateLabel: 'gui-create-label',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('labels-empty-state', () => {
  it('should render correctly', () => {
    const Container = () => {
      return <LabelsEmptyState />
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
