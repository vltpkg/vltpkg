import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { error } from '@vltpkg/error-cause'
import {
  createPatch,
  applyPatch,
  getPatchFilename,
} from './patch-utils.ts'

export interface PatchedPackage {
  packageName: string
  packageVersion: string
  patchFile: string
}

export class PatchManager {
  private patchesDir: string
  private vltJsonPath: string

  constructor(projectRoot: string) {
    this.patchesDir = join(projectRoot, '.vlt', 'patches')
    this.vltJsonPath = join(projectRoot, 'vlt.json')
  }

  /**
   * Create a patch for a package
   */
  async create(
    sourceDir: string,
    modifiedDir: string,
    packageName: string,
    packageVersion: string,
  ): Promise<string> {
    const patchFilename = getPatchFilename(
      packageName,
      packageVersion,
    )
    const patchPath = join(this.patchesDir, patchFilename)

    const resultPath = await createPatch({
      sourceDir,
      modifiedDir,
      packageName,
      packageVersion,
      patchPath,
    })

    // Update vlt.json with the patch reference
    this.updateVltJson(packageName, packageVersion, patchFilename)

    return resultPath
  }

  /**
   * Apply a patch for a package
   */
  async apply(
    packageName: string,
    packageVersion: string,
    targetDir: string,
  ): Promise<void> {
    const patchFilename = getPatchFilename(
      packageName,
      packageVersion,
    )
    const patchPath = join(this.patchesDir, patchFilename)

    if (!existsSync(patchPath)) {
      throw error(
        `Patch file not found for ${packageName}@${packageVersion}`,
        {
          path: patchPath,
        },
      )
    }

    await applyPatch(patchPath, targetDir)
  }

  /**
   * Get all patched packages from vlt.json
   */
  getPatchedPackages(): PatchedPackage[] {
    if (!existsSync(this.vltJsonPath)) {
      return []
    }

    try {
      const vltJson = JSON.parse(
        readFileSync(this.vltJsonPath, 'utf8'),
      ) as { patchedPackages?: Record<string, string> }
      const patchedPackages = vltJson.patchedPackages ?? {}

      return Object.entries(patchedPackages).map(
        ([packageName, patchFile]) => {
          const version = /\+([^+]+)\.patch$/.exec(patchFile)?.[1]
          return {
            packageName,
            packageVersion: version || '',
            patchFile,
          }
        },
      )
    } catch (err) {
      throw error('Failed to read vlt.json', { cause: err })
    }
  }

  /**
   * Update vlt.json with a patch reference
   */
  private updateVltJson(
    packageName: string,
    _packageVersion: string,
    patchFilename: string,
  ): void {
    let vltJson: { patchedPackages?: Record<string, string> } = {}

    if (existsSync(this.vltJsonPath)) {
      try {
        vltJson = JSON.parse(
          readFileSync(this.vltJsonPath, 'utf8'),
        ) as { patchedPackages?: Record<string, string> }
      } catch (err) {
        throw error('Failed to parse vlt.json', { cause: err })
      }
    }

    vltJson.patchedPackages ??= {}

    vltJson.patchedPackages[packageName] = patchFilename

    writeFileSync(
      this.vltJsonPath,
      JSON.stringify(vltJson, null, 2) + '\n',
      'utf8',
    )
  }
}
