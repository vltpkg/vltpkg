import t from 'tap'
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Input } from '@/components/ui/input.jsx'

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  cleanup()
})

t.test('input render default', async t => {
  render(<Input />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('input render with type', async t => {
  render(<Input type="search" />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('input render with custom classname', async t => {
  render(<Input className="custom-class" />)
  t.matchSnapshot(window.document.body.innerHTML)
})
