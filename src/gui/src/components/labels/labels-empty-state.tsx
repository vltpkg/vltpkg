import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button.jsx'
import { Plus } from 'lucide-react'
import { CreateLabel } from '@/components/labels/create-label.jsx'

const LabelsEmptyState = () => {
  const [isCreating, setIsCreating] = useState<boolean>(false)

  return (
    <div className="flex items-center justify-center h-full w-full bg-white dark:bg-black">
      <AnimatePresence>
        {!isCreating && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="-mt-20 flex flex-col gap-3 items-center justify-center">
            <div className="relative flex items-center justify-center mb-20">
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 0.5,
                }}
                className="absolute w-[450px] h-[450px] border-[1px] border-neutral-500/10 rounded-full"
              />
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 1,
                }}
                className="absolute w-[300px] h-[300px] border-[1px] border-neutral-500/15 rounded-full"
              />
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 1.5,
                }}
                className="absolute w-[150px] h-[150px] border-[1px] border-neutral-500/20 rounded-full"
              />

              <div className="relative flex items-center justify-center h-[42px] w-[400px] bg-gradient-to-r from-black to-muted-foreground rounded-[8px]">
                <div className="flex items-center justify-center h-[40px] w-[398px] bg-black rounded-[7px]">
                  <span className="absolute my-auto mr-32 text-sm tracking bg-gradient-to-r from-black to-neutral-500 text-transparent bg-clip-text">
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
                    className="absolute flex items-center justify-center my-auto right-3 bg-red-500 h-[24px] w-[80px] rounded-full">
                    <span className="text-xs font-semibold tracking-wide">
                      Insecure
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>

            <h3 className="text-xl z-[2] font-semibold">
              No saved Labels yet
            </h3>
            <p className="text-sm z-[2] text-neutral-500 text-center">
              Looks like you haven't made any Labels yet,
              <br />
              Labels are a great way to mark your dependencies.
            </p>
            <div className="flex gap-3"></div>
            <Button onClick={() => setIsCreating(true)}>
              <span>New Label</span>
              <Plus />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreating && (
          <motion.div
            className="absolute"
            exit={{ opacity: 0, y: 10 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}>
            <CreateLabel closeCreate={() => setIsCreating(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { LabelsEmptyState }
