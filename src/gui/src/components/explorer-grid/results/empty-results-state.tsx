import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button.tsx'
import { ArrowRight } from 'lucide-react'
import { useGraphStore } from '@/state/index.ts'

const EmptyResultsState = () => {
  const navigate = useNavigate()
  const updateQuery = useGraphStore(state => state.updateQuery)

  const navigateToRoot = () => {
    void navigate('/explore')
    updateQuery(':root')
  }

  return (
    <section className="flex h-full min-h-[70svh] w-full flex-col items-center justify-center px-8 pt-4">
      <div className="relative -mt-10 flex h-fit w-fit flex-col items-center justify-center pb-8">
        <MiniQuery className="-mb-6 h-[64px] w-[250px] opacity-30" />
        <MiniQuery className="z-[1] shadow-lg" />
        <MiniQuery className="-mt-6 h-[64px] w-[250px] opacity-30" />
      </div>

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <h4 className="text-xl font-semibold">No results found</h4>
        <p className="text-sm text-neutral-500">
          Your Query did not match any results in this project.
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
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
      className={`flex h-[70px] w-[300px] flex-col rounded-sm border-[1px] border-neutral-200 bg-card dark:border-neutral-800 ${className}`}>
      <div className="flex items-center justify-between border-b-[1px] border-neutral-200 p-2 dark:border-neutral-800">
        <div className="h-[18px] w-[80px] rounded-sm border-[1px] border-neutral-300 bg-card dark:border-neutral-800" />
        <div className="h-[16px] w-[60px] rounded-sm border-[1px] border-neutral-300 bg-card dark:border-neutral-800" />
      </div>
      <div className="flex h-full w-full items-center justify-between p-2">
        <div className="h-[12px] w-[125px] rounded-sm border-[1px] border-neutral-300 bg-card dark:border-neutral-800" />
        <div className="flex items-center gap-2">
          <div className="h-[12px] w-[30px] rounded-full border-[1px] border-sky-400 bg-sky-400/25 dark:border-sky-800 dark:bg-sky-800/25" />
          <div className="h-[12px] w-[38px] rounded-full border-[1px] border-red-400 bg-red-400/25 dark:border-red-800 dark:bg-red-800/25" />
        </div>
      </div>
    </div>
  )
}

export { EmptyResultsState }
