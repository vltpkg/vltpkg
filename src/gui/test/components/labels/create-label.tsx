import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { CreateLabel } from '@/components/labels/create-label.tsx'

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/labels/label-badge.tsx', () => ({
  LabelBadge: 'gui-label-badge',
}))

vi.mock('@/components/ui/label.tsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/popover.tsx', () => ({
  Popover: 'gui-popover',
  PopoverContent: 'gui-popover-content',
  PopoverTrigger: 'gui-popover-trigger',
}))

vi.mock('@/components/ui/color-picker.tsx', () => ({
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
