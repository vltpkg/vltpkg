import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { DashboardViewToggle } from '@/components/dashboard-grid/dashboard-view-toggle.tsx'
import type { View } from '@/components/dashboard-grid/dashboard-view-toggle.tsx'

vi.mock('@/components/ui/toggle.tsx', () => ({
  Toggle: 'gui-toggle',
}))

vi.mock('lucide-react', () => ({
  LayoutGrid: 'gui-layout-grid-icon',
  Sheet: 'gui-sheet-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('dashboard-view-toggle', () => {
  it('should render correctly', () => {
    const mockCurrentView: View = 'table'
    const mockSetCurrentView = vi.fn()

    const Container = () => {
      return (
        <DashboardViewToggle
          setCurrentView={mockSetCurrentView}
          currentView={mockCurrentView}
        />
      )
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
