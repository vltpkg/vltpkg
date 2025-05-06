import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import type { QueryLabel } from '@/state/types.ts'
import { Label } from '@/components/labels/label.tsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/ui/checkbox.tsx', () => ({
  Checkbox: 'gui-checkbox',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/labels/label-badge.tsx', () => ({
  LabelBadge: 'gui-label-badge',
}))

vi.mock('lucide-react', () => ({
  ArrowUpRight: 'gui-arrow-up-right-icon',
  Palette: 'gui-palette-icon',
}))

vi.mock('@/components/ui/label.tsx', () => ({
  Label: 'gui-label',
  FormLabel: 'gui-form-label',
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
  DEFAULT_COLOR: '#00FF5F',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('label', () => {
  it('should render correctly', () => {
    const mockSelect = vi.fn()

    const mockLabel: QueryLabel = {
      id: '8c79bb69-164b-420a-813a-c2e5d3b196e6',
      color: '#06b6d4',
      name: 'mock-label-1',
      description: 'mock label 1',
    }

    const Container = () => {
      return (
        <Label
          checked={false}
          queryLabel={mockLabel}
          handleSelect={mockSelect}
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
