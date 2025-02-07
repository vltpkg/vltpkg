import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx'

vi.mock('lucide-react', () => ({
  ChevronUp: 'gui-chevron-up-icon',
  ChevronDown: 'gui-chevron-down-icon',
  Check: 'gui-check-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('select render default', async () => {
  const Container = () => (
    <Select defaultValue="prod">
      <SelectTrigger>
        <SelectValue tabIndex={3} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="prod">dependencies</SelectItem>
        <SelectItem value="dev">devDependencies</SelectItem>
        <SelectItem value="optional">optionalDependencies</SelectItem>
        <SelectItem value="peer">peerDependencies</SelectItem>
      </SelectContent>
    </Select>
  )
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('select render open', async () => {
  const Container = () => (
    <Select defaultValue="prod" open={true}>
      <SelectTrigger>
        <SelectValue tabIndex={3} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="prod">dependencies</SelectItem>
        <SelectItem value="dev">devDependencies</SelectItem>
        <SelectItem value="optional">optionalDependencies</SelectItem>
        <SelectItem value="peer">peerDependencies</SelectItem>
      </SelectContent>
    </Select>
  )
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
