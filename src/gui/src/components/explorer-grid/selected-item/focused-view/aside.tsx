import { useParams } from 'react-router'
import { TabContentAside } from '@/components/explorer-grid/selected-item/tabs-overview.tsx'
import { DependencySideBar } from '@/components/explorer-grid/dependency-sidebar/index.tsx'

import type {
  SubTabDependencies,
  Tab,
} from '@/components/explorer-grid/selected-item/context.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { DepID } from '@vltpkg/dep-id'

interface FocusedAsideProps {
  dependencies: GridItemData[]
  onDependencyClick: (dependency: GridItemData) => () => undefined
  uninstalledDependencies: GridItemData[]
  importerId?: DepID
}

const tabAsideSet = new Set<Tab>([
  'overview',
  'insights',
  'versions',
  'manifest',
])

export const FocusedAside = ({
  dependencies,
  onDependencyClick,
  uninstalledDependencies,
  importerId,
}: FocusedAsideProps) => {
  const { tab, subTab } = useParams<{
    tab: Tab
    subTab: SubTabDependencies
  }>()
  const activeTab: Tab | undefined =
    !tab && subTab ? 'dependencies' : tab

  if (!activeTab) return null

  return (
    <div className="col-span-full lg:col-span-3 lg:pl-4 lg:pr-0">
      {tabAsideSet.has(activeTab) ?
        <TabContentAside className="h-fit border-l-[1.6px] border-muted py-0" />
      : activeTab === 'dependencies' ?
        <aside className="w-full lg:-mt-[3rem]">
          <DependencySideBar
            dependencies={dependencies}
            uninstalledDependencies={uninstalledDependencies}
            onDependencyClick={onDependencyClick}
            importerId={importerId}
          />
        </aside>
      : <TabContentAside className="py-0" />}
    </div>
  )
}
