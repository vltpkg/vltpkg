import { vi, test, assert, expect, afterEach } from 'vitest'
import {
  cleanup,
  render,
  fireEvent,
  screen,
} from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { QueryBar } from '@/components/query-bar/index.jsx'

vi.mock('@/components/query-bar/query-highlighter.jsx', () => ({
  QueryHighlighter: 'gui-query-highlighter',
}))

vi.mock('lucide-react', () => ({
  Search: 'gui-search',
  Command: 'gui-command',
}))

vi.mock('@/components/ui/kbd.jsx', () => ({
  Kbd: 'gui-kbd',
}))

vi.mock('@/components/explorer-grid/query-matches.jsx', () => ({
  QueryMatches: 'gui-query-matches',
}))

vi.mock('@/components/explorer-grid/save-query.jsx', () => ({
  default: 'gui-save-query',
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

test('query-bar render default', async () => {
  render(<QueryBar />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('query-bar render with custom query', async () => {
  const Container = () => {
    const updateQuery = useStore(state => state.updateQuery)
    updateQuery('[name="my-package"][version="1.0.0"]')
    return <QueryBar />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('query-bar updates query store value', async () => {
  render(<QueryBar />)

  const value = '[name="my-package"][version="2.0.0"]'
  fireEvent.change(screen.getByRole('search'), {
    target: { value },
  })

  let query = ''
  const RetrieveQuery = () => (
    (query = useStore(state => state.query)), ''
  )
  render(<RetrieveQuery />)

  assert.equal(query, '[name="my-package"][version="2.0.0"]')
})
