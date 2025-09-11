import { AnimatePresence, motion } from 'framer-motion'
import { Package, Search } from 'lucide-react'
import { InlineCode } from '@/components/ui/inline-code.tsx'

export const AsideOverviewEmptyState = () => {
  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, filter: 'blur(2px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, filter: 'blur(2px)' }}
        transition={{
          ease: 'easeInOut',
          duration: 0.25,
        }}
        className="mt-4 flex min-h-96 w-full cursor-default flex-col items-center justify-center rounded-xl border-[1px] border-dashed border-muted bg-card py-12 md:mt-0">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="flex size-28 items-center justify-center rounded-full">
              <Package
                className="size-10 text-muted-foreground"
                strokeWidth={1}
              />

              <div className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full bg-black dark:bg-white">
                <Search className="z-1 relative size-4 text-white dark:text-black" />
              </div>

              <motion.div
                animate={{ opacity: [0.9, 1, 0.9] }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'easeInOut',
                }}
                className="border-neutral-150 absolute z-[-1] size-28 rounded-full border"
              />
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  delay: 0.5,
                  ease: 'easeInOut',
                }}
                className="border-neutral-150 absolute z-[-1] size-36 rounded-full border"
              />
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  delay: 0.75,
                  ease: 'easeInOut',
                }}
                className="absolute z-[-1] size-44 rounded-full border"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 text-center">
          <h3 className="text-base font-medium tracking-tight text-foreground">
            No Overview Available
          </h3>
          <p className="w-4/5 text-pretty text-sm font-normal tracking-normal text-muted-foreground">
            This package does not have any additional metadata. Try
            adding some fields into{' '}
            <InlineCode>package.json</InlineCode>
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
