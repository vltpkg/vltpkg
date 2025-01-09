import { emitter, type Events } from '@vltpkg/output'
import React, { useState, useLayoutEffect } from 'react'
import { render, Text, Box } from 'ink'

const App = () => {
  const [counter, setCounter] = useState(0)

  const [steps, setSteps] = useState<
    Record<
      Events['graphStep']['step'],
      {
        state: 'waiting' | 'in_progress' | 'completed'
      }
    >
  >({
    build: {
      state: 'waiting',
    },
    actual: {
      state: 'waiting',
    },
    reify: {
      state: 'waiting',
    },
  })

  useLayoutEffect(() => {
    const update = () => setCounter(p => p + 1)
    emitter.on('request', update)
    return () => emitter.off('request', update)
  }, [])

  useLayoutEffect(() => {
    const update = ({ step, state }: Events['graphStep']) => {
      setSteps(p => ({
        ...p,
        [step]: {
          ...p[step],
          state: state === 'start' ? 'in_progress' : 'completed',
        },
      }))
    }
    emitter.on('graphStep', update)
    return () => emitter.off('graphStep', update)
  }, [])

  return (
    <>
      <Box>
        {(['build', 'actual', 'reify'] as const).map(step =>
          steps[step].state === 'waiting' ?
            <Text key={step} color="gray">
              {step} -
            </Text>
          : steps[step].state === 'in_progress' ?
            <Text key={step} color="yellow">
              {step}... -
            </Text>
          : <Text key={step} color="green">
              {step} ✔ -
            </Text>,
        )}
      </Box>
      <Text color="green">{counter} requests made</Text>
    </>
  )
}

export default () => render(<App />)
