import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { AddDependenciesPopover } from '@/components/explorer-grid/add-dependencies-popover.tsx'

vi.mock('lucide-react', () => ({
  BatteryLow: 'gui-battery-low-icon',
  PackageCheck: 'gui-package-check-icon',
  PackagePlus: 'gui-package-plus-icon',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/card.tsx', () => ({
  CardHeader: 'gui-card-header',
  CardTitle: 'gui-card-title',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/form-label.tsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/ui/select.tsx', () => ({
  Select: 'gui-select',
  SelectContent: 'gui-select-content',
  SelectItem: 'gui-select-item',
  SelectTrigger: 'gui-select-trigger',
  SelectValue: 'gui-select-value',
}))

vi.mock('@/components/ui/popover.tsx', () => ({
  PopoverClose: 'gui-popover-close',
}))

vi.mock('@/components/ui/loading-spinner.tsx', () => ({
  LoadingSpinner: 'gui-loading-spinner',
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

test('add-dependencies-popover render default', async () => {
  render(
    <AddDependenciesPopover
      error=""
      inProgress={false}
      onInstall={() => {}}
      onClose={() => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('add-dependencies-popover error', async () => {
  render(
    <AddDependenciesPopover
      error="Failed to install package"
      inProgress={false}
      onInstall={() => {}}
      onClose={() => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('add-dependencies-popover in progress', async () => {
  render(
    <AddDependenciesPopover
      error=""
      inProgress={true}
      onInstall={() => {}}
      onClose={() => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
