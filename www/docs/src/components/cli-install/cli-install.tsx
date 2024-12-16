import { useAnimate, motion, stagger } from 'motion/react'
import React, { useState, useEffect } from 'react'

const CliInstall = () => {
  const terminalButtons = [
    {
      type: 'maximize',
      color: '#FF2D55',
    },
    {
      type: 'minimize',
      color: '#FFCC00',
    },
    {
      type: 'close',
      color: '#00FF5F',
    },
  ]

  const commands = [
    ['#', 'vlt', 'is', 'your', 'next', 'package', 'manager'],
    ['#', 'streamline', 'package', 'management'],
    ['#', 'scale', 'confidently', 'and', 'efficiently'],
    ['#', 'enhanced', 'security', 'and', 'performance'],
    ['#', 'all', 'at', 'the', 'speed', 'of', 'vlt'],
    ['npm', 'i', '-g', 'vlt'],
    [' '],
  ]

  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [cursorPos, _setCursorPos] = useState<number>(3)

  /**
   * Allow the commands to run sequentially
   */
  const animateCommands = async () => {
    for (let i = 0; i < commands.length; i++) {
      await new Promise<void>(resolve => {
        setCurrentIndex(i)
        setTimeout(resolve, 1500)
      })
    }
  }

  useEffect(() => {
    void animateCommands()
  }, [])

  return (
    <div className="border-[1px] w-full md:w-[600px] h-[300px] px-3 py-3 rounded-sm backdrop-blur-sm bg-white/50 dark:bg-black/50 z-[10]">
      <div className="flex gap-x-[0.5rem]">
        {terminalButtons.map((button, idx) => (
          <div
            key={idx}
            className="h-[12px] w-[12px] !m-0 !p-0 rounded-full"
            style={{
              backgroundColor: button.color,
            }}
          />
        ))}
      </div>
      <div className="relative flex flex-col py-4">
        {commands.map((command, idx) => (
          <div key={idx} className="flex flex-row gap-2">
            <React.Fragment>
              {idx <= currentIndex && <TerminalUser />}
              <TextEffect
                words={command}
                animationDelay={idx === currentIndex ? 0 : -1}
              />
              {idx === currentIndex &&
                currentIndex === commands.length - 1 && (
                  <Cursor position={cursorPos} />
                )}
            </React.Fragment>
          </div>
        ))}
      </div>
    </div>
  )
}

const TerminalUser = () => (
  <p className="flex gap-2 items-center font-mono font-medium">
    <span>⚡︎</span>
    <span>~</span>
  </p>
)

/**
 * TODO: let cursor pos be mapped to the end of each letter
 */
export const Cursor = ({ position }: { position: number }) => (
  <span
    className="animate-blink bg-[#c7359c] select-none h-[2.25ch] w-[1ch] rounded-[1px]"
    style={{
      position: 'absolute',
      left: `${position}ch`,
    }}>
    &nbsp;
  </span>
)

const TextEffect = ({
  words,
  animationDelay,
}: {
  words: string[]
  animationDelay: number
}) => {
  const wordsArray = words.map(word => word.split(''))

  const [scope, animate] = useAnimate()

  useEffect(() => {
    if (animationDelay === 0) {
      animate(
        'span',
        {
          display: 'inline-block',
          width: 'fit-content',
        },
        {
          duration: 1,
          delay: stagger(0.03, { startDelay: animationDelay }),
          ease: 'easeInOut',
        },
      )
    }
  }, [animationDelay])

  return (
    <motion.div ref={scope} className="!m-0">
      {wordsArray.map((chars, idx) => (
        <p
          key={`word-${idx}`}
          className="text-sm font-medium font-mono inline-block !m-0">
          {chars.map((char, charIdx) => (
            <motion.span
              key={`char-${idx}-${charIdx}`}
              initial={{ display: 'none' }}>
              {char}
            </motion.span>
          ))}
          &nbsp;
        </p>
      ))}
    </motion.div>
  )
}

export default CliInstall
