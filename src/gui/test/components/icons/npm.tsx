import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Npm } from '@/components/icons/index.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('npm icon render default', () => {
  render(<Npm />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('npm icon render custom class', () => {
  render(<Npm className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
