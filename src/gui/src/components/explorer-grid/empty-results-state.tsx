import { Button } from '@/components/ui/button.jsx'
import { ArrowRight } from 'lucide-react'
import { useGraphStore } from '@/state/index.js'

const EmptyResultsState = () => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)

  const navigateToRoot = () => {
    updateActiveRoute('/explore')
    updateQuery(':root')
  }

  return (
    <section className="flex flex-col min-h-[70svh] h-full w-full px-8 pt-4 items-center justify-center">
      <div className="relative flex flex-col items-center justify-center h-fit w-fit -mt-10 mb-8">
        <MiniQuery className="w-[275px] h-[64px] opacity-30 -mb-6" />
        <MiniQuery className="z-[1] shadow-lg" />
        <MiniQuery className="w-[275px] h-[64px] opacity-30 -mt-6" />
      </div>

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <h4 className="text-xl font-semibold">No results found</h4>
        <p className="text-sm text-neutral-500">
          Your Query did not match any results in this project.
        </p>
        <div className="mt-3 flex gap-3 items-center justify-center">
          <Button onClick={navigateToRoot}>
            <span>Project Root</span>
            <ArrowRight />
          </Button>
        </div>
      </div>
    </section>
  )
}

const MiniQuery = ({ className = '' }: { className?: string }) => {
  return (
    <div
      className={`w-[300px] h-[70px] rounded-sm border-[1px] border-neutral-200 dark:border-neutral-800 bg-muted dark:bg-black flex flex-col ${className}`}>
      <div className="flex justify-between items-center border-b-[1px] border-neutral-200 dark:border-neutral-800 p-2">
        <div className="h-[18px] w-[80px] bg-neutral-200 dark:bg-neutral-950 border-[1px] rounded-sm border-neutral-300 dark:border-neutral-800" />
        <div className="h-[16px] w-[60px] bg-neutral-200 dark:bg-neutral-950 border-[1px] rounded-sm border-neutral-300 dark:border-neutral-800" />
      </div>
      <div className="flex justify-between items-center h-full w-full p-2">
        <div className="h-[12px] w-[125px] bg-neutral-200 dark:bg-neutral-950 border-[1px] border-neutral-300 dark:border-neutral-800 rounded-sm" />
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-sky-400/25 dark:bg-sky-800/25 border-[1px] border-sky-400 dark:border-sky-800 h-[12px] w-[30px]" />
          <div className="rounded-full bg-red-400/25 dark:bg-red-800/25 border-[1px] border-red-400 dark:border-red-800 h-[12px] w-[38px]" />
        </div>
      </div>
    </div>
  )
}

export { EmptyResultsState }
