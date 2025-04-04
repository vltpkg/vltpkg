import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { QueryHighlighter } from '@/components/query-bar/query-highlighter.jsx'
import type { ParsedSelectorToken } from '@vltpkg/query'

vi.mock('@/components/query-bar/query-token.jsx', () => ({
  QueryToken: 'gui-query-token',
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
  const mockParsedTokens: ParsedSelectorToken[] = [
    {
      type: 'pseudo',
      token: ':root',
    },
    {
      type: 'combinator',
      token: ' > ',
    },
    {
      type: 'attribute',
      token: '[name="my-package"]',
      key: 'name',
      value: 'my-package',
    },
  ]

  const Container = () => {
    return (
      <QueryHighlighter
        query=":root > [name='my-package'] "
        parsedTokens={mockParsedTokens}
      />
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
