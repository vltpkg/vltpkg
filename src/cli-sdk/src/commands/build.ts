import { build } from '@vltpkg/graph'
import type { BuildResult, Node } from '@vltpkg/graph'
import { error } from '@vltpkg/error-cause'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import { isErrorWithCause } from '@vltpkg/types'

export const views = {
  human: (result: BuildResult): string => {
    const successCount = result.success.length
    const failureCount = result.failure.length
    const messages: string[] = []

    if (successCount > 0) {
      messages.push(
        `🔨 Built ${successCount} package${successCount === 1 ? '' : 's'} successfully.`,
      )
    } else {
      messages.push('📦 All packages are already built.')
    }

    if (failureCount > 0) {
      messages.push(
        `🔎 ${failureCount} optional package${/* c8 ignore next */ failureCount === 1 ? '' : 's'} failed to build.`,
      )
    }

    return messages.join('\n')
  },
  json: (result: BuildResult) => {
    const successList = result.success.map(node => ({
      id: node.id,
      name: node.name,
      version: node.version,
    }))
    const failureList = result.failure.map(node => ({
      id: node.id,
      name: node.name,
      version: node.version,
    }))

    return {
      success: successList,
      failure: failureList,
      message:
        successList.length > 0 ?
          `Built ${successList.length} package${successList.length === 1 ? '' : 's'}.`
        : 'No packages needed building.',
    }
  },
} as const satisfies Views<BuildResult>

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'build',
    usage: ['[query]', '[--target=<query>]'],
    description: `Build the project based on the current dependency graph.

    This command processes the installed packages in node_modules and runs
    any necessary build steps, such as lifecycle scripts and binary linking.
    
    The build process is idempotent and will only perform work that is
    actually needed based on the current state of the dependency graph.
    
    Use --target option or provide a query as a positional argument to filter
    packages using DSS query language syntax, otherwise it will target
    all packages with scripts (:scripts) by default.`,
    options: {
      target: {
        value: '<query>',
        description:
          'Query selector to filter packages using DSS syntax.',
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

/**
 * Build command implementation. Runs any required "postinstall"
 * lifecycle scripts and binary linking.
 */
export const command: CommandFn<BuildResult> = async conf => {
  const { options, projectRoot } = conf

  try {
    // Get target from option or first positional, default to all scripts
    const targetOption = conf.get('target')
    const targetPositional = conf.positionals[0]
    const target =
      targetOption ||
      targetPositional ||
      ':scripts:not(:built):not(:malware)'

    // Run the build process using the graph build function
    const result = await build({
      ...options,
      projectRoot,
      packageJson: options.packageJson,
      monorepo: options.monorepo,
      scurry: options.scurry,
      target,
    })

    return result
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
}
