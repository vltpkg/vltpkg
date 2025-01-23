import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { CreateLabel } from '@/components/labels/create-label.jsx'

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/labels/label-badge.jsx', () => ({
  LabelBadge: 'gui-label-badge',
}))

vi.mock('@/components/ui/label.jsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/ui/input.jsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/popover.jsx', () => ({
  Popover: 'gui-popover',
  PopoverContent: 'gui-popover-content',
  PopoverTrigger: 'gui-popover-trigger',
}))

vi.mock('@/components/ui/color-picker.jsx', () => ({
  ColorPicker: 'gui-color-picker',
}))

vi.mock('lucide-react', () => ({
  Palette: 'gui-palette-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

describe('create-label', () => {
  const setStateMock = vi.fn()
  vi.spyOn(React, 'useState').mockReturnValue(['', setStateMock])

  it('should render correctly', () => {
    const Container = () => {
      return <CreateLabel closeCreate={setStateMock} />
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
