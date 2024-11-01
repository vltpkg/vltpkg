import { useEffect, MouseEvent } from 'react'
import { Logo } from '@/components/ui/logo.jsx'
import { Title } from '@/components/ui/title.jsx'
import { ModeToggle } from '@/components/ui/mode-toggle.jsx'
import { BatteryLow, LayoutDashboard } from 'lucide-react'
import { useGraphStore } from '@/state/index.js'
import { Button } from '@/components/ui/button.jsx'

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
    <>
      <div className="grid grid-cols-7 gap-4 py-2 border-b">
        <Logo className="col-span-2 p-8" />
        <div className="col-span-5 relative pt-6 pb-1">
          <div className="flex ml-[580px]">
            <ModeToggle />
            <Button
              className="ml-2"
              variant="outline"
              onClick={onDashboardButtonClick}>
              <LayoutDashboard size={12} /> Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-5 pt-12">
        <div className="col-span3 col-start-2">
          <Title className="flex text-2xl text-primary leading-10 p-6">
            <BatteryLow size={40} className="mr-4" /> Error Found!
          </Title>
          <p className="px-6">{errorCause}</p>
        </div>
      </div>
    </>
  )
}
