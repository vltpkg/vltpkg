import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { CreateQuery } from '@/components/queries/create-query.jsx'

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/input.jsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/labels/label-select.jsx', () => ({
  LabelSelect: 'gui-label-select',
}))

vi.mock('@/components/labels/label-badge.jsx', () => ({
  LabelBadge: 'gui-label-badge',
}))

vi.mock('@/components/ui/label.jsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/ui/popover.jsx', () => ({
  Popover: 'gui-popover',
  PopoverContent: 'gui-popover-content',
  PopoverTrigger: 'gui-popover-trigger',
}))

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
}))

vi.mock('lucide-react', () => ({
  ChevronsUpDown: 'gui-chevron-icon',
  CircleHelp: 'gui-circle-help-icon',
}))

vi.mock('@/components/directory-select.jsx', () => ({
  DirectorySelect: 'gui-directory-select',
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

describe('create-query', () => {
  const setStateMock = vi.fn()
  vi.spyOn(React, 'useState').mockReturnValue(['', setStateMock])

  it('should render correctly', () => {
    const Container = () => {
      return <CreateQuery onClose={setStateMock} />
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
