import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { CreateQuery } from '@/components/queries/create-query.tsx'

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/labels/label-select.tsx', () => ({
  LabelSelect: 'gui-label-select',
}))

vi.mock('@/components/labels/label-badge.tsx', () => ({
  LabelBadge: 'gui-label-badge',
}))

vi.mock('@/components/ui/label.tsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/ui/popover.tsx', () => ({
  Popover: 'gui-popover',
  PopoverContent: 'gui-popover-content',
  PopoverTrigger: 'gui-popover-trigger',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
}))

vi.mock('lucide-react', () => ({
  ChevronsUpDown: 'gui-chevron-icon',
  CircleHelp: 'gui-circle-help-icon',
}))

vi.mock('@/components/directory-select.tsx', () => ({
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
