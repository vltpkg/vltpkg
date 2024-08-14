import t from 'tap'
import React from 'react'
import {
  cleanup,
  render,
  fireEvent,
  screen,
} from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { SearchBar } from '@/components/search-bar.jsx'

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

t.test('search-bar render default', async t => {
  render(<SearchBar />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('search-bar render with custom query', async t => {
  const Container = () => {
    const updateQuery = useStore(state => state.updateQuery)
    updateQuery('[name="my-package"][version="1.0.0"]')
    return <SearchBar />
  }
  render(<Container />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('search-bar updates query store value', async t => {
  render(<SearchBar />)

  const value = '[name="my-package"][version="2.0.0"]'
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value },
  })

  let query = ''
  const RetrieveQuery = () => (
    (query = useStore(state => state.query)), ''
  )
  render(<RetrieveQuery />)

  t.strictSame(query, '[name="my-package"][version="2.0.0"]')
})
