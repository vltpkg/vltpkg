import t from 'tap'
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Badge } from '@/components/ui/badge.jsx'

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  cleanup()
})

t.test('badge render default', async t => {
  render(<Badge />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('badge render secondary', async t => {
  render(<Badge variant="secondary" />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('badge render destructive', async t => {
  render(<Badge variant="destructive" />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('badge render outline', async t => {
  render(<Badge variant="outline" />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('badge render custom class', async t => {
  render(<Badge className="custom-class" />)
  t.matchSnapshot(window.document.body.innerHTML)
})
