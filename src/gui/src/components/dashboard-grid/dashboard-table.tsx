import { DataTable } from '@/components/data-table/data-table.tsx'
import { dashboardColumns } from '@/components/dashboard-grid/table-columns.tsx'
import type { DashboardDataProject } from '@/state/types.ts'
import type { VisibilityState, Table } from '@tanstack/react-table'

interface DashboardTableProps {
  data: DashboardDataProject[]
  setTable: React.Dispatch<
    React.SetStateAction<Table<DashboardDataProject> | undefined>
  >
  tableFilterValue: string
  columnVisibility: VisibilityState
  setColumnVisibility: React.Dispatch<
    React.SetStateAction<VisibilityState>
  >
  onItemClick: (selectedProject: DashboardDataProject) => void
}

export const DashboardTable = ({
  data,
  setTable,
  tableFilterValue,
  columnVisibility,
  setColumnVisibility,
  onItemClick,
}: DashboardTableProps) => (
  <DataTable
    setTable={setTable}
    onClickHandler={onItemClick}
    filterValue={tableFilterValue}
    columns={dashboardColumns}
    columnVisibility={columnVisibility}
    setColumnVisibility={setColumnVisibility}
    data={data}
  />
)
