import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'
import {
  Fragment,
  createElement as $,
  useState,
  useLayoutEffect,
} from 'react'
import { render, Text, Box } from 'ink'
import type { Instance } from 'ink'
import Spinner from 'ink-spinner'
import type { ViewInstance } from '../../types.ts'
import { stdout } from '../../output.ts'

type Step = {
  state: 'waiting' | 'in_progress' | 'completed'
}

const GraphStep = ({ text, step }: { text: string; step: Step }) => {
  if (step.state === 'waiting') {
    return $(Text, { color: 'gray' }, text)
  }
  if (step.state === 'in_progress') {
    return $(
      Text,
      { color: 'yellow' },
      text,
      $(Spinner, { type: 'dots' }),
    )
  }
  return $(Text, { color: 'green' }, text, ' ✓')
}

const App = () => {
  const [requests, setRequests] = useState(0)

  const [steps, setSteps] = useState<
    Record<Events['graphStep']['step'], Step>
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
    const update = () => setRequests(p => p + 1)
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

  return $(
    Fragment,
    null,
    $(
      Box,
      null,
      ...(['build', 'actual', 'reify'] as const).map(
        (step, idx, list) => {
          const separator = idx === list.length - 1 ? '' : ' > '
          return $(
            Text,
            { key: step },
            $(GraphStep, { text: step, step: steps[step] }),
            $(Text, { color: 'gray' }, separator),
          )
        },
      ),
    ),
    requests > 0 ? $(Text, null, `${requests} requests`) : null,
  )
}

export class InstallReporter implements ViewInstance {
  #instance: Instance | null

  constructor() {
    this.#instance = null
  }

  start() {
    this.#instance = render($(App))
  }

  done(_result: unknown, { time }: { time: number }) {
    this.#instance?.unmount()
    stdout(`Done in ${time}ms`)
  }

  error(err: unknown) {
    this.#instance?.unmount(err as Error)
  }
}
