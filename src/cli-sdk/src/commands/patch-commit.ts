import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { error } from '@vltpkg/error-cause'
import { actual } from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'
import { PatchManager } from '@vltpkg/patch'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'patch-commit',
    usage: ['<package-spec>'],
    description: `Create a patch file from an edited package.
                  
                  Generates a patch file from changes made to a package
                  directory (created with 'vlt patch'). The patch will
                  be stored in .vlt/patches/ and automatically applied
                  during future installs.`,
    options: {
      'patch-dir': {
        value: '<path>',
        description:
          'Path to the edited package directory. If not specified, will search in temp directory.',
      },
    },
  })

type CommandResult = {
  packageName: string
  packageVersion: string
  patchFile: string
}

export const views = {
  human: (r: CommandResult) => `
✓ Created patch file for ${r.packageName}@${r.packageVersion}
  Patch: ${r.patchFile}

The patch will be automatically applied during 'vlt install'.
`,
  json: (r: CommandResult) => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const specArg = conf.positionals[0]
  if (!specArg) {
    throw error('Package specifier required', {
      name: 'vlt patch-commit',
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

  // Find the patch directory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let patchDir = (conf.options as any)['patch-dir'] as string | undefined
  if (!patchDir) {
    // Search in temp directory for a matching patch directory
    const tmpDirPath = tmpdir()
    const prefix = `vlt-patch-${packageName.replace(/\//g, '+')}-`

    const tempDirs = readdirSync(tmpDirPath).filter(d =>
      d.startsWith(prefix),
    )

    if (tempDirs.length === 0) {
      throw error(
        `No patch directory found for ${specArg}. Run 'vlt patch ${specArg}' first.`,
        {
          name: specArg,
        },
      )
    }

    if (tempDirs.length > 1) {
      throw error(
        `Multiple patch directories found for ${specArg}. Please specify one with --patch-dir.`,
        {
          name: specArg,
        },
      )
    }

    const firstTempDir = tempDirs[0]
    if (firstTempDir) {
      patchDir = join(tmpDirPath, firstTempDir)
    }
  }

  if (!patchDir || !existsSync(patchDir)) {
    throw error(
      `Patch directory does not exist: ${patchDir ?? 'undefined'}`,
      {
        path: patchDir,
      },
    )
  }

  // Create the patch
  const patchManager = new PatchManager(conf.projectRoot)
  const nodeVersion = node.version ?? ''
  const patchFile = await patchManager.create(
    packagePath,
    patchDir,
    packageName,
    nodeVersion,
  )

  return {
    packageName,
    packageVersion: nodeVersion,
    patchFile,
  }
}
