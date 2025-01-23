import { useEffect, type MouseEvent } from 'react'
import { useGraphStore } from '@/state/index.js'
import { Button } from '@/components/ui/button.jsx'
import { ArrowRight, TriangleAlert } from 'lucide-react'

export const ErrorFound = () => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const errorCause = useGraphStore(state => state.errorCause)
  useEffect(() => {
    history.pushState({ query: '', route: '/error' }, '', '/error')
    window.scrollTo(0, 0)
  })

  const onDashboardButtonClick = (e: MouseEvent) => {
    e.preventDefault()
    updateActiveRoute('/dashboard')
  }

  return (
    <section className="flex grow flex-col items-center min-h-[80svh] bg-white dark:bg-black justify-center">
      <div className="relative flex flex-col items-center justify-center -mt-32">
        <div className="relative flex flex-col gap-8">
          <div className="absolute inset-0 bg-gradient-radial from-white/0 dark:from-black/0 via-transparent dark:to-black to-white z-[2]" />
          <div className="flex gap-8 opacity-50">
            <DashboardMiniView />
            <QueryMiniView />
            <DashboardMiniView />
          </div>
          <div className="flex gap-8 opacity-80">
            <DashboardMiniView />
            <ErrorMiniView />
            <QueryMiniView />
          </div>
          <div className="flex gap-8 opacity-50">
            <QueryMiniView />
            <DashboardMiniView />
            <QueryMiniView />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 -mt-32">
          <h4 className="text-xl font-semibold z-[2]">
            Something went wrong
          </h4>
          <p className="text-sm text-neutral-500 text-center z-[2]">
            {errorCause ? errorCause : 'An unexpected error occured.'}
          </p>
          <div className="flex gap-3 mt-3 z-[2]">
            <Button variant="outline" onClick={() => history.back()}>
              Back
            </Button>
            <Button onClick={onDashboardButtonClick}>
              <span>Dashboard</span>
              <ArrowRight />
            </Button>
          </div>
        </div>

        <div className="absolute -bottom-6 h-[150px] -left-6 -right-6 z-[1] bg-gradient-radial from-white dark:from-black dark:to-black/0 to-white/0" />
      </div>
    </section>
  )
}

const DashboardMiniView = () => {
  return (
    <div className="relative flex flex-col gap-2">
      <div className="w-[175px] h-[100px] border-[1px] border-neutral-400 dark:border-neutral-800 rounded-sm bg-neutral-400/10 dark:bg-neutral-800/10 flex">
        <div className="w-1/4 bg-neutral-700/25 border-r-[1px] border-neutral-700/50 flex flex-col justify-between px-[3px] py-[3px]">
          <div>
            <div className="w-full h-[7px] bg-neutral-700/50 rounded-[2px]" />
            <div className="flex items-center gap-1 mt-1.5">
              <div className="size-[5px] rounded-[1px] bg-neutral-700/60" />
              <div className="w-2/3 h-[5px] bg-neutral-700/60 rounded-[1px]" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <div className="size-[5px] rounded-[1px] bg-neutral-700/60" />
              <div className="w-1/3 h-[5px] bg-neutral-700/60 rounded-[1px]" />
            </div>
          </div>
          <div>
            <div className="size-[5px] rouned-[1px] bg-neutral-700/60" />
          </div>
        </div>

        <div className="flex w-full flex-col px-[6px] py-[3px]">
          <div className="w-1/4 h-[6px] bg-neutral-700/60 rounded-[1px]" />
          <div className="flex w-full justify-between gap-1 mt-2">
            <div className="w-1/3 h-[24px] border-[1px] border-neutral-400/90 dark:border-neutral-800/90 bg-neutral-400/60 dark:bg-neutral-800/60" />
            <div className="w-1/3 h-[24px] border-[1px] border-neutral-400/90 dark:border-neutral-800/90 bg-neutral-400/60 dark:bg-neutral-800/60" />
            <div className="w-1/3 h-[24px] border-[1px] border-neutral-400/90 dark:border-neutral-800/90 bg-neutral-400/60 dark:bg-neutral-800/60" />
          </div>
        </div>
      </div>
      <div className="w-[80px] h-[12px] bg-neutral-200 dark:bg-neutral-900/80 rounded-[2px]" />
    </div>
  )
}

const QueryMiniView = () => {
  return (
    <div className="relative flex flex-col gap-2">
      <div className="w-[175px] h-[100px] border-[1px] border-neutral-400 dark:border-neutral-800 rounded-sm bg-neutral-400/10 dark:bg-neutral-800/10 flex">
        <div className="flex flex-col items-center justify-between px-[1.6px] py-[3px] w-[10px] bg-neutral-400/25 dark:bg-neutral-700/25 border-r-[1px] border-neutral-400/50 dark:border-neutral-700/50">
          <div className="flex flex-col items-center justify-center">
            <div className="size-[6px] bg-neutral-400 dark:bg-neutral-700/60 rounded-[1px]" />
            <div className="flex flex-col items-center justify-center mt-1.5 gap-1">
              <div className="size-[6px] bg-neutral-400 dark:bg-neutral-700/60 rounded-[1px]" />
              <div className="size-[6px] bg-neutral-400 dark:bg-neutral-700/60 rounded-[1px]" />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="size-[6px] bg-neutral-400 dark:bg-neutral-700/60 rounded-[1px]" />
          </div>
        </div>

        <div className="flex flex-col w-full px-[6px] py-[3px]">
          <div className="w-1/4 h-[6px] bg-neutral-400/60 dark:bg-neutral-700/60 rounded-[1px]" />
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center justify-center gap-1">
              <div className="w-[25px] h-[6px] bg-neutral-400/60 dark:bg-neutral-700/60 rounded-[1px]" />
              <div className="w-[12px] h-[6px] bg-neutral-400/60 dark:bg-neutral-700/60 rounded-[1px]" />
              <div className="w-[6px] h-[6px] bg-neutral-400/60 dark:bg-neutral-700/60 rounded-[1px]" />
            </div>
            <div className="flex items-center justify-center gap-1">
              <div className="w-[20px] h-[6px] bg-neutral-900/60 dark:bg-neutral-500/60 rounded-[1px]" />
            </div>
          </div>
          <div className="flex flex-col mt-2 gap-1.5 w-full">
            <div className="w-full h-[8px] bg-neutral-400/20 dark:bg-neutral-700/20 border-[0.75px] border-neutral-400/70 dark:border-neutral-700/70 rounded-[1px]" />
            <div className="w-full h-[8px] bg-neutral-400/20 dark:bg-neutral-700/20 border-[0.75px] border-neutral-400/70 dark:border-neutral-700/70 rounded-[1px]" />
            <div className="w-full h-[8px] bg-neutral-400/20 dark:bg-neutral-700/20 border-[0.75px] border-neutral-400/70 dark:border-neutral-700/70 rounded-[1px]" />
          </div>
        </div>
      </div>
      <div className="w-[60px] h-[12px] bg-neutral-200 dark:bg-neutral-900/80 rounded-[2px]" />
    </div>
  )
}

const ErrorMiniView = () => {
  return (
    <div className="relative flex flex-col gap-2">
      <div className="w-[175px] h-[100px] border-[1px] border-red-800 rounded-sm bg-red-700/10 flex items-center justify-center">
        <div className="size-8 bg-red-500/30 rounded-sm flex items-center justify-center">
          <TriangleAlert className="text-red-500" size={16} />
        </div>
      </div>
      <div className="w-[100px] h-[12px] bg-neutral-200 dark:bg-neutral-900/80 rounded-[2px]" />
    </div>
  )
}
