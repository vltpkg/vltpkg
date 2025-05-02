import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { GitHubOutline } from '@/components/icons/github-outline.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('github outline icon render default', () => {
  render(<GitHubOutline />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('github outline icon render custom class', () => {
  render(<GitHubOutline className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
