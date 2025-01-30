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
    <div className="z-[10] h-[300px] w-full rounded-sm border-[1px] bg-white/50 px-3 py-3 backdrop-blur-sm dark:bg-black/50 md:w-[600px]">
      <div className="flex gap-x-[0.5rem]">
        {terminalButtons.map((button, idx) => (
          <div
            key={idx}
            className="!m-0 h-[12px] w-[12px] rounded-full !p-0"
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
  <p className="flex items-center gap-2 font-mono font-medium">
    <span>⚡︎</span>
    <span>~</span>
  </p>
)

/**
 * TODO: let cursor pos be mapped to the end of each letter
 */
export const Cursor = ({ position }: { position: number }) => (
  <span
    className="h-[2.25ch] w-[1ch] animate-blink select-none rounded-[1px] bg-[#c7359c]"
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
          className="!m-0 inline-block font-mono text-sm font-medium">
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
