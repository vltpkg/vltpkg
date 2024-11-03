import { type MouseEvent } from 'react'
import {
  type DashboardDataProject,
  type Action,
} from '@/state/types.js'
import { CardTitle } from '@/components/ui/card.jsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.js'

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
    updateStamp(String(Math.random()).slice(2))
  } else {
    updateActiveRoute('/error')
    updateErrorCause('Failed to select project.')
  }
}

export const DashboardItem = ({
  item,
}: {
  item: DashboardDataProject
}) => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)
  const onDashboardItemClick = (e: MouseEvent) => {
    e.preventDefault()
    selectDashboardItem({
      updateActiveRoute,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
    }).catch((err: unknown) => console.error(err))
  }

  return (
    <a
      href="#"
      className="bg-primary rounded-lg w-96 m-4 p-4"
      onClick={onDashboardItemClick}>
      {item.mtime ?
        <div className="text-[9px] text-gray-500 text-right pb-4">
          Latest modified: {new Date(item.mtime).toJSON()}
        </div>
      : ''}
      <CardTitle className="text-md text-secondary grow mb-2">
        {item.name}
      </CardTitle>
      <div className="flex flex-row-reverse">
        {item.tools.map((tool, index) => (
          <div
            key={index}
            className="flex-none bg-secondary rounded-xl text-[10px] text-primary px-2 py-1 ml-2 mb-2 width-auto">
            {tool}
          </div>
        ))}
      </div>
      <div className="text-[10px] text-secondary ">{item.path}</div>
    </a>
  )
}

export const DashboardGrid = () => {
  const dashboard = useGraphStore(state => state.dashboard)

  return (
    <div className="flex flex-wrap justify-center width-full mt-6">
      {dashboard?.projects.map(
        (item, index) => (
          console.error(item),
          (<DashboardItem key={index} item={item} />)
        ),
      )}
    </div>
  )
}
