import { useEffect, type MouseEvent } from 'react'
import { useGraphStore } from '@/state/index.js'
import { Button } from '@/components/ui/button.jsx'
import { ArrowRight, TriangleAlert } from 'lucide-react'

export const ErrorFound = () => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const previousRoute = useGraphStore(state => state.previousRoute)
  const errorCause = useGraphStore(state => state.errorCause)

  useEffect(() => {
    history.pushState({ query: '', route: '/error' }, '', '/error')
    window.scrollTo(0, 0)
  })

  const onDashboardButtonClick = (e: MouseEvent) => {
    e.preventDefault()
    updateActiveRoute('/dashboard')
  }

  const onBackButtonClick = (e: MouseEvent) => {
    e.preventDefault()
    updateActiveRoute(previousRoute)
  }

  return (
    <section className="flex min-h-[80svh] grow flex-col items-center justify-center bg-white dark:bg-black">
      <div className="relative -mt-32 flex flex-col items-center justify-center">
        <div className="relative flex flex-col gap-8">
          <div className="absolute inset-0 z-[2] bg-gradient-radial from-white/0 via-transparent to-white dark:from-black/0 dark:to-black" />
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

        <div className="-mt-32 flex flex-col items-center justify-center gap-1">
          <h4 className="z-[2] text-xl font-semibold">
            Something went wrong
          </h4>
          <p className="z-[2] text-center text-sm text-neutral-500">
            {errorCause ? errorCause : 'An unexpected error occured.'}
          </p>
          <div className="z-[2] mt-3 flex gap-3">
            <Button variant="outline" onClick={onBackButtonClick}>
              Back
            </Button>
            <Button onClick={onDashboardButtonClick}>
              <span>Dashboard</span>
              <ArrowRight />
            </Button>
          </div>
        </div>

        <div className="absolute -bottom-6 -left-6 -right-6 z-[1] h-[150px] bg-gradient-radial from-white to-white/0 dark:from-black dark:to-black/0" />
      </div>
    </section>
  )
}

const DashboardMiniView = () => {
  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex h-[100px] w-[175px] rounded-sm border-[1px] border-neutral-400 bg-neutral-400/10 dark:border-neutral-800 dark:bg-neutral-800/10">
        <div className="flex w-1/4 flex-col justify-between border-r-[1px] border-neutral-700/50 bg-neutral-700/25 px-[3px] py-[3px]">
          <div>
            <div className="h-[7px] w-full rounded-[2px] bg-neutral-700/50" />
            <div className="mt-1.5 flex items-center gap-1">
              <div className="size-[5px] rounded-[1px] bg-neutral-700/60" />
              <div className="h-[5px] w-2/3 rounded-[1px] bg-neutral-700/60" />
            </div>
            <div className="mt-1 flex items-center gap-1">
              <div className="size-[5px] rounded-[1px] bg-neutral-700/60" />
              <div className="h-[5px] w-1/3 rounded-[1px] bg-neutral-700/60" />
            </div>
          </div>
          <div>
            <div className="rouned-[1px] size-[5px] bg-neutral-700/60" />
          </div>
        </div>

        <div className="flex w-full flex-col px-[6px] py-[3px]">
          <div className="h-[6px] w-1/4 rounded-[1px] bg-neutral-700/60" />
          <div className="mt-2 flex w-full justify-between gap-1">
            <div className="h-[24px] w-1/3 border-[1px] border-neutral-400/90 bg-neutral-400/60 dark:border-neutral-800/90 dark:bg-neutral-800/60" />
            <div className="h-[24px] w-1/3 border-[1px] border-neutral-400/90 bg-neutral-400/60 dark:border-neutral-800/90 dark:bg-neutral-800/60" />
            <div className="h-[24px] w-1/3 border-[1px] border-neutral-400/90 bg-neutral-400/60 dark:border-neutral-800/90 dark:bg-neutral-800/60" />
          </div>
        </div>
      </div>
      <div className="h-[12px] w-[80px] rounded-[2px] bg-neutral-200 dark:bg-neutral-900/80" />
    </div>
  )
}

const QueryMiniView = () => {
  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex h-[100px] w-[175px] rounded-sm border-[1px] border-neutral-400 bg-neutral-400/10 dark:border-neutral-800 dark:bg-neutral-800/10">
        <div className="flex w-[10px] flex-col items-center justify-between border-r-[1px] border-neutral-400/50 bg-neutral-400/25 px-[1.6px] py-[3px] dark:border-neutral-700/50 dark:bg-neutral-700/25">
          <div className="flex flex-col items-center justify-center">
            <div className="size-[6px] rounded-[1px] bg-neutral-400 dark:bg-neutral-700/60" />
            <div className="mt-1.5 flex flex-col items-center justify-center gap-1">
              <div className="size-[6px] rounded-[1px] bg-neutral-400 dark:bg-neutral-700/60" />
              <div className="size-[6px] rounded-[1px] bg-neutral-400 dark:bg-neutral-700/60" />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="size-[6px] rounded-[1px] bg-neutral-400 dark:bg-neutral-700/60" />
          </div>
        </div>

        <div className="flex w-full flex-col px-[6px] py-[3px]">
          <div className="h-[6px] w-1/4 rounded-[1px] bg-neutral-400/60 dark:bg-neutral-700/60" />
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-center justify-center gap-1">
              <div className="h-[6px] w-[25px] rounded-[1px] bg-neutral-400/60 dark:bg-neutral-700/60" />
              <div className="h-[6px] w-[12px] rounded-[1px] bg-neutral-400/60 dark:bg-neutral-700/60" />
              <div className="h-[6px] w-[6px] rounded-[1px] bg-neutral-400/60 dark:bg-neutral-700/60" />
            </div>
            <div className="flex items-center justify-center gap-1">
              <div className="h-[6px] w-[20px] rounded-[1px] bg-neutral-900/60 dark:bg-neutral-500/60" />
            </div>
          </div>
          <div className="mt-2 flex w-full flex-col gap-1.5">
            <div className="h-[8px] w-full rounded-[1px] border-[0.75px] border-neutral-400/70 bg-neutral-400/20 dark:border-neutral-700/70 dark:bg-neutral-700/20" />
            <div className="h-[8px] w-full rounded-[1px] border-[0.75px] border-neutral-400/70 bg-neutral-400/20 dark:border-neutral-700/70 dark:bg-neutral-700/20" />
            <div className="h-[8px] w-full rounded-[1px] border-[0.75px] border-neutral-400/70 bg-neutral-400/20 dark:border-neutral-700/70 dark:bg-neutral-700/20" />
          </div>
        </div>
      </div>
      <div className="h-[12px] w-[60px] rounded-[2px] bg-neutral-200 dark:bg-neutral-900/80" />
    </div>
  )
}

const ErrorMiniView = () => {
  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex h-[100px] w-[175px] items-center justify-center rounded-sm border-[1px] border-red-800 bg-red-700/10">
        <div className="flex size-8 items-center justify-center rounded-sm bg-red-500/30">
          <TriangleAlert className="text-red-500" size={16} />
        </div>
      </div>
      <div className="h-[12px] w-[100px] rounded-[2px] bg-neutral-200 dark:bg-neutral-900/80" />
    </div>
  )
}
