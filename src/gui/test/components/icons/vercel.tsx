import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Vercel } from '@/components/icons/vercel.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('vercel icon render default', () => {
  render(<Vercel />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('vercel icon render custom class', () => {
  render(<Vercel className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
