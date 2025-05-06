import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { InlineCode } from '@/components/ui/inline-code.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('inline-code default', () => {
  const Container = () => {
    return <InlineCode>node_modules</InlineCode>
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})
