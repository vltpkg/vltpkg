import { test, assert, expect, afterEach } from 'vitest'
import {
  cleanup,
  render,
  fireEvent,
  screen,
} from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { SearchBar } from '@/components/search-bar.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('search-bar render default', async () => {
  render(<SearchBar />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('search-bar render with custom query', async () => {
  const Container = () => {
    const updateQuery = useStore(state => state.updateQuery)
    updateQuery('[name="my-package"][version="1.0.0"]')
    return <SearchBar />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('search-bar updates query store value', async () => {
  render(<SearchBar />)

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
