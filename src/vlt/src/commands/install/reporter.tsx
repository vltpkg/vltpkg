import { emitter } from '@vltpkg/output'
import React, { useState, useEffect } from 'react'
import { render, Text } from 'ink'

const App = () => {
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    const update = () => {
      setCounter(p => p + 1)
    }
    emitter.on('request', update)
    return () => {
      console.log('unmounted!!!')
      emitter.off('request', update)
    }
  }, [])

  return <Text color="green">{counter} requests made</Text>
}

export default () => render(<App />)
