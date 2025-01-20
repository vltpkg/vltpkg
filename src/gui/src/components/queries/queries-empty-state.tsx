import { useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { ArrowRight, Command, Star } from 'lucide-react'
import { motion, useAnimate } from 'framer-motion'

const QueriesEmptyState = () => {
  const [starScope, starAnimate] = useAnimate<HTMLDivElement>()
  const [cursorScope, cursorAnimate] = useAnimate<HTMLDivElement>()

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
  }, [starScope, cursorScope])

  return (
    <div className="flex items-center justify-center h-full w-full bg-white dark:bg-black">
      <div className="-mt-20 flex flex-col items-center justify-center gap-3 mt-10">
        <div className="relative flex items-center justify-center mb-20">
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
            className="absolute z-[-1] w-[450px] h-[450px] border-[1px] border-neutral-500/10 rounded-full"
          />
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            className="absolute z-[-1] w-[300px] h-[300px] border-[1px] border-neutral-500/15 rounded-full"
          />
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
            className="absolute z-[-1] w-[150px] h-[150px] border-[1px] border-neutral-500/20 rounded-full"
          />

          <div className="absolute flex items-center justify-center h-[50px] w-[400px] bg-gradient-to-r from-white to-neutral-400 dark:from-black dark:to-neutral-800 rounded-[8px]">
            <div className="relative flex items-center h-[48.25px] w-[398.25px] bg-white dark:bg-black rounded-[6.25px] shadow-2xl">
              <p className="-ml-32 bg-gradient-to-r from-white dark:from-black to-neutral-500 dark:to-neutral-500 text-transparent bg-clip-text absolute whitespace-nowrap">{`[name="my-project"] > :is(:project > *[name="tap"])`}</p>
              <div className="ml-auto flex gap-2 mr-3">
                <div
                  ref={starScope}
                  className="flex items-center justify-center h-[24px] w-[24px] rounded-sm border-[1px] bg-neutral-700 dark:bg-neutral-300 border-neutral-800 dark:border-neutral-900">
                  <Star
                    id="icon"
                    size={16}
                    className="text-neutral-100 dark:text-neutral-900"
                  />
                </div>
                <div className="flex items-center justify-center gap-1 before:content-[''] before:w-[0.9px] before:h-[14px] before:bg-neutral-400 dark:before:bg-neutral-800 before:rounded-full before:mr-1">
                  <div className="flex items-center justify-center h-[24px] w-[24px] rounded-sm border-[1px] bg-neutral-100 dark:bg-neutral-900 border-neutral-400 dark:border-neutral-800">
                    <Command size={13} className="text-neutral-500" />
                  </div>
                  <div className="flex items-center justify-center h-[24px] w-[24px] rounded-sm border-[1px] bg-neutral-100 dark:bg-neutral-900 border-neutral-400 dark:border-neutral-800">
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
                  className="h-6 w-6 transform -rotate-[70deg] -translate-x-[12px] -translate-y-[10px] stroke-sky-500 text-sky-400 dark:stroke-sky-500 dark:text-sky-700 "
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        <h3 className="text-xl font-semibold">
          No saved Queries yet
        </h3>
        <p className="text-sm text-neutral-500 text-center">
          Looks like you haven't saved any Queries yet,
          <br />
          explore your Projects to add one!
        </p>
        <div className="flex gap-3"></div>
        <Button asChild>
          <a href="/">
            <span>Explore Projects</span>
            <ArrowRight />
          </a>
        </Button>
      </div>
    </div>
  )
}

export { QueriesEmptyState }
