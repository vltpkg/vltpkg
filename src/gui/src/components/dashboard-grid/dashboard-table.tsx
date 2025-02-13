import { DataTable } from '@/components/data-table/data-table.jsx'
import { dashboardColumns } from '@/components/dashboard-grid/table-columns.jsx'
import { type DashboardDataProject } from '@/state/types.js'
import {
  type VisibilityState,
  type Table,
} from '@tanstack/react-table'

interface DashboardTableProps {
  data: DashboardDataProject[]
  setTable: React.Dispatch<
    React.SetStateAction<Table<DashboardDataProject> | null>
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
