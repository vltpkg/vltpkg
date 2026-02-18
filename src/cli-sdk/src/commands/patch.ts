import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import { mkdtempSync, cpSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { error } from '@vltpkg/error-cause'
import { actual } from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'patch',
    usage: ['<package-spec>'],
    description: `Prepare a package for patching.
                  
                  Extracts the specified package to a temporary directory
                  where you can make changes. After making your changes,
                  run 'vlt patch-commit <package-spec>' to create a patch
                  file and apply it during future installs.`,
    options: {},
  })

type CommandResult = {
  packageName: string
  packageVersion: string
  patchDir: string
  packagePath: string
}

export const views = {
  human: (r: CommandResult) => `
You can now edit the following folder: ${r.patchDir}

Once you're done with your changes, run:
  vlt patch-commit ${r.packageName}

To discard your changes, just delete the folder.
`,
  json: (r: CommandResult) => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const specArg = conf.positionals[0]
  if (!specArg) {
    throw error('Package specifier required', {
      name: 'vlt patch',
    })
  }

  // Parse the spec
  const spec = Spec.parse(specArg, conf.projectRoot)
  const packageName = spec.name
  if (!packageName) {
    throw error(`Invalid package specifier: ${specArg}`, {
      name: specArg,
    })
  }

  // Load the actual graph to find the installed package
  const graph = actual.load({
    ...conf.options,
    loadManifests: false,
  })

  // Find the package node in the graph
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const node = [...graph.nodes.values()].find(
     
    n =>
      n.name === packageName &&
      (spec.bareSpec === '' || n.version === spec.bareSpec),
  )

  if (!node) {
    throw error(`Package not found: ${specArg}`, {
      name: specArg,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const nodeLocation = node.location
  if (!nodeLocation) {
    throw error(`Package location not found: ${specArg}`, {
      name: specArg,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const packagePath = join(conf.projectRoot, nodeLocation)

  if (!existsSync(packagePath)) {
    throw error(`Package path does not exist: ${packagePath}`, {
      path: packagePath,
    })
  }

  // Create a temporary directory for editing
  const tempDir = mkdtempSync(
    join(tmpdir(), `vlt-patch-${packageName.replace(/\//g, '+')}-`),
  )

  // Copy the package to the temp directory
  cpSync(packagePath, tempDir, { recursive: true })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const nodeVersion = node.version
  return {
    packageName,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    packageVersion: nodeVersion ?? '',
    patchDir: tempDir,
    packagePath,
  }
}
