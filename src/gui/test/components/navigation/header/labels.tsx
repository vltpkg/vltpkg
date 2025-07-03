import { vi, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { LabelsHeader } from '@/components/navigation/header/labels.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
}))

vi.mock('@/components/ui/filter-search.tsx', () => ({
  FilterSearch: 'gui-filter-search',
}))

vi.mock('@/components/labels/delete-label.tsx', () => ({
  DeleteLabel: 'gui-delete-label',
}))

vi.mock('@/components/sort-toggle.tsx', () => ({
  SortToggle: 'gui-sort-toggle',
}))

test('LabelsHeader renders correctly', () => {
  const Container = () => {
    return <LabelsHeader />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
