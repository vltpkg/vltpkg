import { install } from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { lazyView } from '../view.ts'
import type { Views } from '../view.ts'
import type { InstallResult } from './install.ts'

export type CIResult = Pick<
  InstallResult,
  'buildQueue' | 'graph' | 'skills'
>

export const needsRegistry = true
export const needsNpmRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'ci',
    usage: '',
    description: `Clean install from lockfile. Deletes node_modules and installs
                  dependencies exactly as specified in vlt-lock.json. This is
                  similar to running 'vlt install --expect-lockfile' but performs
                  a clean install by removing node_modules first.

                  Like install, runs no dependency lifecycle scripts unless
                  allowed with --allow-scripts; run 'vlt build' afterwards to
                  build packages.`,
    examples: {
      '': { description: 'Clean install from lockfile' },
    },
    options: {
      'allow-scripts': {
        value: '<query>',
        description:
          'Filter which packages are allowed to run lifecycle scripts using DSS query syntax.',
      },
      'allow-skills': {
        value: '<query>',
        description:
          'Link agent skills of packages matching this DSS query into ./skills.',
      },
      'lockfile-only': {
        description:
          'Only update lockfile and package.json files; skip node_modules operations.',
      },
    },
  })

export const views = {
  json: i => i.graph.toJSON(),
  human: lazyView(
    async () =>
      (await import('./install/reporter.ts')).InstallReporter,
  ),
} as const satisfies Views<CIResult>

export const command: CommandFn<CIResult> = async conf => {
  const ciOptions = {
    ...conf.options,
    // same default as install: no scripts
    allowScripts: conf.get('allow-scripts') ?? ':not(*)',
    allowSkills: conf.get('allow-skills'),
    expectLockfile: true,
    frozenLockfile: true,
    cleanInstall: true,
    lockfileOnly: conf.options['lockfile-only'],
  }

  const { buildQueue, graph, skills } = await install(ciOptions)
  return { buildQueue, graph, ...(skills ? { skills } : null) }
}
