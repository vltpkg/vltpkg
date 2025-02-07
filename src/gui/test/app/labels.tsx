import { expect, vi, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { Labels } from '@/app/labels.jsx'

vi.mock('@/components/labels/label.jsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
}))

vi.mock('@/components/ui/filter-search.jsx', () => ({
  FilterSearch: 'gui-filter-search',
}))

vi.mock('@/components/sort-toggle.jsx', () => ({
  SortToggle: 'gui-sort-toggle',
  sortAlphabeticallyAscending: vi.fn(),
}))

vi.mock('@/components/ui/checkbox.jsx', () => ({
  Checkbox: 'gui-checkbox',
}))

vi.mock('@/components/labels/delete-label.jsx', () => ({
  DeleteLabel: 'gui-delete-label',
}))

vi.mock('@/components/labels/create-label.jsx', () => ({
  CreateLabel: 'gui-create-label',
}))

vi.mock('@/components/labels/labels-empty-state.jsx', () => ({
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
