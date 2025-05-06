import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('popover render default', async () => {
  const Container = () => (
    <Popover>
      <PopoverTrigger>Trigger Element</PopoverTrigger>
      <PopoverContent>Content</PopoverContent>
    </Popover>
  )
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('popover render open', async () => {
  const Container = () => (
    <Popover open={true}>
      <PopoverTrigger>Trigger Element</PopoverTrigger>
      <PopoverContent>Content</PopoverContent>
    </Popover>
  )
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
