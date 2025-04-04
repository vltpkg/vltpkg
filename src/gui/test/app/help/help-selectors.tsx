import { vi, expect, afterEach, describe, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { HelpSelectors } from '@/app/help/help-selectors.jsx'

vi.mock('@tanstack/react-table', () => ({
  Table: 'gui-table',
}))

vi.mock('@/components/data-table/data-table.jsx', () => ({
  DataTable: 'gui-data-table',
}))

vi.mock('@/components/data-table/table-view-dropdown.jsx', () => ({
  TableViewDropdown: 'gui-table-view-dropdown',
}))

vi.mock('@/components/ui/input.jsx', () => ({
  Input: 'gui-input',
}))

vi.mock('react-markdown', () => ({
  default: 'gui-react-markdown',
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

describe('help selectors view', () => {
  it('help selectors render default', () => {
    const Container = () => {
      return <HelpSelectors />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
