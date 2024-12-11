import { actual, type Graph, ideal, reify } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { parseAddArgs } from '../parse-add-remove-args.js'
import {
  type CliCommandUsage,
  type CliCommandFn,
  type Views,
} from '../types.js'
import { commandUsage } from '../config/usage.js'
import { emitter } from '@vltpkg/output'
import React, { useState, useEffect } from 'react'
import { render, Text } from 'ink'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'install',
    usage: '[packages ...]',
    description: `Install the specified packages, updating package.json and
                  vlt-lock.json appropriately.`,
  })

export const views = {
  json: {
    fn: (g: Graph) => JSON.stringify(g, null, 2),
  },
  human: {
    renderer: 'ink',
    fn: () => {
      const Counter = () => {
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

        return React.createElement(
          Text,
          { color: 'green' },
          `${counter} requests made`,
        )
      }

      return render(React.createElement(Counter))
    },
  },
} satisfies Views

export const defaultView = 'human'

export const command: CliCommandFn<Graph> = async conf => {
  const monorepo = conf.options.monorepo
  const { add } = parseAddArgs(conf, monorepo)
  const mainManifest = conf.options.packageJson.read(
    conf.options.projectRoot,
  )

  const graph = await ideal.build({
    ...conf.options,
    add,
    mainManifest,
    monorepo,
    loadManifests: true,
    packageInfo: new PackageInfoClient(conf.options),
  })
  const act = actual.load({
    ...conf.options,
    mainManifest,
    monorepo,
    loadManifests: true,
  })
  await reify({
    ...conf.options,
    packageInfo: new PackageInfoClient(conf.options),
    add,
    actual: act,
    monorepo,
    graph,
    loadManifests: true,
  })

  return { result: graph }
}
