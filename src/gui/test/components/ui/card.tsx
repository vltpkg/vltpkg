import t from 'tap'
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card.jsx'

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  cleanup()
})

t.test('card render default', async t => {
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
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('card render as link', async t => {
  const Container = () => (
    <Card renderAsLink={true}>Card Content</Card>
  )
  render(<Container />)
  t.matchSnapshot(window.document.body.innerHTML)
})
