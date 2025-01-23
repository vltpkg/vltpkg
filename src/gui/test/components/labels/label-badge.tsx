import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { LabelBadge } from '@/components/labels/label-badge.jsx'
import { type QueryLabel } from '@/state/types.js'

vi.mock('@/components/ui/badge.jsx', () => ({
  Badge: 'gui-badge',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('label-badge', () => {
  it('should render correctly', () => {
    const mockLabel: QueryLabel = {
      id: '8c79bb69-164b-420a-813a-c2e5d3b196e6',
      color: '#06b6d4',
      name: 'mock-label-1',
      description: 'mock label 1',
    }

    const Container = () => {
      return (
        <LabelBadge name={mockLabel.name} color={mockLabel.color} />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
