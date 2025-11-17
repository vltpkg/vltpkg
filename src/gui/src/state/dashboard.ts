import { create } from 'zustand'
import type { Table, VisibilityState } from '@tanstack/react-table'
import type { DashboardDataProject } from '@/state/types.ts'

export type DashboardState = {
  currentView: 'grid' | 'table'
  table: Table<DashboardDataProject> | undefined
  tableFilterValue: string
  filteredProjects: DashboardDataProject[]
  columnVisibility: VisibilityState
  searchValue: string
}

export type DashboardAction = {
  updateCurrentView: (
    currentView: DashboardState['currentView'],
  ) => void
  updateTable: (table: DashboardState['table']) => void
  setTableFilterValue: (
    tableFilterValue: DashboardState['tableFilterValue'],
  ) => void
  setFilteredProjects: (
    filteredProjects: DashboardDataProject[],
  ) => void
  setColumnVisibility: (
    columnVisibility: DashboardState['columnVisibility'],
  ) => void
  setSearchValue: (value: DashboardState['searchValue']) => void
}

const initialState: DashboardState = {
  currentView: 'grid',
  searchValue: '',
  table: undefined,
  tableFilterValue: '',
  filteredProjects: [],
  columnVisibility: {
    type: false,
    private: false,
    version: false,
  },
}

export const useDashboardStore = create<
  DashboardState & DashboardAction
>(set => {
  const store = {
    ...initialState,
    updateCurrentView: (currentView: DashboardState['currentView']) =>
      set(() => ({ currentView })),
    updateTable: (table: DashboardState['table']) =>
      set(() => ({ table })),
    setTableFilterValue: (
      tableFilterValue: DashboardState['tableFilterValue'],
    ) => set(() => ({ tableFilterValue })),
    setFilteredProjects: (filteredProjects: DashboardDataProject[]) =>
      set(() => ({ filteredProjects })),
    setColumnVisibility: (
      columnVisibility: DashboardState['columnVisibility'],
    ) => set(() => ({ columnVisibility })),
    setSearchValue: (searchValue: DashboardState['searchValue']) =>
      set(() => ({ searchValue })),
  }
  return store
})
