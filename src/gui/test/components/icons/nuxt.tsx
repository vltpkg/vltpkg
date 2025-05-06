import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Nuxt } from '@/components/icons/nuxt.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('nuxt icon render default', () => {
  render(<Nuxt />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('nuxt icon render custom class', () => {
  render(<Nuxt className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
