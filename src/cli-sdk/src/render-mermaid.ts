import { writeFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { error } from '@vltpkg/error-cause'
import { exec } from '@vltpkg/run'
import * as vlx from '@vltpkg/vlx'
import type { LoadedConfig } from './config/index.ts'

export type ImageFormat = 'png' | 'svg' | 'pdf'

const MIN_WIDTH = 4000
const MAX_WIDTH = 40000

/**
 * Calculate image width based on node count.
 * Starts at 4000px and scales up, capped at 40000px.
 */
export const calculateWidth = (nodeCount: number): number =>
  Math.min(
    MAX_WIDTH,
    Math.max(MIN_WIDTH, Math.round(nodeCount * 100)),
  )

/**
 * Renders mermaid diagram text to an image file.
 *
 * Uses `@mermaid-js/mermaid-cli` (mmdc) via `vlt exec` internals
 * to generate the image. The package is resolved and installed if
 * necessary through vlt's own mechanism. The output file is written
 * to a temporary directory.
 * @returns {Promise<string>} The path to the generated image file.
 */
export const renderMermaid = async (
  mermaidText: string,
  format: ImageFormat,
  nodeCount: number,
  conf: LoadedConfig,
): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'vlt-mermaid-'))
  const inputFile = join(dir, 'input.mmd')
  const outputFile = join(dir, `graph.${format}`)
  const width = calculateWidth(nodeCount)

  await writeFile(inputFile, mermaidText)

  try {
    const arg0 = await vlx.resolve(['@mermaid-js/mermaid-cli'], {
      ...conf.options,
      query: undefined,
      allowScripts: ':not(*)',
    })

    if (!arg0) {
      throw error(
        'Could not resolve @mermaid-js/mermaid-cli executable',
      )
    }

    await exec({
      arg0,
      args: [
        '--input',
        inputFile,
        '--output',
        outputFile,
        '--width',
        String(width),
        '--quiet',
      ],
      cwd: dir,
      projectRoot: conf.projectRoot,
    })
  } catch (cause) {
    throw error('Error generating image', { cause })
  }

  return outputFile
}
