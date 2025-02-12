import { DataTable } from '@/components/data-table/data-table.jsx'
import { dashboardColumns } from '@/components/dashboard-grid/table-columns.jsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.js'
import type { Action, DashboardDataProject } from '@/state/types.js'
import type { VisibilityState, Table } from '@tanstack/react-table'

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
}

type SelectDashboardItemOptions = {
  updateActiveRoute: Action['updateActiveRoute']
  updateErrorCause: Action['updateErrorCause']
  updateQuery: Action['updateQuery']
  updateStamp: Action['updateStamp']
  item: DashboardDataProject
}

const selectDashboardItem = async ({
  updateActiveRoute,
  updateErrorCause,
  updateQuery,
  updateStamp,
  item,
}: SelectDashboardItemOptions) => {
  let req
  try {
    req = await fetch('/select-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: item.path,
      }),
    })
  } catch (err) {
    console.error(err)
    updateActiveRoute('/error')
    updateErrorCause('Failed to request project selection.')
    return
  }

  let projectSelected = false
  try {
    projectSelected = (await req.json()) === 'ok'
  } catch (err) {
    console.error(err)
  }

  if (projectSelected) {
    window.scrollTo(0, 0)
    updateQuery(DEFAULT_QUERY)
    updateActiveRoute('/explore')
    updateStamp()
  } else {
    updateActiveRoute('/error')
    updateErrorCause('Failed to select project.')
  }
}

export const DashboardTable = ({
  data,
  setTable,
  tableFilterValue,
  columnVisibility,
  setColumnVisibility,
}: DashboardTableProps) => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)

  const onDashboardItemClick = (item: DashboardDataProject) => {
    selectDashboardItem({
      updateActiveRoute,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
    }).catch((err: unknown) => console.error(err))
  }

  return (
    <DataTable
      setTable={setTable}
      onClickHandler={(selectedProject: DashboardDataProject) => {
        onDashboardItemClick(selectedProject)
      }}
      filterValue={tableFilterValue}
      columns={dashboardColumns}
      columnVisibility={columnVisibility}
      setColumnVisibility={setColumnVisibility}
      data={data}
    />
  )
}
