import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Github } from '@/components/icons/github.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('github icon render default', () => {
  render(<Github />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('github icon render custom class', () => {
  render(<Github className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
