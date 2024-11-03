import { useEffect, MouseEvent } from 'react'
import { Logo } from '@/components/ui/logo.jsx'
import { Title } from '@/components/ui/title.jsx'
import { ThemeSwitcher } from '@/components/ui/theme-switcher.jsx'
import { BatteryLow, LayoutDashboard } from 'lucide-react'
import { useGraphStore } from '@/state/index.js'
import { Button } from '@/components/ui/button.jsx'
import { Footer } from '@/components/ui/footer.jsx'

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
    <section className="flex grow flex-col justify-between">
      <div>
        <nav
          className="flex gap-4 md:gap-0 px-8 py-4 items-center justify-between border-b-[1px] border-solid"
          role="navigation">
          <div className="flex w-full h-full items-center justify-end">
            <div className="flex items-baseline flex-1">
              <Logo />
              <div className="ml-6">
                <p className="text-md font-medium">Dashboard</p>
              </div>
            </div>
            <ThemeSwitcher />
            <Button
              className="ml-2"
              variant="outline"
              onClick={onDashboardButtonClick}>
              <LayoutDashboard size={12} /> Back to Dashboard
            </Button>
          </div>
        </nav>
      </div>
      <div className="grid grid-cols-5 pt-12">
        <div className="col-span3 col-start-2">
          <Title className="flex text-2xl text-primary leading-10 p-6">
            <BatteryLow size={40} className="mr-4" /> Error Found!
          </Title>
          <p className="px-6">{errorCause}</p>
        </div>
      </div>
      <Footer />
    </section>
  )
}
