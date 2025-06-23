import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Smile } from 'lucide-react'
import { EmptyState } from '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx'

vi.mock('lucide-react', () => ({
  Smile: 'gui-smile-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('EmptyState renders with basic options', () => {
  const Container = () => {
    return <EmptyState icon={Smile} message="empty state test" />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
