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
import { persistedEntries } from '../../persist-spec-config.ts'

type Step = {
  state: 'waiting' | 'in_progress' | 'completed'
}

const labels: Record<Events['graphStep']['step'], string> = {
  build: 'resolving dependencies',
  actual: '',
  reify: 'extracting files',
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
  const [cacheHit, setCacheHit] = useState(0)

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
    const updateRequests = ({ state }: Events['request']) => {
      if (state === 'start') {
        setRequests(p => p + 1)
      } else if (
        state === 'cache' ||
        state === 'stale' ||
        state === 'store'
      ) {
        setCacheHit(p => p + 1)
      }
    }
    emitter.on('request', updateRequests)
    return () => emitter.off('request', updateRequests)
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
          const label = labels[step]
          if (!label) return null
          return $(
            Text,
            { key: step },
            $(GraphStep, { text: label, step: steps[step] }),
            $(Text, { color: 'gray' }, separator),
          )
        },
      ),
    ),
    cacheHit > 0 ?
      $(Text, null, `${cacheHit} cache hit${cacheHit > 1 ? 's' : ''}`)
    : null,
    requests > 0 ?
      $(Text, null, `${requests} request${requests > 1 ? 's' : ''}`)
    : null,
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
    const g = _result.global ? ' -g' : ''
    if (_result.buildQueue?.length) {
      out += `\n\n📦 ${_result.buildQueue.length} packages have install scripts defined & were not fully built\n`
      out += `🔎 Run \`vlt query${g} :scripts\` to list them\n`
      out += `🔨 Run \`vlt build${g}\` to run all required scripts to build installed packages.\n`
    }
    if (_result.global) {
      const { binDir, bins, conflicts, inPath } = _result.global
      if (bins.length) {
        out += `\n🔗 Linked ${bins.join(', ')} in ${binDir}`
      }
      if (conflicts.length) {
        out += `\n⚠️  Skipped ${conflicts.join(', ')}: already linked by another global package (use --force to overwrite)`
      }
      if (!inPath && (bins.length || conflicts.length)) {
        out += `\n⚠️  Add ${binDir} to your PATH to run globally installed bins.`
      }
    }
    const saved = _result.persistedConfig
    if (saved) {
      for (const e of persistedEntries(saved.values)) {
        out += `\nSaved ${e} to ${saved.which} vlt.json`
      }
    }
    this.#instance?.rerender($(App, { trailer: out }))
    return undefined
  }

  error(err: unknown) {
    this.#instance?.unmount(asError(err))
  }
}
