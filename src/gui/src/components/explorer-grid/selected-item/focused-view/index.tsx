import { motion } from 'framer-motion'
import { SelectedItemProvider } from '@/components/explorer-grid/selected-item/context.tsx'
import { ItemHeader } from '@/components/explorer-grid/selected-item/item-header.tsx'
import { SelectedItemTabs } from '@/components/explorer-grid/selected-item/item.tsx'
import { FocusedAside } from '@/components/explorer-grid/selected-item/focused-view/aside.tsx'
import { FocusButton } from '@/components/explorer-grid/selected-item/focused-view/focused-button.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { DepID } from '@vltpkg/dep-id'

interface FocusedViewProps {
  item: GridItemData
  dependencies: GridItemData[]
  onDependencyClick: (dependency: GridItemData) => () => undefined
  uninstalledDependencies: GridItemData[]
  importerId?: DepID
}

export const FocusedView = ({
  item,
  dependencies,
  onDependencyClick,
  uninstalledDependencies,
  importerId,
}: FocusedViewProps) => {
  return (
    <SelectedItemProvider
      selectedItem={item}
      asideOveriewVisible={false}>
      <motion.section
        initial={{
          opacity: 0,
          filter: 'blur(2px)',
        }}
        animate={{
          opacity: 1,
          filter: 'blur(0px)',
        }}
        exit={{
          opacity: 0,
          filter: 'blur(2px)',
        }}
        transition={{ ease: 'easeInOut', duration: 0.25 }}
        className="relative pb-4">
        <ItemHeader
          classNames={{
            wrapperClassName: 'pb-0',
            contentClassName: 'grid grid-cols-12',
            breadCrumbWrapperClassName: 'col-span-12',
            packageImageSpecClassName: 'col-span-full lg:col-span-9',
          }}>
          <FocusButton />
        </ItemHeader>
        <div className="mx-6 grid grid-cols-12">
          <div className="col-span-full h-fit rounded-xl border-[1px] border-muted bg-white pt-2 dark:bg-neutral-900 lg:col-span-9">
            <SelectedItemTabs />
          </div>

          <FocusedAside
            className="mt-4 md:mt-0"
            dependencies={dependencies}
            onDependencyClick={onDependencyClick}
            uninstalledDependencies={uninstalledDependencies}
            importerId={importerId}
          />
        </div>
      </motion.section>
    </SelectedItemProvider>
  )
}
