import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Next } from '@/components/icons/next.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('next icon render default', () => {
  render(<Next />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('next icon render custom class', () => {
  render(<Next className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
