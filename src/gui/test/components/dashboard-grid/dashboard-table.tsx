import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { DashboardTable } from '@/components/dashboard-grid/dashboard-table.jsx'
import { type DashboardDataProject } from '@/state/types.js'
import { type VisibilityState } from '@tanstack/react-table'

vi.mock('@/components/data-table/data-table.jsx', () => ({
  DataTable: 'gui-data-table',
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

describe('dashboard-table', () => {
  it('should render correctly', () => {
    const mockSetTable = vi.fn()
    const mockVisibility: VisibilityState = {}
    const mockSetVisibility = vi.fn()
    vi.spyOn(React, 'useState').mockReturnValue(['', mockSetTable])
    vi.spyOn(React, 'useState').mockReturnValue([
      mockVisibility,
      mockSetVisibility,
    ])

    const mockData: DashboardDataProject[] = [
      {
        name: 'project-foo',
        readablePath: '~/project-foo',
        path: '/home/user/project-foo',
        manifest: { name: 'project-foo', version: '1.0.0' },
        tools: ['node', 'vlt'],
        mtime: 1730498483044,
      },
      {
        name: 'project-bar',
        readablePath: '~/project-foo',
        path: '/home/user/project-bar',
        manifest: { name: 'project-bar', version: '1.0.0' },
        tools: ['pnpm'],
        mtime: 1730498491029,
      },
    ]

    const Container = () => {
      return (
        <DashboardTable
          setColumnVisibility={mockSetVisibility}
          columnVisibility={mockVisibility}
          tableFilterValue=""
          setTable={mockSetTable}
          data={mockData}
          onItemClick={() => {}}
        />
      )
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
