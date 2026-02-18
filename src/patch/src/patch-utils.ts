import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { spawn } from 'node:child_process'
import { error } from '@vltpkg/error-cause'

export interface PatchOptions {
  /**
   * The directory containing the original package
   */
  sourceDir: string

  /**
   * The directory containing the modified package
   */
  modifiedDir: string

  /**
   * The package name
   */
  packageName: string

  /**
   * The package version
   */
  packageVersion: string

  /**
   * Output path for the patch file
   */
  patchPath: string
}

/**
 * Generate a patch file from the differences between source and modified directories
 */
export const createPatch = async (
  options: PatchOptions,
): Promise<string> => {
  const { sourceDir, modifiedDir, patchPath } = options

  try {
    // Use git diff to create a unified diff format patch
    const diffProcess = spawn(
      'diff',
      ['-Naur', '--no-dereference', sourceDir, modifiedDir],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    let patch = ''
    let stderr = ''

    diffProcess.stdout.on('data', (data: Buffer) => {
      patch += data.toString()
    })

    diffProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    await new Promise<void>((resolve, reject) => {
      diffProcess.on('close', code => {
        // diff returns 1 when differences are found, which is expected
        if (code === 0 || code === 1) {
          resolve()
        } else {
          reject(
            error('Failed to create patch', {
              cause: stderr,
            }),
          )
        }
      })

      diffProcess.on('error', reject)
    })

    if (!patch) {
      throw error('No differences found between directories')
    }

    // Ensure the patch directory exists
    mkdirSync(dirname(patchPath), { recursive: true })

    // Write the patch file
    writeFileSync(patchPath, patch, 'utf8')

    return patchPath
  } catch (err) {
    throw error('Failed to create patch file', { cause: err })
  }
}

/**
 * Apply a patch file to a directory
 */
export const applyPatch = async (
  patchPath: string,
  targetDir: string,
): Promise<void> => {
  try {
    const patchContent = readFileSync(patchPath, 'utf8')

    const patchProcess = spawn(
      'patch',
      ['-p1', '-d', targetDir, '--no-backup-if-mismatch'],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )

    let stdout = ''
    let stderr = ''

    patchProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    patchProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    patchProcess.stdin.write(patchContent)
    patchProcess.stdin.end()

    await new Promise<void>((resolve, reject) => {
      patchProcess.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(
            error('Failed to apply patch', {
              cause: stderr || stdout,
            }),
          )
        }
      })

      patchProcess.on('error', reject)
    })
  } catch (err) {
    throw error('Failed to apply patch file', { cause: err })
  }
}

/**
 * Get the patch filename for a package
 */
export const getPatchFilename = (
  packageName: string,
  packageVersion: string,
): string => {
  const safeName = packageName.replace(/\//g, '+')
  return `${safeName}+${packageVersion}.patch`
}
