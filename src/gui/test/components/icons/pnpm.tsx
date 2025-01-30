import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Pnpm } from '@/components/icons/index.js'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('pnpm icon render default', () => {
  render(<Pnpm />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('pnpm icon render custom class', () => {
  render(<Pnpm className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
