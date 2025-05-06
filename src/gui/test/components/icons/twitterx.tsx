import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { TwitterX } from '@/components/icons/twitterx.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('twitter icon render default', () => {
  render(<TwitterX />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('twitter icon render custom class', () => {
  render(<TwitterX className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
