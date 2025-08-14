import { QueryBar } from '@/components/query-bar/index.tsx'
import { RootButton } from '@/components/explorer-grid/root-button.tsx'
import { QueryMatches } from '@/components/explorer-grid/query-matches.tsx'
import { Search, Command } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd.tsx'
import SaveQueryButton from '@/components/explorer-grid/save-query.tsx'

export const ExplorerHeader = () => {
  return (
    <div className="flex w-full gap-5">
      <RootButton className="rounded-xl" />
      <QueryBar
        tabIndex={0}
        startContent={
          <Search size={20} className="ml-3 text-neutral-500" />
        }
        className="grow rounded-xl"
        endContent={
          <div className="relative mr-3 hidden items-center gap-1 md:flex">
            <QueryMatches />
            <SaveQueryButton />
            <Kbd className='before:content-[" "] relative ml-3 before:absolute before:-ml-10 before:h-[0.75rem] before:w-[2px] before:rounded-sm before:bg-neutral-200 before:dark:bg-neutral-700'>
              <Command size={12} />
            </Kbd>
            <Kbd className="text-sm">k</Kbd>
            <div className="absolute inset-0 -bottom-2 -right-3 -top-2 z-[-2] rounded-br-xl rounded-tr-xl border-y border-r border-input bg-gradient-to-r from-white/20 to-white backdrop-blur-sm dark:from-muted/5 dark:to-muted/5" />
          </div>
        }
      />
    </div>
  )
}
