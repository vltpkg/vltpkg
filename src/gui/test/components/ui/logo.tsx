import t from 'tap'
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Logo } from '@/components/ui/logo.jsx'

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  cleanup()
})

t.test('logo render default', async t => {
  render(<Logo />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('logo render custom class', async t => {
  render(<Logo className="custom-class" />)
  t.matchSnapshot(window.document.body.innerHTML)
})
