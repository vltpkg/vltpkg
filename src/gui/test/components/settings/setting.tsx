import { vi, expect, afterEach, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import {
  SettingWrapper,
  SettingField,
  SettingSplit,
  SettingSection,
} from '@/components/settings/setting.tsx'

import type { SettingFieldProps } from '@/components/settings/setting.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

vi.mock('@/components/ui/dropdown-menu.tsx', () => ({
  DropdownMenu: 'gui-dropdown-menu',
  DropdownMenuTrigger: 'gui-dropdown-menu-trigger',
  DropdownMenuContent: 'gui-dropdown-menu-content',
  DropdownMenuItem: 'gui-dropdown-menu-item',
}))

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right',
}))

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

const noop = () => vi.fn()

test('SettingWrapper renders default', () => {
  const Container = () => {
    return <SettingWrapper />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SettingSplit correctly splits the section', () => {
  const mockField = {
    name: 'Mock field',
    description: 'This is a mock field for testing',
    field: {
      type: 'dropdown',
      placeholder: 'Select an option',
      options: [
        {
          label: 'Option 1',
          onSelect: noop,
          defaultValue: true,
        },
        {
          label: 'Option 2',
          onSelect: noop,
        },
      ],
    },
  } as SettingFieldProps

  const Container = () => {
    return (
      <SettingWrapper>
        <SettingSection title="Mock test">
          <SettingField {...mockField} />
          <SettingField {...mockField} />
          <SettingField {...mockField} />
          <SettingSplit />
          <SettingField {...mockField} />
        </SettingSection>
      </SettingWrapper>
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SettingSection renders with title', () => {
  const Container = () => {
    return <SettingSection title="Test Section" />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SettingField renders as a dropdown', () => {
  const mockField = {
    name: 'Dropdown option',
    description: 'This is a dropdown option',
    field: {
      placeholder: 'Select an option',
      type: 'dropdown',
      options: [
        {
          label: 'Option 1',
          onSelect: noop,
        },
      ],
    },
  } satisfies SettingFieldProps

  const Container = () => {
    return <SettingField {...mockField} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SettingField renders as a toggle', () => {
  const mockField = {
    name: 'Toggle option',
    description: 'This is a toggle option',
    field: {
      type: 'toggle',
      defaultValue: false,
      onActive: noop,
      onInactive: noop,
    },
  } satisfies SettingFieldProps

  const Container = () => {
    return <SettingField {...mockField} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SettingField renders as an input', () => {
  const mockField = {
    name: 'input option',
    description: 'This is an input option',
    field: {
      type: 'input',
      value: 'test',
      onValueChange: noop,
    },
  } satisfies SettingFieldProps

  const Container = () => {
    return <SettingField {...mockField} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
