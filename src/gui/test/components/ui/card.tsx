import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('card render default', async () => {
  const Container = () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>Card Content</CardContent>
      <CardFooter>Card Footer</CardFooter>
    </Card>
  )
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('card render as link', async () => {
  const Container = () => (
    <Card renderAsLink={true}>Card Content</Card>
  )
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
