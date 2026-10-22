import { assertQuery, build } from '@vltpkg/graph'
import type { BuildResult, Node } from '@vltpkg/graph'
import { error } from '@vltpkg/error-cause'
import type { WhichConfig } from '@vltpkg/vlt-json'
import { pickQuery } from '../allow-prompt.ts'
import { savedLine, writeAllow } from '../allow-query.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import { isErrorWithCause } from '@vltpkg/types'

export type BuildCommandResult =
  | (BuildResult & {
      /** the query built */
      query?: string
      /** the config file `allow-scripts` was saved to, if changed */
      saved?: WhichConfig
    })
  | { action: 'unchanged' }

const skippedMessage = (
  count: number,
  reason: BuildResult['skippedReason'],
) =>
  `${count} package${count === 1 ? '' : 's'} not built, ${
    reason === 'unscanned' ?
      'Socket has not scanned them yet'
    : 'security data timed out'
  }. Run "vlt build" again later.`

export const views = {
  human: (result: BuildCommandResult): string => {
    if ('action' in result) return 'No changes made.'
    const successCount = result.success.length
    const failureCount = result.failure.length
    const skippedCount = result.skipped?.length ?? 0
    const messages: string[] = []

    if (successCount > 0) {
      messages.push(
        `🔨 Built ${successCount} package${successCount === 1 ? '' : 's'} successfully.`,
      )
    } else if (!skippedCount) {
      messages.push('📦 All packages are already built.')
    }

    if (failureCount > 0) {
      messages.push(
        `🔎 ${failureCount} optional package${/* c8 ignore next */ failureCount === 1 ? '' : 's'} failed to build.`,
      )
    }

    if (skippedCount > 0) {
      messages.push(
        `⏳ ${skippedMessage(skippedCount, result.skippedReason)}`,
      )
    }

    if (result.saved && result.query) {
      messages.push(
        savedLine('allow-scripts', result.query, result.saved),
      )
    }

    return messages.join('\n')
  },
  json: (result: BuildCommandResult) => {
    if ('action' in result) return result
    const toJSON = (node: Node) => ({
      id: node.id,
      name: node.name,
      version: node.version,
    })
    const successList = result.success.map(toJSON)
    const failureList = result.failure.map(toJSON)
    const skippedList = result.skipped?.map(toJSON) ?? []

    return {
      success: successList,
      failure: failureList,
      ...(skippedList.length ?
        { skipped: skippedList, skippedReason: result.skippedReason }
      : {}),
      message:
        successList.length > 0 ?
          `Built ${successList.length} package${successList.length === 1 ? '' : 's'}.`
        : skippedList.length ?
          skippedMessage(skippedList.length, result.skippedReason)
        : 'No packages needed building.',
      ...(result.query !== undefined && { query: result.query }),
      ...(result.saved && { saved: result.saved }),
    }
  },
} as const satisfies Views<BuildCommandResult>

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'build',
    usage: ['[<query>]', '--target=<query>'],
    description: `Build the installed packages that need it: run their
    lifecycle scripts and link their bins. Only does work that is
    actually needed.

    Sets, saves and applies \`allow-scripts\`: builds what the query
    selects. With no query: the stored one, or
    \`:scripts:not(:built):not(:malware)\`. Asks before replacing or
    editing a stored query (-y skips). Saves to the project vlt.json,
    or the user one with --config=user. With nothing stored, no TTY
    and no -y: builds the default without saving it.

    Installs run the scripts it selects. Built packages stay built.`,
    options: {
      target: {
        value: '<query>',
        description:
          'Query to build instead of allow-scripts. Wins over the query; never saved.',
      },
      'allow-scripts': {
        value: '<query>',
        description: 'Same as the query argument.',
      },
      yes: {
        description:
          'Skip the prompts: replace or keep the stored allow-scripts without asking.',
      },
      config: {
        value: 'user|project',
        description:
          'vlt.json to save allow-scripts to (default: project).',
      },
    },
  })

const isGraphRunError = (
  error: unknown,
): error is Error & { code: string; node: Node } =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'GRAPHRUN_TRAVERSAL' &&
  'node' in error

const defaultQuery = ':scripts:not(:built):not(:malware)'

/**
 * Build command implementation. Runs any required "postinstall"
 * lifecycle scripts and binary linking.
 */
export const command: CommandFn<BuildCommandResult> = async conf => {
  const { options, projectRoot } = conf
  // --target: built as is, never saved
  const target = conf.get('target')
  const pick =
    target ?
      { query: target, save: false }
    : await pickQuery(
        conf,
        conf.positionals[0] || conf.explicit['allow-scripts'],
        {
          key: 'allow-scripts',
          defaultQuery,
          saveDefault: false,
          check: q => assertQuery(q, 'allow-scripts'),
        },
      )
  if (!pick) return { action: 'unchanged' }
  const { query } = pick

  let result: BuildResult
  try {
    // Run the build process using the graph build function
    result = await build({
      ...options,
      projectRoot,
      packageJson: options.packageJson,
      monorepo: options.monorepo,
      scurry: options.scurry,
      target: query,
    })
  } catch (cause) {
    const graphRunError =
      isErrorWithCause(cause) && isGraphRunError(cause.cause) ?
        cause.cause
      : undefined
    if (graphRunError?.code === 'GRAPHRUN_TRAVERSAL') {
      throw error(
        'Build failed:\n  Failed to build package: ' +
          `${graphRunError.node.name}@${graphRunError.node.version}`,
        { cause },
      )
    }
    throw error('Build failed', { cause })
  }
  // after building: a failed build saves nothing
  const saved =
    pick.save ?
      await writeAllow(conf, 'allow-scripts', query)
    : undefined
  return { ...result, query, ...(saved && { saved }) }
}
