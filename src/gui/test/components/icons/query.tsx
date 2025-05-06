import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Query } from '@/components/icons/query.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('query icon render default', () => {
  render(<Query />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('query icon render custom class', () => {
  render(<Query className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
