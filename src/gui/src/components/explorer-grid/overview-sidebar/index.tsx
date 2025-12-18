import { Fragment } from 'react'
import { SideItem } from '@/components/explorer-grid/side-item.tsx'
import { SuggestedQueries } from '@/components/explorer-grid/overview-sidebar/suggested-queries.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'

/**
 * Options for the onDependentClick handler.
 */
export type OnDependentClickOptions = {
  /**
   * The item data to update.
   */
  item: GridItemData
  /**
   * Whether this is a parent item.
   */
  isParent: boolean
}

type OverviewSidebarProps = {
  dependencies: GridItemData[]
  parentItem: GridItemData | undefined
  workspaces: GridItemData[]
  dependents: GridItemData[]
  onWorkspaceClick: (
    opts: OnDependentClickOptions,
  ) => (e: React.MouseEvent | MouseEvent) => void
  onDependentClick: (
    opts: OnDependentClickOptions,
  ) => (e: React.MouseEvent | MouseEvent) => void
  selectedItem?: GridItemData
}

export const OverviewSidebar = ({
  dependencies,
  parentItem,
  workspaces,
  dependents,
  onWorkspaceClick,
  onDependentClick,
  selectedItem,
}: OverviewSidebarProps) => {
  return (
    <Fragment>
      <OverviewSection
        isParent
        header="Parent"
        items={parentItem}
        onClick={onDependentClick}
        selectedItem={selectedItem}
      />
      <OverviewSection
        isWorkspace
        header="Workspaces"
        items={workspaces}
        onClick={onWorkspaceClick}
      />
      <OverviewSection
        header="Dependents"
        items={dependents}
        onClick={onDependentClick}
      />
      {dependencies.length > 0 && (
        <div className="px-4 py-3">
          <SuggestedQueries />
        </div>
      )}
    </Fragment>
  )
}

type OverviewSectionProps = {
  header: string
  items:
    | OverviewSidebarProps['workspaces']
    | OverviewSidebarProps['parentItem']
  isParent?: boolean
  isWorkspace?: boolean
  highlight?: boolean
  onClick:
    | OverviewSidebarProps['onWorkspaceClick']
    | OverviewSidebarProps['onDependentClick']
  selectedItem?: GridItemData
}

const OverviewSection = ({
  header,
  items,
  isParent = false,
  isWorkspace = false,
  highlight = false,
  onClick,
  selectedItem,
}: OverviewSectionProps) => {
  if (!items) return null
  if (Array.isArray(items) && items.length <= 0) return null

  return (
    <div className="flex w-full flex-col">
      {/* header */}
      <div className="border-background-secondary flex h-12 w-full items-center border-b px-6 py-3">
        <h3 className="text-sm font-medium">{header}</h3>
      </div>

      {/* dep list */}
      <div className="flex w-full px-4 py-3">
        {Array.isArray(items) ?
          <div className="flex w-full flex-col gap-4">
            {items.map((item, idx) => (
              <SideItem
                key={`${item.id}-${idx}`}
                item={item}
                isWorkspace={isWorkspace}
                dependencies={false}
                onSelect={() =>
                  onClick({ item, isParent: false })(
                    {} as React.MouseEvent,
                  )
                }
                className="w-full"
              />
            ))}
          </div>
        : <SideItem
            parent={isParent}
            selectedItem={selectedItem}
            item={items}
            highlight={highlight}
            onSelect={() =>
              onClick({ item: items, isParent })(
                {} as React.MouseEvent,
              )
            }
            className="w-full"
          />
        }
      </div>
    </div>
  )
}
