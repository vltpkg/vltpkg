import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { ManageDependencies } from '@/components/explorer-grid/manage-dependencies.jsx'

vi.mock('lucide-react', () => ({
  BatteryLow: 'gui-battery-low-icon',
  PackageCheck: 'gui-package-check-icon',
  PackagePlus: 'gui-package-plus-icon',
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/card.jsx', () => ({
  CardHeader: 'gui-card-header',
  CardTitle: 'gui-card-title',
}))

vi.mock('@/components/ui/input.jsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/form-label.jsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/ui/select.jsx', () => ({
  Select: 'gui-select',
  SelectContent: 'gui-select-content',
  SelectItem: 'gui-select-item',
  SelectTrigger: 'gui-select-trigger',
  SelectValue: 'gui-select-value',
}))

vi.mock('@/components/ui/popover.jsx', () => ({
  PopoverClose: 'gui-popover-close',
}))

vi.mock('@/components/ui/loading-spinner.jsx', () => ({
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

test('manage-dependencies render default', async () => {
  render(
    <ManageDependencies
      importerId="file:."
      onSuccessfulInstall={() => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
