import { GridHeader } from '@/components/explorer-grid/header.tsx'
import { SideItem } from '@/components/explorer-grid/side-item.tsx'
import { SuggestedQueries } from '@/components/explorer-grid/overview-sidebar/suggested-queries.tsx'
import { cn } from '@/lib/utils.ts'

import type { GridItemData } from '@/components/explorer-grid/types.ts'

type OverviewSidebarProps = {
  dependencies: GridItemData[]
  parentItem: GridItemData | undefined
  workspaces: GridItemData[]
  dependents: GridItemData[]
  onWorkspaceClick: (item: GridItemData) => () => undefined
  onDependentClick: (
    item: GridItemData,
    isParent?: boolean,
  ) => () => undefined
}

export const OverviewSidebar = ({
  dependencies,
  parentItem,
  workspaces,
  dependents,
  onWorkspaceClick,
  onDependentClick,
}: OverviewSidebarProps) => {
  return (
    <>
      <OverviewSection
        header="Parent"
        items={parentItem}
        onClick={onDependentClick}
      />
      <OverviewSection
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
        <SuggestedQueries
          className={cn(
            workspaces.length === 0 && !parentItem && 'mt-[3rem]',
          )}
        />
      )}
    </>
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
}

const OverviewSection = ({
  header,
  items,
  isParent = false,
  isWorkspace = false,
  highlight = false,
  onClick,
}: OverviewSectionProps) => {
  if (!items) return null
  if (Array.isArray(items) && items.length <= 0) return null

  return (
    <>
      <GridHeader>{header}</GridHeader>
      {Array.isArray(items) ?
        <div className="flex flex-col gap-4">
          {items.map((item, idx) => (
            <SideItem
              key={`${item.id}-${idx}`}
              item={item}
              isWorkspace={isWorkspace}
              dependencies={false}
              onSelect={onClick(item)}
            />
          ))}
        </div>
      : <SideItem
          parent={isParent}
          item={items}
          highlight={highlight}
          onSelect={onClick(items, isParent)}
        />
      }
    </>
  )
}
