import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { CreateLabelModal } from '@/components/labels/create-label-dialog.jsx'

vi.mock('@/components/ui/dialog.jsx', () => ({
  DialogDescription: 'gui-dialog-description',
  DialogContent: 'gui-dialog-content',
  DialogFooter: 'gui-dialog-footer',
  DialogHeader: 'gui-dialog-header',
  DialogTitle: 'gui-dialog-title',
  DialogClose: 'gui-dialog-close',
}))

vi.mock('@/components/ui/popover.jsx', () => ({
  Popover: 'gui-popover',
  PopoverTrigger: 'gui-popover-trigger',
  PopoverContent: 'gui-popover-content',
}))

vi.mock('@/components/labels/label-badge.jsx', () => ({
  LabelBadge: 'gui-label-badge',
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/form-label.jsx', () => ({
  Label: 'gui-form-label',
}))

vi.mock('@/components/ui/input.jsx', () => ({
  Input: 'gui-input',
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

describe('create-label-dialog', () => {
  it('should render correctly', () => {
    const Container = () => {
      return <CreateLabelModal />
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
