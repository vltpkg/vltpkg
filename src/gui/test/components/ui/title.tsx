import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Title } from '@/components/ui/title.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('title render default', async () => {
  render(<Title />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('title render custom class', async () => {
  render(<Title className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
