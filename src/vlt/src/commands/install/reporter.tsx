import { emitter, type Events } from '@vltpkg/output'
import React, { useState, useEffect } from 'react'
import { render, Text, Static } from 'ink'

const steps = ['build', 'actual', 'reify']

const App = () => {
  const [counter, setCounter] = useState(0)

  const [steps, setSteps] = useState([])


    
  //   {
  //   build: 'waiting',
  //   actual: 'waiting',
  //   reify: 'waiting',
  // })

  useEffect(() => {
    const update = () => setCounter(p => p + 1)
    emitter.on('request', update)
    return () => emitter.off('request', update)
  }, [])

  useEffect(() => {
    const update = ({ step }: Events['graphStep']) =>
      setStep(p => ({ ...p, [step]: }))
    emitter.on('graphStep', update)
    return () => emitter.off('graphStep', update)
  }, [])

  return (
    <>
      <Static items={steps}>
				{step => (
					<Box key={test.id}>
						<Text color="green">✔ {test.title}</Text>
					</Box>
				)}
			</Static>
      <Text color="green">{counter} requests made</Text>
    </>
  )
}

export default () => render(<App />)
