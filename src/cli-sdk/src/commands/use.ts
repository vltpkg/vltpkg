import type { Graph } from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { install } from '@vltpkg/graph'
import { parseAddArgs } from '../parse-add-remove-args.ts'
import type { Views } from '../view.ts'
import { InstallReporter } from './install/reporter.ts'
import type { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { error } from '@vltpkg/error-cause'
import type { Manifest } from '@vltpkg/types'

/**
 * Extended manifest type that includes publishConfig
 */
type ManifestWithPublishConfig = Manifest & {
  publishConfig?: {
    engines?: Record<string, string>
    [key: string]: unknown
  }
}

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'use',
    usage: '[runtime@version ...]',
    description: `Install and manage JavaScript runtimes as devDependencies.
                  Updates engines field with references to installed runtimes.
                  Use --publish to update publishConfig.engines instead.`,
  })

export const views = {
  json: g => g.toJSON(),
  human: InstallReporter,
} as const satisfies Views<Graph>

/**
 * Map runtime names to their corresponding npm packages
 */
const runtimeMappings: Record<string, string> = {
  node: 'node',
  deno: 'deno-bin',
  bun: 'bun',
  npm: 'npm',
  yarn: 'yarn',
  pnpm: 'pnpm',
}

/**
 * Parse a runtime specifier and convert it to an npm package specifier
 */
const parseRuntimeSpec = (
  spec: string,
): { name: string; npmSpec: string } => {
  const parsed = Spec.parse(spec)
  const runtimeName = parsed.name

  if (!runtimeMappings[runtimeName]) {
    throw error(`Unknown runtime: ${runtimeName}`, {
      code: 'EUSAGE',
      found: runtimeName,
      validOptions: Object.keys(runtimeMappings),
    })
  }

  const npmPackage = runtimeMappings[runtimeName]
  // Extract the version/range part from the original spec
  const versionPart =
    spec.includes('@') ? spec.split('@').slice(1).join('@') : 'latest'
  const npmSpec = `npm:${npmPackage}@${versionPart || 'latest'}`

  return { name: runtimeName, npmSpec }
}

/**
 * Update the engines field in package.json with runtime references
 */
const updateEnginesField = (
  packageJson: PackageJson,
  cwd: string,
  runtimeSpecs: { name: string; npmSpec: string }[],
  usePublishConfig: boolean,
): void => {
  const pj = packageJson.read(cwd) as ManifestWithPublishConfig

  if (usePublishConfig) {
    pj.publishConfig = pj.publishConfig ?? {}
    pj.publishConfig.engines = pj.publishConfig.engines ?? {}

    for (const { name } of runtimeSpecs) {
      pj.publishConfig.engines[name] = `$${name}`
    }
  } else {
    pj.engines = pj.engines ?? {}

    for (const { name } of runtimeSpecs) {
      pj.engines[name] = `$${name}`
    }
  }

  packageJson.write(cwd, pj)
}

export const command: CommandFn<Graph> = async conf => {
  const monorepo = conf.options.monorepo
  const usePublishConfig = conf.values.publish ?? false

  if (!conf.positionals.length) {
    throw error('At least one runtime specifier is required', {
      code: 'EUSAGE',
    })
  }

  // Parse runtime specifiers and convert to npm package specifiers
  const runtimeSpecs = conf.positionals.map(parseRuntimeSpec)

  // Update conf.positionals with npm package specifiers and force save-dev
  const originalPositionals = conf.positionals
  const originalSaveDev = conf.values['save-dev']

  try {
    // Temporarily modify conf for installation
    conf.positionals = runtimeSpecs.map(({ npmSpec }) => npmSpec)
    conf.values['save-dev'] = true

    // Install the packages as devDependencies
    const { add } = parseAddArgs(conf, monorepo)
    const { graph } = await install(conf.options, add)

    // Update engines field with runtime references
    updateEnginesField(
      conf.options.packageJson,
      conf.options.projectRoot, // Use projectRoot instead of cwd
      runtimeSpecs,
      usePublishConfig,
    )

    return graph
  } finally {
    // Restore original values
    conf.positionals = originalPositionals
    conf.values['save-dev'] = originalSaveDev
  }
}
