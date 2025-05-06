import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button.tsx'
import { Plus } from 'lucide-react'
import { CreateLabel } from '@/components/labels/create-label.tsx'

const LabelsEmptyState = () => {
  const [isCreating, setIsCreating] = useState<boolean>(false)

  return (
    <div className="flex h-full w-full items-center justify-center">
      <AnimatePresence>
        {!isCreating && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="-mt-20 flex flex-col items-center justify-center gap-3">
            <div className="relative mb-20 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 0.5,
                }}
                className="absolute h-[450px] w-[450px] rounded-full border-[1px] border-neutral-500/10"
              />
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 1,
                }}
                className="absolute h-[300px] w-[300px] rounded-full border-[1px] border-neutral-500/15"
              />
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 1.5,
                }}
                className="absolute h-[150px] w-[150px] rounded-full border-[1px] border-muted"
              />

              <div className="absolute z-[2] flex h-[42px] w-[400px] items-center justify-center rounded-[8px] bg-gradient-to-r from-white to-card dark:from-card/0 dark:to-card/100">
                <div className="flex h-[40px] w-[398px] items-center justify-center rounded-[7px]">
                  <span className="tracking absolute my-auto mr-32 bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-sm text-transparent dark:from-card dark:to-neutral-500">
                    Need to update insecure packages
                  </span>
                  <motion.div
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: 'linear',
                      repeatType: 'loop',
                    }}
                    className="absolute right-3 my-auto flex h-[24px] w-[80px] items-center justify-center rounded-full bg-red-500">
                    <span className="text-xs font-semibold tracking-wide text-white">
                      Insecure
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <h3 className="z-[2] text-xl font-medium">
                No saved Labels yet
              </h3>
              <p className="z-[2] text-center text-sm text-neutral-500">
                Looks like you haven't made any Labels yet,
                <br />
                Labels are a great way to mark your dependencies.
              </p>
              <div className="z-[2] flex items-center gap-3 text-center">
                <Button onClick={() => setIsCreating(true)}>
                  <span>New Label</span>
                  <Plus />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreating && (
          <motion.div
            className="absolute -mt-20 w-full"
            exit={{ opacity: 0, y: 10 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}>
            <CreateLabel
              className="relative mx-auto w-3/5"
              closeCreate={() => setIsCreating(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { LabelsEmptyState }
