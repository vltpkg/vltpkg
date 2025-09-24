import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'
import { Box, render, Text } from 'ink'
import type { Instance } from 'ink'
import Spinner from 'ink-spinner'
import {
  createElement as $,
  Fragment,
  useEffect,
  useState,
} from 'react'
import { ViewClass } from '../../view.ts'
import { asError } from '@vltpkg/types'
import type { InstallResult } from '../install.ts'

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
      text + ' ',
      $(Spinner, { type: 'dots' }),
    )
  }
  return $(Text, { color: 'green' }, text, ' ✓')
}

const App = ({ trailer }: { trailer?: string }) => {
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

  useEffect(() => {
    const update = () => setRequests(p => p + 1)
    emitter.on('request', update)
    return () => emitter.off('request', update)
  }, [])

  useEffect(() => {
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
    trailer ? $(Text, null, trailer) : null,
  )
}

export class InstallReporter extends ViewClass {
  #instance: Instance | null = null

  start() {
    this.#instance = render($(App))
  }

  async done(_result: InstallResult, { time }: { time: number }) {
    let out = `Done in ${time}ms`

    // prints a very complete message explaining users the next steps
    // in case there are packages to be built
    if (_result.buildQueue?.length) {
      out += `\n\nℹ️ ${_result.buildQueue.length} packages have install scripts/bins defined & were not fully built\n`
      out += '🔎 Run `vlt query :scripts` to list them\n'
      out +=
        '🔨 Run `vlt build` to run all required scripts to build installed packages.\n'
      out += '💡 Learn more: `vlt build --help`\n'
    }
    this.#instance?.rerender($(App, { trailer: out }))
    return undefined
  }

  error(err: unknown) {
    this.#instance?.unmount(asError(err))
  }
}
