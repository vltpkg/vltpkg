import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlignLeft, X as CloseIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import AppSidebarSublist from '@/components/sidebar/app-sidebar-sublist'
import { type SidebarEntries } from '@/components/sidebar/app-sidebar'
import clsx from 'clsx'

const MobileSidebar = ({ sidebar }: { sidebar: SidebarEntries }) => {
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
            className="fixed flex flex-col h-svh w-full inset-0 backdrop-blur-md bg-white dark:bg-black z-[10000] overflow-y-auto"
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
              className="-ml-4 -mt-0 p-6"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default MobileSidebar
