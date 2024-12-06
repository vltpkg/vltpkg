import { useState } from 'react'
import type { Props } from '@astrojs/starlight/props'
import Logo from '@/components/logo/logo'
import { AlignLeft, X as CloseIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'motion/react'
import AppSidebarSublist from '@/components/sidebar/app-sidebar-sublist'
import type { SidebarEntries } from '@/components/sidebar/app-sidebar'
import clsx from 'clsx'

interface HeaderProps extends Props {
  children: React.ReactNode
}

const Header = ({ sidebar, children }: HeaderProps) => {
  return (
    <nav className="mb-4 md:mb-0 flex w-full items-center justify-between gap-x-4 px-6 md:px-12 py-6">
      <Logo />

      {/* search bar */}
      <div className="flex items-center justify-items-end justify-end w-[300px] gap-2">
        <Header.MobileSidebar sidebar={sidebar} />
        {children}
      </div>
    </nav>
  )
}

Header.MobileSidebar = ({ sidebar }: { sidebar: SidebarEntries }) => {
  const [open, setOpen] = useState<boolean>(false)

  return (
    <>
      <div
        className={clsx('order-2 md:hidden', {
          'overflow-hidden': open,
        })}>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}>
          <AlignLeft size={20} />
        </Button>
      </div>

      {/* modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed flex flex-col h-svh w-full inset-0 backdrop-blur-md bg-black z-[10000] overflow-y-auto"
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3 }}>
            <div className="flex flex-row items-center justify-between px-6 py-6 border-b-[1px]">
              <h3 className="text-2xl">Documentation</h3>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setOpen(false)}>
                <CloseIcon size={20} />
              </Button>
            </div>
            <AppSidebarSublist
              sidebar={sidebar}
              className="-ml-3 mt-0 p-6"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

Header.Title = ({ title }: { title: string }) => {
  const formatTitle = (title: string): string[] => {
    const split = title.split(' ')
    return split
  }

  formatTitle(title)

  return (
    <h1 className="text-2xl">
      {formatTitle(title)[0]}{' '}
      <span className="font-light">{formatTitle(title)[1]}</span>
    </h1>
  )
}

export default Header