import { expect, vi, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { Labels } from '@/app/labels.tsx'

vi.mock('@/components/labels/label.tsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
}))

vi.mock('@/components/ui/filter-search.tsx', () => ({
  FilterSearch: 'gui-filter-search',
}))

vi.mock('@/components/sort-toggle.tsx', () => ({
  SortToggle: 'gui-sort-toggle',
  sortAlphabeticallyAscending: vi.fn(),
}))

vi.mock('@/components/ui/checkbox.tsx', () => ({
  Checkbox: 'gui-checkbox',
}))

vi.mock('@/components/labels/delete-label.tsx', () => ({
  DeleteLabel: 'gui-delete-label',
}))

vi.mock('@/components/labels/create-label.tsx', () => ({
  CreateLabel: 'gui-create-label',
}))

vi.mock('@/components/labels/labels-empty-state.tsx', () => ({
  LabelsEmptyState: 'gui-labels-empty-state',
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

describe('labels view', () => {
  it('labels render default', () => {
    const Container = () => {
      return <Labels />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
