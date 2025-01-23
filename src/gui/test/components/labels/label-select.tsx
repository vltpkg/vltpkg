import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { type QueryLabel } from '@/state/types.js'
import { LabelSelect } from '@/components/labels/label-select.jsx'
import { useGraphStore as useStore } from '@/state/index.js'

vi.mock('@/components/ui/command.jsx', () => ({
  Command: 'gui-command',
  CommandEmpty: 'gui-command-empty',
  CommandGroup: 'gui-command-group',
  CommandInput: 'gui-command-input',
  CommandItem: 'gui-command-item',
  CommandList: 'gui-command-list',
}))

vi.mock('lucide-react', () => ({
  Check: 'gui-check-icon',
  Pencil: 'gui-pencil-icon',
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/labels/create-label-dialog.jsx', () => ({
  CreateLabelModal: 'gui-create-label-modal',
}))

vi.mock('@/components/ui/dialog.jsx', () => ({
  Dialog: 'gui-dialog',
  DialogTrigger: 'gui-dialog-trigger',
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

describe('label-select', () => {
  it('should render correctly', () => {
    const setItemsMock = vi.fn()
    const setIsOpenMock = vi.fn()

    const mockSelectItems: QueryLabel[] = [
      {
        id: '8c79bb69-164b-420a-813a-c2e5d3b196e6',
        color: '#06b6d4',
        name: 'mock-label-1',
        description: 'mock label 1',
      },
      {
        id: 'c894e15a-e9ba-450a-ba4f-4d0ffd4ba0ff',
        color: '#06b6d4',
        name: 'mock-label-2',
        description: 'mock label 2',
      },
      {
        id: 'ffbd8b85-ce48-49a5-8616-a3887b1a6779',
        color: '#06b6d4',
        name: 'mock-label-3',
        description: 'mock label 3',
      },
    ]

    const Container = () => {
      return (
        <LabelSelect
          selectedItems={mockSelectItems}
          setItems={setItemsMock}
          setIsOpen={setIsOpenMock}
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
