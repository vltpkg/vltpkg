import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Discord } from '@/components/icons/discord.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('discord icon render default', () => {
  render(<Discord />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('discord icon render custom class', () => {
  render(<Discord className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
