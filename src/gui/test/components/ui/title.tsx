import t from 'tap'
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Title } from '@/components/ui/title.jsx'

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  cleanup()
})

t.test('title render default', async t => {
  render(<Title />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('title render custom class', async t => {
  render(<Title className="custom-class" />)
  t.matchSnapshot(window.document.body.innerHTML)
})
