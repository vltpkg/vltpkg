import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { QueryHighlighter } from '@/components/query-bar/query-highlighter.jsx'
import { Query } from '@vltpkg/query'

vi.mock('@/components/query-bar/query-token.jsx', () => ({
  QueryToken: 'gui-query-token',
}))

vi.mock('@/components/query-bar/context.jsx', () => ({
  QueryBarProvider: 'gui-query-bar-provider',
  useQueryBar: () => ({
    query: ':root > :not(#react, [name="react-sass"])',
    parsedTokens: Query.parse(
      ':root > :not(#react, [name="react-sass"])',
    ),
    setParsedTokens: vi.fn(),
    queryError: undefined,
    setQueryError: vi.fn(),
  }),
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

test('query-highlighter render default', () => {
  const Container = () => {
    return <QueryHighlighter />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
