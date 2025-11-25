import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SearchResultsInput } from '@/components/search/search-results/input.tsx'

vi.mock('lucide-react', () => ({
  Search: 'gui-search-icon',
  Loader2: 'gui-loader-icon',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('renders search input', () => {
  const { container } = render(<SearchResultsInput />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders search input with value', () => {
  const { container } = render(
    <SearchResultsInput value="react" onChange={vi.fn()} />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders search input with loading state', () => {
  const { container } = render(<SearchResultsInput loading={true} />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders search input with custom placeholder', () => {
  const { container } = render(
    <SearchResultsInput placeholder="Search packages..." />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})
