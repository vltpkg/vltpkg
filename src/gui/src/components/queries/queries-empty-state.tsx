import { NavLink } from 'react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Command, Plus, Star } from 'lucide-react'
import { AnimatePresence, motion, useAnimate } from 'framer-motion'
import { CreateQuery } from '@/components/queries/create-query.tsx'
import type { DashboardData } from '@/state/types.ts'

interface QueriesEmptyStateProps {
  dashboard?: DashboardData
}

const QueriesEmptyState = ({ dashboard }: QueriesEmptyStateProps) => {
  const [starScope, starAnimate] = useAnimate<HTMLDivElement>()
  const [cursorScope, cursorAnimate] = useAnimate<HTMLDivElement>()
  const [isCreating, setIsCreating] = useState<boolean>(false)

  useEffect(() => {
    const {
      x: cursorX,
      y: cursorY,
      width: cursorWidth,
      height: cursorHeight,
    } = cursorScope.current.getBoundingClientRect()

    const cursorInitialPosition = {
      centerX: cursorX + cursorWidth / 2,
      centerY: cursorY + cursorHeight / 2,
    }

    const {
      x: starX,
      y: starY,
      width: starWidth,
      height: starHeight,
    } = starScope.current.getBoundingClientRect()

    const initialStarPosition = {
      centerX: starX + starWidth,
      centerY: starY + starHeight,
    }

    cursorAnimate(
      cursorScope.current,
      {
        x: [
          0,
          -(
            cursorInitialPosition.centerX -
            initialStarPosition.centerX
          ),
          0,
        ],
        y: [
          55,
          -(
            cursorInitialPosition.centerY -
            initialStarPosition.centerY
          ),
          0,
        ],
      },
      {
        duration: 2,
      },
    )
    starAnimate(
      starScope.current,
      {
        scale: [1, 1.2, 1],
      },
      {
        delay: 0.75,
        duration: 0.5,
      },
    )
    starAnimate(
      '#icon',
      {
        rotate: [0, -71],
      },
      {
        delay: 0.75,
        duration: 0.5,
      },
    )
    starAnimate(
      '#icon',
      {
        fill: ['', 'currentColor'],
      },
      {
        delay: 0.75,
        duration: 0.5,
      },
    )

    const timeout = setTimeout(() => {
      cursorAnimate(
        cursorScope.current,
        {
          x: [0, Math.random() * 10, Math.random() * 10],
          y: [0, Math.random() * 10, Math.random() * 10],
        },
        {
          ease: 'easeInOut',
          duration: 2,
          repeat: Infinity,
          repeatType: 'mirror',
        },
      )
    }, 2500)

    return () => {
      clearTimeout(timeout)
    }
  }, [starScope, cursorScope, cursorAnimate, starAnimate])

  return (
    <div className="flex h-full w-full items-center justify-center">
      <AnimatePresence mode="sync">
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
                className="absolute z-[1] h-[450px] w-[450px] rounded-full border-[1px] border-neutral-500/10"
              />
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 1,
                }}
                className="absolute z-[1] h-[300px] w-[300px] rounded-full border-[1px] border-neutral-500/15"
              />
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 1.5,
                }}
                className="absolute z-[1] h-[150px] w-[150px] rounded-full border-[1px] border-neutral-500/20"
              />

              <div className="absolute z-[2] flex h-[50px] w-[400px] items-center justify-center rounded-[8px] bg-gradient-to-r from-white to-card dark:from-card/0 dark:to-card/100">
                <div className="relative flex h-[48.25px] w-[398.25px] items-center overflow-hidden rounded-[6.25px] shadow-2xl">
                  <p className="absolute -ml-32 whitespace-nowrap bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent dark:from-black dark:to-neutral-500">{`[name="my-project"] > :is(:project > *[name="tap"])`}</p>
                  <div className="ml-auto mr-3 flex gap-2">
                    <div
                      ref={starScope}
                      className="flex h-[24px] w-[24px] items-center justify-center rounded-sm border-[1px] border-neutral-800 bg-neutral-700 dark:border-neutral-900 dark:bg-neutral-300">
                      <Star
                        id="icon"
                        size={16}
                        className="text-neutral-100 dark:text-neutral-900"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-1 before:mr-1 before:h-[14px] before:w-[0.9px] before:rounded-full before:bg-neutral-400 before:content-[''] dark:before:bg-neutral-800">
                      <div className="flex h-[24px] w-[24px] items-center justify-center rounded-sm border-[1px] border-neutral-400 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                        <Command
                          size={13}
                          className="text-neutral-500"
                        />
                      </div>
                      <div className="flex h-[24px] w-[24px] items-center justify-center rounded-sm border-[1px] border-neutral-400 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                        <span className="font-mono text-sm text-neutral-500">
                          k
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  ref={cursorScope}
                  className="absolute -right-10 top-10">
                  <div className="relative">
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="1"
                      viewBox="0 0 16 16"
                      className="h-6 w-6 -translate-x-[12px] -translate-y-[10px] -rotate-[70deg] transform stroke-sky-500 text-sky-400 dark:stroke-sky-500 dark:text-sky-700"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <h3 className="text-xl font-medium">
                No saved Queries yet
              </h3>
              <p className="text-center text-sm text-neutral-500">
                Looks like you haven't saved any Queries yet,
                <br />
                explore your Projects to add one!
              </p>
              <div className="z-[2] flex items-center justify-center gap-3 text-center">
                <Button asChild variant="outline">
                  <NavLink to="/">Explore Projects</NavLink>
                </Button>
                <Button onClick={() => setIsCreating(true)}>
                  <span>New Query</span>
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
            <CreateQuery
              dashboard={dashboard}
              className="relative mx-auto w-full max-w-6xl"
              onClose={() => setIsCreating(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { QueriesEmptyState }
