import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import {
  GlyphIcon,
  ICONS,
  isGlyphIcon,
} from '@/components/icons/glyph-icon.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('renders glyph icon with default props', () => {
  render(<GlyphIcon icon="node" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('renders glyph icon with custom size', () => {
  render(<GlyphIcon icon="node" size="lg" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('renders glyph icon with custom color', () => {
  render(<GlyphIcon icon="node" color="blue" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('renders glyph icon with custom className', () => {
  render(<GlyphIcon icon="node" className="custom-class" />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('renders different icon types', () => {
  Object.keys(ICONS).forEach(icon => {
    render(<GlyphIcon icon={icon as keyof typeof ICONS} />)
    expect(window.document.body.innerHTML).toMatchSnapshot()
  })
})

test('isGlyphIcon type guard works correctly', () => {
  expect(isGlyphIcon('node')).toBe(true)
  expect(isGlyphIcon('npm')).toBe(true)
  expect(isGlyphIcon('invalid-icon')).toBe(false)
})
